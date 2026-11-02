# Enllaçar el simulador des de l'Ocata Vent

Objectiu: que des de l'app Ocata Vent s'obri el simulador **dins la mateixa
finestra**, sense que surti cap navegador, i que des del simulador es pugui
tornar a l'app.

## 1. Posa el fitxer dins el repo de l'Ocata Vent

Copia `pati_vela_simulador_v5.html` al repositori `oriolbarber/OcataVent` i
anomena'l **`simulador.html`**, **al mateix nivell que l'`index.html`**.

És un sol fitxer: no cal res més (ni icones, ni tipografies, ni manifest, ni
service worker propi; ho porta tot incrustat). Que estigui al mateix origen i
dins l'abast (`scope`) del manifest de l'Ocata Vent és justament el que fa que
l'enllaç s'obri dins l'app instal·lada i no llanci el navegador.

## 2. L'entrada al menú ⚙ de l'`index.html`

Al bloc `<div class="cfg-menu" id="cfgMenu" …>`, **just abans** del separador i
el botó d'«Ajuda i comentaris», afegeix-hi:

```html
  <div class="cfg-msep" role="separator"></div>
  <a role="menuitem" class="cfg-mi" style="text-decoration:none"
     href="./simulador.html?tornar=./&amp;nom=Ocata Vent">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 17.5h15l-2 3.5H6.5z"/><path d="M12 17.5V3"/><path d="M12.8 5.5 18.5 17.5h-5.7z"/></svg>Simulador de patí</a>
```

Queda entre «Compte / Privadesa» i «Ajuda i comentaris».

Tres detalls que fan que encaixi sense tocar res més:

- **És un `<a>`, no un `<button>`.** El `cfg.js` intercepta els clics amb
  `e.target.closest("[data-cfg],[data-back]")` i hi fa `preventDefault()`. Com
  que aquest ítem **no porta `data-cfg`**, el gestor no se l'empassa i el clic
  navega sol. Si algun dia li poses un `data-cfg`, deixarà de funcionar.
- **`style="text-decoration:none"`.** La regla `.cfg-mi` està escrita per a
  `<button>`, que no subratlla; un enllaç sí. És l'única diferència d'aspecte.
- **No cal tocar l'`app.css`.** Amb `*{box-sizing:border-box}` que ja hi ha,
  l'`<a>` agafa exactament la mateixa caixa que els altres ítems (mesurat:
  49,5 × 238,2 px al mòbil, igual que «Ajuda i comentaris»).

Els paràmetres de l'enllaç:

- `tornar=./` — on ha de tornar el botó si s'hi arriba sense historial.
- `nom=Ocata Vent` — el text del botó de tornada dins el simulador. En pantalla
  estreta només s'hi veu la fletxa `‹`, per no trepitjar la rosa dels vents.
- **Sense aquests paràmetres el botó de tornada no existeix**: la còpia d'aula i
  la PWA del simulador queden exactament igual que ara.

## 3. Perquè també funcioni sense connexió

Al `service-worker.js` de l'**Ocata Vent**, dues coses:

```js
const CACHE = 'ocatavent-v?';        // ← PUJA el número, o els mòbils ja
                                      //   instal·lats es quedaran la versió vella
const ASSETS = [
  './',
  './index.html',
  './simulador.html',                 // ← AFEGEIX-HI el simulador
  // …la resta
];
```

I al `fetch`, busca a la memòria cau **ignorant els paràmetres**:

```js
caches.match(e.request, { ignoreSearch: true })
```

Això últim és important i és fàcil que passi desapercebut: l'enllaç porta
`?tornar=./&nom=Ocata Vent`, i per a la memòria cau `simulador.html` i
`simulador.html?tornar=...` són **dues adreces diferents**. Sense
`ignoreSearch`, sense connexió el simulador no es trobaria.

## 4. Comprovat

`proves/menuocata.mjs` munta un banc amb el **marcatge, el CSS i el `cfg.js`
reals** de l'app (baixats del repo) i hi mesura l'ítem nou:

| | |
|---|---|
| mòbil (390), tauleta (820) i PC (1280): mateixa caixa, lletra, color i icona d'accent que la resta d'ítems | ✔ |
| sense subratllat d'enllaç; el menú no desborda la pantalla | ✔ |
| el clic obre el simulador (el `cfg.js` no se l'empassa) i es pot tornar enrere | ✔ |
| control: sense el canvi l'ítem no hi és | ✔ |

`proves/tornar.mjs` comprova la banda del simulador:

| | |
|---|---|
| sense `?tornar`, el botó no existeix | ✔ |
| mòbil petit (320), vertical (390), apaïsat (844) i PC (1280): el botó hi cap i no trepitja ni la rosa dels vents ni el control del pal | ✔ |
| des de l'app s'obre el simulador a la mateixa finestra | ✔ |
| el botó torna a l'app, sense obrir cap navegador | ✔ |

El botó fa `history.back()` si hi ha historial (l'app es recupera tal com
l'havies deixada) i, si no, se'n va a l'adreça de `tornar`.

## 5. Dos detalls de pas

**La fila de botons a 320 px.** Mesurant tot això ha sortit una cosa que venia
de lluny: en un mòbil de 320 px la fila de botons de dalt del simulador
arribava a x=81 i la rosa dels vents acaba a x=89, o sigui que es trepitjaven.
S'ha arreglat escurçant els botons de càmera i zoom per sota de 360 px
d'amplada; ara la fila comença a x=107.

**L'Ocata Vent encara depèn de la xarxa per a l'aspecte.** El seu `index.html`
carrega les tipografies de Google Fonts i el Leaflet des de `cdnjs`. Sense
connexió, l'app canvia de lletra i el mapa no es dibuixa. Al simulador això ja
està resolt (tipografies incrustades); si vols, es pot fer el mateix a
l'Ocata Vent.
