// Texture equirectangulaire pour le globe 3D (route #/).
//   node tools/globe-texture.mjs                          # -> decor/globe-2025-4096.webp
//   node tools/globe-texture.mjs --size=8192
//   node tools/globe-texture.mjs --src=genabackis/world-of-the-malazan-empire.png --base=2020
// Deux tailles sont publiees par base : le client charge la 8192 quand le GPU
// l'accepte (MAX_TEXTURE_SIZE >= 8192), la 4096 sinon — beaucoup de GPU mobiles
// plafonnent a 4096 et refusent purement la texture au-dela.
// --src est relatif a la racine du depot.
// La carte 2025 fait 10000x5571 = ratio 1.795, alors qu'une projection
// equirectangulaire plaquee sur une sphere veut 2:1. On complete donc a
// 11142 px de large (571 px de chaque cote) par REPLICATION du pixel de bord
// (extendWith 'copy') : le haut reste ocean, le bas prolonge la calotte
// glaciaire, la couture a l'antimeridien reste invisible. Un remplissage a
// plat aurait ouvert une balafre bleue dans la banquise.
// Le trait d'equateur rouge de la carte est CONSERVE (annotation legitime sur
// une sphere, et il tombe pile a mi-hauteur, ce qui confirme la projection).
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)
const size = Number(args.size) || 4096 // largeur finale (hauteur = size / 2)
const SRC = path.join(ROOT, args.src || 'genabackis/malazan-world-map-2025.png')
const OUT = path.join(ROOT, 'frontend/public/decor', `globe-${args.base || '2025'}-${size}.webp`)

const meta = await sharp(SRC).metadata()
const targetW = meta.height * 2
const pad = Math.round((targetW - meta.width) / 2)
if (pad < 0) throw new Error(`source deja plus large que 2:1 (${meta.width}x${meta.height})`)

// Le cartouche de titre occupe le haut-gauche de la carte plate, cad la zone
// POLAIRE NORD une fois projetee : il s'enroule autour du pole et devient
// illisible (constat capture pole-nord). On le remplace par la couleur d'ocean
// pour le globe seul — la carte plate le conserve.
const OCEAN = { r: 196, g: 223, b: 255 } // echantillonne en (3000,200) et (200,3000)
// Cartouche 2025 mesure a ~x 60-1430 / y 50-1030, cale dans le coin haut-gauche.
// La 2020 porte le meme cartouche au meme endroit (mesure ~x 27-1416 / y 22-971).
const TITLE_BOX = { left: 0, top: 0, width: 1500, height: 1080 }

// TROIS passes obligatoires. Dans UN seul pipeline sharp l'ordre des operations
// est fige et ne suit pas l'ordre d'ecriture : resize s'execute avant extend
// (-> largeur size + 2*pad et crop vertical), et composite s'execute apres les
// deux (-> rectangle decale de pad vers la gauche). Chaque etape doit donc
// travailler sur le buffer de la precedente.
const cleaned = await sharp(SRC)
  .composite([{
    input: { create: { width: TITLE_BOX.width, height: TITLE_BOX.height, channels: 4, background: OCEAN } },
    left: TITLE_BOX.left,
    top: TITLE_BOX.top,
  }])
  .png()
  .toBuffer()

const padded = await sharp(cleaned)
  .extend({ left: pad, right: targetW - meta.width - pad, extendWith: 'copy' })
  .png()
  .toBuffer()

await sharp(padded)
  .resize(size, size / 2)
  .webp({ quality: 88 })
  .toFile(OUT)

const s = await sharp(OUT).metadata()
console.log(`-> ${OUT} (${s.width}x${s.height}, pad ${pad}px/cote depuis ${meta.width}x${meta.height})`)
