import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const d = JSON.parse(readFileSync(args[0], 'utf8'))
const iso = args.includes('--forcer-isotrope')
const A = d.amers

function cale(pairs, axe) {
  const n = pairs.length
  const se = pairs.reduce((s, p) => s + p[0], 0), sp = pairs.reduce((s, p) => s + p[1], 0)
  const see = pairs.reduce((s, p) => s + p[0] * p[0], 0)
  const sep = pairs.reduce((s, p) => s + p[0] * p[1], 0)
  const k = (n * sep - se * sp) / (n * see - se * se)
  const b = (sp - k * se) / n
  return { k, b, axe }
}

const px = A.map(a => [a[1], a[3]]), py = A.map(a => [a[2], a[4]])
let fx = cale(px, 'x'), fy = cale(py, 'y')
if (iso) {
  const k = (fx.k + fy.k) / 2
  fx = { k, b: px.reduce((s, p) => s + (p[1] - k * p[0]), 0) / px.length, axe: 'x' }
  fy = { k, b: py.reduce((s, p) => s + (p[1] - k * p[0]), 0) / py.length, axe: 'y' }
}

console.log(`kx = ${fx.k.toFixed(4)}  bx = ${fx.b.toFixed(1)}     ky = ${fy.k.toFixed(4)}  by = ${fy.b.toFixed(1)}`)
console.log(`anisotropie kx/ky = ${(fx.k / fy.k).toFixed(3)}${iso ? '  (FORCEE isotrope)' : ''}`)
let s2 = 0
console.log('\namer                      residu x   residu y   norme')
for (const [nom, xe, ye, xp, yp] of A) {
  const rx = fx.k * xe + fx.b - xp, ry = fy.k * ye + fy.b - yp
  const n = Math.hypot(rx, ry); s2 += rx * rx + ry * ry
  console.log(`  ${nom.padEnd(22)} ${rx.toFixed(1).padStart(8)} ${ry.toFixed(1).padStart(10)} ${n.toFixed(1).padStart(8)}${n > 40 ? '   <-- SUSPECT' : ''}`)
}
console.log(`\nRMS = ${Math.sqrt(s2 / A.length).toFixed(1)} px sur ${A.length} amers`)

const [we, he] = d.enfant, [wp, hp] = d.parent
const x0 = fx.b, y0 = fy.b, x1 = fx.k * we + fx.b, y1 = fy.k * he + fy.b
const r = [x0, y0, x1, y1].map(Math.round)
console.log(`\nemprise brute = [${r.join(',')}]  ${r[2] - r[0]}x${r[3] - r[1]}`)
const cl = [Math.max(0, r[0]), Math.max(0, r[1]), Math.min(wp, r[2]), Math.min(hp, r[3])]
console.log(`emprise bornee au parent (${wp}x${hp}) = [${cl.join(',')}]  ${cl[2] - cl[0]}x${cl[3] - cl[1]}`)
if (cl.join() !== r.join()) console.log('/!\ ROGNEE : le cadre de la fille deborde du parent')
const lhE = we / he, lhP = (r[2] - r[0]) / (r[3] - r[1])
console.log(`controle L/H : image ${lhE.toFixed(3)} · emprise ${lhP.toFixed(3)} · ecart ${(100 * Math.abs(lhP - lhE) / lhE).toFixed(1)} %`)
