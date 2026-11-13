import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { handleApi } from '../functions/_lib/api'
import { LocalObjectStore } from './local-store'

export async function requestBody(request: IncomingMessage): Promise<Uint8Array | undefined> {
  if (['GET', 'HEAD'].includes(request.method || 'GET')) return undefined
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return chunks.length ? new Uint8Array(Buffer.concat(chunks)) : undefined
}

export function requestHeaders(request: IncomingMessage): Headers {
  const headers = new Headers()
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    headers.append(request.rawHeaders[index]!, request.rawHeaders[index + 1]!)
  }
  return headers
}

export async function send(response: ServerResponse, result: Response): Promise<void> {
  response.statusCode = result.status
  result.headers.forEach((value, key) => response.setHeader(key, value))
  response.end(Buffer.from(await result.arrayBuffer()))
}

// Vite 本地开发复用 Pages Functions 的同一套接口，数据写入独立本地目录。
export function localArticleApi(): Plugin {
  const store = new LocalObjectStore(resolve(process.env.ARTICLE_LOCAL_DATA_DIR || '.local-data/article-storage'))
  return {
    name: 'local-article-api',
    configureServer(server) {
      server.middlewares.use('/api', async (request, response, next) => {
        try {
          const url = new URL(request.url || '/', 'http://127.0.0.1')
          const target = `http://${request.headers.host || '127.0.0.1'}${url.pathname.startsWith('/api') ? url.pathname : `/api${url.pathname}`}${url.search}`
          const webRequest = new Request(target, {
            method: request.method,
            headers: requestHeaders(request),
            body: (await requestBody(request))?.slice().buffer,
          })
          await send(response, await handleApi(webRequest, { LOCAL_DEV: 'true' }, store))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}
