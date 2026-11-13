import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import type { ObjectStore, StoredObject } from '../functions/_lib/store'
import { StorageConflict } from '../functions/_lib/store'

const contentTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function contentTypeFor(key: string): string {
  const extension = key.slice(key.lastIndexOf('.')).toLowerCase()
  return contentTypes[extension] || 'application/octet-stream'
}

// 本地文章数据放在被 Git 忽略的目录，允许反复验收而不影响正式 Azure 数据。
export class LocalObjectStore implements ObjectStore {
  private root: string
  private pending = Promise.resolve()

  constructor(root: string) {
    this.root = resolve(root)
  }

  private pathFor(key: string): string {
    const target = resolve(this.root, key)
    if (target !== this.root && !target.startsWith(this.root + sep)) {
      throw new Error('本地存储路径越界。')
    }
    return target
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const bytes = new Uint8Array(await readFile(this.pathFor(key)))
      return {
        bytes,
        contentType: contentTypeFor(key),
        etag: createHash('sha256').update(bytes).digest('hex'),
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  async put(key: string, bytes: Uint8Array, _contentType: string, expected?: string | null): Promise<void> {
    // 同一开发进程串行完成版本核对和写入，对齐 Azure 条件写入行为。
    const operation = this.pending.then(async () => {
      const current = expected !== undefined ? await this.get(key) : null
      if (expected !== undefined && (current?.etag || null) !== expected) throw new StorageConflict()
      const target = this.pathFor(key)
      await mkdir(dirname(target), { recursive: true })
      const temporary = target + '.' + randomUUID() + '.tmp'
      await writeFile(temporary, bytes)
      await rename(temporary, target)
    })
    this.pending = operation.catch(() => {})
    await operation
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true })
  }
}
