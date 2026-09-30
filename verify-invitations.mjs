import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const tabs = await fetch('http://127.0.0.1:9333/json').then(r=>r.json());
const ws = new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0; const queue=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(queue.has(m.id)){queue.get(m.id)(m);queue.delete(m.id)}});
function send(method,params={}){return new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>reject(new Error(method+' timeout')),15000);queue.set(key,m=>{clearTimeout(timer);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result)});ws.send(JSON.stringify({id:key,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];
for(const width of [320,390,768,1440]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
 for(const file of fs.readdirSync('invitations').filter(f=>f.endsWith('.html'))){
  await send('Page.navigate',{url:pathToFileURL(process.cwd()+'/invitations/'+file).href});
  await pause(350);
  await evaluate('document.fonts.ready.then(()=>true)');
  const gate=await evaluate(`(()=>{const b=document.querySelector('[data-open-invitation]').getBoundingClientRect();return {fits:b.right<=innerWidth&&b.bottom<=innerHeight, width:innerWidth}})()`);
  await evaluate("document.querySelector('[data-open-invitation]').click()");
  await pause(1550);
  const layout=await evaluate(`(()=>{const titles=[...document.querySelectorAll('main .couple-title')];const overlaps=titles.some(t=>{const a=[...t.children].map(x=>x.getBoundingClientRect());return a.some((b,i)=>i>0&&b.top<a[i-1].bottom-1)});const overflow=[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)}).map(e=>e.className||e.tagName).slice(0,8);return {overlaps,overflow,height:document.documentElement.scrollHeight,sections:document.querySelectorAll('main>section').length}})()`);
  const controls=await evaluate(`(()=>{document.querySelector('[data-photo]').click();const photo=document.querySelector('.photo-dialog').open;document.querySelector('.photo-close').click();document.querySelector('.story-finale .rsvp-trigger').click();const rsvp=document.querySelector('.rsvp-dialog').open;document.querySelector('.rsvp-close').click();return {photo,rsvp}})()`);
  results.push({file,width,gate,...layout,...controls});
  if(file==='06-lua-ngoc.html'&&width===390){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('verification-silk-mobile.png',Buffer.from(shot.data,'base64'))}
 }
}
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await send('Page.reload');await pause(500);
await evaluate("document.querySelector('[data-open-invitation]').click()");
await pause(100);
const reduced=await evaluate("[...document.querySelectorAll('main h1')].every(e=>getComputedStyle(e).opacity==='1')");
console.log(JSON.stringify({results,reduced},null,2));
ws.close();
if(results.some(r=>!r.gate.fits||r.overlaps||r.overflow.length||!r.photo||!r.rsvp)||!reduced)process.exitCode=1;
