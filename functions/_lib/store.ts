// Azure Blob 与本地开发存储共享的最小对象存储协议。
export interface StoredObject {
  bytes: Uint8Array
  contentType: string
  etag?: string
}

export interface ObjectStore {
  get(key: string): Promise<StoredObject | null>
  put(key: string, bytes: Uint8Array, contentType: string, expected?: string | null): Promise<void>
  delete(key: string): Promise<void>
}

export class StorageConflict extends Error {
  constructor() { super('文章数据已变化，请刷新后重试。') }
}
