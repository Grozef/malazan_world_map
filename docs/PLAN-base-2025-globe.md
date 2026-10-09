# PLAN — base 2025 tuilee, globe en accueil, lumiere liee a la camera

> ETAT : APPLIQUE le 2026-08-17 (chantiers A a E), non commite. Verifie par
> captures Edge/playwright sur serveur de dev ET sur dist/ servi en sous-dossier.
> Ecarts et surprises consignes en fin de document, section « Retour d'execution ».
> Decision D3 (ligne de credit sur le globe) TOUJOURS OUVERTE.

Redige le 2026-08-17 pour execution par Opus/Sonnet. Contexte charge depuis la
session du meme jour. Regles de travail : CLAUDE.md global (never-assume, nomme
l'artefact, changements chirurgicaux). Ne rien commiter sans demande explicite.

## 0. Etat au moment du plan (verifie ce jour)

- Livre ce jour, NON COMMITE (git status : 9 modifies + 5 nouveaux) : route
  `#/globe` three.js 0.185.1 (chunk lazy 539 Ko), `useGlobe.js`, `GlobeCanvas.vue`,
  `GlobePage.vue`, `tools/globe-texture.mjs`, texture `decor/globe-texture.webp`
  4096x2048 batie sur la carte 2019.
- Nouvelle base fournie par l'utilisateur : `genabackis/malazan-world-map-2025.png`
  10000x5571 (ratio 1.795, identique a la 2019 6936x3864 ; ocean rgb 196,223,255
  echantillonne en (3000,200) et (200,3000)). `world-of-the-malazan-empire.png`
  = millesime 2020 de la meme carte, ON N'Y TOUCHE PAS.
- Cadrage 2019 vs 2025 quasi identique (Quon Tali centre a 0.50 de largeur sur
  les deux, Lether a ~0.085) : un recalage mecanique unique x(10000/6936) des
  coordonnees existantes est pertinent.
- La carte 2025 porte : cartouche de titre en haut-gauche (~x 60-1430, y 50-1030),
  trait d'equateur ROUGE a y = H/2, mention EQUATOR en bord gauche.
- Suite de tests : `cd frontend && npx vitest run` -> 15/15 au moment du plan.
  Aucun CI (recherche recursive *.yml hors node_modules : zero fichier).

## Decisions utilisateur actees (ne pas re-demander)

- D1 : la carte-monde passe en TUILES (reponse utilisateur : meilleure option
  pour le chantier futur des textures, cartes annexes comprises).
- D2 : sur la texture du globe, effacer le CARTOUCHE SEULEMENT ; l'equateur
  rouge reste (annotation legitime sur une sphere).
- D3 (OUVERTE, demander en fin de chantier) : ligne de credit « Map by Adam
  Whitehead » sur la vue globe, oui/non.
- D4 : la vue d'accueil `#/` devient le GLOBE ; la carte plate passe sur
  `#/carte`. Le picker passe donc a `#/carte?pick=1`.
- D5 : lumiere du globe LIEE AU POINT DE VUE (l'actuelle est fixe monde, la
  moitie du globe est illisible).
- D6 : localisations fines et cartes annexes = second temps (2 items poses dans
  le TODO vault le 2026-08-17). Le recalage mecanique fait partie de CE chantier.

## Chantier A — lumiere liee a la camera (`useGlobe.js`)

Etat : `DirectionalLight` positionne en (4, 1.6, 3) MONDE, ajoute a la scene.
Cible : le soleil devient ENFANT DE LA CAMERA avec un decalage fixe en espace
camera (haut-droite du regard), pour un eclairage type « lampe frontale
decalee » : terminateur visible sur le limbe, jamais de face sombre.

- `scene.add(camera)` (OBLIGATOIRE : sans ca les enfants de la camera ne sont
  pas rendus dans le graphe), puis `camera.add(sun)` et
  `sun.position.set(2.5, 2, 3)` (espace camera). Supprimer le positionnement
  monde. `AmbientLight` inchangee (elle garantit la lisibilite minimale).
- PIEGE a verifier dans la source (never-assume) : `DirectionalLight` eclaire
  DE sa position monde VERS `light.target`, un `Object3D` a l'origine qui n'est
  PAS dans la scene par defaut — son `matrixWorld` reste identite, donc la cible
  est bien le centre du globe sans rien ajouter. Lire
  `node_modules/three/src/lights/DirectionalLight.js` pour le confirmer avant
  de coder ; si la version differe, ajouter `scene.add(sun.target)`.
- Artefact de validation : 2 captures du MEME etat apres deux drags opposes
  (~180 deg) — la face ECLAIREE doit suivre le point de vue ; aucun des deux
  cliches ne doit montrer une face majoritairement sombre.

## Chantier B — pyramide de tuiles 2025 + bascule Leaflet

### B1. Reecrire `tools/tile.mjs` (il est perime : source 2019, chemins morts)

Parametres : SRC = `genabackis/malazan-world-map-2025.png`, OUT =
`frontend/public/tiles`, TILE = 256, sortie WEBP q80 (PNG = ~4x plus lourd),
chemins ancres sur ROOT comme dans `relief.mjs`/`globe-texture.mjs`.

MATH IMPOSEE PAR CRS.Simple — le decoupage actuel (haut-gauche) est FAUX ici :
- Verifier d'abord dans `node_modules/leaflet/src/geo/crs/CRS.Simple.js` :
  transformation `(1, 0, -1, 0)`, donc px = lng * 2^z et py = -lat * 2^z.
- Notre monde vit en lat [0..H], lng [0..W] (origine BAS-gauche, cf coords.js),
  donc py est NEGATIF : py dans [-H*2^z, 0]. Les indices de tuiles Y sont
  NEGATIFS : ty dans {-rows .. -1} avec rows = ceil(zh/256).
- Il faut donc decouper ALIGNE SUR LE BAS de l'image : la tuile ty couvre
  y_scaled dans [ty*256 + zh, (ty+1)*256 + zh) ; la tuile la plus haute se
  complete par du transparent EN HAUT (pad top = 256 - hauteur restante).
  En X : decoupage standard depuis la gauche, pad droite, tx dans {0..cols-1}.
- Niveaux : maxZoom pyramide = ceil(log2(10000/256)) = 6. Nommer les dossiers
  avec le zoom LEAFLET z = zt - 6, soit {-6..0} (des noms de dossiers negatifs
  sont valides partout). Zero `zoomOffset` cote Leaflet.
- Arrondi : zw = round(W*2^z), zh = round(H*2^z) -> desalignement possible de
  0.5 px aux coutures par niveau, invisible, accepte.
- Volume attendu : ~1184 tuiles (880 + 220 + 60 + 15 + 6 + 2 + 1). Constater le
  poids reel du dossier et le REPORTER (estimation 6-15 Mo ; si > 20 Mo,
  redescendre la qualite webp a 75 et re-mesurer).

### B2. Cote app

- `constants/layers.js` : WORLD devient
  `{ W: 10000, H: 5571, tiles: { url: 'tiles/{z}/{x}/{y}.webp', maxNative: 0, minNative: -6 } }`.
  Le champ `image` disparait. GLOBE.padX se recalcule tout seul
  ((2*5571 - 10000)/2 = 571) — y verifier la valeur en test.
- `MapCanvas.vue` : nouvelle prop `tiles` (Object, default null). Si presente :
  `L.tileLayer(assetUrl-prefixe + tiles.url, { tileSize: 256, bounds,
  noWrap: true, minNativeZoom: tiles.minNative, maxNativeZoom: tiles.maxNative })`
  au lieu de l'imageOverlay ; `imageUrl` passe en non-required (les pages region
  continuent en imageOverlay, NE PAS les toucher).
- `WorldPage.vue` : passe `:tiles="WORLD.tiles"`, `min-zoom="-5"`, `max-zoom="1"`
  (au-dela de 0 = upscale par maxNativeZoom, equivalent de l'ancien zoom 2).
- `theme.css` : le masquage des labels mers vise le zoom minimal ; passer le
  selecteur a `[data-zoom="-5"], [data-zoom="-4"]`.
- Parchemin + relief : ces calques sont des masques 6936x3864 ALIGNES SUR LA
  2019 — sur la 2025 ils seraient faux ET la 2025 peint deja terrain/relief.
  WorldPage cesse de les passer ; retirer les 2 toggles de `LayersPanel.vue` et
  les 2 champs `parchmentVisible`/`reliefVisible` du store (orphelins crees par
  la bascule). GARDER les props de MapCanvas (API generique) et les fichiers de
  `public/decor/` (0.9 Mo) + `relief.mjs` : SIGNALER leur obsolescence dans le
  rapport final, la suppression est une decision utilisateur.
- `public/img/malazan-world-map-2019.png` (1.76 Mo) n'est plus reference par le
  runtime une fois les tuiles en place : NE PAS supprimer (relief.mjs la lit
  encore), mais SIGNALER qu'elle part dans chaque build dist tant qu'elle est
  sous public/.

## Chantier C — texture globe depuis la 2025

`tools/globe-texture.mjs` : SRC -> `genabackis/malazan-world-map-2025.png` ;
TITLE_BOX -> `{ left: 0, top: 0, width: 1500, height: 1080 }` (cartouche 2025
mesure ~60-1430 x 50-1030 ; l'ocean 196,223,255 est inchange, deja verifie).
L'equateur rouge RESTE (D2). Pad calcule = 571/cote. Sortie 4096x2048 par
defaut ; option `--size=8192` existante, NE PAS l'activer d'office (plafond
texture GPU mobile courant = 4096, et le globe devient la vue d'ACCUEIL).

PIEGE DEJA PAYE 2 FOIS (meta/learnings 2026-08-17) : l'ordre des operations
d'un pipeline sharp est FIGE (resize AVANT extend, composite APRES les deux),
peu importe l'ordre d'ecriture. Le script actuel enchaine deja TROIS passes
bufferisees (composite -> extend -> resize) : CONSERVER cette structure.
Artefact : crop du coin haut-gauche de la texture regeneree (cartouche absent,

### Calottes polaires (2026-09-07)

La carte couvrait les 180 deg de colatitude de la texture : ses pixels de bord
etaient donc etires jusqu'au pole, ou la circonference tend vers zero. Le script
cale desormais la carte entre `--calotte` et `180 - --calotte` degres (defaut 5)
et remplit les deux bandes restantes d'un aplat.

L'aplat n'est PAS une constante : c'est la MOYENNE de la ligne de carte qui touche
la bande. Un bleu ocean en dur serait faux au sud, ou le bord de carte est une
banquise blanche — mesure : nord rgb(196,223,255), sud rgb(255,255,255).

PIEGE PAYE UNE 3e FOIS ici : deux `.extend()` chaines dans le MEME pipeline ne
s'empilent pas, sharp n'en applique qu'un. La texture est alors sortie en
4096x1991 au lieu de 4096x2048, donc hors ratio 2:1 — invisible sans mesurer la
hauteur. Correctif conforme a la regle ci-dessus : DEUX passes bufferisees, sud
puis nord.

PIEGE N.2, CELUI QUI COMPTE : `resize(w, h)` de sharp utilise `fit: 'cover'` par
defaut — il preserve le ratio et ROGNE pour remplir la boite. La carte etait donc
AMPUTEE de ses 5 degres de bord au lieu d'etre comprimee dedans. Il faut
`{ fit: 'fill' }` explicitement. Ce defaut est indetectable sur une source dont
les bords sont uniformes : la texture 2020 sortait byte-identique a la version
sans calotte, et la mesure d'uniformite des bandes passait au vert sur un fichier
non regenere.

Artefacts de controle, les deux sont necessaires :
1. uniformite : CHAQUE pixel des deux bandes sur les 4 textures (2025/2020 x
   4096/8192) -> ecart max 0 a la couleur d'aplat, 233 472 et 933 888 px par
   bande, ratio 2.000 ;
2. COMPRESSION et non rognage : la premiere ligne de contenu doit se DEPLACER de
   `y` a `bande + y * bandeH / H`. Mesure 2020 : 149 -> 200 (attendu 198) en
   4096, 303 -> 400 (attendu 400) en 8192. Sans ce second controle, le rognage
   passe.
Plus un rendu azimutal par pole via `_calotte.mjs`.

pas de residu « ALLEN ») + crop vers y=1024 montrant l'equateur present.

## Chantier D — le globe devient l'accueil

- `router/index.js` : `/` -> GlobePage (garder `component: () => import(...)`,
  le code-split reste utile aux deep-links region), `name: 'globe'` ;
  `/carte` -> WorldPage, `name: 'world'` INCHANGE (references existantes :
  RegionPage.vue:32 backbtn, GlobePage.vue onglet « Carte plate »). Aucun autre
  usage de route nommee (verifier par grep `name: '` et `{ name:` avant de
  conclure).
- Consequences a verifier : deep-link `#/region/genabackis` intact ; `#/?pick=1`
  ne pointe plus sur la carte plate -> verifier picker sur `#/carte?pick=1` ;
  mettre a jour l'item TODO vault si le libelle picker y est errone (deja fait
  le 2026-08-17, controler seulement).

## Chantier E — recalage mecanique des 7 geojson

Script one-shot (scratchpad, pas dans tools/) : pour chaque fichier de
`frontend/public/data/*.geojson` (7 fichiers : battles, borders, cities, poi,
regions, routes, seas), multiplier TOUTES les coordonnees geometriques par
10000/6936 (= 1.4417...), arrondir a l'entier. NE TOUCHER QUE `coordinates`
(les properties portent width/height des images de detail et des fontScale —
inchanges). Mettre a jour la note d'en-tete de regions.geojson (« carte
6936x3864 » -> 10000x5571).
Artefact : capture de la carte plate avec zones regionales en survol — les 5
rectangles doivent tomber sur leurs continents (precision parfaite NON exigee,
c'est l'item TODO d'authoring qui l'apportera) ; verifier notamment Darujhistan
attendu vers (6925, 1714) sur la 2025.

## Ordre d'execution et dependances

1. B1 (tuiles, ~1-3 min de generation — lancer tot, en tache de fond).
2. C (texture globe) puis A (lumiere) — independants de B.
3. B2 (bascule Leaflet) quand les tuiles existent.
4. E (recalage geojson).
5. D (routes) en dernier (les verifs precedentes utilisent les URLs actuelles).
6. Verification complete + build + rapport.

## Protocole de verification (artefacts EXIGES, pas de « ca marche » sans eux)

Outillage : `npm i playwright-core` dans le scratchpad de session, lancement
Edge via `chromium.launch({ channel: 'msedge' })`. Pattern de capture :
goto -> waitForTimeout(3-4s) -> screenshot + collecte console
(`page.on('console'/'pageerror'/'requestfailed')`). PIEGE PAYE :
`locator.textContent()` sur un element ABSENT attend 30 s — lire le DOM via
`page.evaluate(() => document.querySelector(sel)?.textContent ?? null)`.

Checklist minimale (chaque ligne = une capture ou une sortie lue) :
1. `npx vitest run` vert (adapter les specs coords si GLOBE.padX teste 396 -> 571).
2. Dev : `#/` = globe 2025 SANS cartouche au pole nord, AVEC equateur ; drags
   opposes -> face eclairee suit la camera (2 captures, chantier A).
3. `#/carte` : tuiles nettes a zoom 0 (capture zoomee sur Darujhistan), pas de
   damier manquant (console : zero requete tuile en echec), labels mers masques
   a -5/-4, zones regionales a peu pres en place (chantier E).
4. Clic continent sur le globe -> page region (capture apres clic).
5. Survol/clic AU TRAVERS des 14 allers-retours globe/carte : console vide
   (les scripts remount/race de la session du 17/08 documentent le pattern).
6. Build : `npm run build` ; verifier que `dist/tiles/` est complet (compter
   les fichiers = compte genere) ; servir dist/ en SOUS-DOSSIER via
   `php -S localhost:8099 -t <docroot>` avec l'app sous `/carte/` et rejouer
   les points 2-4 en URL de prod. Peser dist/ et REPORTER le total.
7. Rapporter les [NO-VERIFY] restants (attendus : tactile reel, Apache Laragon).

## Pieges connus (payes cette session, ne pas re-explorer)

- sharp : ordre de pipeline fige — passes bufferisees obligatoires des que 2
  operations changent les dimensions (cf meta/learnings 2026-08-17).
- Fresnel du halo sur coque BackSide : la formule usuelle `1 - abs(dot)` est
  INVERSEE dans cette geometrie ; l'actuelle `pow(abs(dot), 1.8) * 1.9` sur
  coque 1.18R est calibree par captures — ne pas y toucher sans re-capturer.
- `TextureLoader.load` : le callback survit au demontage de la vue ; la garde
  `if (!renderer) { tex.dispose(); return }` existe, la preserver.
- `forceContextLoss()` avant `renderer.dispose()` dans destroy() : dispose seul
  ne rend pas le contexte WebGL (three 0.185.1 WebGLRenderer.js l.1074 vs l.595).
- Leaflet : instances HORS reactivite Vue (closures), regle du projet.
- vitest : les constantes des specs coords sont des litteraux de test — ceux
  qui encodent GLOBE/WORLD (GW=7728, PAD=396) doivent suivre la nouvelle base,
  les tests de px/unpx purs peuvent garder leurs valeurs.

## Retour d'execution (2026-08-17)

Conforme au plan sur les 5 chantiers. Ce que le plan n'avait pas prevu :

- `GridLayer.options.minZoom` vaut 0 PAR DEFAUT (leaflet GridLayer.js:113) et
  `_setView` (l.554) annule alors le niveau de tuile a tout zoom negatif : sans
  `minZoom` explicite sur la couche, elle n'affiche RIEN. Le plan ne citait que
  minNativeZoom/maxNativeZoom. Les deux sont passes desormais.
- La lumiere liee a la camera exige `scene.add(camera)` : les lumieres sont
  collectees en parcourant la scene, pas via la camera de rendu. Confirme, et la
  cible par defaut de la DirectionalLight reste bien le centre du globe.
- Volumes reels : 1184 tuiles pour 2,8 Mo (le plan estimait 6-15 Mo) ; dist total
  11,2 Mo. Le niveau de zoom natif 0 pese a lui seul 880 tuiles.
- Recalage geojson : 50 positions sur 7 fichiers, mise en forme manuelle
  preservee (reecriture ligne a ligne + reparsing de controle). Darujhistan
  tombe bien en (6925, 1714) comme prevu.
- Pieges d'outillage de verification, sans rapport avec l'app : `php -S` est
  mono-processus sous Windows et lache des connexions des que Leaflet tire 40
  tuiles en parallele (zero echec sur un serveur concurrent) ; et le port 8100
  etait deja pris par un autre projet, double binding IPv4/IPv6, `localhost`
  resolvant vers le mauvais serveur — verifier le port AVANT de conclure.

Signale, non traite (decisions utilisateur) :

- La carte 2025 imprime deja ses propres noms d'oceans et de mers : la couche
  `seas` (3 labels Cinzel) fait desormais DOUBLON par-dessus. A supprimer ou a
  reaffecter.
- Poids mort dans dist/ : `img/malazan-world-map-2019.png` (1,76 Mo) et les
  masques `decor/land-parchment.webp` + `relief-shade.webp` + `land-mask.png`
  (1,14 Mo) ne sont plus servis par aucune page, soit ~2,9 Mo des 11,2 Mo.
  `tools/relief.mjs` lit encore la 2019 et le masque.
- Le bouton retour de RegionPage ramene a la carte plate meme quand on vient du
  globe.

## Hors perimetre de ce plan (TODO vault, second temps)

- Authoring fin des localisations au picker (`#/carte?pick=1`) et enrichissement
  des couches (villes, mers — checklist dans `docs/malazan-atlas-notes.md`).
- Cartes annexes en tuiles (meme pipeline, un dossier `tiles/<region>/` par
  carte) et remplacement eventuel des .webp par les cartes Redux 02+ a venir.
- Couche « champs de glace Jaghut » (candidate, cf notes atlas).
- Suppression des assets 2019 obsoletes (decision utilisateur apres bascule).
