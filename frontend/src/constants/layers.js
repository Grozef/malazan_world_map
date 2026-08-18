// Registre des couches et constantes de la carte-monde.
// Les fichiers data stockent les coordonnees en pixel [x, y] origine haut-gauche
// (conversion au rendu via utils/coords.js).

// Base : carte 2025 d'Adam Whitehead (genabackis/malazan-world-map-2025.png),
// servie en pyramide de tuiles generee par tools/tile.mjs. Les dossiers portent
// le zoom LEAFLET, donc negatifs ; minZoom doit etre passe a la couche, faute de
// quoi GridLayer (defaut 0) n'affiche rien a ces zooms.
export const WORLD = {
  W: 10000,
  H: 5571,
  tiles: { url: 'tiles/{z}/{x}/{y}.webp', minNative: -6, maxNative: 0 },
}

// Credit de l'oeuvre source, affiche sur les deux vues qui la rendent (globe et
// carte plate). Decision D3 du 2026-08-18.
export const CREDIT = {
  label: 'Carte : Adam Whitehead',
  url: 'https://atlasoficeandfireblog.wordpress.com/category/malazan-atlas/',
}

// OBSOLETES depuis la bascule sur la base 2025 : ces deux calques sont des
// masques cales sur la carte 2019 (6936x3864), et la 2025 peint deja terrain et
// relief. Plus references par aucune page ; fichiers et tools/relief.mjs
// conserves en attendant une decision de suppression.
export const PARCHMENT = 'decor/land-parchment.webp'
export const RELIEF = 'decor/relief-shade.webp'

// Globe 3D (route #/globe) : texture equirectangulaire generee par
// tools/globe-texture.mjs. La carte WORLD (ratio 1.795) y est centree dans une
// toile 2:1 par replication des pixels de bord, d'ou padX a appliquer aux
// coordonnees pixel avant projection sur la sphere.
export const GLOBE = {
  texture: 'decor/globe-texture.webp',
  W: WORLD.H * 2,                       // 11142 px de large en equirectangulaire
  padX: (WORLD.H * 2 - WORLD.W) / 2,    // 571 px ajoutes de chaque cote
}

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
