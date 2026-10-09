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
const size = Number(args.size) || 4096
const SRC = path.join(ROOT, args.src || 'genabackis/malazan-world-map-2025.png')
const OUT = path.join(ROOT, 'frontend/public/decor', `globe-${args.base || '2025'}-${size}.webp`)

const meta = await sharp(SRC).metadata()
const targetW = meta.height * 2
const pad = Math.round((targetW - meta.width) / 2)
if (pad < 0) throw new Error(`source deja plus large que 2:1 (${meta.width}x${meta.height})`)

const OCEAN = { r: 196, g: 223, b: 255 }
const TITLE_BOX = { left: 0, top: 0, width: 1500, height: 1080 }

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

// Calottes polaires. En equirectangulaire, la hauteur de la texture couvre 180 deg
// de colatitude : etaler la carte sur toute cette hauteur revient a etirer ses
// pixels de bord jusqu'au pole, ou la circonference tend vers zero. On cale donc
// la carte entre --calotte et 180 - --calotte degres, et on remplit les deux
// bandes restantes d'un aplat d'ocean, uniforme donc invisible a l'etirement.
const calotte = args.calotte === undefined ? 5 : Number(args.calotte)
if (!(calotte >= 0 && calotte < 90)) throw new Error(`--calotte hors bornes : ${args.calotte}`)

const H = size / 2
const bande = Math.round(H * calotte / 180)
const bandeH = H - 2 * bande

// fit 'fill' obligatoire : le defaut de sharp est 'cover', qui preserve le ratio
// et ROGNE pour remplir la boite. La carte serait alors amputee de ses 5 degres
// de bord au lieu d'etre comprimee dedans — et sur une source dont les bords sont
// uniformes, la sortie est byte-identique a la version sans calotte, donc le
// defaut passe inapercu.
const carte = await sharp(padded).resize(size, bandeH, { fit: 'fill' }).png().toBuffer()

// Couleur de chaque calotte = moyenne de la ligne de carte qui la touche. Un aplat
// bleu ocean serait faux au sud, ou le bord de carte est une banquise blanche.
const { data: px, info: pxi } = await sharp(carte).raw().toBuffer({ resolveWithObject: true })
function moyenneLigne(y) {
  let r = 0, g = 0, b = 0
  for (let x = 0; x < pxi.width; x++) {
    const i = (y * pxi.width + x) * pxi.channels
    r += px[i]; g += px[i + 1]; b += px[i + 2]
  }
  const n = pxi.width
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}
const capNord = moyenneLigne(0)
const capSud = moyenneLigne(pxi.height - 1)

// Deux extend en deux passes : chaines dans un meme pipeline, sharp n'en applique
// qu'un seul et la texture sort a la mauvaise hauteur (donc hors ratio 2:1).
const avecSud = await sharp(carte)
  .extend({ top: 0, bottom: bande, background: capSud })
  .png()
  .toBuffer()

await sharp(avecSud)
  .extend({ top: bande, bottom: 0, background: capNord })
  .webp({ quality: 88 })
  .toFile(OUT)

const s = await sharp(OUT).metadata()
const rgb = c => `${c.r},${c.g},${c.b}`
console.log(
  `-> ${OUT} (${s.width}x${s.height}, pad ${pad}px/cote depuis ${meta.width}x${meta.height}` +
  `, calotte ${calotte} deg = ${bande}px en haut et en bas, carte sur ${bandeH}px` +
  `, aplat nord rgb(${rgb(capNord)}) et sud rgb(${rgb(capSud)}))`
)
