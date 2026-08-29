import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const ENCRE = 45
export const ALPHA_MIN = 0.2
export const TEINTE = [74, 62, 48]

export async function charge(fichier) {
  const { data, info } = await sharp(fichier).greyscale().raw().toBuffer({ resolveWithObject: true })
  return { data, W: info.width, H: info.height }
}

export function fondLocal({ data, W, H }, x0, y0, w, h, pad = 6) {
  const vals = []
  for (let y = Math.max(0, y0 - pad); y < Math.min(H, y0 + h + pad); y++) {
    for (let x = Math.max(0, x0 - pad); x < Math.min(W, x0 + w + pad); x++) {
      if (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h) continue
      vals.push(data[y * W + x])
    }
  }
  vals.sort((a, b) => a - b)
  return vals[Math.floor(vals.length * 0.5)] ?? 222
}

export function decoupe(src, x0, y0, w, h) {
  const { data, W } = src
  const bg = fondLocal(src, x0, y0, w, h)
  const rgba = Buffer.alloc(w * h * 4)
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const v = data[(y0 + yy) * W + (x0 + xx)]
      let a = (bg - v) / (bg - ENCRE)
      a = a < 0 ? 0 : a > 1 ? 1 : a
      if (a < ALPHA_MIN) a = 0
      const k = (yy * w + xx) * 4
      rgba[k] = Math.min(v, TEINTE[0])
      rgba[k + 1] = Math.min(v, TEINTE[1])
      rgba[k + 2] = Math.min(v, TEINTE[2])
      rgba[k + 3] = Math.round(a * 255)
    }
  }
  return { rgba, w, h, bg }
}

const GAP = 2

export async function ecrisAtlas(pieces, outDir, nom, note) {
  const atlasW = pieces.reduce((s, p) => s + p.w + GAP, GAP)
  const atlasH = Math.max(...pieces.map(p => p.h)) + GAP * 2
  const atlas = Buffer.alloc(atlasW * atlasH * 4)
  const meta = {}
  let cx = GAP
  for (const p of pieces) {
    for (let yy = 0; yy < p.h; yy++) {
      for (let xx = 0; xx < p.w; xx++) {
        const s = (yy * p.w + xx) * 4
        const d = ((yy + GAP) * atlasW + cx + xx) * 4
        atlas[d] = p.rgba[s]; atlas[d + 1] = p.rgba[s + 1]
        atlas[d + 2] = p.rgba[s + 2]; atlas[d + 3] = p.rgba[s + 3]
      }
    }
    ;(meta[p.kind] ||= []).push({ x: cx, y: GAP, w: p.w, h: p.h, src: p.src })
    cx += p.w + GAP
  }
  await mkdir(outDir, { recursive: true })
  await sharp(atlas, { raw: { width: atlasW, height: atlasH, channels: 4 } })
    .png({ compressionLevel: 9 }).toFile(path.join(outDir, nom + '.png'))
  await writeFile(path.join(outDir, nom + '.json'), JSON.stringify({
    note,
    atlas: { width: atlasW, height: atlasH },
    sprites: meta,
  }, null, 2) + '\n')
  console.log(`${nom} ${atlasW}x${atlasH} : ${Object.entries(meta).map(([k, v]) => `${k} ${v.length}`).join(' · ')}`)
}

export async function planche(pieces, chemin, cell = 150) {
  const COLS = Math.min(pieces.length, 8)
  const ROWS = Math.ceil(pieces.length / COLS)
  const w = COLS * cell; const h = ROWS * cell
  const dam = Buffer.alloc(w * h * 3)
  for (let i = 0; i < dam.length; i += 3) {
    const p = i / 3
    const v = (((p % w) >> 3) + ((p / w | 0) >> 3)) % 2 ? 200 : 242
    dam[i] = v; dam[i + 1] = v; dam[i + 2] = v
  }
  const calques = []
  let cadres = ''
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]
    const sc = Math.min((cell - 20) / p.w, (cell - 20) / p.h)
    const pw = Math.max(1, Math.round(p.w * sc))
    const ph = Math.max(1, Math.round(p.h * sc))
    const png = await sharp(p.rgba, { raw: { width: p.w, height: p.h, channels: 4 } })
      .resize(pw, ph).png().toBuffer()
    const left = (i % COLS) * cell + 10
    const top = Math.floor(i / COLS) * cell + 10
    calques.push({ input: png, left, top })
    cadres += `<rect x="${left - 0.5}" y="${top - 0.5}" width="${pw + 1}" height="${ph + 1}"` +
      ` fill="none" stroke="#e00" stroke-width="1"/>`
  }
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${cadres}</svg>`)
  await sharp(dam, { raw: { width: w, height: h, channels: 3 } })
    .composite([...calques, { input: svg, left: 0, top: 0 }]).png().toFile(chemin)
  console.log(`planche de controle : ${chemin}`)
}
