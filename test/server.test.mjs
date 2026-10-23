import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server.mjs';
async function launch(options={}){const app=createApp({dbPath:':memory:',...options});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;async function call(path,data,cookie){const res=await fetch(base+path,{method:data===undefined?'GET':'POST',headers:{...(data===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},body:data===undefined?undefined:JSON.stringify(data)});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};}return {...app,base,call};}
test('produção exige chave de criação',()=>{assert.throws(()=>createApp({dbPath:':memory:',production:true}),/TEACHER_KEY/);});
test('API: permissões, reconexão, sincronização, 35 alunos e voto único concorrente',async()=>{
 const app=await launch({teacherKey:'professor-testes'});const abort=new AbortController();try{
 const bad=await app.call('/api/rooms',{teacherKey:'errada'});assert.equal(bad.status,400);
 const created=await app.call('/api/rooms',{teacherKey:'professor-testes',config:{killers:3,detectives:2,angels:2,jokers:1,natural:0}});assert.equal(created.status,200);const {code,recoveryKey}=created.data,admin=created.cookie,base=`/api/rooms/${code}`;
 const students=await Promise.all(Array.from({length:35},(_,i)=>app.call(base+'/join',{name:'Aluno '+i})));assert.ok(students.every(s=>s.status===200));assert.equal((await app.call(base+'/join',{name:'aluno 0'})).status,400);
 assert.equal((await app.call(base+'/state?kind=admin')).status,400);assert.equal((await app.call(base+'/start?kind=student',{},students[0].cookie)).status,400);assert.equal((await app.call(base+'/start?kind=public',{})).status,400);
 const connections=await Promise.all(students.map(s=>fetch(app.base+base+'/events?kind=student',{headers:{Cookie:s.cookie},signal:abort.signal})));assert.ok(connections.every(r=>r.status===200));
 const readers=connections.map(r=>r.body.getReader());const initial=await Promise.all(readers.map(r=>r.read()));assert.ok(initial.every(x=>new TextDecoder().decode(x.value).includes('"phase":"lobby"')));
 await app.call(base+'/start?kind=admin',{},admin);
 const event=await readers[0].read();assert.ok(new TextDecoder().decode(event.value).includes('"phase":"angels"'));
 const pub=(await app.call(base+'/state?kind=public')).data;assert.equal(pub.players.length,35);assert.ok(pub.players.every(p=>!('role'in p)));assert.equal(pub.actions,undefined);assert.equal(pub.me,undefined);
 const states=await Promise.all(students.map(s=>app.call(base+'/state?kind=student',undefined,s.cookie)));assert.equal(new Set(states.map(s=>s.data.deadline)).size,1);assert.ok(states.every(s=>s.data.me.role&&s.data.me.tasks.every(t=>!('answer'in t))));
 const current=states[0].data;const action=await app.call(base+'/act?kind=student',{phaseId:'antiga',type:'vote',data:{target:null}},students[0].cookie);assert.equal(action.status,400);
 await app.call(base+'/pause?kind=admin',{},admin);const paused=(await app.call(base+'/state?kind=admin',undefined,admin)).data;assert.equal(paused.paused,true);assert.equal(paused.deadline,null);assert.equal((await app.call(base+'/advance?kind=admin',{},admin)).status,400);
 await app.call(base+'/resume?kind=admin',{},admin);for(let i=0;i<4;i++)await app.call(base+'/advance?kind=admin',{},admin);
 const vote=(await app.call(base+'/state?kind=student',undefined,students[0].cookie)).data;assert.equal(vote.phase,'vote');
 const doubles=await Promise.all([0,1].map(()=>app.call(base+'/act?kind=student',{phaseId:vote.phaseId,type:'vote',data:{target:vote.me.id}},students[0].cookie)));assert.deepEqual(doubles.map(x=>x.status).sort(),[200,400]);
 const replay=(await app.call(base+'/state?kind=student',undefined,students[0].cookie)).data;assert.equal(replay.me.id,current.me.id);assert.equal(replay.me.role,current.me.role);assert.equal(replay.me.voted,true);
 const recovered=await app.call(base+'/recover',{key:recoveryKey});assert.equal(recovered.status,200);assert.equal((await app.call(base+'/report?kind=admin',undefined,recovered.cookie)).status,200);assert.equal((await app.call(base+'/report?kind=student',undefined,students[0].cookie)).status,400);
 }finally{abort.abort();await app.close();}
});
test('persistência restaura personagens e pausa a partida após reinício',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'cidade-test-')),dbPath=join(directory,'partida.sqlite');let app=await launch({dbPath});try{
 const created=await app.call('/api/rooms',{config:{killers:1,detectives:1,angels:1,jokers:1}});const {code}=created.data,base=`/api/rooms/${code}`,admin=created.cookie;
 const students=[];for(let i=0;i<6;i++)students.push(await app.call(base+'/join',{name:'Pessoa '+i}));await app.call(base+'/start?kind=admin',{},admin);
 const before=(await app.call(base+'/state?kind=student',undefined,students[0].cookie)).data;await app.close();app=await launch({dbPath});
 const restored=(await app.call(base+'/state?kind=student',undefined,students[0].cookie)).data;assert.equal(restored.me.id,before.me.id);assert.equal(restored.me.role,before.me.role);assert.equal(restored.paused,true);assert.equal(restored.phase,before.phase);assert.equal(restored.deadline,null);
 assert.equal((await app.call(base+'/resume?kind=admin',{},admin)).status,200);assert.equal((await app.call(base+'/state?kind=student',undefined,students[0].cookie)).data.paused,false);
 await app.call(base+'/delete?kind=admin',{},admin);assert.equal((await app.call(base+'/state?kind=public')).status,400);
 }finally{await app.close();rmSync(directory,{recursive:true,force:true});}
});
test('servidor avança cronômetro sem depender de navegador conectado',async()=>{
 const app=await launch();try{const created=await app.call('/api/rooms',{config:{killers:1,detectives:0,angels:0,jokers:0,angelSeconds:5}});const base='/api/rooms/'+created.data.code;for(let i=0;i<4;i++)await app.call(base+'/join',{name:'Jogador '+i});await app.call(base+'/start?kind=admin',{},created.cookie);await new Promise(r=>setTimeout(r,5400));const state=(await app.call(base+'/state?kind=public')).data;assert.equal(state.phase,'killers');}finally{await app.close();}
});
test('remoção no lobby invalida a sessão do aluno',async()=>{const app=await launch();try{const created=await app.call('/api/rooms',{});const base='/api/rooms/'+created.data.code,student=await app.call(base+'/join',{name:'Visitante'});await app.call(base+'/remove?kind=admin',{id:student.data.id},created.cookie);assert.equal((await app.call(base+'/state?kind=student',undefined,student.cookie)).status,400);assert.equal((await app.call(base+'/join',{name:'Visitante'})).status,200);}finally{await app.close();}});
test('requisição de outra origem é recusada',async()=>{const app=await launch();try{const res=await fetch(app.base+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://outro.example'},body:'{}'});assert.equal(res.status,400);}finally{await app.close();}});
