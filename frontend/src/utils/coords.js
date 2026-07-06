// Conversion entre la convention data (pixel origine HAUT-gauche, [x, y])
// et les latlng Leaflet CRS.Simple (origine BAS-gauche).
// H = hauteur en pixels de l'image de la carte concernée.

// pixel [x, y] -> [lat, lng] Leaflet
export function px(x, y, H) {
  return [H - y, x]
}

// latlng Leaflet -> pixel [x, y] arrondi (inverse de px, utilisé par le picker)
export function unpx(latlng, H) {
  return [Math.round(latlng.lng), Math.round(H - latlng.lat)]
}
