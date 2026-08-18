# Atlas of Ice and Fire — notes pour l'annotation de la carte Malazan

Source : https://atlasoficeandfireblog.wordpress.com/category/malazan-atlas/
Auteur des cartes : Adam Whitehead (avec D'rek et le Malazan Empire Forum).
Compile le 2026-08-17 depuis les 2 pages de la categorie (14 articles). Les resumes
region par region sont des synthese des pages listees — pour l'authoring fin d'une
region, re-consulter l'article correspondant (chaque article detaille villes,
regions internes et histoire).

## Nos fichiers sources et leur origine

| Fichier local | Article d'origine | Date |
|---|---|---|
| `genabackis/malazan-world-map-2025.png` (10000x5571) | Malazan Maps of the Fallen, Redux 01: The World | 2025-11-09 |
| `genabackis/world-of-the-malazan-empire.png` (10000x5571) | A New & Almost-Definitive Malazan World Map | 2020-03-04 |
| `frontend/public/img/malazan-world-map-2019.png` (6936x3864) | The New & Improved Malazan World Map | 2019-04-17 |

La 2025 est la base retenue (decision 2026-08-17). Elle ajoute par rapport a la
2020 : champs de glace Jaghut equatoriaux, mentions ICE polaires, « Unexplored
Polar Lands », et les acquis des livres recents (The God is Not Willing).

## Faits geographiques exploitables pour les couches

### Equateur
- Trace EN ROUGE sur la carte 2025, a mi-hauteur exactement (y = H/2 = 2785).
  Confirme que la carte se comporte comme une equirectangulaire centree —
  ce qui valide la projection sphere du globe 3D telle que codee.
- Quon Tali est equatoriale ; Seven Cities hemisphere nord, debordant vers
  le sud-ouest dans les regions equatoriales.

### Continents (tailles relatives, canon Redux 01)
1. Seven Cities — le plus grand continent du monde connu.
2. Lether — deuxieme plus grand, majoritairement « peu connu ».
3. Quon Tali — « un des plus petits », tres densement peuple.
- Autres : Genabackis (etroit, plusieurs milliers de milles N-S), Korelri,
  Stratem, Jacuruku (ile-continent, « true size uncertain » sur la carte),
  Assail (« relativement inexplore »), Genostel, Umryg, Cabal, Bael.
- Le monde est une sphere « de plusieurs milliers de lieues de circonference » ;
  aucune echelle chiffree officielle. Ne pas inventer de distances.

### Champs de glace Jaghut (candidats a une couche dediee ou a des POI)
Magie Omtose Phellack, guerre Jaghut-Imass. Positions (article Climate & Ice, 2019) :
- les plus grands : regions equatoriales, DE PART ET D'AUTRE de Jacuruku ;
- nord-ouest de Lether (cree par Gothos, « Gothos' ritual » sur la carte) ;
- entre Quon Tali et Falar (« The Ice Wastes » / Jaghut Ice Field sur la carte) ;
- sud de Korelri, vers Stratem ;
- sud et ouest de Seven Cities ; petits champs epars d'Assail a Genabackis.

### Anomalies climatiques (contexte pour popups/descriptions)
- Deserts a des latitudes anormalement nord : Bandiko et Otataral (ile Otataral),
  odhans arides de Seven Cities orientale.
- Deux causes canon : rituels Jaghut (guerre de centaines de milliers d'annees
  contre les Imass) ; statues de jade arrivees sur Otataral (origine du minerai
  otataral, climat regional transforme).
- Chute du Crippled God : il y a 110 000 ans.

### Oceans et mers (checklist pour completer seas.geojson)
Deja sur notre carte ou a verifier : Meningalle Ocean / Seeker's Deep, Dryjna,
Reacher's, Bloodmare, Horn, White Spires (Explorer's Sea), Rivan, Rust, Ilbain,
Domain, Ts'rin, Umros Nyethen, The Seven Hundred, Sea of Storms, Sea of Chimes,
Sea of Glass (rumoured), Sea of Hate, Catal Sea, Dracons Sea, Bluerose Sea,
Pelasiar Sea, Galatan Sweep.

### Fiabilite (a refleter dans un champ `status` des properties ?)
- « Largement canonique » SAUF : Stratem (taille/forme incertaines).
- Issues du croquis Erikson des annees 1980, peu detaillees : ouest de Seven
  Cities, Genostel, Umryg, Bael, Lether central.
- Korel : la region qui a le plus change entre le croquis original et les
  cartes publiees dans Stonewielder.

## Articles region par region (a re-consulter pendant l'authoring)

| # | Region | URL | A en tirer |
|---|---|---|---|
| 01 | Le monde (2017) | .../2017/12/08/malazan-maps-of-the-fallen-01-the-world/ | vue d'ensemble historique |
| 02 | Quon Tali + Falar | .../2017/12/11/malazan-maps-of-the-fallen-02-quon-tali/ | regions O/E, Great Fenn Range, iles Kartool/Napan/Geni/Malaz, histoire Empire |
| 03 | Seven Cities | .../2017/12/26/malazan-maps-of-the-fallen-03-seven-cities/ | sous-regions (Otataral, Jhag Odhan, Nemil, Perish, Shal-Morzinn, Cabal), Premier Empire |
| 04 | Genabackis | .../2018/03/04/malazan-maps-of-the-fallen-04-genabackis/ | divisions NO/NE/O/centre/SE, Darujhistan, invasions malazanes |
| 05 | Lether | .../2018/05/20/malazan-maps-of-the-fallen-05-lether/ | empire mercantile, terres Tiste Edur, Kolanse |
| 06 | Korelri & Stratem | .../2018/05/26/malazan-maps-of-the-fallen-06-korelri-stratem/ | iles Korel/Fist/Theft, Stratem sauvage |
| 07 | Jacuruku | .../2018/07/28/malazan-maps-of-the-fallen-07-jacuruku/ | Royaume des Thaumaturges, jungle de Himatan |
| 08 | Assail | .../2018/07/29/malazan-maps-of-the-fallen-08-assail/ | cotes inhospitalieres, sous-continent Bael |
| — | Malyn (NO Genabackis) | .../2021/07/02/a-malazan-bonus-map-for-the-god-is-not-willing/ | carte bonus haute-res, candidate carte annexe |
| — | Climate & Ice | .../2019/04/17/malazan-maps-of-the-fallen-climate-ice/ | champs de glace, climat |
| — | Redux (intro) | .../2025/11/07/malazan-maps-of-the-fallen-redux/ | demarche de la refonte 2025 |
| — | Redux 01 The World | .../2025/11/09/malazan-maps-of-the-fallen-redux-01-the-world/ | NOTRE BASE — descriptions continent par continent |

La serie Redux (2025-) est en cours : surveiller la categorie pour les Redux 02+
(cartes continentales refaites = meilleures sources pour nos cartes annexes que
les .webp actuels de `public/img/`).

## Attribution
Cartes fan-made d'Adam Whitehead, basees sur les romans de Steven Erikson et
Ian C. Esslemont et les cartes originales d'Erikson (annees 1980), remerciements
D'rek et Malazan Empire Forum. Pas de licence explicite publiee — l'attribution
est due. Le cartouche est conserve sur la carte plate ; il est efface de la
texture du globe (il s'enroulait autour du pole nord) : une ligne de credit UI
sur la vue globe reste a trancher (voir plan, decision D3).
