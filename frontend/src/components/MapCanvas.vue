<script setup>
import { onMounted, onBeforeUnmount, watch, useTemplateRef } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLeafletMap } from '../composables/useLeafletMap.js'
import { assetUrl } from '../api/dataSource.js'
import { CREDIT } from '../constants/layers.js'

// Carte CRS.Simple generique sur une image (regions) ou sur une pyramide de
// tuiles (carte-monde). L'instance Leaflet est transmise brute via l'evenement
// `ready` — le parent ne doit pas la stocker dans un etat reactif.
const props = defineProps({
  // Fond image, exclusif avec `tiles`
  imageUrl: { type: String, default: null },
  // Fond tuile : { url: 'tiles/{z}/{x}/{y}.webp', minNative, maxNative }.
  // Prioritaire sur imageUrl quand les deux sont fournis.
  tiles: { type: Object, default: null },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  minZoom: { type: Number, default: -4 },
  maxZoom: { type: Number, default: 2 },
})
const emit = defineEmits(['ready'])

const el = useTemplateRef('el')
const { create, destroy, getMap } = useLeafletMap()
let base = null // couche de fond courante (tuiles ou image)

function makeBase(map) {
  const bounds = [[0, 0], [props.height, props.width]]
  const attribution = `<a href="${CREDIT.url}" target="_blank" rel="noopener">${CREDIT.label}</a>`
  if (!props.tiles) return L.imageOverlay(assetUrl(props.imageUrl), bounds, { attribution })
  // minZoom est INDISPENSABLE : GridLayer le met a 0 par defaut et _setView
  // annule alors le niveau de tuile a tout zoom negatif (GridLayer.js:113/554).
  // maxZoom reste indefini pour que Leaflet reechantillonne au-dela de maxNative.
  return L.tileLayer(assetUrl(props.tiles.url), {
    tileSize: 256,
    bounds,
    noWrap: true,
    attribution,
    minZoom: props.tiles.minNative,
    minNativeZoom: props.tiles.minNative,
    maxNativeZoom: props.tiles.maxNative,
  })
}

onMounted(() => {
  const map = create(el.value, props)
  // Niveau de zoom expose au CSS (masquage des labels mers au zoom minimal)
  const syncZoom = () => { el.value.dataset.zoom = map.getZoom() }
  map.on('zoomend', syncZoom)
  syncZoom()
  base = makeBase(map).addTo(map)
  emit('ready', map)
})

// Changement de fond : on remplace la couche sans toucher a la carte, donc sans
// perdre le zoom, le centre ni les couches de donnees deja posees dessus.
watch(() => props.tiles?.url ?? props.imageUrl, () => {
  const map = getMap()
  if (!map || !base) return
  base.remove()
  base = makeBase(map).addTo(map)
  base.bringToBack()
})

onBeforeUnmount(() => {
  base = null
  destroy()
})
</script>

<template>
  <div ref="el" class="map-canvas"></div>
</template>
