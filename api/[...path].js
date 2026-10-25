const crypto=require('crypto');
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
["During an MCA technical interview, which is the best way to explain a project listed on your resume?",["Describe only the project title.","Explain the problem, technologies used, your contribution, and the outcome.","Memorise the code without understanding it.","Explain only the theory without discussing your work."],1]
];

const MAX_OUTS=5,MINUTES=30,SECTION_MAP='000011112222333334444555566666';
const FLAGS=['copy','paste','menu','keys','fs','reload','idclash'];
const shuffle=items=>{const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result};
const isPermutation=(items,length)=>Array.isArray(items)&&items.length===length&&items.every(Number.isInteger)&&new Set(items).size===length&&items.every(n=>n>=0&&n<length);
const prepareOrder=a=>{
 if(!isPermutation(a.questionOrder,Q.length)||!Array.isArray(a.choiceOrder)||a.choiceOrder.length!==Q.length||a.choiceOrder.some((order,i)=>!isPermutation(order,Q[i][1].length))){
  a.questionOrder=shuffle(Q.map((_,i)=>i));a.choiceOrder=Q.map(q=>shuffle(q[1].map((_,i)=>i)));
 }
};
const view=a=>{
 const events=Array.isArray(a.ev)?a.ev:[],answers=Array.isArray(a.ans)?a.ans:[];
 const outs=events.filter(e=>e.t=='out'),flags=events.filter(e=>FLAGS.includes(e.t)).length;
 return{name:a.name,reg:a.reg,ua:a.ua||'',status:a.status,ev:events,start:a.start,
  score:answers.filter((c,i)=>c===Q[i][2]).length,done:answers.filter(c=>c!=null).length,
  outs:outs.length,away:outs.reduce((sum,e)=>sum+(e.d||0),0),flags,
  risk:outs.length>=3||flags>=6||events.some(e=>e.t=='idclash')?'CHEATING':outs.length>=1||flags>=2?'SUSPICIOUS':'CLEAN'};
};
const publicBoard=records=>records.map(record=>{const v=view(record);return{name:v.name,id:'***'+v.reg.slice(-3),score:v.score,done:v.done,status:v.status,outs:v.outs}});
const send=(res,status,payload)=>{res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify(payload))};
const dbRequest=async(path,options={})=>{
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)throw Object.assign(new Error('Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.'),{status:503});
 let response;
 try{
  response=await fetch(new URL(`rest/v1/${path}`,base.endsWith('/')?base:`${base}/`),{
   ...options,headers:{apikey:key,authorization:['Bearer',key].join(' '),'content-type':'application/json',...options.headers}
  });
 }catch(error){console.error('Supabase request failed:',error.message);throw Object.assign(new Error('Database request failed'),{status:502})}
 if(!response.ok){const details=await response.text();console.error('Supabase returned',response.status,details);throw Object.assign(new Error('Database request failed'),{status:502})}
 if(response.status===204)return null;
 const text=await response.text();return text?JSON.parse(text):null;
};
const encodeFilter=value=>encodeURIComponent(value);
const findStudent=async reg=>{
 const query=new URLSearchParams({select:'payload',reg:`eq.${reg}`,limit:'1'});
 const result=await dbRequest(`students?${query}`);
 return result[0]?.payload||null;
};
const saveStudent=async record=>{
 await dbRequest('students?on_conflict=reg',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({reg:record.reg,payload:record,updated_at:new Date().toISOString()})});
};
const loadStudents=async()=>{
 const result=await dbRequest('students?select=payload');
 return result.map(row=>row.payload).filter(record=>record&&typeof record.reg==='string');
};
const parseBody=async req=>{
 if(req.body!==undefined){
  if(req.body&&typeof req.body==='object')return req.body;
  try{return JSON.parse(req.body||'{}')}catch{return null}
 }
 let text='';for await(const chunk of req)text+=chunk;
 try{return JSON.parse(text||'{}')}catch{return null}
};
const validAdmin=pin=>{
 const expected=process.env.ADMIN_PIN;
 if(!expected)return false;
 const supplied=String(pin||'');
 const expectedBuffer=Buffer.from(expected),suppliedBuffer=Buffer.from(supplied);
 return expectedBuffer.length===suppliedBuffer.length&&crypto.timingSafeEqual(expectedBuffer,suppliedBuffer);
};
const requireAdmin=(req,res)=>{
 if(!process.env.ADMIN_PIN){send(res,503,{error:'Admin PIN is not configured on Vercel.'});return false}
 if(!validAdmin(new URL(req.url,'https://vercel.invalid').searchParams.get('pin'))){send(res,401,{error:'Wrong PIN'});return false}
 return true;
};
const route=async(req,res)=>{
 const url=new URL(req.url,'https://vercel.invalid'),pathname=url.pathname.replace(/\/+$/,'')||'/',route=pathname.replace(/^\/api\/?/,'');
 if(req.method==='GET'&&route==='board')return send(res,200,publicBoard(await loadStudents()));
 if(req.method==='GET'&&route==='admin/data'){
  if(!requireAdmin(req,res))return;
  return send(res,200,(await loadStudents()).map(view));
 }
 if(req.method==='DELETE'&&route==='admin/student'){
  if(!requireAdmin(req,res))return;
  const body=await parseBody(req),reg=String(body?.reg||'').trim().toUpperCase();
  if(!reg)return send(res,400,{error:'Register number needed'});
  const existing=await findStudent(reg);
  if(!existing)return send(res,404,{error:'Student not found'});
  const query=new URLSearchParams({reg:`eq.${reg}`});
  await dbRequest(`students?${query}`,{method:'DELETE'});
  return send(res,200,{ok:true});
 }
 if(!['POST'].includes(req.method))return send(res,405,{error:'Method not allowed'});
 const body=await parseBody(req);
 if(!body||typeof body!=='object'||Array.isArray(body))return send(res,400,{error:'Invalid JSON body'});
 const reg=String(body.reg||'').trim().toUpperCase();
 if(route==='start'){
  const name=String(body.name||'').trim().slice(0,40);
  if(!name||!reg)return send(res,400,{error:'Name and register number needed'});
  let student=await findStudent(reg);
  if(!student)student={name,reg,ans:Array(Q.length).fill(null),ev:[],status:'playing',start:Date.now(),end:Date.now()+MINUTES*6e4,ua:req.headers['user-agent']||''};
  else if(student.status!=='playing')return send(res,409,{error:'This ID has already submitted. One attempt only 😎'});
  else if(String(student.name).toLowerCase()!==name.toLowerCase()){
   student.ev.push({t:'idclash',at:Date.now(),r:name});await saveStudent(student);
   return send(res,403,{error:'This register number belongs to someone else. Admin has been told 🚨'});
  }else student.ev.push({t:'reload',at:Date.now()});
  prepareOrder(student);await saveStudent(student);
  return send(res,200,{qs:student.questionOrder.map(index=>({q:Q[index][0],o:student.choiceOrder[index].map(choice=>Q[index][1][choice]),section:+SECTION_MAP[index]})),
   ans:student.questionOrder.map(index=>student.ans[index]==null?null:student.choiceOrder[index].indexOf(student.ans[index])),
   end:student.end,maxOuts:MAX_OUTS,score:view(student).score,outs:view(student).outs});
 }
 if(!reg)return send(res,400,{error:'Register number needed'});
 const student=await findStudent(reg);
 if(!student||student.status!=='playing')return send(res,400,{error:'closed'});
 if(Date.now()>student.end+5000){student.status='done';await saveStudent(student);return send(res,400,{error:'time up'});}
 if(route==='answer'){
  const i=Number(body.i),choiceIndex=Number(body.c);
  if(!Number.isInteger(i)||i<0||i>=Q.length||!Number.isInteger(choiceIndex)||choiceIndex<0||choiceIndex>=4)return send(res,400,{error:'bad'});
  prepareOrder(student);
  const question=student.questionOrder[i],choice=student.choiceOrder[question][choiceIndex];
  if(student.ans[question]==null)student.ans[question]=choice;
  await saveStudent(student);
  return send(res,200,{ok:student.ans[question]===Q[question][2],score:view(student).score});
 }
 if(route==='event'){
  if(body.t==='back'){const event=[...student.ev].reverse().find(entry=>entry.t==='out'&&!entry.d);if(event)event.d=Math.max(1,Number(body.d)||1)}
  else if(['out','copy','paste','menu','keys','fs'].includes(body.t)&&student.ev.length<300)student.ev.push({t:body.t,at:Date.now(),d:0,r:String(body.r||'').slice(0,80)});
  const locked=student.ev.filter(event=>event.t==='out').length>=MAX_OUTS;
  if(locked)student.status='locked';
  await saveStudent(student);return send(res,200,{locked});
 }
 if(route==='finish'){student.status='done';await saveStudent(student);return send(res,200,{score:view(student).score})}
 return send(res,404,{error:'Not found'});
};

module.exports=async(req,res)=>{
 try{return await route(req,res)}
 catch(error){console.error('API request failed:',error);return send(res,error.status||500,{error:error.status?error.message:'Server error'})}
};
module.exports.questions=Q;
