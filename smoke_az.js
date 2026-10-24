// 冒烟测试：az 版本 —— seedDefaultContent 自愈修复
//   ① 正常启动（空 localStorage）：5 张 ls4 卡注入 + flag 置位（回归）
//   ② 污染状态（flag=true 但 custom 无任何 ls4 卡）：重新注入 5 张卡（自愈）
//   ③ 源码含空 src 防污染守卫
//   ④ 版本号：0×ay、9×az、0×ax/aw
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

const CODE = bundleCode();

safe('① 正常启动（空 localStorage）：5 张 ls4 卡注入 + flag 置位（回归）', ()=>{
  const ctx = makeCtx({});
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename:'bundle.js' });
  const S = ctx.window.__SITE__;
  ok('  __SITE__ 注入', !!S, '');
  const ls4 = (S.state.custom||[]).filter(x=>/^ls4:\d+$/.test(x.key));
  ok('  custom 含 5 张 ls4 卡', ls4.length===5, 'n='+ls4.length);
  ok('  seeded.englishListening4=true', S.state.seeded && S.state.seeded.englishListening4===true, '');
  ok('  其他种子不受影响（rd4 仍在）', (S.state.custom||[]).some(x=>/^rd4:/.test(x.key)), '');
});

safe('② 污染状态（flag=true 但无 ls4 卡）：自愈重新注入', ()=>{
  const poisoned = {
    grade:"四年级",
    seeded:{ historyGuide:true, englishReading4v2:true, englishListening4:true },
    custom:[{key:"custom:demo", subject:"英语", type:"单词", grade:"四年级", title:"演示", body:"x"}],
    students:{ s1:{ name:"大宝", data:{} } },
    currentStudent:"s1"
  };
  const lsStore = { "xuetang_site_v1": JSON.stringify(poisoned) };
  const ctx = makeCtx(lsStore);
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename:'bundle2.js' });
  const S = ctx.window.__SITE__;
  ok('  __SITE__ 注入', !!S, '');
  const ls4 = (S.state.custom||[]).filter(x=>/^ls4:\d+$/.test(x.key));
  ok('  自愈：custom 重新注入 5 张 ls4 卡', ls4.length===5, 'n='+ls4.length);
  ok('  flag 保持 true（不重复注入）', S.state.seeded && S.state.seeded.englishListening4===true, '');
  ok('  原有 custom:demo 未丢失', (S.state.custom||[]).some(x=>x.key==='custom:demo'), '');
  ok('  保存落盘（localStorage 更新）', (()=>{ try{ const s=JSON.parse(lsStore["xuetang_site_v1"]); return (s.custom||[]).filter(x=>/^ls4:/.test(x.key)).length===5; }catch(e){ return false; } })(), '');
});

safe('③ 源码守卫：空 src 不置位 flag', ()=>{
  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  含 if(!s.src.length) return; 守卫', code.includes('if(!s.src.length) return;'), '');
  ok('  含 ls4 自愈分支', code.includes('englishListening4" && state.seeded[s.flag]'), '');
});

safe('④ 版本号', ()=>{
  const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf8');
  const ay=(html.match(/20261024ay/g)||[]).length;
  const az=(html.match(/20261024az/g)||[]).length;
  ok('  0 处 ay', ay===0, 'ay='+ay);
  ok('  9 处 az', az===9, 'az='+az);
  ok('  引入 english_listening_4.js', html.includes('english_listening_4.js'), '');
});

let pass=0;
for(const r of results){
  console.log((r.ok?'✅':'❌')+' '+r.name + (r.extra?('  ['+r.extra+']'):''));
  if(r.ok) pass++;
}
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass===results.length?0:1);
