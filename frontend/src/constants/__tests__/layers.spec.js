import { describe, it, expect } from 'vitest'
import { BASES, DEFAULT_BASE, globeTexture } from '../layers.js'

describe('globeTexture', () => {
  // Le plafond du GPU est la SEULE raison d'etre des deux millesimes de
  // texture : au-dela de MAX_TEXTURE_SIZE la texture n'est pas degradee, elle
  // est refusee. Un GPU mobile a 4096 doit donc recevoir la 4096.
  it('retombe sur la 4096 quand le GPU plafonne a 4096', () => {
    expect(globeTexture('2025', 4096)).toBe('decor/globe-2025-4096.webp')
  })

  it('prend la 8192 des que le GPU l accepte', () => {
    expect(globeTexture('2025', 8192)).toBe('decor/globe-2025-8192.webp')
    expect(globeTexture('2020', 16384)).toBe('decor/globe-2020-8192.webp')
  })

  it('reste prudent quand la capability est inconnue (0)', () => {
    expect(globeTexture('2025', 0)).toBe('decor/globe-2025-4096.webp')
  })
})

describe('BASES', () => {
  it('declare un defaut qui existe', () => {
    expect(BASES.some(b => b.id === DEFAULT_BASE)).toBe(true)
  })

  it('sert chaque base depuis sa propre pyramide', () => {
    const urls = BASES.map(b => b.tiles.url)
    expect(new Set(urls).size).toBe(BASES.length)
    for (const b of BASES) expect(b.tiles.url).toContain(`tiles/${b.id}/`)
  })
})
