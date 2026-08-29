import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = process.env.MALAZAN_IMG
  || 'C:/laragon/www/portfolios/dev_portfolio/frontend/public/malazan-assets/img/li-heng.webp'
const OUT = path.join(ROOT, 'frontend/public/decor/compass-dagger.png')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)

const RECT = {
  left: Number(args.left ?? 208),
  top: Number(args.top ?? 182),
  width: Number(args.width ?? 114),
  height: Number(args.height ?? 326),
}

const ENCRE = 40
const ALPHA_MIN = 0.18
const TEINTE = [26, 22, 18]

const { data, info } = await sharp(SRC).greyscale().raw().toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height

const vals = []
for (let y = Math.max(0, RECT.top - 8); y < Math.min(H, RECT.top + RECT.height + 8); y++) {
  for (let x = Math.max(0, RECT.left - 8); x < Math.min(W, RECT.left + RECT.width + 8); x++) {
    if (x >= RECT.left && x < RECT.left + RECT.width && y >= RECT.top && y < RECT.top + RECT.height) continue
    vals.push(data[y * W + x])
  }
}
vals.sort((a, b) => a - b)
const bg = vals[vals.length >> 1] ?? 252
console.log(`source ${W}x${H} · fond local ${bg}`)

const { width: w, height: h } = RECT
const rgba = Buffer.alloc(w * h * 4)
let opaques = 0
for (let yy = 0; yy < h; yy++) {
  for (let xx = 0; xx < w; xx++) {
    const v = data[(RECT.top + yy) * W + (RECT.left + xx)]
    let a = (bg - v) / (bg - ENCRE)
    a = a < 0 ? 0 : a > 1 ? 1 : a
    if (a < ALPHA_MIN) a = 0
    if (a > 0) opaques++
    const k = (yy * w + xx) * 4
    rgba[k] = TEINTE[0]; rgba[k + 1] = TEINTE[1]; rgba[k + 2] = TEINTE[2]
    rgba[k + 3] = Math.round(a * 255)
  }
}
console.log(`decoupe ${w}x${h} · ${opaques} px opaques (${(100 * opaques / (w * h)).toFixed(1)} %)`)

await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
  .png({ compressionLevel: 9 }).toFile(OUT)
console.log(`ecrit : ${OUT}`)

if (args.planche) {
  const CELL = 420
  const dam = Buffer.alloc(CELL * CELL * 3)
  for (let i = 0; i < dam.length; i += 3) {
    const p = i / 3
    const x = p % CELL; const y = Math.floor(p / CELL)
    const v = ((x >> 3) + (y >> 3)) % 2 ? 90 : 130
    dam[i] = v; dam[i + 1] = v; dam[i + 2] = v
  }
  const sc = (CELL - 40) / h
  const png = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .resize(Math.round(w * sc), Math.round(h * sc)).png().toBuffer()
  const out = path.join(ROOT, 'frontend/public/decor/_planche-dagger.png')
  await sharp(dam, { raw: { width: CELL, height: CELL, channels: 3 } })
    .composite([{ input: png, left: Math.round((CELL - w * sc) / 2), top: 20 }])
    .png().toFile(out)
  console.log(`planche de controle : ${out}`)
}
