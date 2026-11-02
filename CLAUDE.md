# Simulador de Patí de Vela Català

Aquest arxiu el llegeix el Claude automàticament en obrir el projecte. Conté com
treballem i com està muntat el repositori. **Llegeix-lo abans de tocar res.**

---

## Llengua

- **Tot en català**: la interfície, els textos, els comentaris del codi i les
  explicacions.
- Terminologia nàutica catalana correcta: orsar, arribar, caçar, amollar,
  cenyida, través, llarg, empopada, virada, trasluixada, amura, escota,
  botavara, buc, regala, barlovent, sotavent, fula.
- Castellà només si l'Oriol demana expressament un document formal.

## Respostes

- Concises i al gra. Xifres i taules quan comparem abans/després.
- Sense floritures ni resums llargs del que ja ha vist.
- Reconèixer els errors propis sense embuts, dient quin era l'error concret.
- Si descobreixes alguna cosa que li serveixi per millorar l'app, digue-la.

---

## Com està muntat el repositori

| | |
|---|---|
| `pati_vela_mobil.html` | **L'únic arxiu que s'edita.** Tot el simulador: HTML, CSS i uns 5.000 línies de JavaScript en un sol `<script>`. Icones i tipografies incrustades en base64. |
| `build.py` | Construeix els lliurables a partir de l'anterior i comprova que el JavaScript sigui idèntic a tots tres. |
| `index.html` | **GENERAT. No s'edita mai a mà.** És el lliurable autònom amb el nom que necessita GitHub Pages: fer-ne el commit és el que publica l'app. |
| `pwa/` | Manifest, service worker i icones de la versió instal·lable. El `pwa/index.html` també és generat. |
| `proves/` | La bateria de proves (Node). Vegeu més avall. |
| `docs/` | `ESTAT-DEL-SIMULADOR.md` (traspàs tècnic), `ESPEC-aparell.md` (mides del patí), `COM-ENLLACAR-DES-D-OCATA-VENT.md`. |

### El cicle de cada canvi

1. Editar `pati_vela_mobil.html`.
2. `python3 build.py` — genera `index.html`, `pwa/index.html` i `simM.js`.
3. `node --check simM.js` (sintaxi) i `node proves/strict.js` (càrrega).
4. Passar les proves afectades **i** la bateria de regressió.
5. Comprovar que als lliurables hi ha els marcadors del canvi.
6. Commit. Com que `index.html` hi va inclòs, el commit **publica** l'app.

Si es canvia el joc, cal **pujar el número de la memòria cau** de
`pwa/service-worker.js` (`pati-vela-v6`, `v7`…) o els mòbils que tinguin la PWA
instal·lada es quedaran la versió vella.

### On s'instal·la

L'Oriol té l'app al mòbil des de **GitHub Pages d'aquest mateix repositori**, que
serveix l'`index.html` de l'arrel. Fins ara aquell `index.html` era l'única cosa
que hi havia al repositori.

### La bateria de proves

Aquí n'hi ha quinze, les que es fan servir més. **La bateria sencera (uns 60
programes) és al coneixement del projecte «Pati Català» de claude.ai**, a la
carpeta `proves/`, amb el seu `LLEGEIX-ME.md`. Si en una sessió calen proves que
aquí no hi són, es recuperen d'allà i es deixen al repositori.

```bash
python3 build.py          # genera simM.js, que és el que llegeixen les proves
node proves/strict.js     # càrrega en un entorn simulat
node proves/fisica.js     # regressió de física
node proves/aparell.js    # mides del pal, la vela i la barra escotera
node proves/escota.js     # recorregut de l'escota
node proves/politja.mjs   # la politja sempre damunt la barra (Chromium)
node proves/bracos.js     # una mà a l'escota, l'altra agafada a un punt real
node proves/escora.mjs    # el patí es tomba sencer, sense deformar-se (Chromium)
node proves/limit.js      # navega fins a les 3 milles sense perdre velocitat
node proves/circuits.js   # geometria dels triangles per a qualsevol vent
node proves/tornar.mjs    # botó de tornada (Chromium)
node proves/tipografies.mjs   # tipografies incrustades, sense xarxa
node proves/interficie.mjs    # tots els controls, buscant errors de JS
node proves/foto.mjs      # captures reals de les tres vistes
```

Les `.mjs` necessiten Playwright i Chromium.

---

## Com vull que treballis

Cada punt ve d'un error concret que vam cometre.

### 1. Mesurar abans de tocar

Quan es reporta un problema, primer es reprodueix i es mesura, amb xifres. Només
després es busca la causa, i només després es toca el codi.

*D'on ve.* «El patí gira massa ràpid quan va lent». En comptes de retocar
constants a ull, es va mesurar: aturat amb el pes a popa girava a **24,1 °/s** i
navegant a 6 kn a **10 °/s** — més del doble aturat que navegant, just al revés
del que toca. Amb aquella xifra, el problema deixava de ser una opinió.

### 2. Cada canvi ve amb la seva prova, i amb l'abans i el després

No es diu «arreglat». Es diu: era X, ara és Y, i aquesta és la prova. I s'hi
inclouen les xifres que demostren que **no s'ha trencat** el que ja funcionava.

### 3. Si la prova falla, sospita primer de la prova

Un test que falla no vol dir que el codi estigui malament. Abans de canviar res,
es comprova el test contra la versió **anterior** del codi: si també falla allà,
el test és el que està equivocat. Ha passat moltes vegades:

- Un test de virada no es completava mai perquè posava **el pes a la banda
  contrària**: la recepta de maniobra era errònia.
- Un classificador de capes per colors comptava l'halo del sol com a onada.
  Substituït per **marcadors explícits** (`CAPA='fons'`, `CAPA='escota'`…).
- Una mètrica d'estabilitat feia servir la **mediana** per bloc de pantalla, que
  salta de cop. Amb la mitjana, la mesura era fiable.
- `document.fonts.check()` deia que una tipografia no hi era: respon «no» a una
  cara que encara no s'ha fet servir. Calia `document.fonts.load()` abans.

### 4. Explicar la causa, no el pedaç

La resposta ha de dir **per què** passava. Si no se sap el per què, encara no
està resolt. Exemples reals:

- *«Les onades van al revés»* → error de signe: la fase de cada cresta creixia
  amb el temps, i la fase acumulada creix cap a mar endins.
- *«La vela s'infla contra el vent»* → la panxa es dibuixava segons on és la
  botavara, no segons quina cara premsa el vent.
- *«Els colors van com una discoteca»* → l'ordre de pintat es calculava amb la
  posició mitjana a pantalla, que salta quan entren o surten punts del camp de
  visió.

### 5. Si un mètode no funciona, revertir-lo

No s'acumula codi maquillat. Es torna a l'estat anterior i es proposa una via
diferent, dient clarament quina seria.

### 6. Provar en moltes situacions, no en una

Rumbs de 0° a 315°, distàncies de la costa de 25 m a 800 m, pantalla vertical i
horitzontal, mòbil i escriptori. Les «falques» fosques del mar només apareixien
mirant **al llarg** de la costa: amb una sola escena no s'haurien vist mai.

### 7. Comprovar l'estabilitat en el temps

Un fotograma correcte no vol dir res. Cal comparar **fotogrames consecutius** i
mesurar el salt. Patí immòbil: qualsevol canvi és parpelleig.

### 8. Determinisme i robustesa

- **Cap ordre de dibuix que depengui del que es veu** en aquell fotograma:
  l'ordre es calcula amb magnituds contínues (la distància a la càmera).
- **NaN.** Amb un NaN *totes* les comparacions són falses, així que s'escola per
  qualsevol guarda `if (x < limit) return`. Se'n produïen **131.376 per sessió**
  al dibuix de les onades sense que es notés. Es rebutgen a l'arrel, a la funció
  de projecció.
- **Res de `localStorage`** ni cap emmagatzematge del navegador.
- **Cap recurs extern.** Icones i tipografies van incrustades en base64. Si una
  imatge no carrega, el programa ha de continuar funcionant.

### 9. Escala real, sempre

Tot el món es construeix en metres a partir d'una única constant: el patí fa
**5,6 m** d'eslora. Cases de 10-24 m, campanar de 32 m, turons de 95-305 m,
onatge amb període i alçada físics. Hi ha una prova permanent de la llei de la
perspectiva.

### 10. Física realista, però calibrada

Realista vol dir *que es comporti com la realitat*, no *que sigui dur*. **No hi
ha modes fàcils**: una sola navegació. Els coeficients estan calibrats contra
temps de maniobra reals, i `proves/fisica.js` els vigila:

| | |
|---|---|
| virada real a 13 kn: la vela a l'altra banda i 30° de vent | 6,5 s |
| trasluixada | 8,7 s |
| gir navegant a 6 kn | 10 °/s |
| gir aturat amb el pes a popa | 11,5 °/s (mai més de 13) |
| empopada amb el pes centrat | deriva 0°, 0 canvis de banda, 6,5 kn |

Si per ser realista una cosa queda impossible de jugar, el problema és el
calibratge, no el realisme.

### 11. Modelar el que fa el patró de veritat

Quan l'Oriol explica com es fa una maniobra a la realitat, es modela això, no una
aproximació. El **cul a la vela** (el patró aguanta la vela amb el cos mentre va
de proa a popa) i el **penell** (aturat, caçant la proa puja al vent) són peces
de física que costen molt de reinventar: vegeu `docs/ESTAT-DEL-SIMULADOR.md`.

---

## Estil visual

- Estil **il·lustració**, pocs colors, formes netes. Res de diagrames tècnics
  dins de l'escena (fletxes, etiquetes) si es pot dir amb textura.
- El mar del Masnou té **dos colors**: turquesa fins a la barra de sorra i blau
  profund més enllà, amb un tall força definit.
- Capes del paisatge sempre separades i distingibles: cel, muntanyes, poble,
  platja.
- Perspectiva aèria: com més lluny, més clar i més blavós.

## Comentaris del codi

En català i explicant **per què**, no què.

---

## Sobre les referències visuals

Les fotos que envia l'Oriol han estat el material més útil de tots. La foto de la
platja del Masnou va fer veure que el mar hi té **dos colors** amb un tall net a
la barra, i això va canviar completament el tractament de l'aigua. Una foto del
lloc val més que una descripció: demana-les.
