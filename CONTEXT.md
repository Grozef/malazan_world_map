# CONTEXT — Malazan World Map
# Mis à jour quand l'architecture change · LIMITE 40 lignes

## Vue d'ensemble
Type : site statique cartographique (HTML/JS vanilla + Leaflet, pas de build).
Objectif : carte web interactive du monde de Malazan (zoom/pan, marqueurs villes,
drill-down vers cartes régionales détaillées).
Stack : HTML/CSS/JS vanilla, Leaflet 1.9.4 (vendored local), GeoJSON statique.
Servi via PHP built-in server ou laragon. gdal/QGIS absents ; node/php/python dispo.

## Structure
```
index.html      carte-monde  ->  assets/world.js
region.html     drill-down régional (?id=)  ->  assets/region.js
assets/         world.js region.js picker.js app.css leaflet/(local)
data/           cities.geojson  regions.geojson  regions.json
img/            malazan-world-map-2019.png (6936x3864) + 13 webp régionales
genabackis/     sources originales (inchangées)
tools/tile.mjs  tuilage pyramidal optionnel (sharp) — non lancé
```

## Conventions
Coordonnées : pixel origine HAUT-gauche `[x, y]` dans les GeoJSON ; helper `px(x,y)`
-> latlng CRS.Simple `[H - y, x]`. Le picker fait l'inverse.
Patterns : `L.CRS.Simple` (pas de géoréférencement), imageOverlay pleine image en MVP,
données GeoJSON/JSON statiques via fetch().
Fixe : monde imaginaire => pas de SIG. Positions villes/zones = placeholders
(`placeholder:true`) à caler via `index.html?pick=1`.

## Ressources
- Plan : `~/.claude/plans/linear-bubbling-codd.md`
- Carte source : Adam Whitehead, Malazan world map 2019.
