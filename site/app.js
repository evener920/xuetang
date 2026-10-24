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
    // 数学「公式」按「一、二、三…」小节拆分为单条：一小节一卡，每日打卡只取 2 小节（原来整单元太重）
    const FMQ = [];
    [...CUSTOM, ...EXTRA].filter(x=>x.subject==="数学" && x.type==="公式").forEach(src=>{
      splitSections(effBody(src)).forEach(s=>{
        const st = s.t || (src.title||"知识点");
        const it = {
          key:"fmq:"+strHash((src.title||"")+"::"+st),
          subject:"数学", type:"公式",
          title:st, sub:src.title||"", body:s.b,
          grade:src.grade||"", volume:src.volume||"", unit:src.unit||"",
          tags:(src.tags||[]).slice(), videos:[]
        };
        const ov=(state.overrides||{})[it.key]; // 该小节被单独编辑过 → 用覆盖版
        if(ov){ if(ov.body!=null) it.body=ov.body; if(ov.title) it.title=ov.title; if(ov.sub!=null) it.sub=ov.sub; if(ov.grade!=null) it.grade=ov.grade; }
        FMQ.push(it);
      });
    });
    // 数学「每日一练」按「一、口算 / 二、列竖式 / 三、脱式 / 四、思维题」小节拆分为单条
    // （原来一次打卡要吞下 30+ 道题；现在一小节一卡，并按天顺序轮转，一学期可练完 45 天）
    const DLQ = [];
    [...CUSTOM, ...EXTRA].filter(x=>x.subject==="数学" && x.type==="每日一练").forEach(src=>{
      splitSections(effBody(src)).forEach(s=>{
        const st = s.t || (src.title||"练习");
        const it = {
          key:"dlq:"+strHash((src.title||"")+"::"+st),
          subject:"数学", type:"每日一练",
          title:(src.title||"").replace(/\s*每日一练\s*$/,"").trim()+" · "+st,
          sub:src.sub||"", body:s.b,
          grade:src.grade||"", volume:src.volume||"", unit:src.unit||"",
          tags:(src.tags||[]).slice(), videos:[]
        };
        const ov=(state.overrides||{})[it.key];
        if(ov){ if(ov.body!=null) it.body=ov.body; if(ov.title) it.title=ov.title; if(ov.sub!=null) it.sub=ov.sub; if(ov.grade!=null) it.grade=ov.grade; }
        DLQ.push(it);
      });
    });
    // 打散练习入口（全部题目均匀交错，弹窗内逐题配「答案提示」）
    const PRACTICE_ENTRY = { key:"practice:maththought", subject:"数学", type:"思维母题",
      title:"🧠 思维母题 · 打散练习", sub:"全部题目跨专题均匀打散，每题配「答案提示」", body:"", grade:"四年级", tags:["思维母题"], videos:[] };
    const isSplit = x=>x.subject==="数学" && (x.type==="思维母题"||x.type==="公式"||x.type==="每日一练");
    const restCustom = CUSTOM.filter(x=>!isSplit(x));
    const restExtra  = EXTRA.filter(x=>!isSplit(x) && !OVSET.has(x.key));
    // 内置条目（诗词/成语/单词/动画/教材）被「覆盖编辑」后，以覆盖版本替换原内置项
    // （思维母题/公式/每日一练源以拆分条目形式反映覆盖，故此处排除）
    const BASE_ALL = [...POEMS,...IDIOMS,...WORDS,...GALLERY,...WENYAN];
    const OV_ITEMS = [];
    [...BASE_ALL, ...EXTRA].forEach(x=>{
      if(OVSET.has(x.key) && !isSplit(x)){
        OV_ITEMS.push(Object.assign({}, x, OV[x.key], {key:x.key}));
      }
    });
    ALL=[...BASE_ALL.filter(x=>!OVSET.has(x.key)),...restCustom,...restExtra,...OV_ITEMS,...MOTHER_QS,...DLQ,...FMQ,PRACTICE_ENTRY];
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
      videos:String(o.videos||"").split(/[\n,，]/).map(s=>s.trim()).filter(Boolean),
      html: !!o.html
    };
  }

  // 批量导入：解析 JSON（数组 或 含 poems/idioms/words 的原始 data.json），追加到 state.custom
  // 返回成功导入的条数；资源页与后台共用此逻辑（资源页为入口）。
  function runBulkImport(raw){
    if(!raw || !raw.trim()){ toast("请粘贴 JSON"); return 0; }
    let data;
    try{ data=JSON.parse(raw.trim()); }
    catch(e){ toast("JSON 解析失败，请检查格式"); return 0; }
    let added=0;
    if(Array.isArray(data)){
      data.forEach(o=>{ if(o && (o.title||o.text||o.word)){ state.custom.push(makeCustomItem(o)); added++; } });
    }else if(data.poems||data.idioms||data.words){
      (data.poems||[]).forEach(p=>state.custom.push(makeCustomItem({subject:"语文",type:"诗词",title:p.title,sub:((p.dynasty?p.dynasty+" · ":"")+(p.author||"")),body:p.content,grade:matchPoemGrade(p.title),tags:(p.tags||[]).join(",")})));
      (data.idioms||[]).forEach(g=>state.custom.push(makeCustomItem({subject:"语文",type:"成语",title:g.word,body:g.explanation,grade:g.grade})));
      (data.words||[]).forEach(w=>{ const m=(w.grade||"").match(/^(.+?)(上册|下册)$/); state.custom.push(makeCustomItem({subject:"英语",type:"单词",title:w.text,sub:w.phonetic,body:w.cn,grade:m?m[1]:"",volume:m?m[2]:"",unit:w.unit})); });
      added=(data.poems?.length||0)+(data.idioms?.length||0)+(data.words?.length||0);
    }else{ toast("不支持的 JSON 结构"); return 0; }
    if(!added){ toast("没有可导入的条目"); return 0; }
    save(); rebuildAll(); cnView=null;
    toast(`已批量导入 ${added} 条 🎉`);
    return added;
  }

  const GRADES = ["一年级","二年级","三年级","四年级","五年级","六年级","七年级","八年级","九年级","高一","高二","高三"];
  // 上下册：跨学科一致的「册」维度（英语单词与后台自定义素材可标注；与 学科×年级×类型×标签 交叉筛选）
  const VOLUMES = ["上册","下册"];
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
    "科学":["实验","知识","地理动画"],
    "人文":["史实","人物","阅读"],
    // 初中「小四门 + 理化」：切到七/八/九年级时，导航与打卡范围自动换成这些科目
    "生物":["知识","练习"],
    "地理":["知识","练习"],
    "政治":["知识","练习"],
    "历史":["史实","人物","知识","练习"],
    "物理":["知识","实验","练习"],
    "化学":["知识","实验","练习"]
  };
  // 按年级动态的扩展学科：小学（一~六年级）= 科学+人文；初中（七/八/九年级）= 生物·地理·政治·历史·物理·化学
  const MIDDLE_GRADES = ["七年级","八年级","九年级"];
  const MIDDLE_EXTRAS = ["生物","地理","政治","历史","物理","化学"];
  function extraSubjects(){ return MIDDLE_GRADES.includes(state.grade) ? MIDDLE_EXTRAS : ["科学","人文"]; }
  function allSubjects(){ return ["语文","数学","英语",...extraSubjects()]; }
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
  const TYPE_QUOTA = {"诗词":1,"成语":2,"单词":5,"听力":2,"阅读":2,"每日一练":2};
  function typeQuota(t){ return TYPE_QUOTA[t]!==undefined ? TYPE_QUOTA[t] : 2; }
  // 每类型每周频次（主课多、副课少；未列出的主课类型每周 1 次）
  const WEEK_FREQ_OVER = {
    "语文·诗词":5, "英语·单词":5,
    "语文·成语":3, "数学·每日一练":5,
    "数学·计算题":2, "数学·应用题":2, "英语·听力":2,
    "数学·思维母题":2, "数学·公式":2
  };
  function weekFreqOf(subject,type){
    const k = checkinKey(subject,type);
    const p = sectionPlanOf(k);
    if(p.freq && p.freq>=1 && p.freq<=7) return p.freq; // 后台排程优先
    if(WEEK_FREQ_OVER[k]!==undefined) return WEEK_FREQ_OVER[k];
    return 1;
  }
  // 稳定字符串哈希（保证每周计划确定性、刷新不变）
  function strHash(s){ let h=7; for(let i=0;i<s.length;i++) h=(h*131+s.charCodeAt(i))>>>0; return h; }
  // 周计划：返回长度 7 的数组（下标 0=周日），每天为 [{subject,type},…]
  // 规则：主课(语数英)每天 3~4 类、科学/人文尽量排周末；同一类型一天最多一次；按每日配额均衡负载。
  function weekPlan(){
    const slots=[];
    CHECKIN_TYPES.forEach(({subject,type})=>{
      if(!checkinOn(subject,type)) return;
      if(!sectionActive(subject,type)) return; // 未开始 / 已结课 的板块不进周计划
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
    if(!ebIntervalsFor(key).includes(dayDiff(d))) return false;
    const t=fmt(new Date());
    return !(state.reviewed[t] && state.reviewed[t][key]);
  }
  function dueReviews(){
    return Object.keys(state.learned).filter(dueReview).map(k=>INDEX[k]).filter(Boolean).slice(0,6);
  }

  /* ---------- 掌握度星级（0~5）与学习调度增强 ---------- */
  // getMastery：返回 0~5；旧数据「已学会但无星级」视为 5（全会）；从未学过返回 null（未学）
  function getMastery(key){
    if(state.mastery && state.mastery[key]!==undefined) return state.mastery[key];
    if(state.learned[key]) return 5; // 旧数据兼容：已会即全会
    return null;
  }
  function setMastery(key, n){
    state.mastery = state.mastery || {};
    n = Math.max(0, Math.min(5, parseInt(n,10)||0));
    state.mastery[key] = n; // 显式评星即记录（含 0★ 不会/零星）
    save();
  }
  // practicePriority：越高越优先排入今日练习（不会的加强、已会的降频）
  function practicePriority(key){
    const m = getMastery(key);
    if(m===null) return 2.5;   // 未学：需要学习
    if(m>=5)    return 0.15;   // 全会：降频
    if(m<=2)    return 3;      // 不会/弱：加强
    return 1;                  // 中等：正常
  }
  function addDays(dateStr, n){
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + n);
    return fmt(d);
  }
  // 每个「学科·类型」板块的排程（起止日 / 每周频次），按学生独立
  function sectionPlanOf(k){ return (state.sectionPlan && state.sectionPlan[k]) || {}; }
  function sectionActive(subject, type){
    const p = sectionPlanOf(checkinKey(subject, type));
    const t = fmt(new Date());
    if(p.start && t < p.start) return false; // 尚未开始
    if(p.end   && t > p.end)   return false; // 已结课
    return true;
  }
  // 艾宾浩斯间隔按掌握度调整：不会的更密、全会的更稀
  function ebIntervalsFor(key){
    const m = getMastery(key);
    if(m===null) return EB_INTERVALS;
    if(m<=2) return [1,2,3,5,8,15]; // 弱：更密集跟进
    if(m>=5) return [2,7,15];        // 全会：减少打扰
    return EB_INTERVALS;
  }
  // 从序列中取 quota 条，跳过「全会(5★)」条目（已会降频），不足再回退补足
  function seqSkipMastered(pool, off, q){
    const out=[], seen=new Set(); let i=off, guard=0;
    while(out.length<q && guard<pool.length){
      const it=pool[i%pool.length]; i++; guard++;
      if(getMastery(it.key)>=5) continue;        // 全会跳过
      if(seen.has(it.key)) continue;
      seen.add(it.key); out.push(it);
    }
    i=off; guard=0;
    while(out.length<q && guard<pool.length){
      const it=pool[i%pool.length]; i++; guard++;
      if(seen.has(it.key)) continue;
      seen.add(it.key); out.push(it);
    }
    return out;
  }
  // 普通板块：按「卡片顺序」偏好推进
  function sectionItems(subject, type, quota){
    const pool = libPoolFor(subject, type); // 本年级 + 已加入学习的其他年级（年级筛选扩大选择范围后生效）
    if(!pool.length) return [];
    const semDay = Math.max(0, dayDiff(state.semesterStart));
    // 智能模式（默认关闭）：顺序前沿 + 掌握度加权（弱项优先），但显示时保持相对顺序
    if(state.orderMode === "smart"){
      const frontier = (semDay * quota) % pool.length; // 顺序前沿，按天稳定推进
      const WIN = Math.max(quota*3, quota+6);          // 候选窗口
      const win=[];
      for(let i=0;i<WIN && i<pool.length;i++) win.push(pool[(frontier+i)%pool.length]);
      const scored = win.map((it,idx)=>({it, idx, p:practicePriority(it.key)}));
      scored.sort((a,b)=> b.p - a.p || a.idx - b.idx); // 弱项优先，稳定保序
      const n = Math.min(quota, win.length);
      return scored.slice(0,n).sort((a,b)=>a.idx-b.idx).map(x=>x.it); // 显示保持顺序
    }
    // 顺序模式（默认）：严格按资源导入次序推进，跳过全会(5★)但保持相对顺序，前后感清晰
    const frontier = (semDay * quota) % pool.length;
    const out=[], seen=new Set(); let i=frontier, guard=0;
    while(out.length<quota && guard<pool.length){
      const it=pool[i%pool.length]; i++; guard++;
      if(getMastery(it.key)>=5) continue;   // 全会跳过，但后序仍按序补位
      if(seen.has(it.key)) continue;
      seen.add(it.key); out.push(it);
    }
    return out; // 已是导入顺序
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
  /* ---------- 数学「公式 / 每日一练」：整篇 → 按「一、二、三…」小节拆开 ---------- */
  // 一小节一卡，避免一次打卡内容过重；兼容首行缺序号的「、xxx」写法（数据里「一」有丢失）
  function splitSections(body){
    const lines=(body||"").split("\n");
    const secs=[]; let cur=null, seen=false;
    lines.forEach(ln=>{
      const t=ln.trim(); if(!t) return;
      const m=t.match(/^[一二三四五六七八九十]+、/);
      if(m || (!seen && /^、/.test(t))){
        const label = m ? t : ("一、"+t.replace(/^、/,"").trim());
        cur={t:label,b:""}; secs.push(cur); seen=true; return;
      }
      if(!cur){ cur={t:"",b:""}; secs.push(cur); }
      cur.b += (cur.b?"\n":"")+t;
    });
    secs.forEach(s=>{ s.b=(s.b||"").trim(); });
    return secs;
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
      ALL.filter(x=>x.type==="思维母题" && x.key.indexOf("mtq:")===0 && gradeOk(x)),
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
  /* ---------- 后台登录口令（存本机，防止孩子随手改动后台内容；非服务端鉴权） ---------- */
  function pwHash(pw, salt){
    let h=2166136261>>>0; const s=(salt||"")+"::"+(pw||"");
    for(let i=0;i<s.length;i++){ h=(h^s.charCodeAt(i))>>>0; h=Math.imul(h,16777619)>>>0; }
    let g=5381>>>0; const s2=(pw||"")+"#"+(salt||"");
    for(let i=0;i<s2.length;i++){ g=(Math.imul(g,33)^s2.charCodeAt(i))>>>0; }
    return h.toString(16)+"-"+g.toString(16);
  }
  function setAdminPassword(pw){
    const salt=Math.random().toString(36).slice(2,10);
    state.admin={ user:(state.admin&&state.admin.user)||"admin", salt, hash:pwHash(pw,salt) };
  }
  // 补齐 state 缺省字段（首次启动 / 从云端拉取旧包后都要跑一遍，避免缺字段报错）
  function applyStateDefaults(){
    state.grade = state.grade || "四年级";
    state.learned = state.learned || {};
    state.fav = state.fav || {};
    state.videos = state.videos || {};  // 用户为任意条目补充的视频（key → [链接]）
    state.custom = state.custom || [];  // 后台添加的素材（已归一化为标准条目）
    state.overrides = state.overrides || {}; // 对「内置教材」条目的覆盖版本（key = 内置条目 key，仅本机保存，可还原）
    state.checkin = state.checkin || {}; // 首页每日打卡范围（学科→true/false，缺省=开启）
    state.studySet = state.studySet || {}; // 学习库：加入学习目标的条目（key→true，按学生独立；只有加入的才计入「学习目标」统计）
    state.mastery = state.mastery || {}; // 每张内容卡的掌握度星级 0~5（按学生独立）
    state.sectionPlan = state.sectionPlan || {}; // 每个「学科·类型」板块的起止日/每周频次（按学生独立）
    state.lastKey = state.lastKey || null;
    state.habits = Array.isArray(state.habits) ? state.habits : ["房间卫生","早睡早起","学校作业"]; // 每日习惯打卡
    state.habitLog = state.habitLog || {};   // 日期 → {习惯名: true}
    state.reviewed = state.reviewed || {};   // 日期 → {条目key: true}（艾宾浩斯复习打卡）
    state.semesterStart = state.semesterStart || fmt(new Date()); // 学期第 1 天（90 天学期）
    state.points   = typeof state.points==="number" ? state.points : 0;
    state.pointLog = Array.isArray(state.pointLog) ? state.pointLog : [];  // 流水 [{t,n,note,hook}]
    state.redeems  = Array.isArray(state.redeems)  ? state.redeems  : [];  // 兑换记录 [{t,name,cost,status}]
    if(!state.admin || !state.admin.hash) setAdminPassword("123456"); // 默认口令 admin / 123456
    state.adminAuthed = !!state.adminAuthed; // 登录状态（本机保持，可退出）
    state.sync = state.sync || { enabled:false, pass:"", at:0 }; // 云端同步：启用 / 同步密钥(明文存本机) / 上次与云端一致的时间戳
  }
  // 保证多学生结构存在（首次启动 / 从云端拉取的数据都可能缺 students 字段）
  function ensureStudents(){
    if(!state.students || typeof state.students!=="object" || !Object.keys(state.students).length){
      const snap=capturePerStudent();
      state.students={ s1:{name:"学生1", data:snap}, s2:{name:"学生2", data:defaultPerStudent()} };
      state.currentStudent="s1";
    } else {
      if(!state.currentStudent || !state.students[state.currentStudent]) state.currentStudent=Object.keys(state.students)[0];
      applyPerStudent(state.currentStudent);
    }
  }
  applyStateDefaults();
  /* ---------- 打卡积分奖励（账号按学生独立；奖励目录全局） ---------- */
  // 计分原则：① 即时反馈（打卡立刻到账）② 复习 > 学新（间隔重复收益最高）
  // ③ 只加不减（不让孩子因漏打卡受挫）④ 短中长期目标并存（小额天天能换、大额需攒几个月）
  // ⑤ 兑奖需家长在后台确认，避免自行「提现」
  const POINT_RULES = {
    learn: 10,      // 学会 / 打卡一条学习内容
    review: 15,     // 完成一次艾宾浩斯到期复习
    habit: 8,       // 完成一个当日习惯
    quizRight: 2    // 小测答对一题
  };
  const QUIZ_CAP_DAY = 20;   // 小测积分每日上限，避免刷分
  // 连续学习天数里程碑（一次性发放；断签只重置连续天数，不清空积分）
  const STREAK_MILESTONES = [[3,20],[7,50],[14,100],[21,150],[30,200],[60,500],[100,1000]];
  // 奖励目录：由「短周期即时反馈 → 长周期大目标」阶梯排布（可在后台自定义追加）
  const DEFAULT_REWARDS = [
    {id:"r1", icon:"🎟️", name:"小奖励券（贴纸 / 小零食）", cost:300,  tip:"约 2 天，建立即时反馈"},
    {id:"r2", icon:"🖊️", name:"文具套装",                  cost:800,  tip:"约 5 天的小目标"},
    {id:"r3", icon:"🧩", name:"益智拼装玩具",              cost:2000, tip:"约 2 周"},
    {id:"r4", icon:"🧸", name:"盲盒 / 普通玩具",           cost:4000, tip:"约 1 个月"},
    {id:"r5", icon:"🎨", name:"乐高中等套装",              cost:8000, tip:"约 2 个月"},
    {id:"r6", icon:"🎧", name:"MP3 播放器",                cost:12000,tip:"约 3 个月"},
    {id:"r7", icon:"🎮", name:"掌上游戏机",                cost:20000,tip:"约 5 个月 · 学期大目标"},
    {id:"r8", icon:"📱", name:"手机",                      cost:30000,tip:"约 2 个学期 · 年度大目标"}
  ];
  function rewardList(){ return (Array.isArray(state.rewards)&&state.rewards.length) ? state.rewards : DEFAULT_REWARDS; }
  /* ---------- 行为扣分（减分）----------
     设计原则（行为矫正里的「反应代价 response cost」，讲究轻、准、可挽回）：
     ① 只扣行为，不扣学习 —— 学习积分只加不减，连续天数不受行为扣分影响，两条账各记各的
     ② 轻罚为主 —— 单项 5~10 分（约等于半天到一天的积累），重罚只留给说谎等原则问题
     ③ 每日扣分有上限 —— 防止一天把孩子扣垮，也防止家长情绪化连点
     ④ 欠分有下限 —— 余额最多扣到 -PENALTY_FLOOR，之后仍需记录但不再扣分，欠的靠之后挣回来
     ⑤ 可挽回 —— 当天改正了，家长点「已改正」即全额返还，鼓励改进行为而非单纯惩罚
     ⑥ 同一事项当天只记一次 —— 避免重复扣分变成情绪发泄                                */
  const PENALTY_CAP_DAY = 30;   // 每日扣分上限（默认值）
  const PENALTY_FLOOR   = 50;   // 欠分下限（默认值）

  /* ---------- 自定义积分规则（后台「🏆 自定义积分规则」可改；存 state.rules，按学生独立） ---------- */
  function _ruleNum(v, def, min, max){
    if(v===undefined||v===null||v==="") return def;
    const n=Number(v);
    if(!Number.isFinite(n)||n<min||n>max) return def;
    return n;
  }
  // 加分四项：学会/复习/习惯/小测答对
  function pointRules(){
    const r=state.rules||{};
    return {
      learn:     _ruleNum(r.learn,     POINT_RULES.learn,     0, 100000),
      review:    _ruleNum(r.review,    POINT_RULES.review,    0, 100000),
      habit:     _ruleNum(r.habit,     POINT_RULES.habit,     0, 100000),
      quizRight: _ruleNum(r.quizRight, POINT_RULES.quizRight, 0, 100000)
    };
  }
  function quizCapDay(){ return _ruleNum((state.rules||{}).quizCapDay, QUIZ_CAP_DAY, 0, 1000000); }
  function streakMilestones(){
    const m=(state.rules||{}).streakMilestones;
    if(Array.isArray(m)){
      const ok=m.filter(x=>Array.isArray(x)&&Number.isFinite(+x[0])&&+x[0]>=1&&Number.isFinite(+x[1])&&+x[1]>=0)
                .map(x=>[+x[0],+x[1]]).sort((a,b)=>a[0]-b[0]);
      if(ok.length) return ok;
    }
    return STREAK_MILESTONES;
  }
  function penaltyCapDay(){ return _ruleNum((state.rules||{}).penaltyCapDay, PENALTY_CAP_DAY, 1, 1000000); }
  function penaltyFloor(){ return _ruleNum((state.rules||{}).penaltyFloor, PENALTY_FLOOR, 0, 1000000); }
  const DEFAULT_PENALTIES = [
    {id:"p1", icon:"🧼", name:"不讲卫生", cost:5,  tip:"不洗手、不刷牙、不洗澡、衣物乱丢等"},
    {id:"p2", icon:"🧹", name:"房间凌乱", cost:5,  tip:"玩具、书桌、床铺用完不收拾"},
    {id:"p3", icon:"⏰", name:"磨蹭拖延", cost:5,  tip:"叫了很多遍还不动，作业/出门一拖再拖"},
    {id:"p4", icon:"🌙", name:"晚睡",     cost:10, tip:"超过规定上床时间还没睡（作息是第二天的学习本钱）"},
    {id:"p5", icon:"🙅", name:"不礼貌",   cost:10, tip:"对长辈/他人不礼貌、顶嘴、说脏话"},
    {id:"p6", icon:"😤", name:"乱发脾气", cost:8,  tip:"无理取闹、摔东西、大喊大叫"},
    {id:"p7", icon:"🤥", name:"说谎隐瞒", cost:20, tip:"撒谎、隐瞒作业或成绩（原则问题，扣得最重）"}
  ];
  function penaltyList(){ return (Array.isArray(state.penalties)&&state.penalties.length) ? state.penalties : DEFAULT_PENALTIES; }
  function penaltyToday(){ return (state.pointLog||[]).filter(x=>x.t===todayStrNow() && x.n<0).reduce((a,b)=>a-b.n,0); }
  function penaltyLogToday(){ return (state.pointLog||[]).filter(x=>x.t===todayStrNow() && x.n<0); }
  // 本周扣分记录（本周页展示用，与习惯周跟踪放一起）
  function penaltyLogWeek(){ const ws=weekDatesMondayStart(); return (state.pointLog||[]).filter(x=>x.n<0 && ws.indexOf(x.t)>=0); }
  // 扣分：返回实际扣掉的分数（0 表示未扣成）
  function penalize(id){
    const p = penaltyList().find(x=>x.id===id); if(!p) return 0;
    const t = todayStrNow(), hook = "pen:"+id+":"+t;
    if(hasAwardHook(hook)) return -1;                       // 同一事项当天已记过
    if(penaltyToday() + p.cost > penaltyCapDay()) return -2; // 撞到每日上限
    const real = Math.min(p.cost, Math.max(0, state.points + penaltyFloor()));
    if(real<=0) return -3;                                   // 已到欠分下限
    state.points -= real;
    state.pointLog.unshift({ t, n:-real, note:"行为扣分 · "+p.name, hook });
    if(state.pointLog.length>600) state.pointLog.length=600;
    save();
    return real;
  }
  // 改正撤销：全额返还并删掉这条扣分记录（撤销入口只在「后台」，本就需家长登录）
  function undoPenalty(hook){
    const i=(state.pointLog||[]).findIndex(x=>x.hook===hook && x.n<0);
    if(i<0) return 0;
    const e=state.pointLog[i];
    state.points += (-e.n);
    state.pointLog.splice(i,1);
    save();
    return -e.n;
  }
  function todayStrNow(){ return fmt(new Date()); }
  function pointToday(){ return (state.pointLog||[]).filter(x=>x.t===todayStrNow() && x.n>0).reduce((a,b)=>a+b.n,0); }
  function pointWeek(){ const ws=weekDatesMondayStart(); return (state.pointLog||[]).filter(x=>x.n>0 && ws.indexOf(x.t)>=0).reduce((a,b)=>a+b.n,0); }
  // 当日/本周净分 = 正分 - 行为扣分：「今日/本周总分」按净分展示（用户诉求：今日行为扣分要减到当日总分里），
  // 扣分明细仍看首页红徽章、本周页「🚨 行为扣分记录」、奖励页「今日行为扣分」卡，两本账不混但总数要净
  function pointTodayNet(){ return pointToday() - penaltyToday(); }
  function pointWeekNet(){ return pointWeek() - penaltyLogWeek().reduce((a,b)=>a-b.n,0); }
  function sgn(n){ return n>0 ? "+"+n : ""+n; }
  function hasAwardHook(h){ return (state.pointLog||[]).some(x=>x.hook===h); }
  function award(n, note, hook){
    if(hook && hasAwardHook(hook)) return false; // 同一事项不重复计分（取消再打卡也不刷分）
    state.points += n;
    state.pointLog.unshift({ t:todayStrNow(), n, note, hook:hook||"" });
    if(state.pointLog.length>600) state.pointLog.length=600;
    save();
    return true;
  }
  function awardQuiet(n, note, hook, silent){
    const okd = award(n, note, hook);
    if(okd && !silent) toast("＋"+n+" 分 · "+note);
    return okd;
  }
  // 撤销一次「学会」积分（加错时用）：退回积分 + 删流水 + 取消该卡已学/星级。返回退回的分数（0=没有可撤的）
  function undoLearn(key){
    const hook = "learn:"+key;
    const e = (state.pointLog||[]).find(x=>x.hook===hook && x.n>0);
    if(!e) return 0;
    state.points -= e.n;
    state.pointLog = (state.pointLog||[]).filter(x=>!(x.hook===hook && x.n>0));
    delete state.learned[key];
    delete state.mastery[key];
    const t=fmt(new Date());
    if(state.reviewed[t]) delete state.reviewed[t][key];
    if(state.pointLog.length>600) state.pointLog.length=600;
    save();
    return e.n;
  }
  // —— 积分撤销的权限闸门：未登录后台时先弹框验证家长口令，通过后才允许执行撤销 ——
  let adminGate = null; // 待授权动作（验证通过后执行）
  function requireAdmin(action){
    if(state.adminAuthed){ action(); return; }
    adminGate = action;
    $("#modal-body").innerHTML = `
      <div class="m-type">🔐 家长验证</div>
      <p class="af-tip" style="margin:4px 0 10px">撤销积分会改动余额和学习记录，需要先验证后台口令（默认 admin / 123456，可在后台「🔑 修改密码」更改）。</p>
      <div class="admin-form">
        <div class="af-row"><label class="af-grow">账号<input id="agUser" value="${esc((state.admin&&state.admin.user)||"admin")}" /></label></div>
        <div class="af-row"><label class="af-grow">口令<input id="agPw" type="password" placeholder="后台口令" /></label></div>
        <div class="af-actions">
          <button class="btn primary" id="agOk">验证并继续</button>
          <button class="btn" id="agCancel">取消</button>
        </div>
      </div>`;
    $("#agCancel").onclick = closeModal;
    $("#agOk").onclick = adminGateTry;
    $("#agPw").addEventListener("keydown", e=>{ if(e.key==="Enter") adminGateTry(); });
    $("#modal").hidden=false; document.body.style.overflow="hidden";
  }
  function adminGateTry(){
    const u=((($("#agUser")||{}).value)||"").trim(), p=(($("#agPw")||{}).value)||"";
    if(!p){ toast("请输入口令"); return false; }
    if(u!==state.admin.user || pwHash(p,state.admin.salt)!==state.admin.hash){
      toast("账号或口令不正确"); const pw=$("#agPw"); if(pw){ pw.value=""; pw.focus(); } return false;
    }
    state.adminAuthed=true; save(); closeModal();
    const act=adminGate; adminGate=null; if(act) act();
    return true;
  }
  // 撤销确认框：把后果说清再动手（pen=行为扣分返还；learn=退分并取消已学/星级）
  // ref：pen 传完整 hook；learn 传卡片 key（自动补 "learn:" 前缀）
  function confirmUndo(kind, ref){
    const logHook = kind==="pen" ? ref : "learn:"+ref;
    const e=(state.pointLog||[]).find(x=>x.hook===logHook && (kind==="pen" ? x.n<0 : x.n>0));
    if(!e){ toast("这条记录不存在或已撤销"); return; }
    const isPen = kind==="pen";
    $("#modal-body").innerHTML = `
      <div class="m-type">${isPen?"✅ 撤销行为扣分":"↩️ 撤销学会积分"}</div>
      <div class="af-tip" style="margin:6px 0 12px;font-size:14px;line-height:1.7">
        <p>将撤销：<b>${esc(e.note||"")}</b>（${esc(e.t)}，${isPen?(-e.n+" 分"):("+"+e.n+" 分")}）。</p>
        <p>撤销后${isPen?`<b>返还 +${-e.n} 分</b>到当前积分，这条扣分记录同时消失`:`<b>退回 ${e.n} 分</b>，并取消该卡的已学标记与星级（之后可重新学、重新计分）`}。</p>
      </div>
      <div class="af-actions">
        <button class="btn primary" id="cfOk">确定撤销</button>
        <button class="btn" id="cfCancel">再想想</button>
      </div>`;
    $("#cfCancel").onclick = closeModal;
    $("#cfOk").onclick = ()=>{
      closeModal();
      if(isPen){ const got=undoPenalty(ref); toast(got>0?("已改正，返还 +"+got+" 分 👍"):"这条扣分已撤销过"); }
      else { const back=undoLearn(ref); toast(back>0?("已撤销学会：退回 "+back+" 分 ↩️"):"该记录已撤销过"); }
      refreshView();
    };
    $("#modal").hidden=false; document.body.style.overflow="hidden";
  }
  // 卡片弹窗里的「撤销学会」：同样要家长口令 + 确认框（可能退分，也可能只是取消未计分的已学标记）
  function confirmUnlearn(it){
    const e=(state.pointLog||[]).find(x=>x.hook==="learn:"+it.key && x.n>0);
    $("#modal-body").innerHTML = `
      <div class="m-type">↩️ 撤销学会</div>
      <div class="af-tip" style="margin:6px 0 12px;font-size:14px;line-height:1.7">
        <p>将撤销《${esc(stripTags(it.title||it.name||it.key))}》的学会记录：</p>
        ${e?`<p>· 退回 <b>+${e.n} 分</b>（学会积分）</p>`:`<p>· 该卡没有产生过学会积分</p>`}
        <p>· 取消已学标记与星级，之后可重新学习、重新计分</p>
      </div>
      <div class="af-actions">
        <button class="btn primary" id="cfOk">确定撤销</button>
        <button class="btn" id="cfCancel">再想想</button>
      </div>`;
    $("#cfCancel").onclick = closeModal;
    $("#cfOk").onclick = ()=>{
      closeModal();
      const back=undoLearn(it.key);
      if(back>0) toast("已撤销学会：退回 "+back+" 分，取消已学标记 ↩️");
      else { delete state.learned[it.key]; const t=fmt(new Date()); if(state.reviewed[t]) delete state.reviewed[t][it.key]; toast("已取消学会标记（该卡未产生积分）"); }
      save(); openModal(it); refreshIfVisible();
    };
    $("#modal").hidden=false; document.body.style.overflow="hidden";
  }
  // 学习日期集合（已打卡的日期）与连续天数
  function studyDates(){
    const s=new Set();
    Object.values(state.learned||{}).forEach(v=>{ if(v) s.add(String(v)); });
    return s;
  }
  function currentStreak(){
    const ds=studyDates(); if(!ds.size) return 0;
    const d=new Date();
    if(!ds.has(fmt(d))) d.setDate(d.getDate()-1); // 今天还没学 → 从昨天起算
    let n=0;
    while(ds.has(fmt(d))){ n++; d.setDate(d.getDate()-1); }
    return n;
  }
  // 每次打卡后统一结算：连续天数里程碑
  // （不设「今日全勤」加奖：打卡各项已各自计分，全勤再奖一份属于重复计酬）
  function settleBonuses(){
    const n=currentStreak();
    streakMilestones().forEach(([d,p])=>{
      if(n>=d) awardQuiet(p, "连续学习 "+d+" 天达成奖励", "streak:"+d+":"+todayStrNow());
    });
  }
  function redeemReward(id){
    const r=rewardList().find(x=>x.id===id); if(!r) return;
    if(state.points<r.cost){ toast("还差 "+(r.cost-state.points)+" 分，继续加油 💪"); return; }
    if(!confirm("用 "+r.cost+" 分兑换「"+r.name+"」？\n兑换后由家长在后台确认兑现。")) return;
    state.points-=r.cost;
    state.pointLog.unshift({ t:todayStrNow(), n:-r.cost, note:"兑换 "+r.name, hook:"" });
    state.redeems.unshift({ t:todayStrNow(), name:r.name, icon:r.icon||"🎁", cost:r.cost, status:"待兑现" });
    save(); toast("已提交兑换 🛍️ 请家长在后台确认"); renderReward(); setStudentLabel();
  }
  /* ---------- 存档与版本（本机快照 · 可回退/撤回） ---------- */
  const ARCHIVE_KEY = "xuetang_archives_v1"; // 与主数据分开存，避免互相挤占
  const ARCHIVE_MAX = 12;
  function loadArchives(){ try{ return JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || []; }catch(e){ return []; } }
  function saveArchives(a){
    try{ localStorage.setItem(ARCHIVE_KEY, JSON.stringify(a)); }
    catch(e){ toast("存档失败：浏览器本地空间不足，请先删除一些旧存档"); }
  }
  function archiveCreate(note, auto){
    const list = loadArchives();
    const snap = JSON.parse(JSON.stringify(state));
    const now = new Date();
    list.unshift({
      t: fmt(now)+" "+now.toTimeString().slice(0,5),
      note: note||"", auto: !!auto,
      size: JSON.stringify(snap).length, state: snap
    });
    while(list.length > ARCHIVE_MAX){ // 超量：优先淘汰最早的「自动」存档，手动存档尽量保留
      const autos = list.map(x=>x.auto);
      let i = autos.lastIndexOf(true);
      if(i<=0) i = list.length-1;
      if(i<0) break;
      list.splice(i,1);
    }
    saveArchives(list);
    return list;
  }
  function archiveRestore(i){
    const list = loadArchives();
    const a = list[i]; if(!a) return;
    archiveCreate("还原「"+a.t+" "+(a.note||"")+"」前的自动备份", true); // 先备份当前 → 还原可随时撤销
    const keepAdmin = state.admin, keepAuthed = state.adminAuthed; // 登录口令不随存档回退
    const snap = JSON.parse(JSON.stringify(a.state));
    Object.keys(state).forEach(k=>{ delete state[k]; });
    Object.assign(state, snap);
    state.admin = keepAdmin; state.adminAuthed = keepAuthed;
    save(); rebuildAll(); render();
    toast("已还原到 "+a.t+"（还原前已自动备份，可再次回退）");
  }
  // 整库备份：导出 / 导入成文件（防清缓存、换设备丢失，如七年级英语词库）
  function exportBackup(){
    const data = JSON.stringify(state);
    const blob = new Blob([data], {type:"application/json"});
    const url = (window.URL||URL).createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    a.href = url; a.download = "学堂备份-"+fmt(d)+".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>{ try{ (window.URL||URL).revokeObjectURL(url); }catch(e){} }, 1000);
    toast("已导出备份文件 💾");
  }
  function importBackupFile(file){
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const obj = JSON.parse(reader.result);
        if(!obj || typeof obj!=="object" || Array.isArray(obj)) throw new Error("不是有效的备份文件");
        if(!("custom" in obj) && !("learned" in obj) && !("students" in obj)) throw new Error("缺少学堂数据字段");
        const keepAdmin = state.admin, keepAuthed = state.adminAuthed;
        const snap = JSON.parse(JSON.stringify(obj));
        Object.keys(state).forEach(k=>{ delete state[k]; });
        Object.assign(state, snap);
        state.grade = state.grade || "四年级";
        state.learned = state.learned || {};
        state.fav = state.fav || {};
        state.videos = state.videos || {};
        state.custom = state.custom || [];
        state.overrides = state.overrides || {};
        state.checkin = state.checkin || {};
        state.lastKey = state.lastKey || null;
        state.habits = Array.isArray(state.habits)?state.habits:["房间卫生","早睡早起","学校作业"];
        state.habitLog = state.habitLog || {};
        state.reviewed = state.reviewed || {};
        state.mastery = state.mastery || {};
        state.sectionPlan = state.sectionPlan || {};
        state.semesterStart = state.semesterStart || fmt(new Date());
        state.points = typeof state.points==="number"?state.points:0;
        state.pointLog = Array.isArray(state.pointLog)?state.pointLog:[];
        state.redeems = Array.isArray(state.redeems)?state.redeems:[];
        if(!state.students || !Object.keys(state.students).length){
          state.students = { s1:{name:"学生1", data: defaultPerStudent()} };
          state.currentStudent = "s1";
        } else if(!state.students[state.currentStudent]){ state.currentStudent = Object.keys(state.students)[0]; }
        state.admin = keepAdmin; state.adminAuthed = keepAuthed;
        save(); rebuildAll(); render();
        toast("已从备份恢复全部数据 ✅");
      }catch(e){ toast("导入失败："+e.message); }
    };
    reader.onerror = ()=>{ toast("读取文件失败"); };
    reader.readAsText(file);
  }
  /* ---------- 多学生：结构/内容共用，学习数据各自独立 ---------- */
  // 随学生切换而独立保存的字段（进度、打卡范围、年级、习惯等）；custom/videos 等为共享内容
  const PER_STUDENT_FIELDS = ["grade","learned","fav","checkin","studySet","habits","habitLog","reviewed","semesterStart","wordQuiz","points","pointLog","redeems","mastery","sectionPlan","rules","orderMode"];
  function defaultPerStudent(){
    return { grade:"四年级", learned:{}, fav:{}, checkin:{}, studySet:{},
      habits:["房间卫生","早睡早起","学校作业"], habitLog:{}, reviewed:{}, semesterStart:fmt(new Date()), wordQuiz:{},
      points:0, pointLog:[], redeems:[], mastery:{}, sectionPlan:{}, rules:{}, orderMode:"seq" };
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
    applyPerStudent("s1"); // 把默认值（含 orderMode=seq）落到当前学生状态
  }else{
    applyPerStudent(state.currentStudent || Object.keys(state.students)[0]);
  }
  // 一次性迁移：2026秋新教材更换四年级上册单词表（word:182..264 槽位内容已完全不同，旧学习记录作废）
  // 其余年级索引未变（三年级下止于181、四年级下起于265），学习状态不受影响；新增27词落在数组末尾（word:1266..1292）。
  if(!state.migG4Words2026){
    const purgeKeys=(o)=>{ if(o&&typeof o==="object") for(let i=182;i<=264;i++) delete o["word:"+i]; };
    Object.keys(state.students||{}).forEach(id=>{
      const dd=(state.students[id]||{}).data; if(!dd) return;
      purgeKeys(dd.learned); purgeKeys(dd.fav); purgeKeys(dd.mastery);
      if(dd.reviewed&&typeof dd.reviewed==="object") Object.keys(dd.reviewed).forEach(t=>purgeKeys(dd.reviewed[t]));
    });
    purgeKeys(state.learned); purgeKeys(state.fav); purgeKeys(state.mastery);
    if(state.reviewed&&typeof state.reviewed==="object") Object.keys(state.reviewed).forEach(t=>purgeKeys(state.reviewed[t]));
    purgeKeys(state.overrides); purgeKeys(state.videos);
    state.migG4Words2026=true;
  }
  save(); // 首次即持久化多学生结构（含迁移）
  seedDefaultContent(); // 七年级历史第一单元学习指南（后台素材，可删除）
  rebuildAll(); // 用主数据 + 后台素材填充 ALL / INDEX
  function save(){
    syncPerStudent(); // 先把当前学生的进度/打卡/年级/习惯写入其独立快照
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    if(!_applyRemote) scheduleSyncPush(); // 云同步开启时，防抖推送（拉取落地阶段不触发，避免回环）
  }

  /* ---------- 云端同步（同源调用本站 /api/sync（Cloudflare Pages Function）；跨设备共享同一份数据） ---------- */
  // 关键：站点由 xuetang.201573.xyz（Pages）提供，/api/sync 就是本站自己的后端（同源，无需 CORS）。
  // 不用 *.workers.dev：该域名在国内网络普遍无法访问（用户实测连不上），故 SYNC_BASE 置空走同源。
  // 所有设备都从 xuetang.201573.xyz 打开站点 → 都读写同一个 KV（Pages 项目绑定的 SYNC_KV）→ 数据互通。
  var SYNC_BASE = "";
  // 同步密钥明文存本机（仅家长设备可见）；云端 key = SHA-256(密钥)；data 整包存取，last-write-wins 按 updatedAt 裁决
  var _pushTimer = null, _pushing = false, _applyRemote = false, _netFail = false;
  function cloudSyncEnabled(){ return !!(state.sync && state.sync.enabled && state.sync.pass); }
  function sha256Hex(str){
    try{
      if(window.crypto && window.crypto.subtle){
        return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
          .then(buf => Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join(""))
          .catch(()=>null); // digest 异常时不至于让整条同步链路抛未捕获错误
      }
    }catch(e){}
    return Promise.resolve(null); // 非安全上下文（http）无法用云同步
  }
  async function syncPush(){
    if(!cloudSyncEnabled() || _pushing) return;
    const k = await sha256Hex(state.sync.pass);
    if(!k){ toast("云同步需 https 环境"); return; }
    _pushing = true;
    try{
      const payload = JSON.stringify({ updatedAt: Date.now(), data: state });
      const r = await fetch(SYNC_BASE + "/api/sync?k="+encodeURIComponent(k), { method:"PUT", headers:{"content-type":"application/json"}, body: payload });
      if(r.ok){ const j = await r.json().catch(()=>({})); if(j && j.updatedAt) state.sync.at = j.updatedAt; return true; }
      console.warn("syncPush 失败", r && r.status); return false;
    }catch(e){ _netFail = true; return false; /* 离线/网络错误静默，下次保存或手动同步再试 */ }
    finally{ _pushing = false; }
  }
  function scheduleSyncPush(){ // 防抖：连续保存只推送一次
    if(!cloudSyncEnabled()) return;
    if(_pushTimer) clearTimeout(_pushTimer);
    _pushTimer = setTimeout(()=>{ _pushTimer=null; syncPush(); }, 800);
  }
  async function syncPull(){
    if(!cloudSyncEnabled()) return null;
    const k = await sha256Hex(state.sync.pass);
    if(!k) return null;
    try{
      const r = await fetch(SYNC_BASE + "/api/sync?k="+encodeURIComponent(k), { method:"GET" });
      if(!r.ok) return null;
      const j = await r.json().catch(()=>({}));
      if(!j || !j.data) return null;
      if((state.sync.at||0) >= (j.updatedAt||0)) return null; // 本地已是最新
      return j;
    }catch(e){ _netFail = true; return null; }
  }
  // 云端包白名单清洗：另一设备 / 旧版本推来的包可能缺字段或类型不对，直接覆盖会崩。
  // 就地修复常见畸形；完全不可用返回 null（调用方放弃本次拉取，保留本地数据）。
  function sanitizeRemoteData(d){
    if(!d || typeof d!=="object" || Array.isArray(d)) return null;
    const obj = (k, def)=>{ if(!d[k] || typeof d[k]!=="object" || Array.isArray(d[k])) d[k]=def; };
    obj("learned",{}); obj("fav",{}); obj("videos",{}); obj("overrides",{});
    obj("checkin",{}); obj("habitLog",{}); obj("reviewed",{});
    if(!Array.isArray(d.custom)) d.custom=[];
    if(!Array.isArray(d.habits)) delete d.habits; // 交给 applyStateDefaults 补默认
    if(!d.students || typeof d.students!=="object" || Array.isArray(d.students)) d.students=null; // null → ensureStudents 重建
    else Object.keys(d.students).forEach(k=>{
      const s=d.students[k];
      if(!s || typeof s!=="object" || Array.isArray(s)) d.students[k]={name:"", data:null};
      else if(!s.data || typeof s.data!=="object") s.data=null; // applyPerStudent 对空 data 兜底 defaultPerStudent
    });
    if(!d.sync || typeof d.sync!=="object" || Array.isArray(d.sync)) d.sync={enabled:false, pass:"", at:0};
    d.sync.enabled=!!d.sync.enabled;
    if(typeof d.sync.pass!=="string") d.sync.pass="";
    if(typeof d.sync.at!=="number" || !isFinite(d.sync.at)) d.sync.at=0;
    return d;
  }
  // 启动或手动触发：拉取云端更新（若更新则覆盖本地并重渲染）；返回是否发生了变化
  async function initCloudSync(){
    if(!cloudSyncEnabled()) return false;
    const j = await syncPull();
    if(j && j.data){
      const clean = sanitizeRemoteData(j.data);
      if(!clean) return false; // 云端包整体不可用 → 保留本地数据
      // 同步开关与密钥只留在本机：若被云端包覆盖，B 设备没开同步的推送会把本机同步静默关掉
      const localSync = {
        enabled: !!(state.sync && state.sync.enabled),
        pass: (state.sync && state.sync.pass) || "",
        at: (state.sync && state.sync.at) || 0
      };
      _applyRemote = true;
      try{
        state = clean;
        applyStateDefaults();        // 补齐缺省字段，防止旧包缺字段
        ensureStudents();            // 远端包可能缺 students，必须补齐，否则 save→syncPerStudent 会崩
        seedDefaultContent();        // 旧云端包可能早于新内置种子（如科学动画画廊）：拉取后重注入（按 key 幂等）
        state.adminAuthed = false;   // 拉取后回到未登录，需家长重新进后台
        state.sync = { enabled: localSync.enabled, pass: localSync.pass, at: j.updatedAt };
        rebuildAll();
        save();                      // 落地到本机（此时 _applyRemote=true 不会回推）
        refreshView();
      }catch(e){
        // 应用失败：回滚到本地存档，避免半套数据；并把原因抛给界面显示
        _applyRemote = false;
        try{
          const back = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
          if(back && typeof back==="object"){ state = back; applyStateDefaults(); ensureStudents(); rebuildAll(); }
        }catch(_e){}
        throw new Error("云端数据应用失败：" + ((e && e.message) || e));
      }
      _applyRemote = false;
      return true;
    }
    return false;
  }
  async function syncNow(){ // 手动「立即同步」：先拉（云更新本地），再推（本地改动上云）
    _netFail = false;
    if(!cloudSyncEnabled() && state.sync){ state.sync.enabled = true; }
    const pulled = await initCloudSync();
    const pushed = await syncPush();
    if(!pushed && _netFail && !pulled) throw new Error("连不上云端（网络/部署），稍后会随保存自动重试");
    return pulled;
  }

  /* ---------- 工具 ---------- */
  const $ = s => document.querySelector(s);
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function fmt(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
  function dateSeed(){ const d=new Date(); return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); }
  // 今日内容选取起点 = 日期 + 当前年级 + 当前学生。
  // 这样「今日学习」的诗词 / 成语 / 文言 / 数学等内容会随年级与学生切换而改变（英语单词本就按年级过滤）。
  function todaySeed(){
    let h=0; const s=(state.grade||"")+"#"+(state.currentStudent||"");
    for(let i=0;i<s.length;i++){ h=((h*131) + s.charCodeAt(i)) >>> 0; }
    return (dateSeed() + h) >>> 0;
  }
  function curStudentName(){ const s=state.students && state.students[state.currentStudent]; return (s&&s.name)?s.name:"学生"; }
  // 年级匹配：带 grade 的条目严格按当前年级显示；无 grade 的共享内容（未分级诗词 / 动画廊等）对所有年级可见。
  // 即：某年级没有该类型的分级内容时，这一栏就空着（不回退其他年级的内容）。
  function gradeOk(it){ return !it.grade || it.grade === state.grade; }
  // 是否已学（已打卡或已有星级评定）——供「已学/未学」筛选与进度统计复用
  function isLearnedKey(k){ return !!state.learned[k] || !!(state.mastery && state.mastery[k]!==undefined); }
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
      "单词":["#ecfdf5","#0d9488"],"应用题":["#fdf2f8","#db2777"],"计算题":["#ecfdf5","#0d9488"],
      "知识":["#ecfdf5","#059669"],"地理动画":["#fff7ed","#d97706"],"练习":["#fff7ed","#ea580c"],
      "史实":["#faf5ff","#9333ea"],"人物":["#fef2f2","#dc2626"]
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
    "人文":["#eef2ff","#4f46e5"],
    "生物":["#ecfdf5","#059669"],
    "地理":["#f0fdfa","#0d9488"],
    "政治":["#fef2f2","#dc2626"],
    "历史":["#faf5ff","#9333ea"],
    "物理":["#eff6ff","#2563eb"],
    "化学":["#fdf4ff","#c026d3"]
  };
  function subjectStyle(subject, on){
    const c = SUBJECT_COLORS[subject] || ["#f1f5f9","#475569"];
    return on ? `background:${c[1]};border-color:${c[1]};color:#fff`
              : `background:${c[0]};border-color:${c[0]};color:${c[1]}`;
  }
  // 学科归一：「历史」并入「人文」（资源页不再单列历史学科；biData 与 renderRes 共用，勿放函数内）
  function subjOf(x){ return (x.subject==="历史") ? "人文" : x.subject; }
  function toast(msg){
    const t=$("#toast"); t.textContent=msg; t.hidden=false;
    clearTimeout(t._tm); t._tm=setTimeout(()=>t.hidden=true, 2200);
  }
  function speak(text, lang){
    if(!window.speechSynthesis){ toast("当前浏览器不支持朗读"); return; }
    const u=new SpeechSynthesisUtterance(text); u.lang=lang; u.rate=0.85;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  // 去除 HTML 标签，得到纯文本预览（用于富文本卡片的正面摘要）
  function stripTags(s){ return String(s==null?"":s).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(); }
  // 富文本净化：仅保留内容展示所需标签，剥离脚本/事件属性/危险协议（防御性，内容本身可信）
  function sanitizeRich(html){
    let s = String(html||"");
    s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
    s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option|svg|math)\b[^>]*\/?>/gi, "");
    s = s.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "");
    s = s.replace(/\s+on\w+\s*=\s*'[^']*'/gi, "");
    s = s.replace(/(href|src)\s*=\s*("|')\s*(javascript|vbscript|data)\s*:[^"']*\2/gi, "");
    return s;
  }
  // 听力卡音频槽：默认显示「待上传」占位；若对应 mp3 已存在则升级为真实播放器（渐进增强）
  const _audioChecked = {};
  function upgradeListeningAudio(){
    const nodes = document.querySelectorAll("#modal-body .ls-audio[data-src]");
    nodes.forEach(node=>{
      const src = node.getAttribute("data-src");
      if(_audioChecked[src]===true){
        if(!node.querySelector("audio")) node.innerHTML = `<audio controls preload="none" src="${src}"></audio>`;
        return;
      }
      if(_audioChecked[src]===false){ return; }
      // 探测文件是否存在（静态资源；缺失返回 404）
      fetch(src, {method:"HEAD"})
        .then(r=>{
          _audioChecked[src] = r.ok;
          if(r.ok){ node.innerHTML = `<audio controls preload="none" src="${src}"></audio>`; node.classList.add("ls-audio-on"); }
          else { node.classList.add("ls-audio-missing"); }
        })
        .catch(()=>{ _audioChecked[src] = false; node.classList.add("ls-audio-missing"); });
    });
  }
  // 听力插图点击放大（一次性全局委托）
  if(!window.__lsZoomBound){
    document.addEventListener("click", e=>{
      const img = e.target.closest && e.target.closest(".ls-figs img");
      if(img && !img.classList.contains("ls-opt-img")){
        e.preventDefault();
        const ov = document.createElement("div");
        ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.82);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:zoom-out;";
        const big = document.createElement("img");
        big.src = img.getAttribute("src");
        big.style.cssText = "max-width:92vw;max-height:92vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);";
        ov.appendChild(big);
        ov.addEventListener("click", ()=>ov.remove());
        document.body.appendChild(ov);
      }
    });
    window.__lsZoomBound = true;
  }
  // 听力卡交互：选项点选高亮（单选/复选）、图片选项点选、对答案
  if(!window.__lsOptBound){
    document.addEventListener("click", e=>{
      const opt = e.target.closest && e.target.closest(".ls-opt");
      if(opt){
        e.preventDefault();
        if(opt.classList.contains("ls-multi")){
          opt.classList.toggle("ls-picked");
        } else {
          const q = opt.closest(".ls-q") || opt.parentElement;
          if(q) q.querySelectorAll(".ls-opt:not(.ls-multi)").forEach(o=>{ if(o!==opt) o.classList.remove("ls-picked"); });
          opt.classList.toggle("ls-picked");
        }
        return;
      }
      const imgopt = e.target.closest && e.target.closest(".ls-opt-img");
      if(imgopt){
        e.preventDefault();
        const box = imgopt.closest(".ls-figs-opt") || imgopt.parentElement;
        if(box) box.querySelectorAll(".ls-opt-img").forEach(o=>{ if(o!==imgopt) o.classList.remove("ls-picked"); });
        imgopt.classList.toggle("ls-picked");
        return;
      }
      const check = e.target.closest && e.target.closest(".ls-check");
      if(check){
        e.preventDefault();
        const ans = check.parentElement && check.parentElement.querySelector(".ls-answer");
        if(ans) ans.classList.toggle("ls-show");
        return;
      }
    });
    window.__lsOptBound = true;
  }
  // 首次启动：把内置指南/练习作为后台素材注入（按 grade 限定年级，可在后台删除；删除后不再重生）
  function seedDefaultContent(){
    const seeds = [
      {flag:"historyGuide", src:(typeof window!=="undefined" && window.HISTORY_GUIDE_7)||[]},
      {flag:"englishReading4v2", src:(typeof window!=="undefined" && window.ENGLISH_READING_4)||[]},
      {flag:"englishListening4v2", src:(typeof window!=="undefined" && window.ENGLISH_LISTENING_4)||[]},
      {flag:"scienceGallery", src:(typeof window!=="undefined" && window.SCIENCE_GALLERY)||[]}
    ];
    state.seeded = state.seeded || {};
    // 迁移：清理旧版「一页两篇」英语阅读卡（rd4:p*），避免用户本地新旧重复、新版不显示
    const oldReadingKeys = new Set((state.custom||[]).filter(x=>x.key && /^rd4:p\d+$/.test(x.key)).map(x=>x.key));
    if(oldReadingKeys.size){
      state.custom = (state.custom||[]).filter(x=>!(x.key && oldReadingKeys.has(x.key)));
      state.seeded.englishReading4 = false;   // 旧版标记作废
      state.seeded.englishReading4v2 = false;  // 确保重新注入新版
    }
    // 迁移（be）：v2 之前注入的 ls4 卡（ax 时代 5 篇试点等旧版）整体替换为 v2 全量 100 篇。
    // 背景：云端旧包带 englishListening4=true + 5 张旧卡 → seed 因 flag 跳过、自愈因"还有 ls4 卡"不触发，
    // 听力永远卡在 5 条。key 不变（ls4:1..100），学习进度按 key 保留；旧 flag 作废防云端旧包回退。
    if(!state.seeded.englishListening4v2){
      const staleLs4 = (state.custom||[]).filter(x=>x.key && /^ls4:\d+$/.test(x.key));
      if(staleLs4.length){
        state.custom = (state.custom||[]).filter(x=>!(x.key && /^ls4:\d+$/.test(x.key)));
      }
      state.seeded.englishListening4 = false;   // 旧版标记作废（含被云端包带回的情形）
    }
    const have = new Set((state.custom||[]).map(x=>x.key));
    seeds.forEach(s=>{
      // 自愈（ls4 专用）：旧版曾在听力脚本未加载时用空 src 置位 flag（污染），
      // 导致听力卡永远不再注入。flag 已置位但一张 ls4 卡都没有 → 清 flag 重新注入。
      if(s.flag==="englishListening4v2" && state.seeded[s.flag]
         && !((state.custom||[]).some(x=>x.key && /^ls4:\d+$/.test(x.key)))){
        state.seeded[s.flag] = false;
      }
      // 自愈（scienceGallery 通用）：flag 已置位但一张 sci: 卡都没有 → 清 flag 重新注入
      if(s.flag==="scienceGallery" && state.seeded[s.flag]
         && !((state.custom||[]).some(x=>x.key && /^sci:\d+$/.test(x.key)))){
        state.seeded[s.flag] = false;
      }
      if(state.seeded[s.flag]) return;
      if(!s.src.length) return;  // 源脚本未加载（缓存旧版/加载失败）：不置位 flag，等下次启动再试
      s.src.forEach(it=>{ if(it && it.key && !have.has(it.key)) (state.custom=state.custom||[]).push(it); });
      state.seeded[s.flag] = true;
    });
    save();
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
  // 抖音短链解析（尽力而为）：经公共 CORS 代理取跳转目标，提取视频 id。
  // 最可靠来源是 allorigins /get 返回的 status.url（= 最终跳转地址，天然含 /video/数字）。
  async function resolveDouyinShort(raw){
    const idOf = s=>{
      const m = s.match(/douyin\.com\/(?:video|note)\/(\d{10,25})/)
             || s.match(/iesdouyin\.com\/[^"'\s]*\/(?:video|note)\/(\d{10,25})/)
             || s.match(/\/share\/(?:video|note)\/(\d{10,25})/)
             || s.match(/"aweme_id":"(\d{10,25})"/);
      return m ? m[1] : null;
    };
    const enc = encodeURIComponent(raw);
    const targets = [
      "https://api.allorigins.win/get?url=" + enc,
      "https://api.allorigins.win/raw?url=" + enc,
      "https://corsproxy.io/?url=" + enc,
      "https://api.codetabs.com/v1/proxy?quest=" + enc
    ];
    for(const t of targets){
      try{
        const ctl = new AbortController();
        const tm = setTimeout(()=>ctl.abort(), 8000);   // 单个代理最多等 8 秒，避免卡住弹窗
        const r = await fetch(t, { signal: ctl.signal });
        clearTimeout(tm);
        const txt = await r.text();
        let blob = txt;
        try{ const j=JSON.parse(txt); blob = ((j.contents||"") + " " + ((j.status&&j.status.url)||"")); }catch(e){}
        const id = idOf(blob);
        if(id) return "https://www.douyin.com/video/" + id;
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
  // 导航按当前年级重建：小学显示 科学/人文，初中自动换成 生物·地理·政治·历史·物理·化学
  function renderNav(){
    const nav=$("#mainNav"); if(!nav) return;
    const items=[["home","首页"],["week","本周"],["reward","奖励"],
      ["语文","语文"],["数学","数学"],["英语","英语"],
      ...extraSubjects().map(s=>[s,s]),
      ["res","资源"],["admin","后台"]];
    nav.innerHTML=items.map(([v,l])=>`<button class="nav-btn" data-view="${v}">${l}</button>`).join("");
  }
  function setNav(name){
    renderNav();
    document.querySelectorAll("#mainNav .nav-btn").forEach(b=>{
      // 学科页（view.name==="subject"，param=学科名）也要高亮对应学科标签，与首页/本周/奖励一致
      b.classList.toggle("active", b.dataset.view===name
        || (name==="subject"&&b.dataset.view===view.param)
        || (name==="tag"&&b.dataset.view==="home")
        || (name==="search"&&b.dataset.view==="home")
        || (name==="admin"&&b.dataset.view==="admin"));
    });
  }

  /* ---------- 卡片模板 ---------- */
  function cardHTML(it, extraMeta){
    const learned = state.learned[it.key];
    const vids = itemVideos(it);
    const m = getMastery(it.key);
    const starHTML = m===null
      ? `<span class="mstar new">🔰 未学</span>`
      : `<span class="mstar ${m>=5?"full":(m<=2?"weak":"mid")}">${"★".repeat(m)}${"☆".repeat(5-m)}</span>`;
    return `<button class="card" data-key="${esc(it.key)}">
      ${learned?`<span class="learned-flag">✓ 已会</span>`:""}
      <div class="c-meta">${badge(it.type)}
        ${it.grade?`<span>#${esc(it.grade)}</span>`:""}
        ${it.volume?`<span>#${esc(it.volume)}</span>`:""}
        ${it.unit?`<span>#${esc(it.unit)}</span>`:""}
        ${extraMeta||""}
        ${it.html?`<span class="play">📖 图文</span>`:""}
        ${vids.length?`<span class="play">▶ ${it.type==="成语动画廊"||it.type==="地理动画"?"动画":"视频"}</span>`:""}
      </div>
      <div class="c-stars">${starHTML}</div>
      <h4>${esc(it.title)}</h4>
      ${it.sub?`<div class="c-sub">${esc(it.sub)}</div>`:""}
      ${it.html
        ? `<p class="c-body">${esc(stripTags(it.body).slice(0,64))}${stripTags(it.body).length>64?"…":""}</p>`
        : `<p class="c-body">${esc(it.body)}</p>`}
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
    const cus = CUSTOM.filter(c=>c.subject===subject && c.type===type && gradeOk(c));
    if(subject==="语文" && type==="诗词")  return [...POEMS.filter(gradeOk), ...cus];
    if(subject==="语文" && type==="成语")  return [...IDIOMS.filter(gradeOk), ...cus];
    if(subject==="语文" && type==="文言")  return [...WENYAN.filter(gradeOk), ...cus];
    if(subject==="语文" && type==="成语动画廊") return [...GALLERY.filter(gradeOk), ...cus];
    if(subject==="英语" && type==="单词")  return [...WORDS.filter(gradeOk), ...cus];
    // 数学·公式 / 数学·每日一练：整篇已按「一、二、三…」小节拆为单条（ALL），按当前年级过滤
    if(subject==="数学" && (type==="公式"||type==="每日一练")) return ALL.filter(c=>c.subject===subject && c.type===type && gradeOk(c));
    // 其余类型：后台自定义（已按年级过滤）+ 内置教材素材（按当前年级过滤）
    return [...cus, ...EXTRA.filter(c=>c.subject===subject && c.type===type && gradeOk(c))];
  }
  // 全年级池（不按 state.grade 过滤）：学习库弹窗的「年级筛选」用——默认当前年级，可切到其他年级扩大选择范围
  function poolForAll(subject, type){
    const cus = CUSTOM.filter(c=>c.subject===subject && c.type===type);
    if(subject==="语文" && type==="诗词")  return [...POEMS, ...cus];
    if(subject==="语文" && type==="成语")  return [...IDIOMS, ...cus];
    if(subject==="语文" && type==="文言")  return [...WENYAN, ...cus];
    if(subject==="语文" && type==="成语动画廊") return [...GALLERY, ...cus];
    if(subject==="英语" && type==="单词")  return [...WORDS, ...cus];
    if(subject==="数学" && (type==="公式"||type==="每日一练")) return ALL.filter(c=>c.subject===subject && c.type===type);
    return [...cus, ...EXTRA.filter(c=>c.subject===subject && c.type===type)];
  }
  // 今日任务池 = 本年级内容 + 用户在学习库显式「加入学习」的其他年级内容（年级筛选扩大选择范围后，加入的要能排进今日）
  function libPoolFor(subject, type){
    const pool = poolFor(subject, type);
    const has = new Set(pool.map(x=>x.key));
    const ss = state.studySet||{};
    const extra = poolForAll(subject, type).filter(it=>!has.has(it.key) && ss[it.key]);
    return extra.length ? pool.concat(extra) : pool;
  }
  /* ---------- 首页：今日学习 ---------- */
  // 今日任务：只包含今天（按周计划）排到的「学科·类型」，每类型按配额取条目（控制每日总量）
  function todayTasks(){
    const day = new Date().getDay();
    const plan = weekPlan();
    const tasks = {}; // key=学科·类型 → 今日条目数组
    (plan[day]||[]).forEach(({subject,type})=>{
      const key = checkinKey(subject,type);
      if(!sectionActive(subject,type)){ tasks[key]=[]; return; }
      const q = typeQuota(type);
      // 数学·每日一练：按天顺序轮转取 N 小节（循序渐进），跳过全会(5★)条目
      if(type==="每日一练"){
        const dp = libPoolFor(subject,type);
        if(!dp.length){ tasks[key]=[]; return; }
        const off = (Math.max(0, dayDiff(state.semesterStart)) * q) % dp.length;
        tasks[key] = seqSkipMastered(dp, off, q);
        return;
      }
      // 数学思维母题：一题一卡，按天从「均匀打散序列」轮转取 5 题，跳过全会(5★)
      if(type==="思维母题"){
        const mq = motherOrdered();
        if(!mq.length){ tasks[key]=[]; return; }
        const off = (Math.max(0, dayDiff(state.semesterStart)) * 5) % Math.max(1, mq.length);
        tasks[key] = seqSkipMastered(mq, off, 5);
        return;
      }
      // 其余类型（诗词/成语/单词/听力/阅读/文言/动画廊/小四门…）：
      // 按固定顺序（循序渐进）推进 + 掌握度加权（不会的加强、已会的降频）
      tasks[key] = sectionItems(subject, type, q);
    });
    return tasks;
  }
  // 今日目标集合：今日学习计划排到的条目（只有完成「目标内」的学会才计积分；
  // 在资源/语文页里随手标记学会只记录学习状态，不加分，防止刷分）
  function inTodayGoal(key){
    const tg = todayTasks();
    for(const k of Object.keys(tg)){
      if((tg[k]||[]).some(x=>x.key===key)) return true;
    }
    return false;
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
    const allTasks = Object.keys(tg).reduce((acc,k)=>acc.concat(tg[k]||[]), []);
    const studyDone = allTasks.filter(t=>state.learned[t.key]).length;
    const done = studyDone + habitDoneCnt;
    const total = allTasks.length + habits.length;
    const pct = total ? Math.round(done/total*100) : 0;
    // 学期进度（90 天）
    const semDay = Math.max(1, dayDiff(state.semesterStart)+1);
    const semWeek = Math.ceil(semDay/7);
    const todayDow = d.getDay();

    const learnedList = Object.keys(state.learned).map(k=>INDEX[k]).filter(Boolean);
    const todayList = learnedList.filter(it=>state.learned[it.key]===todayStr);
    const ptNet = pointTodayNet(); // 今日净分（正分-扣分），hero 徽章按净分展示

    // 热门标签（诗词标签词频 Top）
    const freq = {};
    POEMS.forEach(p=>(p.tags||[]).forEach(t=>freq[t]=(freq[t]||0)+1));
    const hot = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x[0]);

    // 按今天的周计划分组渲染（一天只安排计划内的类型，主课多、副课少）
    const dayPlan = weekPlan()[todayDow] || [];
    const bySub = {};
    dayPlan.forEach(s=>{ (bySub[s.subject]=bySub[s.subject]||[]).push(s.type); });
    const order = allSubjects();
    const taskBlocks = order.map(sub=>{
      const types = bySub[sub] || [];
      const blocks = types.map(t=>{
        const list = tg[checkinKey(sub,t)]||[];
        if(!list.length) return "";
        const ck = checkinKey(sub,t);
        const sp = sectionPlanOf(ck);
        const pool = poolFor(sub,t);
        const total = pool.length;
        const lc = pool.filter(x=>state.learned[x.key]).length;
        const pctSec = total? Math.round(lc/total*100):0;
        const todayStr = fmt(new Date());
        const startTxt = sp.start || state.semesterStart;
        const freq = sp.freq || weekFreqOf(sub,t);
        const proj = total? addDays(startTxt, Math.ceil(total/(typeQuota(t)*Math.max(1,freq)))*7) : startTxt;
        const statusTxt = (!sp.start||todayStr>=sp.start) && (!sp.end||todayStr<=sp.end)
          ? (total && lc>=total ? "已通关 🎉" : `已学 ${lc}/${total}`)
          : (sp.start && todayStr<sp.start ? `未开始（${sp.start} 起）` : `已结课（${sp.end} 止）`);
        return `<div class="sec-title">${sub} · ${t} <small>${statusTxt} · 开始 ${startTxt} · 预计 ${proj}</small></div>
          <div class="sec-prog"><div class="sec-prog-fill" style="width:${pctSec}%"></div></div>
          <div class="task-grid">${list.map(x=>cardHTML(x)).join("")}</div>`;
      }).join("");
      return blocks;
    }).join("");
    if(!taskBlocks) taskBlocks = `<div class="placeholder" style="padding:20px 16px">当前未勾选任何打卡内容，去「📊 本周 → 📖 学习库」开启板块的打卡开关。</div>`;

    const last = state.lastKey ? INDEX[state.lastKey] : null;

    el.innerHTML = `
      <div class="hero">
        <div>
          <h2>今日学习</h2>
          <p>${d.getMonth()+1} 月 ${d.getDate()} 日 星期${WEEK[d.getDay()]} · 🙋 ${esc(curStudentName())} · ${esc(state.grade)} · 学期第 ${semDay} 天 / ${SEMESTER_DAYS}（第 ${semWeek} 周） · 共 ${total} 项任务</p>
          <div style="margin-top:6px"><span class="badge" style="${ptNet<0?"background:#fee2e2;color:#b91c1c":"background:#fef3c7;color:#b45309"}">🏆 今日 ${sgn(ptNet)} 分</span>${penaltyToday()?` <span class="badge" style="background:#fee2e2;color:#b91c1c">⚠️ 今日扣分 -${penaltyToday()} 分</span>`:""} <span class="badge" style="background:#f1f5f9;color:#475569">累计 ${state.points} 分</span> <span class="badge" style="background:#f1f5f9;color:#475569">连续 ${currentStreak()} 天</span> <span class="badge" style="background:#eef2ff;color:#3730a3">🎁 兑奖在「奖励」页</span></div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="badge" style="background:#eef2ff;color:#3730a3">📐 卡片顺序</span>
            <button class="chip ${state.orderMode!=="smart"?"on":""}" data-order-toggle="seq">顺序（按导入序）</button>
            <button class="chip ${state.orderMode==="smart"?"on":""}" data-order-toggle="smart">智能（弱项优先）</button>
            <span style="font-size:12px;color:var(--muted)">顺序模式严格按资源导入次序，前后感更清晰；智能模式会把没掌握好的往前排</span>
          </div>
        </div>
        <div class="done" style="min-width:180px;">
          已完成 ${done} / ${total}
          <div class="pbar"><div class="pfill" style="width:${pct}%"></div></div>
        </div>
      </div>

      <div class="sec-title">⏰ 今日习惯 <small>${habitDoneCnt}/${habits.length} · 点击勾选，每天养成一点点 · 周跟踪在「📊 本周」页</small></div>
      <div class="habit-list">
        ${habits.map(h=>`<div class="habit ${habitDone(h)?"on":""}" data-habit="${esc(h)}"><span class="hk">${habitDone(h)?"✓":"○"}</span><span class="hn">${esc(h)}</span><button class="hx" data-habit-del="${esc(h)}" title="删除该习惯">✕</button></div>`).join("")}
        <span style="flex:1"></span>
        <input id="habitNew" class="search-input" style="width:150px" placeholder="添加习惯…" />
        <button class="chip" data-habit-add>＋ 添加</button>
      </div>

      <div class="sec-title">⚠️ 今日行为扣分 <small>点击即扣 · 不可撤销 · 只扣行为不扣学习 · 同一项每天只记一次 · 每日上限 ${penaltyCapDay()} 分</small></div>
      <div class="chips pen-chips">
        ${penaltyList().map(p=>`<button class="chip pen-chip" data-pen="${esc(p.id)}" title="${esc(p.tip||"")}（-${p.cost} 分）">${esc(p.icon||"⚠️")} ${esc(p.name)} <b>-${p.cost}</b></button>`).join("")}
      </div>
      ${penaltyLogToday().length?`
      <div class="pen-home-list">
        ${penaltyLogToday().map(e=>{
          const pid=String(e.hook||"").split(":")[1];
          const p=(state.penalties||[]).find(x=>x.id===pid) || DEFAULT_PENALTIES.find(x=>x.id===pid);
          return `<div class="pen-home-item">
            <span class="pen-ic">${esc((p&&p.icon)||"⚠️")}</span>
            <span class="pen-nm">${esc((e.note||"").replace("行为扣分 · ",""))}</span>
            <span class="pen-val">-${ -e.n }</span>
          </div>`;
        }).join("")}
      </div>`
      :`<p class="af-tip" style="margin-top:2px">今天还没有扣分记录 · 表现不错 👍</p>`}

      <div class="sec-title">📌 今日任务（按周计划） <small>周${WEEK[todayDow]} · 共 ${dayPlan.length} 类 · 点击卡片开始学习</small></div>
      ${taskBlocks}

      <details class="sec-collapse">
        <summary>✅ 今日完成 <span class="sc-cnt">已打卡 ${todayList.length} 项 · 点击展开</span></summary>
        <div class="task-grid" style="margin-top:10px">${todayList.map(t=>cardHTML(t)).join("")}</div>
      </details>
      ${todayList.length?"":`<div class="placeholder" style="padding:20px 16px">今天还没有打卡，从上方「今日任务」开始第一项吧 🚀</div>`}

      ${reviews.length?`
      <div class="sec-title">🔁 艾宾浩斯复习 <small>到期 ${reviews.length} 项 · 按遗忘曲线安排（不会的更密、全会的更稀）· 全部记录在「📊 本周」页</small></div>
      <div class="task-grid">${reviews.map(r=>cardHTML(r,`<span class="badge" style="background:#fff7ed;color:#ea580c">🔁 到期复习</span>`)).join("")}</div>`:""}

      ${last?`
      <div class="sec-title">▶ 继续学习 <small>上次打开</small></div>
      <div class="task-grid">${cardHTML(last)}</div>`:""}

      <div class="sec-title">🔥 热门标签 <small>来自 ${POEMS.length} 首诗词 · 点击直达专题</small></div>
      <div class="tagcloud">${hot.map(t=>`<button class="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}</div>

      <div class="sec-title">🧭 内容直达 <small>快速进入各类型</small></div>
      <div class="tagcloud">
        <button class="tag" data-cn-type="成语">🀄 全部成语</button>
        <button class="tag" data-cn-type="成语动画廊">🎬 成语动画</button>
        <button class="tag" data-goto-subject="英语">🔤 英语单词</button>
        <button class="tag" data-goto-subject="英语">📖 英语阅读</button>
      </div>
    `;
  }

  /* ---------- 本周页：复习 · 看板 · 周计划（与今日任务分页，避免首页过挤） ---------- */
  /* ---------- 学习目标进度（只统计「加入学习」的条目）---------- */
  // 学习库（本周页）里每个条目可「加入学习」；只有加入的才计入这里的目标进度
  function weekGoalData(){
    const isDone = key => !!state.learned[key] || !!(state.mastery && state.mastery[key]!==undefined);
    const keys = Object.keys(state.studySet||{}).filter(k=>state.studySet[k]);
    const bySec = {};
    keys.forEach(k=>{
      const it = INDEX[k]; if(!it) return;
      const sk = it.subject+"·"+it.type;
      (bySec[sk]=bySec[sk]||{subject:it.subject, type:it.type, items:[]});
      bySec[sk].items.push({ it, done: isDone(it.key), at: state.learned[it.key]||"" });
    });
    const out = Object.values(bySec).map(sec=>{
      sec.items.sort((a,b)=> (a.done===b.done) ? 0 : (a.done?1:-1)); // 未学排前
      return { subject:sec.subject, type:sec.type, items:sec.items, done: sec.items.filter(x=>x.done).length, total: sec.items.length };
    }).filter(s=>s.total>0);
    return {
      sections: out,
      total: out.reduce((a,s)=>a+s.total,0),
      done: out.reduce((a,s)=>a+s.done,0)
    };
  }
  /* ---------- 学习库数据：本学期（当前年级）全部「学科·类型」板块 ---------- */
  // 板块来源：内置穷举（SUBJECT_TYPES）+ 后台自定义素材实际用到的「学科·类型」；只列有内容的板块
  // 每板块：total=该年级内容池总数（与科目页数字同源 poolFor）、done=已学、joined=已加入学习目标
  function studyLibData(){
    const secs = [];
    const push = (subject,type)=>{ if(!secs.some(x=>x.subject===subject&&x.type===type)) secs.push({subject,type}); };
    CHECKIN_TYPES.forEach(({subject,type})=>push(subject,type));
    [...CUSTOM, ...EXTRA].forEach(c=>{ if(c.subject && c.type) push(c.subject, c.type); });
    const isDone = key => !!state.learned[key] || !!(state.mastery && state.mastery[key]!==undefined);
    const out = secs.map(sec=>{
      let pool=[]; try{ pool=poolFor(sec.subject, sec.type); }catch(e){ pool=[]; }
      const items = pool.map(it=>({ it, done: isDone(it.key), at: state.learned[it.key]||"", joined: !!(state.studySet&&state.studySet[it.key]) }));
      // joined 按全年级口径：学习库弹窗可切年级扩大选择范围，加入的其他年级内容也要计入「目标内」与打卡 pill
      let poolAll=[]; try{ poolAll=poolForAll(sec.subject, sec.type); }catch(e){ poolAll=pool; }
      const joinedAll = poolAll.filter(it=>state.studySet&&state.studySet[it.key]).length;
      return { subject:sec.subject, type:sec.type, items,
        done: items.filter(x=>x.done).length, total: items.length,
        joined: joinedAll };
    }).filter(s=>s.total>0);
    // 排序：主课（语数英）在前，其余按名称；与科目导航顺序观感一致
    const order = ["语文","数学","英语"];
    out.sort((a,b)=>{
      const ia=order.indexOf(a.subject), ib=order.indexOf(b.subject);
      if(ia!==ib) return (ia<0?98:ia)-(ib<0?98:ib);
      return a.subject===b.subject ? a.type.localeCompare(b.type,"zh") : a.subject.localeCompare(b.subject,"zh");
    });
    return { sections: out, total: out.reduce((a,s)=>a+s.total,0), done: out.reduce((a,s)=>a+s.done,0), joined: out.reduce((a,s)=>a+s.joined,0) };
  }
  // 明细弹窗：按板块分组列出已加入学习目标的条目（已学/未学）；点击条目可打开卡片详情
  function openWeekGoal(){
    const data = weekGoalData();
    $("#modal-body").innerHTML = `
      <div class="m-type">🎯 学习目标明细</div>
      <div style="margin:6px 0 12px;font-size:14px;color:#475569">
        共 <strong>${data.total}</strong> 项目标 · 已学 <strong style="color:#15803d">${data.done}</strong> · 未学 <strong style="color:#b91c1c">${data.total-data.done}</strong>
        ${data.total?"":"· 还没有加入任何学习内容，去下方「📖 学习库」把要学的内容「加入学习」"}
        （统计已「加入学习」的内容，可含其他年级——在学习库板块弹窗里切换年级即可扩大选择范围）
      </div>
      ${data.sections.map(s=>`
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
            <div style="font-weight:700">${esc(s.subject)} · ${esc(s.type)}</div>
            <div style="font-size:13px;color:#475569">已学 ${s.done} / ${s.total}</div>
          </div>
          <div class="pbar" style="margin:0 0 8px"><div class="pfill" style="width:${s.total?Math.round(s.done/s.total*100):0}%"></div></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${s.items.map(x=>`
              <button class="tag" data-wg-key="${esc(x.it.key)}" title="${x.done?("已学："+x.at):"未学"}"
                style="cursor:pointer;${x.done?"background:#ecfdf5;border-color:#a7f3d0;color:#15803d;":"background:#fff1f2;border-color:#fecdd3;color:#be123c;"}">
                ${esc(stripTags(x.it.title||x.it.name||x.it.key)).slice(0,18)}${x.done?" ✓":" ·"}
              </button>`).join("")}
          </div>
        </div>`).join("")}
    `;
    $("#modal-body").querySelectorAll("[data-wg-key]").forEach(b=>{
      b.addEventListener("click", ()=>{ const it=INDEX[b.dataset.wgKey]; if(it) openModal(it); });
    });
    $("#modal").hidden=false; document.body.style.overflow="hidden";
  }

  // 学习库板块管理弹窗：该「学科·类型」的内容，按年级筛选查看/「加入学习/移出」
  // 默认只列当前年级（与科目页数字一致）；可切换到其他年级扩大选择范围，加入后计入学习目标并排进今日学习
  // gradeSel：null/undefined=当前年级；"__all"=全部年级；其余=具体年级名
  function openLibSection(subject,type){
    const sec = studyLibData().sections.find(s=>s.subject===subject&&s.type===type);
    if(!sec){ toast("该板块暂无内容"); return; }
    renderLibModal(subject, type, null); // 每次打开重置为当前年级
  }
  function renderLibModal(subject, type, gradeSel){
    const all = poolForAll(subject, type);
    const g = gradeSel || state.grade;
    const shown = (g==="__all") ? all : all.filter(it=>!it.grade || it.grade===g);
    const isDone = key => !!state.learned[key] || !!(state.mastery && state.mastery[key]!==undefined);
    const items = shown.map(it=>({ it, done:isDone(it.key), joined:!!(state.studySet&&state.studySet[it.key]) }));
    const joinedAll = all.filter(it=>state.studySet&&state.studySet[it.key]).length;
    // 年级 chips：本年级（默认）→ 其他有内容的年级 → 全部年级
    const otherGrades = GRADES.filter(x=>x!==state.grade && all.some(it=>it.grade===x));
    const cntCur = all.filter(it=>!it.grade || it.grade===state.grade).length;
    const gLabel = (g==="__all") ? "全部年级" : esc(g);
    $("#modal-body").innerHTML = `
      <div class="m-type">📖 ${esc(subject)} · ${esc(type)} <span style="font-size:12px;color:#475569">（学习库 · 默认当前年级「${esc(state.grade)}」与科目页数字一致 · 可切换年级扩大选择范围）</span></div>
      <div style="margin:6px 0 12px;font-size:14px;color:#475569">
        <span style="font-size:13px;color:#334155">年级筛选：</span>
        <button class="chip ${g===state.grade?"on":""}" data-lib-grade="${esc(state.grade)}" title="当前年级的内容（与科目页一致）">${esc(state.grade)}（本年级）${cntCur}</button>
        ${otherGrades.map(x=>`<button class="chip ${g===x?"on":""}" data-lib-grade="${esc(x)}" title="查看${esc(x)}的内容，可加入学习扩大范围">${esc(x)} ${all.filter(it=>it.grade===x).length}</button>`).join("")}
        ${otherGrades.length?`<button class="chip ${g==="__all"?"on":""}" data-lib-grade="__all" title="查看全部年级的内容">全部年级 ${all.length}</button>`:""}
      </div>
      <div style="margin:0 0 12px;font-size:14px;color:#475569">
        共 <strong>${items.length}</strong> 项（${gLabel}）· 已学 <strong style="color:#15803d">${items.filter(x=>x.done).length}</strong> · 已加入学习目标 <strong style="color:#4f46e5">${items.filter(x=>x.joined).length}</strong>${joinedAll>items.filter(x=>x.joined).length?`（全部年级共 ${joinedAll}）`:""}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn primary" data-study-all="1">＋ 全部加入学习</button>
        <button class="btn" data-study-all="0">↩ 全部移出</button>
        <span class="af-tip" style="align-self:center">只有「加入学习」的内容才计入「🎯 学习目标」进度</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${items.map(x=>`
          <span class="tag" style="cursor:default;display:inline-flex;align-items:center;gap:4px;${x.done?"background:#ecfdf5;border-color:#a7f3d0;color:#15803d;":(x.joined?"background:#eef2ff;border-color:#c7d2fe;color:#3730a3;":"background:#f8fafc;border-color:#e2e8f0;color:#475569;")}">
            <button class="tag-btn" data-lib-key="${esc(x.it.key)}" title="点击查看详情" style="all:unset;cursor:pointer;${x.done?"color:#15803d;":""}">${x.it.grade && x.it.grade!==state.grade?`<span style="opacity:.65;font-size:11px;margin-right:2px">${esc(x.it.grade)}</span>`:""}${esc(stripTags(x.it.title||x.it.name||x.it.key)).slice(0,18)}${x.done?" ✓":""}</button>
            <button class="tag-btn" data-study-toggle="${esc(x.it.key)}" title="${x.joined?"移出学习目标":"加入学习目标"}" style="all:unset;cursor:pointer;font-weight:700">${x.joined?"✓":"＋"}</button>
          </span>`).join("")}
      </div>
      <p class="af-tip" style="margin-top:12px">绿色=已学（带完成日期）· 蓝色=已加入学习目标 · 灰=未加入；点条目名查看详情，点右侧 ＋/✓ 加入或移出。切换到其他年级即可扩大选择范围，加入的其他年级内容会计入学习目标，并排进该板块的今日学习。</p>
    `;
    const mb=$("#modal-body");
    mb.querySelectorAll("[data-lib-key]").forEach(b=>{
      b.addEventListener("click", ()=>{ const it=INDEX[b.dataset.libKey]; if(it) openModal(it); });
    });
    mb.querySelectorAll("[data-lib-grade]").forEach(b=>b.addEventListener("click", ()=>{
      renderLibModal(subject, type, b.dataset.libGrade);
    }));
    mb.querySelectorAll("[data-study-toggle]").forEach(b=>b.addEventListener("click", ()=>{
      const k=b.dataset.studyToggle;
      state.studySet = state.studySet || {};
      if(state.studySet[k]) delete state.studySet[k]; else state.studySet[k]=true;
      save();
      renderLibModal(subject, type, g);
      refreshView();
    }));
    const allBtn = mb.querySelector('[data-study-all="1"]'), noneBtn = mb.querySelector('[data-study-all="0"]');
    if(allBtn) allBtn.addEventListener("click", ()=>{
      state.studySet = state.studySet || {};
      items.forEach(x=>{ state.studySet[x.it.key]=true; });
      save(); renderLibModal(subject, type, g); refreshView();
      toast(`已把「${gLabel}」的 ${items.length} 项加入学习目标 🎯`);
    });
    if(noneBtn) noneBtn.addEventListener("click", ()=>{
      state.studySet = state.studySet || {};
      items.forEach(x=>{ delete state.studySet[x.it.key]; });
      save(); renderLibModal(subject, type, g); refreshView();
      toast("已全部移出学习目标");
    });
    $("#modal").hidden=false; document.body.style.overflow="hidden";
  }

  /* ---------- 学习日历（月历视图：每天格子显示学会条数，点击看当天学习内容） ---------- */
  let calY=null, calM=null; // 当前日历展示的年月（默认进入本周页时为当月）
  function renderCalGrid(){
    const box = $("#calBox"); if(!box) return;
    if(calY===null){ const t=new Date(); calY=t.getFullYear(); calM=t.getMonth(); }
    const startDow = (new Date(calY, calM, 1).getDay()+6)%7; // 周一=0
    const daysInMonth = new Date(calY, calM+1, 0).getDate();
    const byDate = {};
    Object.keys(state.learned||{}).forEach(k=>{ const dt=state.learned[k]; if(dt){ (byDate[dt]=byDate[dt]||[]).push(k); } });
    const todayStr = fmt(new Date());
    let cells = "";
    for(let i=0;i<startDow;i++) cells += `<div class="cal-cell empty"></div>`;
    for(let dn=1; dn<=daysInMonth; dn++){
      const ds = calY+"-"+String(calM+1).padStart(2,"0")+"-"+String(dn).padStart(2,"0");
      const c = (byDate[ds]||[]).length;
      cells += `<button class="cal-cell ${ds===todayStr?"today":""} ${c?"has":""}" data-cal-day="${ds}" title="${ds}${c?(" · 学会 "+c+" 条"):""}">
        <span class="cal-d">${dn}</span>${c?`<span class="cal-c">${c}</span>`:""}</button>`;
    }
    box.innerHTML = `
      <div class="cal-head">
        <button class="btn" id="calPrev" title="上个月">‹</button>
        <b>${calY} 年 ${calM+1} 月</b>
        <button class="btn" id="calNext" title="下个月">›</button>
        <span style="flex:1"></span>
        <button class="btn" id="calToday">回到本月</button>
      </div>
      <div class="cal-grid">
        ${["一","二","三","四","五","六","日"].map(x=>`<div class="cal-dow">周${x}</div>`).join("")}
        ${cells}
      </div>`;
    const p=$("#calPrev"), n=$("#calNext"), t=$("#calToday");
    if(p) p.onclick=()=>{ calM--; if(calM<0){calM=11;calY--;} renderCalGrid(); };
    if(n) n.onclick=()=>{ calM++; if(calM>11){calM=0;calY++;} renderCalGrid(); };
    if(t) t.onclick=()=>{ const dt=new Date(); calY=dt.getFullYear(); calM=dt.getMonth(); renderCalGrid(); };
    box.querySelectorAll("[data-cal-day]").forEach(b=>b.addEventListener("click",()=>openCalDay(b.dataset.calDay)));
  }
  // 某天的学习内容明细：当天学会的条目（可点进卡片）+ 习惯完成 + 当天计划板块
  function openCalDay(ds){
    const items = Object.keys(state.learned||{}).filter(k=>state.learned[k]===ds).map(k=>INDEX[k]).filter(Boolean);
    const habits = state.habits||[];
    const hdone = habits.filter(h=>state.habitLog[ds]&&state.habitLog[ds][h]);
    const p=ds.split("-").map(Number), dow=new Date(p[0],p[1]-1,p[2]).getDay();
    const plan = weekPlan()[dow]||[];
    $("#modal-body").innerHTML = `
      <div class="m-type">📅 ${esc(ds)} 学习内容</div>
      <div style="margin:6px 0 12px;font-size:14px;color:#475569">
        当天学会 <strong style="color:#15803d">${items.length}</strong> 条 · 习惯完成 <strong>${hdone.length}/${habits.length}</strong>
        ${plan.length?` · 计划板块：${plan.map(s=>esc(s.subject)+"·"+esc(s.type)).join("、")}`:""}
      </div>
      ${items.length?`
        <div style="font-weight:700;margin-bottom:8px">✅ 当天学会</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
          ${items.map(it=>`
            <button class="tag" data-cal-key="${esc(it.key)}" title="点击查看详情"
              style="cursor:pointer;background:#ecfdf5;border-color:#a7f3d0;color:#15803d;">
              ${esc(stripTags(it.title||it.name||it.key)).slice(0,20)}
            </button>`).join("")}
        </div>`
        :`<div class="placeholder" style="padding:14px 16px;margin-bottom:16px">当天没有打卡记录</div>`}
      ${habits.length?`
        <div style="font-weight:700;margin-bottom:8px">⏰ 习惯完成（${hdone.length}/${habits.length}）</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
          ${habits.map(h=>`<span class="tag" style="cursor:default;${(state.habitLog[ds]&&state.habitLog[ds][h])?"background:#ecfdf5;border-color:#a7f3d0;color:#15803d;":"background:#f8fafc;border-color:#e2e8f0;color:#94a3b8;"}">${(state.habitLog[ds]&&state.habitLog[ds][h])?"✓ ":"○ "}${esc(h)}</span>`).join("")}
        </div>`:""}
      ${plan.length?`
        <div style="font-weight:700;margin-bottom:8px">📋 当天计划板块</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${plan.map(s=>{ const c=SUBJECT_COLORS[s.subject]||["#f1f5f9","#475569"];
            return `<span class="tag" style="cursor:default;background:${c[0]};color:${c[1]};border:1px solid ${c[0]}">${esc(s.subject)}·${esc(s.type)}</span>`; }).join("")}
        </div>`:""}
    `;
    $("#modal-body").querySelectorAll("[data-cal-key]").forEach(b=>{
      b.addEventListener("click", ()=>{ const it=INDEX[b.dataset.calKey]; if(it) openModal(it); });
    });
    $("#modal").hidden=false; document.body.style.overflow="hidden";
  }

  function renderWeek(){
    const el = $("#view-week");
    const d = new Date();
    const todayStr = fmt(d);
    const reviews = dueReviews();
    const habits = state.habits || [];
    const habitDoneCnt = habits.filter(habitDone).length;
    const reviewDoneCnt = reviews.filter(r=>!!(state.reviewed[todayStr]&&state.reviewed[todayStr][r.key])).length;
    const tg = todayTasks();
    const allTasks = Object.keys(tg).reduce((acc,k)=>acc.concat(tg[k]||[]), []);
    const semDay = Math.max(1, dayDiff(state.semesterStart)+1);
    const semWeek = Math.ceil(semDay/7);
    const todayDow = d.getDay();

    // 看板数据
    const learnedList = Object.keys(state.learned).map(k=>INDEX[k]).filter(Boolean);
    const todayList = learnedList.filter(it=>state.learned[it.key]===todayStr);
    const weekList = learnedList.filter(it=>dayDiff(state.learned[it.key])<7);
    const subjCount=(list,s)=>list.filter(it=>it.subject===s).length;
    const SUBJ=allSubjects();
    const weekDays=[];
    for(let i=6;i>=0;i--){ const dd=new Date(); dd.setDate(dd.getDate()-i); const ds=fmt(dd); weekDays.push({ds, c:learnedList.filter(it=>state.learned[it.key]===ds).length}); }
    const wkDates = weekDatesMondayStart();
    // 学习目标进度（只统计学习库里「加入学习」的条目）
    const goal = weekGoalData();
    const lib = studyLibData();
    // 本周行为扣分记录（与习惯周跟踪放一起）
    const penWeek = penaltyLogWeek();
    const penWkTotal = penWeek.reduce((a,b)=>a-b.n,0); // 本周共扣（净分用）
    const ptNet = pointTodayNet(), pwNet = pointWeekNet(); // 今日/本周净分（正分-扣分）

    el.innerHTML = `
      <div class="hero">
        <div>
          <h2>📊 本周学习</h2>
          <p>🙋 ${esc(curStudentName())} · ${esc(state.grade)} · 学期第 ${semDay} 天 / ${SEMESTER_DAYS}（第 ${semWeek} 周） · 复习到期 ${reviews.length} 项（已完成 ${reviewDoneCnt}） · 今日 <b style="${ptNet<0?"color:#b91c1c":"color:#15803d"}">${sgn(ptNet)}</b>${penaltyToday()&&pointToday()>0?` <span style="font-size:12px;color:#b91c1c">（扣 ${penaltyToday()}）</span>`:""} · 本周 <b style="${pwNet<0?"color:#b91c1c":""}">${sgn(pwNet)}</b>${penWkTotal&&pointWeek()>0?` <span style="font-size:12px;color:#b91c1c">（扣 ${penWkTotal}）</span>`:""} · 累计 <b>${state.points}</b> 分</p>
        </div>
        <div class="done" style="min-width:180px;">
          今日复习 ${reviewDoneCnt} / ${reviews.length}
          <div class="pbar"><div class="pfill" style="width:${reviews.length?Math.round(reviewDoneCnt/reviews.length*100):100}%"></div></div>
        </div>
      </div>

      <div class="sec-title">🎯 学习目标 <small>只有「加入学习」的内容才计入进度 · 点击卡片查看明细</small></div>
      <div class="stat-strip" id="wkGoalCard" style="cursor:pointer" title="点击查看学习目标明细">
        <div class="stat"><div class="num">${goal.total}</div><div class="lbl">目标总量</div></div>
        <div class="stat"><div class="num" style="color:#15803d">${goal.done}</div><div class="lbl">已学习</div></div>
        <div class="stat"><div class="num" style="color:#be123c">${goal.total-goal.done}</div><div class="lbl">未学习</div></div>
        <div class="stat" style="flex:2;min-width:220px">
          <div class="lbl" style="margin-bottom:4px">目标完成率 ${goal.total?Math.round(goal.done/goal.total*100):0}%</div>
          <div class="pbar" style="margin:0"><div class="pfill" style="width:${goal.total?Math.round(goal.done/goal.total*100):0}%"></div></div>
        </div>
      </div>

      <div class="sec-title">🔁 艾宾浩斯复习 <small>${reviews.length?`到期 ${reviews.length} 项 · 按遗忘曲线 1/2/4/7/15 天安排`:"今天没有到期复习，保持就好"}</small></div>
      ${reviews.length?`<div class="task-grid">${reviews.map(r=>cardHTML(r,`<span class="badge" style="background:#fff7ed;color:#ea580c">🔁 到期复习</span>`)).join("")}</div>`
        :`<div class="placeholder" style="padding:14px 16px">先学新内容，之后这里会自动安排复习 📈</div>`}

      <div class="sec-title">📖 学习库 <small>本学期全部学习内容（与科目页数字一致）· 只有进去把内容「加入学习」后才计入上方目标、并进入打卡范围 · 点卡片进去选择</small></div>
      <div class="stat-strip">
        ${lib.sections.map(s=>{
          const ck = s.joined>0; // 打卡范围 = 已「加入学习」的内容；没选中就不算打卡中
          return `
          <div class="stat lib-sec" style="cursor:pointer" data-lib-sec="${esc(s.subject)}·${esc(s.type)}" title="点击管理「${esc(s.subject)}·${esc(s.type)}」的学习内容">
            <div class="num">${s.total}</div>
            <div class="lbl">${esc(s.subject)}·${esc(s.type)}</div>
            <div class="lib-meta">已学 ${s.done}${s.joined?` · 目标内 ${s.joined}`:""}</div>
            <button class="chip lib-ck" style="${subjectStyle(s.subject, ck)}" title="${ck?`已加入学习 ${s.joined} 条 · 正处打卡范围 · 点击进去管理`:"还没有加入学习的内容 · 点击进去选择（加入后才进入打卡范围）"}">${ck?"✓ 打卡中":"＋ 加入打卡"}</button>
          </div>`;}).join("")}
        ${lib.sections.length?"":`<div class="placeholder" style="padding:14px 16px;width:100%">当前年级暂无学习内容；内容由科目页 / 后台添加后自动归集到这里。</div>`}
      </div>

      <div class="sec-title">📊 学习看板 <small>打卡与积分概览（今日 / 本周）· 积分按净分展示，行为扣分已减入今日/本周总分，扣分明细见下方记录区</small></div>
      <div class="dash-grid">
        <div class="dash-card"><div class="dc-name">🏆 积分</div>
          <div class="dc-row"><span>今日</span><b${ptNet<0?' style="color:#b91c1c"':""}>${sgn(ptNet)}${penaltyToday()&&pointToday()>0?` <span style="color:#b91c1c;font-size:13px">（扣 ${penaltyToday()}）</span>`:""}</b></div>
          <div class="dc-row"><span>本周</span><b${pwNet<0?' style="color:#b91c1c"':""}>${sgn(pwNet)}${penWkTotal&&pointWeek()>0?` <span style="color:#b91c1c;font-size:13px">（扣 ${penWkTotal}）</span>`:""}</b></div>
          <div class="dc-row"><span>累计</span><b>${state.points}</b></div></div>
        ${SUBJ.map(s=>`<div class="dash-card"><div class="dc-name">${s}</div>
          <div class="dc-row"><span>今日打卡</span><b>${subjCount(todayList,s)}</b></div>
          <div class="dc-row"><span>本周打卡</span><b>${subjCount(weekList,s)}</b></div></div>`).join("")}
      </div>
      <div class="sec-title">📅 本周学习 <small>近 7 天打卡分布 · 今天高亮</small></div>
      <div class="week-bar">${weekDays.map(w=>`<div class="wk ${w.ds===todayStr?"today":""}"><div class="wk-bar" style="height:${w.c*16+4}px"></div><div class="wk-c">${w.c}</div><div class="wk-d">${w.ds===todayStr?"今天":w.ds.slice(5)}</div></div>`).join("")}</div>

      <div class="sec-title">🗓 学习日历 <small>按月查看每天的学习内容 · 格子数字=当天学会条数 · 点击日期看当天明细</small></div>
      <div class="cal-wrap" id="calBox"></div>

      <div class="sec-title">✅ 习惯周跟踪 <small>本周（周一~周日）完成情况 ${habitDoneCnt}/${habits.length} 已完成今天 · 每日勾选在「首页」</small></div>
      ${habits.length?`<div class="habit-dash">
        <div class="hd-head">
          <div class="hd-name">习惯</div>
          <div class="hd-grid">${WEEK_MON.map((d,i)=>`<div class="hd-dow ${wkDates[i]===todayStr?"today":""}">周${d}</div>`).join("")}</div>
          <div class="hd-rate">本周完成率</div>
        </div>
        ${habits.map(h=>{
          const ds=weekDatesMondayStart();
          const cells=ds.map(dd=>{ const done=!!(state.habitLog[dd]&&state.habitLog[dd][h]); return `<div class="hd-cell ${done?"on":""}">${done?"✓":""}</div>`; }).join("");
          const doneCnt=ds.filter(dd=>!!(state.habitLog[dd]&&state.habitLog[dd][h])).length;
          const rate=Math.round(doneCnt/7*100);
          return `<div class="hd-row">
            <div class="hd-name" title="${esc(h)}">${esc(h)}</div>
            <div class="hd-grid">${cells}</div>
            <div class="hd-rate ${rate>=70?"good":rate>=40?"mid":"low"}">${rate}%</div>
          </div>`;
        }).join("")}
      </div>`
      :`<div class="placeholder" style="padding:14px 16px">还没有任何习惯，去「首页」的「今日习惯」添加。</div>`}

      <div class="sec-title">🚨 行为扣分记录 <small>与习惯放一起看 · 只扣行为不扣学习 · 每日上限 ${penaltyCapDay()} 分 · 欠分下限 -${penaltyFloor()} 分 · 当天改正可撤销返还（需家长口令）· 扣分在「🛠 后台」记录</small></div>
      <div class="chips" style="margin:6px 0 10px">
        <span class="badge" style="background:#fee2e2;color:#b91c1c">本周共扣 -${penWeek.reduce((a,b)=>a-b.n,0)} 分</span>
        <span class="badge" style="background:#f1f5f9;color:#475569">今日 -${penaltyToday()} / 上限 ${penaltyCapDay()}</span>
        <span class="badge" style="background:#eef2ff;color:#3730a3">当前积分 ${state.points}</span>
      </div>
      <div class="admin-list">
        ${penWeek.length? penWeek.map(e=>`<div class="admin-item">
            <div class="ai-main"><span class="badge" style="background:#fef2f2;color:#b91c1c">-${-e.n} 分</span> <b>${esc((e.note||"").replace("行为扣分 · ",""))}</b> <span style="font-size:12px;color:var(--muted)">${esc(e.t)}</span></div>
            <button class="btn" data-pen-undo="${esc(e.hook)}" title="孩子已改正 → 返还积分">✅ 已改正 · 撤销</button>
          </div>`).join("")
        : '<div class="placeholder" style="padding:14px 16px"><div class="big">🌟</div>本周还没有行为扣分，表现不错 👍</div>'}
      </div>

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
    `;
    const wgCard = $("#wkGoalCard");
    if(wgCard) wgCard.addEventListener("click", openWeekGoal);
    // 板块卡（含「打卡中」pill）点击都进管理弹窗——进去把内容「加入学习」后才进入打卡范围
    el.querySelectorAll("[data-lib-sec]").forEach(b=>b.addEventListener("click", (e)=>{
      const i=b.dataset.libSec.indexOf("·");
      openLibSection(b.dataset.libSec.slice(0,i), b.dataset.libSec.slice(i+1));
    }));
    // 行为扣分记录：改正撤销（需家长口令 + 确认框）
    el.querySelectorAll("[data-pen-undo]").forEach(b=>b.addEventListener("click", ()=>{
      requireAdmin(()=>confirmUndo("pen", b.dataset.penUndo));
    }));
    renderCalGrid();
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
    const types = subjectTypesOf(subject);
    if(!gnView[subject]) gnView[subject] = {type:types[0]||"", grade:"全部", q:"", volume:"全部", unit:"全部", tag:""};
    const v = gnView[subject];
    const isEngWord = (subject==="英语" && v.type==="单词");
    let basePool, pool;
    if(isEngWord){
      // 英语单词按当前年级取；「册」交由下方通用筛选（volume=全部 时不过滤）
      basePool = [...WORDS.filter(w=>w.grade===state.grade),
              ...CUSTOM.filter(c=>c.subject==="英语"&&c.type==="单词"&&c.grade===state.grade)];
    }else{
      // 统一从 ALL 取（思维母题已拆分为单题、公式已拆分为小节；打散练习入口随后置顶）
      basePool = ALL.filter(c=>c.subject===subject && c.type===v.type);
      if(subject==="数学" && v.type==="思维母题"){
        const pe = basePool.filter(x=>x.key==="practice:maththought");
        basePool = [...pe, ...basePool.filter(x=>x.key!=="practice:maththought")];
      }
    }
    pool = basePool.slice();
    if(v.grade!=="全部" && !isEngWord) pool = pool.filter(x=>x.grade===v.grade);
    // 跨学科学一维：册（上下册）通用筛选；英语单词与任何标注了册的素材都参与
    if(v.volume!=="全部") pool = pool.filter(x=>x.volume===v.volume);
    if(isEngWord && v.unit!=="全部") pool = pool.filter(w=>w.unit===v.unit);
    // 主题标签筛选（与语文·诗词页一致）：按当前「学科·类型」的内容标签聚合，点选即筛选
    if(v.tag) pool = pool.filter(x=>(x.tags||[]).includes(v.tag));
    if(v.q){ const q=v.q.toLowerCase(); pool = pool.filter(x=>(x.title+x.sub+x.body+(x.tags||[]).join("")).toLowerCase().includes(q)); }
    const grades = [...new Set(pool.map(c=>c.grade).filter(Boolean))].sort((a,b)=>GRADES.indexOf(a)-GRADES.indexOf(b));
    const hasCustom = CUSTOM.some(c=>c.subject===subject) || EXTRA.some(c=>c.subject===subject);
    // 主题标签云：按当前「学科·类型」内容自带的 tags 聚合（与语文·诗词页一致），英文单词无标签则不显示
    const tagFreq={};
    basePool.forEach(x=>(x.tags||[]).forEach(t=>tagFreq[t]=(tagFreq[t]||0)+1));
    const topTags=Object.entries(tagFreq).sort((a,b)=>b[1]-a[1]).slice(0,18).map(x=>x[0]);
    const engTotal = isEngWord ? [...WORDS, ...CUSTOM.filter(c=>c.subject==="英语"&&c.type==="单词"), ...EXTRA.filter(c=>c.subject==="英语"&&c.type==="单词")].filter(w=>w.grade===state.grade).length : null;
    const units = isEngWord ? [...new Set([...WORDS, ...CUSTOM.filter(c=>c.subject==="英语"&&c.type==="单词"), ...EXTRA.filter(c=>c.subject==="英语"&&c.type==="单词")].filter(w=>w.grade===state.grade && (v.volume==="全部"||w.volume===v.volume)).map(w=>w.unit).filter(Boolean))].sort() : [];
    const hasVolume = basePool.some(x=>x.volume); // 当前学科·类型下是否存在标注了册的素材（有才显示册筛选）
    const listCnt = pool.filter(x=>x.key!=="practice:maththought").length;
    el._gnPool = pool; // 闪卡入口用：当前筛选出的卡片池
    const desc = (hasCustom || isEngWord)
      ? `${subject}内容由「🛠 后台」添加的素材与内置教材自动归类到对应学科 / 类型 / 年级。`
      : `该栏目规划中。可在「🛠 后台」添加素材，系统自动归类到这里。`;
    el.innerHTML = `
      <div class="subj-head"><h2>${esc(subject)} · ${esc(v.type)}</h2><span class="cnt">${isEngWord?`${esc(state.grade)} 共 ${engTotal} 个 · 当前${esc(v.volume==="全部"?"全部册":v.volume)} ${pool.length} 个`:(hasCustom?listCnt+" 条":"规划中")}</span></div>
      <p class="subj-desc">${desc}</p>
      <div class="chips">
        ${types.map(t=>`<button class="chip ${v.type===t?"on":""}" data-gn-type="${esc(t)}">${esc(t)}</button>`).join("")}
        ${listCnt?`<button class="chip" data-gn-flash title="把当前筛选的卡片变成一副闪卡：看正面猜意思，点卡翻面对答案">🃏 闪卡</button>`:""}
        <button class="chip" data-gn-add title="自定义添加板块或板块下的内容，添加后归集到「📚 资源」页">＋ 添加</button>
        ${isEngWord?`<span style="width:14px"></span><span class="lbl">年级语境：</span><span class="badge" style="background:#eef2ff;color:#1e40af">${esc(state.grade)}</span>`:""}
        <span style="flex:1"></span>
        <input id="gnSearch" class="search-input" style="width:200px" placeholder="搜索…" value="${esc(v.q)}" />
      </div>
      ${(grades.length && !isEngWord)?`<div class="chips"><span class="lbl">年级：</span><button class="chip ${v.grade==="全部"?"on":""}" data-gn-grade="全部">全部</button>${grades.map(g=>`<button class="chip ${v.grade===g?"on":""}" data-gn-grade="${esc(g)}">${esc(g)}</button>`).join("")}</div>`:""}
      ${hasVolume?`<div class="chips"><span class="lbl">册：</span><button class="chip ${v.volume==="全部"?"on":""}" data-gn-volume="全部">全部</button>${VOLUMES.map(vol=>`<button class="chip ${v.volume===vol?"on":""}" data-gn-volume="${esc(vol)}">${esc(vol)}</button>`).join("")}</div>`:""}
      ${isEngWord&&units.length?`<div class="chips"><span class="lbl">单元：</span><button class="chip ${v.unit==="全部"?"on":""}" data-gn-unit="全部">全部</button>${units.map(u=>`<button class="chip ${v.unit===u?"on":""}" data-gn-unit="${esc(u)}">${esc(u)}</button>`).join("")}</div>`:""}
      ${topTags.length?`<div class="chips"><span class="lbl">热门主题：</span><button class="tag ${!v.tag?"on":""}" data-gn-tag="">全部</button>${topTags.map(t=>`<button class="tag ${v.tag===t?"on":""}" data-gn-tag="${esc(t)}">#${esc(t)}</button>`).join("")}</div>`:""}
      ${isEngWord?`
      <div class="sec-title">🎮 单词游戏 <small>用 ${esc(state.grade)}${esc(v.volume==="全部"?"全部册":v.volume)} 的单词玩 · 完成一轮 +5 分（每天每项限一次）</small></div>
      <div class="game-row">
        <button class="game-card" data-word-game="match"><span class="gi">🃏</span><b>配对翻牌</b><span class="gd">单词 ↔ 释义 · 记忆配对</span></button>
        <button class="game-card" data-word-game="spell"><span class="gi">🔤</span><b>拼写挑战</b><span class="gd">看释义 · 点字母拼单词</span></button>
        <button class="game-card" data-word-game="quiz"><span class="gi">🎯</span><b>选义闯关</b><span class="gd">看单词 · 四选一挑释义</span></button>
      </div>`:""}
      ${pool.length?`<div class="task-grid">${pool.map(x=>cardHTML(x)).join("")}</div>`
        :(basePool.length
          ? `<div class="placeholder"><div class="big">🔍</div><h3>没有匹配的内容</h3><p>当前筛选条件下没有内容，换个条件或清除上方筛选看看。</p></div>`
          : `<div class="placeholder"><div class="big">📥</div><h3>${esc(subject)} · ${esc(v.type)} 暂无内容</h3><p>在「🛠 后台」添加该类型素材，将自动归位于此。</p></div>`)}
    `;
    el._gnRefresh = function(){
      const keep = document.activeElement && document.activeElement.id==="gnSearch";
      renderGeneric(el, subject);
      if(keep){ const i=$("#gnSearch"); i.focus(); i.setSelectionRange(i.value.length,i.value.length); }
    };
  }

  /* ---------- 科目页「＋ 添加」：自定义添加板块 / 板块下的内容（归集到资源） ---------- */
  function subjectTypesOf(subject){
    return [...new Set([...(SUBJECT_TYPES[subject]||[]),
      ...CUSTOM.filter(c=>c.subject===subject).map(c=>c.type),
      ...EXTRA.filter(c=>c.subject===subject).map(c=>c.type)])];
  }
  function openSubjectAdd(subject, defType){
    const types = subjectTypesOf(subject);
    $("#modal-body").innerHTML = `
      <div class="m-type">➕ 添加到「${esc(subject)}」</div>
      <p class="af-tip" style="margin:4px 0 10px">板块名可下拉选择，也可直接输入新名字（自定义新板块）；添加的内容会归集到「📚 资源」页，并出现在「${esc(subject)}」科目页与类型筛选、首页、搜索中。</p>
      <div class="admin-form">
        <div class="af-row">
          <label class="af-grow">板块名（类型）<input id="saType" list="saTypes" value="${esc(defType||"")}" placeholder="下拉选择已有板块，或输入新板块名"/>
            <datalist id="saTypes">${types.map(t=>`<option>${esc(t)}</option>`).join("")}</datalist>
          </label>
          <label>年级<select id="saGrade"><option>—</option>${GRADES.map(g=>`<option ${g===state.grade?"selected":""}>${g}</option>`).join("")}</select></label>
        </div>
        <div class="af-row">
          <label class="af-grow">标题<input id="saTitle" placeholder="必填"/></label>
          <label>作者 / 副标题<input id="saSub" placeholder="可空"/></label>
        </div>
        <label class="af-block">正文 / 内容<textarea id="saBody" rows="4" placeholder="请输入内容"></textarea></label>
        <div class="af-actions">
          <button class="btn primary" id="saSubmit">＋ 添加</button>
          <button class="btn" id="saCancel">取消</button>
        </div>
      </div>`;
    $("#modal").hidden=false; document.body.style.overflow="hidden";
    $("#saCancel").onclick=closeModal;
    $("#saSubmit").onclick=()=>{
      const title=$("#saTitle").value.trim();
      if(!title){ toast("请填写标题"); return; }
      const type=($("#saType").value.trim() || defType || "自定义");
      const item=makeCustomItem({ subject, type,
        grade:$("#saGrade").value, title, sub:$("#saSub").value.trim(), body:$("#saBody").value.trim() });
      state.custom.push(item); save(); rebuildAll();
      gnView[subject]=gnView[subject]||{};
      closeModal();
      toast("已添加到「"+subject+" · "+type+"」，并归集到资源页 🎉");
      refreshView();
    };
  }

  /* ---------- 单词游戏（英语·单词板块：配对翻牌 / 拼写挑战 / 选义闯关；完成一轮 +5 分，每天每项一次） ---------- */
  function wordGamePool(){
    const vol=(gnView["英语"]||{}).volume||"上册";
    const seen=new Set(), out=[];
    [...WORDS, ...CUSTOM.filter(c=>c.subject==="英语"&&c.type==="单词")]
      .filter(w=>w.grade===state.grade && (vol==="全部"||w.volume===vol) && w.title && w.body)
      .forEach(w=>{
        const k=String(w.title).toLowerCase();
        if(seen.has(k)) return;
        seen.add(k);
        const cn=String(w.body).split(/[;；\n]/)[0].trim();
        if(cn && cn.length<=14) out.push({text:String(w.title), cn, phonetic:String(w.sub||"")});
      });
    return out;
  }
  function wgShuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  let wgBound=null;
  function wgBind(fn){ const mb=$("#modal-body"); if(wgBound) mb.removeEventListener("click", wgBound); wgBound=fn; mb.addEventListener("click", wgBound); }
  function wgShell(title, sub, html){
    $("#modal-body").innerHTML = `
      <div class="m-type"><span class="badge" style="background:#ecfdf5;color:#047857">🎮 单词游戏</span> <span class="badge" style="background:#eef2ff;color:#4f46e5">${esc(title)}</span></div>
      <h3 class="m-title">${esc(sub)}</h3>
      <div class="wg">${html}</div>`;
  }
  function wgGameAward(kind, name){
    const okd = awardQuiet(5, "单词游戏 · "+name, "game:"+kind+":"+fmt(new Date()));
    return okd;
  }
  function wgEnd(kind, name, title, scoreHTML){
    const got = wgGameAward(kind, name);
    wgShell(title, "本轮完成！", `
      <div class="wg-win">🎉 ${scoreHTML}</div>
      <p class="af-tip">${got?"+5 分已入账（每天每项限一次）":"今天这一项的 +5 已经拿过啦，明天再来～"}</p>
      <div class="wg-ops" style="justify-content:center">
        <button class="btn primary" data-op="again">🔄 再来一轮</button>
        <button class="btn" data-op="close">完成</button>
      </div>`);
    wgBind(e=>{
      const op=e.target.closest("[data-op]"); if(!op) return;
      if(op.dataset.op==="again") openWordGame(kind);
      else if(op.dataset.op==="close") closeModal();
    });
  }
  function openWordGame(kind){
    const P = wordGamePool();
    if(P.length<8){ toast("这个范围的单词还不够玩，换一本册子或年级试试"); return; }
    $("#modal").hidden=false; document.body.style.overflow="hidden";
    if(kind==="match") wgMatch(P);
    else if(kind==="spell") wgSpell(P);
    else wgQuiz(P);
  }
  // 配对翻牌：6 组 单词↔释义 记忆配对
  function wgMatch(P){
    const n=6;
    const picks=wgShuffle(P.slice()).slice(0,n);
    const tiles=wgShuffle([
      ...picks.map((w,i)=>({id:i, txt:w.text, kind:"en"})),
      ...picks.map((w,i)=>({id:i, txt:w.cn,   kind:"cn"}))
    ]);
    let open=[], matched=0, moves=0, lock=false;
    const draw=()=>wgShell("配对翻牌", "点开两张牌，把单词和它的释义配对", `
      <div class="wg-stats">已配对 <b>${matched}/${n}</b> · 步数 <b>${moves}</b></div>
      <div class="wg-grid">
        ${tiles.map((t,i)=>`<button class="wg-tile ${t.done?"done":""}${open.includes(i)?" open":""}" data-i="${i}" ${t.done?"disabled":""}>${(open.includes(i)||t.done)?esc(t.txt):"？"}</button>`).join("")}
      </div>`);
    draw();
    wgBind(e=>{
      const b=e.target.closest("[data-i]"); if(!b||lock) return;
      const i=+b.dataset.i;
      if(tiles[i].done||open.includes(i)) return;
      open.push(i);
      if(open.length>2){ open=[i]; draw(); return; }
      draw();
      if(open.length===2){
        moves++; lock=true;
        const [a,c]=open;
        setTimeout(()=>{
          if(tiles[a].id===tiles[c].id && tiles[a].kind!==tiles[c].kind){
            tiles[a].done=tiles[c].done=true; matched++;
          }
          open=[];
          if(matched===n){
            wgEnd("match","配对翻牌","配对翻牌",`全部配对成功！共 ${moves} 步`);
            return;
          }
          draw(); lock=false;
        }, 620);
      }
    });
  }
  // 拼写挑战：看释义，点打乱的字母拼出单词（10 题一轮）
  function wgSpell(P){
    const total=10;
    const list=wgShuffle(P.slice()).slice(0,total);
    let idx=0, score=0, wrongFlash=false, built=[], builtKeys=[], usedKeys=new Set();
    const draw=()=>{
      const w=list[idx];
      const letters=wgShuffle(w.text.toLowerCase().split("").map((ch,i)=>({ch,i})));
      wgShell("拼写挑战", `看释义，点字母拼出单词（第 ${idx+1}/${total} 题）`, `
        <div class="wg-stats">得分 <b>${score}</b> · 剩余 <b>${total-idx}</b> 题</div>
        <div class="wg-clue"><div class="wg-cn">${esc(w.cn)}</div>${w.phonetic?`<div class="wg-phon">${esc(w.phonetic)}</div>`:""}</div>
        <div class="wg-slots${wrongFlash?" shake":""}">${w.text.split("").map((ch,i)=>`<span class="wg-slot">${built[i]?esc(built[i]):""}</span>`).join("")}</div>
        <div class="wg-keys">${letters.map(L=>`<button class="wg-key${usedKeys.has(L.i)?" used":""}" data-k="${L.i}" ${usedKeys.has(L.i)?"disabled":""}>${esc(L.ch)}</button>`).join("")}</div>
        <div class="wg-ops"><button class="btn" data-op="del">⌫ 删一个</button><button class="btn" data-op="skip">跳过 →</button></div>`);
    };
    const nextWord=()=>{
      idx++; built=[]; builtKeys=[]; usedKeys=new Set(); wrongFlash=false;
      if(idx>=total){ wgEnd("spell","拼写挑战","拼写挑战",`10 题拼对 ${score} 个`); return; }
      draw();
    };
    draw();
    wgBind(e=>{
      const w=list[idx]; if(!w) return;
      const key=e.target.closest("[data-k]");
      if(key){
        const ki=+key.dataset.k;
        if(usedKeys.has(ki)||built.length>=w.text.length) return;
        usedKeys.add(ki); builtKeys.push(ki); built.push(w.text[ki].toLowerCase());
        if(built.length===w.text.length){
          if(built.join("")===w.text.toLowerCase()){
            score++;
            wgShell("拼写挑战", `看释义，点字母拼出单词（第 ${idx+1}/${total} 题）`, `
              <div class="wg-stats">得分 <b>${score}</b></div>
              <div class="wg-clue"><div class="wg-cn">${esc(w.cn)}</div></div>
              <div class="wg-win">✅ ${esc(w.text)} 拼对了！</div>`);
            setTimeout(nextWord, 900);
          }else{
            wrongFlash=true; draw();
            setTimeout(()=>{ built=[]; builtKeys=[]; usedKeys=new Set(); wrongFlash=false; if(list[idx]) draw(); }, 850);
          }
          return;
        }
        draw(); return;
      }
      const op=e.target.closest("[data-op]"); if(!op) return;
      if(op.dataset.op==="del"){ if(built.length){ built.pop(); usedKeys.delete(builtKeys.pop()); } draw(); }
      else if(op.dataset.op==="skip"){ nextWord(); }
    });
  }
  // 选义闯关：看单词，四选一挑正确释义（10 题一轮）
  function wgQuiz(P){
    const total=10;
    const qs=wgShuffle(P.slice()).slice(0,total).map(w=>{
      const seen=new Set([w.cn]);
      const opts=[w.cn];
      wgShuffle(P.slice()).forEach(x=>{ if(opts.length<4 && !seen.has(x.cn)){ seen.add(x.cn); opts.push(x.cn); } });
      return {w, opts:wgShuffle(opts), answer:w.cn};
    });
    let idx=0, score=0, picked=-1;
    const draw=()=>{
      const q=qs[idx];
      wgShell("选义闯关", `选出单词的正确释义（第 ${idx+1}/${total} 题）`, `
        <div class="wg-stats">得分 <b>${score}</b> · 剩余 <b>${total-idx}</b> 题</div>
        <div class="wg-word">${esc(q.w.text)}${q.w.phonetic?`<span class="wg-phon">${esc(q.w.phonetic)}</span>`:""}</div>
        <div class="wg-opts">${q.opts.map((o,i)=>`<button class="wg-opt ${picked<0?"":i===q.opts.indexOf(q.answer)?"right":i===picked?"wrong":""}" data-o="${i}" ${picked<0?"":"disabled"}>${esc(o)}</button>`).join("")}</div>`);
    };
    draw();
    wgBind(e=>{
      const b=e.target.closest("[data-o]"); if(!b||picked>=0) return;
      picked=+b.dataset.o;
      const q=qs[idx];
      if(q.opts[picked]===q.answer) score++;
      draw();
      setTimeout(()=>{
        idx++; picked=-1;
        if(idx>=total){ wgEnd("quiz","选义闯关","选义闯关",`10 题答对 ${score} 个`); return; }
        draw();
      }, 850);
    });
  }

  // —— 语文：诗词 / 成语 / 文言 / 成语动画廊 / 作文 / 故事 / 阅读 / 课文 ——
  const CN_TYPES = ["诗词","成语","文言","成语动画廊","作文","故事","阅读","课文"];
  let cnView = {type:"诗词", grade:"全部", q:""};
  function cnPool(type){
    // 只取属于「语文」的自定义素材：避免英语阅读（subject=英语,type=阅读）等学科错配素材误入语文栏目
    const cus = CUSTOM.filter(c=>c.type===type && c.subject==="语文");
    if(type==="诗词") return [...POEMS, ...cus];
    if(type==="成语") return [...IDIOMS, ...cus];
    if(type==="文言") return [...WENYAN, ...cus];        // 文言文：后台添加或整年级导入后自动匹配
    if(type==="成语动画廊") return [...GALLERY, ...cus]; // 180 集 B 站成语动画 + 后台添加
    return [...cus, ...EXTRA.filter(c=>c.subject==="语文"&&c.type===type)]; // 作文 / 故事 / 阅读 / 课文：后台添加或内置教材后上线
  }
  function renderChinese(el){
    if(!cnView) cnView = {type:"诗词", grade:"全部", q:"", learn:"all"};
    const cnTypes = subjectTypesOf("语文"); // 内置类型 + 后台自定义板块（动态）
    const basePool = cnPool(cnView.type); // 未筛选池：用来区分「类型本身无内容（待导入）」与「筛选后无结果」
    let pool = basePool;
    const isIdiom   = cnView.type==="成语";
    const isGallery = cnView.type==="成语动画廊";
    // 年级筛选：成语按数据年级；诗词用全年级表（当前为通用内容，分年级诗词导入后自动生效）
    const grades = isIdiom ? IDIOM_GRADES : (cnView.type==="诗词" ? POEM_GRADE_PRESENT : []);
    if(grades.length && cnView.grade!=="全部") pool = pool.filter(x=>x.grade===cnView.grade);
    // 学习状态筛选：已学（已打卡或有星级）/ 未学
    if(cnView.learn==="done") pool = pool.filter(x=>isLearnedKey(x.key));
    else if(cnView.learn==="todo") pool = pool.filter(x=>!isLearnedKey(x.key));
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
          ${cnTypes.map(t=>`<button class="chip ${cnView.type===t?"on":""}" data-cn-type="${t}">${t}</button>`).join("")}
          <span style="flex:1"></span>
          <input id="cnSearch" class="search-input" style="width:200px" placeholder="搜索成语动画…" value="${esc(cnView.q)}" />
        </div>
        <div class="task-grid">${pool.map(x=>cardHTML(x)).join("") || '<div class="placeholder"><div class="big">🔍</div>没有匹配的动画</div>'}</div>
      `;
      bindCnRefresh(el);
      return;
    }

    // ② 待导入类型（文言 / 作文 / 故事 / 阅读 / 课文）：仅当该类型本身没有任何内容时才提示导入
    // （筛选后为空走 ③ 的正常列表 + 空态，保留全部筛选行与「↩ 返回」按钮，不会把用户困住）
    if(basePool.length===0){
      el.innerHTML = `
        <div class="subj-head"><h2>语文 · ${esc(cnView.type)}</h2><span class="cnt">待导入</span></div>
        <p class="subj-desc">「${esc(cnView.type)}」是语文栏目规划的内容类型之一，入口已就绪。</p>
        <div class="chips">${cnTypes.map(t=>`<button class="chip ${cnView.type===t?"on":""}" data-cn-type="${t}">${t}</button>`).join("")}</div>
        <div class="placeholder">
          <div class="big">📥</div>
          <h3>${esc(cnView.type)}内容待导入</h3>
          <p>整年级的${esc(cnView.type)}内容批量导入后，系统将自动匹配年级与上下册并归入本类型。</p>
          <p>导入即可上线，结构无需改动。</p>
          <p style="margin-top:8px"><b>想现在就上线？</b>去「🛠 后台」添加${esc(cnView.type)}素材，或在「📚 资源 · 批量导入」整批粘贴，会自动归位于此。</p>
        </div>
      `;
      return;
    }

    // ③ 诗词 / 成语：内容列表（筛选无结果时保留全部筛选行，空态带「↩ 返回」一键清除筛选）
    const backBtn = `<p style="margin-top:10px"><button class="btn" data-cn-clear title="清除年级/状态/搜索等筛选条件，返回查看全部内容">↩ 返回（清除筛选）</button></p>`;
    const emptyHint = (()=>{
      if(cnView.learn==="done") return `<div class="placeholder"><div class="big">🌱</div><h3>还没有已学的内容</h3><p>学会几张卡片后就会出现在这里；也可以切到「未学」或「全部」看看。</p>${backBtn}</div>`;
      if(cnView.learn==="todo") return `<div class="placeholder"><div class="big">🎉</div><h3>全部已学完</h3><p>当前筛选范围内的内容都已学会，太棒了！</p>${backBtn}</div>`;
      if(cnView.q) return `<div class="placeholder"><div class="big">🔍</div><h3>没有找到「${esc(cnView.q)}」</h3><p>换个关键词试试。</p>${backBtn}</div>`;
      if(cnView.grade!=="全部") return `<div class="placeholder"><div class="big">📚</div><h3>「${esc(cnView.grade)}」暂无${esc(cnView.type)}</h3><p style="font-size:13px;margin-top:6px">已按部编版教材为可识别的内容标注了年级；该年级暂无匹配到的${esc(cnView.type)}。</p>${backBtn}</div>`;
      return `<div class="placeholder"><div class="big">🔍</div><h3>没有匹配的内容</h3>${backBtn}</div>`;
    })();
    el.innerHTML = `
      <div class="subj-head"><h2>语文 · ${esc(cnView.type)}</h2><span class="cnt">${pool.length} 条</span></div>
      <p class="subj-desc">${isIdiom?"成语已按年级自动匹配。":"诗词已按部编版教材标注年级，可筛选查看对应年级的篇目。"}点击卡片查看全文与解析。</p>
      <div class="chips">
        ${cnTypes.map(t=>`<button class="chip ${cnView.type===t?"on":""}" data-cn-type="${t}">${t}</button>`).join("")}
        <button class="chip" data-cn-flash title="把当前筛选的卡片变成一副闪卡：看正面猜意思，点卡翻面对答案">🃏 闪卡</button>
        <button class="chip" data-cn-add title="自定义添加板块或板块下的内容，添加后归集到「📚 资源」页">＋ 添加</button>
        <span style="flex:1"></span>
        <input id="cnSearch" class="search-input" style="width:200px" placeholder="在语文内搜索…" value="${esc(cnView.q)}" />
      </div>
      ${grades.length?`
      <div class="chips"><span class="lbl">年级：</span>
        <button class="chip ${cnView.grade==="全部"?"on":""}" data-cn-grade="全部">全部</button>
        ${grades.map(g=>`<button class="chip ${cnView.grade===g?"on":""}" data-cn-grade="${esc(g)}">${esc(g)}</button>`).join("")}
      </div>`:""}
      <div class="chips"><span class="lbl">状态：</span>
        <button class="chip ${cnView.learn==="all"?"on":""}" data-cn-learn="all">全部</button>
        <button class="chip ${cnView.learn==="done"?"on":""}" data-cn-learn="done">已学</button>
        <button class="chip ${cnView.learn==="todo"?"on":""}" data-cn-learn="todo">未学</button>
      </div>
      ${cnView.type==="诗词"?`
      <div class="chips"><span class="lbl">热门主题：</span>
        ${topTags.map(t=>`<button class="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}
      </div>`:""}
      <div class="task-grid">${pool.map(x=>cardHTML(x)).join("") || emptyHint}</div>
    `;
    el._cnPool = pool; // 闪卡入口用：当前筛选出的语文卡片池
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

  /* ---------- 闪卡浏览（选中一组卡片，像闪卡一样滑动翻面、猜意思） ---------- */
  // 入口：学科页「🃏 闪卡」按钮 —— 把当前筛选出的卡片（类型/册/单元/年级/标签/搜索）作为一副牌
  // 正面=标题（单词/成语/诗题），点击翻面看释义/全文；←→切换、空格翻面、手机左右滑动；「我会了」与学会/积分体系打通。
  // 适用于 英语单词 / 成语 / 诗词 / 文言 / 经典阅读 等一切「有标题+正文」的卡片。
  let fcState = { deck:[], order:[], idx:0, flipped:false, label:"", shuffle:false };
  let fcJustSwiped = false; // 滑动后短暂屏蔽 click 翻面，避免滑动误触发
  function fcBuildOrder(){
    const arr=[...Array(fcState.deck.length).keys()];
    if(fcState.shuffle){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }
    fcState.order=arr;
  }
  function openFlashcards(pool, label){
    const deck=(pool||[]).filter(x=>x && x.key && x.key!=="practice:maththought" && x.key.indexOf("mtq:")!==0 && (x.title||x.body));
    if(!deck.length){ toast("当前筛选下没有可用的闪卡内容"); return; }
    fcState={ deck, order:[], idx:0, flipped:false, label:label||"闪卡", shuffle:false };
    fcBuildOrder();
    fcRender();
  }
  function fcCur(){ return fcState.deck[fcState.order[fcState.idx]]; }
  function fcFlip(){ if(!fcState.deck.length) return; fcState.flipped=!fcState.flipped; fcRender(); }
  function fcNav(d){ if(!fcState.deck.length) return; const n=fcState.deck.length; fcState.idx=(fcState.idx+d+n)%n; fcState.flipped=false; fcRender(); }
  function fcShuffle(){ if(!fcState.deck.length) return; fcState.shuffle=!fcState.shuffle; fcBuildOrder(); fcState.idx=0; fcState.flipped=false; fcRender(); toast(fcState.shuffle?"已乱序 🔀":"已恢复原顺序"); }
  function fcKnown(){ // 与弹窗「标记为学会」同一套语义：learned + 默认5星；只有今日目标内的才计学会积分
    const it=fcCur(); if(!it) return;
    if(!state.learned[it.key]){
      state.learned[it.key]=fmt(new Date());
      if(getMastery(it.key)===null) setMastery(it.key, 5);
      if(inTodayGoal(it.key)){
        awardQuiet(pointRules().learn, "学会《"+it.title+"》", "learn:"+it.key, true);
        toast("已记为学会 +"+pointRules().learn+" 分（今日目标）✅《"+it.title+"》");
      }else{
        toast("已记为学会（不在今日目标内，不计积分）✅《"+it.title+"》");
      }
      settleBonuses();
    }else{ toast("这张已经在学会列表里了"); }
    save(); refreshIfVisible(); fcNav(1);
  }
  function fcRender(){
    const it=fcCur();
    if(!it){ closeModal(); return; }
    const isWord = it.subject==="英语";
    const learned = !!state.learned[it.key];
    const N = fcState.deck.length, i = fcState.idx;
    // 正面：只出「要猜的」—— 单词/成语=词，诗词=题+作者；副标题（如音标）只出现在背面
    const front = `
      <div class="fc-front-title">${esc(it.title)}</div>
      ${(!isWord && it.sub)?`<div class="fc-front-sub">${esc(it.sub)}</div>`:""}
      <div class="fc-hint">想一想它的意思 · 点击卡片翻面</div>`;
    // 背面：释义 / 全文（长文可滚动）
    const back = isWord
      ? `<div class="fc-front-title">${esc(it.title)}</div>
         ${it.sub?`<div class="fc-front-sub">${esc(it.sub)}</div>`:""}
         <div class="fc-back-cn">${esc(it.body||"（无释义）")}</div>`
      : `<div class="fc-body"><b>${esc(it.title)}</b>${it.sub?`<span class="fc-src">${esc(it.sub)}</span>`:""}<br>${esc(it.body||"（无正文）").replace(/\n/g,"<br>")}</div>`;
    $("#modal-body").innerHTML = `
      <div class="fc-wrap">
        <div class="fc-top">
          <span>🃏 ${esc(fcState.label)}${fcState.shuffle?" · 乱序":""}</span>
          <span>${i+1} / ${N}${learned?" · <span class='fc-ok'>✓已会</span>":""}</span>
        </div>
        <div class="fc-prog"><div class="fc-prog-fill" style="width:${Math.round((i+1)/N*100)}%"></div></div>
        <div class="fc-card" data-fc-flip>
          ${fcState.flipped?back:front}
        </div>
        <div class="fc-nav">
          <button class="btn" data-fc-prev>← 上一张</button>
          <button class="btn primary" data-fc-flip-btn>${fcState.flipped?"🙈 藏起答案":"🔄 翻面"}</button>
          <button class="btn" data-fc-next>下一张 →</button>
        </div>
        <div class="fc-nav">
          <button class="btn" data-fc-shuffle>${fcState.shuffle?"➡ 恢复原序":"🔀 乱序"}</button>
          <button class="btn pa" data-fc-speak>🔊 朗读</button>
          <button class="btn pa" data-fc-known>✓ 我会了（下一张）</button>
        </div>
        <p class="fc-tip">← → 键切换 · 空格翻面 · 手机上左右滑动</p>
      </div>`;
    const mb=$("#modal-body");
    mb.querySelectorAll("[data-fc-flip],[data-fc-flip-btn]").forEach(b=>b.addEventListener("click",()=>{ if(fcJustSwiped) return; fcFlip(); }));
    mb.querySelectorAll("[data-fc-prev]").forEach(b=>b.addEventListener("click",()=>fcNav(-1)));
    mb.querySelectorAll("[data-fc-next]").forEach(b=>b.addEventListener("click",()=>fcNav(1)));
    mb.querySelectorAll("[data-fc-shuffle]").forEach(b=>b.addEventListener("click",fcShuffle));
    mb.querySelectorAll("[data-fc-known]").forEach(b=>b.addEventListener("click",fcKnown));
    mb.querySelectorAll("[data-fc-speak]").forEach(b=>b.addEventListener("click",()=>{ const c=fcCur(); if(c) speak(isWord? c.title : c.title+"。"+(c.body||""), isWord?"en-US":"zh-CN"); }));
    // 手机滑动：左右滑=切换（滑动后短暂屏蔽 click，防止误翻面）
    const card=mb.querySelector(".fc-card");
    if(card){
      let sx=0, sy=0;
      card.addEventListener("touchstart", ev=>{ sx=ev.touches[0].clientX; sy=ev.touches[0].clientY; }, {passive:true});
      card.addEventListener("touchend", ev=>{
        const dx=ev.changedTouches[0].clientX-sx, dy=ev.changedTouches[0].clientY-sy;
        if(Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)){
          fcJustSwiped=true; setTimeout(()=>{ fcJustSwiped=false; }, 400);
          fcNav(dx<0?1:-1);
        }
      }, {passive:true});
    }
    $("#modal").hidden=false;
    document.body.style.overflow="hidden";
  }

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

  /* ---------- 单词趣味学习：遮释义自测 + 四选一小测 ---------- */
  function wordQuizToday(){
    const d=fmt(new Date());
    state.wordQuiz = state.wordQuiz || {};
    if(!state.wordQuiz[d]) state.wordQuiz[d]={right:0,wrong:0};
    return state.wordQuiz[d];
  }
  // 生成 4 个选项（1 正确 + 3 干扰），同一单词每次生成的干扰项固定
  function wordQuizOptions(it, n){
    const meaning=(it.body||"").trim();
    let pool = WORDS.filter(w=>w.key!==it.key && (w.body||"").trim() && (w.body||"").trim()!==meaning);
    const same = pool.filter(w=>w.grade===it.grade);
    if(same.length>=n) pool=same;
    let seed=strHash(it.key)+7;
    const rnd=()=>{ seed=(seed*1103515245+12345)>>>0; return seed/4294967296; };
    const picked=[], seen=new Set([meaning]);
    let guard=0;
    while(picked.length<n && pool.length && guard<300){
      guard++;
      const w=pool[Math.floor(rnd()*pool.length)];
      const m=(w.body||"").trim();
      if(!m || seen.has(m)) continue;
      seen.add(m); picked.push(m);
    }
    const opts=picked.map(m=>({t:m, ok:false}));
    opts.push({t:meaning, ok:true});
    for(let i=opts.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const t=opts[i]; opts[i]=opts[j]; opts[j]=t; }
    return opts;
  }
  function renderWordQuiz(it){
    const box=$("#wqQuiz"); if(!box) return;
    if(!(it.body||"").trim()){ box.hidden=false; box.innerHTML=`<p class="wq-foot">这个单词还没有释义，先在弹窗里「✏️ 编辑内容」补充中文意思。</p>`; return; }
    const opts=wordQuizOptions(it,3);
    const st=wordQuizToday();
    box.hidden=false;
    box.innerHTML=`
      <div class="wq-q">🎯 「${esc(it.title)}」是什么意思？</div>
      <div class="wq-opts">${opts.map((o,i)=>`<button class="wq-opt" data-q="${i}">${esc(o.t)}</button>`).join("")}</div>
      <div class="wq-foot" id="wqFoot">今日小测：✅ ${st.right} · ❌ ${st.wrong}${it.sub?"　"+esc(it.sub):""}</div>`;
    box.querySelectorAll("[data-q]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const o=opts[parseInt(b.dataset.q,10)];
        const all=box.querySelectorAll("[data-q]");
        const st2=wordQuizToday();
        if(o.ok){
          b.classList.add("ok"); st2.right++;
          speak(it.title, "en-US");
          toast("答对了 🎉 "+it.title);
          // 答对给分（每日小测积分上限）
          const got=(state.pointLog||[]).filter(x=>x.t===todayStrNow() && x.n>0 && x.note.indexOf("小测答对")===0).reduce((a,c)=>a+c.n,0);
          if(got < quizCapDay()) awardQuiet(pointRules().quizRight, "小测答对 "+it.title, "", true);
        }else{
          b.classList.add("no"); st2.wrong++;
          opts.forEach((x,i)=>{ if(x.ok) all[i].classList.add("ok"); });
          toast("记住啦："+it.title+" = "+it.body);
        }
        all.forEach(x=>x.disabled=true);
        save();
        const foot=$("#wqFoot"); if(foot) foot.textContent="今日小测：✅ "+st2.right+" · ❌ "+st2.wrong;
      });
    });
  }

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
    const m = getMastery(it.key);
    const vids = itemVideos(it);
    const userVids = (state.videos[it.key]||[]);
    const cur = parseVideoUrl(vids[modalVid]||vids[0]);
    // 视频区：多视频时用 chips 切换
    const videoHTML = vids.length ? `
      ${vids.length>1?`<div class="chips" style="margin:0 0 8px">${vids.map((u,i)=>`<button class="chip ${i===modalVid?"on":""}" data-vid="${i}">视频 ${i+1}</button>`).join("")}</div>`:""}
      ${playerHTML(cur)}` : "";
    const OVSET = new Set(Object.keys(state.overrides||{}));
    // 富文本（html:true）优先：英语阅读等内嵌指南/练习按原样渲染；其余按学科回落
    const bodyHTML = it.html
      ? `<div class="${it.htmlClass||"guide-body"}">${sanitizeRich(it.body)}</div>`
      : isWord
      ? `<div class="wq-card">
           <div class="wq-word">${esc(it.title)}</div>
           ${it.sub?`<div class="wq-phon">${esc(it.sub)}</div>`:""}
           <div class="wq-cn" id="wqCn">${esc(it.body||"")}</div>
         </div>
         <div class="wq-quiz" id="wqQuiz" hidden></div>`
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
      <div class="m-stars">
        <span class="ms-label">掌握度（星级）</span>
        <span class="ms-stars">
          ${[1,2,3,4,5].map(n=>`<button class="star ${m>=n?"on":""}" data-act="star" data-n="${n}" title="${n} 星">★</button>`).join("")}
          ${m!==null?`<button class="star clr" data-act="starclear" title="清除星级（恢复未学）">✕</button>`:""}
        </span>
        <span class="ms-hint">${m===null?"点星标记掌握度":(m>=5?"全会 · 减少练习":(m<=2?"不会 · 加强练习":"中等 · 正常练习"))}</span>
      </div>
      <div class="m-actions">
        ${it.key.indexOf("mtq:")===0?`<button class="btn pa" data-act="hint">💡 答案提示</button>`:""}
        ${dueReview(it.key)?`<button class="btn primary" data-act="review">🔁 完成复习（艾宾浩斯）</button>`:""}
        <button class="btn ${learned?"done":"primary"}" data-act="learn">${learned?"✓ 已学会（点击取消）":"标记为学会 📅"}</button>
        ${learned?`<button class="btn" data-act="unlearn" title="加错时用：退回该卡的学会积分，并取消已学标记">↩️ 撤销学会</button>`:""}
        <button class="btn" data-act="fav">${fav?"★ 已收藏":"☆ 收藏"}</button>
        <button class="btn" data-act="speak">🔊 朗读</button>
        ${isWord?`<button class="btn" data-act="togglecn">🙈 遮住释义</button><button class="btn pa" data-act="quiz">🎯 考考我</button>`:""}
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
        <p class="va-tip">自动解析并站内播放：B站视频页/播放器链接、抖音视频页（douyin.com/video/…）、腾讯视频、YouTube、本地视频文件（可放入 site/videos/ 后填相对路径）。抖音短链会自动尝试解析，但依赖公共代理、偶尔失败 —— 失败时用浏览器打开短链，把地址栏的完整链接（douyin.com/video/数字）粘进来即可 100% 站内竖屏播放。仅视频号等个别平台需新窗口打开。同一内容可挂多个视频。</p>
      </div>
    `;
    $("#modal").hidden=false;
    upgradeListeningAudio();
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
          else {
            state.reviewed[t][it.key]=true; toast("复习完成 🔁 记忆效果最好的一步！");
            awardQuiet(pointRules().review, "复习《"+it.title+"》", "review:"+t+":"+it.key, true);
          }
          save(); openModal(it); refreshIfVisible(); return;
        }else if(act==="learn"){
          if(state.learned[it.key]){
            delete state.learned[it.key];
            const t=fmt(new Date());
            if(state.reviewed[t]) delete state.reviewed[t][it.key];
            toast("已取消学会标记");
          }
          else {
            state.learned[it.key]=fmt(new Date());
            if(getMastery(it.key)===null) setMastery(it.key, 5); // 新学会默认 5 星（全会），可手动下调
            if(inTodayGoal(it.key)){
              awardQuiet(pointRules().learn, "学会《"+it.title+"》", "learn:"+it.key, true);
              toast("已标记为学会 +"+pointRules().learn+" 分（今日目标）🔁 明天将按遗忘曲线安排复习");
            }else{
              toast("已标记为学会（不在今日目标内，不计积分）🔁 明天将按遗忘曲线安排复习");
            }
            settleBonuses();
          }
        }else if(act==="unlearn"){
          // 撤销学会：退分 + 删流水 + 取消已学/星级；需家长口令 + 确认框（加错时用）
          requireAdmin(()=>confirmUnlearn(it));
          return;
        }else if(act==="star"){
          setMastery(it.key, parseInt(btn.dataset.n,10)||5);
          toast("掌握度已设为 "+ (getMastery(it.key)) +" 星");
          openModal(it); refreshIfVisible(); return;
        }else if(act==="starclear"){
          delete state.mastery[it.key]; save();
          toast("已清除星级（恢复未学）");
          openModal(it); refreshIfVisible(); return;
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
            resolveDouyinShort(val).then(full=>{
              if(!full) toast("短链解析失败，已按原链接保存（仅能新窗口打开）。站内播放请改粘完整链接：浏览器打开短链 → 地址栏 douyin.com/video/数字");
              pushAndRefresh(full||val);
            });
          }else pushAndRefresh(val);
          return;
        }else if(act==="togglecn"){
          const cn=$("#wqCn"); if(!cn) return;
          cn.hidden=!cn.hidden;
          btn.textContent = cn.hidden ? "👀 显示释义" : "🙈 遮住释义";
          return;
        }else if(act==="quiz"){
          renderWordQuiz(it); return;
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
    // extra:/fmq:/dlq:/poem:/idiom:/word:/gal: 均为内置条目——走「覆盖版本」（custom: 直接改 custom）
    const isExtra = /^(extra|fmq|dlq|poem|idiom|word|gal):/.test(it.key);
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
  /* ---------- 后台登录 / 修改口令（口令存本机，防止随手改动后台内容） ---------- */
  /* ---------- 奖励页：积分账户 · 规则 · 奖励商城 · 流水 ---------- */
  function renderReward(){
    const el = $("#view-reward");
    const tg = todayTasks();
    const tasks = Object.keys(tg).reduce((a,k)=>a.concat(tg[k]||[]),[]);
    const hs = state.habits||[];
    const PRw = pointRules();
    const taskMax = tasks.length*PRw.learn + hs.length*PRw.habit;
    // 最近 7 天日均（用于「预计还需多少天」）
    const last7=[]; for(let i=0;i<7;i++){ const d=new Date(); d.setDate(d.getDate()-i); last7.push(fmt(d)); }
    const got7=(state.pointLog||[]).filter(x=>x.n>0 && last7.indexOf(x.t)>=0).reduce((a,b)=>a+b.n,0);
    const days7=Math.max(1, new Set((state.pointLog||[]).filter(x=>x.n>0&&last7.indexOf(x.t)>=0).map(x=>x.t)).size);
    const avg=Math.max(1, Math.round(got7/days7));
    const streak=currentStreak();
    const nextMile=streakMilestones().find(([d])=>d>streak)||null;
    const PR = pointRules();
    const ptNet = pointTodayNet(), pwNet = pointWeekNet(); // 今日/本周净分（正分-扣分）

    el.innerHTML = `
      <div class="hero">
        <div>
          <h2>🎁 我的积分</h2>
          <p>${esc(state.grade)} · 今日 ${ptNet<0?`<b style="color:#fecaca">${sgn(ptNet)}</b>`:sgn(ptNet)} 分${penaltyToday()&&pointToday()>0?`<span style="color:#fecaca;font-weight:700">（扣 ${penaltyToday()}）</span>`:""} · 本周 ${pwNet<0?`<b style="color:#fecaca">${sgn(pwNet)}</b>`:sgn(pwNet)} 分 · 最近 7 天平均 ${avg} 分/天${nextMile?` · 再学 ${nextMile[0]-streak} 天解锁「连续 ${nextMile[0]} 天」+${nextMile[1]} 分`:""}</p>
        </div>
        <div class="done" style="min-width:200px;">
          <div style="font-size:28px;font-weight:800;color:#4c1d95">${state.points} <span style="font-size:14px;font-weight:600;opacity:.75">分</span></div>
          <div class="pbar"><div class="pfill" style="width:${taskMax?Math.min(100,Math.round(pointToday()/taskMax*100)):0}%"></div></div>
          <div style="font-size:12px;color:#6d28d9;margin-top:4px">今日还可拿到约 ${Math.max(0,taskMax-pointToday())} 分</div>
        </div>
      </div>

      <div class="stat-strip">
        <div class="stat"><div class="num">${state.points}</div><div class="lbl">总积分</div></div>
        <div class="stat"><div class="num"${ptNet<0?' style="color:#b91c1c"':""}>${ptNet}</div><div class="lbl">今日</div></div>
        <div class="stat"><div class="num"${pwNet<0?' style="color:#b91c1c"':""}>${pwNet}</div><div class="lbl">本周</div></div>
        <div class="stat"><div class="num" style="${penaltyToday()?"color:#b91c1c":""}">${penaltyToday()?"-"+penaltyToday():"0"}</div><div class="lbl">今日行为扣分</div></div>
        <div class="stat"><div class="num">${streak}</div><div class="lbl">连续学习天数</div></div>
        <div class="stat"><div class="num">${(state.redeems||[]).filter(r=>r.status==="待兑现").length}</div><div class="lbl">待家长兑现</div></div>
        <div class="stat"><div class="num">${tasks.filter(t=>state.learned[t.key]).length}/${tasks.length}</div><div class="lbl">今日任务</div></div>
      </div>

      <div class="sec-title">🏅 加分规则 <small>只加不减 · 复习比学新更值钱 · 连续性额外加权</small></div>
      <div class="task-grid">
        <div class="rule-card"><div class="rl-name">完成到期复习</div><div class="rl-val">+${PR.review} 分</div><div class="rl-tip">每完成一次艾宾浩斯到期复习；间隔重复最能形成长期记忆，所以比学新更值钱。</div></div>
        <div class="rule-card"><div class="rl-name">习惯打卡</div><div class="rl-val">+${PR.habit} 分</div><div class="rl-tip">每完成一个当日习惯；今天共有 ${hs.length} 个习惯。</div></div>
        <div class="rule-card"><div class="rl-name">小测答对</div><div class="rl-val">+${PR.quizRight} 分</div><div class="rl-tip">单词小测答对一题；每日上限 ${quizCapDay()} 分，防止刷分。</div></div>
        <div class="rule-card"><div class="rl-name">连续学习奖励</div><div class="rl-val">已连续 ${streak} 天</div><div class="rl-tip">里程碑一次性发放：${streakMilestones().map(([d,p])=>d+" 天 +"+p).join(" / ")}。断签只重置连续天数，已得积分不清零。</div></div>
      </div>

      <div class="sec-title">⚠️ 行为扣分规则 <small>只扣行为，不扣学习 · 每日上限 ${penaltyCapDay()} 分 · 欠分下限 -${penaltyFloor()} 分 · 当天改正可撤销返还 · 由家长在「🛠 后台」记录</small></div>
      <div class="task-grid">
        ${penaltyList().map(p=>`
        <div class="rule-card pen">
          <div class="rl-name">${esc(p.icon||"⚠️")} ${esc(p.name)}</div>
          <div class="rl-val neg">-${p.cost} 分</div>
          <div class="rl-tip">${esc(p.tip||"")}。当天改正后家长撤销即可返还，同一项一天只记一次。</div>
        </div>`).join("")}
      </div>
      <p class="af-tip" style="margin:-4px 0 0">扣分只影响积分余额：<b>学习类积分只加不减</b>，连续天数不受行为扣分影响 —— 忘打卡不会被追回，做得好才加分。</p>

      <div class="sec-title">🎁 奖励商城 <small>短中长期目标并存 · 按最近 7 天速度估算所需时间（仅供参考，实际要看每天完成情况）</small></div>
      <div class="task-grid">
        ${rewardList().map(r=>{
          const can=state.points>=r.cost;
          const need=r.cost-state.points;
          const days=Math.ceil(need/avg);
          const pct=Math.min(100, Math.round(state.points/r.cost*100));
          return `<div class="card rw-card">
            <div class="c-meta"><span class="badge" style="background:#fef3c7;color:#b45309">${esc(r.icon||"🎁")} ${r.cost} 分</span>${can?`<span style="color:var(--green);font-weight:700">可兑换</span>`:`<span style="color:var(--muted)">还差 ${need}</span>`}</div>
            <h4>${esc(r.name)}</h4>
            <div class="rw-bar"><div style="width:${pct}%"></div></div>
            <div class="rw-tip">${esc(r.tip||"")}${can?"":` · 按 ${avg} 分/天约还需 ${days} 天`}</div>
            <button class="btn ${can?"primary":""}" style="margin-top:8px;width:100%" data-redeem="${esc(r.id)}" ${can?"":"disabled"}>${can?"立即兑换 🛍️":"攒够自动解锁 🔒"}</button>
          </div>`;
        }).join("")}
      </div>

      <div class="sec-title">🧾 积分流水 <small>最近 ${Math.min(20,(state.pointLog||[]).length)} 条 · 学习所得不会因漏打卡被扣回 · 行为扣分由家长记录，改正后可撤销 · 学会积分加错了可「撤销」（退分并取消该卡已学）· 撤销需验证家长口令</small></div>
      ${(state.pointLog||[]).length?`<div class="admin-list">
        ${(state.pointLog||[]).slice(0,20).map(x=>`<div class="admin-item"><div class="ai-main"><b style="color:${x.n>0?"#166534":"#b91c1c"}">${x.n>0?"+":""}${x.n}</b> ${x.n<0?`<span class="badge" style="background:#fef2f2;color:#b91c1c">行为扣分</span>`:""}${esc(x.note)} <span style="font-size:12px;color:var(--muted)">${esc(x.t)}</span></div>${/^learn:/.test(x.hook)?`<button class="btn" style="font-size:12px;padding:2px 8px" data-undo-learn="${esc(x.hook.slice(6))}" title="退回这 +${x.n} 分，并取消该卡的已学标记（加错时用）">撤销</button>`:""}${/^pen:/.test(x.hook)?`<button class="btn" style="font-size:12px;padding:2px 8px" data-undo-pen="${esc(x.hook)}" title="孩子已改正 → 返还 +${-x.n} 分">撤销</button>`:""}</div>`).join("")}
      </div>`:'<div class="placeholder" style="padding:16px">还没有积分记录，去首页完成今天的任务吧 🚀</div>'}

      <div class="sec-title">📦 兑换记录 <small>兑换后需家长在「🛠 后台」确认兑现</small></div>
      ${(state.redeems||[]).length?`<div class="admin-list">
        ${(state.redeems||[]).map((r,i)=>`<div class="admin-item">
          <div class="ai-main"><b>${esc(r.icon||"🎁")} ${esc(r.name)}</b> <span class="badge" style="background:${r.status==="已兑现"?"#ecfdf5":"#fff7ed"};color:${r.status==="已兑现"?"#16a34a":"#ea580c"}">${esc(r.status)}</span> <span style="font-size:12px;color:var(--muted)">-${r.cost} 分 · ${esc(r.t)}</span></div>
        </div>`).join("")}
      </div>`:'<div class="placeholder" style="padding:16px">还没有兑换过奖励</div>'}
    `;
    el.querySelectorAll("[data-redeem]").forEach(b=>b.addEventListener("click", ()=>redeemReward(b.dataset.redeem)));
    // 积分流水撤销：先过家长口令（requireAdmin），再弹确认框（confirmUndo）
    el.querySelectorAll("[data-undo-learn]").forEach(b=>b.addEventListener("click", ()=>{
      requireAdmin(()=>confirmUndo("learn", b.dataset.undoLearn));
    }));
    el.querySelectorAll("[data-undo-pen]").forEach(b=>b.addEventListener("click", ()=>{
      requireAdmin(()=>confirmUndo("pen", b.dataset.undoPen));
    }));
  }

  /* ---------- 后台：资源库（内置教材按 学科×年级×类型 交叉分类，可直接修改） ---------- */
  const RES_STEP = 30;
  let biView = { q:"", type:"全部", subj:"全部", grade:"全部", volume:"全部", tag:"", learn:"全部", limit:RES_STEP };
  function openAdminEdit(key){
    const it = INDEX[key] || EXTRA.find(e=>e.key===key);
    if(!it){ toast("没找到这条内容"); return; }
    modalKey=it.key; modalVid=0; modalAdmin=false; modalEdit=true;
    renderEditForm(it);
  }
  function renderAdminLogin(){
    const el = $("#view-admin");
    el.innerHTML = `
      <div class="subj-head"><h2>🔒 后台登录</h2><span class="cnt">内容后台需验证口令</span></div>
      <p class="subj-desc">后台可以添加 / 修改学习素材，所以加了一道口令。默认账号 <b>admin</b>、密码 <b>123456</b>；登录后点后台顶部「🔑 修改密码」即可改成你自己的。</p>
      <div class="admin-form" style="max-width:460px">
        <div class="af-row"><label class="af-grow">账号<input id="lgUser" value="${esc(state.admin.user)}" placeholder="admin" /></label></div>
        <div class="af-row"><label class="af-grow">密码<input id="lgPwd" type="password" placeholder="请输入密码" /></label></div>
        <div class="af-actions">
          <button class="btn primary" id="lgBtn">登录</button>
          <button class="btn" id="lgReset">忘记密码</button>
        </div>
        <p class="af-tip">口令只保存在本机浏览器（localStorage），没有服务器，它防的是随手点开，不是专业破解。</p>
      </div>`;
    const tryLogin=()=>{
      const u=$("#lgUser").value.trim(), p=$("#lgPwd").value;
      if(!p){ toast("请输入密码"); return; }
      if(u!==state.admin.user || pwHash(p,state.admin.salt)!==state.admin.hash){
        toast("账号或密码不正确"); $("#lgPwd").value=""; $("#lgPwd").focus(); return;
      }
      state.adminAuthed=true; save(); toast("登录成功 ✅"); renderAdmin();
    };
    $("#lgBtn").onclick=tryLogin;
    $("#lgPwd").addEventListener("keydown", e=>{ if(e.key==="Enter") tryLogin(); });
    $("#lgReset").onclick=()=>{
      if(!confirm("口令无法在线找回。重置为默认 admin / 123456 吗？（不会清空学习数据）")) return;
      setAdminPassword("123456"); save(); toast("已重置为 admin / 123456");
    };
  }
  function renderAdminPwdForm(){
    const el = $("#view-admin");
    el.innerHTML = `
      <div class="subj-head"><h2>🔑 修改后台口令</h2><span class="cnt">当前账号：${esc(state.admin.user)}</span></div>
      <div class="admin-form" style="max-width:460px">
        <div class="af-row"><label class="af-grow">当前密码<input id="pwOld" type="password" /></label></div>
        <div class="af-row"><label class="af-grow">新密码<input id="pwNew" type="password" placeholder="至少 4 位" /></label></div>
        <div class="af-row"><label class="af-grow">确认新密码<input id="pwNew2" type="password" /></label></div>
        <div class="af-actions">
          <button class="btn primary" id="pwSave">保存</button>
          <button class="btn" id="pwCancel">取消</button>
        </div>
      </div>`;
    $("#pwCancel").onclick=()=>renderAdmin();
    $("#pwSave").onclick=()=>{
      const o=$("#pwOld").value, n=$("#pwNew").value, n2=$("#pwNew2").value;
      if(pwHash(o,state.admin.salt)!==state.admin.hash){ toast("当前密码不正确"); return; }
      if(n.length<4){ toast("新密码至少 4 位"); return; }
      if(n!==n2){ toast("两次输入的新密码不一致"); return; }
      setAdminPassword(n); save(); toast("密码已修改 ✅"); renderAdmin();
    };
  }

  /* ---------- 资源页（与后台平级）：站内全部内置内容，按 学科×年级×类型 交叉分类 ---------- */
  function biData(){
    // 资源页展示站内全部内容：内置条目（诗词/成语/单词/动画/教材）+ 已导入/后台添加的内容（如英语阅读、历史指南）
    // 按 学科 × 年级 × 类型 × 册 × 标签 五维交叉归类（统一分面筛选）；后台只是管理入口（增删改），内容主展示位就在这里。
    const customSet = new Set((CUSTOM||[]).map(x=>x.key));
    const builtins = ALL.filter(x=>x.key!=="practice:maththought" && !/^mtq:/.test(x.key));
    // 结构型标签（年级/册/学科/类型名）不应污染「主题标签」分面，避免与对应维度重复
    const isStructTag = t => !t || GRADES.includes(t) || VOLUMES.includes(t) || SUBJECT_TYPES[t] || Object.values(SUBJECT_TYPES).some(arr=>arr.includes(t));
    // 联动筛选：每个维度的候选与计数，都在「其他维度已选条件」的范围内计算
    const matchExcept = except => builtins.filter(x=>{
      if(except!=="subj"   && biView.subj   !=="全部" && subjOf(x)!==biView.subj)   return false;
      if(except!=="grade"  && biView.grade  !=="全部" && x.grade  !==biView.grade)  return false;
      if(except!=="type"   && biView.type   !=="全部" && x.type   !==biView.type)   return false;
      if(except!=="volume" && biView.volume !=="全部" && x.volume !==biView.volume) return false;
      if(except!=="tag"    && biView.tag && !(x.tags||[]).includes(biView.tag))     return false;
      if(except!=="learn"  && biView.learn!=="全部" && isLearnedKey(x.key) !== (biView.learn==="已学")) return false;
      return true;
    });
    const cntBy=(arr,fn)=>{ const m=new Map(); arr.forEach(x=>{ const k=fn(x)||""; m.set(k,(m.get(k)||0)+1); }); return m; };
    const chipsFor=(m, sel, order)=>{
      // 当前选中的项即使计数为 0 也要保留（否则用户点不到「全部」回不去）
      if(sel && sel!=="全部" && !m.has(sel)) m.set(sel, 0);
      const out=[...m.entries()].filter(([k,c])=>c>0 || k===sel).sort((a,b)=>{
        if(order){ const ia=order.indexOf(a[0]), ib=order.indexOf(b[0]); return (ia<0?99:ia)-(ib<0?99:ib); }
        return a[0]<b[0]?-1:1;
      });
      return out;
    };
    const subjM=cntBy(matchExcept("subj"), subjOf);
    const gradeM=cntBy(matchExcept("grade").filter(x=>x.grade), x=>x.grade);
    const typeM=cntBy(matchExcept("type"), x=>x.type);
    const volumeM=cntBy(matchExcept("volume").filter(x=>x.volume), x=>x.volume);
    // 主题标签：聚合所有条目的 tags，排除结构型标签（年级/册/学科/类型），按词频降序最多取 24 个
    const tagM=new Map();
    matchExcept("tag").forEach(x=>(x.tags||[]).forEach(t=>{ if(!isStructTag(t)) tagM.set(t,(tagM.get(t)||0)+1); }));
    let tagEntries=[...tagM.entries()].sort((a,b)=>b[1]-a[1]);
    if(biView.tag && !tagM.has(biView.tag)) tagEntries.unshift([biView.tag, 0]); // 选中项即便当前 0 也保留
    tagEntries=tagEntries.slice(0,24);
    const filtered = builtins.filter(x=>{
      if(biView.subj!=="全部" && subjOf(x)!==biView.subj) return false;
      if(biView.grade!=="全部" && x.grade!==biView.grade) return false;
      if(biView.type!=="全部" && x.type!==biView.type) return false;
      if(biView.volume!=="全部" && x.volume!==biView.volume) return false;
      if(biView.tag && !(x.tags||[]).includes(biView.tag)) return false;
      if(biView.learn!=="全部" && isLearnedKey(x.key) !== (biView.learn==="已学")) return false;
      if(biView.q){ const q=biView.q.toLowerCase(); if(!(x.title+" "+(x.sub||"")).toLowerCase().includes(q)) return false; }
      return true;
    });
    // 导入/自添加的素材排在最前；同组内按添加顺序倒序，最近导入的排最前（刚导入即刻可见，无需展开「显示更多」）
    const custIdx = new Map(state.custom.map((x,i)=>[x.key, i]));
    filtered.sort((a,b)=>{
      const ca=custIdx.has(a.key), cb=custIdx.has(b.key);
      if(ca && cb) return custIdx.get(b.key) - custIdx.get(a.key); // 最近添加在前
      return (cb?1:0) - (ca?1:0);
    });
    return {
      builtins, filtered, show: filtered.slice(0, biView.limit),
      customCnt: builtins.filter(x=>customSet.has(x.key)).length,
      subjChips: [["全部", matchExcept("subj").length], ...chipsFor(subjM, biView.subj, ["语文","数学","英语","科学","人文"])],
      gradeChips:[["全部", matchExcept("grade").length], ...chipsFor(gradeM, biView.grade, GRADES)],
      typeChips: [["全部", matchExcept("type").length], ...chipsFor(typeM, biView.type)],
      volumeChips:[["全部", matchExcept("volume").length], ...chipsFor(volumeM, biView.volume)],
      tagChips: [["全部", matchExcept("tag").length], ...tagEntries],
      learnChips:[["全部", matchExcept("learn").length], ...chipsFor(cntBy(matchExcept("learn"), x=> isLearnedKey(x.key) ? "已学" : "未学"), biView.learn, ["已学","未学"])],
      active: biView.subj!=="全部"||biView.grade!=="全部"||biView.type!=="全部"||biView.volume!=="全部"||!!biView.tag||biView.learn!=="全部"||!!biView.q
    };
  }
  function renderRes(){
    const el = $("#view-res");
    const D = biData();
    const ovCnt = Object.keys(state.overrides||{}).length;
    const subjects = D.subjChips.slice(1); // 学科板块（去掉「全部」），我的素材+内置已合并计数
    el.innerHTML = `
      <div class="subj-head"><h2>📚 资源中心</h2><span class="cnt">站内全部内容 · 按 学科 板块合并 · 再按 年级 × 类型 × 册 × 标签 交叉筛选</span></div>

      <p class="subj-desc">这里汇总站内所有内容，<b>全部合并进下方学科板块</b>：你在「后台」导入或添加的素材（如英语阅读练习、历史学习指南）排在各板块最前，卡片会<b>自动打上内容标签</b>（如「英语阅读」「历史知识」，紫色即本机添加，可删除；蓝色「内置」为站内自带）。点卡片上的「查看」即可打开阅读，「✏️ 修改」改内容（改过的标「已改」，点「⤺」还原）。下方五维分面（<b>学科 / 年级 / 类型 / 册 / 标签</b>）可任意叠加交叉筛选——例如「语文 → 诗词 → 四年级 → 写景」，或「英语 → 单词 → 三年级上册」。后台只负责增删改的管理，正常浏览就在这里。所有改动只存本机浏览器，不写回代码仓库；重要数据（如七年级英语词库）记得在后台「💾 数据备份」导出保存，防止清缓存丢失。</p>

      <details class="res-import" ${D.customCnt?"":"open"}>
        <summary>📥 批量导入素材（粘贴 JSON）<small>从「后台」移来 · 整批添加内容</small></summary>
        <div class="res-import-body">
          <textarea id="biBulk" class="af-block" rows="4" placeholder='粘贴 JSON 数组，例如 [{"subject":"语文","type":"文言","grade":"四年级","title":"xx","body":"..."}]'></textarea>
          <div class="af-actions">
            <button class="btn primary" id="biBulkBtn">批量导入</button>
            <span class="af-tip">支持整年级内容的数组（自动归类到 学科 / 类型 / 年级）；也可直接粘贴原始 data.json 结构（含 poems / idioms / words 字段）一次性导入。导入的内容会自动按内容打上标签（如「英语阅读」「语文诗词」）、并入对应学科板块且排在最前。单条逐条添加请到「🛠 后台」。</span>
          </div>
        </div>
      </details>

      <div class="res-tiles">
        ${subjects.map(([s,c])=>`<button class="res-tile ${biView.subj===s?"on":""}" data-bi-subj="${esc(s)}"><span class="rt-num">${c}</span><span class="rt-lbl">${esc(s)}</span></button>`).join("")}
      </div>

      <div class="chips">
        <span class="lbl">年级：</span>
        ${D.gradeChips.map(([g,c])=>`<button class="chip ${biView.grade===g?"on":""}" data-bi-grade="${esc(g)}">${esc(g)} ${c}</button>`).join("")}
      </div>
      <div class="chips">
        <span class="lbl">类型：</span>
        ${D.typeChips.map(([t,c])=>`<button class="chip ${biView.type===t?"on":""}" data-bi-type="${esc(t)}">${esc(t)} ${c}</button>`).join("")}
      </div>
      <div class="chips">
        <span class="lbl">册：</span>
        ${D.volumeChips.map(([g,c])=>`<button class="chip ${biView.volume===g?"on":""}" data-bi-volume="${esc(g)}">${esc(g)} ${c}</button>`).join("")}
      </div>
      <div class="chips">
        <span class="lbl">标签：</span>
        ${D.tagChips.map(([t,c])=>`<button class="chip ${biView.tag===t?"on":""}" data-bi-tag="${esc(t)}">${biView.tag===t?"#":""}${esc(t)} ${c}</button>`).join("")}
      </div>
      <div class="chips">
        <span class="lbl">状态：</span>
        ${D.learnChips.map(([t,c])=>`<button class="chip ${biView.learn===t?"on":""}" data-bi-learn="${esc(t)}">${esc(t)} ${c}</button>`).join("")}
      </div>
      <div class="chips">
        ${D.active?`<button class="btn" id="biReset" title="清空全部筛选条件">✕ 清空筛选</button>`:""}
        <span style="flex:1"></span>
        <input id="biSearch" class="search-input" style="width:220px" placeholder="搜标题 / 拼音 / 类型…" value="${esc(biView.q)}" />
      </div>

      <div class="subj-head" style="margin-top:6px"><span class="cnt">共 ${D.filtered.length} 条匹配${D.active?` · 已叠加分面筛选`:""}${ovCnt?` · 其中 ${ovCnt} 条已修改`:""}${D.customCnt?` · 本机添加 ${D.customCnt} 条排在最前`:""}</span></div>

      <div class="res-grid" id="biGrid">
        ${D.show.length?D.show.map(x=>{
          const ov=(state.overrides||{})[x.key];
          const isCustom = (CUSTOM||[]).some(c=>c.key===x.key); // 后台添加 + 批量导入/注入素材
          return `<div class="res-card" data-bi-row data-bi-text="${esc((x.title+" "+(x.sub||"")+" "+x.type).toLowerCase())}">
            <div class="rc-top">
              ${badge(x.type)}
              <span class="tag ${isCustom?"tag-custom":"tag-built"}" title="${isCustom?"本机添加的素材":"内置素材"}">${isCustom?esc([subjOf(x),x.type].filter(Boolean).join("")||"自定义"):"内置"}</span>
            </div>
            <div class="rc-title">${esc(x.title)}</div>
            ${x.sub?`<div class="rc-sub">${esc(x.sub.slice(0,40))}</div>`:""}
            <div class="rc-tags">
              ${x.grade?`<span class="tag" style="cursor:default">#${esc(x.grade)}</span>`:""}
              ${x.volume?`<span class="tag" style="cursor:default">#${esc(x.volume)}</span>`:""}
              ${x.unit?`<span class="tag" style="cursor:default">#${esc(x.unit)}</span>`:""}
              ${ov?`<span class="badge" style="background:#fef3c7;color:#b45309">已改</span>`:""}
            </div>
            <div class="rc-actions">
              <button class="btn" data-res-open="${esc(x.key)}">查看</button>
              <button class="btn" data-bi-edit="${esc(x.key)}">✏️ 修改</button>
              ${ov?`<button class="btn" data-bi-revert="${esc(x.key)}" title="还原原文">⤺</button>`:""}
              ${isCustom?`<button class="btn" data-bi-del="${esc(x.key)}" title="删除该素材">🗑 删除</button>`:""}
            </div>
          </div>`;
        }).join("")
        : '<div class="placeholder"><div class="big">🔍</div>没有匹配的资源，换个筛选条件试试</div>'}
      </div>
      ${D.filtered.length>biView.limit?`<div style="margin-top:12px"><button class="btn" id="biMore">显示更多（当前 ${D.show.length} / ${D.filtered.length}）</button></div>`:""}
      <p class="af-tip">说明：① 数学「公式 / 每日一练」已按小节拆散，这里改的是<b>单条小节</b>（如「一、口算」），改原整篇请搜单元名；② 想新增素材可展开上方「📥 批量导入」，单条添加请到「🛠 后台」—— 添加后都会<b>直接归位到本页</b>（自动内容标签 + 删除按钮也在这里）。</p>
    `;
    bindResEvents(el);
  }
  function bindResEvents(el){
    const biSearch=$("#biSearch");
    if(biSearch) biSearch.addEventListener("input", ()=>{
      biView.q=biSearch.value.trim();
      const q=biView.q.toLowerCase();
      document.querySelectorAll("#biGrid [data-bi-row]").forEach(r=>{
        r.hidden = !!(q && !(r.getAttribute("data-bi-text")||"").includes(q));
      });
    });
    // 批量导入（从后台移来）
    const biBulkBtn=$("#biBulkBtn");
    if(biBulkBtn) biBulkBtn.addEventListener("click", ()=>{
      const added=runBulkImport($("#biBulk").value);
      if(added>0){ renderRes(); refreshView(); }
    });
    // 查看：打开内容弹窗
    el.querySelectorAll("[data-res-open]").forEach(b=>b.addEventListener("click", ()=>{
      const k=b.dataset.resOpen;
      const it = ALL.find(x=>x.key===k) || INDEX[k];
      if(it) openModal(it);
    }));
    el.querySelectorAll("[data-bi-type]").forEach(b=>b.addEventListener("click", ()=>{ biView.type=b.dataset.biType; renderRes(); }));
    el.querySelectorAll("[data-bi-subj]").forEach(b=>b.addEventListener("click", ()=>{ biView.subj=b.dataset.biSubj; renderRes(); }));
    el.querySelectorAll("[data-bi-grade]").forEach(b=>b.addEventListener("click", ()=>{ biView.grade=b.dataset.biGrade; renderRes(); }));
    el.querySelectorAll("[data-bi-learn]").forEach(b=>b.addEventListener("click", ()=>{ biView.learn=b.dataset.biLearn; renderRes(); }));
    el.querySelectorAll("[data-bi-volume]").forEach(b=>b.addEventListener("click", ()=>{ biView.volume=b.dataset.biVolume; renderRes(); }));
    el.querySelectorAll("[data-bi-tag]").forEach(b=>b.addEventListener("click", ()=>{ biView.tag=b.dataset.biTag; renderRes(); }));
    el.querySelectorAll("[data-bi-edit]").forEach(b=>b.addEventListener("click", ()=>openAdminEdit(b.dataset.biEdit)));
    el.querySelectorAll("[data-bi-revert]").forEach(b=>b.addEventListener("click", ()=>{
      const k=b.dataset.biRevert;
      if(state.overrides && state.overrides[k]){ delete state.overrides[k]; save(); rebuildAll(); toast("已还原原文 ⤺"); renderRes(); }
    }));
    // 删除我的素材（后台添加 / 批量导入的条目；管理入口在资源页）
    el.querySelectorAll("[data-bi-del]").forEach(b=>b.addEventListener("click", ()=>{
      const k=b.dataset.biDel;
      const it=INDEX[k];
      if(!confirm("删除素材《"+((it&&it.title)||k)+"》？删除后不可恢复（内置教材不受影响）。")) return;
      state.custom=(state.custom||[]).filter(x=>x.key!==k); save(); rebuildAll();
      toast("已删除该素材 🗑"); renderRes(); refreshView();
    }));
    const biReset=$("#biReset");
    if(biReset) biReset.addEventListener("click", ()=>{
      biView.subj="全部"; biView.grade="全部"; biView.type="全部"; biView.volume="全部"; biView.tag=""; biView.learn="全部"; biView.q=""; biView.limit=RES_STEP;
      renderRes();
    });
    const biMore=$("#biMore");
    if(biMore) biMore.addEventListener("click", ()=>{ biView.limit+=RES_STEP; renderRes(); });
  }

  function renderAdmin(){
    const el = $("#view-admin");
    const subjects = Object.keys(SUBJECT_TYPES);
    el.innerHTML = `
      <div class="subj-head"><h2>🛠 内容后台</h2><span class="cnt">添加素材，系统自动归类到 学科 / 类型 / 年级</span></div>
      <div class="chips">
        <span class="badge" style="background:#eef2ff;color:#3730a3">🔒 已登录：${esc(state.admin.user)}</span>
        <button class="btn" id="btnChgPwd">🔑 修改密码</button>
        <button class="btn" id="btnLogout">退出登录</button>
      </div>
      <p class="subj-desc">填写下表即可新增一条素材；系统会按你选择的「学科 + 类型 + 年级 + 册」自动归入对应栏目与筛选，并在首页、标签、搜索中同步出现。已添加的内容保存在本机浏览器（localStorage）。</p>
      <div class="admin-form">
        <div class="af-row">
          <label>学科<select id="afSubject">${subjects.map(s=>`<option>${s}</option>`).join("")}</select></label>
          <label>类型<select id="afType"></select></label>
          <label>年级<select id="afGrade"><option>—</option>${GRADES.map(g=>`<option>${g}</option>`).join("")}</select></label>
          <label>册<select id="afVolume"><option>—</option><option>上册</option><option>下册</option></select></label>
          <label>单元<input id="afUnit" placeholder="可空"/></label>
        </div>
        <div class="af-row">
          <label class="af-grow">标题<input id="afTitle" placeholder="必填"/></label>
          <label>作者 / 朝代<input id="afSub" placeholder="可空"/></label>
        </div>
        <label class="af-block">正文 / 内容<textarea id="afBody" rows="3" placeholder="请输入内容"></textarea></label>
        <div class="af-row">
          <label class="af-grow">标签（逗号分隔）<input id="afTags" placeholder="多个标签用逗号分隔，可空"/></label>
          <label class="af-grow">视频链接（逗号 / 换行分隔，可空）<input id="afVideos" placeholder="B站 / 腾讯 / YouTube / 本地 videos/xxx.mp4"/></label>
        </div>
        <div class="af-actions">
          <button class="btn primary" id="afSubmit">＋ 添加素材</button>
          <button class="btn" id="afClear">清空表单</button>
          <span class="af-tip">提示：年级留「—」且类型为诗词时，系统会按诗题自动匹配部编版年级。</span>
        </div>
      </div>

      <div class="sec-title">🛍 兑换审核 · 奖励设置 <small>孩子提交的兑换需家长在这里确认兑现；可自定义奖励目录</small></div>
      <div class="admin-list">
        ${(state.redeems||[]).length? (state.redeems||[]).map((r,i)=>`<div class="admin-item">
            <div class="ai-main"><b>${esc(r.icon||"🎁")} ${esc(r.name)}</b> <span class="badge" style="background:${r.status==="已兑现"?"#ecfdf5":"#fff7ed"};color:${r.status==="已兑现"?"#16a34a":"#ea580c"}">${esc(r.status)}</span> <span style="font-size:12px;color:var(--muted)">-${r.cost} 分 · ${esc(r.t)}</span></div>
            <div style="display:flex;gap:6px;flex:0 0 auto">
              ${r.status==="已兑现"
                ?`<button class="btn" data-rd-undo="${i}" title="退回积分">↩ 退回</button>`
                :`<button class="btn primary" data-rd-ok="${i}">✅ 已兑现</button><button class="btn" data-rd-undo="${i}" title="退回积分">↩ 退回</button>`}
            </div>
          </div>`).join("")
        : '<div class="placeholder"><div class="big">🛍</div>还没有兑换记录；孩子在「🎁 奖励」页提交兑换后会显示在这里</div>'}
      </div>
      <div class="admin-form" style="margin-top:10px">
        <div class="af-row">
          <label>图标<input id="rwIcon" style="width:70px" value="🎁" /></label>
          <label class="af-grow">奖励名称<input id="rwName" placeholder="如 周末去游乐园" /></label>
          <label>所需积分<input id="rwCost" type="number" style="width:110px" placeholder="如 3000" /></label>
        </div>
        <div class="af-actions">
          <button class="btn primary" id="rwAdd">＋ 添加奖励</button>
          <button class="btn" id="rwReset">恢复默认目录</button>
        </div>
        <p class="af-tip">当前生效目录：${rewardList().map(r=>esc(r.icon||"🎁")+r.name+"("+r.cost+")").join(" · ")}</p>
      </div>

      <div class="sec-title">⚙️ 扣分项设置 <small>自定义扣分项目与分值 · 记录入口在「首页 → ⚠️ 今日行为扣分」，记录与撤销在「📊 本周」页</small></div>
      <div class="admin-form" style="margin-top:10px">
        <div class="af-row">
          <label>图标<input id="pnIcon" style="width:70px" value="⚠️" /></label>
          <label class="af-grow">扣分项<input id="pnName" placeholder="如 挑食 / 打断别人说话" /></label>
          <label>扣分值<input id="pnCost" type="number" style="width:100px" placeholder="如 5" /></label>
        </div>
        <div class="af-actions">
          <button class="btn primary" id="pnAdd">＋ 添加扣分项</button>
          <button class="btn" id="pnReset">恢复默认扣分项</button>
        </div>
        <p class="af-tip">建议单项 5~10 分（约半天到一天的积累），只把最重的分留给原则问题；扣分是为了提醒，不是为了让分数清零 —— 当天改正一定要记得撤销返还。</p>
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

      <div class="sec-title">🗄 存档与版本（${loadArchives().length}）<small>本机快照 · 可随时回退 · 还原前会自动再备份一份（撤回有据）</small></div>
      <div class="chips"><button class="btn primary" id="arcNow">💾 立即存档</button></div>
      <div class="admin-list">
        ${(()=>{ const arcs=loadArchives(); return arcs.length? arcs.map((a,i)=>`<div class="admin-item">
            <div class="ai-main"><b>${esc(a.t)}</b> <span class="badge" style="background:${a.auto?"#f1f5f9":"#eef2ff"};color:${a.auto?"#475569":"#3730a3"}">${a.auto?"自动":"手动"}</span> <span style="font-size:13px;color:var(--muted)">${esc(a.note||"")}</span> <span style="font-size:12px;color:var(--muted)">${(a.size/1024).toFixed(1)} KB</span></div>
            <div style="display:flex;gap:6px;flex:0 0 auto">
              <button class="btn" data-arc-restore="${i}">⤺ 还原此版本</button>
              <button class="va-del" data-arc-del="${i}" title="删除存档">✕</button>
            </div>
          </div>`).join("")
        : '<div class="placeholder"><div class="big">🗄</div>还没有存档；点上方「💾 立即存档」保存当前全部进度</div>'; })()}
      </div>
      <p class="af-tip">存档内容：学习进度、打卡、习惯、复习记录、后台素材与所有内容修改。最多保留 ${ARCHIVE_MAX} 份，超出时自动淘汰最早的「自动」存档；手动存档优先保留。每天首次打开网站会自动存一份。</p>

      <div class="sec-title">📅 学习板块排程（学习的始终）<small>为每个「学科·类型」设定开启、开始日、结束日与每周频次；按学科分组、可折叠 · 已穷举全部板块（含自定义素材，如 英语·阅读、历史·知识）</small></div>
      <div class="sched-groups">
        ${(()=>{
          // 穷举所有真实存在的「学科·类型」板块（含自定义素材），而非仅内置 CHECKIN_TYPES
          const boardMap = {};
          ALL.forEach(x=>{ if(x.subject && x.type && gradeOk(x)){ const key=x.subject+"||"+x.type; (boardMap[key]=boardMap[key]||{subject:x.subject,type:x.type,count:0}).count++; } });
          const subs = [...new Set([...allSubjects(), ...Object.values(boardMap).map(b=>b.subject)])]
            .filter(s=>Object.values(boardMap).some(b=>b.subject===s));
          return subs.map(sub=>{
            const boards = Object.values(boardMap).filter(b=>b.subject===sub).sort((a,b)=>a.type.localeCompare(b.type,"zh"));
            if(!boards.length) return "";
            return `<details class="sched-group">
              <summary><span class="sg-subj">${esc(sub)}</span><span class="sg-cnt">${boards.length} 个板块 · 点击折叠</span></summary>
              <div class="sg-body">
                ${boards.map(({subject,type,count})=>{
                  const k=checkinKey(subject,type);
                  const sp=sectionPlanOf(k);
                  const on=checkinOn(subject,type);
                  return `<div class="sched-item">
                    <label class="sched-on"><input type="checkbox" data-sched-on="${esc(k)}" ${on?"checked":""}/> <b>${esc(subject)}·${esc(type)}</b><span class="sg-count">共 ${count} 条</span></label>
                    <label>开始<input type="date" data-sched-start="${esc(k)}" value="${esc(sp.start||"")}"/></label>
                    <label>结束<input type="date" data-sched-end="${esc(k)}" value="${esc(sp.end||"")}"/></label>
                    <label>每周频次<input type="number" min="1" max="7" data-sched-freq="${esc(k)}" value="${sp.freq||weekFreqOf(subject,type)}"/></label>
                  </div>`;
                }).join("")}
              </div>
            </details>`;
          }).join("");
        })()}
      </div>
      <div class="chips"><button class="btn primary" id="schedSave">💾 保存排程</button></div>
      <p class="af-tip">「开始日」之前该板块不排课；「结束日」之后视为已结课；「每周频次」覆盖系统默认排课密度（1~7 次/周）。留空则沿用系统默认。首页每个板块会显示「已学 N/总 M · 开始日 · 预计完成日」的进度条。</p>

      <div class="sec-title">🏆 自定义积分规则<small>当前学生（${esc(curStudentName())}）独立生效 · 留空即恢复内置默认值</small></div>
      <div class="admin-form">
        <div class="af-row" style="flex-wrap:wrap;gap:10px">
          <label>学会/打卡 +<input type="number" min="0" id="ruleLearn" value="${pointRules().learn}" style="width:80px"/> 分</label>
          <label>到期复习 +<input type="number" min="0" id="ruleReview" value="${pointRules().review}" style="width:80px"/> 分</label>
          <label>习惯打卡 +<input type="number" min="0" id="ruleHabit" value="${pointRules().habit}" style="width:80px"/> 分</label>
          <label>小测答对 +<input type="number" min="0" id="ruleQuiz" value="${pointRules().quizRight}" style="width:80px"/> 分</label>
          <label>小测每日上限 <input type="number" min="0" id="ruleQuizCap" value="${quizCapDay()}" style="width:80px"/> 分</label>
        </div>
        <div class="af-row" style="flex-wrap:wrap;gap:10px">
          <label>每日扣分上限 <input type="number" min="1" id="rulePenCap" value="${penaltyCapDay()}" style="width:80px"/> 分</label>
          <label>欠分下限 -<input type="number" min="0" id="rulePenFloor" value="${penaltyFloor()}" style="width:80px"/> 分</label>
          <label class="af-grow">连续里程碑（格式 天数:分数，逗号分隔）
            <input id="ruleStreak" value="${streakMilestones().map(([d,p])=>d+":"+p).join(",")}" placeholder="3:20,7:50,14:100,21:150,30:200,60:500,100:1000"/>
          </label>
        </div>
        <div class="af-actions">
          <button class="btn primary" id="rulesSave">💾 保存积分规则</button>
          <button class="btn" id="rulesReset">↩ 恢复默认</button>
        </div>
        <p class="af-tip">改动只影响之后的计分，已发放的积分不变。连续里程碑一次性发放（达成即给），断签只重置天数、不清积分。规则随学生档案独立保存，并会随云同步到其他设备。</p>
      </div>

      <div class="sec-title">☁️ 云端同步（跨域名 / 跨设备）<small>绑定同一个 Cloudflare KV 后，两个域名、不同设备共享同一份数据；靠「同步密钥」作为云端存储键，无需注册</small></div>
      <div class="admin-form">
        <div class="af-row">
          <label class="af-grow">同步密钥<input id="syncPass" type="password" placeholder="设一个只有家里人知道的词，如 xiaoming2026" value="${esc((state.sync&&state.sync.pass)||"")}" /></label>
          <label style="align-self:center"><input type="checkbox" id="syncOn" ${cloudSyncEnabled()?"checked":""}/> 启用云同步</label>
        </div>
        <div class="af-actions">
          <button class="btn primary" id="syncNow">🔄 立即同步（拉取 + 推送）</button>
          <span class="af-tip" id="syncStatus">${(state.sync&&state.sync.at)? "上次同步："+new Date(state.sync.at).toLocaleString() : "尚未同步"}</span>
        </div>
        <p class="af-tip">开启后，每次保存会自动推送到云端；打开网站会自动拉取最新。所有域名（xuetang.201573.xyz 等）都统一读写<strong>同一份</strong>云端数据，天然互通，无需各自配置。密钥即账号：知道密钥的人可读写这份数据，请勿外泄。仍建议偶尔用下方「导出备份」留一份本地副本。</p>
      </div>

      <div class="sec-title">💾 数据备份（导出 / 导入文件）<small>把全部数据（含后台素材、七年级英语词库等）存成文件，换设备 / 清缓存前请先备份</small></div>
      <div class="chips">
        <button class="btn primary" id="btnExport">⬇️ 导出备份文件</button>
        <button class="btn" id="btnImport">⬆️ 导入备份文件</button>
        <input id="impFile" type="file" accept="application/json,.json" style="display:none" />
      </div>
      <p class="af-tip">⚠️ 所有数据<strong>仅存本机浏览器</strong>，清缓存 / 换设备会丢失（例如七年级英语词库只在本机）。导出的 <code>.json</code> 文件可安全保存；导入会用备份<strong>整体覆盖</strong>当前数据（登录口令保留）。建议把这份备份也放进代码仓库或云盘，作为固化素材的来源。</p>
    `;
    // 内置教材：搜索过滤 / 修改 / 还原 / 显示更多
    // 兑换审核 · 自定义奖励
    el.querySelectorAll("[data-rd-ok]").forEach(b=>b.addEventListener("click", ()=>{
      const r=(state.redeems||[])[parseInt(b.dataset.rdOk,10)]; if(!r) return;
      r.status="已兑现"; save(); toast("已确认兑现 ✅"); renderAdmin(); if(view.name==="reward") renderReward();
    }));
    el.querySelectorAll("[data-rd-undo]").forEach(b=>b.addEventListener("click", ()=>{
      const i=parseInt(b.dataset.rdUndo,10); const r=(state.redeems||[])[i]; if(!r) return;
      if(!confirm("退回这次兑换？将返还 "+r.cost+" 分。")) return;
      state.points += r.cost;
      state.pointLog.unshift({ t:fmt(new Date()), n:r.cost, note:"退回兑换 "+r.name, hook:"" });
      (state.redeems||[]).splice(i,1);
      save(); toast("已退回 "+r.cost+" 分"); renderAdmin(); if(view.name==="reward") renderReward();
    }));
    const rwAdd=$("#rwAdd");
    if(rwAdd) rwAdd.addEventListener("click", ()=>{
      const name=($("#rwName").value||"").trim(), cost=parseInt($("#rwCost").value,10);
      if(!name){ toast("请填写奖励名称"); return; }
      if(!cost || cost<=0){ toast("请填写所需积分（正整数）"); return; }
      state.rewards = Array.isArray(state.rewards) ? state.rewards.slice() : DEFAULT_REWARDS.slice();
      state.rewards.push({ id:"rw"+Date.now(), icon:($("#rwIcon").value||"🎁").trim(), name, cost, tip:"" });
      state.rewards.sort((a,b)=>a.cost-b.cost);
      save(); toast("已添加奖励 🎁"); renderAdmin();
    });
    const rwReset=$("#rwReset");
    if(rwReset) rwReset.addEventListener("click", ()=>{
      if(!confirm("恢复为系统默认奖励目录？自定义奖励将被清除。")) return;
      state.rewards=null; save(); toast("已恢复默认目录"); renderAdmin();
    });
    // 扣分项自定义（记录入口在首页，记录/撤销在本周页）
    const pnAdd=$("#pnAdd");
    if(pnAdd) pnAdd.addEventListener("click", ()=>{
      const name=($("#pnName").value||"").trim(), cost=parseInt($("#pnCost").value,10);
      if(!name){ toast("请填写扣分项名称"); return; }
      if(!cost || cost<=0){ toast("请填写扣分分值（正整数）"); return; }
      state.penalties = (Array.isArray(state.penalties)&&state.penalties.length) ? state.penalties.slice() : DEFAULT_PENALTIES.slice();
      state.penalties.push({ id:"pn"+Date.now(), icon:($("#pnIcon").value||"⚠️").trim(), name, cost, tip:"自定义扣分项" });
      state.penalties.sort((a,b)=>a.cost-b.cost);
      save(); toast("已添加扣分项"); renderAdmin();
    });
    const pnReset=$("#pnReset");
    if(pnReset) pnReset.addEventListener("click", ()=>{
      if(!confirm("恢复为系统默认扣分项？自定义项将被清除。")) return;
      state.penalties=null; save(); toast("已恢复默认扣分项"); renderAdmin();
    });
    // 存档与版本：立即存档 / 还原 / 删除
    const arcNow=$("#arcNow");
    if(arcNow) arcNow.onclick=()=>{ archiveCreate("手动存档"); renderAdmin(); toast("已存档 💾 可随时在下方还原"); };
    el.querySelectorAll("[data-arc-restore]").forEach(b=>b.onclick=()=>{
      const arcs=loadArchives(); const a=arcs[parseInt(b.dataset.arcRestore,10)]; if(!a) return;
      if(!confirm("把全部数据还原到 "+a.t+" "+(a.note||"")+" ？\n当前状态会先自动备份一份，可随时再退回来。")) return;
      archiveRestore(parseInt(b.dataset.arcRestore,10));
    });
    el.querySelectorAll("[data-arc-del]").forEach(b=>b.onclick=()=>{
      const arcs=loadArchives(); arcs.splice(parseInt(b.dataset.arcDel,10),1); saveArchives(arcs); renderAdmin(); toast("已删除该存档");
    });
    // 数据备份：导出 / 导入文件
    const btnExport=$("#btnExport");
    if(btnExport) btnExport.onclick=()=>exportBackup();
    const btnImport=$("#btnImport"), impFile=$("#impFile");
    if(btnImport) btnImport.onclick=()=>{ if(impFile) impFile.click(); };
    if(impFile) impFile.onchange=()=>{ const f=impFile.files&&impFile.files[0]; if(f) importBackupFile(f); if(impFile) impFile.value=""; };
    // 学习板块排程：保存每个板块的开启 / 起止日 / 每周频次
    const schedSave=$("#schedSave");
    if(schedSave) schedSave.onclick=()=>{
      state.sectionPlan = state.sectionPlan || {};
      state.checkin = state.checkin || {};
      document.querySelectorAll("[data-sched-on]").forEach(cb=>{
        const k=cb.dataset.schedOn;
        const start=(document.querySelector('[data-sched-start="'+CSS.escape(k)+'"]')||{}).value||"";
        const end=(document.querySelector('[data-sched-end="'+CSS.escape(k)+'"]')||{}).value||"";
        const freqRaw=(document.querySelector('[data-sched-freq="'+CSS.escape(k)+'"]')||{}).value||"";
        const freq=parseInt(freqRaw,10);
        state.checkin[k] = !!cb.checked;                 // 开启/关闭
        if(!start && !end && (!freq||isNaN(freq))){ delete state.sectionPlan[k]; }
        else { state.sectionPlan[k] = {
          start: start||"", end: end||"",
          freq: (freq>=1&&freq<=7)?freq:undefined
        }; }
      });
      save(); toast("已保存学习板块排程 📅"); renderAdmin(); renderHome(); if(view.name==="week") renderWeek();
    };
    // 自定义积分规则：保存 / 恢复默认
    const rulesSave=$("#rulesSave");
    if(rulesSave) rulesSave.onclick=()=>{
      const v=id=>{ const e=$(id); return e?e.value.trim():""; };
      const R = state.rules = state.rules || {};
      R.learn=v("#ruleLearn"); R.review=v("#ruleReview"); R.habit=v("#ruleHabit"); R.quizRight=v("#ruleQuiz");
      R.quizCapDay=v("#ruleQuizCap"); R.penaltyCapDay=v("#rulePenCap"); R.penaltyFloor=v("#rulePenFloor");
      const st=v("#ruleStreak");
      if(st===""){ R.streakMilestones=""; }
      else{
        const pairs = st.split(/[,，]/).map(x=>x.trim()).filter(Boolean).map(x=>{
          const m=x.match(/^(\d+)\s*[:：]\s*(\d+)$/); return m?[+m[1],+m[2]]:null;
        });
        if(pairs.some(x=>!x)){ toast("里程碑格式不对：应为 天数:分数，如 3:20,7:50"); return; }
        R.streakMilestones = pairs.sort((a,b)=>a[0]-b[0]);
      }
      save(); toast("积分规则已保存 ✅"); renderAdmin(); if(view.name==="reward") renderReward();
    };
    const rulesReset=$("#rulesReset");
    if(rulesReset) rulesReset.onclick=()=>{
      state.rules={}; save(); toast("已恢复默认积分规则"); renderAdmin(); if(view.name==="reward") renderReward();
    };
    // 云端同步：配置变更 / 立即同步
    const syncOn=$("#syncOn"), syncPass=$("#syncPass"), btnSyncNow=$("#syncNow"), syncStatus=$("#syncStatus");
    function syncCfgChange(){
      state.sync = state.sync || {};
      state.sync.enabled = !!(syncOn && syncOn.checked);
      state.sync.pass = (syncPass && syncPass.value||"").trim();
      save();
      if(syncStatus) syncStatus.textContent = state.sync.enabled ? "已启用，保存即同步" : "已关闭";
    }
    if(syncOn) syncOn.onchange=syncCfgChange;
    if(syncPass) syncPass.onchange=syncCfgChange;
    if(btnSyncNow) btnSyncNow.onclick=async ()=>{
      if(syncOn && !syncOn.checked){ toast("请先勾选启用云同步"); return; }
      const pass=(syncPass && syncPass.value||"").trim();
      if(!pass){ toast("请填写同步密钥"); return; }
      state.sync = state.sync || {}; state.sync.enabled=true; state.sync.pass=pass; save();
      if(syncStatus) syncStatus.textContent="同步中…";
      try{
        const pulled = await syncNow();
        if(syncStatus) syncStatus.textContent = "上次同步：" + new Date(state.sync.at||Date.now()).toLocaleString();
        toast(pulled ? "已从云端更新并上传 ☁️" : "已上传到云端 ☁️");
        renderAdmin(); // 成功才重渲染；失败时保留错误信息不被覆盖
      }catch(e){
        const msg = (e && e.message) || String(e);
        if(syncStatus) syncStatus.textContent = "同步失败：" + msg;
        toast("同步失败：" + msg);
      }
    };
    // 后台口令：修改 / 退出登录
    const bLogout=$("#btnLogout"), bPwd=$("#btnChgPwd");
    if(bLogout) bLogout.onclick=()=>{ state.adminAuthed=false; save(); toast("已退出登录"); go("home"); };
    if(bPwd) bPwd.onclick=()=>renderAdminPwdForm();
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
      refreshView();
    };
    $("#afClear").onclick=()=>{ ["afTitle","afSub","afBody","afTags","afVideos","afUnit"].forEach(i=>$("#"+i).value=""); };
    // 还原被覆盖的内置内容
    el.querySelectorAll("[data-revert-custom]").forEach(b=>b.onclick=()=>{
      const k=b.dataset.revertCustom; if(state.overrides && state.overrides[k]){ delete state.overrides[k]; save(); rebuildAll(); toast("已还原内置内容 ⤺"); renderAdmin(); }
      refreshView();
    });
  }

  /* ---------- 总渲染 ---------- */
  function refreshView(){
    if(!$("#view-"+view.name)){ // 目标容器不存在（旧缓存）→ 退回首页，保证站点可用
      if($("#view-home")){ view={name:"home", param:null}; setNav("home"); renderHome(); }
      return;
    }
    if(view.name==="home") renderHome();
    else if(view.name==="week") renderWeek();
    else     if(view.name==="reward") renderReward();
    else if(view.name==="res") renderRes();
    else if(view.name==="subject") renderSubject(view.param);
    else if(view.name==="tag") renderTag(view.param);
    else if(view.name==="search") renderSearch(view.param);
    else if(view.name==="admin"){ if(state.adminAuthed) renderAdmin(); else renderAdminLogin(); }
  }
  function render(){
    const VIEWS=["home","week","reward","res","subject","tag","search","admin"];
    // 容错：若浏览器缓存了旧版 index.html（缺少新增的页面容器），不要整体崩掉
    VIEWS.forEach(n=>{ const v=$("#view-"+n); if(v) v.hidden = (n!==view.name); });
    if(!$("#view-"+view.name)){ // 当前页容器不存在 → 退回首页
      view={name:"home", param:null};
      VIEWS.forEach(n=>{ const v=$("#view-"+n); if(v) v.hidden = (n!=="home"); });
    }
    setNav(view.name);
    refreshView();
  }

  /* ---------- 事件绑定 ---------- */
  // 顶部导航
  $("#mainNav").addEventListener("click", e=>{
    const b=e.target.closest(".nav-btn"); if(!b) return;
    if(b.classList.contains("future")){ toast("该栏目规划中，内容导入后自动上线"); return; }
    const v=b.dataset.view;
    if(v==="admin"){ go("admin"); return; }
    if(v==="home"||v==="week"||v==="reward"||v==="res"){ go(v); return; } // 首页 / 本周 / 奖励 / 资源（非学科页）
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
    const orderT=e.target.closest("[data-order-toggle]");
    if(orderT){ state.orderMode = (orderT.dataset.orderToggle==="smart") ? "smart" : "seq"; save(); refreshView(); toast(state.orderMode==="smart"?"已切换为「智能」顺序（弱项优先）":"已切换为「顺序」模式（按导入序）"); return; }
    const tag=e.target.closest(".tag[data-tag]");
    if(tag){ go("tag", tag.dataset.tag); return; }
    const gsub=e.target.closest("[data-goto-subject]");
    if(gsub){ go("subject", gsub.dataset.gotoSubject); return; }
    const cnT=e.target.closest("[data-cn-type]");
    if(cnT){ cnView.type=cnT.dataset.cnType; cnView.grade="全部"; cnView.q=""; cnView.learn="all"; renderSubject("语文"); return; }
    const cnG=e.target.closest("[data-cn-grade]");
    if(cnG){ cnView.grade=cnG.dataset.cnGrade; renderSubject("语文"); return; }
    const cnL=e.target.closest("[data-cn-learn]");
    if(cnL){ cnView.learn=cnL.dataset.cnLearn||"all"; renderSubject("语文"); return; }
    const cnClr=e.target.closest("[data-cn-clear]");
    if(cnClr){ cnView.grade="全部"; cnView.q=""; cnView.learn="all"; renderSubject("语文"); toast("已清除筛选，返回全部内容 ↩️"); return; }
    const cnAdd=e.target.closest("[data-cn-add]");
    if(cnAdd){ openSubjectAdd("语文", cnView?cnView.type:""); return; }
    const gnAdd=e.target.closest("[data-gn-add]");
    if(gnAdd){ const s=view.param; openSubjectAdd(s||"", (gnView[s]||{}).type||""); return; }
    const gnT=e.target.closest("[data-gn-type]");
    if(gnT){ const s=view.param; gnView[s]=gnView[s]||{}; gnView[s].type=gnT.dataset.gnType; gnView[s].grade="全部"; gnView[s].q=""; gnView[s].unit="全部"; gnView[s].tag=""; renderSubject(s); return; }
    const gnG=e.target.closest("[data-gn-grade]");
    if(gnG){ const s=view.param; gnView[s]=gnView[s]||{}; gnView[s].grade=gnG.dataset.gnGrade; gnView[s].tag=""; renderSubject(s); return; }
    const gnV=e.target.closest("[data-gn-volume]");
    if(gnV){ const s=view.param; gnView[s]=gnView[s]||{}; gnView[s].volume=gnV.dataset.gnVolume; gnView[s].unit="全部"; gnView[s].tag=""; renderSubject(s); return; }
    const gnU=e.target.closest("[data-gn-unit]");
    if(gnU){ const s=view.param; gnView[s]=gnView[s]||{}; gnView[s].unit=gnU.dataset.gnUnit; gnView[s].tag=""; renderSubject(s); return; }
    const gnTag=e.target.closest("[data-gn-tag]");
    if(gnTag){ const s=view.param; gnView[s]=gnView[s]||{}; gnView[s].tag=gnTag.dataset.gnTag||""; renderSubject(s); return; }
    const gnF=e.target.closest("[data-gn-flash]");
    if(gnF){ const s=view.param; const pe=$("#view-subject"); openFlashcards((pe&&pe._gnPool)||[], (s||"学科")+" · "+((gnView[s]||{}).type||"")); return; }
    const cnF=e.target.closest("[data-cn-flash]");
    if(cnF){ const pe=$("#view-subject"); openFlashcards((pe&&pe._cnPool)||[], "语文 · "+(cnView?cnView.type:"语文")); return; }
    const sg=e.target.closest("[data-switch-grade]");
    if(sg){ state.grade=sg.dataset.switchGrade; gs.value=state.grade; save(); render(); toast("已切换到 "+state.grade); }
    const hdel=e.target.closest("[data-habit-del]");
    if(hdel){ const h=hdel.dataset.habitDel; state.habits=state.habits.filter(x=>x!==h); save(); toast("已删除习惯："+h); refreshView(); return; }
    const penB=e.target.closest("[data-pen]");
    if(penB){
      const r=penalize(penB.dataset.pen);
      if(r>0) toast("已扣 "+r+" 分（不可撤销）⚠️");
      else if(r===-1) toast("这一项今天已经记过了");
      else if(r===-2) toast("今日扣分已达上限（"+penaltyCapDay()+" 分），明天再说");
      else if(r===-3) toast("已到欠分下限（-"+penaltyFloor()+" 分），先挣回来再扣");
      refreshView(); return;
    }
    const hadd=e.target.closest("[data-habit-add]");
    if(hadd){ const inp=$("#habitNew"); const v=((inp&&inp.value)||"").trim(); if(v&&!state.habits.includes(v)){ state.habits.push(v); save(); toast("已添加习惯："+v); } refreshView(); return; }
    const wgb=e.target.closest("[data-word-game]");
    if(wgb){ openWordGame(wgb.dataset.wordGame); return; }
    const hb=e.target.closest("[data-habit]");
    if(hb){ const h=hb.dataset.habit; const t=fmt(new Date()); state.habitLog[t]=state.habitLog[t]||{}; if(state.habitLog[t][h]) delete state.habitLog[t][h]; else { state.habitLog[t][h]=true; awardQuiet(pointRules().habit, "习惯打卡 · "+h, "habit:"+t+":"+h, true); settleBonuses(); } save(); refreshView(); return; }
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
  // 闪卡键盘操作：← → 切换、空格翻面（焦点在按钮/输入框时让位，避免与 click 双触发）
  document.addEventListener("keydown", e=>{
    if($("#modal").hidden || !fcState.deck.length) return;
    if(/^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||"")) return;
    if(e.key==="ArrowLeft"){ e.preventDefault(); fcNav(-1); }
    else if(e.key==="ArrowRight"){ e.preventDefault(); fcNav(1); }
    else if(e.key===" "){ e.preventDefault(); fcFlip(); }
  });

  /* ---------- 启动 ---------- */
  { const _a=loadArchives(); if(!_a.length || (_a[0].t||"").slice(0,10)!==fmt(new Date())) archiveCreate("每日自动存档", true); }
  initCloudSync().catch(()=>{}); // 启动即拉取云端最新（启用时）；本地先渲染，拉到后再刷新
  render();
  // 测试钩子（仅当显式开启 window.__ENABLE_TEST__ 时挂载，正常站点无副作用）
  if(typeof window!=="undefined" && window.__ENABLE_TEST__){
    window.__SITE__ = {
      get state(){ return state; },
      get ALL(){ return ALL; },
      get INDEX(){ return INDEX; },
      rebuildAll, switchStudent, applyPerStudent, syncPerStudent, save, GRADES,
      openModal, mathBodyHTML, effBody, renderAdmin, renderAdminLogin, renderAdminPwdForm,
      pwHash, setAdminPassword, wordQuizOptions, openAdminEdit,
      archiveCreate, archiveRestore, loadArchives, renderWeek, renderHome, refreshView,
      renderReward, award, awardQuiet, redeemReward, rewardList, renderRes, currentStreak,
      get biView(){ return biView; }, settleBonuses, pointToday, pointTodayNet, pointWeekNet, POINT_RULES, DEFAULT_REWARDS,
      get cnView(){ return cnView; }, get gnView(){ return gnView; },
      penalize, undoPenalty, penaltyList, penaltyToday, penaltyLogToday, penaltyLogWeek, PENALTY_CAP_DAY, PENALTY_FLOOR, DEFAULT_PENALTIES,
      requireAdmin, adminGateTry, confirmUndo, confirmUnlearn,
      todayTasks, poolFor, poolForAll, libPoolFor, splitSections, weekDatesMondayStart, weekPlan, motherOrdered, extraSubjects, allSubjects, cnPool,
      cardHTML, sanitizeRich, stripTags, seedDefaultContent, biData, renderRes, renderSubject, renderTag, renderSearch, renderLibModal, go, get biView(){ return biView; },
      openWordGame, wordGamePool, get wgBound(){ return wgBound; }, runBulkImport,
      openFlashcards, fcFlip, fcNav, fcShuffle, fcKnown, get fcState(){ return fcState; },
      getMastery, setMastery, practicePriority, addDays, sectionPlanOf, sectionActive, ebIntervalsFor, sectionItems, seqSkipMastered, dueReview, weekFreqOf, dayDiff, fmt,
      cloudSyncEnabled, sha256Hex, syncPush, syncPull, initCloudSync, syncNow, applyStateDefaults, get state(){ return state; }, weekGoalData, openWeekGoal,
      pointRules, quizCapDay, streakMilestones, penaltyCapDay, penaltyFloor, renderCalGrid, openCalDay, openLibSection,
      inTodayGoal, undoLearn, isLearnedKey,
      studyLibData, subjectTypesOf, openSubjectAdd
    };
  }
})();
