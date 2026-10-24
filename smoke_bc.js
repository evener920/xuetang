// 冒烟测试：bc 版本 —— 小学科学 · 地理大百科动画画廊（62 集 B 站视频卡）导入
//   ① 正常启动：62 张 sci 卡注入 state.custom + flag 置位
//   ② 每张卡：subject=科学 / type=动画 / 含"小学科学"标签 / videos 为 B 站播放器直链
//   ③ 源码守卫：scienceGallery 种子 + 自愈分支 + SUBJECT_TYPES 含"动画" + 动画 badge 颜色 + 播放标签含动画
//   ④ 版本号：10×bc、0×ba
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const SITE_DIR = path.resolve(__dirname, 'site');
const FILES = ['data.js','extra.js','extra2.js','history_guide_7.js','english_reading_4.js','english_listening_4.js','gallery.js','science_gallery.js','app.js'];

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
  return { getElementById:(id)=>el('id:'+id), querySelector:(sel)=>el(sel), querySelectorAll:()=>[],
    addEventListener:()=>{}, createElement:()=>makeEl('created'), body:{style:{}} };
}
function makeCtx(lsStore){
  const context = {};
  context.window = context;
  context.document = makeDocMock();
  context.console = console;
  context.addEventListener = ()=>{}; context.scrollTo = ()=>{};
  context.setTimeout = ()=>0; context.clearTimeout = ()=>{};
  context.TextEncoder = TextEncoder; context.TextDecoder = TextDecoder;
  context.fetch = ()=>Promise.reject(new Error('no-net')); context.location = { href:'' };
  context.localStorage = {
    getItem:(k)=> (k in lsStore ? lsStore[k] : null),
    setItem:(k,v)=>{ lsStore[k]=String(v); }, removeItem:(k)=>{ delete lsStore[k]; }
  };
  context.__ENABLE_TEST__ = true;
  return context;
}
function bundleCode(){ return FILES.map(f=>fs.readFileSync(path.join(SITE_DIR,f),'utf8')).join('\n;\n'); }

const results = [];
function ok(name, cond, extra){ results.push({name, ok:!!cond, extra: extra||''}); }
function safe(name, fn){ try{ fn(); }catch(e){ results.push({name, ok:false, extra:'THROW '+e.message+'\n'+((e.stack||'').split('\n').slice(0,4).join('\n'))}); } }

const CODE = bundleCode();
const sciSrc = JSON.parse(fs.readFileSync(path.join(SITE_DIR,'science_gallery.js'),'utf8')
  .match(/window\.SCIENCE_GALLERY\s*=\s*(\[[\s\S]*\])\s*;/)[1]);

safe('① 正常启动（空 localStorage）：62 张 sci 卡注入 + flag 置位', ()=>{
  const ctx = makeCtx({});
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename:'bundle.js' });
  const S = ctx.window.__SITE__;
  ok('  __SITE__ 注入', !!S, '');
  const sci = (S.state.custom||[]).filter(x=>/^sci:\d+$/.test(x.key));
  ok('  custom 含 62 张 sci 卡', sci.length===62, 'n='+sci.length);
  ok('  seeded.scienceGallery=true', S.state.seeded && S.state.seeded.scienceGallery===true, '');
});

safe('② 每张卡：学科/类型/标签/视频直链', ()=>{
  let badSubj=0, badType=0, badTag=0, badVid=0, badPage=0;
  for(const c of sciSrc){
    if(c.subject!=="科学") badSubj++;
    if(c.type!=="动画") badType++;
    if(!Array.isArray(c.tags) || !c.tags.includes("小学科学")) badTag++;
    if(!Array.isArray(c.videos) || c.videos.length!==1) badVid++;
    else {
      const u = c.videos[0];
      const m = u.match(/player\.bilibili\.com\/player\.html\?bvid=BV1jK7DzAERo&page=(\d+)/);
      if(!m) badVid++;
      else if(parseInt(m[1],10) !== parseInt(c.key.split(':')[1],10)) badPage++;
    }
  }
  ok('  全部 subject=科学', badSubj===0, '缺='+badSubj);
  ok('  全部 type=动画', badType===0, '缺='+badType);
  ok('  全部含 小学科学 标签', badTag===0, '缺='+badTag);
  ok('  全部含 1 条 B 站播放器直链', badVid===0, '缺='+badVid);
  ok('  播放器 page 与卡片序号一致', badPage===0, '错='+badPage);
});

safe('③ 源码守卫', ()=>{
  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  seed 含 scienceGallery', code.includes('flag:"scienceGallery"'), '');
  ok('  seed 含 sci: 自愈分支', code.includes('scienceGallery" && state.seeded[s.flag]'), '');
  ok('  SUBJECT_TYPES[\"科学\"] 含 动画', /"科学":\[[^\]]*"动画"/.test(code), '');
  ok('  badge 颜色含 动画', code.includes('"动画":['), '');
  ok('  播放标签含 动画 分支', code.includes('it.type==="成语动画廊"||it.type==="动画"'), '');
});

safe('④ 版本号', ()=>{
  const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf8');
  const ba=(html.match(/20261024ba/g)||[]).length;
  const bc=(html.match(/20261024bc/g)||[]).length;
  ok('  0 处 ba', ba===0, 'ba='+ba);
  ok('  10 处 bc（含 science_gallery.js）', bc===10, 'bc='+bc);
  ok('  引入 science_gallery.js', html.includes('science_gallery.js'), '');
});

let pass=0;
for(const r of results){
  console.log((r.ok?'✅':'❌')+' '+r.name + (r.extra?('  ['+r.extra+']'):''));
  if(r.ok) pass++;
}
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass===results.length?0:1);
