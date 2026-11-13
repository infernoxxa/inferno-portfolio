import type { ObjectStore, StoredObject } from './store'
import { StorageConflict } from './store'

export interface AzureStoreConfig {
  account: string
  container: string
  accountKey: string
  endpoint?: string
}

const apiVersion = '2023-11-03'

function encodeBlobPath(key: string): string {
  return key.split('/').map(segment => encodeURIComponent(segment)).join('/')
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0))
}

// Azure Shared Key 签名只在 Pages Functions 服务端执行，密钥不会进入浏览器。
async function signature(
  method: string,
  contentLength: number,
  contentType: string,
  account: string,
  container: string,
  key: string,
  accountKey: string,
  date: string,
  expected?: string | null,
): Promise<string> {
  const canonicalHeaders = `${method === 'PUT' ? 'x-ms-blob-type:BlockBlob\n' : ''}x-ms-date:${date}\nx-ms-version:${apiVersion}\n`
  const canonicalResource = `/${account}/${container}/${encodeBlobPath(key)}`
  const stringToSign = [
    method,
    '',
    '',
    contentLength > 0 ? String(contentLength) : '',
    '',
    contentType,
    '',
    '',
    expected || '',
    expected === null ? '*' : '',
    '',
    '',
    `${canonicalHeaders}${canonicalResource}`,
  ].join('\n')
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    base64ToBytes(accountKey).slice().buffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(stringToSign))
  return bytesToBase64(new Uint8Array(digest))
}

export class AzureObjectStore implements ObjectStore {
  private endpoint: string

  constructor(private config: AzureStoreConfig) {
    this.endpoint = (config.endpoint || `https://${config.account}.blob.core.windows.net`).replace(/\/$/, '')
  }

  private blobUrl(key: string): string {
    return `${this.endpoint}/${encodeURIComponent(this.config.container)}/${encodeBlobPath(key)}`
  }

  private async headers(
    method: string,
    key: string,
    contentType: string,
    contentLength: number,
    expected?: string | null,
  ): Promise<Headers> {
    const date = new Date().toUTCString()
    const headers = new Headers({
      'x-ms-date': date,
      'x-ms-version': apiVersion,
    })
    if (method === 'PUT') headers.set('x-ms-blob-type', 'BlockBlob')
    if (expected) headers.set('if-match', expected)
    if (expected === null) headers.set('if-none-match', '*')
    if (contentType) headers.set('content-type', contentType)
    headers.set('authorization', `SharedKey ${this.config.account}:${await signature(
      method,
      contentLength,
      contentType,
      this.config.account,
      this.config.container,
      key,
      this.config.accountKey,
      date,
      expected,
    )}`)
    return headers
  }

  async get(key: string): Promise<StoredObject | null> {
    const response = await fetch(this.blobUrl(key), {
      headers: await this.headers('GET', key, '', 0),
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Azure 存储读取失败（${response.status}）。`)
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      etag: response.headers.get('etag') || undefined,
    }
  }

  async put(key: string, bytes: Uint8Array, contentType: string, expected?: string | null): Promise<void> {
    const response = await fetch(this.blobUrl(key), {
      method: 'PUT',
      headers: await this.headers('PUT', key, contentType, bytes.byteLength, expected),
      body: bytes.slice().buffer,
    })
    if (response.status === 412) throw new StorageConflict()
    if (!response.ok) throw new Error(`Azure 存储写入失败（${response.status}）。`)
  }

  async delete(key: string): Promise<void> {
    const response = await fetch(this.blobUrl(key), {
      method: 'DELETE',
      headers: await this.headers('DELETE', key, '', 0),
    })
    if (!response.ok && response.status !== 404) {
      throw new Error(`Azure 存储删除失败（${response.status}）。`)
    }
  }
}
