<script setup>
import MainLayout from '../layouts/MainLayout.vue'
import MapCanvas from '../components/MapCanvas.vue'
import { WORLD, PARCHMENT } from '../constants/layers.js'

function onMapReady(map) {
  // Couches de donnees branchees a l'etape 2 (mapStore + renderers).
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
      @ready="onMapReady"
    />
  </MainLayout>
</template>
