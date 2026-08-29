import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { charge, decoupe, ecrisAtlas, planche } from './atlas.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'genabackis/Genabackis_Grey_by_Joshua_Butler (1).webp')
const OUT_DIR = path.join(ROOT, 'frontend/public/decor')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)

const TERRAIN = {
  mountain: [
    [548, 2682, 52, 38],
    [578, 2695, 44, 40],
    [543, 2718, 49, 42],
    [545, 2768, 39, 44],
    [493, 2680, 54, 50],
    [1004, 1654, 38, 50],
  ],
  forest: [
    [608, 2670, 16, 26],
    [625, 2704, 17, 26],
    [657, 1182, 20, 26],
  ],
}

const CITY = {
  major: [[2480, 1106, 53, 51]],
  minor: [[2701, 1105, 48, 52]],
  fort: [[2923, 1099, 36, 58]],
  village: [[2485, 1230, 43, 47]],
  camp: [[2702, 1229, 48, 48]],
  ruins: [[2922, 1233, 39, 40]],
}

const src = await charge(SRC)

function pieces(specimens) {
  const out = []
  for (const [kind, rects] of Object.entries(specimens)) {
    for (const [x, y, w, h] of rects) out.push({ kind, src: [x, y], ...decoupe(src, x, y, w, h) })
  }
  return out
}

const terrain = pieces(TERRAIN)
const city = pieces(CITY)
await ecrisAtlas(terrain, OUT_DIR, 'terrain-sprites',
  'Symboles de relief et de foret decoupes dans la carte de Genabackis de Joshua Butler par tools/sprites.mjs. Consomme par tools/paint-terrain.mjs, qui les CUIT dans la carte-monde : cet atlas ne part pas au navigateur. x/y/w/h = position dans le png ; src = origine dans la carte source.')
await ecrisAtlas(city, OUT_DIR, 'city-sprites',
  'Symboles de lieu releves dans la LEGENDE de la carte de Genabackis de Joshua Butler par tools/sprites.mjs. Servi au navigateur : les villes restent une couche interactive, elles ne sont pas peintes dans le fond. x/y/w/h = position dans le png ; src = origine dans la carte source.')

if (args.planche) {
  await planche([...terrain, ...city], path.join(OUT_DIR, '_planche-sprites.png'))
}
