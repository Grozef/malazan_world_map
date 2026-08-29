import sharp from 'sharp'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const TILE = 256

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)
const quality = Number(args.quality) || 80
const SRC = path.join(ROOT, args.src || 'genabackis/malazan-world-map-2025.png')
const OUT = path.join(ROOT, 'frontend/public', args.out || 'tiles/2025')

const meta = await sharp(SRC).metadata()
const W = meta.width
const H = meta.height
const LEVELS = Math.ceil(Math.log2(Math.max(W, H) / TILE))

await rm(OUT, { recursive: true, force: true })
console.log(`source ${W}x${H} -> zooms Leaflet ${-LEVELS}..0 (webp q${quality})`)

let total = 0
for (let level = 0; level <= LEVELS; level++) {
  const z = level - LEVELS
  const scale = Math.pow(2, z)
  const zw = Math.max(1, Math.round(W * scale))
  const zh = Math.max(1, Math.round(H * scale))
  const cols = Math.ceil(zw / TILE)
  const rows = Math.ceil(zh / TILE)

  const { data, info } = await sharp(SRC)
    .resize(zw, zh)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const raw = { width: info.width, height: info.height, channels: info.channels }

  for (let tx = 0; tx < cols; tx++) {
    await mkdir(path.join(OUT, String(z), String(tx)), { recursive: true })
    for (let ty = -rows; ty <= -1; ty++) {
      const left = tx * TILE
      const width = Math.min(TILE, zw - left)
      const top = zh + ty * TILE
      const srcTop = Math.max(0, top)
      const height = Math.min(zh, top + TILE) - srcTop
      await sharp(data, { raw })
        .extract({ left, top: srcTop, width, height })
        .extend({
          top: srcTop - top,
          right: TILE - width,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality })
        .toFile(path.join(OUT, String(z), String(tx), `${ty}.webp`))
      total++
    }
  }
  console.log(`zoom ${z} : ${zw}x${zh}, ${cols}x${rows} tuiles`)
}
console.log(`termine : ${total} tuiles dans ${OUT}`)
