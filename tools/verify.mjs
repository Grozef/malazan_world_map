import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ROOT, SRC } from './palette.mjs'

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true })
const W = info.width; const H = info.height; const ch = info.channels

const MAX_LETTRE = 140
function masque(test) {
  const encre = new Uint8Array(W * H)
  for (let p = 0, i = 0; p < encre.length; p++, i += ch) {
    encre[p] = test(data[i], data[i + 1], data[i + 2]) ? 1 : 0
  }
  const lab = new Int32Array(W * H).fill(-1)
  const pile = new Int32Array(W * H)
  const out = new Uint8Array(W * H)
  let maxW = 0; let maxH = 0; let trop = 0
  for (let s = 0; s < encre.length; s++) {
    if (!encre[s] || lab[s] >= 0) continue
    let sp = 0; let n = 0; let x0 = W; let x1 = 0; let y0 = H; let y1 = 0
    const pix = []
    pile[sp++] = s; lab[s] = s
    while (sp > 0) {
      const p = pile[--sp]; pix.push(p); n++
      const x = p % W; const y = (p / W) | 0
      if (x < x0) x0 = x; if (x > x1) x1 = x
      if (y < y0) y0 = y; if (y > y1) y1 = y
      if (x > 0 && encre[p - 1] && lab[p - 1] < 0) { lab[p - 1] = s; pile[sp++] = p - 1 }
      if (x < W - 1 && encre[p + 1] && lab[p + 1] < 0) { lab[p + 1] = s; pile[sp++] = p + 1 }
      if (y > 0 && encre[p - W] && lab[p - W] < 0) { lab[p - W] = s; pile[sp++] = p - W }
      if (y < H - 1 && encre[p + W] && lab[p + W] < 0) { lab[p + W] = s; pile[sp++] = p + W }
    }
    const bw = x1 - x0 + 1; const bh = y1 - y0 + 1
    if (bw <= MAX_LETTRE && bh <= MAX_LETTRE && n >= 8) {
      for (const p of pix) out[p] = 1
      if (bw > maxW) maxW = bw
      if (bh > maxH) maxH = bh
    } else if (n >= 8 && bw <= 400 && bh <= 400) trop++
  }
  return { out, maxW, maxH, trop }
}

const sombre = masque((r, g, b) => r < 110 && g < 110 && b < 110)
const rouge = masque((r, g, b) => r >= 70 && r <= 190 && g < 70 && b < 70 && r - Math.max(g, b) > 50)
console.log(`lettres sombres : plus grande ${sombre.maxW}x${sombre.maxH}, ${sombre.trop} composantes ecartees pour taille (140..400)`)
console.log(`lettres rouges  : plus grande ${rouge.maxW}x${rouge.maxH}, ${rouge.trop} composantes ecartees pour taille (140..400)`)

const HAUT = { mountain: 30, forest: 15, wave: 10, monster: 70, ship: 80 }
const atlas = {}
for (const f of ['terrain-sprites', 'sea-sprites']) {
  const m = JSON.parse(await readFile(path.join(ROOT, 'frontend/public/decor', f + '.json'), 'utf8')).sprites
  for (const [k, v] of Object.entries(m)) atlas[k] = v
}
const fc = JSON.parse(await readFile(path.join(ROOT, 'frontend/public/data/terrain.geojson'), 'utf8'))

function compte(mask, nom) {
  let n = 0; const ex = []
  for (const ft of fc.features) {
    const [x, y] = ft.geometry.coordinates
    const k = ft.properties.kind
    if (!HAUT[k]) continue
    const sp = atlas[k][0]
    const h = Math.round(HAUT[k] * (ft.properties.scale || 1))
    const w = Math.round(h * sp.w / sp.h)
    const anc = (k === 'mountain' || k === 'forest') ? 0.66 : 0.5
    const top = Math.round(y - h * anc); const left = Math.round(x - w / 2)
    let touche = false
    for (let yy = top; yy < top + h && !touche; yy++) {
      for (let xx = left; xx < left + w; xx++) {
        if (xx < 0 || xx >= W || yy < 0 || yy >= H) continue
        if (mask[yy * W + xx]) { touche = true; break }
      }
    }
    if (touche) { n++; if (ex.length < 6) ex.push(`${k} @${x},${y}`) }
  }
  console.log(`symboles sur un toponyme ${nom} : ${n} / ${fc.features.length}${ex.length ? '  -> ' + ex.join(' · ') : ''}`)
  return n
}

const a = compte(sombre.out, 'SOMBRE')
const b = compte(rouge.out, 'ROUGE ')
console.log(a + b === 0 ? 'OK — aucun symbole sur un toponyme' : 'ECHEC — il reste des chevauchements')
process.exit(a + b === 0 ? 0 : 1)
