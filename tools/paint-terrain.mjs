import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)
const SRC = path.join(ROOT, args.src || 'genabackis/malazan-world-map-2025.png')
const OUT = path.join(ROOT, args.out || 'genabackis/malazan-world-map-2025-terrain.png')
const DATA = path.join(ROOT, 'frontend/public/data/terrain.geojson')
const DECOR = path.join(ROOT, 'frontend/public/decor')
const ATLAS = [
  ['terrain-sprites.png', 'terrain-sprites.json'],
  ['sea-sprites.png', 'sea-sprites.json'],
  ['biome-sprites.png', 'biome-sprites.json'],
]

const HAUT = { mountain: 30, forest: 15, wave: 10, monster: 70, ship: 80,
  dune: 14, icefield: 11, plain: 10 }
const ANCRE = { mountain: 0.66, forest: 0.66, wave: 0.5, monster: 0.5, ship: 0.5,
  dune: 0.5, icefield: 0.5, plain: 0.5 }
const LOT = 400

const meta = await sharp(SRC).metadata()
const W = meta.width
const H = meta.height

const fc = JSON.parse(await readFile(DATA, 'utf8'))

const jeux = {}
for (const [png, json] of ATLAS) {
  const sprites = JSON.parse(await readFile(path.join(DECOR, json), 'utf8')).sprites
  const buf = await readFile(path.join(DECOR, png))
  for (const [kind, liste] of Object.entries(sprites)) jeux[kind] = { liste, buf }
}

function variantOf(x, y, n) {
  if (n <= 1) return 0
  let h = (x * 19349663) ^ (y * 83492791)
  h = Math.imul(h ^ (h >>> 11), 0x27d4eb2d)
  return ((h ^ (h >>> 16)) >>> 0) % n
}

const RONDE_SOUS = 4

const cache = new Map()
async function rendu(kind, idx, h) {
  const cle = `${kind}/${idx}/${h}`
  let buf = cache.get(cle)
  if (buf) return buf
  const jeu = jeux[kind]
  const sp = jeu.liste[idx]
  const w = Math.max(1, Math.round(h * (sp.w / sp.h)))
  buf = await sharp(jeu.buf)
    .extract({ left: sp.x, top: sp.y, width: sp.w, height: sp.h })
    .resize(w, h)
    .png()
    .toBuffer()
  cache.set(cle, { buf, w, h })
  return cache.get(cle)
}

const semes = {}
for (const f of fc.features) semes[f.properties.kind] = (semes[f.properties.kind] || 0) + 1

const calques = []
let horsCadre = 0
const compte = {}
const rang = {}
for (const f of fc.features) {
  const [x, y] = f.geometry.coordinates
  const { kind, scale } = f.properties
  if (!HAUT[kind]) continue
  const jeu = jeux[kind]
  if (!jeu?.liste?.length) continue
  const n = jeu.liste.length
  rang[kind] = (rang[kind] ?? -1) + 1
  const variante = semes[kind] < n * RONDE_SOUS ? rang[kind] % n : variantOf(x, y, n)
  const h = Math.max(1, Math.round(HAUT[kind] * (Number(scale) || 1)))
  const { buf, w } = await rendu(kind, variante, h)
  const left = Math.round(x - w / 2)
  const top = Math.round(y - h * ANCRE[kind])
  if (left < 0 || top < 0 || left + w > W || top + h > H) { horsCadre++; continue }
  calques.push({ input: buf, left, top })
  compte[kind] = (compte[kind] || 0) + 1
}
console.log(`sprites : ${Object.entries(compte).map(([k, n]) => `${k} ${n}`).join(' · ')}` +
  (horsCadre ? ` · ${horsCadre} ecartes en bord de carte` : ''))

let buffer = await sharp(SRC).png().toBuffer()
for (let i = 0; i < calques.length; i += LOT) {
  buffer = await sharp(buffer).composite(calques.slice(i, i + LOT)).png().toBuffer()
  process.stdout.write(`\r  peinture ${Math.min(i + LOT, calques.length)}/${calques.length}`)
}
process.stdout.write('\n')

await writeFile(OUT, buffer)
const s = await sharp(OUT).metadata()
console.log(`ecrit : ${OUT} (${s.width}x${s.height})`)
console.log('a enchainer : tools/tile.mjs et tools/globe-texture.mjs sur cette image')
