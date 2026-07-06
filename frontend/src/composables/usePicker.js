import { onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import { unpx } from '../utils/coords.js'

// Outil dev d'authoring des couches : actif avec ?pick=1 dans l'URL (hash router).
// Au clic sur la carte, log + copie presse-papier des coordonnees pixel [x, y]
// a coller dans les geojson de public/data/.
export function usePicker(H) {
  const route = useRoute()
  const pickerActive = route.query.pick === '1'
  let map = null

  function onClick(e) {
    const [x, y] = unpx(e.latlng, H)
    const text = `[${x}, ${y}]`
    console.log('pixel', text)
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
    L.popup({ closeButton: false, autoClose: true })
      .setLatLng(e.latlng)
      .setContent(`pixel <b>${text}</b><br><small>copie</small>`)
      .openOn(map)
  }

  // A appeler avec l'instance de carte (evenement ready de MapCanvas)
  function attachPicker(m) {
    if (!pickerActive) return
    map = m
    map.on('click', onClick)
  }

  onBeforeUnmount(() => {
    if (map) map.off('click', onClick)
    map = null
  })

  return { pickerActive, attachPicker }
}
