/* 七年级 · 中国历史 · 第一单元 史前时期 学习指南
 * 作为「历史·知识」后台素材注入（grade:"七年级"，仅七年级可见，可在 后台→已添加素材 删除）。
 * 正文为富文本（html:true），由 app.js 的 .guide-body 样式渲染。
 * 如需彻底移除：删本文件 + 在 后台 删除对应素材即可；如需重新导入：见 history_guide_7.json。
 */
(function(){
  function hg(key, title, sub, body){
    return {
      key: "hg:" + key,
      subject: "历史", type: "知识", grade: "七年级",
      title: title, sub: sub || "",
      body: body, html: true,
      volume: "", unit: "",
      tags: ["七年级", "历史", "第一单元·史前时期"],
      videos: []
    };
  }

  const ITEMS = [];

  /* 一、单元概览 */
  ITEMS.push(hg("overview", "一、单元概览", "史前时期 · 知识框架", `
<div class="lead">本单元跨越 <b>距今约 170 万年</b> 到 <b>距今约 4000 多年</b> 的漫长史前时期，主线是：<b>古人类出现 → 原始农业与定居 → 文明起源与早期国家 → 华夏族与传说时代</b>。教材强调两条证据链——<b>考古发掘</b>（化石、遗址、器物）与 <b>古史传说</b>，并点明中华文明起源 <b>"多元一体"</b> 的特征。</div>
<div class="card"><span class="tag">单元三大课标要求</span><div class="kv">
<div class="row"><div class="k">人类起源</div><div class="v">了解元谋人、蓝田人、郧县人、北京人等古人类活动，知道我国是人类起源的重要地区；初步认识考古发掘成果是研究人类起源的重要依据。</div></div>
<div class="row"><div class="k">农业起源</div><div class="v">知道河姆渡、半坡等遗址，了解我国史前文化与社会发展，认识我国是世界上农业起源地之一。</div></div>
<div class="row"><div class="k">文明起源</div><div class="v">知道良渚古城、陶寺古城等考古发现，了解中华文明有 5000 多年历史，认识其起源与初步发展具有"多元一体"特征；知道炎帝、黄帝等古史传说蕴含的历史信息。</div></div>
</div></div>
`));

  /* 二、时空坐标轴 */
  ITEMS.push(hg("timeline", "二、时空坐标轴", "按时间由远及近", `
<div class="timeline">
<div class="tl-row"><div class="tl-time">约170万年</div><div class="tl-dot"></div><div class="tl-body"><b>元谋人</b>（云南元谋）— 我国境内目前已知最早的古人类之一</div></div>
<div class="tl-row"><div class="tl-time">约160万年</div><div class="tl-dot"></div><div class="tl-body"><b>蓝田人</b>（陕西蓝田，完整头骨化石）</div></div>
<div class="tl-row"><div class="tl-time">约100万年</div><div class="tl-dot"></div><div class="tl-body"><b>郧县人</b>（湖北郧阳，3个头骨化石）</div></div>
<div class="tl-row"><div class="tl-time">约70万—20万年</div><div class="tl-dot"></div><div class="tl-body"><b>北京人</b>（北京周口店）— 直立人，学会用火</div></div>
<div class="tl-row"><div class="tl-time">约3万年</div><div class="tl-dot"></div><div class="tl-body"><b>山顶洞人</b>（周口店山顶洞穴）— 晚期智人，模样同现代人</div></div>
<div class="tl-row"><div class="tl-time">约2万年</div><div class="tl-dot"></div><div class="tl-body"><b>早期管理野生植物</b>；江西万年仙人洞 <b>世界最早陶器</b>（约2万年前陶片）</div></div>
<div class="tl-row"><div class="tl-time">约1万年</div><div class="tl-dot"></div><div class="tl-body">南北方出现<b>人工栽培农作物</b>（水稻、粟、黍）；新石器时代开始</div></div>
<div class="tl-row"><div class="tl-time">约9000—7500年</div><div class="tl-dot"></div><div class="tl-body"><b>贾湖遗址</b>（河南舞阳）— 炭化稻粒、家猪、七声音阶骨笛、刻符龟甲</div></div>
<div class="tl-row"><div class="tl-time">约7000年</div><div class="tl-dot"></div><div class="tl-body"><b>河姆渡人</b>（浙江余姚）— 稻作农业、干栏式建筑；仰韶文化开端</div></div>
<div class="tl-row"><div class="tl-time">约7000—5000年</div><div class="tl-dot"></div><div class="tl-body"><b>仰韶文化</b>（黄河中游）— 粟作农业、彩陶</div></div>
<div class="tl-row"><div class="tl-time">约6000年</div><div class="tl-dot"></div><div class="tl-body"><b>半坡人</b>（陕西西安）— 半地穴式房屋、养蚕缫丝</div></div>
<div class="tl-row"><div class="tl-time">约5900—4400年</div><div class="tl-dot"></div><div class="tl-body"><b>大汶口文化</b>（黄河下游）— 晚期出现贫富分化</div></div>
<div class="tl-row"><div class="tl-time">约5800—5000年</div><div class="tl-dot"></div><div class="tl-body"><b>红山文化·牛河梁</b>（西辽河）— 祭坛、女神庙、积石冢</div></div>
<div class="tl-row"><div class="tl-time">约5300—4300年</div><div class="tl-dot"></div><div class="tl-body"><b>良渚古城</b>（浙江余杭）— 水利系统、玉琮玉钺，长江下游早期国家</div></div>
<div class="tl-row"><div class="tl-time">约5000多年</div><div class="tl-dot"></div><div class="tl-body">农业畜牧业大发展、城市出现、<b>早期国家诞生</b>（私有制、阶级、国家为文明标志）</div></div>
<div class="tl-row"><div class="tl-time">约4400—3800年</div><div class="tl-dot"></div><div class="tl-body"><b>龙山文化</b>— 蛋壳黑陶杯（壁不足1毫米）</div></div>
<div class="tl-row"><div class="tl-time">约4300—4000年</div><div class="tl-dot"></div><div class="tl-body"><b>陶寺古城</b>（山西襄汾）— 宫城、朱书符号、观象台，黄河中游早期国家</div></div>
<div class="tl-row"><div class="tl-time">约4000多年</div><div class="tl-dot"></div><div class="tl-body">中原崛起，广泛吸收各地文明要素，<b>走向一体</b></div></div>
<div class="tl-row"><div class="tl-time">五六千年前</div><div class="tl-dot"></div><div class="tl-body"><b>部落联盟时期</b>— 炎帝、黄帝、蚩尤；阪泉、涿鹿之战；禅让制（尧舜禹）</div></div>
</div>
<div class="note"><b>记忆口诀：</b>"远古有人北京火，万年农耕河姆渡；半坡仰韶彩陶出，良渚陶寺国家初；炎黄子孙人文祖，多元一体五千年。"</div>
`));

  /* 三、第1课 */
  ITEMS.push(hg("l1", "三、第 1 课　远古时期的人类活动", "元谋人 · 北京人 · 山顶洞人", `
<div class="card"><span class="tag">我国境内的古人类</span><div class="kv">
<div class="row"><div class="k">总体地位</div><div class="v">我国是世界上发现古人类化石和<b>旧石器时代</b>遗址最多的国家之一，遗址遍布全国各地。</div></div>
<div class="row"><div class="k">元谋人</div><div class="v">云南元谋；<b>距今约170万年</b>；两颗上门齿化石＋粗糙石器；我国境内目前已知<b>最早的古人类之一</b>，已能制作和使用工具。</div></div>
<div class="row"><div class="k">蓝田人</div><div class="v">陕西蓝田；<b>距今约160万年</b>；一个完整头骨化石。</div></div>
<div class="row"><div class="k">郧县人</div><div class="v">湖北郧阳（今十堰）；<b>距今约100万年</b>；3个头骨化石。</div></div>
</div></div>
<div class="card"><span class="tag">人类演化序列</span><div class="kv">
<div class="row"><div class="k">链条</div><div class="v">古猿 → 能直立行走、制作工具（脑容量增加）→ <b>能人</b> → <b>直立人</b> →（约20万年）<b>早期智人</b> →（约5万年）<b>晚期智人＝现代人</b></div></div>
<div class="row"><div class="k">化石意义</div><div class="v">化石是地层中石化的古代生物遗骸/遗迹，是研究古人类历史与古环境变迁的<b>重要证据</b>。</div></div>
</div></div>
<div class="card"><span class="tag">北京人</span><div class="kv">
<div class="row"><div class="k">地点·时间</div><div class="v">北京周口店龙骨山；堆积层厚40多米；<b>1921年发现</b>，<b>裴文中1929年</b>发现第一个北京人头盖骨化石及用火遗迹；生活于<b>距今约70万—20万年</b>。</div></div>
<div class="row"><div class="k">出土规模</div><div class="v">40多个个体的直立人化石、大量动物化石、约<b>10万件打制石器</b>。</div></div>
<div class="row"><div class="k">体质特征</div><div class="v">前额低平、眉骨粗大、颧骨突出、鼻骨扁平、吻部前伸；脑容量平均<b>1088毫升</b>（现代人约1400）；身高平均157厘米；上肢近现代人，下肢略长，能<b>直立行走</b>。</div></div>
<div class="row"><div class="k">生产·生活</div><div class="v">用石块、兽骨、鹿角制工具（<b>砍砸器、尖状器、刮削器</b>）；结群生活，猎取动物、采集果实。</div></div>
<div class="row"><div class="k">用火</div><div class="v">遗址有灰烬、烧石、烧骨，证明<b>已会使用火</b>（烧烤食物、防寒、照明、驱兽）；学会用火是<b>人类演化史上的里程碑</b>。</div></div>
<div class="row"><div class="k">遗址地位</div><div class="v">周口店北京人遗址是迄今所知世界上<b>内涵最丰富、材料最齐全的直立人遗址之一</b>，对研究人类起源与演化意义重大。</div></div>
</div></div>
<div class="card"><span class="tag alt">山顶洞人</span><div class="kv">
<div class="row"><div class="k">地点·时间</div><div class="v">周口店龙骨山顶洞穴；<b>距今约3万年</b>；属<b>晚期智人</b>，模样与现代人相同。</div></div>
<div class="row"><div class="k">技术·生活</div><div class="v">继续使用打制石器，并掌握<b>磨光和钻孔技术</b>、制作骨器；可能<b>人工取火</b>；采集、狩猎、捕鱼、缝衣；活动范围大，有交往。</div></div>
<div class="row"><div class="k">观念</div><div class="v">有<b>爱美意识</b>（骨针、装饰品）、有<b>埋葬死者</b>行为；集体生活，共同劳动分配，<b>无贫富贵贱差别</b>；脑容量1300—1500毫升。</div></div>
</div></div>
<div class="note"><b>关键区分：</b>北京人 = 直立人、打制石器、会用天然火、群体生活；山顶洞人 = 晚期智人、磨光钻孔、可能人工取火、有爱美与埋葬观念。山顶洞人"更进步"体现在体质、工具技术、用火方式、精神生活四方面。</div>
`));

  /* 四、第2课 */
  ITEMS.push(hg("l2", "四、第 2 课　原始农业与史前社会", "河姆渡 · 半坡 · 大汶口", `
<div class="card"><span class="tag">农业起源与定居</span><div class="kv">
<div class="row"><div class="k">起源地位</div><div class="v">我国是<b>世界上农业起源地之一</b>；距今约2万年管理野生植物，<b>距今约1万年</b>南北方出现人工栽培农作物；<b>世界最早栽培的水稻、粟、黍均发现于我国</b>。</div></div>
<div class="row"><div class="k">定居生活</div><div class="v">农业促进定居：<b>磨制石器、制陶、饲养家畜</b>；原始农业为古代文明社会奠定重要基础。</div></div>
<div class="row"><div class="k">陶器</div><div class="v">我国是最早出现制陶技术的国家；江西万年仙人洞陶片约<b>2万年前</b>，为已知世界最早陶器。</div></div>
<div class="row"><div class="k">新石器</div><div class="v"><b>新石器时代</b>＝主要使用磨制石器的时代（区别于旧石器时代的打制石器）。</div></div>
</div></div>
<div class="card"><span class="tag">河姆渡人（长江下游）</span><div class="kv">
<div class="row"><div class="k">地点·时间</div><div class="v">浙江余姚河姆渡；<b>距今约7000年</b>；稻作农业兴盛区。</div></div>
<div class="row"><div class="k">房屋</div><div class="v"><b>干栏式建筑</b>（木桩插地、上构木板屋）；发现<b>木结构水井</b>（年代最早之一）。</div></div>
<div class="row"><div class="k">农业·家畜</div><div class="v">大量水稻遗存；<b>骨耜</b>为先进农具；家畜以猪、狗为主，兼猎野猪、鹿。</div></div>
<div class="row"><div class="k">手工业</div><div class="v">天然漆、陶器、玉器、骨哨；<b>双鸟朝阳纹象牙雕刻器</b>（已知我国最早象牙雕刻器）。</div></div>
</div></div>
<div class="card"><span class="tag">仰韶文化 · 半坡人（黄河中游）</span><div class="kv">
<div class="row"><div class="k">仰韶文化</div><div class="v">黄河中游，<b>距今约7000—5000年</b>，因河南渑池仰韶村得名；<b>粟作农业</b>；<b>彩陶</b>（鱼、鸟、花纹）是重要特征；养蚕缫丝。</div></div>
<div class="row"><div class="k">半坡人</div><div class="v">陕西西安半坡村，<b>距今约6000年</b>；<b>半地穴式房屋</b>（屋内有灶坑）；种粟黍、养猪狗、弓箭渔叉渔猎。</div></div>
<div class="row"><div class="k">手工业</div><div class="v">精美磨制石器、装饰品、<b>陶埙</b>、骨针骨锥、陶/石纺轮（<b>已会纺织制衣</b>）。</div></div>
</div></div>
<div class="card"><span class="tag alt">大汶口 · 龙山 · 氏族社会</span><div class="kv">
<div class="row"><div class="k">大汶口文化</div><div class="v">黄河下游与淮河中下游，<b>距今约5900—4400年</b>；晚期制陶发展，同一墓地随葬品多寡悬殊，<b>出现贫富分化</b>。</div></div>
<div class="row"><div class="k">龙山文化</div><div class="v">大汶口后继者，<b>距今约4400—3800年</b>；<b>蛋壳黑陶杯</b>（壁最薄不足1毫米），需快轮与高超烧窑技术。</div></div>
<div class="row"><div class="k">氏族社会</div><div class="v">仰韶时期是氏族社会兴盛期（西坡大房子）；早期墓地贫富无显著差别，<b>距今5000年前后晚期出现明显分化</b>。</div></div>
</div></div>
<div class="note"><b>关键区分：</b>河姆渡（长江、南方、稻作、干栏式、骨耜）⇄ 半坡（黄河、北方、粟作、半地穴式、彩陶/纺轮）。房屋类型差异源于<b>南方湿热多水 vs 北方干冷</b>的地理环境。</div>
`));

  /* 五、第3课 */
  ITEMS.push(hg("l3", "五、第 3 课　中华文明的起源", "早期国家 · 多元一体 · 远古传说", `
<div class="card"><span class="tag">早期国家与文明标志</span><div class="kv">
<div class="row"><div class="k">背景</div><div class="v">约5000多年前，农业畜牧业大发展、人口集中、<b>早期城市</b>形成（城墙、城壕、水利）；社会分化加剧，出现专事管理的<b>王</b>。</div></div>
<div class="row"><div class="k">文明标志</div><div class="v"><b>私有制、阶级和国家的产生</b>是人类进入文明社会的重要标志。</div></div>
<div class="row"><div class="k">红山文化</div><div class="v">西辽河流域牛河梁（辽宁朝阳），距今约5800—5000年；祭坛、女神庙、积石冢，反映社会分化与祭祀礼仪。</div></div>
</div></div>
<div class="card"><span class="tag">两大古城（考古实证）</span><div class="kv">
<div class="row"><div class="k">良渚古城</div><div class="v">浙江余杭，<b>距今约5300—4300年</b>；宫殿区＋内城(约300万㎡)＋外城(约630万㎡)；<b>世界同期最大水利工程</b>；约20万千克炭化稻谷；贵族墓随葬玉琮、玉璧、玉钺，阶级分化明显 → 证实<b>长江下游约5000年已出现早期国家</b>。</div></div>
<div class="row"><div class="k">陶寺古城</div><div class="v">山西襄汾，<b>距今约4300—4000年</b>；面积280万㎡、宫城；大型墓随葬陶鼓、石磬、玉钺、陶盘，小墓无随葬、有人殉，阶级分化严重；随葬品来源广（各地汇聚中原）、小件青铜器、朱书符号陶壶、观象台遗迹 → 表明<b>黄河中游已出现早期国家</b>（或为尧都）。</div></div>
</div></div>
<div class="card"><span class="tag">多元一体</span><div class="kv">
<div class="row"><div class="k">含义</div><div class="v">距今5000年左右，<b>黄河、长江、西辽河</b>流域各具特色早期文明，彼此交流融合，构成早期中华文明主体；距今4000多年<b>中原崛起、走向一体</b>，以中原为引领的文明新格局形成。</div></div>
</div></div>
<div class="card"><span class="tag alt">远古的传说</span><div class="kv">
<div class="row"><div class="k">部落联盟</div><div class="v">五六千年前，黄河流域有炎帝、黄帝、蚩尤等部落；<b>阪泉之战</b>黄帝胜炎帝（结盟），<b>涿鹿之战</b>炎黄胜蚩尤；联盟演化为<b>华夏族</b>。</div></div>
<div class="row"><div class="k">人文初祖</div><div class="v">炎帝、黄帝被尊为中华民族<b>人文初祖</b>；海内外华人自称"炎黄子孙"。</div></div>
<div class="row"><div class="k">禅让制</div><div class="v">尧→舜→禹依次为首领，<b>传位贤德之人</b>；尧发展生产，舜定刑法派禹治水，禹治水有功尊"大禹"。</div></div>
<div class="row"><div class="k">大禹治水</div><div class="v">改其父鲧"封堵"为<b>疏导</b>，开凿河渠引洪入海，<b>"三过其门而不入"</b>——公而忘私的奉献精神。</div></div>
<div class="row"><div class="k">探源工程</div><div class="v">中华文明探源工程提出判断文明的"中国方案"，将"中华文明五千年"从传说论证为可信历史。</div></div>
</div></div>
<div class="note"><b>考古 vs 传说：</b>良渚、陶寺等<b>考古发现</b>是文明起源的实物证据；炎黄、尧舜禹等<b>古史传说</b>蕴含早期族群融合与治水的历史信息，二者相互印证。</div>
`));

  /* 六、核心对比表 */
  ITEMS.push(hg("cmp", "六、核心对比表（必背）", "三张表格横向比较", `
<h3>表1　北京人 vs 山顶洞人</h3>
<table><tr><th>项目</th><th>北京人</th><th>山顶洞人</th></tr>
<tr><td>类型</td><td>直立人</td><td>晚期智人（模样同现代人）</td></tr>
<tr><td>生活年代</td><td>距今约70万—20万年</td><td>距今约3万年</td></tr>
<tr><td>脑容量</td><td>平均1088毫升</td><td>1300—1500毫升</td></tr>
<tr><td>制作工具</td><td>打制石器（砍砸器、尖状器、刮削器）</td><td>打制石器＋骨器、磨光钻孔技术</td></tr>
<tr><td>用火</td><td>会使用火（天然火）</td><td>可能人工取火</td></tr>
<tr><td>观念</td><td>无（群体生活）</td><td>爱美意识、埋葬死者</td></tr></table>
<h3>表2　河姆渡人 vs 半坡人</h3>
<table><tr><th>项目</th><th>河姆渡人</th><th>半坡人</th></tr>
<tr><td>流域/方位</td><td>长江下游（南方）</td><td>黄河中游（北方）</td></tr>
<tr><td>年代</td><td>距今约7000年</td><td>距今约6000年</td></tr>
<tr><td>农作物</td><td>水稻（稻作农业）</td><td>粟、黍（粟作农业）</td></tr>
<tr><td>房屋</td><td>干栏式建筑</td><td>半地穴式房屋</td></tr>
<tr><td>典型工具</td><td>骨耜</td><td>磨制石器、弓箭渔叉、纺轮</td></tr>
<tr><td>特色手工业</td><td>象牙雕刻（双鸟朝阳纹）、天然漆</td><td>彩陶、陶埙、纺织制衣、养蚕缫丝</td></tr></table>
<h3>表3　三大早期文明（考古实证）</h3>
<table><tr><th>文明/古城</th><th>区域</th><th>年代</th><th>标志性证据</th></tr>
<tr><td>红山·牛河梁</td><td>西辽河流域</td><td>约5800—5000年</td><td>祭坛、女神庙、积石冢</td></tr>
<tr><td>良渚古城</td><td>长江下游</td><td>约5300—4300年</td><td>水利系统、玉琮玉钺、20万kg炭化稻谷</td></tr>
<tr><td>陶寺古城</td><td>黄河中游</td><td>约4300—4000年</td><td>宫城、朱书符号、观象台、人殉</td></tr></table>
`));

  /* 七、复习流程 */
  ITEMS.push(hg("review", "七、复习流程", "按记忆规律分层", `
<div class="flow">
<div class="step"><div class="num g">1</div><div class="ct"><span class="when">当天课后（15分钟）</span><b>回忆+补缺</b>：合上课本，按"时间轴"从远到近口述本课要点；卡壳处立刻回看对应卡片，用红笔在书上标出。</div></div>
<div class="step"><div class="num g">2</div><div class="ct"><span class="when">周末（30分钟/课）</span><b>对比+导图</b>：默写三张对比表（北京人/山顶洞人、河姆渡/半坡、三大文明）；画一张"史前时期"思维导图，把人物、遗址、年代、特征挂到时间轴上。</div></div>
<div class="step"><div class="num g">3</div><div class="ct"><span class="when">单元学完（1小时）</span><b>通关自测</b>：做本指南"九、自测练习"全部题目，先闭卷后看答案；错题抄入错题本，标注错因（记错年代 / 混淆南北 / 概念不清）。</div></div>
<div class="step"><div class="num">4</div><div class="ct"><span class="when">考前（滚动）</span><b>错题+口诀</b>：重做错题本；背诵"记忆口诀"与三张对比表；用"考古↔传说"双证据链串讲单元主线。</div></div>
</div>
<div class="note"><b>复习要点提示：</b>① 年代只记"约数区间"，不必精确到数字；② 见到遗址先想"在哪条河流域、南方还是北方、种什么"；③ "多元一体""人文初祖""学会用火是里程碑"是高频考点词，必须会原话表述。</div>
`));

  /* 八、预习流程 */
  ITEMS.push(hg("preview", "八、预习流程", "每课前 20 分钟", `
<div class="flow">
<div class="step"><div class="num g">1</div><div class="ct"><span class="when">读标题·提问题</span><b>先问后读</b>：看课文大标题与单元导图，写下 2—3 个自己想知道的问题（如"北京人怎么被发现的？""河姆渡房子为什么悬空？"），带着问题读课文。</div></div>
<div class="step"><div class="num g">2</div><div class="ct"><span class="when">划地图·标时间</span><b>时空定位</b>：在"中国主要古人类/新石器遗址分布图"上圈出本课遗址，并在时间轴卡片上找到对应年代，建立"在哪里、在何时"的直观印象。</div></div>
<div class="step"><div class="num">3</div><div class="ct"><span class="when">理框架·记生词</span><b>搭骨架</b>：用三行笔记法列出"人物/遗址 → 年代 → 特征"；把生僻字（郧yún、黍shǔ、埙xūn、缫sāo、钺yuè、蚩chī、禅shàn）和注解①画线，上课重点听。</div></div>
<div class="step"><div class="num">4</div><div class="ct"><span class="when">做批注·备疑问</span><b>留疑点</b>：在"课后活动/想一想"处先尝试自答，答不出的标"？"，课上重点听老师讲解，下课后立刻用复习流程第1步清零。</div></div>
</div>
<div class="note"><b>预习不求全懂：</b>目标是"知道本课讲谁、在何时何地、有什么特征"，并把不懂的点变成课堂上的靶向问题。能回答 60% 就算合格预习。</div>
`));

  /* 九、自测练习 */
  ITEMS.push(hg("quiz", "九、自测练习", "闭卷完成 · 后附答案", `
<h3>A. 单项选择题（每题 5 分，共 40 分）</h3>
<div class="quiz">
<div class="q"><div class="qh">1. 我国境内目前已知最早的古人类之一是（　）</div><ol type="A"><li>北京人</li><li>元谋人</li><li>山顶洞人</li><li>蓝田人</li></ol></div>
<div class="q"><div class="qh">2. 发现第一个北京人头盖骨化石并找到用火遗迹的学者是（　）</div><ol type="A"><li>裴文中</li><li>贾兰坡</li><li>袁复礼</li><li>李济</li></ol></div>
<div class="q"><div class="qh">3. 常说"学会用火是人类演化史上的里程碑"，这主要针对（　）</div><ol type="A"><li>元谋人</li><li>山顶洞人</li><li>北京人</li><li>河姆渡人</li></ol></div>
<div class="q"><div class="qh">4. 世界上最早栽培的水稻、粟、黍均发现于（　）</div><ol type="A"><li>埃及</li><li>印度</li><li>中国</li><li>两河流域</li></ol></div>
<div class="q"><div class="qh">5. 下列遗址中，房屋为"干栏式建筑"、典型农具为"骨耜"的是（　）</div><ol type="A"><li>半坡人</li><li>河姆渡人</li><li>大汶口人</li><li>山顶洞人</li></ol></div>
<div class="q"><div class="qh">6. 半坡人居住半地穴式房屋，主要适应的地理环境是（　）</div><ol type="A"><li>南方湿热多水</li><li>北方干冷</li><li>草原游牧</li><li>沿海多风</li></ol></div>
<div class="q"><div class="qh">7. 下列考古发现中，能实证"长江下游约5000年已出现早期国家"的是（　）</div><ol type="A"><li>牛河梁积石冢</li><li>良渚古城</li><li>陶寺古城</li><li>半坡遗址</li></ol></div>
<div class="q"><div class="qh">8. 被后人尊奉为中华民族"人文初祖"的是（　）</div><ol type="A"><li>尧和舜</li><li>禹和启</li><li>炎帝和黄帝</li><li>蚩尤和神农</li></ol></div>
</div>
<h3>B. 填空题（每空 3 分，共 21 分）</h3>
<div class="quiz"><div class="q"><ol>
<li>北京人生活于距今约__________年，属于__________人；山顶洞人生活于距今约__________年，属于晚期智人。</li>
<li>河姆渡人种植__________，半坡人种植__________、黍，二者分别位于__________流域和__________流域。</li>
<li>人类进入文明社会的重要标志是__________、阶级和国家的产生。</li>
</ol></div></div>
<h3>C. 连线 / 辨析（12 分）</h3>
<div class="quiz"><div class="q"><div class="qh">将左侧石器与其名称、用途连线：</div><ol>
<li>器型粗大、便于手握，砍伐树木或打击野兽 —（　　　）</li>
<li>有尖刃，多用来锥或割 —（　　　）</li>
<li>一侧边缘有凸出不规则刃，刮削兽皮木骨 —（　　　）</li>
</ol><p>选项：A.砍砸器　B.尖状器　C.刮削器</p></div></div>
<h3>D. 材料分析题（13 分）</h3>
<div class="quiz"><div class="q"><p>材料："华夏民族，非一族所成。太古以来，诸族错居，接触交通，各去小异而大同，渐化合以成一族之形，后世所谓诸夏是也。"——梁启超《太古及三代载记》</p><ol>
<li>材料认为华夏族是怎样形成的？（6 分）</li>
<li>结合第3课，举出华夏族前身（炎黄部落联盟）形成过程中的两场关键战役。（7 分）</li>
</ol></div></div>
<h3>E. 简答题（14 分）</h3>
<div class="quiz"><div class="q"><ol>
<li>为什么说"周口店北京人遗址是迄今所知世界上内涵最丰富、材料最齐全的直立人遗址之一"？（7 分）</li>
<li>用"多元一体"概括中华文明起源的特征，并各举黄河、长江、西辽河流域的一处实证。（7 分）</li>
</ol></div></div>
<details class="ans"><summary>点击展开 · 参考答案</summary>
<div class="a"><b>A 单选：</b>1.B（元谋人）　2.A（裴文中）　3.C（北京人）　4.C（中国）　5.B（河姆渡人）　6.B（北方干冷）　7.B（良渚古城）　8.C（炎帝和黄帝）</div>
<div class="a"><b>B 填空：</b>①70万—20万；直立；3万　②水稻；粟；长江；黄河　③私有制</div>
<div class="a"><b>C 连线：</b>1—A砍砸器　2—B尖状器　3—C刮削器</div>
<div class="a"><b>D 材料：</b>①华夏族并非单一部族所成，而是太古以来众多部族错杂居住、相互接触交往，去掉小差异、趋同大同，逐渐融合成一族（诸夏）。②阪泉之战（黄帝胜炎帝，结盟）、涿鹿之战（炎黄联盟胜蚩尤）。</div>
<div class="a"><b>E 简答：</b>①北京人遗址出土 40 多个个体的直立人化石、大量动物化石、约10万件打制石器，堆积层厚40多米，材料数量与种类极丰富、保存完好，为复原体质特征与生活状况提供重要证据，故居世界直立人遗址前列。②"多元一体"：黄河、长江、西辽河各自发展出特色早期文明，彼此交流融合，共同构成早期中华文明主体，后中原崛起走向一体。实证：黄河—陶寺古城（或仰韶/半坡）；长江—良渚古城（或河姆渡）；西辽河—牛河梁（红山文化）。</div>
<div class="a" style="color:#9c3d2e"><b>评分提示：</b>简答题按"要点给分"，年代、流域、遗址名称写错即扣分；能写出"考古+传说相互印证""多元一体"等单元核心词可酌情加分。</div>
</details>
`));

  window.HISTORY_GUIDE_7 = ITEMS;
})();
