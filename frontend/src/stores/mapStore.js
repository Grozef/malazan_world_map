import { defineStore } from 'pinia'
import { LAYERS, FILTER_FIELDS } from '../constants/layers.js'
import { fetchLayer, fetchRegions } from '../api/dataSource.js'

// Etat des couches de donnees + filtres (transposition du pattern lab_maps).
// Ne contient QUE des donnees (FeatureCollections, booleens) — jamais d'objet Leaflet.
export const useMapStore = defineStore('map', {
  state: () => ({
    layersData: {},    // { [layerId]: FeatureCollection | null }
    layersVisible: Object.fromEntries(LAYERS.map(l => [l.id, l.defaultOn])),
    layersLoading: {},
    regionsData: null,     // FeatureCollection des zones drill-down (hors LAYERS)
    regionsVisible: true,
    filterText: '',
    activePropertyFilters: {}, // { champ: [valeurs] }
  }),

  getters: {
    // Facettes filtrables derivees des properties des couches visibles et
    // filterable, restreintes a FILTER_FIELDS. Deduplication insensible a la
    // casse (Map lowercase -> canonique).
    propertyOptions(state) {
      const options = {}
      for (const layer of LAYERS) {
        if (!layer.filterable || !state.layersVisible[layer.id]) continue
        const fc = state.layersData[layer.id]
        if (!fc) continue
        for (const f of fc.features) {
          for (const [k, v] of Object.entries(f.properties || {})) {
            if (!FILTER_FIELDS.includes(k) || v === null || v === '') continue
            if (!options[k]) options[k] = new Map()
            const str = String(v)
            if (!options[k].has(str.toLowerCase())) options[k].set(str.toLowerCase(), str)
          }
        }
      }
      return Object.fromEntries(
        Object.entries(options)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, map]) => [k, [...map.values()].sort()])
      )
    },

    // FeatureCollections filtrees par couche — source consommee par la carte.
    // Retourne la FC ORIGINALE PAR REFERENCE quand rien ne filtre : les watchers
    // court-circuitent le re-rendu sur egalite de reference.
    filteredLayers(state) {
      const textQ = state.filterText.trim().toLowerCase()
      const facets = Object.entries(state.activePropertyFilters)
        .filter(([, vals]) => vals && vals.length > 0)
        .map(([key, vals]) => [key, vals.map(v => String(v).toLowerCase())])

      const out = {}
      for (const layer of LAYERS) {
        const fc = state.layersData[layer.id]
        if (!fc || !layer.filterable) {
          out[layer.id] = fc ?? null
          continue
        }
        let features = fc.features
        if (textQ) {
          features = features.filter(f =>
            Object.values(f.properties || {}).some(v =>
              String(v ?? '').toLowerCase().includes(textQ)
            )
          )
        }
        for (const [key, valsLower] of facets) {
          features = features.filter(f =>
            valsLower.includes(String(f.properties?.[key] ?? '').toLowerCase())
          )
        }
        out[layer.id] = features === fc.features ? fc : { ...fc, features }
      }
      return out
    },

    hasActiveFilters(state) {
      return !!state.filterText.trim() ||
        Object.values(state.activePropertyFilters).some(v => v.length > 0)
    },
  },

  actions: {
    async loadLayer(id) {
      if (this.layersData[id] || this.layersLoading[id]) return
      this.layersLoading[id] = true
      try {
        this.layersData[id] = await fetchLayer(id)
      } catch (err) {
        console.warn(`couche ${id} non chargee :`, err)
      } finally {
        this.layersLoading[id] = false
      }
    },

    async loadRegions() {
      if (this.regionsData) return
      try {
        this.regionsData = await fetchRegions()
      } catch (err) {
        console.warn('regions.geojson non charge :', err)
      }
    },

    toggleLayer(id) {
      this.layersVisible[id] = !this.layersVisible[id]
      if (this.layersVisible[id]) this.loadLayer(id)
    },

    setFilterText(text) {
      this.filterText = text
    },

    togglePropertyFilter(key, value) {
      const vals = this.activePropertyFilters[key] || []
      this.activePropertyFilters[key] = vals.includes(value)
        ? vals.filter(v => v !== value)
        : [...vals, value]
    },

    clearFilters() {
      this.filterText = ''
      this.activePropertyFilters = {}
    },
  },
})
