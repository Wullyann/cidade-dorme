import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import * as game from './engine.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const hash=s=>createHash('sha256').update(s).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
export function createApp({dbPath=process.env.DATA_DIR?resolve(process.env.DATA_DIR,'cidade.sqlite'):resolve(root,'data/cidade.sqlite'),production=process.env.NODE_ENV==='production'}={}){
 if(dbPath!==':memory:')mkdirSync(dirname(dbPath),{recursive:true});
 const db=new DatabaseSync(dbPath);db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL)');
 const rooms=new Map(),peers=new Map(),rates=new Map();
 function rateLimit(key,limit){const now=Date.now(),rate=rates.get(key)||{at:now,count:0};if(now-rate.at>=60000){rate.at=now;rate.count=0;}rate.count++;rates.set(key,rate);game.ensure(rate.count<=limit,'Muitas requisições. Aguarde um minuto.');}
 const save=(code,r)=>db.prepare('INSERT OR REPLACE INTO rooms VALUES (?,?)').run(code,JSON.stringify(r));
 for(const row of db.prepare('SELECT * FROM rooms').all()){const r=JSON.parse(row.state);if(r.deadline&&!r.paused){r.remaining=Math.max(0,r.deadline-Date.now());r.paused=true;r.deadline=null;game.log(r,'Servidor reiniciado. Professor: retome a partida.');save(row.code,r);}rooms.set(row.code,r);}
 function cookieName(code,kind){return `cd_${code}_${kind}`;}
 function auth(req,code,kind){if(kind==='public')return {kind};game.ensure(['admin','student'].includes(kind));const cookies=Object.fromEntries((req.headers.cookie||'').split(';').filter(x=>x.includes('=')).map(x=>{const at=x.indexOf('=');return[x.slice(0,at).trim(),x.slice(at+1)]}));const key=hash(cookies[cookieName(code,kind)]||'');const identity=rooms.get(code).sessions[key];game.ensure(identity?.kind===kind,'Sessão inválida. Entre novamente.');return identity;}
 function setCookie(res,code,kind,value){res.setHeader('Set-Cookie',`${cookieName(code,kind)}=${value}; HttpOnly; SameSite=Strict; Path=/api/rooms/${code}; Max-Age=604800${production?'; Secure':''}`);}
 function snapshot(code,identity){return {...game.view(rooms.get(code),identity),code};}
 function broadcast(code){for(const p of peers.get(code)??[]){if(!p.res.writableEnded){if(p.identity.kind!=='public'&&!Object.values(rooms.get(code).sessions).some(i=>i.kind===p.identity.kind&&i.playerId===p.identity.playerId)){p.res.end();continue;}if(p.res.writableLength>128*1024){p.res.destroy();continue;}p.res.write(`data: ${JSON.stringify(snapshot(code,p.identity))}\n\n`);}}}
 function mutate(code,fn){const before=structuredClone(rooms.get(code));try{const result=fn(rooms.get(code));rooms.get(code).revision++;save(code,rooms.get(code));broadcast(code);return result;}catch(e){rooms.set(code,before);throw e;}}
 function json(res,value,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
 async function body(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16000)throw new Error('Requisição muito grande.');chunks.push(chunk);}const value=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');game.ensure(value&&typeof value==='object'&&!Array.isArray(value),'Envie um objeto JSON.');return value;}
 const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
 try{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/health')return json(res,{ok:true});
 if(!url.pathname.startsWith('/api/')){game.ensure(req.method==='GET');const files={'/':'index.html','/app.js':'app.js','/minigames.js':'minigames.js','/style.css':'style.css'};const file=files[url.pathname];if(!file)return json(res,{error:'Não encontrado.'},404);res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-cache'});return res.end(readFileSync(resolve(root,'public',file)));}
 const ip=req.socket.remoteAddress,traffic=req.method==='GET'?'read':'write';rateLimit(`network:${ip}:${traffic}`,30000);
 if(req.method!=='GET'){const origin=req.headers.origin;if(origin)game.ensure(new URL(origin).host===req.headers.host,'Origem inválida.');game.ensure((req.headers['content-type']||'').startsWith('application/json'),'Envie JSON.');}
 if(url.pathname==='/api/rooms'&&req.method==='POST'){
 rateLimit(`entry:${ip}`,600);
 const b=await body(req);game.ensure(rooms.size<500,'Limite de salas atingido. Exclua salas antigas.');
 let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));const r=game.room(b.config);const key=token();r.sessions={[hash(key)]:{kind:'admin'}};rooms.set(code,r);save(code,r);setCookie(res,code,'admin',key);return json(res,{code,recoveryKey:key});}
 const match=url.pathname.match(/^\/api\/rooms\/([A-F0-9]{6})(?:\/([\w-]+))?$/);game.ensure(match,'Endereço inválido.');const[,code,action='state']=match;game.ensure(rooms.has(code),'Sala não encontrada.');const kind=url.searchParams.get('kind')||'student';
 if(req.method==='POST'&&action==='recover'){rateLimit(`entry:${ip}`,600);const b=await body(req);game.ensure(rooms.get(code).sessions[hash(String(b.key))]?.kind==='admin','Chave de recuperação inválida.');setCookie(res,code,'admin',b.key);return json(res,{ok:true});}
 if(req.method==='POST'&&action==='join'){rateLimit(`entry:${ip}`,600);const b=await body(req);const key=token();const p=mutate(code,r=>{const p=game.join(r,b.name);r.sessions[hash(key)]={kind:'student',playerId:p.id};return p;});setCookie(res,code,'student',key);return json(res,{id:p.id});}
 const identity=auth(req,code,kind);
 rateLimit(`session:${code}:${identity.kind}:${identity.playerId||ip}:${traffic}`,600);
 if(req.method==='GET'&&action==='state')return json(res,snapshot(code,identity));
 if(req.method==='GET'&&action==='events'){game.ensure((peers.get(code)?.size||0)<160,'Muitas conexões nesta sala.');res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(`retry: 2000\ndata: ${JSON.stringify(snapshot(code,identity))}\n\n`);const p={res,identity};if(!peers.has(code))peers.set(code,new Set());peers.get(code).add(p);req.on('close',()=>peers.get(code)?.delete(p));return;}
 if(req.method==='GET'&&action==='report'){game.ensure(identity.kind==='admin','Acesso exclusivo do professor.');res.setHeader('Content-Disposition',`attachment; filename="cidade-${code}.json"`);return json(res,{code,...game.view(rooms.get(code),identity)});}
 game.ensure(req.method==='POST','Método inválido.');const b=await body(req);
 if(action==='delete'){game.ensure(identity.kind==='admin');for(const p of peers.get(code)??[])p.res.end();peers.delete(code);rooms.delete(code);db.prepare('DELETE FROM rooms WHERE code=?').run(code);return json(res,{ok:true});}
 const result=mutate(code,r=>{
 if(action==='act'){game.ensure(identity.kind==='student');game.ensure(b.phaseId===r.phaseId,'A fase mudou. Tente novamente.');const result=game.act(r,r.players.find(p=>p.id===identity.playerId),b.type,b.data);game.progress(r);return result;}
 game.ensure(identity.kind==='admin','Acesso exclusivo do professor.');
 if(action==='configure'){game.ensure(r.phase==='lobby','Configure antes de iniciar.');r.config=game.config(b.config);}
 else if(action==='start')game.start(r);
 else if(action==='new-game')game.restart(r);
 else if(action==='pause'){game.ensure(r.deadline&&!r.paused);r.remaining=Math.max(0,r.deadline-Date.now());r.deadline=null;r.paused=true;game.log(r,'Partida pausada.');}
 else if(action==='resume'){game.ensure(r.paused);r.deadline=Date.now()+r.remaining;r.paused=false;game.log(r,'Partida retomada.');}
 else if(action==='advance'){game.ensure(!r.paused,'Retome a partida antes de avançar.');game.advance(r);}
 else if(action==='end'){game.ensure(['cidade','assassinos','joker','interrompida'].includes(b.winner));r.winner=b.winner;r.phase='ended';r.deadline=null;r.paused=false;game.log(r,`Professor encerrou: ${b.winner}.`);}
 else if(action==='remove'){game.ensure(r.phase==='lobby');r.players=r.players.filter(p=>p.id!==b.id);for(const [key,i]of Object.entries(r.sessions))if(i.playerId===b.id)delete r.sessions[key];}
 else throw new Error('Operação desconhecida.');return {ok:true};});return json(res,result??{ok:true});
 }catch(e){if(!res.headersSent)json(res,{error:e.message},400);else res.end();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;
 const timer=setInterval(()=>{for(const [code,r]of rooms){if(!r.paused&&r.deadline&&(game.completedNightPhase(r)||Date.now()>=r.deadline)){try{mutate(code,r=>game.tick(r));}catch(e){console.error('Falha no turno',e.message);}}}},250);
 const heartbeat=setInterval(()=>{for(const clients of peers.values())for(const {res}of clients)res.write(': heartbeat\n\n');for(const [key,value]of rates)if(Date.now()-value.at>60000)rates.delete(key);},15000);
 timer.unref();heartbeat.unref();
 return {server,close:async()=>{clearInterval(timer);clearInterval(heartbeat);for(const clients of peers.values())for(const {res}of clients)res.end();await new Promise(resolve=>server.close(resolve));db.close();}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const app=createApp();app.server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Cidade Dorme ouvindo na porta ${Number(process.env.PORT)||3000}`));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();process.exit(0);});}

