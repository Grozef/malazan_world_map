import { describe, it, expect } from 'vitest'
import { px, unpx } from '../coords.js'

const H = 3864 // hauteur carte monde

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
