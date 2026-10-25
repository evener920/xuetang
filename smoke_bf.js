// 冒烟测试：bf 版本 —— ①诗词年级全量标注（治串年级）②学会积分只算目标内+可撤销 ③已学/未学筛选
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

/* ---------- ① 诗词年级标注 ---------- */
safe('① 诗词年级全量标注（data.js）', ()=>{
  const dsrc = fs.readFileSync(path.join(SITE_DIR,'data.js'),'utf8');
  const D = JSON.parse(dsrc.match(/window\.STUDY_DATA\s*=\s*(\{[\s\S]*\});?\s*$/)[1]);
  const poems = D.poems;
  const noGrade = poems.filter(p=>!p.grade);
  ok('  314 首诗全部有 grade', noGrade.length===0, '缺='+noGrade.length);
  const dist={}; poems.forEach(p=>dist[p.grade]=(dist[p.grade]||0)+1);
  ok('  含初中年级（七/八/九）', dist['七年级']>0 && dist['八年级']>0 && dist['九年级']>0,
     '七='+dist['七年级']+' 八='+dist['八年级']+' 九='+dist['九年级']);
  const byT = t => (poems.find(p=>p.title===t)||{}).grade;
  ok('  己亥杂诗-浩荡离愁白日斜=七年级（原错判五年级）', byT('己亥杂诗-浩荡离愁白日斜')==='七年级', '实='+byT('己亥杂诗-浩荡离愁白日斜'));
  ok('  己亥杂诗(九州生气)=五年级', byT('己亥杂诗')==='五年级', '实='+byT('己亥杂诗'));
  ok('  四时田园杂兴-梅子金黄杏子肥=五年级（原错判四年级）', byT('四时田园杂兴-梅子金黄杏子肥')==='五年级');
  ok('  浪淘沙-九曲黄河万里沙=六年级（原错判四年级）', byT('浪淘沙-九曲黄河万里沙')==='六年级');
  ok('  清平乐(春归何处)=六年级（原错判四年级）', byT('清平乐')==='六年级');
  ok('  悯农-春种一粒粟=二年级（原错判一年级）', byT('悯农-春种一粒粟')==='二年级');
  // 成语/单词未动
  ok('  成语仍有 270 条且全有年级', D.idioms.length===270 && D.idioms.every(x=>x.grade), 'n='+D.idioms.length);
  ok('  单词仍有 1293 条', D.words.length===1293, 'n='+D.words.length);
});

/* ---------- ② 学会积分：只算目标内 + 可撤销 ---------- */
safe('② 学会积分规则 + 撤销', ()=>{
  const ctx = makeCtx({});
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename:'bundle.js' });
  const S = ctx.window.__SITE__;
  ok('  __SITE__ 注入', !!S, '');

  // 目标判定：今日任务里的条目算目标；随机非任务条目不算
  const tg = S.todayTasks();
  const taskKeys = Object.keys(tg).reduce((a,k)=>a.concat(tg[k]||[]),[]).map(x=>x.key);
  ok('  今日任务非空', taskKeys.length>0, 'n='+taskKeys.length);
  if(taskKeys.length){
    ok('  inTodayGoal(任务内条目)=true', S.inTodayGoal(taskKeys[0])===true, taskKeys[0]);
  }
  const pool = S.poolFor('语文','诗词');
  const nonGoal = pool.find(x=>!S.inTodayGoal(x.key));
  ok('  inTodayGoal(目标外条目)=false', !!nonGoal && S.inTodayGoal(nonGoal.key)===false, nonGoal?nonGoal.key:'(全部都在目标内，跳过)');

  // 撤销学会积分：退分 + 删流水 + 取消已学
  const p0 = S.state.points;
  S.state.learned['poem:999'] = '2026-10-24';
  S.state.mastery['poem:999'] = 5;
  const gave = S.awardQuiet(10, '学会《测试》', 'learn:poem:999', true);
  ok('  加分入账', gave===true && S.state.points===p0+10, 'p='+S.state.points);
  ok('  流水含 learn:poem:999', (S.state.pointLog||[]).some(x=>x.hook==='learn:poem:999' && x.n>0), '');
  const back = S.undoLearn('poem:999');
  ok('  撤销退回 10 分', back===10 && S.state.points===p0, 'back='+back+' p='+S.state.points);
  ok('  撤销后流水无该记录', !(S.state.pointLog||[]).some(x=>x.hook==='learn:poem:999'), '');
  ok('  撤销后取消已学/星级', !S.state.learned['poem:999'] && S.state.mastery['poem:999']===undefined, '');
  ok('  重复撤销返回 0', S.undoLearn('poem:999')===0, '');

  // 源码守卫：两处按目标计分 + 撤销入口
  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  弹窗学会按 inTodayGoal 计分', (code.match(/if\(inTodayGoal\(it\.key\)\)/g)||[]).length>=2, 'n='+(code.match(/if\(inTodayGoal\(it\.key\)\)/g)||[]).length);
  ok('  弹窗含撤销学会按钮', code.includes('data-act="unlearn"'), '');
  ok('  奖励页流水每条约记录都含撤销按钮', code.includes('data-undo-log'), '');
});

/* ---------- ③ 已学/未学筛选 ---------- */
safe('③ 已学/未学筛选', ()=>{
  const ctx = makeCtx({});
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename:'bundle.js' });
  const S = ctx.window.__SITE__;

  // 资源页 biData 维度筛选
  const sample = S.biData().filtered.slice(0, 3);
  ok('  资源页有内容可测', sample.length===3, 'n='+sample.length);
  sample.forEach(x=>{ S.state.learned[x.key] = '2026-10-24'; });   // 标记前 3 条为已学
  S.biView.learn = '已学';
  let d = S.biData();
  ok('  资源页「已学」只含已学条目', d.filtered.every(x=>S.isLearnedKey(x.key)) && d.filtered.length>=3, 'n='+d.filtered.length);
  ok('  资源页 learnChips 含 已学/未学', d.learnChips.some(([t])=>t==='已学') && d.learnChips.some(([t])=>t==='未学'), JSON.stringify(d.learnChips.map(x=>x[0])));
  ok('  active 计入 learn 维度', d.active===true, '');
  S.biView.learn = '未学';
  d = S.biData();
  ok('  资源页「未学」不含已学条目', d.filtered.every(x=>!S.isLearnedKey(x.key)), 'n='+d.filtered.length);
  S.biView.learn = '全部';

  // 语文页渲染含状态 chips
  S.renderSubject('语文');
  const el = ctx.window.document.getElementById('view-subject');
  const html = el.innerHTML || '';
  ok('  语文页渲染出状态筛选 chips', html.includes('data-cn-learn="done"') && html.includes('data-cn-learn="todo"') && html.includes('data-cn-learn="all"'), '');
  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  语文页筛选逻辑含 isLearnedKey', code.includes('if(cnView.learn==="done") pool = pool.filter(x=>isLearnedKey(x.key));'), '');
  ok('  语文页点击委托含 data-cn-learn', code.includes('e.target.closest("[data-cn-learn]")'), '');
});

/* ---------- ④ 版本号 ---------- */
safe('④ 版本号', ()=>{
  const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf8');
  const be=(html.match(/20261024be/g)||[]).length;
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
  ok('  0 处 be', be===0, 'be='+be);
  ok('  0 处 bf/bg/bh/bi/bj/bk/bl/bm/bn/bo/bp/bq/br/bs（已升级至 bt）', bf===0&&bg===0&&bh===0&&bi===0&&bj===0&&bk===0&&bl===0&&bm===0&&bn===0&&bo===0&&bp===0&&bq===0&&br===0&&bs===0, 'bf='+bf+' bg='+bg+' bh='+bh+' bi='+bi+' bj='+bj+' bk='+bk+' bl='+bl+' bm='+bm+' bn='+bn+' bo='+bo+' bp='+bp+' bq='+bq+' br='+br+' bs='+bs);
  ok('  10 处 bz', bw===10, 'bw='+bw);
  ok('  0 处 bv（旧版本已全部替换）', bv===0, 'bv='+bv);
});

let pass=0;
for(const r of results){
  console.log((r.ok?'✅':'❌')+' '+r.name + (r.extra?('  ['+r.extra+']'):''));
  if(r.ok) pass++;
}
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass===results.length?0:1);
