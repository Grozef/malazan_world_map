<script setup>
import { LAYERS } from '../constants/layers.js'
import { useMapStore } from '../stores/mapStore.js'

// Remplace L.control.layers : toggles des couches de donnees + calque parchemin.
const store = useMapStore()
</script>

<template>
  <div class="layers-panel">
    <label v-for="layer in LAYERS" :key="layer.id">
      <input
        type="checkbox"
        :checked="store.layersVisible[layer.id]"
        @change="store.toggleLayer(layer.id)"
      >
      {{ layer.label }}
    </label>
    <label>
      <input type="checkbox" v-model="store.regionsVisible">
      Zones regionales
    </label>
    <label>
      <input type="checkbox" v-model="store.parchmentVisible">
      Parchemin (terres)
    </label>
  </div>
</template>
