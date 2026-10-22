'use strict';
const fs=require('fs'),http=require('http'),path=require('path'),crypto=require('crypto');
const {spawn}=require('child_process');
const state='/var/lib/zerotier-one',config='/app/config',dist=fs.realpathSync('/app/dist');
for(const f of ['identity.secret','identity.public','planet','authtoken.secret']) {
 if(!fs.statSync(path.join(state,f)).size) throw Error('Required existing controller state is missing');
}
if(!fs.statSync('/opt/ztncui/etc/passwd').size) throw Error('Existing UI account data is missing');
const port=Number(fs.readFileSync(config+'/zerotier-one.port','utf8').trim());
const filePort=Number(fs.readFileSync(config+'/file_server.port','utf8').trim());
if(!Number.isInteger(port)||port<1024||port>65535||!Number.isInteger(filePort)||filePort<1024||filePort>65535)throw Error('Invalid service port');
const key=Buffer.from(fs.readFileSync(config+'/file_server.key','utf8').trim());
if(key.length<8) throw Error('Existing download key is missing');
const token=fs.readFileSync(state+'/authtoken.secret','utf8').trim();
process.env.ZT_ADDR='127.0.0.1:'+port;
const children=[];let stopping=false,files;
function stop(code){
 if(stopping)return;stopping=true;
 if(files)files.close();
 for(const c of children)if(c.exitCode===null)c.kill('SIGTERM');
 const timer=setTimeout(()=>{for(const c of children)if(c.exitCode===null)c.kill('SIGKILL');process.exit(code)},15000);
 Promise.all(children.map(c=>c.exitCode!==null?Promise.resolve():new Promise(r=>c.once('exit',r)))).then(()=>{clearTimeout(timer);process.exit(code)});
}
for(const s of ['SIGTERM','SIGINT'])process.on(s,()=>stop(0));
function child(exe,args,cwd){
 const c=spawn(exe,args,{cwd,stdio:['ignore','inherit','inherit']});children.push(c);
 c.on('error',()=>{console.error('Service process failed to start');stop(1)});
 c.on('exit',()=>{if(!stopping){console.error('Service process exited');stop(1)}});return c;
}
function apiReady(){return new Promise(resolve=>{
 const r=http.get({host:'127.0.0.1',port,path:'/status',headers:{'X-ZT1-Auth':token},timeout:1500},s=>{s.resume();resolve(s.statusCode===200)});
 r.on('error',()=>resolve(false));r.on('timeout',()=>r.destroy());
})}
child('/usr/local/bin/zerotier-one',['-U','-p'+port,state],state);
(async()=>{
 let ready=false;for(let i=0;i<40&&!stopping;i++){if(await apiReady()){ready=true;break}await new Promise(r=>setTimeout(r,500))}
 if(stopping)return;if(!ready){console.error('Controller readiness failed');stop(1);return}
 child('/usr/local/bin/node',['bin/www'],'/opt/ztncui');
 files=http.createServer((req,res)=>{
  let u;try{u=new URL(req.url,'http://localhost')}catch{res.writeHead(400).end();return}
  const supplied=Buffer.from(u.searchParams.get('key')||'');
  if(supplied.length!==key.length||!crypto.timingSafeEqual(supplied,key)){res.writeHead(401).end('Unauthorized');return}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
  let p;try{p=path.resolve(dist,'.'+decodeURIComponent(u.pathname));p=fs.realpathSync(p)}catch{res.writeHead(404).end();return}
  if(!p.startsWith(dist+path.sep)){res.writeHead(403).end();return}
  let stat;try{stat=fs.statSync(p)}catch{res.writeHead(404).end();return}
  if(!stat.isFile()){res.writeHead(404).end();return}
  res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD'){res.end();return}const stream=fs.createReadStream(p);stream.on('error',()=>res.destroy());stream.pipe(res);
 });files.on('error',()=>{console.error('Download service failed');stop(1)});files.listen(filePort,'0.0.0.0');
 console.log('Existing controller identity loaded; service processes started');
})().catch(()=>{console.error('Service initialization failed');stop(1)});
