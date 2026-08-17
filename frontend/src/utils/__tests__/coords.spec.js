import { describe, it, expect } from 'vitest'
import { px, unpx, pxToSphere, uvToPx } from '../coords.js'

// px/unpx prennent la hauteur en parametre : la valeur ci-dessous est une
// fixture, elle n'engage aucune base particuliere.
const H = 3864
// Base carte-monde 2025 (constants/layers.js) pour les tests de projection
const WH = 5571  // hauteur
const GW = 11142 // largeur equirectangulaire (WH * 2)
const PAD = 571  // marge ajoutee de chaque cote

describe('px', () => {
  it('convertit le pixel haut-gauche en latlng CRS.Simple', () => {
    expect(px(0, 0, H)).toEqual([H, 0])           // coin haut-gauche
    expect(px(6936, H, H)).toEqual([0, 6936])     // coin bas-droit
    expect(px(4803, 1189, H)).toEqual([H - 1189, 4803]) // Darujhistan
  })
})

describe('unpx', () => {
  it('est l\'inverse de px', () => {
    const [lat, lng] = px(4803, 1189, H)
    expect(unpx({ lat, lng }, H)).toEqual([4803, 1189])
  })

  it('arrondit les coordonnees flottantes', () => {
    expect(unpx({ lat: H - 1189.4, lng: 4803.6 }, H)).toEqual([4804, 1189])
  })
})

describe('pxToSphere', () => {
  it('place le pole nord et le pole sud sur l\'axe Y', () => {
    const [, north] = pxToSphere(5000, 0, GW, WH, PAD)
    const [, south] = pxToSphere(5000, WH, GW, WH, PAD)
    expect(north).toBeCloseTo(1)
    expect(south).toBeCloseTo(-1)
  })

  it('rend un point unitaire sur l\'equateur', () => {
    const [x, y, z] = pxToSphere(6925, WH / 2, GW, WH, PAD)
    expect(y).toBeCloseTo(0)
    expect(Math.hypot(x, y, z)).toBeCloseTo(1)
  })
})

describe('uvToPx', () => {
  it('inverse la projection texture (uv three.js -> pixel)', () => {
    // uv equivalents de Darujhistan sur la base 2025 : u = (x + pad) / GW, v = 1 - y / WH
    const [x, y] = uvToPx((6925 + PAD) / GW, 1 - 1714 / WH, GW, WH, PAD)
    expect(x).toBeCloseTo(6925)
    expect(y).toBeCloseTo(1714)
  })
})
