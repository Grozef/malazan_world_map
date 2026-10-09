// Genere frontend/public/data/cities.geojson a partir des 407 symboles detectes
// (cities-detectees.json) et de la table de noms relevee a la main (tools/villes-noms.json).
//
// Trois regles, toutes mesurees et non devinees :
//  1. les fiches deja redigees a la main sont conservees TELLES QUELLES. Un symbole detecte
//     a moins de COINCIDENCE px de l'une d'elles est le MEME lieu -> il est ecarte (sinon doublon).
//  2. deux pastilles portant le meme nom ne sont fusionnees que si elles sont PROCHES
//     (grappes de Kolanse, triades de forts). Les homonymes eloignes de milliers de px
//     sont des lieux distincts et restent separes.
//  3. les generees portent `rang` (le symbole PEINT) et non `status` (le statut politique) :
//     la carte peint Coral et Capustan en village alors que ce sont des city, et Letheras
//     capitale imperiale en minor. Le symbole ne dit pas le statut.
//
// Les pastilles de `sans_label` (aucun nom ecrit sur la carte) sont ignorees.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DETECTEES = path.join(ROOT, 'frontend/public/data/cities-detectees.json')
const NOMS = path.join(ROOT, 'tools/villes-noms.json')
const CITIES = path.join(ROOT, 'frontend/public/data/cities.geojson')

const COINCIDENCE = 5 // px : au-dela, ce n'est plus la meme pastille
const GRAPPE = 100 // px : au-dela, deux homonymes sont deux lieux

const lis = async (p) => JSON.parse(await readFile(p, 'utf8'))

const { villes } = await lis(DETECTEES)
const { noms } = await lis(NOMS)
const actuel = await lis(CITIES)

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

// 1. les fiches existantes gardent la main sur leur position. Une fiche redigee a la main
// porte `status` et jamais `rang` : c'est ce qui rend le script rejouable sur sa propre sortie.
const redigees = actuel.features.filter(f => !f.properties?.rang)
const fiches = redigees.map(f => ({
  f,
  x: f.geometry.coordinates[0],
  y: f.geometry.coordinates[1],
}))
const nommes = villes
  .map(v => ({ ...v, nom: noms[`${v.x},${v.y}`] }))
  .filter(v => v.nom)
const [absorbes, restants] = nommes.reduce(
  ([a, r], v) => (fiches.some(fi => dist(fi, v) <= COINCIDENCE) ? [[...a, v], r] : [a, [...r, v]]),
  [[], []]
)

// 2. grappes : meme nom ET proximite
const grappes = []
for (const v of restants) {
  const g = grappes.find(g => g[0].nom === v.nom && g.some(m => dist(m, v) <= GRAPPE))
  if (g) g.push(v)
  else grappes.push([v])
}
// representant deterministe : le plus gros anneau, puis le plus a gauche, puis le plus haut
const chef = g => [...g].sort((a, b) => b.d - a.d || a.x - b.x || a.y - b.y)[0]

const generees = grappes
  .map(chef)
  .sort((a, b) => a.nom.localeCompare(b.nom) || a.x - b.x || a.y - b.y)
  .map(v => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [v.x, v.y] },
    properties: { name: v.nom, rang: v.rang },
  }))

const sortie = {
  type: 'FeatureCollection',
  note: actuel.note,
  genere: {
    par: 'tools/cities-geojson.mjs',
    note: `${redigees.length} fiches redigees a la main, conservees telles quelles et placees en tete. Les suivantes sont generees depuis cities-detectees.json + tools/villes-noms.json : elles ne portent que name + rang. \`rang\` est le symbole PEINT sur la carte, pas le statut politique.`,
    fiches: redigees.length,
    generees: generees.length,
    symboles_nommes: nommes.length,
    absorbes_par_une_fiche: absorbes.length,
    fusions_de_grappe: restants.length - generees.length,
  },
  features: [...redigees, ...generees],
}

await writeFile(CITIES, JSON.stringify(sortie, null, 2) + '\n')

console.log(`symboles nommes          ${nommes.length}`)
console.log(`  absorbes par une fiche ${absorbes.length} (${absorbes.map(v => v.nom).join(', ')})`)
console.log(`  fusions de grappe      ${restants.length - generees.length}`)
grappes.filter(g => g.length > 1).forEach(g =>
  console.log(`    ${g[0].nom} : ${g.length} pastilles -> ${chef(g).x},${chef(g).y}`))
console.log(`fiches conservees        ${redigees.length}`)
console.log(`generees                 ${generees.length}`)
console.log(`total ecrit              ${sortie.features.length}`)
