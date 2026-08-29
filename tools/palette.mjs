import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
export const SRC = path.join(ROOT, 'genabackis/malazan-world-map-2025.png')

export const BIOMES = [
  { id: 1, key: 'ocean',    rgb: [196, 223, 255], part: 69.40 },
  { id: 2, key: 'ice',      rgb: [255, 255, 255], part: 13.83 },
  { id: 3, key: 'plain',    rgb: [201, 229, 178], part: 8.82 },
  { id: 4, key: 'mountain', rgb: [183, 133, 92],  part: 0.82 },
  { id: 5, key: 'desert',   rgb: [227, 183, 110], part: 0.71 },
  { id: 6, key: 'steppe',   rgb: [255, 240, 189], part: 0.67 },
  { id: 7, key: 'foothill', rgb: [203, 167, 139], part: 0.61 },
  { id: 8, key: 'forest',   rgb: [59, 131, 21],   part: 0.58 },
]

export const BIOME_BY_KEY = Object.fromEntries(BIOMES.map(b => [b.key, b]))

const TOLERANCE = 40

export function classify(r, g, b) {
  let best = 0
  let bestD = TOLERANCE * TOLERANCE
  for (const bio of BIOMES) {
    const dr = r - bio.rgb[0]
    const dg = g - bio.rgb[1]
    const db = b - bio.rgb[2]
    const d = dr * dr + dg * dg + db * db
    if (d < bestD) {
      bestD = d
      best = bio.id
    }
  }
  return best
}

export async function biomeMask({ src = SRC, median = 5, region = null } = {}) {
  let img = sharp(src)
  if (region) img = img.extract(region)
  if (median > 0) img = img.median(median)
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })

  const W = info.width
  const H = info.height
  const ch = info.channels
  const mask = new Uint8Array(W * H)
  for (let i = 0, p = 0; p < mask.length; i += ch, p++) {
    mask[p] = classify(data[i], data[i + 1], data[i + 2])
  }
  return { mask, W, H }
}

export function tally(mask) {
  const counts = new Uint32Array(BIOMES.length + 1)
  for (let p = 0; p < mask.length; p++) counts[mask[p]]++
  const rows = [{ key: 'indetermine', px: counts[0], pct: (100 * counts[0]) / mask.length }]
  for (const b of BIOMES) {
    rows.push({ key: b.key, px: counts[b.id], pct: (100 * counts[b.id]) / mask.length })
  }
  return rows
}

export async function maskToPng(mask, W, H, out, width = 0) {
  const rgb = Buffer.alloc(W * H * 3)
  const lut = { 0: [255, 0, 255] }
  for (const b of BIOMES) lut[b.id] = b.rgb
  for (let p = 0; p < mask.length; p++) {
    const c = lut[mask[p]]
    rgb[p * 3] = c[0]
    rgb[p * 3 + 1] = c[1]
    rgb[p * 3 + 2] = c[2]
  }
  let img = sharp(rgb, { raw: { width: W, height: H, channels: 3 } })
  if (width) img = img.resize(width)
  await img.png().toFile(out)
}
