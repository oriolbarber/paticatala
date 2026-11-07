// ITINERARI DE REPTES PER NIVELLS: per a cada repte del camí es carrega la situació
// (posició, vent, rumb, escota i pes) i es navega amb la física real fins a superar-lo.
// Comprova també el desbloqueig per nivells, la tornada a la sortida després d'un error,
// el codi de progrés i (v31) el desament, la desviació inicial i els 15 s dels rumbs, la
// fase 2 de la virada, els circuits de prop ×4, els rècords i els colors del buc.
const fs = require('fs');
require('./_entorn.js');                     // només l'entorn simulat (document, window…)
// localStorage simulat, amb una clau d'una altra app (l'origen és compartit amb l'OcataVent)
const DESAT = new Map([['ocatavent.notes', '{"no":"tocar"}']]), CLAUS = [];
const LS = { getItem:k => (CLAUS.push('get:' + k), DESAT.has(k) ? DESAT.get(k) : null),
             setItem:(k, v) => (CLAUS.push('set:' + k), DESAT.set(k, String(v))),
             removeItem:k => (CLAUS.push('remove:' + k), DESAT.delete(k)), clear:() => CLAUS.push('clear') };
Object.defineProperty(globalThis, 'localStorage', { configurable:true, get:() => LS });
// simM.js es carrega aquí per poder exportar també les constants de l'itinerari
// (les const d'un eval no surten de l'eval).
const EXP = ['physics','updateWeight','S','F','CH','L','REG','D2R','R2D','normA','shoreFn','resetToBeach',
  'entrarAlMar','updateRegata','ITIN','itinDef','itinNode','itinEstat','carregaRepte','itinTick','updateRepte',
  'codiProgres','llegeixCodi','novaPartida','muntaRegata','CURSES','desaProgres','carregaProgres','COLORS_BUC',
  'colorsOberts','triaColor','aplicaColorBuc','PINTA_BUC','DECAU','fmtT'];
(0, eval)(fs.readFileSync('simM.js', 'utf8').replace(/^'use strict';/, '') +
  '\n;globalThis.__rp={' + EXP.join(',') + ', get repte(){ return repte; }, get vf(){ return viradaFase; }, get prog(){ return prog; }};');
const A = globalThis.__rp;
const G = s => s === 'repte' ? A.repte : A[s];
const {S, F, CH, L, REG, D2R, R2D} = A;
const ITIN = G('ITIN');
const $ = id => document.getElementById(id);
const M = L/5.6, dt = 1/60;
let fall = 0;
const ok = (c, t) => { if(!c) fall++; console.log(`  ${c ? '✔' : '✗'} ${t}`); };
const relVent = () => Math.abs(A.normA(S.heading - S.windFrom))*R2D;
const pas = () => { A.updateWeight(dt); A.physics(dt); G('updateRepte')(dt); A.updateRegata(dt); G('itinTick')(); };
const obert = id => $(id).classList.contains('on');
const tots = ITIN.tots.map(n => n.id);

console.log('\nEL CAMÍ\n');
ok(tots.join(',') === 'canal,traves,cenyida,empopada,virada,tornar,costaner,basto,triangle,equilater,rectangle',
   `11 reptes en 5 nivells: ${tots.join(' → ')}`);
ok(ITIN.tots.every(n => G('itinDef')(n)), 'cada node és un repte de REPTES o una regata de CURSES (cap definició nova)');
ok(new Set(tots).size === tots.length, 'cap repte repetit');
ok(G('itinEstat')(ITIN.tots[0]) === 'actual' && G('itinEstat')(G('itinNode')('cenyida')) === 'bloq',
   'al principi només hi ha obert el nivell 1');
ok(A.colorsOberts().join() === 'fusta', 'al principi només hi ha la fusta per al buc');

// ── EXERCICIS ──────────────────────────────────────────────────────────────────
console.log('\nNIVELLS 1-3: CÀRREGA DE LA SITUACIÓ I REPTE SUPERAT\n');
function situacio(id){
  G('carregaRepte')(id);
  const n = G('itinNode')(id);
  const d0 = Math.hypot(S.px, S.py + CH.len)/M;
  ok(S.mode === 'mar' && S.board === 1 && S.capsized === 0, `${id}: ja és a l'aigua, a bord`);
  ok(S.windKn === n.kn && +$('sWind').value === n.kn, `${id}: vent ${n.kn} kn (i el lliscant del menú diu el mateix)`);
  ok(d0 < 25, `${id}: a ${d0.toFixed(0)} m de la boca del canal`);
  ok(!['ovReptes','ovFitxa','ovConfig'].some(obert), `${id}: cap finestra oberta, es navega a l'instant`);
  return n;
}
// sortir pel canal: des de la sorra
{
  G('carregaRepte')('canal');
  ok(S.mode === 'platja' && S.windKn === 8 && Math.abs(A.normA(S.windFrom - 90*D2R)) < 1e-9,
     'canal: a la sorra, 8 kn de llevant (través sortint)');
  A.entrarAlMar();
  S.py = -CH.len - L; S.px = 0; S.board = 1; S.everInWater = true;   // la sortida en si ja la proven altres proves
  for(let i = 0; i < 5; i++) pas();
  ok(ITIN.fets.has('canal') && obert('ovSuperat'), 'canal: superat en passar la boca, i surt la pantalla de felicitació');
  ok(G('itinEstat')(G('itinNode')('cenyida')) !== 'bloq', 'superar-lo obre el nivell 2');
  ok(ITIN.nous.join() === 'vermell' && /Vermell/.test($('supColor').innerHTML) && $('supColor').style.display === 'flex',
     'canal: desbloqueja el vermell i la pantalla de victòria l\'ensenya');
  ok(ITIN.celebracions === 1, 'canal: purpurina, vibració i so (cap error sense AudioContext ni vibrate)');
}
// RUMBS: comencen 20° desviats, per una amura a l'atzar; cal portar-los a la franja i aguantar 15 s
console.log('\n  (rumbs: desviació inicial, 15 s i decaïment)\n');
const XIFRES_RUMB = [];
for(const [id, atz] of [['traves', 0.1], ['traves', 0.9], ['cenyida', 0.3], ['empopada', 0.7]]){
  ITIN.atzar = () => atz;
  const n = situacio(id);
  const ini = relVent();
  ok(Math.abs(ini - n.th) > 19.5 && Math.abs(ini - n.th) < 20.5 && (ini < n.franja[0] || ini > n.franja[1]),
     `${id}: comença a ${ini.toFixed(0)}° (objectiu ${n.th}°, franja ${n.franja.join('–')}°), amura ${S.sailSide > 0 ? 'babord' : 'estribord'}`);
  // sense tocar res no se supera: el rumb es queda desviat
  let t = 0; while(t < 20 && ITIN.actiu){ pas(); t += dt; }
  ok(!ITIN.fets.has(id) || id === 'traves' && atz === 0.9, `${id}: sense corregir no se supera en 20 s (queda a ${relVent().toFixed(0)}°)`);
  // un patró: pes a proa per orsar i a popa per arribar, proporcional a l'error
  G('carregaRepte')(id);
  const wx0 = S.wxT; let dins = null; t = 0;
  ITIN.fets.delete(id);
  while(t < 60 && ITIN.actiu){
    S.wfT = Math.max(-1, Math.min(1, 0.05*(relVent() - n.th))); S.wxT = wx0;
    if(id === 'empopada') S.sheet = 0.2;
    pas(); t += dt;
    if(dins === null && relVent() >= n.franja[0] && relVent() <= n.franja[1]) dins = t;
  }
  XIFRES_RUMB.push([id, ini, dins, t]);
  ok(ITIN.fets.has(id) && t - dins >= 15 - 0.05, `${id}: dins la franja als ${dins.toFixed(1)} s i superat als ${t.toFixed(1)} s (${(t - dins).toFixed(1)} s dins)`);
}
ITIN.atzar = Math.random;
// la barra no es buida de cop: 10 s dins, 2 s fora → en queden 8
{
  G('carregaRepte')('cenyida');
  const n = G('itinNode')('cenyida');
  const fixa = th => { S.heading = A.normA(S.windFrom + th*D2R*S.sailSide); S.speed = 0.6; F.absT = th*D2R; };
  for(let i = 0; i < 600; i++){ fixa(50); G('updateRepte')(dt); }
  const p10 = G('prog');
  for(let i = 0; i < 120; i++){ fixa(70); G('updateRepte')(dt); }
  const p8 = G('prog');
  ok(Math.abs(p10 - 10) < 0.05 && Math.abs(p8 - (10 - 2*A.DECAU)) < 0.05,
     `decaïment ${A.DECAU}: 10 s dins → ${p10.toFixed(1)} s; 2 s fora → ${p8.toFixed(1)} s (no es buida de cop)`);
  ok(+$('repteFill').style.width.replace('%', '') > 50, `la barra es queda al ${parseFloat($('repteFill').style.width).toFixed(0)} % i no al 0 %`);
}
// VIRADA amb el gest de l'Oriol (auditoria v29): orsar amb el pes a proa i caçat; passat el
// vent, pes a POPA a la banda nova (0,55, -0,84) i escota a 0,9. Amb la v30 no la superava mai.
console.log('\n  (virada: gest de l\'Oriol a 4 vents)\n');
const XIFRES_VIR = [];
for(const kn of [5, 8, 10, 12]) for(const passa of [0, 4]){
  G('itinNode')('virada').kn = kn;
  G('carregaRepte')('virada');
  const a0 = S.sailSide; let t = 0, fase = 'orsa', f2 = null;
  while(t < 40 && ITIN.actiu){
    const tt = A.normA(S.heading - S.windFrom)*R2D*a0;           // + per l'amura vella
    if(fase === 'orsa' && tt < -passa) fase = 'popa';
    if(fase === 'orsa'){ S.wfT = 1; S.wxT = -0.3*a0; S.sheet = 1; } else { S.wfT = -0.84; S.wxT = 0.55*a0; S.sheet = 0.9; }
    pas(); t += dt;
    if(G('vf') === 2 && f2 === null) f2 = t;
  }
  XIFRES_VIR.push([kn, passa, t]);
  ok(ITIN.fets.has('virada') && S.sailSide !== a0, `virada ${kn} kn, a popa ${passa}° passat el vent: superada als ${t.toFixed(1)} s per l'amura nova (barra al 70 % als ${f2 && f2.toFixed(1)} s)`);
  ITIN.fets.delete('virada');
}
G('itinNode')('virada').kn = 10;
ITIN.fets.add('virada');
// fase 2: aturat proa al vent fins a 8 s sense perdre-la; als 8 s torna a 0 AMB rètol
{
  G('carregaRepte')('virada');
  const a0 = S.sailSide;
  let t = 0;
  while(G('vf') !== 2 && t < 30){
    const tt = A.normA(S.heading - S.windFrom)*R2D*a0;
    if(tt > -4){ S.wfT = 1; S.wxT = -0.3*a0; S.sheet = 1; } else { S.wfT = -0.84; S.wxT = 0.55*a0; S.sheet = 0.9; }
    pas(); t += dt;
  }
  ok(G('vf') === 2, `virada: arriba a la fase 2 (barra al 70 %) als ${t.toFixed(1)} s`);
  $('bannerTitol').textContent = '';
  for(let i = 0; i < 60*7; i++){ S.speed = 0; G('updateRepte')(dt); }
  ok(G('vf') === 2, 'fase 2: 7 s aturat proa al vent i encara és al 70 % (abans tornava a 0 als 3 s, sense avís)');
  for(let i = 0; i < 60*1.2; i++){ S.speed = 0; G('updateRepte')(dt); }
  ok(G('vf') === 0 && $('bannerTitol').textContent === 'Aturat proa al vent', 'fase 2: als 8 s torna a 0, amb el rètol «Aturat proa al vent»');
}
// fase 2: si cau per l'amura VELLA i agafa velocitat, no és una virada
{
  G('carregaRepte')('virada');
  const a0 = S.sailSide;
  let t = 0;
  while(G('vf') !== 2 && t < 30){
    const tt = A.normA(S.heading - S.windFrom)*R2D*a0;
    if(tt > -4){ S.wfT = 1; S.wxT = -0.3*a0; S.sheet = 1; } else { S.wfT = -0.84; S.wxT = 0.55*a0; S.sheet = 0.9; }
    pas(); t += dt;
  }
  // la vela torna a la banda vella i el patí surt a 60° per l'amura de sortida
  S.sailSide = S.pulley = a0; S.boomDir = 0.6*a0; S.postVir = 0; S.tacking = 0; S.tackDir = 0;
  S.heading = A.normA(S.windFrom + 60*D2R*a0); S.speed = 0.6; S.sheet = 0.8; S.wfT = 0; S.wxT = -0.7*a0;
  let fet = false;
  for(let i = 0; i < 60*4; i++){ pas(); if(!ITIN.actiu){ fet = true; break; } }
  ok(!fet && F.tack === a0, 'fase 2: caure per l\'amura vella a 60° i 3,6 kn NO supera la virada');
}
// tornar pel canal: carregar, fallar (fora del canal) i tornar-hi
{
  G('carregaRepte')('tornar');
  const n = G('itinNode')('tornar');
  ok(S.mode === 'mar' && Math.abs(A.normA(S.heading - Math.PI)) < 1e-9 && S.px > 5*L,
     `tornar: de tornada cap a la platja, desplaçat ${(S.px/M).toFixed(0)} m del canal`);
  ok(Math.abs(relVent() - n.th) < 0.5, `tornar: rumb de llarg (${relVent().toFixed(0)}°)`);
  S.mode = 'final'; A.resetToBeach();
  G('itinTick')();
  ok(S.mode === 'mar' && S.px > 5*L && ITIN.actiu && ITIN.actiu.id === 'tornar',
     'tornar: després de tocar fora del canal, torna a la sortida del repte');
  S.px = 0; S.py = A.shoreFn(0) - 1.5*L; S.heading = Math.PI;
  let t = 0; while(t < 15 && ITIN.actiu){ pas(); t += dt; }
  ok(ITIN.fets.has('tornar'), `tornar: superat en arribar a la sorra pel canal (${t.toFixed(1)} s)`);
}
// bolcada en un exercici: torna a la sortida del repte, no a la platja
{
  ITIN.atzar = () => 0.3;
  G('carregaRepte')('cenyida');
  S.capsized = 0.01; pas();
  ok(S.mode === 'mar' && G('repte').id === 'cenyida' && Math.abs(relVent() - 70) < 1,
     'bolcada: es recarrega la situació del repte (no comences des de la sorra)');
  ITIN.atzar = Math.random;
}

// ── CIRCUITS DE PROP ×4 ────────────────────────────────────────────────────────
console.log('\nCIRCUITS DE PROP (×4)\n');
{
  const curs = id => A.CURSES.find(c => c.id === id);
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1])/M;
  const ABANS = { basto:[9, 1], triangle:[9, Math.hypot(6.4, 4.6), 1], costaner:[Math.hypot(8.2, 2.6), Math.hypot(8.2, 2.6)] };
  S.windFrom = 0;
  for(const id of ['basto', 'triangle', 'costaner']){
    A.muntaRegata(curs(id));
    const p0 = REG.linia.p0, ara = REG.marques.map(m => d(m.p, p0)), ab = ABANS[id].map(x => x*5.6);
    ok(ara.every((x, i) => Math.abs(x/ab[i] - 4) < 0.01),
       `${id}: boies a ${ara.map(x => x.toFixed(0)).join(' / ')} m de la línia (abans ${ab.map(x => x.toFixed(0)).join(' / ')} m) → ×4`);
  }
  ok(Math.abs(REG.linia.semi/M - 29.1) < 0.2, `línia de sortida de prop: ${(2*REG.linia.semi/M).toFixed(0)} m (abans 29 m)`);
  let costa = 1e9, lim = true, pitjor = '';
  for(let g = 0; g < 360; g += 5) for(const id of ['basto', 'triangle', 'costaner']){
    S.windFrom = g*D2R; A.muntaRegata(curs(id));
    const Ln = REG.linia;
    const pts = [...REG.marques.map(m => m.p), [Ln.p0[0] + Ln.trav[0]*Ln.semi, Ln.p0[1] + Ln.trav[1]*Ln.semi],
                 [Ln.p0[0] - Ln.trav[0]*Ln.semi, Ln.p0[1] - Ln.trav[1]*Ln.semi]];
    for(const p of pts){
      const c = (A.shoreFn(p[0]) - p[1])/M;
      if(c < costa){ costa = c; pitjor = `${id} amb vent de ${g}°`; }
      lim = lim && -p[1]/M < 5556 && Math.abs(p[0])/M < 5556;
    }
  }
  ok(costa >= 39.9, `72 vents × 3 circuits: cap boia ni extrem de línia a menys de 40 m de la costa (mínim ${costa.toFixed(0)} m, ${pitjor})`);
  ok(lim, 'tot queda dins del límit de 3 milles');
}

// ── REGATES ────────────────────────────────────────────────────────────────────
console.log('\nNIVELLS 4-5: REGATES\n');
const volta = (pasT) => {
  const Ln = REG.linia, posa = p => { S.px = p[0]; S.py = p[1]; };
  for(let v = 0; v < REG.voltes; v++){
    posa([Ln.p0[0] + Ln.amunt[0]*2*L, Ln.p0[1] + Ln.amunt[1]*2*L]); A.updateRegata(dt);
    for(const m of REG.marques.slice()){ posa(m.p); A.updateRegata(pasT); }
    posa([Ln.p0[0] - Ln.amunt[0]*2*L, Ln.p0[1] - Ln.amunt[1]*2*L]); A.updateRegata(pasT);
  }
  G('itinTick')();
};
for(const id of ['costaner', 'basto', 'triangle', 'equilater', 'rectangle']){
  G('carregaRepte')(id);
  const Ln = REG.linia;
  const sota = (S.px - Ln.p0[0])*Ln.amunt[0] + (S.py - Ln.p0[1])*Ln.amunt[1];
  ok(REG.fase === 'preparats' && REG.curs.id === id && S.mode === 'mar' && S.windKn === 12,
     `${id}: boies muntades, patí a l'aigua, 12 kn`);
  ok(sota < 0 && sota > -5*L && Math.abs(relVent() - 50) < 1,
     `${id}: a ${(-sota/M).toFixed(0)} m sota la línia, cenyint (${relVent().toFixed(0)}°)`);
  volta(20);
  ok(ITIN.fets.has(id) && obert('ovSuperat') && !obert('ovFinal') && ITIN.recs[id] > 0,
     `${id}: ${REG.voltes} ${REG.voltes > 1 ? 'voltes' : 'volta'} → superat, rècord ${A.fmtT(ITIN.recs[id])}`);
}
// rècords: més lent no ho és; més ràpid, «Nou rècord!»
{
  const rec0 = ITIN.recs.basto;
  G('carregaRepte')('basto'); volta(30);
  ok(ITIN.recs.basto === rec0 && !/Nou rècord/.test($('supResum').innerHTML), `bastó més lent: el rècord es queda a ${A.fmtT(rec0)}`);
  G('carregaRepte')('basto'); volta(10);
  ok(ITIN.recs.basto < rec0 && /Nou rècord/.test($('supResum').innerHTML) && $('supNiv').textContent === 'NOU RÈCORD!',
     `bastó més ràpid: «Nou rècord!» ${A.fmtT(ITIN.recs.basto)} (abans ${A.fmtT(rec0)})`);
}

// ── PROGRÉS, COLORS I DESAMENT ─────────────────────────────────────────────────
console.log('\nPROGRÉS, COLORS I DESAMENT\n');
ok(ITIN.fets.size === 11, `tot l'itinerari superat (${ITIN.fets.size}/11)`);
ok(A.colorsOberts().length === 17 && A.COLORS_BUC.length === 17,
   `16 colors guanyats + la fusta (${A.colorsOberts().length - 1}/16): 11 reptes, 4 nivells i el mapa sencer`);
{
  const codi = G('codiProgres')();
  const fets0 = [...ITIN.fets];
  ITIN.fets = new Set(['canal', 'cenyida']);
  const parcial = G('codiProgres')();
  ok(JSON.stringify(G('llegeixCodi')(parcial)) === '["canal","cenyida"]', `codi ${parcial}: es recupera el mateix progrés`);
  ok(G('llegeixCodi')(codi).length === 11, `codi ${codi}: tot l'itinerari`);
  ok(G('llegeixCodi')(parcial.slice(0, -1) + (parcial.endsWith('Z') ? 'Y' : 'Z')) === null, 'un codi mal copiat es rebutja');
  ok(G('llegeixCodi')('hola') === null, 'un text qualsevol es rebutja');
  // colors: nivell 1 complet (canal + través) = vermell, blau marí i verd poma
  ITIN.fets = new Set(['canal', 'traves']);
  ok(A.colorsOberts().join() === 'fusta,vermell,mari,poma', `nivell 1 complet: ${A.colorsOberts().join(', ')}`);
  A.triaColor('lila');
  ok(ITIN.color !== 'lila', 'un color bloquejat no es pot triar');
  A.triaColor('mari');
  ok(ITIN.color === 'mari' && A.PINTA_BUC.clar === '#1f3a68' && A.PINTA_BUC.zt.join() === '21,39,71',
     `triar el blau marí pinta els laterals (clar ${A.PINTA_BUC.clar}, zenital ${A.PINTA_BUC.zt.join(',')} → ${A.PINTA_BUC.zb.join(',')})`);
  A.aplicaColorBuc('franja');
  ok(A.PINTA_BUC.franja && A.PINTA_BUC.franja.clar === '#e8b923', 'la franja de regata té una segona banda daurada');
  A.aplicaColorBuc('fusta');
  ok(A.PINTA_BUC.fosc === '#4a2c10' && A.PINTA_BUC.clar === '#c98a4c' && A.PINTA_BUC.zt.join() === '132,82,38' && A.PINTA_BUC.zb.join() === '42,24,12',
     'la fusta són exactament els tons d\'abans (les captures sense color no canvien)');
  A.triaColor('mari');
  ITIN.fets = new Set(fets0);
}
// desament: una sola clau pròpia, cap altra llegida ni esborrada
{
  ITIN.so = false; G('desaProgres')();
  const d = JSON.parse(DESAT.get('paticatala.reptes'));
  ok(d.v === 1 && d.fets.length === 11 && d.color === 'mari' && d.so === false && d.recs.basto === ITIN.recs.basto,
     `es desa a «paticatala.reptes»: ${d.fets.length} reptes, ${Object.keys(d.recs).length} rècords, color ${d.color}, so ${d.so}`);
  ok(CLAUS.every(c => c === 'get:paticatala.reptes' || c === 'set:paticatala.reptes'),
     `només s'ha tocat la clau pròpia (${CLAUS.length} accessos, cap remove ni clear)`);
  ok(DESAT.get('ocatavent.notes') === '{"no":"tocar"}' && DESAT.size === 2, 'la clau de l\'OcataVent és intacta');
  // «recarregar»: s'esborra la memòria i es llegeix el desat
  const rec = ITIN.recs.basto;
  ITIN.fets = new Set(); ITIN.recs = {}; ITIN.so = true; A.aplicaColorBuc('fusta');
  ok(G('carregaProgres')() && ITIN.fets.size === 11 && ITIN.recs.basto === rec && ITIN.color === 'mari' && ITIN.so === false
     && A.PINTA_BUC.clar === '#1f3a68', 'en tornar a obrir l\'app es recupera el progrés, el rècord, el color i el so');
  // un desat estrany no trenca res
  DESAT.set('paticatala.reptes', '{"fets":["no-existeix","canal"],"color":"lila","recs":{"basto":-3}}');
  ok(G('carregaProgres')() && ITIN.fets.size === 1 && ITIN.color === 'fusta' && !ITIN.recs.basto,
     'un desat amb dades estranyes es filtra: reptes que no existeixen, colors no guanyats i temps negatius fora');
  DESAT.set('paticatala.reptes', 'no és JSON');
  ok(G('carregaProgres')() === false && ITIN.fets.size === 1, 'un desat corromput s\'ignora');
}
// sense localStorage (iframe, mode privat): tot va igual en memòria
{
  Object.defineProperty(globalThis, 'localStorage', { configurable:true, get(){ throw new Error('SecurityError'); } });
  ok(G('desaProgres')() === false && G('carregaProgres')() === false, 'sense localStorage: desar i llegir fallen sense error');
  ITIN.fets = new Set();
  G('carregaRepte')('canal'); A.entrarAlMar();
  S.py = -CH.len - L; S.px = 0; S.board = 1; S.everInWater = true;
  for(let i = 0; i < 5; i++) pas();
  ok(ITIN.fets.has('canal') && obert('ovSuperat'), 'sense localStorage: el repte se supera i el progrés queda en memòria');
}
// nova partida: atura el repte però conserva el progrés
{
  ITIN.fets = new Set(['canal']);
  G('carregaRepte')('traves');
  G('novaPartida')();
  ok(ITIN.actiu === null && ITIN.fets.has('canal'), 'nova partida: atura el repte però conserva el progrés');
}

console.log('\n  XIFRES · rumbs: ' + XIFRES_RUMB.map(([id, i, d, t]) => `${id} des de ${i.toFixed(0)}°: dins ${d.toFixed(1)} s, superat ${t.toFixed(1)} s`).join(' · '));
console.log('  XIFRES · virada: ' + XIFRES_VIR.map(([k, p, t]) => `${k} kn/${p}° ${t.toFixed(1)} s`).join(' · '));
console.log(fall ? `\n${fall} FALLADES ✗` : '\nTot correcte ✔');
process.exit(fall ? 1 : 0);
