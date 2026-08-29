import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { biomeMask, BIOME_BY_KEY, ROOT } from './palette.mjs'

const OCEAN = BIOME_BY_KEY.ocean.id
const OPENING = 2
const GEOJSON = path.join(ROOT, 'frontend/public/data/regions.geojson')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)
const RATIO = Number(args.ratio) || 200
const EPSILON_MIN = 2

function morph(src, W, H, r, erode) {
  const need = 2 * r + 1
  const tmp = new Uint8Array(W * H)
  const acc = new Int32Array(Math.max(W, H) + 1)
  for (let y = 0; y < H; y++) {
    const o = y * W
    for (let x = 0; x < W; x++) acc[x + 1] = acc[x] + src[o + x]
    for (let x = 0; x < W; x++) {
      const a = Math.max(0, x - r); const b = Math.min(W, x + r + 1)
      const s = acc[b] - acc[a]
      tmp[o + x] = erode ? (s === need ? 1 : 0) : (s > 0 ? 1 : 0)
    }
  }
  const dst = new Uint8Array(W * H)
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) acc[y + 1] = acc[y] + tmp[y * W + x]
    for (let y = 0; y < H; y++) {
      const a = Math.max(0, y - r); const b = Math.min(H, y + r + 1)
      const s = acc[b] - acc[a]
      dst[y * W + x] = erode ? (s === need ? 1 : 0) : (s > 0 ? 1 : 0)
    }
  }
  return dst
}

function componentAt(land, W, H, sx, sy) {
  const seed = sy * W + sx
  if (!land[seed]) return null
  const comp = new Uint8Array(W * H)
  const stack = new Int32Array(W * H)
  let sp = 0; let area = 0
  let x0 = W; let x1 = 0; let y0 = H; let y1 = 0
  stack[sp++] = seed; comp[seed] = 1
  while (sp > 0) {
    const p = stack[--sp]
    area++
    const x = p % W; const y = (p / W) | 0
    if (x < x0) x0 = x; if (x > x1) x1 = x
    if (y < y0) y0 = y; if (y > y1) y1 = y
    if (x > 0 && land[p - 1] && !comp[p - 1]) { comp[p - 1] = 1; stack[sp++] = p - 1 }
    if (x < W - 1 && land[p + 1] && !comp[p + 1]) { comp[p + 1] = 1; stack[sp++] = p + 1 }
    if (y > 0 && land[p - W] && !comp[p - W]) { comp[p - W] = 1; stack[sp++] = p - W }
    if (y < H - 1 && land[p + W] && !comp[p + W]) { comp[p + W] = 1; stack[sp++] = p + W }
  }
  return { comp, area, bbox: [x0, y0, x1, y1] }
}

const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

function trace(comp, W, H, bbox, area, id) {
  const [bx0, by0, bx1, by1] = bbox
  let start = -1
  for (let y = by0; y <= by1 && start < 0; y++) {
    for (let x = bx0; x <= bx1; x++) {
      if (comp[y * W + x]) { start = y * W + x; break }
    }
  }
  if (start < 0) throw new Error(`${id} : composante vide, aucun pixel dans la bbox`)

  const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H && comp[y * W + x]) ? 1 : 0
  const ring = []
  let cx = start % W; let cy = (start / W) | 0
  let dir = 6
  const startX = cx; const startY = cy
  let secondX = -1; let secondY = -1

  const limit = 4 * area + 16
  for (let guard = 0; ; guard++) {
    if (guard > limit) {
      throw new Error(`${id} : suivi de contour non termine apres ${limit} pas (aire ${area})`)
    }
    ring.push([cx, cy])
    const fromX = cx; const fromY = cy
    let found = false
    for (let k = 0; k < 8; k++) {
      const d = (dir + 6 + k) % 8
      const nx = cx + DIRS[d][0]; const ny = cy + DIRS[d][1]
      if (at(nx, ny)) {
        cx = nx; cy = ny; dir = d; found = true
        break
      }
    }
    if (!found) {
      throw new Error(`${id} : pixel isole en [${cx}, ${cy}], pas de contour a suivre`)
    }
    if (secondX < 0) {
      secondX = cx; secondY = cy
    } else if (fromX === startX && fromY === startY && cx === secondX && cy === secondY) {
      ring.pop()
      break
    }
  }
  return ring
}

function simplify(pts, eps) {
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = 1; keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [i, j] = stack.pop()
    if (j <= i + 1) continue
    const [ax, ay] = pts[i]; const [bx, by] = pts[j]
    const dx = bx - ax; const dy = by - ay
    const len = Math.hypot(dx, dy)
    let far = -1; let best = eps
    for (let k = i + 1; k < j; k++) {
      const [px, py] = pts[k]
      const d = len === 0
        ? Math.hypot(px - ax, py - ay)
        : Math.abs(dy * px - dx * py + bx * ay - by * ax) / len
      if (d > best) { best = d; far = k }
    }
    if (far > 0) {
      keep[far] = 1
      stack.push([i, far], [far, j])
    }
  }
  return pts.filter((_, i) => keep[i])
}

const fc = JSON.parse(await readFile(GEOJSON, 'utf8'))
const missing = fc.features.filter(f => !Array.isArray(f.properties?.seed))
if (missing.length) {
  throw new Error(`seed manquant sur : ${missing.map(f => f.properties?.id).join(', ')}`)
}

const t0 = Date.now()
const { mask, W, H } = await biomeMask()
const land = new Uint8Array(W * H)
for (let i = 0; i < mask.length; i++) land[i] = mask[i] !== OCEAN ? 1 : 0
const opened = morph(morph(land, W, H, OPENING, true), W, H, OPENING, false)
console.log(`masque ${W}x${H}, ouverture r=${OPENING} : ${((Date.now() - t0) / 1000).toFixed(1)}s`)

for (const f of fc.features) {
  const { id, seed } = f.properties
  const found = componentAt(opened, W, H, seed[0], seed[1])
  if (!found) throw new Error(`${id} : le seed [${seed}] n'est pas sur de la terre`)
  const [bx0, by0, bx1, by1] = found.bbox
  const epsilon = Math.max(EPSILON_MIN, Math.hypot(bx1 - bx0, by1 - by0) / RATIO)
  const ring = trace(found.comp, W, H, found.bbox, found.area, id)
  const simple = simplify(ring, epsilon)
  if (simple.length && (simple[0][0] !== simple.at(-1)[0] || simple[0][1] !== simple.at(-1)[1])) {
    simple.push([simple[0][0], simple[0][1]])
  }
  if (simple.length < 4) {
    throw new Error(`${id} : anneau degenere, ${simple.length} sommets apres simplification`)
  }
  console.log(
    `${id.padEnd(13)} aire ${String(found.area).padStart(8)} px · bbox ${bx1 - bx0}x${by1 - by0}` +
    ` · eps ${epsilon.toFixed(1)} · contour ${ring.length} -> ${simple.length} sommets`
  )
  f.geometry = { type: 'Polygon', coordinates: [simple] }
}

fc.note = 'Polygones = zones cliquables sur la carte-monde, coords pixel [x, y] origine haut-gauche (carte 10000x5571). Contours EXTRAITS du fond par tools/regions.mjs (composante connexe de terre contenant properties.seed) — ne pas les editer a la main, relancer le script. properties porte aussi l\'image de detail (drill-down) : image/width/height, et les tuiles de la carte regionale.'

if (args.dry) {
  console.log('\n--dry : rien ecrit')
} else {
  await writeFile(GEOJSON, JSON.stringify(fc, null, 2) + '\n')
  console.log(`\necrit : ${GEOJSON}`)
}
