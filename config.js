// =====================================================================
// config.js - 一二与布布 全局配置文件
// 这个文件是宠物的"灵魂数据库"，所有动作、台词、行为参数都在这里定义。
// 以后要加新动作或新台词，只需要在这个文件里加一行就行！
// =====================================================================

// ---- 角色基础配置 ----
// width/height: 角色的宽高（像素），后续替换图片时改这里就行
// anchor: 锚点位置，'bottom-center' 表示坐标原点在脚底中心
// primaryColor/secondaryColor: 占位图的颜色（后续被图片替代）
const CHARACTER_CONFIG = {
  yier: {
    name: '一二',
    width: 150,
    height: 180,
    anchor: 'bottom-center',
    primaryColor: '#ffffff',
    secondaryColor: '#f8a4c8',
    earColor: '#5a3e36',
    blushColor: '#f8a4c8',
    description: '白色母熊，深色耳朵，粉色腮红。小吃货，贪玩，嗜睡，软萌可爱。'
  },
  bubu: {
    name: '布布',
    width: 160,
    height: 190,
    anchor: 'bottom-center',
    primaryColor: '#c4915e',
    secondaryColor: '#ffe066',
    earColor: '#a87030',
    blushColor: '#ffe066',
    description: '棕色公熊，浅棕耳朵，黄色腮红。程序员，全能，深情专一，稳重温暖。'
  }
};

// ---- 生命系统数值配置 ----
// 各项数值范围 0~100，每秒衰减速度，临界阈值
const LIFE_CONFIG = {
  hunger: { max: 100, decay: 0.007, critical: 20, low: 35 },
  mood:   { max: 100, decay: 0.05, critical: 15, low: 30 },
  energy: { max: 100, decay: 0.04, critical: 15, low: 30 },
  // 喂食/爱抚/玩耍恢复量
  feedRestore: 25,
  petRestore: 15,
  playRestore: 20,
  playEnergyCost: 15,
  sleepEnergyRestore: 0.3,
  sleepMoodRestore: 0.1
};

// ---- 物理引擎配置 ----
// gravity: 重力加速度（像素/帧²）
// bounceFactor: 弹跳系数（0~1，越接近1弹得越高）
// jellyDuration: Q弹果冻效果持续时间（毫秒）
const PHYSICS_CONFIG = {
  gravity: 0.6,
  bounceFactor: 0.55,
  jellyDuration: 400,
  jellyScaleX: 1.2,
  jellyScaleY: 0.75,
  groundFriction: 0.92,
  airResistance: 0.995
};

// ---- 一二的状态定义 ----
// id: 状态唯一标识
// priority: 优先级（数字越大越优先被选中）
// duration: 状态持续时间范围 [最小, 最大] 秒
// conditions: 触发该状态需要的条件
// 图片文件名规则：{角色}_{状态}.png，例如 yier_idle.png
const YIER_STATES = [
  {
    id: 'idle',
    priority: 3,
    duration: [15, 30],
    conditions: {},
    description: '发呆，偶尔歪头'
  },
  {
    id: 'eat',
    priority: 5,
    duration: [10, 20],
    conditions: { action: 'feed' },
    description: '捧着东西咔嚓咔嚓吃'
  },
  {
    id: 'play',
    priority: 3,
    duration: [8, 15],
    conditions: { action: 'play' },
    description: '追毛线球、在屏幕边缘探头'
  },
  {
    id: 'sleep',
    priority: 9,
    duration: [60, 180],
    conditions: { energy: 'critical' },
    description: '趴着睡、打呼噜（精力低时自动触发）'
  },
  {
    id: 'hungry',
    priority: 7,
    duration: [8, 15],
    conditions: { hunger: 'critical' },
    description: '肚子叫，眼巴巴看着鼠标指针'
  },
  {
    id: 'clingy',
    priority: 3,
    duration: [5, 10],
    conditions: { nearPartner: true },
    description: '撒娇，对布布伸手要抱抱'
  },
  {
    id: 'hide_and_seek',
    priority: 1,
    duration: [5, 8],
    conditions: { random: true },
    description: '捂住眼睛，以为别人看不见她'
  },
  {
    id: 'roll',
    priority: 2,
    duration: [5, 8],
    conditions: { mood: 'high' },
    description: '开心时在屏幕底部打滚'
  },
  {
    id: 'stare_at_cursor',
    priority: 2,
    duration: [5, 10],
    conditions: { random: true },
    description: '好奇地盯着鼠标指针看'
  },
  {
    id: 'dream',
    priority: 8,
    duration: [10, 30],
    conditions: { state: 'sleep' },
    description: '睡觉时冒出小气泡，里面是鱼或蛋糕'
  },
  {
    id: 'climb_wall',
    priority: 2,
    duration: [5, 10],
    conditions: { nearEdge: true },
    description: '攀在屏幕左侧或右侧边缘往上爬'
  },
  {
    id: 'drop_down',
    priority: 9,
    duration: [2, 4],
    conditions: { falling: true },
    description: '从高处掉下来的慌张表情'
  },
  {
    id: 'beg',
    priority: 4,
    duration: [5, 10],
    conditions: { hunger: 'low' },
    description: '双手合十讨要食物'
  },
  {
    id: 'bath',
    priority: 2,
    duration: [6, 10],
    conditions: { random: true },
    description: '舔爪子洗脸'
  },
  {
    id: 'happy_dance',
    priority: 2,
    duration: [6, 10],
    conditions: { mood: 'high' },
    description: '心情极高时左右摇摆跳舞'
  },
  {
    id: 'sad',
    priority: 5,
    duration: [10, 20],
    conditions: { mood: 'critical' },
    description: '被忽视太久，坐在角落画圈圈'
  },
  {
    id: 'watch_tv',
    priority: 5,
    duration: [10, 30],
    conditions: { timeOfDay: 'day' },
    description: '坐下来看电视追番'
  },
  {
    id: 'run_right',
    priority: 3,
    duration: [4, 8],
    conditions: { random: true },
    description: '开心地向右奔跑'
  },
  {
    id: 'run_left',
    priority: 3,
    duration: [4, 8],
    conditions: { random: true },
    description: '开心地向左奔跑'
  },
  {
    id: 'wave',
    priority: 2,
    duration: [3, 6],
    conditions: { random: true },
    description: '开心地挥舞小手打招呼'
  },
  {
    id: 'jump',
    priority: 3,
    duration: [2, 4],
    conditions: { random: true },
    description: '原地蹦蹦跳跳超开心'
  },
  {
    id: 'walk',
    priority: 3,
    duration: [5, 10],
    conditions: { random: true },
    description: '散步走路'
  }
];

// ---- 布布的状态定义 ----
const BUBU_STATES = [
  {
    id: 'idle',
    priority: 2,
    duration: [10, 20],
    conditions: {},
    description: '推眼镜，伸懒腰'
  },
  {
    id: 'sleep',
    priority: 9,
    duration: [60, 180],
    conditions: { energy: 'critical' },
    description: '趴在键盘上睡着'
  },
  {
    id: 'hungry',
    priority: 7,
    duration: [8, 15],
    conditions: { hunger: 'critical' },
    description: '饿得没力气敲代码'
  },
  {
    id: 'coding',
    priority: 8,
    duration: [30, 90],
    conditions: { timeOfDay: 'day' },
    description: '戴眼镜疯狂敲键盘，屏幕飘出 </> 或 Bug 字样'
  },
  {
    id: 'coffee',
    priority: 5,
    duration: [5, 10],
    conditions: { energy: 'low' },
    description: '喝咖啡续命'
  },
  {
    id: 'look_for_yier',
    priority: 3,
    duration: [5, 10],
    conditions: { partnerFar: true },
    description: '四处张望找一二（双宠模式）'
  },
  {
    id: 'pat',
    priority: 4,
    duration: [5, 8],
    conditions: { partnerState: 'clingy' },
    description: '摸一二的头（双宠模式专属）'
  },
  {
    id: 'carry',
    priority: 5,
    duration: [5, 10],
    conditions: { partnerState: 'sleep' },
    description: '把睡着的一二抱走（双宠模式）'
  },
  {
    id: 'debug',
    priority: 5,
    duration: [8, 15],
    conditions: { random: true },
    description: '抓耳挠腮，从屏幕里抓出一只虫子扔掉'
  },
  {
    id: 'protect',
    priority: 9,
    duration: [5, 10],
    conditions: { partnerDanger: true },
    description: '挡在一二前面'
  },
  {
    id: 'read',
    priority: 6,
    duration: [15, 40],
    conditions: { random: true },
    description: '安静地看技术文档'
  },
  {
    id: 'yawn',
    priority: 4,
    duration: [4, 8],
    conditions: { energy: 'low' },
    description: '疲惫地打大哈欠'
  },
  {
    id: 'drop_down',
    priority: 9,
    duration: [2, 4],
    conditions: { falling: true },
    description: '掉落时保持淡定推眼镜'
  },
  {
    id: 'stare_love',
    priority: 3,
    duration: [5, 10],
    conditions: { partnerNear: true },
    description: '深情地看着一二的方向发呆'
  },
  {
    id: 'tuck_in',
    priority: 5,
    duration: [5, 10],
    conditions: { partnerState: 'sleep' },
    description: '给一二盖被子（双宠模式专属）'
  },
  {
    id: 'sad',
    priority: 6,
    duration: [5, 10],
    conditions: { mood: 'critical' },
    description: '心情极差时蜷缩着闷闷不乐'
  },
  {
    id: 'beg',
    priority: 3,
    duration: [5, 10],
    conditions: { hunger: 'low' },
    description: '双手合十讨要零食'
  },
  {
    id: 'eat',
    priority: 5,
    duration: [10, 20],
    conditions: { action: 'feed' },
    description: '吃东西'
  },
  {
    id: 'happy_dance',
    priority: 2,
    duration: [6, 10],
    conditions: { mood: 'high' },
    description: '心情极高时左右摇摆跳舞'
  },
  {
    id: 'roll',
    priority: 2,
    duration: [5, 8],
    conditions: { mood: 'high' },
    description: '开心时在屏幕底部打滚'
  },
  {
    id: 'bath',
    priority: 2,
    duration: [6, 10],
    conditions: { random: true },
    description: '舔爪子洗脸'
  },
  {
    id: 'dream',
    priority: 8,
    duration: [10, 30],
    conditions: { state: 'sleep' },
    description: '睡觉时冒出小气泡'
  },
  {
    id: 'stare_at_cursor',
    priority: 2,
    duration: [5, 10],
    conditions: { random: true },
    description: '好奇地盯着鼠标指针看'
  },
  {
    id: 'watch_tv',
    priority: 3,
    duration: [10, 25],
    conditions: { timeOfDay: 'day' },
    description: '坐下来看会儿电视放松'
  },
  {
    id: 'run_right',
    priority: 3,
    duration: [4, 8],
    conditions: { random: true },
    description: '稳稳地向右小跑'
  },
  {
    id: 'run_left',
    priority: 3,
    duration: [4, 8],
    conditions: { random: true },
    description: '稳稳地向左小跑'
  },
  {
    id: 'wave',
    priority: 2,
    duration: [3, 6],
    conditions: { random: true },
    description: '推了推眼镜挥挥手'
  },
  {
    id: 'jump',
    priority: 3,
    duration: [2, 4],
    conditions: { random: true },
    description: '难得兴奋地跳了一下'
  },
  {
    id: 'walk',
    priority: 3,
    duration: [5, 10],
    conditions: { random: true },
    description: '散步走路'
  }
];

// ---- 双宠互动状态定义 ----
// requiresBoth: 是否需要两只宠物同时参与
// distance: 触发互动时两只宠物的最大距离（像素）
const COUPLE_STATES = [
  {
    id: 'hold_hands',
    priority: 5,
    duration: [8, 15],
    distance: 120,
    description: '牵手'
  },
  {
    id: 'hug',
    priority: 6,
    duration: [6, 12],
    distance: 100,
    description: '拥抱'
  },
  {
    id: 'nose_boop',
    priority: 4,
    duration: [3, 6],
    distance: 80,
    description: '蹭鼻子'
  },
  {
    id: 'feed_each_other',
    priority: 4,
    duration: [5, 10],
    distance: 100,
    description: '布布喂一二吃东西'
  },
  {
    id: 'high_five',
    priority: 3,
    duration: [3, 5],
    distance: 90,
    description: '开心击掌'
  },
  {
    id: 'piggyback',
    priority: 5,
    duration: [10, 20],
    distance: 80,
    description: '布布背着一二散步'
  },
  {
    id: 'walk_together',
    priority: 3,
    duration: [10, 20],
    distance: 100,
    description: '手牵手在屏幕底部走'
  },
  {
    id: 'lean_on_back',
    priority: 4,
    duration: [8, 15],
    distance: 90,
    description: '一二靠在布布背上'
  },
  {
    id: 'catch_bug_together',
    priority: 4,
    duration: [6, 12],
    distance: 120,
    description: '布布抓Bug，一二在旁边拍手'
  },
  {
    id: 'sleep_together',
    priority: 8,
    duration: [30, 90],
    distance: 100,
    conditions: { both: { energy: 'critical' } },
    description: '相拥而睡，冒出相同的zzZ'
  },
  {
    id: 'share_coffee',
    priority: 3,
    duration: [5, 10],
    distance: 100,
    description: '布布分享咖啡，一二喝了一口做鬼脸'
  },
  {
    id: 'hide_under_blanket',
    priority: 3,
    duration: [8, 15],
    distance: 80,
    description: '两只躲在同一张毯子下只露出耳朵'
  },
  {
    id: 'fix_hair',
    priority: 3,
    duration: [4, 8],
    distance: 90,
    description: '布布帮一二整理头顶的毛发'
  },
  {
    id: 'push_cliff',
    priority: 2,
    duration: [4, 8],
    distance: 100,
    conditions: { nearEdge: true },
    description: '一二调皮地把布布推下屏幕边缘'
  },
  {
    id: 'mirror_pose',
    priority: 3,
    duration: [6, 10],
    distance: 150,
    description: '两只做出对称的相同动作'
  },
  {
    id: 'argue_makeup',
    priority: 3,
    duration: [8, 12],
    distance: 120,
    description: '假装生气背对背，然后瞬间和好抱抱'
  },
  {
    id: 'dance_together',
    priority: 4,
    duration: [8, 15],
    distance: 120,
    description: '面对面转圈圈跳舞'
  },
  {
    id: 'read_together',
    priority: 4,
    duration: [15, 30],
    distance: 100,
    description: '布布看书，一二在旁边睡着了'
  },
  {
    id: 'peek_a_boo',
    priority: 3,
    duration: [5, 10],
    distance: 90,
    description: '一二躲在布布身后探头'
  },
  {
    id: 'walk_arm_in_arm',
    priority: 3,
    duration: [10, 18],
    distance: 90,
    description: '挽着胳膊散步'
  },
  {
    id: 'stargaze',
    priority: 5,
    duration: [15, 30],
    distance: 100,
    conditions: { timeOfDay: 'night' },
    description: '深夜时并排坐着看星星'
  },
  {
    id: 'protect_from_rain',
    priority: 5,
    duration: [10, 20],
    distance: 100,
    conditions: { weather: 'rain' },
    description: '下雨天布布撑伞护着一二'
  }
];

// ---- 一二的台词库 ----
// text: 气泡中显示的文字
// state: 在哪个状态下触发（可选，不填则通用）
// weight: 被选中的权重（越大越容易出现）
const YIER_DIALOGUES = [
  { text: '啊哒哒~ (✧◡✧)', state: 'eat', weight: 10 },
  { text: '嗷呜啊哒 (๑´ڡ`๑)', state: 'eat', weight: 10 },
  { text: '好吃哒！(≧▽≦)', state: 'eat', weight: 8 },
  { text: '还要吃哒~ (๑•̀ㅂ•́)و✧', state: 'eat', weight: 6 },
  { text: '啊哒...zzZ (￣o￣)', state: 'sleep', weight: 10 },
  { text: '呼噜噜哒... (－ω－) zzZ', state: 'sleep', weight: 8 },
  { text: '不要叫醒哒... (︶︹︺)', state: 'sleep', weight: 6 },
  { text: '啊哒哒哒哒！٩(๑>◡<๑)۶', state: 'clingy', weight: 10 },
  { text: '呜哒.. (T^T)', state: 'sad', weight: 10 },
  { text: '布布快来哒！(招手)', state: 'clingy', weight: 8 },
  { text: '呜呼哒~ ✧(≖ ◡ ≖✿)', state: 'play', weight: 10 },
  { text: '哒哒哒！(ノ>▽<)ノ', state: 'play', weight: 8 },
  { text: '再来一次哒！(★ω★)', state: 'play', weight: 6 },
  { text: '咕噜...啊哒 (º﹃º )', state: 'hungry', weight: 10 },
  { text: '要吃哒！(৻>﹏<৻)', state: 'hungry', weight: 8 },
  { text: '肚子在叫哒... (´；ω；`)', state: 'hungry', weight: 6 },
  { text: '布布哒~ ٩(๑❛ᴗ❛๑)۶', state: 'idle', weight: 5 },
  { text: '嘿哒！(●\'◡\'●)', state: 'idle', weight: 5 },
  { text: '哇啊啊哒！(ﾟДﾟ≡ﾟдﾟ)!?', state: 'dragged', weight: 10 },
  { text: '放哒下来！(ಥ_ಥ)', state: 'dragged', weight: 8 },
  { text: '晕了哒... (＠_＠)', state: 'dragged', weight: 6 },
  { text: '嘿嘿哒~ (*/ω＼*)', state: 'happy_dance', weight: 10 },
  { text: '今天天气真好哒~ (晒太阳)', state: 'idle', weight: 4 },
  { text: '想吃蛋糕哒... (﹃_﹃)', state: 'idle', weight: 4 },
  { text: '找不到布布了哒 (°Д°)', state: 'idle', weight: 5 },
  { text: '一二最可爱哒！(自信)', state: 'happy_dance', weight: 6 },
  { text: '不要不要哒！(摇头)', state: 'idle', weight: 4 },
  { text: '一二在画圈圈哒... (委屈)', state: 'sad', weight: 8 },
  { text: '嗯...有点困哒 (揉眼睛)', state: 'idle', weight: 5 },
  { text: '啊哒！发现你了！(指着鼠标)', state: 'stare_at_cursor', weight: 8 },
  { text: '藏好了吗哒~ (捂眼)', state: 'hide_and_seek', weight: 10 },
  { text: '你看不见一二哒！(捂眼)', state: 'hide_and_seek', weight: 8 },
  { text: '洗香香哒~ (舔爪子)', state: 'bath', weight: 10 },
  { text: '给我给我哒！(双手合十)', state: 'beg', weight: 10 },
  { text: '一二爬上去了哒！(努力)', state: 'climb_wall', weight: 10 },
  { text: '啊啊啊要掉哒！(惊恐)', state: 'drop_down', weight: 10 },
  { text: '嘻嘻打滚哒~ (滚来滚去)', state: 'roll', weight: 10 },
  { text: '这个好看哒！(盯屏幕)', state: 'watch_tv', weight: 10 },
  { text: '哈哈哈太搞笑了哒 (大笑)', state: 'watch_tv', weight: 8 },
  { text: '好感动哒... (眼眶湿润)', state: 'watch_tv', weight: 6 },
  { text: '快更新下一集哒 (着急)', state: 'watch_tv', weight: 6 },
  { text: '一二在追番哒~ (认真)', state: 'watch_tv', weight: 8 },
  { text: '这个角色好帅哒 (花痴)', state: 'watch_tv', weight: 5 },
  { text: '呜呜好虐哒 (擦眼泪)', state: 'watch_tv', weight: 5 },
  { text: '太甜了齁~ (捂脸)', state: 'watch_tv', weight: 5 },
  { text: '不要烂尾哒！(紧张)', state: 'watch_tv', weight: 6 },
  { text: '一二看入迷了哒 (入神)', state: 'watch_tv', weight: 8 },
  { text: '冲鸭哒！(跑跑跑)', state: 'run_right', weight: 10 },
  { text: '一二跑得超快哒~ (加速)', state: 'run_right', weight: 8 },
  { text: '追不上我哒！(得意)', state: 'run_left', weight: 10 },
  { text: '呼呼跑起来哒~ (小跑)', state: 'run_left', weight: 8 },
  { text: '嗨嗨嗨哒~ (挥手)', state: 'wave', weight: 10 },
  { text: '看我看我哒！(挥手)', state: 'wave', weight: 8 },
  { text: '你好呀哒~ (蹦跶挥手)', state: 'wave', weight: 6 },
  { text: '哇啊跳高高哒！(跳)', state: 'jump', weight: 10 },
  { text: '一二跳得最高哒！(蹦)', state: 'jump', weight: 8 },
  { text: '耶~ 跳起来哒 (开心)', state: 'jump', weight: 6 },
  { text: '蹦蹦跳跳哒~ (连续跳)', state: 'jump', weight: 6 }
];

// ---- 布布的台词库 ----
const BUBU_DIALOGUES = [
  { text: '哒哒哒... (ーー;)', state: 'coding', weight: 10 },
  { text: '啊哒..Bug (╯°□°)╯', state: 'debug', weight: 10 },
  { text: '又是Bug哒... (￣_￣|||)', state: 'debug', weight: 8 },
  { text: '需求又改了哒 (눈_눈)', state: 'coding', weight: 6 },
  { text: '啊哒~ (∪◇∪)', state: 'idle', weight: 5 },
  { text: '啊哒哒。(๑•ᴗ•๑)', state: 'idle', weight: 5 },
  { text: '一二在干嘛哒... (偷看)', state: 'look_for_yier', weight: 10 },
  { text: '啊...哒 (☕՞ਊ՞☕)', state: 'coffee', weight: 10 },
  { text: '需要续命哒 (喝咖啡)', state: 'coffee', weight: 8 },
  { text: '啊哒。✧(≖ ◡ ≖✿)', state: 'debug', weight: 10 },
  { text: '完美哒 (•̀ᴗ•́)و', state: 'coding', weight: 8 },
  { text: '唉...哒 (◡́ᴖ◡̀ᴖ)', state: 'pat', weight: 10 },
  { text: '真拿你没办法哒 (´∀｀)', state: 'pat', weight: 8 },
  { text: '喂...哒 (￣_￣|||)', state: 'dragged', weight: 10 },
  { text: '轻点哒... (ಠ╭╮ಠ)', state: 'dragged', weight: 8 },
  { text: '一二哒？(°Д°)', state: 'look_for_yier', weight: 10 },
  { text: '去哪了哒... (ᵒ̤̑ ₀̑ ᵒ̤̑)', state: 'look_for_yier', weight: 8 },
  { text: '该睡觉了一二哒... (抱起)', state: 'carry', weight: 10 },
  { text: '晚安哒 (∪｡∪)｡｡｡', state: 'tuck_in', weight: 10 },
  { text: '别着凉了哒 (盖被子)', state: 'tuck_in', weight: 8 },
  { text: '哈...好困哒 (打哈欠)', state: 'yawn', weight: 10 },
  { text: '代码写完了哒！(举起双手)', state: 'idle', weight: 4 },
  { text: '今天也要加油哒 (推眼镜)', state: 'idle', weight: 4 },
  { text: '一二好可爱哒... (发呆)', state: 'stare_love', weight: 10 },
  { text: '安静看书哒... (翻页)', state: 'read', weight: 10 },
  { text: '技术文档真有趣哒 (推眼镜)', state: 'read', weight: 6 },
  { text: '加油干哒 (握拳)', state: 'idle', weight: 4 },
  { text: '又加班了哒... (叹气)', state: 'yawn', weight: 6 },
  { text: '别怕，有我在哒 (挡在前面)', state: 'protect', weight: 10 },
  { text: '这个Bug有意思哒 (挠头)', state: 'debug', weight: 8 },
  { text: '一二别闹哒... (叹气)', state: 'idle', weight: 5 },
  { text: '这点高度不算哒 (推眼镜)', state: 'drop_down', weight: 10 },
  { text: '吃饱了才有力气写代码哒 (满足)', state: 'eat', weight: 10 },
  { text: '好吃哒~ (咀嚼)', state: 'eat', weight: 8 },
  { text: '今天心情不错哒~ (摇摆)', state: 'happy_dance', weight: 10 },
  { text: '嘿嘿哒~ (转圈)', state: 'happy_dance', weight: 8 },
  { text: '写完代码开心哒 (打滚)', state: 'roll', weight: 10 },
  { text: '洗把脸清醒一下哒 (舔爪子)', state: 'bath', weight: 10 },
  { text: '整理仪容哒 (洗脸)', state: 'bath', weight: 8 },
  { text: '梦到和一二在一起哒... (微笑)', state: 'dream', weight: 10 },
  { text: '鼠标指针好有意思哒 (盯着看)', state: 'stare_at_cursor', weight: 10 },
  { text: '看会儿电视放松哒 (坐下)', state: 'watch_tv', weight: 10 },
  { text: '这节目有意思哒 (看)', state: 'watch_tv', weight: 8 },
  { text: '休息一下看会儿哒 (靠过来)', state: 'watch_tv', weight: 6 },
  { text: '嗯，这剧情不错哒 (推眼镜)', state: 'watch_tv', weight: 5 },
  { text: '跑两步活动一下哒 (小跑)', state: 'run_right', weight: 10 },
  { text: '嗯，去右边看看哒 (跑)', state: 'run_right', weight: 8 },
  { text: '往这边走哒 (小跑)', state: 'run_left', weight: 10 },
  { text: '嗯，回去那边哒 (跑)', state: 'run_left', weight: 8 },
  { text: '嗯~打个招呼哒 (挥手)', state: 'wave', weight: 10 },
  { text: '嗨哒 (推眼镜挥手)', state: 'wave', weight: 8 },
  { text: '过来这边哒 (招手)', state: 'wave', weight: 6 },
  { text: '嗯，稍微跳一下哒 (跳)', state: 'jump', weight: 10 },
  { text: '难得兴奋一下哒 (蹦)', state: 'jump', weight: 8 },
  { text: '嘿！跳起来了哒 (跳)', state: 'jump', weight: 6 },
  { text: '好难过哒... (T_T)', state: 'sad', weight: 10 },
  { text: '心情不好哒... (蜷缩)', state: 'sad', weight: 8 },
  { text: '想一个人待会儿哒 (叹气)', state: 'sad', weight: 6 },
  { text: '给点吃的哒！(双手合十)', state: 'beg', weight: 10 },
  { text: '饿了饿了哒 (盯着你)', state: 'beg', weight: 8 },
  { text: '一二有零食吗哒 (伸手)', state: 'beg', weight: 6 }
];

// ---- 双宠互动台词 ----
const COUPLE_DIALOGUES = [
  { text: ['一二哒~ (牵手)', '布布哒~ (牵手)'], state: 'hold_hands', weight: 10 },
  { text: ['抱抱哒~ (蹭蹭)', '好了好了哒 (拍拍)'], state: 'hug', weight: 10 },
  { text: ['蹭蹭鼻子哒~ (●´ω｀●)', '嗯...哒 (有点痒)'], state: 'nose_boop', weight: 10 },
  { text: ['张嘴~啊哒 (喂食)', '啊...唔好好吃哒！'], state: 'feed_each_other', weight: 10 },
  { text: ['击掌哒！✋', '加油哒！✋'], state: 'high_five', weight: 10 },
  { text: ['背背哒~ (爬上)', '别乱动哒 (走路)'], state: 'piggyback', weight: 10 },
  { text: ['散步好开心哒~ (牵手)', '嗯走慢点哒 (配合)'], state: 'walk_together', weight: 10 },
  { text: ['靠着好舒服哒~ (靠背)', '别滑下去哒 (扶着)'], state: 'lean_on_back', weight: 10 },
  { text: ['Bug抓住了哒！(举虫子)', '布布好厉害哒！(拍手)'], state: 'catch_bug_together', weight: 10 },
  { text: ['zzZ...哒', 'zzZ...哒'], state: 'sleep_together', weight: 10 },
  { text: ['给你喝一口哒 (递咖啡)', '好苦哒！(做鬼脸)'], state: 'share_coffee', weight: 10 },
  { text: ['里面好暖和哒~ (毯子)', '别把被子抢走哒 (无奈)'], state: 'hide_under_blanket', weight: 10 },
  { text: ['别动~帮你理头发哒', '好了完美哒 (满意)'], state: 'fix_hair', weight: 10 },
  { text: ['嘿嘿推你下去哒！(推)', '啊——哒——(掉落)'], state: 'push_cliff', weight: 10 },
  { text: ['看我学你哒！(模仿)', '学得好像哒！(笑)'], state: 'mirror_pose', weight: 10 },
  { text: ['哼！(背对)', '好了一二不生气哒 (转回来)', '抱抱哒~ (和好)'], state: 'argue_makeup', weight: 10 },
  { text: ['转圈圈哒~ (跳舞)', '你慢点哒~ (跟上)'], state: 'dance_together', weight: 10 },
  { text: ['这本书不错哒 (翻页)', '...zzZ (一二睡着了)'], state: 'read_together', weight: 10 },
  { text: ['看到我了吗哒~ (探头)', '又藏起来了哒 (无奈)'], state: 'peek_a_boo', weight: 10 },
  { text: ['挽着走好幸福哒~ (微笑)', '嗯嗯哒 (开心)'], state: 'walk_arm_in_arm', weight: 10 },
  { text: ['好多星星哒~ (指着天空)', '嗯...很美哒 (安静)'], state: 'stargaze', weight: 10 },
  { text: ['小心别淋雨哒 (撑伞)', '布布最好了哒~ (靠紧)'], state: 'protect_from_rain', weight: 10 }
];

// ---- 粒子特效配置 ----
// type: 粒子类型
// emoji: 显示的符号/emoji
// count: 每次产生的粒子数量
// lifetime: 粒子存活时间（毫秒）
// spread: 扩散范围（像素）
const PARTICLE_CONFIG = {
  eat: { emoji: '✨', count: 3, lifetime: 1400, spread: 60 },
  love: { emoji: '❤️', count: 2, lifetime: 1800, spread: 50 },
  bug: { emoji: '⚡', count: 2, lifetime: 1200, spread: 40 },
  smoke: { emoji: '💨', count: 2, lifetime: 1000, spread: 30 },
  star: { emoji: '⭐', count: 3, lifetime: 1800, spread: 80 },
  zzZ: { emoji: '💤', count: 1, lifetime: 2500, spread: 20 },
  heart: { emoji: '💕', count: 2, lifetime: 2000, spread: 40 },
  rain: { emoji: '🌧️', count: 2, lifetime: 1200, spread: 60 },
  sweat: { emoji: '💦', count: 2, lifetime: 1000, spread: 30 },
  spark: { emoji: '🔥', count: 3, lifetime: 1200, spread: 50 }
};

// ---- 昼夜系统配置 ----
// hour: 小时（24小时制）
// name: 时段名称
// ambientColor: 背景氛围颜色（透明窗口中用于粒子/气泡的色调）
const TIME_PERIODS = [
  { start: 6, end: 11, name: 'morning', ambientColor: '#fff8e1' },
  { start: 11, end: 14, name: 'noon', ambientColor: '#fffde7' },
  { start: 14, end: 18, name: 'afternoon', ambientColor: '#fff3e0' },
  { start: 18, end: 21, name: 'evening', ambientColor: '#fce4ec' },
  { start: 21, end: 24, name: 'night', ambientColor: '#e8eaf6' },
  { start: 0, end: 6, name: 'late_night', ambientColor: '#263238' }
];

// ---- 宠物日记事件类型 ----
const DIARY_EVENTS = {
  feed: { template: '{name}吃了东西，好满足~', icon: '🍖' },
  pet: { template: '摸了摸{name}，它很开心~', icon: '🤚' },
  play: { template: '和{name}一起玩耍了~', icon: '🧸' },
  sleep: { template: '{name}睡着了，zzZ...', icon: '💤' },
  wakeup: { template: '{name}醒来了~', icon: '☀️' },
  sad: { template: '{name}有点难过...', icon: '😢' },
  couple: { template: '一二和布布{action}了~', icon: '💕' },
  milestone: { template: '里程碑：{detail}', icon: '🏆' },
  weather: { template: '今天{weather}，气温{temp}°C', icon: '🌤️' },
  watch_tv: { template: '{name}看了一会儿电视~', icon: '📺' },
  long_idle: { template: '{name}等了你好久~ 🥺', icon: '🥺' },
  late_night: { template: '夜深了，{name}还在等你...', icon: '🌙' },
  comfort: { template: '{name}提醒你：{detail}', icon: '💧' },
  weather_mood: { template: '{name}觉得{weather}天有点{detail}', icon: '🌧️' },
  temp_alert: { template: '今天{temp}°C，{name}提醒你{detail}', icon: '🌡️' },
  first_of_day: { template: '{name}今天第一次见到你~ ✨', icon: '✨' }
};

// ---- 天气系统配置 ----
// refreshInterval: 刷新间隔（毫秒）
// temperatureComfort: 舒适温度范围
const WEATHER_CONFIG = {
  refreshInterval: 3600000,
  temperatureComfort: { low: 18, high: 28 },
  temperatureCold: 10,
  temperatureHot: 35,
  weatherReactions: {
    cold: {
      yier: ['好冷哒！(缩成一团)', '要穿棉袄哒~ (发抖)', '冷得一二不想动哒 (抖抖)', '给一二暖暖手哒 (搓手)'],
      bubu: ['天冷了，多穿点哒 (递外套)', '给一二买热可可哒 (搓手)', '代码写到手僵哒... (哈气)', '泡杯热茶哒 (起身)']
    },
    hot: {
      yier: ['好热哒！(扇风)', '一二要融化哒... (瘫)', '想吃冰淇淋哒~ (渴望)', '热得不想动哒 (趴着)'],
      bubu: ['空调开到最大哒 (推眼镜)', '写代码写到出汗哒 (擦汗)', '给一二买冰棍哒 (起身)', '热到代码都写不进了哒 (叹气)']
    },
    rain: {
      yier: ['下雨了哒~ (看窗外)', '一二想出去踩水哒 (期待)', '记得带伞哒！(提醒)', '雨声好好听哒~ (安静)'],
      bubu: ['收衣服了哒 (起身)', '雨天适合写代码哒 (安心)', '别淋雨感冒了哒 (关心)', '雨天调试Bug效率高哒 (专注)']
    },
    snow: {
      yier: ['下雪了哒！(兴奋)', '一二要堆雪人哒~ (开心)', '好漂亮的雪哒！(趴窗看)', '雪花好大哒 (伸手接)'],
      bubu: ['路滑注意安全哒 (叮嘱)', '给一二围上围巾哒 (整理)', '雪天写代码很安静哒 (享受)', '给一二买暖宝宝哒 (起身)']
    },
    cloudy: {
      yier: ['天阴了哒... (看天)', '会不会下雨哒？(担心)', '阴天有点困哒 (打哈欠)', '太阳去哪了哒 (寻找)'],
      bubu: ['带把伞以防万一哒 (提醒)', '阴天适合debug哒 (专注)', '光线暗了记得开灯哒 (关心)', '云好厚哒 (看天)']
    },
    default: {
      yier: ['天气不错哒~ (晒太阳)', '适合出去玩哒！(精神)', '今天心情好好哒~ (开心)', '阳光暖暖哒 (微笑)'],
      bubu: ['好天气好心情哒 (微笑)', '效率很高的天气哒 (点头)', '一起加油哒 (推眼镜)', '适合写代码的天气哒 (开工)']
    }
  }
};

// ---- 深夜关怀台词 ----
const LATE_NIGHT_DIALOGUES = {
  yier: [
    '夜深了，主人也早点休息哒~ 🌙 (关心)',
    '一二有点困了但是想等主人哒 (打哈欠)',
    '都这么晚了哒...快睡觉吧 (揉眼睛)',
    '熬夜对身体不好哒 (担心)',
    '一二陪你到这么晚，主人感动不 (眨眼)',
    '明天还要早起哒，早点睡吧 (认真)'
  ],
  bubu: [
    '该休息了哒 (看时间)',
    '代码明天还能写哒 (合上电脑)',
    '夜深了...注意身体哒 (关心)',
    '我也困了哒 (打哈欠)',
    '过度加班效率会变低哒 (认真)',
    '早点睡，明天效率更高哒 (推眼镜)'
  ]
};

// ---- 长时间无交互台词 ----
const LONG_IDLE_DIALOGUES = {
  yier: [
    '主人在忙吗哒？(歪头)',
    '一二想你了哒... (趴在桌边)',
    '不理一二了吗 (委屈)',
    '主人记得喝水哒！(提醒)',
    '一二好无聊哒... (左右看)',
    '主人~看一眼嘛哒 (挥手)',
    '一二在这里等你哒 (安静坐着)'
  ],
  bubu: [
    '嗯...在忙吗 (看)',
    '代码写完了记得休息哒 (关心)',
    '主人，喝杯水吧 (递水杯)',
    '一直盯着屏幕对眼睛不好哒 (提醒)',
    '我也要休息一下了 (站起来)',
    '看看窗外放松一下眼睛哒 (看外面)'
  ]
};

// ---- 喝水/休息提醒台词 ----
const HEALTH_REMINDER_DIALOGUES = {
  yier: [
    '主人该喝水啦 💧 (递水杯)',
    '休息一下眼睛哒！(提醒)',
    '坐太久了站起来动动哒 (做操)'
  ],
  bubu: [
    '写代码45分钟了，休息5分钟哒 (看时间)',
    '喝水了吗？别忘了哒 (递水)',
    '站起来活动活动哒 (伸懒腰)'
  ]
};

// ---- 天气+时段组合台词 ----
const WEATHER_TIME_DIALOGUES = {
  'rain_night': {
    yier: ['雨声好大，睡不着哒... (听雨)', '夜里下雨好安静哒 (发呆)'],
    bubu: ['雨夜适合思考哒 (安静)', '雨声很催眠哒 (闭眼)']
  },
  'rain_morning': {
    yier: ['下雨天不想起床哒 (赖床)', '雨天好困哒... (打哈欠)'],
    bubu: ['下雨了，出门带伞哒 (提醒)', '雨天上班路滑哒 (关心)']
  },
  'clear_morning': {
    yier: ['阳光好好哒~新的一天！(伸懒腰)', '晴天早安哒~ ☀️ (精神)'],
    bubu: ['好天气好心情哒 (微笑)', '今天效率一定高哒 (推眼镜)']
  },
  'snow_night': {
    yier: ['雪花在路灯下好漂亮哒 (趴窗看)', '下雪了好浪漫哒 ✨ (眨眼)'],
    bubu: ['雪夜很安静哒 (看窗外)', '注意保暖哒 (裹围巾)']
  },
  'cloudy_evening': {
    yier: ['天黑得早了哒 (看窗外)', '阴天傍晚有点闷哒 (叹气)'],
    bubu: ['傍晚了，收工吧哒 (收拾)', '天暗了记得开灯哒 (关心)']
  },
  'hot_noon': {
    yier: ['中午好热，吃个冰淇淋吧哒 (舔冰棍)', '热到不想动哒 (趴着)'],
    bubu: ['中午别出去晒哒 (提醒)', '热到代码都写不动哒 (叹气)']
  }
};

// ---- 温度精确台词 ----
const TEMP_EXACT_DIALOGUES = {
  extreme_hot: {
    yier: ['要热死哒！一二融化了 🥵 (瘫倒)', '这温度太吓人了哒 (发抖)'],
    bubu: ['这种天气不该出门哒 (看温度计)', '多喝水防中暑哒 (递水)']
  },
  very_hot: {
    yier: ['好热好热哒~ (扇风)', '一二要吃冰棍哒 (渴望)'],
    bubu: ['空调开到最大哒 (推眼镜)', '记得防暑降温哒 (递冰水)']
  },
  very_cold: {
    yier: ['好冷！一二的手冻僵了哒 🥶 (搓手)', '冻得不想动哒 (缩成一团)'],
    bubu: ['零度了...穿厚点哒 (裹围巾)', '给一二买热可可哒 (起身)']
  },
  extreme_cold: {
    yier: ['冻死啦！一二要冬眠哒 ❄️ (缩成球)', '太冷了一二不想出门哒 (发抖)'],
    bubu: ['别出门了太冷哒 (关门)', '开暖气了吗？(检查)']
  }
};

// ---- 食物/玩具配置 ----
const ITEM_CONFIG = {
  foods: [
    { name: '小鱼干', emoji: '🐟', restore: 25 },
    { name: '蛋糕', emoji: '🍰', restore: 30 },
    { name: '蜂蜜', emoji: '🍯', restore: 20 },
    { name: '竹子', emoji: '🎋', restore: 15 },
    { name: '饼干', emoji: '🍪', restore: 20 },
    { name: '苹果', emoji: '🍎', restore: 15 }
  ],
  toys: [
    { name: '毛线球', emoji: '🧶', moodRestore: 20, energyCost: 10 },
    { name: '小键盘', emoji: '⌨️', moodRestore: 15, energyCost: 8 },
    { name: '蝴蝶结', emoji: '🎀', moodRestore: 18, energyCost: 8 },
    { name: '气球', emoji: '🎈', moodRestore: 22, energyCost: 12 }
  ]
};

// ---- 图片资源配置 ----
// 每个状态对应一组图片文件，放在 assets/{角色}/{状态}/ 文件夹下
// 支持两种模式：
//   1. 单张静态图（PNG/JPG）：idle时显示静态图
//   2. 序列帧（frame_001.png, frame_002.png...）：动画播放
// 如果没有图片文件，自动回退到CSS绘制的占位熊
const IMAGE_CONFIG = {
  basePath: './assets',
  frameRate: 3,
  preferredFormats: ['png', 'jpg', 'webp'],
  yier: {
    idle:           { file: 'frame_001.png',     fallback: true },
    walk:           { file: 'frame_001.png',     fallback: true },
    eat:            { file: 'frame_001.png',     fallback: true },
    sleep:          { file: 'frame_001.png',     fallback: true },
    hungry:         { file: 'frame_001.png',     fallback: true },
    clingy:         { file: 'frame_001.png',     fallback: true },
    hide_and_seek:  { file: 'frame_001.png',     fallback: true },
    roll:           { file: 'frame_001.png',     fallback: true },
    stare_at_cursor:{ file: 'frame_001.png',     fallback: true },
    dream:          { file: 'frame_001.png',     fallback: true },
    climb_wall:     { file: 'frame_001.png',     fallback: true },
    drop_down:      { file: 'frame_001.png',     fallback: true },
    bath:           { file: 'frame_001.png',     fallback: true },
    happy_dance:    { file: 'frame_001.png',     fallback: true },
    watch_tv:       { file: 'frame_001.png',     fallback: true },
    play:           { file: 'frame_001.png',     fallback: true },
    run_right:      { file: 'frame_001.png',     fallback: true, frames: 8 },
    run_left:       { file: 'frame_001.png',     fallback: true, frames: 8 },
    sad:            { file: 'frame_001.png',     fallback: true, frames: 8 },
    beg:            { file: 'frame_001.png',     fallback: true },
    wave:           { file: 'frame_001.png',     fallback: true },
    jump:           { file: 'frame_001.png',     fallback: true }
  },
  bubu: {
    idle:           { file: 'frame_001.png',     fallback: true },
    walk:           { file: 'frame_001.png',     fallback: true },
    coding:         { file: 'frame_001.png',     fallback: true },
    coffee:         { file: 'frame_001.png',     fallback: true },
    look_for_yier:  { file: 'frame_001.png',     fallback: true },
    pat:            { file: 'frame_001.png',     fallback: true },
    read:           { file: 'frame_001.png',     fallback: true },
    yawn:           { file: 'frame_001.png',     fallback: true },
    stare_love:     { file: 'frame_001.png',     fallback: true },
    sleep:          { file: 'frame_001.png',     fallback: true },
    hungry:         { file: 'frame_001.png',     fallback: true },
    eat:            { file: 'frame_001.png',     fallback: true },
    happy_dance:    { file: 'frame_001.png',     fallback: true },
    roll:           { file: 'frame_001.png',     fallback: true },
    stare_at_cursor:{ file: 'frame_001.png',     fallback: true },
    bath:           { file: 'frame_001.png',     fallback: true },
    dream:          { file: 'frame_001.png',     fallback: true },
    watch_tv:       { file: 'frame_001.png',     fallback: true },
    drop_down:      { file: 'frame_001.png',     fallback: true },
    protect:        { file: 'frame_001.png',     fallback: true },
    tuck_in:        { file: 'frame_001.png',     fallback: true },
    carry:          { file: 'frame_001.png',     fallback: true },
    debug:          { file: 'frame_001.png',     fallback: true },
    run_right:      { file: 'frame_001.png',     fallback: true, frames: 8 },
    run_left:       { file: 'frame_001.png',     fallback: true, frames: 8 },
    sad:            { file: 'frame_001.png',     fallback: true, frames: 8 },
    beg:            { file: 'frame_001.png',     fallback: true },
    wave:           { file: 'frame_001.png',     fallback: true },
    jump:           { file: 'frame_001.png',     fallback: true }
  }
};

// ---- 右键菜单配置 ----
const CONTEXT_MENU = [
  { label: '🍖 喂食', action: 'feed' },
  { label: '🧸 玩耍', action: 'play' },
  { label: '🤚 爱抚', action: 'pet' },
  { type: 'separator' },
  { label: '📊 查看状态', action: 'status' },
  { label: '📖 宠物日记', action: 'diary' }
];

// =====================================================================
// 第四批：生活真实化系统配置
// =====================================================================

// ---- 一日作息时间表 ----
const DAILY_SCHEDULE = {
  morningGreet:  { start: 7,  end: 9,    priority: 'high' },
  breakfast:     { start: 7,  end: 9,    priority: 'high' },
  lunch:         { start: 11.5, end: 13,  priority: 'high' },
  afternoonNap:  { start: 12, end: 13.5,  priority: 'medium', probability: 0.2 },
  snack:         { start: 14, end: 17,    priority: 'low', probability: 0.1 },
  dinner:        { start: 17.5, end: 20,  priority: 'high' },
  washUp:        { start: 20.5, end: 21.5, priority: 'medium', probability: 0.4 },
  bedTime:       { start: 22, end: 6,     priority: 'high' },
  shortNap:      { start: 6,  end: 22,    priority: 'low', probability: 0.1 }
};

// ---- 三餐配置 ----
const MEAL_CONFIG = {
  breakfast: {
    hourRange: [7, 9],
    emoji: ['🌅', '🥣', '🥛', '🍞', '🥐', '☕'],
    duration: [15, 25],
    yierDialogues: ['早饭好吃哒~ (咀嚼)', '吃饱了好开心哒 (满足)', '今天吃面包哒~ 🍞', '一二要喝牛奶哒 🥛'],
    bubuDialogues: ['吃完早饭写代码哒 (精神)', '一日之计在于晨哒 (推眼镜)', '嗯，营养要均衡哒 (点头)', '吃饱了有力气了哒']
  },
  lunch: {
    hourRange: [11.5, 13],
    emoji: ['🍚', '🍜', '🥢', '🍲', '🥡'],
    duration: [15, 25],
    yierDialogues: ['午饭时间哒！(期待)', '要吃好多好多哒~ (兴奋)', '今天吃什么哒 (张望)', '一二饿了哒~ 🍜'],
    bubuDialogues: ['午饭后效率会低哒 (推眼镜)', '先吃饭再说哒 (起身)', '嗯不错哒 (吃)', '吃饭时不要看屏幕哒']
  },
  dinner: {
    hourRange: [17.5, 20],
    emoji: ['🍽️', '🥘', '🍛', '🥟', '🍖'],
    duration: [15, 25],
    yierDialogues: ['晚饭好香哒~ (嗅嗅)', '一二吃了三大碗哒 (撑)', '晚饭时间哒！(开心)', '饱饱哒~ (摸肚子)'],
    bubuDialogues: ['晚上少吃点哒 (克制)', '嗯，好吃哒 (安静吃)', '吃完晚饭出去散步哒 (提议)', '消消食再写代码哒']
  }
};

// ---- 角色个性化权重 ----
const PERSONALITY_WEIGHTS = {
  yier: {
    idle: 4,
    eat: 8,
    play: 3,
    watch_tv: 6,
    snack: 7,
    bath: 3,
    dream: 2,
    clingy: 3,
    happy_dance: 2,
    roll: 2,
    hide_and_seek: 1,
    stare_at_cursor: 2,
    talk_to_self: 5,
    run_right: 2,
    run_left: 2,
    wave: 3,
    jump: 3
  },
  bubu: {
    idle: 3,
    coding: 12,
    debug: 4,
    coffee: 5,
    read: 5,
    yawn: 3,
    stare_love: 2,
    pat: 2,
    stare_at_cursor: 1,
    eat: 2,
    watch_tv: 3,
    run_right: 1,
    run_left: 1,
    wave: 2,
    jump: 1
  }
};

// ---- 一二追番列表 ----
const TV_SHOWS = [
  { name: '熊出没', emoji: '🐻', duration: [10, 20] },
  { name: '偶像番', emoji: '⭐', duration: [15, 30] },
  { name: '美食番', emoji: '🍳', duration: [8, 15] },
  { name: '恋爱番', emoji: '💕', duration: [12, 25] },
  { name: '搞笑番', emoji: '😂', duration: [8, 15] }
];

// ---- 一二日常台词库（自言自语用） ----
const YIER_DAILY_TALKS = [
  '一二今天穿什么哒 (思考)',
  '想吃蛋糕哒... (幻想)',
  '布布在忙什么哒 (偷看)',
  '今天天气好好哒~ (微笑)',
  '一二最可爱了哒 (自信)',
  '想出去逛街哒 (期待)',
  '新番更新了吗哒 (好奇)',
  '好无聊哒... (趴着)',
  '一二想养猫哒 (幻想)',
  '要不要化个妆哒 (纠结)',
  '肚子又饿了哒 (摸肚子)',
  '布布什么时候忙完哒 (等待)',
  '一二的新裙子好看吗 (转圈)',
  '好想吃火锅哒~ (渴望)',
  '明天要出去玩哒 (计划)',
  '一二在数星星哒 (抬头)',
  '手机有什么新消息哒 (看)',
  '一二在发呆哒... (安静)',
  '想喝奶茶哒 (咽口水)',
  '晚上吃什么哒 (纠结)'
];

// ---- 布布编程日常台词 ----
const BUBU_CODING_TALKS = [
  '这个函数不对哒... (皱眉)',
  '重构一下这个模块哒 (思考)',
  '类型转换又出错了哒 (叹气)',
  '提交代码哒 (ctrl+s)',
  '这个需求不合理哒 (摇头)',
  '新框架学习一下哒 (翻开文档)',
  '代码review一下哒 (仔细看)',
  '部署成功了哒 (满意)',
  '写个单测哒 (敲键盘)',
  '内存泄漏在哪里哒 (排查)',
  'API接口设计一下哒 (画图)',
  'Git冲突了哒... (合并)',
  '性能优化一下哒 (profiling)',
  '这个设计模式不错哒 (记录)',
  '写技术博客哒 (打字)',
  '学习新语言哒 (看教程)'
];

// ---- 一二看电视台词 ----
const YIER_TV_DIALOGUES = [
  '这个好看哒！(盯屏幕)',
  '哈哈哈太搞笑了哒 (大笑)',
  '好感动哒... (眼眶湿润)',
  '快更新下一集哒 (着急)',
  '一二在追番哒~ (认真)',
  '这个角色好帅哒 (花痴)',
  '呜呜好虐哒 (擦眼泪)',
  '太甜了齁~ (捂脸)',
  '不要烂尾哒！(紧张)',
  '一二看入迷了哒 (入神)'
];

// ---- 节日配置 ----
const FESTIVAL_CONFIG = {
  springFestival: {
    name: '春节',
    months: [1, 2],
    emoji: ['🧧', '🧨', '🎊', '🐉', '🏮', '🎆'],
    dialogues: {
      yier: ['新年快乐哒！🧧 (开心)', '一二要红包哒~ (伸手)', '过年好开心哒！(蹦蹦跳跳)', '放鞭炮哒！🧨 (捂耳朵)'],
      bubu: ['新年好哒 (推眼镜)', '红包给一二哒 (递)', '新的一年继续加油哒 (握拳)', '过年休息一下哒 (放松)']
    }
  },
  valentine: {
    name: '情人节',
    month: 2,
    day: 14,
    emoji: ['❤️', '💝', '🌹', '💕', '🍫', '💌'],
    dialogues: {
      yier: ['情人节快乐哒~ ❤️ (害羞)', '一二最喜欢布布了哒 (抱)', '巧克力好好吃哒 🍫', '送你一朵花哒~ 🌹'],
      bubu: ['一二，我喜欢你哒 (认真)', '情人节快乐哒 (微笑)', '巧克力给你哒 (递)', '永远在一起哒 (牵手)']
    }
  },
  halloween: {
    name: '万圣节',
    month: 10,
    day: 31,
    emoji: ['🎃', '👻', '🦇', '🕸️', '🍬', '😈'],
    dialogues: {
      yier: ['不给糖就捣蛋哒！🎃', '好可怕哒...👻 (缩)', '一二要扮可爱哒 (准备)', '糖果糖果哒！🍬 (兴奋)'],
      bubu: ['Trick or treat哒 (推眼镜)', '南瓜灯好看哒 (欣赏)', '别怕有我在哒 (挡在前面)', '万圣节快乐哒']
    }
  },
  christmas: {
    name: '圣诞节',
    month: 12,
    day: 25,
    emoji: ['🎄', '🎅', '🦌', '🎁', '⭐', '❄️'],
    dialogues: {
      yier: ['圣诞快乐哒！🎄 (开心)', '一二要礼物哒~ 🎁 (期待)', '圣诞老人来啦哒！🎅', '好漂亮的圣诞树哒 🎄'],
      bubu: ['Merry Christmas哒 (推眼镜)', '礼物准备好了哒 (藏)', '雪好大哒 ❄️ (看窗外)', '圣诞快乐一二哒 (微笑)']
    }
  },
  birthday: {
    name: '生日',
    emoji: ['🎂', '🎈', '🎁', '🎉', '🕯️', '🎊'],
    dialogues: {
      yier: ['生日快乐哒！🎂 (欢呼)', '一二要许愿哒~ (闭眼)', '吃蛋糕啦哒！🍰', '今天是特别的日子哒 ✨'],
      bubu: ['生日快乐哒 (温柔)', '礼物拆开看看哒 (递)', '许个愿望哒 (安静)', '今天开心哒 (微笑)']
    }
  },
  midAutumn: {
    name: '中秋节',
    month: 9,
    emoji: ['🥮', '🌕', '🐰', '🏮', '🌙'],
    dialogues: {
      yier: ['中秋快乐哒~ 🥮', '月亮好圆哒 🌕 (抬头)', '一二想吃月饼哒 (期待)', '玉兔在哪里哒 🐰 (找)'],
      bubu: ['中秋快乐哒 (推眼镜)', '月饼给你留了一块哒 (递)', '月亮真美哒 (安静看)', '人月两团圆哒 (微笑)']
    }
  }
};

// ---- 桌面小植物配置 ----
const DESK_PLANT_CONFIG = {
  plants: ['🌱', '🪴', '🌿', '🌵', '🍀', '🌾'],
  waterEmojis: ['💧', '💦'],
  spawnInterval: [120000, 300000],
  maxPlants: 3,
  plantLifetime: [180000, 600000]
};

// ---- 陪伴特效 emoji ----
const COMPANION_EFFECTS = [
  { emoji: '🦋', name: '蝴蝶' },
  { emoji: '⭐', name: '星星' },
  { emoji: '🌸', name: '花瓣' },
  { emoji: '🕊️', name: '白鸽' },
  { emoji: '🌈', name: '彩虹' },
  { emoji: '💫', name: '流星' }
];

// ---- 放风筝配置 ----
const KITE_CONFIG = {
  emoji: '🪁',
  floatEmojis: ['☁️', '🌤️', '🕊️', '✨'],
  duration: [20, 40],
  dialogues: {
    yier: ['放风筝哒~ 🪁 (拉线)', '好高好高哒！(仰头)', '一二会放风筝哒 (开心)', '风好大哒~ (抓紧)'],
    bubu: ['线不要断哒 (担心)', '放得真高哒 (微笑)', '一二真厉害哒 (夸)', '一起放哒~ (帮忙)']
  }
};

// ---- 旅行特效配置 ----
const TRAVEL_EFFECTS = {
  emoji: ['🗺️', '✈️', '🌍', '🏖️', '🏔️', '🌊', '🎒'],
  dialogues: {
    yier: ['去旅行哒~ ✈️ (兴奋)', '世界好大哒！🌍 (感叹)', '一二想环游世界哒 (幻想)', '出发哒！🎒 (活力满满)'],
    bubu: ['规划好路线哒 (看地图)', '注意安全哒 (叮嘱)', '风景不错哒 (拍照)', '一起旅行很幸福哒 (微笑)']
  }
};

// ---- 一起看电视台词 ----
const COUPLE_TV_DIALOGUES = {
  yier: ['一起看好哒~ (靠过来)', '这个剧情好刺激哒 (紧张)', '不要换台哒！(抓住遥控器)', '好看好看哒~ (鼓掌)'],
  bubu: ['嗯嗯一起看哒 (靠过来)', '这剧情不错哒 (推眼镜)', '别剧透哒 (捂一二嘴)', '看完了早点睡哒 (提醒)']
};

// ---- 额头蹭蹭台词 ----
const FOREHEAD_TOUCH_DIALOGUES = {
  yier: ['蹭蹭~ 💕 (闭眼)', '好幸福哒~ (微笑)', '一二最喜欢了哒 (满足)', '嗯~好暖哒 (贴紧)'],
  bubu: ['嗯... (温柔)', '乖哒 (轻轻蹭)', '永远在一起哒 (安静)', '嗯...喜欢你哒 (微笑)']
};

// ---- 导出所有配置 ----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHARACTER_CONFIG,
    LIFE_CONFIG,
    PHYSICS_CONFIG,
    YIER_STATES,
    BUBU_STATES,
    COUPLE_STATES,
    YIER_DIALOGUES,
    BUBU_DIALOGUES,
    COUPLE_DIALOGUES,
    PARTICLE_CONFIG,
    TIME_PERIODS,
    DIARY_EVENTS,
    ITEM_CONFIG,
    CONTEXT_MENU,
    IMAGE_CONFIG,
    WEATHER_CONFIG,
    DAILY_SCHEDULE,
    MEAL_CONFIG,
    PERSONALITY_WEIGHTS,
    TV_SHOWS,
    YIER_DAILY_TALKS,
    BUBU_CODING_TALKS,
    YIER_TV_DIALOGUES,
    FESTIVAL_CONFIG,
    DESK_PLANT_CONFIG,
    COMPANION_EFFECTS,
    KITE_CONFIG,
    TRAVEL_EFFECTS,
    COUPLE_TV_DIALOGUES,
    FOREHEAD_TOUCH_DIALOGUES,
    LATE_NIGHT_DIALOGUES,
    LONG_IDLE_DIALOGUES,
    HEALTH_REMINDER_DIALOGUES,
    WEATHER_TIME_DIALOGUES,
    TEMP_EXACT_DIALOGUES
  };
}
