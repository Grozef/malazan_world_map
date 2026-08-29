import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { biomeMask, BIOME_BY_KEY, ROOT, SRC } from './palette.mjs'

const OUT = path.join(ROOT, 'frontend/public/data/terrain.geojson')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)
const COAST = Number(args.coast) || 200

const STEP = { mountain: 17, forest: 17, wave: 90, monster: 1600, ship: 2000,
  dune: 60, icefield: 130, plain: 140,
  foothill: 22 }

const CARTOUCHE = [0, 0, 1440, 1000]

const MARGE = { dune: 31, icefield: 22, plain: 21 }

const EMPRISE = { mountain: 32 }
const RECOUVREMENT_MAX = 0.35

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function erode(src, W, H, r) {
  const inv = new Uint8Array(src.length)
  for (let i = 0; i < src.length; i++) inv[i] = src[i] ? 0 : 1
  const gros = dilate(inv, W, H, r)
  const out = new Uint8Array(src.length)
  for (let i = 0; i < src.length; i++) out[i] = gros[i] ? 0 : 1
  return out
}

function dilate(src, W, H, r) {
  const tmp = new Uint8Array(W * H)
  const acc = new Int32Array(Math.max(W, H) + 1)
  for (let y = 0; y < H; y++) {
    const o = y * W
    for (let x = 0; x < W; x++) acc[x + 1] = acc[x] + src[o + x]
    for (let x = 0; x < W; x++) {
      tmp[o + x] = acc[Math.min(W, x + r + 1)] - acc[Math.max(0, x - r)] > 0 ? 1 : 0
    }
  }
  const dst = new Uint8Array(W * H)
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) acc[y + 1] = acc[y] + tmp[y * W + x]
    for (let y = 0; y < H; y++) {
      dst[y * W + x] = acc[Math.min(H, y + r + 1)] - acc[Math.max(0, y - r)] > 0 ? 1 : 0
    }
  }
  return dst
}

function registre() {
  const CELL = 64
  const cases = new Map()
  const ci = (v) => Math.floor(v / CELL)
  return {
    accepte(x, y, w) {
      const i0 = ci(x), j0 = ci(y)
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const l = cases.get((i0 + di) * 100000 + (j0 + dj))
          if (!l) continue
          for (const q of l) {
            const d = Math.hypot(x - q.x, y - q.y)
            if ((w + q.w) / 2 - d > RECOUVREMENT_MAX * Math.min(w, q.w)) return false
          }
        }
      }
      return true
    },
    pose(x, y, w) {
      const k = ci(x) * 100000 + ci(y)
      if (!cases.has(k)) cases.set(k, [])
      cases.get(k).push({ x, y, w })
    },
  }
}

function scatter(ok, W, H, step, rng, kind, echelle = 1, reg = null) {
  const pts = []
  for (let gy = 0; gy < H; gy += step) {
    for (let gx = 0; gx < W; gx += step) {
      const x = Math.round(gx + (rng() - 0.5) * step)
      const y = Math.round(gy + (rng() - 0.5) * step)
      if (x < 0 || x >= W || y < 0 || y >= H) continue
      if (!ok[y * W + x]) continue
      const scale = Math.round((0.75 + rng() * 0.5) * echelle * 100) / 100
      if (reg) {
        const w = EMPRISE[kind] * scale
        if (!reg.accepte(x, y, w)) continue
        reg.pose(x, y, w)
      }
      pts.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [x, y] },
        properties: { kind, scale },
      })
    }
  }
  return pts
}

async function masqueToponymes(W, H, rayon) {
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels
  const sombreArr = new Uint8Array(W * H)
  const rougeArr = new Uint8Array(W * H)
  for (let p = 0, i = 0; p < sombreArr.length; p++, i += ch) {
    const r = data[i]; const g = data[i + 1]; const b = data[i + 2]
    const sombre = r < 110 && g < 110 && b < 110
    const rouge = r >= 70 && r <= 190 && g < 70 && b < 70 && r - Math.max(g, b) > 50
    sombreArr[p] = sombre ? 1 : 0
    rougeArr[p] = rouge ? 1 : 0
  }
  const MAX_LETTRE = 140
  const lettres = new Uint8Array(W * H)
  for (const encre of [sombreArr, rougeArr]) {
  const lab = new Int32Array(W * H).fill(-1)
  const pile = new Int32Array(W * H)
  for (let s = 0; s < encre.length; s++) {
    if (!encre[s] || lab[s] >= 0) continue
    let sp = 0; let n = 0
    let x0 = W; let x1 = 0; let y0 = H; let y1 = 0
    const pix = []
    pile[sp++] = s; lab[s] = s
    while (sp > 0) {
      const p = pile[--sp]
      pix.push(p); n++
      const x = p % W; const y = (p / W) | 0
      if (x < x0) x0 = x; if (x > x1) x1 = x
      if (y < y0) y0 = y; if (y > y1) y1 = y
      if (x > 0 && encre[p - 1] && lab[p - 1] < 0) { lab[p - 1] = s; pile[sp++] = p - 1 }
      if (x < W - 1 && encre[p + 1] && lab[p + 1] < 0) { lab[p + 1] = s; pile[sp++] = p + 1 }
      if (y > 0 && encre[p - W] && lab[p - W] < 0) { lab[p - W] = s; pile[sp++] = p - W }
      if (y < H - 1 && encre[p + W] && lab[p + W] < 0) { lab[p + W] = s; pile[sp++] = p + W }
    }
    if (x1 - x0 + 1 <= MAX_LETTRE && y1 - y0 + 1 <= MAX_LETTRE && n >= 8) {
      for (const p of pix) lettres[p] = 1
    }
  }
  }
  return dilate(lettres, W, H, rayon)
}

const { mask, W, H } = await biomeMask()
const OCEAN = BIOME_BY_KEY.ocean.id
const MOUNTAIN = BIOME_BY_KEY.mountain.id
const FOOTHILL = BIOME_BY_KEY.foothill.id
const FOREST = BIOME_BY_KEY.forest.id

const DESERT = BIOME_BY_KEY.desert.id
const ICE = BIOME_BY_KEY.ice.id
const PLAIN = BIOME_BY_KEY.plain.id

const isMountain = new Uint8Array(W * H)
const isFoothill = new Uint8Array(W * H)
const isDesert = new Uint8Array(W * H)
const isIce = new Uint8Array(W * H)
const isPlain = new Uint8Array(W * H)
const isForest = new Uint8Array(W * H)
const isLand = new Uint8Array(W * H)
const [cx0, cy0, cx1, cy1] = CARTOUCHE
for (let i = 0; i < mask.length; i++) {
  if (mask[i] !== OCEAN) isLand[i] = 1
  const x = i % W
  const y = (i / W) | 0
  if (x >= cx0 && x < cx1 && y >= cy0 && y < cy1) continue
  if (mask[i] === MOUNTAIN) isMountain[i] = 1
  if (mask[i] === FOOTHILL) isFoothill[i] = 1
  if (mask[i] === FOREST) isForest[i] = 1
  if (mask[i] === DESERT) isDesert[i] = 1
  if (mask[i] === ICE) isIce[i] = 1
  if (mask[i] === PLAIN) isPlain[i] = 1
}

const OUVERTURE = 2
for (const m of [isMountain, isFoothill]) {
  m.set(dilate(erode(m, W, H, OUVERTURE), W, H, OUVERTURE))
}

const near = dilate(isLand, W, H, COAST)
const isCoast = new Uint8Array(W * H)
for (let i = 0; i < near.length; i++) isCoast[i] = near[i] && !isLand[i] ? 1 : 0

const isOpenSea = new Uint8Array(W * H)
for (let i = 0; i < mask.length; i++) isOpenSea[i] = mask[i] === OCEAN && !near[i] ? 1 : 0

const DEGAGEMENT = 27
const DEGAGEMENT_SERRE = 16
const surToponyme = await masqueToponymes(W, H, DEGAGEMENT)
let bloques = 0
for (let i = 0; i < surToponyme.length; i++) if (surToponyme[i]) bloques++
console.log(`toponymes : ${(100 * bloques / (W * H)).toFixed(2)} % de la carte interdite au semis`)

const libre = (m) => {
  const out = new Uint8Array(m.length)
  for (let i = 0; i < m.length; i++) out[i] = m[i] && !surToponyme[i] ? 1 : 0
  return out
}

function rattrapage(ok, W, H, pts, kind, bloc, portee, rng, reg = null) {
  const occupe = new Set()
  for (const [x, y] of pts) occupe.add(((y / bloc) | 0) * 100000 + ((x / bloc) | 0))
  const out = []
  for (let by = 0; by * bloc < H; by++) {
    for (let bx = 0; bx * bloc < W; bx++) {
      let proche = false
      const r = Math.max(1, Math.round(portee / bloc))
      for (let dy = -r; dy <= r && !proche; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (occupe.has((by + dy) * 100000 + (bx + dx))) { proche = true; break }
        }
      }
      if (proche) continue
      let sx = 0, sy = 0, n = 0
      for (let y = by * bloc; y < Math.min(H, (by + 1) * bloc); y++) {
        for (let x = bx * bloc; x < Math.min(W, (bx + 1) * bloc); x++) {
          if (!ok[y * W + x]) continue
          sx += x; sy += y; n++
        }
      }
      if (n < 12) continue
      const cx = Math.round(sx / n)
      const cy = Math.round(sy / n)
      if (!ok[cy * W + cx]) continue
      const scale = Math.round((0.75 + rng() * 0.5) * 100) / 100
      if (reg) {
        const w = EMPRISE[kind] * scale
        if (!reg.accepte(cx, cy, w)) continue
        reg.pose(cx, cy, w)
      }
      occupe.add(by * 100000 + bx)
      out.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [cx, cy] },
        properties: { kind, scale },
      })
    }
  }
  return out
}

const procheSerre = await masqueToponymes(W, H, DEGAGEMENT_SERRE)
const rng = mulberry32(20260825)
const regRelief = registre()
const features = [
  ...(() => {
    const ok = libre(isMountain)
    const base = scatter(ok, W, H, STEP.mountain, rng, 'mountain', 1, regRelief)
    const plus = rattrapage(ok, W, H, base.map(f => f.geometry.coordinates), 'mountain', 22, 34, rng, regRelief)
    const serre = new Uint8Array(ok.length)
    for (let i = 0; i < ok.length; i++) {
      serre[i] = (isMountain[i] || isFoothill[i]) && surToponyme[i] && !procheSerre[i] ? 1 : 0
    }
    const petits = scatter(serre, W, H, STEP.mountain, rng, 'mountain', 0.45, regRelief)
    console.log(`montagnes : ${base.length} semees + ${plus.length} en rattrapage + ${petits.length} reduites pres d'un toponyme`)
    return [...base, ...plus, ...petits]
  })(),
  ...scatter(libre(isFoothill), W, H, STEP.foothill, rng, 'mountain', 1, regRelief),
  ...scatter(libre(isForest), W, H, STEP.forest, rng, 'forest'),
  ...scatter(libre(isCoast), W, H, STEP.wave, rng, 'wave'),
  ...scatter(libre(isOpenSea), W, H, STEP.monster, rng, 'monster'),
  ...scatter(libre(isOpenSea), W, H, STEP.ship, rng, 'ship'),
  ...scatter(libre(erode(isDesert, W, H, MARGE.dune)), W, H, STEP.dune, rng, 'dune'),
  ...scatter(libre(erode(isIce, W, H, MARGE.icefield)), W, H, STEP.icefield, rng, 'icefield'),
  ...scatter(libre(erode(isPlain, W, H, MARGE.plain)), W, H, STEP.plain, rng, 'plain'),
]

const counts = features.reduce((m, f) => { m[f.properties.kind] = (m[f.properties.kind] || 0) + 1; return m }, {})
console.log(`semis : ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(' · ')} — total ${features.length}`)

const fc = {
  type: 'FeatureCollection',
  note: `Symboles de terrain semes par tools/symbols.mjs depuis les aplats du fond (voir tools/palette.mjs). Coords pixel [x, y] origine haut-gauche (carte ${W}x${H}). kind: mountain|forest|wave|monster|ship|dune|icefield|plain, scale multiplie la taille du symbole. Ne pas editer a la main : relancer le script.`,
  features,
}
const json = JSON.stringify(fc)

if (args.dry) {
  console.log(`--dry : rien ecrit (${(json.length / 1024).toFixed(0)} Ko)`)
} else {
  await writeFile(OUT, json + '\n')
  console.log(`ecrit : ${OUT} (${(json.length / 1024).toFixed(0)} Ko)`)
}
