<script setup>
import { computed } from 'vue'

// Panneau du mode dev (#/carte?pick=1). Toute la logique vit dans
// useAuthoring : ce composant n'est qu'une facade sur l'API rendue.
const props = defineProps({
  authoring: { type: Object, required: true },
})

const a = props.authoring
const current = computed(() => a.selected.value >= 0 ? a.features.value[a.selected.value] : null)
const coords = computed(() => {
  const f = current.value
  if (!f) return ''
  return f.geometry.type === 'Point'
    ? `[${f.geometry.coordinates.join(', ')}]`
    : `${f.geometry.coordinates[0].length - 1} sommets`
})
</script>

<template>
  <div class="authoring">
    <div class="authoring-row">
      <select :value="a.target.value" @change="a.load($event.target.value)">
        <option v-for="id in a.POINT_LAYERS" :key="id" :value="id">{{ id }}</option>
        <option value="regions">regions</option>
      </select>
      <button v-if="a.isPolygon()" @click="a.addPolygon()">+ zone</button>
      <button :disabled="a.selected.value < 0" @click="a.removeSelected()">supprimer</button>
      <button @click="a.download()">exporter</button>
    </div>

    <p class="authoring-hint">
      <template v-if="a.isPolygon()">
        Clic = ajoute un sommet a la zone selectionnee. Glisser une poignee la deplace.
      </template>
      <template v-else>
        Clic = pose un point. Glisser une poignee le deplace.
      </template>
      <span v-if="a.dirty.value" class="authoring-dirty">modifie, non exporte</span>
    </p>

    <div v-if="current" class="authoring-edit">
      <label>
        {{ a.isPolygon() ? 'id' : 'name' }}
        <input
          :value="current.properties[a.isPolygon() ? 'id' : 'name']"
          @input="a.setProperty(a.isPolygon() ? 'id' : 'name', $event.target.value)"
        >
      </label>
      <code>{{ coords }}</code>
    </div>
    <p v-else class="authoring-hint">{{ a.features.value.length }} entites chargees</p>
  </div>
</template>
