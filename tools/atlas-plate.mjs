import sharp from 'sharp'
import { readFile } from 'node:fs/promises'

const BASE = '../genabackis/malazan-world-map-2025.png'
const W = 10000, H = 5571
const L = Number(process.argv[2]) || 1600
const sc = L / W
const h = Math.round(H * sc)

const fc = JSON.parse(await readFile('../frontend/public/data/atlas.geojson', 'utf8'))
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const rang = new Map()
function decalage(x, y) {
  const cle = `${Math.round(x / 6)},${Math.round(y / 6)}`
  const k = rang.get(cle) || 0
  rang.set(cle, k + 1)
  return k * 12
}

let g = ''
let rect = 0, pts = 0
for (const f of fc.features) {
  if (!f.geometry) continue
  const p = f.properties
  if (f.geometry.type === 'Polygon') {
    const ring = f.geometry.coordinates[0]
    const xs = ring.map(c => c[0]); const ys = ring.map(c => c[1])
    const x = Math.min(...xs) * sc; const y = Math.min(...ys) * sc
    const w = (Math.max(...xs) - Math.min(...xs)) * sc; const hh = (Math.max(...ys) - Math.min(...ys)) * sc
    const col = { continent: '#d00000', campaign: '#0050d0', region: '#008000', overview: '#a000a0', schema: '#c07000' }[p.scope] || '#404040'
    g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${hh.toFixed(1)}" fill="none" stroke="${col}" stroke-width="1.6"/>`
    g += `<text x="${(x + 3).toFixed(1)}" y="${(y + 13 + decalage(x, y)).toFixed(1)}" font-family="monospace" font-size="11" fill="${col}" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">${esc(p.id)}</text>`
    rect++
  } else {
    const [px, py] = f.geometry.coordinates
    const x = px * sc; const y = py * sc
    g += `<path d="M${(x - 5).toFixed(1)} ${y.toFixed(1)}h10M${x.toFixed(1)} ${(y - 5).toFixed(1)}v10" stroke="#000000" stroke-width="1.8"/>`
    g += `<text x="${(x + 7).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-family="monospace" font-size="11" fill="#000000" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">${esc(p.id)}</text>`
    pts++
  }
}

const svg = Buffer.from(`<svg width="${L}" height="${h}">${g}</svg>`)
await sharp(BASE).resize(L, h).composite([{ input: svg }]).webp({ quality: 88 }).toFile('atlas-plate.webp')
console.log(`planche ${L}x${h} ecrite dans tools/atlas-plate.webp — ${rect} rectangles, ${pts} points`)
console.log('rouge = continent · bleu = campagne · vert = region · violet = vue d ensemble · orange = schema · croix noire = plan de ville')
