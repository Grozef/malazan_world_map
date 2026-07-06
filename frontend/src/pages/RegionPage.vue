<script setup>
import { useRoute } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

// Portage complet (MapCanvas sur l'image de detail) a l'etape 3,
// avec regions.geojson fusionne (image/width/height en properties).
const route = useRoute()
</script>

<template>
  <MainLayout>
    <template #topbar>
      <router-link class="backbtn" :to="{ name: 'world' }">&larr; Carte-monde</router-link>
      <h1>{{ route.params.id }}</h1>
    </template>
  </MainLayout>
</template>
