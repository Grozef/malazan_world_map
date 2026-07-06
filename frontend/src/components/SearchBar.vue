<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { useMapStore } from '../stores/mapStore.js'

// Recherche plein-texte : alimente store.filterText (debounce 150 ms).
// Le recentrage sur match exact est gere par WorldPage (qui detient la carte).
const store = useMapStore()
const text = ref(store.filterText)
let timer = null

function onInput() {
  clearTimeout(timer)
  timer = setTimeout(() => store.setFilterText(text.value), 150)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <input
    v-model="text"
    class="search"
    type="search"
    placeholder="Rechercher une ville..."
    autocomplete="off"
    @input="onInput"
  >
</template>
