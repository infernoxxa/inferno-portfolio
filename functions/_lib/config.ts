import type { ApiEnv } from './access'
import { AzureObjectStore } from './azure-store'
import type { ObjectStore } from './store'

export function configuredStore(env: ApiEnv): ObjectStore {
  if (env.AZURE_STORAGE_ACCOUNT && env.AZURE_STORAGE_ACCOUNT_KEY && env.AZURE_STORAGE_CONTAINER) {
    return new AzureObjectStore({
      account: env.AZURE_STORAGE_ACCOUNT, accountKey: env.AZURE_STORAGE_ACCOUNT_KEY,
      container: env.AZURE_STORAGE_CONTAINER, endpoint: env.AZURE_STORAGE_ENDPOINT,
    })
  }
  // 未配置 Azure 时公开页面仍展示已有文章；管理写入明确失败。
  return {
    async get() { return null },
    async put() { throw new Error('Azure 存储尚未配置，请先完成部署配置。') },
    async delete() { throw new Error('Azure 存储尚未配置，请先完成部署配置。') },
  }
}
