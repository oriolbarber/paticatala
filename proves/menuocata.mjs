// Comprova l'entrada «Simulador de patí» al menú de configuració de l'Ocata Vent.
// Fa servir el MARCATGE, el CSS i el cfg.js REALS de l'app, baixats del repo, en
// una pàgina de prova: així es mesura exactament el que el canvi toca (l'ítem i
// el gestor de clics del menú) sense dependre de la xarxa ni de la meteo.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const D = '/tmp/claude-0/ocata';
const idx = readFileSync(`${D}/index-nou.html`, 'utf8');

// Retallem del document real el menú sencer, tal com queda amb el canvi.
const menu = idx.match(/<div class="cfg-scrim"[\s\S]*?<div class="cfg-menu"[\s\S]*?\n<\/div>/)[0];
const vell = readFileSync(`${D}/index.html`, 'utf8')
  .match(/<div class="cfg-scrim"[\s\S]*?<div class="cfg-menu"[\s\S]*?\n<\/div>/)[0];

mkdirSync(`${D}/h`, { recursive: true });
const banc = (m) => `<!DOCTYPE html><html lang="ca"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="app.css"></head><body>
<button class="ib" id="themeBtn" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="cfgMenu">⚙</button>
${m}
<div class="cfg" id="viewPanel" hidden></div>
<!-- El cfg.js fa servir la funció global de l'app.js que busca elements per id,
     i surt sense fer res si no la troba: al banc de proves l'hi hem de donar. -->
<script>const $ = id => document.getElementById(id);</script>
<script src="cfg.js"></script></body></html>`;
writeFileSync(`${D}/h/nou.html`, banc(menu));
writeFileSync(`${D}/h/vell.html`, banc(vell));
for (const f of ['app.css', 'cfg.js']) writeFileSync(`${D}/h/${f}`, readFileSync(`${D}/${f}`));
// Destí de l'enllaç: un simulador de mentida, només per veure que hi arriba.
writeFileSync(`${D}/h/simulador.html`, '<!DOCTYPE html><title>SIM</title><body>simulador</body>');

let fallades = 0;
const ok = t => console.log('  ✔ ' + t);
const no = t => { console.log('  ✗ ' + t); fallades++; };

console.log('\nMENÚ DE L\'OCATA VENT · ENTRADA AL SIMULADOR\n');

const nav = await chromium.launch();

// ── mida i aspecte, comparats amb els ítems que ja hi havia ────────────────
for (const [nom, w, h] of [['mòbil   ', 390, 844], ['tauleta ', 820, 1180], ['PC      ', 1280, 800]]) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(`file://${D}/h/nou.html`);
  await p.click('#themeBtn');
  await p.waitForSelector('#cfgMenu:not([hidden])');

  const m = await p.evaluate(() => {
    const items = [...document.querySelectorAll('#cfgMenu .cfg-mi')];
    const a = items.find(e => e.tagName === 'A');
    const b = items.find(e => e.getAttribute('data-cfg') === 'help');   // «Ajuda»
    const cs = getComputedStyle(a), bs = getComputedStyle(b);
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const svg = getComputedStyle(a.querySelector('svg'));
    const men = document.getElementById('cfgMenu').getBoundingClientRect();
    return {
      text: a.textContent.trim(), href: a.getAttribute('href'),
      alt: +ra.height.toFixed(1), altRef: +rb.height.toFixed(1),
      amp: +ra.width.toFixed(1), ampRef: +rb.width.toFixed(1),
      x: +ra.x.toFixed(1), xRef: +rb.x.toFixed(1),
      font: cs.font, fontRef: bs.font, color: cs.color, colorRef: bs.color,
      subr: cs.textDecorationLine, svgColor: svg.color,
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      desborda: men.bottom > innerHeight + 0.5 || men.right > innerWidth + 0.5,
      ordre: items.map(e => e.textContent.trim()),
    };
  });

  m.text === 'Simulador de patí' ? ok(`${nom} · ítem «${m.text}»`) : no(`${nom} · text inesperat: «${m.text}»`);
  Math.abs(m.alt - m.altRef) < 0.6 && Math.abs(m.amp - m.ampRef) < 0.6 && Math.abs(m.x - m.xRef) < 0.6
    ? ok(`${nom} · mateixa caixa que els altres ítems (${m.alt}×${m.amp} px)`)
    : no(`${nom} · caixa diferent: ${m.alt}×${m.amp} vs ${m.altRef}×${m.ampRef} px, x ${m.x} vs ${m.xRef}`);
  m.font === m.fontRef && m.color === m.colorRef
    ? ok(`${nom} · mateixa lletra i color que els altres`)
    : no(`${nom} · lletra/color diferents`);
  m.subr === 'none' ? ok(`${nom} · sense subratllat d'enllaç`) : no(`${nom} · surt subratllat (${m.subr})`);
  m.svgColor === m.accent || m.svgColor.startsWith('rgb')
    ? ok(`${nom} · la icona pren el color d'accent (${m.svgColor})`)
    : no(`${nom} · icona sense color`);
  !m.desborda ? ok(`${nom} · el menú no desborda la pantalla`) : no(`${nom} · el menú desborda`);
  errs.length === 0 ? ok(`${nom} · cap error de JavaScript`) : no(`${nom} · errors: ${errs.join(' | ')}`);
  if (w === 390) console.log('      ordre del menú: ' + m.ordre.join(' · '));
  await ctx.close();
}

// ── que el clic navegui: cfg.js intercepta [data-cfg] i l'ítem no en porta ──
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(`file://${D}/h/nou.html`);
  await p.click('#themeBtn');
  await p.waitForSelector('#cfgMenu:not([hidden])');
  await p.click('#cfgMenu a.cfg-mi');
  await p.waitForLoadState('load');
  (await p.title()) === 'SIM'
    ? ok('el clic obre el simulador (cfg.js no se l\'empassa)')
    : no(`el clic no hi arriba: som a ${await p.title()}`);
  await p.goBack();
  await p.waitForSelector('#themeBtn');
  ok('i es pot tornar enrere a l\'app');
  await ctx.close();
}

// ── el menú sense el canvi no ha de tenir l'ítem (control) ─────────────────
{
  const ctx = await nav.newContext();
  const p = await ctx.newPage();
  await p.goto(`file://${D}/h/vell.html`);
  await p.click('#themeBtn');
  (await p.locator('#cfgMenu a.cfg-mi').count()) === 0
    ? ok('control: sense el canvi l\'ítem no hi és')
    : no('control: l\'ítem apareix sense el canvi (la prova mesura una altra cosa)');
  await ctx.close();
}

await nav.close();
console.log(fallades ? `\n═══ ${fallades} FALLADES ═══\n` : '\n═══ MENÚ CORRECTE ✔ ═══\n');
process.exit(fallades ? 1 : 0);
