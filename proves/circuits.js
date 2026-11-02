// CIRCUITS DE MAR OBERT: els dos triangles es comproven per geometria amb el vent a
// totes les bandes, sense copiar cap fórmula del simulador.
const carrega=require('./_entorn.js');
const A=carrega(), {S,L,REG,CURSES}=A;
const M=L/5.6, R2D=180/Math.PI;
let fall=0;
const ok=(c,t)=>{ if(!c) fall++; console.log(`  ${c?'✔':'✗'} ${t}`); };
const d=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1])/M;
const ang=(p,v,q)=>{ const a=[p[0]-v[0],p[1]-v[1]], b=[q[0]-v[0],q[1]-v[1]];
  return Math.acos((a[0]*b[0]+a[1]*b[1])/Math.hypot(...a)/Math.hypot(...b))*R2D; };
const curs=id=>CURSES.find(c=>c.id===id);
const munta=(id,w)=>{ S.windFrom=w; A.muntaRegata(curs(id));
  const [b1,b2,b3]=REG.marques.map(m=>m.p), Ln=REG.linia;
  const ext=[1,-1].map(k=>[Ln.p0[0]+Ln.trav[0]*Ln.semi*k, Ln.p0[1]+Ln.trav[1]*Ln.semi*k]);
  return {b1,b2,b3,Ln,tots:[b1,b2,b3,...ext]}; };
const near=(a,b,e)=>Math.abs(a-b)<e;
let geoE=true, geoR=true, costa=1e9, sep=1e9, sentit=true, eix=true, linia=true, limit=true;
for(let g=0;g<360;g+=5){
  const w=g*Math.PI/180, e=munta('equilater',w), r=munta('rectangle',w);
  geoE = geoE && near(d(e.b1,e.b3),463,.5) && near(d(e.b1,e.b2),463,.5) && near(d(e.b2,e.b3),463,.5)
    && near(ang(e.b3,e.b1,e.b2),60,.1) && near(ang(e.b1,e.b2,e.b3),60,.1) && near(ang(e.b2,e.b3,e.b1),60,.1);
  geoR = geoR && near(d(r.b1,r.b3),463,.5) && near(d(r.b1,r.b2),463*Math.SQRT1_2,.5) && near(d(r.b2,r.b3),463*Math.SQRT1_2,.5)
    && near(ang(r.b1,r.b2,r.b3),90,.1) && near(ang(r.b3,r.b1,r.b2),45,.1) && near(ang(r.b2,r.b3,r.b1),45,.1);
  for(const c of [e,r]){
    const up=[Math.sin(w),-Math.cos(w)], u=[c.b1[0]-c.b3[0],c.b1[1]-c.b3[1]], n=Math.hypot(...u);
    eix = eix && near((u[0]*up[0]+u[1]*up[1])/n,1,1e-9);
    // de B1 a B2 i a B3 es gira sempre cap al mateix costat, a l'esquerra: boies per babord
    const cr=(a,b,c2)=>(b[0]-a[0])*(c2[1]-b[1])-(b[1]-a[1])*(c2[0]-b[0]);
    sentit = sentit && cr(c.b3,c.b1,c.b2)<0 && cr(c.b1,c.b2,c.b3)<0;
    linia = linia && near(c.Ln.trav[0]*up[0]+c.Ln.trav[1]*up[1],0,1e-9);
    for(const p of c.tots){ costa=Math.min(costa,(A.shoreFn(p[0])-p[1])/M); limit=limit&&(-p[1]/M<5556)&&(Math.abs(p[0])/M<5556); }
  }
  for(const p of e.tots) for(const q of r.tots) sep=Math.min(sep,d(p,q));
}
console.log('\nCIRCUITS PER A 72 DIRECCIONS DE VENT\n');
ok(geoE,'equilàter: tres cames de 463 m i tres angles de 60°');
ok(geoR,'rectangle: barlovent 463 m, cames 327 m, 45-90-45 amb el recte a B2');
ok(eix,'B1 és exactament vent amunt de B3');
ok(sentit,'totes les boies es deixen per babord');
ok(linia,'la línia de sortida és perpendicular al vent');
ok(costa>=1000,`mai a menys d'1 km de la costa (mínim ${costa.toFixed(0)} m)`);
ok(sep>=500,`mai a menys de 500 m entre circuits (mínim ${sep.toFixed(0)} m)`);
ok(limit,'tot queda dins del límit de 3 milles');
// el gir de cada boia
{ const w=170*Math.PI/180, gir=(a,b,c)=>180-ang(a,b,c);
  const e=munta('equilater',w), r=munta('rectangle',w);
  ok(near(gir(e.b3,e.b1,e.b2),120,.1)&&near(gir(e.b1,e.b2,e.b3),120,.1),'equilàter: gir de 120° a B1 i B2');
  ok(near(gir(r.b3,r.b1,r.b2),135,.1)&&near(gir(r.b1,r.b2,r.b3),90,.1),'rectangle: gir de 135° a B1 i de 90° a B2'); }
// sortida i regata sencera
console.log('\nUNA REGATA COMPLETA\n');
for(const id of ['equilater','rectangle']){
  A.resetToBeach(); S.windFrom=1; munta(id,1); A.colocaALinia();
  ok(S.mode==='mar' && REG.fase==='preparats', `${id}: surt a la línia, a mar`);
  const Ln=REG.linia, posa=p=>{S.px=p[0];S.py=p[1];};
  const fora=[Ln.p0[0]+Ln.amunt[0]*2*L, Ln.p0[1]+Ln.amunt[1]*2*L];
  posa(fora); A.updateRegata(1/60);
  ok(REG.fase==='navegant', `${id}: en creuar la línia arrenca el cronòmetre`);
  for(const m of REG.marques.slice()){ posa(m.p); A.updateRegata(1/60); }
  ok(REG.fita===3, `${id}: passa les tres boies en ordre`);
  posa([Ln.p0[0]-Ln.amunt[0]*2*L, Ln.p0[1]-Ln.amunt[1]*2*L]); A.updateRegata(1/60);
  posa(fora); A.updateRegata(1/60);
  ok(REG.fase==='acabada', `${id}: en tornar a creuar la línia s'acaba`);
}
console.log(fall?`\n═══ ${fall} FALLADES ✗ ═══\n`:'\n═══ CIRCUITS CORRECTES ✔ ═══\n');
process.exit(fall?1:0);
