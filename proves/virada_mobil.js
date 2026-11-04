// VIRADA AMB ELS CONTROLS DEL MÒBIL. El dit només mou el pes (S.wxT, S.wfT: joystick o
// arrossegar el patró) i l'escota es queda on era. L'Oriol, a la v22: anant cap a popa per
// sotavent, la vela passava però tornava al costat de l'inici al cap de pocs segons.
// La seqüència: cenyida a 48°, pes endavant i al centre fins al vent (o 20° abans), cap a
// popa per la banda de la vela 6 s, i asseure's al nou barlovent. Ha d'acabar amb el
// carro i la vela a l'amura nova, i no tornar.
const A = require('./_entorn.js')();
const S=A.S, D2R=A.D2R, R2D=A.R2D;
const PIN=()=>{ S.px=0; S.py=-A.CH.len*0.6; };
let fall=0, n=0;
const ok=(b,t)=>{ n++; if(!b){ fall++; console.log('  ✗ '+t); } };
function virada(kn, tk, escota, abans, banda){
  A.resetToBeach(); S.mode='mar'; S.everInWater=true; PIN(); S.windFrom=0; S.windKn=kn;
  S.heading=tk*48*D2R; S.speed=0.8; S.sheet=escota; S.sailSide=tk; S.pulley=tk;
  S.wx=S.wxT=-0.86*tk; S.wf=S.wfT=0; S.angVel=0;
  for(let i=0;i<900;i++){ S.heading=tk*48*D2R; S.angVel=0; A.updateWeight(1/60); A.physics(1/60); PIN(); }
  let fase=1, t0=0, torna=false, passada=false;
  for(let i=0;i<60*30;i++){
    const t=i/60, h=tk*A.normA(S.heading)*R2D;
    if(fase===1){ S.wfT=0.9; S.wxT=0; if(h<=abans){ fase=2; t0=t; } }
    else if(fase===2){ S.wfT=-0.9; S.wxT=banda*0.6*tk; if(t>t0+6) fase=3; }
    else { S.wfT=0; S.wxT=0.86*tk; }
    A.updateWeight(1/60); A.physics(1/60); PIN();
    if(S.sailSide===-tk) passada=true;
    else if(passada) torna=true;                 // un cop passada, la vela no pot tornar
  }
  const h=tk*A.normA(S.heading)*R2D;
  return {h, carro:S.pulley*tk, vela:S.sailSide*tk, torna, passada, kn:S.speed*6};
}
console.log('VIRADA AMB ELS CONTROLS DEL MÒBIL\n');
for(const kn of [5,8,10,12]){
  const fila=[];
  for(const escota of [1,0.85]) for(const abans of [0,20]) for(const banda of [1,0,-1]) for(const tk of [1,-1]){
    const r=virada(kn,tk,escota,abans,banda);
    const nom=`${kn} kn, amura ${tk>0?'+':'-'}, escota ${escota}, a popa ${abans?abans+'° abans del vent':'en passar el vent'}, ${banda>0?'per sotavent':banda<0?'per barlovent':'pel centre'}`;
    ok(r.passada && !r.torna && r.vela===-1 && r.carro<-0.5 && r.h<0,
       `${nom}: rumb ${r.h.toFixed(0)}°, carro ${r.carro.toFixed(2)}, vela ${r.vela>0?'a la banda vella':'a la nova'}${r.torna?', ha tornat':''}`);
    fila.push(r.h);
  }
  console.log(`  ${kn} kn: rumb final de ${Math.max(...fila).toFixed(0)}° a ${Math.min(...fila).toFixed(0)}° (negatiu = amura nova)`);
}
// AMB EL GEST REAL DEL JOYSTICK (v28), com l'Oriol: el dit al joystick, primer a l'altra
// banda i després cap a popa, i allà quiet (tremolant una mica, com un dit de veritat).
// A la v27, a la zenital nord, el dit quiet a «popa» passava a voler dir «una banda» a
// mesura que la silueta girava amb el patí: el pes se n'anava a barlovent, el patí no
// orsava i la vela tornava. Les direccions del dit es prenen de la silueta que es veu en
// aquell moment, i cada fotograma passen pel pointerdown/pointermove del joystick.
const joy=document.getElementById('joy');
const dispara=(tipus,x,y)=>{ for(const f of joy._ev[tipus]||[]) f({pointerId:7,clientX:x,clientY:y,preventDefault(){}}); };
// on ha d'anar el dit (px de pantalla, y avall) per demanar banda bx i proa by al patí que es veu
const dit=(bx,by)=>{ const a=A.angJoy(); return [35*(bx*Math.cos(a)+by*Math.sin(a)), -35*(-bx*Math.sin(a)+by*Math.cos(a))]; };
// directe = el mateix pes posat a S.wxT/S.wfT, sense joystick (per comparar)
function viradaGest(vista, kn, tk, escota, directe){
  A.resetToBeach(); S.mode='mar'; S.everInWater=true; PIN(); S.windFrom=0; S.windKn=kn;
  while(A.cam.mode!==vista) A.toggleCamMode();
  S.heading=tk*48*D2R; S.speed=0.8; S.sheet=escota; S.sailSide=tk; S.pulley=tk;
  S.wx=S.wxT=-0.86*tk; S.wf=S.wfT=0; S.angVel=0; A.cam.rot=-S.heading;
  const pas=()=>{ A.updateWeight(1/60); A.physics(1/60); PIN(); A.updateCamera(1/60); if(vista==='persp') A.renderWorld(1/60); };
  for(let i=0;i<600;i++){ S.heading=tk*48*D2R; S.angVel=0; pas(); }
  if(!directe) dispara('pointerdown',0,0);
  let passada=false, torna=false, deriva=0, k=0;
  // a l'altra banda, cap a popa 7 s, i asseure's al barlovent nou, sense aixecar el dit
  let fx=0, fy=0, w0=null;                    // el dit, en px des del centre del joystick
  for(const [bx,by,seg] of [[0.86*tk,0,2.5],[0.6*tk,-0.9,7],[0.86*tk,0,12]]){
    const m=Math.max(1, Math.hypot(bx,by));   // el pes que demana: dins del cercle
    // com una persona: des d'on és el dit, el mou fins on vol el pom, tal com veu el patí ara
    if(!directe){ const [ex,ey]=dit(bx-(A.joySt.vx ?? S.wxT), by-(A.joySt.vy ?? S.wfT)); fx+=ex; fy+=ey; }
    for(let i=0;i<seg*60;i++){
      k++;
      if(directe){ S.wxT=bx/m; S.wfT=by/m; } else dispara('pointermove', fx+Math.sin(k)*0.6, fy+Math.cos(k*1.3)*0.6);
      pas();
      // amb el dit quiet, el pes no s'ha de moure encara que el patí giri
      if(i===30) w0=[S.wxT, S.wfT];
      if(i>30) deriva=Math.max(deriva, Math.hypot(S.wxT-w0[0], S.wfT-w0[1]));
      if(S.sailSide===-tk) passada=true; else if(passada) torna=true;
    }
  }
  if(!directe) dispara('pointerup',0,0);
  return { passada, torna, vela:S.sailSide*tk, h:tk*A.normA(S.heading)*R2D, deriva };
}
// Amb l'escota a mitges, aquesta seqüència (primer de banda, després a popa) no vira ni
// posant el pes directament, de la v23 ençà: amollada, la vela no fa orsar prou. Aquí
// només es demana que el gest faci el mateix que el pes directe.
console.log('\nAMB EL GEST REAL DEL JOYSTICK: canviar de banda, pes a popa i asseure\'s al barlovent nou');
for(const vista of ['nord','popa','persp']){
  const fila=[]; let viren=0, tot=0;
  for(const kn of [5,8,10,12]) for(const escota of [1,0.5]) for(const tk of [1,-1]){
    const r=viradaGest(vista,kn,tk,escota), d=viradaGest(vista,kn,tk,escota,true);
    const bona=x=>x.passada && !x.torna && x.vela===-1;
    const nom=`${vista}, ${kn} kn, amura ${tk>0?'+':'-'}, escota ${escota}`;
    ok(r.deriva<0.12, `${nom}: amb el dit quiet el pes s'ha desplaçat ${r.deriva.toFixed(2)}`);
    ok(bona(r)===bona(d), `${nom}: amb el dit ${bona(r)?'vira':'no vira'} i posant el pes directament ${bona(d)?'vira':'no vira'}`);
    if(escota===1) ok(bona(r), `${nom}: ${!r.passada?'la vela no ha passat':r.torna?'la vela ha tornat a la banda vella':'la vela no és a la banda nova'} (rumb ${r.h.toFixed(0)}°)`);
    fila.push(r.deriva); tot++; if(bona(r)) viren++;
  }
  console.log(`  ${vista}: viren ${viren} de ${tot} (totes les caçades); el dit quiet desplaça el pes com a molt ${Math.max(...fila).toFixed(2)}`);
}
console.log(fall ? `\n═══ ${fall} de ${n} VIRADES FALLEN ✗ ═══` : `\n═══ LES ${n} COMPROVACIONS DE VIRADA PASSEN ✔ ═══`);
process.exit(fall?1:0);
