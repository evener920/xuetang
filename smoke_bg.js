// 冒烟测试：bg 版本 —— 诉求 E 收尾（7 项）
// ① 学习库/学习目标（诉求5）：studyLibData 板块 total 与 poolFor 同源、joined 计数、weekGoalData 只算 studySet、renderWeek 新结构
// ② 首页扣分（诉求3）：penalize 扣分/同日一次/每日上限/欠分下限、首页不可撤销
// ③ 今日完成默认折叠（诉求6）
// ④ 后台无「我的素材」（诉求4）
// ⑤ 科目页添加按钮（诉求2）：subjectTypesOf/openSubjectAdd/renderSubject chips
// ⑥ 资源页「历史」并入「人文」（诉求7）：biData subjOf 归一
// ⑦ 版本号：10×bg
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
function boot(ls){ const ctx=makeCtx(ls||{}); vm.createContext(ctx); vm.runInContext(bundleCode(), ctx, {filename:'bundle.js'}); return ctx; }

const results = [];
function ok(name, cond, extra){ results.push({name, ok:!!cond, extra: extra||''}); }
function safe(name, fn){ try{ fn(); }catch(e){ results.push({name, ok:false, extra:'THROW '+e.message+'\n'+((e.stack||'').split('\n').slice(0,4).join('\n'))}); } }

const CODE = bundleCode();

/* ---------- ① 学习库 / 学习目标（诉求5） ---------- */
safe('① 学习库与学习目标', ()=>{
  const ctx = boot({});
  const S = ctx.window.__SITE__;
  ok('  __SITE__ 注入', !!S, '');

  // 学习库板块：总量与科目页同源（poolFor）
  const lib = S.studyLibData();
  ok('  学习库有板块', lib.sections.length>0, 'n='+lib.sections.length);
  let badTotal=0;
  lib.sections.forEach(s=>{ if(S.poolFor(s.subject,s.type).length!==s.total) badTotal++; });
  ok('  各板块 total 与 poolFor 一致（与科目页数字对应）', badTotal===0, '不一致='+badTotal);

  // 主课（语数英）优先排序
  const firstSubj = lib.sections.map(s=>s.subject);
  const mainIdx = firstSubj.map(s=>["语文","数学","英语"].indexOf(s)).filter(i=>i>=0);
  ok('  主课板块排在前', mainIdx.length>0 && mainIdx.every((v,i,a)=>i===0||v>=a[i-1]), JSON.stringify(firstSubj.slice(0,4)));

  // 初始无学习目标
  ok('  初始学习目标为空', S.weekGoalData().total===0, 'total='+S.weekGoalData().total);

  // 全部加入第一个板块 → joined=total；目标总量=该板块条数
  const sec0 = lib.sections[0];
  sec0.items.forEach(x=>{ S.state.studySet[x.it.key]=true; });
  const lib2 = S.studyLibData();
  const s0b = lib2.sections.find(s=>s.subject===sec0.subject&&s.type===sec0.type);
  ok('  加入后 joined=total', s0b.joined===s0b.total, 'joined='+s0b.joined+' total='+s0b.total);
  const goal = S.weekGoalData();
  ok('  学习目标总量=该板块条数', goal.total===sec0.items.length, 'goal='+goal.total+' items='+sec0.items.length);
  ok('  学习目标分组含 学科·类型', goal.sections.some(s=>s.subject===sec0.subject&&s.type===sec0.type), '');

  // 已学 1 条 → 目标 done=1
  S.state.learned[sec0.items[0].it.key] = '2026-10-24';
  ok('  已学计入目标 done', S.weekGoalData().done===1, 'done='+S.weekGoalData().done);

  // 移出 1 条 → 目标总量减 1
  delete S.state.studySet[sec0.items[1].it.key];
  ok('  移出后目标总量减 1', S.weekGoalData().total===sec0.items.length-1, 'total='+S.weekGoalData().total);

  // 目标外已学不计入：另一板块标已学但不在 studySet → 目标总量不变
  const other = lib.sections.find(s=>s!==sec0.subject+sec0.type && s.total>0 && s.items.some(x=>!S.state.studySet[x.it.key]));
  if(other){
    const k = other.items.find(x=>!S.state.studySet[x.it.key]).it.key;
    S.state.learned[k] = '2026-10-24';
    const g2 = S.weekGoalData();
    ok('  目标外已学不计入目标', g2.total===sec0.items.length-1 && g2.done===1, 'total='+g2.total+' done='+g2.done);
  } else {
    ok('  目标外已学不计入目标（无第二个板块可测，跳过）', true, '');
  }

  // 弹窗可打开（mock DOM 下不抛错）
  let threw='';
  try{ S.openLibSection(sec0.subject, sec0.type); S.openWeekGoal(); }catch(e){ threw=e.message; }
  ok('  学习库管理/目标明细弹窗可打开', threw==='', threw);

  // renderWeek 新结构：学习目标 + 学习库；旧「打卡范围」chips 已移除
  S.renderWeek();
  const wk = ctx.window.document.getElementById('view-week').innerHTML;
  ok('  本周页含「🎯 学习目标」', wk.includes('🎯 学习目标'), '');
  ok('  本周页含「📖 学习库」', wk.includes('📖 学习库'), '');
  ok('  学习库板块卡含 data-lib-sec', wk.includes('data-lib-sec='), '');
  ok('  板块卡含打卡开关 chip', wk.includes('data-checkin='), '');
  ok('  打卡开关用学科主题色（开=实色，同旧版打卡范围）', /<button class="chip lib-ck" style="background:#7c3aed;border-color:#7c3aed;color:#fff" data-checkin="语文/.test(wk), '');
  ok('  打卡开/关状态文字明确', wk.includes('✓ 打卡中'), '');
  ok('  旧「打卡范围」chips 已移除', !wk.includes('打卡范围'), '');

  // 打卡开关切换：点一下退出（浅底）、再点加入（实色）——同旧版打卡范围手感
  const ckKey = sec0.subject+'·'+sec0.type;
  S.state.checkin[ckKey] = false;
  S.renderWeek();
  const wkOff = ctx.window.document.getElementById('view-week').innerHTML;
  ok('  退出后显示「＋ 加入打卡」浅底态', wkOff.includes('＋ 加入打卡') && /<button class="chip lib-ck" style="background:#f5f3ff/.test(wkOff), '');
  S.state.checkin[ckKey] = true;
  S.renderWeek();
  const wkOn = ctx.window.document.getElementById('view-week').innerHTML;
  ok('  再加入后显示「✓ 打卡中」实色态', wkOn.includes('✓ 打卡中'), '');
  delete S.state.checkin[ckKey];

  // 源码守卫
  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  weekGoalData 只聚合 studySet', /function weekGoalData\(\)\{[\s\S]{0,200}studySet/.test(code), '');
  ok('  studyLibData 用 poolFor 取总量', /function studyLibData\(\)\{[\s\S]{0,600}poolFor\(sec\.subject, sec\.type\)/.test(code), '');
  ok('  PER_STUDENT_FIELDS 含 studySet', code.includes('"studySet"'), '');
});

/* ---------- ② 首页扣分（诉求3） ---------- */
safe('② 首页行为扣分', ()=>{
  const ctx = boot({});
  const S = ctx.window.__SITE__;
  const p0 = S.state.points;
  const r1 = S.penalize('p1'); // 不讲卫生 -5
  ok('  首次扣分返回实扣分数', r1===5, 'r='+r1);
  ok('  积分同步扣减', S.state.points===p0-5, 'p='+S.state.points);
  ok('  今日扣分流水有记录', S.penaltyLogToday().length===1 && S.penaltyLogToday()[0].note.includes('不讲卫生'), '');
  const r2 = S.penalize('p1');
  ok('  同一项每天只记一次（-1）', r2===-1, 'r='+r2);
  ok('  重复扣分不再动积分', S.state.points===p0-5, 'p='+S.state.points);
  // 每日上限：cap=5，已扣 5，再扣 p2 应被拦
  S.state.rules = Object.assign({}, S.state.rules||{}, {penaltyCapDay:5});
  const r3 = S.penalize('p2');
  ok('  撞每日上限返回 -2', r3===-2, 'r='+r3);
  S.state.rules.penaltyCapDay = S.PENALTY_CAP_DAY;
  // 欠分下限：points 压到 -floor → -3
  S.state.points = -S.penaltyFloor();
  const r4 = S.penalize('p3');
  ok('  已到欠分下限返回 -3', r4===-3, 'r='+r4);
  ok('  下限时不再扣分', S.state.points===-S.penaltyFloor(), 'p='+S.state.points);

  // 首页渲染：扣分 chips + 不可撤销（无撤销入口）
  S.state.points = p0; S.state.pointLog = (S.state.pointLog||[]).filter(x=>x.n>=0);
  S.penalize('p1'); // 制造一条今日扣分用于徽章断言
  S.renderHome();
  const home = ctx.window.document.getElementById('view-home').innerHTML;
  ok('  首页含扣分 chips（data-pen）', home.includes('data-pen="p1"'), '');
  ok('  首页扣分区标注「不可撤销」', home.includes('不可撤销'), '');
  ok('  首页无扣分撤销按钮（data-pen-undo）', !home.includes('data-pen-undo'), '');
  ok('  首页 hero 显示红色「今日扣分」徽章', home.includes('今日扣分 -') && home.includes('background:#fee2e2'), '');
  ok('  首页累计积分已扣减', home.includes('累计 '+(p0-5)+' 分'), '累计='+((home.match(/累计 (\d+) 分/)||[])[1]));

  // 本周页：hero 积分行 + 学习看板积分卡（扣分红字）
  S.renderWeek();
  const wkPts = ctx.window.document.getElementById('view-week').innerHTML;
  ok('  本周页 hero 显示 今日/本周/累计 积分', /今日 <b style="color:#15803d">\+\d+<\/b> <b style="color:#b91c1c">-\d+<\/b> · 本周 \+\d+ · 累计 <b>-?\d+<\/b> 分/.test(wkPts), '');
  ok('  本周页学习看板含「🏆 积分」卡', wkPts.includes('🏆 积分'), '');
});

/* ---------- ③ 今日完成默认折叠（诉求6） ---------- */
safe('③ 今日完成默认折叠', ()=>{
  const ctx = boot({});
  const S = ctx.window.__SITE__;
  S.renderHome();
  const home = ctx.window.document.getElementById('view-home').innerHTML;
  ok('  今日完成是 sec-collapse 折叠区', home.includes('<details class="sec-collapse">'), '');
  ok('  默认不带 open（默认折叠）', !home.includes('<details class="sec-collapse" open'), '');
  ok('  折叠标题为「今日完成」', /sec-collapse">\s*<summary>✅ 今日完成/.test(home), '');
  ok('  展开提示含已打卡数', home.includes('已打卡'), '');
});

/* ---------- ④ 后台无「我的素材」（诉求4） ---------- */
safe('④ 后台移除我的素材', ()=>{
  const ctx = boot({});
  const S = ctx.window.__SITE__;
  S.renderAdmin();
  const admin = ctx.window.document.getElementById('view-admin').innerHTML;
  ok('  后台页不含「我的素材」区', !admin.includes('我的素材'), '');
  ok('  后台仍含批量导入/添加表单', admin.includes('admin-form'), '');
  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  源码无 goRes 残留处理器', !/id="goRes"|goRes\(/.test(code), '');
});

/* ---------- ⑤ 科目页「＋ 添加」（诉求2） ---------- */
safe('⑤ 科目页添加按钮', ()=>{
  const ctx = boot({});
  const S = ctx.window.__SITE__;
  const cnTypes = S.subjectTypesOf('语文');
  ok('  语文类型含内置 8 类', ["诗词","成语","文言","成语动画廊","作文","故事","阅读","课文"].every(t=>cnTypes.includes(t)), JSON.stringify(cnTypes));
  const hisTypes = S.subjectTypesOf('历史');
  ok('  历史类型并入自定义（hg 卡 type=知识）', hisTypes.includes('知识'), JSON.stringify(hisTypes));
  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  源码含 subjectTypesOf', code.includes('function subjectTypesOf(subject)'), '');
  ok('  源码含 openSubjectAdd', code.includes('function openSubjectAdd(subject, defType)'), '');
  ok('  添加后归集资源页提示', code.includes('归集到资源页'), '');
  S.renderSubject('语文');
  const cnHtml = ctx.window.document.getElementById('view-subject').innerHTML;
  ok('  语文页 chips 含「＋ 添加」', cnHtml.includes('data-cn-add'), '');
  S.renderSubject('英语');
  const gnHtml = ctx.window.document.getElementById('view-subject').innerHTML;
  ok('  通用科目页 chips 含「＋ 添加」', gnHtml.includes('data-gn-add'), '');
});

/* ---------- ⑥ 资源页「历史」并入「人文」（诉求7） ---------- */
safe('⑥ 资源页历史并入人文', ()=>{
  const ctx = boot({});
  const S = ctx.window.__SITE__;
  const hg = (S.state.custom||[]).filter(x=>/^hg:/.test(x.key));
  ok('  hg 历史卡已注入', hg.length===9, 'n='+hg.length);
  ok('  hg 卡 subject=历史', hg.length>0 && hg.every(x=>x.subject==='历史'), '');

  const D = S.biData();
  const subjKeys = D.subjChips.map(x=>x[0]);
  ok('  资源页不再单列「历史」学科', !subjKeys.includes('历史'), JSON.stringify(subjKeys));
  ok('  资源页含「人文」学科', subjKeys.includes('人文'), '');
  const humCnt = (D.subjChips.find(x=>x[0]==='人文')||[])[1];
  const expect = S.ALL.filter(x=>x.subject==='人文').length + S.ALL.filter(x=>x.subject==='历史').length;
  ok('  人文计数=人文+历史（hg 并入）', humCnt===expect, 'hum='+humCnt+' expect='+expect);

  S.biView.subj = '人文';
  const dHum = S.biData();
  const hgKeys = hg.map(x=>x.key);
  ok('  筛「人文」含全部 hg 卡', hgKeys.every(k=>dHum.filtered.some(x=>x.key===k)), 'n='+dHum.filtered.length);
  S.biView.subj = '历史';
  const dHis = S.biData();
  ok('  筛「历史」无结果（已归一）', dHis.filtered.length===0, 'n='+dHis.filtered.length);
  S.biView.subj = '全部';

  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  biData 含 subjOf 归一', code.includes('(x.subject==="历史") ? "人文" : x.subject'), '');
});

/* ---------- ⑧ 全视图渲染回归（bg 曾因 subjOf 作用域外引用导致 renderRes 整体白屏，此块防再犯） ---------- */
safe('⑧ 全视图渲染回归', ()=>{
  const ctx = boot({});
  const S = ctx.window.__SITE__;
  const doc = ctx.window.document;
  const views = [
    ['首页',   ()=>S.renderHome(),                 'view-home'],
    ['本周',   ()=>S.renderWeek(),                 'view-week'],
    ['奖励',   ()=>S.renderReward(),               'view-reward'],
    ['资源',   ()=>S.renderRes(),                  'view-res'],
    ['语文',   ()=>S.renderSubject('语文'),         'view-subject'],
    ['数学',   ()=>S.renderSubject('数学'),         'view-subject'],
    ['英语',   ()=>S.renderSubject('英语'),         'view-subject'],
    ['科学',   ()=>S.renderSubject('科学'),         'view-subject'],
    ['人文',   ()=>S.renderSubject('人文'),         'view-subject'],
    ['后台',   ()=>S.renderAdmin(),                'view-admin'],
  ];
  views.forEach(([name, fn, vid])=>{
    let err='';
    try{ fn(); }catch(e){ err=e.message; }
    const html = (doc.getElementById(vid)||{}).innerHTML || '';
    ok('  '+name+' 页渲染成功且非空', !err && html.length>500, err || ('len='+html.length));
  });
  // 资源页关键结构（磁贴 / 分面 chips / 卡片）
  const resHtml = doc.getElementById('view-res').innerHTML;
  ok('  资源页含学科板块磁贴', resHtml.includes('res-tile'), '');
  ok('  资源页含分面筛选 chips', resHtml.includes('data-bi-subj') && resHtml.includes('data-bi-grade'), '');
  ok('  资源页含内容卡片', resHtml.includes('res-card'), '');
  // go() 路由切换不抛错
  let goErr='';
  try{ ['home','week','reward','res','admin'].forEach(v=>S.go(v)); }catch(e){ goErr=e.message; }
  ok('  go() 路由切换无异常', goErr==='', goErr);
});

/* ---------- ⑦ 版本号 ---------- */
safe('⑦ 版本号', ()=>{
  const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf8');
  const bj=(html.match(/20261024bj/g)||[]).length;
  const bk=(html.match(/20261024bk/g)||[]).length;
  const bi=(html.match(/20261024bi/g)||[]).length;
  const bh=(html.match(/20261024bh/g)||[]).length;
  const bg=(html.match(/20261024bg/g)||[]).length;
  const bf=(html.match(/20261024bf/g)||[]).length;
  const be=(html.match(/20261024be/g)||[]).length;
  const bd=(html.match(/20261024bd/g)||[]).length;
  const ba=(html.match(/20261024ba/g)||[]).length;
  ok('  10 处 bk', bk===10, 'bk='+bk);
  ok('  0 处 bi/bh/bg/bf/be/bd/ba/bj', bi===0&&bh===0&&bg===0&&bf===0&&be===0&&bd===0&&ba===0&&bj===0, 'bi='+bi+' bh='+bh+' bg='+bg+' bf='+bf+' be='+be+' bd='+bd+' ba='+ba+' bj='+bj);
});

let pass=0;
for(const r of results){
  console.log((r.ok?'✅':'❌')+' '+r.name + (r.extra?('  ['+r.extra+']'):''));
  if(r.ok) pass++;
}
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass===results.length?0:1);
