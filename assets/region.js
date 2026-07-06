// Carte regionale generique — lit ?id=<region> et charge l'image de detail
// declaree dans data/regions.json.
(function () {
  const id = new URLSearchParams(location.search).get('id');
  const titleEl = document.getElementById('region-title');

  fetch('data/regions.json')
    .then(r => r.json())
    .then(reg => {
      const r = reg[id];
      if (!r) {
        titleEl.textContent = 'Region inconnue : ' + (id || '(aucune)');
        return;
      }
      titleEl.textContent = r.label || id;

      const map = L.map('map', { crs: L.CRS.Simple, minZoom: -4, maxZoom: 3 });
      const bounds = [[0, 0], [r.height, r.width]];
      L.imageOverlay(r.image, bounds).addTo(map);
      map.fitBounds(bounds);
      map.setMaxBounds(bounds);
    })
    .catch(err => {
      titleEl.textContent = 'Erreur de chargement';
      console.error('regions.json :', err);
    });
})();
