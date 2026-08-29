import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { charge, decoupe, ecrisAtlas, planche } from './atlas.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const IMG = path.join(ROOT, 'frontend/public/img')
const OUT_DIR = path.join(ROOT, 'frontend/public/decor')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)

const SOURCES = [
  {
    fichier: 'pan-arak-oasis-raraku-s-heart.webp',
    motifs: {
      dune: [
        [303, 218, 98, 28],
        [300, 262, 115, 27],
        [305, 298, 112, 22],
        [505, 200, 68, 46],
        [550, 250, 100, 40],
        [593, 300, 95, 35],
      ],
      plain: [
        [112, 1218, 100, 44],
        [252, 1226, 110, 24],
        [197, 1172, 98, 28],
        [117, 1256, 160, 48],
      ],
    },
  },
  {
    fichier: 'tiste-edur-lands-and-north-lether-frontier.webp',
    motifs: {
      icefield: [
        [1356, 663, 41, 27],
        [1038, 560, 44, 14],
        [1028, 657, 48, 15],
        [1096, 519, 40, 15],
        [1071, 602, 38, 12],
        [999, 648, 33, 12],
      ],
    },
  },
]

const GAIN = { icefield: 2.4 }

function renforce(piece, gain) {
  if (!gain || gain === 1) return piece
  const { rgba, w, h } = piece
  for (let i = 3; i < rgba.length; i += 4) {
    rgba[i] = Math.min(255, Math.round(rgba[i] * gain))
  }
  return piece
}

const pieces = []
for (const s of SOURCES) {
  const src = await charge(path.join(IMG, s.fichier))
  for (const [kind, rects] of Object.entries(s.motifs)) {
    for (const [x, y, w, h] of rects) {
      if (x < 0 || y < 0 || x + w > src.W || y + h > src.H) {
        throw new Error(`${kind} [${x},${y},${w},${h}] sort de ${s.fichier} (${src.W}x${src.H})`)
      }
      pieces.push(renforce({ kind, src: [x, y], ...decoupe(src, x, y, w, h) }, GAIN[kind]))
    }
  }
}

const parKind = pieces.reduce((m, p) => { m[p.kind] = (m[p.kind] || 0) + 1; return m }, {})
console.log(`decoupes : ${Object.entries(parKind).map(([k, n]) => `${k} ${n}`).join(' · ')}`)

await ecrisAtlas(pieces, OUT_DIR, 'biome-sprites',
  'Motifs de biome decoupes par tools/biomes.mjs dans pan-arak-oasis-raraku-s-heart (dune, plain) et tiste-edur-lands-and-north-lether-frontier (icefield). Semes par tools/symbols.mjs sur les aplats de palette.mjs, cuits par tools/paint-terrain.mjs.')

if (args.planche) {
  await planche(pieces, path.join(OUT_DIR, '_planche-biomes.png'))
  console.log('planche : decor/_planche-biomes.png')
}
