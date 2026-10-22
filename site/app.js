/* ============ 学堂 · 应用逻辑（v1.3 架构：首页内容流 + 学科栏目 → 上/下册学习空间） ============ */
(function(){
  "use strict";
  const D = window.STUDY_DATA;
  const STORE_KEY = "xuetang_site_v1";
  const DAILY_GOAL = 8; // 今日任务：1 诗词 + 2 成语 + 5 单词

  /* ---------- 诗词年级映射（部编版小学语文教材 一至六年级 上/下册） ----------
     每项 [基础诗题, 年级, 区分用副标题(可空)]；匹配时取诗题主名，副标题用于消歧。 */
  const POEM_GRADE_MAP = [
    ["咏鹅","一年级"],["江南","一年级"],["画","一年级"],["悯农","一年级"],["古朗月行","一年级"],["风","一年级"],
    ["春晓","一年级"],["赠汪伦","一年级"],["静夜思","一年级"],["寻隐者不遇","一年级"],["池上","一年级"],["小池","一年级"],["画鸡","一年级"],
    ["梅花","二年级"],["小儿垂钓","二年级"],["登鹳雀楼","二年级"],["望庐山瀑布","二年级"],["江雪","二年级"],["夜宿山寺","二年级"],["敕勒歌","二年级"],
    ["村居","二年级"],["咏柳","二年级"],["赋得古原草送别","二年级"],["晓出净慈寺送林子方","二年级"],["绝句","二年级","两个黄鹂鸣翠柳"],["悯农","二年级","其一"],["舟夜书所见","二年级"],
    ["所见","三年级"],["山行","三年级"],["赠刘景文","三年级"],["夜书所见","三年级"],["望天门山","三年级"],["饮湖上初晴后雨","三年级"],["望洞庭","三年级"],["早发白帝城","三年级"],["采莲曲","三年级"],
    ["绝句","三年级","迟日江山丽"],["惠崇春江晚景","三年级"],["三衢道中","三年级"],["忆江南","三年级"],["元日","三年级"],["清明","三年级"],["九月九日忆山东兄弟","三年级"],["滁州西涧","三年级"],["大林寺桃花","三年级"],
    ["浪淘沙","四年级","其七"],["鹿柴","四年级"],["暮江吟","四年级"],["题西林壁","四年级"],["雪梅","四年级"],["嫦娥","四年级"],["出塞","四年级"],["凉州词","四年级"],["夏日绝句","四年级"],["别董大","四年级"],
    ["四时田园杂兴","四年级","其二十五"],["宿新市徐公店","四年级"],["清平乐","四年级","村居"],["江畔独步寻花","四年级"],["蜂","四年级"],["独坐敬亭山","四年级"],["芙蓉楼送辛渐","四年级"],["塞下曲","四年级"],["墨梅","四年级"],
    ["蝉","五年级"],["乞巧","五年级"],["示儿","五年级"],["题临安邸","五年级"],["己亥杂诗","五年级"],["山居秋暝","五年级"],["枫桥夜泊","五年级"],["长相思","五年级"],["渔歌子","五年级"],["观书有感","五年级","其一"],["观书有感","五年级","其二"],
    ["四时田园杂兴","五年级","其三十一"],["稚子弄冰","五年级"],["村晚","五年级"],["游子吟","五年级"],["鸟鸣涧","五年级"],["从军行","五年级"],["秋夜将晓出篱门迎凉有感","五年级"],["闻官军收河南河北","五年级"],["凉州词","五年级"],["黄鹤楼送孟浩然之广陵","五年级"],["乡村四月","五年级"],
    ["宿建德江","六年级"],["六月二十七日望湖楼醉书","六年级"],["西江月","六年级","夜行黄沙道中"],["过故人庄","六年级"],["春日","六年级"],["回乡偶书","六年级"],["浪淘沙","六年级","其一"],["江南春","六年级"],["书湖阴先生壁","六年级"],
    ["寒食","六年级"],["迢迢牵牛星","六年级"],["十五夜望月","六年级"],["长歌行","六年级"],["马诗","六年级"],["石灰吟","六年级"],["竹石","六年级"],["采薇","六年级"],["送元二使安西","六年级"],["春夜喜雨","六年级"],["早春呈水部张十八员外","六年级"],["江上渔者","六年级"],["泊船瓜洲","六年级"],["游园不值","六年级"],["卜算子","六年级","送鲍浩然之浙东"],["浣溪沙","六年级"],["清平乐","六年级"]
  ];
  // 按诗题匹配年级：取主名，副标题消歧；同主名多条取最早年级
  function matchPoemGrade(title){
    const parts = String(title||"").split(/[（(·\-—]/);
    const base = parts[0].replace(/\s/g,"");
    const alt  = (parts[1]||"").replace(/[）)\s]/g,"");
    const cands = POEM_GRADE_MAP.filter(e=>e[0]===base);
    if(!cands.length) return null;
    if(cands.length===1) return cands[0][1];
    const pick = cands.find(e=> e[2] && alt.indexOf(e[2])>=0);
    return (pick||cands[0])[1];
  }

  /* ---------- 数据规整：统一为「文章」模型 ---------- */
  // 诗词（通用内容，未分年级）
  const POEMS = (D.poems||[]).map(p => ({
    key: "poem:"+p.id, subject:"语文", type:"诗词",
    title:p.title||"", sub:((p.dynasty? p.dynasty+" · ":"")+(p.author||"")),
    body:p.content||"", form:p.form||"", grade:p.grade || matchPoemGrade(p.title), volume:null,
    tags:p.tags||[]
  }));
  const POEM_GRADE_PRESENT = [...new Set(POEMS.map(p=>p.grade).filter(Boolean))];
  // 成语（按年级）
  const IDIOMS = (D.idioms||[]).map((g,i) => ({
    key:"idiom:"+i, subject:"语文", type:"成语",
    title:g.word||"", sub:"", body:g.explanation||"",
    grade:g.grade||"", volume:null, tags:[g.grade].filter(Boolean)
  }));
  // 单词（年级+上下册+单元 —— 导入时已自动匹配）
  const WORDS = (D.words||[]).map((w,i) => {
    const m = (w.grade||"").match(/^(.+?)(上册|下册)$/);
    const grade = m ? m[1] : (w.grade||"");
    const volume = m ? m[2] : "";
    return {
      key:"word:"+i, subject:"英语", type:"单词",
      title:w.text||"", sub:w.phonetic||"", body:w.cn||"",
      unit:w.unit||"", grade, volume,
      tags:[grade, volume, w.unit].filter(Boolean)
    };
  });
  // 成语动画廊（迁移自旧站：180 集 B 站成语动画）
  const GALLERY = (window.DEFAULT_GALLERY||[]).map((c,i)=>({
    key:"gal:"+i, subject:"语文", type:"成语动画廊",
    title:c.word||"", sub:"", body:c.explanation||"",
    url:c.url||"", videos:c.url?[c.url]:[], grade:null, volume:null, tags:["成语动画"]
  }));
  // 文言文（待导入：整年级内容导入后将自动匹配并归入本类型）
  const WENYAN = [];
  // 全局索引（state 就绪后再由 rebuildAll 填充，避免提前引用 state）
  let ALL = [], INDEX = {};
  let CUSTOM = []; // 后台素材（= state.custom），rebuildAll 中同步
  // 内置教材素材（由 extra.js 注入 window.STUDY_DATA.extra，与后台素材同模型）
  const EXTRA = (D.extra||[]).map(o=>({
    key:"extra:" + (o.id || (o.title||"x") + "_" + (o.type||"")),
    subject:o.subject||"数学", type:o.type||"", title:o.title||"",
    sub:o.sub||"", body:o.body||"", grade:o.grade||"",
    volume:(o.volume && o.volume!=="—") ? o.volume : "", unit:o.unit||"",
    tags:Array.isArray(o.tags)?o.tags:String(o.tags||"").split(/[,，]/).map(s=>s.trim()).filter(Boolean),
    videos:Array.isArray(o.videos)?o.videos:String(o.videos||"").split(/[\n,，]/).map(s=>s.trim()).filter(Boolean)
  }));
  // 取条目「有效正文」：若该内置条目被用户覆盖编辑，则用覆盖版本；否则用原内置正文
  function effBody(x){ const o=(state.overrides||{})[x.key]; return (o && o.body!=null) ? o.body : x.body; }
  function rebuildAll(){
    CUSTOM = (state.custom) || [];
    const OV = state.overrides || {};
    const OVSET = new Set(Object.keys(OV));
    // 思维母题拆分为「单题条目」：一题一卡，可单独标记学会，每日打卡固定 5 题
    const MOTHER_QS = [];
    [...CUSTOM, ...EXTRA].filter(x=>x.subject==="数学" && x.type==="思维母题").forEach(src=>{
      splitQuestions(effBody(src)).forEach((q,i)=>{
        const topic=(src.title||"思维母题").replace(/^母题[一二三四五六七八九十]+[：:]/,"").replace(/[（(].*$/, "").trim();
        MOTHER_QS.push({
          key:"mtq:"+strHash((src.title||"")+"::"+q.q),
          subject:"数学", type:"思维母题",
          title:(topic||src.title||"思维母题")+" · 第"+(i+1)+"题",
          sub:src.title||"", body:q.q, a:q.a||"",
          grade:src.grade||"四年级", volume:src.volume||"", unit:src.unit||"",
          tags:(src.tags||[]).slice(), videos:[]
        });
      });
    });
    // 打散练习入口（全部题目均匀交错，弹窗内逐题配「答案提示」）
    const PRACTICE_ENTRY = { key:"practice:maththought", subject:"数学", type:"思维母题",
      title:"🧠 思维母题 · 打散练习", sub:"全部题目跨专题均匀打散，每题配「答案提示」", body:"", grade:"四年级", tags:["思维母题"], videos:[] };
    const restCustom = CUSTOM.filter(x=>!(x.subject==="数学"&&x.type==="思维母题"));
    const restExtra  = EXTRA.filter(x=>!(x.subject==="数学"&&x.type==="思维母题") && !OVSET.has(x.key));
    // 内置条目被「覆盖编辑」后，以覆盖版本替换原内置项（思维母题母题源以拆分单题形式反映覆盖，故此处排除）
    const OV_ITEMS = [];
    EXTRA.forEach(x=>{
      if(OVSET.has(x.key) && !(x.subject==="数学" && x.type==="思维母题")){
        OV_ITEMS.push(Object.assign({}, x, OV[x.key], {key:x.key}));
      }
    });
    ALL=[...POEMS,...IDIOMS,...WORDS,...GALLERY,...WENYAN,...restCustom,...restExtra,...OV_ITEMS,...MOTHER_QS,PRACTICE_ENTRY];
    INDEX={}; ALL.forEach(it=>INDEX[it.key]=it);
  }
  // 将后台表单/批量数据归一化为标准条目；诗词年级为空时按诗题自动匹配
  function makeCustomItem(o){
    const key = "custom:" + (o.id || (Date.now()+"_"+Math.random().toString(36).slice(2,7)));
    const grade = (o.grade && o.grade!=="—") ? o.grade
      : (o.type==="诗词" ? matchPoemGrade(o.title) : null);
    return {
      key, subject:o.subject||"语文", type:o.type||"诗词", title:o.title||"",
      sub:o.sub||"", body:o.body||"", grade,
      volume:(o.volume && o.volume!=="—") ? o.volume : "",
      unit:o.unit||"",
      tags:String(o.tags||"").split(/[,，]/).map(s=>s.trim()).filter(Boolean),
      videos:String(o.videos||"").split(/[\n,，]/).map(s=>s.trim()).filter(Boolean)
    };
  }

  const GRADES = ["一年级","二年级","三年级","四年级","五年级","六年级","初一","初二","初三","高一","高二","高三"];
  const IDIOM_GRADES = [...new Set(IDIOMS.map(x=>x.grade))];
  const WORD_GRADES  = [...new Set(WORDS.map(x=>x.grade))];
  // 年级筛选按钮按 学级 顺序排（一二三…六），不按数据出现顺序
  POEM_GRADE_PRESENT.sort((a,b)=>GRADES.indexOf(a)-GRADES.indexOf(b));
  IDIOM_GRADES.sort((a,b)=>GRADES.indexOf(a)-GRADES.indexOf(b));
  // 各学科的「类型」子分类（后台添加素材时联动）
  const SUBJECT_TYPES = {
    "语文":["诗词","成语","文言","成语动画廊","作文","故事","阅读","课文"],
    "数学":["公式","计算题","应用题","每日一练","思维母题"],
    "英语":["单词","听力","短语","句子","阅读","课文背诵"],
    "科学":["实验","知识"],
    "人文":["史实","人物","阅读"]
  };
  // 打卡范围的可勾选项：展平为「学科·类型」粒度（比整门学科更细）
  const CHECKIN_TYPES = [];
  Object.keys(SUBJECT_TYPES).forEach(s=>SUBJECT_TYPES[s].forEach(t=>CHECKIN_TYPES.push({subject:s, type:t})));
  function checkinKey(s,t){ return s+"·"+t; }
  function checkinOn(s,t){ return !(state.checkin && state.checkin[checkinKey(s,t)]===false); } // 缺省开启

  /* ---------- 学习计划引擎：90 天学期 · 以周为单位均匀安排 ---------- */
  const SEMESTER_DAYS = 90;
  const EB_INTERVALS = [1,2,4,7,15]; // 艾宾浩斯复习间隔（天）
  const WEEK_NAMES = ["周日","周一","周二","周三","周四","周五","周六"];
  const MAIN_SUBJECTS = ["语文","数学","英语"];
  // 每类型每日配额（控制每日总量）
  const TYPE_QUOTA = {"诗词":1,"成语":2,"单词":5,"听力":2,"阅读":2,"每日一练":1};
  function typeQuota(t){ return TYPE_QUOTA[t]!==undefined ? TYPE_QUOTA[t] : 2; }
  // 每类型每周频次（主课多、副课少；未列出的主课类型每周 1 次）
  const WEEK_FREQ_OVER = {
    "语文·诗词":5, "英语·单词":5,
    "语文·成语":3, "数学·每日一练":3,
    "数学·计算题":2, "数学·应用题":2, "英语·听力":2,
    "数学·思维母题":2
  };
  function weekFreqOf(subject,type){
    const k = checkinKey(subject,type);
    if(WEEK_FREQ_OVER[k]!==undefined) return WEEK_FREQ_OVER[k];
    return MAIN_SUBJECTS.includes(subject) ? 1 : 1;
  }
  // 稳定字符串哈希（保证每周计划确定性、刷新不变）
  function strHash(s){ let h=7; for(let i=0;i<s.length;i++) h=(h*131+s.charCodeAt(i))>>>0; return h; }
  // 周计划：返回长度 7 的数组（下标 0=周日），每天为 [{subject,type},…]
  // 规则：主课(语数英)每天 3~4 类、科学/人文尽量排周末；同一类型一天最多一次；按每日配额均衡负载。
  function weekPlan(){
    const slots=[];
    CHECKIN_TYPES.forEach(({subject,type})=>{
      if(!checkinOn(subject,type)) return;
      let pool=[]; try{ pool=poolFor(subject,type); }catch(e){ pool=[]; }
      if(!pool.length) return;
      for(let i=0;i<weekFreqOf(subject,type);i++) slots.push({subject,type});
    });
    // 确定性乱序，避免同一学科的类型挤在同一天
    let seed=42; const rnd=()=>{ seed=(seed*1103515245+12345)>>>0; return seed/4294967296; };
    for(let i=slots.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const tmp=slots[i]; slots[i]=slots[j]; slots[j]=tmp; }
    const plan=[[],[],[],[],[],[],[]];
    const tCount=[0,0,0,0,0,0,0], qLoad=[0,0,0,0,0,0,0], subCnt=[{},{},{},{},{},{},{}];
    slots.forEach(s=>{
      const second=!MAIN_SUBJECTS.includes(s.subject);
      let best=-1, bestScore=Infinity;
      for(let d=0;d<7;d++){
        if(plan[d].some(x=>x.subject===s.subject&&x.type===s.type)) continue; // 同类型一天一次
        // 先均衡「每天类型数」，再兼顾每日条目量；同学科分散到不同天
        let score = tCount[d]*10 + qLoad[d] + (subCnt[d][s.subject]||0)*1.2;
        if(second && d>=1 && d<=5) score+=6;            // 副课尽量排周末
        if(!second && (d===0||d===6)) score+=1;         // 主课周末略降密度
        if(score<bestScore){ bestScore=score; best=d; }
      }
      if(best<0) best=tCount.indexOf(Math.min.apply(null,tCount));
      plan[best].push(s); tCount[best]++; qLoad[best]+=typeQuota(s.type);
      subCnt[best][s.subject]=(subCnt[best][s.subject]||0)+1;
    });
    return plan;
  }
  // 某条目今天是否为艾宾浩斯到期复习
  function dueReview(key){
    const d=state.learned[key];
    if(!d) return false;
    if(!EB_INTERVALS.includes(dayDiff(d))) return false;
    const t=fmt(new Date());
    return !(state.reviewed[t] && state.reviewed[t][key]);
  }
  function dueReviews(){
    return Object.keys(state.learned).filter(dueReview).map(k=>INDEX[k]).filter(Boolean).slice(0,6);
  }
  function habitDone(h){
    const t=fmt(new Date());
    return !!(state.habitLog[t] && state.habitLog[t][h]);
  }
  // 本周日期（周一起始）：返回 [周一…周日] 的日期字符串
  function weekDatesMondayStart(){
    const now=new Date();
    const dow=now.getDay(); // 0=周日
    const diff = (dow===0) ? 6 : (dow-1); // 今天距本周周一的天数（周日=6）
    const monday=new Date(now.getFullYear(), now.getMonth(), now.getDate()-diff); // 往回退到周一
    const arr=[];
    for(let i=0;i<7;i++){ const d=new Date(monday); d.setDate(monday.getDate()+i); arr.push(fmt(d)); }
    return arr;
  }
  const WEEK_MON = ["一","二","三","四","五","六","日"]; // 周一起始的星期标签

  /* ---------- 数学思维母题：练习模式（打散 + 组合 + 答案提示） ---------- */
  // 把「母题」整段正文拆成单题；若单题内含答案标记则拆出答案（用于「显示答案」按钮）
  function splitQuestions(body){
    const blocks = (body||"").match(/\d+[．.、)]\s*[\s\S]*?(?=\n\s*\d+[．.、)]|$)/g) || [];
    const out=[];
    blocks.forEach(b=>{
      b=b.trim();
      if(!/^\d+[．.、)]/.test(b)) return;
      let q=b, a="";
      const parts = b.split(/(?=答[：:]|答案[：:]|解[：:]|【答案】|（答案)/);
      if(parts.length>1){ q=parts[0].trim(); a=parts.slice(1).join("").trim(); }
      if(q) out.push({q, a});
    });
    return out;
  }
  // 收集所有「数学·思维母题」的单题（跨十大母题，便于打散组合）
  function mathThoughtQuestions(){
    const items = [...EXTRA, ...CUSTOM].filter(x=>x.subject==="数学" && x.type==="思维母题");
    const out=[];
    items.forEach(it=>{
      splitQuestions(effBody(it)).forEach(q=> out.push({ src: it.title, q:q.q, a:q.a }));
    });
    return out;
  }
  // 按当天确定性打乱并跨专题均匀交错（通用）：keyFn 返回专题名
  function interleaveTopics(items, keyFn){
    if(!items.length) return [];
    let seed = (dateSeed()*2654435761) >>> 0;
    const rnd=()=>{ seed=(seed*1103515245+12345)>>>0; return seed/4294967296; };
    const byTopic = {};
    items.forEach(q=>{ const t=keyFn(q)||""; (byTopic[t]=byTopic[t]||[]).push(q); });
    Object.values(byTopic).forEach(arr=>{
      for(let i=arr.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const t=arr[i]; arr[i]=arr[j]; arr[j]=t; }
    });
    const topics = Object.keys(byTopic);
    const idx = {}; topics.forEach(t=>idx[t]=0);
    let rest = topics.length;
    const out=[];
    while(rest>0){
      topics.forEach(t=>{
        const a=byTopic[t];
        if(idx[t] < a.length){ out.push(a[idx[t]++]); if(idx[t]>=a.length) rest--; }
      });
    }
    return out;
  }
  // 练习弹窗用：源自 EXTRA/CUSTOM 原始母题条目的单题流
  function practiceQuestions(){
    return interleaveTopics(mathThoughtQuestions(), q=>q.src);
  }
  // 今日打卡用：拆分后的单题条目（mtq:）按同规则均匀交错排序
  function motherOrdered(){
    return interleaveTopics(
      ALL.filter(x=>x.type==="思维母题" && x.key.indexOf("mtq:")===0),
      it=>(it.sub||it.title).replace(/^母题[一二三四五六七八九十]+[：:]/,"").trim()
    );
  }
  // 每题的「答案提示」：题目自带答案用原答案；否则按母题专题给解题思路提示
  const MOTHER_HINTS = {
    "相遇问题":"相遇问题：相遇时间＝总路程÷速度和；总路程＝速度和×相遇时间；求一方速度＝总路程÷相遇时间−另一方速度。",
    "追及问题":"追及问题：追及时间＝路程差÷速度差；路程差＝速度差×追及时间；同向同时出发时先求两者距离差。",
    "用图形计数解决问题":"图形计数：n 个点两两连线共 n×(n−1)÷2 条；长方形个数＝长边线段数×宽边线段数；数角同理从同一顶点两两搭配。",
    "错中求解":"错中求解：先用「错误条件」算出不变量（如被减数、被乘数、和），再换成正确数字重新算一遍。",
    "买赠问题":"买赠问题：把「买的＋送的」看成一组，先算一组的价格与数量，再看剩余不足一组的部分单独购买。",
    "盈亏问题":"盈亏问题：人数＝（盈＋亏）÷两次每份的差；两次都有剩余用两盈相减，两次都不足用两亏相减。",
    "多位数计算":"多位数计算：把接近整百、整千的数拆成整百整千±补数，如 999×24＝(1000−1)×24＝24000−24。",
    "加乘原理进阶":"加乘原理：分步完成用乘法（每步方案数相乘），分类完成用加法（每类方案数相加），注意数字可重复使用的条件。",
    "定义新运算":"定义新运算：严格按照题目定义的规则，把数代入式子里按顺序计算即可，不要用普通运算先入为主。",
    "算式谜":"算式谜：从个位入手，结合进位/退位标志逐位推理，先填唯一能确定的数位。"
  };
  function motherHint(src){
    const name=(src||"").replace(/^母题[一二三四五六七八九十]+[：:]/,"").trim();
    return MOTHER_HINTS[name] || "先读题找出已知量与问题，试着用画图、列表或倒推的方法分析。";
  }

  /* ---------- 本地状态 ---------- */
  function loadState(){
    try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }catch(e){ return {}; }
  }
  let state = loadState();
  state.grade = state.grade || "四年级";
  state.learned = state.learned || {};
  state.fav = state.fav || {};
  state.videos = state.videos || {};  // 用户为任意条目补充的视频（key → [链接]）
  state.custom = state.custom || [];  // 后台添加的素材（已归一化为标准条目）
  state.overrides = state.overrides || {}; // 对「内置教材」条目的覆盖版本（key = 内置条目 key，仅本机保存，可还原）
  state.checkin = state.checkin || {}; // 首页每日打卡范围（学科→true/false，缺省=开启）
  state.lastKey = state.lastKey || null;
  state.habits = Array.isArray(state.habits) ? state.habits : ["房间卫生","早睡早起","学校作业"]; // 每日习惯打卡
  state.habitLog = state.habitLog || {};   // 日期 → {习惯名: true}
  state.reviewed = state.reviewed || {};   // 日期 → {条目key: true}（艾宾浩斯复习打卡）
  state.semesterStart = state.semesterStart || fmt(new Date()); // 学期第 1 天（90 天学期）
  /* ---------- 多学生：结构/内容共用，学习数据各自独立 ---------- */
  // 随学生切换而独立保存的字段（进度、打卡范围、年级、习惯等）；custom/videos 等为共享内容
  const PER_STUDENT_FIELDS = ["grade","learned","fav","checkin","habits","habitLog","reviewed","semesterStart"];
  function defaultPerStudent(){
    return { grade:"四年级", learned:{}, fav:{}, checkin:{},
      habits:["房间卫生","早睡早起","学校作业"], habitLog:{}, reviewed:{}, semesterStart:fmt(new Date()) };
  }
  function capturePerStudent(){
    const d={}; PER_STUDENT_FIELDS.forEach(f=>{ const v=state[f]; d[f]=(v===undefined?null:JSON.parse(JSON.stringify(v))); });
    return d;
  }
  function applyPerStudent(id){
    const s=state.students[id]; const d=(s&&s.data)||defaultPerStudent();
    PER_STUDENT_FIELDS.forEach(f=>{ state[f]=(d[f]!==undefined && d[f]!==null)?d[f]:defaultPerStudent()[f]; });
    state.currentStudent=id;
  }
  function syncPerStudent(){
    if(!state.students[state.currentStudent]) state.students[state.currentStudent]={name:""};
    state.students[state.currentStudent].data=capturePerStudent();
  }
  if(!state.students){
    // 首次：把现有（单用户）字段收进「学生1」，再建一个空白「学生2」
    const snap=capturePerStudent();
    state.students={ s1:{name:"学生1", data:snap}, s2:{name:"学生2", data:defaultPerStudent()} };
    state.currentStudent="s1";
  }else{
    applyPerStudent(state.currentStudent || Object.keys(state.students)[0]);
  }
  save(); // 首次即持久化多学生结构（含迁移）
  rebuildAll(); // 用主数据 + 后台素材填充 ALL / INDEX
  function save(){
    syncPerStudent(); // 先把当前学生的进度/打卡/年级/习惯写入其独立快照
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  /* ---------- 工具 ---------- */
  const $ = s => document.querySelector(s);
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function fmt(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
  function dateSeed(){ const d=new Date(); return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); }
  const WEEK = ["日","一","二","三","四","五","六"];
  function dayDiff(dateStr){ try{ return Math.floor((Date.now()-new Date(dateStr+"T00:00:00"))/86400000); }catch(e){ return 999; } }
  function pick(arr, n, seed){
    if(!arr.length) return [];
    const out=[]; const start=seed%arr.length;
    for(let k=0;k<Math.min(n,arr.length);k++) out.push(arr[(start+k)%arr.length]);
    return out;
  }
  function badge(type){
    const map={
      "诗词":["#f5f3ff","#7c3aed"],"成语":["#fdf2f8","#db2777"],"课文":["#eff6ff","#2563eb"],
      "文言":["#fff7ed","#ea580c"],"成语动画廊":["#fef3c7","#d97706"],"作文":["#ecfeff","#0891b2"],
      "故事":["#f0fdf4","#16a34a"],"阅读":["#eef2ff","#4f46e5"],
      "单词":["#ecfdf5","#0d9488"],"应用题":["#fdf2f8","#db2777"],"计算题":["#ecfdf5","#0d9488"]
    };
    const [bg,fg]=map[type]||["#f1f5f9","#475569"];
    return `<span class="badge" style="background:${bg};color:${fg}">${esc(type)}</span>`;
  }
  // 学科主题色 [浅底, 主色]：打卡范围/周计划标签按学科区分颜色
  const SUBJECT_COLORS = {
    "语文":["#f5f3ff","#7c3aed"],
    "数学":["#fdf2f8","#db2777"],
    "英语":["#ecfdf5","#0d9488"],
    "科学":["#fff7ed","#ea580c"],
    "人文":["#eef2ff","#4f46e5"]
  };
  function subjectStyle(subject, on){
    const c = SUBJECT_COLORS[subject] || ["#f1f5f9","#475569"];
    return on ? `background:${c[1]};border-color:${c[1]};color:#fff`
              : `background:${c[0]};border-color:${c[0]};color:${c[1]}`;
  }
  function toast(msg){
    const t=$("#toast"); t.textContent=msg; t.hidden=false;
    clearTimeout(t._tm); t._tm=setTimeout(()=>t.hidden=true, 2200);
  }
  function speak(text, lang){
    if(!window.speechSynthesis){ toast("当前浏览器不支持朗读"); return; }
    const u=new SpeechSynthesisUtterance(text); u.lang=lang; u.rate=0.85;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  /* ---------- 视频：条目挂载视频 + 链接解析 + 播放 ---------- */
  // 条目的视频 = 数据自带（导入时带 videos/video 字段）+ 用户在弹窗里手动添加
  function itemVideos(it){
    return [...(it.videos||[]), ...((state.videos||{})[it.key]||[])].filter(Boolean);
  }
  // 解析任意视频链接 → 内嵌 iframe / 本地文件播放 / 新窗口打开
  const VIDEO_SRC_NAMES = {
    "bilibili":"哔哩哔哩","douyin":"抖音","channels":"视频号",
    "qq":"腾讯视频","youtube":"YouTube","upload":"本地视频","web":"网页"
  };
  function parseVideoUrl(raw){
    const url=String(raw||"").trim();
    if(!url) return null;
    let m;
    // 本地 / 直链视频文件（可把文件放进 site/videos/ 后填相对路径）
    if(/\.(mp4|webm|ogv|ogg|mov|m4v)(\?.*)?$/i.test(url)) return {type:"file", url, raw:url, src:"upload"};
    // B站播放器直链（已是 iframe 地址）
    if(/player\.bilibili\.com/i.test(url)) return {type:"iframe", url, raw:url, src:"bilibili"};
    // B站视频页 → 自动转播放器 iframe
    if((m=url.match(/bilibili\.com\/video\/(BV[0-9A-Za-z]+)/)))
      return {type:"iframe", url:`https://player.bilibili.com/player.html?bvid=${m[1]}&page=1&high_quality=1&autoplay=0`, raw:url, src:"bilibili"};
    if((m=url.match(/bilibili\.com\/video\/av(\d+)/i)))
      return {type:"iframe", url:`https://player.bilibili.com/player.html?aid=${m[1]}&page=1&high_quality=1&autoplay=0`, raw:url, src:"bilibili"};
    // B站短链（b23.tv）需浏览器跳转才能解析，提供新窗口打开
    if(/b23\.tv/i.test(url)) return {type:"link", raw:url, src:"bilibili"};
    // 腾讯视频
    if(/v\.qq\.com/i.test(url) && (m=url.match(/[?&]vid=([0-9A-Za-z]+)/) || url.match(/x\/cover\/[0-9A-Za-z]+\/([0-9A-Za-z]+)\.html/)))
      return {type:"iframe", url:`https://v.qq.com/txp/iframe/player.html?vid=${m[1]}&autoplay=false`, raw:url, src:"qq"};
    // YouTube
    if((m=url.match(/youtube\.com\/watch\?.*v=([0-9A-Za-z_-]+)/i)) || (m=url.match(/youtu\.be\/([0-9A-Za-z_-]+)/i)))
      return {type:"iframe", url:`https://www.youtube-nocookie.com/embed/${m[1]}`, raw:url, src:"youtube"};
    // 抖音：官方开放播放器支持站内嵌入（视频页/笔记页含数字 id）
    if((m=url.match(/douyin\.com\/(?:video|note)\/(\d+)/)) || (m=url.match(/iesdouyin\.com\/[^?]*\/(?:video|note)\/(\d+)/)))
      return {type:"iframe", url:`https://open.douyin.com/player/video?vid_id=${m[1]}&autoplay=0`, raw:url, src:"douyin"};
    // 抖音短链（v.douyin.com）：保存时自动解析（见 resolveDouyinShort），解析不出才提示
    if(/v\.douyin\.com/i.test(url)) return {type:"link", raw:url, src:"douyin"};
    if(/douyin\.com|iesdouyin/i.test(url)) return {type:"link", raw:url, src:"douyin"};
    // 视频号：无公开嵌入接口，仅这类提供新窗口打开
    if(/channels\.weixin\.qq\.com/i.test(url)) return {type:"link", raw:url, src:"channels"};
    return {type:"link", raw:url, src:"web"};
  }
  // 抖音短链解析（尽力而为）：经公共 CORS 代理取跳转目标，提取视频 id
  async function resolveDouyinShort(raw){
    const targets = [
      "https://api.allorigins.win/get?url=" + encodeURIComponent(raw),
      "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(raw)
    ];
    for(const t of targets){
      try{
        const r = await fetch(t);
        const txt = await r.text();
        let blob = txt;
        try{ const j=JSON.parse(txt); blob = ((j.contents||"") + " " + ((j.status&&j.status.url)||"")); }catch(e){}
        const m = blob.match(/douyin\.com\/(?:video|note)\/(\d+)/) || blob.match(/iesdouyin\.com\/[^"'\s]*\/(?:video|note)\/(\d+)/);
        if(m) return "https://www.douyin.com/video/" + m[1];
      }catch(e){}
    }
    return null;
  }
  function playerHTML(v){
    if(!v) return `<div class="modal-video-link"><div class="big">🎬</div><p>视频链接无法识别</p></div>`;
    if(v.type==="iframe") return `<div class="modal-video ${v.src==="douyin"?"portrait":""}"><iframe src="${esc(v.url)}" allowfullscreen="true" frameborder="0" scrolling="no"></iframe></div>`;
    if(v.type==="file")   return `<div class="modal-video"><video src="${esc(v.url)}" controls playsinline preload="metadata"></video></div>`;
    return `<div class="modal-video modal-video-link">
      <div class="big">🎬</div>
      <p>${esc(VIDEO_SRC_NAMES[v.src]||"外部")}视频暂不支持站内播放</p>
      <a class="btn primary" href="${esc(v.raw)}" target="_blank" rel="noopener">▶ 在新窗口打开</a>
    </div>`;
  }

  /* ---------- 视图路由 ---------- */
  let view = {name:"home", param:null};
  function go(name, param){ view={name, param:param||null}; render(); window.scrollTo({top:0}); }
  function setNav(name){
    document.querySelectorAll("#mainNav .nav-btn").forEach(b=>{
      b.classList.toggle("active", b.dataset.view===name || (name==="tag"&&b.dataset.view==="home") || (name==="search"&&b.dataset.view==="home") || (name==="admin"&&b.dataset.view==="admin"));
    });
  }

  /* ---------- 卡片模板 ---------- */
  function cardHTML(it, extraMeta){
    const learned = state.learned[it.key];
    const vids = itemVideos(it);
    return `<button class="card" data-key="${esc(it.key)}">
      ${learned?`<span class="learned-flag">✓ 已会</span>`:""}
      <div class="c-meta">${badge(it.type)}
        ${it.grade?`<span>#${esc(it.grade)}</span>`:""}
        ${it.volume?`<span>#${esc(it.volume)}</span>`:""}
        ${it.unit?`<span>#${esc(it.unit)}</span>`:""}
        ${extraMeta||""}
        ${vids.length?`<span class="play">▶ ${it.type==="成语动画廊"?"动画":"视频"}</span>`:""}
      </div>
      <h4>${esc(it.title)}</h4>
      ${it.sub?`<div class="c-sub">${esc(it.sub)}</div>`:""}
      <p class="c-body">${esc(it.body)}</p>
      ${it.tags&&it.tags.length?`<div class="c-tags">${it.tags.slice(0,4).map(t=>`<span class="tag" style="cursor:default">#${esc(t)}</span>`).join("")}</div>`:""}
    </button>`;
  }

  /* ---------- 数学内容排版：分节标题 + 题卡网格对齐 ---------- */
  // 把「每日一练 / 公式 / 计算题 / 应用题 / 思维母题单题」等数学正文渲染为对齐的版式：
  // 一、二、 等节标题加粗成小标题；含「＝」的算式归并为多列网格（题卡对齐）；带编号的思维题单独成段。
  function mathBodyHTML(body){
    const lines = String(body||"").split(/\r?\n+/).map(s=>s.trim()).filter(s=>s.length);
    let html = "", grid = [];
    const flush = ()=>{ if(grid.length){ html += `<div class="mq-grid">`+grid.map(s=>`<span class="mq-item">${esc(s)}</span>`).join("")+`</div>`; grid=[]; } };
    for(const line of lines){
      const sec = line.match(/^([一二三四五六七八九十百零]+)[、.．]\s*(.+)$/);
      if(sec){ flush(); html += `<div class="mq-sec">${esc(sec[1])}、${esc(sec[2])}</div>`; continue; }
      const num = line.match(/^(\d+)[．.、)]\s*(.+)$/);
      if(num){ flush(); html += `<div class="mq-num"><b>${esc(num[1])}．</b>${esc(num[2])}</div>`; continue; }
      // 算式行（含「＝/ =」且不含句末标点）：归入对齐网格
      if(/[＝=]/.test(line) && !/[。！？]$/.test(line)){ grid.push(line); continue; }
      flush(); html += `<p class="mq-line">${esc(line)}</p>`;
    }
    flush();
    return html;
  }

  /* ---------- 首页：今日学习 ---------- */
  // 今日任务：按栏目分组；受「打卡范围」开关控制（state.checkin，默认全开）
  // 某个「学科·类型」的内容池（内置主数据 + 后台自定义）
  function poolFor(subject, type){
    const cus = CUSTOM.filter(c=>c.subject===subject && c.type===type);
    if(subject==="语文" && type==="诗词")  return [...POEMS, ...cus];
    if(subject==="语文" && type==="成语")  return [...IDIOMS, ...cus];
    if(subject==="语文" && type==="文言")  return [...WENYAN, ...cus];
    if(subject==="语文" && type==="成语动画廊") return [...GALLERY, ...cus];
    if(subject==="英语" && type==="单词")  return [...WORDS, ...cus];
    return [...cus, ...EXTRA.filter(c=>c.subject===subject && c.type===type)]; // 其余类型：后台自定义 + 内置教材素材
  }
  /* ---------- 首页：今日学习 ---------- */
  // 今日任务：只包含今天（按周计划）排到的「学科·类型」，每类型按配额取条目（控制每日总量）
  function todayTasks(){
    const seed = dateSeed();
    const day = new Date().getDay();
    const plan = weekPlan();
    const tasks = {}; // key=学科·类型 → 今日条目数组
    (plan[day]||[]).forEach(({subject,type})=>{
      const key = checkinKey(subject,type);
      // 数学思维母题：一题一卡，按天从「均匀打散序列」轮转取 5 题（一次打卡=5 道题）
      if(type==="思维母题"){
        const mq = motherOrdered();
        const off = (Math.max(0, dayDiff(state.semesterStart)) * 5) % Math.max(1, mq.length);
        const arr=[]; for(let i=0;i<5 && i<mq.length;i++) arr.push(mq[(off+i)%mq.length]);
        tasks[key]=arr;
        return;
      }
      let pool = poolFor(subject,type);
      // 英语单词：优先四年级上册示例（含后台四年级单词），不足再放宽
      if(subject==="英语" && type==="单词"){
        let wp = [...WORDS.filter(w=>w.grade==="四年级"&&w.volume==="上册"), ...CUSTOM.filter(c=>c.type==="单词"&&c.grade==="四年级"&&c.volume==="上册")];
        if(wp.length<5) wp=[...WORDS.filter(w=>w.grade==="四年级"), ...CUSTOM.filter(c=>c.type==="单词"&&c.grade==="四年级")];
        if(wp.length<5) wp=[...WORDS, ...CUSTOM.filter(c=>c.type==="单词")];
        pool=wp;
      }
      let arr;
      if(type==="诗词")      arr = pool.length ? [pool[seed % pool.length]] : [];
      else if(type==="成语") arr = pick(pool, 2, seed+7);
      else if(type==="单词") arr = pick(pool, 5, seed+13);
      else                   arr = pick(pool, typeQuota(type), seed + type.length*3 + subject.length);
      tasks[key] = arr;
    });
    return tasks;
  }
  /* ---------- 首页：今日学习 + 看板 ---------- */
  function renderHome(){
    const el = $("#view-home");
    const d = new Date();
    const todayStr = fmt(d);
    const tg = todayTasks();
    const reviews = dueReviews();
    const habits = state.habits || [];
    const habitDoneCnt = habits.filter(habitDone).length;
    const reviewDoneCnt = reviews.filter(r=>{ const t=fmt(new Date()); return !!(state.reviewed[t]&&state.reviewed[t][r.key]); }).length;
    const allTasks = Object.keys(tg).reduce((acc,k)=>acc.concat(tg[k]||[]), []);
    const studyDone = allTasks.filter(t=>state.learned[t.key]).length;
    const done = studyDone + habitDoneCnt + reviewDoneCnt;
    const total = allTasks.length + habits.length + reviews.length;
    const pct = total ? Math.round(done/total*100) : 0;
    // 学期进度（90 天）
    const semDay = Math.max(1, dayDiff(state.semesterStart)+1);
    const semWeek = Math.ceil(semDay/7);
    const todayDow = d.getDay();

    // 看板数据
    const learnedList = Object.keys(state.learned).map(k=>INDEX[k]).filter(Boolean);
    const todayList = learnedList.filter(it=>state.learned[it.key]===todayStr);
    const weekList = learnedList.filter(it=>dayDiff(state.learned[it.key])<7);
    const subjCount=(list,s)=>list.filter(it=>it.subject===s).length;
    const SUBJ=["语文","数学","英语","科学","人文"];
    const weekDays=[];
    for(let i=6;i>=0;i--){ const dd=new Date(); dd.setDate(dd.getDate()-i); const ds=fmt(dd); weekDays.push({ds, c:learnedList.filter(it=>state.learned[it.key]===ds).length}); }
    const wkDates = weekDatesMondayStart();

    // 热门标签（诗词标签词频 Top）
    const freq = {};
    POEMS.forEach(p=>(p.tags||[]).forEach(t=>freq[t]=(freq[t]||0)+1));
    const hot = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x[0]);

    // 按今天的周计划分组渲染（一天只安排计划内的类型，主课多、副课少）
    const dayPlan = weekPlan()[todayDow] || [];
    const bySub = {};
    dayPlan.forEach(s=>{ (bySub[s.subject]=bySub[s.subject]||[]).push(s.type); });
    const order=["语文","数学","英语","科学","人文"];
    const taskBlocks = order.map(sub=>{
      const types = bySub[sub] || [];
      const blocks = types.map(t=>{
        const list = tg[checkinKey(sub,t)]||[];
        if(!list.length) return "";
        return `<div class="sec-title">${sub} · ${t} <small>${list.length} 项</small></div>
          <div class="task-grid">${list.map(x=>cardHTML(x)).join("")}</div>`;
      }).join("");
      return blocks;
    }).join("");
    if(!taskBlocks) taskBlocks = `<div class="placeholder" style="padding:20px 16px">当前未勾选任何打卡内容，点击下方「打卡范围」选择。</div>`;

    const last = state.lastKey ? INDEX[state.lastKey] : null;
    const learnedCount = Object.keys(state.learned).length;
    const favCount = Object.keys(state.fav).length;

    el.innerHTML = `
      <div class="hero">
        <div>
          <h2>今日学习</h2>
          <p>${d.getMonth()+1} 月 ${d.getDate()} 日 星期${WEEK[d.getDay()]} · ${esc(state.grade)} · 学期第 ${semDay} 天 / ${SEMESTER_DAYS}（第 ${semWeek} 周） · 共 ${total} 项任务</p>
        </div>
        <div class="done" style="min-width:180px;">
          已完成 ${done} / ${total}
          <div class="pbar"><div class="pfill" style="width:${pct}%"></div></div>
        </div>
      </div>

      <div class="sec-title">⏰ 今日习惯 <small>${habitDoneCnt}/${habits.length} · 点击勾选，每天养成一点点</small></div>
      <div class="habit-list">
        ${habits.map(h=>`<div class="habit ${habitDone(h)?"on":""}" data-habit="${esc(h)}"><span class="hk">${habitDone(h)?"✓":"○"}</span><span class="hn">${esc(h)}</span><button class="hx" data-habit-del="${esc(h)}" title="删除该习惯">✕</button></div>`).join("")}
        <span style="flex:1"></span>
        <input id="habitNew" class="search-input" style="width:150px" placeholder="添加习惯…" />
        <button class="chip" data-habit-add>＋ 添加</button>
      </div>

      <div class="sec-title">✅ 习惯周跟踪 <small>本周（周一~周日）完成打卡情况 · 在上方勾选每日习惯</small></div>
      ${habits.length?`<div class="habit-dash">
        <div class="hd-head">
          <div class="hd-name">习惯</div>
          <div class="hd-grid">${WEEK_MON.map((d,i)=>`<div class="hd-dow ${wkDates[i]===todayStr?"today":""}">周${d}</div>`).join("")}</div>
          <div class="hd-rate">本周完成率</div>
        </div>
        ${habits.map(h=>{
          const ds=weekDatesMondayStart();
          const cells=ds.map(d=>{ const done=!!(state.habitLog[d]&&state.habitLog[d][h]); return `<div class="hd-cell ${done?"on":""}">${done?"✓":""}</div>`; }).join("");
          const doneCnt=ds.filter(d=>!!(state.habitLog[d]&&state.habitLog[d][h])).length;
          const rate=Math.round(doneCnt/7*100);
          return `<div class="hd-row">
            <div class="hd-name" title="${esc(h)}">${esc(h)}</div>
            <div class="hd-grid">${cells}</div>
            <div class="hd-rate ${rate>=70?"good":rate>=40?"mid":"low"}">${rate}%</div>
          </div>`;
        }).join("")}
      </div>`
      :`<div class="placeholder" style="padding:14px 16px">还没有任何习惯，在上方输入框添加「房间卫生 / 早睡早起 / 学校作业」等，即可开始每日打卡与周跟踪。</div>`}

      <div class="stat-strip">
        <div class="stat"><div class="num">${POEMS.length + CUSTOM.filter(c=>c.type==="诗词").length}</div><div class="lbl">诗词</div></div>
        <div class="stat"><div class="num">${IDIOMS.length + CUSTOM.filter(c=>c.type==="成语").length}</div><div class="lbl">成语</div></div>
        <div class="stat"><div class="num">${WORDS.length + CUSTOM.filter(c=>c.type==="单词").length}</div><div class="lbl">单词</div></div>
        <div class="stat"><div class="num">${GALLERY.length + CUSTOM.filter(c=>c.type==="成语动画廊").length}</div><div class="lbl">动画</div></div>
        <div class="stat"><div class="num">${CUSTOM.length}</div><div class="lbl">后台素材</div></div>
        <div class="stat"><div class="num">${learnedCount}</div><div class="lbl">已学会</div></div>
        <div class="stat"><div class="num">${favCount}</div><div class="lbl">收藏</div></div>
      </div>

      <div class="sec-title">📊 学习看板 <small>内容打卡概览（今日 / 本周）</small></div>
      <div class="dash-grid">
        ${SUBJ.map(s=>`<div class="dash-card"><div class="dc-name">${s}</div>
          <div class="dc-row"><span>今日打卡</span><b>${subjCount(todayList,s)}</b></div>
          <div class="dc-row"><span>本周打卡</span><b>${subjCount(weekList,s)}</b></div></div>`).join("")}
      </div>
      ${todayList.length?`
        <div class="sec-title">✅ 今日完成 <small>已打卡 ${todayList.length} 项 · 点击复习</small></div>
        <div class="task-grid">${todayList.map(t=>cardHTML(t)).join("")}</div>`
        :`<div class="placeholder" style="padding:20px 16px">今天还没有打卡，去下方「今日任务」开始第一项吧 🚀</div>`}
      <div class="sec-title">📅 本周学习 <small>近 7 天打卡分布 · 今天高亮</small></div>
      <div class="week-bar">${weekDays.map(w=>`<div class="wk ${w.ds===todayStr?"today":""}"><div class="wk-bar" style="height:${w.c*16+4}px"></div><div class="wk-c">${w.c}</div><div class="wk-d">${w.ds===todayStr?"今天":w.ds.slice(5)}</div></div>`).join("")}</div>

      <div class="chips cn-scope">
        <span class="lbl">打卡范围：</span>
        ${CHECKIN_TYPES.map(({subject,type})=>{
          const k=checkinKey(subject,type);
          const on=checkinOn(subject,type);
          return `<button class="chip ${on?"on":""}" style="${subjectStyle(subject,on)}" data-checkin="${esc(k)}" title="${esc(subject)}·${esc(type)}">${esc(subject)}·${esc(type)}</button>`;
        }).join("")}
        <span style="flex:1"></span>
        <span class="af-tip">总开关：关闭的「学科·类型」不参与周计划安排（已存本地）</span>
      </div>

      <div class="sec-title">📌 今日任务（按周计划） <small>周${WEEK[todayDow]} · 共 ${dayPlan.length} 类 · 点击卡片开始学习</small></div>
      ${taskBlocks}

      <div class="sec-title">🔁 艾宾浩斯复习 <small>${reviews.length?`到期 ${reviews.length} 项 · 按遗忘曲线 1/2/4/7/15 天安排`:"今天没有到期复习，保持就好"}</small></div>
      ${reviews.length?`<div class="task-grid">${reviews.map(r=>cardHTML(r,`<span class="badge" style="background:#fff7ed;color:#ea580c">🔁 到期复习</span>`)).join("")}</div>`
        :`<div class="placeholder" style="padding:14px 16px">先学新内容，之后这里会自动安排复习 📈</div>`}

      <div class="sec-title">🗓 本周计划 <small>以周为单位均匀安排 · 主课多、副课少 · 周一至周日 · 今天已高亮</small></div>
      <div class="week-plan">
        ${[1,2,3,4,5,6,0].map(i=>{ const dayArr=weekPlan()[i]; return `<div class="wp-day ${i===todayDow?"today":""}">
          <div class="wp-name">${WEEK_NAMES[i]}</div>
          <div class="wp-types">${dayArr.map(s=>{
            const c=SUBJECT_COLORS[s.subject]||["#f1f5f9","#475569"];
            return `<span class="tag" style="cursor:default;background:${c[0]};color:${c[1]};border:1px solid ${c[0]}">${esc(s.subject)}·${esc(s.type)}</span>`;
          }).join("")||"—"}</div>
        </div>`; }).join("")}
      </div>

      ${last?`
      <div class="sec-title">▶ 继续学习 <small>上次打开</small></div>
      <div class="task-grid">${cardHTML(last)}</div>`:""}

      <div class="sec-title">🔥 热门标签 <small>来自 314 首诗词 · 点击直达专题</small></div>
      <div class="tagcloud">${hot.map(t=>`<button class="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}</div>
    `;
  }

  /* ---------- 学科栏目页 ---------- */
  function renderSubject(subject){
    const el = $("#view-subject");
    if(subject==="语文") return renderChinese(el);
    return renderGeneric(el, subject);
  }

  // —— 数学 / 英语 / 科学 / 人文：类型 tab 驱动，后台素材自动归类；英语单词含上下册与单元 ——
  const gnView = {};
  function renderGeneric(el, subject){
    const types = SUBJECT_TYPES[subject] || [];
    if(!gnView[subject]) gnView[subject] = {type:types[0]||"", grade:"全部", q:"", volume:"上册", unit:"全部"};
    const v = gnView[subject];
    const isEngWord = (subject==="英语" && v.type==="单词");
    let pool;
    if(isEngWord){
      pool = [...WORDS.filter(w=>w.grade===state.grade && w.volume===v.volume),
              ...CUSTOM.filter(c=>c.subject==="英语"&&c.type==="单词"&&c.grade===state.grade&&c.volume===v.volume)];
    }else{
      // 统一从 ALL 取（思维母题已拆分为单题条目；打散练习入口随后置顶）
      pool = ALL.filter(c=>c.subject===subject && c.type===v.type);
      if(subject==="数学" && v.type==="思维母题"){
        const pe = pool.filter(x=>x.key==="practice:maththought");
        pool = [...pe, ...pool.filter(x=>x.key!=="practice:maththought")];
      }
    }
    if(v.grade!=="全部" && !isEngWord) pool = pool.filter(x=>x.grade===v.grade);
    if(isEngWord && v.unit!=="全部") pool = pool.filter(w=>w.unit===v.unit);
    if(v.q){ const q=v.q.toLowerCase(); pool = pool.filter(x=>(x.title+x.sub+x.body+(x.tags||[]).join("")).toLowerCase().includes(q)); }
    const grades = [...new Set(pool.map(c=>c.grade).filter(Boolean))].sort((a,b)=>GRADES.indexOf(a)-GRADES.indexOf(b));
    const hasCustom = CUSTOM.some(c=>c.subject===subject) || EXTRA.some(c=>c.subject===subject);
    const engTotal = isEngWord ? [...WORDS, ...CUSTOM.filter(c=>c.subject==="英语"&&c.type==="单词"), ...EXTRA.filter(c=>c.subject==="英语"&&c.type==="单词")].filter(w=>w.grade===state.grade).length : null;
    const units = isEngWord ? [...new Set([...WORDS, ...CUSTOM.filter(c=>c.subject==="英语"&&c.type==="单词"), ...EXTRA.filter(c=>c.subject==="英语"&&c.type==="单词")].filter(w=>w.grade===state.grade&&w.volume===v.volume).map(w=>w.unit).filter(Boolean))].sort() : [];
    const listCnt = pool.filter(x=>x.key!=="practice:maththought").length;
    const desc = (hasCustom || isEngWord)
      ? `${subject}内容由「🛠 后台」添加的素材与内置教材自动归类到对应学科 / 类型 / 年级。`
      : `该栏目规划中。可在「🛠 后台」添加素材，系统自动归类到这里。`;
    el.innerHTML = `
      <div class="subj-head"><h2>${esc(subject)} · ${esc(v.type)}</h2><span class="cnt">${isEngWord?`${esc(state.grade)} 共 ${engTotal} 个 · 当前${esc(v.volume)} ${pool.length} 个`:(hasCustom?listCnt+" 条":"规划中")}</span></div>
      <p class="subj-desc">${desc}</p>
      <div class="chips">
        ${types.map(t=>`<button class="chip ${v.type===t?"on":""}" data-gn-type="${esc(t)}">${esc(t)}</button>`).join("")}
        ${isEngWord?`<span style="width:14px"></span><span class="lbl">年级语境：</span><span class="badge" style="background:#eef2ff;color:#1e40af">${esc(state.grade)}</span>`:""}
        ${isEngWord?`${["上册","下册"].map(vol=>`<button class="chip ${v.volume===vol?"on":""}" data-gn-volume="${esc(vol)}">${esc(vol)}</button>`).join("")}`:""}
        <span style="flex:1"></span>
        <input id="gnSearch" class="search-input" style="width:200px" placeholder="搜索…" value="${esc(v.q)}" />
      </div>
      ${(grades.length && !isEngWord)?`<div class="chips"><span class="lbl">年级：</span><button class="chip ${v.grade==="全部"?"on":""}" data-gn-grade="全部">全部</button>${grades.map(g=>`<button class="chip ${v.grade===g?"on":""}" data-gn-grade="${esc(g)}">${esc(g)}</button>`).join("")}</div>`:""}
      ${isEngWord&&units.length?`<div class="chips"><span class="lbl">单元：</span><button class="chip ${v.unit==="全部"?"on":""}" data-gn-unit="全部">全部</button>${units.map(u=>`<button class="chip ${v.unit===u?"on":""}" data-gn-unit="${esc(u)}">${esc(u)}</button>`).join("")}</div>`:""}
      ${pool.length?`<div class="task-grid">${pool.map(x=>cardHTML(x)).join("")}</div>`
        :`<div class="placeholder"><div class="big">📥</div><h3>${esc(subject)} · ${esc(v.type)} 暂无内容</h3><p>在「🛠 后台」添加该类型素材，将自动归位于此。</p></div>`}
    `;
    el._gnRefresh = function(){
      const keep = document.activeElement && document.activeElement.id==="gnSearch";
      renderGeneric(el, subject);
      if(keep){ const i=$("#gnSearch"); i.focus(); i.setSelectionRange(i.value.length,i.value.length); }
    };
  }

  // —— 语文：诗词 / 成语 / 文言 / 成语动画廊 / 作文 / 故事 / 阅读 / 课文 ——
  const CN_TYPES = ["诗词","成语","文言","成语动画廊","作文","故事","阅读","课文"];
  let cnView = {type:"诗词", grade:"全部", q:""};
  function cnPool(type){
    const cus = CUSTOM.filter(c=>c.type===type);
    if(type==="诗词") return [...POEMS, ...cus];
    if(type==="成语") return [...IDIOMS, ...cus];
    if(type==="文言") return [...WENYAN, ...cus];        // 文言文：后台添加或整年级导入后自动匹配
    if(type==="成语动画廊") return [...GALLERY, ...cus]; // 180 集 B 站成语动画 + 后台添加
    return [...cus, ...EXTRA.filter(c=>c.subject==="语文"&&c.type===type)]; // 作文 / 故事 / 阅读 / 课文：后台添加或内置教材后上线
  }
  function renderChinese(el){
    if(!cnView) cnView = {type:"诗词", grade:"全部", q:""};
    let pool = cnPool(cnView.type);
    const isIdiom   = cnView.type==="成语";
    const isGallery = cnView.type==="成语动画廊";
    // 年级筛选：成语按数据年级；诗词用全年级表（当前为通用内容，分年级诗词导入后自动生效）
    const grades = isIdiom ? IDIOM_GRADES : (cnView.type==="诗词" ? POEM_GRADE_PRESENT : []);
    if(grades.length && cnView.grade!=="全部") pool = pool.filter(x=>x.grade===cnView.grade);
    if(cnView.q){
      const q=cnView.q.toLowerCase();
      pool = pool.filter(x=>(x.title+x.sub+x.body+(x.tags||[]).join("")).toLowerCase().includes(q));
    }
    // 诗词标签云（仅诗词类型展示主题快捷筛选）
    const freq={};
    POEMS.forEach(p=>(p.tags||[]).forEach(t=>freq[t]=(freq[t]||0)+1));
    const topTags=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,18).map(x=>x[0]);

    // ① 成语动画廊：视频画廊（点击卡片在弹窗内播放 B 站动画）
    if(isGallery){
      el.innerHTML = `
        <div class="subj-head"><h2>语文 · 成语动画廊</h2><span class="cnt">${GALLERY.length} 集 · B 站动画</span></div>
        <p class="subj-desc">每集一个成语典故动画，点击卡片即可在弹窗内观看。整年级导入后可按年级匹配。</p>
        <div class="chips">
          ${CN_TYPES.map(t=>`<button class="chip ${cnView.type===t?"on":""}" data-cn-type="${t}">${t}</button>`).join("")}
          <span style="flex:1"></span>
          <input id="cnSearch" class="search-input" style="width:200px" placeholder="搜索成语动画…" value="${esc(cnView.q)}" />
        </div>
        <div class="task-grid">${pool.map(x=>cardHTML(x)).join("") || '<div class="placeholder"><div class="big">🔍</div>没有匹配的动画</div>'}</div>
      `;
      bindCnRefresh(el);
      return;
    }

    // ② 待导入类型（文言 / 作文 / 故事 / 阅读 / 课文）
    if(pool.length===0){
      el.innerHTML = `
        <div class="subj-head"><h2>语文 · ${esc(cnView.type)}</h2><span class="cnt">待导入</span></div>
        <p class="subj-desc">「${esc(cnView.type)}」是语文栏目规划的内容类型之一，入口已就绪。</p>
        <div class="chips">${CN_TYPES.map(t=>`<button class="chip ${cnView.type===t?"on":""}" data-cn-type="${t}">${t}</button>`).join("")}</div>
        <div class="placeholder">
          <div class="big">📥</div>
          <h3>${esc(cnView.type)}内容待导入</h3>
          <p>整年级的${esc(cnView.type)}内容批量导入后，系统将自动匹配年级与上下册并归入本类型。</p>
          <p>导入即可上线，结构无需改动。</p>
        </div>
      `;
      return;
    }

    // ③ 诗词 / 成语：内容列表
    const emptyHint = (cnView.type==="诗词" && cnView.grade!=="全部")
      ? `<div class="placeholder"><div class="big">📚</div>「${esc(cnView.grade)}」暂无诗词<p style="font-size:13px;margin-top:6px">已按部编版教材为可识别的诗词标注了年级；该年级暂无匹配到的诗词。</p></div>`
      : '<div class="placeholder"><div class="big">🔍</div>没有匹配的内容</div>';
    el.innerHTML = `
      <div class="subj-head"><h2>语文 · ${esc(cnView.type)}</h2><span class="cnt">${pool.length} 条</span></div>
      <p class="subj-desc">${isIdiom?"成语已按年级自动匹配。":"诗词已按部编版教材标注年级，可筛选查看对应年级的篇目。"}点击卡片查看全文与解析。</p>
      <div class="chips">
        ${CN_TYPES.map(t=>`<button class="chip ${cnView.type===t?"on":""}" data-cn-type="${t}">${t}</button>`).join("")}
        <span style="flex:1"></span>
        <input id="cnSearch" class="search-input" style="width:200px" placeholder="在语文内搜索…" value="${esc(cnView.q)}" />
      </div>
      ${grades.length?`
      <div class="chips"><span class="lbl">年级：</span>
        <button class="chip ${cnView.grade==="全部"?"on":""}" data-cn-grade="全部">全部</button>
        ${grades.map(g=>`<button class="chip ${cnView.grade===g?"on":""}" data-cn-grade="${esc(g)}">${esc(g)}</button>`).join("")}
      </div>`:""}
      ${cnView.type==="诗词"?`
      <div class="chips"><span class="lbl">热门主题：</span>
        ${topTags.map(t=>`<button class="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}
      </div>`:""}
      <div class="task-grid">${pool.map(x=>cardHTML(x)).join("") || emptyHint}</div>
    `;
    bindCnRefresh(el);
  }
  function bindCnRefresh(el){ // 仅重渲染列表，保持搜索输入焦点
    function refreshList(){
      const keep = document.activeElement && document.activeElement.id==="cnSearch";
      renderChinese($("#view-subject"));
      if(keep){ const inp=$("#cnSearch"); inp.focus(); inp.setSelectionRange(inp.value.length,inp.value.length); }
    }
    el._refreshList = refreshList;
  }

  // —— 英语 / 数学 / 科学 / 人文 等栏目由 renderGeneric 统一渲染（见上方） ——

  /* ---------- 标签专题页 ---------- */
  function renderTag(tag){
    const el = $("#view-tag");
    const items = ALL.filter(it=>it.tags && it.tags.includes(tag));
    el.innerHTML = `
      <div class="subj-head"><h2>#${esc(tag)}</h2><span class="cnt">${items.length} 条内容</span></div>
      <p class="subj-desc">由标签「#${esc(tag)}」自动聚合的专题页 —— 跨学科、跨年级、跨上下册。</p>
      <div class="task-grid">${items.map(x=>cardHTML(x)).join("") || '<div class="placeholder">该标签暂无内容</div>'}</div>
    `;
  }

  /* ---------- 搜索页 ---------- */
  function renderSearch(q){
    const el = $("#view-search");
    let items=[];
    if(q){
      const s=q.toLowerCase();
      items = ALL.filter(it=>(it.title+" "+it.sub+" "+it.body+" "+(it.tags||[]).join(" ")).toLowerCase().includes(s));
    }
    el.innerHTML = `
      <div class="subj-head"><h2>搜索</h2><span class="cnt">${q?`“${esc(q)}” · ${items.length} 条结果`:"输入关键词，全文检索标题 / 正文 / 标签"}</span></div>
      <div class="task-grid">${items.map(x=>cardHTML(x)).join("")}</div>
    `;
  }

  /* ---------- 详情弹窗 ---------- */
  let modalKey=null, modalVid=0, modalAdmin=false, modalEdit=false;
  function openModal(it, vidIdx){
    // 「打散练习」入口：全题均匀交错弹窗；拆分后的单题(mtq:)按普通文章渲染并附答案提示按钮
    if(it.key==="practice:maththought"){ renderPracticeModal(it); return; }
    if(modalKey!==it.key){ modalKey=it.key; modalVid=0; modalAdmin=false; modalEdit=false; }
    if(typeof vidIdx==="number") modalVid=vidIdx;
    // 「编辑内容」模式：以表单替代正文展示
    if(modalEdit){ renderEditForm(it); return; }
    const learned = !!state.learned[it.key];
    const fav = !!state.fav[it.key];
    const isWord = it.subject==="英语";
    const vids = itemVideos(it);
    const userVids = (state.videos[it.key]||[]);
    const cur = parseVideoUrl(vids[modalVid]||vids[0]);
    // 视频区：多视频时用 chips 切换
    const videoHTML = vids.length ? `
      ${vids.length>1?`<div class="chips" style="margin:0 0 8px">${vids.map((u,i)=>`<button class="chip ${i===modalVid?"on":""}" data-vid="${i}">视频 ${i+1}</button>`).join("")}</div>`:""}
      ${playerHTML(cur)}` : "";
    const OVSET = new Set(Object.keys(state.overrides||{}));
    const bodyHTML = isWord
      ? `<p class="m-body word-text">${esc(it.title)}<span class="phon">${esc(it.sub)}</span><span class="cn">${esc(it.body)}</span></p>`
      : (it.body ? (it.subject==="数学"
          ? `<div class="m-math">${mathBodyHTML(it.body)}</div>`
          : `<p class="m-body">${esc(it.body).replace(/\n/g,"<br>").replace(/([。？！；])/g,"$1<br>")}</p>`)
        : "");
    $("#modal-body").innerHTML = `
      <div class="m-type">${badge(it.type)}
        ${it.grade?`<span class="tag" style="cursor:default">#${esc(it.grade)}</span>`:""}
        ${it.volume?`<span class="tag" style="cursor:default">#${esc(it.volume)}</span>`:""}
        ${it.unit?`<span class="tag" style="cursor:default">#${esc(it.unit)}</span>`:""}
        ${it.form?`<span class="badge" style="background:#f1f5f9;color:#475569">${esc(it.form)}</span>`:""}
      </div>
      <h3 class="m-title">${esc(it.title)}</h3>
      ${it.sub&&!isWord?`<div class="m-sub">${esc(it.sub)}</div>`:""}
      ${videoHTML}
      ${bodyHTML}
      ${it.tags&&it.tags.length?`<div class="m-tags">${it.tags.map(t=>`<button class="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}</div>`:""}
      ${it.key.indexOf("mtq:")===0?`<div class="pq-a" id="mtHint" hidden>${esc(it.a&&it.a.length?it.a:motherHint(it.sub))}</div>`:""}
      <div class="m-actions">
        ${it.key.indexOf("mtq:")===0?`<button class="btn pa" data-act="hint">💡 答案提示</button>`:""}
        ${dueReview(it.key)?`<button class="btn primary" data-act="review">🔁 完成复习（艾宾浩斯）</button>`:""}
        <button class="btn ${learned?"done":"primary"}" data-act="learn">${learned?"✓ 已学会（点击取消）":"标记为学会 📅"}</button>
        <button class="btn" data-act="fav">${fav?"★ 已收藏":"☆ 收藏"}</button>
        <button class="btn" data-act="speak">🔊 朗读</button>
        <button class="btn" data-act="addvideo">🎬 ${vids.length?"管理视频":"添加视频"}</button>
        ${it.key.indexOf("mtq:")===0?"":`<button class="btn" data-act="edit">✏️ 编辑内容</button>`}
        ${OVSET.has(it.key)?`<button class="btn" data-act="revert">⤺ 还原内置</button>`:""}
      </div>
      <div id="videoAdmin" ${modalAdmin?"":"hidden"}>
        ${vids.length?`<div class="va-list">${vids.map(u=>{
          const p=parseVideoUrl(u);
          const isUser=userVids.includes(u);
          return `<div class="va-item"><span class="va-src">${esc(VIDEO_SRC_NAMES[p&&p.src]||"视频")}</span><span class="va-url" title="${esc(u)}">${esc(u)}</span>${isUser?`<button class="va-del" data-del-url="${esc(u)}" title="删除该视频">✕</button>`:""}</div>`;
        }).join("")}</div>`:""}
        <div class="va-add">
          <input id="vidUrl" class="search-input" style="flex:1;min-width:180px" placeholder="粘贴视频链接或本地路径（videos/xxx.mp4）" />
          <button class="btn primary" data-act="savevideo">保存视频</button>
        </div>
        <p class="va-tip">自动解析并站内播放：B站视频页/播放器链接、抖音视频页（douyin.com/video/…，短链会自动尝试解析）、腾讯视频、YouTube、本地视频文件（可放入 site/videos/ 后填相对路径）；仅视频号等个别平台需新窗口打开。同一内容可挂多个视频。</p>
      </div>
    `;
    $("#modal").hidden=false;
    document.body.style.overflow="hidden";
    state.lastKey = it.key; save();

    $("#modal-body").querySelectorAll("[data-act]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const act=btn.dataset.act;
        if(act==="hint"){
          const el=$("#mtHint");
          if(el){ el.hidden=!el.hidden; btn.textContent = el.hidden ? "💡 答案提示" : "🙈 收起提示"; }
          return; // 不重渲染，保持提示展开状态
        }else if(act==="review"){
          const t=fmt(new Date());
          state.reviewed[t]=state.reviewed[t]||{};
          if(state.reviewed[t][it.key]){ delete state.reviewed[t][it.key]; toast("已取消复习打卡"); }
          else { state.reviewed[t][it.key]=true; toast("复习完成 🔁 按遗忘曲线继续加油！"); }
          save(); openModal(it); refreshIfVisible(); return;
        }else if(act==="learn"){
          if(state.learned[it.key]){
            delete state.learned[it.key];
            const t=fmt(new Date());
            if(state.reviewed[t]) delete state.reviewed[t][it.key];
            toast("已取消学会标记");
          }
          else { state.learned[it.key]=fmt(new Date()); toast("已标记为学会，明天将按遗忘曲线安排复习 🔁"); }
        }else if(act==="fav"){
          if(state.fav[it.key]){ delete state.fav[it.key]; toast("已取消收藏"); }
          else { state.fav[it.key]=true; toast("已收藏 ⭐"); }
        }else if(act==="speak"){
          speak(isWord? it.title : it.title+"。"+it.body, isWord?"en-US":"zh-CN");
        }else if(act==="addvideo"){
          modalAdmin=!modalAdmin; openModal(it);
        }else if(act==="savevideo"){
          const inp=$("#vidUrl"); const val=((inp&&inp.value)||"").trim();
          if(!val){ toast("请先粘贴视频链接"); return; }
          const pushAndRefresh=(u)=>{ (state.videos[it.key]=state.videos[it.key]||[]).push(u); modalAdmin=true; save(); toast("视频已添加 🎬"); openModal(it); refreshIfVisible(); };
          if(/v\.douyin\.com/i.test(val)){
            toast("抖音短链解析中…");
            resolveDouyinShort(val).then(full=>{ if(!full) toast("短链未解析成功，已按原链接保存"); pushAndRefresh(full||val); });
          }else pushAndRefresh(val);
          return;
        }else if(act==="edit"){
          modalEdit=true; openModal(it); return;
        }else if(act==="revert"){
          if(state.overrides && state.overrides[it.key]){ delete state.overrides[it.key]; save(); rebuildAll(); toast("已还原内置内容 ⤺"); openModal(it); refreshIfVisible(); }
          return;
        }
        save(); openModal(it); refreshIfVisible();
      });
    });
    // 多视频切换
    $("#modal-body").querySelectorAll("[data-vid]").forEach(b=>{
      b.addEventListener("click", ()=>openModal(it, parseInt(b.dataset.vid,10)));
    });
    // 删除用户添加的视频
    $("#modal-body").querySelectorAll("[data-del-url]").forEach(b=>{
      b.addEventListener("click", ()=>{
        state.videos[it.key]=(state.videos[it.key]||[]).filter(u=>u!==b.dataset.delUrl);
        if(!state.videos[it.key].length) delete state.videos[it.key];
        save(); toast("已删除该视频"); openModal(it); refreshIfVisible();
      });
    });
    $("#modal-body").querySelectorAll(".tag[data-tag]").forEach(b=>{
      b.addEventListener("click", ()=>{ closeModal(); go("tag", b.dataset.tag); });
    });
  }
  // 编辑内容表单：内置条目走「覆盖版本」(state.overrides)，自定义条目直接改 state.custom
  function renderEditForm(it){
    const isExtra = it.key.indexOf("extra:")===0;
    const ov = (state.overrides||{})[it.key];
    const cur = isExtra ? (ov || {title:it.title, sub:it.sub, grade:it.grade, body:it.body}) : it;
    const cg = cur.grade || "";
    const grades = GRADES.map(g=>`<option ${g===cg?"selected":""}>${g}</option>`).join("");
    $("#modal-body").innerHTML = `
      <div class="m-type">${badge(it.type)} <span class="badge" style="background:#fef3c7;color:#b45309">✏️ 编辑</span></div>
      <h3 class="m-title">编辑内容${isExtra?"（覆盖内置教材）":""}</h3>
      <div class="edit-form">
        <label class="ef-row">标题<input id="efTitle" value="${esc(cur.title||"")}" /></label>
        <label class="ef-row">副标题 / 来源<input id="efSub" value="${esc(cur.sub||"")}" /></label>
        <label class="ef-row">年级<select id="efGrade"><option ${cg===""?"selected":""}>—</option>${grades}</select></label>
        <label class="ef-block">正文 / 题目<textarea id="efBody" rows="12" placeholder="题目、公式或课文内容…">${esc(cur.body||"")}</textarea></label>
        <p class="af-tip">${isExtra?"这是内置教材的「覆盖版本」，仅保存在本机浏览器；可随时点弹窗里的「⤺ 还原内置」或后台「✏️ 已修改的内置内容」恢复原文。":"这是后台自定义内容，修改将直接保存本机（也可在后台删除后重加）。"}</p>
        <div class="af-actions">
          <button class="btn primary" data-act="saveedit">💾 保存修改</button>
          <button class="btn" data-act="canceledit">取消</button>
        </div>
      </div>`;
    $("#modal").hidden=false; document.body.style.overflow="hidden";
    $("#modal-body").querySelectorAll("[data-act]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const act=btn.dataset.act;
        if(act==="canceledit"){ modalEdit=false; openModal(it); return; }
        if(act==="saveedit"){
          const title=$("#efTitle").value.trim();
          if(!title){ toast("请填写标题"); return; }
          const data={ title, sub:$("#efSub").value.trim(), grade:($("#efGrade").value==="—"?"":$("#efGrade").value), body:$("#efBody").value };
          if(isExtra){
            state.overrides=state.overrides||{}; state.overrides[it.key]=data;
          }else{
            const c=state.custom.find(x=>x.key===it.key);
            if(c){ c.title=data.title; c.sub=data.sub; c.grade=data.grade; c.body=data.body; }
          }
          save(); rebuildAll(); modalEdit=false; toast("已保存修改 ✅"); openModal(it); refreshIfVisible();
          return;
        }
      });
    });
  }
  // 思维母题练习模式：全部题目一次性列出（跨母题均匀交错打散），每题带「答案提示」按钮
  function renderPracticeModal(it){
    modalKey = it.key;
    const all = practiceQuestions();
    const total = all.length;
    const topics = new Set(all.map(x=>x.src)).size;
    const body = $("#modal-body");
    body.innerHTML = `
      <div class="m-type">${badge("思维母题")}
        <span class="badge" style="background:#fff7ed;color:#ea580c">🧠 练习模式</span>
        <span class="badge" style="background:#eef2ff;color:#4f46e5">共 ${total} 题 · 均匀打散自 ${topics} 个专题</span>
      </div>
      <h3 class="m-title">数学思维母题 · 每日打散练习</h3>
      <p class="m-sub">题目来自${topics}大重点思维母题，已按天确定性打乱并跨专题均匀交错分布；每题配「💡 答案提示」按钮，先自己思考再对照提示。</p>
      <div class="practice-list">
        ${all.map((x,i)=>`<div class="pq">
          <div class="pq-q"><span class="pq-no">${i+1}</span><span class="pq-text">${esc(x.q)}</span></div>
          <button class="btn pa" data-ans="${i}">💡 答案提示</button>
          <div class="pq-a" id="ans-${i}" hidden>${esc(x.a && x.a.length ? x.a : motherHint(x.src))}</div>
          <div class="pq-src">📚 ${esc(x.src||"")}</div>
        </div>`).join("")}
      </div>
      <div class="m-actions">
        <button class="btn" data-act="fav">${state.fav[it.key]?"★ 已收藏":"☆ 收藏该母题"}</button>
      </div>
    `;
    $("#modal").hidden=false;
    document.body.style.overflow="hidden";
    // 显示 / 隐藏答案提示（每题都有：自带答案优先，否则给专题解题思路）
    body.querySelectorAll("[data-ans]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const el=document.getElementById("ans-"+b.dataset.ans);
        if(!el) return;
        el.hidden=!el.hidden;
        b.textContent = el.hidden ? "💡 答案提示" : "🙈 收起提示";
      });
    });
    // 收藏
    const fav=body.querySelector('[data-act="fav"]');
    if(fav) fav.addEventListener("click", ()=>{
      if(state.fav[it.key]) delete state.fav[it.key]; else state.fav[it.key]=true;
      save(); renderPracticeModal(it);
    });
  }
  function closeModal(){ $("#modal").hidden=true; document.body.style.overflow=""; }
  function refreshIfVisible(){
    if(view.name==="home") renderHome();
    else if(view.name==="subject") renderSubject(view.param);
    else if(view.name==="tag") renderTag(view.param);
  }

  /* ---------- 内容后台（添加素材 · 自动归类筛选） ---------- */
  function renderAdmin(){
    const el = $("#view-admin");
    const subjects = Object.keys(SUBJECT_TYPES);
    el.innerHTML = `
      <div class="subj-head"><h2>🛠 内容后台</h2><span class="cnt">添加素材，系统自动归类到 学科 / 类型 / 年级</span></div>
      <p class="subj-desc">填写下表即可新增一条素材；系统会按你选择的「学科 + 类型 + 年级 + 册」自动归入对应栏目与筛选，并在首页、标签、搜索中同步出现。已添加的内容保存在本机浏览器（localStorage）。</p>
      <div class="admin-form">
        <div class="af-row">
          <label>学科<select id="afSubject">${subjects.map(s=>`<option>${s}</option>`).join("")}</select></label>
          <label>类型<select id="afType"></select></label>
          <label>年级<select id="afGrade"><option>—</option>${GRADES.map(g=>`<option>${g}</option>`).join("")}</select></label>
          <label>册<select id="afVolume"><option>—</option><option>上册</option><option>下册</option></select></label>
          <label>单元<input id="afUnit" placeholder="如 Unit 1（可空）"/></label>
        </div>
        <div class="af-row">
          <label class="af-grow">标题<input id="afTitle" placeholder="如 春夜喜雨"/></label>
          <label>作者 / 朝代<input id="afSub" placeholder="如 杜甫 · 唐（可空）"/></label>
        </div>
        <label class="af-block">正文 / 内容<textarea id="afBody" rows="3" placeholder="诗词正文、成语解释、题目或课文内容…"></textarea></label>
        <div class="af-row">
          <label class="af-grow">标签（逗号分隔）<input id="afTags" placeholder="如 春天,写景,励志"/></label>
          <label class="af-grow">视频链接（逗号 / 换行分隔，可空）<input id="afVideos" placeholder="B站 / 腾讯 / YouTube / 本地 videos/xxx.mp4"/></label>
        </div>
        <div class="af-actions">
          <button class="btn primary" id="afSubmit">＋ 添加素材</button>
          <button class="btn" id="afClear">清空表单</button>
          <span class="af-tip">提示：年级留「—」且类型为诗词时，系统会按诗题自动匹配部编版年级。</span>
        </div>
      </div>

      <div class="sec-title">📥 批量导入（粘贴 JSON）<small>支持整年级内容的数组，自动归类</small></div>
      <textarea id="afBulk" class="af-block" rows="4" placeholder='粘贴 JSON 数组，例如 [{"subject":"语文","type":"文言","grade":"四年级","title":"xx","body":"..."}]'></textarea>
      <div class="af-actions"><button class="btn primary" id="afBulkBtn">批量导入</button><span class="af-tip">也可直接粘贴原始 data.json 结构（含 poems / idioms / words 字段）一次性导入。</span></div>

      <div class="sec-title">🗂 已添加素材（${CUSTOM.length}）<small>本地保存，可删除</small></div>
      <div class="admin-list">
        ${CUSTOM.length? CUSTOM.slice().reverse().map(it=>`
          <div class="admin-item">
            <div class="ai-main"><b>${esc(it.title)}</b> <span class="badge" style="background:#eef2ff;color:#3730a3">${esc(it.type)}</span> ${it.grade?`<span class="tag" style="cursor:default">#${esc(it.grade)}</span>`:""}${it.volume?`<span class="tag" style="cursor:default">#${esc(it.volume)}</span>`:""}${it.videos&&it.videos.length?` <span class="play">▶ ${it.videos.length}视频</span>`:""}</div>
            <button class="va-del" data-del-custom="${esc(it.key)}" title="删除">✕</button>
          </div>`).join("")
        : '<div class="placeholder"><div class="big">📭</div>还没有在后台添加的素材</div>'}
      </div>

      <div class="sec-title">✏️ 已修改的内置内容（${Object.keys(state.overrides||{}).length}）<small>覆盖内置教材，可一键还原</small></div>
      <div class="admin-list">
        ${(Object.keys(state.overrides||{}).length)? Object.keys(state.overrides).map(k=>{
          const o=state.overrides[k]; const base=EXTRA.find(e=>e.key===k)||{};
          return `<div class="admin-item">
            <div class="ai-main"><b>${esc(o.title||base.title||k)}</b> <span class="badge" style="background:#fef3c7;color:#b45309">覆盖·${esc(o.type||base.type||"")}</span> ${o.grade?`<span class="tag" style="cursor:default">#${esc(o.grade)}</span>`:""}</div>
            <button class="va-del" data-revert-custom="${esc(k)}" title="还原内置">⤺</button>
          </div>`;
        }).join("")
        : '<div class="placeholder"><div class="big">📝</div>还没有修改过内置内容；在任意内置条目弹窗点「✏️ 编辑内容」即可覆盖</div>'}
      </div>
    `;
    // 类型联动
    const subSel=$("#afSubject"), typeSel=$("#afType");
    function fillTypes(){ const t=SUBJECT_TYPES[subSel.value]||[]; typeSel.innerHTML=t.map(x=>`<option>${x}</option>`).join(""); }
    fillTypes(); subSel.onchange=fillTypes;
    // 添加
    $("#afSubmit").onclick=()=>{
      const title=$("#afTitle").value.trim();
      if(!title){ toast("请填写标题"); return; }
      const item=makeCustomItem({
        subject:subSel.value, type:typeSel.value,
        grade:$("#afGrade").value, volume:$("#afVolume").value,
        unit:$("#afUnit").value.trim(), title, sub:$("#afSub").value.trim(),
        body:$("#afBody").value.trim(), tags:$("#afTags").value, videos:$("#afVideos").value
      });
      state.custom.push(item); save(); rebuildAll(); cnView=null; gnView[subSel.value]=gnView[subSel.value]||{};
      toast("已添加并自动归类 🎉"); renderAdmin();
      if(view.name==="home") renderHome(); else if(view.name==="subject") renderSubject(view.param);
    };
    $("#afClear").onclick=()=>{ ["afTitle","afSub","afBody","afTags","afVideos","afUnit"].forEach(i=>$("#"+i).value=""); };
    // 批量导入
    $("#afBulkBtn").onclick=()=>{
      const raw=$("#afBulk").value.trim(); if(!raw){ toast("请粘贴 JSON"); return; }
      let data; try{ data=JSON.parse(raw); }catch(e){ toast("JSON 解析失败，请检查格式"); return; }
      let added=0;
      if(Array.isArray(data)){
        data.forEach(o=>{ if(o && (o.title||o.text||o.word)){ state.custom.push(makeCustomItem(o)); added++; } });
      }else if(data.poems||data.idioms||data.words){
        (data.poems||[]).forEach(p=>state.custom.push(makeCustomItem({subject:"语文",type:"诗词",title:p.title,sub:((p.dynasty?p.dynasty+" · ":"")+(p.author||"")),body:p.content,grade:matchPoemGrade(p.title),tags:(p.tags||[]).join(",")})));
        (data.idioms||[]).forEach(g=>state.custom.push(makeCustomItem({subject:"语文",type:"成语",title:g.word,body:g.explanation,grade:g.grade})));
        (data.words||[]).forEach(w=>{ const m=(w.grade||"").match(/^(.+?)(上册|下册)$/); state.custom.push(makeCustomItem({subject:"英语",type:"单词",title:w.text,sub:w.phonetic,body:w.cn,grade:m?m[1]:"",volume:m?m[2]:"",unit:w.unit})); });
        added=(data.poems?.length||0)+(data.idioms?.length||0)+(data.words?.length||0);
      }else{ toast("不支持的 JSON 结构"); return; }
      if(!added){ toast("没有可导入的条目"); return; }
      save(); rebuildAll(); cnView=null;
      toast(`已批量导入 ${added} 条 🎉`); renderAdmin();
      if(view.name==="home") renderHome(); else if(view.name==="subject") renderSubject(view.param);
    };
    // 删除
    el.querySelectorAll("[data-del-custom]").forEach(b=>b.onclick=()=>{
      state.custom=state.custom.filter(x=>x.key!==b.dataset.delCustom); save(); rebuildAll(); cnView=null;
      toast("已删除"); renderAdmin();
      if(view.name==="home") renderHome(); else if(view.name==="subject") renderSubject(view.param);
    });
    // 还原被覆盖的内置内容
    el.querySelectorAll("[data-revert-custom]").forEach(b=>b.onclick=()=>{
      const k=b.dataset.revertCustom; if(state.overrides && state.overrides[k]){ delete state.overrides[k]; save(); rebuildAll(); toast("已还原内置内容 ⤺"); renderAdmin(); }
      if(view.name==="home") renderHome(); else if(view.name==="subject") renderSubject(view.param);
    });
  }

  /* ---------- 总渲染 ---------- */
  function render(){
    ["home","subject","tag","search","admin"].forEach(n=>{ $("#view-"+n).hidden = (n!==view.name); });
    setNav(view.name);
    if(view.name==="home") renderHome();
    else if(view.name==="subject") renderSubject(view.param);
    else if(view.name==="tag") renderTag(view.param);
    else if(view.name==="search") renderSearch(view.param);
    else if(view.name==="admin") renderAdmin();
  }

  /* ---------- 事件绑定 ---------- */
  // 顶部导航
  $("#mainNav").addEventListener("click", e=>{
    const b=e.target.closest(".nav-btn"); if(!b) return;
    if(b.classList.contains("future")){ toast("该栏目规划中，内容导入后自动上线"); return; }
    const v=b.dataset.view;
    if(v==="admin"){ go("admin"); return; }
    go(v==="home"?"home":"subject", v==="home"?null:v);
  });
  // 年级语境
  const gs=$("#gradeSelect");
  gs.innerHTML = GRADES.map(g=>`<option ${g===state.grade?"selected":""}>${g}</option>`).join("");
  gs.addEventListener("change", ()=>{
    state.grade=gs.value; save(); cnView=null;
    toast("学习年级已切换为："+state.grade);
    render();
  });
  // 全局搜索
  $("#globalSearch").addEventListener("keydown", e=>{
    if(e.key==="Enter"){ const q=e.target.value.trim(); if(q) go("search", q); }
  });
  /* ---------- 多学生切换器 ---------- */
  const MAX_STUDENTS = 4;
  function setStudentLabel(){ const b=$("#studentBtn"); if(b){ const s=state.students[state.currentStudent]; b.textContent = "🙋 " + (s?s.name:"学生") + " ▾"; } }
  function renderStudentsMenu(){
    const menu=$("#studentMenu"); if(!menu) return;
    const ids=Object.keys(state.students);
    menu.innerHTML = ids.map(id=>{
      const s=state.students[id]; const cur=(id===state.currentStudent);
      return `<div class="sm-row ${cur?"on":""}" data-sid="${id}">
        <span class="sm-dot" title="${cur?'当前':'点击切换'}">${cur?"●":"○"}</span>
        <input class="sm-name" data-sid="${id}" value="${esc(s.name||"学生")}" ${cur?"":"placeholder='学生名'"} />
        ${ids.length>1?`<button class="sm-del" data-del="${id}" title="删除该学生">✕</button>`:""}
      </div>`;
    }).join("") + (ids.length<MAX_STUDENTS
      ? `<button class="sm-add" id="studentAdd">＋ 添加学生</button>`
      : `<div class="sm-hint">最多 ${MAX_STUDENTS} 个学生</div>`);
  }
  function toggleStudentMenu(force){
    const menu=$("#studentMenu");
    if(!menu) return;
    const show = (force!==undefined)?force:(menu.hidden);
    menu.hidden = !show;
    if(show) renderStudentsMenu();
  }
  function switchStudent(id, keepMenu){
    if(!state.students[id]) return;
    syncPerStudent();   // 先把「当前」学生的最新状态写入其快照
    applyPerStudent(id);// 再载入目标学生的数据
    const gs=$("#gradeSelect"); if(gs) gs.value=state.grade;
    setStudentLabel(); renderStudentsMenu();
    if(!keepMenu) toggleStudentMenu(false);
    save();            // 持久化（含新的 currentStudent 与数据）
    render();
  }
  $("#studentBtn").addEventListener("click", ()=>toggleStudentMenu());
  $("#studentMenu").addEventListener("click", e=>{
    const add=e.target.closest("#studentAdd"); if(add){ addStudent(); return; }
    const del=e.target.closest("[data-del]");
    if(del){ removeStudent(del.dataset.del); return; }
    const row=e.target.closest(".sm-row");
    if(row && !e.target.closest(".sm-name") && !e.target.closest(".sm-del")){ switchStudent(row.dataset.sid); return; }
  });
  $("#studentMenu").addEventListener("change", e=>{
    const inp=e.target.closest(".sm-name"); if(!inp) return;
    const id=inp.dataset.sid; if(!state.students[id]) return;
    state.students[id].name=inp.value.trim()||"学生"; save();
    if(id===state.currentStudent) setStudentLabel();
  });
  function addStudent(){
    const ids=Object.keys(state.students);
    if(ids.length>=MAX_STUDENTS){ toast("最多 "+MAX_STUDENTS+" 个学生"); return; }
    const id="s"+Date.now();
    state.students[id]={ name:"学生"+(ids.length+1), data:defaultPerStudent() };
    save(); switchStudent(id, true);
  }
  function removeStudent(id){
    const ids=Object.keys(state.students);
    if(ids.length<=1){ toast("至少保留一个学生"); return; }
    delete state.students[id];
    if(state.currentStudent===id){ state.currentStudent=Object.keys(state.students)[0]; applyPerStudent(state.currentStudent); if($("#gradeSelect")) $("#gradeSelect").value=state.grade; }
    save(); setStudentLabel(); renderStudentsMenu(); render();
  }
  setStudentLabel();
  // 点击空白处关闭学生菜单
  document.addEventListener("click", e=>{ if(!e.target.closest(".student-switch")) toggleStudentMenu(false); });
  // 内容区事件委托
  document.querySelector("main").addEventListener("click", e=>{
    const card=e.target.closest(".card[data-key]");
    if(card){ const it=INDEX[card.dataset.key]; if(it) openModal(it); return; }
    const tag=e.target.closest(".tag[data-tag]");
    if(tag){ go("tag", tag.dataset.tag); return; }
    const cnT=e.target.closest("[data-cn-type]");
    if(cnT){ cnView.type=cnT.dataset.cnType; cnView.grade="全部"; cnView.q=""; renderSubject("语文"); return; }
    const cnG=e.target.closest("[data-cn-grade]");
    if(cnG){ cnView.grade=cnG.dataset.cnGrade; renderSubject("语文"); return; }
    const gnT=e.target.closest("[data-gn-type]");
    if(gnT){ const s=view.param; gnView[s]=gnView[s]||{}; gnView[s].type=gnT.dataset.gnType; gnView[s].grade="全部"; gnView[s].q=""; gnView[s].unit="全部"; renderSubject(s); return; }
    const gnG=e.target.closest("[data-gn-grade]");
    if(gnG){ const s=view.param; gnView[s]=gnView[s]||{}; gnView[s].grade=gnG.dataset.gnGrade; renderSubject(s); return; }
    const gnV=e.target.closest("[data-gn-volume]");
    if(gnV){ const s=view.param; gnView[s]=gnView[s]||{}; gnView[s].volume=gnV.dataset.gnVolume; gnView[s].unit="全部"; renderSubject(s); return; }
    const gnU=e.target.closest("[data-gn-unit]");
    if(gnU){ const s=view.param; gnView[s]=gnView[s]||{}; gnView[s].unit=gnU.dataset.gnUnit; renderSubject(s); return; }
    const sg=e.target.closest("[data-switch-grade]");
    if(sg){ state.grade=sg.dataset.switchGrade; gs.value=state.grade; save(); render(); toast("已切换到 "+state.grade); }
    const ci=e.target.closest("[data-checkin]");
    if(ci){ const k=ci.dataset.checkin; state.checkin[k] = !checkinOn(k.split("·")[0], k.split("·")[1]); save(); renderHome(); return; }
    const hdel=e.target.closest("[data-habit-del]");
    if(hdel){ const h=hdel.dataset.habitDel; state.habits=state.habits.filter(x=>x!==h); save(); toast("已删除习惯："+h); renderHome(); return; }
    const hadd=e.target.closest("[data-habit-add]");
    if(hadd){ const inp=$("#habitNew"); const v=((inp&&inp.value)||"").trim(); if(v&&!state.habits.includes(v)){ state.habits.push(v); save(); toast("已添加习惯："+v); } renderHome(); return; }
    const hb=e.target.closest("[data-habit]");
    if(hb){ const h=hb.dataset.habit; const t=fmt(new Date()); state.habitLog[t]=state.habitLog[t]||{}; if(state.habitLog[t][h]) delete state.habitLog[t][h]; else state.habitLog[t][h]=true; save(); renderHome(); return; }
  });
  // 学科内搜索（input 事件需单独绑定以保持焦点）
  document.querySelector("main").addEventListener("input", e=>{
    if(e.target.id==="cnSearch" && view.name==="subject" && view.param==="语文"){
      cnView.q=e.target.value;
      const refresh=$("#view-subject")._refreshList;
      if(refresh) refresh();
    }else if(e.target.id==="gnSearch" && view.name==="subject"){
      const s=view.param; gnView[s]=gnView[s]||{}; gnView[s].q=e.target.value;
      const refresh=$("#view-subject")._gnRefresh;
      if(refresh) refresh();
    }
  });
  // 弹窗关闭
  $("#modal").addEventListener("click", e=>{
    if(e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeModal(); });

  /* ---------- 启动 ---------- */
  render();
  // 测试钩子（仅当显式开启 window.__ENABLE_TEST__ 时挂载，正常站点无副作用）
  if(typeof window!=="undefined" && window.__ENABLE_TEST__){
    window.__SITE__ = {
      get state(){ return state; },
      get ALL(){ return ALL; },
      get INDEX(){ return INDEX; },
      rebuildAll, switchStudent, applyPerStudent, syncPerStudent, save,
      openModal, mathBodyHTML, effBody, renderAdmin
    };
  }
})();
