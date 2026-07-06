// Carte-monde de Malazan — Leaflet CRS.Simple
// Convention pixel : origine HAUT-gauche, x vers la droite, y vers le bas.
// Les fichiers data/*.geojson stockent les coordonnees en pixel [x, y].

const WORLD = { image: 'img/malazan-world-map-2019.png', W: 6936, H: 3864 };

// px(x, y) : pixel (origine haut-gauche) -> latlng CRS.Simple (origine bas-gauche)
function px(x, y) { return [WORLD.H - y, x]; }

// Icones Leaflet servies en local
const iconDefault = L.icon({
  iconUrl: 'assets/leaflet/marker-icon.png',
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const map = L.map('map', { crs: L.CRS.Simple, minZoom: -4, maxZoom: 2, zoomControl: true });
const bounds = [[0, 0], [WORLD.H, WORLD.W]];
L.imageOverlay(WORLD.image, bounds).addTo(map);
// Surcouche parchemin SUR LA TERRE seulement (alpha = masque des terres, ocean
// transparent). C'est un calque Leaflet -> suit parfaitement le pan/zoom. Le
// mix-blend-mode:multiply (CSS) teinte la terre sans masquer cotes/villes/labels.
const parchmentLand = L.imageOverlay('assets/land-parchment.webp', bounds, {
  className: 'parchment-land', interactive: false, opacity: 0.92
}).addTo(map);
map.fitBounds(bounds);
map.setMaxBounds(bounds);

// Expose pour picker.js
window.__malazan = { map, px, WORLD };

// --- Couche villes -----------------------------------------------------------
const cityLayer = L.geoJSON(null, {
  pointToLayer: (feature, latlng_unused) => {
    const [x, y] = feature.geometry.coordinates; // pixel [x, y]
    const p = feature.properties || {};
    const marker = L.marker(px(x, y), {
      icon: iconDefault,
      opacity: p.placeholder ? 0.6 : 1,
      title: p.name || ''
    });
    marker.feature = feature;
    return marker;
  },
  onEachFeature: (feature, layer) => {
    const p = feature.properties || {};
    const html = `<div class="city-popup">
      <h3>${p.name || 'Sans nom'}</h3>
      <div class="meta">${[p.continent, p.status, p.book].filter(Boolean).join(' &middot; ')}</div>
      ${p.note ? `<div>${p.note}</div>` : ''}
      ${p.placeholder ? '<div class="placeholder-flag">position a ajuster (mode ?pick=1)</div>' : ''}
    </div>`;
    layer.bindPopup(html);
  }
}).addTo(map);

fetch('data/cities.geojson')
  .then(r => r.ok ? r.json() : Promise.reject(r.status))
  .then(fc => cityLayer.addData(fc))
  .catch(err => console.warn('cities.geojson non charge :', err));

// --- Couche zones regionales (drill-down) ------------------------------------
const regionLayer = L.layerGroup().addTo(map);

Promise.all([
  fetch('data/regions.geojson').then(r => r.ok ? r.json() : null).catch(() => null),
]).then(([fc]) => {
  if (!fc) return;
  fc.features.forEach(f => {
    const id = f.properties && f.properties.id;
    const label = (f.properties && f.properties.label) || id;
    // geometry: Polygon en coords pixel [x, y]
    const ring = f.geometry.coordinates[0].map(([x, y]) => px(x, y));
    // Repos : quasi invisible (juste cliquable). Survol : leger highlight.
    const IDLE = { color: '#7a3b1d', weight: 0, opacity: 0, fillColor: '#7a3b1d', fillOpacity: 0.001 };
    const HOVER = { color: '#7a3b1d', weight: 1.5, opacity: 0.7, fillColor: '#e9dcc3', fillOpacity: 0.18 };
    const poly = L.polygon(ring, { className: 'region-zone', ...IDLE });
    poly.on('mouseover', () => { poly.setStyle(HOVER); poly.openTooltip(); });
    poly.on('mouseout', () => { poly.setStyle(IDLE); poly.closeTooltip(); });
    poly.on('click', () => { if (id) location.href = `region.html?id=${encodeURIComponent(id)}`; });
    poly.bindTooltip(label, { permanent: false, sticky: true, direction: 'top', className: 'region-label' });
    regionLayer.addLayer(poly);
  });
}).catch(err => console.warn('regions.geojson non charge :', err));

// --- Controle de couches -----------------------------------------------------
L.control.layers(null, {
  'Villes': cityLayer,
  'Zones regionales': regionLayer,
  'Parchemin (terres)': parchmentLand
}, { collapsed: false, position: 'bottomleft' }).addTo(map);

// --- Recherche villes --------------------------------------------------------
const search = document.getElementById('search');
if (search) {
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    cityLayer.eachLayer(layer => {
      const name = (layer.feature.properties.name || '').toLowerCase();
      const match = !q || name.includes(q);
      const el = layer.getElement();
      if (el) el.style.display = match ? '' : 'none';
      if (match && q && name === q) { map.setView(layer.getLatLng(), 0); layer.openPopup(); }
    });
  });
}
