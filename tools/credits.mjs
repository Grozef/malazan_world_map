import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'genabackis/malazan-world-map-2025.png')
const OUT = path.join(ROOT, 'frontend/public/decor/credits.webp')

const BOITE = { left: 23, top: 17, width: 1396, height: 964 }
const LARGEUR = 800

const { width, height } = await sharp(SRC).metadata()
if (BOITE.left + BOITE.width > width || BOITE.top + BOITE.height > height) {
  throw new Error(`boite hors source (${width}x${height})`)
}

await sharp(SRC)
  .extract(BOITE)
  .resize(LARGEUR)
  .webp({ quality: 88 })
  .toFile(OUT)

const apres = await sharp(OUT).metadata()
console.log(`credits : ${BOITE.width}x${BOITE.height} -> ${apres.width}x${apres.height} · ${OUT}`)
