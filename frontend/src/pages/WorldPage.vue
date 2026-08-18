<script setup>
import { watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import L from 'leaflet'
import MainLayout from '../layouts/MainLayout.vue'
import MapCanvas from '../components/MapCanvas.vue'
import LayersPanel from '../components/LayersPanel.vue'
import FiltersPanel from '../components/FiltersPanel.vue'
import SearchBar from '../components/SearchBar.vue'
import BasePicker from '../components/BasePicker.vue'
import { WORLD, LAYERS } from '../constants/layers.js'
import { useMapStore } from '../stores/mapStore.js'
import { renderers } from '../utils/leafletRenderers.js'
import { usePicker } from '../composables/usePicker.js'
import { px } from '../utils/coords.js'

const store = useMapStore()
const router = useRouter()
const { pickerActive, attachPicker } = usePicker(WORLD.H)

// Objets Leaflet hors reactivite Vue (closures uniquement).
let map = null
const groups = new Map() // layerId -> L.layerGroup
const regionsGroup = L.layerGroup()

function rebuild(layer, fc) {
  const group = groups.get(layer.id)
  group.clearLayers()
  if (fc) renderers[layer.kind](fc, group, { H: WORLD.H })
}

// Zones drill-down : invisibles au repos, highlight au survol, clic -> page region.
function buildRegions(fc) {
  const IDLE = { color: '#7a3b1d', weight: 0, opacity: 0, fillColor: '#7a3b1d', fillOpacity: 0.001 }
  const HOVER = { color: '#7a3b1d', weight: 1.5, opacity: 0.7, fillColor: '#e9dcc3', fillOpacity: 0.18 }
  regionsGroup.clearLayers()
  for (const f of fc.features) {
    const { id, label } = f.properties || {}
    const ring = f.geometry.coordinates[0].map(([x, y]) => px(x, y, WORLD.H))
    const poly = L.polygon(ring, { className: 'region-zone', ...IDLE })
    poly.on('mouseover', () => { poly.setStyle(HOVER); poly.openTooltip() })
    poly.on('mouseout', () => { poly.setStyle(IDLE); poly.closeTooltip() })
    poly.on('click', () => { if (id) router.push({ name: 'region', params: { id } }) })
    poly.bindTooltip(label || id, { sticky: true, direction: 'top', className: 'region-label' })
    regionsGroup.addLayer(poly)
  }
}

function onMapReady(m) {
  map = m
  attachPicker(m)
  for (const layer of LAYERS) {
    groups.set(layer.id, L.layerGroup())
    if (store.layersVisible[layer.id]) {
      groups.get(layer.id).addTo(map)
      store.loadLayer(layer.id)
    }
    rebuild(layer, store.filteredLayers[layer.id])
  }
  if (store.regionsVisible) regionsGroup.addTo(map)
  if (store.regionsData) buildRegions(store.regionsData)
  store.loadRegions()
}

// Watchers declares au setup (auto-nettoyes au demontage) ; la carte peut ne
// pas encore exister au premier tick, d'ou la garde.
for (const layer of LAYERS) {
  watch(() => store.filteredLayers[layer.id], (fc, old) => {
    if (!map || fc === old) return // meme reference = rien a re-rendre
    rebuild(layer, fc)
  })
  watch(() => store.layersVisible[layer.id], (on) => {
    if (!map) return
    const group = groups.get(layer.id)
    if (on) group.addTo(map)
    else group.remove()
  })
}
watch(() => store.regionsData, (fc) => {
  if (map && fc) buildRegions(fc)
})
watch(() => store.regionsVisible, (on) => {
  if (!map) return
  if (on) regionsGroup.addTo(map)
  else regionsGroup.remove()
})
// Match exact sur un nom de ville -> recentre et ouvre le popup (declare apres
// les watchers de couches : les marqueurs sont deja reconstruits quand il tourne).
watch(() => store.filterText, (q) => {
  if (!map) return
  const query = q.trim().toLowerCase()
  if (!query) return
  const marker = groups.get('cities')?.getLayers()
    .find(l => (l.options.title || '').toLowerCase() === query)
  if (marker) {
    map.setView(marker.getLatLng(), 0)
    marker.openPopup()
  }
})
</script>

<template>
  <MainLayout>
    <template #topbar>
      <h1>Le Monde de Malazan</h1>
      <RouterLink class="backbtn" :to="{ name: 'globe' }">Globe</RouterLink>
      <BasePicker />
      <span v-if="pickerActive" class="pickhint">
        Mode pointeur : clique pour copier les coordonnees pixel
      </span>
      <SearchBar />
    </template>
    <MapCanvas
      :tiles="store.base.tiles"
      :width="WORLD.W"
      :height="WORLD.H"
      :min-zoom="-5"
      :max-zoom="1"
      @ready="onMapReady"
    />
    <LayersPanel />
    <FiltersPanel />
  </MainLayout>
</template>
