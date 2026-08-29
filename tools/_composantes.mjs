import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]
}))
const src = path.isAbsolute(args.src) ? args.src : path.join(ROOT, args.src)
const seuil = Number(args.seuil) || 170
const dil = Number(args.dilate ?? 2)
const top = Number(args.top) || 6

const meta = await sharp(src).metadata()
const [bx0, by0, bx1, by1] = args.box
  ? args.box.split(',').map(Number)
  : [0, 0, meta.width, meta.height]
const W = bx1 - bx0, H = by1 - by0
const { data, info } = await sharp(src)
  .extract({ left: bx0, top: by0, width: W, height: H })
  .greyscale().raw().toBuffer({ resolveWithObject: true })

let masque = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) masque[i] = data[i * info.channels] < seuil ? 1 : 0
const encreBrute = masque.reduce((a, b) => a + b, 0)

for (let p = 0; p < dil; p++) {
  const tmp = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (masque[y * W + x]) { tmp[y * W + x] = 1; continue }
    if ((x > 0 && masque[y * W + x - 1]) || (x < W - 1 && masque[y * W + x + 1]) ||
        (y > 0 && masque[(y - 1) * W + x]) || (y < H - 1 && masque[(y + 1) * W + x])) tmp[y * W + x] = 1
  }
  masque = tmp
}

const lab = new Int32Array(W * H).fill(-1)
const comps = []
const pile = new Int32Array(W * H)
for (let s = 0; s < W * H; s++) {
  if (!masque[s] || lab[s] !== -1) continue
  const id = comps.length
  let n = 0, sp = 0
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  pile[sp++] = s; lab[s] = id
  while (sp) {
    const i = pile[--sp], x = i % W, y = (i / W) | 0
    n++
    if (x < x0) x0 = x; if (x > x1) x1 = x
    if (y < y0) y0 = y; if (y > y1) y1 = y
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
      const j = ny * W + nx
      if (masque[j] && lab[j] === -1) { lab[j] = id; pile[sp++] = j }
    }
  }
  comps.push({ n, bbox: [x0 + bx0, y0 + by0, x1 + bx0, y1 + by0] })
}
comps.sort((a, b) => b.n - a.n)
console.log(`${path.basename(src)} ${bx0},${by0}->${bx1},${by1} (${W}x${H}) seuil ${seuil} dilate ${dil}`)
console.log(`encre brute ${encreBrute} px (${(100 * encreBrute / (W * H)).toFixed(2)} %) · ${comps.length} composantes`)
for (const c of comps.slice(0, top)) {
  const [a, b, cc, d] = c.bbox
  console.log(`  ${String(c.n).padStart(8)} px  bbox [${a},${b},${cc},${d}]  ${cc - a + 1}x${d - b + 1}`)
}
