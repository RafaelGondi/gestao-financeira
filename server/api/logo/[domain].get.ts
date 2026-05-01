import { getRouterParam, setResponseHeader } from 'h3'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const cacheDir = join(process.cwd(), 'data', 'logos')
if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })

async function fetchLogo(domain: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const sources = [
    `https://${domain}/apple-touch-icon.png`,
    `https://${domain}/apple-touch-icon-180x180.png`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ]

  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000)
      })
      const ct = res.headers.get('content-type') ?? ''
      if (res.ok && ct.startsWith('image')) {
        const buffer = Buffer.from(await res.arrayBuffer())
        return { buffer, contentType: ct }
      }
    } catch {}
  }
  return null
}

export default defineEventHandler(async (event) => {
  const domain = getRouterParam(event, 'domain')
  if (!domain || !/^[a-z0-9.\-]+$/.test(domain))
    throw createError({ statusCode: 400 })

  const cacheFile = join(cacheDir, domain.replace(/\./g, '_'))
  const cacheMeta = cacheFile + '.type'

  // Serve do cache em disco se existir
  if (existsSync(cacheFile) && existsSync(cacheMeta)) {
    const contentType = readFileSync(cacheMeta, 'utf8')
    setResponseHeader(event, 'Content-Type', contentType)
    setResponseHeader(event, 'Cache-Control', 'public, max-age=2592000') // 30 dias
    return readFileSync(cacheFile)
  }

  // Busca remotamente e salva em disco
  const result = await fetchLogo(domain)
  if (!result) throw createError({ statusCode: 404 })

  writeFileSync(cacheFile, result.buffer)
  writeFileSync(cacheMeta, result.contentType)

  setResponseHeader(event, 'Content-Type', result.contentType)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=2592000')
  return result.buffer
})
