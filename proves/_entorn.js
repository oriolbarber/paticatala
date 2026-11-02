// entorn simulat compartit per les proves de física
const noop=()=>{};
const fakeCtx=new Proxy({},{get:(t,p)=>{if(p==='createLinearGradient'||p==='createRadialGradient')return()=>({addColorStop:noop});return typeof p==='string'?noop:undefined;}});
const store={};function el(id){return{id,style:{},classList:{_s:new Set(),add(...c){c.forEach(x=>this._s.add(x));},remove(...c){c.forEach(x=>this._s.delete(x));},toggle(c,v){v?this._s.add(c):this._s.delete(c);},contains(c){return this._s.has(c);}},addEventListener:noop,setAttribute:noop,getContext:()=>fakeCtx,appendChild:noop,getBoundingClientRect:()=>({top:0,left:0,right:0,bottom:0,width:0,height:0}),setPointerCapture:noop,textContent:"",innerHTML:"",value:12};}
global.window={innerWidth:390,innerHeight:780,devicePixelRatio:2,addEventListener:noop,requestAnimationFrame:noop};
global.innerWidth=390;global.innerHeight=780;global.devicePixelRatio=2;global.addEventListener=noop;global.requestAnimationFrame=noop;global.performance={now:()=>0};
global.getComputedStyle=()=>({display:'block',visibility:'visible'});
global.document={getElementById:id=>(store[id]||(store[id]=el(id))),createElement:()=>el('nou'),addEventListener:noop};
global.navigator={maxTouchPoints:0};global.setTimeout=noop;global.clearTimeout=noop;
global.location={search:'',href:'file:///pati_vela_mobil.html'};
global.history={length:1,back:()=>{}};
module.exports = function carrega(extra){
  let src=require("fs").readFileSync("simM.js","utf8").replace(/^'use strict';/,"");
  src+="\n;globalThis.__api={physics,updateWeight,S,F,CH,cam,resetToBeach,renderWorld,updateCamera,shoreFn,normA,D2R,R2D,L,RIG,aparell,calatRel,MANS,agafada,maEscota,patroZen,actualitzaMans,ABAST};\n";
  (0,eval)(src);
  return globalThis.__api;
};
