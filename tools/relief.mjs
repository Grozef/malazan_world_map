// Relief iteration A (etape 6 du plan) : ombrage automatique.
//   node tools/relief.mjs --crop=4400,900,1000,1000   # prototype (PNG + preview composite)
//   node tools/relief.mjs                             # passe complete -> relief-shade.webp
// Deux modes (--mode=dome par defaut) :
//   dome   : la carte 2019 est PLATE (aucune montagne dessinee, constat crop 2026-07-06),
//            donc heightmap synthetique = flou large du masque terre (continents en domes
//            doux) -> emboss NW -> ombres seules. Les labels du scan n'y participent pas.
//   emboss : pipeline initial du plan (grayscale -> blur -> emboss de la carte elle-meme).
//            Conserve pour reference ; ne grave que cotes/rivieres/labels, decevant.
// Sortie : RGBA noir, alpha = intensite d'ombre, ocean coupe par le masque.
// L'imageOverlay Leaflet (opacity ~0.35) ne change plus ; seule l'image s'ameliore
// (iteration B : --heightmap, hillshade depuis une heightmap peinte).
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'frontend/public/img/malazan-world-map-2019.png')
const MASK = path.join(ROOT, 'frontend/public/decor/land-mask.png') // terre=255, ocean=0
const OUT_FULL = path.join(ROOT, 'frontend/public/decor/relief-shade.webp')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)
const crop = args.crop ? args.crop.split(',').map(Number) : null // x,y,w,h
const mode = args.mode || 'dome'
const gain = Number(args.gain) || (mode === 'dome' ? 12 : 2)
const blur = Number(args.blur) || 1.2
const domeBlur = Number(args.domeblur) || 45 // sigma du flou masque->heightmap
const invert = !!args.invert // inverse la direction de la lumiere

const region = crop && { left: crop[0], top: crop[1], width: crop[2], height: crop[3] }
const meta = await sharp(SRC).metadata()
const W = region ? region.width : meta.width
const H = region ? region.height : meta.height

// Emboss lumiere Nord-Ouest : somme 0 + offset 128 -> plat = 128, ombres < 128
const k = invert ? -1 : 1
const kernel = [-2 * k, -1 * k, 0, -1 * k, 0, 1 * k, 0, 1 * k, 2 * k]

let emb
if (mode === 'dome') {
  // Heightmap synthetique au 1/4 de resolution (l'upscale lisse le banding 8 bits
  // du flou, qui ressort sinon en fausses courbes de niveau), puis emboss et
  // remontee pleine taille. Le crop arrive en dernier : le flou et l'emboss ont
  // besoin des voisins hors cadre.
  const SCALE = 4
  const sw = Math.round(meta.width / SCALE)
  const sh = Math.round(meta.height / SCALE)
  const embSmall = await sharp(MASK)
    .resize(sw, sh)
    .grayscale()
    .blur(domeBlur / SCALE)
    .convolve({ width: 3, height: 3, kernel, scale: 1, offset: 128 })
    .png()
    .toBuffer()
  let hm = sharp(embSmall).resize(meta.width, meta.height)
  if (region) hm = hm.extract(region)
  emb = await hm.raw().toBuffer({ resolveWithObject: true })
} else {
  let src = sharp(SRC)
  if (region) src = src.extract(region)
  emb = await src
    .grayscale()
    .blur(blur) // attenue hachures/labels du scan avant derivation
    .convolve({ width: 3, height: 3, kernel, scale: 1, offset: 128 })
    .raw()
    .toBuffer({ resolveWithObject: true })
}

let maskSharp = sharp(MASK)
if (region) maskSharp = maskSharp.extract(region)
const msk = await maskSharp.grayscale().raw().toBuffer({ resolveWithObject: true })

// RGBA "ombres seulement" : noir, alpha = (128 - emboss) * gain, coupe par le masque
const embC = emb.info.channels
const mskC = msk.info.channels
const out = Buffer.alloc(W * H * 4)
for (let i = 0; i < W * H; i++) {
  const g = emb.data[i * embC]
  const m = msk.data[i * mskC]
  const shade = Math.max(0, 128 - g) * gain
  out[i * 4 + 3] = Math.min(255, shade) * m / 255
}

const shadeImg = sharp(out, { raw: { width: W, height: H, channels: 4 } })

if (crop) {
  const shadePng = path.join(ROOT, 'tools/relief-crop.png')
  await shadeImg.png().toFile(shadePng)
  // Preview : ombres composees a 35% sur le crop source (rendu Leaflet simule)
  const faded = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .ensureAlpha().linear([1, 1, 1, 0.35], [0, 0, 0, 0]).png().toBuffer()
  await sharp(SRC).extract(region)
    .composite([{ input: faded }])
    .png().toFile(path.join(ROOT, 'tools/relief-crop-preview.png'))
  console.log(`crop ${crop.join(',')} -> tools/relief-crop.png + tools/relief-crop-preview.png (mode ${mode}, gain ${gain}${invert ? ', invert' : ''})`)
} else {
  await shadeImg.webp({ quality: 82, alphaQuality: 80 }).toFile(OUT_FULL)
  const s = await sharp(OUT_FULL).metadata()
  console.log(`-> ${OUT_FULL} (${s.width}x${s.height}, mode ${mode}, gain ${gain}${invert ? ', invert' : ''})`)
}
