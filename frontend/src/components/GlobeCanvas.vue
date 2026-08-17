<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import { useGlobe } from '../composables/useGlobe.js'
import { assetUrl } from '../api/dataSource.js'
import { WORLD, GLOBE } from '../constants/layers.js'
import { pxToSphere, uvToPx } from '../utils/coords.js'

// Globe 3D de navigation : la carte-monde plaquee sur une sphere. Le survol
// d'une zone regionale l'annonce, le clic emet son id (le routage reste a la
// page, comme sur la carte plate).
const props = defineProps({
  // Zones cliquables : [{ id, label, ring: [[x, y], ...] }] en pixel carte-monde
  regions: { type: Array, default: () => [] },
})
const emit = defineEmits(['pick'])

const el = useTemplateRef('el')
const ready = ref(false)
const failed = ref(false)
const hover = shallowRef(null) // { label, cx, cy }
const { create, destroy } = useGlobe()

// Ray casting : nombre impair de croisements du rayon horizontal = dedans.
function inRing(ring, x, y) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function onPoint(uv, ev, isClick) {
  if (!uv) {
    hover.value = null
    return
  }
  const [x, y] = uvToPx(uv.x, uv.y, GLOBE.W, WORLD.H, GLOBE.padX)
  const region = props.regions.find(r => inRing(r.ring, x, y))
  hover.value = region ? { label: region.label, cx: ev.clientX, cy: ev.clientY } : null
  if (isClick && region) emit('pick', region.id)
}

onMounted(() => {
  // Camera cadree sur le centre de la carte au chargement (Quon Tali / Sept Cites)
  const dir = pxToSphere(WORLD.W / 2, WORLD.H / 2, GLOBE.W, WORLD.H, GLOBE.padX, 2.9)
  try {
    create({
      el: el.value,
      textureUrl: assetUrl(GLOBE.texture),
      startAt: dir,
      onReady: () => { ready.value = true },
      onPoint,
    })
  } catch (err) {
    console.warn('globe 3D indisponible :', err)
    failed.value = true
  }
})

onBeforeUnmount(destroy)
</script>

<template>
  <div ref="el" class="globe-canvas" :class="{ 'globe-canvas--over': hover }">
    <p v-if="failed" class="globe-msg">
      Le globe 3D demande WebGL, indisponible sur ce navigateur.
    </p>
    <p v-else-if="!ready" class="globe-msg">Chargement du globe&hellip;</p>
    <div
      v-if="hover"
      class="globe-tip"
      :style="{ left: hover.cx + 14 + 'px', top: hover.cy - 10 + 'px' }"
    >{{ hover.label }}</div>
  </div>
</template>
