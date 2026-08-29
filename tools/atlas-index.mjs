import sharp from 'sharp'
import { readFile, writeFile, readdir, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const MONDE = { W: 10000, H: 5571 }
const IMG = path.join(ROOT, 'frontend/public/img')
const OUT = path.join(ROOT, 'frontend/public/data/atlas.geojson')
const TUILES = ['tiles/villes/', 'tiles/annexes/']

const meta = JSON.parse(await readFile(path.join(ROOT, 'tools/atlas-meta.json'), 'utf8'))
const fichiers = await readdir(IMG)
const extension = new Map(fichiers.map(f => [f.replace(/\.[^.]+$/, ''), f.match(/\.[^.]+$/)[0]]))

async function tuiles(id) {
  for (const base of TUILES) {
    try {
      const dossier = path.join(ROOT, 'frontend/public', base, id)
      await access(dossier)
      const niveaux = await readdir(dossier)
      const z = niveaux.map(Number).filter(n => !Number.isNaN(n))
      return { url: `${base}${id}/{z}/{x}/{y}.webp`, minNative: Math.min(...z), maxNative: Math.max(...z) }
    } catch { /* pas de pyramide pour cet id */ }
  }
  return null
}

const features = []
for (const m of meta.maps) {
  if (m.duplicateOf) continue
  const ext = extension.get(m.id)
  if (!ext) throw new Error(`atlas-meta.json cite ${m.id}, absent de ${IMG}`)
  const { width, height } = await sharp(path.join(IMG, m.id + ext)).metadata()

  let geometry = null
  if (m.bbox) {
    const [x0, y0, x1, y1] = m.bbox
    geometry = { type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] }
  } else if (m.point) {
    geometry = { type: 'Point', coordinates: m.point }
  }

  const properties = {
    id: m.id,
    title: m.title,
    group: m.group,
    scope: m.scope,
    image: `img/${m.id}${ext}`,
    width,
    height,
  }
  if (m.era) properties.era = m.era
  if (m.parent) properties.parent = m.parent
  if (m.dans) properties.dans = m.dans
  if (m.cible) properties.cible = m.cible
  if (m.cibleDans) properties.cibleDans = m.cibleDans
  const t = await tuiles(m.id)
  if (t) properties.tiles = t

  features.push({ type: 'Feature', geometry, properties })
}

const parId = new Map(features.map(f => [f.properties.id, f.properties]))
let zones = 0
let ciblesDans = 0
for (const f of features) {
  for (const [parent, r] of Object.entries(f.properties.dans || {})) {
    const p = parId.get(parent)
    if (!p) throw new Error(`${f.properties.id}.dans cite ${parent}, absent de l'atlas`)
    const [x0, y0, x1, y1] = r
    if (x0 >= x1 || y0 >= y1) throw new Error(`${f.properties.id}.dans[${parent}] : rectangle vide ou inverse`)
    if (x0 < 0 || y0 < 0 || x1 > p.width || y1 > p.height) {
      throw new Error(`${f.properties.id}.dans[${parent}] = ${r} sort de ${parent} (${p.width}x${p.height})`)
    }
    zones++
  }
  for (const [parent, c] of Object.entries(f.properties.cibleDans || {})) {
    const r = (f.properties.dans || {})[parent]
    if (!r) throw new Error(`${f.properties.id}.cibleDans[${parent}] : aucune emprise relevee dans ce parent`)
    const [x0, y0, x1, y1] = c
    if (x0 >= x1 || y0 >= y1) throw new Error(`${f.properties.id}.cibleDans[${parent}] : rectangle vide ou inverse`)
    if (x0 < r[0] || y0 < r[1] || x1 > r[2] || y1 > r[3]) {
      throw new Error(`${f.properties.id}.cibleDans[${parent}] = ${c} sort de son emprise ${r}`)
    }
    ciblesDans++
  }
}

let cibles = 0
for (const f of features) {
  const c = f.properties.cible
  if (!c) continue
  const [x0, y0, x1, y1] = c
  if (x0 >= x1 || y0 >= y1) throw new Error(f.properties.id + '.cible : rectangle vide ou inverse')
  if (x0 < 0 || y0 < 0 || x1 > MONDE.W || y1 > MONDE.H) {
    throw new Error(f.properties.id + '.cible = ' + c + ' sort de la carte-monde')
  }
  const g = f.geometry
  if (g && g.type === 'Polygon') {
    const r = g.coordinates[0], xs = r.map(p => p[0]), ys = r.map(p => p[1])
    const bx0 = Math.min(...xs), by0 = Math.min(...ys), bx1 = Math.max(...xs), by1 = Math.max(...ys)
    if (x0 < bx0 || y0 < by0 || x1 > bx1 || y1 > by1) {
      throw new Error(f.properties.id + '.cible = ' + c + ' sort de son emprise [' + [bx0, by0, bx1, by1] + ']')
    }
  }
  cibles++
}

const fc = {
  type: 'FeatureCollection',
  note: 'Cartes annexes de l\'atlas. GENERE par tools/atlas-index.mjs depuis tools/atlas-meta.json — ne pas editer a la main. Geometrie en pixel [x, y] origine haut-gauche de la carte-monde 10000x5571 : Polygon = rectangle d\'emprise (approximation alignee sur les axes, ces cartes sont de mains et d\'echelles differentes), Point = plan de ville ancre sur la ville, null = carte sans place sur cette carte-monde (age de Kharkanas).',
  features,
}
await writeFile(OUT, JSON.stringify(fc, null, 2) + '\n')

const parGeom = { rectangle: 0, point: 0, aucune: 0 }
for (const f of features) parGeom[f.geometry ? (f.geometry.type === 'Polygon' ? 'rectangle' : 'point') : 'aucune']++
console.log(`${features.length} cartes ecrites dans ${OUT}`)
console.log(`  ${parGeom.rectangle} emprises rectangulaires · ${parGeom.point} points · ${parGeom.aucune} sans geometrie`)
console.log(`  ${features.filter(f => f.properties.tiles).length} servies par une pyramide existante, ${features.filter(f => !f.properties.tiles).length} en image simple`)
console.log(`  ${zones} emprise(s) relevee(s) dans une carte parente`)
console.log(`  ${ciblesDans} cible(s) de clic dediee(s) dans une carte parente`)
console.log(`  ${cibles} cible(s) de clic dediee(s)`)
