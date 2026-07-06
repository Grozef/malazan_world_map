// Seul point d'acces aux donnees. Aujourd'hui : fichiers statiques de public/.
// Migration API future : remplacer le corps de ces fonctions (axios), contrat stable.
import { LAYERS } from '../constants/layers.js'

// Prefixe BASE_URL : le build (base './') doit rester servable depuis un sous-dossier.
export function assetUrl(path) {
  return import.meta.env.BASE_URL + path
}

async function fetchJson(path) {
  const r = await fetch(assetUrl(path))
  if (!r.ok) throw new Error(`${path} : HTTP ${r.status}`)
  return r.json()
}

// -> FeatureCollection de la couche
export function fetchLayer(layerId) {
  const layer = LAYERS.find(l => l.id === layerId)
  if (!layer) return Promise.reject(new Error(`couche inconnue : ${layerId}`))
  return fetchJson(layer.file)
}

// -> FeatureCollection des zones regionales (drill-down)
export function fetchRegions() {
  return fetchJson('data/regions.geojson')
}
