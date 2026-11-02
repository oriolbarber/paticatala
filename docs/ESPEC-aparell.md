# Especificació de l'aparell i el buc — mesurat sobre la làmina

Totes les xifres surten de la **làmina de nomenclatura del patí** (el plànol amb el
perfil i els noms de cada peça). Es van mesurar sobre la imatge prenent com a
referència l'eslora (521 px al plànol) i la línia de coberta (y = 660 px), i
viuen al codi en una sola constant, `RIG`, que comparteixen les **tres vistes**.

## Per què una sola font

Abans cada vista portava les seves mides: el pal feia **1,15 eslores** a la vista
en perspectiva i **1,00** a la zenital. El mateix patí es veia diferent segons la
càmera. Ara totes dues criden `aparell()`, que retorna els punts en coordenades
del patí (`bx` través · `by` proa-popa · `z` alçada sobre la flotació).

| magnitud (fraccions d'eslora) | làmina | codi |
|---|---|---|
| estació del pal, des del centre | −0,312 | −0,312 |
| alçada del pal sobre la coberta | 1,186 | 1,190 |
| caiguda del cap cap a popa | 0,219 (11,5°) | 0,232 (11,0°) |
| alçada del puny d'amura | 0,115 | 0,115 |
| alçada del puny d'escota | 0,246 | 0,246 |
| pujament (amura → escota) | 0,581 | 0,620 \* |
| barra escotera: potes | 0,452 | 0,450 |
| barra escotera: avanç al centre | 0,086 | 0,015 † |
| barra escotera: alçada de l'arc | 0,123 | 0,021 † |
| barra escotera: mitja amplada | — | 0,155 |

\* El pujament es queda a 0,620 perquè és el valor **calibrat** de la física
(vegeu més avall). La diferència són 22 cm: no es nota.

† L'arc de la barra surt de la **foto** de la barra real, no de la làmina: la
fletxa és d'un 8% de la llum. Amb els valors de la làmina feia un pont del 45%.

## Decisions preses

- **El pal va caigut de sèrie.** A la làmina el pal cau 11,5° cap a popa. Abans
  es dibuixava vertical i les mordasses el movien ±8,6° al voltant de la
  vertical. Ara el neutre JA és la caiguda de sèrie i les mordasses hi juguen al
  voltant (de 2,5° a 19,5°). El HUD mostra la caiguda **total** respecte de la
  vertical, que és com es mesura de debò; amb el control al mig marca 11°.
  La física no canvia: `S.rake` continua valent 0 al neutre.
- **La zenital escurça l'alçada un 16%** (`RIG.escorcZen = 0.84`). A la vista
  zenital l'alçada es projecta cap amunt de la pantalla (2,5D); amb l'alçada
  real la vela tapava mitja coberta i la vista deixava de servir per governar.
  L'escorç està declarat i documentat, no amagat en una constant de dibuix.
- **La barra escotera és un arc suau.** Al centre puja 0,021 eslores i avança
  0,015 (14 cm de fletxa en 1,74 m de llum). La biestabilitat de la politja la
  dona la física (`BAR_ARCH`), que no depèn d'aquest dibuix.
- **La politja surt dels mateixos punts que la barra.** `aparell()` dona
  `barraX/Y/Z` i `carroU()`, i les tres vistes en depenen. A les zenitals la
  barra s'aixeca amb el mateix escorç que la politja (`escorcZenital()`). El
  carro d'acer es dibuixa a les tres vistes i s'atura als topalls, un 7% abans
  de les plaques. Ho vigila `proves/politja.mjs`, en píxels reals.
- **No hi ha estai de popa.** El patí no en porta: la baluma hi va lliure. El
  codi en dibuixava un. S'ha tret i s'han posat els tres ancoratges reals:
  estai de proa (−0,490), obenc mitjà (−0,312, a l'estació del pal) i obenc de
  popa (−0,197).
- **La vela.** Baluma lleugerament **còncava** (0,016 d'eslora), no bombada;
  sis **panys** del gràtil a la baluma; **finestra** transparent arran del
  pujament; **reforç** al puny d'escota; **catavents** al gràtil que van
  estirats amb la vela plena i ballen quan flameja (amb la mateixa fase que el
  drap, perquè no vagin pel seu compte).
- **Rocaia del buc.** El fons ja no és una planxa horitzontal: segueix el perfil
  mesurat (entrada fina a proa, panxa de 0,30 a 0,88 de l'eslora, i popa que
  torna a pujar fins al 0,60 del calat).
- **La cua d'ànec**, la peça del peu del pal on va lligat el puny d'amura, es
  dibuixa a les tres vistes.
- **L'escota fa el retorn per la bancada central.** No va del puny d'escota a
  la mà: de la vela baixa a la politja que corre per la barra escotera de popa
  (0,371 eslores), d'allà **torna cap endavant** a una politja damunt la
  **bancada 3** (0,092 eslores, 8 cm sobre la coberta) i d'aquí puja a la mà.
  És el que es veu a la foto del patí i és el que dona la desmultiplicació.
  Es dibuixen les **dues** politges.
- **Les cinc bancades viuen al `RIG`** (`bancA`, `bancB`, `bancF`, `bancTh`).
  Abans els mateixos números estaven escrits dos cops, un a la perspectiva
  (`BAN3`) i un a la zenital (`BANCADES`): la mateixa trampa que havia fet que
  el pal mesurés 1,15 eslores en una vista i 1,00 en l'altra. Estacions:
  −0,275 · −0,099 · **0,092** · 0,261 · 0,430.

## El que NO s'ha tocat: la física

`sailGeoLimit()` converteix la posició de l'escota en angle de vela i fa servir
la seva pròpia geometria (pujament 0,62 · amura a −0,275 · barra a 0,47 amb
0,035 d'avanç). Són valors **calibrats contra temps de maniobra reals**, no
mides de plànol. Es va provar d'alinear-los amb la làmina i amb l'arc nou:

| | desviació de l'angle de vela |
|---|---|
| només amb la barra nova | fins a 5,0° |
| reajustant la llargada d'escota | 1,5° |
| afegint-hi l'alçada (càlcul en 3D) | 3,4° de mitjana, i caçat del tot la vela es tancava a 0° |

Qualsevol de les tres hauria obligat a recalibrar tota la física. S'ha deixat
congelada i marcada amb un avís al codi. L'únic que comparteixen dibuix i física
és `S.boomDir`: l'angle que es veu **és** l'angle físic.

Comprovat després del canvi (xifres idèntiques a abans):

| | abans | ara |
|---|---|---|
| empopada: deriva · canvis de banda · velocitat | 0° · 0 · 6,5 kn | 0° · 0 · 6,5 kn |
| virada: la vela passa de banda | 7,4 s | 7,4 s |
| trasluixada | 8,7 s | 8,7 s |
| gir aturat amb el pes a popa | 11,5 °/s | 11,5 °/s |
| gir navegant a 6 kn | 10 °/s | 10 °/s |

## Proves

- `proves/aparell.js` — compara `aparell()` amb la làmina, comprova la rocaia i
  verifica que les tres vistes dibuixen el mateix pal i la mateixa barra.
  També vigila que cap vista es torni a inventar l'alçada del pal.
- `proves/fisica.js` — la bateria de regressió de física.
- `proves/interficie.mjs` — obre el simulador amb Chromium i fa servir tots els
  controls buscant errors de JavaScript.
- `proves/foto.mjs` — captures reals del llenç a les tres vistes, per mirar-les.
