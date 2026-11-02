// Comprova que les tipografies van incrustades i que el navegador les fa
// servir de debò, SENSE CONNEXIÓ. No n'hi ha prou amb veure que el fitxer
// conté base64: cal que les carregui i que els textos s'hi dibuixin.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const LLIURABLES = [
  ['autònom', 'pati_vela_simulador_v6.html'],
  ['PWA    ', 'pwa/index.html'],
];

let fallades = 0;
const ok = (t) => console.log('  ✔ ' + t);
const no = (t) => { console.log('  ✗ ' + t); fallades++; };

console.log("\nTIPOGRAFIES INCRUSTADES\n");

// ── 1) cap referència externa al fitxer ─────────────────────────────────────
for (const [nom, f] of LLIURABLES) {
  const t = readFileSync(f, 'utf8');
  const externs = [...t.matchAll(/(?:href|src)\s*=\s*["']?(https?:)?\/\/[^"'\s>)]+/gi)]
    .map(m => m[0]);
  externs.length === 0
    ? ok(`${nom} · cap recurs extern al document`)
    : no(`${nom} · encara hi ha recursos externs: ${externs.join(', ')}`);
  /woff2;base64/.test(t)
    ? ok(`${nom} · les tipografies hi van en base64`)
    : no(`${nom} · no hi trobo cap tipografia incrustada`);
}

const navegador = await chromium.launch();

for (const [nom, f] of LLIURABLES) {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  // Tallem TOTA la xarxa: si una tipografia no fos incrustada, aquí fallaria.
  await ctx.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  const pag = await ctx.newPage();
  const xarxa = [];
  pag.on('requestfailed', r => { if (!r.url().startsWith('file:')) xarxa.push(r.url()); });
  await pag.goto('file://' + process.cwd() + '/' + f);
  await pag.evaluate(() => document.fonts.ready);

  // ── 2) totes les combinacions que el CSS fa servir, carregades ───────────
  // Atenció: `document.fonts.check()` diu «no» a una cara que encara no s'ha
  // fet servir, encara que hi sigui declarada. El Barlow Condensed 500 no el
  // demana cap element directament (hi arriba com a veí del pes 400), i per
  // això donava fals negatiu. Cal demanar la càrrega abans de preguntar.
  const cares = await pag.evaluate(async () => {
    const prova = [
      ['Inter', 400], ['Inter', 600], ['Inter', 700],
      ['Barlow Condensed', 500], ['Barlow Condensed', 600], ['Barlow Condensed', 700],
    ];
    const out = [];
    for (const [fam, w] of prova) {
      const cara = `${w} 16px '${fam}'`;
      const carregades = await document.fonts.load(cara);
      out.push([fam, w, carregades.length > 0 && document.fonts.check(cara)]);
    }
    return out;
  });
  for (const [fam, w, hi] of cares) {
    hi ? ok(`${nom} · ${fam} ${w} carregada`) : no(`${nom} · ${fam} ${w} NO carregada`);
  }

  // ── 3) que s'hi dibuixi: el Barlow Condensed és molt més estret que una
  //       sans-serif qualsevol, i l'Inter no. La relació d'amplades ho delata.
  const am = await pag.evaluate(() => {
    const c = document.createElement('canvas').getContext('2d');
    const t = 'ORSAR I ARRIBAR 123';
    const m = (f) => { c.font = `700 40px ${f}`; return c.measureText(t).width; };
    return { bc: m("'Barlow Condensed'"), inter: m("'Inter'"), base: m('sans-serif') };
  });
  const rbc = am.bc / am.base, rin = am.inter / am.base;
  console.log(`      amplades: Barlow ${am.bc.toFixed(0)} · Inter ${am.inter.toFixed(0)} · sans-serif ${am.base.toFixed(0)} px`);
  rbc < 0.80
    ? ok(`${nom} · el Barlow Condensed dibuixa estret (${(rbc * 100).toFixed(0)}% de la sans-serif)`)
    : no(`${nom} · el Barlow Condensed no dibuixa: amplada ${(rbc * 100).toFixed(0)}%, hauria de ser < 80%`);
  Math.abs(rin - 1) > 0.02
    ? ok(`${nom} · l'Inter dibuixa amb amplada pròpia (${(rin * 100).toFixed(0)}%)`)
    : no(`${nom} · l'Inter sembla la tipografia del sistema (${(rin * 100).toFixed(0)}%)`);

  // ── 4) sense connexió, res no s'ha intentat baixar ───────────────────────
  xarxa.length === 0
    ? ok(`${nom} · no intenta baixar res de la xarxa`)
    : no(`${nom} · intenta baixar: ${xarxa.join(', ')}`);

  await ctx.close();
}

await navegador.close();
console.log(fallades ? `\n═══ ${fallades} FALLADES ═══\n` : '\n═══ TIPOGRAFIES CORRECTES ✔ ═══\n');
process.exit(fallades ? 1 : 0);
