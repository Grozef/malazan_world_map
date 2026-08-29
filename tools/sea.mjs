import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { charge, decoupe, ecrisAtlas, planche } from './atlas.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'frontend/public/decor')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)

const SG = path.join(ROOT, 'genabackis/south-genabackis-and-environs.webp')
const JA = path.join(ROOT, 'genabackis/the-isle-of-jacuruku.webp')

const VAGUES = { x: 380, y: 1095, w: 260, h: 120 }
const VAGUE_MIN_W = 12
const VAGUE_MAX_W = 34
const VAGUE_MIN_H = 5
const VAGUE_MAX_H = 16
const VAGUE_MIN_AIRE = 24
const VAGUES_GARDEES = 6

const MAIN = [
  { fichier: SG, kind: 'monster', rect: [1225, 878, 390, 285] },
  { fichier: JA, kind: 'monster', rect: [150, 240, 290, 178] },
  { fichier: JA, kind: 'monster', rect: [235, 1160, 310, 205] },
  { fichier: SG, kind: 'ship', rect: [90, 875, 360, 320] },
]
const MARGE = 3

const ENCRE_MASQUE = 120

function composantes(src, zone) {
  const { data, W } = src
  const { x: X, y: Y, w: ZW, h: ZH } = zone
  const vu = new Uint8Array(ZW * ZH)
  const pile = new Int32Array(ZW * ZH)
  const noir = p => data[(Y + ((p / ZW) | 0)) * W + X + (p % ZW)] < ENCRE_MASQUE
  const out = []
  for (let s = 0; s < vu.length; s++) {
    if (vu[s] || !noir(s)) continue
    let sp = 0; let aire = 0
    let x0 = ZW; let x1 = 0; let y0 = ZH; let y1 = 0
    pile[sp++] = s; vu[s] = 1
    while (sp > 0) {
      const p = pile[--sp]
      aire++
      const px = p % ZW; const py = (p / ZW) | 0
      if (px < x0) x0 = px; if (px > x1) x1 = px
      if (py < y0) y0 = py; if (py > y1) y1 = py
      if (px > 0 && !vu[p - 1] && noir(p - 1)) { vu[p - 1] = 1; pile[sp++] = p - 1 }
      if (px < ZW - 1 && !vu[p + 1] && noir(p + 1)) { vu[p + 1] = 1; pile[sp++] = p + 1 }
      if (py > 0 && !vu[p - ZW] && noir(p - ZW)) { vu[p - ZW] = 1; pile[sp++] = p - ZW }
      if (py < ZH - 1 && !vu[p + ZW] && noir(p + ZW)) { vu[p + ZW] = 1; pile[sp++] = p + ZW }
    }
    out.push({ aire, x: X + x0, y: Y + y0, w: x1 - x0 + 1, h: y1 - y0 + 1 })
  }
  return out
}

const sg = await charge(SG)
const ja = await charge(JA)
const sources = new Map([[SG, sg], [JA, ja]])

const brutes = composantes(sg, VAGUES)
const retenues = brutes.filter(b =>
  b.w >= VAGUE_MIN_W && b.w <= VAGUE_MAX_W &&
  b.h >= VAGUE_MIN_H && b.h <= VAGUE_MAX_H &&
  b.aire >= VAGUE_MIN_AIRE)
console.log(`vagues : ${brutes.length} composantes, ${retenues.length} dans les bornes`)
if (retenues.length < VAGUES_GARDEES) {
  throw new Error(`seulement ${retenues.length} vagues retenues, il en faut ${VAGUES_GARDEES} — elargir VAGUES ou les bornes`)
}

const vagues = []
for (const b of [...retenues].sort((a, c) => c.aire - a.aire)) {
  if (vagues.some(v => Math.abs(v.w - b.w) <= 1 && Math.abs(v.h - b.h) <= 1)) continue
  vagues.push(b)
  if (vagues.length === VAGUES_GARDEES) break
}
if (vagues.length < VAGUES_GARDEES) {
  throw new Error(`${vagues.length} vagues distinctes sur ${retenues.length} retenues, il en faut ${VAGUES_GARDEES}`)
}
const PAD = 5
const pieces = vagues.map(b => {
  const x = b.x - PAD; const y = b.y - PAD
  const w = b.w + PAD * 2; const h = b.h + PAD * 2
  const piece = decoupe(sg, x, y, w, h)
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const dedans = x + xx >= b.x && x + xx < b.x + b.w && y + yy >= b.y && y + yy < b.y + b.h
      if (!dedans) piece.rgba[(yy * w + xx) * 4 + 3] = 0
    }
  }
  return { kind: 'wave', src: [b.x, b.y], ...piece }
})
function creature(src, [X, Y, ZW, ZH]) {
  const comps = composantes(src, { x: X, y: Y, w: ZW, h: ZH })
  const dedans = comps.filter(b =>
    b.x > X && b.y > Y && b.x + b.w < X + ZW && b.y + b.h < Y + ZH)
  if (!dedans.length) throw new Error(`aucune composante interieure dans [${X},${Y},${ZW},${ZH}]`)
  const x0 = Math.min(...dedans.map(b => b.x))
  const y0 = Math.min(...dedans.map(b => b.y))
  const x1 = Math.max(...dedans.map(b => b.x + b.w))
  const y1 = Math.max(...dedans.map(b => b.y + b.h))
  const garde = (x, y) => dedans.some(b =>
    x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)
  return {
    rect: [x0 - MARGE, y0 - MARGE, x1 - x0 + MARGE * 2, y1 - y0 + MARGE * 2],
    garde,
  }
}

for (const { fichier, kind, rect } of MAIN) {
  const src = sources.get(fichier)
  const { rect: [x, y, w, h], garde } = creature(src, rect)
  const piece = decoupe(src, x, y, w, h)
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      if (!garde(x + xx, y + yy)) piece.rgba[(yy * w + xx) * 4 + 3] = 0
    }
  }
  console.log(`  ${kind} : cadre demande [${rect.join(',')}] -> retenu [${[x, y, w, h].join(',')}]`)
  pieces.push({ kind, src: [x, y], ...piece })
}

const BORD_OPAQUE = 40
for (const p of pieces) {
  const a = (x, y) => p.rgba[(y * p.w + x) * 4 + 3]
  const cotes = []
  for (let x = 0; x < p.w; x++) {
    if (a(x, 0) > BORD_OPAQUE) cotes.push('haut')
    if (a(x, p.h - 1) > BORD_OPAQUE) cotes.push('bas')
  }
  for (let y = 0; y < p.h; y++) {
    if (a(0, y) > BORD_OPAQUE) cotes.push('gauche')
    if (a(p.w - 1, y) > BORD_OPAQUE) cotes.push('droite')
  }
  if (cotes.length) {
    throw new Error(`sprite ${p.kind} @${p.src} TRONQUE : de l'encre touche le bord ` +
      `(${[...new Set(cotes)].join(', ')}) — elargir son cadre dans MAIN`)
  }
}

await ecrisAtlas(pieces, OUT_DIR, 'sea-sprites',
  'Vagues, monstres marins et navire decoupes dans les cartes annexes (south-genabackis-and-environs, the-isle-of-jacuruku) par tools/sea.mjs. Les vagues sont detectees par etiquetage de composantes, les creatures relevees a la main. Consomme par tools/paint-terrain.mjs, qui les CUIT dans la carte-monde : cet atlas ne part pas au navigateur. x/y/w/h = position dans le png ; src = origine dans la carte source.')

if (args.planche) {
  await planche(pieces, path.join(OUT_DIR, '_planche-sea.png'), 200)
}
