// Budget de taille du build (npm run size : vite build puis ce script). Trop lent pour Vitest.
// Mesures du 2026-11-06 : entree 89,4 Ko gz, GlobePage (three.js) 134,8 Ko gz ; budgets x1,3 environ.
import { gzipSync } from 'node:zlib'
import { readdirSync, readFileSync } from 'node:fs'

const BUDGETS_KB = { index: 120, GlobePage: 175 }
const OTHER_CHUNK_KB = 60 // tout autre chunk : un nouveau gros morceau doit etre vu

const dir = new URL('../dist/assets/', import.meta.url)
let failed = false
for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const size = gzipSync(readFileSync(new URL(file, dir))).length / 1024
  const name = file.replace(/-[\w-]{8}\.js$/, '')
  const budget = BUDGETS_KB[name] ?? OTHER_CHUNK_KB
  const ok = size <= budget
  failed ||= !ok
  console.log(`${ok ? 'OK  ' : 'TROP'} ${file} ${size.toFixed(1)} Ko gz (budget ${budget})`)
}
process.exit(failed ? 1 : 0)
