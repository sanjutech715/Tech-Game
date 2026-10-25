// Chicken Road Rush server — zero dependencies. Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path');
const Q=require('./api/[...path].js').questions;
const PORT=process.env.PORT||3001,PIN=fs.readFileSync(path.join(__dirname,'.admin-pin'),'utf8').trim(),MAX_OUTS=5,MINUTES=30,DB=path.join(__dirname,'data.json');
const SECTION_MAP='000011112222333334444555566666';
const shuffle=items=>{const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result};
const isPermutation=(items,length)=>Array.isArray(items)&&items.length===length&&items.every(Number.isInteger)&&new Set(items).size===length&&items.every(n=>n>=0&&n<length);
const prepareOrder=a=>{
 if(!isPermutation(a.questionOrder,Q.length)||!Array.isArray(a.choiceOrder)||a.choiceOrder.length!==Q.length||a.choiceOrder.some((order,i)=>!isPermutation(order,Q[i][1].length))){
  a.questionOrder=shuffle(Q.map((_,i)=>i));a.choiceOrder=Q.map(q=>shuffle(q[1].map((_,i)=>i)));
 }
};
let D={};try{D=JSON.parse(fs.readFileSync(DB))}catch{}
let tm;const clients=new Set(),publicClients=new Set(),FLAGS=['copy','paste','menu','keys','fs','reload','idclash'];
const view=a=>{const o=a.ev.filter(e=>e.t=='out'),fl=a.ev.filter(e=>FLAGS.includes(e.t)).length,clash=a.ev.some(e=>e.t=='idclash');
 return{name:a.name,reg:a.reg,ua:a.ua,status:a.status,ev:a.ev,start:a.start,score:a.ans.filter((c,i)=>c===Q[i][2]).length,done:a.ans.filter(c=>c!=null).length,
 outs:o.length,away:o.reduce((s,e)=>s+(e.d||0),0),flags:fl,risk:o.length>=3||fl>=6||clash?'CHEATING':o.length>=1||fl>=2?'SUSPICIOUS':'CLEAN'}};
const publicBoard=()=>Object.values(D).map(a=>{const v=view(a);return{name:v.name,id:'***'+v.reg.slice(-3),score:v.score,done:v.done,status:v.status,outs:v.outs}});
const push=()=>{clearTimeout(tm);tm=setTimeout(()=>fs.writeFile(DB,JSON.stringify(D),()=>{}),300);
 const m='data: '+JSON.stringify(Object.values(D).map(view))+'\n\n',publicMessage='data: '+JSON.stringify(publicBoard())+'\n\n';clients.forEach(r=>r.write(m));publicClients.forEach(r=>r.write(publicMessage))};
const body=r=>new Promise(ok=>{let s='';r.on('data',c=>s+=c);r.on('end',()=>{try{ok(JSON.parse(s||'{}'))}catch{ok({})}})});
const send=(res,o,c=200)=>{res.writeHead(c,{'content-type':'application/json'});res.end(JSON.stringify(o))};
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://x'),p=u.pathname,admin=u.searchParams.get('pin')===PIN;
 if(req.method=='GET'){
  if(p=='/'||p=='/admin'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});return fs.createReadStream(path.join(__dirname,p=='/'?'index.html':'admin.html')).pipe(res)}
  if(p.startsWith('/api/admin')){
   if(!admin)return send(res,{error:'pin'},401);
   if(p.endsWith('data'))return send(res,Object.values(D).map(view));
   res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache',connection:'keep-alive'});clients.add(res);req.on('close',()=>clients.delete(res));return;
  }
  if(p=='/api/board')return send(res,publicBoard());
  if(p=='/api/board/stream'){
   res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','x-accel-buffering':'no',connection:'keep-alive'});res.write('data: '+JSON.stringify(publicBoard())+'\n\n');publicClients.add(res);req.on('close',()=>publicClients.delete(res));return;
  }
  return send(res,{error:'nope'},404);
 }
 const b=await body(req),reg=String(b.reg||'').trim().toUpperCase();
 if(req.method=='DELETE'&&p=='/api/admin/student'){
  if(!admin)return send(res,{error:'pin'},401);
  if(!reg)return send(res,{error:'Register number needed'},400);
  if(!Object.prototype.hasOwnProperty.call(D,reg))return send(res,{error:'Student not found'},404);
  delete D[reg];push();return send(res,{ok:true});
 }
 if(p=='/api/start'){
  const name=String(b.name||'').trim().slice(0,40);if(!name||!reg)return send(res,{error:'Name and register number needed'},400);
  let a=D[reg];
  if(!a)a=D[reg]={name,reg,ans:Array(Q.length).fill(null),ev:[],status:'playing',start:Date.now(),end:Date.now()+MINUTES*6e4,ua:req.headers['user-agent']||''};
  else if(a.status!='playing')return send(res,{error:'This ID has already submitted. One attempt only 😎'},409);
  else if(a.name.toLowerCase()!=name.toLowerCase()){a.ev.push({t:'idclash',at:Date.now(),r:name});push();return send(res,{error:'This register number belongs to someone else. Admin has been told 🚨'},403)}
  else a.ev.push({t:'reload',at:Date.now()});
  prepareOrder(a);
  push();return send(res,{qs:a.questionOrder.map(index=>({q:Q[index][0],o:a.choiceOrder[index].map(choice=>Q[index][1][choice]),section:+SECTION_MAP[index]})),ans:a.questionOrder.map(index=>a.ans[index]==null?null:a.choiceOrder[index].indexOf(a.ans[index])),end:a.end,maxOuts:MAX_OUTS,score:view(a).score,outs:view(a).outs});
 }
 const a=D[reg];if(!a||a.status!='playing')return send(res,{error:'closed'},400);
 if(Date.now()>a.end+5000){a.status='done';push();return send(res,{error:'time up'},400)}
 if(p=='/api/answer'){const i=+b.i,c=+b.c;if(!Number.isInteger(i)||i<0||i>=Q.length||!Number.isInteger(c)||c<0||c>=4)return send(res,{error:'bad'},400);prepareOrder(a);const question=a.questionOrder[i],choice=a.choiceOrder[question][c];if(a.ans[question]==null)a.ans[question]=choice;push();return send(res,{ok:a.ans[question]===Q[question][2],score:view(a).score})}
 if(p=='/api/event'){
  if(b.t=='back'){const e=[...a.ev].reverse().find(e=>e.t=='out'&&!e.d);if(e)e.d=Math.max(1,+b.d||1)}
  else if(['out','copy','paste','menu','keys','fs'].includes(b.t)&&a.ev.length<300)a.ev.push({t:b.t,at:Date.now(),d:0,r:String(b.r||'').slice(0,80)});
  const lock=a.ev.filter(e=>e.t=='out').length>=MAX_OUTS;if(lock)a.status='locked';push();return send(res,{locked:lock});
 }
 if(p=='/api/finish'){a.status='done';push();return send(res,{score:view(a).score})}
 send(res,{error:'nope'},404);
}).listen(PORT,'0.0.0.0',()=>console.log(`Students: http://localhost:${PORT}   Admin: http://localhost:${PORT}/admin  (PIN: ${PIN})`));
