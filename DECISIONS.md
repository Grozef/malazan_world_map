# DECISIONS — Journal des choix importants
# Malazan World Map

> Ce fichier trace les décisions techniques significatives et leurs justifications.
> But : ne pas re-débattre des mêmes sujets à chaque session.

---

## 2026-07-03 — Leaflet CRS.Simple plutôt que QGIS/SIG

Contexte : le brief initial proposait la voie SIG complète (QGIS, géoréférencement,
vectorisation manuelle de tous les contours) pour rendre la carte interactive.

Décision : moteur Leaflet 1.9 avec `L.CRS.Simple`, coordonnées pixel directes, données
en GeoJSON statiques. Site statique HTML/JS d'abord.

Raison : monde imaginaire => le géoréférencement n'apporte rien ; la vectorisation
manuelle complète = des semaines de travail pour un gain marginal. CRS.Simple donne
zoom/pan/marqueurs/drill-down immédiats. QGIS/gdal absents de la machine.

Alternatives rejetées :
- Voie QGIS/SIG complète — surdimensionnée, installation lourde, digitizing manuel massif.
- Backend Laravel + DB dès le départ — repoussé ; le front consommera une API plus tard
  sans jeter le code Leaflet.

Impact : livraison MVP rapide ; positions villes/zones à caler manuellement via un picker
de coordonnées (`?pick=1`) au lieu d'un outil SIG.
