// Helper dev : active avec ?pick=1
// Au clic sur la carte, affiche et copie les coordonnees pixel [x, y]
// (origine haut-gauche) — a coller dans data/cities.geojson ou regions.geojson.
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('pick') !== '1') return;

  const ctx = window.__malazan;
  if (!ctx) { console.warn('picker: contexte carte absent'); return; }
  const { map, WORLD } = ctx;

  const hint = document.getElementById('pickhint');
  if (hint) hint.hidden = false;

  map.on('click', e => {
    const x = Math.round(e.latlng.lng);
    const y = Math.round(WORLD.H - e.latlng.lat); // inverse de px()
    const text = `[${x}, ${y}]`;
    console.log('pixel', text);
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    L.popup({ closeButton: false, autoClose: true })
      .setLatLng(e.latlng)
      .setContent(`pixel <b>${text}</b><br><small>copie</small>`)
      .openOn(map);
  });
})();
