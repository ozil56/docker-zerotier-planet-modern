"""Destructive only to a NEW, dedicated test checkout. Never run in production.
Requires Linux, root, Docker Compose >=2.24, Python requests, and a built image.
All identities are freshly generated; the Docker network is internal-only.
Usage: python3 tests/integration.py --confirm-isolated
"""
import pathlib,subprocess,json,os,time,shutil,hashlib,sys,requests,datetime,tarfile
assert sys.argv[1:]==['--confirm-isolated'],'Read module documentation first'
P=pathlib.Path(__file__).resolve().parents[1];os.chdir(P)
assert not (P/'data').exists() and not (P/'.env').exists(),'Use a new dedicated checkout'
assert os.geteuid()==0
R=[];S=requests.Session();S.trust_env=False
NET='planet-modern-docs-isolated';NAME='planet-modern-docs-planet-1';IP='172.30.223.10';image='zerotier-planet-modern:2026.10.22'
def run(a,**kw):
 p=subprocess.run(a,capture_output=True,text=True,timeout=kw.pop('timeout',90),**kw)
 if p.returncode:raise RuntimeError('Command failed: '+a[0]+' '+a[1]+'; '+p.stderr[-500:])
 return p.stdout
def docker(*a):return run(['docker',*a])
def ins(n):return json.loads(docker('inspect',n))[0]
def compose(*a,**kw):return run(['docker','compose',*a],**kw)
def record(step,**k):
 v={'step':step,'passed':True,**k};R.append(v);print(json.dumps(v),flush=True)
def ui(p,method='GET',data=None):return S.request(method,'http://'+IP+':3443'+p,data=data,timeout=10,allow_redirects=False)
def api(p):
 code='import sys,json,urllib.request;x=json.load(sys.stdin);q=urllib.request.Request("http://127.0.0.1:9994"+x["path"],headers={"X-ZT1-Auth":x["token"]});print(urllib.request.urlopen(q,timeout=5).read().decode())'
 return json.loads(run(['nsenter','-t',str(ins(NAME)['State']['Pid']),'-n','python3','-c',code],input=json.dumps({'path':p,'token':(P/'data/one/authtoken.secret').read_text().strip()})))
def healthy():
 for _ in range(60):
  if ins(NAME)['State'].get('Health',{}).get('Status')=='healthy':return
  time.sleep(1)
 raise AssertionError('Health timeout')
def login(password):
 S.cookies.clear();r=ui('/login','POST',{'username':'admin','password':password});assert r.status_code==302 and r.headers['Location']=='/controller'
def traffic(label):
 for _ in range(60):
  rows={n:json.loads(docker('exec',n,'zerotier-cli','-j','listnetworks')) for n in clients}
  if all(v and v[0]['status']=='OK' and v[0]['assignedAddresses'] for v in rows.values()):break
  time.sleep(1)
 assert all(v and v[0]['status']=='OK' for v in rows.values())
 for src,dst in [(clients[0],clients[1]),(clients[1],clients[0])]:
  ip=rows[dst][0]['assignedAddresses'][0].split('/')[0];pid=ins(src)['State']['Pid']
  for _ in range(20):
   r=subprocess.run(['nsenter','-t',str(pid),'-n','ping','-c','1','-W','1',ip],capture_output=True)
   if r.returncode==0:break
   time.sleep(1)
  text=run(['nsenter','-t',str(pid),'-n','ping','-c','10','-i','.2','-W','2',ip]);assert ', 0% packet loss' in text
 record(label,clients=2,directions=2,packets_per_direction=10,loss_percent=0)
clients=['planet-modern-docs-client-a','planet-modern-docs-client-b']
(P/'.cache').mkdir(exist_ok=True)
(P/'.env').write_text((P/'.env.example').read_text().replace('SOURCE_LICENSE=no','SOURCE_LICENSE=yes').replace('203.0.113.10',IP));os.chmod(P/'.env',0o600)
(P/'.cache/lab.override.yaml').write_text('''services:
  planet:
    container_name: planet-modern-docs-planet-1
    restart: "no"
    ports: !reset []
    networks:
      default:
        ipv4_address: 172.30.223.10
networks:
  default:
    name: planet-modern-docs-isolated
    internal: true
    ipam:
      config:
        - subnet: 172.30.223.0/24
''')
os.environ['COMPOSE_FILE']='compose.yaml:.cache/lab.override.yaml';os.environ['COMPOSE_PROJECT_NAME']='planet-modern-docs'
ok=False
try:
 compose('config','--quiet');record('README configuration validation')
 compose('--profile','tools','run','--rm','init');record('README first initialization')
 ident=hashlib.sha256((P/'data/one/identity.secret').read_bytes()).hexdigest();planet=(P/'data/dist/planet').read_bytes()
 p=subprocess.run(['docker','compose','--profile','tools','run','--rm','init'],capture_output=True,text=True)
 assert p.returncode!=0 and 'Refusing' in p.stderr+p.stdout
 assert hashlib.sha256((P/'data/one/identity.secret').read_bytes()).hexdigest()==ident;record('Repeated initialization refuses without changing identity')
 password=(P/'data/initial-admin-password.txt').read_text().strip();assert len(password)>=24
 (P/'data/initial-admin-password.txt').unlink()
 compose('up','-d','--no-build','planet');healthy();record('README start and healthy')
 result=compose('exec','-T','planet','zerotier-cli','-D/var/lib/zerotier-one','info');assert '1.16.2' in result
 login(password);record('README generated admin password login and CLI info')
 r=ui('/controller/network/create','POST',{'name':'Documentation test'});assert r.status_code==302
 page=r.headers['Location'];nwid=page.rsplit('/',1)[1]
 r=ui(page+'/easy','POST',{'networkCIDR':'10.235.0.0/24','poolStart':'10.235.0.10','poolEnd':'10.235.0.200'});assert r.status_code==200
 cfg=api(page);assert cfg['private'] and cfg['v4AssignMode']['zt'] and cfg['routes'][0]['target']=='10.235.0.0/24'
 record('CLIENTS UI create private network and Easy setup')
 key=(P/'data/config/file_server.key').read_text().strip()
 assert S.get('http://'+IP+':3000/planet',timeout=5).status_code==401
 d=S.get('http://'+IP+':3000/planet',params={'key':key},timeout=5);assert d.status_code==200 and d.content==planet
 record('CLIENTS authenticated download matches Planet file; anonymous denied')
 for i,n in enumerate(clients):
  folder=P/'.cache'/n;folder.mkdir();(folder/'planet').write_bytes(planet)
  docker('run','-d','--pull','never','--name',n,'--network',NET,'--ip','172.30.223.'+str(20+i),'--cap-drop','ALL','--cap-add','NET_ADMIN','--cap-add','NET_RAW','--device','/dev/net/tun','--security-opt','no-new-privileges','--user','0:0','--entrypoint','zerotier-one','-v',str(folder)+':/var/lib/zerotier-one',image,'-U','/var/lib/zerotier-one')
  for _ in range(30):
   if (folder/'authtoken.secret').exists() and (folder/'zerotier-one.port').exists():break
   time.sleep(1)
  docker('exec',n,'zerotier-cli','join',nwid)
  aid=(folder/'identity.public').read_text().split(':')[0]
  for _ in range(45):
   if aid in api(page+'/member'):break
   time.sleep(1)
  assert aid in api(page+'/member')
  assert ui(page+'/members','POST',{'id':aid,'auth':'true'}).status_code==204
 traffic('CLIENTS two fresh Linux clients authorized and bidirectional ping')
 checks={str(p.relative_to(P/'data')):hashlib.sha256(p.read_bytes()).hexdigest() for p in [P/'data/one/identity.secret',P/'data/one/identity.public',P/'data/one/planet',P/'data/ui-etc/passwd']}
 compose('restart','planet');healthy();login(password);assert nwid in api('/controller/network');traffic('README restart retains network and clients')
 run(['sh','scripts/backup.sh'],timeout=180);healthy()
 backup=sorted((P/'backups').iterdir())[-1]
 run(['sha256sum','-c','SHA256SUMS'],cwd=backup)
 record('BACKUP script exports consistent data and exact image then resumes service')
 compose('stop','planet')
 restored=P/'.cache/restored';restored.mkdir()
 run(['tar','-xzf',str(backup/'state.tar.gz'),'-C',str(restored)])
 docker('image','load','-i',str(backup/'image.tar.gz'))
 docker('tag',(backup/'image-id.txt').read_text().strip(),'zerotier-planet-modern:restore')
 # Swap only the isolated lab's data, retaining the original intact.
 (P/'data').rename(P/'.cache/data-before-restore');shutil.move(str(restored/'data'),str(P/'data'))
 os.environ['PLANET_IMAGE']='zerotier-planet-modern:restore'
 compose('up','-d','--no-build','planet');healthy();login(password)
 assert nwid in api('/controller/network')
 for p,h in checks.items():assert hashlib.sha256((P/'data'/p).read_bytes()).hexdigest()==h
 traffic('BACKUP restore preserves identity UI login network and clients')
 record('Runtime restrictions',user=ins(NAME)['Config']['User'],readonly=ins(NAME)['HostConfig']['ReadonlyRootfs'],cap_drop=ins(NAME)['HostConfig']['CapDrop'],privileged=ins(NAME)['HostConfig']['Privileged'])
 ok=True
finally:
 for n in clients:subprocess.run(['docker','stop','-t','15',n],capture_output=True)
 subprocess.run(['docker','compose','stop','planet'],capture_output=True)
 (P/'.cache/validation.json').write_text(json.dumps({'passed':ok,'tested_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'steps':R},indent=2))
 print(json.dumps({'complete':ok,'test_containers_stopped':True}),flush=True)
