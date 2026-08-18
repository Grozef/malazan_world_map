// Registre des couches et constantes de la carte-monde.
// Les fichiers data stockent les coordonnees en pixel [x, y] origine haut-gauche
// (conversion au rendu via utils/coords.js).

export const WORLD = {
  W: 10000,
  H: 5571,
}

// Fonds interchangeables, tous deux d'Adam Whitehead et MESURES a 10000x5571 :
// meme cadrage, donc les 7 geojson valent pour l'un comme pour l'autre et la
// bascule ne touche que les pixels. Pyramides generees par tools/tile.mjs ; les
// dossiers portent le zoom LEAFLET, donc negatifs, et minZoom doit etre passe a
// la couche faute de quoi GridLayer (defaut 0) n'affiche rien a ces zooms.
export const BASES = [
  { id: '2025', label: 'Atlas 2025', tiles: { url: 'tiles/2025/{z}/{x}/{y}.webp', minNative: -6, maxNative: 0 } },
  { id: '2020', label: 'Atlas 2020', tiles: { url: 'tiles/2020/{z}/{x}/{y}.webp', minNative: -6, maxNative: 0 } },
]
export const DEFAULT_BASE = '2025'

// Credit de l'oeuvre source, affiche sur les deux vues qui la rendent (globe et
// carte plate). Decision D3 du 2026-08-18.
export const CREDIT = {
  label: 'Carte : Adam Whitehead',
  url: 'https://atlasoficeandfireblog.wordpress.com/category/malazan-atlas/',
}

// Globe 3D (route #/) : texture equirectangulaire generee par
// tools/globe-texture.mjs. La carte WORLD (ratio 1.795) y est centree dans une
// toile 2:1 par replication des pixels de bord, d'ou padX a appliquer aux
// coordonnees pixel avant projection sur la sphere.
export const GLOBE = {
  W: WORLD.H * 2,                       // 11142 px de large en equirectangulaire
  padX: (WORLD.H * 2 - WORLD.W) / 2,    // 571 px ajoutes de chaque cote
}

// Chaque base est publiee en 4096 ET en 8192 de large. Le 8192 quadruple le
// nombre de texels (mesure ici : 1,34 Mo contre 0,51 Mo) et beaucoup de GPU
// mobiles plafonnent a MAX_TEXTURE_SIZE = 4096, ou la texture est purement
// refusee — d'ou le choix a l'execution sur la capability du contexte reel.
export function globeTexture(baseId, maxTextureSize) {
  return `decor/globe-${baseId}-${maxTextureSize >= 8192 ? 8192 : 4096}.webp`
}

// kind : point | label | line | polygon (voir utils/leafletRenderers.js)
// filterable : la couche alimente les facettes de FiltersPanel
// defaultOn : visible au chargement (les autres sont fetchees au premier toggle)
export const LAYERS = [
  { id: 'cities', label: 'Villes', file: 'data/cities.geojson', kind: 'point', filterable: true, defaultOn: true },
  { id: 'poi', label: 'Lieux notables', file: 'data/poi.geojson', kind: 'point', filterable: true, defaultOn: false },
  { id: 'battles', label: 'Batailles', file: 'data/battles.geojson', kind: 'point', filterable: true, defaultOn: false },
  // Eteinte par defaut : la base 2025 imprime deja ses propres noms d'oceans.
  // Conservee pour un futur fond qui ne les porterait pas.
  { id: 'seas', label: 'Mers & oceans', file: 'data/seas.geojson', kind: 'label', filterable: false, defaultOn: false },
  { id: 'routes', label: 'Routes & campagnes', file: 'data/routes.geojson', kind: 'line', filterable: true, defaultOn: false },
  { id: 'borders', label: 'Frontieres', file: 'data/borders.geojson', kind: 'polygon', filterable: true, defaultOn: false },
]

// Whitelist des champs de properties exposes en facettes — sans elle,
// l'auto-derivation multi-couches se pollue (fontScale, order, dimensions...).
export const FILTER_FIELDS = ['continent', 'book', 'type', 'faction', 'status']
