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
  const meta = [p.continent, p.type, p.status, p.outcome, p.book].filter(Boolean).map(esc).join(' &middot; ')
  return `<div class="city-popup">
    <h3>${esc(p.name || 'Sans nom')}</h3>
    <div class="meta">${meta}</div>
    ${p.note ? `<div>${esc(p.note)}</div>` : ''}
    ${p.placeholder ? '<div class="placeholder-flag">position a ajuster (mode ?pick=1)</div>' : ''}
  </div>`
}

// Tirets par type de route (defaut : trait plein)
const ROUTE_DASH = { campaign: '10 8', trade: '2 8' }

// Couleur stable derivee de faction/empire (hash -> palette encre)
const POLY_COLORS = ['#7a3b1d', '#274c66', '#5b6236', '#6b3a63', '#8a6d2f', '#4f5d63']
function colorFor(key) {
  let h = 0
  for (const c of String(key)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return POLY_COLORS[h % POLY_COLORS.length]
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

  // Labels cartographiques (mers, oceans) : divIcon CSS pur, non interactif.
  // Masquage au zoom minimal via .map-canvas[data-zoom] (voir MapCanvas/theme.css).
  label(fc, group, { H }) {
    for (const f of fc.features) {
      const [x, y] = f.geometry.coordinates
      const p = f.properties || {}
      const scale = Number(p.fontScale) || 1
      const angle = Number(p.angle) || 0
      const icon = L.divIcon({
        className: `sea-label sea-label--${esc(p.kind || 'sea')}`,
        html: `<span style="font-size:${scale}em;transform:translate(-50%,-50%) rotate(${angle}deg)">${esc(p.name || '')}</span>`,
        iconSize: null, // taille par le contenu, ancrage centre via le transform
      })
      group.addLayer(L.marker(px(x, y, H), { icon, interactive: false, keyboard: false }))
    }
  },

  line(fc, group, { H }) {
    for (const f of fc.features) {
      const p = f.properties || {}
      const latlngs = f.geometry.coordinates.map(([x, y]) => px(x, y, H))
      const line = L.polyline(latlngs, {
        color: '#7a3b1d',
        weight: 2.5,
        opacity: p.placeholder ? 0.5 : 0.8,
        dashArray: ROUTE_DASH[p.route_type] ?? null,
      })
      const sub = [p.route_type, p.book].filter(Boolean).map(esc).join(' &middot; ')
      line.bindTooltip(
        `<strong>${esc(p.name || '')}</strong>${sub ? `<br>${sub}` : ''}`,
        { sticky: true, className: 'route-tooltip' }
      )
      group.addLayer(line)
    }
  },

  polygon(fc, group, { H }) {
    for (const f of fc.features) {
      const p = f.properties || {}
      const rings = f.geometry.coordinates.map(ring => ring.map(([x, y]) => px(x, y, H)))
      const color = colorFor(p.empire || p.faction || p.name || '')
      const poly = L.polygon(rings, {
        color,
        weight: 1.5,
        opacity: p.placeholder ? 0.45 : 0.7,
        dashArray: '4 6',
        fillColor: color,
        fillOpacity: 0.12,
      })
      const sub = [p.empire, p.period].filter(Boolean).map(esc).join(' &middot; ')
      poly.bindTooltip(
        `<strong>${esc(p.name || '')}</strong>${sub ? `<br>${sub}` : ''}`,
        { sticky: true, className: 'route-tooltip' }
      )
      group.addLayer(poly)
    }
  },
}
