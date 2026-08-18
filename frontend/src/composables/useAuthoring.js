import { ref, shallowRef, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import { px, unpx } from '../utils/coords.js'
import { fetchLayer, fetchRegions } from '../api/dataSource.js'

// Outil dev d'authoring des couches, actif avec ?pick=1 dans l'URL.
// Remplace l'ancien picker (qui ne copiait qu'une paire de coordonnees) : il
// charge la couche VISEE, la rend editable a la souris (poser, deplacer,
// supprimer ; sommet par sommet pour les polygones) et reexporte le geojson
// complet dans la convention pixel [x, y] origine haut-gauche.
//
// Il travaille sur une COPIE des donnees : le store de l'application n'est
// jamais modifie, la vue normale reste le reflet des fichiers sur disque.

const POINT_LAYERS = ['cities', 'poi', 'battles']

export function useAuthoring(H) {
  const route = useRoute()
  const active = ref(route.query.pick === '1')
  const target = ref('cities')       // id de couche, ou 'regions'
  // shallowRef + mises a jour IMMUABLES (voir replace()) : une reactivite
  // profonde couterait cher sur des FeatureCollections relues a chaque redraw,
  // et une mutation en place ne suffirait pas — le panneau derive un computed
  // par feature, qui ne se propage que si la REFERENCE de l'objet change.
  const features = shallowRef([])    // copie de travail
  const selected = ref(-1)           // index edite dans le panneau
  const dirty = ref(false)

  let map = null
  const group = L.layerGroup()

  const isPolygon = () => target.value === 'regions'

  // Remplace la feature d'index i par le resultat de fn : nouveau tableau ET
  // nouvel objet feature, sans quoi les computed du panneau ne se rafraichissent
  // pas (un computed qui rend la meme reference n'invalide pas ses dependants).
  function replace(i, fn) {
    features.value = features.value.map((f, k) => (k === i ? fn(f) : f))
    dirty.value = true
    redraw()
  }

  // --- rendu des poignees -------------------------------------------------

  function redraw() {
    group.clearLayers()
    features.value.forEach((f, i) => {
      if (f.geometry.type === 'Point') {
        handle(f.geometry.coordinates, i, -1, f.properties?.name || f.properties?.id || `#${i}`)
      } else {
        const ring = f.geometry.coordinates[0]
        L.polygon(ring.map(([x, y]) => px(x, y, H)), {
          color: i === selected.value ? '#e0a955' : '#7a3b1d',
          weight: 2,
          fillOpacity: 0.12,
        }).addTo(group)
        // Le dernier sommet ferme l'anneau : il n'a pas de poignee propre, il
        // suit le premier (sinon deplacer l'un ouvrirait le polygone).
        ring.slice(0, -1).forEach((c, v) => handle(c, i, v, `${f.properties?.id || i} [${v}]`))
      }
    })
  }

  function handle(coords, fi, vi, title) {
    const marker = L.circleMarker(px(coords[0], coords[1], H), {
      radius: 6,
      color: '#1a140c',
      weight: 1,
      fillColor: fi === selected.value ? '#e0a955' : '#c9b48b',
      fillOpacity: 1,
      title,
    })
    marker.on('mousedown', (e) => {
      L.DomEvent.stop(e)
      selected.value = fi
      drag(fi, vi)
    })
    marker.bindTooltip(title, { direction: 'top', offset: [0, -8] })
    marker.addTo(group)
  }

  // Glisser une poignee : on suit le mouvement de la CARTE (pas du marqueur),
  // le drag natif de Leaflet ne couvre pas les circleMarker.
  function drag(fi, vi) {
    map.dragging.disable()
    const onMove = (e) => {
      const [x, y] = unpx(e.latlng, H)
      replace(fi, (f) => {
        if (vi === -1) return { ...f, geometry: { ...f.geometry, coordinates: [x, y] } }
        const ring = f.geometry.coordinates[0].map((c, k) => (k === vi ? [x, y] : c))
        // Le dernier point ferme l'anneau : il suit le premier.
        if (vi === 0) ring[ring.length - 1] = [x, y]
        return { ...f, geometry: { ...f.geometry, coordinates: [ring] } }
      })
    }
    const onUp = () => {
      map.off('mousemove', onMove)
      map.off('mouseup', onUp)
      map.dragging.enable()
    }
    map.on('mousemove', onMove)
    map.on('mouseup', onUp)
  }

  // --- edition ------------------------------------------------------------

  function onMapClick(e) {
    const [x, y] = unpx(e.latlng, H)
    if (!isPolygon()) {
      features.value = [...features.value, {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [x, y] },
        properties: { name: 'sans nom', placeholder: true },
      }]
      selected.value = features.value.length - 1
      dirty.value = true
      redraw()
    } else if (selected.value >= 0) {
      // Un clic ajoute un sommet AVANT la fermeture de l'anneau selectionne.
      replace(selected.value, (f) => {
        const ring = f.geometry.coordinates[0]
        return {
          ...f,
          geometry: { ...f.geometry, coordinates: [[...ring.slice(0, -1), [x, y], ring[ring.length - 1]]] },
        }
      })
    }
  }

  function addPolygon() {
    // Carre de 400 px autour du centre courant : plus rapide a deformer qu'un
    // polygone a construire clic par clic depuis rien.
    const [cx, cy] = unpx(map.getCenter(), H)
    const d = 200
    features.value = [...features.value, {
      type: 'Feature',
      properties: { id: 'nouvelle_zone', label: 'Nouvelle zone' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[cx - d, cy - d], [cx + d, cy - d], [cx + d, cy + d], [cx - d, cy + d], [cx - d, cy - d]]],
      },
    }]
    selected.value = features.value.length - 1
    dirty.value = true
    redraw()
  }

  function removeSelected() {
    if (selected.value < 0) return
    features.value = features.value.filter((_, i) => i !== selected.value)
    selected.value = -1
    dirty.value = true
    redraw()
  }

  function setProperty(key, value) {
    if (selected.value < 0) return
    replace(selected.value, (f) => ({ ...f, properties: { ...f.properties, [key]: value } }))
  }

  // --- chargement / export ------------------------------------------------

  async function load(id) {
    target.value = id
    selected.value = -1
    dirty.value = false
    try {
      const fc = id === 'regions' ? await fetchRegions() : await fetchLayer(id)
      // Copie profonde : editer ne doit pas toucher la FC du store.
      features.value = structuredClone(fc.features)
    } catch (err) {
      console.warn(`authoring : ${id} non charge`, err)
      features.value = []
    }
    redraw()
  }

  function toGeoJSON() {
    return JSON.stringify({ type: 'FeatureCollection', features: features.value }, null, 2)
  }

  function download() {
    const blob = new Blob([toGeoJSON()], { type: 'application/geo+json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${target.value}.geojson`
    a.click()
    URL.revokeObjectURL(a.href)
    dirty.value = false
  }

  // --- cycle de vie -------------------------------------------------------

  function attach(m) {
    if (!active.value) return
    map = m
    group.addTo(map)
    map.on('click', onMapClick)
    load(target.value)
  }

  onBeforeUnmount(() => {
    if (map) map.off('click', onMapClick)
    group.clearLayers()
    map = null
  })

  return {
    active, target, features, selected, dirty,
    POINT_LAYERS, isPolygon,
    attach, load, addPolygon, removeSelected, setProperty, download, toGeoJSON,
  }
}
