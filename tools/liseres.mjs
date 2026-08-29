import sharp from 'sharp'
import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)
const SRC = path.join(ROOT, args.src || 'genabackis/malazan-world-map-2025-terrain.png')
const OUT = path.join(ROOT, args.out || 'genabackis/malazan-world-map-2025-liseres.png')
const ATLAS = path.join(ROOT, 'frontend/public/data/atlas.geojson')
const REGIONS = path.join(ROOT, 'frontend/public/data/regions.geojson')
const POI = path.join(ROOT, 'frontend/public/data/poi.geojson')

const ENCRE = 'rgba(28,26,24,0.72)'
const EPAISSEUR = 3
const BRANCHE_MIN = 26
const BRANCHE_MAX = 90
const BRANCHE_PART = 0.16

const BOITE_LIEU = { w: 168, h: 86 }

function equerres(x0, y0, x1, y1) {
  const b = Math.round(Math.min(BRANCHE_MAX, Math.max(BRANCHE_MIN, Math.min(x1 - x0, y1 - y0) * BRANCHE_PART)))
  const t = EPAISSEUR
  const r = []
  for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    const hx = sx > 0 ? cx : cx - b
    const vy = sy > 0 ? cy : cy - b
    r.push({ x: hx, y: sy > 0 ? cy : cy - t, w: b, h: t })
    r.push({ x: sx > 0 ? cx : cx - t, y: vy, w: t, h: b })
  }
  return r
}

const atlas = JSON.parse(await readFile(ATLAS, 'utf8'))
const regions = JSON.parse(await readFile(REGIONS, 'utf8'))
const poi = JSON.parse(await readFile(POI, 'utf8'))
const imagesDeRegions = new Set(regions.features.map(f => f.properties?.image))

const zones = []
for (const f of atlas.features) {
  const p = f.properties
  if (!f.geometry || f.geometry.type !== 'Polygon') continue
  if (['continent', 'overview'].includes(p.scope)) continue
  if (imagesDeRegions.has(p.image)) continue
  const anneau = p.cible
    ? [[p.cible[0], p.cible[1]], [p.cible[2], p.cible[1]], [p.cible[2], p.cible[3]], [p.cible[0], p.cible[3]]]
    : f.geometry.coordinates[0]
  const xs = anneau.map(c => c[0])
  const ys = anneau.map(c => c[1])
  zones.push({ id: p.id, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) })
}
const dejaVues = new Set(zones.map(z => z.id))
for (const f of poi.features) {
  const [x, y] = f.geometry.coordinates
  const id = f.properties.id || f.properties.name
  if (dejaVues.has(id)) continue
  zones.push({
    id,
    x0: Math.round(x - BOITE_LIEU.w / 2), y0: Math.round(y - BOITE_LIEU.h / 2),
    x1: Math.round(x + BOITE_LIEU.w / 2), y1: Math.round(y + BOITE_LIEU.h / 2),
  })
}

const { width: W, height: H } = await sharp(SRC).metadata()
let hors = 0
const rects = []
for (const z of zones) {
  for (const r of equerres(z.x0, z.y0, z.x1, z.y1)) {
    if (r.x < 0 || r.y < 0 || r.x + r.w > W || r.y + r.h > H) { hors++; continue }
    rects.push(r)
  }
}
if (hors) console.warn(`/!\ ${hors} branche(s) hors cadre, ignorees`)

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`
  + rects.map(r => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${ENCRE}"/>`).join('')
  + '</svg>'

console.log(`${zones.length} zones · ${rects.length} branches d equerre`)
for (const z of zones) console.log(`  ${z.id.padEnd(45)} [${z.x0},${z.y0},${z.x1},${z.y1}]`)

if (args.planche) {
  const base = await sharp(SRC).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toBuffer()
  const dir = String(args.planche) === 'true' ? path.join(ROOT, 'tools') : String(args.planche)
  for (const z of zones.slice(0, Number(args.n) || 4)) {
    const m = 40
    const left = Math.max(0, z.x0 - m), top = Math.max(0, z.y0 - m)
    const w = Math.min(W - left, z.x1 - z.x0 + 2 * m), h = Math.min(H - top, z.y1 - z.y0 + 2 * m)
    await sharp(base).extract({ left, top, width: w, height: h })
      .resize(Math.min(1100, w * 2)).png().toFile(path.join(dir, `liseres-${z.id}.png`))
  }
  console.log(`planches ecrites dans ${dir}`)
} else {
  await sharp(SRC).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(OUT)
  console.log(`ecrit ${OUT}`)
}
