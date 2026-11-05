// VIRADA PER AVANT COM L'EXPLICA L'ORIOL (v29), amb el gest real del joystick:
//  1) cenyida tancada, escota caçada;  2) pes a PROA i a BARLOVENT: el patí orsa fins al vent;
//  3) pas per l'eix: la vela flameja i el patró aguanta el pes endavant;
//  4) quan el vent entra per la nova banda, a la nova banda de barlovent i pes a POPA;
//  5) assegut a la nova amura, governant a cenyida.
// A la v28, si el patró anava a popa uns graus després de passar el vent (4°-8°, com qui
// espera que el vent entri per la nova banda), el patí es quedava aturat just passat el
// vent i el penell (escota caçada) el tornava a fer creuar: la vela tornava a la banda vella
// (a 8 kn amb 8°, i a 10-12 kn ja amb 4°). Aquí s'hi va a 1°, 4° i 8° després del vent.
const A = require('./_entorn.js')();
const S=A.S, F=A.F, D2R=A.D2R, R2D=A.R2D;
const PIN=()=>{ S.px=0; S.py=-A.CH.len*0.6; };
let fall=0, n=0;
const ok=(b,t)=>{ n++; if(!b){ fall++; console.log('  ✗ '+t); } };
const joy=document.getElementById('joy');
const dispara=(tipus,x,y)=>{ for(const f of joy._ev[tipus]||[]) f({pointerId:7,clientX:x,clientY:y,preventDefault(){}}); };
const dit=(bx,by)=>{ const a=A.angJoy(); return [35*(bx*Math.cos(a)+by*Math.sin(a)), -35*(-bx*Math.sin(a)+by*Math.cos(a))]; };
function virada(vista, kn, tk, despres){
  A.resetToBeach(); S.mode='mar'; S.everInWater=true; PIN(); S.windFrom=0; S.windKn=kn;
  while(A.cam.mode!==vista) A.toggleCamMode();
  S.heading=tk*48*D2R; S.speed=0.8; S.sheet=1; S.sailSide=tk; S.pulley=tk;
  S.wx=S.wxT=-0.86*tk; S.wf=S.wfT=0; S.angVel=0; A.cam.rot=-S.heading;
  const pas=()=>{ A.updateWeight(1/60); A.physics(1/60); PIN(); A.updateCamera(1/60); };
  for(let i=0;i<720;i++){ S.heading=tk*48*D2R; S.angVel=0; pas(); }
  const v0=S.speed*6;
  let fx=0, fy=0, k=0;
  dispara('pointerdown',0,0);
  const pes=(bx,by)=>{ const [ex,ey]=dit(bx-A.joySt.vx, by-A.joySt.vy); fx+=ex; fy+=ey; };
  const h=()=>tk*A.normA(S.heading)*R2D;
  let passada=false, torna=false, nEix=0, flapEix=0, tVent=null, t=0;
  const frame=()=>{ k++; dispara('pointermove', fx+Math.sin(k)*0.6, fy+Math.cos(k*1.3)*0.6); pas(); t+=1/60;
    if(Math.abs(h())<6){ nEix++; if(F.flap) flapEix++; }
    if(S.sailSide===-tk) passada=true; else if(passada) torna=true; };
  pes(-0.6*tk, 0.9);                                         // 2) proa i barlovent
  for(let i=0;i<600 && h()>=4;i++) frame();
  tVent = h()<4 ? t : null;
  pes(0, 0.5);                                               // 3) aguanta el pes endavant
  for(let i=0;i<360 && h()>=-despres;i++) frame();
  pes(0.6*tk, -0.9);                                         // 4) nova banda i pes a popa
  for(let i=0;i<600;i++){ S.sheet=Math.max(0.9, S.sheet-(1/60)*0.025); frame(); }
  let tCenyint=null;                                         // 5) assegut, governant a 48°
  for(let i=0;i<720;i++){
    if(i%18===0){ const want=Math.max(-0.9, Math.min(0.9, F.wfBal + 0.035*(Math.abs(h())-48)));
      if(Math.abs(want-A.joySt.vy)>0.05) pes(0.86*tk, want); }
    frame();
    if(tCenyint===null && passada && h()<-40 && h()>-60 && S.speed*6>0.8*v0) tCenyint=t;
  }
  dispara('pointerup',0,0);
  return { passada, torna, tVent, flap:nEix?flapEix/nEix:0, h:h(), tCenyint };
}
console.log('VIRADA PER AVANT COM L\'EXPLICA L\'ORIOL (gest real del joystick)\n');
for(const vista of ['nord','popa']){
  for(const kn of [5,8,10,12]){
    const fila=[];
    for(const despres of [1,4,8]) for(const tk of [1,-1]){
      const r=virada(vista,kn,tk,despres);
      const nom=`${vista}, ${kn} kn, amura ${tk>0?'+':'-'}, a popa ${despres}° passat el vent`;
      ok(r.tVent!==null, `${nom}: amb el pes a proa i a barlovent no arriba al vent en 10 s`);
      ok(r.flap>0.9, `${nom}: a l'eix del vent la vela només flameja el ${(r.flap*100).toFixed(0)}% del temps`);
      ok(r.passada && !r.torna && r.h<-20, `${nom}: ${!r.passada?'la vela no passa':r.torna?'la vela torna a la banda vella':'no queda a la nova amura'} (rumb ${r.h.toFixed(0)}°)`);
      ok(r.tCenyint!==null, `${nom}: no torna a cenyir a la nova amura amb el 80% de la velocitat`);
      if(r.tCenyint!==null) fila.push(r.tCenyint);
    }
    console.log(`  ${vista} ${kn} kn: torna a cenyir a la nova amura entre ${Math.min(...fila).toFixed(1)} i ${Math.max(...fila).toFixed(1)} s`);
  }
}

// Gest i passos comuns per a les maniobres següents (vista nord).
function prepara(kn, tk, rumb, escota, wx, wf){
  A.resetToBeach(); S.mode='mar'; S.everInWater=true; PIN(); S.windFrom=0; S.windKn=kn;
  while(A.cam.mode!=='nord') A.toggleCamMode();
  S.heading=tk*rumb*D2R; S.speed=0.8; S.sheet=escota; S.sailSide=tk; S.pulley=tk;
  S.wx=S.wxT=wx; S.wf=S.wfT=wf; S.angVel=0; A.cam.rot=-S.heading;
  const pas=()=>{ A.updateWeight(1/60); A.physics(1/60); PIN(); A.updateCamera(1/60); };
  for(let i=0;i<720;i++){ S.heading=tk*rumb*D2R; S.angVel=0; pas(); }
  let fx=0, fy=0, k=0; dispara('pointerdown',0,0);
  return {
    pes(bx,by){ const [ex,ey]=dit(bx-A.joySt.vx, by-A.joySt.vy); fx+=ex; fy+=ey; },
    frame(){ k++; dispara('pointermove', fx+Math.sin(k)*0.6, fy+Math.cos(k*1.3)*0.6); pas(); },
    h(){ return tk*A.normA(S.heading)*R2D; },
    fi(){ dispara('pointerup',0,0); }
  };
}
// ATURAT PROA AL VENT (consell de l'Oriol): vela a la contra (escota a mitges) i pes a popa
// a la nova banda. A la v28 la proa queia per l'amura VELLA i la vela tornava: el rescat de la
// fula feia caure la proa cap a sign(t) en lloc de cap a la banda on penja la vela.
console.log('\nATURAT PROA AL VENT: vela a la contra i pes a popa a la nova banda');
for(const kn of [5,8,10,12]){
  const temps=[];
  for(const tk of [1,-1]){
    const m=prepara(kn, tk, 48, 1, -0.86*tk, 0);
    S.heading=tk*3*D2R; S.speed=0; S.angVel=0; S.sheet=0.5;
    m.pes(0.6*tk, -0.9);
    let passada=false, torna=false, tSurt=null, vella=false;
    for(let i=0;i<60*20;i++){ m.frame();
      if(S.sailSide===-tk) passada=true; else if(passada) torna=true;
      if(m.h()<-35 && S.speed*6>1){ tSurt=i/60; break; }
      if(!passada && m.h()>35 && S.speed*6>1){ vella=true; break; } }
    m.fi();
    const nom=`aturat ${kn} kn, amura ${tk>0?'+':'-'}`;
    ok(tSurt!==null && !torna, `${nom}: no surt per la nova amura (${vella?'cau per l\'amura vella':torna?'la vela torna':'encallat'})`);
    ok(tSurt===null || tSurt<15, `${nom}: tarda ${tSurt?.toFixed(1)} s a sortir`);
    if(tSurt!==null) temps.push(tSurt);
  }
  console.log(`  ${kn} kn: surt per la nova amura en ${temps.length?Math.min(...temps).toFixed(1)+'-'+Math.max(...temps).toFixed(1)+' s':'—'}`);
}
// TRASLUIXADA: llarg a 150°, pes a popa i a sotavent, amollant. La vela ha de creuar a prop de la
// popa redona. A la v28 la politja es quedava clavada al centre (el patró l'empenyia segons el
// signe de la politja, que es girava en passar el mig) i creuava a 132-136° de l'amura nova.
console.log('\nTRASLUIXADA: pes a popa i a sotavent');
for(const kn of [5,8,10,12]){
  const angles=[];
  for(const tk of [1,-1]){
    const m=prepara(kn, tk, 150, 0.15, -0.5*tk, -0.4);
    m.pes(0.7*tk, -0.9);
    let hCreua=null;
    for(let i=0;i<60*14;i++){ S.sheet=Math.max(0.05, S.sheet-(1/60)*0.03); m.frame();
      if(S.sailSide===-tk){ hCreua=m.h(); break; } }
    m.fi();
    const nom=`trasluixada ${kn} kn, amura ${tk>0?'+':'-'}`;
    ok(hCreua!==null, `${nom}: la vela no creua en 14 s`);
    // graus més enllà de la popa redona, a l'amura nova (h < 0): 0° = popa redona
    const passat = (hCreua===null || hCreua>0) ? null : 180 - Math.abs(hCreua);
    ok(passat!==null && passat<25, `${nom}: la vela creua ${passat===null?'abans de la popa redona':passat.toFixed(0)+'° més enllà de la popa redona'} (màx 25°)`);
    if(passat!==null) angles.push(passat);
  }
  console.log(`  ${kn} kn: la vela creua ${angles.length?Math.min(...angles).toFixed(0)+'-'+Math.max(...angles).toFixed(0)+'°':'—'} més enllà de la popa redona`);
}
console.log(fall ? `\n═══ ${fall} de ${n} COMPROVACIONS DE MANIOBRES FALLEN ✗ ═══` : `\n═══ LES ${n} COMPROVACIONS DE LES MANIOBRES DE L'ORIOL PASSEN ✔ ═══`);
process.exit(fall?1:0);
