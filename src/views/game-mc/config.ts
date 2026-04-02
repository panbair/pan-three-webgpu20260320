/**
 * 我的世界儿童打字冒险游戏 - 数据配置
 * 目标年龄：6-10岁
 */

/* ─── 手指颜色映射（帮助儿童用颜色记手指位置）──────────────────── */
export type FingerColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'space'

export interface FingerKey {
  key: string
  finger: string
  color: FingerColor
}

export const fingerMap: Record<string, FingerColor> = {
  // 左手小指
  q: 'red',
  a: 'red',
  z: 'red',
  // 左手无名指
  w: 'orange',
  s: 'orange',
  x: 'orange',
  // 左手中指
  e: 'yellow',
  d: 'yellow',
  c: 'yellow',
  // 左手食指（负责两列）
  r: 'green',
  t: 'green',
  f: 'green',
  g: 'green',
  v: 'green',
  b: 'green',
  // 右手食指（负责两列）
  y: 'cyan',
  u: 'cyan',
  h: 'cyan',
  j: 'cyan',
  n: 'cyan',
  m: 'cyan',
  // 右手中指
  i: 'blue',
  k: 'blue',
  // 右手无名指
  o: 'purple',
  l: 'purple',
  // 右手小指
  p: 'pink',
  // 空格
  ' ': 'space'
}

export const fingerColorHex: Record<FingerColor, string> = {
  red: '#ff6b6b',
  orange: '#ff9f43',
  yellow: '#ffd32a',
  green: '#0be881',
  cyan: '#00d2d3',
  blue: '#48dbfb',
  purple: '#a29bfe',
  pink: '#fd79a8',
  space: '#dfe6e9'
}

export const fingerName: Record<FingerColor, string> = {
  red: '左小指',
  orange: '左无名指',
  yellow: '左中指',
  green: '左食指',
  cyan: '右食指',
  blue: '右中指',
  purple: '右无名指',
  pink: '右小指',
  space: '拇指'
}

/* ─── 键盘布局（用于显示虚拟键盘）──────────────────────────────── */
export const keyboardRows = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
]

/* ─── 关卡配置 ────────────────────────────────────────────────── */
export interface LevelConfig {
  id: number
  name: string
  subtitle: string
  scene: SceneId
  ageRange: string
  description: string
  wordPool: McWord[]
  targetCount: number // 本关需完成数量
  fallSpeed: number // 方块下落速度 px/s（基础值）
  spawnInterval: number // 每隔多少ms生成一个新方块
  maxBlocks: number // 屏幕上最多同时存在方块数
  reward: string // 通关奖励描述
  bgm: string
}

export type SceneId = 'plains' | 'cave' | 'cabin' | 'village' | 'adventure'

export interface SceneConfig {
  id: SceneId
  name: string
  bgGradient: [string, string] // 天空渐变
  groundColor: string
  blockSkin: string // 方块主色
  emoji: string
  description: string
}

export const sceneConfigs: Record<SceneId, SceneConfig> = {
  plains: {
    id: 'plains',
    name: '草地平原',
    bgGradient: ['#87ceeb', '#c8e6c9'],
    groundColor: '#5d8a3c',
    blockSkin: '#5d8a3c',
    emoji: '🌿',
    description: '蓝天白云，绿草如茵'
  },
  cave: {
    id: 'cave',
    name: '矿洞探宝',
    bgGradient: ['#1a1a2e', '#2d3561'],
    groundColor: '#3d2b1f',
    blockSkin: '#7f8c8d',
    emoji: '⛏️',
    description: '幽深矿洞，宝石闪光'
  },
  cabin: {
    id: 'cabin',
    name: '小屋建造',
    bgGradient: ['#f39c12', '#e67e22'],
    groundColor: '#8B6914',
    blockSkin: '#a0522d',
    emoji: '🏠',
    description: '亲手盖房，成就满满'
  },
  village: {
    id: 'village',
    name: '村庄扩建',
    bgGradient: ['#2980b9', '#27ae60'],
    groundColor: '#2c7a1f',
    blockSkin: '#27ae60',
    emoji: '🌻',
    description: '热闹村庄，欢声笑语'
  },
  adventure: {
    id: 'adventure',
    name: '世界探险',
    bgGradient: ['#6c3483', '#1a5276'],
    groundColor: '#4a235a',
    blockSkin: '#8e44ad',
    emoji: '🗺️',
    description: '勇闯天涯，无所不能'
  }
}

/* ─── 我的世界主题词库 ────────────────────────────────────────── */
export interface McWord {
  word: string
  zh: string
  emoji: string
  scene: SceneId
}

// L1: 主行键字母（单字母，每个方块1个字母）
export const level1Words: McWord[] = [
  // 单字母 - 主行键优先
  { word: 'a', zh: 'A键', emoji: '🌱', scene: 'plains' },
  { word: 's', zh: 'S键', emoji: '🌱', scene: 'plains' },
  { word: 'd', zh: 'D键', emoji: '🌱', scene: 'plains' },
  { word: 'f', zh: 'F键', emoji: '🌱', scene: 'plains' },
  { word: 'j', zh: 'J键', emoji: '🌱', scene: 'plains' },
  { word: 'k', zh: 'K键', emoji: '🌱', scene: 'plains' },
  { word: 'l', zh: 'L键', emoji: '🌱', scene: 'plains' },
  { word: 'g', zh: 'G键', emoji: '🌱', scene: 'plains' },
  { word: 'h', zh: 'H键', emoji: '🌱', scene: 'plains' },
  // 扩展到全字母（单字母）
  { word: 'e', zh: 'E键', emoji: '🌿', scene: 'plains' },
  { word: 'r', zh: 'R键', emoji: '🌿', scene: 'plains' },
  { word: 't', zh: 'T键', emoji: '🌿', scene: 'plains' },
  { word: 'y', zh: 'Y键', emoji: '🌿', scene: 'plains' },
  { word: 'u', zh: 'U键', emoji: '🌿', scene: 'plains' },
  { word: 'i', zh: 'I键', emoji: '🌿', scene: 'plains' },
  { word: 'o', zh: 'O键', emoji: '🌿', scene: 'plains' },
  { word: 'p', zh: 'P键', emoji: '🌿', scene: 'plains' },
  { word: 'w', zh: 'W键', emoji: '🌿', scene: 'plains' },
  { word: 'q', zh: 'Q键', emoji: '🌿', scene: 'plains' },
  { word: 'n', zh: 'N键', emoji: '🌿', scene: 'plains' },
  { word: 'm', zh: 'M键', emoji: '🌿', scene: 'plains' },
  { word: 'c', zh: 'C键', emoji: '🌿', scene: 'plains' },
  { word: 'v', zh: 'V键', emoji: '🌿', scene: 'plains' },
  { word: 'b', zh: 'B键', emoji: '🌿', scene: 'plains' },
  { word: 'x', zh: 'X键', emoji: '🌿', scene: 'plains' },
  { word: 'z', zh: 'Z键', emoji: '🌿', scene: 'plains' }
]

// L2: 矿洞 - 2字母组合（每个方块显示2个字母）
export const level2Words: McWord[] = [
  { word: 'di', zh: '挖', emoji: '⛏️', scene: 'cave' },
  { word: 'or', zh: '矿', emoji: '💎', scene: 'cave' },
  { word: 'ge', zh: '宝', emoji: '💎', scene: 'cave' },
  { word: 'co', zh: '煤', emoji: '⚫', scene: 'cave' },
  { word: 'ir', zh: '铁', emoji: '🔩', scene: 'cave' },
  { word: 'go', zh: '金', emoji: '🟡', scene: 'cave' },
  { word: 'ro', zh: '石', emoji: '🪨', scene: 'cave' },
  { word: 'ca', zh: '洞', emoji: '🕳️', scene: 'cave' },
  { word: 'da', zh: '暗', emoji: '🌑', scene: 'cave' },
  { word: 'la', zh: '灯', emoji: '🪔', scene: 'cave' },
  { word: 'ba', zh: '包', emoji: '🎒', scene: 'cave' },
  { word: 'ma', zh: '图', emoji: '🗺️', scene: 'cave' },
  { word: 'at', zh: '蝠', emoji: '🦇', scene: 'cave' },
  { word: 'sa', zh: '沙', emoji: '🏜️', scene: 'cave' },
  { word: 'pi', zh: '镐', emoji: '⛏️', scene: 'cave' },
  { word: 'de', zh: '深', emoji: '🕳️', scene: 'cave' },
  { word: 're', zh: '红', emoji: '🔴', scene: 'cave' },
  { word: 'lu', zh: '岩', emoji: '🌋', scene: 'cave' }
]

// L3: 小屋建造 - 3字母建造主题词
export const level3Words: McWord[] = [
  { word: 'woo', zh: '木', emoji: '🪵', scene: 'cabin' },
  { word: 'sto', zh: '石', emoji: '🪨', scene: 'cabin' },
  { word: 'bri', zh: '砖', emoji: '🧱', scene: 'cabin' },
  { word: 'gla', zh: '玻', emoji: '🪟', scene: 'cabin' },
  { word: 'doo', zh: '门', emoji: '🚪', scene: 'cabin' },
  { word: 'roo', zh: '顶', emoji: '🏠', scene: 'cabin' },
  { word: 'wal', zh: '墙', emoji: '🧱', scene: 'cabin' },
  { word: 'flo', zh: '地', emoji: '⬛', scene: 'cabin' },
  { word: 'pla', zh: '板', emoji: '🪵', scene: 'cabin' },
  { word: 'cra', zh: '制', emoji: '🔨', scene: 'cabin' },
  { word: 'bui', zh: '建', emoji: '🏗️', scene: 'cabin' },
  { word: 'che', zh: '箱', emoji: '📦', scene: 'cabin' },
  { word: 'tab', zh: '桌', emoji: '🪚', scene: 'cabin' },
  { word: 'tor', zh: '火', emoji: '🔥', scene: 'cabin' },
  { word: 'fen', zh: '栏', emoji: '🌿', scene: 'cabin' },
  { word: 'sta', zh: '梯', emoji: '🪜', scene: 'cabin' },
  { word: 'far', zh: '农', emoji: '🌾', scene: 'cabin' },
  { word: 'see', zh: '种', emoji: '🌱', scene: 'cabin' },
  { word: 'tre', zh: '树', emoji: '🌲', scene: 'cabin' },
  { word: 'hom', zh: '家', emoji: '🏡', scene: 'cabin' }
]

// L4: 村庄 - 4字母词
export const level4Words: McWord[] = [
  { word: 'vill', zh: '村', emoji: '🏘️', scene: 'village' },
  { word: 'gard', zh: '花', emoji: '🌸', scene: 'village' },
  { word: 'farm', zh: '农', emoji: '👨‍🌾', scene: 'village' },
  { word: 'trad', zh: '交', emoji: '🪙', scene: 'village' },
  { word: 'chic', zh: '鸡', emoji: '🐔', scene: 'village' },
  { word: 'diam', zh: '钻', emoji: '💎', scene: 'village' },
  { word: 'emer', zh: '绿', emoji: '💚', scene: 'village' },
  { word: 'hars', zh: '收', emoji: '🌾', scene: 'village' },
  { word: 'lant', zh: '灯', emoji: '🏮', scene: 'village' },
  { word: 'shel', zh: '避', emoji: '⛺', scene: 'village' },
  { word: 'sunf', zh: '葵', emoji: '🌻', scene: 'village' },
  { word: 'reds', zh: '红', emoji: '🔴', scene: 'village' },
  { word: 'pump', zh: '南', emoji: '🎃', scene: 'village' },
  { word: 'mons', zh: '怪', emoji: '👾', scene: 'village' },
  { word: 'poti', zh: '药', emoji: '🧪', scene: 'village' },
  { word: 'sadd', zh: '鞍', emoji: '🐴', scene: 'village' },
  { word: 'arro', zh: '箭', emoji: '🏹', scene: 'village' },
  { word: 'shie', zh: '盾', emoji: '🛡️', scene: 'village' },
  { word: 'beac', zh: '信', emoji: '🔵', scene: 'village' },
  { word: 'wate', zh: '水', emoji: '💧', scene: 'village' }
]

// L5: 探险 - 短句（含空格），高难度挑战
export const level5Words: McWord[] = [
  { word: 'go mine', zh: '去挖矿', emoji: '⛏️', scene: 'adventure' },
  { word: 'dig deep', zh: '深挖', emoji: '🕳️', scene: 'adventure' },
  { word: 'find gold', zh: '找金矿', emoji: '🪙', scene: 'adventure' },
  { word: 'build home', zh: '造家园', emoji: '🏡', scene: 'adventure' },
  { word: 'kill creep', zh: '打爬行者', emoji: '💥', scene: 'adventure' },
  { word: 'craft sword', zh: '制作剑', emoji: '⚔️', scene: 'adventure' },
  { word: 'eat bread', zh: '吃面包', emoji: '🍞', scene: 'adventure' },
  { word: 'feed cow', zh: '喂奶牛', emoji: '🐄', scene: 'adventure' },
  { word: 'farm wheat', zh: '种小麦', emoji: '🌾', scene: 'adventure' },
  { word: 'light torch', zh: '点火把', emoji: '🔦', scene: 'adventure' },
  { word: 'swim lake', zh: '湖里游', emoji: '🏊', scene: 'adventure' },
  { word: 'sleep bed', zh: '睡觉', emoji: '😴', scene: 'adventure' },
  { word: 'ride horse', zh: '骑马', emoji: '🐎', scene: 'adventure' },
  { word: 'tame wolf', zh: '驯服狼', emoji: '🐺', scene: 'adventure' },
  { word: 'brew tea', zh: '酿药水', emoji: '🧪', scene: 'adventure' }
]

export const allLevelWords = [level1Words, level2Words, level3Words, level4Words, level5Words]

/* ─── 关卡配置 ────────────────────────────────────────────────── */
export const levelConfigs: LevelConfig[] = [
  {
    id: 1,
    name: '草地启蒙',
    subtitle: '认识键盘 · 种下希望',
    scene: 'plains',
    ageRange: '练气',
    description: '每个方块1个字母，按下对应键消除！',
    wordPool: level1Words,
    targetCount: 20,
    fallSpeed: 50,
    spawnInterval: 3000,
    maxBlocks: 3,
    reward: '🌸 解锁矿洞场景 + 小鸡宠物',
    bgm: 'plains'
  },
  {
    id: 2,
    name: '矿洞探宝',
    subtitle: '挖矿冒险 · 收集宝石',
    scene: 'cave',
    ageRange: '筑基期',
    description: '每个方块2个字母，连续打出完成单词！',
    wordPool: level2Words,
    targetCount: 25,
    fallSpeed: 65,
    spawnInterval: 2600,
    maxBlocks: 4,
    reward: '💎 解锁小屋场景 + 钻石套装',
    bgm: 'cave'
  },
  {
    id: 3,
    name: '小屋建造',
    subtitle: '搭建家园 · 亲手造屋',
    scene: 'cabin',
    ageRange: '结丹期',
    description: '每个方块3个字母，连续打出完成单词！',
    wordPool: level3Words,
    targetCount: 30,
    fallSpeed: 80,
    spawnInterval: 2200,
    maxBlocks: 4,
    reward: '🏠 解锁村庄场景 + 农夫皮肤',
    bgm: 'cabin'
  },
  {
    id: 4,
    name: '村庄扩建',
    subtitle: '建设村庄 · 结交好友',
    scene: 'village',
    ageRange: '元婴期',
    description: '每个方块4个字母，连续打出完成单词！',
    wordPool: level4Words,
    targetCount: 35,
    fallSpeed: 95,
    spawnInterval: 2000,
    maxBlocks: 5,
    reward: '🌻 解锁探险场景 + 英雄披风',
    bgm: 'village'
  },
  {
    id: 5,
    name: '世界探险',
    subtitle: '挑战极限 · 勇者征程',
    scene: 'adventure',
    ageRange: '化神期',
    description: '挑战短句打字，成为打字勇士！',
    wordPool: level5Words,
    targetCount: 25,
    fallSpeed: 110,
    spawnInterval: 1800,
    maxBlocks: 5,
    reward: '🏆 获得 "我的世界打字小勇士" 勋章！',
    bgm: 'adventure'
  }
]

/* ─── 连击奖励配置 ────────────────────────────────────────────── */
export interface ComboReward {
  combo: number
  label: string
  emoji: string
  color: string
}

export const comboRewards: ComboReward[] = [
  { combo: 3, label: '小熟练！', emoji: '⭐', color: '#ffd32a' },
  { combo: 6, label: '超厉害！', emoji: '🌟', color: '#ff9f43' },
  { combo: 10, label: '太棒了！', emoji: '🌈', color: '#0be881' },
  { combo: 15, label: '打字达人！', emoji: '🏆', color: '#48dbfb' },
  { combo: 20, label: '传说勇士！', emoji: '👑', color: '#a29bfe' }
]

/* ─── 方块分数系统 ────────────────────────────────────────────── */
export interface ScoreInfo {
  stars: 3 | 2 | 1
  coin: 'gold' | 'silver' | 'iron'
  label: string
  color: string
}

export function getScore(progress: number): ScoreInfo {
  // progress: 0=落底前完成 / 1=警告区完成 / 2=落底后完成
  if (progress === 0) return { stars: 3, coin: 'gold', label: '完美！', color: '#ffd32a' }
  if (progress === 1) return { stars: 2, coin: 'silver', label: '不错！', color: '#b2bec3' }
  return { stars: 1, coin: 'iron', label: '加油！', color: '#a0522d' }
}

/* ─── 成就/勋章系统 ──────────────────────────────────────────── */
export interface Achievement {
  id: string
  name: string
  emoji: string
  condition: string
}

export const achievements: Achievement[] = [
  { id: 'first_word', name: '第一个词', emoji: '🌱', condition: '打出第一个词' },
  { id: 'combo_5', name: '五连击', emoji: '⭐', condition: '连续打对5个' },
  { id: 'combo_10', name: '十连击', emoji: '🌟', condition: '连续打对10个' },
  { id: 'level1_done', name: '草地冒险家', emoji: '🌿', condition: '完成草地关卡' },
  { id: 'level2_done', name: '矿洞探险家', emoji: '⛏️', condition: '完成矿洞关卡' },
  { id: 'level3_done', name: '建筑大师', emoji: '🏠', condition: '完成小屋关卡' },
  { id: 'level4_done', name: '村庄英雄', emoji: '🌻', condition: '完成村庄关卡' },
  { id: 'level5_done', name: '打字勇士', emoji: '🏆', condition: '完成探险关卡' },
  { id: 'all_gold', name: '完美通关', emoji: '👑', condition: '全程金币通关一关' },
  { id: 'no_error', name: '零失误', emoji: '💎', condition: '一关内无错误' }
]

/* ─── 宠物/收集品 ────────────────────────────────────────────── */
export interface Pet {
  id: string
  name: string
  emoji: string
  unlockAt: string
}

export const pets: Pet[] = [
  { id: 'chicken', name: '小鸡', emoji: '🐔', unlockAt: 'level1_done' },
  { id: 'sheep', name: '小羊', emoji: '🐑', unlockAt: 'combo_5' },
  { id: 'cat', name: '小猫', emoji: '🐱', unlockAt: 'level2_done' },
  { id: 'wolf', name: '小狼', emoji: '🐺', unlockAt: 'level3_done' },
  { id: 'panda', name: '熊猫', emoji: '🐼', unlockAt: 'combo_10' },
  { id: 'dragon', name: '龙', emoji: '🐉', unlockAt: 'level5_done' }
]

/* ─── 进度存储键 ─────────────────────────────────────────────── */
export const STORAGE_KEY_PROGRESS = 'mc-game-progress-v1'

export interface GameProgress {
  unlockedLevels: number[]
  achievements: string[]
  pets: string[]
  bestRecords: Record<number, { stars: number; coins: number; time: number }>
  totalCoins: number
}

export function loadProgress(): GameProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    unlockedLevels: [1],
    achievements: [],
    pets: [],
    bestRecords: {},
    totalCoins: 0
  }
}

export function saveProgress(p: GameProgress) {
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(p))
  } catch {}
}

/* ─── 工具函数 ───────────────────────────────────────────────── */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickWords(pool: McWord[], n: number): McWord[] {
  return shuffle(pool).slice(0, Math.min(n, pool.length))
}

/** 获取单词中第一个未输入字符的手指颜色 */
export function getNextFingerColor(word: string, typed: number): FingerColor | null {
  const ch = word[typed]?.toLowerCase()
  return ch ? (fingerMap[ch] ?? null) : null
}
