import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]
}))
const brut = args.src || 'frontend/public/decor/globe-2025-8192.webp'
const SRC = path.isAbsolute(brut) ? brut : path.join(ROOT, brut)
const N = Number(args.taille) || 900
const RAD = Math.PI / 180
const lat0 = (args.lat === undefined ? -90 : Number(args.lat)) * RAD
const lon0 = (Number(args.lon) || 0) * RAD
const pasGrille = Number(args.grille) || 0

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, ch = info.channels
const out = Buffer.alloc(N * N * 3, 255)
const sinL = Math.sin(lat0), cosL = Math.cos(lat0)

for (let py = 0; py < N; py++) {
  for (let px = 0; px < N; px++) {
    const u = (px + 0.5) / N * 2 - 1
    const v = 1 - (py + 0.5) / N * 2      // v vers le NORD
    const rho = Math.hypot(u, v)
    if (rho > 1) continue
    const c = Math.asin(rho)
    const sc = Math.sin(c), cc = Math.cos(c)
    const lat = rho === 0 ? lat0 : Math.asin(cc * sinL + (v * sc * cosL) / rho)
    const lon = lon0 + Math.atan2(u * sc, rho * cc * cosL - v * sc * sinL)
    const theta = Math.PI / 2 - lat                       // 0 au pole nord
    let sx = Math.round(((lon / (2 * Math.PI)) % 1 + 1) % 1 * W)
    if (sx >= W) sx -= W
    const sy = Math.min(H - 1, Math.max(0, Math.round(theta / Math.PI * H)))
    const i = (sy * W + sx) * ch, o = (py * N + px) * 3
    if (pasGrille && Math.abs(((lat / RAD) % pasGrille + pasGrille) % pasGrille) < 0.12) {
      out[o] = 224; out[o + 1] = 27; out[o + 2] = 27
    } else {
      out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2]
    }
  }
}
await sharp(out, { raw: { width: N, height: N, channels: 3 } }).png().toFile(args.out)
console.log(`${args.out} : centre lat ${(lat0 / RAD).toFixed(0)} lon ${(lon0 / RAD).toFixed(0)}, ${N}x${N}, texture ${path.basename(SRC)} ${W}x${H}${pasGrille ? `, paralleles tous les ${pasGrille} deg` : ''}`)
