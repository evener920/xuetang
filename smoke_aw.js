// 冒烟测试：2026秋新教材四年级上册单词表替换（aw 版本）
//   ① data.js 内容：四年级上册 110 词、单元分布 19/14/18/14/24/21、首 PE 尾 then、老词已移除
//   ② 键稳定性：word:182=PE（槽位替换）、word:181/word:265 等其他年级未变、池内单元顺序 Unit1→6
//   ③ 渲染：四年级英语·单词页含新词与 Unit 1..6 单元 chips、无老词；volume=上册
//   ④ 一次性迁移：word:182..264 的 learned/fav/mastery/reviewed/overrides/videos 被清，其他键保留，flag 置位
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const SITE_DIR = path.resolve(__dirname, 'site');
const FILES = ['data.js','extra.js','extra2.js','history_guide_7.js','english_reading_4.js','gallery.js','app.js'];

// ---- 最小 DOM mock（与 smoke_at/au/av 一致）----
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
function makeDocMock(lsStore){
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
  context.document = makeDocMock(lsStore);
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

// ================= 主 context：内容与渲染 =================
const ls1 = {};
const ctx1 = makeCtx(ls1);
vm.createContext(ctx1);
vm.runInContext(bundleCode(), ctx1, { filename:'bundle.js' });
const S = ctx1.window.__SITE__;
if(!S){ console.error('FAIL: __SITE__ 未注入'); process.exit(1); }

// ---- ① data.js 内容 ----
safe('① data.js 四年级上册 = 110 词（新教材）', ()=>{
  const raw = JSON.parse(fs.readFileSync(path.join(SITE_DIR,'data.js'),'utf8').slice(fs.readFileSync(path.join(SITE_DIR,'data.js'),'utf8').indexOf('=')+1).replace(/;\s*$/,''));
  const g4 = raw.words.filter(w=>w.grade==='四年级上册');
  ok('  总数 110（老版 83）', g4.length===110, 'n='+g4.length);
  const byUnit={}; g4.forEach(w=>byUnit[w.unit]=(byUnit[w.unit]||0)+1);
  ok('  单元分布 19/14/18/14/24/21', JSON.stringify(byUnit)===JSON.stringify({"Unit 1":19,"Unit 2":14,"Unit 3":18,"Unit 4":14,"Unit 5":24,"Unit 6":21}), JSON.stringify(byUnit));
  ok('  首词 PE、尾词 then', g4[0].text==='PE' && g4[g4.length-1].text==='then', g4[0].text+'..'+g4[g4.length-1].text);
  const texts = new Set(g4.map(w=>w.text));
  ok('  老教材词已移除（classroom/window/blackboard/schoolbag）', !texts.has('classroom')&&!texts.has('window')&&!texts.has('blackboard')&&!texts.has('schoolbag'), '');
  ok('  新词带音标与中文', g4.every(w=>w.phonetic&&w.cn&&w.text), '');
  ok('  词形抽查（delivery worker / police officer / get together / T-shirt）', texts.has('delivery worker')&&texts.has('police officer')&&texts.has('get together')&&texts.has('T-shirt'), '');
});

// ---- ② 键稳定性 + 池顺序 ----
safe('② 槽位键 word:182=PE，其他年级键未变', ()=>{
  ok('  word:182 → PE', S.INDEX['word:182'] && S.INDEX['word:182'].title==='PE', S.INDEX['word:182']&&S.INDEX['word:182'].title);
  ok('  word:233 → Unit 4 首词 firefighter', S.INDEX['word:233'] && S.INDEX['word:233'].title==='firefighter', S.INDEX['word:233']&&S.INDEX['word:233'].title);
  ok('  word:181（三年级下册末）未变', S.INDEX['word:181'] && S.INDEX['word:181'].title==='beautiful', S.INDEX['word:181']&&S.INDEX['word:181'].title);
  ok('  word:265（四年级下册首）未变', S.INDEX['word:265'] && S.INDEX['word:265'].title==='first floor', S.INDEX['word:265']&&S.INDEX['word:265'].title);
  ok('  word:1266..1292 = 追加的 27 词（Unit 5 后半 + Unit 6）', S.INDEX['word:1266'] && S.INDEX['word:1292'] && S.INDEX['word:1292'].title==='then', S.INDEX['word:1266']&&S.INDEX['word:1266'].title);
});
safe('② 池内单元顺序保持 Unit 1→6（seq 顺序感）', ()=>{
  S.state.grade='四年级'; S.rebuildAll();
  const all = S.poolFor('英语','单词');
  ok('  volume=全部 池 = 上册110 + 下册104', all.length===214, 'n='+all.length);
  const pool = all.filter(w=>w.volume==='上册');
  const units=[]; pool.forEach(w=>{ if(units[units.length-1]!==w.unit) units.push(w.unit); });
  ok('  上册单元出现顺序 Unit 1..6', JSON.stringify(units)===JSON.stringify(['Unit 1','Unit 2','Unit 3','Unit 4','Unit 5','Unit 6']), JSON.stringify(units));
  ok('  上册池长度 110', pool.length===110, 'n='+pool.length);
  ok('  上册全部 grade=四年级', pool.every(w=>w.grade==='四年级'&&w.volume==='上册'), '');
});

// ---- ③ 渲染 ----
safe('③ 四年级英语·单词页渲染新词与单元 chips', ()=>{
  S.state.grade='四年级'; S.rebuildAll();
  S.renderSubject('英语');
  const ms = el('id:view-subject').innerHTML;
  ok('  出现新词 PE', ms.includes('>PE<')||ms.includes('PE'), '');
  ok('  单元 chips 含 Unit 6', ms.includes('Unit 6') && ms.includes('data-gn-unit'), '');
  ok('  不再出现老词 classroom', !ms.includes('classroom'), '');
});

// ================= 迁移 context：预置 stale state =================
safe('④ 一次性迁移清除 word:182..264 旧记录、保留其他键', ()=>{
  const stale = {
    students:{
      s1:{ name:"学生1", data:{ learned:{"word:182":"2026-09-01","word:100":"2026-09-02","word:265":"2026-09-03"},
                                fav:{"word:183":true,"word:101":true},
                                mastery:{"word:184":5,"word:102":3},
                                reviewed:{"2026-10-01":{"word:185":true,"word:103":true}} } },
      s2:{ name:"学生2", data:{ learned:{"word:200":"2026-09-05","word:300":"2026-09-06"} } }
    },
    currentStudent:"s1",
    overrides:{"word:186":"覆盖","word:105":"keep"},
    videos:{"word:187":["u"],"word:106":["u2"]}
  };
  const ls2 = { xuetang_site_v1: JSON.stringify(stale) };
  const ctx2 = makeCtx(ls2);
  vm.createContext(ctx2);
  vm.runInContext(bundleCode(), ctx2, { filename:'bundle2.js' });
  const S2 = ctx2.window.__SITE__;
  const st = S2.state;
  ok('  flag 已置位', st.migG4Words2026===true, '');
  const s1=st.students.s1.data, s2=st.students.s2.data;
  ok('  s1: word:182 learned 已清', !s1.learned['word:182'], '');
  ok('  s1: word:100 保留', !!s1.learned['word:100'], '');
  ok('  s1: word:265 保留（四年级下册首词，未受影响）', !!s1.learned['word:265'], '');
  ok('  s1: fav word:183 清 / word:101 保留', !s1.fav['word:183']&&!!s1.fav['word:101'], '');
  ok('  s1: mastery word:184 清 / word:102 保留', s1.mastery['word:184']===undefined&&s1.mastery['word:102']===3, '');
  ok('  s1: reviewed 按日期内 word:185 清 / word:103 保留', !s1.reviewed['2026-10-01']['word:185']&&!!s1.reviewed['2026-10-01']['word:103'], '');
  ok('  s2: word:200 清 / word:300 保留', !s2.learned['word:200']&&!!s2.learned['word:300'], '');
  ok('  overrides word:186 清 / word:105 保留', !st.overrides['word:186']&&st.overrides['word:105']==='keep', '');
  ok('  videos word:187 清 / word:106 保留', !st.videos['word:187']&&!!st.videos['word:106'], '');
  // 持久化验证：保存后的 localStorage 不再含 stale 键
  const saved = JSON.parse(ls2['xuetang_site_v1']);
  ok('  已持久化（localStorage 同步清除）', !JSON.stringify(saved).includes('"word:182"') && saved.migG4Words2026===true, '');
  // 幂等：再跑一次加载不崩（flag 短路）
  const ctx3 = makeCtx(ls2);
  vm.createContext(ctx3);
  vm.runInContext(bundleCode(), ctx3, { filename:'bundle3.js' });
  ok('  二次加载幂等不崩', !!ctx3.window.__SITE__, '');
});

// ---- 版本号 ----
safe('版本号 bump av->aw (8 处)', ()=>{
  const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf8');
  const aw = (html.match(/20261024aw/g)||[]).length;
  const av = (html.match(/20261024av/g)||[]).length;
  ok('  index.html 含 8 处 aw 且 0 处 av', aw===8 && av===0, `aw=${aw}, av=${av}`);
});

// ---- 汇总 ----
let pass=0;
for(const r of results){
  console.log((r.ok?'✅':'❌')+' '+r.name + (r.extra?('  ['+r.extra+']'):''));
  if(r.ok) pass++;
}
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass===results.length?0:1);
