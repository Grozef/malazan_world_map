import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMapStore } from '../mapStore.js'

// Fixture calquee sur la forme reelle de data/cities.geojson
const cities = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [4803, 1189] },
      properties: { name: 'Darujhistan', continent: 'Genabackis', status: 'cite-etat', book: 'Gardens of the Moon' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [3641, 1040] },
      properties: { name: 'Aren', continent: 'Seven Cities', status: 'capitale provinciale', book: 'Deadhouse Gates' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [3849, 1751] },
      properties: { name: 'Unta', continent: 'Quon Tali', status: 'capitale imperiale', book: 'Gardens of the Moon' } },
  ],
}

describe('mapStore', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMapStore()
    store.layersData.cities = cities
  })

  it('propertyOptions derive les facettes whitelistees, triees et dedupliquees', () => {
    const opts = store.propertyOptions
    expect(Object.keys(opts)).toEqual(['book', 'continent', 'status'])
    expect(opts.book).toEqual(['Deadhouse Gates', 'Gardens of the Moon'])
    expect(opts.continent).toHaveLength(3)
  })

  it('propertyOptions ignore les champs hors whitelist (name, note...)', () => {
    expect(store.propertyOptions.name).toBeUndefined()
  })

  it('propertyOptions ignore les couches masquees', () => {
    store.layersVisible.cities = false
    expect(store.propertyOptions).toEqual({})
  })

  // NB : la reference stable est le proxy reactif Pinia (store.layersData.cities),
  // pas l'objet brut — c'est cette identite que les watchers comparent au runtime.
  it('filteredLayers retourne la FC originale par reference sans filtre actif', () => {
    expect(store.filteredLayers.cities).toBe(store.layersData.cities)
  })

  it('filteredLayers filtre par texte sur toutes les properties (insensible casse)', () => {
    store.setFilterText('daru')
    const fc = store.filteredLayers.cities
    expect(fc.features.map(f => f.properties.name)).toEqual(['Darujhistan'])
    expect(fc).not.toBe(cities)
  })

  it('filteredLayers filtre par facette (valeurs multiples = OU)', () => {
    store.togglePropertyFilter('book', 'Gardens of the Moon')
    expect(store.filteredLayers.cities.features).toHaveLength(2)
    store.togglePropertyFilter('book', 'Deadhouse Gates')
    expect(store.filteredLayers.cities.features).toHaveLength(3)
  })

  it('les facettes se cumulent en ET entre champs', () => {
    store.togglePropertyFilter('book', 'Gardens of the Moon')
    store.togglePropertyFilter('continent', 'Quon Tali')
    expect(store.filteredLayers.cities.features.map(f => f.properties.name)).toEqual(['Unta'])
  })

  it('togglePropertyFilter retire une valeur deja active', () => {
    store.togglePropertyFilter('book', 'Deadhouse Gates')
    store.togglePropertyFilter('book', 'Deadhouse Gates')
    expect(store.hasActiveFilters).toBe(false)
    expect(store.filteredLayers.cities).toBe(store.layersData.cities)
  })

  it('clearFilters remet texte et facettes a zero', () => {
    store.setFilterText('aren')
    store.togglePropertyFilter('continent', 'Genabackis')
    store.clearFilters()
    expect(store.hasActiveFilters).toBe(false)
    expect(store.filteredLayers.cities).toBe(store.layersData.cities)
  })
})
