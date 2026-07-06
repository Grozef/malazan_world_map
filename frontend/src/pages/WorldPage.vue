<script setup>
import { watch } from 'vue'
import L from 'leaflet'
import MainLayout from '../layouts/MainLayout.vue'
import MapCanvas from '../components/MapCanvas.vue'
import LayersPanel from '../components/LayersPanel.vue'
import { WORLD, PARCHMENT, LAYERS } from '../constants/layers.js'
import { useMapStore } from '../stores/mapStore.js'
import { renderers } from '../utils/leafletRenderers.js'

const store = useMapStore()

// Objets Leaflet hors reactivite Vue (closures uniquement).
let map = null
const groups = new Map() // layerId -> L.layerGroup

function rebuild(layer, fc) {
  const group = groups.get(layer.id)
  group.clearLayers()
  if (fc) renderers[layer.kind](fc, group, { H: WORLD.H })
}

function onMapReady(m) {
  map = m
  for (const layer of LAYERS) {
    groups.set(layer.id, L.layerGroup())
    if (store.layersVisible[layer.id]) {
      groups.get(layer.id).addTo(map)
      store.loadLayer(layer.id)
    }
    rebuild(layer, store.filteredLayers[layer.id])
  }
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
</script>

<template>
  <MainLayout>
    <template #topbar>
      <h1>Le Monde de Malazan</h1>
    </template>
    <MapCanvas
      :image-url="WORLD.image"
      :width="WORLD.W"
      :height="WORLD.H"
      :parchment-url="PARCHMENT"
      :parchment-visible="store.parchmentVisible"
      @ready="onMapReady"
    />
    <LayersPanel />
  </MainLayout>
</template>
