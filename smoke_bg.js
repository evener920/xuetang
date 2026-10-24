// 冒烟测试：bg 版本 —— 诉求 E 收尾（7 项）
// ① 学习库/学习目标（诉求5）：studyLibData 板块 total 与 poolFor 同源、joined 计数、weekGoalData 只算 studySet、renderWeek 新结构
// ② 首页扣分（诉求3）：penalize 扣分/同日一次/每日上限/欠分下限、首页不可自行撤销；br：扣分卡片网格+习惯分值
// ③ 今日完成默认折叠（诉求6）
// ④ 后台无「我的素材」（诉求4）
// ⑤ 科目页添加按钮（诉求2）：subjectTypesOf/openSubjectAdd/renderSubject chips
// ⑥ 资源页「历史」并入「人文」（诉求7）：biData subjOf 归一
// ⑧ 全视图渲染回归（防 renderRes 白屏类事故）
// ⑨ 学习库年级筛选（bo：扩大选择范围）：poolForAll/libPoolFor/年级 chips/跨年级加入
// ⑩ 语文页筛选空态与「↩ 返回」（bp：点已学筛选被待导入空态困住）
// ⑪ 积分撤销需家长权限（bq：撤销按钮 + 口令闸门 + 确认框）
// ⑫ 本周计划板块胶囊（bs：WB 推荐+用户增删 delta，与学习目标/学习库联动，计划移至学习目标下）
// ⑦ 版本号：10×bs
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
  ok('  板块卡含打卡状态 pill（chip lib-ck）', wk.includes('class="chip lib-ck"'), '');
  ok('  板块卡 pill 不再挂 data-checkin（打卡范围由「加入学习」决定）', !wk.includes('data-checkin='), '');
  ok('  旧「打卡范围：」chips 标签已移除', !wk.includes('打卡范围：'), '');

  // 打卡范围 = 已「加入学习」的内容：sec0 已全部加入 → 实色「✓ 打卡中」；未加入的板块 → 浅底「＋ 加入打卡」
  ok('  已加入学习的板块显示「✓ 打卡中」实色（学科主题色）', /<button class="chip lib-ck" style="background:#7c3aed;border-color:#7c3aed;color:#fff"[^>]*>✓ 打卡中/.test(wk), '');
  ok('  未加入学习的板块显示「＋ 加入打卡」浅底', wk.includes('＋ 加入打卡') && /<button class="chip lib-ck" style="background:#f5f3ff/.test(wk), '');

  // 全部移出 → 回到浅底；重新加入 → 恢复实色
  sec0.items.forEach(x=>{ delete S.state.studySet[x.it.key]; });
  S.renderWeek();
  const wkOff = ctx.window.document.getElementById('view-week').innerHTML;
  ok('  全部移出后回到「＋ 加入打卡」浅底态', wkOff.includes('＋ 加入打卡'), '');
  sec0.items.forEach(x=>{ S.state.studySet[x.it.key]=true; });
  S.renderWeek();
  const wkOn = ctx.window.document.getElementById('view-week').innerHTML;
  ok('  重新加入后恢复「✓ 打卡中」实色态', wkOn.includes('✓ 打卡中'), '');

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

  // 首页渲染：扣分卡片网格 + 习惯分值 + 孩子不可自行撤销（家长撤销入口在本周页）
  S.state.points = p0; S.state.pointLog = (S.state.pointLog||[]).filter(x=>x.n>=0);
  S.penalize('p1'); // 制造一条今日扣分用于徽章/卡片断言
  S.renderHome();
  const home = ctx.window.document.getElementById('view-home').innerHTML;
  ok('  首页扣分改为卡片网格（data-pen 保留）', home.includes('data-pen="p1"') && home.includes('pen-card'), '');
  ok('  已扣项卡片置灰显示「今日已记 ✓」', home.includes('pen-card recorded') && home.includes('今日已记 ✓'), '');
  ok('  扣分卡片含名称与分值', home.includes('pc-nm') && home.includes('pc-cost'), '');
  ok('  扣分区有汇总行（今日共扣）', home.includes('今日共扣'), '');
  ok('  首页无扣分撤销按钮（data-pen-undo）', !home.includes('data-pen-undo'), '');
  ok('  首页扣分区说明孩子不可自行撤销', home.includes('不可自行撤销'), '');
  ok('  今日习惯标明每项分值', home.includes('每个 +'+S.pointRules().habit+' 分') && home.includes('class="hp"'), '');
  ok('  首页 hero 显示红色「今日扣分」徽章', home.includes('今日扣分 -') && home.includes('background:#fee2e2'), '');
  ok('  首页「今日」徽章按净分展示（无正分时 -5）', home.includes('🏆 今日 -5 分'), '');
  ok('  首页累计积分已扣减', home.includes('累计 '+(p0-5)+' 分'), '累计='+((home.match(/累计 (\d+) 分/)||[])[1]));

  // 本周页：hero 积分行 + 学习看板积分卡（净分：扣分已减入今日/本周总分）
  S.renderWeek();
  const wkPts = ctx.window.document.getElementById('view-week').innerHTML;
  ok('  本周页 hero 显示 今日/本周/累计 净分积分', /今日 <b style="color:#(?:15803d|b91c1c)">[+-]?\d+<\/b> · 本周 <b[^>]*>[+-]?\d+<\/b> · 累计 <b>-?\d+<\/b> 分/.test(wkPts), '');
  ok('  本周页积分卡「今日」为净分（无正分时显示 -5）', wkPts.includes('<span>今日</span><b style="color:#b91c1c">-5</b>'), '');
  ok('  本周页学习看板含「🏆 积分」卡', wkPts.includes('🏆 积分'), '');

  // 行为扣分记录搬到本周页、与习惯放一起（诉求：后台里的扣分记录移到本周页签）
  ok('  本周页含「🚨 行为扣分记录」区', wkPts.includes('🚨 行为扣分记录'), '');
  ok('  扣分记录与习惯周跟踪同页相邻', wkPts.indexOf('习惯周跟踪')>=0 && wkPts.indexOf('习惯周跟踪')<wkPts.indexOf('🚨 行为扣分记录'), '');
  ok('  本周扣分流水可查（penaltyLogWeek）', S.penaltyLogWeek().length===1 && S.penaltyLogWeek()[0].note.includes('不讲卫生'), 'n='+S.penaltyLogWeek().length);
  ok('  本周页扣分记录带撤销按钮（data-pen-undo）', wkPts.includes('data-pen-undo="pen:p1:'), '');
  ok('  本周页显示本周共扣与今日上限', wkPts.includes('本周共扣 -') && wkPts.includes('上限'), '');
  // 撤销返还积分
  const hook = S.penaltyLogWeek()[0].hook;
  const backPts = S.state.points;
  const got = S.undoPenalty(hook);
  ok('  本周页撤销返还积分', got===5 && S.state.points===backPts+5, 'got='+got);
  S.renderWeek();
  const wkAfter = ctx.window.document.getElementById('view-week').innerHTML;
  ok('  撤销后本周页显示空态文案', wkAfter.includes('本周还没有行为扣分'), '');

  // bn：净分展示——有正分时，今日/本周总分 = 正分 - 行为扣分（诉求：扣分要减到当日总分里）
  S.award(30, '测试学会积分', 't:net30');
  const rp2 = S.penalize('p2'); // 房间凌乱 -5
  ok('  正分场景再扣一条（房间凌乱）', rp2===5, 'r='+rp2);
  ok('  pointTodayNet/pointWeekNet = 正分-扣分', S.pointTodayNet()===25 && S.pointWeekNet()===25, 'today='+S.pointTodayNet()+' week='+S.pointWeekNet());
  S.renderHome();
  const home2 = ctx.window.document.getElementById('view-home').innerHTML;
  ok('  首页「今日」徽章为净分 +25', home2.includes('🏆 今日 +25 分'), '');
  ok('  首页扣分徽章仍显示明细 -5', home2.includes('⚠️ 今日扣分 -5 分'), '');
  S.renderWeek();
  const wk2 = ctx.window.document.getElementById('view-week').innerHTML;
  ok('  本周页 hero 今日为净分并标注扣分', /今日 <b style="color:#15803d">\+25<\/b> <span style="font-size:12px;color:#b91c1c">（扣 5）<\/span>/.test(wk2), '');
  ok('  本周页积分卡 今日/本周 均为净分 +25（扣 5）', wk2.includes('<span>今日</span><b>+25 <span style="color:#b91c1c;font-size:13px">（扣 5）</span></b>') && wk2.includes('<span>本周</span><b>+25 <span style="color:#b91c1c;font-size:13px">（扣 5）</span></b>'), '');
  S.renderReward();
  const rw2 = ctx.window.document.getElementById('view-reward').innerHTML;
  ok('  奖励页 hero 今日/本周为净分', rw2.includes('今日 +25 分') && rw2.includes('本周 +25 分'), '');
  ok('  奖励页 stat 今日/本周为净分数值 25', rw2.includes('<div class="num">25</div><div class="lbl">今日</div>') && rw2.includes('<div class="num">25</div><div class="lbl">本周</div>'), '');
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
  ok('  后台不再含「行为扣分记录」区（已移至本周页）', !admin.includes('行为扣分记录'), '');
  ok('  后台保留「扣分项设置」表单', admin.includes('扣分项设置') && admin.includes('pnAdd'), '');
  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  源码无 goRes 残留处理器', !/id="goRes"|goRes\(/.test(code), '');
  ok('  全站无 data-checkin 元素（打卡范围改由加入学习决定）', !code.includes('data-checkin'), '');
  ok('  penaltyLogWeek 辅助函数存在', code.includes('function penaltyLogWeek()'), '');
  // bm：后台添加表单示范文字中性化（与主题无关的示例会误导）
  ok('  后台添加表单无语文向示范文字（春夜喜雨/杜甫/诗词正文）', !admin.includes('春夜喜雨') && !admin.includes('杜甫') && !admin.includes('诗词正文'), '');
  ok('  后台添加表单占位符为中性提示', admin.includes('placeholder="必填"') && admin.includes('placeholder="可空"') && admin.includes('placeholder="请输入内容"') && admin.includes('placeholder="多个标签用逗号分隔，可空"'), '');
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
  // bm：添加弹窗示范文字中性化（板块名/标题/正文 placeholder 不得带语文向示例）
  S.openSubjectAdd('人文', '');
  const saHtml = ctx.window.document.getElementById('modal-body').innerHTML;
  ok('  添加弹窗无示范文字（春夜喜雨/诗词正文/成语解释/如 诗词）', !saHtml.includes('春夜喜雨') && !saHtml.includes('诗词正文') && !saHtml.includes('成语解释') && !saHtml.includes('如 诗词'), '');
  ok('  添加弹窗占位符为中性提示', saHtml.includes('placeholder="必填"') && saHtml.includes('placeholder="可空"') && saHtml.includes('placeholder="请输入内容"') && saHtml.includes('placeholder="下拉选择已有板块，或输入新板块名"'), '');
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

/* ---------- ⑨ 学习库年级筛选（诉求：扩大选择范围） ---------- */
safe('⑨ 学习库年级筛选', ()=>{
  const ctx = boot({});
  const S = ctx.window.__SITE__;
  const doc = ctx.window.document;
  const sub="语文", tp="诗词";
  const g0 = S.state.grade;
  const all = S.poolForAll(sub, tp), cur = S.poolFor(sub, tp);
  ok('  poolForAll 覆盖全年级（多于当前年级池）', all.length>cur.length, 'all='+all.length+' cur='+cur.length);
  const grades = S.GRADES.filter(g=>g!==g0 && all.some(it=>it.grade===g));
  ok('  存在其他年级内容可筛选', grades.length>0, JSON.stringify(grades));

  // 默认打开 = 当前年级（与科目页一致）
  S.openLibSection(sub, tp);
  let mb = doc.getElementById('modal-body').innerHTML;
  ok('  弹窗含年级筛选 chips（data-lib-grade）', (mb.match(/data-lib-grade=/g)||[]).length>=2, 'n='+(mb.match(/data-lib-grade=/g)||[]).length);
  ok('  默认选中当前年级（本年级 chip 带 on）', mb.includes('data-lib-grade="'+g0+'"') && /chip on" data-lib-grade="/.test(mb), '');
  ok('  有「全部年级」chip', mb.includes('data-lib-grade="__all"'), '');
  ok('  默认只列当前年级条目', (mb.match(/data-study-toggle=/g)||[]).length===cur.length, 'n='+(mb.match(/data-study-toggle=/g)||[]).length+' cur='+cur.length);
  ok('  弹窗说明可切换年级扩大选择范围', mb.includes('扩大选择范围'), '');

  // 切到具体年级（显式传参，等价点 chip）
  const g2 = grades[0];
  S.renderLibModal(sub, tp, g2);
  mb = doc.getElementById('modal-body').innerHTML;
  const cur2 = all.filter(it=>!it.grade || it.grade===g2);
  ok('  切到其他年级后按该年级筛选', (mb.match(/data-study-toggle=/g)||[]).length===cur2.length, 'n='+(mb.match(/data-study-toggle=/g)||[]).length+' exp='+cur2.length);
  ok('  该年级 chip 选中（on）', mb.includes('chip on" data-lib-grade="'+g2+'"'), '');
  ok('  非当前年级条目标注年级名前缀', cur2.some(it=>it.grade===g2) && mb.includes('>'+g2+'</span>'), '');

  // 全部年级视图
  S.renderLibModal(sub, tp, "__all");
  mb = doc.getElementById('modal-body').innerHTML;
  ok('  全部年级视图列出所有条目', (mb.match(/data-study-toggle=/g)||[]).length===all.length, 'n='+(mb.match(/data-study-toggle=/g)||[]).length+' all='+all.length);
  ok('  全部年级 chip 选中（on）', mb.includes('chip on" data-lib-grade="__all"'), '');

  // 跨年级加入：joined 全年级口径 + 计入学习目标 + 排进今日任务池 + 卡片 pill
  const xg = all.find(it=>it.grade && it.grade!==g0);
  ok('  找到一条其他年级内容', !!xg, '');
  const lpBefore = S.libPoolFor(sub, tp);
  ok('  加入前 libPoolFor 不含跨年级条目', !lpBefore.some(it=>it.key===xg.key), '');
  S.state.studySet = S.state.studySet || {};
  S.state.studySet[xg.key] = true;
  const sec = S.studyLibData().sections.find(s=>s.subject===sub&&s.type===tp);
  ok('  跨年级加入后板块 joined 计入（全年级口径）', sec.joined===1, 'joined='+sec.joined);
  ok('  跨年级加入计入学习目标总量', S.weekGoalData().total===1, 'total='+S.weekGoalData().total);
  const lpAfter = S.libPoolFor(sub, tp);
  ok('  加入后 libPoolFor 含跨年级条目（排进今日轮换）', lpAfter.some(it=>it.key===xg.key) && lpAfter.length===cur.length+1, 'len='+lpAfter.length);
  S.renderWeek();
  const wk = doc.getElementById('view-week').innerHTML;
  ok('  跨年级加入后板块卡显示「✓ 打卡中」', wk.includes('✓ 打卡中'), '');
  // 弹窗头部提示全部年级已加入数
  S.openLibSection(sub, tp);
  mb = doc.getElementById('modal-body').innerHTML;
  ok('  弹窗头部提示「全部年级共 N」', mb.includes('（全部年级共 1）'), '');
});

/* ---------- ⑩ 语文页筛选空态与「↩ 返回」（bp：点「已学」筛选后被「待导入」空态困住） ---------- */
safe('⑩ 语文页筛选空态与返回', ()=>{
  const ctx = boot({});
  const S = ctx.window.__SITE__;
  const doc = ctx.window.document;
  // 默认诗词页有内容
  S.renderSubject('语文');
  let cn = doc.getElementById('view-subject').innerHTML;
  ok('  语文·诗词默认有内容列表', cn.includes('task-grid') && !cn.includes('待导入'), '');

  // 点「已学」且没有已学内容 → 不得落入「待导入」，保留筛选行 + 空态 + 返回按钮
  S.cnView.learn = 'done';
  S.renderSubject('语文');
  cn = doc.getElementById('view-subject').innerHTML;
  ok('  已学筛选无结果不显示「待导入」', !cn.includes('待导入'), '');
  ok('  保留状态筛选行（可点回全部）', cn.includes('data-cn-learn="all"') && cn.includes('data-cn-learn="done"'), '');
  ok('  空态文案为「还没有已学的内容」', cn.includes('还没有已学的内容'), '');
  ok('  空态带「↩ 返回（清除筛选）」按钮', cn.includes('data-cn-clear') && cn.includes('↩ 返回'), '');

  // 「返回」= 清除筛选（与 data-cn-clear 处理器同行为）：reset + 重渲染恢复完整列表
  S.cnView.grade='全部'; S.cnView.q=''; S.cnView.learn='all';
  S.renderSubject('语文');
  cn = doc.getElementById('view-subject').innerHTML;
  ok('  清除筛选后恢复完整列表', cn.includes('task-grid') && !cn.includes('还没有已学'), '');

  // 未学筛选清空 → 「全部已学完」空态 + 返回按钮
  // 语文·诗词页默认展示全年级（年级筛选「全部」），要把整个池标记已学才能清空「未学」
  const curPool = S.ALL.filter(x=>x.subject==='语文'&&x.type==='诗词');
  curPool.forEach(it=>{ S.state.learned[it.key]='2026-10-24'; });
  S.cnView.learn='todo';
  S.renderSubject('语文');
  cn = doc.getElementById('view-subject').innerHTML;
  ok('  未学筛选无结果显示「全部已学完」', cn.includes('全部已学完') && !cn.includes('待导入'), '');
  ok('  全部已学完空态也带返回按钮', cn.includes('data-cn-clear'), '');

  // 搜索无结果 → 搜索空态 + 返回按钮
  S.cnView.learn='all';
  curPool.forEach(it=>{ delete S.state.learned[it.key]; });
  S.cnView.q='zzzz不存在的关键词';
  S.renderSubject('语文');
  cn = doc.getElementById('view-subject').innerHTML;
  ok('  搜索无结果不显示「待导入」', !cn.includes('待导入'), '');
  ok('  搜索空态带返回按钮', cn.includes('没有找到') && cn.includes('data-cn-clear'), '');
  S.cnView.q='';

  // 类型本身无内容（文言，WENYAN=[]）→ 仍走「待导入」引导
  S.cnView.type='文言';
  S.renderSubject('语文');
  cn = doc.getElementById('view-subject').innerHTML;
  ok('  无内容类型（文言）仍显示待导入引导', cn.includes('待导入') && cn.includes('文言内容待导入'), '');
  S.cnView.type='诗词'; S.cnView.grade='全部'; S.cnView.q=''; S.cnView.learn='all';

  // renderGeneric：筛选无结果时文案诚实（不再说"后台添加"）
  S.renderSubject('数学'); // 初始化 gnView['数学']
  S.gnView['数学'].q='zzzz不存在的关键词';
  S.renderSubject('数学');
  const mt = doc.getElementById('view-subject').innerHTML;
  ok('  数学页筛选无结果显示「没有匹配的内容」', mt.includes('没有匹配的内容') && !mt.includes('暂无内容'), '');
  S.gnView['数学'].q='';

  // 源码守卫：返回按钮处理器存在
  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  源码含 data-cn-clear 处理器', code.includes('[data-cn-clear]'), '');
});

/* ---------- ⑪ 积分撤销需家长权限（bq：撤销按钮 + 口令闸门 + 确认框） ---------- */
safe('⑪ 积分撤销权限闸门', ()=>{
  const ctx = boot({});
  const S = ctx.window.__SITE__;
  const doc = ctx.window.document;
  const today = S.fmt(new Date());
  // 造一条扣分 + 一条学会积分
  S.penalize('p1'); // -5
  S.award(8, '学会《测试卡》', 'learn:test:key1');
  S.renderReward();
  const rw = doc.getElementById('view-reward').innerHTML;
  ok('  积分流水扣分明细带撤销按钮', rw.includes('data-undo-pen="pen:p1:'+today+'"'), '');
  ok('  积分流水学会明细带撤销按钮', rw.includes('data-undo-learn="test:key1"'), '');
  ok('  流水说明标注撤销需家长口令', rw.includes('撤销需验证家长口令'), '');

  // 权限闸门：未登录 → 弹验证框且不执行
  S.state.adminAuthed = false;
  let ran = 0;
  S.requireAdmin(()=>{ ran++; });
  let mb = doc.getElementById('modal-body').innerHTML;
  ok('  未登录时弹出家长验证框', mb.includes('家长验证') && mb.includes('id="agPw"'), '');
  ok('  未通过验证不执行动作', ran===0, 'ran='+ran);
  // 口令错误 → false，仍不执行
  doc.getElementById('agUser').value = 'admin';
  doc.getElementById('agPw').value = 'wrong';
  ok('  口令错误返回 false 且不执行', S.adminGateTry()===false && ran===0, '');
  // 口令正确 → 放行执行 + 标记登录态
  doc.getElementById('agPw').value = '123456';
  ok('  口令正确放行并执行', S.adminGateTry()===true && ran===1 && S.state.adminAuthed===true, 'ran='+ran);
  // 已登录 → 直接执行不弹框
  ran = 0;
  S.requireAdmin(()=>{ ran++; });
  ok('  已登录后直接执行不弹验证框', ran===1, 'ran='+ran);

  // 确认框（扣分）：说清后果
  S.confirmUndo('pen', 'pen:p1:'+today);
  mb = doc.getElementById('modal-body').innerHTML;
  ok('  扣分撤销前弹确认框', mb.includes('撤销行为扣分') && mb.includes('确定撤销') && mb.includes('再想想'), '');
  const pts0 = S.state.points;
  doc.getElementById('cfOk').onclick();
  ok('  确认后扣分撤销返还积分', S.state.points===pts0+5 && S.penaltyLogToday().length===0, 'p='+S.state.points);

  // 确认框（学会）：退分 + 取消已学
  S.state.learned['test:key1'] = today;
  S.confirmUndo('learn', 'test:key1');
  mb = doc.getElementById('modal-body').innerHTML;
  ok('  学会撤销前弹确认框', mb.includes('撤销学会积分') && mb.includes('退回'), '');
  const pts1 = S.state.points;
  doc.getElementById('cfOk').onclick();
  ok('  确认后学会撤销退分并取消已学', S.state.points===pts1-8 && !S.state.learned['test:key1'], 'p='+S.state.points);

  // 已撤销的记录再点 → 不弹确认框
  S.confirmUndo('pen', 'pen:p1:'+today);
  ok('  重复撤销同一记录被拒（不弹框）', doc.getElementById('modal').hidden===true, '');

  // 卡片弹窗「撤销学会」也走确认框
  const poem = S.ALL.find(x=>x.subject==='语文'&&x.type==='诗词');
  S.state.learned[poem.key] = today;
  S.confirmUnlearn(poem);
  mb = doc.getElementById('modal-body').innerHTML;
  ok('  卡片撤销学会弹确认框', mb.includes('撤销学会') && mb.includes('该卡没有产生过学会积分'), '');
  doc.getElementById('cfOk').onclick();
  ok('  确认后取消已学标记', !S.state.learned[poem.key], '');

  // 源码守卫：撤销入口均走 requireAdmin
  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  撤销按钮均走 requireAdmin（含定义≥5 处）', (code.match(/requireAdmin\(/g)||[]).length>=5, 'n='+(code.match(/requireAdmin\(/g)||[]).length);
});

/* ---------- ⑫ 本周计划板块胶囊（bs：与学习目标/学习库联动，WB 推荐+可增删） ---------- */
safe('⑫ 本周计划板块胶囊', ()=>{
  const ctx = boot({});
  const S = ctx.window.__SITE__;
  const doc = ctx.window.document;

  // 默认 = WB 推荐（与旧周计划口径一致：有内容、打卡开、起止日内）
  const rec = S.planRecommended();
  ok('  推荐集合非空', rec.length>0, 'n='+rec.length);
  ok('  默认计划=推荐集合（保留 WB 推荐版本）', JSON.stringify(S.planSecs())===JSON.stringify(rec), '');

  // 移除一个板块 → 计划 / 周分布 / 今日任务同步去掉（联动不孤立）
  const vA = rec[0];
  const kA = vA.subject+'·'+vA.type;
  S.planToggle(vA.subject, vA.type);
  ok('  移除后不在计划内', !S.planHas(vA.subject, vA.type) && !S.planSecs().some(s=>s.subject===vA.subject&&s.type===vA.type), '');
  ok('  移除后周计划不再排该板块', !S.weekPlan().some(d=>d.some(x=>x.subject===vA.subject&&x.type===vA.type)), '');
  const tg1 = S.todayTasks();
  ok('  移除后今日任务不含该板块', !tg1[kA] || tg1[kA].length===0, '');

  // 加回 → 恢复；加回后再移除也必须生效（不能只清 add 残留推荐里）
  S.planToggle(vA.subject, vA.type);
  ok('  加回后计划与周计划恢复', S.planHas(vA.subject, vA.type) && S.weekPlan().some(d=>d.some(x=>x.subject===vA.subject&&x.type===vA.type)), '');
  S.planToggle(vA.subject, vA.type);
  ok('  加回后再移除生效（不残留 add）', !S.planHas(vA.subject, vA.type) && !(S.state.planSecs.add||{})[kA], JSON.stringify(S.state.planSecs));

  // 恢复推荐
  S.planReset();
  ok('  恢复推荐=清空全部增删', Object.keys(S.state.planSecs.add||{}).length===0 && Object.keys(S.state.planSecs.del||{}).length===0, JSON.stringify(S.state.planSecs));
  ok('  恢复后计划=推荐集合', JSON.stringify(S.planSecs())===JSON.stringify(rec), '');

  // 全部移除 → 空计划（周计划无槽位）
  rec.forEach(s=>S.planToggle(s.subject, s.type));
  ok('  全部移除后计划为空', S.planSecs().length===0, '');
  ok('  空计划时周计划无槽位', S.weekPlan().reduce((a,d)=>a+d.length,0)===0, '');
  S.planReset();

  // 未开始板块：显式加入有标记但不排入（到期自动恢复）；选择器里未加入的禁用、已加入的可移除
  const vB = rec[1];
  const kB = vB.subject+'·'+vB.type;
  S.state.sectionPlan = S.state.sectionPlan || {};
  S.state.sectionPlan[kA] = { start:'2099-01-01' };
  S.state.sectionPlan[kB] = { start:'2099-01-01' };
  S.planToggle(vA.subject, vA.type);
  ok('  未开始板块显式加入：有标记但不排入', S.planHas(vA.subject, vA.type) && !S.planSecs().some(s=>s.subject===vA.subject&&s.type===vA.type), '');
  S.openPlanPicker();
  let mbPick = doc.getElementById('modal-body').innerHTML;
  const tagB0 = mbPick.indexOf('data-plan-toggle="'+kB+'"');
  let segB = mbPick.slice(tagB0, mbPick.indexOf('</button>', tagB0));
  ok('  选择器：未加入的未开始板块禁用', segB.includes('disabled') && segB.includes('＋ 加入本周计划'), '');
  const tagA0 = mbPick.indexOf('data-plan-toggle="'+kA+'"');
  let segA = mbPick.slice(tagA0, mbPick.indexOf('</button>', tagA0));
  ok('  选择器：已加入的未开始板块可移除', segA.includes('title="移出本周计划') && !segA.includes('disabled') && segA.includes('✓ 移出本周计划'), '');
  S.planReset();
  delete S.state.sectionPlan[kA]; delete S.state.sectionPlan[kB];

  // 本周页结构：计划在学习目标正下方；胶囊可增删；与学习库卡联动
  S.renderWeek();
  let wk = doc.getElementById('view-week').innerHTML;
  const iGoal = wk.indexOf('🎯 学习目标'), iPlan = wk.indexOf('sec-title">🗓 本周计划'), iEb = wk.indexOf('🔁 艾宾浩斯复习');
  ok('  本周计划位于学习目标正下方', iGoal>=0 && iPlan>iGoal && iPlan<iEb, 'g='+iGoal+' p='+iPlan+' eb='+iEb);
  ok('  底部旧「本周计划」区块已移除（全页仅一处）', wk.indexOf('sec-title">🗓 本周计划')===wk.lastIndexOf('sec-title">🗓 本周计划'), '');
  ok('  计划胶囊渲染（plan-cap + × 移除 + 点名字进学习库）', wk.includes('class="plan-caps"') && wk.includes('data-plan-cap=') && wk.includes('data-plan-del=') && wk.includes('data-plan-open='), '');
  ok('  添加板块 / 恢复推荐按钮', wk.includes('planAddBtn') && wk.includes('planResetBtn'), '');
  ok('  学习库卡显示「🗓 计划中」联动标识', wk.includes('🗓 计划中'), '');

  // 移除诗词 → 胶囊与学习库卡同步消失
  S.planToggle('语文','诗词');
  S.renderWeek();
  wk = doc.getElementById('view-week').innerHTML;
  ok('  移除后计划胶囊消失', !wk.includes('data-plan-cap="语文·诗词"'), '');
  const ci = wk.indexOf('data-lib-sec="语文·诗词"'), cj = wk.indexOf('data-lib-sec="', ci+10);
  ok('  移除后学习库卡去掉「🗓 计划中」', !wk.slice(ci, cj>0?cj:wk.length).includes('🗓 计划中'), '');
  S.planToggle('语文','诗词');
  S.renderWeek();
  ok('  加回后胶囊与网格恢复', doc.getElementById('view-week').innerHTML.includes('data-plan-cap="语文·诗词"'), '');

  // 学习库弹窗：计划开关 + 联动说明
  const sec0 = S.studyLibData().sections[0];
  S.openLibSection(sec0.subject, sec0.type);
  const mbLib = doc.getElementById('modal-body').innerHTML;
  ok('  学习库弹窗含计划开关', mbLib.includes('data-plan-toggle='), '');
  ok('  学习库弹窗说明计划联动', mbLib.includes('「加入本周计划」后进入每周排程与今日任务'), '');

  // 学习目标明细：板块计划状态 + 切换入口 + 联动说明
  if(sec0.items[0]) S.state.studySet[sec0.items[0].it.key]=true;
  S.openWeekGoal();
  const mbGoal = doc.getElementById('modal-body').innerHTML;
  ok('  目标明细含板块计划状态 chip', mbGoal.includes('data-wg-plan=') && mbGoal.includes('🗓 计划中'), '');
  ok('  目标明细说明与本周计划联动', mbGoal.includes('与「🗓 本周计划」联动'), '');

  // 板块管理弹窗可开、含恢复推荐
  S.openPlanPicker();
  mbPick = doc.getElementById('modal-body').innerHTML;
  ok('  板块管理弹窗可打开', mbPick.includes('🗓 本周计划 · 板块管理') && mbPick.includes('data-plan-reset="1"'), '');

  // 源码守卫
  const code = fs.readFileSync(path.join(SITE_DIR,'app.js'),'utf8');
  ok('  weekPlan 槽位源为 planSecs()', /function weekPlan\(\)\{[\s\S]{0,120}planSecs\(\)/.test(code), '');
  ok('  PER_STUDENT_FIELDS 含 planSecs', code.includes('"planSecs"'), '');
  ok('  applyStateDefaults 补 planSecs 缺省（旧包兼容）', /state\.planSecs = state\.planSecs \|\| \{add:\{\},del:\{\}/.test(code), '');
});

/* ---------- ⑦ 版本号 ---------- */
safe('⑦ 版本号', ()=>{
  const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf8');
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
  const bi=(html.match(/20261024bi/g)||[]).length;
  const bh=(html.match(/20261024bh/g)||[]).length;
  const bg=(html.match(/20261024bg/g)||[]).length;
  const bf=(html.match(/20261024bf/g)||[]).length;
  const be=(html.match(/20261024be/g)||[]).length;
  const bd=(html.match(/20261024bd/g)||[]).length;
  const ba=(html.match(/20261024ba/g)||[]).length;
  ok('  10 处 bs', bs===10, 'bs='+bs);
  ok('  0 处 bq/bp/bo/bn/bm/bl/bk/bi/bh/bg/bf/be/bd/ba/bj/br', bq===0&&bp===0&&bo===0&&bn===0&&bm===0&&bl===0&&bk===0&&bi===0&&bh===0&&bg===0&&bf===0&&be===0&&bd===0&&ba===0&&bj===0&&br===0, 'bq='+bq+' bp='+bp+' bo='+bo+' bn='+bn+' bm='+bm+' bl='+bl+' bk='+bk+' bi='+bi+' bh='+bh+' bg='+bg+' bf='+bf+' be='+be+' bd='+bd+' ba='+ba+' bj='+bj+' br='+br);
});

let pass=0;
for(const r of results){
  console.log((r.ok?'✅':'❌')+' '+r.name + (r.extra?('  ['+r.extra+']'):''));
  if(r.ok) pass++;
}
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass===results.length?0:1);
