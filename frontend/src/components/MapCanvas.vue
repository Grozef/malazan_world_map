<script setup>
import { onMounted, onBeforeUnmount, watch, useTemplateRef } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLeafletMap } from '../composables/useLeafletMap.js'
import { assetUrl } from '../api/dataSource.js'

// Carte CRS.Simple generique sur une image (monde ou region).
// L'instance Leaflet est transmise brute via l'evenement `ready` —
// le parent ne doit pas la stocker dans un etat reactif.
const props = defineProps({
  imageUrl: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  minZoom: { type: Number, default: -4 },
  maxZoom: { type: Number, default: 2 },
  // Surcouche parchemin terre (mix-blend-mode:multiply via .parchment-land),
  // alpha = masque des terres, ocean transparent. Null = pas de surcouche.
  parchmentUrl: { type: String, default: null },
  parchmentVisible: { type: Boolean, default: true },
  // Ombrage relief (RGBA ombres seules) — ajoute SOUS le parchemin pour que
  // le multiply du parchemin teinte aussi les ombres. Null = pas de relief.
  reliefUrl: { type: String, default: null },
  reliefVisible: { type: Boolean, default: true },
})
const emit = defineEmits(['ready'])

const el = useTemplateRef('el')
const { create, destroy, getMap } = useLeafletMap()
let parchment = null
let relief = null

onMounted(() => {
  const map = create(el.value, props)
  const bounds = [[0, 0], [props.height, props.width]]
  // Niveau de zoom expose au CSS (masquage des labels mers au zoom minimal)
  const syncZoom = () => { el.value.dataset.zoom = map.getZoom() }
  map.on('zoomend', syncZoom)
  syncZoom()
  L.imageOverlay(assetUrl(props.imageUrl), bounds).addTo(map)
  if (props.reliefUrl) {
    relief = L.imageOverlay(assetUrl(props.reliefUrl), bounds, {
      interactive: false, opacity: 0.35, zIndex: 1,
    })
    if (props.reliefVisible) relief.addTo(map)
  }
  if (props.parchmentUrl) {
    parchment = L.imageOverlay(assetUrl(props.parchmentUrl), bounds, {
      className: 'parchment-land', interactive: false, opacity: 0.92, zIndex: 2,
    })
    if (props.parchmentVisible) parchment.addTo(map)
  }
  emit('ready', map)
})

watch(() => props.parchmentVisible, (on) => {
  const map = getMap()
  if (!parchment || !map) return
  if (on) parchment.addTo(map)
  else parchment.remove()
})

watch(() => props.reliefVisible, (on) => {
  const map = getMap()
  if (!relief || !map) return
  if (on) relief.addTo(map)
  else relief.remove()
})

onBeforeUnmount(() => {
  parchment = null
  relief = null
  destroy()
})
</script>

<template>
  <div ref="el" class="map-canvas"></div>
</template>
