// ITINERARI DE REPTES PER NIVELLS: per a cada repte del camí es carrega la situació
// (posició, vent, rumb, escota i pes) i es navega amb la física real fins a superar-lo.
// Comprova també el desbloqueig per nivells, la tornada a la sortida després d'un error
// i el codi de progrés.
const fs = require('fs');
require('./_entorn.js');                     // només l'entorn simulat (document, window…)
// simM.js es carrega aquí per poder exportar també les constants de l'itinerari
// (les const d'un eval no surten de l'eval).
const EXP = ['physics','updateWeight','S','F','CH','L','REG','D2R','R2D','normA','shoreFn','resetToBeach',
  'entrarAlMar','updateRegata','ITIN','itinDef','itinNode','itinEstat','carregaRepte','itinTick','updateRepte',
  'codiProgres','llegeixCodi','novaPartida'];
(0, eval)(fs.readFileSync('simM.js', 'utf8').replace(/^'use strict';/, '') +
  '\n;globalThis.__rp={' + EXP.join(',') + ', get repte(){ return repte; }};');
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
const exist = ITIN.tots.every(n => G('itinDef')(n));
ok(exist, 'cada node és un repte de REPTES o una regata de CURSES (cap definició nova)');
ok(new Set(tots).size === tots.length, 'cap repte repetit');
ok(G('itinEstat')(ITIN.tots[0]) === 'actual' && G('itinEstat')(G('itinNode')('cenyida')) === 'bloq',
   'al principi només hi ha obert el nivell 1');

// ── EXERCICIS: carregar i navegar sense tocar res ──────────────────────────────
console.log('\nNIVELLS 1-3: CÀRREGA DE LA SITUACIÓ I REPTE SUPERAT\n');
function aguanta(id, segons){
  G('carregaRepte')(id);
  const n = G('itinNode')(id);
  const d0 = Math.hypot(S.px, S.py + CH.len)/M;
  ok(S.mode === 'mar' && S.board === 1 && S.capsized === 0, `${id}: ja és a l'aigua, a bord`);
  ok(S.windKn === n.kn && +$('sWind').value === n.kn, `${id}: vent ${n.kn} kn (i el lliscant del menú diu el mateix)`);
  ok(Math.abs(relVent() - n.th) < 0.5, `${id}: rumb inicial ${relVent().toFixed(0)}° del vent (${n.th}° demanat)`);
  ok(d0 < 25, `${id}: a ${d0.toFixed(0)} m de la boca del canal`);
  ok(!['ovReptes','ovFitxa','ovConfig'].some(obert), `${id}: cap finestra oberta, es navega a l'instant`);
  let mn = 1e9, mx = -1e9, t = 0;
  while(t < segons && ITIN.actiu){ pas(); t += dt; mn = Math.min(mn, relVent()); mx = Math.max(mx, relVent()); }
  return {t, mn, mx};
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
}
for(const id of ['traves', 'cenyida', 'empopada']){
  const r = aguanta(id, 12);
  ok(ITIN.fets.has(id), `${id}: superat en ${r.t.toFixed(1)} s sense tocar cap control (rumb entre ${r.mn.toFixed(0)}° i ${r.mx.toFixed(0)}°)`);
}
// virada: el gest de proves/fisica.js (pes a proa i caçar; quan flameja, a popa)
{
  aguanta('virada', 0);
  for(let i = 0; i < 120; i++) pas();
  const amura0 = S.sailSide;
  let t = 0;
  while(t < 20 && ITIN.actiu){
    if(S.sailSide === amura0 && relVent() > 20){ S.wfT = 1; S.sheet = 1; S.wxT = 0; }
    else if(S.sailSide === amura0){ S.wfT = -1; S.wxT = 0; }
    else { S.wfT = 0; S.sheet = 0.88; S.wxT = 0.4; }   // passat el vent, caçat: si s'atura 3 s, el repte torna a començar
    pas(); t += dt;
  }
  ok(ITIN.fets.has('virada'), `virada: superada en ${t.toFixed(1)} s amb el gest de virar`);
}
// tornar pel canal: carregar, fallar (fora del canal) i tornar-hi
{
  G('carregaRepte')('tornar');
  const n = G('itinNode')('tornar');
  ok(S.mode === 'mar' && Math.abs(A.normA(S.heading - Math.PI)) < 1e-9 && S.px > 5*L,
     `tornar: de tornada cap a la platja, desplaçat ${(S.px/M).toFixed(0)} m del canal`);
  ok(Math.abs(relVent() - n.th) < 0.5, `tornar: rumb de llarg (${relVent().toFixed(0)}°)`);
  // error: toca la sorra fora del canal (handleLanding torna a la platja amb un setTimeout)
  S.mode = 'final'; A.resetToBeach();
  G('itinTick')();
  ok(S.mode === 'mar' && S.px > 5*L && ITIN.actiu && ITIN.actiu.id === 'tornar',
     'tornar: després de tocar fora del canal, torna a la sortida del repte');
  // ara sí: dins del canal, cap a la sorra
  S.px = 0; S.py = A.shoreFn(0) - 1.5*L; S.heading = Math.PI;
  let t = 0; while(t < 15 && ITIN.actiu){ pas(); t += dt; }
  ok(ITIN.fets.has('tornar'), `tornar: superat en arribar a la sorra pel canal (${t.toFixed(1)} s)`);
}
// bolcada en un exercici: torna a la sortida del repte, no a la platja
{
  G('carregaRepte')('cenyida');
  S.capsized = 0.01; pas();
  ok(S.mode === 'mar' && G('repte').id === 'cenyida' && Math.abs(relVent() - 50) < 1,
     'bolcada: es recarrega la situació del repte (no comences des de la sorra)');
}

// ── REGATES ────────────────────────────────────────────────────────────────────
console.log('\nNIVELLS 4-5: REGATES\n');
for(const id of ['costaner', 'basto', 'triangle', 'equilater', 'rectangle']){
  G('carregaRepte')(id);
  const Ln = REG.linia;
  const sota = (S.px - Ln.p0[0])*Ln.amunt[0] + (S.py - Ln.p0[1])*Ln.amunt[1];
  ok(REG.fase === 'preparats' && REG.curs.id === id && S.mode === 'mar' && S.windKn === 12,
     `${id}: boies muntades, patí a l'aigua, 12 kn`);
  ok(sota < 0 && sota > -5*L && Math.abs(relVent() - 50) < 1,
     `${id}: a ${(-sota/M).toFixed(0)} m sota la línia, cenyint (${relVent().toFixed(0)}°)`);
  const posa = p => { S.px = p[0]; S.py = p[1]; };
  for(let v = 0; v < REG.voltes; v++){
    posa([Ln.p0[0] + Ln.amunt[0]*2*L, Ln.p0[1] + Ln.amunt[1]*2*L]); A.updateRegata(dt);
    for(const m of REG.marques.slice()){ posa(m.p); A.updateRegata(dt); }
    posa([Ln.p0[0] - Ln.amunt[0]*2*L, Ln.p0[1] - Ln.amunt[1]*2*L]); A.updateRegata(dt);
  }
  G('itinTick')();
  ok(ITIN.fets.has(id) && obert('ovSuperat') && !obert('ovFinal'),
     `${id}: ${REG.voltes} ${REG.voltes > 1 ? "voltes" : "volta"} → superat (el resum surt a la pantalla de felicitació)`);
}

// ── PROGRÉS ────────────────────────────────────────────────────────────────────
console.log('\nPROGRÉS\n');
ok(ITIN.fets.size === 11, `tot l'itinerari superat (${ITIN.fets.size}/11)`);
{
  const codi = G('codiProgres')();
  ITIN.fets = new Set(['canal', 'cenyida']);
  const parcial = G('codiProgres')();
  ok(JSON.stringify(G('llegeixCodi')(parcial)) === '["canal","cenyida"]', `codi ${parcial}: es recupera el mateix progrés`);
  ok(G('llegeixCodi')(codi).length === 11, `codi ${codi}: tot l'itinerari`);
  ok(G('llegeixCodi')(parcial.slice(0, -1) + (parcial.endsWith('Z') ? 'Y' : 'Z')) === null, 'un codi mal copiat es rebutja');
  ok(G('llegeixCodi')('hola') === null, 'un text qualsevol es rebutja');
}
// el repte a mitges es manté en tornar a començar la partida, però el progrés no es perd
{
  ITIN.fets = new Set(['canal']);
  G('carregaRepte')('traves');
  G('novaPartida')();
  ok(ITIN.actiu === null && ITIN.fets.has('canal'), 'nova partida: atura el repte però conserva el progrés');
}

console.log(fall ? `\n${fall} FALLADES ✗` : '\nTot correcte ✔');
process.exit(fall ? 1 : 0);
