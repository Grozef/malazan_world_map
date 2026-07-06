<script setup>
import { computed } from 'vue'
import { useMapStore } from '../stores/mapStore.js'
import { LAYERS } from '../constants/layers.js'

// Facettes derivees des properties (store.propertyOptions) : un accordeon par
// champ, valeurs en chips cliquables — portage de FiltersSection.vue (lab_maps)
// sans Quasar.
const store = useMapStore()

const resultCount = computed(() =>
  LAYERS.reduce((n, layer) => {
    if (!layer.filterable || !store.layersVisible[layer.id]) return n
    return n + (store.filteredLayers[layer.id]?.features.length ?? 0)
  }, 0)
)

function isActive(key, value) {
  return (store.activePropertyFilters[key] || []).includes(value)
}
</script>

<template>
  <div v-if="Object.keys(store.propertyOptions).length" class="filters-panel">
    <div class="filters-head">
      <span>Filtres — {{ resultCount }} resultat(s)</span>
      <button v-if="store.hasActiveFilters" class="clearbtn" @click="store.clearFilters()">
        Effacer
      </button>
    </div>
    <details v-for="(values, key) in store.propertyOptions" :key="key">
      <summary>{{ key }}</summary>
      <div class="chips">
        <button
          v-for="value in values"
          :key="value"
          class="chip"
          :class="{ active: isActive(key, value) }"
          @click="store.togglePropertyFilter(key, value)"
        >
          {{ value }}
        </button>
      </div>
    </details>
  </div>
</template>
