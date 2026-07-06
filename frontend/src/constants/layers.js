// Registre des couches et constantes de la carte-monde.
// Les fichiers data stockent les coordonnees en pixel [x, y] origine haut-gauche
// (conversion au rendu via utils/coords.js).

export const WORLD = {
  image: 'img/malazan-world-map-2019.png',
  W: 6936,
  H: 3864,
}

export const PARCHMENT = 'decor/land-parchment.webp'

// kind : point | label | line | polygon (voir utils/leafletRenderers.js)
// filterable : la couche alimente les facettes de FiltersPanel
// defaultOn : visible au chargement (les autres sont fetchees au premier toggle)
export const LAYERS = [
  { id: 'cities', label: 'Villes', file: 'data/cities.geojson', kind: 'point', filterable: true, defaultOn: true },
  { id: 'poi', label: 'Lieux notables', file: 'data/poi.geojson', kind: 'point', filterable: true, defaultOn: false },
  { id: 'battles', label: 'Batailles', file: 'data/battles.geojson', kind: 'point', filterable: true, defaultOn: false },
  { id: 'seas', label: 'Mers & oceans', file: 'data/seas.geojson', kind: 'label', filterable: false, defaultOn: true },
  { id: 'routes', label: 'Routes & campagnes', file: 'data/routes.geojson', kind: 'line', filterable: true, defaultOn: false },
  { id: 'borders', label: 'Frontieres', file: 'data/borders.geojson', kind: 'polygon', filterable: true, defaultOn: false },
]

// Whitelist des champs de properties exposes en facettes — sans elle,
// l'auto-derivation multi-couches se pollue (fontScale, order, dimensions...).
export const FILTER_FIELDS = ['continent', 'book', 'type', 'faction', 'status']
