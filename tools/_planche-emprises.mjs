import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]
}))
const SRC = path.join(ROOT, args.src || 'genabackis/malazan-world-map-2025-terrain.png')
const atlas = JSON.parse(readFileSync(path.join(ROOT, 'frontend/public/data/atlas.geojson'), 'utf8'))
const only = args.only ? new Set(String(args.only).split(',')) : null

const meta = await sharp(SRC).metadata()
const [wx0, wy0, wx1, wy1] = args.box ? args.box.split(',').map(Number) : [0, 0, meta.width, meta.height]
const w = wx1 - wx0, h = wy1 - wy0
const z = Math.min(3, (Number(args.large) || 1200) / w)
const W = Math.round(w * z), H = Math.round(h * z)

const COUL = ['#e01b1b', '#1b7fe0', '#00a000', '#e08b00', '#a000c0', '#00a0a0', '#c00060', '#606000']
let formes = '', leg = '', i = 0
for (const f of atlas.features) {
  const p = f.properties
  if (only && !only.has(p.id)) continue
  const g = f.geometry
  const b = g && g.type === 'Polygon'
    ? (() => { const r = g.coordinates[0]; const xs = r.map(c => c[0]), ys = r.map(c => c[1]);
        return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] })()
    : null
  if (!b) continue
  const [x0, y0, x1, y1] = b
  if (x1 < wx0 || x0 > wx1 || y1 < wy0 || y0 > wy1) continue
  const c = COUL[i % COUL.length]
  formes += `<rect x="${(x0 - wx0) * z}" y="${(y0 - wy0) * z}" width="${(x1 - x0) * z}" height="${(y1 - y0) * z}" fill="none" stroke="${c}" stroke-width="2.5"/>`
  leg += `<rect x="6" y="${8 + i * 19}" width="12" height="12" fill="${c}"/><text x="24" y="${19 + i * 19}" font-family="monospace" font-size="14" fill="${c}">${p.id} [${b.join(',')}] ${x1 - x0}x${y1 - y0}</text>`
  i++
}
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="0" y="0" width="${Math.min(W, 760)}" height="${8 + i * 19}" fill="#ffffffcc"/>${leg}${formes}</svg>`)
await sharp(SRC).extract({ left: wx0, top: wy0, width: w, height: h }).resize(W, H)
  .composite([{ input: svg }]).png().toFile(args.out)
console.log(`${args.out} : fenetre ${wx0},${wy0}->${wx1},${wy1} zoom ${z.toFixed(2)} -> ${W}x${H}, ${i} emprises`)
