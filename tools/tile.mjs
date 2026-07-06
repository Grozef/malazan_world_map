// Tuilage pyramidal optionnel (etape 6 du plan) — a lancer seulement si le zoom
// profond de l'imageOverlay devient lent/flou.
//   npm i sharp
//   node tools/tile.mjs
// Produit tiles/{z}/{x}/{y}.png a servir via L.tileLayer sous CRS.Simple.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'img/malazan-world-map-2019.png';
const OUT = 'tiles';
const TILE = 256;

const meta = await sharp(SRC).metadata();
const { width: W, height: H } = meta;
const maxDim = Math.max(W, H);
const maxZoom = Math.ceil(Math.log2(maxDim / TILE)); // zoom ou 1px image = 1px ecran

console.log(`source ${W}x${H}, maxZoom ${maxZoom}`);

for (let z = 0; z <= maxZoom; z++) {
  const scale = Math.pow(2, z - maxZoom);          // <=1
  const zw = Math.max(1, Math.round(W * scale));
  const zh = Math.max(1, Math.round(H * scale));
  const cols = Math.ceil(zw / TILE);
  const rows = Math.ceil(zh / TILE);
  const base = sharp(SRC).resize(zw, zh);
  const buf = await base.png().toBuffer();
  for (let x = 0; x < cols; x++) {
    await mkdir(path.join(OUT, String(z), String(x)), { recursive: true });
    for (let y = 0; y < rows; y++) {
      const left = x * TILE, top = y * TILE;
      const w = Math.min(TILE, zw - left), h = Math.min(TILE, zh - top);
      await sharp(buf)
        .extract({ left, top, width: w, height: h })
        .extend({ right: TILE - w, bottom: TILE - h, background: { r: 16, g: 19, b: 26, alpha: 0 } })
        .png()
        .toFile(path.join(OUT, String(z), String(x), `${y}.png`));
    }
  }
  console.log(`zoom ${z}: ${cols}x${rows} tuiles`);
}
console.log('termine. Cote Leaflet : L.tileLayer("tiles/{z}/{x}/{y}.png", { tileSize:256, minZoom:0, maxZoom:' + maxZoom + ', noWrap:true, bounds })');
