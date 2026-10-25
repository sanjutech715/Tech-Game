// Chicken Road Rush server — zero dependencies. Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3001,PIN=fs.readFileSync(path.join(__dirname,'.admin-pin'),'utf8').trim(),MAX_OUTS=5,MINUTES=30,DB=path.join(__dirname,'data.json');
// [question, options, correctIndex]  (answers stay on the server, never sent to students)
const Q=[
["A number is increased by 20% and becomes 240. Find the original number.",["180","200","220","210"],1],
["Find the average of 12, 18, 24, 30 and 36.",["20","22","24","26"],2],
["A person completes a task in 12 days. What fraction can be completed in 3 days at a constant rate?",["1/2","1/3","1/4","1/6"],2],
["Find the next number: 3, 6, 12, 24, ___",["36","42","48","54"],2],
["If CODE is written as DPEF by shifting each letter one position forward, how is JAVA written?",["KBWB","KAWA","IBUB","KBVA"],0],
["Find the odd one out.",["Stack","Queue","Linked List","Compiler"],3],
["A person faces east, turns left, and then turns left again. Which direction is the person facing?",["North","South","East","West"],3],
["Complete the series: 1, 4, 9, 16, 25, ___",["30","35","36","49"],2],
["Choose the grammatically correct sentence.",["She have completed the project.","She has completed the project.","She is complete the project.","She completing the project."],1],
["Fill in the blank: He has been studying MCA ___ two years.",["since","for","from","by"],1],
["Choose the synonym of “efficient”.",["Wasteful","Productive","Careless","Slow"],1],
["Choose the correct passive voice: “The programmer developed the application.”",["The application is developed by the programmer.","The application was developed by the programmer.","The application has develop by the programmer.","The programmer was developed by the application."],1],
["What is the output? print(10 // 3)",["3.33","3","1","4"],1],
["Which keyword is used to define a function in Python?",["function","def","fun","define"],1],
["What is the output? x = [10, 20, 30]; print(x[-1])",["10","20","30","Error"],2],
["What is the average-case time complexity of searching for a value in an unsorted Python list using linear search?",["O(1)","O(log n)","O(n)","O(n²)"],2],
["Which Python data structure stores key-value pairs?",["List","Tuple","Dictionary","Set"],2],
["What is the output? int a = 7, b = 2; printf(\"%d\", a / b);",["3","3.5","4","2"],0],
["Which operator returns the address of a variable in C?",["*","&","%","->"],1],
["Which function is used to allocate memory dynamically in C?",["strlen()","malloc()","printf()","strcmp()"],1],
["What is the first valid index of an array in C?",["-1","0","1","2"],1],
["Which feature allows multiple functions to have the same name but different parameter lists?",["Inheritance","Function overloading","Encapsulation","Abstraction"],1],
["What is the main purpose of a constructor in C++?",["To destroy an object","To initialise an object","To compile a program","To declare a header file"],1],
["Which OOP concept allows a derived class to acquire properties and behaviour from a base class?",["Polymorphism","Encapsulation","Inheritance","Abstraction"],2],
["What is the output? int x = 5; cout << x++;",["4","5","6","Error"],1],
["Which SQL command retrieves data from a database?",["INSERT","UPDATE","SELECT","DELETE"],2],
["Which data structure follows the FIFO principle?",["Stack","Queue","Tree","Graph"],1],
["What is the primary purpose of an operating system?",["To design websites","To manage computer hardware and software resources","To write source code automatically","To create database tables only"],1],
["What does HTTP primarily enable?",["Communication between web clients and web servers","Memory allocation in C","Compilation of Python code","Management of CPU registers"],0],
["During an MCA technical interview, which is the best way to explain a project listed on your resume?",["Describe only the project title.","Explain the problem, technologies used, your contribution, and the outcome.","Memorise the code without understanding it.","Explain only the theory without discussing your work."],1]];
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
