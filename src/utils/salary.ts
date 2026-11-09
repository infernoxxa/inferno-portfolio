/**
 * 「薪跳」的计算模型：把日薪按班次摊到秒，用墙钟时间算出“到现在为止挣到多少”。
 * 时间基准固定为 Asia/Shanghai（中国没有夏令时，直接加 8 小时偏移即可），
 * 不依赖访客本地时区，服务端渲染与浏览器算出的结果一致。
 */

/** 每一项都是准确的钱，不参与渲染；改这里就等于改工资单。 */
export type SalaryPlan = {
  /** 第一个工作日（含），YYYY-MM-DD */
  startDate: string
  /** 每天的班次，[开始, 结束]，单位为从零点起的分钟 */
  shifts: ReadonlyArray<readonly [number, number]>
  /** 一个工作日多少钱 */
  dailyPay: number
}

export const salaryPlan: SalaryPlan = {
  startDate: '2026-11-02', // 上周一
  shifts: [
    [9 * 60 + 30, 12 * 60], // 09:30–12:00
    [13 * 60 + 30, 19 * 60], // 13:30–19:00
  ],
  dailyPay: 240,
}

const OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** 一天的有效工作秒数（8 小时 = 28800 秒）。 */
export const shiftSeconds = salaryPlan.shifts.reduce((sum, [from, to]) => sum + (to - from) * 60, 0)

/** 每工作一秒值多少钱（240 / 28800 = 0.008333…）。 */
export const perSecondPay = salaryPlan.dailyPay / shiftSeconds

/** 把时间戳平移到“上海墙钟”，之后用 getUTC* 读出来的就是上海的日期与时刻。 */
function wallClock(now: number) {
  return new Date(now + OFFSET_MS)
}

/** 某一天在上海的零点所对应的时间戳。 */
function midnightOf(dayKey: number) {
  return dayKey - OFFSET_MS
}

/** 上海日期对应的“日键”，用 UTC 毫秒表示，方便按天遍历。 */
function dayKeyOf(now: number) {
  const d = wallClock(now)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function startKeyOf(plan: SalaryPlan) {
  const [year, month, day] = plan.startDate.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function isWeekday(dayKey: number) {
  const weekday = new Date(dayKey).getUTCDay()
  return weekday !== 0 && weekday !== 6
}

/** 某一天从零点到现在已经工作的秒数（只算当天，不含其它日子）。 */
function secondsOnDay(dayKey: number, now: number, plan: SalaryPlan) {
  if (!isWeekday(dayKey)) return 0
  const base = midnightOf(dayKey)
  let total = 0
  for (const [from, to] of plan.shifts) {
    const start = base + from * 60000
    const end = base + to * 60000
    const upTo = Math.min(now, end)
    if (upTo > start) total += (upTo - start) / 1000
  }
  return total
}

/** 从首个工作日到指定时刻累计的工作秒数。 */
export function workedSeconds(now: number, plan: SalaryPlan = salaryPlan) {
  if (!now) return 0
  const today = dayKeyOf(now)
  const first = startKeyOf(plan)
  if (today < first) return 0
  let total = 0
  for (let key = first; key <= today; key += DAY_MS) {
    total += secondsOnDay(key, now, plan)
  }
  return total
}

/** 今天已经工作的秒数。 */
export function todayWorkedSeconds(now: number, plan: SalaryPlan = salaryPlan) {
  if (!now) return 0
  return secondsOnDay(dayKeyOf(now), now, plan)
}

/** 截至今天之前，已经上完的完整工作日数量。 */
export function completedDays(now: number, plan: SalaryPlan = salaryPlan) {
  if (!now) return 0
  const today = dayKeyOf(now)
  let count = 0
  for (let key = startKeyOf(plan); key < today; key += DAY_MS) {
    if (isWeekday(key)) count += 1
  }
  return count
}

/** 此刻是否在班次内。 */
export function isWorking(now: number, plan: SalaryPlan = salaryPlan) {
  if (!now) return false
  if (!isWeekday(dayKeyOf(now))) return false
  return inShift(now, plan)
}

function inShift(now: number, plan: SalaryPlan) {
  const d = wallClock(now)
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60
  return plan.shifts.some(([from, to]) => minutes >= from && minutes < to)
}

/** 下一个班次开始的时间戳（用于“休息中，下次 09:30”）。 */
export function nextShiftStart(now: number, plan: SalaryPlan = salaryPlan) {
  if (!now) return 0
  const today = dayKeyOf(now)
  for (let offset = 0; offset <= 8; offset++) {
    const key = today + offset * DAY_MS
    if (!isWeekday(key)) continue
    const base = midnightOf(key)
    for (const [from] of plan.shifts) {
      const start = base + from * 60000
      if (start > now) return start
    }
  }
  return 0
}

/** 累计金额（元）。 */
export function earnedMoney(now: number, plan: SalaryPlan = salaryPlan) {
  return (workedSeconds(now, plan) / shiftSeconds) * plan.dailyPay
}

/** 把时间戳格式化成上海时间的「09:30」。 */
export function clockText(timestamp: number) {
  if (!timestamp) return ''
  const d = wallClock(timestamp)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** 距离某个时间戳还有几天（0 = 今天，1 = 明天）。 */
export function daysAhead(timestamp: number, now: number) {
  return Math.round((dayKeyOf(timestamp) - dayKeyOf(now)) / DAY_MS)
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 把时间戳格式化成「周一」这样的星期文案（上海时间）。 */
export function weekdayText(timestamp: number) {
  return WEEKDAYS[wallClock(timestamp).getUTCDay()]
}
