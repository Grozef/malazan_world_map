# malazan_world_map

Carte interactive du monde de Malazan : un globe 3D et des cartes regionales navigables,
construits a partir des cartes publiees dans la serie.

## Ce que contient le depot

| Dossier | Role |
|---|---|
| `frontend/` | L'application Vue 3 (Vite) |
| `genabackis/` | Les images sources : Genabackis, Chain of Dogs, Edur Lands, Empire of Lether, Malaz Isle |
| `tools/` | Scripts Node de preparation : `tile.mjs` (decoupe en tuiles), `globe-texture.mjs` (texture du globe) |
| `docs/` | Notes de conception |

## Stack

Vue 3, Vue Router, Pinia, Vite. Rendu cartographique par **Leaflet**, globe 3D par **three**.
Tests unitaires avec Vitest.

## Navigation

Trois routes (`frontend/src/router`) :

- `/` : le globe (`GlobePage.vue`)
- `/carte` : la carte du monde (`WorldPage.vue`)
- `/region/:id` : une region (`RegionPage.vue`)

## Structure de l'application

- `components/` : `GlobeCanvas` et `MapCanvas` (les deux moteurs de rendu), `MapChrome`,
  `LayersPanel`, `FiltersPanel`, `SearchBar`, `BasePicker`, `AuthoringPanel`
- `stores/mapStore.js` : etat de la carte (Pinia)
- `api/dataSource.js` : chargement des donnees
- `constants/layers.js` : definition des calques

Les chemins d'assets passent par `import.meta.env.BASE_URL`, l'application est donc
deployable sous un sous-chemin.

## Lancer

```sh
cd frontend
npm install
npm run dev
```

`npm run build` pour le bundle de production, `npm run test` pour Vitest.
