<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  clockText,
  completedDays,
  daysAhead,
  earnedMoney,
  isWorking,
  nextShiftStart,
  salaryPlan,
  shiftSeconds,
  todayWorkedSeconds,
  weekdayText,
} from '../utils/salary'

// 服务端渲染只输出占位，时间一律在浏览器里取，避免预渲染把构建时刻写死。
const now = ref(0)
let ticker: number | undefined
let cleanup: number | undefined
let reduceMotion = false

onMounted(() => {
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  now.value = Date.now()
  ticker = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (ticker !== undefined) window.clearInterval(ticker)
  if (cleanup !== undefined) window.clearTimeout(cleanup)
})

const money = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const ready = computed(() => now.value > 0)
const working = computed(() => isWorking(now.value))
const amountText = computed(() => (ready.value ? money.format(earnedMoney(now.value)) : '——'))

/**
 * 金额按位拆成独立的字格，只有变化的那一位滚动。
 * 动作用 Web Animations API 驱动：全站在 prefers-reduced-motion 下会
 * `animation: none !important`，CSS 动画会退化成瞬时替换，JS 动画不受影响。
 */
type Slot = { ch: string; prev: string | null }

const reel = ref<HTMLElement | null>(null)
const slots = ref<Slot[]>([
  { ch: '—', prev: null },
  { ch: '—', prev: null },
])

function roll(indices: number[]) {
  const host = reel.value
  if (!host) return
  const travel = reduceMotion ? 62 : 108
  const duration = reduceMotion ? 300 : 460

  for (const index of indices) {
    const slot = host.querySelector<HTMLElement>(`[data-i="${index}"]`)
    const current = slot?.querySelector<HTMLElement>('.salary-slot-cur')
    const previous = slot?.querySelector<HTMLElement>('.salary-slot-old')
    if (!current) continue

    current.getAnimations().forEach((animation) => animation.cancel())
    current.animate(
      [{ transform: `translateY(-${travel}%)` }, { transform: 'translateY(0%)' }],
      { duration, easing: 'cubic-bezier(.2, 1.3, .42, 1)' },
    )

    if (previous) {
      previous.getAnimations().forEach((animation) => animation.cancel())
      previous.animate(
        [{ transform: 'translateY(0%)' }, { transform: `translateY(${travel}%)` }],
        { duration, easing: 'cubic-bezier(.45, 0, .55, .4)', fill: 'forwards' },
      )
    }
  }

  if (cleanup !== undefined) window.clearTimeout(cleanup)
  cleanup = window.setTimeout(() => {
    slots.value.forEach((slot) => {
      slot.prev = null
    })
  }, duration + 60)
}

watch(amountText, (next) => {
  const before = slots.value.map((slot) => slot.ch).join('')
  if (before === next) return

  // 位数变了（跨过 1,000 或小数进位到整数）就整串换掉，逐位对齐没有意义。
  if (before.length !== next.length) {
    slots.value = Array.from(next, (ch) => ({ ch, prev: null }))
    return
  }

  const changed: number[] = []
  slots.value = Array.from(next, (ch, index) => {
    if (ch === before[index]) return { ch, prev: null }
    changed.push(index)
    return { ch, prev: before[index] }
  })

  if (changed.length) void nextTick(() => roll(changed))
})

/** 上午 / 下午两段班次各多少秒，用来在进度轨上标出午休的位置。 */
const breakRatio = ((salaryPlan.shifts[0][1] - salaryPlan.shifts[0][0]) * 60) / shiftSeconds

/** 班次刻度：把「从零点起的分钟」写成 09:30 这样的字面量。 */
function shiftClock(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}

const shiftStart = shiftClock(salaryPlan.shifts[0][0])
const shiftEnd = shiftClock(salaryPlan.shifts[1][1])

const todaySeconds = computed(() => (ready.value ? todayWorkedSeconds(now.value) : 0))
const progress = computed(() => Math.min(100, (todaySeconds.value / shiftSeconds) * 100))

function hours(seconds: number) {
  return Math.floor(seconds / 3600)
}

function minutes(seconds: number) {
  return Math.floor((seconds % 3600) / 60)
}

const status = computed(() => {
  if (!ready.value) return '正在读取时间'
  if (working.value) return '正在挣钱'
  const next = nextShiftStart(now.value)
  if (!next) return '今天不在班上'
  const ahead = daysAhead(next, now.value)
  const day = ahead === 0 ? '今天' : ahead === 1 ? '明天' : weekdayText(next)
  return `休息中 · ${day} ${clockText(next)} 继续`
})

const detail = computed(() => (ready.value ? `已完成 ${completedDays(now.value)} 天` : ''))
</script>

<template>
  <div class="salary">
    <p class="salary-amount">
      <span class="salary-currency" aria-hidden="true">¥</span>
      <span ref="reel" class="salary-reel" aria-hidden="true">
        <span v-for="(slot, index) in slots" :key="index" :data-i="index" class="salary-slot" :class="{ 'is-digit': /\d/.test(slot.ch) }">
          <span v-if="slot.prev !== null" class="salary-slot-old">{{ slot.prev }}</span>
          <span class="salary-slot-cur">{{ slot.ch }}</span>
        </span>
      </span>
      <span class="sr-only">当前累计 {{ amountText }} 元，今日已完成 {{ hours(todaySeconds) }} 小时 {{ minutes(todaySeconds) }} 分。</span>
    </p>

    <div class="salary-rail">
      <span class="rail-track" aria-hidden="true">
        <span class="rail-fill" :style="{ width: progress + '%' }"></span>
        <span class="rail-notch" :style="{ left: breakRatio * 100 + '%' }"></span>
        <span
          class="rail-cursor"
          :class="{ 'is-live': working }"
          :style="{ left: progress + '%' }"
        ></span>
      </span>
      <span class="rail-labels" aria-hidden="true">
        <span>{{ shiftStart }}</span>
        <span class="rail-break" :style="{ left: breakRatio * 100 + '%' }">午休</span>
        <span>{{ shiftEnd }}</span>
      </span>
    </div>

    <p class="salary-foot">
      <span class="salary-status" :class="{ 'is-live': working }">
        <span class="salary-dot" :class="{ 'is-live': working }" aria-hidden="true"></span>{{ status }}
      </span>
      <span class="salary-detail">{{ detail }}</span>
    </p>
  </div>
</template>
