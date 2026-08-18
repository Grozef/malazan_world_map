<script setup>
import { BASES } from '../constants/layers.js'
import { useMapStore } from '../stores/mapStore.js'

// Choix du fond, commun au globe et a la carte plate : les deux millesimes
// partagent le cadrage, la bascule ne deplace donc aucune couche de donnees.
const store = useMapStore()
</script>

<template>
  <select
    class="basepicker"
    :value="store.baseId"
    aria-label="Fond de carte"
    @change="store.setBase($event.target.value)"
  >
    <option v-for="b in BASES" :key="b.id" :value="b.id">{{ b.label }}</option>
  </select>
</template>
