import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)
const size = Number(args.size) || 4096
const SRC = path.join(ROOT, args.src || 'genabackis/malazan-world-map-2025.png')
const OUT = path.join(ROOT, 'frontend/public/decor', `globe-${args.base || '2025'}-${size}.webp`)

const meta = await sharp(SRC).metadata()
const targetW = meta.height * 2
const pad = Math.round((targetW - meta.width) / 2)
if (pad < 0) throw new Error(`source deja plus large que 2:1 (${meta.width}x${meta.height})`)

const OCEAN = { r: 196, g: 223, b: 255 }
const TITLE_BOX = { left: 0, top: 0, width: 1500, height: 1080 }

const cleaned = await sharp(SRC)
  .composite([{
    input: { create: { width: TITLE_BOX.width, height: TITLE_BOX.height, channels: 4, background: OCEAN } },
    left: TITLE_BOX.left,
    top: TITLE_BOX.top,
  }])
  .png()
  .toBuffer()

const padded = await sharp(cleaned)
  .extend({ left: pad, right: targetW - meta.width - pad, extendWith: 'copy' })
  .png()
  .toBuffer()

await sharp(padded)
  .resize(size, size / 2)
  .webp({ quality: 88 })
  .toFile(OUT)

const s = await sharp(OUT).metadata()
console.log(`-> ${OUT} (${s.width}x${s.height}, pad ${pad}px/cote depuis ${meta.width}x${meta.height})`)
