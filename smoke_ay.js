// 冒烟测试：四年级英语听力 Topic 1 试点（ay 版本：音频直链已嵌入）
//   ① english_listening_4.js 加载：5 张卡（ls4:1..5），html:true，body 含 ls-wrap/ls-step/ls-audio-on(真实播放器)
//      每张卡恰好 1 个 <audio src="https://drfs.ctcontents.com/...">，且无本地 mp3 占位(data-src=assets/...)
//   ② 种子注入：state.custom 含 5 张 ls4 卡，seeded.englishListening4 置位
//   ③ 池：poolFor('英语','听力') 含 ls4 卡
//   ④ 渲染：openModal(ls4:1) 不崩，modal-body 含 ls-wrap/ls-step/真实 <audio>(drfs 直链)
//   ⑤ 资源：body 引用的插图图片均存在；本地 mp3 占位 0 个；音频直链恰好 5 个
//   ⑥ 版本号：index.html 0 处 aw、0 处 ax、含 ay(9 处)、含 english_listening_4.js 引入
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const SITE_DIR = path.resolve(__dirname, 'site');
const FILES = ['data.js','extra.js','extra2.js','history_guide_7.js','english_reading_4.js','english_listening_4.js','gallery.js','app.js'];

const registry = {};
function makeEl(id){
  const store = { _id:id, innerHTML:"", value:"", checked:false, hidden:false, textContent:"",
    style:{}, dataset:{}, classList:{toggle(){},add(){},remove(){},contains(){return false;}} };
  return new Proxy(store, {
    get(t,p){
      if(p in t) return t[p];
      if(p==='querySelector') return ()=>makeEl('q');
      if(p==='querySelectorAll') return ()=>[];
      if(p==='closest') return ()=>null;
      if(['addEventListener','removeEventListener','appendChild','removeChild','focus','blur',
           'setSelectionRange','scrollTo','click','remove','setAttribute','getAttribute'].includes(p)) return ()=>{};
      if(p==='parentElement'||p==='parentNode') return makeEl('parent');
      if(p==='children') return [];
      if(p==='getElementById') return (x)=>el(x);
      return undefined;
    },
    set(t,p,v){ t[p]=v; return true; }
  });
}
function el(key){
  let k = (typeof key==='string' && key[0]==='#') ? 'id:'+key.slice(1) : key;
  if(!registry[k]) registry[k]=makeEl(k);
  return registry[k];
}
function makeDocMock(){
  return {
    getElementById:(id)=>el('id:'+id),
    querySelector:(sel)=>el(sel),
    querySelectorAll:()=>[],
    addEventListener:()=>{},
    createElement:()=>makeEl('created'),
    body:{style:{}}
  };
}
function makeCtx(lsStore){
  const context = {};
  context.window = context;
  context.document = makeDocMock();
  context.console = console;
  context.addEventListener = ()=>{};
  context.scrollTo = ()=>{};
  context.setTimeout = ()=>0;
  context.clearTimeout = ()=>{};
  context.TextEncoder = TextEncoder;
  context.TextDecoder = TextDecoder;
  context.fetch = ()=>Promise.reject(new Error('no-net'));
  context.location = { href:'' };
  context.localStorage = {
    getItem:(k)=> (k in lsStore ? lsStore[k] : null),
    setItem:(k,v)=>{ lsStore[k]=String(v); },
    removeItem:(k)=>{ delete lsStore[k]; }
  };
  context.__ENABLE_TEST__ = true;
  return context;
}
function bundleCode(){
  return FILES.map(f=>fs.readFileSync(path.join(SITE_DIR,f),'utf8')).join('\n;\n');
}

const results = [];
function ok(name, cond, extra){ results.push({name, ok:!!cond, extra: extra||''}); }
function safe(name, fn){ try{ fn(); }catch(e){ results.push({name, ok:false, extra:'THROW '+e.message+'\n'+((e.stack||'').split('\n').slice(0,4).join('\n'))}); } }

const ls1 = {};
const ctx1 = makeCtx(ls1);
vm.createContext(ctx1);
vm.runInContext(bundleCode(), ctx1, { filename:'bundle.js' });
const S = ctx1.window.__SITE__;
if(!S){ console.error('FAIL: __SITE__ 未注入'); process.exit(1); }

safe('① ENGLISH_LISTENING_4 加载：5 卡 ls4:1..5，html:true，身体含真实播放器', ()=>{
  const arr = ctx1.window.ENGLISH_LISTENING_4;
  ok('  数组存在且长度 5', Array.isArray(arr) && arr.length===5, 'n='+(arr&&arr.length));
  const keys = arr.map(x=>x.key).sort();
  ok('  key = ls4:1..5', JSON.stringify(keys)===JSON.stringify(['ls4:1','ls4:2','ls4:3','ls4:4','ls4:5']), JSON.stringify(keys));
  ok('  全部 html:true', arr.every(x=>x.html===true), '');
  ok('  全部 type=听力 grade=四年级', arr.every(x=>x.type==='听力'&&x.grade==='四年级'), '');
  ok('  body 含 ls-wrap/ls-step/ls-audio-on', arr.every(x=>x.body.includes('ls-wrap')&&x.body.includes('ls-step')&&x.body.includes('ls-audio-on')), '');
  ok('  每个 body 恰好 1 个 drfs 音频直链', arr.every(x=>(x.body.match(/drfs\.ctcontents\.com/g)||[]).length===1), '');
  ok('  无本地 mp3 占位(data-src=assets)', arr.every(x=>!x.body.includes('data-src="assets/')), '');
});

safe('② 种子注入：state.custom 含 5 张 ls4 卡，flag 置位', ()=>{
  const custom = S.state.custom||[];
  const ls4 = custom.filter(x=>/^ls4:\d+$/.test(x.key));
  ok('  custom 含 5 张 ls4 卡', ls4.length===5, 'n='+ls4.length);
  ok('  seeded.englishListening4=true', S.state.seeded && S.state.seeded.englishListening4===true, '');
});

safe('③ 池：poolFor(英语,听力) 含 ls4 卡', ()=>{
  S.state.grade='四年级'; S.rebuildAll();
  const pool = S.poolFor('英语','听力');
  ok('  听力池非空', pool.length>=5, 'n='+pool.length);
  ok('  含 ls4:1', pool.some(x=>x.key==='ls4:1'), '');
});

safe('④ 渲染：openModal(ls4:1) 不崩，含真实 <audio>(drfs 直链)', ()=>{
  const it = S.INDEX['ls4:1'] || S.state.custom.find(x=>x.key==='ls4:1');
  S.openModal(it);
  const mb = el('id:modal-body').innerHTML;
  ok('  modal-body 含 ls-wrap', mb.includes('ls-wrap'), '');
  ok('  modal-body 含 ls-step', mb.includes('ls-step'), '');
  ok('  modal-body 含真实 <audio', mb.includes('<audio') && mb.includes('drfs.ctcontents.com'), '');
});

safe('⑤ 资源：插图全部存在；本地 mp3 占位 0；音频直链 5', ()=>{
  const arr = ctx1.window.ENGLISH_LISTENING_4;
  const refs = new Set();
  arr.forEach(x=>{ (x.body.match(/assets\/listen\/t1\/[^"]+/g)||[]).forEach(r=>{ if(!r.endsWith('.mp3')) refs.add(r); }); });
  let missing=0;
  refs.forEach(r=>{ if(!fs.existsSync(path.join(SITE_DIR, r))) missing++; });
  ok('  引用插图全部存在（'+refs.size+' 张）', missing===0, 'missing='+missing);
  const mp3 = new Set();
  arr.forEach(x=>{ (x.body.match(/assets\/listen\/t1\/[^"]+\.mp3/g)||[]).forEach(r=>mp3.add(r)); });
  ok('  本地 mp3 占位 0 个（已改为直链）', mp3.size===0, 'n='+mp3.size);
  const links = new Set();
  arr.forEach(x=>{ (x.body.match(/drfs\.ctcontents\.com\/[^"]+/g)||[]).forEach(r=>links.add(r)); });
  ok('  音频直链恰好 5 个', links.size===5, 'n='+links.size);
});

safe('⑥ 版本号 + 脚本引入', ()=>{
  const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf8');
  const aw=(html.match(/20261024aw/g)||[]).length;
  const ax=(html.match(/20261024ax/g)||[]).length;
  const ay=(html.match(/20261024ay/g)||[]).length;
  ok('  index.html 0 处 aw', aw===0, 'aw='+aw);
  ok('  index.html 0 处 ax', ax===0, 'ax='+ax);
  ok('  index.html 含 ay（9 处）', ay===9, 'ay='+ay);
  ok('  index.html 引入 english_listening_4.js', html.includes('english_listening_4.js'), '');
});

let pass=0;
for(const r of results){
  console.log((r.ok?'✅':'❌')+' '+r.name + (r.extra?('  ['+r.extra+']'):''));
  if(r.ok) pass++;
}
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass===results.length?0:1);
