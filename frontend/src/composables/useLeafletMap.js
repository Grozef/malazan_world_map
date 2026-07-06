import L from 'leaflet'

// Encapsule le cycle de vie d'une carte Leaflet CRS.Simple sur une image.
// L'instance n'est JAMAIS mise dans un etat reactif Vue (closure uniquement) —
// la reactivite profonde sur les objets Leaflet effondre les perfs.
export function useLeafletMap() {
  let map = null

  function create(el, { width, height, minZoom = -4, maxZoom = 2 }) {
    map = L.map(el, { crs: L.CRS.Simple, minZoom, maxZoom, zoomControl: true })
    const bounds = [[0, 0], [height, width]]
    map.fitBounds(bounds)
    map.setMaxBounds(bounds)
    return map
  }

  function destroy() {
    if (map) {
      map.remove()
      map = null
    }
  }

  const getMap = () => map

  return { create, destroy, getMap }
}
