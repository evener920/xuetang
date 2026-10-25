// 冒烟测试：be 版本 —— 四年级英语听力全量 100 篇导入 + 旧 5 卡迁移（v2 flag）
//   ① 正常启动：100 张 ls4 卡注入 + englishListening4v2 flag 置位
//   ② 每张卡含音频直链、至少 1 个可点选项（A-E / 判断 / 复选 / 图片选项）
//   ③ 卡片引用的插图文件全部存在于磁盘
//   ④ 源码守卫（空 src 不置位 flag / ls4 自愈 / 旧 flag 迁移）
//   ⑤ 迁移：云端旧包（englishListening4=true + 5 张旧卡）→ 清旧卡重注 100 张
//   ⑥ 版本号：10×br、0×bq、0×bp、0×bo、0×bn、0×bm、0×bl、0×bk、0×ba、0×az（听力卡仍在当前发布中）
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
const ls4Src = JSON.parse(fs.readFileSync(path.join(SITE_DIR,'english_listening_4.js'),'utf8')
  .match(/window\.ENGLISH_LISTENING_4\s*=\s*(\[[\s\S]*\])\s*;/)[1]);

safe('① 正常启动（空 localStorage）：100 张 ls4 卡注入 + flag 置位', ()=>{
  const ctx = makeCtx({});
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename:'bundle.js' });
  const S = ctx.window.__SITE__;
  ok('  __SITE__ 注入', !!S, '');
  const ls4 = (S.state.custom||[]).filter(x=>/^ls4:\d+$/.test(x.key));
  ok('  custom 含 100 张 ls4 卡', ls4.length===100, 'n='+ls4.length);
  ok('  seeded.englishListening4v2=true', S.state.seeded && S.state.seeded.englishListening4v2===true, '');
  ok('  旧 flag englishListening4 不置位', S.state.seeded && S.state.seeded.englishListening4!==true, '');
  ok('  其他种子不受影响（rd4 仍在）', (S.state.custom||[]).some(x=>/^rd4:/.test(x.key)), '');
});

safe('② 每张卡：音频 + 至少 1 个选项 + html 标记', ()=>{
  let noAudio=0, noOpt=0, noHtml=0, noAudioSrc=0;
  for(const c of ls4Src){
    const b = c.body||'';
    if(!b.includes('controls preload="none"')) noAudio++;
    if(!b.includes('src="http') && !b.match(/src="[^"]+\.mp3"/)) noAudioSrc++;
    const opts = (b.match(/ls-opt/g)||[]).length - (b.match(/ls-opt-img/g)||[]).length;
    const optimg = (b.match(/ls-opt-img/g)||[]).length;
    if(opts===0 && optimg===0) noOpt++;
    if(!c.html) noHtml++;
  }
  ok('  全部含音频播放器', noAudio===0, '缺='+noAudio);
  ok('  全部含 mp3 直链', noAudioSrc===0, '缺='+noAudioSrc);
  ok('  全部含至少 1 个可点选项', noOpt===0, '缺='+noOpt);
  ok('  全部 html=true', noHtml===0, '缺='+noHtml);
});

safe('③ 卡片引用插图全部存在磁盘', ()=>{
  const refs = new Set();
  for(const c of ls4Src){
    const m = c.body.match(/assets\/listen\/im\/[^"]+/g)||[];
    m.forEach(x=>refs.add(x));
  }
  let missing=0; const sample=[];
  for(const r of refs){
    const fp = path.join(SITE_DIR, r);
    if(!fs.existsSync(fp)){ missing++; if(sample.length<5) sample.push(r); }
  }
  ok('  引用插图总数>1000', refs.size>1000, 'n='+refs.size);
  ok('  缺失插图=0', missing===0, '缺='+missing+' 例='+sample.join(','));
});

safe('④ 源码守卫', ()=>{
  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  含 if(!s.src.length) return; 守卫', code.includes('if(!s.src.length) return;'), '');
  ok('  含 ls4 自愈分支（v2）', code.includes('englishListening4v2" && state.seeded[s.flag]'), '');
  ok('  含旧 flag 迁移（v2 未置位时作废旧 flag）', code.includes('state.seeded.englishListening4 = false'), '');
  ok('  含选项点选委托（ls-opt）', code.includes('closest(".ls-opt")'), '');
  ok('  含图片选项点选委托（ls-opt-img）', code.includes('closest(".ls-opt-img")'), '');
  ok('  含对答案按钮委托（ls-check）', code.includes('closest(".ls-check")'), '');
});

safe('⑤ 迁移：云端旧包（englishListening4=true + 5 张旧卡）→ 清旧卡重注 100 张', ()=>{
  const oldCards = [];
  for(let i=1;i<=5;i++) oldCards.push({key:'ls4:'+i, subject:'英语', type:'听力', grade:'四年级',
    title:'Topic 1 · Exercise '+i, sub:'Family life(家庭生活)', html:false, body:'<p>旧版无选项卡</p>'});
  const poisoned = {
    grade:"四年级",
    seeded:{ historyGuide:true, englishReading4v2:true, englishListening4:true },
    custom:[...oldCards, {key:"custom:demo", subject:"英语", type:"单词", grade:"四年级", title:"演示", body:"x"}],
    students:{ s1:{ name:"大宝", data:{} } },
    currentStudent:"s1"
  };
  const lsStore = { "xuetang_site_v1": JSON.stringify(poisoned) };
  const ctx = makeCtx(lsStore);
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename:'bundle3.js' });
  const S = ctx.window.__SITE__;
  const ls4 = (S.state.custom||[]).filter(x=>/^ls4:\d+$/.test(x.key));
  ok('  迁移后 custom 含 100 张 ls4 卡', ls4.length===100, 'n='+ls4.length);
  ok('  全部为新版卡（html=true，旧 5 卡被替换）', ls4.filter(x=>x.html===true).length===100, '新='+ls4.filter(x=>x.html===true).length);
  ok('  旧 flag englishListening4 已作废', S.state.seeded && S.state.seeded.englishListening4===false, '');
  ok('  新 flag englishListening4v2 已置位', S.state.seeded && S.state.seeded.englishListening4v2===true, '');
  ok('  原有 custom:demo 未丢失', (S.state.custom||[]).some(x=>x.key==='custom:demo'), '');
  ok('  保存落盘（localStorage 100 张）', (()=>{ try{ const s=JSON.parse(lsStore["xuetang_site_v1"]); return (s.custom||[]).filter(x=>/^ls4:/.test(x.key)).length===100; }catch(e){ return false; } })(), '');
});

safe('⑥ 版本号', ()=>{
  const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf8');
  const az=(html.match(/20261024az/g)||[]).length;
  const ba=(html.match(/20261024ba/g)||[]).length;
  const bd=(html.match(/20261024bd/g)||[]).length;
  const bf=(html.match(/20261024bf/g)||[]).length;
  const bg=(html.match(/20261024bg/g)||[]).length;
  const bh=(html.match(/20261024bh/g)||[]).length;
  const bi=(html.match(/20261024bi/g)||[]).length;
  const bj=(html.match(/20261024bj/g)||[]).length;
  const bk=(html.match(/20261024bk/g)||[]).length;
  const bl=(html.match(/20261024bl/g)||[]).length;
  const bm=(html.match(/20261024bm/g)||[]).length;
  const bn=(html.match(/20261024bn/g)||[]).length;
  const bo=(html.match(/20261024bo/g)||[]).length;
  const bp=(html.match(/20261024bp/g)||[]).length;
  const bq=(html.match(/20261024bq/g)||[]).length;
  const br=(html.match(/20261024br/g)||[]).length;
  const bs=(html.match(/20261024bs/g)||[]).length;
  const bv=(html.match(/20261025bv/g)||[]).length;
  const bw=(html.match(/20261025bz/g)||[]).length;
  ok('  0 处 az', az===0, 'az='+az);
  ok('  0 处 ba', ba===0, 'ba='+ba);
  ok('  0 处 bd（已升级至 bt）', bd===0, 'bd='+bd);
  ok('  0 处 bf/bg/bh/bi/bj/bk/bl/bm/bn/bo/bp/bq/br/bs（已升级至 bt）', bf===0&&bg===0&&bh===0&&bi===0&&bj===0&&bk===0&&bl===0&&bm===0&&bn===0&&bo===0&&bp===0&&bq===0&&br===0&&bs===0, 'bf='+bf+' bg='+bg+' bh='+bh+' bi='+bi+' bj='+bj+' bk='+bk+' bl='+bl+' bm='+bm+' bn='+bn+' bo='+bo+' bp='+bp+' bq='+bq+' br='+br+' bs='+bs);
  ok('  10 处 bz（含听力卡脚本）', bw===10, 'bw='+bw);
  ok('  0 处 bv（旧版本已全部替换）', bv===0, 'bv='+bv);
  ok('  引入 english_listening_4.js', html.includes('english_listening_4.js'), '');
});

let pass=0;
for(const r of results){
  console.log((r.ok?'✅':'❌')+' '+r.name + (r.extra?('  ['+r.extra+']'):''));
  if(r.ok) pass++;
}
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass===results.length?0:1);
