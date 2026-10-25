// 单词闪卡配图（cc）：常用词 → emoji 图片。闪卡正面先出图，点击出单词，再点击出释义。
// 覆盖教材词表中的具象词；查不到的词自动退回「正面直接显示单词」模式。可随时补充。
window.WORD_EMOJI = {
  // 动物
  "animal":"🐾","ant":"🐜","bat":"🦇","bear":"🐻","bird":"🐦","bunny":"🐇","cat":"🐱","cheetah":"🐆",
  "chicken":"🐔","cow":"🐮","dinosaur":"🦕","dog":"🐶","duck":"🦆","elephant":"🐘","fish":"🐟","fox":"🦊",
  "frog":"🐸","giraffe":"🦒","goat":"🐐","hen":"🐔","horse":"🐴","kitten":"🐱","lion":"🦁","mice":"🐭",
  "monkey":"🐵","mouse":"🐭","mule":"🐴","panda":"🐼","pet":"🐾","rabbit":"🐰","red panda":"🐾",
  "sheep":"🐑","tail":"🐕","tiger":"🐯","fur":"🐾","paw":"🐾",
  // 身体
  "arm":"💪","ear":"👂","eye":"👀","finger":"👆","hair":"💇","hand":"✋","head":"🧠","mouth":"👄",
  "nose":"👃","breath":"🫁","face":"😊",
  // 食物饮品
  "apple":"🍎","banana":"🍌","beef":"🥩","bread":"🍞","breakfast":"🥣","burger":"🍔","cake":"🎂",
  "carrot":"🥕","chocolate":"🍫","dinner":"🍲","egg":"🥚","food":"🍽","fruit":"🍇","grape":"🍇",
  "green beans":"🫛","hamburger":"🍔","ice cream":"🍦","ice-cream":"🍦","lunch":"🍱","milk":"🥛",
  "noodles":"🍜","onion":"🧅","pizza":"🍕","potato":"🥔","rice":"🍚","salad":"🥗","sandwich":"🥪",
  "strawberry":"🍓","sushi":"🍣","sweet":"🍬","tea":"🍵","tomato":"🍅","watermelon":"🍉","water":"💧",
  // 植物
  "bamboo":"🎍","flower":"🌸","grass":"🌿","leaf":"🍃","leaves":"🍃","tree":"🌳","plant":"🪴",
  "rose":"🌹","jasmine":"🌼","forest":"🌳",
  // 自然天气
  "autumn":"🍂","spring":"🌸","summer":"🌞","winter":"❄️","season":"🍂","cloudy":"☁️","cold":"🥶",
  "hot":"🔥","warm":"🌤","cool":"😷","moon":"🌙","rain":"🌧","rainy":"🌧","sea":"🌊","snow":"❄️",
  "snowy":"❄️","star":"⭐","sun":"☀️","sunny":"☀️","weather":"🌤","wind":"🌬","windy":"🌬",
  "sky":"🌤","earth":"🌍","nature":"🍃","river":"🏞","lake":"🏞","hill":"⛰","mountain":"⛰",
  "beach":"🏖","island":"🏝","stone":"🪨","sand":"🏖","fire":"🔥","air":"🌬","shadow":"👥",
  // 学校学习
  "book":"📖","bookcase":"📚","bookstore":"📚","class":"🏫","classroom":"🏫","comic":"📕",
  "comic book":"📕","computer":"💻","dictionary":"📖","english class":"📘","lesson":"📖",
  "library":"📚","math":"➕","music class":"🎵","music":"🎵","music room":"🎹","notebook":"📓",
  "pencil":"✏️","pen":"🖊","ruler":"📏","school":"🏫","schoolbag":"🎒","science":"🔬",
  "science museum":"🔬","story":"📖","student":"🧑‍🎓","study":"📖","subject":"📚","test":"📝",
  "word book":"📓","art":"🎨","art room":"🎨","history":"🏛","geography":"🗺","pe class":"🏃",
  "p.e.":"🏃","pe":"🏃","eraser":"🧽","diary":"📔","word puzzle":"🔤","puzzle":"🧩",
  // 交通出行
  "boat":"⛵","boating":"🚣","bus":"🚌","bus stop":"🚏","car":"🚗","ferry":"⛴","plane":"✈️",
  "ship":"🚢","subway":"🚇","taxi":"🚕","train":"🚆","traffic lights":"🚥","traffic":"🚦",
  "sled":"🛷","camping":"⛺","trip":"🧳","travel":"🧳","on foot":"🚶","walk":"🚶","crossing":"🚸",
  "gps":"📍","map":"🗺","street":"🛣","road":"🛣","bridge":"🌉","hiking":"🥾",
  // 场所建筑
  "factory":"🏭","farm":"🚜","garden":"🌷","gym":"🤸","hospital":"🏥","hotel":"🏨","house":"🏠",
  "world":"🌍","home":"🏠","dining hall":"🍽","first floor":"1️⃣","second floor":"2️⃣",
  // 运动
  "baseball":"⚾","basketball":"🏀","bike":"🚲","football":"⚽","game":"🎮","goal":"🥅",
  "soccer":"⚽","soccer ball":"⚽","sport":"⚽","sports meet":"🏃","swim":"🏊","swimming":"🏊",
  "tennis":"🎾","volleyball":"🏐","jumping":"🤸","climbing":"🧗","exercise":"🏋","run":"🏃",
  "running":"🏃","ball":"⚽","player":"⛹",
  // 衣物
  "cap":"🧢","clothes":"👕","coat":"🧥","dress":"👗","glove":"🧤","jacket":"🧥","pants":"👖",
  "scarf":"🧣","shirt":"👔","shoe":"👟","shoes":"👟","shorts":"🩳","skirt":"👗","sunglasses":"🕶",
  "sweater":"🧥","t-shirt":"👕","umbrella":"☂️","watch":"⌚","raincoat":"🧥","sock":"🧦","socks":"🧦",
  // 家人物品
  "bag":"👜","basket":"🧺","bed":"🛏","box":"📦","bottle":"🥤","water bottle":"🥤","chair":"🪑",
  "clock":"🕐","cup":"🥤","desk":"🪑","key":"🔑","lamp":"💡","light":"💡","phone":"📱",
  "photo":"📷","picture":"🖼","radio":"📻","robot":"🤖","sofa":"🛋","table":"🪑","telephone":"☎️",
  "tv":"📺","gift":"🎁","e-mail":"📧","email":"📧","postcard":"💌","id card":"🪪","quilt":"🛏",
  "model plane":"✈️","toy":"🧸","tape":"📼","tape player":"📻","machine":"⚙️","fridge":"🧊",
  "money":"💰","dollar":"💵","card":"💳","ring":"💍","candle":"🕯","mirror":"🪞","tissue":"🧻",
  // 颜色
  "black":"⚫","blue":"🔵","brown":"🟤","green":"🟢","pink":"🌸","purple":"🟣","red":"🔴",
  "white":"⚪","yellow":"🟡","color":"🎨","colour":"🎨","rainbow":"🌈",
  // 数字
  "zero":"0️⃣","one":"1️⃣","two":"2️⃣","three":"3️⃣","four":"4️⃣","five":"5️⃣","six":"6️⃣",
  "seven":"7️⃣","eight":"8️⃣","nine":"9️⃣","ten":"🔟",
  // 时间节日
  "a.m.":"🌅","p.m.":"🌆","afternoon":"🌤","evening":"🌆","morning":"🌅","night":"🌙",
  "yesterday":"📅","day":"📅","week":"📅","weekend":"📅","month":"📅","year":"📅","hour":"🕐",
  "time":"🕐","monday":"📅","tuesday":"📅","wednesday":"📅","thursday":"📅","friday":"📅",
  "saturday":"📅","sunday":"📅","january":"📅","february":"📅","march":"📅","april":"📅",
  "may":"📅","june":"📅","july":"📅","august":"📅","september":"📅","october":"📅",
  "november":"📅","december":"📅","christmas":"🎄","easter":"🥚","halloween":"🎃",
  "mid-autumn festival":"🥮","mooncake":"🥮","thanksgiving":"🦃","festival":"🎉",
  "holiday":"🏖","vacation":"🏖","national day":"🇨🇳","term":"🏫","schedule":"📅",
  // 人物家庭
  "aunt":"👩","boy":"👦","brother":"👦","child":"🧒","children":"🧒","classmate":"🧑‍🤝‍🧑",
  "cousin":"👫","dad":"👨","daughter":"👧","family":"👪","father":"👨","girl":"👧",
  "grandma":"👵","grandmother":"👵","grandpa":"👴","grandfather":"👴","grandparent":"👴",
  "man":"👨","mom":"👩","mother":"👩","mum":"👩","parent":"🧑","people":"👥","person":"🧑",
  "sister":"👧","son":"👦","uncle":"🧔","woman":"👩","friend":"🤝","pupil":"🧑‍🎓",
  "teacher":"🧑‍🏫","baby":"👶","kid":"🧒","twins":"👯",
  // 职业职业
  "businessman":"💼","cleaner":"🧹","coach":"📋","delivery worker":"🛵","doctor":"🧑‍⚕️",
  "driver":"🚌","factory worker":"🏭","farmer":"🧑‍🌾","firefighter":"🧑‍🚒","fisherman":"🎣",
  "head teacher":"🧑‍💼","nurse":"🧑‍⚕️","office worker":"💼","pilot":"🧑‍✈️","police officer":"👮",
  "postman":"📮","reporter":"🎤","scientist":"🔬","secretary":"💼","worker":"🔧","job":"💼",
  // 动作
  "buy":"🛒","call":"📞","clean":"🧹","clean my room":"🧹","cook":"🍳","cooking":"🍳",
  "dance":"💃","draw":"🖍","draw cartoons":"🖍","drink":"🥤","eat":"🍽","fly":"🕊",
  "get up":"⏰","go home":"🏠","go to bed":"🛏","go to school":"🏫","have a cold":"🤒",
  "hurt":"🤕","listen":"👂","look":"👀","love":"❤️","read":"📖","read a book":"📖",
  "read books":"📖","sing":"🎤","sing english songs":"🎤","sit":"🪑","sleep":"😴",
  "sleeping":"😴","speak":"🗣","speak english":"🗣","take a trip":"🧳","wait":"⏳",
  "wash":"🧼","wash my clothes":"🧼","watch tv":"📺","win":"🏆","work":"💼","laughed":"😄",
  "smile":"😊","think":"🤔","meet":"🤝","share":"🤝","help":"🤝","send":"📩","closed":"🔒",
  "open":"🔓","start":"▶️","stop":"🛑","stay":"🛋","wake up":"⏰","tidy":"🧹","sweep":"🧹",
  "pick apples":"🍎","chase":"🏃","count":"🔢","spell":"🔤","tell":"🗣","make the bed":"🛏",
  "do homework":"📝","do kung fu":"🥋","do morning exercises":"🏋","take a deep breath":"🌬",
  "go shopping":"🛒","go fishing":"🎣","go boating":"🚣","go swimming":"🏊","go camping":"⛺",
  "go for a walk":"🚶","go on a picnic":"🧺","see a film":"🎬","see a doctor":"🏥",
  "take a dancing class":"💃","plant flowers":"🌷","make a snowman":"⛄","watched tv":"📺",
  "rode a horse":"🐴","washed my clothes":"🧼","listening to music":"🎧","playing":"🎮",
  "eating":"🍽","drinking":"🥤","eating lunch":"🍱","eating breakfast":"🥣",
  // 感受形容
  "angry":"😠","afraid":"😨","amazing":"🤩","bad":"👎","beautiful":"🌷","big":"🐘",
  "bigger":"🐘","small":"🐜","smaller":"🐜","tall":"🦒","taller":"🦒","fat":"🐷","thin":"🐦",
  "thinner":"🐦","fast":"💨","faster":"💨","slow":"🐌","cute":"🐣","happy":"😊","sad":"😢",
  "tired":"🥱","thirsty":"🥤","ill":"🤒","busy":"💼","quiet":"🤫","loud":"🔊","polite":"🙇",
  "hard-working":"💪","helpful":"🤝","funny":"🤡","boring":"🥱","expensive":"💎","cheap":"🪙",
  "fresh":"🥬","delicious":"😋","strong":"💪","stronger":"💪","smart":"🧠","smarter":"🧠",
  "clever":"🧠","kind":"💗","lovely":"💗","wonderful":"✨","interesting":"🤩","relaxing":"😌",
  "excited":"🤩","worried":"😟","shy":"😳","broken":"💔","hungry":"🍽","young":"🧒",
  "younger":"🧒","old":"👴","older":"👴","heavy":"🏋","heavier":"🏋","good":"👍","great":"👍",
  "new":"✨","free":"🆓","same":"🟰","easy":"👌","difficult":"🧗","right":"✅","wrong":"❌",
  // 其他常见
  "problem":"❓","answer":"💬","name":"🏷","word":"🔤","letter":"🔤","number":"🔢",
};
