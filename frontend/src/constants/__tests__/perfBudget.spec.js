import { describe, it, expect } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { LAYERS } from '../layers.js'

// Budgets de performance du chargement (mesures du 2026-11-06, x1,3 environ).
// Les GeoJSON de public/data sont recuperes a l'execution : leur poids est du temps d'affichage.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const kb = (rel) => statSync(ROOT + 'public/' + rel).size / 1024

const STARTUP_BUDGET_KB = 200 // mesure : cities 95 Ko + regions 52 Ko = 147 Ko
const LAYER_CAP_KB = 130 // mesure : plus grosse couche = cities, 95 Ko

describe('budget de chargement des donnees', () => {
  it('les donnees chargees au demarrage (couches defaultOn + regions du globe) tiennent dans le budget', () => {
    const startup = [...LAYERS.filter((l) => l.defaultOn).map((l) => l.file), 'data/regions.geojson']
    const total = startup.reduce((sum, f) => sum + kb(f), 0)
    expect(total, `${startup.join(' + ')} = ${total.toFixed(0)} Ko`).toBeLessThanOrEqual(STARTUP_BUDGET_KB)
  })

  it.each(LAYERS.map((l) => [l.id, l.file]))('la couche %s (%s) reste sous le plafond', (_id, file) => {
    expect(kb(file)).toBeLessThanOrEqual(LAYER_CAP_KB)
  })

  it('chaque couche est un GeoJSON valide (une couche cassee se recharge a chaque toggle)', () => {
    for (const { file } of LAYERS) {
      const fc = JSON.parse(readFileSync(ROOT + 'public/' + file, 'utf8'))
      expect(fc.type, file).toBe('FeatureCollection')
      expect(Array.isArray(fc.features), file).toBe(true)
    }
  })
})

describe('decoupage du bundle', () => {
  // three.js (~135 Ko gz) doit rester hors du chunk d'entree : route en import dynamique.
  it('la page globe est importee a la demande par le routeur', () => {
    const router = readFileSync(ROOT + 'src/router/index.js', 'utf8')
    expect(router).toMatch(/component:\s*\(\)\s*=>\s*import\(['"]\.\.\/pages\/GlobePage\.vue['"]\)/)
    expect(router).not.toMatch(/^import\s+GlobePage\b/m)
  })
})
