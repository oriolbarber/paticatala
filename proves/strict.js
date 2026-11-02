const fs=require('fs');
const html=fs.readFileSync('pati_vela_mobil.html','utf8');
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const noop=()=>{};
const fakeCtx=new Proxy({},{get:(t,p)=>{
  if(p==='createLinearGradient'||p==='createRadialGradient')return()=>({addColorStop:noop});
  return typeof p==='string'?noop:undefined;}});
const store={};
function makeEl(id){return{id,style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},
  addEventListener:noop,setAttribute:noop,getContext:()=>fakeCtx,appendChild:noop,
  getBoundingClientRect:()=>({top:0,left:0,width:100,height:300}),setPointerCapture:noop,
  textContent:'',innerHTML:'',value:12};}
global.window={innerWidth:390,innerHeight:780,devicePixelRatio:2,addEventListener:noop,requestAnimationFrame:noop};
global.innerWidth=390;global.innerHeight=780;global.devicePixelRatio=2;global.addEventListener=noop;
global.requestAnimationFrame=noop;global.performance={now:()=>0};global.setTimeout=noop;global.clearTimeout=noop;
global.navigator={maxTouchPoints:0};
global.location={search:'',href:'file:///pati_vela_mobil.html'};
global.history={length:1,back:()=>{}};
global.document={
  getElementById:id=>{ if(!ids.has(id)){ console.log('getElementById NUL:', id); return null; }
    return store[id]||(store[id]=makeEl(id)); },
  createElement:()=>makeEl('x'), addEventListener:noop };
try{ eval(js.replace(/^'use strict';/,'')); console.log('OK carrega sense errors'); }
catch(e){ console.log('ERROR de carrega:', e.message, '\n', e.stack.split('\n').slice(0,3).join('\n')); }
