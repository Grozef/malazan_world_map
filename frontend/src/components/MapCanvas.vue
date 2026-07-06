<script setup>
import { onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
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
})
const emit = defineEmits(['ready'])

const el = useTemplateRef('el')
const { create, destroy } = useLeafletMap()

onMounted(() => {
  const map = create(el.value, props)
  const bounds = [[0, 0], [props.height, props.width]]
  L.imageOverlay(assetUrl(props.imageUrl), bounds).addTo(map)
  if (props.parchmentUrl) {
    L.imageOverlay(assetUrl(props.parchmentUrl), bounds, {
      className: 'parchment-land', interactive: false, opacity: 0.92,
    }).addTo(map)
  }
  emit('ready', map)
})

onBeforeUnmount(destroy)
</script>

<template>
  <div ref="el" class="map-canvas"></div>
</template>
