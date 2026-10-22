'use strict';
// Copyright (c) 2026 ozil56. SPDX-License-Identifier: GPL-3.0-only
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const argon2=require('/opt/ztncui/node_modules/argon2');
process.umask(0o077);
const root='/data';
function write(p,s){fs.writeFileSync(path.join(root,p),s,{mode:0o600,flag:'wx'})}
function tool(args,cwd=root){return execFileSync('/usr/local/bin/zerotier-idtool',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']})}
async function main(){
 if(process.env.ACCEPT_ZEROTIER_SOURCE_LICENSE!=='yes')throw Error('Read docs/LICENSING.md and set ACCEPT_ZEROTIER_SOURCE_LICENSE=yes for eligible use.');
 const ip=process.env.PUBLIC_IPV4,ip6=process.env.PUBLIC_IPV6||'',port=Number(process.env.ZT_PORT||9994);
 if(net.isIP(ip)!==4||ip==='203.0.113.10'||(ip6&&net.isIP(ip6)!==6))throw Error('Set a real IPv4 address and an optional valid IPv6 address.');
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('ZT_PORT must be 1024..65535');
 fs.mkdirSync(root,{recursive:true,mode:0o700});
 if(fs.readdirSync(root).length)throw Error('Refusing to initialize non-empty data directory. Preserve existing identity and use migration/restore documentation.');
 for(const p of ['one','ui-etc','config','dist'])fs.mkdirSync(path.join(root,p),{mode:0o700});
 tool(['generate',root+'/one/identity.secret',root+'/one/identity.public']);
 const world=JSON.parse(tool(['initmoon',root+'/one/identity.public']));
 world.roots[0].stableEndpoints=[ip+'/'+port,...(ip6?[ip6+'/'+port]:[])];
 // genmoon supports both world types in upstream 1.16.2. Never publish signing JSON.
 write('config/moon-signing.json',JSON.stringify(world,null,2));
 tool(['genmoon',root+'/config/moon-signing.json'],root+'/config');
 const moon=world.id.padStart(16,'0')+'.moon';
 fs.renameSync(root+'/config/'+moon,root+'/dist/'+moon);
 world.worldType='planet';world.id=(149604618).toString(16);
 write('config/planet-signing.json',JSON.stringify(world,null,2));
 tool(['genmoon',root+'/config/planet-signing.json'],root+'/config');
 fs.renameSync(root+'/config/'+world.id.padStart(16,'0')+'.moon',root+'/one/planet');
 fs.copyFileSync(root+'/one/planet',root+'/dist/planet');
 const password=crypto.randomBytes(24).toString('base64url');
 const hash=await argon2.hash(password,{type:argon2.argon2id});
 write('ui-etc/passwd',JSON.stringify({admin:{name:'admin',pass_set:true,hash}}));
 write('initial-admin-password.txt',password+'\n');
 write('one/authtoken.secret',crypto.randomBytes(32).toString('hex'));
 write('one/local.conf',JSON.stringify({settings:{primaryPort:port,allowManagementFrom:['127.0.0.0/8','::1/128'],allowTcpFallbackRelay:false}}));
 write('config/zerotier-one.port',String(port));write('config/file_server.port','3000');
 write('config/file_server.key',crypto.randomBytes(32).toString('hex'));
 write('config/initialized.json',JSON.stringify({version:1,created:new Date().toISOString(),port}));
 function own(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())own(f);fs.chownSync(f,10001,10001)}fs.chownSync(p,10001,10001)}
 // Leave initial plaintext password root-readable only; normal runtime cannot access it.
 for(const d of ['one','ui-etc','config','dist'])own(root+'/'+d);
 console.log('Initialized. Read data/initial-admin-password.txt locally as root; store it in a password manager, then remove that file.');
 console.log('Keep the whole data directory backed up. Only data/dist contains client distribution files.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
