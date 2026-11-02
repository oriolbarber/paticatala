# Estat del simulador — traspàs tècnic

Document de traspàs per a qualsevol sessió futura. Descriu com està fet el simulador ara
mateix, amb les xifres i les decisions que cal respectar.

> L'aparell i el buc tenen el seu propi document: **`ESPEC-aparell.md`**, amb les mides
> preses de la làmina de nomenclatura i les decisions de dibuix.

---

## Els dos lliurables

| fitxer | què és |
|---|---|
| `pati_vela_simulador_v6.html` | Un sol fitxer autònom (~440 KB). Icones **i tipografies** incrustats en base64. Funciona sense connexió i **sense cap recurs extern**: ho comprova `proves/tipografies.mjs`. |
| `pati-vela-app-PWA.zip` | Mateix codi + `manifest.json` + `service-worker.js` + icones + botó d'instal·lació. Per instal·lar a tauleta o mòbil. |

Tots dos surten del **mateix** fitxer de desenvolupament, `pati_vela_mobil.html`, i els
reconstrueix `build.py` (que comprova que el JavaScript sigui idèntic als dos). Cada
lliurament reconstrueix els dos. En canviar el joc cal **pujar el número de la memòria cau**
del `service-worker.js` (`pati-vela-v2`, `v3`…) o els mòbils ja instal·lats es quedaran la
versió vella.

---

## Escala del món

Constant única: **L = eslora del patí = 5,6 m**. `M = L/5,6` = unitats de món per metre.

| element | mida real |
|---|---|
| patí | 5,6 m d'eslora |
| bancades | cinc, a −0,275 · −0,099 · 0,092 · 0,261 · 0,430 eslores (al `RIG`) |
| pal | 1,19 eslores sobre la coberta (≈ 6,6 m), caigut 11° cap a popa |
| canal de sortida | 8,6 eslores ≈ 48 m |
| cases del poble | 10-24 m, algun bloc de 24 m |
| campanar | 32 m |
| turons propers | 1,3 km de distància, 95-165 m d'alçada |
| serralada del fons | 2,9 km, 175-305 m |
| línia de sortida de regata | a 100 m de la costa |
| tram de barlovent | 9 eslores ≈ 50 m |

---

## Batimetria del Masnou

Perfil real, no lineal: **1,3 m als 10 m** de la costa (el primer esglaó és marcat), 3,3 m
als 70 m, 4,2 m als 100 m, 6,8 m als 250 m, 8,5 m als 400 m.

- **Primera barra de sorra** cap als 70 m (±20 m cada partida). Aixeca el fons de ~4 a ~2,5 m.
- **Segona barra**, més suau, cap als 250 m.
- Cap de les dues és recta: **ondulen** al llarg de la costa.
- Petits canals més fondos entre la barra i la platja.
- **Variació estacional**: cada partida nova mou les barres ±20 m i ±30 cm d'alçada.

La línia que separa els dos colors del mar la marca la barra, i per això no és recta.

---

## Capes del mar (en aquest ordre)

1. **Base** — un sol to, el color del mar obert. *No* pot ser un degradat d'una altra
   ambientació: si el tint de fondària hi va a sobre amb transparència, el color de base
   s'hi transparenta.
2. **Fondària** — franges **opaques** amb el color interpolat de la rampa. Es pinten **com un
   pintor**: primer la més llunyana i les properes al damunt, i cada franja **es tanca fins a
   la part baixa de la pantalla**. L'ordre es calcula amb la **distància a la càmera** (mai
   amb la posició a pantalla: salta i produeix parpelleig).
3. **Mar profund** — de l'última franja fins a l'horitzó, perquè una franja paral·lela a la
   costa acaba al punt de fuga i no cobreix tota la pantalla.
4. **Onades i escuma** — crestes, trencants, bombolles, rastre.
5. **Ratxes de vent** — clapes molt suaus (opacitat 0,016-0,038).
6. **Calitja de l'horitzó** — un vel prim i neutre.
7. **Camí del sol** — un reflex suau (opacitat 0,20).

La transparència de l'aigua **no** es fa amb alfa: es barreja color de sorra al to de
l'aigua allà on el fons es veu.

### Rampa de color (dos colors, com a la foto del Masnou)

| fondària | color |
|---|---|
| 0 m | rgb(122,206,205) |
| 2,4 m | rgb(104,196,200) |
| 3,2 m | rgb(92,188,196) |
| 4,6 m | rgb(38,118,168) |
| 9 m | rgb(28,96,150) |
| 40 m | rgb(16,62,116) |

El tram de la vora és gairebé d'un sol to (variació 28 de 0,5 a 3 m); el canvi a blau és net
(93 en 1,4 m de fondària); el mar de fora també és homogeni (variació 38 de 6 a 20 m).

---

## Capes del paisatge (marcades al codi)

`CAPA='cel'` → `'muntanyes'` → `'poble'` → `'platja'`, i després mar, boies, estela i patí.

| capa | color | notes |
|---|---|---|
| serralada del fons | rgb(159,168,191) | perspectiva aèria: més clara i blavosa |
| vel de calitja | rgba(226,220,225,.30) | entre les dues serralades |
| turons propers | rgb(109,124,102) | verds i més foscos |
| poble | rgb(207,198,192) | + línia de teulades terracota al perfil |
| platja | rgb(226,205,158) | |

Separació de color: 111 entre serralada i turons, 152 entre turons i poble.

---

## Onatge

Taula de fase acumulada calculada amb la relació de dispersió, compartida per les dues vistes.

- Període `T = 3,4 + vent(kn)·0,10` s; alçada en mar obert `H0 = 0,18 + vent·0,045` m.
- En apropar-se a la costa: **s'escurça** (32 → 17 m), **alenteix** (6,9 → 3,7 m/s),
  **creix** per shoaling, **s'empina** (H/h de 0,09 a 0,78) i **trenca**.
- L'alçada mai supera 0,78 × la fondària.
- Les crestes **van cap a terra**: la fase de cada cresta *decreix* amb el temps.
- Seqüència d'escuma: cresta blanca → bombolles irregulars → trencament → rastre que
  s'esvaeix.

---

## Física del patí

Coeficients **calibrats contra temps de maniobra reals**. No hi ha modes: una sola navegació.

| paràmetre | valor |
|---|---|
| autoritat del pes | `wfEff*1.15*crewF` |
| ajuda de l'escora | `heelHelm*0.30` |
| autoritat amb velocitat | `flow*(0.55 + 0.30*v/0.55)` |
| esmorteïment de gir | `1.60*grip + 4.4*v/0.9` |
| esmorteïment quadràtic | `1.9 + 10*(1-flow)*pesPopa` |
| límit de gir | 0,42 rad/s (≈24 °/s) |

**Comportaments que cal preservar** (els mesura `proves/fisica.js`):

- Virada: vela a l'altra banda i 30° de vent als 6,2 s; recupera 1,5 kn **a l'amura nova** als 9,8 s. (Abans es deia 7,4 s i 15 s: la recepta de la prova no sortia de la virada i tornava a l'amura inicial. La física és la mateixa.)
- Trasluixada: 8,7 s.
- Gir navegant a 6 kn: 10 °/s.
- Gir aturat amb el pes a popa: 11,5 °/s sostinguts (**mai més de 13**).
- Empopada amb el pes centrat: deriva 0°, cap canvi de banda involuntari, 6,5 kn de mitjana.

**El dibuix no toca la física.** `sailGeoLimit()` (escota → angle de vela) té la seva pròpia
geometria calibrada i porta un avís al codi. Alinear-la amb les mides del plànol movia
l'angle de vela fins a 5° i hauria obligat a recalibrar-ho tot: vegeu `ESPEC-aparell.md`.

**Peces de física que costen de reinventar:**

- **Penell (govern sense arrancada).** Aturat no hi ha flux als bucs, però la vela sí que rep
  vent: amb l'escota caçada la proa puja al vent, amb l'escota amollada cau. El pes a proa
  hi ajuda. Sense això és impossible iniciar una virada des de l'aturada.
- **Esmorteïment quadràtic lligat al pes a popa.** Amb el pes enrere i sense arrancada, les
  popes s'enfonsen i fan de pivot mullat: el patí no pot rodar sobre si mateix. En una
  virada, en canvi, el pes va a proa i el gir iniciat es completa.
- **Cul a la vela.** L'empenta és proporcional a com de a la contra queda la vela — la
  mateixa magnitud que decideix cap on s'infla — i al gest d'anar cap a popa.
- **Rescat de la fula.** No actua mentre orses a posta (pes a proa i escota caçada), perquè
  si no la proa rebota. El criteri per caure de proa és físic: aturat i amb la vela sense força.
- **Panxa de la vela.** El costat cap on s'infla el decideix la pressió del vent
  (`-signe(sin(t + botavara))`), no on és la botavara.

### Buc alçat (`aixecaBuc`, constants a `ESC`)

`S.roll` és l'escora real, la que es veu i la que bolca. `S.heel` **no** és un angle i
continua governant el gir i la deriva. El patí pivota sobre el buc de l'aigua: el moment del
vent (creix amb el quadrat del vent) lluita contra el pes del buc i del patró. Ho vigila
`proves/aixec.js`.

| posició del patró | vent mínim a través (72 kg) |
|---|---|
| sotavent | 7,5 kn |
| centre | 10 kn |
| barlovent | 12 kn |
| penjat | 13,5 kn |

- **Calibratge real de l'Oriol:** assegut a barlovent s'alça cap als 12 kn; a sotavent amb
  10 kn bolca de seguida (3,8 s). El moment teòric (14 m², 2,7 m) quedava curt i s'ha ajustat.
- **`ESC.descarrega` és delicada.** El parell adreçador baixa en escorar: sense aquest terme,
  tot buc alçat bolca. A 1,35 es navega amb el buc alçat i a sotavent bolca; a 1,45 ja no bolca.
- **`ESC.mesBuc` = 85 kg**, no els 62 de `BOAT_KG`: amb 62, un patró de 100 kg penjat alçava
  el buc de sotavent sense vent. El pes real del buc i la superfície vèlica estan per confirmar.
- La bolcada ja no depèn de `S.heel`: passa als 60° de `S.roll`.
- A les zenitals, `escoraZenital()` deforma el patí sencer: el buc de l'aigua no es mou i el de barlovent s'hi acosta i puja de pantalla. L'alçada s'exagera un 30% (`ESC.guanyZenital`), una exageració declarada com `RIG.escorcZen`. L'ombra (`ombraBucs()`) es dibuixa a part perquè es quedi a l'aigua: aquest buit és el que fa llegir l'alçada.

---

## Regates

Tres recorreguts, definits **sempre respecte del vent**:

| recorregut | boies | voltes |
|---|---|---|
| Bastó (barlovent-sotavent) | B1 a 9 eslores vent amunt + porta de sotavent | 2 |
| Triangle olímpic | B1, B2 (de través), B3 | 2 |
| Costaner | C1 i C2, paral·leles a la costa | 1 |
| Triangle equilàter | B1, B2, B3, cames de 463 m (0,25 NM), a 1 km | 1 |
| Triangle rectangle | B1, B2, B3, 463-327-327 m (45-90-45), a 1 km | 1 |

Els dos triangles són a mar obert i la seva posició no depèn del vent: només n'hi depèn
l'orientació. El patí surt directament a la línia, i la barra diu la distància i el rumb
fins a la boia següent.

- Línia de sortida amb vaixell del comitè i boia, a 100 m de la costa, 29 m de mitja amplada.
- El cronòmetre arrenca en creuar la línia.
- **Fantasma**: durant la primera volta es grava la trajectòria (~12 mostres/s: posició,
  rumb, banda i angle de la vela). A partir de la segona volta apareix el patí fantasma
  reproduint la millor volta. Es veu a les tres vistes i al mapa, i porta el mateix aparell
  que el patí del jugador.
- **Esquema del circuit** abans de començar: dibuix amb el vent a dalt, llegenda de boies i
  taula de trams amb el rumb de brúixola i el punt de vela de cada tram. Es reobre tocant la
  barra de la regata.
- El mapa emmarca automàticament tot el recorregut.

---

## Interfície

- Rosa dels vents a dalt a l'esquerra, sempre visible a totes les vistes.
- Botons a dalt a la dreta: càmera, zoom, reinici, menú.
- Escota a la dreta, pal a l'esquerra (minimitzat per defecte), joystick del pes a baix al
  centre (només en perspectiva).
- El control del pal mostra la caiguda **total** respecte de la vertical (11° al neutre).
- **Un sol pop-up obert alhora**. Dins de Regates hi ha «‹ MENÚ» per tornar enrere.
- Guia inicial amb etiquetes sobre cada control.
- Tres vistes: perspectiva, zenital de popa i zenital fixa (vista de la costa).
- **L'escota** va del puny a la barra escotera de popa, torna endavant a la politja de la
  bancada central i puja a la mà. Les tres vistes deixen un rastre amb nom (`ESCOTA_PATH`)
  perquè `proves/escota.js` pugui comprovar el recorregut sense endevinar quin traç és.
- **Botó de tornada** (`#btnTornar`). Només existeix si la URL porta `?tornar=...`; serveix
  per obrir el simulador des d'una altra app instal·lada (l'Ocata Vent) i poder-hi tornar,
  perquè dins d'una PWA no hi ha barra de navegador. Fa `history.back()` si hi ha historial
  i, si no, va a l'adreça de `tornar`. Està ancorat per JavaScript a `rosaPos()`
  (`cy + r + 38`) i empeny `#rakeBox` a `sota + 50`: a la fila de dalt no hi cabia sense
  trepitjar la rosa dels vents. Mesurat a 320, 390, 844 i 1280 px (`proves/tornar.mjs`).
  Com enllaçar-lo des de l'altra app: `claude/COM-ENLLACAR-DES-D-OCATA-VENT.md`.

---

## Coses que ja s'han provat i no funcionen

- **Estirar una il·lustració fotogràfica de la costa** per talls amb perspectiva. Es va
  arribar a fer tècnicament bé (mostreig per columnes de pantalla, subdivisió adaptativa,
  cobertura garantida, 0 escletxes i 0 escalons mesurats en 7 situacions) i visualment
  continuava sense funcionar. Revertit.
  *Alternativa no provada:* un fons prerenderitzat per rumb, que es desplaça horitzontalment
  sense deformar-se. No pot fer escalons, però perd la parallaxi en acostar-se a la platja.
- **Boles verdes com a arbres** al passeig: no agraden.
- **Fletxes de vent** dibuixades sobre l'aigua a la vista zenital: substituïdes per
  pinzellades.
- **Ombres de núvol** i **espurnes daurades** sobre l'aigua: restes d'una ambientació
  anterior que desentonaven amb el mar de dos colors.
- **Posar l'alçada real del pal a la vista zenital.** Amb 1,19 eslores projectades cap amunt
  de la pantalla, la vela tapa mitja coberta i la vista deixa de servir per governar. Es fa
  servir un escorç declarat del 16% (`RIG.escorcZen`).
- **Alinear la geometria de `sailGeoLimit()` amb el plànol.** Mou l'angle de vela fins a 5° i
  obliga a recalibrar tota la física. Es queda congelada.
- **Incrustar les tipografies senceres.** Els subsets llatins de Google pesen 136 KB (182 KB en
  base64): massa. Retallades als 190 caràcters que el programa pot escriure i amb l'Inter en
  versió variable limitada a 400-700, queden en 43 KB (58 KB en base64) **sense perdre cap
  glif** dels que l'app feia servir. Vigilar-ho si algun dia s'hi afegeixen símbols nous.
