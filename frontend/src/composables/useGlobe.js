import {
  Scene, PerspectiveCamera, WebGLRenderer, SphereGeometry, MeshPhongMaterial,
  ShaderMaterial, Mesh, DirectionalLight, AmbientLight, TextureLoader,
  SRGBColorSpace, BackSide, AdditiveBlending, BufferGeometry, BufferAttribute,
  PointsMaterial, Points, Raycaster, Vector2, Vector3, Color,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Cycle de vie de la scene three.js du globe. Meme contrat que useLeafletMap :
// aucun objet three n'entre dans un etat reactif Vue (closures uniquement).
// Le globe est une sphere de rayon 1 texturee par l'equirectangulaire de la
// carte-monde ; le pointage renvoie l'uv brut de l'intersection, la conversion
// en pixel carte reste a l'appelant (utils/coords.js).

const R = 1
const STARS = 1400

function makeStars() {
  const pos = new Float32Array(STARS * 3)
  for (let i = 0; i < STARS; i++) {
    // Direction uniforme sur la sphere celeste (z uniforme = pas d'amas aux poles)
    const z = Math.random() * 2 - 1
    const a = Math.random() * 2 * Math.PI
    const r = Math.sqrt(1 - z * z)
    const d = 60 + Math.random() * 40
    pos.set([r * Math.cos(a) * d, z * d, r * Math.sin(a) * d], i * 3)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  return g
}

// Halo atmospherique : coque plus grande vue de l'INTERIEUR (BackSide), donc
// seul l'anneau entre le globe et le bord de la coque est visible. Sur cet
// anneau le produit normale.vue vaut ~0 au bord exterieur et croit vers le
// globe : l'intensite est donc pow(abs(dot)) — sans le `1 -` du fresnel usuel,
// qui donnait un cerne bleu dur a l'exterieur au lieu d'un degrade.
const ATMO_VERT = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`
const ATMO_FRAG = `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.8) * 1.9;
    gl_FragColor = vec4(uColor * f, f);
  }
`

export function useGlobe() {
  let renderer = null
  let controls = null
  let frame = 0
  let observer = null
  let detachPointer = null
  let globeMaterial = null
  let currentTex = null
  const disposables = []

  // opts : { el, startAt: [x,y,z], onPoint }
  // La texture n'est PAS passee ici : son choix depend de MAX_TEXTURE_SIZE, qui
  // n'existe qu'une fois le contexte cree. L'appelant enchaine sur setTexture().
  // onPoint(uv | null, event) est appele au survol et au clic (clic = drag < 5px).
  function create({ el, startAt, onPoint }) {
    renderer = new WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)

    const scene = new Scene()
    const camera = new PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.05, 200)
    camera.position.set(...startAt)

    const geometry = new SphereGeometry(R, 128, 96)
    const material = new MeshPhongMaterial({ shininess: 6, specular: new Color(0x1a2430) })
    const globe = new Mesh(geometry, material)
    scene.add(globe)
    disposables.push(geometry, material)
    globeMaterial = material

    // Coque large : l'anneau visible doit couvrir assez d'ecran pour degrader.
    const atmoGeo = new SphereGeometry(R * 1.18, 64, 48)
    const atmoMat = new ShaderMaterial({
      uniforms: { uColor: { value: new Color(0x5aa9ff) } },
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      side: BackSide,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
    scene.add(new Mesh(atmoGeo, atmoMat))
    disposables.push(atmoGeo, atmoMat)

    const starGeo = makeStars()
    const starMat = new PointsMaterial({ color: 0xfff1d6, size: 0.35, sizeAttenuation: true })
    scene.add(new Points(starGeo, starMat))
    disposables.push(starGeo, starMat)

    // Soleil LIE AU POINT DE VUE : enfant de la camera, decale en haut a droite
    // du regard. En position monde fixe, la face opposee au soleil restait dans
    // la nuit et devenait illisible des qu'on l'amenait vers soi.
    // La camera doit etre ajoutee a la SCENE : les lumieres sont collectees en
    // parcourant le graphe de la scene (projectObject), pas via la camera de
    // rendu — un soleil parente a une camera hors-scene n'eclairerait rien.
    // La cible de la DirectionalLight reste son Object3D par defaut, jamais
    // ajoute a la scene : sa matrice monde vaut l'identite, donc le centre du
    // globe (three/src/lights/DirectionalLight.js:70).
    const sun = new DirectionalLight(0xfff3e0, 2.1)
    sun.position.set(2.5, 2, 3)
    camera.add(sun)
    scene.add(camera, new AmbientLight(0x4e6178, 0.55))

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.enablePan = false
    controls.rotateSpeed = 0.45
    controls.zoomSpeed = 0.7
    controls.minDistance = 1.35
    controls.maxDistance = 5
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.35
    controls.addEventListener('start', () => { controls.autoRotate = false })

    // --- pointage ---
    const raycaster = new Raycaster()
    const ndc = new Vector2()
    let pointerEvent = null   // dernier pointermove a traiter dans la boucle
    let downAt = null

    function hit(ev) {
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      return raycaster.intersectObject(globe, false)[0]?.uv ?? null
    }

    const onMove = (ev) => { pointerEvent = ev }
    const onDown = (ev) => { downAt = [ev.clientX, ev.clientY] }
    const onUp = (ev) => {
      if (!downAt) return
      const moved = Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1])
      downAt = null
      if (moved < 5) onPoint?.(hit(ev), ev, true)
    }
    const el3d = renderer.domElement
    el3d.addEventListener('pointermove', onMove)
    el3d.addEventListener('pointerdown', onDown)
    el3d.addEventListener('pointerup', onUp)
    const onLeave = () => { pointerEvent = null; onPoint?.(null, null, false) }
    el3d.addEventListener('pointerleave', onLeave)

    observer = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    observer.observe(el)

    function loop() {
      frame = requestAnimationFrame(loop)
      // Le raycast tourne au rythme du rendu, pas a celui des pointermove.
      if (pointerEvent) {
        onPoint?.(hit(pointerEvent), pointerEvent, false)
        pointerEvent = null
      }
      controls.update()
      renderer.render(scene, camera)
    }
    loop()

    detachPointer = () => {
      el3d.removeEventListener('pointermove', onMove)
      el3d.removeEventListener('pointerdown', onDown)
      el3d.removeEventListener('pointerup', onUp)
      el3d.removeEventListener('pointerleave', onLeave)
    }
  }

  // Plafond de texture du contexte REEL : 4096 sur beaucoup de GPU mobiles,
  // 16384 sur un ANGLE/D3D11 de bureau. Sert a choisir le millesime de texture.
  function maxTextureSize() {
    return renderer?.capabilities.maxTextureSize ?? 0
  }

  // Pose ou remplace la texture du globe. Le callback arrive apres coup : si la
  // page a ete quittee entre-temps, destroy() a deja vide `disposables` et la
  // texture ne serait jamais liberee — on la jette immediatement dans ce cas.
  // A la bascule de fond, l'ancienne texture sort de `disposables` avant d'etre
  // liberee, sinon destroy() la libererait une seconde fois.
  function setTexture(url, onReady) {
    new TextureLoader().load(url, (tex) => {
      if (!renderer || !globeMaterial) {
        tex.dispose()
        return
      }
      tex.colorSpace = SRGBColorSpace
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
      globeMaterial.map = tex
      globeMaterial.needsUpdate = true
      if (currentTex) {
        const i = disposables.indexOf(currentTex)
        if (i !== -1) disposables.splice(i, 1)
        currentTex.dispose()
      }
      currentTex = tex
      disposables.push(tex)
      onReady?.()
    })
  }

  function destroy() {
    cancelAnimationFrame(frame)
    detachPointer?.()
    observer?.disconnect()
    controls?.dispose()
    for (const d of disposables) d.dispose()
    disposables.length = 0
    renderer?.domElement.remove()
    // dispose() ne rend PAS le contexte WebGL (three 0.185.1, WebGLRenderer.js
    // l.1074 : c'est forceContextLoss qui appelle WEBGL_lose_context) et le
    // navigateur en plafonne le nombre. Aucune fuite observee sur 14 montages
    // successifs, mais la marge n'est pas garantie sur toutes les machines.
    renderer?.forceContextLoss()
    renderer?.dispose()
    renderer = null
    controls = null
    globeMaterial = null
    currentTex = null
  }

  return { create, destroy, setTexture, maxTextureSize }
}
