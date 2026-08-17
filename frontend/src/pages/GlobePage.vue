<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import GlobeCanvas from '../components/GlobeCanvas.vue'
import { useMapStore } from '../stores/mapStore.js'

// Vue globe : entree de navigation. Les memes zones que le drill-down de la
// carte plate (regions.geojson) servent de cibles cliquables.
const store = useMapStore()
const router = useRouter()

onMounted(() => store.loadRegions())

const regions = computed(() =>
  (store.regionsData?.features ?? []).map(f => ({
    id: f.properties.id,
    label: f.properties.label,
    ring: f.geometry.coordinates[0],
  }))
)

function onPick(id) {
  router.push({ name: 'region', params: { id } })
}
</script>

<template>
  <MainLayout>
    <template #topbar>
      <h1>Le Monde de Malazan</h1>
      <RouterLink class="backbtn" :to="{ name: 'world' }">Carte plate</RouterLink>
    </template>
    <GlobeCanvas :regions="regions" @pick="onPick" />
  </MainLayout>
</template>
