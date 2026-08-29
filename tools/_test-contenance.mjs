import { biomeMask, BIOME_BY_KEY } from './palette.mjs'

const CAS = [
  { id: 'kolanse', avant: [2530, 3500, 3480, 4400], apres: [2836, 3376, 3507, 4339], fenetre: [2400, 3200, 3700, 4500] },
  { id: 'assail-and-environs', avant: [7150, 2450, 8060, 3450], apres: [7113, 2235, 8011, 3665], fenetre: [6950, 2100, 8200, 3800] },
  { id: 'the-isle-of-jacuruku', avant: [4230, 3240, 4860, 3960], apres: [4172, 2942, 5007, 4131], fenetre: [4050, 2850, 5100, 4250] },
  { id: 'falar-and-environs', avant: [4880, 1720, 5800, 2880], apres: [4857, 1705, 5732, 2453], fenetre: [4750, 1600, 5900, 3000] },
]

const OCEAN = BIOME_BY_KEY.ocean.id
const TERRES = ['plain', 'mountain', 'desert', 'steppe', 'foothill', 'forest', 'ice'].map(k => BIOME_BY_KEY[k].id)

function contient(e, b) {
  const dx0 = b[0] - e[0], dy0 = b[1] - e[1], dx1 = e[2] - b[2], dy1 = e[3] - b[3]
  const debords = []
  if (dx0 < 0) debords.push('ouest ' + (-dx0) + ' px')
  if (dy0 < 0) debords.push('nord ' + (-dy0) + ' px')
  if (dx1 < 0) debords.push('est ' + (-dx1) + ' px')
  if (dy1 < 0) debords.push('sud ' + (-dy1) + ' px')
  return debords
}

for (const c of CAS) {
  const [fx0, fy0, fx1, fy1] = c.fenetre
  const { mask, W, H } = await biomeMask({ region: { left: fx0, top: fy0, width: fx1 - fx0, height: fy1 - fy0 } })
  const set = new Set(TERRES)
  const terre = new Uint8Array(W * H)
  for (let p = 0; p < mask.length; p++) terre[p] = set.has(mask[p]) ? 1 : 0
  const vu = new Uint8Array(W * H); const pile = new Int32Array(W * H); let best = null
  for (let s = 0; s < W * H; s++) {
    if (!terre[s] || vu[s]) continue
    let n = 0, top = 0; pile[top++] = s; vu[s] = 1
    let minx = 1e9, maxx = -1, miny = 1e9, maxy = -1
    while (top) {
      const p = pile[--top], x = p % W, y = (p / W) | 0; n++
      if (x < minx) minx = x; if (x > maxx) maxx = x
      if (y < miny) miny = y; if (y > maxy) maxy = y
      if (x > 0 && terre[p - 1] && !vu[p - 1]) { vu[p - 1] = 1; pile[top++] = p - 1 }
      if (x < W - 1 && terre[p + 1] && !vu[p + 1]) { vu[p + 1] = 1; pile[top++] = p + 1 }
      if (y > 0 && terre[p - W] && !vu[p - W]) { vu[p - W] = 1; pile[top++] = p - W }
      if (y < H - 1 && terre[p + W] && !vu[p + W]) { vu[p + W] = 1; pile[top++] = p + W }
    }
    if (!best || n > best.n) best = { n, minx, maxx, miny, maxy }
  }
  const b = [fx0 + best.minx, fy0 + best.miny, fx0 + best.maxx, fy0 + best.maxy]
  const dAvant = contient(c.avant, b), dApres = contient(c.apres, b)
  console.log(c.id)
  console.log('   masse de terre mesuree : [' + b.join(',') + ']  ' + (b[2] - b[0]) + 'x' + (b[3] - b[1]))
  console.log('   AVANT [' + c.avant.join(',') + '] -> ' + (dAvant.length ? 'COUPE la terre : ' + dAvant.join(', ') : 'contient tout'))
  console.log('   APRES [' + c.apres.join(',') + '] -> ' + (dApres.length ? 'COUPE la terre : ' + dApres.join(', ') : 'contient tout'))
}
