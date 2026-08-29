import sharp from 'sharp'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const IMG = path.join(ROOT, 'frontend/public/img')
const meta = JSON.parse(await readFile(path.join(ROOT, 'tools/atlas-meta.json'), 'utf8'))

const fichiers = (await readdir(IMG)).filter(f => /\.(webp|png|jpe?g)$/i.test(f))
const parId = new Map()
const doublons = []
for (const m of meta.maps) {
  if (parId.has(m.id)) doublons.push(m.id)
  parId.set(m.id, m)
}

const slugs = new Set(fichiers.map(f => f.replace(/\.[^.]+$/, '')))
const extension = new Map(fichiers.map(f => [f.replace(/\.[^.]+$/, ''), f.match(/\.[^.]+$/)[0]]))
const nonClassees = [...slugs].filter(s => !parId.has(s))
const sansFichier = [...parId.keys()].filter(id => !slugs.has(id))

const duplicatesCasses = meta.maps
  .filter(m => m.duplicateOf)
  .filter(m => !parId.has(m.duplicateOf) || parId.get(m.duplicateOf).duplicateOf)
  .map(m => `${m.id} -> ${m.duplicateOf}`)

const parentsCasses = meta.maps
  .filter(m => m.parent)
  .filter(m => !parId.has(m.parent))
  .map(m => `${m.id} -> ${m.parent}`)

const W = 10000, H = 5571
const dedans = (x, y) => x >= 0 && x <= W && y >= 0 && y <= H
const geomCassee = []
for (const m of meta.maps) {
  if (m.duplicateOf) continue
  if (m.bbox) {
    const [x0, y0, x1, y1] = m.bbox
    if (!dedans(x0, y0) || !dedans(x1, y1)) geomCassee.push(`${m.id} hors carte`)
    else if (x1 <= x0 || y1 <= y0) geomCassee.push(`${m.id} rectangle inverse ou plat`)
  }
  if (m.point && !dedans(m.point[0], m.point[1])) geomCassee.push(`${m.id} point hors carte`)
  if (m.bbox && m.point) geomCassee.push(`${m.id} porte bbox ET point`)
}

const PORTFOLIO = 'C:/laragon/www/portfolios/dev_portfolio/frontend/public/malazan-assets/img/'
let manquantesPortfolio = []
try {
  const cote = new Set((await readdir(PORTFOLIO)).map(f => f.replace(/\.[^.]+$/, '')))
  manquantesPortfolio = meta.maps.filter(m => !m.duplicateOf && !cote.has(m.id)).map(m => m.id)
} catch { manquantesPortfolio = ['(dossier du portfolio introuvable)'] }

const SCOPES = ['continent', 'region', 'city', 'campaign', 'overview', 'realm', 'schema']
const scopesInconnus = meta.maps
  .filter(m => !SCOPES.includes(m.scope))
  .map(m => `${m.id} : ${m.scope}`)

console.log(`cartes sur disque : ${fichiers.length}`)
console.log(`entrees classees  : ${meta.maps.length}`)
const uniques = meta.maps.filter(m => !m.duplicateOf)
console.log(`cartes distinctes : ${uniques.length} (${meta.maps.length - uniques.length} doublons declares)`)

const groupes = {}
for (const m of uniques) groupes[m.group] = (groupes[m.group] || 0) + 1
for (const [g, n] of Object.entries(groupes).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(2)}  ${g}`)
}

const ecarts = []
for (const m of meta.maps) {
  if (m.duplicateOf || !m.bbox) continue
  const [x0, y0, x1, y1] = m.bbox
  const ext = extension.get(m.id)
  const { width, height } = await sharp(path.join(IMG, m.id + ext)).metadata()
  const rb = (x1 - x0) / (y1 - y0)
  const ri = width / height
  ecarts.push({ id: m.id, pc: Math.abs(rb - ri) / ri * 100 })
}
ecarts.sort((a, b) => b.pc - a.pc)
const suspects = ecarts.filter(e => e.pc >= 25)
console.log(`emprises dont le rapport L/H s ecarte de 25 % ou plus de celui de l image : ${suspects.length} / ${ecarts.length}`)
for (const e of suspects) console.log(`  ${String(Math.round(e.pc)).padStart(3)} %  ${e.id}`)

const posees = uniques.filter(m => m.bbox || m.point).length
console.log(`calees sur la carte-monde : ${posees} / ${uniques.length}`)
const sansGeom = uniques.filter(m => !m.bbox && !m.point).map(m => m.id)
if (sansGeom.length) console.log(`  sans emprise (assume) : ${sansGeom.join(', ')}`)

const echecs = [
  ['ids en double dans atlas-meta.json', doublons],
  ['cartes sur disque non classees', nonClassees],
  ['entrees sans fichier sur disque', sansFichier],
  ['duplicateOf casses', duplicatesCasses],
  ['parent casses', parentsCasses],
  ['scope inconnu', scopesInconnus],
  ['geometrie invalide', geomCassee],
  ['images absentes du portfolio', manquantesPortfolio],
].filter(([, l]) => l.length)

for (const [quoi, liste] of echecs) console.log(`ECHEC — ${quoi} : ${liste.join(', ')}`)
console.log(echecs.length ? 'ECHEC' : 'OK — les cartes du disque et le classement se recouvrent exactement')
process.exit(echecs.length ? 1 : 0)
