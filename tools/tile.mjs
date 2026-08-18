// Pyramide de tuiles pour Leaflet CRS.Simple (carte-monde et cartes annexes).
//   node tools/tile.mjs                                    # base 2025 -> tiles/2025
//   node tools/tile.mjs --src=genabackis/world-of-the-malazan-empire.png --out=tiles/2020
//   node tools/tile.mjs --src=frontend/public/img/Map_Quon_Tali.webp --out=tiles/regions/quon_tali
//   node tools/tile.mjs --quality=75
// --src est relatif a la racine du depot, --out a frontend/public/.
//
// GEOMETRIE (derivee, pas devinee — leaflet/src/geo/crs/CRS.Simple.js:18
// transformation (1, 0, -1, 0), projection LonLat) :
//   px =  lng * 2^z            lng = x source, donc px = x a l'echelle du zoom
//   py = -lat * 2^z            lat = H - y (utils/coords.js), donc py = y - zh
// Nos bornes sont lat [0..H] / lng [0..W] : py est NEGATIF sur toute la carte,
// et les indices Y de tuiles valent donc -rows..-1. Le decoupage vertical doit
// etre ALIGNE SUR LE BAS de l'image (la tuile -1 est la bande du bas) ; c'est la
// tuile du HAUT qui se complete en transparent, l'inverse d'un tuilage web usuel.
// Les dossiers portent le zoom LEAFLET (negatif) : aucun zoomOffset cote client.
import sharp from 'sharp'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const TILE = 256

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)
const quality = Number(args.quality) || 80
const SRC = path.join(ROOT, args.src || 'genabackis/malazan-world-map-2025.png')
const OUT = path.join(ROOT, 'frontend/public', args.out || 'tiles/2025')

const meta = await sharp(SRC).metadata()
const W = meta.width
const H = meta.height
// Niveau natif maximal : 1 px source = 1 px ecran au zoom Leaflet 0
const LEVELS = Math.ceil(Math.log2(Math.max(W, H) / TILE))

await rm(OUT, { recursive: true, force: true }) // pas de tuile perimee au reset
console.log(`source ${W}x${H} -> zooms Leaflet ${-LEVELS}..0 (webp q${quality})`)

let total = 0
for (let level = 0; level <= LEVELS; level++) {
  const z = level - LEVELS
  const scale = Math.pow(2, z)
  const zw = Math.max(1, Math.round(W * scale))
  const zh = Math.max(1, Math.round(H * scale))
  const cols = Math.ceil(zw / TILE)
  const rows = Math.ceil(zh / TILE)

  // Un seul redimensionnement par niveau, garde en RAW : re-decoder un PNG
  // pour chacune des 880 tuiles du niveau 0 couterait des minutes.
  const { data, info } = await sharp(SRC)
    .resize(zw, zh)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const raw = { width: info.width, height: info.height, channels: info.channels }

  for (let tx = 0; tx < cols; tx++) {
    await mkdir(path.join(OUT, String(z), String(tx)), { recursive: true })
    for (let ty = -rows; ty <= -1; ty++) {
      const left = tx * TILE
      const width = Math.min(TILE, zw - left)
      const top = zh + ty * TILE          // negatif sur la tuile du haut
      const srcTop = Math.max(0, top)
      const height = Math.min(zh, top + TILE) - srcTop
      await sharp(data, { raw })
        .extract({ left, top: srcTop, width, height })
        .extend({
          top: srcTop - top,              // comble le debord au-dessus du bord haut
          right: TILE - width,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality })
        .toFile(path.join(OUT, String(z), String(tx), `${ty}.webp`))
      total++
    }
  }
  console.log(`zoom ${z} : ${zw}x${zh}, ${cols}x${rows} tuiles`)
}
console.log(`termine : ${total} tuiles dans ${OUT}`)
