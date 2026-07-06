<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import MapCanvas from '../components/MapCanvas.vue'
import { fetchRegions } from '../api/dataSource.js'

// Carte regionale : l'image de detail est declaree dans les properties de la
// zone (regions.geojson fusionne : id, label, image, width, height).
const route = useRoute()
const region = ref(null)
const error = ref('')

fetchRegions()
  .then(fc => {
    const f = fc.features.find(f => f.properties?.id === route.params.id)
    if (!f) {
      error.value = `Region inconnue : ${route.params.id}`
      return
    }
    region.value = f.properties
  })
  .catch(err => {
    error.value = 'Erreur de chargement'
    console.error('regions.geojson :', err)
  })
</script>

<template>
  <MainLayout>
    <template #topbar>
      <router-link class="backbtn" :to="{ name: 'world' }">&larr; Carte-monde</router-link>
      <h1>{{ region ? region.label : (error || 'Region') }}</h1>
    </template>
    <MapCanvas
      v-if="region"
      :image-url="region.image"
      :width="region.width"
      :height="region.height"
      :max-zoom="3"
    />
  </MainLayout>
</template>
