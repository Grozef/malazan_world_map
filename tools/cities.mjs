import sharp from 'sharp'
import { classify } from './palette.mjs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'genabackis/malazan-world-map-2025.png')
const OUT_JSON = path.join(ROOT, 'frontend/public/data/cities-detectees.json')
const CITIES = path.join(ROOT, 'frontend/public/data/cities.geojson')
const ATLAS_PNG = path.join(ROOT, 'frontend/public/decor/city-sprites.png')
const ATLAS_JSON = path.join(ROOT, 'frontend/public/decor/city-sprites.json')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)
const OUT = path.join(ROOT, args.out || 'genabackis/malazan-world-map-2025-villes.png')
const SEUIL_SYM = Number(args.sym ?? 0.15)

const CARTOUCHE = { x1: 1500, y1: 1080 }

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
const ch = info.channels
const gris = (x, y) => {
  const i = (y * W + x) * ch
  return (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
}

const noir = new Uint8Array(W * H)
for (let i = 0, p = 0; p < noir.length; i += ch, p++) {
  noir[p] = (data[i] < 60 && data[i + 1] < 60 && data[i + 2] < 60) ? 1 : 0
}

const label = new Int32Array(W * H).fill(-1)
const stack = new Int32Array(W * H)
const box = []
let nb = 0
for (let s = 0; s < noir.length; s++) {
  if (!noir[s] || label[s] >= 0) continue
  const id = nb++
  let sp = 0; let a = 0
  let x0 = W; let x1 = 0; let y0 = H; let y1 = 0
  stack[sp++] = s; label[s] = id
  while (sp > 0) {
    const p = stack[--sp]
    a++
    const x = p % W; const y = (p / W) | 0
    if (x < x0) x0 = x; if (x > x1) x1 = x
    if (y < y0) y0 = y; if (y > y1) y1 = y
    if (x > 0 && noir[p - 1] && label[p - 1] < 0) { label[p - 1] = id; stack[sp++] = p - 1 }
    if (x < W - 1 && noir[p + 1] && label[p + 1] < 0) { label[p + 1] = id; stack[sp++] = p + 1 }
    if (y > 0 && noir[p - W] && label[p - W] < 0) { label[p - W] = id; stack[sp++] = p - W }
    if (y < H - 1 && noir[p + W] && label[p + W] < 0) { label[p + W] = id; stack[sp++] = p + W }
  }
  box.push({ a, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 })
}

function symetrie(cx, cy, r, rInterne = 0) {
  const val = []; const rot = []
  let m1 = 0; let m2 = 0
  const ri2 = rInterne * rInterne
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d2 = dx * dx + dy * dy
      if (d2 > r * r || d2 < ri2) continue
      const x = cx + dx; const y = cy + dy
      const xr = cx - dy; const yr = cy + dx
      if (x < 0 || x >= W || y < 0 || y >= H || xr < 0 || xr >= W || yr < 0 || yr >= H) return 0
      const a = gris(x, y); const b = gris(xr, yr)
      val.push(a); rot.push(b); m1 += a; m2 += b
    }
  }
  const k = val.length
  if (!k) return 0
  m1 /= k; m2 /= k
  let num = 0; let d1 = 0; let d2 = 0
  for (let i = 0; i < k; i++) {
    const a = val[i] - m1; const b = rot[i] - m2
    num += a * b; d1 += a * a; d2 += b * b
  }
  return (d1 && d2) ? num / Math.sqrt(d1 * d2) : 0
}

function ferme(cx, cy, rMin, rMax, n = 36) {
  let ok = 0
  for (let k = 0; k < n; k++) {
    const a = 2 * Math.PI * k / n
    const cs = Math.cos(a); const sn = Math.sin(a)
    for (let r = rMin; r <= rMax; r += 0.5) {
      const x = Math.round(cx + cs * r); const y = Math.round(cy + sn * r)
      if (x < 0 || x >= W || y < 0 || y >= H) break
      if (noir[y * W + x]) { ok++; break }
    }
  }
  return ok / n
}

function centreNoir(cx, cy, r) {
  let noirs = 0; let tot = 0
  const rr = r * r
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > rr) continue
      const x = cx + dx; const y = cy + dy
      if (x < 0 || x >= W || y < 0 || y >= H) continue
      if (noir[y * W + x]) noirs++
      tot++
    }
  }
  return tot ? noirs / tot : 0
}

const estAnneau = b => {
  const rempli = b.a / (b.w * b.h)
  return b.w >= 10 && b.w <= 46 && b.h >= 10 && b.h <= 46 && rempli >= 0.10 && rempli <= 0.25
}
const estDisque = b => {
  const rempli = b.a / (b.w * b.h)
  return b.w >= 5 && b.w <= 12 && b.h >= 5 && b.h <= 12 && rempli >= 0.70
}

const anneaux = box.filter(b => {
  if (b.w / b.h < 0.8 || b.w / b.h > 1.25) return false
  if (!estAnneau(b) && !estDisque(b)) return false
  return !(b.x + b.w / 2 <= CARTOUCHE.x1 && b.y + b.h / 2 <= CARTOUCHE.y1)
}).map(b => {
  const cx = Math.round(b.x + b.w / 2)
  const cy = Math.round(b.y + b.h / 2)
  const r = Math.round(Math.max(b.w, b.h) / 2)
  const disque = estDisque(b) && !estAnneau(b)
  return {
    ...b, cx, cy, r, disque,
    sym: disque
      ? symetrie(cx, cy, r * 2 + 2)
      : symetrie(cx, cy, r, Math.round(r * 0.62)),
    ferme: disque ? 0 : ferme(cx, cy, r * 0.62, r * 1.15),
    coeur: disque ? 1 : centreNoir(cx, cy, Math.max(2, Math.round(r / 3))),
  }
})

function voisinsSimilaires(b) {
  let n = 0
  const dmax = Math.max(14, b.w * 2.2)
  const cx = b.x + b.w / 2; const cy = b.y + b.h / 2
  for (const o of box) {
    if (o === b) continue
    if (o.w < b.w * 0.55 || o.w > b.w * 1.8) continue
    const ox = o.x + o.w / 2; const oy = o.y + o.h / 2
    if (Math.abs(ox - cx) > dmax || Math.abs(oy - cy) > dmax) continue
    if (Math.hypot(ox - cx, oy - cy) <= dmax) n++
  }
  return n
}

const SEUIL_COEUR = Number(args.coeur ?? 0.5)
const SEUIL_FERME = Number(args.ferme ?? 0.97)
const MAX_VOISINS = Number(args.voisins ?? 99)
const gardes = anneaux
  .filter(b => (b.sym >= SEUIL_SYM || b.ferme >= SEUIL_FERME) && b.coeur >= SEUIL_COEUR)
  .filter(b => voisinsSimilaires(b) <= MAX_VOISINS)

const villes = []
for (const b of [...gardes].sort((a, c) => c.w - a.w)) {
  const proche = villes.find(v => Math.hypot(v.cx - b.cx, v.cy - b.cy) < Math.max(v.r, b.r))
  if (!proche) villes.push(b)
}
villes.sort((a, b) => b.sym - a.sym)
if (gardes.length !== villes.length) {
  console.log(`dedoublonnage : ${gardes.length} anneaux -> ${villes.length} symboles`)
}
console.log(`taches noires ${nb} · anneaux candidats ${anneaux.length} · retenus ${villes.length}` +
  ` (symetrie >= ${SEUIL_SYM}, coeur noir >= ${SEUIL_COEUR})`)

function rang(w) {
  if (w >= 28) return 'major'
  if (w >= 20) return 'minor'
  return 'village'
}
const compte = {}
for (const v of villes) compte[rang(v.w)] = (compte[rang(v.w)] || 0) + 1
console.log('par rang :', JSON.stringify(compte))

if (args.dry && !args.planche) process.exit(0)

const out = Buffer.from(data)

const MARGE_HALO = 6
const DILAT_MIN = 2

for (const v of villes) {
  const x0 = Math.max(0, v.x - MARGE_HALO)
  const y0 = Math.max(0, v.y - MARGE_HALO)
  const x1 = Math.min(W - 1, v.x + v.w - 1 + MARGE_HALO)
  const y1 = Math.min(H - 1, v.y + v.h - 1 + MARGE_HALO)
  const zw = x1 - x0 + 1; const zh = y1 - y0 + 1
  const trou = new Uint8Array(zw * zh)
  const DILAT = Math.max(DILAT_MIN, Math.round(Math.max(v.w, v.h) / 10))

  const encre = new Uint8Array(zw * zh)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = y * W + x
      if (!noir[p]) continue
      const c = box[label[p]]
      if (c.x >= v.x - 1 && c.y >= v.y - 1 &&
          c.x + c.w <= v.x + v.w + 1 && c.y + c.h <= v.y + v.h + 1) {
        encre[(y - y0) * zw + (x - x0)] = 1
      }
    }
  }
  for (let y = 0; y < zh; y++) {
    for (let x = 0; x < zw; x++) {
      if (!encre[y * zw + x]) continue
      for (let dy = -DILAT; dy <= DILAT; dy++) {
        for (let dx = -DILAT; dx <= DILAT; dx++) {
          const nx = x + dx; const ny = y + dy
          if (nx < 0 || nx >= zw || ny < 0 || ny >= zh) continue
          trou[ny * zw + nx] = 1
        }
      }
    }
  }
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = y * W + x
      const i = p * ch
      if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) {
        trou[(y - y0) * zw + (x - x0)] = 1
        continue
      }
      if (noir[p]) continue
      const sature = Math.max(data[i], data[i + 1], data[i + 2]) -
        Math.min(data[i], data[i + 1], data[i + 2]) > 45
      if (!sature && classify(data[i], data[i + 1], data[i + 2]) === 0) {
        trou[(y - y0) * zw + (x - x0)] = 1
      }
    }
  }

  let blancsBord = 0; let totalBord = 0
  for (let x = 0; x < zw; x++) {
    for (const y of [0, zh - 1]) {
      const i = ((y0 + y) * W + x0 + x) * ch
      totalBord++
      if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) blancsBord++
    }
  }
  if (totalBord && blancsBord / totalBord > 0.6) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!encre[(y - y0) * zw + (x - x0)]) trou[(y - y0) * zw + (x - x0)] = 0
      }
    }
  }

  for (let passe = 0; passe < Math.max(zw, zh); passe++) {
    const fige = []
    for (let y = 0; y < zh; y++) {
      for (let x = 0; x < zw; x++) {
        if (!trou[y * zw + x]) continue
        let n = 0; let r = 0; let g = 0; let b = 0
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const nx = x + dx; const ny = y + dy
          if (nx < 0 || nx >= zw || ny < 0 || ny >= zh) continue
          if (trou[ny * zw + nx]) continue
          const i = ((y0 + ny) * W + x0 + nx) * ch
          r += out[i]; g += out[i + 1]; b += out[i + 2]; n++
        }
        if (n) fige.push([x, y, Math.round(r / n), Math.round(g / n), Math.round(b / n)])
      }
    }
    if (!fige.length) break
    for (const [x, y, r, g, b] of fige) {
      const i = ((y0 + y) * W + x0 + x) * ch
      out[i] = r; out[i + 1] = g; out[i + 2] = b
      trou[y * zw + x] = 0
    }
  }
}

const referencees = JSON.parse(await readFile(CITIES, 'utf8')).features
  .map(f => f.geometry.coordinates)
const RAYON_REF = 20
function estReferencee(v) {
  return referencees.some(([x, y]) => Math.hypot(x - v.cx, y - v.cy) <= RAYON_REF)
}

const atlasMeta = JSON.parse(await readFile(ATLAS_JSON, 'utf8')).sprites
const atlas = await readFile(ATLAS_PNG)

const HAUT = (() => {
  const d = { village: 24, minor: 32, major: 42 }
  if (!args.haut) return d
  const [v, m, M] = String(args.haut).split(',').map(Number)
  return { village: v || d.village, minor: m || d.minor, major: M || d.major }
})()
const cache = new Map()
const calques = []
let laissees = 0
for (const v of villes) {
  if (estReferencee(v)) laissees++
  const cle = rang(v.w)
  const sp = atlasMeta[cle][0]
  const h = HAUT[cle]
  const ck = `${cle}/${h}`
  if (!cache.has(ck)) {
    const w = Math.max(1, Math.round(h * (sp.w / sp.h)))
    cache.set(ck, {
      buf: await sharp(atlas).extract({ left: sp.x, top: sp.y, width: sp.w, height: sp.h })
        .resize(w, h).png().toBuffer(),
      w, h,
    })
  }
  const { buf, w } = cache.get(ck)
  const left = Math.round(v.cx - w / 2)
  const top = Math.round(v.cy - h * 0.5)
  if (left < 0 || top < 0 || left + w > W || top + h > H) continue
  calques.push({ input: buf, left, top })
}
console.log(`peints : ${calques.length} · dont ${laissees} pourvues d'un lien cote front (cities.geojson)`)
if (laissees !== referencees.length) {
  console.warn(`/!\\ ${referencees.length} villes dans cities.geojson mais ${laissees} reconnues dans le releve` +
    ` — les autres n'ont pas de symbole detecte a moins de ${RAYON_REF} px, le front en posera un sur du terrain nu`)
}

let buffer = await sharp(out, { raw: { width: W, height: H, channels: ch } }).png().toBuffer()
const LOT = 400
for (let i = 0; i < calques.length; i += LOT) {
  buffer = await sharp(buffer).composite(calques.slice(i, i + LOT)).png().toBuffer()
}

if (args.planche) {
  const CELL = 90
  const COLS = 24
  const pris = villes.slice(0, COLS * 8)
  const rows = Math.ceil(pris.length / COLS) || 1
  const img = Buffer.alloc(COLS * CELL * rows * CELL * 3, 245)
  for (let i = 0; i < pris.length; i++) {
    const b = pris[i]
    const pad = 10
    const sx = Math.max(0, b.x - pad); const sy = Math.max(0, b.y - pad)
    const sw = Math.min(W - sx, b.w + pad * 2); const sh = Math.min(H - sy, b.h + pad * 2)
    const cx = (i % COLS) * CELL; const cy = Math.floor(i / COLS) * CELL
    for (let yy = 0; yy < sh && yy < CELL - 2; yy++) {
      for (let xx = 0; xx < sw && xx < CELL - 2; xx++) {
        const si = ((sy + yy) * W + sx + xx) * ch
        const d = ((cy + yy + 1) * COLS * CELL + cx + xx + 1) * 3
        img[d] = data[si]; img[d + 1] = data[si + 1]; img[d + 2] = data[si + 2]
      }
    }
  }
  const p = path.join(ROOT, 'frontend/public/decor/_planche-villes.png')
  await sharp(img, { raw: { width: COLS * CELL, height: rows * CELL, channels: 3 } }).png().toFile(p)
  console.log(`planche de controle : ${p}`)
}

if (args.dry) {
  console.log('--dry : rien ecrit')
} else {
  await sharp(buffer).png().toFile(OUT)
  await writeFile(OUT_JSON, JSON.stringify({
    note: 'Symboles de ville detectes dans la carte-monde par tools/cities.mjs (anneau exterieur, symetrie radiale). x/y = centre en pixel carte, d = diametre de l anneau d origine, rang = symbole peint. Sert de releve : la carte nomme bien plus de villes que cities.geojson n en porte.',
    villes: villes.map(v => ({
      x: v.cx, y: v.cy, d: v.w, rang: rang(v.w),
      ...(estReferencee(v) ? { ref: true } : {}),
    })),
  }, null, 2) + '\n')
  console.log(`ecrit : ${OUT}`)
  console.log(`releve : ${OUT_JSON}`)
}
