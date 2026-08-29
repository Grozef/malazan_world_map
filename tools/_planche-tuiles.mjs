import sharp from 'sharp'
import path from 'node:path'
import { existsSync } from 'node:fs'

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]
}))
const RACINE = args.racine || 'C:/laragon/www/portfolios/dev_portfolio/frontend/public/malazan-assets/tiles/2025'
const TILE = 256, ZW = 10000, ZH = 5571
const [x0, y0, x1, y1] = args.box.split(',').map(Number)
const w = x1 - x0, h = y1 - y0
const tx0 = Math.floor(x0 / TILE), tx1 = Math.floor((x1 - 1) / TILE)
const ty0 = Math.floor((y0 - ZH) / TILE), ty1 = Math.floor((y1 - 1 - ZH) / TILE)
const calques = []
let manquantes = 0, posees = 0
for (let tx = tx0; tx <= tx1; tx++) {
  for (let ty = ty0; ty <= ty1; ty++) {
    const f = path.join(RACINE, '0', String(tx), `${ty}.webp`)
    if (!existsSync(f)) { manquantes++; continue }
    calques.push({ input: await sharp(f).png().toBuffer(), left: tx * TILE - x0, top: (ZH + ty * TILE) - y0 })
    posees++
  }
}
await sharp({ create: { width: w, height: h, channels: 3, background: '#ffffff' } })
  .composite(calques).png().toFile(args.out)
console.log(`${args.out} : ${w}x${h} depuis ${posees} tuiles servies de ${RACINE}${manquantes ? ` · ${manquantes} manquantes` : ''}`)
