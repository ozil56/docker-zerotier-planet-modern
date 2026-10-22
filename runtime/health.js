const fs=require('fs'),http=require('http');
const token=fs.readFileSync('/var/lib/zerotier-one/authtoken.secret','utf8').trim();
function check(port,path,headers,code){return new Promise((resolve,reject)=>{
 const r=http.get({host:'127.0.0.1',port,path,headers,timeout:3000},s=>{s.resume();s.statusCode===code?resolve():reject(Error('health'))});
 r.on('error',reject);r.on('timeout',()=>r.destroy(Error('timeout')));
})}
const port=Number(fs.readFileSync('/app/config/zerotier-one.port','utf8').trim());
Promise.all([check(port,'/status',{'X-ZT1-Auth':token},200),check(3443,'/login',{},200),check(3000,'/planet',{},401)]).then(()=>process.exit(0),()=>process.exit(1));
