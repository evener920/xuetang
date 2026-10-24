// 冒烟测试：闪卡浏览功能（av 版本）
//   ① 学科页出现「🃏 闪卡」入口（英语 renderGeneric + 语文 renderChinese），并挂载当前筛选池
//   ② openFlashcards 出卡：正面=标题，排除 practice:maththought / mtq:；空池安全
//   ③ 翻面：显示释义/全文 + 「藏起答案」；切换：idx 前进且翻面复位
//   ④ 我会了：记 learned + 默认 5 星 + 前进下一张
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const SITE_DIR = path.resolve(__dirname, 'site');
const FILES = ['data.js','extra.js','extra2.js','history_guide_7.js','english_reading_4.js','gallery.js','app.js'];

// ---- 最小 DOM mock（与 smoke_at/au 一致）----
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

// ---- ① 入口按钮 ----
safe('① 英语·单词页出现 data-gn-flash 入口', ()=>{
  S.state.grade='三年级'; S.rebuildAll();
  S.renderSubject('英语');
  const ms = el('id:view-subject').innerHTML;
  ok('  含 data-gn-flash 按钮', ms.includes('data-gn-flash'), ms.includes('data-gn-flash')?'':'未出现');
  ok('  学科池 _gnPool 已挂载', Array.isArray(el('id:view-subject')._gnPool) && el('id:view-subject')._gnPool.length>0, 'len='+(el('id:view-subject')._gnPool||[]).length);
});
safe('① 语文·诗词页出现 data-cn-flash 入口', ()=>{
  S.state.grade='四年级'; S.rebuildAll();
  S.renderSubject('语文');
  const ms = el('id:view-subject').innerHTML;
  ok('  含 data-cn-flash 按钮', ms.includes('data-cn-flash'), ms.includes('data-cn-flash')?'':'未出现');
  ok('  语文池 _cnPool 已挂载', Array.isArray(el('id:view-subject')._cnPool) && el('id:view-subject')._cnPool.length>0, 'len='+(el('id:view-subject')._cnPool||[]).length);
});

// ---- ② 出卡 ----
safe('② openFlashcards 出卡（正面=标题，排除 practice/mtq）', ()=>{
  S.state.grade='四年级'; S.rebuildAll();
  const deck = [
    {key:'custom:fc1', subject:'英语', type:'单词', title:'classroom', sub:'/klɑːsruːm/', body:'教室', grade:'三年级', tags:[], videos:[]},
    {key:'practice:maththought', subject:'数学', type:'思维母题', title:'打散练习', body:'', grade:'四年级', tags:[], videos:[]},
    {key:'mtq:x1', subject:'数学', type:'思维母题', title:'mtq', body:'q', grade:'四年级', tags:[], videos:[]}
  ];
  S.openFlashcards(deck, '英语 · 单词');
  const st = S.fcState;
  ok('  牌组排除 practice:maththought / mtq:', st.deck.length===1 && st.deck[0].key==='custom:fc1', 'len='+st.deck.length);
  ok('  初始未翻面 idx=0', st.flipped===false && st.idx===0, '');
  const mb = el('id:modal-body').innerHTML;
  ok('  弹窗为闪卡形态（fc-card + 进度）', mb.includes('fc-card') && mb.includes('1 / 1'), '');
  ok('  正面只出标题不剧透释义', mb.includes('classroom') && !mb.includes('教室'), mb.includes('教室')?'正面泄漏了释义':'');
});
safe('② 空池安全（不渲染不崩溃）', ()=>{
  S.openFlashcards([], '空');
  ok('  空池调用不抛错', true, '');
});

// ---- ③ 翻面 / 切换 ----
safe('③ 翻面显示释义、切换复位', ()=>{
  const deck = [
    {key:'poem:t1', subject:'语文', type:'诗词', title:'静夜思', sub:'李白 · 唐', body:'床前明月光，疑是地上霜。', grade:'一年级', tags:[], videos:[]},
    {key:'poem:t2', subject:'语文', type:'诗词', title:'春晓', sub:'孟浩然 · 唐', body:'春眠不觉晓。', grade:'一年级', tags:[], videos:[]}
  ];
  S.openFlashcards(deck, '语文 · 诗词');
  let mb = el('id:modal-body').innerHTML;
  ok('  正面：诗题+作者，无正文', mb.includes('静夜思') && mb.includes('李白') && !mb.includes('床前明月光'), '');
  S.fcFlip();
  mb = el('id:modal-body').innerHTML;
  ok('  背面：显示全文 + 藏起答案按钮', mb.includes('床前明月光') && mb.includes('藏起答案'), '');
  S.fcNav(1);
  mb = el('id:modal-body').innerHTML;
  const st = S.fcState;
  ok('  下一张：idx=1 且翻面复位（正面为第二首）', st.idx===1 && st.flipped===false && mb.includes('春晓') && !mb.includes('春眠不觉晓'), 'idx='+st.idx);
  S.fcNav(-1);
  ok('  上一张：回到 idx=0', S.fcState.idx===0, '');
  S.fcShuffle();
  ok('  乱序：开关打开且回到第 1 张', S.fcState.shuffle===true && S.fcState.idx===0, '');
});

// ---- ④ 我会了 ----
safe('④ fcKnown 记学会 + 默认5星 + 前进', ()=>{
  S.state.grade='四年级'; S.rebuildAll();
  const deck = [
    {key:'custom:fck1', subject:'语文', type:'成语', title:'测试成语A', sub:'', body:'测试释义A', grade:'四年级', tags:[], videos:[]},
    {key:'custom:fck2', subject:'语文', type:'成语', title:'测试成语B', sub:'', body:'测试释义B', grade:'四年级', tags:[], videos:[]}
  ];
  S.openFlashcards(deck, '语文 · 成语');
  const before = S.fcState.idx;
  S.fcKnown();
  const st = S.fcState;
  ok('  learned 已记录', !!S.state.learned['custom:fck1'], '');
  ok('  默认置 5 星', S.getMastery('custom:fck1')===5, 'm='+S.getMastery('custom:fck1'));
  ok('  自动前进到下一张', st.idx===before+1 && st.deck[st.order[st.idx]].key==='custom:fck2', 'idx='+st.idx);
  ok('  新卡未学会', !S.state.learned['custom:fck2'], '');
});

// ---- 版本号 ----
safe('版本号 bump au->av (8 处)', ()=>{
  const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf8');
  const av = (html.match(/20261024av/g)||[]).length;
  const au = (html.match(/20261024au/g)||[]).length;
  ok('  index.html 含 8 处 av 且 0 处 au', av===8 && au===0, `av=${av}, au=${au}`);
});

// ---- 汇总 ----
let pass=0;
for(const r of results){
  console.log((r.ok?'✅':'❌')+' '+r.name + (r.extra?('  ['+r.extra+']'):''));
  if(r.ok) pass++;
}
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass===results.length?0:1);
