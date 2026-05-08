// =====================================================================
// app.js - 一二与布布 核心游戏逻辑（渲染进程）
// 这是整个桌面宠物的"大脑和心脏"！
//
// 主要模块：
// 1. 物理引擎 - 重力、弹跳、Q弹果冻效果
// 2. 宠物类 - 每个宠物的独立逻辑（位置、状态、数值）
// 3. 生命系统 - 饱腹度、心情值、精力值随时间变化
// 4. 状态机 - 根据数值和环境决定宠物做什么动作
// 5. 气泡系统 - 可爱的拟声词和颜文字
// 6. 粒子系统 - ✨❤️⚡💨等各种视觉特效
// 7. 双宠联动 - 两只宠物的互动逻辑
// 8. 时间系统 - 感知真实时间，影响行为
// =====================================================================

// ---- 全局状态 ----
let currentMode = 'both';    // 当前模式：'yier' | 'bubu' | 'both'
let isFullscreen = false;    // 是否有全屏应用
let isFocusMode = false;     // 是否专注模式
let isPassthrough = false;   // 是否穿透模式
let screenInfo = null;       // 屏幕信息
let mouseX = 0, mouseY = 0;  // 鼠标位置
let prevMouseX = 0, prevMouseY = 0; // 上一帧鼠标位置
let globalMouseVx = 0, globalMouseVy = 0; // 鼠标速度
let dragItem = null;         // 当前拖拽的食物/玩具
let pets = {};               // 宠物实例集合
let animationFrameId = null; // 动画帧ID
let mouseIsOverPet = false;  // 鼠标是否在宠物上方（用于点击穿透切换）
let menuOpen = false;        // 右键菜单是否打开
let weatherData = null;
let lastWeatherCheck = 0;
let lastGlobalInteractionTime = Date.now();

// =====================================================================
// 第一部分：工具函数
// 各种通用的小工具，比如随机数、延迟等
// =====================================================================

// 生成指定范围内的随机整数（包含两端）
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 生成指定范围内的随机浮点数
function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// 从数组中随机选一个元素
function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 按权重从数组中随机选一个
function weightedPick(arr) {
  const totalWeight = arr.reduce((sum, item) => sum + (item.weight || 1), 0);
  let rand = Math.random() * totalWeight;
  for (const item of arr) {
    rand -= (item.weight || 1);
    if (rand <= 0) return item;
  }
  return arr[arr.length - 1];
}

// 延迟指定毫秒（返回 Promise）
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 把数值限制在指定范围内
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// 获取当前小时（24小时制）
function getCurrentHour() {
  return new Date().getHours();
}

// 获取当前时段
function getCurrentTimePeriod() {
  const hour = getCurrentHour();
  for (const period of TIME_PERIODS) {
    if (period.start <= period.end) {
      if (hour >= period.start && hour < period.end) return period;
    } else {
      if (hour >= period.start || hour < period.end) return period;
    }
  }
  return TIME_PERIODS[0];
}

// 判断当前是否为夜晚
function isNightTime() {
  const hour = getCurrentHour();
  return hour >= 22 || hour < 6;
}

// 判断当前是否为周末
function isWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

// 两点之间的距离
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 简单的缓动函数
function easeOutBounce(t) {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  } else if (t < 2.5 / 2.75) {
    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  } else {
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }
}

function getCurrentDecimalHour() {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

function isInTimeRange(start, end) {
  const h = getCurrentDecimalHour();
  if (start <= end) return h >= start && h < end;
  return h >= start || h < end;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// 格式化时间
function formatTime(date) {
  const d = date || new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDate(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${formatTime(d)}`;
}

// =====================================================================
// 第二部分：物理引擎
// 让宠物有真实的重力感和Q弹的落地效果
// =====================================================================

class PhysicsBody {
  constructor(x, y, width, height) {
    this.x = x;                    // 当前 x 坐标
    this.y = y;                    // 当前 y 坐标（顶部）
    this.width = width;            // 宽度
    this.height = height;          // 高度
    this.vx = 0;                   // 水平速度
    this.vy = 0;                   // 垂直速度
    this.isGrounded = false;       // 是否在地面上
    this.isDragging = false;       // 是否被拖拽中
    this.isFalling = false;        // 是否在自由落体
    this.isJelly = false;          // 是否正在播放Q弹效果
    this.groundY = 0;              // 地面 y 坐标
    this.walkTargetX = null;       // 走路目标 x（null 表示不走路）
    this.walkSpeed = 1.2;          // 走路速度
  }

  // 获取脚底中心的 x 坐标（锚点）
  get anchorX() {
    return this.x + this.width / 2;
  }

  // 获取脚底的 y 坐标
  get footY() {
    return this.y + this.height;
  }

  // 让角色走到某个 x 坐标
  walkTo(targetX) {
    this.walkTargetX = targetX;
  }

  // 停止走路
  stopWalking() {
    this.walkTargetX = null;
    this.vx *= 0.5;
  }

  // 被抛出去（拖拽松手时调用）
  throwWithVelocity(vx, vy) {
    this.isDragging = false;
    this.isFalling = true;
    this.isGrounded = false;
    this.vx = vx;
    this.vy = vy;
  }

  // 开始自由落体（从当前位置掉落）
  startFalling() {
    this.isFalling = true;
    this.isGrounded = false;
    this.vy = 0;
  }

  // 每帧更新物理状态
  update() {
    if (this.isDragging) return;

    // 走路逻辑
    if (this.walkTargetX !== null && this.isGrounded) {
      const targetCenterX = this.walkTargetX;
      const currentCenterX = this.anchorX;
      const diff = targetCenterX - currentCenterX;

      if (Math.abs(diff) > 3) {
        // 朝目标移动
        this.vx = Math.sign(diff) * this.walkSpeed;
      } else {
        // 到达目标，停止走路
        this.walkTargetX = null;
        this.vx *= 0.3;
      }
    }

    // 自由落体/空中状态
    if (this.isFalling || !this.isGrounded) {
      this.vy += PHYSICS_CONFIG.gravity;
      this.vy *= PHYSICS_CONFIG.airResistance;
    }

    // 应用水平速度
    this.x += this.vx;

    // 地面摩擦力（在地面上时）
    if (this.isGrounded) {
      this.vx *= PHYSICS_CONFIG.groundFriction;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    } else {
      this.vx *= PHYSICS_CONFIG.airResistance;
    }

    // 应用垂直速度
    this.y += this.vy;

    // 地面碰撞检测
    const maxFootY = this.groundY;
    if (this.y + this.height >= maxFootY) {
      this.y = maxFootY - this.height;

      if (this.isFalling || this.vy > 2) {
        // 落地！播放Q弹效果
        this.vy = -this.vy * PHYSICS_CONFIG.bounceFactor;
        this.isJelly = true;
        this.isFalling = false;

        // 如果弹跳力度很小，就停下来
        if (Math.abs(this.vy) < 1.5) {
          this.vy = 0;
          this.isGrounded = true;
        }
      } else {
        this.vy = 0;
        this.isGrounded = true;
      }
    }

    // 屏幕边缘碰撞
    if (screenInfo) {
      if (this.x < 0) {
        this.x = 0;
        this.vx = Math.abs(this.vx) * 0.5;
      }
      if (this.x + this.width > screenInfo.width) {
        this.x = screenInfo.width - this.width;
        this.vx = -Math.abs(this.vx) * 0.5;
      }
    }
  }
}

// =====================================================================
// 第三部分：宠物类
// 每个宠物都是一个独立的实例，有自己的数值、状态、行为逻辑
// =====================================================================

const IMMERSIVE_STATES = [
  'sleep', 'dream', 'eat', 'coding', 'coffee', 'read', 'yawn', 'bath',
  'watch_tv', 'hide_and_seek', 'happy_dance', 'roll',
  'stare_love', 'clingy', 'beg', 'sad', 'play', 'debug',
  'pat', 'carry', 'tuck_in', 'protect'
];

const SELF_MOVING_STATES = [
  'stare_at_cursor', 'look_for_yier', 'climb_wall'
];

class Pet {
  constructor(id) {
    this.id = id;                          // 'yier' 或 'bubu'
    this.config = CHARACTER_CONFIG[id];    // 角色配置
    this.states = id === 'yier' ? YIER_STATES : BUBU_STATES;  // 状态列表
    this.dialogues = id === 'yier' ? YIER_DIALOGUES : BUBU_DIALOGUES;  // 台词库

    // ---- 生命值 ----
    this.hunger = 80;        // 饱腹度（0~100）
    this.mood = 70;          // 心情值（0~100）
    this.energy = 90;        // 精力值（0~100）

    // ---- 状态机 ----
    this.currentState = 'idle';   // 当前状态
    this.stateTimer = 0;          // 状态剩余时间（毫秒）
    this.stateStartTime = 0;      // 状态开始时间
    this.nextStateChange = 0;     // 下次状态切换时间
    this.isSleeping = false;      // 是否在睡觉
    this.isAwakeHard = false;     // 是否很难叫醒（精力极低时）

    // ---- 物理体 ----
    const startX = id === 'yier'
      ? (screenInfo ? screenInfo.width * 0.3 : 300)
      : (screenInfo ? screenInfo.width * 0.6 : 600);
    const groundY = screenInfo ? screenInfo.height : 800;
    this.body = new PhysicsBody(
      startX,
      groundY - this.config.height,
      this.config.width,
      this.config.height
    );
    this.body.groundY = groundY;
    this.body.isGrounded = true;

    // ---- DOM 引用 ----
    this.container = null;   // 容器 DOM
    this.sprite = null;      // 精灵 DOM
    this.overlay = null;     // 叠加层 DOM
    this.bubble = null;      // 气泡 DOM
    this.particlesEl = null; // 粒子容器 DOM
    this.statusEl = null;    // 状态指示器 DOM
    this.imageEl = null;     // 图片渲染 DOM
    this.eyeLayer = null;    // 眼球跟随层 DOM
    this.emotionEl = null;   // 情绪表情层 DOM
    this.dragExprEl = null;  // 拖拽表情层 DOM
    this.highFearEl = null;  // 高处恐惧层 DOM

    // ---- 图片资源 ----
    this.useImage = false;
    this.imageLoadedCache = {};
    this.frameTimer = null;
    this.currentFrameIndex = 0;
    this.currentFrameList = [];

    // ---- 气泡 ----
    this.bubbleTimer = null;   // 气泡消失定时器
    this.lastBubbleTime = 0;   // 上次显示气泡的时间
    this.bubbleCooldown = 3000; // 气泡冷却时间（毫秒）

    // ---- 交互 ----
    this.isBeingPetted = false;   // 正在被爱抚
    this.petStrokeCount = 0;      // 爱抚次数计数
    this.lastPetTime = 0;         // 上次爱抚时间
    this.dragStartPos = null;     // 拖拽开始位置
    this.dragVelocities = [];     // 拖拽速度记录（用于计算甩出速度）

    // ---- 拖拽相关 ----
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    // ---- 记忆 ----
    this.feedCount = 0;      // 今天喂食次数
    this.playCount = 0;      // 今天玩耍次数
    this.petCount = 0;       // 今天爱抚次数
    this.bugCount = 0;       // 今天 Bug 数（布布专属）

    // ---- 行为计划 ----
    this.nextWanderTime = Date.now() + randInt(8000, 20000);
    this.nextBubbleCheck = Date.now() + randInt(5000, 12000);

    // ---- 微动作系统 ----
    this.nextBlinkTime = Date.now() + randInt(3000, 8000);
    this.lastFaceDirection = 1; // 1=右 -1=左
    this.currentSitLie = null; // null, 'sit', 'lie'
    this.idleStartTime = Date.now();
    this.sitThreshold = randInt(20000, 40000);
    this.lieThreshold = randInt(60000, 120000);

    // ---- 情绪表情 ----
    this.emotionTimer = 0;
    this.lastEmotion = null;

    // ---- 亲密度 ----
    this.affection = 0;

    // ---- 环境感知 ----
    this.lastMouseMoveTime = Date.now();
    this.inactiveTimer = 0;
    this.isInactive = false;

    // ---- 第四批：行为追踪 ----
    this._dailyFlags = {};
    this._lastTVCheck = 0;
    this._lastPersonalityCheck = 0;
    this._tvStartTime = null;
    this._tvTimer = null;
    this._currentShow = null;
  }

  // 初始化 DOM 引用
  initDOM() {
    this.container = document.getElementById(`${this.id}-container`);
    this.sprite = document.getElementById(`${this.id}-sprite`);
    this.overlay = document.getElementById(`${this.id}-overlay`);
    this.bubble = document.getElementById(`${this.id}-bubble`);
    this.particlesEl = document.getElementById(`${this.id}-particles`);
    this.statusEl = document.getElementById(`${this.id}-status-indicator`);
    this.imageEl = document.getElementById(`${this.id}-img`);
    this.eyeLayer = document.getElementById(`${this.id}-eye-layer`);
    this.emotionEl = document.getElementById(`${this.id}-emotion`);
    this.dragExprEl = document.getElementById(`${this.id}-drag-expr`);
    this.highFearEl = document.getElementById(`${this.id}-high-fear`);

    if (this.imageEl) {
      this.imageEl.style.display = 'none';
    }

    this.updateDOMPosition();
    this.startBlinkLoop();
    this.startEmotionLoop();
  }

  // ---- 图片加载与切换 ----
  loadStateImage(stateId) {
    if (window.GifStatePanel) {
      const bound = window.GifStatePanel.getBoundGif(this.id, stateId);
      if (bound) {
        this._showGifOverlay(bound.dataUrl);
        return;
      }
    }
    this._removeGifOverlay();
    const cfg = IMAGE_CONFIG[this.id];
    if (!cfg || !cfg[stateId]) {
      this.showIdleFallback(stateId);
      return;
    }

    if (cfg[stateId].customFrames && cfg[stateId].dir) {
      const frames = cfg[stateId].customFrames.map(f => `${cfg[stateId].dir}/${f}`);
      this.playCustomFrameSequence(frames);
      return;
    }

    const imgDir = cfg[stateId].dir || `${IMAGE_CONFIG.basePath}/${this.id}/${stateId}`;
    const frameCount = cfg[stateId].frames || 4;
    const probeSrc = `${imgDir}/frame_001.png`;

    if (this.imageLoadedCache[probeSrc] === true) {
      this.playFrameSequence(imgDir, frameCount);
      return;
    }
    if (this.imageLoadedCache[probeSrc] === false) {
      this.trySingleImage(imgDir, cfg[stateId].file, stateId);
      return;
    }

    const probe = new Image();
    probe.onload = () => {
      this.imageLoadedCache[probeSrc] = true;
      this.playFrameSequence(imgDir, frameCount);
    };
    probe.onerror = () => {
      this.imageLoadedCache[probeSrc] = false;
      this.trySingleImage(imgDir, cfg[stateId].file, stateId);
    };
    probe.src = probeSrc;
  }

  trySingleImage(imgDir, fileName, stateId) {
    if (fileName === 'frame_001.png') {
      this.showIdleFallback(stateId);
      return;
    }
    const src = `${imgDir}/${fileName}`;
    const img = new Image();
    img.onload = () => {
      this.stopFrameAnimation();
      this.imageEl.src = src;
      this.imageEl.style.display = 'block';
      this.useImage = true;
    };
    img.onerror = () => this.showIdleFallback(stateId);
    img.src = src;
  }

  showIdleFallback(stateId) {
    if (stateId === 'idle' || stateId === 'walk') {
      this.hideImage();
      return;
    }

    const idleImgDir = `${IMAGE_CONFIG.basePath}/${this.id}/idle`;
    const idleProbeSrc = `${idleImgDir}/frame_001.png`;
    if (this.imageLoadedCache[idleProbeSrc] === true) {
      this.playFrameSequence(idleImgDir);
      return;
    }

    const img = new Image();
    img.onload = () => {
      this.imageLoadedCache[idleProbeSrc] = true;
      this.playFrameSequence(idleImgDir);
    };
    img.onerror = () => {
      this.imageLoadedCache[idleProbeSrc] = false;
      this.hideImage();
    };
    img.src = idleProbeSrc;
  }

  _showGifOverlay(dataUrl) {
    this.stopFrameAnimation();
    this.hideImage();
    this._removeGifOverlay();
    if (this.sprite) this.sprite.style.display = 'none';
    this.container.style.width = `${this.config.width}px`;
    this.container.style.height = `${this.config.height}px`;
    const overlay = document.createElement('img');
    overlay.className = 'gif-overlay';
    overlay.src = dataUrl;
    overlay.style.cssText = `position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:${this.config.width}px;height:${this.config.height}px;object-fit:contain;pointer-events:none;z-index:150;`;
    this.container.appendChild(overlay);
    this._gifOverlayEl = overlay;
  }

  _removeGifOverlay() {
    if (this._gifOverlayEl) {
      if (this._gifOverlayEl.parentNode) this._gifOverlayEl.remove();
      this._gifOverlayEl = null;
    }
    const existing = this.container && this.container.querySelector('.gif-overlay');
    if (existing) existing.remove();
    this.container.style.width = '';
    this.container.style.height = '';
    if (this.sprite) this.sprite.style.display = '';
  }

  playFrameSequence(imgDir, frameCount) {
    this.stopFrameAnimation();
    const count = frameCount || 4;
    const frames = [];
    for (let i = 1; i <= count; i++) {
      frames.push(`${imgDir}/frame_${String(i).padStart(3, '0')}.png`);
    }
    this.currentFrameList = frames;
    this.currentFrameIndex = 0;
    this.imageEl.src = frames[0];
    this.imageEl.style.display = 'block';
    this.useImage = true;
    const interval = 1000 / (IMAGE_CONFIG.frameRate || 8);
    this.frameTimer = setInterval(() => {
      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.currentFrameList.length;
      this.imageEl.src = this.currentFrameList[this.currentFrameIndex];
    }, interval);
  }

  playCustomFrameSequence(frameUrls) {
    this.stopFrameAnimation();
    this.currentFrameList = frameUrls;
    this.currentFrameIndex = 0;
    this.imageEl.src = frameUrls[0];
    this.imageEl.style.display = 'block';
    this.useImage = true;
    const interval = 1000 / (IMAGE_CONFIG.frameRate || 3);
    this.frameTimer = setInterval(() => {
      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.currentFrameList.length;
      this.imageEl.src = this.currentFrameList[this.currentFrameIndex];
    }, interval);
  }

  stopFrameAnimation() {
    if (this.frameTimer) {
      clearInterval(this.frameTimer);
      this.frameTimer = null;
    }
  }

  showImage(src) {
    if (!this.imageEl) return;
    this.stopFrameAnimation();
    this.imageEl.src = src;
    this.imageEl.style.display = 'block';
    this.useImage = true;
  }

  hideImage() {
    if (!this.imageEl) return;
    this.stopFrameAnimation();
    this.imageEl.style.display = 'none';
    this.imageEl.src = '';
    this.useImage = false;
  }

  // 更新 DOM 位置（把物理体的坐标同步到页面元素上）
  updateDOMPosition() {
    if (!this.container) return;
    this.container.style.left = `${this.body.x}px`;
    this.container.style.bottom = `${screenInfo ? screenInfo.height - this.body.footY : 0}px`;

    const isWalking = this.body.walkTargetX !== null && this.body.isGrounded && this.currentState === 'idle';
    if (isWalking) {
      if (!this.container.classList.contains('state-walking')) {
        this.container.classList.add('state-walking');
        this.loadStateImage('walk');
      }
    } else {
      if (this.container.classList.contains('state-walking')) {
        this.container.classList.remove('state-walking');
        this.loadStateImage(this.currentState);
      }
    }
  }

  // ---- 生命系统：每帧调用 ----
  updateLife(deltaTime) {
    let decayMultiplier = 1;
    if (weatherData) {
      if (weatherData.type === 'rain' || weatherData.type === 'snow' || weatherData.type === 'cold') decayMultiplier = 1.5;
      else if (weatherData.type === 'hot') {
        this.energy = Math.max(0, this.energy - 0.01 * deltaTime / 1000);
      }
    }
    const seconds = deltaTime / 1000;

    // 饱腹度持续下降
    this.hunger = Math.max(0, this.hunger - LIFE_CONFIG.hunger.decay * seconds * decayMultiplier);

    // 心情值持续下降
    this.mood = Math.max(0, this.mood - LIFE_CONFIG.mood.decay * seconds * decayMultiplier);

    // 精力值下降（睡觉时恢复）
    if (this.isSleeping) {
      this.energy = Math.min(LIFE_CONFIG.energy.max,
        this.energy + LIFE_CONFIG.sleepEnergyRestore * seconds);
      this.mood = Math.min(LIFE_CONFIG.mood.max,
        this.mood + LIFE_CONFIG.sleepMoodRestore * seconds);
    } else {
      this.energy = Math.max(0, this.energy - LIFE_CONFIG.energy.decay * seconds * decayMultiplier);
    }

    // 编码状态消耗精力更快
    if (this.currentState === 'coding') {
      this.energy = Math.max(0, this.energy - 0.02 * seconds);
    }
  }

  // ---- 状态机：决定宠物该做什么 ----
  updateState(deltaTime) {
    this.stateTimer -= deltaTime;

    if (this.stateTimer <= 0) {
      this.chooseNextState();
    }

    if ((IMMERSIVE_STATES.includes(this.currentState) || SELF_MOVING_STATES.includes(this.currentState)) && this._stateAnchorX != null) {
      const dx = this.body.anchorX - this._stateAnchorX;
      const dy = this.body.anchorY - this._stateAnchorY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = this.config.width * 0.1;
      const isSelfMoving = SELF_MOVING_STATES.includes(this.currentState) && this.body.walkTargetX !== null;
      if (dist > threshold && !isSelfMoving && !this.isDragging && !(coupleSystem && coupleSystem.currentInteraction)) {
        this.showBubble(randPick(['吓一跳哒！', '哎呀！', '被吵醒了...', '啊！', '怎么了哒？']));
        this.setState('idle');
      } else if (isSelfMoving && dist > threshold) {
        this._stateAnchorX = this.body.anchorX;
        this._stateAnchorY = this.body.anchorY;
      }
    }
  }

  // 选择下一个状态
  chooseNextState() {
    const now = Date.now();
    const hour = getCurrentHour();

    // 强制状态（优先级最高）
    // 精力极低 -> 必须睡觉
    if (this.energy <= LIFE_CONFIG.energy.critical && !this.isSleeping) {
      this.setState('sleep');
      return;
    }

    // 正在睡觉且精力还没恢复够 -> 继续睡
    if (this.isSleeping && this.energy < 60) {
      this.setState('sleep');
      return;
    }

    // 饥饿极了
    if (this.hunger <= LIFE_CONFIG.hunger.critical) {
      this.setState('hungry');
      return;
    }

    // 心情极差
    if (this.mood <= LIFE_CONFIG.mood.critical) {
      const hasSad = this.states.some(s => s.id === 'sad');
      this.setState(hasSad ? 'sad' : 'idle');
      return;
    }

    // 收集所有可以进入的状态，按优先级加权随机
    const candidates = [];

    for (const state of this.states) {
      if (state.id === this.currentState && state.id !== 'idle') continue;

      let score = state.priority;

      const conds = state.conditions || {};

      if (conds.hunger === 'low' && this.hunger > LIFE_CONFIG.hunger.low) continue;
      if (conds.hunger === 'critical' && this.hunger > LIFE_CONFIG.hunger.critical) continue;
      if (conds.mood === 'high' && this.mood < 75) continue;
      if (conds.mood === 'critical' && this.mood > LIFE_CONFIG.mood.critical) continue;
      if (conds.energy === 'low' && this.energy > LIFE_CONFIG.energy.low) continue;
      if (conds.energy === 'critical' && this.energy > LIFE_CONFIG.energy.critical) continue;
      if (conds.timeOfDay === 'day' && isNightTime()) continue;
      if (conds.timeOfDay === 'night' && !isNightTime()) continue;
      if (conds.state === 'sleep' && !this.isSleeping) continue;

      if (conds.hunger === 'low' && this.hunger <= LIFE_CONFIG.hunger.low) score += 5;
      if (conds.hunger === 'critical' && this.hunger <= LIFE_CONFIG.hunger.critical) score += 10;
      if (conds.mood === 'high' && this.mood >= 75) score += 4;
      if (conds.mood === 'critical' && this.mood <= LIFE_CONFIG.mood.critical) score += 10;
      if (conds.energy === 'low' && this.energy <= LIFE_CONFIG.energy.low) score += 5;
      if (conds.energy === 'critical' && this.energy <= LIFE_CONFIG.energy.critical) score += 10;

      if (conds.timeOfDay === 'day' && !isNightTime()) score += 3;
      if (conds.timeOfDay === 'night' && isNightTime()) score += 5;

      // 周末增加互动概率
      if (isWeekend() && ['walk', 'clingy', 'happy_dance', 'roll'].includes(state.id)) {
        score += 3;
      }

      // 夜晚增加睡觉概率
      if (isNightTime() && state.id === 'sleep') score += 8;
      if (hour >= 22 && state.id === 'yawn') score += 5;

      // 随机状态
      if (conds.random && Math.random() > 0.5) continue;

      // 已经在地面上就不需要 drop_down
      if (state.id === 'drop_down' && !this.body.isFalling) continue;

      // 跳过需要交互触发的状态（不是随机的）
      if (conds.action) continue;

      // 检查伴侣相关条件（仅双宠模式生效）
      const partner = this.partner;
      if (partner) {
        const partnerDist = distance(this.body.anchorX, this.body.footY, partner.body.anchorX, partner.body.footY);

        if (conds.partnerFar) {
          if (partnerDist < 200) continue;
          score += 5;
        }
        if (conds.partnerNear) {
          if (partnerDist > 150) continue;
          score += 4;
        }
        if (conds.nearPartner) {
          if (partnerDist > 150) continue;
          score += 4;
        }
        if (conds.partnerState) {
          if (partner.currentState !== conds.partnerState) continue;
          score += 8;
        }
        if (conds.partnerDanger) {
          const partnerInDanger = partner.hunger <= LIFE_CONFIG.hunger.critical ||
                                  partner.mood <= LIFE_CONFIG.mood.critical;
          if (!partnerInDanger) continue;
          score += 9;
        }
        if (conds.nearEdge) {
          const edgeThreshold = 100;
          const sw = screenInfo ? screenInfo.width : window.innerWidth;
          const nearLeft = this.body.x <= edgeThreshold;
          const nearRight = this.body.x + this.body.width >= sw - edgeThreshold;
          if (!nearLeft && !nearRight) continue;
          score += 3;
        }

        // Add distance bonus for partner interactions
        if (partnerDist < 150 && (conds.partnerNear || conds.partnerState || conds.partnerDanger)) {
          score += 4;
        }
        if (partnerDist < 100 && (conds.partnerNear || conds.partnerState || conds.partnerDanger)) {
          score += 6;
        }
      } else {
        // 单宠模式下跳过伴侣条件
        if (conds.partnerFar || conds.partnerNear || conds.partnerState ||
            conds.nearPartner || conds.partnerDanger) continue;
        if (conds.nearEdge) {
          const edgeThreshold = 100;
          const sw = screenInfo ? screenInfo.width : window.innerWidth;
          const nearLeft = this.body.x <= edgeThreshold;
          const nearRight = this.body.x + this.body.width >= sw - edgeThreshold;
          if (!nearLeft && !nearRight) continue;
          score += 3;
        }
      }

      if (score > 0) {
        candidates.push({ state, score });
      }
    }

    if (candidates.length === 0) {
      this.setState('idle');
      return;
    }

    // 按分数加权随机选择
    const total = candidates.reduce((s, c) => s + c.score, 0);
    let rand = Math.random() * total;
    let chosenState = candidates[0].state.id;
    for (const c of candidates) {
      rand -= c.score;
      if (rand <= 0) {
        chosenState = c.state.id;
        break;
      }
    }

    // GIF 自定义状态：每个独立概率判定，可叠加
    // 冷却：同一个GIF至少间隔30秒，任意GIF至少间隔15秒
    if (window.GifManager) {
      const now = Date.now();
      const gifCooldownOk = !this._lastGifTime || (now - this._lastGifTime > 15000);
      if (gifCooldownOk) {
        const gifCandidates = window.GifManager.getGifStateCandidates(this.id);
        for (const gif of gifCandidates) {
          if (gif.id === this._lastGifId && now - this._lastGifTime < 30000) continue;
          if (Math.random() * 100 < gif.probability) {
            chosenState = 'gif:' + gif.id;
            break;
          }
        }
      }
    }

    this.setState(chosenState);
  }

  // 切换到指定状态
  setState(newStateId) {
    const oldState = this.currentState;
    this.currentState = newStateId;
    this.stateStartTime = Date.now();
    this._stateAnchorX = this.body.anchorX;
    this._stateAnchorY = this.body.anchorY;

    // GIF 自定义状态处理
    if (newStateId.startsWith('gif:') && window.GifManager) {
      const gifId = newStateId.slice(4);
      const gifItems = window.GifManager.items();
      const gifEntry = gifItems.find(g => g.id === gifId);
      if (gifEntry) {
        this.hideImage();
        this._showGifOverlay(gifEntry.dataUrl);
        this.stateTimer = randInt(10, 20) * 1000;
        const randStates = ['eat', 'happy_dance', 'idle', 'clingy', 'roll', 'dream'];
        const randState = randPick(randStates);
        this.triggerStateBubble(randState);
        this.triggerStateParticle(randState);
        this._lastGifId = gifId;
        this._lastGifTime = Date.now();
        return;
      }
    }

    // 清除可能残留的GIF覆盖层
    this._removeGifOverlay();

    // 离开看电视状态时清理
    if (oldState === 'watch_tv' && newStateId !== 'watch_tv') {
      this.stopTVBehavior();
    }

    // 离开奔跑状态时清理
    if ((oldState === 'run_right' || oldState === 'run_left') && newStateId !== 'run_right' && newStateId !== 'run_left') {
      this.stopRun();
    }

    if (newStateId === 'idle') {
      this.idleStartTime = Date.now();
    } else if (this.currentSitLie) {
      this.currentSitLie = null;
      this.container && this.container.classList.remove('state-sit', 'state-lie');
    }

    // 状态持续时间
    const stateDef = this.states.find(s => s.id === newStateId);
    if (stateDef) {
      const [minDur, maxDur] = stateDef.duration;
      this.stateTimer = randFloat(minDur, maxDur) * 1000;
    } else {
      this.stateTimer = randInt(3, 8) * 1000;
    }

    // 睡觉状态处理
    if (newStateId === 'sleep' || newStateId === 'dream') {
      this.isSleeping = true;
      if (this.energy <= LIFE_CONFIG.energy.critical * 0.5) {
        this.isAwakeHard = true;
      }
    } else {
      if (this.isSleeping && oldState === 'sleep') {
        // 刚醒来
        this.isSleeping = false;
        this.isAwakeHard = false;
        saveDiaryEntry('wakeup', this.id);
      }
    }

    // 更新 DOM 样式类
    this.updateStateClass(oldState, newStateId);

    // 尝试加载该状态的图片（GIF/序列帧），有图片就自动替换CSS绘制
    this.loadStateImage(newStateId);

    // 根据状态显示气泡
    this.triggerStateBubble(newStateId);

    // 根据状态产生粒子
    this.triggerStateParticle(newStateId);

    // 更新状态指示器
    this.updateStatusIndicator(newStateId);

    // 布布编码时飘代码
    if (newStateId === 'coding') {
      this.startCodingEffect();
    }

    // 做梦效果
    if (newStateId === 'dream') {
      this.startDreamEffect();
    }

    // 一二盯着鼠标指针看 → 好奇地走向鼠标
    if (newStateId === 'stare_at_cursor') {
      this.startStareAtCursor();
    }

    // 攀爬屏幕边缘
    if (newStateId === 'climb_wall') {
      this.startClimbWall();
    }

    // 布布找一二
    if (newStateId === 'look_for_yier' && pets.yier) {
      this.body.walkTo(pets.yier.body.anchorX);
    }

    // 布布走向一二摸头
    if (newStateId === 'pat' && pets.yier) {
      this.body.walkTo(pets.yier.body.anchorX);
      setTimeout(() => {
        if (this.currentState === 'pat') {
          this.emitParticles('heart', this.config.width / 2, 20);
        }
      }, 1500);
    }

    // 看电视行为
    if (newStateId === 'watch_tv') {
      this.startTVBehavior();
    }

    // 奔跑行为
    if (newStateId === 'run_right') {
      this.startRun(1);
    }
    if (newStateId === 'run_left') {
      this.startRun(-1);
    }

    // 跳跃行为
    if (newStateId === 'jump') {
      this.startJump();
    }

  }

  // 更新 DOM 上的状态样式类
  updateStateClass(oldState, newState) {
    if (!this.container) return;
    this.container.classList.remove(`state-${oldState}`);
    this.container.classList.add(`state-${newState}`);
  }

  // ---- 气泡语言系统 ----
  triggerStateBubble(stateId) {
    const now = Date.now();
    if (now - this.lastBubbleTime < this.bubbleCooldown) return;

    // 根据状态找匹配的台词
    const matchingDialogues = this.dialogues.filter(d =>
      d.state === stateId || (!d.state && Math.random() > 0.5)
    );

    if (matchingDialogues.length === 0) return;

    const dialogue = weightedPick(matchingDialogues);
    this.showBubble(dialogue.text);
    this.lastBubbleTime = now;
  }

  // 显示气泡
  showBubble(text, duration = 4000) {
    if (!this.bubble || isFocusMode) return;

    const contentEl = this.bubble.querySelector('.bubble-content');
    if (!contentEl) return;

    contentEl.textContent = text;
    this.bubble.classList.add('visible');

    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => {
      this.bubble.classList.remove('visible');
    }, duration);
  }

  // 随机气泡（非状态触发的闲聊）
  triggerRandomBubble() {
    const now = Date.now();
    if (now - this.lastBubbleTime < this.bubbleCooldown) return;
    if (now < this.nextBubbleCheck) return;

    // 随机概率触发
    if (Math.random() > 0.4) {
      this.nextBubbleCheck = now + randInt(8000, 20000);
      return;
    }

    const generalDialogues = this.dialogues.filter(d => !d.state || d.state === 'idle');
    if (generalDialogues.length > 0) {
      const dialogue = weightedPick(generalDialogues);
      this.showBubble(dialogue.text);
      this.lastBubbleTime = now;
    }

    this.nextBubbleCheck = now + randInt(8000, 25000);
  }

  // ---- 粒子特效系统 ----
  triggerStateParticle(stateId) {
    if (isFocusMode) return;

    let particleType = null;

    switch (stateId) {
      case 'eat': particleType = 'eat'; break;
      case 'sleep':
      case 'dream':
        particleType = 'zzZ'; break;
      case 'coding':
        if (Math.random() > 0.5) particleType = 'bug';
        else particleType = 'smoke';
        break;
      case 'happy_dance':
      case 'roll':
        particleType = 'star'; break;
      case 'coffee':
        particleType = 'smoke'; break;
      default: break;
    }

    if (particleType) {
      this.emitParticles(particleType);
    }
  }

  // 产生粒子
  emitParticles(type, x, y) {
    if (!this.particlesEl || isFocusMode) return;

    const config = PARTICLE_CONFIG[type];
    if (!config) return;

    const MAX_PARTICLES = 12;
    const currentCount = this.particlesEl.children.length;
    if (currentCount >= MAX_PARTICLES) return;

    const count = Math.min(config.count, MAX_PARTICLES - currentCount);

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      if (type === 'heart') particle.className += ' particle-heart';
      particle.textContent = config.emoji;
      particle.style.animationDuration = `${config.lifetime}ms`;

      this.particlesEl.appendChild(particle);

      setTimeout(() => {
        if (particle.parentNode) particle.parentNode.removeChild(particle);
      }, config.lifetime + 100);
    }
  }

  // ---- 状态指示器（头顶小图标） ----
  updateStatusIndicator(stateId) {
    if (!this.statusEl) return;

    const indicators = {
      'hungry': '🍖',
      'sleep': '💤',
      'dream': '💭',
      'happy_dance': '🎵',
      'eat': '✨',
      'coding': '⌨️',
      'coffee': '☕',
      'yawn': '🥱',
      'bath': '🧼',
      'clingy': '💕',
      'walk': '🧸',
      'roll': '🌀',
      'read': '📖',
      'stare_at_cursor': '👀',
      'stare_love': '🥰',
      'sad': '😢',
      'watch_tv': '📺',
      'run_right': '🏃',
      'run_left': '🏃',
      'wave': '👋',
      'jump': '🦘'
    };

    const icon = indicators[stateId];
    if (icon) {
      this.statusEl.textContent = icon;
      this.statusEl.style.display = 'block';
    } else {
      this.statusEl.style.display = 'none';
    }
  }

  // ---- 布布编码飘代码效果 ----
  startCodingEffect() {
    if (this.id !== 'bubu') return;

    const codeSnippets = ['</>', 'Bug!', '{}', '()', '=>', 'if()', 'bug!', '0x00', '404', 'null'];

    const doFloat = () => {
      if (this.currentState !== 'coding' || !this.overlay) return;

      const snippet = document.createElement('div');
      snippet.className = 'coding-float';
      snippet.textContent = randPick(codeSnippets);
      snippet.style.left = `${randInt(20, this.config.width - 40)}px`;
      snippet.style.top = `${randInt(20, 60)}px`;
      snippet.style.color = randPick(['#4ec9b0', '#dcdcaa', '#ce9178', '#569cd6', '#b5cea8']);

      this.overlay.appendChild(snippet);
      setTimeout(() => {
        if (snippet.parentNode) snippet.parentNode.removeChild(snippet);
      }, 2000);

      if (this.currentState === 'coding') {
        setTimeout(doFloat, randInt(800, 2000));
      }
    };

    setTimeout(doFloat, 500);
  }

  // ---- 做梦效果 ----
  startDreamEffect() {
    const dreamEmojis = ['🐟', '🍰', '🍯', '⭐', '🌸', '🧸', '❤️'];

    const doDream = () => {
      if (this.currentState !== 'dream' && this.currentState !== 'sleep' || !this.overlay) return;

      const bubble = document.createElement('div');
      bubble.className = 'dream-bubble';
      bubble.textContent = randPick(dreamEmojis);
      bubble.style.left = `${randInt(30, this.config.width - 30)}px`;
      bubble.style.top = `${randInt(-20, 20)}px`;

      this.overlay.appendChild(bubble);
      setTimeout(() => {
        if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
      }, 3000);

      if (this.isSleeping) {
        setTimeout(doDream, randInt(3000, 6000));
      }
    };

    // zzZ 效果
    const doZzz = () => {
      if (!this.isSleeping || !this.overlay) return;

      const zzz = document.createElement('div');
      zzz.className = 'zzZ';
      zzz.textContent = 'zzZ';
      zzz.style.right = `${randInt(5, 30)}px`;
      zzz.style.top = `${randInt(-10, 20)}px`;

      this.overlay.appendChild(zzz);
      setTimeout(() => {
        if (zzz.parentNode) zzz.parentNode.removeChild(zzz);
      }, 2500);

      if (this.isSleeping) {
        setTimeout(doZzz, randInt(1500, 3000));
      }
    };

    setTimeout(doDream, 1000);
    setTimeout(doZzz, 500);
  }

  // ---- 一二盯着鼠标指针看 → 好奇地走向鼠标 ----
  startStareAtCursor() {
    const walkToMouse = () => {
      if (this.currentState !== 'stare_at_cursor' || this.isDragging || this.isSleeping) return;
      if (!this.body.isGrounded) return;

      // 走向鼠标位置
      const targetX = clamp(mouseX - this.config.width / 2, 0,
        (screenInfo ? screenInfo.width : window.innerWidth) - this.config.width);
      this.body.walkTo(targetX + this.config.width / 2);

      // 走近后显示好奇心气泡
      setTimeout(() => {
        if (this.currentState === 'stare_at_cursor') {
          if (Math.abs(this.body.anchorX - mouseX) < 80) {
            this.showBubble(randPick([
              '啊哒！发现你了！(指着鼠标)',
              '你是什么哒？(好奇)',
              '一二看到你了哒~ (眨眼)'
            ]));
            this.emitParticles('star', this.config.width / 2, 30);
          }
        }
      }, 2000);
    };

    setTimeout(walkToMouse, 500);
  }

  // ---- 攀爬屏幕边缘 ----
  startClimbWall() {
    if (!screenInfo) return;

    const sw = screenInfo.width;
    const leftDist = this.body.x;
    const rightDist = sw - this.body.x - this.body.width;

    // 选择更近的边缘
    const targetX = leftDist < rightDist ? 10 : sw - this.config.width - 10;
    this.body.walkTo(targetX + this.config.width / 2);

    // 到达边缘后显示攀爬台词
    setTimeout(() => {
      if (this.currentState === 'climb_wall') {
        this.showBubble(randPick(this.id === 'yier'
          ? ['一二爬上去了哒！(努力)', '上面有什么哒？(爬)', '墙壁好滑哒... (抓不住)']
          : ['爬墙好累哒... (叹气)', '为什么我要爬墙哒 (无奈)', '坚持一下哒 (努力)']
        ));
      }
    }, 1500);
  }

  // ---- 交互：喂食 ----
  feed(foodItem) {
    lastGlobalInteractionTime = Date.now();
    this._checkFirstOfDay();
    this.hunger = clamp(this.hunger + (foodItem ? foodItem.restore : LIFE_CONFIG.feedRestore), 0, LIFE_CONFIG.hunger.max);
    this.mood = clamp(this.mood + 5, 0, LIFE_CONFIG.mood.max);
    this.feedCount++;

    // 切换到吃状态
    this.setState('eat');

    // 显示食物 emoji
    if (foodItem) {
      this.showBubble(randPick([
        `啊哒哒~ ${foodItem.emoji} (✧◡✧)`,
        `嗷呜啊哒 ${foodItem.emoji} (๑´ڡ\`๑)`,
        `好吃哒！${foodItem.emoji} (≧▽≦)`
      ]));
    }

    // 吃东西的粒子
    this.emitParticles('eat', this.config.width / 2, this.config.height / 3);

    // 喂食视觉特效
    this.showInteractionEffect('feed', foodItem);

    // 记日记
    saveDiaryEntry('feed', this.id, { food: foodItem ? foodItem.name : '食物' });
  }

  // ---- 交互：爱抚 + 强触碰 ----
  petStroke(clientX, clientY) {
    const now = Date.now();
    if (now - this.lastPetTime < 150) return;
    const dt = now - this.lastPetTime;
    this.lastPetTime = now;

    this.petStrokeCount++;

    if (this.petStrokeCount >= 3) {
      lastGlobalInteractionTime = Date.now();
      this.mood = clamp(this.mood + LIFE_CONFIG.petRestore, 0, LIFE_CONFIG.mood.max);
      this.petStrokeCount = 0;
      this.isBeingPetted = true;

      this.petAtLocation(clientX, clientY);

      saveDiaryEntry('pet', this.id);

      setTimeout(() => { this.isBeingPetted = false; }, 2000);
    }

    if (this.isSleeping && this.petStrokeCount >= 5) {
      this.isSleeping = false;
      this.isAwakeHard = false;
      this.setState('idle');
      this.showBubble(randPick(this.id === 'yier'
        ? ['呜...谁在摸哒 (揉眼)', '啊...醒了一点哒 (迷糊)', '一二被摸醒了哒 (不满)']
        : ['...别闹 (睁眼)', '醒了哒 (叹气)', '什么事哒 (看)']
      ));
      this.lastBubbleTime = Date.now();
    }

    if (!this.isSleeping && this.petStrokeCount >= 6) {
      const interruptible = ['coding', 'eat', 'read', 'coffee', 'bath', 'stare_at_cursor'];
      if (interruptible.includes(this.currentState)) {
        this.setState('idle');
        this.showBubble(randPick(this.id === 'yier'
          ? ['啊哒？(被打断)', '干嘛哒！(不满)', '嗯？什么事哒 (看)']
          : ['...被打断了 (叹气)', '什么事哒 (看)', '正忙着哒... (无奈)']
        ));
        this.lastBubbleTime = Date.now();
      }
    }
  }

  // ---- 交互：玩耍 ----
  play(toyItem) {
    lastGlobalInteractionTime = Date.now();
    this.mood = clamp(this.mood + (toyItem ? toyItem.moodRestore : LIFE_CONFIG.playRestore), 0, LIFE_CONFIG.mood.max);
    this.energy = Math.max(0, this.energy - (toyItem ? toyItem.energyCost : LIFE_CONFIG.playEnergyCost));
    this.playCount++;

    const playState = this.states.some(s => s.id === 'play') ? 'play' : 'happy_dance';
    this.setState(playState);

    if (toyItem) {
      this.showBubble(randPick([
        `呜呼哒~ ${toyItem.emoji} ✧(≖ ◡ ≖✿)`,
        `哒哒哒！${toyItem.emoji} (ノ>▽<)ノ`
      ]));
    }

    this.emitParticles('star', this.config.width / 2, this.config.height / 2);

    // 玩耍视觉特效
    this.showInteractionEffect('play', toyItem);

    saveDiaryEntry('play', this.id, { toy: toyItem ? toyItem.name : '玩具' });
  }

  // ---- 交互动作视觉效果（显示在头顶） ----
  showInteractionEffect(type, item) {
    if (!this.container) return;

    const oldFx = this.container.querySelector('.interaction-fx');
    if (oldFx) oldFx.remove();

    const fxLayer = document.createElement('div');
    fxLayer.className = 'interaction-fx';

    switch (type) {
      case 'feed': {
        const food = document.createElement('div');
        food.className = 'fx-feed-food';
        food.textContent = item ? item.emoji : '🍖';
        fxLayer.appendChild(food);

        const munch = document.createElement('div');
        munch.className = 'fx-feed-munch';
        munch.textContent = '嗷呜~ 嗯嗯~ (๑´ڡ`๑)';
        fxLayer.appendChild(munch);

        const starEmojis = ['⭐', '✨', '💫'];
        for (let i = 0; i < 3; i++) {
          const star = document.createElement('div');
          star.className = 'fx-feed-stars';
          star.textContent = starEmojis[i];
          star.style.animationDelay = `${i * 0.3}s`;
          star.style.left = `${30 + i * 25}%`;
          fxLayer.appendChild(star);
        }

        this.container.classList.add('state-feed-fx');
        setTimeout(() => this.container.classList.remove('state-feed-fx'), 1500);
        break;
      }

      case 'pet': {
        const hand = document.createElement('div');
        hand.className = 'fx-pet-hand';
        fxLayer.appendChild(hand);

        const blushEmojis = ['💕', '💗', '💖', '✨'];
        for (let i = 0; i < 4; i++) {
          const blush = document.createElement('div');
          blush.className = 'fx-pet-blush';
          blush.textContent = blushEmojis[i];
          blush.style.animationDelay = `${0.3 + i * 0.25}s`;
          blush.style.left = `${10 + i * 22}%`;
          fxLayer.appendChild(blush);
        }

        for (let i = 0; i < 3; i++) {
          const sparkle = document.createElement('div');
          sparkle.className = 'fx-pet-sparkle';
          sparkle.textContent = '✨';
          sparkle.style.animationDelay = `${0.5 + i * 0.3}s`;
          sparkle.style.bottom = `${30 + i * 25}px`;
          sparkle.style.left = `${15 + i * 30}%`;
          fxLayer.appendChild(sparkle);
        }
        break;
      }

      case 'play': {
        const toy = document.createElement('div');
        toy.className = 'fx-play-toy';
        toy.textContent = item ? item.emoji : '🧸';
        fxLayer.appendChild(toy);

        const giggle = document.createElement('div');
        giggle.className = 'fx-play-giggle';
        giggle.textContent = randPick(['哈哈哈！', '好玩哒！', '再来再来！', '嘻嘻嘻~']);
        fxLayer.appendChild(giggle);

        const confettiEmojis = ['🎉', '🎊', '⭐', '🌟', '💫', '✨'];
        for (let i = 0; i < 6; i++) {
          const confetti = document.createElement('div');
          confetti.className = 'fx-play-confetti';
          confetti.textContent = confettiEmojis[i];
          confetti.style.animationDelay = `${i * 0.15}s`;
          confetti.style.left = `${5 + i * 16}%`;
          confetti.style.bottom = `${40 + randInt(0, 40)}px`;
          fxLayer.appendChild(confetti);
        }

        this.container.classList.add('state-play-fx');
        setTimeout(() => this.container.classList.remove('state-play-fx'), 2000);
        break;
      }
    }

    this.container.appendChild(fxLayer);
    setTimeout(() => { if (fxLayer.parentNode) fxLayer.remove(); }, 2500);
  }

  // ---- 拖拽交互 ----
  startDrag(clientX, clientY) {
    this.isDragging = true;
    this.body.isDragging = true;
    this.body.isGrounded = false;
    this.dragOffsetX = clientX - this.body.x;
    this.dragOffsetY = clientY - this.body.y;
    this.dragVelocities = [];
    this.dragStartPos = { x: clientX, y: clientY };
    this._stateBeforeDrag = this.currentState;

    this.body.stopWalking();
    this.container.classList.remove('state-sit', 'state-lie');
    this.currentSitLie = null;

    if (this.isSleeping) {
      this.isSleeping = false;
      this.isAwakeHard = false;
      this.showBubble(randPick(this.id === 'yier'
        ? ['呜...被弄醒了哒 (揉眼)', '啊哒？(迷糊)', '一二还没睡够哒... (委屈)']
        : ['...醒了 (推眼镜)', '嗯？什么事哒 (清醒)', '打扰我睡觉哒 (看)']
      ));
    }

    this.setState('idle');

    this.container.classList.add('dragging');
    this.showDragExpression();

    if (this.currentSitLie) {
      this.currentSitLie = null;
      this.container.classList.remove('state-sit', 'state-lie');
    }

    if (Date.now() - this.lastBubbleTime > 1000) {
      const dragDialogues = this.dialogues.filter(d => d.state === 'dragged');
      if (dragDialogues.length > 0) {
        this.showBubble(weightedPick(dragDialogues).text);
        this.lastBubbleTime = Date.now();
      }
    }
  }

  drag(clientX, clientY) {
    if (!this.isDragging) return;

    const newX = clientX - this.dragOffsetX;
    const newY = clientY - this.dragOffsetY;

    // 记录速度（用于甩出计算）
    this.dragVelocities.push({
      x: newX - this.body.x,
      y: newY - this.body.y,
      time: Date.now()
    });

    // 只保留最近 5 个速度记录
    if (this.dragVelocities.length > 5) {
      this.dragVelocities.shift();
    }

    this.body.x = newX;
    this.body.y = newY;
    this.updateDOMPosition();
  }

  endDrag() {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.container.classList.remove('dragging');
    this.hideDragExpression();
    this.highFearEl && this.highFearEl.classList.remove('visible');
    this.idleStartTime = Date.now();
    this.isInactive = false;

    this.setState('idle');
    this.container.classList.remove('state-sit', 'state-lie');
    this.currentSitLie = null;

    let throwVx = 0, throwVy = 0;
    if (this.dragVelocities.length >= 2) {
      const recent = this.dragVelocities.slice(-3);
      throwVx = recent.reduce((s, v) => s + v.x, 0) / recent.length * 0.8;
      throwVy = recent.reduce((s, v) => s + v.y, 0) / recent.length * 0.5;
    }

    this.body.throwWithVelocity(throwVx, throwVy);
    this.body.groundY = screenInfo ? screenInfo.height : window.innerHeight;
    this.body.isJelly = false;

    if (throwVy < -3) {
      setTimeout(() => {
        if (this.body.isGrounded) {
          this.showBubble(randPick(this.id === 'yier'
            ? ['着陆哒！(安全着陆)', '嘿嘿哒~ (得意)', '啊哒！(Q弹)']
            : ['嗯，不错哒 (推眼镜)', '稳稳落地哒 (淡定)', '啊哒 (站直)']
          ));
        }
      }, 500);
    }
  }

  // ---- 自动闲逛 ----
  wander() {
    const now = Date.now();
    if (now < this.nextWanderTime) return;
    if (this.isDragging || !this.body.isGrounded || this.isSleeping) return;
    if (this.body.walkTargetX !== null) return;

    if (Math.random() > 0.15) {
      this.nextWanderTime = now + randInt(15000, 40000);
      return;
    }

    const margin = 80;
    const targetX = randInt(margin, (screenInfo ? screenInfo.width : window.innerWidth) - margin - this.config.width);
    this.body.walkTo(targetX);
    this.nextWanderTime = now + randInt(10000, 30000);
  }

  // ---- 需求气泡（数值低时主动提醒） ----
  checkNeedBubble() {
    if (this.isSleeping) return;
    if (Date.now() - this.lastBubbleTime < 5000) return;

    if (this.hunger <= LIFE_CONFIG.hunger.critical) {
      this.showBubble(randPick(this.id === 'yier'
        ? ['咕噜...啊哒 (º﹃º )', '要吃哒！(৻>﹏<৻)', '肚子在叫哒... (´；ω；`)']
        : ['好饿哒... (无力)', '需要补充能量哒 (虚弱)', '...能给点吃的吗哒 (有气无力)']
      ));
      this.lastBubbleTime = Date.now();

      // 数值极低时闪烁托盘
      if (this.hunger <= 10 || this.mood <= 10) {
        if (window.electronAPI) window.electronAPI.flashTray();
      }
    }

    if (this.mood <= LIFE_CONFIG.mood.critical) {
      this.showBubble(randPick(this.id === 'yier'
        ? ['呜哒.. (T^T)', '一二在画圈圈哒... (委屈)', '不开心哒... (低头)']
        : ['有点难过哒... (叹叹)', '一二在哪哒 (四处看)', '...需要陪伴哒 (安静)']
      ));
      this.lastBubbleTime = Date.now();
    }
  }

  // ---- 主动寻求注意：数值极低时走到屏幕中央拍屏幕 ----
  seekAttention() {
    if (this.isSleeping || this.isDragging) return;
    if (this.hunger > LIFE_CONFIG.hunger.critical && this.mood > LIFE_CONFIG.mood.critical) return;
    if (!this.body.isGrounded) return;
    if (this.body.walkTargetX !== null) return;

    // 只有在状态为 hungry 时才主动走到中央
    if (this.currentState === 'hungry') {
      const centerX = (screenInfo ? screenInfo.width : window.innerWidth) / 2 - this.config.width / 2;
      const distToCenter = Math.abs(this.body.x - centerX);
      if (distToCenter > 50) {
        this.body.walkTo(centerX + this.config.width / 2);
        // 到达中央后拍屏幕
        setTimeout(() => {
          if (Math.abs(this.body.x - centerX) <= 50) {
            this.showBubble(randPick(this.id === 'yier'
              ? ['主人看看我哒！(拍屏幕)', '一二在这里哒！(敲打)', '不要不理我哒... (可怜)']
              : ['主人，一二需要你哒 (拍屏幕)', '提醒一下哒 (敲打)', '该喂食了哒 (认真)']
            ));
            this.emitParticles('spark', this.config.width / 2, this.config.height / 2);
            if (window.electronAPI) window.electronAPI.flashTray();
          }
        }, 3000);
      }
    }
  }

  // ---- 饭点/休息时间提醒 ----
  checkTimeReminder() {
    if (this.isSleeping) return;
    if (Date.now() - this.lastBubbleTime < 30000) return;

    const hour = getCurrentHour();
    const minute = new Date().getMinutes();

    // 只在整点前后5分钟提醒
    if (minute > 5) return;

    // 午饭时间（11-12点）
    if (hour === 11 && this.id === 'yier') {
      this.showBubble(randPick([
        '一二饿了要吃饭哒！(拉手)', '午饭时间哒~ (期待)', '主人也去吃饭哒！(催促)'
      ]), 6000);
      this.lastBubbleTime = Date.now();
    }

    // 晚饭时间（17-18点）
    if (hour === 17 && this.id === 'yier') {
      this.showBubble(randPick([
        '晚饭时间哒！(兴奋)', '主人快去吃饭哒~ (拉手)', '一二也要吃哒！(期待)'
      ]), 6000);
      this.lastBubbleTime = Date.now();
    }

    // 深夜提醒（22-23点）
    if (hour >= 22 && hour <= 23) {
      if (this.id === 'yier') {
        this.showBubble(randPick([
          '主人该睡觉了哒... (揉眼睛)', '一二困了哒... (打哈欠)', '明天再玩哒~ (困)'
        ]), 6000);
      } else {
        this.showBubble(randPick([
          '主人早点休息哒 (推眼镜)', '代码明天再写哒 (收拾)', '该睡觉了哒 (关电脑)'
        ]), 6000);
      }
      this.lastBubbleTime = Date.now();
    }

    // 早上问候（7-9点）
    if (hour >= 7 && hour <= 9 && this.id === 'yier') {
      this.showBubble(randPick([
        '早上好哒~ (伸懒腰)', '新的一天开始哒！(精神)', '主人早安哒~ (微笑)'
      ]), 6000);
      this.lastBubbleTime = Date.now();
    }
  }

  checkWeatherReaction() {
    if (!weatherData || this.isSleeping) return;
    if (Date.now() - this.lastBubbleTime < 60000) return;
    if (Math.random() > 0.08) return;

    const hour = getCurrentHour();
    const petId = this.id;

    if (Math.random() < 0.3) {
      let timeSlot = '';
      if (hour >= 6 && hour < 11) timeSlot = 'morning';
      else if (hour >= 11 && hour < 14) timeSlot = 'noon';
      else if (hour >= 14 && hour < 18) timeSlot = 'afternoon';
      else if (hour >= 18 && hour < 21) timeSlot = 'evening';
      else timeSlot = 'night';

      const comboKey = `${weatherData.type}_${timeSlot}`;
      const combo = WEATHER_TIME_DIALOGUES[comboKey];
      if (combo && combo[petId]) {
        this.showBubble(randPick(combo[petId]), 6000);
        this.lastBubbleTime = Date.now();
        saveDiaryEntry('weather_mood', petId, { weather: weatherData.desc, detail: timeSlot === 'night' ? '安静' : timeSlot === 'morning' ? '清爽' : '慵懒' });
        this._emitWeatherParticles();
        return;
      }
    }

    if (Math.random() < 0.3) {
      let tempKey = '';
      if (weatherData.temp >= 38) tempKey = 'extreme_hot';
      else if (weatherData.temp >= 35) tempKey = 'very_hot';
      else if (weatherData.temp <= 0) tempKey = 'extreme_cold';
      else if (weatherData.temp <= 5) tempKey = 'very_cold';

      if (tempKey) {
        const tempDialogues = TEMP_EXACT_DIALOGUES[tempKey];
        if (tempDialogues && tempDialogues[petId]) {
          this.showBubble(randPick(tempDialogues[petId]), 6000);
          this.lastBubbleTime = Date.now();
          const advice = tempKey.includes('hot') ? '注意防暑' : '注意保暖';
          saveDiaryEntry('temp_alert', petId, { temp: weatherData.temp, detail: advice });
          this._emitWeatherParticles();
          return;
        }
      }
    }

    let reactions = getWeatherCondition(weatherData.type);
    const petReactions = reactions[petId];
    if (!petReactions) return;

    const msg = randPick(petReactions);
    this.showBubble(msg, 6000);
    this.lastBubbleTime = Date.now();
    this._emitWeatherParticles();
  }

  _emitWeatherParticles() {
    if (weatherData.type === 'rain') {
      this.emitParticles('rain', this.config.width / 2, 20);
    } else if (weatherData.type === 'snow') {
      this.emitParticles('star', this.config.width / 2, 20);
    } else if (weatherData.type === 'hot') {
      this.emitParticles('sweat', this.config.width / 2, 20);
    }
  }

  _checkFirstOfDay() {
    const today = todayKey();
    if (!this._dailyFlags) this._dailyFlags = {};
    if (this._dailyFlags._day !== today) this._dailyFlags = { _day: today };
    if (!this._dailyFlags.first_of_day) {
      this._dailyFlags.first_of_day = true;
      saveDiaryEntry('first_of_day', this.id);
    }
  }

  checkLateNightCare() {
    if (this.isSleeping) return;
    const hour = getCurrentHour();
    if (hour < 22 || hour > 1) return;
    if (Date.now() - this.lastBubbleTime < 300000) return;
    if (Date.now() - (this._lastLateNightCare || 0) < 600000) return;
    if (Math.random() > 0.3) return;
    this._lastLateNightCare = Date.now();
    const dialogues = LATE_NIGHT_DIALOGUES[this.id];
    if (dialogues) {
      this.showBubble(randPick(dialogues), 6000);
      this.lastBubbleTime = Date.now();
    }
    saveDiaryEntry('late_night', this.id);
  }

  checkIdleTooLong() {
    if (this.isSleeping) return;
    const idleMs = Date.now() - lastGlobalInteractionTime;
    if (idleMs < 600000) return;
    if (Date.now() - this.lastBubbleTime < 300000) return;
    if (Date.now() - (this._lastIdleTooLong || 0) < 600000) return;
    if (Math.random() > 0.4) return;
    this._lastIdleTooLong = Date.now();
    const dialogues = LONG_IDLE_DIALOGUES[this.id];
    if (dialogues) {
      this.showBubble(randPick(dialogues), 6000);
      this.lastBubbleTime = Date.now();
    }
    saveDiaryEntry('long_idle', this.id);
  }

  checkHealthReminder() {
    if (this.isSleeping) return;
    if (Date.now() - this.lastBubbleTime < 300000) return;
    if (Date.now() - (this._lastHealthReminder || 0) < 2700000) return;
    if (Math.random() > 0.5) return;
    this._lastHealthReminder = Date.now();
    const dialogues = HEALTH_REMINDER_DIALOGUES[this.id];
    if (dialogues) {
      this.showBubble(randPick(dialogues), 6000);
      this.lastBubbleTime = Date.now();
    }
    saveDiaryEntry('comfort', this.id, { detail: randPick(['该喝水啦', '休息一下眼睛', '站起来活动活动']) });
  }

  // ---- 眨眼循环 ----
  startBlinkLoop() {
    const doBlink = () => {
      if (!this.sprite) { setTimeout(doBlink, 5000); return; }
      if (this.isSleeping || this.currentState === 'dream') {
        setTimeout(doBlink, randInt(8000, 15000));
        return;
      }
      if (!this.isDragging && this.useImage) {
        this.sprite.classList.add('blink-anim');
        setTimeout(() => {
          this.sprite.classList.remove('blink-anim');
        }, 200);
      }
      setTimeout(doBlink, randInt(3000, 8000));
    };
    setTimeout(doBlink, randInt(2000, 5000));
  }

  // ---- 眼球跟随鼠标 ----
  updateEyeTracking() {
    if (!this.eyeLayer || this.isSleeping || this.currentState === 'dream') {
      if (this.eyeLayer) this.eyeLayer.style.opacity = '0';
      return;
    }
    if (this.useImage && this.imageEl && this.imageEl.style.display !== 'none') {
      this.eyeLayer.style.opacity = '0';
      return;
    }
    this.eyeLayer.style.opacity = '1';

    const petCenterX = this.body.x + this.body.width / 2;
    const petCenterY = this.body.y + this.body.height * 0.35;
    const dx = mouseX - petCenterX;
    const dy = mouseY - petCenterY;
    const maxOffset = 3;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const offsetX = (dx / dist) * maxOffset;
    const offsetY = (dy / dist) * maxOffset;

    const eyes = this.eyeLayer.querySelectorAll('.eye');
    eyes.forEach(eye => {
      eye.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    });
  }

  // ---- 身体朝向（面向鼠标或移动方向） ----
  updateFaceDirection() {
    if (!this.container || this.isDragging) return;

    let dir = this.lastFaceDirection;

    if (this.body.walkTargetX !== null) {
      dir = this.body.walkTargetX > this.body.anchorX ? 1 : -1;
    } else if (!this.isSleeping) {
      const dist = mouseX - this.body.anchorX;
      if (Math.abs(dist) > 60) {
        dir = dist > 0 ? 1 : -1;
      }
    }

    if (dir !== this.lastFaceDirection) {
      this.lastFaceDirection = dir;
      if (dir === -1) {
        this.container.classList.add('face-left');
      } else {
        this.container.classList.remove('face-left');
      }
    }
  }

  // ---- 坐下/趴下行为 ----
  updateSitLie() {
    if (this.isDragging || this.isSleeping || !this.body.isGrounded) {
      if (this.currentSitLie) {
        this.currentSitLie = null;
        this.container.classList.remove('state-sit', 'state-lie');
      }
      return;
    }

    const idleDuration = this.currentState === 'idle' ? (Date.now() - this.idleStartTime) : 0;

    if (idleDuration > this.lieThreshold && this.currentSitLie !== 'lie') {
      this.currentSitLie = 'lie';
      this.container.classList.remove('state-sit');
      this.container.classList.add('state-lie');
      if (Math.random() > 0.5) {
        this.showBubble(randPick(this.id === 'yier'
          ? ['趴着好舒服哒~ (眯眼)', '一二趴下了哒~ (蹭地板)', '不想动哒... (懒)']
          : ['休息一下哒 (趴下)', '有点累哒... (闭眼)', '地上凉快哒 (躺)']
        ));
      }
    } else if (idleDuration > this.sitThreshold && !this.currentSitLie) {
      this.currentSitLie = 'sit';
      this.container.classList.add('state-sit');
      if (Math.random() > 0.6) {
        this.showBubble(randPick(this.id === 'yier'
          ? ['一二坐下了哒~ (乖巧)', '休息一下哒 (坐着)', '坐着发呆哒~ (歪头)']
          : ['坐下歇会儿哒 (安静)', '嗯，休息一下哒 (推眼镜)', '坐一会儿哒 (放松)']
        ));
      }
    }

    if (this.currentState !== 'idle' && this.currentSitLie) {
      this.currentSitLie = null;
      this.container.classList.remove('state-sit', 'state-lie');
      this.idleStartTime = Date.now();
      this.sitThreshold = randInt(20000, 40000);
      this.lieThreshold = randInt(60000, 120000);
    }
  }

  // ---- 情绪表情系统 ----
  startEmotionLoop() {
    const update = () => {
      if (!this.emotionEl) { setTimeout(update, 2000); return; }
      this.updateEmotion();
      setTimeout(update, 2000);
    };
    setTimeout(update, 3000);
  }

  updateEmotion() {
    if (!this.emotionEl) return;
    if (this.isSleeping || this.currentState === 'dream') {
      this.emotionEl.classList.remove('visible');
      return;
    }

    const avg = (this.hunger + this.mood + this.energy) / 3;
    let emoji = null;

    if (this.hunger <= LIFE_CONFIG.hunger.critical) {
      emoji = '🍖';
    } else if (this.mood <= LIFE_CONFIG.mood.critical) {
      emoji = '😢';
    } else if (this.energy <= LIFE_CONFIG.energy.critical) {
      emoji = '💤';
    } else if (this.hunger <= LIFE_CONFIG.hunger.low) {
      emoji = '😋';
    } else if (this.mood <= LIFE_CONFIG.mood.low) {
      emoji = '😔';
    } else if (this.energy <= LIFE_CONFIG.energy.low) {
      emoji = '🥱';
    } else if (avg >= 80) {
      emoji = '😊';
    }

    if (emoji !== this.lastEmotion) {
      this.lastEmotion = emoji;
      if (emoji) {
        this.emotionEl.textContent = emoji;
        this.emotionEl.classList.add('visible');
      } else {
        this.emotionEl.classList.remove('visible');
      }
    }
  }

  // ---- 拖拽反馈增强 ----
  showDragExpression() {
    if (!this.dragExprEl) return;
    this.dragExprEl.textContent = randPick(['😳', '😨', '😮', '😲']);
    this.dragExprEl.classList.add('visible');
  }

  hideDragExpression() {
    if (!this.dragExprEl) return;
    this.dragExprEl.classList.remove('visible');
  }

  // ---- 高处恐惧检测 ----
  checkHighFear() {
    if (!this.highFearEl || !screenInfo) return;
    if (this.isDragging) {
      const threshold = screenInfo.height * 0.3;
      if (this.body.y < threshold) {
        this.highFearEl.textContent = '😰';
        this.highFearEl.classList.add('visible');
      } else {
        this.highFearEl.classList.remove('visible');
      }
    } else {
      this.highFearEl.classList.remove('visible');
    }
  }

  // ---- 落地眩晕效果 ----
  showStunEffect() {
    if (!this.container) return;
    const old = this.container.querySelector('.stun-overlay');
    if (old) old.remove();
    const stun = document.createElement('div');
    stun.className = 'stun-overlay';
    stun.textContent = '🌀';
    this.container.appendChild(stun);
    this.showBubble(randPick(this.id === 'yier'
      ? ['好晕哒~ (😵)', '晃晃悠悠哒... (头晕)', '着陆好猛哒！(抖抖)']
      : ['...有点晃哒 (扶额)', '着陆冲击哒 (淡定)', '嗯，没事哒 (站稳)']
    ));
    setTimeout(() => { if (stun.parentNode) stun.remove(); }, 1000);
  }

  // ---- 鼠标速度感知 ----
  updateScareReaction() {
    if (this.isDragging || this.isSleeping) return;
    const speed = Math.sqrt(globalMouseVx * globalMouseVx + globalMouseVy * globalMouseVy);
    if (speed > 50) {
      const dist = distance(mouseX, mouseY, this.body.anchorX, this.body.footY - this.body.height / 2);
      if (dist < 200 && Date.now() - this.lastBubbleTime > 5000) {
        const old = this.container.querySelector('.scare-effect');
        if (!old) {
          const scare = document.createElement('div');
          scare.className = 'scare-effect';
          scare.textContent = '❗';
          this.container.appendChild(scare);
          this.showBubble(randPick(this.id === 'yier'
            ? ['啊哒！吓到了！(抖)', '好快哒... (缩)', '一二害怕哒... (躲)']
            : ['... (警觉)', '注意安全哒 (看)', '速度太快了哒 (严肃)']
          ));
          this.lastBubbleTime = Date.now();
          setTimeout(() => { if (scare.parentNode) scare.remove(); }, 800);
        }
      }
    }
  }

  // ---- 长时间未操作 ----
  checkInactive() {
    if (!this.body.isGrounded || this.isDragging || this.isSleeping) return;
    const elapsed = Date.now() - this.lastMouseMoveTime;
    if (elapsed > 1800000 && !this.isInactive) {
      this.isInactive = true;
      this.setState('sleep');
      this.showBubble(randPick(this.id === 'yier'
        ? ['主人不在...一二困了哒 (趴下)', '没有人陪一二玩... (打哈欠)', '一二先睡一会儿哒~ (闭眼)']
        : ['主人似乎不在 (看四周)', '先休息一下哒 (趴下)', '等主人回来哒 (安静)']
      ), 5000);
    }
  }

  // ---- 自发靠近伴侣 ----
  spontaneousApproach() {
    if (!this.partner || this.isDragging || this.isSleeping || !this.body.isGrounded) return;
    if (this.body.walkTargetX !== null) return;
    if (this.currentState !== 'idle') return;

    const dist = distance(this.body.anchorX, this.body.footY, this.partner.body.anchorX, this.partner.body.footY);

    if (dist < 150 && Math.random() < 0.003) {
      this.showBubble(randPick(this.id === 'yier'
        ? ['啊哒哒~ (看布布)', '嘿嘿你在哒~ (开心)', '布布哒！(招手)', '你在干嘛哒？(凑近)',
           '一二看到你了哒 (眨眼)', '陪你一会儿哒~ (安静)', '嘿嘿哒~ (傻笑)', '一起待着哒 (蹭蹭)',
           '布布布布哒！(蹦跳)', '想跟你说话哒~ (靠过来)']
        : ['嗯？怎么了哒 (看一二)', '在这哒 (微笑)', '嗯嗯，我在哒 (点头)', '一直都在哒 (安静)',
           '一二今天很精神哒 (看)', '看你一眼哒 (微笑)', '怎么了？(关心)', '嗯，没走开哒 (温柔)']
      ));
      this.lastBubbleTime = Date.now();
    }

    if (dist > 200 && dist < 400 && Math.random() < 0.0008) {
      this.body.walkTo(this.partner.body.anchorX + randInt(-50, 50));
      this.showBubble(randPick(this.id === 'yier'
        ? ['想去找布布哒~ (走)', '布布在哪哒？(张望)', '一二想布布了哒 (走过去)']
        : ['去看看一二哒 (走)', '一二在哪哒... (找)', '想陪陪一二哒 (走去)']
      ));
    }

    if (dist > 400 && Math.random() < 0.003) {
      this.body.walkTo(this.partner.body.anchorX + randInt(-60, 60));
      this.showBubble(randPick(this.id === 'yier'
        ? ['布布你在哪里哒！(大喊)', '一二好想你哒... (走过去)', '别走太远嘛哒 (急忙)', '等我一下哒！(跑过去)',
           '布布！等等一二哒！(挥手)', '一二来找你了哒！(蹦跳着走)']
        : ['一二在那边哒 (走去)', '过去看看一二哒 (走)', '一二等我一下哒 (加快脚步)',
           '太远了，过去陪她哒 (走去)', '一二在叫我哒 (转头走过去)', '不能让她一个人哒 (走)']
      ));
      this.lastBubbleTime = Date.now();
    }
  }

  // ---- 一二饿/困/无聊时找布布 ----
  seekPartnerWhenNeedy() {
    if (this.id !== 'yier') return;
    if (!this.partner || this.isDragging || this.isSleeping || !this.body.isGrounded) return;
    if (this.body.walkTargetX !== null) return;
    if (this.currentState !== 'idle' && this.currentState !== 'hungry') return;

    const dist = distance(this.body.anchorX, this.body.footY, this.partner.body.anchorX, this.partner.body.footY);
    if (dist < 120) return;
    if (Date.now() - (this._lastSeekPartnerTime || 0) < 90000) return;

    let shouldSeek = false;
    let reason = '';

    if (this.hunger <= LIFE_CONFIG.hunger.low && Math.random() < 0.002) {
      shouldSeek = true;
      reason = 'hungry';
    } else if (this.energy <= LIFE_CONFIG.energy.low && Math.random() < 0.002) {
      shouldSeek = true;
      reason = 'sleepy';
    } else if (this.mood <= LIFE_CONFIG.mood.low && Math.random() < 0.003) {
      shouldSeek = true;
      reason = 'bored';
    }

    if (!shouldSeek) return;

    this._lastSeekPartnerTime = Date.now();
    this.body.walkTo(this.partner.body.anchorX + randInt(-40, 40));

    const dialogues = {
      hungry: ['一二饿了...找布布哒 (走过去)', '布布~一二肚子饿哒 (委屈)', '要布布喂一二哒~ (撒娇)'],
      sleepy: ['一二困了...要找布布 (揉眼)', '布布~一二想睡觉哒 (打哈欠)', '好困哒...布布在哪哒 (迷糊)'],
      bored: ['一二好无聊哒...找布布 (走)', '布布~陪我玩哒 (走过去)', '想跟布布在一起哒~ (撒娇)']
    };

    this.showBubble(randPick(dialogues[reason]));
  }

  // ---- 哈欠传染 ----
  triggerYawnContagion() {
    if (!this.partner || this.currentState !== 'yawn') return;
    if (Math.random() > 0.3) return;

    setTimeout(() => {
      if (this.partner && this.partner.currentState === 'idle' && !this.partner.isSleeping) {
        this.partner.setState('yawn');
      }
    }, randInt(500, 2000));
  }

  // ---- 争宠反应 ----
  checkJealousy() {
    if (!this.partner || this.isSleeping || this.isDragging) return;
    if (this.currentState !== 'idle') return;
    if (this.partner.isBeingPetted && Math.random() < 0.005) {
      this.body.walkTo(this.partner.body.anchorX);
      setTimeout(() => {
        if (distance(this.body.anchorX, this.body.footY, this.partner.body.anchorX, this.partner.body.footY) < 150) {
          this.showBubble(randPick(this.id === 'yier'
            ? ['我也要哒！(伸手)', '一二也要摸摸哒！(蹭)', '不要只摸布布哒... (委屈)']
            : ['... (走过来)', '我也想摸摸哒 (靠过来)', '一起摸吧哒 (安静)']
          ));
          this.emitParticles('heart', this.config.width / 2, 20);
        }
      }, 2000);
    }
  }

  // ---- 好奇探索边缘 ----
  exploreEdge() {
    if (this.isDragging || this.isSleeping || !this.body.isGrounded) return;
    if (this.body.walkTargetX !== null) return;
    if (this.currentState !== 'idle') return;
    if (Math.random() > 0.0002) return;

    const sw = screenInfo ? screenInfo.width : window.innerWidth;
    const targetX = Math.random() > 0.5 ? 20 : sw - this.config.width - 20;
    this.body.walkTo(targetX);
    setTimeout(() => {
      if (this.body.isGrounded && Math.abs(this.body.x - targetX) < 30) {
        this.showBubble(randPick(this.id === 'yier'
          ? ['外面有什么哒？(探头)', '一二看到了什么哒！(好奇)', '好想到外面去哒~ (扒拉)']
          : ['看看外面哒 (探头)', '嗯...没什么哒 (收回)', '外面的世界哒 (安静)']
        ));
      }
    }, 3000);
  }

  // ---- 爱抚升级：不同部位反应 ----
  petAtLocation(clientX, clientY) {
    const relY = (clientY - this.body.y) / this.body.height;
    const relX = (clientX - this.body.x) / this.body.width;

    if (relY < 0.3) {
      this.showBubble(randPick(this.id === 'yier'
        ? ['摸头好舒服哒~ (眯眼)', '嘿嘿哒~ (蹭蹭)', '一二喜欢摸头哒！(开心)']
        : ['...嗯 (安静)', '够了哒 (推眼镜)', '有点痒哒 (躲)']
      ));
      this.mood = clamp(this.mood + 8, 0, LIFE_CONFIG.mood.max);
    } else if (relY > 0.6) {
      this.showBubble(randPick(this.id === 'yier'
        ? ['啊哒！怕痒！(缩脚)', '脚脚不能摸哒！(躲)', '哈哈哈好痒哒！(扭)']
        : ['脚不要摸哒 (缩)', '... (闪躲)', '有点痒哒 (忍住)']
      ));
      if (!this.body.isDragging) {
        this.body.vx += (relX > 0.5 ? -3 : 3);
      }
    } else {
      this.showBubble(randPick(this.id === 'yier'
        ? ['摸肚子哒~ (害羞)', '一二害羞了哒 (脸红)', '嗯~ (安静享受)']
        : ['... (微微脸红)', '嗯嗯哒 (安静)', '够了哒 (轻推)']
      ));
      this.mood = clamp(this.mood + 5, 0, LIFE_CONFIG.mood.max);
    }
    this.affection++;
    this.emitParticles('heart', clientX - this.body.x, clientY - this.body.y - 20);
  }

  // ---- 挠痒痒检测 ----
  checkTickle(clientX, clientY) {
    if (this.isDragging || this.isSleeping) return;
    const now = Date.now();
    if (!this._ticklePoints) this._ticklePoints = [];
    this._ticklePoints.push({ x: clientX, y: clientY, t: now });
    this._ticklePoints = this._ticklePoints.filter(p => now - p.t < 800);

    if (this._ticklePoints.length >= 4) {
      let dirChanges = 0;
      for (let i = 2; i < this._ticklePoints.length; i++) {
        const dx1 = this._ticklePoints[i - 1].x - this._ticklePoints[i - 2].x;
        const dx2 = this._ticklePoints[i].x - this._ticklePoints[i - 1].x;
        if ((dx1 > 0 && dx2 < 0) || (dx1 < 0 && dx2 > 0)) dirChanges++;
      }
      if (dirChanges >= 2) {
        this._ticklePoints = [];
        this.showBubble(randPick(this.id === 'yier'
          ? ['哈哈哈哈不要挠了哒！(扭)', '好痒好痒哒！😆', '一二投降哒！(缩成一团)']
          : ['...哈哈哈 (忍不住)', '别挠了哒 (闪躲)', '严肃一点哒 (忍笑)']
        ));
        this.mood = clamp(this.mood + 12, 0, LIFE_CONFIG.mood.max);
        this.emitParticles('star', this.config.width / 2, this.config.height / 2);
      }
    }
  }

  // ---- 主更新循环（每帧调用） ----
  update(deltaTime) {
    // 更新物理
    this.body.update();

    // 处理Q弹效果
    if (this.body.isJelly) {
      this.body.isJelly = false;
      this.sprite.style.animation = 'none';
      this.sprite.offsetHeight;
      this.sprite.style.animation = '';
      this.container.classList.add('jelly');
      setTimeout(() => {
        this.container.classList.remove('jelly');
      }, PHYSICS_CONFIG.jellyDuration);

      const impactSpeed = Math.abs(this.body.vy);
      if (impactSpeed > 8) {
        this.showStunEffect();
      }
    }

    // 更新生命值
    this.updateLife(deltaTime);

    // 更新状态机
    this.updateState(deltaTime);

    // 微动作系统
    this.updateEyeTracking();
    this.updateFaceDirection();
    this.updateSitLie();
    this.checkHighFear();
    this.updateScareReaction();

    // 自动闲逛
    this.wander();

    // 好奇探索边缘
    this.exploreEdge();

    // 自发靠近伴侣
    this.spontaneousApproach();

    // 一二饿/困/无聊时找布布
    this.seekPartnerWhenNeedy();

    // 哈欠传染
    this.triggerYawnContagion();

    // 争宠反应
    this.checkJealousy();

    // 主动寻求注意
    this.seekAttention();

    // 饭点/休息时间提醒
    this.checkTimeReminder();

    // 需求气泡
    this.checkNeedBubble();

    // 天气反应
    this.checkWeatherReaction();

    // 随机气泡
    this.triggerRandomBubble();

    // 长时间未操作
    this.checkInactive();

    // 第四批：一日作息系统
    this.checkDailyRoutine();

    this.checkLateNightCare();
    this.checkIdleTooLong();
    this.checkHealthReminder();

    // 第四批：角色个性化行为
    this.checkPersonalityBehavior();

    // 同步 DOM 位置
    this.updateDOMPosition();
  }

  // 重置宠物状态
  reset() {
    this.hunger = 80;
    this.mood = 70;
    this.energy = 90;
    this.isSleeping = false;
    this.isAwakeHard = false;
    this.feedCount = 0;
    this.playCount = 0;
    this.petCount = 0;
    this.bugCount = 0;
    this.setState('idle');
    this.showBubble('重置哒！✧(≖ ◡ ≖✿)', 3000);
  }

  // =====================================================================
  // 第四批 A: 一日作息系统
  // =====================================================================

  checkDailyRoutine() {
    if (this.isDragging || this.isSleeping) return;
    if (Date.now() - this.lastBubbleTime < 20000) return;

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const decHour = getCurrentDecimalHour();
    const today = todayKey();

    if (!this._dailyFlags) this._dailyFlags = {};
    if (this._dailyFlags._day !== today) this._dailyFlags = { _day: today };

    if (isInTimeRange(DAILY_SCHEDULE.morningGreet.start, DAILY_SCHEDULE.morningGreet.end) && !this._dailyFlags.morningGreet) {
      this._dailyFlags.morningGreet = true;
      this.showBubble(randPick(this.id === 'yier'
        ? ['早安哒~ ☀️ (伸懒腰)', '新的一天开始哒！(精神)', '主人早安哒~ (微笑)', '一二醒啦~ (揉眼睛)']
        : ['早安哒 (推眼镜)', '今天也要加油哒 (握拳)', '早上好哒 (伸懒腰)', '喝杯咖啡清醒一下哒 ☕']
      ), 5000);
      this.emitParticles('star', this.config.width / 2, 20);
      this.lastBubbleTime = Date.now();
      saveDiaryEntry('wakeup', this.id);
      return;
    }

    const mealTimes = [
      { key: 'breakfast', config: MEAL_CONFIG.breakfast },
      { key: 'lunch', config: MEAL_CONFIG.lunch },
      { key: 'dinner', config: MEAL_CONFIG.dinner }
    ];

    for (const meal of mealTimes) {
      const [start, end] = meal.config.hourRange;
      if (isInTimeRange(start, end) && !this._dailyFlags[meal.key]) {
        this._dailyFlags[meal.key] = true;
        this.hunger = clamp(this.hunger + 30, 0, LIFE_CONFIG.hunger.max);
        this.setState('eat');
        this.showBubble(randPick(this.id === 'yier'
          ? meal.config.yierDialogues
          : meal.config.bubuDialogues
        ), 5000);

        const foodEmojis = meal.config.emoji;
        for (let i = 0; i < 4; i++) {
          setTimeout(() => {
            this.emitParticles('eat', this.config.width / 2, this.config.height / 3);
          }, i * 600);
        }

        const mealFx = document.createElement('div');
        mealFx.className = 'interaction-fx';
        mealFx.innerHTML = `<span class="fx-emoji">${randPick(foodEmojis)}</span>`;
        mealFx.style.left = '50%';
        mealFx.style.top = '-40px';
        mealFx.style.transform = 'translateX(-50%)';
        if (this.container) this.container.appendChild(mealFx);
        setTimeout(() => { if (mealFx.parentNode) mealFx.remove(); }, 2500);

        saveDiaryEntry('feed', this.id, { food: meal.key });
        this.lastBubbleTime = Date.now();
        return;
      }
    }

    if (isInTimeRange(DAILY_SCHEDULE.afternoonNap.start, DAILY_SCHEDULE.afternoonNap.end)
        && !this._dailyFlags.afternoonNap
        && this.currentState === 'idle'
        && Math.random() < 0.001) {
      this._dailyFlags.afternoonNap = true;
      this.setState('sleep');
      this.showBubble(randPick(this.id === 'yier'
        ? ['打个盹哒~ 😴 (趴下)', '一二困了午睡一下哒 (闭眼)', '呼...午安哒 (秒睡)']
        : ['午休一下哒 (趴键盘)', '眯一会儿哒 (闭眼)', '下午再继续哒 (zzZ)']
      ), 4000);
      saveDiaryEntry('sleep', this.id);
      this.lastBubbleTime = Date.now();
      return;
    }

    if (isInTimeRange(DAILY_SCHEDULE.washUp.start, DAILY_SCHEDULE.washUp.end)
        && !this._dailyFlags.washUp
        && this.currentState === 'idle'
        && Math.random() < 0.002) {
      this._dailyFlags.washUp = true;
      this.setState('bath');
      this.showBubble(randPick(this.id === 'yier'
        ? ['洗香香准备睡啦~ 🛁 (洗脸)', '一二刷牙哒~ 🪥 (刷刷)', '洗完澡好舒服哒 (擦干)', '洗洗准备睡觉哒 (打哈欠)']
        : ['洗把脸清醒哒 (洗脸)', '整理一下仪容哒 (照镜子)', '洗完澡舒服哒 (擦头发)', '该休息了哒 (收拾)']
      ), 4000);
      this.lastBubbleTime = Date.now();
      return;
    }

    if (hour >= DAILY_SCHEDULE.bedTime.start || hour < DAILY_SCHEDULE.bedTime.end) {
      if (!this._dailyFlags.bedTime && this.currentState !== 'sleep') {
        this._dailyFlags.bedTime = true;
        this.setState('sleep');
        this.showBubble(randPick(this.id === 'yier'
          ? ['晚安哒~ 🌙 (闭眼)', '一二困了哒...zzZ', '主人也早点睡哒 (关心)', '做个好梦哒~ (微笑)']
          : ['晚安哒 (推眼镜放在桌上)', '该休息了哒 (关电脑)', '明天继续加油哒 (闭眼)', '晚安一二哒 (帮盖被子)']
        ), 5000);
        saveDiaryEntry('sleep', this.id);
        this.lastBubbleTime = Date.now();
        return;
      }
    }

    if (this.currentState === 'idle'
        && isInTimeRange(DAILY_SCHEDULE.shortNap.start, DAILY_SCHEDULE.shortNap.end)
        && hour >= 10 && hour < 17
        && Date.now() - this.idleStartTime > 60000
        && Math.random() < 0.0005) {
      this.setState('sleep');
      this.showBubble(randPick(this.id === 'yier'
        ? ['一二眯一会儿哒... (趴下)', '好困哒打个盹 (闭眼)', '休息一下哒~ (zzZ)']
        : ['休息一下哒 (趴下)', '有点累了哒 (闭眼)', '小憩一会儿哒 (安静)']
      ), 3000);
      this.lastBubbleTime = Date.now();
    }
  }

  // =====================================================================
  // 第四批 A: 看电视行为
  // =====================================================================

  checkTVBehavior() {
    if (this.isDragging || this.isSleeping) return;
    if (this.currentState !== 'idle') return;
    if (!this.body.isGrounded) return;
    if (Date.now() - this.idleStartTime < 30000) return;
    if (Date.now() - this._lastTVCheck < 120000) return;

    const hour = getCurrentHour();
    if (hour < 8 || hour >= 22) return;

    const weight = PERSONALITY_WEIGHTS[this.id]?.watch_tv || 3;
    const tvChance = weight * 0.0005;

    if (Math.random() < tvChance) {
      this._lastTVCheck = Date.now();
      this.setState('watch_tv');
    }
  }

  startTVBehavior() {
    if (!this.container) return;

    const show = randPick(TV_SHOWS);
    this._currentShow = show;
    this._tvStartTime = Date.now();

    this.showTVEffect(show.emoji);
    saveDiaryEntry('watch_tv', this.id);

    const tvDuration = randInt(show.duration[0], show.duration[1]) * 1000;
    this._tvTimer = setTimeout(() => {
      if (this._tvTimer === null) return;
      this._tvTimer = null;
      this._tvStartTime = null;
      this._currentShow = null;
      this.setState('idle');
    }, tvDuration);
  }

  stopTVBehavior() {
    if (this._tvTimer) {
      clearTimeout(this._tvTimer);
      this._tvTimer = null;
    }
    this._tvStartTime = null;
    this._currentShow = null;
    if (this.container) {
      const oldTv = this.container.querySelector('.tv-effect-layer');
      if (oldTv) oldTv.remove();
    }
  }

  showTVEffect(showEmoji) {
    if (!this.container) return;

    const oldTv = this.container.querySelector('.tv-effect-layer');
    if (oldTv) oldTv.remove();

    const tvLayer = document.createElement('div');
    tvLayer.className = 'tv-effect-layer';
    tvLayer.style.cssText = 'position:absolute;top:-45px;left:50%;transform:translateX(-50%);pointer-events:none;z-index:240;font-size:16px;display:flex;gap:4px;align-items:center;';

    const tvScreen = document.createElement('span');
    tvScreen.textContent = '📺';
    tvScreen.style.fontSize = '22px';
    tvScreen.style.animation = 'float-up 3s ease-out infinite';
    tvLayer.appendChild(tvScreen);

    const showTag = document.createElement('span');
    showTag.textContent = showEmoji;
    showTag.style.fontSize = '18px';
    showTag.style.animation = 'float-up 4s ease-out infinite';
    showTag.style.animationDelay = '0.5s';
    tvLayer.appendChild(showTag);

    this.container.appendChild(tvLayer);
  }

  startRun(direction) {
    if (!this.body) return;
    this._runDirection = direction;
    this.body.vx = this.body.walkSpeed * 2.5 * direction;
    this._runTimer = setInterval(() => {
      if (this.currentState !== 'run_right' && this.currentState !== 'run_left') return;
      if (this.isDragging || !this.body.isGrounded) return;
      this.body.vx = this.body.walkSpeed * 2.5 * this._runDirection;
      const sw = screenInfo ? screenInfo.width : window.innerWidth;
      if (this.body.anchorX < 30 || this.body.anchorX > sw - 30) {
        this.setState('idle');
      }
    }, 100);
  }

  stopRun() {
    if (this._runTimer) {
      clearInterval(this._runTimer);
      this._runTimer = null;
    }
    this._runDirection = null;
    if (this.body) {
      this.body.vx *= 0.3;
    }
  }

  startJump() {
    if (!this.body || !this.body.isGrounded) return;
    this.body.vy = -9;
    this.body.isGrounded = false;
    this.body.isFalling = true;
  }

  // =====================================================================
  // 第四批 B: 角色个性化行为
  // =====================================================================

  checkPersonalityBehavior() {
    if (this.isDragging || this.isSleeping) return;
    if (Date.now() - this._lastPersonalityCheck < 30000) return;
    this._lastPersonalityCheck = Date.now();

    const hour = getCurrentHour();
    if (hour < 7 || hour >= 23) return;

    if (this.id === 'yier') {
      this.checkYierPersonality();
    } else {
      this.checkBubuPersonality();
    }
  }

  checkYierPersonality() {
    if (this.currentState !== 'idle') return;
    if (!this.body.isGrounded) return;
    if (Date.now() - this.idleStartTime < 15000) return;

    const isAlone = !this.partner || distance(this.body.anchorX, this.body.footY, this.partner.body.anchorX, this.partner.body.footY) > 250;

    if (isAlone && Math.random() < 0.02) {
      this.showBubble(randPick(YIER_DAILY_TALKS), 4000);
      this.lastBubbleTime = Date.now();
      return;
    }

    if (isAlone && Math.random() < 0.015) {
      this.setState('eat');
      this.showBubble(randPick([
        '吃零食哒~ 🍿 (掏出来)', '巧克力好好吃哒 🍫 (幸福)',
        '再来一块蛋糕哒 🧁 (满足)', '爆米花好香哒 🍿 (嘎嘣脆)',
        '棒棒糖好甜哒 🍭 (舔舔)', '薯片薯片哒！🥔 (开心)'
      ]), 4000);
      this.emitParticles('eat', this.config.width / 2, this.config.height / 3);
      this.hunger = clamp(this.hunger + 15, 0, LIFE_CONFIG.hunger.max);
      this.mood = clamp(this.mood + 8, 0, LIFE_CONFIG.mood.max);
      saveDiaryEntry('feed', this.id, { food: '零食' });
      this.lastBubbleTime = Date.now();
      return;
    }

    this.checkTVBehavior();
  }

  checkBubuPersonality() {
    const hour = getCurrentHour();
    const isDayTime = hour >= 8 && hour < 22;
    const isAlone = !this.partner || distance(this.body.anchorX, this.body.footY, this.partner.body.anchorX, this.partner.body.footY) > 250;

    if (!isAlone) return;
    if (!isDayTime) return;
    if (!this.body.isGrounded) return;

    if (this.currentState === 'coding' && Math.random() < 0.05) {
      this.showBubble(randPick(BUBU_CODING_TALKS), 4000);
      this.lastBubbleTime = Date.now();

      if (Math.random() < 0.3) {
        this.showCodingEmoji();
      }
      return;
    }

    if (this.currentState === 'coding' && Math.random() < 0.01) {
      this.setState('debug');
      this.showBubble(randPick([
        '这个Bug真烦哒！🐛 (抓头)', '又是null pointer哒 (叹气)',
        '找到了Bug哒！🐛 (兴奋)', '调试半天终于复现了哒 (疲惫)'
      ]), 4000);
      this.emitParticles('bug', this.config.width / 2, 30);
      this.lastBubbleTime = Date.now();
      return;
    }

    if (this.currentState === 'idle' && isDayTime && Math.random() < 0.04) {
      if (this.energy < 40) {
        this.setState('coffee');
        this.showBubble(randPick([
          '喝杯咖啡续命哒 ☕ (抿)', '需要咖啡因哒 (倒)',
          '再来一杯哒 (续杯)', '咖啡是最好的朋友哒 ☕ (满足)'
        ]), 4000);
        this.energy = clamp(this.energy + 20, 0, LIFE_CONFIG.energy.max);
      } else {
        this.setState('coding');
        this.showBubble(randPick([
          '继续写代码哒 (开工)', '新需求来了哒 (看文档)',
          '今天效率不错哒 (敲键盘)', '加油干哒 (推眼镜)'
        ]), 4000);
      }
      this.lastBubbleTime = Date.now();
      return;
    }

    if (this.currentState === 'idle' && Math.random() < 0.02) {
      this.setState('read');
      this.showBubble(randPick([
        '看看技术文档哒 📚 (翻页)', '这文章不错哒 (记录)',
        '学习新知识哒 (专注)', '嗯有道理哒 (点头)'
      ]), 4000);
      this.lastBubbleTime = Date.now();
      return;
    }

    if (this.currentState === 'idle' && isDayTime) {
      this.checkTVBehavior();
    }
  }

  showCodingEmoji() {
    if (!this.container) return;
    const emojis = ['💻', '⌨️', '🧑‍💻', '🖥️', '📝', '🔧'];
    const emoji = document.createElement('div');
    emoji.className = 'coding-emoji-float';
    emoji.textContent = randPick(emojis);
    emoji.style.cssText = `position:absolute;top:-35px;left:${20 + Math.random() * 60}%;font-size:18px;pointer-events:none;z-index:240;animation:float-up 2.5s ease-out forwards;`;
    this.container.appendChild(emoji);
    setTimeout(() => { if (emoji.parentNode) emoji.remove(); }, 2600);
  }

  saveState() {
    try {
      const data = {
        hunger: this.hunger,
        mood: this.mood,
        energy: this.energy,
        currentState: this.currentState,
        isSleeping: this.isSleeping,
        feedCount: this.feedCount,
        playCount: this.playCount,
        petCount: this.petCount,
        bugCount: this.bugCount,
        x: this.body.x,
        affection: this.affection,
        timestamp: Date.now()
      };
      localStorage.setItem(`pet_state_${this.id}`, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }

  restoreState() {
    try {
      const raw = localStorage.getItem(`pet_state_${this.id}`);
      if (!raw) return;
      const data = JSON.parse(raw);
      const elapsed = (Date.now() - (data.timestamp || 0)) / 1000;
      if (elapsed > 7200) return;

      this.hunger = clamp(data.hunger || this.hunger, 0, LIFE_CONFIG.hunger.max);
      this.mood = clamp(data.mood || this.mood, 0, LIFE_CONFIG.mood.max);
      this.energy = clamp(data.energy || this.energy, 0, LIFE_CONFIG.energy.max);
      this.feedCount = data.feedCount || 0;
      this.playCount = data.playCount || 0;
      this.petCount = data.petCount || 0;
      this.bugCount = data.bugCount || 0;
      this.affection = data.affection || 0;

      if (data.x && screenInfo) {
        this.body.x = clamp(data.x, 0, screenInfo.width - this.config.width);
      }

      if (data.isSleeping) {
        this.setState('sleep');
      }
    } catch (e) { /* ignore */ }
  }
}

// =====================================================================
// 第四部分：双宠联动系统
// 两只宠物在一起时的甜蜜互动
// =====================================================================

class CoupleSystem {
  constructor() {
    this.currentInteraction = null;
    this.interactionTimer = 0;
    this.lastInteractionTime = 0;
    this.interactionCooldown = 60000;
    this.heartLineEl = null;
    this.companionActive = false;
    this._companionActiveTimer = null;
  }

  setCompanionActive(durationMs) {
    this.companionActive = true;
    if (this._companionActiveTimer) clearTimeout(this._companionActiveTimer);
    this._companionActiveTimer = setTimeout(() => {
      this.companionActive = false;
      this._companionActiveTimer = null;
    }, durationMs);
  }

  // 检查是否可以触发互动
  canInteract() {
    if (this.currentInteraction) return false;
    if (Date.now() - this.lastInteractionTime < this.interactionCooldown) return false;
    if (!pets.yier || !pets.bubu) return false;
    if (pets.yier.isDragging || pets.bubu.isDragging) return false;
    return true;
  }

  // 计算两只宠物之间的距离
  getDistance() {
    if (!pets.yier || !pets.bubu) return Infinity;
    return distance(
      pets.yier.body.anchorX, pets.yier.body.footY,
      pets.bubu.body.anchorX, pets.bubu.body.footY
    );
  }

  // 选择一个互动
  chooseInteraction() {
    if (!this.canInteract()) return;

    // Minimum 30 seconds between interactions
    if (this.lastInteractionTime && Date.now() - this.lastInteractionTime < 120000) return;

    const dist = this.getDistance();
    if (dist > 200) return; // 距离太远不触发

    // 根据当前状态和时间筛选可用的互动
    const hour = getCurrentHour();
    const available = COUPLE_STATES.filter(interaction => {
      if (dist > interaction.distance) return false;

      const conds = interaction.conditions || {};
      if (conds.timeOfDay === 'night' && !isNightTime()) return false;
      if (conds.nearEdge) {
        const edgeThreshold = 100;
        const sw = screenInfo ? screenInfo.width : window.innerWidth;
        if (pets.yier.body.x > edgeThreshold && pets.yier.body.x + pets.yier.body.width < sw - edgeThreshold &&
            pets.bubu.body.x > edgeThreshold && pets.bubu.body.x + pets.bubu.body.width < sw - edgeThreshold) {
          return false;
        }
      }
      if (conds.both) {
        for (const [stat, level] of Object.entries(conds.both)) {
          const threshold = LIFE_CONFIG[stat] ? LIFE_CONFIG[stat][level] : 0;
          if (pets.yier[stat] > threshold || pets.bubu[stat] > threshold) return false;
        }
      }
      if (conds.partnerState) {
        if (pets.yier.currentState !== conds.partnerState && pets.bubu.currentState !== conds.partnerState) return false;
      }
      if (conds.partnerFar) {
        if (dist < 200) return false;
      }
      if (conds.weather) {
        if (!weatherData || weatherData.type !== conds.weather) return false;
      }

      return true;
    });

    if (available.length === 0) return;

    // 按优先级加权随机
    const interaction = weightedPick(available);
    this.startInteraction(interaction);
  }

  // 开始一个互动
  startInteraction(interaction) {
    this.currentInteraction = interaction;
    const [minDur, maxDur] = interaction.duration;
    this.interactionTimer = randFloat(minDur, maxDur) * 1000;
    this.lastInteractionTime = Date.now();

    const midX = (pets.yier.body.anchorX + pets.bubu.body.anchorX) / 2;

    const isLeft = pets.yier.body.anchorX < pets.bubu.body.anchorX;

    const proximityMap = {
      hold_hands: { gap: 30, yierState: 'idle', bubuState: 'idle' },
      hug: { gap: 15, yierState: 'clingy', bubuState: 'idle' },
      nose_boop: { gap: 10, yierState: 'idle', bubuState: 'idle' },
      feed_each_other: { gap: 40, yierState: 'eat', bubuState: 'eat' },
      high_five: { gap: 25, yierState: 'happy_dance', bubuState: 'idle' },
      piggyback: { gap: 0, yierState: 'clingy', bubuState: 'walk' },
      walk_together: { gap: 20, yierState: 'idle', bubuState: 'idle' },
      lean_on_back: { gap: 5, yierState: 'idle', bubuState: 'idle' },
      catch_bug_together: { gap: 50, yierState: 'happy_dance', bubuState: 'coding' },
      sleep_together: { gap: 10, yierState: 'sleep', bubuState: 'yawn' },
      share_coffee: { gap: 30, yierState: 'eat', bubuState: 'coffee' },
      hide_under_blanket: { gap: 0, yierState: 'hide_and_seek', bubuState: 'idle' },
      fix_hair: { gap: 20, yierState: 'idle', bubuState: 'pat' },
      push_cliff: { gap: 15, yierState: 'walk', bubuState: 'roll' },
      mirror_pose: { gap: 60, yierState: 'idle', bubuState: 'idle' },
      argue_makeup: { gap: 40, yierState: 'idle', bubuState: 'idle' },
      dance_together: { gap: 40, yierState: 'happy_dance', bubuState: 'idle' },
      read_together: { gap: 20, yierState: 'sleep', bubuState: 'read' },
      peek_a_boo: { gap: 10, yierState: 'hide_and_seek', bubuState: 'idle' },
      walk_arm_in_arm: { gap: 15, yierState: 'idle', bubuState: 'idle' },
      stargaze: { gap: 30, yierState: 'dream', bubuState: 'coffee' },
    };

    const layout = proximityMap[interaction.id] || { gap: 30, yierState: 'idle', bubuState: 'idle' };
    const halfGap = layout.gap / 2;
    const yierTargetX = isLeft ? midX - halfGap - pets.yier.body.width / 2 : midX + halfGap - pets.yier.body.width / 2;
    const bubuTargetX = isLeft ? midX + halfGap - pets.bubu.body.width / 2 : midX - halfGap - pets.bubu.body.width / 2;

    pets.yier.body.walkTo(yierTargetX + pets.yier.body.width / 2);
    pets.bubu.body.walkTo(bubuTargetX + pets.bubu.body.width / 2);

    setTimeout(() => {
      if (this.currentInteraction === interaction) {
        pets.yier.loadStateImage(layout.yierState);
        pets.bubu.loadStateImage(layout.bubuState);
      }
    }, 1500);

    const dialogueEntry = COUPLE_DIALOGUES.find(d => d.state === interaction.id);
    if (dialogueEntry) {
      const texts = dialogueEntry.text;
      if (Array.isArray(texts) && texts.length >= 2) {
        setTimeout(() => {
          pets.yier.showBubble(texts[0], 4000);
        }, 500);
        setTimeout(() => {
          pets.bubu.showBubble(texts[1], 4000);
        }, 1500);
        if (texts.length >= 3) {
          setTimeout(() => {
            if (pets.yier) pets.yier.showBubble(texts[2], 4000);
          }, 3500);
        }
      }
    }

    this.showCoupleEffect(interaction.id, layout);

    saveDiaryEntry('couple', 'couple', { action: interaction.description });

    pets.yier.mood = clamp(pets.yier.mood + 8, 0, LIFE_CONFIG.mood.max);
    pets.bubu.mood = clamp(pets.bubu.mood + 8, 0, LIFE_CONFIG.mood.max);
  }

  showCoupleEffect(interactionId, layout) {
    const overlay = document.getElementById('couple-overlay');
    if (!overlay) return;

    if (['hold_hands', 'hug', 'nose_boop', 'lean_on_back', 'walk_together',
         'walk_arm_in_arm', 'sleep_together', 'stargaze'].includes(interactionId)) {
      this.showHeartLine(overlay);
    }

    const heavyHeartIds = ['hug', 'nose_boop', 'dance_together', 'argue_makeup'];
    if (heavyHeartIds.includes(interactionId)) {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          if (pets.yier) pets.yier.emitParticles('heart', pets.yier.config.width / 2, 30);
          if (pets.bubu) pets.bubu.emitParticles('heart', pets.bubu.config.width / 2, 30);
        }, i * 200);
      }
    }

    if (['high_five', 'catch_bug_together', 'dance_together'].includes(interactionId)) {
      const midX = (pets.yier.body.anchorX + pets.bubu.body.anchorX) / 2;
      const midY = (pets.yier.body.footY + pets.bubu.body.footY) / 2 - 80;
      const fx = document.createElement('div');
      fx.className = 'interaction-fx';
      fx.innerHTML = `<span class="fx-emoji">${interactionId === 'high_five' ? '💥' : interactionId === 'dance_together' ? '💃' : '🐛'}</span>`;
      fx.style.left = `${midX}px`;
      fx.style.top = `${midY}px`;
      overlay.appendChild(fx);
      setTimeout(() => {
        if (fx.parentNode) fx.parentNode.removeChild(fx);
      }, 2000);
    }

    if (['share_coffee', 'feed_each_other'].includes(interactionId)) {
      const midX = (pets.yier.body.anchorX + pets.bubu.body.anchorX) / 2;
      const midY = (pets.yier.body.footY + pets.bubu.body.footY) / 2 - 60;
      const fx = document.createElement('div');
      fx.className = 'interaction-fx';
      fx.innerHTML = `<span class="fx-emoji">${interactionId === 'share_coffee' ? '☕' : '🍖'}</span>`;
      fx.style.left = `${midX}px`;
      fx.style.top = `${midY}px`;
      overlay.appendChild(fx);
      setTimeout(() => {
        if (fx.parentNode) fx.parentNode.removeChild(fx);
      }, 2000);
    }
  }

  // 显示爱心连线
  showHeartLine(overlay) {
    if (!pets.yier || !pets.bubu) return;

    const line = document.createElement('div');
    line.className = 'heart-line';

    const x1 = pets.yier.body.anchorX;
    const y1 = pets.yier.body.footY - pets.yier.body.height / 2;
    const x2 = pets.bubu.body.anchorX;
    const y2 = pets.bubu.body.footY - pets.bubu.body.height / 2;

    const len = distance(x1, y1, x2, y2);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

    line.style.left = `${x1}px`;
    line.style.top = `${y1}px`;
    line.style.width = `${len}px`;
    line.style.transform = `rotate(${angle}deg)`;

    overlay.appendChild(line);
    this.heartLineEl = line;

    setTimeout(() => {
      if (line.parentNode) line.parentNode.removeChild(line);
      this.heartLineEl = null;
    }, this.interactionTimer);
  }

  // 更新互动
  update(deltaTime) {
    if (this.currentInteraction) {
      this.interactionTimer -= deltaTime;
      if (this.interactionTimer <= 0) {
        this.endInteraction();
      }
    } else {
      // 随机尝试触发互动
      if (Math.random() < 0.0001) { // 每帧约 0.01% 概率
        this.chooseInteraction();
      }
    }

    if (this.heartLineEl && pets.yier && pets.bubu) {
      const x1 = pets.yier.body.anchorX;
      const y1 = pets.yier.body.footY - pets.yier.body.height / 2;
      const x2 = pets.bubu.body.anchorX;
      const y2 = pets.bubu.body.footY - pets.bubu.body.height / 2;
      const len = distance(x1, y1, x2, y2);
      const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      this.heartLineEl.style.left = `${x1}px`;
      this.heartLineEl.style.top = `${y1}px`;
      this.heartLineEl.style.width = `${len}px`;
      this.heartLineEl.style.transform = `rotate(${angle}deg)`;
    }

    this.checkDailyCompanion(deltaTime);
  }

  // 结束互动
  endInteraction() {
    this.currentInteraction = null;
    this.interactionTimer = 0;
    this.lastInteractionTime = Date.now();

    const overlay = document.getElementById('couple-overlay');
    if (overlay) overlay.innerHTML = '';

    if (pets.yier) {
      pets.yier.nextWanderTime = Date.now() + randInt(4000, 8000);
      pets.yier.setState('idle');
    }
    if (pets.bubu) {
      pets.bubu.nextWanderTime = Date.now() + randInt(4000, 8000);
      pets.bubu.setState('idle');
    }

    if (this._walkTogetherCleanup) {
      this._walkTogetherCleanup();
      this._walkTogetherCleanup = null;
    }
    if (this._companionEffectCleanup) {
      this._companionEffectCleanup();
      this._companionEffectCleanup = null;
    }
  }

  // =====================================================================
  // 第四批 C: 双宠共处行为增强
  // =====================================================================

  checkDailyCompanion(deltaTime) {
    if (!pets.yier || !pets.bubu) return;
    if (pets.yier.isDragging || pets.bubu.isDragging) return;
    if (this.currentInteraction) return;

    this.checkBubuOrbit();
    this.checkWalkTogether();
    this.checkCompanionEat();
    this.checkSleepTogether();
    this.checkKiteFlying();
    this.checkWatchTVTogether();
    this.checkTuckIn();
    this.checkForeheadTouch();
    this.checkHeadPat();
    this.checkMutualDiscover();
    this.checkSnackShare();
    this.checkCheerUp();
    this.checkAmbushPlay();
    this.checkStudyTogether();
    this.checkRainShelter();
    this.checkLunchBreak();
    this.checkPhotoMemory();
    this.checkSingTogether();
    this.checkRacePlay();
    this.checkBearCompliment();
    this.checkMorningGreeting();
    this.checkNightWatch();
  }

  checkBubuOrbit() {
    if (!pets.bubu || !pets.yier) return;
    if (pets.bubu.currentState !== 'idle') return;
    if (!pets.bubu.body.isGrounded) return;
    if (pets.bubu.body.walkTargetX !== null) return;
    if (Date.now() - (this._lastOrbitCheck || 0) < 60000) return;

    const dist = this.getDistance();
    if (dist < 150 || dist > 400) return;

    if (Math.random() < 0.02) {
      this._lastOrbitCheck = Date.now();
      this.setCompanionActive(10000);
      const targetX = pets.yier.body.x + randInt(-50, 50);
      pets.bubu.body.walkTo(targetX + pets.bubu.config.width / 2);

      this._orbitTimer = setTimeout(() => {
        if (pets.bubu && pets.bubu.currentState === 'idle' && this.getDistance() < 120) {
          pets.bubu.showBubble(randPick([
            '在你旁边待一会儿哒 (安静)', '一二在这就好哒 (微笑)',
            '陪你哒 (坐下)', '嗯...安心哒 (看一二)'
          ]), 4000);
        }
      }, 3000);
    }
  }

  checkWalkTogether() {
    if (Date.now() - (this._lastWalkTogetherCheck || 0) < 180000) return;
    if (!pets.yier.body.isGrounded || !pets.bubu.body.isGrounded) return;

    const dist = this.getDistance();
    if (dist > 150) return;

    if (Math.random() < 0.005) {
      this._lastWalkTogetherCheck = Date.now();
      this.setCompanionActive(15000);

      const sw = screenInfo ? screenInfo.width : window.innerWidth;
      const direction = Math.random() > 0.5 ? 1 : -1;
      const walkDist = randInt(100, 300);
      const midX = (pets.yier.body.anchorX + pets.bubu.body.anchorX) / 2;
      const targetX = clamp(midX + direction * walkDist, 80, sw - 80);

      pets.yier.body.walkTo(targetX - 20);
      pets.bubu.body.walkTo(targetX + 20);

      this.showHeartLine(document.getElementById('couple-overlay'));

      pets.yier.showBubble(randPick(['手拉手散步哒~ 💕 (开心)', '散步好幸福哒 (牵手)', '一起走哒~ (蹦蹦跳跳)']), 4000);
      setTimeout(() => {
        if (pets.bubu) pets.bubu.showBubble(randPick(['嗯嗯哒 (配合)', '走慢点哒 (照顾)', '散步消食哒 (微笑)']), 4000);
      }, 1000);

      const effectChance = Math.random();
      if (effectChance < 0.4) {
        this.spawnCompanionEffect();
      } else if (effectChance < 0.7) {
        this.spawnTravelEffect();
      }

      saveDiaryEntry('couple', 'couple', { action: '手拉手散步' });
    }
  }

  checkCompanionEat() {
    if (!pets.yier || !pets.bubu) return;
    if (pets.yier.currentState !== 'eat') return;
    if (pets.bubu.currentState !== 'idle') return;
    if (!pets.bubu.body.isGrounded) return;
    if (Date.now() - (this._lastCompanionEatCheck || 0) < 120000) return;

    const dist = this.getDistance();
    if (dist > 200) return;

    if (Math.random() < 0.01) {
      this._lastCompanionEatCheck = Date.now();
      this.setCompanionActive(30000);

      pets.bubu.body.walkTo(pets.yier.body.anchorX + randInt(-30, 30));
      setTimeout(() => {
        if (pets.bubu && pets.yier && this.getDistance() < 120) {
          pets.bubu.setState('eat');
          pets.bubu.showBubble('一起吃哒~ (坐下)', 4000);
          pets.bubu.emitParticles('eat', pets.bubu.config.width / 2, pets.bubu.config.height / 3);
        }
      }, 1500);
    }
  }

  checkSleepTogether() {
    if (!pets.yier || !pets.bubu) return;
    if (pets.yier.energy > 35 || pets.bubu.energy > 35) return;
    if (pets.yier.isSleeping && pets.bubu.isSleeping) return;

    const dist = this.getDistance();
    if (dist > 150) return;

    if (Math.random() < 0.001) {
      this.setCompanionActive(60000);
      pets.yier.setState('sleep');
      pets.bubu.setState('sleep');
      pets.yier.showBubble('一起睡哒~ 😴 (靠过来)', 4000);
      pets.bubu.showBubble('嗯，一起休息哒 (闭眼)', 4000);
      this.showHeartLine(document.getElementById('couple-overlay'));
      saveDiaryEntry('couple', 'couple', { action: '累了一起睡觉' });
    }
  }

  checkKiteFlying() {
    if (Date.now() - (this._lastKiteCheck || 0) < 300000) return;

    const hour = getCurrentHour();
    if (hour < 8 || hour >= 18) return;

    const dist = this.getDistance();
    if (dist > 200) return;

    if (Math.random() < 0.002) {
      this._lastKiteCheck = Date.now();
      this.setCompanionActive(20000);
      this.showKiteEffect();
    }
  }

  showKiteEffect() {
    const overlay = document.getElementById('couple-overlay');
    if (!overlay) return;

    const midX = (pets.yier.body.anchorX + pets.bubu.body.anchorX) / 2;
    const midY = Math.min(pets.yier.body.y, pets.bubu.body.y) - 80;

    const kite = document.createElement('div');
    kite.className = 'kite-effect';
    kite.textContent = KITE_CONFIG.emoji;
    kite.style.cssText = `position:absolute;left:${midX}px;top:${midY}px;font-size:32px;pointer-events:none;z-index:250;animation:kite-float 4s ease-in-out infinite;`;
    overlay.appendChild(kite);

    const line = document.createElement('div');
    line.className = 'kite-line';
    line.style.cssText = `position:absolute;left:${midX + 5}px;top:${midY + 30}px;width:2px;height:120px;background:linear-gradient(transparent,#888);pointer-events:none;z-index:249;transform-origin:top center;animation:kite-sway 3s ease-in-out infinite;`;
    overlay.appendChild(line);

    const spawnFloatEmoji = () => {
      if (!kite.parentNode) return;
      const emoji = document.createElement('div');
      emoji.textContent = randPick(KITE_CONFIG.floatEmojis);
      emoji.style.cssText = `position:absolute;left:${midX + randInt(-40, 40)}px;top:${midY + randInt(-30, 10)}px;font-size:14px;pointer-events:none;z-index:251;animation:float-up 3s ease-out forwards;`;
      overlay.appendChild(emoji);
      setTimeout(() => { if (emoji.parentNode) emoji.remove(); }, 3100);
    };

    const floatInterval = setInterval(spawnFloatEmoji, 1500);

    pets.yier.showBubble(randPick(KITE_CONFIG.dialogues.yier), 4000);
    setTimeout(() => {
      if (pets.bubu) pets.bubu.showBubble(randPick(KITE_CONFIG.dialogues.bubu), 4000);
    }, 1000);

    const duration = randInt(KITE_CONFIG.duration[0], KITE_CONFIG.duration[1]) * 1000;
    setTimeout(() => {
      clearInterval(floatInterval);
      if (kite.parentNode) kite.remove();
      if (line.parentNode) line.remove();
    }, duration);

    saveDiaryEntry('couple', 'couple', { action: '一起放风筝' });
  }

  checkWatchTVTogether() {
    if (Date.now() - (this._lastCoupleTVCheck || 0) < 240000) return;
    if (!pets.yier.body.isGrounded || !pets.bubu.body.isGrounded) return;
    if (pets.yier.currentState !== 'idle' || pets.bubu.currentState !== 'idle') return;

    const hour = getCurrentHour();
    if (hour < 9 || hour >= 22) return;

    const dist = this.getDistance();
    if (dist > 120) return;

    if (Math.random() < 0.003) {
      this._lastCoupleTVCheck = Date.now();
      this.setCompanionActive(60000);

      const midX = (pets.yier.body.anchorX + pets.bubu.body.anchorX) / 2;
      pets.yier.setState('watch_tv');
      pets.bubu.setState('watch_tv');

      const overlay = document.getElementById('couple-overlay');
      if (overlay) {
        const tvFx = document.createElement('div');
        tvFx.className = 'couple-tv-effect';
        tvFx.style.cssText = `position:absolute;left:${midX}px;top:${Math.min(pets.yier.body.y, pets.bubu.body.y) - 50}px;font-size:24px;pointer-events:none;z-index:250;animation:float-up 3s ease-in-out infinite;`;
        tvFx.textContent = '📺';
        overlay.appendChild(tvFx);

        setTimeout(() => { if (tvFx.parentNode) tvFx.remove(); }, 60000);
      }

      pets.yier.showBubble(randPick(COUPLE_TV_DIALOGUES.yier), 4000);
      setTimeout(() => {
        if (pets.bubu) pets.bubu.showBubble(randPick(COUPLE_TV_DIALOGUES.bubu), 4000);
      }, 1500);

      saveDiaryEntry('couple', 'couple', { action: '一起看电视' });
    }
  }

  checkTuckIn() {
    if (!pets.yier || !pets.bubu) return;
    if (!pets.yier.isSleeping) return;
    if (pets.bubu.currentState !== 'idle' || !pets.bubu.body.isGrounded) return;
    if (Date.now() - (this._lastTuckInCheck || 0) < 300000) return;

    const dist = this.getDistance();
    if (dist > 200) return;

    if (Math.random() < 0.005) {
      this._lastTuckInCheck = Date.now();
      this.setCompanionActive(10000);

      pets.bubu.body.walkTo(pets.yier.body.anchorX);
      setTimeout(() => {
        if (pets.bubu && this.getDistance() < 100) {
          pets.bubu.setState('tuck_in');
          pets.bubu.showBubble('别着凉哒~ (盖被子)', 4000);

          const overlay = document.getElementById('couple-overlay');
          if (overlay) {
            const tuckFx = document.createElement('div');
            tuckFx.style.cssText = `position:absolute;left:${pets.yier.body.anchorX}px;top:${pets.yier.body.y - 30}px;font-size:18px;pointer-events:none;z-index:250;animation:float-up 2s ease-out forwards;`;
            tuckFx.textContent = '💤';
            overlay.appendChild(tuckFx);
            setTimeout(() => { if (tuckFx.parentNode) tuckFx.remove(); }, 2100);
          }
          saveDiaryEntry('couple', 'couple', { action: '给一二盖被子' });
        }
      }, 2000);
    }
  }

  checkForeheadTouch() {
    if (Date.now() - (this._lastForeheadCheck || 0) < 180000) return;

    const dist = this.getDistance();
    if (dist > 100) return;

    if (Math.random() < 0.003) {
      this._lastForeheadCheck = Date.now();
      this.setCompanionActive(8000);

      const midX = (pets.yier.body.anchorX + pets.bubu.body.anchorX) / 2;
      pets.yier.body.walkTo(midX - 5);
      pets.bubu.body.walkTo(midX + 5);

      setTimeout(() => {
        if (this.getDistance() < 50) {
          pets.yier.showBubble(randPick(FOREHEAD_TOUCH_DIALOGUES.yier), 4000);
          setTimeout(() => {
            if (pets.bubu) pets.bubu.showBubble(randPick(FOREHEAD_TOUCH_DIALOGUES.bubu), 4000);
          }, 1000);

          for (let i = 0; i < 6; i++) {
            setTimeout(() => {
              if (pets.yier) pets.yier.emitParticles('heart', pets.yier.config.width / 2, 20);
              if (pets.bubu) pets.bubu.emitParticles('heart', pets.bubu.config.width / 2, 20);
            }, i * 300);
          }
          saveDiaryEntry('couple', 'couple', { action: '额头蹭蹭' });
        }
      }, 2000);
    }
  }

  checkHeadPat() {
    if (!pets.yier || !pets.bubu) return;
    if (pets.yier.currentState !== 'clingy' && pets.yier.currentState !== 'sad') return;
    if (pets.bubu.currentState !== 'idle' || !pets.bubu.body.isGrounded) return;
    if (Date.now() - (this._lastHeadPatCheck || 0) < 120000) return;

    const dist = this.getDistance();
    if (dist > 200) return;

    if (Math.random() < 0.01) {
      this._lastHeadPatCheck = Date.now();
      this.setCompanionActive(10000);

      pets.bubu.body.walkTo(pets.yier.body.anchorX + randInt(-20, 20));
      setTimeout(() => {
        if (pets.bubu && this.getDistance() < 100) {
          pets.bubu.setState('pat');
          pets.bubu.showBubble(randPick([
            '乖~别难过哒 (摸头)', '有我在哒 (温柔)',
            '摸摸头就好哒 (轻抚)', '没事的哒 (拍拍)'
          ]), 4000);
          pets.yier.mood = clamp(pets.yier.mood + 15, 0, LIFE_CONFIG.mood.max);
          pets.yier.emitParticles('heart', pets.yier.config.width / 2, 30);
          saveDiaryEntry('couple', 'couple', { action: '布布摸一二头' });
        }
      }, 2000);
    }
  }

  spawnCompanionEffect() {
    const overlay = document.getElementById('couple-overlay');
    if (!overlay) return;

    const effect = randPick(COMPANION_EFFECTS);
    const midX = (pets.yier.body.anchorX + pets.bubu.body.anchorX) / 2;
    const midY = Math.min(pets.yier.body.y, pets.bubu.body.y) - 40;

    const spawnOne = () => {
      const el = document.createElement('div');
      el.className = 'companion-effect-emoji';
      el.textContent = effect.emoji;
      el.style.cssText = `position:absolute;left:${midX + randInt(-60, 60)}px;top:${midY + randInt(-20, 20)}px;font-size:${16 + randInt(0, 10)}px;pointer-events:none;z-index:250;animation:float-up ${2 + Math.random() * 2}s ease-out forwards;`;
      overlay.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.remove(); }, 4500);
    };

    spawnOne();
    setTimeout(spawnOne, 800);
    setTimeout(spawnOne, 1600);
  }

  spawnTravelEffect() {
    const overlay = document.getElementById('couple-overlay');
    if (!overlay) return;

    const midX = (pets.yier.body.anchorX + pets.bubu.body.anchorX) / 2;
    const midY = Math.min(pets.yier.body.y, pets.bubu.body.y) - 50;

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'travel-effect-emoji';
        el.textContent = randPick(TRAVEL_EFFECTS.emoji);
        el.style.cssText = `position:absolute;left:${midX + randInt(-50, 50)}px;top:${midY + randInt(-20, 10)}px;font-size:20px;pointer-events:none;z-index:250;animation:float-up ${2.5 + Math.random()}s ease-out forwards;`;
        overlay.appendChild(el);
        setTimeout(() => { if (el.parentNode) el.remove(); }, 4000);
      }, i * 500);
    }

    pets.yier.showBubble(randPick(TRAVEL_EFFECTS.dialogues.yier), 4000);
    setTimeout(() => {
      if (pets.bubu) pets.bubu.showBubble(randPick(TRAVEL_EFFECTS.dialogues.bubu), 4000);
    }, 1000);

    saveDiaryEntry('couple', 'couple', { action: '去旅行' });
  }

  // ---- 互相发现：两熊突然注意到对方 ----
  checkMutualDiscover() {
    if (!pets.yier || !pets.bubu) return;
    if (pets.yier.currentState !== 'idle' || pets.bubu.currentState !== 'idle') return;
    if (!pets.yier.body.isGrounded || !pets.bubu.body.isGrounded) return;
    if (Date.now() - (this._lastDiscoverCheck || 0) < 90000) return;

    const dist = this.getDistance();
    if (dist < 100 || dist > 350) return;

    if (Math.random() < 0.003) {
      this._lastDiscoverCheck = Date.now();
      this.setCompanionActive(8000);

      pets.yier.showBubble(randPick([
        '啊！看到布布了哒！(指向)', '那边是布布哒？(张望)',
        '一二发现你了哒！(惊喜)', '布布布布！(挥手)', '诶？那是谁哒？(眨眼)'
      ]), 4000);

      setTimeout(() => {
        if (!pets.bubu || !pets.yier) return;
        pets.bubu.showBubble(randPick([
          '嗯？一二在叫我哒？(转头)', '看到一二了哒 (微笑)',
          '嗯...在这哒 (点头)', '一二在那边哒 (看)', '来了哒~ (走过来)'
        ]), 4000);
        pets.bubu.body.walkTo(pets.yier.body.anchorX + randInt(-30, 30));
      }, 1500);

      saveDiaryEntry('couple', 'couple', { action: '互相发现' });
    }
  }

  // ---- 分享零食 ----
  checkSnackShare() {
    if (!pets.yier || !pets.bubu) return;
    if (pets.yier.currentState !== 'eat' && pets.yier.currentState !== 'idle') return;
    if (pets.bubu.currentState !== 'idle') return;
    if (!pets.bubu.body.isGrounded) return;
    if (Date.now() - (this._lastSnackCheck || 0) < 150000) return;

    const dist = this.getDistance();
    if (dist > 100) return;

    if (Math.random() < 0.005) {
      this._lastSnackCheck = Date.now();
      this.setCompanionActive(12000);

      const shareFromYier = Math.random() < 0.5;
      if (shareFromYier) {
        pets.yier.showBubble(randPick([
          '布布~给你吃一口哒 (递过去)', '这个好吃哒！你尝尝 (分享)',
          '分你一半哒~ (掰开)', '一起吃才好吃哒 (递)']), 4000);
        setTimeout(() => {
          if (pets.bubu) pets.bubu.showBubble(randPick([
            '谢谢一二哒 (接过)', '嗯，好吃哒 (嚼嚼)', '一二总是很慷慨哒 (微笑)',
            '嗯...不错哒 (点头)']), 4000);
        }, 1500);
      } else {
        pets.bubu.showBubble(randPick([
          '一二，给你哒 (递过去)', '我买了你爱吃的哒 (拿出)',
          '这个应该合你口味哒 (递)', '先给你吃哒 (微笑)']), 4000);
        setTimeout(() => {
          if (pets.yier) pets.yier.showBubble(randPick([
            '好耶！谢谢布布哒！(开心)', '一二最喜欢吃哒！(接过)',
            '嗷呜~好吃哒 (大口吃)', '你也太好了哒~ (感动)']), 4000);
        }, 1500);
      }

      pets.yier.emitParticles('heart', pets.yier.config.width / 2, 20);
      if (pets.bubu) pets.bubu.emitParticles('heart', pets.bubu.config.width / 2, 20);
      saveDiaryEntry('couple', 'couple', { action: '分享零食' });
    }
  }

  // ---- 布布安慰难过的一二 ----
  checkCheerUp() {
    if (!pets.yier || !pets.bubu) return;
    if (pets.yier.mood > LIFE_CONFIG.mood.low) return;
    if (pets.bubu.currentState !== 'idle' || !pets.bubu.body.isGrounded) return;
    if (pets.bubu.isDragging) return;
    if (Date.now() - (this._lastCheerUpCheck || 0) < 120000) return;

    const dist = this.getDistance();
    if (dist > 250) return;

    if (Math.random() < 0.005) {
      this._lastCheerUpCheck = Date.now();
      this.setCompanionActive(15000);

      pets.bubu.body.walkTo(pets.yier.body.anchorX + randInt(-20, 20));
      setTimeout(() => {
        if (!pets.bubu || !pets.yier || this.getDistance() > 150) return;
        pets.bubu.showBubble(randPick([
          '怎么了？不开心吗哒 (关心)', '别难过，有我在哒 (靠近)',
          '笑一个嘛哒~ (逗)', '我给你讲个笑话哒 (认真)',
          '一二不哭，我在呢哒 (拍拍)', '没事的，会好起来哒 (拥抱)']), 5000);
        pets.yier.mood = clamp(pets.yier.mood + 15, 0, LIFE_CONFIG.mood.max);
        pets.yier.emitParticles('heart', pets.yier.config.width / 2, 25);

        setTimeout(() => {
          if (pets.yier) pets.yier.showBubble(randPick([
            '谢谢布布哒...好多了 (微笑)', '嗯...有你在真好哒 (靠过来)',
            '一二没事了哒 (擦擦眼泪)', '你最好了哒！(抱住)']), 4000);
        }, 2000);

        saveDiaryEntry('couple', 'couple', { action: '安慰一二' });
      }, 2500);
    }
  }

  // ---- 一二偷偷从背后吓布布 ----
  checkAmbushPlay() {
    if (!pets.yier || !pets.bubu) return;
    if (pets.yier.currentState !== 'idle') return;
    if (pets.bubu.currentState !== 'idle' && pets.bubu.currentState !== 'coding') return;
    if (Date.now() - (this._lastAmbushCheck || 0) < 200000) return;
    if (this.getDistance() > 300) return;

    if (Math.random() < 0.002) {
      this._lastAmbushCheck = Date.now();
      this.setCompanionActive(12000);

      pets.yier.showBubble('嘿嘿...悄悄过去哒 (蹑手蹑脚)', 3000);
      pets.yier.body.walkTo(pets.bubu.body.anchorX - 20);

      setTimeout(() => {
        if (!pets.yier || !pets.bubu || this.getDistance() > 120) return;
        pets.yier.showBubble(randPick([
          '啊哒！吓到了没！(蹦出来)', '哇！(张牙舞爪)',
          '吓一跳吧哒！(大笑)', '哒哒哒！抓到布布了！(抱)']), 3000);

        setTimeout(() => {
          if (!pets.bubu) return;
          pets.bubu.showBubble(randPick([
            '！...一二你 (心跳加速)', '啊...被吓到了哒 (捂胸)',
            '别吓我哒... (无奈)', '一二太调皮了哒 (摇头)',
            '吓我一跳... (叹气)', '心脏都快停了哒 (深呼吸)']), 4000);
          pets.bubu.emitParticles('star', pets.bubu.config.width / 2, 20);
        }, 800);

        saveDiaryEntry('couple', 'couple', { action: '吓布布' });
      }, 3000);
    }
  }

  // ---- 一起学习：布布看书/编码，一二在旁边也看 ----
  checkStudyTogether() {
    if (!pets.yier || !pets.bubu) return;
    if (pets.bubu.currentState !== 'read' && pets.bubu.currentState !== 'coding') return;
    if (pets.yier.currentState !== 'idle') return;
    if (!pets.yier.body.isGrounded) return;
    if (Date.now() - (this._lastStudyCheck || 0) < 180000) return;

    const dist = this.getDistance();
    if (dist > 200 || dist < 30) return;

    if (Math.random() < 0.004) {
      this._lastStudyCheck = Date.now();
      this.setCompanionActive(25000);

      pets.yier.body.walkTo(pets.bubu.body.anchorX + randInt(-40, 40));

      setTimeout(() => {
        if (!pets.yier || !pets.bubu || this.getDistance() > 150) return;
        pets.yier.loadStateImage('stare_at_cursor');

        pets.yier.showBubble(randPick([
          '一二也想学哒！(凑过来看)', '布布在看什么哒？(好奇)',
          '这个一二也看不懂哒... (歪头)', '陪你一起看哒~ (认真)',
          '嗯...好深奥哒 (努力看)']), 4000);

        setTimeout(() => {
          if (!pets.bubu) return;
          pets.bubu.showBubble(randPick([
            '想学吗哒？我教你 (耐心)', '这个不难的哒 (解释)',
            '一二很聪明的哒 (鼓励)', '嗯，一起学吧哒 (微笑)']), 4000);
        }, 2000);

        saveDiaryEntry('couple', 'couple', { action: '一起学习' });
      }, 2000);
    }
  }

  // ---- 一起躲雨 ----
  checkRainShelter() {
    if (!pets.yier || !pets.bubu) return;
    if (!weatherData || weatherData.type !== 'rain') return;
    if (Date.now() - (this._lastRainCheck || 0) < 300000) return;
    if (pets.yier.isDragging || pets.bubu.isDragging) return;

    const dist = this.getDistance();
    if (dist > 200) return;

    if (Math.random() < 0.01) {
      this._lastRainCheck = Date.now();
      this.setCompanionActive(30000);

      const midX = (pets.yier.body.anchorX + pets.bubu.body.anchorX) / 2;
      pets.yier.body.walkTo(midX - 15);
      pets.bubu.body.walkTo(midX + 15);

      setTimeout(() => {
        if (!pets.yier || !pets.bubu || this.getDistance() > 100) return;

        pets.yier.showBubble(randPick([
          '下雨了哒！快躲躲 (捂头)', '一二不想淋湿哒 (缩)',
          '布布快过来哒！(招手)', '一起等雨停吧哒 (靠紧)'
        ]), 4000);
        setTimeout(() => {
          if (!pets.bubu) return;
          pets.bubu.showBubble(randPick([
            '别怕，有我在哒 (挡住)', '靠近一点就不会淋到哒',
            '嗯，等一下就好哒 (安静)', '这雨真大哒 (看外面)'
          ]), 4000);
        }, 1500);

        this.showHeartLine(document.getElementById('couple-overlay'));
        saveDiaryEntry('couple', 'couple', { action: '一起躲雨' });
      }, 2500);
    }
  }

  // ---- 午休时间一起打盹 ----
  checkLunchBreak() {
    if (!pets.yier || !pets.bubu) return;
    const hour = getCurrentHour();
    if (hour < 12 || hour > 14) return;
    if (pets.yier.isSleeping || pets.bubu.isSleeping) return;
    if (pets.yier.energy > 50 || pets.bubu.energy > 50) return;
    if (Date.now() - (this._lastLunchBreakCheck || 0) < 600000) return;

    const dist = this.getDistance();
    if (dist > 150) return;

    if (Math.random() < 0.003) {
      this._lastLunchBreakCheck = Date.now();
      this.setCompanionActive(40000);

      pets.yier.setState('sleep');
      pets.bubu.setState('sleep');

      pets.yier.showBubble(randPick([
        '午休一下哒... (闭眼)', '好困哒...先睡一会儿 (趴下)',
        '午饭后最困了哒~ (打哈欠)'
      ]), 3000);
      setTimeout(() => {
        if (!pets.bubu) return;
        pets.bubu.showBubble(randPick([
          '嗯，午休一下哒 (闭眼)', '睡个午觉吧哒 (安静)',
          '半小时就好哒 (躺下)'
        ]), 3000);
      }, 1000);

      this.showHeartLine(document.getElementById('couple-overlay'));
      saveDiaryEntry('couple', 'couple', { action: '一起午休' });
    }
  }

  // ---- 回忆过去的甜蜜 ----
  checkPhotoMemory() {
    if (!pets.yier || !pets.bubu) return;
    if (pets.yier.currentState !== 'idle' || pets.bubu.currentState !== 'idle') return;
    if (!pets.yier.body.isGrounded || !pets.bubu.body.isGrounded) return;
    if (Date.now() - (this._lastPhotoMemoryCheck || 0) < 600000) return;

    const dist = this.getDistance();
    if (dist > 150) return;

    if (Math.random() < 0.001) {
      this._lastPhotoMemoryCheck = Date.now();
      this.setCompanionActive(15000);

      pets.yier.showBubble(randPick([
        '还记得我们第一次见面吗哒？(回忆)', '那时候你好腼腆哒~ (笑)',
        '好想回到那一天哒 (憧憬)', '手机里都是你的照片哒~ (开心)'
      ]), 5000);
      setTimeout(() => {
        if (!pets.bubu) return;
        pets.bubu.showBubble(randPick([
          '当然记得哒 (微笑)', '第一次见你，就很心动哒 (安静)',
          '嗯...你一点都没变哒 (看一二)', '我也存了好多照片哒 (拿出手机)'
        ]), 5000);
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            if (pets.yier) pets.yier.emitParticles('heart', pets.yier.config.width / 2, 25);
            if (pets.bubu) pets.bubu.emitParticles('heart', pets.bubu.config.width / 2, 25);
          }, i * 400);
        }
      }, 2000);
      saveDiaryEntry('couple', 'couple', { action: '回忆甜蜜' });
    }
  }

  // ---- 一起唱歌 ----
  checkSingTogether() {
    if (!pets.yier || !pets.bubu) return;
    if (pets.yier.currentState !== 'idle' || pets.bubu.currentState !== 'idle') return;
    if (!pets.yier.body.isGrounded || !pets.bubu.body.isGrounded) return;
    if (Date.now() - (this._lastSingCheck || 0) < 400000) return;
    if (pets.yier.mood < 40 || pets.bubu.mood < 40) return;

    const dist = this.getDistance();
    if (dist > 150) return;

    if (Math.random() < 0.002) {
      this._lastSingCheck = Date.now();
      this.setCompanionActive(20000);

      pets.yier.showBubble(randPick([
        '哒哒哒~啦啦啦 (哼歌)', '一二给你唱首歌哒~ (清嗓子)',
        '这首歌好好听哒！(唱起来)', '一起唱吧哒！(挥手)'
      ]), 4000);
      setTimeout(() => {
        if (!pets.bubu) return;
        pets.bubu.showBubble(randPick([
          '嗯...唱得不错哒 (微笑)', '你唱得很好听哒 (鼓掌)',
          '一起哒~ (轻轻跟着)', '这首歌我也会哒 (轻声和)'
        ]), 4000);
      }, 2000);

      pets.yier.setState('happy_dance');
      setTimeout(() => {
        if (pets.bubu) pets.bubu.setState('happy_dance');
      }, 1000);

      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          const overlay = document.getElementById('couple-overlay');
          if (!overlay) return;
          const note = document.createElement('div');
          note.textContent = randPick(['♪', '♫', '🎵', '🎶']);
          note.style.cssText = `position:absolute;left:${(pets.yier.body.anchorX + pets.bubu.body.anchorX) / 2 + randInt(-50, 50)}px;top:${Math.min(pets.yier.body.y, pets.bubu.body.y) - 20 + randInt(-20, 10)}px;font-size:18px;pointer-events:none;z-index:250;animation:float-up 3s ease-out forwards;`;
          overlay.appendChild(note);
          setTimeout(() => { if (note.parentNode) note.remove(); }, 3100);
        }, i * 800);
      }

      saveDiaryEntry('couple', 'couple', { action: '一起唱歌' });
    }
  }

  // ---- 比赛跑步 ----
  checkRacePlay() {
    if (!pets.yier || !pets.bubu) return;
    if (pets.yier.currentState !== 'idle' || pets.bubu.currentState !== 'idle') return;
    if (!pets.yier.body.isGrounded || !pets.bubu.body.isGrounded) return;
    if (Date.now() - (this._lastRaceCheck || 0) < 300000) return;
    if (getCurrentHour() < 7 || getCurrentHour() > 21) return;

    const dist = this.getDistance();
    if (dist > 150) return;

    if (Math.random() < 0.002) {
      this._lastRaceCheck = Date.now();
      this.setCompanionActive(20000);

      pets.yier.showBubble('一二和你比赛哒！看谁先到那边！(兴奋)', 3000);
      setTimeout(() => {
        if (!pets.bubu) return;
        pets.bubu.showBubble('好哒，来吧 (认真)', 3000);
      }, 1000);

      setTimeout(() => {
        const sw = screenInfo ? screenInfo.width : window.innerWidth;
        const targetA = randInt(50, sw / 2 - 50);
        const targetB = randInt(sw / 2 + 50, sw - 50);
        pets.yier.body.walkTo(targetA);
        pets.bubu.body.walkTo(targetB);

        setTimeout(() => {
          if (!pets.yier || !pets.bubu) return;
          const winner = Math.random() < 0.5 ? pets.yier : pets.bubu;
          const loser = winner === pets.yier ? pets.bubu : pets.yier;
          winner.showBubble(randPick([
            '赢了赢了哒！(蹦跳)', '一二最快哒！(得意)',
            '嘿嘿~ (开心)', '第一哒！(举手)'
          ]), 3000);
          setTimeout(() => {
            loser.showBubble(randPick([
              '下次一定赢哒！(不服)', '你太快了哒... (喘气)',
              '再来一次哒！(认真)', '不算不算哒！(摆手)'
            ]), 3000);
          }, 800);
        }, 4000);
      }, 3000);

      saveDiaryEntry('couple', 'couple', { action: '比赛跑步' });
    }
  }

  // ---- 互相夸夸 ----
  checkBearCompliment() {
    if (!pets.yier || !pets.bubu) return;
    if (pets.yier.currentState !== 'idle' || pets.bubu.currentState !== 'idle') return;
    if (!pets.yier.body.isGrounded || !pets.bubu.body.isGrounded) return;
    if (Date.now() - (this._lastComplimentCheck || 0) < 240000) return;

    const dist = this.getDistance();
    if (dist > 180) return;

    if (Math.random() < 0.004) {
      this._lastComplimentCheck = Date.now();
      this.setCompanionActive(12000);

      const fromYier = Math.random() < 0.5;
      if (fromYier) {
        pets.yier.showBubble(randPick([
          '布布你今天好帅哒！(星星眼)', '你是最棒的哒！(竖大拇指)',
          '布布写代码的样子好认真哒 (花痴)', '一二最喜欢你了哒！(抱)',
          '你笑起来真好看哒~ (看呆了)'
        ]), 4000);
        setTimeout(() => {
          if (!pets.bubu) return;
          pets.bubu.showBubble(randPick([
            '...谢谢 (脸红)', '你也很好看哒 (微笑)',
            '嗯，你是最可爱的哒 (轻声)', '别夸了...我会不好意思哒 (低头)'
          ]), 4000);
        }, 1500);
      } else {
        pets.bubu.showBubble(randPick([
          '一二今天很可爱哒 (看)', '你笑起来最好看了哒 (安静)',
          '嗯...你是最特别的哒 (认真)', '有你在真好哒 (微笑)',
          '你很努力了哒 (点头)'
        ]), 4000);
        setTimeout(() => {
          if (!pets.yier) return;
          pets.yier.showBubble(randPick([
            '真的吗哒！(开心蹦跳)', '嘿嘿~ (害羞捂脸)',
            '布布也好棒哒！(拍手)', '一二好开心哒！(转圈)'
          ]), 4000);
        }, 1500);
      }

      if (pets.yier) pets.yier.emitParticles('heart', pets.yier.config.width / 2, 20);
      if (pets.bubu) pets.bubu.emitParticles('heart', pets.bubu.config.width / 2, 20);
      saveDiaryEntry('couple', 'couple', { action: '互相夸夸' });
    }
  }

  // ---- 早安问候 ----
  checkMorningGreeting() {
    if (!pets.yier || !pets.bubu) return;
    const hour = getCurrentHour();
    if (hour < 6 || hour > 9) return;
    if (Date.now() - (this._lastMorningCheck || 0) < 1200000) return;
    if (pets.yier.isSleeping || pets.bubu.isSleeping) return;

    const dist = this.getDistance();
    if (dist > 200) return;

    if (Math.random() < 0.005) {
      this._lastMorningCheck = Date.now();
      this.setCompanionActive(10000);

      pets.yier.showBubble(randPick([
        '早安哒布布~ (伸懒腰)', '新的一天开始啦哒！(精神)',
        '早安早安哒~ (招手)', '一二醒了哒！你也醒了吗~ (揉眼)'
      ]), 4000);
      setTimeout(() => {
        if (!pets.bubu) return;
        pets.bubu.showBubble(randPick([
          '早安哒 (点头)', '嗯，早 (推眼镜)',
          '早安，今天也要加油哒 (微笑)', '嗯...睡好了吗 (关心)'
        ]), 4000);
      }, 1200);
      saveDiaryEntry('couple', 'couple', { action: '早安问候' });
    }
  }

  // ---- 深夜陪伴不睡觉 ----
  checkNightWatch() {
    if (!pets.yier || !pets.bubu) return;
    const hour = getCurrentHour();
    if (hour < 23 && hour > 2) return;
    if (Date.now() - (this._lastNightWatchCheck || 0) < 600000) return;
    if (pets.yier.isSleeping && pets.bubu.isSleeping) return;

    const dist = this.getDistance();
    if (dist > 180) return;

    if (Math.random() < 0.003) {
      this._lastNightWatchCheck = Date.now();
      this.setCompanionActive(25000);

      if (pets.bubu.isSleeping && !pets.yier.isSleeping) {
        pets.yier.body.walkTo(pets.bubu.body.anchorX);
        setTimeout(() => {
          if (!pets.yier || this.getDistance() > 120) return;
          pets.yier.showBubble(randPick([
            '布布睡着了好可爱哒 (安静看)', '晚安布布哒~ (轻轻说)',
            '一二也该睡了哒 (打哈欠)', '帮你盖好被子哒~ (轻手轻脚)'
          ]), 4000);
          saveDiaryEntry('couple', 'couple', { action: '深夜守护' });
        }, 2000);
      } else if (pets.yier.isSleeping && !pets.bubu.isSleeping) {
        pets.bubu.body.walkTo(pets.yier.body.anchorX);
        setTimeout(() => {
          if (!pets.bubu || this.getDistance() > 120) return;
          pets.bubu.showBubble(randPick([
            '一二睡着了 (安静看)', '晚安，做个好梦哒 (轻声)',
            '看着你睡就很安心哒 (微笑)', '嗯...明天见哒 (转身去睡)'
          ]), 4000);
          saveDiaryEntry('couple', 'couple', { action: '深夜守护' });
        }, 2000);
      } else {
        pets.yier.showBubble(randPick([
          '好晚了还不睡吗哒 (打哈欠)', '一二有点困了但是想陪你哒',
          '夜深了好安静哒 (靠紧)', '一起熬夜吧哒~ (精神)'
        ]), 4000);
        setTimeout(() => {
          if (!pets.bubu) return;
          pets.bubu.showBubble(randPick([
            '嗯，再待一会儿哒', '你先睡吧，我看着你哒 (温柔)',
            '夜深了...一起睡吧哒 (牵一二)', '嗯...好安静哒 (安静)'
          ]), 4000);
        }, 1500);
        saveDiaryEntry('couple', 'couple', { action: '深夜聊天' });
      }
    }
  }
}

// =====================================================================
// 第五部分：右键菜单系统
// =====================================================================

let contextMenuEl = null;

function createContextMenu() {
  contextMenuEl = document.createElement('div');
  contextMenuEl.id = 'context-menu';
  document.body.appendChild(contextMenuEl);
}

function showContextMenu(x, y, targetPet) {
  if (!contextMenuEl) return;

  contextMenuEl.innerHTML = '';

  CONTEXT_MENU.forEach(item => {
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'menu-separator';
      contextMenuEl.appendChild(sep);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
      menuItem.textContent = item.label;
      menuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.action === 'feed' || item.action === 'play') {
          handleMenuAction(item.action, targetPet);
        } else {
          hideContextMenu();
          handleMenuAction(item.action, targetPet);
        }
      });
      contextMenuEl.appendChild(menuItem);
    }
  });

  const maxX = window.innerWidth - 180;
  const maxY = window.innerHeight - 300;
  contextMenuEl.style.left = `${Math.min(x, maxX)}px`;
  contextMenuEl.style.top = `${Math.min(y, maxY)}px`;
  contextMenuEl.classList.add('visible');
  menuOpen = true;
  updateMousePassthrough(true);
}

function hideContextMenu() {
  if (contextMenuEl) contextMenuEl.classList.remove('visible');
  menuOpen = false;
  updateMousePassthrough(false);
}

function handleMenuAction(action, targetPet) {
  switch (action) {
    case 'feed':
      showFoodMenu(targetPet);
      return;
    case 'play':
      showToyMenu(targetPet);
      return;
    case 'pet':
      if (targetPet) {
        targetPet.mood = clamp(targetPet.mood + LIFE_CONFIG.petRestore, 0, LIFE_CONFIG.mood.max);
        targetPet.isBeingPetted = true;
        targetPet.petAtLocation(
          targetPet.body.x + targetPet.body.width / 2,
          targetPet.body.y + targetPet.body.height * 0.2
        );
        saveDiaryEntry('pet', targetPet.id);
        setTimeout(() => { targetPet.isBeingPetted = false; }, 2000);
      }
      break;
    case 'status':
      showStatusPanel();
      break;
    case 'diary':
      showDiaryPanel();
      break;
    case 'gif_manager':
      if (window.GifManager) {
        window.GifManager.openPanel();
      }
      break;
    case 'settings':
      if (window.electronAPI) {
        window.electronAPI.showSettings();
      }
      break;
    case 'quit':
      if (window.electronAPI) {
        window.electronAPI.quitApp();
      }
      break;
  }
}

// 显示食物选择子菜单
function showFoodMenu(targetPet) {
  if (!contextMenuEl || !targetPet) return;

  contextMenuEl.innerHTML = '';
  ITEM_CONFIG.foods.forEach(food => {
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.textContent = `${food.emoji} ${food.name}`;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      targetPet.feed(food);
      setTimeout(() => hideContextMenu(), 50);
    });
    contextMenuEl.appendChild(item);
  });

  contextMenuEl.classList.add('visible');
  menuOpen = true;
  updateMousePassthrough(true);
}

// 显示玩具选择子菜单
function showToyMenu(targetPet) {
  if (!contextMenuEl || !targetPet) return;

  contextMenuEl.innerHTML = '';
  ITEM_CONFIG.toys.forEach(toy => {
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.textContent = `${toy.emoji} ${toy.name}`;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      targetPet.play(toy);
      setTimeout(() => hideContextMenu(), 50);
    });
    contextMenuEl.appendChild(item);
  });

  contextMenuEl.classList.add('visible');
  menuOpen = true;
  updateMousePassthrough(true);
}

// =====================================================================
// 第六部分：面板系统（状态、日记、设置）
// =====================================================================

function showStatusPanel() {
  const panel = document.getElementById('status-panel');
  const content = document.getElementById('status-content');
  if (!panel || !content) return;

  let html = buildWeatherHTML();

  for (const [id, pet] of Object.entries(pets)) {
    if (!pet) continue;
    if (currentMode !== 'both' && currentMode !== id) continue;
    const stateLabel = pet.isSleeping ? '💤 睡觉中' : pet.currentState;
    html += `
      <div class="pet-status-card">
        <div class="pet-status-name">${pet.config.name}（${stateLabel}）</div>
        <div class="stat-bar-container">
          <div class="stat-label">🍖 饱腹 ${Math.round(pet.hunger)}%</div>
          <div class="stat-bar"><div class="stat-bar-fill hunger" style="width:${pet.hunger}%"></div></div>
          <div class="stat-label">💕 心情 ${Math.round(pet.mood)}%</div>
          <div class="stat-bar"><div class="stat-bar-fill mood" style="width:${pet.mood}%"></div></div>
          <div class="stat-label">⚡ 精力 ${Math.round(pet.energy)}%</div>
          <div class="stat-bar"><div class="stat-bar-fill energy" style="width:${pet.energy}%"></div></div>
          <div class="stat-label">💗 亲密度 ${pet.affection}</div>
        </div>
      </div>`;
  }

  content.innerHTML = html;
  panel.classList.remove('hidden');
  if (window.electronAPI && window.electronAPI.expandWindowForPanel) {
    window.electronAPI.expandWindowForPanel();
  }
}

async function showDiaryPanel() {
  const panel = document.getElementById('diary-panel');
  const content = document.getElementById('diary-content');
  if (!panel || !content) return;

  let diary = [];
  if (window.electronAPI) {
    diary = await window.electronAPI.loadDiary();
  }

  if (diary.length === 0) {
    content.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">还没有日记记录哦~</div>';
  } else {
    const recent = diary.slice(-50).reverse();
    content.innerHTML = recent.map(entry => `
      <div class="diary-entry">
        <span class="diary-entry-icon">${entry.icon || '📝'}</span>
        <span>${entry.text}</span>
        <span class="diary-entry-time">${entry.timestamp ? formatDate(new Date(entry.timestamp)) : ''}</span>
      </div>
    `).join('');
  }

  panel.classList.remove('hidden');
  if (window.electronAPI && window.electronAPI.expandWindowForPanel) {
    window.electronAPI.expandWindowForPanel();
  }
}

async function showSettingsPanel() {
  if (window.electronAPI) {
    window.electronAPI.showSettings();
  }
}

// 保存日记
function saveDiaryEntry(type, petId, extra = {}) {
  const template = DIARY_EVENTS[type];
  if (!template) return;

  const petName = petId === 'couple' ? '' : (CHARACTER_CONFIG[petId] ? CHARACTER_CONFIG[petId].name : petId);
  let text = template.template
    .replace('{name}', petName)
    .replace('{action}', extra.action || '')
    .replace('{detail}', extra.detail || '');

  if (extra.food) text = text.replace('{food}', extra.food);
  if (extra.toy) text = text.replace('{toy}', extra.toy);
  if (extra.weather) text = text.replace('{weather}', extra.weather);
  if (extra.temp !== undefined) text = text.replace('{temp}', extra.temp);

  const entry = {
    type,
    petId,
    text,
    icon: template.icon
  };

  if (window.electronAPI) {
    window.electronAPI.saveDiary(entry);
  }
}

// =====================================================================
// 第七部分：全局输入处理
// =====================================================================

function setupInputHandlers() {
  const petWorld = document.getElementById('pet-world');
  if (!petWorld) return;

  // 跟踪鼠标位置
  document.addEventListener('mousemove', (e) => {
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = e.clientX;
    mouseY = e.clientY;
    globalMouseVx = mouseX - prevMouseX;
    globalMouseVy = mouseY - prevMouseY;

    for (const pet of Object.values(pets)) {
      if (pet) pet.lastMouseMoveTime = Date.now();
      if (pet && pet.isInactive) pet.isInactive = false;
    }

    // 切换鼠标穿透状态
    const overPet = !!findPetAtPoint(e.clientX, e.clientY);
    updateMousePassthrough(overPet);

    // 拖拽中的宠物跟随鼠标
    for (const pet of Object.values(pets)) {
      if (pet && pet.isDragging) {
        pet.drag(e.clientX, e.clientY);
      }
    }

    // 爱抚检测：鼠标在宠物身上缓慢滑动
    checkPetting(e.clientX, e.clientY);
  });

  // 鼠标按下：开始拖拽（排除菜单和面板区域）
  document.addEventListener('mousedown', (e) => {
    if (menuOpen || e.target.closest('#context-menu') || e.target.closest('.panel')) return;
    const target = findPetAtPoint(e.clientX, e.clientY);
    if (target && e.button === 0) {
      target.startDrag(e.clientX, e.clientY);
    }
  });

  // 鼠标松开：结束拖拽
  document.addEventListener('mouseup', (e) => {
    for (const pet of Object.values(pets)) {
      if (pet && pet.isDragging) {
        pet.endDrag();
      }
    }
  });

  // 右键菜单
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (menuOpen) {
      hideContextMenu();
      return;
    }
    const target = findPetAtPoint(e.clientX, e.clientY);
    showContextMenu(e.clientX, e.clientY, target);
  });

  // 点击空白区域关闭菜单
  document.addEventListener('click', (e) => {
    if (menuOpen && contextMenuEl && !contextMenuEl.contains(e.target)) {
      hideContextMenu();
    }
    if (window.GifManager && window.GifManager.isOpen()) {
      const panel = document.getElementById('gif-panel');
      if (panel && !panel.contains(e.target)) {
        window.GifManager.closePanel();
      }
    }
    if (window.GifStatePanel && window.GifStatePanel.isOpen()) {
      if (!window.GifStatePanel.isSuppressingClose()) {
        const panel = document.getElementById('gif-state-panel');
        if (panel && !panel.contains(e.target)) {
          window.GifStatePanel.closePanel();
        }
      }
    }
  });

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    // F12 打开 DevTools（开发模式）
    if (e.key === 'F12') {
      // Electron 默认支持
    }
    // Esc 关闭面板
    if (e.key === 'Escape') {
      const hadOpenPanel = document.querySelectorAll('.panel:not(.hidden)').length > 0;
      document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
      hideContextMenu();
      if (window.GifManager) window.GifManager.closePanel();
      if (window.GifStatePanel) window.GifStatePanel.closePanel();
      updateMousePassthrough(false);
      if (hadOpenPanel && window.electronAPI && window.electronAPI.restoreWindowAfterPanel) {
        window.electronAPI.restoreWindowAfterPanel();
      }
    }
  });

  // 拖拽文件到宠物身上
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = findPetAtPoint(e.clientX, e.clientY);
    if (target) {
      target.container.classList.add('file-hover');
    }
  });

  document.addEventListener('dragleave', (e) => {
    for (const pet of Object.values(pets)) {
      if (pet) pet.container.classList.remove('file-hover');
    }
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    for (const pet of Object.values(pets)) {
      if (pet) pet.container.classList.remove('file-hover');
    }

    const target = findPetAtPoint(e.clientX, e.clientY);
    if (target && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop().toLowerCase();

      if (['txt', 'md', 'doc', 'docx', 'pdf'].includes(ext)) {
        target.showBubble(target.id === 'yier'
          ? '不能吃哒！(这是文件呀)' : '代码哒？让我看看 (推眼镜)', 3000);
      } else if (['gif'].includes(ext)) {
        handleGifDrop(file, target);
      } else if (['jpg', 'png', 'bmp', 'webp'].includes(ext)) {
        handleImageUpload(file, target);
      } else {
        target.showBubble(target.id === 'yier'
          ? '这是什么哒？(好奇)' : '有趣哒 (研究中)', 3000);
      }
      target.emitParticles('star', target.config.width / 2, target.config.height / 3);
    }
  });
}

// ---- GIF/图片上传处理 ----
function handleGifDrop(file, target) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    if (window.GifManager) {
      window.GifManager.addGif(dataUrl);
    }
  };
  reader.readAsDataURL(file);
}

function showGifNotice(text) {
  for (const pet of Object.values(pets)) {
    if (pet) {
      pet.showBubble(text, 4000);
      pet.emitParticles('heart', pet.config.width / 2, pet.config.height / 3);
      break;
    }
  }
}

function handleImageUpload(file, target) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    if (target) {
      target.showBubble(randPick(target.id === 'yier'
        ? ['看到图片了哒！(开心)', '好看哒~ (惊喜)', '好可爱哒！(拍手)']
        : ['收到图片了哒 (点头)', '不错哒 (看)', '有意思哒 (研究)']
      ), 4000);
      target.emitParticles('star', target.config.width / 2, target.config.height / 3);
    }
  };
  reader.readAsDataURL(file);
}

// 查找鼠标位置下的宠物（增加 15px 边距方便点击）
function findPetAtPoint(x, y) {
  const padding = 15;
  for (const pet of Object.values(pets)) {
    if (!pet) continue;
    const r = pet.body;
    if (x >= r.x - padding && x <= r.x + r.width + padding &&
        y >= r.y - padding && y <= r.y + r.height + padding) {
      return pet;
    }
  }
  return null;
}

// 切换鼠标穿透状态
function updateMousePassthrough(overPet) {
  if (!window.electronAPI) return;
  if (menuOpen) {
    window.electronAPI.setIgnoreMouseEvents(false);
    return;
  }
  if (isPassthrough) {
    window.electronAPI.setIgnoreMouseEvents(true);
    return;
  }
  const anyPanelOpen = document.querySelectorAll('.panel:not(.hidden)').length > 0;
  const gifPanelOpen = document.getElementById('gif-panel') && document.getElementById('gif-panel').classList.contains('visible');
  const gifStatePanelOpen = document.getElementById('gif-state-panel') && document.getElementById('gif-state-panel').classList.contains('visible');
  if (anyPanelOpen || gifPanelOpen || gifStatePanelOpen) {
    window.electronAPI.setIgnoreMouseEvents(false);
    return;
  }
  if (overPet !== mouseIsOverPet) {
    mouseIsOverPet = overPet;
    window.electronAPI.setIgnoreMouseEvents(!overPet);
  }
}

// 爱抚检测
let lastPetX = 0, lastPetY = 0;
let lastPetTarget = null;
function checkPetting(x, y) {
  const dx = x - lastPetX;
  const dy = y - lastPetY;
  const moveDist = Math.sqrt(dx * dx + dy * dy);

  if (moveDist < 5) return;
  lastPetX = x;
  lastPetY = y;

  const target = findPetAtPoint(x, y);
  if (target && !target.isDragging) {
    if (target !== lastPetTarget) {
      lastPetTarget = target;
      target.petStrokeCount = 0;
    }
    target.petStroke(x, y);
    target.checkTickle(x, y);
  } else if (!target) {
    lastPetTarget = null;
  }
}

// =====================================================================
// 第九部分：主循环 & 初始化
// =====================================================================

let lastFrameTime = 0;
let lastSaveTime = 0;

function gameLoop(timestamp) {
  const deltaTime = lastFrameTime ? Math.min(timestamp - lastFrameTime, 100) : 16;
  lastFrameTime = timestamp;

  for (const pet of Object.values(pets)) {
    if (pet) pet.update(deltaTime);
  }

  resolveCollisions();

  if (coupleSystem) {
    coupleSystem.update(deltaTime);
  }

  if (timestamp - lastSaveTime > 30000) {
    lastSaveTime = timestamp;
    for (const pet of Object.values(pets)) {
      if (pet) pet.saveState();
    }
  }

  if (Date.now() - lastWeatherCheck > WEATHER_CONFIG.refreshInterval) {
    fetchWeather();
  }

  updateWeatherEffects();
  updateEnvironmentVisual();
  checkFestivalDecorations();
  updateDeskPlants();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function updateEnvironmentVisual() {
  const hour = getCurrentHour();
  const petWorld = document.getElementById('pet-world');
  if (!petWorld) return;

  if (hour >= 20 || hour < 6) {
    petWorld.classList.add('env-night');
  } else {
    petWorld.classList.remove('env-night');
  }
}

// =====================================================================
// 天气系统
// 从 wttr.in 获取天气数据，联动宠物行为
// =====================================================================

const COLLISION_GAP = 10;
const COLLISION_OVERLAP_TOLERANCE = 2000;

let overlapStartTime = 0;
let isOverlapping = false;

function resolveCollisions() {
  if (!pets.yier || !pets.bubu) return;
  if (currentMode !== 'both') return;
  if (pets.yier.isDragging || pets.bubu.isDragging) return;
  if (!coupleSystem) return;
  if (coupleSystem.currentInteraction || coupleSystem.companionActive) return;

  const a = pets.yier.body;
  const b = pets.bubu.body;
  const overlapX = (a.x < b.x + b.width && a.x + a.width > b.x);
  const overlapY = (a.y < b.y + b.height && a.y + a.height > b.y);

  if (!overlapX || !overlapY) {
    if (isOverlapping) {
      isOverlapping = false;
      overlapStartTime = 0;
    }
    return;
  }

  if (!isOverlapping) {
    isOverlapping = true;
    overlapStartTime = Date.now();
  }

  if (Date.now() - overlapStartTime < COLLISION_OVERLAP_TOLERANCE) return;

  const aCenter = a.x + a.width / 2;
  const bCenter = b.x + b.width / 2;
  const separationSpeed = 1.5;
  const sw = screenInfo ? screenInfo.width : window.innerWidth;

  if (aCenter < bCenter) {
    a.x -= separationSpeed;
    b.x += separationSpeed;
  } else {
    a.x += separationSpeed;
    b.x -= separationSpeed;
  }

  a.x = clamp(a.x, 0, sw - a.width);
  b.x = clamp(b.x, 0, sw - b.width);

  if (!(a.x < b.x + b.width && a.x + a.width > b.x)) {
    isOverlapping = false;
    overlapStartTime = 0;
  }
}

async function fetchWeather() {
  try {
    const url = 'https://wttr.in/?format=j1';
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    const current = data.current_condition && data.current_condition[0];
    if (!current) return null;

    const temp = parseInt(current.temp_C, 10);
    const weatherDesc = current.weatherDesc && current.weatherDesc[0];
    const desc = weatherDesc ? weatherDesc.value.toLowerCase() : '';

    let weatherType = 'default';
    if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower')) weatherType = 'rain';
    else if (desc.includes('snow') || desc.includes('sleet') || desc.includes('blizzard')) weatherType = 'snow';
    else if (desc.includes('cloud') || desc.includes('overcast')) weatherType = 'cloudy';
    else if (temp <= WEATHER_CONFIG.temperatureCold) weatherType = 'cold';
    else if (temp >= WEATHER_CONFIG.temperatureHot) weatherType = 'hot';

    const area = data.nearest_area && data.nearest_area[0];
    const city = area ? (area.areaName[0].value + (area.region && area.region[0].value ? ' ' + area.region[0].value : '')) : '';

    weatherData = {
      temp,
      humidity: parseInt(current.humidity, 10),
      windSpeed: parseInt(current.windspeedKmph, 10),
      desc: weatherDesc ? weatherDesc.value : 'Unknown',
      type: weatherType,
      feelsLike: parseInt(current.FeelsLikeC, 10),
      location: city,
      updatedAt: Date.now()
    };

    lastWeatherCheck = Date.now();
    saveDiaryEntry('weather', 'system', {
      weather: weatherData.desc,
      temp: weatherData.temp
    });

    return weatherData;
  } catch (e) {
    console.log('获取天气失败:', e.message);
    return null;
  }
}

function getWeatherCondition(weatherType) {
  const reactions = WEATHER_CONFIG.weatherReactions;
  return reactions[weatherType] || reactions.default;
}

function triggerWeatherReaction() {
  if (!weatherData) return;

  const reactions = getWeatherCondition(weatherData.type);

  if (pets.yier && reactions.yier) {
    pets.yier.showBubble(randPick(reactions.yier), 6000);
  }
  if (pets.bubu && reactions.bubu) {
    setTimeout(() => {
      if (pets.bubu) pets.bubu.showBubble(randPick(reactions.bubu), 6000);
    }, 2000);
  }
}

function getWeatherEmoji(type) {
  const map = {
    rain: '🌧️', snow: '❄️', cloudy: '☁️',
    cold: '🥶', hot: '🔥', default: '☀️'
  };
  return map[type] || '🌤️';
}

function buildWeatherHTML() {
  if (!weatherData) return '<div class="weather-section"><div class="weather-loading">加载天气中...</div></div>';

  const emoji = getWeatherEmoji(weatherData.type);
  const comfortable = weatherData.temp >= WEATHER_CONFIG.temperatureComfort.low &&
                      weatherData.temp <= WEATHER_CONFIG.temperatureComfort.high;

  return `
    <div class="weather-section">
      <div class="weather-header">
        <span class="weather-emoji">${emoji}</span>
        <span class="weather-temp">${weatherData.temp}°C</span>
        <span class="weather-desc">${weatherData.desc}</span>
      </div>
      <div class="weather-details">
        <span>🌡️ 体感 ${weatherData.feelsLike}°C</span>
        <span>💧 湿度 ${weatherData.humidity}%</span>
        <span>💨 风速 ${weatherData.windSpeed}km/h</span>
      </div>
      <div class="weather-location">📍 ${weatherData.location}</div>
      <div class="weather-comfort ${comfortable ? 'comfortable' : 'uncomfortable'}">
        ${comfortable ? '😊 舒适' : weatherData.type === 'cold' ? '🥶 偏冷，注意保暖' : weatherData.type === 'hot' ? '🥵 偏热，注意防暑' : ''}
      </div>
    </div>
  `;
}

// 全局双宠系统实例
let coupleSystem = null;
let weatherEffectEl = null;
let weatherEffectInterval = null;

function updateWeatherEffects() {
  if (!weatherData) return;
  if (!weatherEffectEl) {
    weatherEffectEl = document.createElement('div');
    weatherEffectEl.id = 'weather-effects';
    weatherEffectEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;overflow:hidden;';
    document.body.appendChild(weatherEffectEl);
  }

  const type = weatherData.type;

  if (type === 'rain' && !weatherEffectInterval) {
    weatherEffectInterval = setInterval(() => {
      if (!weatherEffectEl) return;
      const drop = document.createElement('div');
      drop.style.cssText = `position:absolute;left:${Math.random() * 100}%;top:-10px;width:2px;height:${15 + Math.random() * 15}px;background:linear-gradient(transparent,rgba(120,180,255,0.6));border-radius:0 0 2px 2px;animation:rain-fall ${0.6 + Math.random() * 0.4}s linear forwards;`;
      weatherEffectEl.appendChild(drop);
      setTimeout(() => { if (drop.parentNode) drop.remove(); }, 1200);
    }, 80);
  } else if (type === 'snow' && !weatherEffectInterval) {
    weatherEffectInterval = setInterval(() => {
      if (!weatherEffectEl) return;
      const flake = document.createElement('div');
      const size = 4 + Math.random() * 6;
      flake.textContent = '❄';
      flake.style.cssText = `position:absolute;left:${Math.random() * 100}%;top:-15px;font-size:${size}px;opacity:${0.5 + Math.random() * 0.5};animation:snow-fall ${2 + Math.random() * 3}s linear forwards;`;
      weatherEffectEl.appendChild(flake);
      setTimeout(() => { if (flake.parentNode) flake.remove(); }, 5500);
    }, 200);
  } else if (type !== 'rain' && type !== 'snow') {
    if (weatherEffectInterval) {
      clearInterval(weatherEffectInterval);
      weatherEffectInterval = null;
    }
    if (weatherEffectEl) weatherEffectEl.innerHTML = '';
  }
}

// =====================================================================
// 第四批 D: 环境增强 — 节日装饰 + 桌面植物
// =====================================================================

let festivalCheckDone = {};
let deskPlants = [];
let lastDeskPlantSpawn = 0;

function getCurrentFestival() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  if (FESTIVAL_CONFIG.springFestival.months.includes(month)) return FESTIVAL_CONFIG.springFestival;
  if (month === FESTIVAL_CONFIG.valentine.month && day === FESTIVAL_CONFIG.valentine.day) return FESTIVAL_CONFIG.valentine;
  if (month === FESTIVAL_CONFIG.halloween.month && day === FESTIVAL_CONFIG.halloween.day) return FESTIVAL_CONFIG.halloween;
  if (month === FESTIVAL_CONFIG.christmas.month && day === FESTIVAL_CONFIG.christmas.day) return FESTIVAL_CONFIG.christmas;
  if (month === FESTIVAL_CONFIG.midAutumn.month && day >= 15 && day <= 17) return FESTIVAL_CONFIG.midAutumn;

  return null;
}

function checkFestivalDecorations() {
  const today = todayKey();
  if (festivalCheckDone._day !== today) {
    festivalCheckDone = { _day: today };
  }

  const festival = getCurrentFestival();
  if (!festival) return;
  if (festivalCheckDone.triggered) return;

  festivalCheckDone.triggered = true;

  const overlay = document.getElementById('couple-overlay');
  if (!overlay) return;

  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'festival-emoji';
      el.textContent = randPick(festival.emoji);
      const sw = screenInfo ? screenInfo.width : window.innerWidth;
      const sh = screenInfo ? screenInfo.height : window.innerHeight;
      el.style.cssText = `position:absolute;left:${randInt(20, sw - 20)}px;top:${-20}px;font-size:${14 + randInt(0, 14)}px;pointer-events:none;z-index:255;animation:festival-fall ${3 + Math.random() * 4}s linear forwards;`;
      overlay.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.remove(); }, 8000);
    }, i * 500);
  }

  if (festival.dialogues) {
    setTimeout(() => {
      if (pets.yier && festival.dialogues.yier) {
        pets.yier.showBubble(randPick(festival.dialogues.yier), 5000);
      }
    }, 2000);
    setTimeout(() => {
      if (pets.bubu && festival.dialogues.bubu) {
        pets.bubu.showBubble(randPick(festival.dialogues.bubu), 5000);
      }
    }, 4000);
  }

  saveDiaryEntry('milestone', 'system', { detail: `今天是${festival.name}~` });
}

function updateDeskPlants() {
  const now = Date.now();
  const sw = screenInfo ? screenInfo.width : window.innerWidth;
  const sh = screenInfo ? screenInfo.height : window.innerHeight;

  deskPlants = deskPlants.filter(p => {
    if (now - p.spawnTime > p.lifetime) {
      if (p.el && p.el.parentNode) p.el.remove();
      return false;
    }
    return true;
  });

  if (deskPlants.length >= DESK_PLANT_CONFIG.maxPlants) return;
  if (now - lastDeskPlantSpawn < randInt(DESK_PLANT_CONFIG.spawnInterval[0], DESK_PLANT_CONFIG.spawnInterval[1])) return;

  lastDeskPlantSpawn = now;

  const plant = document.createElement('div');
  plant.className = 'desk-plant';
  const plantEmoji = randPick(DESK_PLANT_CONFIG.plants);
  plant.textContent = plantEmoji;

  const spawnX = randInt(40, sw - 40);
  plant.style.cssText = `position:absolute;left:${spawnX}px;bottom:${randInt(5, 25)}px;font-size:${16 + randInt(0, 8)}px;pointer-events:none;z-index:50;opacity:0;transition:opacity 1s ease;`;

  const petWorld = document.getElementById('pet-world');
  if (petWorld) petWorld.appendChild(plant);
  requestAnimationFrame(() => { plant.style.opacity = '0.7'; });

  const lifetime = randInt(DESK_PLANT_CONFIG.plantLifetime[0], DESK_PLANT_CONFIG.plantLifetime[1]);
  deskPlants.push({
    el: plant,
    spawnTime: now,
    lifetime: lifetime,
    lastWatered: now
  });

  const waterInterval = setInterval(() => {
    if (!plant.parentNode) {
      clearInterval(waterInterval);
      return;
    }

    const water = document.createElement('div');
    water.textContent = randPick(DESK_PLANT_CONFIG.waterEmojis);
    water.style.cssText = `position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:12px;pointer-events:none;animation:float-up 2s ease-out forwards;`;
    plant.appendChild(water);
    setTimeout(() => { if (water.parentNode) water.remove(); }, 2100);
  }, randInt(30000, 60000));

  setTimeout(() => {
    clearInterval(waterInterval);
  }, lifetime);
}

// 初始化应用
async function initApp() {
  // 获取屏幕信息
  screenInfo = { width: window.innerWidth, height: window.innerHeight };
  if (window.electronAPI) {
    try {
      const info = await window.electronAPI.getScreenInfo();
      if (info) screenInfo = info;
    } catch (e) {
      console.log('使用默认屏幕信息');
    }
  }

  // 获取当前模式
  if (window.electronAPI) {
    try {
      currentMode = await window.electronAPI.getPetMode() || 'both';
    } catch (e) {
      currentMode = 'both';
    }
  }

  // 设置地面高度
  const groundY = screenInfo.height;

  const spawnMargin = 120;
  const spawnGap = 60;

  if (currentMode === 'yier' || currentMode === 'both') {
    pets.yier = new Pet('yier');
    pets.yier.body.groundY = groundY;
    pets.yier.body.y = groundY - pets.yier.config.height;
    if (currentMode === 'both') {
      pets.yier.body.x = Math.floor((screenInfo ? screenInfo.width : window.innerWidth) / 2 - pets.yier.config.width - spawnGap);
    } else {
      pets.yier.body.x = Math.floor((screenInfo ? screenInfo.width : window.innerWidth) / 2 - pets.yier.config.width / 2);
    }
    pets.yier.initDOM();
    pets.yier.restoreState();
    pets.yier.container.classList.add('visible-pet');
    pets.yier.showBubble('一二来哒~ ٩(๑❛ᴗ❛๑)۶\n默认穿透模式，右键/点击宠物互动', 3000);
  }

  if (currentMode === 'bubu' || currentMode === 'both') {
    pets.bubu = new Pet('bubu');
    pets.bubu.body.groundY = groundY;
    pets.bubu.body.y = groundY - pets.bubu.config.height;
    if (currentMode === 'both') {
      pets.bubu.body.x = Math.floor((screenInfo ? screenInfo.width : window.innerWidth) / 2 + spawnGap);
    } else {
      pets.bubu.body.x = Math.floor((screenInfo ? screenInfo.width : window.innerWidth) / 2 - pets.bubu.config.width / 2);
    }
    pets.bubu.initDOM();
    pets.bubu.restoreState();
    pets.bubu.container.classList.add('visible-pet');
    pets.bubu.showBubble('布布来哒~ (推眼镜)\n默认穿透模式，右键/托盘菜单', 3000);
  }

  // 双宠模式初始化：设置伴侣引用
  if (currentMode === 'both') {
    pets.yier.partner = pets.bubu;
    pets.bubu.partner = pets.yier;
    coupleSystem = new CoupleSystem();
  }

  // 创建右键菜单
  createContextMenu();

  // 初始化 GIF 管理器
  if (window.GifManager) {
    window.GifManager.init();
  }

  // 初始化 GIF 状态管理面板
  if (window.GifStatePanel) {
    window.GifStatePanel.init();
  }

  // 设置输入处理
  setupInputHandlers();

  // 监听主进程消息
  if (window.electronAPI) {
    window.electronAPI.onSwitchMode((mode) => {
      switchPetMode(mode);
    });

    window.electronAPI.onFullscreenDetected((fs) => {
      isFullscreen = fs;
      const world = document.getElementById('pet-world');
      if (world) {
        if (fs) {
          world.classList.add('pet-world-fullscreen');
        } else {
          world.classList.remove('pet-world-fullscreen');
        }
      }
    });

    window.electronAPI.onShowStatus(() => showStatusPanel());
    window.electronAPI.onShowDiary(() => showDiaryPanel());
    window.electronAPI.onShowSettings(() => showSettingsPanel());
    if (window.electronAPI.onShowGifManager) {
      window.electronAPI.onShowGifManager(() => {
        if (window.GifManager) window.GifManager.openPanel();
      });
    }

    if (window.electronAPI.onShowGifStatePanel) {
      window.electronAPI.onShowGifStatePanel(() => {
        if (window.GifStatePanel) window.GifStatePanel.openPanel();
      });
    }

    if (window.electronAPI.onWindowResized) {
      window.electronAPI.onWindowResized((bounds) => {
        screenInfo = { width: bounds.width, height: bounds.height };
        for (const pet of Object.values(pets)) {
          if (pet) {
            pet.body.groundY = bounds.height;
            pet.body.x = clamp(pet.body.x, 0, bounds.width - pet.config.width);
            pet.body.y = clamp(pet.body.y, 0, bounds.height - pet.config.height);
          }
        }
      });
    }

    window.electronAPI.onToggleFocus((focused) => {
      isFocusMode = focused;
      const world = document.getElementById('pet-world');
      if (world) {
        if (focused) {
          world.classList.add('focus-mode');
        } else {
          world.classList.remove('focus-mode');
        }
      }
    });

    window.electronAPI.onPassthroughChanged((enabled) => {
      isPassthrough = enabled;
      for (const pet of Object.values(pets)) {
        if (pet) pet.isDragging = false;
      }
    });

  }

  // 启动游戏循环
  animationFrameId = requestAnimationFrame(gameLoop);

  // 获取天气
  fetchWeather().then(() => {
    if (weatherData) {
      setTimeout(() => triggerWeatherReaction(), 5000);
    }
  });

  // 记日记
  saveDiaryEntry('milestone', 'system', { detail: '一二与布布启动啦！' });

  console.log('🐾 一二与布布 已启动！');
}

// 切换宠物模式
function switchPetMode(mode) {
  currentMode = mode;

  // 隐藏/显示宠物
  for (const [id, pet] of Object.entries(pets)) {
    if (!pet) continue;
    if (mode === 'both' || mode === id) {
      pet.container.classList.remove('hidden-pet');
      pet.container.classList.add('visible-pet');
    } else {
      pet.container.classList.add('hidden-pet');
      pet.container.classList.remove('visible-pet');
    }
  }

  // 双宠系统
  if (mode === 'both') {
    if (!coupleSystem) coupleSystem = new CoupleSystem();
  } else {
    coupleSystem = null;
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);

window.addEventListener('beforeunload', () => {
  for (const pet of Object.values(pets)) {
    if (pet) pet.saveState();
  }
});
