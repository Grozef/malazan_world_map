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

// --- Globe 3D ---
// Convention lue dans three/src/geometries/SphereGeometry.js (0.185.1) :
//   uv = (u, 1 - v_geo) ; theta = v_geo * PI ; phi = u * 2PI
//   position = (-R cos(phi) sin(theta), R cos(theta), R sin(phi) sin(theta))
// La texture est flipY (defaut) : la ligne 0 de l'image est au pole nord,
// donc v_geo = y / H directement. W/padX = largeur equirectangulaire et
// marge ajoutee de chaque cote (voir GLOBE dans constants/layers.js).

// pixel carte-monde [x, y] -> point sur la sphere de rayon R
export function pxToSphere(x, y, W, H, padX, R = 1) {
  const phi = ((x + padX) / W) * 2 * Math.PI
  const theta = (y / H) * Math.PI
  const ring = R * Math.sin(theta)
  return [-ring * Math.cos(phi), R * Math.cos(theta), ring * Math.sin(phi)]
}

// uv d'une intersection raycast three.js -> pixel carte-monde [x, y]
// x peut sortir de [0, W - 2*padX] : ce sont les bandes de padding (ocean).
export function uvToPx(u, v, W, H, padX) {
  return [u * W - padX, (1 - v) * H]
}
