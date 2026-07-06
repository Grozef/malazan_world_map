import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { px } from './coords.js'

// Fabrique de couches Leaflet par kind (voir constants/layers.js).
// Chaque renderer remplit un L.layerGroup depuis une FeatureCollection
// en coords pixel [x, y] (H = hauteur de la carte pour la conversion).

const iconDefault = L.icon({
  iconUrl, iconRetinaUrl, shadowUrl,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function popupHtml(p) {
  const meta = [p.continent, p.status, p.book].filter(Boolean).map(esc).join(' &middot; ')
  return `<div class="city-popup">
    <h3>${esc(p.name || 'Sans nom')}</h3>
    <div class="meta">${meta}</div>
    ${p.note ? `<div>${esc(p.note)}</div>` : ''}
    ${p.placeholder ? '<div class="placeholder-flag">position a ajuster (mode ?pick=1)</div>' : ''}
  </div>`
}

export const renderers = {
  point(fc, group, { H }) {
    for (const f of fc.features) {
      const [x, y] = f.geometry.coordinates
      const p = f.properties || {}
      const marker = L.marker(px(x, y, H), {
        icon: iconDefault,
        opacity: p.placeholder ? 0.6 : 1,
        title: p.name || '',
      })
      marker.bindPopup(popupHtml(p))
      group.addLayer(marker)
    }
  },
}
