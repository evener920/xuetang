// 冒烟测试：验证本轮 3 点校准（au 版本）
//   ① 上下册成为跨学科学一维：VOLUMES 定义、资源页 volumeChips、英语单词页出现 data-gn-volume、volume 筛选生效
//   ② 卡片顺序稳定性：默认 orderMode=seq，sectionItems 严格按导入序（相对顺序递增）；smart 模式不崩
//   ③ 资源页统一分面（学科/类型/年级/册/标签）：tagChips 出现主题标签且排除结构型标签、tag 交叉筛选生效
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const SITE_DIR = path.resolve(__dirname, 'site');
const FILES = ['data.js','extra.js','extra2.js','history_guide_7.js','english_reading_4.js','gallery.js','app.js'];

// ---- 最小 DOM mock（与 smoke_at.js 一致）----
const registry = {};
function makeEl(id){
  const store = { _id:id, innerHTML:"", value:"", checked:false, hidden:false, textContent:"",
    style:{}, dataset:{}, classList:{toggle(){},add(){},remove(){},contains(){return false;}} };
  return new Proxy(store, {
    get(t,p){
      if(p in t) return t[p];
      if(p==='querySelector') return (sel)=>el(sel);
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
const documentMock = {
  getElementById:(id)=>el('id:'+id),
  querySelector:(sel)=>el(sel),
  querySelectorAll:()=>[],
  addEventListener:()=>{},
  createElement:()=>makeEl('created'),
  body:{style:{}}
};

const context = {};
context.window = context;
context.document = documentMock;
context.console = console;
context.addEventListener = ()=>{};
context.scrollTo = ()=>{};
context.setTimeout = ()=>0;
context.clearTimeout = ()=>{};
context.TextEncoder = TextEncoder;
context.TextDecoder = TextDecoder;
context.fetch = ()=>Promise.reject(new Error('no-net'));
context.location = { href:'' };
const _ls = {};
context.localStorage = {
  getItem:(k)=> (k in _ls ? _ls[k] : null),
  setItem:(k,v)=>{ _ls[k]=String(v); },
  removeItem:(k)=>{ delete _ls[k]; }
};
context.__ENABLE_TEST__ = true;

let code = FILES.map(f=>fs.readFileSync(path.join(SITE_DIR,f),'utf8')).join('\n;\n');
vm.createContext(context);
vm.runInContext(code, context, { filename:'bundle.js' });

const S = context.window.__SITE__;
if(!S){ console.error('FAIL: __SITE__ 未注入'); process.exit(1); }

const results = [];
function ok(name, cond, extra){ results.push({name, ok:!!cond, extra: extra||''}); }
function safe(name, fn){ try{ fn(); }catch(e){ results.push({name, ok:false, extra:'THROW '+e.message+'\n'+((e.stack||'').split('\n').slice(0,4).join('\n'))}); } }

// ---- ① 上下册跨学科学一维 ----
safe('① VOLUMES 维度与资源页 volumeChips', ()=>{
  S.state.grade = '四年级';
  S.rebuildAll();
  // biView 默认含 volume/tag
  const bv = S.biView;
  ok('  biView 含 volume/tag 字段', bv && bv.volume==="全部" && ('tag' in bv), JSON.stringify(bv));
  const D = S.biData();
  ok('  biData 产出 volumeChips', Array.isArray(D.volumeChips) && D.volumeChips.length>=1, D.volumeChips&&D.volumeChips.map(x=>x[0]).join(','));
  ok('  volumeChips 含 上册/下册', D.volumeChips.some(x=>x[0]==="上册") && D.volumeChips.some(x=>x[0]==="下册"), D.volumeChips&&D.volumeChips.map(x=>x[0]).join(','));
});

safe('① 英语单词页出现 data-gn-volume（跨学科学一维落地）', ()=>{
  S.state.grade = '三年级';
  S.rebuildAll();
  S.renderSubject('英语'); // 默认类型=单词
  const ms = el('id:view-subject').innerHTML;
  ok('  英语·单词页出现 data-gn-volume 册筛选', ms.includes('data-gn-volume'), ms.includes('data-gn-volume')?'':'未出现册筛选');
});

safe('① 资源页 volume 筛选生效（上册只含上册条目）', ()=>{
  S.state.grade = '四年级';
  S.rebuildAll();
  S.biView.subj = '英语'; S.biView.type = '单词'; S.biView.volume = '上册'; S.biView.tag = '';
  const D1 = S.biData();
  ok('  volume=上册 时筛选结果都带 volume=上册', D1.filtered.length>0 && D1.filtered.every(x=>x.volume==="上册"), 'count='+D1.filtered.length);
  S.biView.volume = '全部';
  const D2 = S.biData();
  ok('  volume=全部 时数量 >= 上册数量', D2.filtered.length >= D1.filtered.length, `${D2.filtered.length} >= ${D1.filtered.length}`);
});

// ---- ② 卡片顺序稳定性 ----
safe('② 默认 orderMode=seq', ()=>{
  S.state.grade = '四年级';
  S.rebuildAll();
  ok('  state.orderMode 默认 seq', S.state.orderMode==="seq", String(S.state.orderMode));
});

safe('② seq 模式 sectionItems 严格按导入序（相对顺序递增）', ()=>{
  S.state.orderMode = 'seq';
  const pool = S.poolFor('语文','诗词');
  ok('  pool 非空', pool.length>0, 'len='+pool.length);
  const got = S.sectionItems('语文','诗词', 5);
  ok('  取到条目', got.length>0, 'got='+got.length);
  const idxs = got.map(it=>pool.findIndex(p=>p.key===it.key));
  const increasing = idxs.every((v,i)=> i===0 || v>idxs[i-1]);
  ok('  返回条目在 pool 中相对顺序递增（导入序）', increasing, 'idxs='+JSON.stringify(idxs));
});

safe('② smart 模式 sectionItems 不崩且返回 <= quota', ()=>{
  S.state.orderMode = 'smart';
  const got = S.sectionItems('语文','诗词', 5);
  ok('  smart 返回条目数 <= 5', got.length<=5 && got.length>0, 'got='+got.length);
  S.state.orderMode = 'seq'; // 还原
});

// ---- ③ 资源页统一分面：标签维度 ----
safe('③ 资源页 tagChips 出现主题标签且排除结构型标签', ()=>{
  S.state.grade = '四年级';
  S.rebuildAll();
  S.biView.subj='全部'; S.biView.type='全部'; S.biView.grade='全部'; S.biView.volume='全部'; S.biView.tag='';
  const D = S.biData();
  ok('  tagChips 存在且含主题标签', Array.isArray(D.tagChips) && D.tagChips.length>1, D.tagChips&&D.tagChips.slice(0,6).map(x=>x[0]).join(','));
  const gradeLike = D.tagChips.filter(x=>['一年级','二年级','三年级','四年级','五年级','六年级','上册','下册','语文','数学'].includes(x[0]));
  ok('  tagChips 不含结构型标签（年级/册/学科）', gradeLike.length===0, '误含: '+gradeLike.map(x=>x[0]).join(','));
});

safe('③ 标签交叉筛选生效（语文 + 主题标签 -> 仅该主题诗词）', ()=>{
  S.state.grade = '四年级';
  S.rebuildAll();
  // 取一个真实存在的诗词主题标签
  const poem = S.ALL.find(x=>x.subject==='语文' && x.type==='诗词' && x.tags && x.tags.length);
  ok('  存在带标签的诗词', !!poem, '');
  if(poem){
    const tag = poem.tags[0];
    S.biView.subj='语文'; S.biView.type='全部'; S.biView.grade='全部'; S.biView.volume='全部'; S.biView.tag=tag;
    const D = S.biData();
    ok('  筛选后全部命中主题标签', D.filtered.length>0 && D.filtered.every(x=>(x.tags||[]).includes(tag)), 'count='+D.filtered.length+' tag='+tag);
    ok('  筛选结果均为语文诗词', D.filtered.every(x=>x.subject==='语文' && x.type==='诗词'), '');
  }
});

safe('③ renderRes 不崩且含册/标签分面行', ()=>{
  S.state.grade = '四年级';
  S.rebuildAll();
  S.renderRes();
  const rs = el('id:view-res').innerHTML;
  ok('  renderRes 含「册：」分面', rs.includes('>册：<'), '');
  ok('  renderRes 含「标签：」分面', rs.includes('>标签：<'), '');
});

// ---- index.html 版本号 bump ----
safe('版本号 bump at->au (8 处)', ()=>{
  const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf8');
  const au = (html.match(/20261024au/g)||[]).length;
  const at = (html.match(/20261024at/g)||[]).length;
  ok('  index.html 含 8 处 au 且 0 处 at', au===8 && at===0, `au=${au}, at=${at}`);
});

// ---- 汇总 ----
let pass=0;
for(const r of results){
  console.log((r.ok?'✅':'❌')+' '+r.name + (r.extra?('  ['+r.extra+']'):''));
  if(r.ok) pass++;
}
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass===results.length?0:1);
