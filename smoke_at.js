// 冒烟测试：验证本轮 5 项改动（at 版本）
//   ① 本周目标进度 -> 目标进度
//   ② 奖励页移除「学会 / 打卡内容」卡片
//   ③ 排程分组默认折叠（无 open）
//   ④ 历史并入人文：小学不显示历史板块；初中显示历史板块
//   ⑤ 数学等科目页出现「热门主题」标签云（与语文诗词一致）
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const SITE_DIR = path.resolve(__dirname, 'site');
const FILES = ['data.js','extra.js','extra2.js','history_guide_7.js','english_reading_4.js','gallery.js','app.js'];

// ---- 最小 DOM mock ----
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
if(!S){ console.error('FAIL: __SITE__ 未注入（测试钩子未启用）'); process.exit(1); }

const results = [];
function ok(name, cond, extra){ results.push({name, ok:!!cond, extra: extra||''}); }

function safe(name, fn){ try{ fn(); }catch(e){ results.push({name, ok:false, extra:'THROW '+e.message+'\n'+((e.stack||'').split('\n').slice(0,4).join('\n'))}); } }

// ---- ① 目标进度 ----
safe('① 本周目标进度->目标进度', ()=>{
  S.state.grade = '四年级';
  S.rebuildAll();
  S.renderWeek();
  const wk = el('id:view-week').innerHTML;
  ok('  标题含「目标进度」且不含「本周目标进度」', wk.includes('目标进度') && !wk.includes('本周目标进度'), wk.includes('本周目标进度')?'仍含本周目标进度':'');
});

// ---- ② 奖励页移除 学会/打卡内容 ----
safe('② 奖励页移除「学会 / 打卡内容」卡片', ()=>{
  S.renderReward();
  const rw = el('id:view-reward').innerHTML;
  ok('  不含「学会 / 打卡内容」', !rw.includes('学会 / 打卡内容'), rw.includes('学会 / 打卡内容')?'仍含该卡片':'');
});

// ---- ⑤ 主题标签云 ----
safe('⑤ 数学页出现「热门主题」标签云', ()=>{
  S.state.custom = S.state.custom || [];
  S.state.custom.push({key:'custom:tagtest', subject:'数学', type:'公式', title:'测试公式X', body:'x', grade:'四年级', tags:['代数','几何'], volume:'', unit:'', html:false});
  S.rebuildAll();
  S.renderSubject('数学'); // 默认类型=公式
  const ms = el('id:view-subject').innerHTML;
  ok('  出现「热门主题」且含 代数/几何 标签', ms.includes('热门主题') && ms.includes('代数') && ms.includes('几何'), (ms.includes('热门主题')?'':'未出现热门主题'));
});

// ---- ③ + ④ 排程：默认折叠 + 历史并入人文 ----
safe('③ 排程默认折叠 & ④ 历史并入人文', ()=>{
  S.state.adminAuthed = true;
  // 小学
  S.state.grade = '四年级';
  S.rebuildAll();
  S.renderAdmin();
  const ad1 = el('id:view-admin').innerHTML;
  ok('  后台已渲染排程区', ad1.includes('学习板块排程'), ad1.includes('学习板块排程')?'':'未渲染排程（adminAuthed 可能未生效）');
  ok('  小学：排程默认折叠（无 open）', ad1.includes('class="sched-group"') && !ad1.includes('sched-group" open'), ad1.includes('sched-group" open')?'仍有 open':'');
  ok('  小学：不显示「历史」板块', !ad1.includes('<span class="sg-subj">历史</span>'), ad1.includes('<span class="sg-subj">历史</span>')?'仍显示历史板块':'');
  // 初中
  S.state.grade = '七年级';
  S.rebuildAll();
  S.renderAdmin();
  const ad2 = el('id:view-admin').innerHTML;
  ok('  初中：显示「历史」板块', ad2.includes('<span class="sg-subj">历史</span>'), ad2.includes('<span class="sg-subj">历史</span>')?'':'未显示历史板块');
  ok('  初中：排程默认折叠（无 open）', !ad2.includes('sched-group" open'), ad2.includes('sched-group" open')?'仍有 open':'');
});

// ---- 汇总 ----
let pass=0;
for(const r of results){
  console.log((r.ok?'✅':'❌')+' '+r.name + (r.extra?('  ['+r.extra+']'):''));
  if(r.ok) pass++;
}
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass===results.length?0:1);
