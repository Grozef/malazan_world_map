import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { biomeMask, BIOME_BY_KEY, ROOT } from './palette.mjs'

const RAYON = 64
const fichier = process.argv[2] || path.join(ROOT, 'frontend/public/data/terrain.geojson')
const { mask, W, H } = await biomeMask()
const M = BIOME_BY_KEY.mountain.id, F = BIOME_BY_KEY.foothill.id
const fc = JSON.parse(await readFile(fichier, 'utf8'))
const pts = fc.features.filter(f => f.properties.kind === 'mountain').map(f => f.geometry.coordinates)
const cell = RAYON
const grid = new Map()
for (const [x, y] of pts) {
  const k = Math.floor(x / cell) * 100000 + Math.floor(y / cell)
  if (!grid.has(k)) grid.set(k, [])
  grid.get(k).push([x, y])
}
let total = 0, nus = 0
for (let y = 0; y < H; y += 4) {
  for (let x = 0; x < W; x += 4) {
    const b = mask[y * W + x]
    if (b !== M && b !== F) continue
    total++
    let couvert = false
    const i0 = Math.floor(x / cell), j0 = Math.floor(y / cell)
    for (let di = -1; di <= 1 && !couvert; di++) {
      for (let dj = -1; dj <= 1 && !couvert; dj++) {
        const l = grid.get((i0 + di) * 100000 + (j0 + dj))
        if (!l) continue
        for (const [px, py] of l) { if (Math.hypot(px - x, py - y) <= RAYON) { couvert = true; break } }
      }
    }
    if (!couvert) nus++
  }
}
console.log(`${path.basename(fichier)} : ${pts.length} montagnes · relief echantillonne ${total} pts · nu a plus de ${RAYON} px : ${nus} (${(100 * nus / total).toFixed(1)} %)`)
