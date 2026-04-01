<template>
  <div ref="gameContainer" class="game-2d">
    <!-- 游戏背景 -->
    <div class="game-background" :style="{ backgroundImage: `url(${currentBackground})` }"></div>

    <!-- 游戏UI层 -->
    <div class="game-ui">
      <!-- 顶部信息栏 -->
      <div class="top-bar">
        <div class="info-item">
          <span class="label">分数</span>
          <span class="value score">{{ score }}</span>
        </div>
        <div class="info-item">
          <span class="label">等级</span>
          <span class="value level">{{ level }}</span>
        </div>
        <div class="info-item">
          <span class="label">时间</span>
          <span class="value time">{{ formatTime(timeLeft) }}</span>
        </div>
        <div class="info-item">
          <span class="label">连击</span>
          <span class="value combo">{{ combo }}</span>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${levelProgress}%` }"></div>
      </div>

      <!-- 特殊状态提示 -->
      <div class="status-effects">
        <div v-if="activeEffects.length > 0" class="effects-container">
          <div
            v-for="effect in activeEffects"
            :key="effect.id"
            class="effect-badge"
            :class="effect.type"
          >
            {{ effect.name }}
            <span class="time">{{ effect.timeLeft }}s</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 字母容器 -->
    <div ref="lettersContainer" class="letters-container">
      <div
        v-for="letter in letters"
        :key="letter.id"
        class="letter-item"
        :class="[
          `letter-${letter.type}`,
          {
            falling: letter.isFalling,
            special: letter.isSpecial,
            golden: letter.isGolden,
            'time-bonus': letter.isTimeBonus
          }
        ]"
        :style="{
          left: letter.x + 'px',
          top: letter.y + 'px',
          transform: `scale(${letter.scale}) rotate(${letter.rotation}deg)`,
          zIndex: letter.zIndex
        }"
      >
        <!-- 字母本体 -->
        <div class="letter-3d" :style="{ backgroundImage: `url(${letter.imageUrl})` }">
          <div class="letter-front" :style="{ color: letter.color }">
            <span class="letter-shadow">{{ letter.char }}</span>
            <span class="letter-highlight">{{ letter.char }}</span>
            <span class="letter-text">{{ letter.char }}</span>
          </div>
          <!-- 3D边框效果 -->
          <div class="letter-border" :style="{ borderColor: letter.color }"></div>
          <div class="letter-glow" :style="{ background: letter.color, opacity: 0.3 }"></div>
        </div>
      </div>
    </div>

    <!-- 消除特效容器 -->
    <div ref="effectsContainer" class="effects-container">
      <div
        v-for="effect in eliminationEffects"
        :key="effect.id"
        class="elimination-effect"
        :class="effect.type"
        :style="{
          left: effect.x + 'px',
          top: effect.y + 'px'
        }"
      >
        <!-- 普通字母：星尘爆炸特效 -->
        <template v-if="effect.type === 'normal'">
          <div class="normal-effect">
            <div class="star-burst">
              <div v-for="i in 12" :key="i" class="star"></div>
            </div>
            <div class="sparkles">
              <div v-for="i in 20" :key="i" class="sparkle"></div>
            </div>
            <div class="shockwave"></div>
          </div>
        </template>

        <!-- 金色字母：皇家金色特效 -->
        <template v-if="effect.type === 'golden'">
          <div class="golden-effect">
            <div class="crown-emit">
              <div class="crown"></div>
            </div>
            <div class="gold-shower">
              <div v-for="i in 15" :key="i" class="gold-coin"></div>
            </div>
            <div class="royal-rays">
              <div v-for="i in 6" :key="i" class="ray"></div>
            </div>
            <div class="diamond-spark">
              <div v-for="i in 4" :key="i" class="diamond"></div>
            </div>
          </div>
        </template>

        <!-- 时间字母：时空扭曲特效 -->
        <template v-if="effect.type === 'time-bonus'">
          <div class="time-effect">
            <div class="time-warp">
              <div v-for="i in 3" :key="i" class="clock-ring"></div>
            </div>
            <div class="time-particles">
              <div v-for="i in 12" :key="i" class="time-particle"></div>
            </div>
            <div class="hourglass-emit">
              <div class="hourglass">⏳</div>
            </div>
            <div class="time-dashes">
              <div v-for="i in 8" :key="i" class="dash"></div>
            </div>
          </div>
        </template>

        <div class="effect-text">{{ effect.text }}</div>
      </div>
    </div>

    <!-- 时间+5s特效 -->
    <div v-if="showTimeBonusEffect" class="time-bonus-effect-container">
      <div class="time-bonus-effect">
        <!-- 中央时间符号 -->
        <div class="time-center">
          <div class="time-plus">+5s</div>
          <div class="time-icon">⏰</div>
        </div>

        <!-- 旋转时钟环 -->
        <div class="time-rings">
          <div v-for="i in 4" :key="i" class="time-ring"></div>
        </div>

        <!-- 时光隧道 -->
        <div class="time-tunnel">
          <div v-for="i in 5" :key="i" class="tunnel-layer"></div>
        </div>

        <!-- 时间碎片 -->
        <div class="time-shards">
          <div v-for="i in 16" :key="i" class="shard"></div>
        </div>

        <!-- 流光粒子 -->
        <div class="time-streams">
          <div v-for="i in 8" :key="i" class="stream"></div>
        </div>

        <!-- 闪电效果 -->
        <div class="lightning-bolts">
          <div v-for="i in 6" :key="i" class="bolt"></div>
        </div>
      </div>
    </div>

    <!-- 等级提升特效 -->
    <div v-if="showLevelUpEffect" class="level-up-effect-container">
      <div class="level-up-effect">
        <!-- 中央等级文字 -->
        <div class="level-center">
          <div class="level-text">LEVEL UP!</div>
          <div class="level-number">Lv.{{ level }}</div>
        </div>

        <!-- 星星爆炸 -->
        <div class="star-explosion">
          <div v-for="i in 24" :key="i" class="star">⭐</div>
        </div>

        <!-- 光环扩散 -->
        <div class="glow-rings">
          <div v-for="i in 6" :key="i" class="glow-ring"></div>
        </div>

        <!-- 火箭升空 -->
        <div class="rocket-path">
          <div class="rocket">🚀</div>
          <div v-for="i in 8" :key="i" class="rocket-trail"></div>
        </div>

        <!-- 彩虹光环 -->
        <div class="rainbow-halo">
          <div v-for="i in 12" :key="i" class="halo-segment"></div>
        </div>

        <!-- 金币雨 -->
        <div class="coin-rain">
          <div v-for="i in 20" :key="i" class="coin">💰</div>
        </div>

        <!-- 光束射线 -->
        <div class="light-rays">
          <div v-for="i in 12" :key="i" class="ray"></div>
        </div>

        <!-- 粒子爆炸 -->
        <div class="particle-burst">
          <div v-for="i in 30" :key="i" class="particle"></div>
        </div>
      </div>
    </div>

    <!-- 连击提示 -->
    <div class="combo-display" :class="{ active: combo > 1 }">
      <div class="combo-text">{{ combo }}连击!</div>
      <div class="combo-scale">x{{ comboMultiplier.toFixed(1) }}</div>
    </div>

    <!-- 游戏开始/结束界面 -->
    <div v-if="gameState !== 'playing'" class="game-overlay">
      <div class="overlay-content">
        <!-- Logo和标题 -->
        <div class="logo-section">
          <div class="logo-icon">⌨️</div>
          <h1 v-if="gameState === 'ready'" class="game-title">打字数练习游戏</h1>
          <h1 v-if="gameState === 'ended'" class="game-title game-over">游戏结束</h1>
        </div>

        <!-- 统计数据 -->
        <div v-if="gameState === 'ended'" class="game-stats">
          <div class="stat-card main-stat">
            <div class="stat-icon">🏆</div>
            <div class="stat-info">
              <span class="stat-label">最终分数</span>
              <span class="stat-value">{{ score }}</span>
            </div>
            <div v-if="score > 300" class="stat-icon">你已经无敌！</div>
            <div v-else-if="score > 100" class="stat-icon">你强得可怕！</div>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">⭐</div>
              <div class="stat-info">
                <span class="stat-label">等级</span>
                <span class="stat-value">{{ level }}</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🎯</div>
              <div class="stat-info">
                <span class="stat-label">最高连击</span>
                <span class="stat-value">{{ maxCombo }}</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">✨</div>
              <div class="stat-info">
                <span class="stat-label">消除字母</span>
                <span class="stat-value">{{ totalEliminated }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 开始按钮 -->
        <button class="start-button" @click="startGame">
          <span class="button-icon">{{ gameState === 'ready' ? '🚀' : '🔄' }}</span>
          <span class="button-text">{{ gameState === 'ready' ? '开始游戏' : '再来一局' }}</span>
        </button>

        <!-- 游戏说明 -->
        <div v-if="gameState === 'ready'" class="game-controls">
          <h3 class="controls-title">🎮 游戏说明</h3>
          <div class="controls-grid">
            <div class="control-item an-abc">
              <span class="control-icon">⌨️</span>
              <span>按下对应字母键消除</span>
            </div>
            <div class="control-item golden">
              <span class="control-icon">⭐</span>
              <span>金色字母双倍分数</span>
            </div>
            <div class="control-item time">
              <span class="control-icon">⏰</span>
              <span>时间字母+5秒</span>
            </div>
            <div class="control-item combo">
              <span class="control-icon">🎯</span>
              <span>连击越高倍率越大</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { gsap } from 'gsap'



// 游戏配置
const CONFIG = {
  initialTime: 60, // 初始时间（秒）
  spawnInterval: 2000, // 生成字母间隔（毫秒）
  minSpawnInterval: 800, // 最小生成间隔
  fallSpeed: 1.5, // 下落速度（像素/帧）
  levelUpScore: 100, // 升级所需分数
  comboTimeout: 2000, // 连击超时（毫秒）
  maxComboMultiplier: 5.0, // 最大连击倍率
  specialLetterChance: 0.2, // 特殊字母概率
  goldenLetterChance: 0.1, // 金色字母概率
  timeBonusLetterChance: 0.08, // 时间奖励字母概率
  // 音乐列表
  musicList: [
    'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/1.mp3',
    'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/2.mp3',
    'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/3.mp3',
    'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/4.mp3',
    'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/5.mp3',
    'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/6.mp3',
    'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/7.mp3'
  ],
  // 背景图列表
  backgroundList: Array.from({ length: 17 }, (_, i) =>
    `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/game3/g-v3-${i + 1}.png`
  )
}

// 游戏状态
const gameState = ref<'ready' | 'playing' | 'ended'>('ready')
const score = ref(0)
const level = ref(1)
const timeLeft = ref(CONFIG.initialTime)
const combo = ref(0)
const maxCombo = ref(0)
const totalEliminated = ref(0)
const levelProgress = ref(0)
const currentBackground = ref('')

// 连击倍率
const comboMultiplier = computed(() => {
  const multiplier = 1 + (combo.value - 1) * 0.2
  return Math.min(multiplier, CONFIG.maxComboMultiplier)
})

// 字母颜色配置
const LETTER_COLORS = [
  '#ef4444', // 红色
  '#f97316', // 橙色
  '#fbbf24', // 黄色
  '#a3e635', // 浅绿
  '#22c55e', // 绿色
  '#06b6d4', // 青色
  '#3b82f6', // 蓝色
  '#8b5cf6', // 紫色
  '#d946ef', // 粉紫
  '#f43f5e' // 粉红
]

// 字母数据
interface Letter {
  id: string
  char: string
  x: number
  y: number
  scale: number
  rotation: number
  zIndex: number
  type: string
  isFalling: boolean
  isSpecial: boolean
  isGolden: boolean
  isTimeBonus: boolean
  imageUrl: string
  baseScore: number
  color: string
}

const letters = ref<Letter[]>([])
const eliminationEffects = ref<
  Array<{
    id: string
    x: number
    y: number
    type: string
    text: string
  }>
>([])

// 特殊效果
interface ActiveEffect {
  id: string
  name: string
  type: string
  timeLeft: number
}

const activeEffects = ref<ActiveEffect[]>([])

// 特效显示状态
const showTimeBonusEffect = ref(false)
const showLevelUpEffect = ref(false)

// 音频
let audio: HTMLAudioElement | null = null

// 游戏循环
let gameLoop: number | null = null
let spawnTimer: number | null = null
let comboTimer: number | null = null
let effectTimer: number | null = null

// DOM引用
const gameContainer = ref<HTMLElement | null>(null)
const lettersContainer = ref<HTMLElement | null>(null)
const effectsContainer = ref<HTMLElement | null>(null)

// 字母字符集
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const getTexturePath = () => {
  const randomIndex = Math.floor(Math.random() * 90) + 1
  const url = `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/game1/g-v2-${randomIndex}.png`

  return url
}

// 底部图片URL
const LETTER_IMAGE_URL = 'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/game1/g-v2-1.png'

// 生成唯一ID
const generateId = () => `letter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// 格式化时间
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 创建字母
const createLetter = () => {
  if (gameState.value !== 'playing') return

  const containerWidth = gameContainer.value?.clientWidth || window.innerWidth
  const containerHeight = gameContainer.value?.clientHeight || window.innerHeight

  const isGolden = Math.random() < CONFIG.goldenLetterChance
  const isTimeBonus = !isGolden && Math.random() < CONFIG.timeBonusLetterChance
  const isSpecial = !isGolden && !isTimeBonus && Math.random() < CONFIG.specialLetterChance

  const letter: Letter = {
    id: generateId(),
    char: ALPHABET[Math.floor(Math.random() * ALPHABET.length)] || 'Q',
    x: Math.random() * (containerWidth - 140) + 70,
    y: -60,
    scale: 0,
    rotation: Math.random() * 30 - 15,
    zIndex: 10 + letters.value.length,
    type: isGolden ? 'golden' : isTimeBonus ? 'time' : 'normal',
    isFalling: true,
    isSpecial,
    isGolden,
    isTimeBonus,
    imageUrl: getTexturePath() || LETTER_IMAGE_URL,
    baseScore: isGolden ? 20 : isTimeBonus ? 15 : 10,
    color: LETTER_COLORS[Math.floor(Math.random() * LETTER_COLORS.length)]
  }

  letters.value.push(letter)

  // 入场动画
  gsap.fromTo(
    letter,
    { scale: 0, rotation: -180 },
    {
      scale: 1,
      rotation: letter.rotation,
      duration: 0.6,
      ease: 'elastic.out(1, 0.5)'
    }
  )

  // 脉冲动画
  gsap.to(letter, {
    scale: 1.1,
    duration: 0.8,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    delay: 0.6
  })
}

// 消除字母
const eliminateLetter = (letter: Letter, keyIndex: number) => {
  if (!gameContainer.value) return

  // 计算分数
  let points = letter.baseScore * comboMultiplier.value
  if (letter.isGolden) points *= 2

  // 更新分数和连击
  score.value += Math.floor(points)
  combo.value++
  totalEliminated.value++
  maxCombo.value = Math.max(maxCombo.value, combo.value)

  // 重置连击计时器
  if (comboTimer) clearTimeout(comboTimer)
  comboTimer = window.setTimeout(() => {
    combo.value = 0
  }, CONFIG.comboTimeout)

  // 时间奖励
  if (letter.isTimeBonus) {
    timeLeft.value += 5
    addActiveEffect('时间+5s', 'time-bonus', 3)
    showTimeBonusEffectFn()
  }

  // 更新等级进度
  updateLevelProgress()

  // 创建消除特效
  createEliminationEffect(letter, points)

  // 从数组中移除字母
  const index = letters.value.findIndex(l => l.id === letter.id)
  if (index > -1) {
    letters.value.splice(index, 1)
  }

  // 播放消除音效
  playEliminateSound(letter)
}

// 创建消除特效
const createEliminationEffect = (letter: Letter, points: number) => {
  const effectId = `effect_${Date.now()}`
  const effect = {
    id: effectId,
    x: letter.x,
    y: letter.y,
    type: letter.isGolden ? 'golden' : letter.isTimeBonus ? 'time-bonus' : 'normal',
    text: `+${Math.floor(points)}`
  }

  eliminationEffects.value.push(effect)

  // 等待DOM更新后设置动画
  setTimeout(() => {
    // 普通字母动画设置
    if (effect.type === 'normal') {
      const stars = document.querySelectorAll(`.elimination-effect:last-child .star`)
      stars.forEach((star, i) => {
        gsap.set(star, {
          '--rotation': `${i * 30}deg`
        })
      })

      const sparkles = document.querySelectorAll(`.elimination-effect:last-child .sparkle`)
      sparkles.forEach((sparkle, i) => {
        const angle = (i / 20) * Math.PI * 2
        const distance = 60 + Math.random() * 30
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        gsap.set(sparkle, {
          '--x': `${x}px`,
          '--y': `${y}px`
        })
      })
    }

    // 金色字母动画设置
    if (effect.type === 'golden') {
      const coins = document.querySelectorAll(`.elimination-effect:last-child .gold-coin`)
      coins.forEach((coin, i) => {
        const angle = (i / 15) * Math.PI * 2
        const distance = 40 + Math.random() * 60
        const x = Math.cos(angle) * distance
        gsap.set(coin, {
          '--x': `${x}px`
        })
      })

      const rays = document.querySelectorAll(`.elimination-effect:last-child .royal-rays .ray`)
      rays.forEach((ray, i) => {
        gsap.set(ray, {
          '--rotation': `${i * 60}deg`
        })
      })

      const diamonds = document.querySelectorAll(`.elimination-effect:last-child .diamond`)
      diamonds.forEach((diamond, i) => {
        const angle = (i / 4) * Math.PI * 2
        const distance = 80
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        gsap.set(diamond, {
          '--x': `${x}px`,
          '--y': `${y}px`
        })
      })
    }

    // 时间字母动画设置
    if (effect.type === 'time-bonus') {
      const timeParticles = document.querySelectorAll(
        `.elimination-effect:last-child .time-particle`
      )
      timeParticles.forEach((particle, i) => {
        const angle = (i / 12) * Math.PI * 2
        const distance = 50 + Math.random() * 40
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        gsap.set(particle, {
          '--x': `${x}px`,
          '--y': `${y}px`
        })
      })

      const dashes = document.querySelectorAll(`.elimination-effect:last-child .dash`)
      dashes.forEach((dash, i) => {
        gsap.set(dash, {
          '--rotation': `${i * 45}deg`
        })
      })
    }
  }, 10)

  // 分数文本动画 - 1秒后移除效果
  gsap.to(effect, {
    y: letter.y - 50,
    opacity: 0,
    duration: 1,
    ease: 'power2.out',
    onComplete: () => {
      const effectIndex = eliminationEffects.value.findIndex(e => e.id === effectId)
      if (effectIndex > -1) {
        eliminationEffects.value.splice(effectIndex, 1)
      }
    }
  })
}

// 添加活动效果
const addActiveEffect = (name: string, type: string, duration: number) => {
  const effectId = `active_effect_${Date.now()}`
  const effect: ActiveEffect = {
    id: effectId,
    name,
    type,
    timeLeft: duration
  }

  activeEffects.value.push(effect)

  // 倒计时
  const interval = setInterval(() => {
    effect.timeLeft--
    if (effect.timeLeft <= 0) {
      const index = activeEffects.value.findIndex(e => e.id === effectId)
      if (index > -1) {
        activeEffects.value.splice(index, 1)
      }
      clearInterval(interval)
    }
  }, 1000)
}

// 更新等级进度
const updateLevelProgress = () => {
  const progress = ((score.value % CONFIG.levelUpScore) / CONFIG.levelUpScore) * 100
  levelProgress.value = progress

  // 升级检查
  const newLevel = Math.floor(score.value / CONFIG.levelUpScore) + 1
  if (newLevel > level.value) {
    level.value = newLevel
    addActiveEffect(`等级提升! Lv${level.value}`, 'level-up', 3)
    showLevelUpEffectFn()
  }
}

// 显示时间+5s特效
const showTimeBonusEffectFn = () => {
  if (showTimeBonusEffect.value) return
  showTimeBonusEffect.value = true

  // 2秒后隐藏特效
  setTimeout(() => {
    showTimeBonusEffect.value = false
  }, 2000)
}

// 显示等级提升特效
const showLevelUpEffectFn = () => {
  if (showLevelUpEffect.value) return
  showLevelUpEffect.value = true

  // 2.5秒后隐藏特效
  setTimeout(() => {
    showLevelUpEffect.value = false
  }, 2500)
}

// 播放消除音效
const playEliminateSound = (letter: Letter) => {
  // 使用Web Audio API创建音效
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  // 根据字母类型调整音效
  if (letter.isGolden) {
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1)
  } else if (letter.isTimeBonus) {
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.1)
  } else {
    oscillator.frequency.setValueAtTime(440 + Math.random() * 220, audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1)
  }

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.2)
}

// 游戏主循环
const gameLoopFn = () => {
  if (gameState.value !== 'playing') return

  const containerHeight = gameContainer.value?.clientHeight || window.innerHeight

  // 更新所有字母位置
  letters.value.forEach(letter => {
    if (letter.isFalling) {
      letter.y += CONFIG.fallSpeed * (1 + level.value * 0.1) // 等级越高，下落越快

      // 检查是否超出底部
      if (letter.y > containerHeight + 60) {
        const index = letters.value.findIndex(l => l.id === letter.id)
        if (index > -1) {
          letters.value.splice(index, 1)
          combo.value = 0 // 连击中断
        }
      }
    }
  })

  gameLoop = requestAnimationFrame(gameLoopFn)
}

// 键盘事件处理
const handleKeyDown = (event: KeyboardEvent) => {
  if (gameState.value !== 'playing') return

  const key = event.key.toUpperCase()

  // 查找匹配的字母
  const matchingLetters = letters.value.filter(l => l.char === key)

  if (matchingLetters.length > 0) {
    // 优先消除位置最低的字母
    const lowestLetter = matchingLetters.reduce((a, b) => (a.y > b.y ? a : b))
    eliminateLetter(lowestLetter, matchingLetters.indexOf(lowestLetter))
  }
}

// 开始游戏
const startGame = () => {
  // 随机选择背景图
  const randomBgIndex = Math.floor(Math.random() * CONFIG.backgroundList.length)
  currentBackground.value = CONFIG.backgroundList[randomBgIndex]
  console.log(`使用背景图 #${randomBgIndex + 1}`)

  // 重置游戏状态
  score.value = 0
  level.value = 1
  timeLeft.value = CONFIG.initialTime
  combo.value = 0
  maxCombo.value = 0
  totalEliminated.value = 0
  levelProgress.value = 0
  letters.value = []
  eliminationEffects.value = []
  activeEffects.value = []

  // 清除旧的计时器
  if (gameLoop) cancelAnimationFrame(gameLoop)
  if (spawnTimer) clearTimeout(spawnTimer)
  if (comboTimer) clearTimeout(comboTimer)
  if (effectTimer) clearInterval(effectTimer)

  // 播放背景音乐
  playBackgroundMusic()

  // 设置游戏状态
  gameState.value = 'playing'

  // 开始游戏循环
  gameLoop = requestAnimationFrame(gameLoopFn)

  // 开始生成字母
  const spawnLetter = () => {
    if (gameState.value === 'playing') {
      createLetter()
      const interval = Math.max(CONFIG.minSpawnInterval, CONFIG.spawnInterval - level.value * 100)
      spawnTimer = window.setTimeout(spawnLetter, interval)
    }
  }
  spawnLetter()

  // 开始时间倒计时
  effectTimer = window.setInterval(() => {
    if (gameState.value === 'playing') {
      timeLeft.value--
      if (timeLeft.value <= 0) {
        endGame()
      }
    }
  }, 1000)
}

// 结束游戏
const endGame = () => {
  gameState.value = 'ended'

  // 清理计时器
  if (gameLoop) {
    cancelAnimationFrame(gameLoop)
    gameLoop = null
  }
  if (spawnTimer) {
    clearTimeout(spawnTimer)
    spawnTimer = null
  }
  if (comboTimer) {
    clearTimeout(comboTimer)
    comboTimer = null
  }
  if (effectTimer) {
    clearInterval(effectTimer)
    effectTimer = null
  }

  // 停止背景音乐
  stopBackgroundMusic()
}

// 播放背景音乐
const playBackgroundMusic = () => {
  if (audio) {
    audio.pause()
    audio.currentTime = 0
  }

  // 随机选择一首音乐
  const randomIndex = Math.floor(Math.random() * CONFIG.musicList.length)
  const randomMusic = CONFIG.musicList[randomIndex]
  console.log(`播放背景音乐 #${randomIndex + 1}`)

  audio = new Audio(randomMusic)
  audio.loop = true
  audio.volume = 0.3

  audio.play().catch(err => {
    console.log('背景音乐播放失败:', err)
  })
}

// 停止背景音乐
const stopBackgroundMusic = () => {
  if (audio) {
    audio.pause()
    audio.currentTime = 0
    audio = null
  }
}

// 组件挂载
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

// 组件卸载
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)

  if (gameLoop) cancelAnimationFrame(gameLoop)
  if (spawnTimer) clearTimeout(spawnTimer)
  if (comboTimer) clearTimeout(comboTimer)
  if (effectTimer) clearInterval(effectTimer)

  stopBackgroundMusic()

  // 清理所有GSAP动画
  gsap.killTweensOf('*')
})
</script>

<style scoped lang="scss">
.game-2d {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 30%, #fce7f3 60%, #dbeafe 100%);
}

.game-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  pointer-events: none;
  transition: background-image 0.5s ease-in-out;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image:
      radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.8) 0%, transparent 3%),
      radial-gradient(circle at 40% 70%, rgba(255, 255, 255, 0.6) 0%, transparent 2%),
      radial-gradient(circle at 60% 20%, rgba(255, 255, 255, 0.7) 0%, transparent 2.5%),
      radial-gradient(circle at 80% 60%, rgba(255, 255, 255, 0.5) 0%, transparent 2%);
    animation: twinkle 3s ease-in-out infinite;
  }
}

.game-ui {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  pointer-events: none;
}

.top-bar {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 12px 20px;
  //background: linear-gradient(180deg,
  //  rgba(255, 255, 255, 0.95) 0%,
  //  rgba(255, 255, 255, 0.85) 100%);
  backdrop-filter: blur(15px);
  border-bottom: 4px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: 0 0 8px 8px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 4px;
    background: linear-gradient(
      90deg,
      #fbbf24 0%,
      #f472b6 25%,
      #a855f7 50%,
      #3b82f6 75%,
      #34d399 100%
    );
    border-radius: 0 0 4px 4px;
  }
}

.info-item {
  text-align: center;
  position: relative;
  padding: 12px 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.75) 100%);
  border-radius: 22px;
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.1),
    inset 0 3px 0 rgba(255, 255, 255, 1),
    0 0 0 3px rgba(255, 255, 255, 0.8);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-width: 95px;

  &:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.15),
      inset 0 3px 0 rgba(255, 255, 255, 1),
      0 0 0 3px rgba(255, 255, 255, 0.9);
  }

  .label {
    display: block;
    font-size: 12px;
    font-weight: 800;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }

  .value {
    display: block;
    font-size: 32px;
    font-weight: 900;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    line-height: 1;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 4px;
    background: currentColor;
    border-radius: 2px;
    opacity: 0.6;
  }

  &.score {
    background: linear-gradient(135deg, #fef9c3 0%, #fef08a 50%, #fde047 100%);
    border-color: #fbbf24;
    .label {
      color: #92400e;
    }
    .value {
      color: #fff;
      text-shadow: 0 3px 8px rgba(251, 191, 36, 0.5);
    }
    &::after {
      background: #fbbf24;
    }
  }

  &.level {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%);
    border-color: #60a5fa;
    .label {
      color: #1e40af;
    }
    .value {
      color: #fff;
      text-shadow: 0 3px 8px rgba(96, 165, 250, 0.5);
    }
    &::after {
      background: #60a5fa;
    }
  }

  &.time {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%);
    border-color: #34d399;
    .label {
      color: #065f46;
    }
    .value {
      color: #fff;
      text-shadow: 0 3px 8px rgba(52, 211, 153, 0.5);
    }
    &::after {
      background: #34d399;
    }
  }

  &.combo {
    background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #f9a8d4 100%);
    border-color: #f472b6;
    .label {
      color: #be185d;
    }
    .value {
      color: #fff;
      text-shadow: 0 3px 8px rgba(244, 114, 182, 0.5);
    }
    &::after {
      background: #f472b6;
    }
  }
}

.progress-bar {
  height: 12px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.6) 0%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 0.6) 100%
  );
  margin: 10px 25px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.05),
    0 2px 8px rgba(0, 0, 0, 0.08);
  border: 3px solid rgba(255, 255, 255, 0.8);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    #f472b6 0%,
    #a855f7 25%,
    #6366f1 50%,
    #3b82f6 75%,
    #0ea5e9 100%
  );
  background-size: 200% 100%;
  transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: progressGradient 3s ease infinite;
  box-shadow: 0 0 20px rgba(244, 114, 182, 0.6);
  border-radius: 7px;
}

.status-effects {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 12px;
}

.effects-container {
  display: flex;
  gap: 10px;
}

.effect-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 15px;
  font-weight: 800;
  animation: badgeBounce 1.2s ease-in-out infinite;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  border: 3px solid rgba(255, 255, 255, 0.6);

  &.time-bonus {
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    color: white;
    text-shadow: 0 2px 4px rgba(16, 185, 129, 0.4);
  }

  &.level-up {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: white;
    text-shadow: 0 2px 4px rgba(245, 158, 11, 0.4);
  }

  .time {
    font-size: 13px;
    font-weight: 700;
    opacity: 1;
    background: rgba(255, 255, 255, 0.25);
    padding: 2px 8px;
    border-radius: 12px;
  }
}

.letters-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.letter-item {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: center center;
  cursor: default;

  &.golden {
    .letter-3d .letter-front {
      background: linear-gradient(
        135deg,
        rgba(251, 191, 36, 0.1) 0%,
        rgba(252, 211, 77, 0.1) 50%,
        rgba(245, 158, 11, 0.1) 100%
      );
      border: 4px solid rgba(255, 255, 255, 0.8);
      text-shadow: 0 0 30px rgba(251, 191, 36, 0.9);
      animation: goldenShine 1s ease-in-out infinite;
    }
  }

  &.time-bonus {
    .letter-3d .letter-front {
      background: linear-gradient(
        135deg,
        rgba(16, 185, 129, 0.1) 0%,
        rgba(52, 211, 153, 0.1) 50%,
        rgba(5, 150, 105, 0.1) 100%
      );
      border: 4px solid rgba(255, 255, 255, 0.8);
      text-shadow: 0 0 30px rgba(52, 211, 153, 0.9);
      animation: timeGlow 1s ease-in-out infinite;
    }
  }
}

.letter-3d {
  position: relative;
  margin-bottom: 10px;
  perspective: 1000px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 25px;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.15));
}

.letter-front {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50px;
  font-weight: 900;
  color: white;
  border-radius: 25px;
  transform: translateZ(10px);
  animation: letterBounce 1.5s ease-in-out infinite;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.2) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(0, 0, 0, 0.05) 100%
  );
  border: 4px solid rgba(255, 255, 255, 0.6);
  z-index: 10;
  overflow: hidden;

  /* 3D浮雕效果 */
  box-shadow:
    0 15px 35px rgba(0, 0, 0, 0.3),
    0 8px 15px rgba(0, 0, 0, 0.2),
    inset 0 2px 0 rgba(255, 255, 255, 0.5),
    inset 0 -2px 0 rgba(0, 0, 0, 0.15),
    inset 0 0 20px rgba(255, 255, 255, 0.2);
}

/* 字母文字层 */
.letter-text {
  position: absolute;
  font-family: 'Arial Black', 'Helvetica Black', sans-serif;
  z-index: 3;
  text-shadow:
    3px 3px 0 rgba(0, 0, 0, 0.3),
    -1px -1px 0 rgba(255, 255, 255, 0.3),
    2px 2px 8px rgba(0, 0, 0, 0.4);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

/* 字母高光层 */
.letter-highlight {
  position: absolute;
  font-family: 'Arial Black', 'Helvetica Black', sans-serif;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  z-index: 4;
  clip-path: polygon(0 0, 100% 0, 100% 40%, 0 40%);
  opacity: 0.8;
}

/* 字母阴影层 */
.letter-shadow {
  position: absolute;
  font-family: 'Arial Black', 'Helvetica Black', sans-serif;
  color: rgba(0, 0, 0, 0.4);
  z-index: 1;
  transform: translate(4px, 4px);
  filter: blur(1px);
}

/* 3D边框装饰 */
.letter-border {
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
  border-radius: 33px;
  border: 3px solid;
  opacity: 0.4;
  z-index: 5;
  pointer-events: none;
  box-shadow:
    0 0 15px currentColor,
    0 0 30px currentColor;
  animation: borderPulse 2s ease-in-out infinite;
}

/* 字母光晕效果 */
.letter-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 150px;
  height: 150px;
  border-radius: 50%;
  z-index: 0;
  pointer-events: none;
  filter: blur(40px);
  animation: glowPulse 3s ease-in-out infinite;
}

.letter-side {
  position: absolute;
  width: 60px;
  height: 60px;
  background: linear-gradient(180deg, #764ba2, #667eea);
  border-radius: 12px;
  transform: translateZ(-5px);
  opacity: 0.6;
}

.letter-shadow {
  position: absolute;
  width: 60px;
  height: 20px;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.3) 0%, transparent 70%);
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  animation: shadowPulse 2s ease-in-out infinite;
}

.effects-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 50;
}

.elimination-effect {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

// ==================== 普通字母：星尘爆炸特效 ====================
.normal-effect {
  position: relative;
  width: 200px;
  height: 200px;
}

.star-burst {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;

  .star {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4px;
    height: 20px;
    background: linear-gradient(180deg, #60a5fa, #3b82f6);
    transform-origin: center;
    border-radius: 2px;
    box-shadow:
      0 0 10px #60a5fa,
      0 0 20px #3b82f6;
    animation: starShoot 0.8s ease-out infinite;
  }

  @for $i from 1 through 12 {
    .star:nth-child(#{$i}) {
      --rotation: #{$i * 30deg};
      animation-delay: #{$i * 0.05s};
    }
  }
}

.sparkles {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;

  .sparkle {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    background: white;
    border-radius: 50%;
    box-shadow:
      0 0 8px #60a5fa,
      0 0 16px #3b82f6;
    animation: sparkleFloat 1s ease-out infinite;
  }

  @for $i from 1 through 20 {
    .sparkle:nth-child(#{$i}) {
      animation-delay: $i * 0.03s;
    }
  }
}

.shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border: 4px solid #60a5fa;
  border-radius: 50%;
  animation: shockwaveExpand 1.2s ease-out infinite;
}

// ==================== 金色字母：皇家金色特效 ====================
.golden-effect {
  position: relative;
  width: 250px;
  height: 250px;
}

.crown-emit {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;

  .crown {
    font-size: 40px;
    animation: crownFloat 1s ease-out infinite;
  }
}

.gold-shower {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;

  .gold-coin {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 12px;
    height: 12px;
    background: radial-gradient(circle, #fcd34d, #f59e0b);
    border-radius: 50%;
    box-shadow:
      0 0 10px #fcd34d,
      0 0 20px #f59e0b;
    animation: coinFall 1.5s ease-in infinite;
  }

  @for $i from 1 through 15 {
    .gold-coin:nth-child(#{$i}) {
      animation-delay: #{$i * 0.08s};
    }
  }
}

.royal-rays {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;

  .ray {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 100px;
    background: linear-gradient(180deg, #fcd34d, transparent);
    transform-origin: center bottom;
    animation: royalRayPulse 2s ease-in-out infinite;
  }

  @for $i from 1 through 6 {
    .ray:nth-child(#{$i}) {
      --rotation: #{$i * 60deg};
      animation-delay: #{$i * 0.2s};
    }
  }
}

.diamond-spark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;

  .diamond {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, #fcd34d, #fbbf24, #f59e0b);
    transform: rotate(45deg);
    box-shadow:
      0 0 20px #fcd34d,
      0 0 40px #fbbf24;
    animation: diamondSpin 1s ease-out infinite;
  }

  @for $i from 1 through 4 {
    .diamond:nth-child(#{$i}) {
      animation-delay: #{$i * 0.15s};
    }
  }
}

// ==================== 时间字母：时空扭曲特效 ====================
.time-effect {
  position: relative;
  width: 200px;
  height: 200px;
}

.time-warp {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;

  .clock-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 3px dashed #34d399;
    animation: clockSpin 2s linear infinite;
  }

  @for $i from 1 through 3 {
    .clock-ring:nth-child(#{$i}) {
      width: #{60 + $i * 40}px;
      height: #{60 + $i * 40}px;
      animation-duration: #{2 + $i * 0.5}s;
      animation-direction: #{if($i % 2 == 0, 'normal', 'reverse')};
    }
  }
}

.time-particles {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;

  .time-particle {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    background: #34d399;
    border-radius: 50%;
    box-shadow: 0 0 15px #34d399;
    animation: timeParticle 1.5s ease-in-out infinite;
  }

  @for $i from 1 through 12 {
    .time-particle:nth-child(#{$i}) {
      animation-delay: $i * 0.1s;
    }
  }
}

.hourglass-emit {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;

  .hourglass {
    font-size: 36px;
    animation: hourglassFlip 1.2s ease-in-out infinite;
  }
}

.time-dashes {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 160px;
  height: 160px;

  .dash {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 4px;
    background: #34d399;
    transform-origin: center;
    animation: dashExpand 1s ease-out infinite;
  }

  @for $i from 1 through 8 {
    .dash:nth-child(#{$i}) {
      --rotation: #{$i * 45deg};
      animation-delay: #{$i * 0.08s};
    }
  }
}

// ==================== 分数文本 ====================
.effect-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 42px;
  font-weight: 900;
  letter-spacing: 2px;
  white-space: nowrap;
  z-index: 100;
}

.elimination-effect.golden .effect-text {
  background: linear-gradient(135deg, #fcd34d 0%, #fbbf24 50%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.8));
  animation: goldenTextGlow 1s ease-out infinite;
}

.elimination-effect.time-bonus .effect-text {
  background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 20px rgba(52, 211, 153, 0.8));
  animation: timeTextGlow 1s ease-out infinite;
}

.elimination-effect.normal .effect-text {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 20px rgba(96, 165, 250, 0.8));
  animation: normalTextGlow 1s ease-out infinite;
}

// 分数文本
.effect-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 42px;
  font-weight: 900;
  letter-spacing: 2px;
  white-space: nowrap;
  text-shadow:
    0 0 10px currentColor,
    0 0 20px currentColor,
    0 0 30px currentColor,
    0 4px 8px rgba(0, 0, 0, 0.3);
}

.elimination-effect.golden .effect-text {
  background: linear-gradient(135deg, #fcd34d 0%, #fbbf24 50%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.8));
  animation: goldenTextGlow 1s ease-out infinite;
}

.elimination-effect.time-bonus .effect-text {
  background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 0 20px rgba(52, 211, 153, 0.8));
  animation: timeTextGlow 1s ease-out infinite;
}

.elimination-effect.normal .effect-text {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 0 20px rgba(96, 165, 250, 0.8));
  animation: normalTextGlow 1s ease-out infinite;
}

.combo-display {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 200;

  &.active {
    opacity: 1;
    animation: comboAppear 0.5s ease-out;
  }
}

.combo-text {
  font-size: 48px;
  font-weight: bold;
  color: #f472b6;
  text-shadow:
    0 0 20px rgba(244, 114, 182, 0.8),
    0 4px 8px rgba(0, 0, 0, 0.5);
}

.combo-scale {
  font-size: 24px;
  color: #fbbf24;
  margin-top: 8px;
}

.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(255, 251, 235, 0.2) 0%,
    rgba(254, 243, 199, 0.2) 30%,
    rgba(252, 231, 243, 0.2) 60%,
    rgba(219, 234, 254, 0.2) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  backdrop-filter: blur(20px);
  animation: fadeIn 0.5s ease-out;
}

.overlay-content {
  text-align: center;
  color: #1e293b;
  width: 600px;
  max-width: 90vw;
  background: rgba(255, 255, 255, 0.95);
  padding: 45px;
  border-radius: 35px;
  box-sizing: border-box;
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.15),
    0 0 80px rgba(99, 102, 241, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 1),
    0 0 0 8px rgba(255, 255, 255, 0.8);
  animation: slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.logo-section {
  margin-bottom: 35px;

  .logo-icon {
    font-size: 72px;
    margin-bottom: 12px;
    animation: logoBounce 1.5s ease-in-out infinite;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.1));
  }
}

.game-title {
  font-size: 48px;
  font-weight: 900;
  margin: 0 0 25px 0;
  background: linear-gradient(
    135deg,
    #f472b6 0%,
    #a855f7 25%,
    #6366f1 50%,
    #3b82f6 75%,
    #0ea5e9 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: titleGradient 4s ease infinite;
  text-shadow: none;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));

  &.game-over {
    background: linear-gradient(
      135deg,
      #f87171 0%,
      #fb923c 25%,
      #fbbf24 50%,
      #34d399 75%,
      #22d3d1 100%
    );
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
  }
}

.game-stats {
  margin-bottom: 35px;
}

.main-stat {
  background: linear-gradient(135deg, #fef08a 0%, #fcd34d 50%, #f59e0b 100%);
  border: 4px solid rgba(255, 255, 255, 0.8);
  margin-bottom: 25px;
  padding: 30px;
  display: flex;
  align-items: center;
  gap: 25px;
  border-radius: 25px;
  box-shadow:
    0 15px 35px rgba(251, 191, 36, 0.3),
    inset 0 4px 0 rgba(255, 255, 255, 0.4);

  .stat-icon {
    font-size: 56px;
    animation: trophyWiggle 1.2s ease-in-out infinite;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  }

  .stat-info {
    flex: 1;
    text-align: left;

    .stat-label {
      font-size: 14px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .stat-value {
      font-size: 64px;
      font-weight: 900;
      color: #78350f;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.stat-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  padding: 25px 18px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 3px solid rgba(255, 255, 255, 0.8);
  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.08),
    inset 0 2px 0 rgba(255, 255, 255, 1);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    transform: translateY(-5px) scale(1.05);
    box-shadow:
      0 15px 35px rgba(0, 0, 0, 0.12),
      inset 0 2px 0 rgba(255, 255, 255, 1);
  }

  .stat-icon {
    font-size: 38px;
    margin-bottom: 10px;
    display: block;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }

  .stat-info {
    display: block;

    .stat-label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .stat-value {
      display: block;
      font-size: 32px;
      font-weight: 900;
      color: #1e293b;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
  }
}

.start-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 22px 80px;
  font-size: 24px;
  font-weight: 900;
  color: white;
  background: linear-gradient(135deg, #f472b6 0%, #a855f7 50%, #6366f1 100%);
  border: 4px solid rgba(255, 255, 255, 0.8);
  border-radius: 60px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow:
    0 12px 30px rgba(168, 85, 247, 0.4),
    inset 0 4px 0 rgba(255, 255, 255, 0.3);
  margin: 0 auto 35px;
  width: 100%;
  max-width: 320px;
  text-transform: uppercase;
  letter-spacing: 2px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    animation: buttonShine 2s ease-in-out infinite;
  }

  &:hover {
    transform: translateY(-5px) scale(1.05);
    box-shadow:
      0 20px 45px rgba(168, 85, 247, 0.5),
      inset 0 4px 0 rgba(255, 255, 255, 0.3);
  }

  &:active {
    transform: translateY(-2px) scale(1.02);
  }

  .button-icon {
    font-size: 28px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }

  .button-text {
    font-size: 20px;
    font-weight: 900;
  }
}

.game-controls {
  margin-top: 35px;

  .controls-title {
    font-size: 24px;
    font-weight: 800;
    margin-bottom: 25px;
    background: linear-gradient(135deg, #f472b6 0%, #a855f7 50%, #6366f1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: titleGradient 4s ease infinite;
    background-size: 200% 100%;
  }
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.control-item {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  padding: 18px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 3px solid rgba(255, 255, 255, 0.8);
  box-shadow:
    0 6px 15px rgba(0, 0, 0, 0.05),
    inset 0 2px 0 rgba(255, 255, 255, 1);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  font-size: 14px;
  font-weight: 600;
  color: #475569;

  &:hover {
    transform: translateY(-4px) scale(1.03);
    box-shadow:
      0 12px 25px rgba(0, 0, 0, 0.08),
      inset 0 2px 0 rgba(255, 255, 255, 1);
  }
  &.an-abc {
    border-color: #5bcde7;
    background: linear-gradient(135deg, #67d3c3 0%, #6ecce1 100%);
  }

  &.golden {
    border-color: rgba(251, 191, 36, 0.5);
    background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%);
  }

  &.time {
    border-color: rgba(52, 211, 153, 0.5);
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  }

  &.combo {
    border-color: rgba(244, 114, 182, 0.5);
    background: linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 100%);
  }

  .control-icon {
    font-size: 26px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08));
  }
}

// ==================== 普通字母动画 ====================
@keyframes starShoot {
  0% {
    transform: rotate(var(--rotation, 0deg)) translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: rotate(var(--rotation, 0deg)) translateY(-100px) scale(0.5);
    opacity: 0;
  }
}

@keyframes sparkleFloat {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  50% {
    transform: translate(var(--x, 0), var(--y, 0)) scale(1.5);
    opacity: 0.8;
  }
  100% {
    transform: translate(calc(var(--x, 0) * 1.5), calc(var(--y, 0) * 1.5)) scale(0);
    opacity: 0;
  }
}

@keyframes shockwaveExpand {
  0% {
    width: 20px;
    height: 20px;
    opacity: 1;
  }
  100% {
    width: 200px;
    height: 200px;
    opacity: 0;
  }
}

// ==================== 金色字母动画 ====================
@keyframes crownFloat {
  0% {
    transform: translateY(0) scale(0);
    opacity: 0;
  }
  20% {
    transform: translateY(-20px) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translateY(-80px) scale(0.8);
    opacity: 0;
  }
}

@keyframes coinFall {
  0% {
    transform: translate(-50%, -50%) translateY(-50px) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate(var(--x, 0), 100px) rotate(360deg);
    opacity: 0;
  }
}

@keyframes royalRayPulse {
  0%,
  100% {
    opacity: 0.3;
    transform: rotate(var(--rotation, 0deg)) translateY(-50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: rotate(var(--rotation, 0deg)) translateY(-50%) scale(1.2);
  }
}

@keyframes diamondSpin {
  0% {
    transform: translate(-50%, -50%) rotate(0deg) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--x, 0)), calc(-50% + var(--y, 0))) rotate(360deg) scale(0);
    opacity: 0;
  }
}

// ==================== 时间字母动画 ====================
@keyframes clockSpin {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes timeParticle {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  50% {
    transform: translate(var(--x, 0), var(--y, 0)) scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: translate(calc(var(--x, 0) * 1.3), calc(var(--y, 0) * 1.3)) scale(0);
    opacity: 0;
  }
}

@keyframes hourglassFlip {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(180deg) scale(1.2);
  }
  75% {
    transform: rotate(360deg) scale(1.2);
  }
}

@keyframes dashExpand {
  0% {
    transform: rotate(var(--rotation, 0deg)) translateY(-50px) scaleX(0);
    opacity: 1;
  }
  100% {
    transform: rotate(var(--rotation, 0deg)) translateY(-50px) scaleX(2);
    opacity: 0;
  }
}

// ==================== 新增儿童风格动画 ====================
@keyframes twinkle {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes badgeBounce {
  0%,
  100% {
    transform: scale(1) translateY(0);
  }
  50% {
    transform: scale(1.08) translateY(-3px);
  }
}

@keyframes progressGradient {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes letterBounce {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.05);
  }
}

@keyframes goldenShine {
  0%,
  100% {
    filter: brightness(1) saturate(1);
  }
  50% {
    filter: brightness(1.3) saturate(1.2);
  }
}

@keyframes timeGlow {
  0%,
  100% {
    filter: brightness(1) saturate(1);
    box-shadow:
      0 8px 20px rgba(0, 0, 0, 0.15),
      inset 0 4px 0 rgba(255, 255, 255, 0.4),
      0 0 30px rgba(52, 211, 153, 0.6);
  }
  50% {
    filter: brightness(1.2) saturate(1.1);
    box-shadow:
      0 8px 20px rgba(0, 0, 0, 0.15),
      inset 0 4px 0 rgba(255, 255, 255, 0.4),
      0 0 50px rgba(52, 211, 153, 0.9);
  }
}

@keyframes logoBounce {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-15px) rotate(-5deg);
  }
  75% {
    transform: translateY(-5px) rotate(5deg);
  }
}

@keyframes titleGradient {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes trophyWiggle {
  0%,
  100% {
    transform: rotate(-8deg);
  }
  50% {
    transform: rotate(8deg);
  }
}

@keyframes buttonShine {
  0% {
    left: -100%;
  }
  100% {
    left: 200%;
  }
}

// ==================== 文本动画 ====================
@keyframes goldenTextGlow {
  0%,
  100% {
    filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.8));
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    filter: drop-shadow(0 0 40px rgba(251, 191, 36, 1));
    transform: translate(-50%, -50%) scale(1.15);
  }
}

@keyframes timeTextGlow {
  0%,
  100% {
    filter: drop-shadow(0 0 20px rgba(52, 211, 153, 0.8));
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    filter: drop-shadow(0 0 40px rgba(52, 211, 153, 1));
    transform: translate(-50%, -50%) scale(1.15);
  }
}

@keyframes normalTextGlow {
  0%,
  100% {
    filter: drop-shadow(0 0 20px rgba(96, 165, 250, 0.8));
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    transform: translate(-50%, -200%) scale(1.1);
    opacity: 0;
  }
}

h3 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #fbbf24;
}

ul {
  list-style: none;
  padding: 0;

  li {
    padding: 8px 0;
    font-size: 14px;
    color: #cbd5e1;
    line-height: 1.6;

    &::before {
      content: '▸ ';
      color: #667eea;
      margin-right: 8px;
    }
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes letterFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes shadowPulse {
  0%,
  100% {
    opacity: 0.3;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 0.5;
    transform: translateX(-50%) scale(1.15);
  }
}

@keyframes borderPulse {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

@keyframes glowPulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.2;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.4;
  }
}

@keyframes comboAppear {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

@keyframes titlePulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes titleGlow {
  0%,
  100% {
    filter: drop-shadow(0 0 20px rgba(102, 126, 234, 0.4));
  }
  50% {
    filter: drop-shadow(0 0 40px rgba(118, 75, 162, 0.6));
  }
}

@keyframes trophy {
  0%,
  100% {
    transform: rotate(-5deg);
  }
  50% {
    transform: rotate(5deg);
  }
}

// ==================== 时间+5s特效 ====================
.time-bonus-effect-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 1000;
  animation: effectFadeIn 0.3s ease-out;
}

.time-bonus-effect {
  position: relative;
  width: 400px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-center {
  position: absolute;
  z-index: 100;
  text-align: center;

  .time-plus {
    font-size: 72px;
    font-weight: 900;
    background: linear-gradient(135deg, #34d399, #10b981, #059669);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 30px rgba(52, 211, 153, 0.8));
    animation: timeTextZoom 2s ease-out infinite;
  }

  .time-icon {
    font-size: 80px;
    margin-top: 10px;
    animation: timeIconPulse 1s ease-in-out infinite;
    filter: drop-shadow(0 0 40px rgba(52, 211, 153, 1));
  }
}

.time-rings {
  position: absolute;
  width: 100%;
  height: 100%;

  .time-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 3px solid rgba(52, 211, 153, 0.6);
    animation: timeRingRotate 3s linear infinite;
  }

  @for $i from 1 through 4 {
    .time-ring:nth-child(#{$i}) {
      width: #{100 + $i * 60}px;
      height: #{100 + $i * 60}px;
      animation-duration: #{3 + $i * 0.5}s;
      animation-direction: #{if($i % 2 == 0, 'normal', 'reverse')};
      @if $i == 1 {
        border-color: rgba(52, 211, 153, 0.65);
      }
      @if $i == 2 {
        border-color: rgba(52, 211, 153, 0.5);
      }
      @if $i == 3 {
        border-color: rgba(52, 211, 153, 0.35);
      }
      @if $i == 4 {
        border-color: rgba(52, 211, 153, 0.2);
      }
    }
  }
}

.time-tunnel {
  position: absolute;
  width: 100%;
  height: 100%;

  .tunnel-layer {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(
      circle,
      transparent 30%,
      rgba(52, 211, 153, 0.2) 70%,
      transparent 100%
    );
    animation: tunnelExpand 2s ease-out infinite;
  }

  @for $i from 1 through 5 {
    .tunnel-layer:nth-child(#{$i}) {
      width: #{120 + $i * 50}px;
      height: #{120 + $i * 50}px;
      animation-delay: #{$i * 0.3}s;
    }
  }
}

.time-shards {
  position: absolute;
  width: 100%;
  height: 100%;

  .shard {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 3px;
    background: linear-gradient(90deg, #34d399, #10b981);
    border-radius: 2px;
    animation: shardShoot 1.5s ease-out infinite;
  }

  @for $i from 1 through 16 {
    .shard:nth-child(#{$i}) {
      transform-origin: center;
      animation-delay: #{$i * 0.08s};
      --rotation: #{$i * 22.5deg};
    }
  }
}

.time-streams {
  position: absolute;
  width: 100%;
  height: 100%;

  .stream {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4px;
    height: 150px;
    background: linear-gradient(180deg, transparent, #34d399, transparent);
    border-radius: 2px;
    animation: streamFlow 1.2s ease-in-out infinite;
  }

  @for $i from 1 through 8 {
    .stream:nth-child(#{$i}) {
      transform-origin: center;
      animation-delay: #{$i * 0.1s};
      --rotation: #{$i * 45deg};
    }
  }
}

.lightning-bolts {
  position: absolute;
  width: 100%;
  height: 100%;

  .bolt {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 3px;
    height: 80px;
    background: linear-gradient(180deg, #fbbf24, #f59e0b);
    border-radius: 2px;
    box-shadow:
      0 0 20px #fbbf24,
      0 0 40px #f59e0b;
    animation: boltFlash 0.8s ease-out infinite;
  }

  @for $i from 1 through 6 {
    .bolt:nth-child(#{$i}) {
      transform-origin: center;
      animation-delay: #{$i * 0.12s};
      --rotation: #{$i * 60deg};
    }
  }
}

// ==================== 等级提升特效 ====================
.level-up-effect-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 1000;
  animation: effectFadeIn 0.3s ease-out;
}

.level-up-effect {
  position: relative;
  width: 500px;
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.level-center {
  position: absolute;
  z-index: 100;
  text-align: center;

  .level-text {
    font-size: 64px;
    font-weight: 900;
    background: linear-gradient(135deg, #fbbf24, #f59e0b, #d97706);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 40px rgba(251, 191, 36, 1));
    animation: levelTextBounce 2s ease-out infinite;
    text-shadow: none;
  }

  .level-number {
    font-size: 96px;
    font-weight: 900;
    background: linear-gradient(135deg, #8b5cf6, #7c3aed, #6d28d9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 50px rgba(139, 92, 246, 1));
    animation: levelNumberScale 2s ease-out infinite;
    margin-top: 10px;
    text-shadow: none;
  }
}

.star-explosion {
  position: absolute;
  width: 100%;
  height: 100%;

  .star {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: 32px;
    animation: starExplode 2s ease-out infinite;
  }

  @for $i from 1 through 24 {
    .star:nth-child(#{$i}) {
      animation-delay: #{$i * 0.06s};
      transform-origin: center;
      --rotation: #{$i * 15deg};
    }
  }
}

.glow-rings {
  position: absolute;
  width: 100%;
  height: 100%;

  .glow-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 4px solid;
    animation: glowRingExpand 2.5s ease-out infinite;
  }

  @for $i from 1 through 6 {
    .glow-ring:nth-child(#{$i}) {
      width: #{80 + $i * 70}px;
      height: #{80 + $i * 70}px;
      animation-delay: #{$i * 0.3}s;
      @if $i == 1 {
        border-color: rgba(251, 191, 36, 0.85);
        box-shadow: 0 0 30px rgba(251, 191, 36, 0.7);
      }
      @if $i == 2 {
        border-color: rgba(251, 191, 36, 0.7);
        box-shadow: 0 0 40px rgba(251, 191, 36, 0.6);
      }
      @if $i == 3 {
        border-color: rgba(251, 191, 36, 0.55);
        box-shadow: 0 0 50px rgba(251, 191, 36, 0.5);
      }
      @if $i == 4 {
        border-color: rgba(251, 191, 36, 0.4);
        box-shadow: 0 0 60px rgba(251, 191, 36, 0.4);
      }
      @if $i == 5 {
        border-color: rgba(251, 191, 36, 0.25);
        box-shadow: 0 0 70px rgba(251, 191, 36, 0.3);
      }
      @if $i == 6 {
        border-color: rgba(251, 191, 36, 0.1);
        box-shadow: 0 0 80px rgba(251, 191, 36, 0.2);
      }
    }
  }
}

.rocket-path {
  position: absolute;
  width: 100%;
  height: 100%;

  .rocket {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: 64px;
    animation: rocketLaunch 2.5s ease-out infinite;
    filter: drop-shadow(0 0 30px rgba(139, 92, 246, 1));
  }

  .rocket-trail {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 12px;
    height: 12px;
    background: radial-gradient(circle, #f97316, #ea580c);
    border-radius: 50%;
    animation: trailParticle 2s ease-out infinite;
    filter: drop-shadow(0 0 15px #f97316);
  }

  @for $i from 1 through 8 {
    .rocket-trail:nth-child(#{$i}) {
      animation-delay: #{$i * 0.2}s;
    }
  }
}

.rainbow-halo {
  position: absolute;
  width: 100%;
  height: 100%;

  .halo-segment {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 250px;
    height: 250px;
    border-radius: 50%;
    border: 6px solid transparent;
    border-top-color: #ef4444;
    animation: rainbowSpin 3s linear infinite;
  }

  @for $i from 1 through 12 {
    .halo-segment:nth-child(#{$i}) {
      animation-delay: #{$i * 0.15}s;
      transform: translate(-50%, -50%) rotate(#{($i - 1) * 30}deg);
      @if $i == 1 {
        border-top-color: hsl(0, 100%, 50%);
      }
      @if $i == 2 {
        border-top-color: hsl(30, 100%, 50%);
      }
      @if $i == 3 {
        border-top-color: hsl(60, 100%, 50%);
      }
      @if $i == 4 {
        border-top-color: hsl(90, 100%, 50%);
      }
      @if $i == 5 {
        border-top-color: hsl(120, 100%, 50%);
      }
      @if $i == 6 {
        border-top-color: hsl(150, 100%, 50%);
      }
      @if $i == 7 {
        border-top-color: hsl(180, 100%, 50%);
      }
      @if $i == 8 {
        border-top-color: hsl(210, 100%, 50%);
      }
      @if $i == 9 {
        border-top-color: hsl(240, 100%, 50%);
      }
      @if $i == 10 {
        border-top-color: hsl(270, 100%, 50%);
      }
      @if $i == 11 {
        border-top-color: hsl(300, 100%, 50%);
      }
      @if $i == 12 {
        border-top-color: hsl(330, 100%, 50%);
      }
    }
  }
}

.coin-rain {
  position: absolute;
  width: 100%;
  height: 100%;

  .coin {
    position: absolute;
    top: 0;
    font-size: 28px;
    animation: coinFallDown 2s ease-in infinite;
    filter: drop-shadow(0 0 15px #fbbf24);
  }

  @for $i from 1 through 20 {
    .coin:nth-child(#{$i}) {
      left: #{5 + $i * 5}%;
      animation-delay: #{$i * 0.1}s;
    }
  }
}

.light-rays {
  position: absolute;
  width: 100%;
  height: 100%;

  .ray {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 200px;
    background: linear-gradient(180deg, transparent, #fbbf24, transparent);
    border-radius: 4px;
    animation: rayPulse 1.5s ease-in-out infinite;
  }

  @for $i from 1 through 12 {
    .ray:nth-child(#{$i}) {
      transform-origin: center;
      animation-delay: #{$i * 0.1s};
      --rotation: #{$i * 30deg};
    }
  }
}

.particle-burst {
  position: absolute;
  width: 100%;
  height: 100%;

  .particle {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: particleBurst 1.8s ease-out infinite;
  }

  @for $i from 1 through 30 {
    .particle:nth-child(#{$i}) {
      @if $i % 6 == 1 {
        background: hsl(0, 100%, 60%);
      }
      @if $i % 6 == 2 {
        background: hsl(60, 100%, 60%);
      }
      @if $i % 6 == 3 {
        background: hsl(120, 100%, 60%);
      }
      @if $i % 6 == 4 {
        background: hsl(180, 100%, 60%);
      }
      @if $i % 6 == 5 {
        background: hsl(240, 100%, 60%);
      }
      @if $i % 6 == 0 {
        background: hsl(300, 100%, 60%);
      }
      animation-delay: #{$i * 0.05}s;
      transform-origin: center;
    }
  }
}

// ==================== 时间+5s动画 ====================
@keyframes effectFadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes timeTextZoom {
  0%,
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 30px rgba(52, 211, 153, 0.8));
  }
  50% {
    transform: scale(1.3);
    filter: drop-shadow(0 0 60px rgba(52, 211, 153, 1));
  }
}

@keyframes timeIconPulse {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
  }
  50% {
    transform: scale(1.2) rotate(10deg);
  }
}

@keyframes timeRingRotate {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes tunnelExpand {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

@keyframes shardShoot {
  0% {
    transform: rotate(var(--rotation, 0deg)) translateX(0);
    opacity: 1;
  }
  100% {
    transform: rotate(var(--rotation, 0deg)) translateX(-200px);
    opacity: 0;
  }
}

@keyframes streamFlow {
  0%,
  100% {
    transform: rotate(var(--rotation, 0deg)) translateY(-100px);
    opacity: 0;
  }
  50% {
    transform: rotate(var(--rotation, 0deg)) translateY(100px);
    opacity: 1;
  }
}

@keyframes boltFlash {
  0%,
  100% {
    opacity: 0;
    transform: rotate(var(--rotation, 0deg)) scale(1);
  }
  50% {
    opacity: 1;
    transform: rotate(var(--rotation, 0deg)) scale(1.5);
  }
}

// ==================== 等级提升动画 ====================
@keyframes levelTextBounce {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

@keyframes levelNumberScale {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
}

@keyframes starExplode {
  0% {
    transform: translate(-50%, -50%) scale(0) rotate(var(--rotation, 0deg));
    opacity: 1;
  }
  100% {
    transform: translateX(300px) scale(0.5) rotate(calc(var(--rotation, 0deg) + 360deg));
    opacity: 0;
  }
}

@keyframes glowRingExpand {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

@keyframes rocketLaunch {
  0% {
    transform: translate(-50%, -50%) translateY(100px) scale(0);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) translateY(-200px) scale(1.5);
    opacity: 0;
  }
}

@keyframes trailParticle {
  0% {
    transform: translate(-50%, -50%) translateY(80px);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) translateY(-50px);
    opacity: 0;
  }
}

@keyframes rainbowSpin {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes coinFallDown {
  0% {
    transform: translateY(-50px) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(600px) rotate(720deg);
    opacity: 0;
  }
}

@keyframes rayPulse {
  0%,
  100% {
    opacity: 0.3;
    transform: rotate(var(--rotation, 0deg)) translateY(-100px) scale(1);
  }
  50% {
    opacity: 1;
    transform: rotate(var(--rotation, 0deg)) translateY(-100px) scale(1.3);
  }
}

@keyframes particleBurst {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateX(-250px) scale(0);
    opacity: 0;
  }
}
</style>
