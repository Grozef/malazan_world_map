import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]
}))
const src = path.isAbsolute(args.src) ? args.src : path.join(ROOT, args.src)
const [x0, y0, x1, y1] = args.box.split(',').map(Number)
const zoom = Number(args.zoom) || 2
const pas = Number(args.pas) || 20
const meta = await sharp(src).metadata()
const gx0 = Math.max(0, x0), gy0 = Math.max(0, y0)
const gx1 = Math.min(meta.width, x1), gy1 = Math.min(meta.height, y1)
const w = gx1 - gx0, h = gy1 - gy0
const W = Math.round(w * zoom), H = Math.round(h * zoom)

let lignes = ''
for (let x = Math.ceil(gx0 / pas) * pas; x < gx1; x += pas) {
  const px = (x - gx0) * zoom
  const gros = x % 100 === 0
  lignes += `<line x1="${px}" y1="0" x2="${px}" y2="${H}" stroke="${gros ? '#e01b1b' : '#1b7fe0'}" stroke-width="${gros ? 1.4 : 0.6}" opacity="${gros ? 0.85 : 0.45}"/>`
  if (gros) lignes += `<text x="${px + 3}" y="14" font-family="monospace" font-size="13" fill="#e01b1b">${x}</text>`
}
for (let y = Math.ceil(gy0 / pas) * pas; y < gy1; y += pas) {
  const py = (y - gy0) * zoom
  const gros = y % 100 === 0
  lignes += `<line x1="0" y1="${py}" x2="${W}" y2="${py}" stroke="${gros ? '#e01b1b' : '#1b7fe0'}" stroke-width="${gros ? 1.4 : 0.6}" opacity="${gros ? 0.85 : 0.45}"/>`
  if (gros) lignes += `<text x="3" y="${py - 3}" font-family="monospace" font-size="13" fill="#e01b1b">${y}</text>`
}

if (args.points) {
  const { readFileSync } = await import('node:fs')
  const d = JSON.parse(readFileSync(args.points, 'utf8'))
  const villes = (d.villes || d.cities || d).filter(v => v.x >= gx0 && v.x < gx1 && v.y >= gy0 && v.y < gy1)
  let n = 0
  let marques = ''
  for (const v of villes) {
    n++
    const px = (v.x - gx0) * zoom, py = (v.y - gy0) * zoom
    marques += `<circle cx="${px}" cy="${py}" r="5" fill="none" stroke="#00a000" stroke-width="2"/>`
    marques += `<text x="${px + 7}" y="${py - 6}" font-family="monospace" font-size="15" font-weight="bold" fill="#00a000">${n}</text>`
  }
  lignes += marques
  console.error('points : ' + villes.map((v, i) => `${i + 1}=(${v.x},${v.y})`).join(' '))
}
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${lignes}</svg>`)
await sharp(src).extract({ left: gx0, top: gy0, width: w, height: h }).resize(W, H, { kernel: 'nearest' })
  .composite([{ input: svg }]).png().toFile(args.out)
console.log(`${args.out} : source ${path.basename(src)} ${gx0},${gy0} -> ${gx1},${gy1} (${w}x${h}) zoom ${zoom} -> ${W}x${H}, grille ${pas} px`)
