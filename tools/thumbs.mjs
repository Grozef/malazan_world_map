import sharp from 'sharp'
import { readFile, mkdir, readdir } from 'node:fs/promises'

const IMG = '../frontend/public/img/'
const OUT = '../frontend/public/decor/thumbs/'
const LARGEUR = 320

await mkdir(OUT, { recursive: true })
const meta = JSON.parse(await readFile('atlas-meta.json', 'utf8'))
const fichiers = await readdir(IMG)
const extension = new Map(fichiers.map(f => [f.replace(/\.[^.]+$/, ''), f.match(/\.[^.]+$/)[0]]))

let n = 0
let poids = 0
for (const m of meta.maps) {
  if (m.duplicateOf) continue
  const ext = extension.get(m.id)
  const info = await sharp(IMG + m.id + ext)
    .resize({ width: LARGEUR, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(OUT + m.id + '.webp')
  n++
  poids += info.size
}
console.log(`${n} vignettes de ${LARGEUR} px ecrites dans ${OUT} — ${(poids / 1024).toFixed(0)} ko au total`)
