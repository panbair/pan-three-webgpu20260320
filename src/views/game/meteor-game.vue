<template>
  <div class="meteor-game-container">
    <!-- 全景图背景 -->
    <PanoramaViewer :image-url="panoramaImage" />

    <!-- 游戏UI覆盖层 -->
    <div class="game-ui">
      <!-- 倒计时进度条（顶部正前方） -->
      <div v-if="gameState === 'playing'" class="timer-progress-top">
        <div class="timer-progress-bar-top">
          <div
            class="timer-progress-fill-top"
            :style="{
              width: timerPercentage + '%',
              background: timerColor
            }"
          ></div>
        </div>
        <div class="timer-text-top" :style="{ color: timerTextColor }">
          {{ Math.ceil(timeLeft) }}秒
        </div>
      </div>

      <!-- 音乐控制 -->
      <div class="music-control" :class="{ 'expanded': isMusicPanelExpanded }">
        <button
          class="music-toggle-btn"
          :title="isMusicPanelExpanded ? '收起音乐控制' : '展开音乐控制'"
          @click="toggleMusicPanel"
        >
          <span class="music-icon">{{ isMuted ? '🔇' : '🎵' }}</span>
        </button>
        <div v-show="isMusicPanelExpanded" class="music-controls-panel">
          <button class="music-btn" :title="isMuted ? '播放音乐' : '静音'" @click="toggleMute">
            <span class="music-icon">{{ isMuted ? '🔇' : '🔊' }}</span>
          </button>
          <button class="music-btn switch-btn" title="切换音乐" @click="switchMusic">
            <span class="music-icon">🎵</span>
          </button>
          <div class="volume-control">
            <span class="volume-icon">🔈</span>
            <input
              v-model.number="musicVolume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              class="volume-slider"
              @input="setVolume(musicVolume)"
            />
            <span class="volume-icon">🔊</span>
          </div>
        </div>
      </div>

      <!-- 游戏信息面板 -->
      <div class="game-info">
        <div class="info-header">
          <div class="info-icon">📊</div>
          <div class="info-title">游戏数据</div>
        </div>

        <div class="stats-grid">
          <div class="stat-item score">
            <div class="stat-icon">🏆</div>
            <div class="stat-content">
              <div class="stat-label">得分</div>
              <div class="stat-value">{{ score }}</div>
            </div>
          </div>

          <!-- 连击显示 -->
          <div class="stat-item combo" :class="{ 'combo-active': combo > 0 }">
            <div class="stat-icon">🔥</div>
            <div class="stat-content">
              <div class="stat-label">连击</div>
              <div class="stat-value">{{ combo }}</div>
            </div>
          </div>

          <!-- 准确率 -->
          <div class="stat-item accuracy">
            <div class="stat-icon">🎯</div>
            <div class="stat-content">
              <div class="stat-label">准确率</div>
              <div class="stat-value">{{ accuracy }}%</div>
            </div>
          </div>

          <!-- WPM -->
          <div class="stat-item wpm">
            <div class="stat-icon">⚡</div>
            <div class="stat-content">
              <div class="stat-label">WPM</div>
              <div class="stat-value">{{ wpm }}</div>
            </div>
          </div>
        </div>

        <!-- 连击加成提示 -->
        <div v-if="combo >= 5" class="combo-bonus">
          <span class="combo-bonus-text">
            连击加成 +{{ Math.floor(combo / 5) * 5 * (levelConfig.comboMultiplier || 1.0) }}
          </span>
        </div>

        <!-- 等级信息 -->
        <div class="level-info">
          <div class="level-name" :style="{ color: levelConfig.levelNameColor }">
            {{ levelConfig.levelName }}
          </div>
          <div class="level-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{
                  width: levelConfig.progressPercent + '%',
                  background: `linear-gradient(90deg, ${levelConfig.levelColor}, ${levelConfig.levelColor}88)`
                }"
              ></div>
            </div>
            <div class="progress-text">
              {{ levelConfig.progressText }}
            </div>
          </div>
        </div>

        <!-- 游戏控制按钮 -->
        <div class="game-controls">
          <button
            v-if="gameState === 'ready' || gameState === 'gameover'"
            class="control-btn start-btn"
            @click="startGame"
          >
            <span class="btn-icon">▶</span>
            <span>开始</span>
          </button>
          <button v-if="gameState === 'playing'" class="control-btn pause-btn" @click="pauseGame">
            <span class="btn-icon">⏸</span>
            <span>暂停</span>
          </button>
          <button v-if="gameState === 'paused'" class="control-btn resume-btn" @click="resumeGame">
            <span class="btn-icon">▶</span>
            <span>继续</span>
          </button>
          <button
            v-if="gameState === 'playing' || gameState === 'paused' || gameState === 'gameover'"
            class="control-btn restart-btn"
            @click="restartGame"
          >
            <span class="btn-icon">🔄</span>
            <span>重开</span>
          </button>
        </div>
      </div>

      <!-- 游戏状态 -->
      <div v-if="gameState === 'ready'" class="game-status ready">
        <div class="status-content">
          <div class="game-icon">🎮</div>
          <h2>三维打字雨</h2>
          <div class="game-description">
            <p>字母方块从天空掉落</p>
            <p>按下对应按键消灭它们</p>
          </div>
          <div class="game-features">
            <span class="feature-tag">⚡ 极速反应</span>
            <span class="feature-tag">🎯 精准打击</span>
            <span class="feature-tag">🏆 挑战极限</span>
          </div>

          <!-- 时间选择 -->
          <div class="time-selector">
            <h3 class="selector-title">⏱️ 游戏时长</h3>
            <div class="time-options">
              <button
                v-for="time in timeOptions"
                :key="time.value"
                class="time-option"
                :class="{ active: selectedTime === time.value }"
                @click="selectedTime = time.value"
              >
                <span class="time-value">{{ time.label }}</span>
              </button>
            </div>
          </div>

          <button class="start-btn" @click="startGame">
            <span class="btn-icon">▶</span>
            <span>开始游戏</span>
          </button>
          <button class="back-home-btn" @click="goBack">
            <span class="btn-icon">🏠</span>
            <span>返回首页</span>
          </button>
        </div>
      </div>
      <!--    游戏结束-->
      <div v-else-if="gameState === 'gameover'" class="game-status gameover">
        <div class="status-content">
          <div class="game-icon">💥</div>
          <h2>游戏结束</h2>
          <div class="game-stats">
            <div class="stat-row">
              <span class="stat-label">最终得分</span>
              <span class="stat-value highlight">{{ score }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">到达等级</span>
              <span class="stat-value">LV.{{ level }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">最大连击</span>
              <span class="stat-value">{{ maxCombo }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">准确率</span>
              <span class="stat-value">{{ accuracy }}%</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">打字速度</span>
              <span class="stat-value">{{ wpm }} WPM</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">总按键数</span>
              <span class="stat-value">{{ totalKeystrokes }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">正确 / 错误</span>
              <span class="stat-value">{{ correctKeystrokes }} / {{ wrongKeystrokes }}</span>
            </div>
          </div>
          <div class="game-message">
            <p v-if="maxCombo >= 20">🔥 连击大师！继续保持！</p>
            <p v-else-if="accuracy >= 95">🎯 精准打击！准确率惊人！</p>
            <p v-else-if="wpm >= 60">⚡ 速度狂人！手速惊人！</p>
            <p v-else>分数很高，太厉害了！</p>
          </div>
          <div class="game-buttons">
            <button class="continue-btn" @click="continueGame">
              <span class="btn-icon">➕</span>
              <span>继续挑战 +30秒</span>
            </button>
            <button class="restart-btn" @click="restartGame">
              <span class="btn-icon">🔄</span>
              <span>重新开始</span>
            </button>
            <button class="back-home-btn-gameover" @click="goBack">
              <span class="btn-icon">🏠</span>
              <span>返回首页</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 操作提示 -->
      <div class="controls-hint">
        <div class="hint-content">
          <div class="hint-icon">⌨️</div>
          <div class="hint-text">ESC 暂停/继续游戏</div>
        </div>
      </div>
    </div>

    <!-- 简单的3D场景容器 -->
    <canvas ref="gameCanvas" class="game-canvas"></canvas>
  </div>
</template>

<script setup>
import {getMusic, getTexturePath,getBg} from './config.js'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import gsap from 'gsap'
import PanoramaViewer from '@/components/PanoramaViewer.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 全景图背景（响应式，可在开始游戏时切换）
const panoramaImage = ref(
  getBg() || `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/quanjing-v5/h-v5-1.png`
)

// 音乐系统
const bgMusic = new Audio()
const musicTracks = getMusic()
const currentMusicIndex = ref(0)
const isMuted = ref(false)
const musicVolume = ref(0.5)
const isMusicPanelExpanded = ref(false) // 音乐面板展开/收起状态

// 音效系统 - 全局 AudioContext 实例
let audioContext = null

// 获取或创建 AudioContext
let audioContextResumed = false // 标记 AudioContext 是否已恢复运行状态

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  // 确保 AudioContext 处于运行状态（浏览器策略要求）
  if (!audioContextResumed && audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      audioContextResumed = true
    }).catch(err => {
      console.warn('AudioContext resume 失败:', err)
    })
  }
  return audioContext
}

// 切换音乐面板展开/收起
const toggleMusicPanel = () => {
  isMusicPanelExpanded.value = !isMusicPanelExpanded.value
}

// 初始化音乐
// 音乐结束事件处理器（保存引用以便清理）
const musicEndedHandler = () => {
  if (!isMuted.value) {
    switchMusic()
  }
}

const initMusic = () => {
  bgMusic.src = musicTracks[0]
  bgMusic.volume = musicVolume.value
  bgMusic.loop = false
  bgMusic.preload = 'auto'

  // 监听音乐播放结束事件，自动播放下一首
  bgMusic.addEventListener('ended', musicEndedHandler)
}

// 播放音乐
const playMusic = () => {
  if (!isMuted.value) {
    bgMusic.play().catch(err => {
      console.warn('音乐播放失败（可能需要用户交互）:', err)
      // 降级处理：静默失败，不影响游戏体验
    })
  }
}

// 暂停音乐
const pauseMusic = () => {
  bgMusic.pause()
}

// 切换静音
const toggleMute = () => {
  isMuted.value = !isMuted.value
  if (isMuted.value) {
    bgMusic.pause()
  } else if (gameState.value === 'playing') {
    bgMusic.play().catch(err => {
      console.warn('播放失败:', err)
      // 降级处理：静默失败，不影响游戏体验
    })
  }
}

// 切换音乐
const switchMusic = () => {
  const wasPlaying = !bgMusic.paused
  bgMusic.pause()
  currentMusicIndex.value = (currentMusicIndex.value + 1) % musicTracks.length
  bgMusic.src = musicTracks[currentMusicIndex.value]
  bgMusic.currentTime = 0
  if (wasPlaying && !isMuted.value) {
    bgMusic.play().catch(err => {
      console.warn('播放失败:', err)
      // 降级处理：静默失败，不影响游戏体验
    })
  }
}

// 调节音量
const setVolume = volume => {
  musicVolume.value = Math.max(0, Math.min(1, volume))
  bgMusic.volume = musicVolume.value
}

// 游戏状态
const gameState = ref('ready') // ready, playing, paused, gameover
const score = ref(0)
const level = ref(1)
const gameCanvas = ref(null)

// 倒计时系统
// 时间选择
const timeOptions = [
  { label: '60秒', value: 60 },
  { label: '90秒', value: 90 },
  { label: '120秒', value: 120 }
]
const selectedTime = ref(90) // 默认90秒

const timeLeft = ref(90) // 每关默认90秒
const timerInterval = ref(null)
const LEVEL_TIME = ref(90) // 每局时间（秒）

// 计算属性：倒计时百分比
const timerPercentage = computed(() => {
  return (timeLeft.value / LEVEL_TIME.value) * 100
})

// 连击系统
const combo = ref(0)
const maxCombo = ref(0)
const comboTimer = ref(null)
const COMBO_TIMEOUT = 2000 // 2秒内连续击中才计入连击

// 统计数据
const totalKeystrokes = ref(0) // 总按键数
const correctKeystrokes = ref(0) // 正确按键数
const wrongKeystrokes = ref(0) // 错误按键数
const accuracy = ref(100) // 准确率（百分比）
const wpm = ref(0) // 每分钟字数
const gameStartTime = ref(0) // 游戏开始时间

// 当前等级配置（用于UI显示）
const levelConfig = ref({
  levelName: '新手',
  levelColor: '#b0b0b0',
  levelNameColor: '#b0b0b0',
  nextLevelScore: 100,
  progressPercent: 0,
  progressText: '0 / 100',
  comboMultiplier: 1.0
})

// 更新等级配置显示
const updateLevelConfig = () => {
  const config = getCurrentLevelConfig()
  const currentLevelScore = level.value > 1 ? LEVEL_CONFIG.levelScores[level.value - 1] : 0
  const nextLevelScore = config.nextLevelScore || currentLevelScore
  const progressPercent = config.nextLevelScore
    ? Math.min(
        100,
        ((score.value - currentLevelScore) / (nextLevelScore - currentLevelScore)) * 100
      )
    : 100

  levelConfig.value = {
    levelName: config.levelName,
    levelColor: config.levelColor,
    levelNameColor: config.levelColor,
    nextLevelScore: config.nextLevelScore,
    progressPercent: progressPercent,
    progressText: config.nextLevelScore
      ? `${score.value} / ${config.nextLevelScore}`
      : `满级 (${score.value})`
  }
}

// 倒计时颜色（根据剩余时间变化）
const timerColor = ref('linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)') // 默认绿色渐变

// 更新倒计时颜色
const updateTimerColor = () => {
  const percent = (timeLeft.value / LEVEL_TIME) * 100
  if (percent > 50) {
    timerColor.value = 'linear-gradient(90deg, #4caf50 0%, #8bc34a 50%, #66bb6a 100%)' // 绿色渐变
  } else if (percent > 25) {
    timerColor.value = 'linear-gradient(90deg, #ff9800 0%, #ffb74d 50%, #ffa726 100%)' // 橙色渐变
  } else {
    timerColor.value = 'linear-gradient(90deg, #f44336 0%, #ef5350 50%, #e53935 100%)' // 红色渐变
  }
}

// 倒计时文字颜色（用于文本显示）
const timerTextColor = ref('#4caf50')

// 更新倒计时文字颜色
const updateTimerTextColor = () => {
  const percent = (timeLeft.value / LEVEL_TIME) * 100
  if (percent > 50) {
    timerTextColor.value = '#4caf50' // 绿色
  } else if (percent > 25) {
    timerTextColor.value = '#ff9800' // 橙色
  } else {
    timerTextColor.value = '#f44336' // 红色
  }
}

// Three.js 相关
let scene = null
let camera = null
let renderer = null
let animationId = null
let spawnInterval = null

// 视锥体边界缓存（用于限制方块生成和移动范围）
// left: 左边界（避免被左侧UI面板遮挡）
// right: 右边界（避免超出屏幕）
// top: 顶部边界（方块生成高度）
// bottom: 底部边界（方块消失位置）
// nearZ: 近边界（最近深度）
// farZ: 远边界（最远深度）
let frustumBounds = {
  left: -10,
  right: 10,
  top: 20,
  bottom: -5,
  nearZ: 0,
  farZ: 10
}

// 游戏对象
const letterBlocks = []
const keysPressed = ref(new Set())
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// 特效方块类型定义
const SPECIAL_BLOCK_TYPES = {
  NORMAL: 'normal', // 普通方块
  GOLD: 'gold', // 🌟 金色方块 - 双倍分数
  FIRE: 'fire', // 🔥 火焰方块 - 连击+5
  TIME: 'time', // ⏰ 时钟方块 - 时间+5秒
  DIAMOND: 'diamond', // 💎 钻石方块 - 分数+50 + 连击+3
  ICE: 'ice', // ❄️ 冰冻方块 - 全场减速2秒
  RAINBOW: 'rainbow' // 🌈 彩虹方块 - 彩虹特效
}

// 特效方块配置
const SPECIAL_BLOCK_CONFIG = {
  [SPECIAL_BLOCK_TYPES.GOLD]: {
    probability: 0.08, // 8%概率
    scoreMultiplier: 2,
    color: 0xffd700,
    icon: '🌟',
    glowColor: 0xffd700,
    scale: 1.0
  },
  [SPECIAL_BLOCK_TYPES.FIRE]: {
    probability: 0.06,
    bonusCombo: 5,
    color: 0xff4500,
    icon: '🔥',
    glowColor: 0xff6b35,
    scale: 1.0
  },
  [SPECIAL_BLOCK_TYPES.TIME]: {
    probability: 0.05,
    timeBonus: 5,
    color: 0x00bfff,
    icon: '⏰',
    glowColor: 0x00d4ff,
    scale: 1.0
  },
  [SPECIAL_BLOCK_TYPES.DIAMOND]: {
    probability: 0.04,
    scoreBonus: 50,
    bonusCombo: 3,
    color: 0x00ffff,
    icon: '💎',
    glowColor: 0x40e0d0,
    scale: 1.3 // 放大钻石方块
  },
  [SPECIAL_BLOCK_TYPES.ICE]: {
    probability: 0.05,
    slowDuration: 2000,
    color: 0x87ceeb,
    icon: '❄️',
    glowColor: 0xadd8e6,
    scale: 1.0
  },
  [SPECIAL_BLOCK_TYPES.RAINBOW]: {
    probability: 0.03,
    color: 0xffffff,
    icon: '🌈',
    glowColor: 0xffffff,
    scale: 1.4 // 放大彩虹方块
  }
}

// 全场减速状态
let isGlobalSlowed = false
let globalSlowEndTime = 0

// 爆炸粒子系统
const particles = []
const particleGeometry = new THREE.SphereGeometry(0.08, 8, 8)
const particleColors = [
  0xff6b6b, // 红色
  0xffd93d, // 金色
  0x6bcb77, // 绿色
  0x4d96ff, // 蓝色
  0xff6ec7 // 粉色
]

// 粒子对象池（用于性能优化）
const particlePool = {
  mesh: [],
  material: [],
  maxPoolSize: 200 // 最大池大小
}

// 从对象池获取粒子材质
const getParticleMaterial = color => {
  if (particlePool.material.length > 0) {
    const material = particlePool.material.pop()
    material.color.setHex(color)
    material.opacity = 1
    return material
  }
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1
  })
}

// 从对象池获取粒子网格
const getParticleMesh = material => {
  if (particlePool.mesh.length > 0) {
    const mesh = particlePool.mesh.pop()
    mesh.material = material
    return mesh
  }
  return new THREE.Mesh(particleGeometry, material)
}

// 回收粒子到对象池
const recycleParticle = (mesh, material) => {
  if (particlePool.mesh.length < particlePool.maxPoolSize) {
    particlePool.mesh.push(mesh)
  } else {
    mesh.geometry && mesh.geometry.dispose()
  }
  if (particlePool.material.length < particlePool.maxPoolSize) {
    particlePool.material.push(material)
  } else {
    material.dispose()
  }
}

// 浮动文本追踪（用于清理）
const floatingTextSprites = []

// GSAP动画追踪（用于清理）
const activeAnimations = []

// 清理所有游戏对象（方块、粒子、动画等）
const clearGameObjects = () => {
  // 停止所有定时器
  if (spawnInterval) {
    clearInterval(spawnInterval)
    spawnInterval = null
  }

  // 停止动画循环
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  // 清理所有GSAP动画
  activeAnimations.forEach(tween => {
    if (tween && tween.kill) {
      tween.kill()
    }
  })
  activeAnimations.length = 0
  gsap.killTweensOf('*')

  // 清理浮动文本
  floatingTextSprites.forEach(item => {
    if (item.sprite && scene) {
      scene.remove(item.sprite)
    }
    if (item.texture) {
      item.texture.dispose()
    }
    if (item.canvas) {
      item.canvas.width = 0
      item.canvas.height = 0
    }
    if (item.sprite && item.sprite.material) {
      item.sprite.material.dispose()
    }
  })
  floatingTextSprites.length = 0

  // 清理粒子并回收到对象池
  particles.forEach(p => {
    if (p.mesh && scene) {
      scene.remove(p.mesh)
    }
    if (p.material && p.mesh) {
      recycleParticle(p.mesh, p.material)
    }
  })
  particles.length = 0

  // 清理字母方块
  letterBlocks.forEach(block => {
    // 清理彩虹方块的缓存属性
    if (block.lastColorUpdate) {
      delete block.lastColorUpdate
    }
    if (block.cachedColor) {
      delete block.cachedColor
    }
    disposeBlock(block)
  })
  letterBlocks.length = 0

  // 重置全场减速状态
  isGlobalSlowed = false
  globalSlowEndTime = 0
}

// 性能优化配置
const ROTATION_SPEED_X = 0.005
const ROTATION_SPEED_Y = 0.01

// 纹理缓存
const textureCache = new Map()
const textureLoader = new THREE.TextureLoader()
const BLOCK_TEXTURE_COUNT = 68 // 材质图片总数

// 材质缓存
const materialCache = new Map()

// 几何体对象池
const geometryPool = {
  cube: null,
  frame: null
}

// 游戏参数
const letterSpeed = 0.01 // 降低基础下落速度
const spawnRate = 1.5 // 生成速率（每秒生成的方块数）
const blockSize = 1.2 // 放大方块尺寸
const frameSize = 1.44 // 放大方框尺寸（保持1.2倍比例）

// 等级系统配置
const LEVEL_CONFIG = {
  // 每个等级的升级所需分数
  levelScores: [
    0, 50, 120, 200, 300, 420, 560, 720, 900, 1100, 1350, 1650, 2000, 2400, 2850, 3350, 3900, 4500,
    5200, 6000
  ],
  // 等级上限
  maxLevel: 20,
  // 每个等级的方块下落速度倍率
  speedMultiplier: [
    0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.1, 1.2, 1.3,
    1.4, 1.5
  ],
  // 每个等级的生成速率倍率
  spawnMultiplier: [
    0.5, 0.52, 0.54, 0.56, 0.58, 0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0,
    1.05, 1.1, 1.15
  ],
  // 等级名称
  levelNames: [
    '青铜',
    '青铜I',
    '青铜II',
    '白银',
    '白银I',
    '白银II',
    '黄金',
    '黄金I',
    '黄金II',
    '铂金',
    '铂金I',
    '铂金II',
    '钻石',
    '钻石I',
    '钻石II',
    '大师',
    '大师I',
    '大师II',
    '传奇',
    '王者'
  ],
  // 等级颜色（用于UI显示）
  levelColors: [
    '#cd7f32', // 青铜 - 青铜色
    '#b87333', // 青铜I - 深青铜
    '#a0522d', // 青铜II - 赭色
    '#c0c0c0', // 白银 - 银色
    '#a9a9a9', // 白银I - 暗灰
    '#808080', // 白银II - 灰色
    '#ffd700', // 黄金 - 金色
    '#daa520', // 黄金I - 金麒麟
    '#b8860b', // 黄金II - 暗金
    '#e5e4e2', // 铂金 - 铂色
    '#d3d3d3', // 铂金I - 亮灰
    '#a9a9a9', // 铂金II - 银灰
    '#b9f2ff', // 钻石 - 浅蓝
    '#00bfff', // 钻石I - 深天蓝
    '#1e90ff', // 钻石II - 宝蓝
    '#ff4500', // 大师 - 橙红
    '#ff6347', // 大师I - 番茄红
    '#dc143c', // 大师II - 深红
    '#9400d3', // 传奇 - 深紫
    '#ff1493' // 王者 - 深粉
  ],
  // 等级连击加成系数
  comboMultiplier: [
    1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5, 1.55, 1.6, 1.65, 1.7, 1.75, 1.8,
    1.85, 1.9, 2.0
  ],
  // 每个等级的最大方块数（新手少量，逐级增加）
  maxBlocks: [8, 9, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170]
}

// 获取当前等级配置
const getCurrentLevelConfig = () => {
  const currentLevel = Math.min(level.value, LEVEL_CONFIG.maxLevel)
  return {
    speedMultiplier: LEVEL_CONFIG.speedMultiplier[currentLevel - 1] || 1.0,
    spawnMultiplier: LEVEL_CONFIG.spawnMultiplier[currentLevel - 1] || 1.0,
    comboMultiplier: LEVEL_CONFIG.comboMultiplier[currentLevel - 1] || 1.0,
    maxBlocks: LEVEL_CONFIG.maxBlocks[currentLevel - 1] || 30,
    levelName: LEVEL_CONFIG.levelNames[currentLevel - 1] || '未知',
    levelColor: LEVEL_CONFIG.levelColors[currentLevel - 1] || '#b0b0b0',
    nextLevelScore:
      currentLevel < LEVEL_CONFIG.maxLevel ? LEVEL_CONFIG.levelScores[currentLevel] : null
  }
}

// 清理大方框
const disposeBigFrame = bigFrame => {
  if (!bigFrame || !scene) return
  if (bigFrame.mesh) {
    scene.remove(bigFrame.mesh)
  }
}

// 清理方块
const disposeBlock = block => {
  if (!block || !block.mesh || !scene) return
  scene.remove(block.mesh)
  if (block.bigFrame) {
    disposeBigFrame(block.bigFrame)
    block.bigFrame = null
  }
}

// 加载随机纹理
const loadBlockTexture = () => {
  // 随机选择 1-68 之间的图片（带默认值处理）
  const texturePath = getTexturePath() || `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/game1/g-v2-1.png`

  // 检查缓存中是否已有该纹理
  if (textureCache.has(texturePath)) {
    return textureCache.get(texturePath)
  }

  // 加载并缓存新纹理（添加错误处理）
  const texture = textureLoader.load(
    texturePath,
    // 加载成功回调
    undefined,
    // 加载进度回调
    undefined,
    // 加载错误回调
    err => {
      console.warn('纹理加载失败，使用备用方案:', texturePath, err)
      // 纹理加载失败时不抛出错误，Three.js会使用默认颜色
    }
  )
  textureCache.set(texturePath, texture)
  return texture
}

// 创建大方框
let fillStyleColorData = [
  '#02f6e2',
  '#42e302',
  '#f55a5a',
  '#f67104',
  '#fdcc28',
  '#d0316e',
  '#db0cea',
  '#f67104'
]

let bgColorData = [
  'rgba(2,246,226,0.4)',
  'rgba(66,227,2,0.4)',
  'rgba(245,90,90,0.4)',
  'rgba(246,113,4,0.4)',
  'rgba(253,204,40,0.4)',
  'rgba(208,49,110,0.4)',
  'rgba(219,12,234,0.4)',
  'rgba(246,113,4,0.4)'
]

let getColor = data => {
  data = data || fillStyleColorData
  return data[Math.floor(Math.random() * data.length)]
}

const createBigFrameForBlock = (letter, blockPosition, blockRotation) => {
  // 检查材质缓存
  let cachedMaterials = materialCache.get(letter)
  if (!cachedMaterials) {
    let tex = textureCache.get(letter)
    if (!tex) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = 256
      canvas.height = 256

      if (ctx) {
        // 深色半透明背景，增强对比度
        ctx.fillStyle = getColor(bgColorData)
        ctx.fillRect(0, 0, 256, 256)

        // 添加发光边框效果
        ctx.strokeStyle = getColor()
        ctx.lineWidth = 2
        ctx.strokeRect(4, 4, 248, 248)

        // 白色粗体字母
        ctx.fillStyle = '#f31818'
        ctx.font = 'bold 200px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // 添加文字阴影，增强可读性
        ctx.shadowColor = '#000000'
        ctx.shadowBlur = 10
        ctx.shadowOffsetX = 3
        ctx.shadowOffsetY = 3
        ctx.fillText(letter, 128, 128)

        // 重置阴影
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        // 添加文字高光
        ctx.fillStyle = 'rgba(241,11,11,0.3)'
        ctx.font = 'bold 200px Arial'
        ctx.fillText(letter, 126, 126)
      }

      tex = new THREE.CanvasTexture(canvas)
      textureCache.set(letter, tex)
    }

    cachedMaterials = []
    for (let i = 0; i < 6; i++) {
      cachedMaterials.push(
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.5,
          side: THREE.FrontSide,
          depthWrite: false,
          blending: THREE.NormalBlending
        })
      )
    }
    materialCache.set(letter, cachedMaterials)
  }

  // 使用对象池
  if (!geometryPool.frame) {
    geometryPool.frame = new THREE.BoxGeometry(frameSize, frameSize, frameSize)
  }
  const bigFrameMesh = new THREE.Mesh(geometryPool.frame, cachedMaterials)
  const framePosition = blockPosition.clone()
  framePosition.z += 0.1
  bigFrameMesh.position.copy(framePosition)

  if (blockRotation) {
    bigFrameMesh.rotation.copy(blockRotation)
  }

  if (scene) {
    scene.add(bigFrameMesh)
  }

  return {
    mesh: bigFrameMesh,
    geometry: geometryPool.frame,
    materials: cachedMaterials,
    texture: cachedMaterials[0].map
  }
}

// 计算视锥体边界
const updateFrustumBounds = () => {
  if (!camera) return

  const aspect = camera.aspect
  const fov = camera.fov * (Math.PI / 180)
  const distanceToSpawn = Math.abs(camera.position.z)
  const visibleHeightAtSpawn = 2 * Math.tan(fov / 2) * distanceToSpawn
  const visibleWidthAtSpawn = visibleHeightAtSpawn * aspect

  // 计算摄像机Y方向的可见范围
  const cameraY = camera.position.y
  const halfVisibleHeight = visibleHeightAtSpawn / 2
  const visibleTop = cameraY + halfVisibleHeight

  // 方块生成高度：视野顶部偏下一点，确保完全在视野内
  const spawnY = Math.max(visibleTop - 2, 8) // 确保在视野顶部附近

  // 方块安全边界（考虑方块大小、边框和旋转）
  const maxBlockSize = Math.sqrt(2) * Math.max(blockSize, frameSize)
  const safeMargin = maxBlockSize + 3.0 // 增加安全边距（从2.0到3.0）

  // 使用固定边界值，更简单可靠
  const halfWidth = Math.min(visibleWidthAtSpawn / 2 - safeMargin, 12) // 限制最大宽度
  const gameWidth = halfWidth * 2

  // 左侧UI面板安全区域（25%宽度）
  const uiPanelWidth = visibleWidthAtSpawn * 0.25

  frustumBounds = {
    left: -halfWidth + uiPanelWidth, // 左边界跳过UI面板区域
    right: halfWidth - 1.0,           // 右边界增加额外安全边距
    top: spawnY,                      // 使用计算后的生成高度（视野顶部）
    bottom: -10,
    nearZ: 3.0,
    farZ: 7.0
  }
}

// 初始化场景
const initGameScene = () => {
  if (!gameCanvas.value) return

  const canvas = gameCanvas.value
  const width = canvas.clientWidth || 800
  const height = canvas.clientHeight || 600

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.set(0, 5, 15)
  camera.lookAt(0, 5, 0)

  updateFrustumBounds()

  // 创建边界可视化辅助线（调试用，可选）
  // createBoundaryHelper()

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: false,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setClearColor(0x000000, 0)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(10, 10, 5)
  scene.add(directionalLight)
}

// 创建字母方块
const createLetterBlock = letter => {
  if (!geometryPool.cube) {
    geometryPool.cube = new THREE.BoxGeometry(blockSize, blockSize, blockSize)
  }
  const cubeGeometry = geometryPool.cube

  const texture = loadBlockTexture()

  // 随机决定是否生成特效方块
  let blockType = SPECIAL_BLOCK_TYPES.NORMAL
  let specialConfig = null

  const random = Math.random()
  let cumulativeProbability = 0

  for (const [type, config] of Object.entries(SPECIAL_BLOCK_CONFIG)) {
    cumulativeProbability += config.probability
    if (random < cumulativeProbability) {
      blockType = type
      specialConfig = config
      break
    }
  }

  // 根据方块类型创建材质
  const materials = []
  for (let i = 0; i < 6; i++) {
    // 特效方块使用标准材质以支持发光效果
    if (blockType !== SPECIAL_BLOCK_TYPES.NORMAL) {
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        color: specialConfig.color,
        emissive: specialConfig.glowColor,
        emissiveIntensity: 0.5
      })
      materials.push(material)
    } else {
      // 普通方块使用基础材质
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95
      })
      materials.push(material)
    }
  }

  const cubeMesh = new THREE.Mesh(cubeGeometry, materials)

  const blockPosition = new THREE.Vector3(
    frustumBounds.left + Math.random() * (frustumBounds.right - frustumBounds.left),
    frustumBounds.top,
    frustumBounds.nearZ + Math.random() * (frustumBounds.farZ - frustumBounds.nearZ)
  )
  cubeMesh.position.copy(blockPosition)

  const blockRotation = new THREE.Euler(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  )
  cubeMesh.rotation.copy(blockRotation)

  // 特效方块特殊缩放
  if (specialConfig && specialConfig.scale !== 1.0) {
    cubeMesh.scale.setScalar(specialConfig.scale)
  }

  const bigFrame = createBigFrameForBlock(letter, blockPosition, blockRotation)

  if (scene) {
    scene.add(cubeMesh)
  }

  // 不再使用物理引擎，改用简单动画
  const levelConfig = getCurrentLevelConfig()
  const baseSpeed = letterSpeed * levelConfig.speedMultiplier

  return {
    mesh: cubeMesh,
    letter,
    speed: baseSpeed + Math.random() * 0.005,
    hit: false,
    bigFrame,
    blockType,
    specialConfig
  }
}

// 生成字母方块
const spawnLetterBlock = () => {
  if (gameState.value !== 'playing') return

  const levelConfig = getCurrentLevelConfig()
  if (letterBlocks.length >= levelConfig.maxBlocks) return

  const letter = letters[Math.floor(Math.random() * letters.length)]
  const block = createLetterBlock(letter)
  letterBlocks.push(block)
}

// 启动方块生成
const startBlockSpawn = () => {
  // 清理现有的方块生成间隔
  if (spawnInterval) {
    clearInterval(spawnInterval)
    spawnInterval = null
  }

  const levelConfig = getCurrentLevelConfig()
  const spawnIntervalTime = 1000 / (spawnRate * levelConfig.spawnMultiplier)

  spawnInterval = setInterval(() => {
    if (gameState.value === 'playing') {
      spawnLetterBlock()
    } else {
      clearInterval(spawnInterval)
      spawnInterval = null
    }
  }, spawnIntervalTime)
}

// 更新WPM（每分钟字数）
const updateWPM = () => {
  if (gameStartTime.value === 0) return

  const currentTime = Date.now()
  const elapsedMinutes = (currentTime - gameStartTime.value) / 60000 // 转换为分钟

  if (elapsedMinutes > 0) {
    // WPM = (总字符数 / 5) / 分钟数（标准WPM计算方法）
    wpm.value = Math.round(correctKeystrokes.value / 5 / elapsedMinutes)
  }
}

// 创建爆炸粒子
const createExplosion = (position, color = 0xffd93d) => {
  const particleCount = 20 + Math.floor(Math.random() * 15) // 15-35个粒子

  for (let i = 0; i < particleCount; i++) {
    const particleColor = particleColors[Math.floor(Math.random() * particleColors.length)]
    const material = getParticleMaterial(particleColor)
    const mesh = getParticleMesh(material)
    mesh.position.copy(position)

    // 添加一些随机偏移，使爆炸更自然
    mesh.position.x += (Math.random() - 0.5) * 0.3
    mesh.position.y += (Math.random() - 0.5) * 0.3
    mesh.position.z += (Math.random() - 0.5) * 0.3

    if (scene) {
      scene.add(mesh)
    }

    // 随机爆炸速度和方向
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8 + 3, // 向上稍微偏移
      (Math.random() - 0.5) * 8
    )

    // 随机粒子大小
    const scale = 0.8 + Math.random() * 0.6
    mesh.scale.set(scale, scale, scale)

    // 保存粒子对象引用
    const particle = {
      mesh,
      velocity,
      life: 1,
      decay: 0.02 + Math.random() * 0.01,
      material // 保存材质引用以便回收
    }
    particles.push(particle)

    // GSAP 粒子动画
    const duration = 0.8 + Math.random() * 0.4
    const targetPos = {
      x: position.x + velocity.x * duration,
      y: position.y + velocity.y * duration - 2, // 重力效果
      z: position.z + velocity.z * duration
    }

    // 位置动画（抛物线运动）
    gsap.to(mesh.position, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: duration,
      ease: 'power2.out'
    })

    // 缩放动画（爆炸后收缩）
    gsap.to(mesh.scale, {
      x: 0.1,
      y: 0.1,
      z: 0.1,
      duration: duration,
      ease: 'power2.in',
      delay: duration * 0.3
    })

    // 透明度动画（淡出）
    gsap.to(material, {
      opacity: 0,
      duration: duration,
      ease: 'power2.in',
      delay: duration * 0.2,
      onComplete: () => {
        // 粒子完全淡出后移除
        const index = particles.indexOf(particle)
        if (index > -1) {
          particles.splice(index, 1)
        }
        if (scene) {
          scene.remove(mesh)
        }
        // 回收到对象池而不是dispose
        recycleParticle(mesh, material)
      }
    })
  }
}

// 播放消除音效
const playEliminateSound = block => {
  try {
    // 使用全局 AudioContext 实例
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // 根据方块类型调整音效
    if (block.blockType && block.blockType !== 'normal') {
      const type = block.blockType
      if (type === 'gold') {
        // 金色方块 - 高频音
        oscillator.frequency.setValueAtTime(880, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1)
      } else if (type === 'time') {
        // 时钟方块 - 中高频音
        oscillator.frequency.setValueAtTime(660, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1)
      } else if (type === 'fire') {
        // 火焰方块 - 低频到高频
        oscillator.frequency.setValueAtTime(300, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.15)
      } else if (type === 'ice') {
        // 冰冻方块 - 清脆音
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.1)
      } else if (type === 'diamond') {
        // 钻石方块 - 双音
        oscillator.frequency.setValueAtTime(1200, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.15)
      } else if (type === 'rainbow') {
        // 彩虹方块 - 多变音
        oscillator.frequency.setValueAtTime(500, ctx.currentTime)
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.08)
        oscillator.frequency.setValueAtTime(1500, ctx.currentTime + 0.16)
      }
    } else {
      // 普通方块 - 随机音
      oscillator.frequency.setValueAtTime(440 + Math.random() * 220, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1)
    }

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.2)
  } catch (err) {
    // 音效播放失败时静默处理，不影响游戏体验
    console.warn('音效播放失败:', err)
  }
}

// 方块爆炸
const explodeLetter = block => {
  if (!block || !block.mesh) return

  // 保存位置用于粒子爆炸
  const position = block.mesh.position.clone()

  // GSAP 方块消失动画（缩小并旋转）
  gsap.to(block.mesh.scale, {
    x: 0,
    y: 0,
    z: 0,
    duration: 0.3,
    ease: 'back.in(2)',
    onComplete: () => {
      disposeBlock(block)
    }
  })

  // 大方框也跟着消失
  if (block.bigFrame && block.bigFrame.mesh) {
    gsap.to(block.bigFrame.mesh.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.3,
      ease: 'back.in(2)'
    })
  }

  // 创建爆炸粒子
  createExplosion(position)
}

// 升级特效
const createLevelUpEffect = newLevel => {
  const levelConfig = getCurrentLevelConfig()

  // 创建升级文字特效
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 512
  canvas.height = 128

  if (ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0)'
    ctx.fillRect(0, 0, 512, 128)
    ctx.font = 'bold 64px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = levelConfig.levelColor
    ctx.shadowColor = levelConfig.levelColor
    ctx.shadowBlur = 20
    ctx.fillText(`LEVEL ${newLevel} - ${levelConfig.levelName}`, 256, 64)
  }

  // 在场景中心创建升级提示
  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending
  })
  const sprite = new THREE.Sprite(material)
  sprite.position.set(0, 8, 5)
  sprite.scale.set(10, 2.5, 1)

  if (scene) {
    scene.add(sprite)
  }

  // 升级文字动画
  gsap.to(sprite.position, {
    y: 12,
    duration: 2.5,
    ease: 'power1.out'
  })

  gsap.to(material, {
    opacity: 0,
    duration: 1.5,
    delay: 1,
    ease: 'power2.in',
    onComplete: () => {
      if (scene) {
        scene.remove(sprite)
      }
      texture.dispose()
      material.dispose()
    }
  })

  gsap.to(sprite.scale, {
    x: 12,
    y: 3,
    duration: 2.5,
    ease: 'power1.out',
    yoyo: true,
    repeat: 1
  })

  // 创建升级粒子爆发
  const particleCount = 50 + newLevel * 2
  const upgradeColors = [
    0xffd700, // 金色
    0xff6b6b, // 红色
    0x6bcb77, // 绿色
    0x4d96ff, // 蓝色
    0xff6ec7, // 粉色
    0x00ff7f, // 春绿
    0xff8c00 // 橙色
  ]

  for (let i = 0; i < particleCount; i++) {
    const color = upgradeColors[Math.floor(Math.random() * upgradeColors.length)]
    const material = getParticleMaterial(color)
    const mesh = getParticleMesh(material)
    mesh.position.set(
      (Math.random() - 0.5) * 8,
      6 + (Math.random() - 0.5) * 4,
      5 + (Math.random() - 0.5) * 4
    )

    if (scene) {
      scene.add(mesh)
    }

    const particle = {
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        Math.random() * 8,
        (Math.random() - 0.5) * 12
      ),
      life: 1,
      decay: 0.015 + Math.random() * 0.01,
      material // 保存材质引用以便回收
    }
    particles.push(particle)

    const duration = 2 + Math.random() * 1
    const targetPos = {
      x: mesh.position.x + particle.velocity.x * duration,
      y: mesh.position.y + particle.velocity.y * duration - 4,
      z: mesh.position.z + particle.velocity.z * duration
    }

    gsap.to(mesh.position, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: duration,
      ease: 'power2.out'
    })

    gsap.to(mesh.scale, {
      x: 0.1,
      y: 0.1,
      z: 0.1,
      duration: duration,
      ease: 'power2.in',
      delay: duration * 0.3
    })

    gsap.to(material, {
      opacity: 0,
      duration: duration,
      ease: 'power2.in',
      delay: duration * 0.2,
      onComplete: () => {
        const index = particles.indexOf(particle)
        if (index > -1) {
          particles.splice(index, 1)
        }
        if (scene) {
          scene.remove(mesh)
        }
        // 回收到对象池
        recycleParticle(mesh, material)
      }
    })
  }
}

// 显示浮动文本
const showFloatingText = (text, position, color) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 512
  canvas.height = 128

  ctx.fillStyle = `rgba(0, 0, 0, 0.8)`
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.font = 'bold 48px Arial'
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(material)

  sprite.position.copy(position)
  sprite.position.y += 2
  sprite.scale.set(4, 1, 1)

  if (scene) {
    scene.add(sprite)
  }

  // 追踪浮动文本以便清理
  floatingTextSprites.push({
    sprite,
    texture,
    canvas
  })

  const positionTween = gsap.to(sprite.position, {
    y: sprite.position.y + 2,
    duration: 1.5,
    ease: 'power1.out'
  })

  const opacityTween = gsap.to(material, {
    opacity: 0,
    duration: 1.5,
    onComplete: () => {
      // 从追踪列表中移除
      const index = floatingTextSprites.findIndex(item => item.sprite === sprite)
      if (index > -1) {
        floatingTextSprites.splice(index, 1)
      }

      if (scene) {
        scene.remove(sprite)
      }
      texture.dispose()
      material.dispose()

      // 释放Canvas内存
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
      }
    }
  })

  // 追踪GSAP动画
  activeAnimations.push(positionTween, opacityTween)
}

// 创建特效方块特殊视觉效果（使用对象池优化）
const createSpecialEffect = (position, type) => {
  const particleCount = 30

  const colors = {
    fire: [0xff4500, 0xff6b35, 0xffd700],
    time: [0x00bfff, 0x00d4ff, 0xffffff],
    diamond: [0x00ffff, 0x40e0d0, 0xffffff],
    ice: [0x87ceeb, 0xadd8e6, 0xffffff],
    rainbow: [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x9400d3]
  }

  const typeColors = colors[type] || [0xffffff]

  for (let i = 0; i < particleCount; i++) {
    const color = typeColors[Math.floor(Math.random() * typeColors.length)]
    const material = getParticleMaterial(color)
    const mesh = getParticleMesh(material)
    mesh.position.copy(position)

    if (scene) {
      scene.add(mesh)
    }

    const particle = {
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6,
        (Math.random() - 0.5) * 8
      ),
      life: 1,
      decay: 0.02 + Math.random() * 0.01,
      material // 保存材质引用以便回收
    }
    particles.push(particle)

    const positionTween = gsap.to(mesh.position, {
      x: mesh.position.x + particle.velocity.x * 1.5,
      y: mesh.position.y + particle.velocity.y * 1.5,
      z: mesh.position.z + particle.velocity.z * 1.5,
      duration: 1.5,
      ease: 'power2.out'
    })

    const scaleTween = gsap.to(mesh.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.5,
      ease: 'power2.in'
    })

    const opacityTween = gsap.to(material, {
      opacity: 0,
      duration: 1.5,
      onComplete: () => {
        const index = particles.indexOf(particle)
        if (index > -1) {
          particles.splice(index, 1)
        }
        if (scene) {
          scene.remove(mesh)
        }
        // 回收到对象池
        recycleParticle(mesh, material)
      }
    })

    // 追踪GSAP动画
    activeAnimations.push(positionTween, scaleTween, opacityTween)
  }
}

// 激活全局减速
const activateGlobalSlow = () => {
  isGlobalSlowed = true
  globalSlowEndTime = Date.now() + SPECIAL_BLOCK_CONFIG[SPECIAL_BLOCK_TYPES.ICE].slowDuration
}

// 更新游戏
const updateGame = () => {
  if (gameState.value !== 'playing') return

  // 检查全局减速状态
  if (isGlobalSlowed && Date.now() > globalSlowEndTime) {
    isGlobalSlowed = false
  }

  // 更新字母方块（使用简单动画，不使用物理引擎）
  for (let i = letterBlocks.length - 1; i >= 0; i--) {
    const block = letterBlocks[i]
    if (!block || !block.mesh || block.hit) continue

    // 简单下落动画（减速状态下速度减半）
    let speedMultiplier = isGlobalSlowed ? 0.5 : 1.0
    block.mesh.position.y -= block.speed * speedMultiplier

    if (block.bigFrame && block.bigFrame.mesh) {
      block.bigFrame.mesh.position.y = block.mesh.position.y
      block.bigFrame.mesh.position.z = block.mesh.position.z + 0.1
    }

    // 冰冻方块旋转速度减慢
    let rotationSpeed = block.blockType === SPECIAL_BLOCK_TYPES.ICE ? 0.5 : 1.0
    if (isGlobalSlowed) rotationSpeed *= 0.5

    block.mesh.rotation.x += ROTATION_SPEED_X * rotationSpeed
    block.mesh.rotation.y += ROTATION_SPEED_Y * rotationSpeed

    if (block.bigFrame && block.bigFrame.mesh) {
      block.bigFrame.mesh.rotation.x = block.mesh.rotation.x
      block.bigFrame.mesh.rotation.y = block.mesh.rotation.y
    }

    // 彩虹方块动态变色（优化：降低更新频率并使用缓存颜色）
    if (block.blockType === SPECIAL_BLOCK_TYPES.RAINBOW && block.mesh.material) {
      if (!block.lastColorUpdate) {
        block.lastColorUpdate = 0
        block.cachedColor = new THREE.Color() // 缓存颜色对象
      }
      const updateTime = 250 // 从100ms提升到250ms，减少70%更新频率
      const currentTime = Date.now() // 缓存时间戳，避免重复调用
      if (currentTime - block.lastColorUpdate > updateTime) {
        block.lastColorUpdate = currentTime
        const time = currentTime * 0.0005 // 使用缓存的时间戳
        const hue = (time * 2) % 6
        block.cachedColor.setHSL(hue / 6, 1, 0.5)
        const materials = Array.isArray(block.mesh.material) ? block.mesh.material : [block.mesh.material]
        // 只更新必要的属性
        materials.forEach(mat => {
          if (mat.color && mat.color.getHex() !== block.cachedColor.getHex()) {
            mat.color.copy(block.cachedColor)
          }
          if (mat.emissive && mat.emissive.getHex() !== block.cachedColor.getHex()) {
            mat.emissive.copy(block.cachedColor)
          }
        })
      }
    }

    // 检查方块是否超出边界（左右上下前后）
    const pos = block.mesh.position
    if (
      pos.x < frustumBounds.left ||
      pos.x > frustumBounds.right ||
      pos.y < frustumBounds.bottom ||
      pos.z < frustumBounds.nearZ ||
      pos.z > frustumBounds.farZ
    ) {
      disposeBlock(block)
      letterBlocks.splice(i, 1)
    }
  }

  // 更新粒子（虽然GSAP已经处理了动画，但为了统一清理）
  // 这里主要是为了确保粒子列表被正确维护
}

// 渲染循环
const animate = () => {
  // 防止重复调用
  if (animationId !== null) {
    return
  }

  // 启动渲染循环
  const renderLoop = () => {
    if (gameState.value === 'playing') {
      updateGame()
    }
    if (renderer && scene && camera && (gameState.value === 'playing' || gameState.value === 'paused')) {
      renderer.render(scene, camera)
    }
    animationId = requestAnimationFrame(renderLoop)
  }

  animationId = requestAnimationFrame(renderLoop)
}

// 开始游戏
const startGame = () => {
  // 随机切换全景图背景（带默认值处理）
  const randomPanoramaIndex = Math.floor(Math.random() * 10) + 1
  panoramaImage.value =
    `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/quanjing-v5/h-v5-${randomPanoramaIndex}.png` ||
    `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/quanjing-v5/h-v5-1.png`

  // 设置游戏时间
  LEVEL_TIME.value = selectedTime.value
  timeLeft.value = selectedTime.value

  // 清理所有旧的游戏对象（方块、粒子、动画）
  clearGameObjects()

  // 重置游戏状态（不管之前是什么状态）
  score.value = 0
  level.value = 1
  letterBlocks.length = 0

  // 重置统计
  combo.value = 0
  maxCombo.value = 0
  totalKeystrokes.value = 0
  correctKeystrokes.value = 0
  wrongKeystrokes.value = 0
  accuracy.value = 100
  wpm.value = 0
  gameStartTime.value = Date.now()

  // 更新等级配置
  updateLevelConfig()
  updateTimerColor()
  updateTimerTextColor()

  gameState.value = 'playing'

  // 播放音乐
  playMusic()

  animate()

  // 启动倒计时
  startTimer()

  // 预先生成2-3个方块，避免等待
  const levelConfig = getCurrentLevelConfig()
  const initialBlockCount = Math.min(3, levelConfig.maxBlocks)
  for (let i = 0; i < initialBlockCount; i++) {
    spawnLetterBlock()
  }

  // 启动方块生成
  startBlockSpawn()
}

// 启动倒计时
const startTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }

  timerInterval.value = setInterval(() => {
    if (gameState.value === 'playing') {
      timeLeft.value -= 0.1 // 每100ms减少0.1秒
      updateTimerColor()
      updateTimerTextColor()

      if (timeLeft.value <= 0) {
        // 时间到，结束游戏
        endGame()
      }
    } else {
      clearInterval(timerInterval.value)
      timerInterval.value = null
    }
  }, 100)
}

// 升级（每局90秒，升级不增加时间）
const levelUp = () => {
  level.value++

  // 升级特效：创建升级粒子爆炸
  createLevelUpEffect(level.value)

  // 更新等级配置
  updateLevelConfig()
  updateTimerColor()
  updateTimerTextColor()
}

// 检查是否需要升级
const checkLevelUp = () => {
  const config = getCurrentLevelConfig()
  const nextLevelScore = config.nextLevelScore

  // 如果有下一级且分数达到要求，升级
  if (nextLevelScore && score.value >= nextLevelScore && level.value < LEVEL_CONFIG.maxLevel) {
    levelUp()
  }
}

// 继续挑战（添加时间，保留分数）
const continueGame = () => {
  // 停止现有的计时器（防止重复）
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }

  // 停止现有的方块生成（防止重复）
  if (spawnInterval) {
    clearInterval(spawnInterval)
    spawnInterval = null
  }

  // 增加时间
  timeLeft.value += 30

  // 更新计时器颜色
  updateTimerColor()
  updateTimerTextColor()

  // 重新开始游戏动画循环
  gameState.value = 'playing'

  // 播放音乐
  playMusic()

  animate()

  // 启动倒计时
  startTimer()

  // 启动方块生成
  startBlockSpawn()
}

// 结束游戏
const endGame = () => {
  gameState.value = 'gameover'

  // 停止动画循环
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  // 停止倒计时
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }

  // 停止方块生成
  if (spawnInterval) {
    clearInterval(spawnInterval)
    spawnInterval = null
  }

  // 停止连击计时器
  if (comboTimer.value) {
    clearTimeout(comboTimer.value)
    comboTimer.value = null
  }

  // 暂停音乐
  pauseMusic()
}

// 返回首页
const goBack = () => {
  // 停止动画循环
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  // 停止倒计时
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }

  // 停止方块生成
  if (spawnInterval) {
    clearInterval(spawnInterval)
    spawnInterval = null
  }

  // 停止连击计时器
  if (comboTimer.value) {
    clearTimeout(comboTimer.value)
    comboTimer.value = null
  }

  // 停止音乐
  pauseMusic()

  // 清理所有方块
  letterBlocks.forEach(block => {
    // 清理彩虹方块的缓存属性
    if (block.lastColorUpdate) {
      delete block.lastColorUpdate
    }
    if (block.cachedColor) {
      delete block.cachedColor
    }
    disposeBlock(block)
  })
  letterBlocks.length = 0

  // 清理粒子并回收到对象池（统一使用对象池回收机制）
  particles.forEach(p => {
    if (p.mesh && scene) {
      scene.remove(p.mesh)
    }
    if (p.material && p.mesh) {
      recycleParticle(p.mesh, p.material)
    }
  })
  particles.length = 0

  // 返回首页
  router.push('/')
}

// 重新开始
const restartGame = () => {
  // 停止动画循环
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  // 清理连击计时器
  if (comboTimer.value) {
    clearTimeout(comboTimer.value)
    comboTimer.value = null
  }

  // 清理所有GSAP动画
  activeAnimations.forEach(tween => {
    if (tween && tween.kill) {
      tween.kill()
    }
  })
  activeAnimations.length = 0
  gsap.killTweensOf('*')

  // 清理浮动文本
  floatingTextSprites.forEach(item => {
    if (item.sprite && scene) {
      scene.remove(item.sprite)
    }
    if (item.texture) {
      item.texture.dispose()
    }
    if (item.canvas) {
      item.canvas.width = 0
      item.canvas.height = 0
    }
    if (item.sprite && item.sprite.material) {
      item.sprite.material.dispose()
    }
  })
  floatingTextSprites.length = 0

  // 清理粒子并回收到对象池
  particles.forEach(p => {
    if (p.mesh && scene) {
      scene.remove(p.mesh)
    }
    if (p.material && p.mesh) {
      recycleParticle(p.mesh, p.material)
    }
  })
  particles.length = 0

  // 清理字母方块
  letterBlocks.forEach(block => {
    // 清理彩虹方块的缓存属性
    if (block.lastColorUpdate) {
      delete block.lastColorUpdate
    }
    if (block.cachedColor) {
      delete block.cachedColor
    }
    disposeBlock(block)
  })
  letterBlocks.length = 0
  keysPressed.value.clear()

  // 重置游戏状态
  gameState.value = 'ready'
  score.value = 0
  level.value = 1
  timeLeft.value = LEVEL_TIME // 重置倒计时

  // 重置统计
  combo.value = 0
  maxCombo.value = 0
  totalKeystrokes.value = 0
  correctKeystrokes.value = 0
  wrongKeystrokes.value = 0
  accuracy.value = 100
  wpm.value = 0
  gameStartTime.value = 0

  // 重置等级配置
  updateLevelConfig()
  updateTimerColor()
  updateTimerTextColor()

  updateFrustumBounds()
}

// 暂停游戏
const pauseGame = () => {
  if (gameState.value === 'playing') {
    gameState.value = 'paused'

    // 停止动画循环
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    // 停止方块生成
    if (spawnInterval) {
      clearInterval(spawnInterval)
      spawnInterval = null
    }

    // 暂停所有GSAP动画
    gsap.globalTimeline.pause()

    // 暂停音乐
    pauseMusic()
  }
}

// 继续游戏
const resumeGame = () => {
  if (gameState.value === 'paused') {
    // 恢复所有GSAP动画
    gsap.globalTimeline.resume()

    animate()

    // 播放音乐
    playMusic()

    gameState.value = 'playing'

    // 启动方块生成
    startBlockSpawn()
  }
}

// 处理按键输入
const handleKeyPress = upperKey => {
  if (gameState.value !== 'playing') return

  // 只处理字母键
  if (!/^[A-Z]$/.test(upperKey)) return

  // 记录总按键数
  totalKeystrokes.value++

  // 查找对应的方块
  const targetBlock = letterBlocks.find(block => block && !block.hit && block.letter === upperKey)

  if (targetBlock) {
    // 击中目标
    targetBlock.hit = true
    explodeLetter(targetBlock)
    letterBlocks.splice(letterBlocks.indexOf(targetBlock), 1)

    // 播放击中音效
    playEliminateSound(targetBlock)

    // 记录正确按键
    correctKeystrokes.value++

    // 连击系统
    combo.value++
    if (combo.value > maxCombo.value) {
      maxCombo.value = combo.value
    }

    // 重置连击计时器
    if (comboTimer.value) {
      clearTimeout(comboTimer.value)
    }
    comboTimer.value = setTimeout(() => {
      combo.value = 0
    }, COMBO_TIMEOUT)

    // 更新WPM
    updateWPM()

    // 获取等级配置
    const levelConfig = getCurrentLevelConfig()

    // 连击加成：连击数越高，得分越多（使用等级连击倍率）
    const comboBonus = Math.floor(combo.value / 5) * 5 * levelConfig.comboMultiplier
    let pointsEarned = 10 * level.value + comboBonus

    // 处理特效方块
    if (targetBlock.blockType && targetBlock.blockType !== SPECIAL_BLOCK_TYPES.NORMAL) {
      const config = targetBlock.specialConfig

      switch (targetBlock.blockType) {
        case SPECIAL_BLOCK_TYPES.GOLD:
          // 🌟 金色方块 - 双倍分数
          pointsEarned *= config.scoreMultiplier
          showFloatingText(`🌟 金色方块 +${pointsEarned}`, targetBlock.mesh.position, 0xffd700)
          break

        case SPECIAL_BLOCK_TYPES.FIRE:
          // 🔥 火焰方块 - 连击+5
          combo.value += config.bonusCombo
          if (combo.value > maxCombo.value) {
            maxCombo.value = combo.value
          }
          showFloatingText(`🔥 火焰方块 连击+5`, targetBlock.mesh.position, 0xff4500)
          createSpecialEffect(targetBlock.mesh.position, 'fire')
          break

        case SPECIAL_BLOCK_TYPES.TIME:
          // ⏰ 时钟方块 - 时间+5秒
          timeLeft.value += config.timeBonus
          showFloatingText(`⏰ 时钟方块 时间+5秒`, targetBlock.mesh.position, 0x00bfff)
          createSpecialEffect(targetBlock.mesh.position, 'time')
          break

        case SPECIAL_BLOCK_TYPES.DIAMOND:
          // 💎 钻石方块 - 分数+50 + 连击+3
          score.value += config.scoreBonus
          combo.value += config.bonusCombo
          if (combo.value > maxCombo.value) {
            maxCombo.value = combo.value
          }
          showFloatingText(`💎 钻石方块 +${config.scoreBonus}分 连击+3`, targetBlock.mesh.position, 0x00ffff)
          createSpecialEffect(targetBlock.mesh.position, 'diamond')
          break

        case SPECIAL_BLOCK_TYPES.ICE:
          // ❄️ 冰冻方块 - 全场减速2秒
          activateGlobalSlow()
          showFloatingText(`❄️ 冰冻方块 全场减速`, targetBlock.mesh.position, 0x87ceeb)
          createSpecialEffect(targetBlock.mesh.position, 'ice')
          break

        case SPECIAL_BLOCK_TYPES.RAINBOW:
          // 🌈 彩虹方块 - 彩虹特效
          showFloatingText(`🌈 彩虹方块`, targetBlock.mesh.position, 0xffffff)
          createSpecialEffect(targetBlock.mesh.position, 'rainbow')
          break
      }
    }

    score.value += pointsEarned

    // 每次得分后更新进度显示
    updateLevelConfig()

    // 检查是否达到升级分数
    checkLevelUp()
  } else {
    // 按了字母键但没有对应的目标，记录错误
    wrongKeystrokes.value++

    // 连击中断
    if (combo.value > 0) {
      combo.value = 0
      if (comboTimer.value) {
        clearTimeout(comboTimer.value)
        comboTimer.value = null
      }
    }
  }

  // 更新准确率
  accuracy.value = Math.round((correctKeystrokes.value / totalKeystrokes.value) * 100)
}

// 键盘事件
const handleKeyDown = event => {
  event.preventDefault()
  const key = event.key.toLowerCase()

  if (event.key === 'Escape') {
    if (gameState.value === 'playing') {
      pauseGame()
    } else if (gameState.value === 'paused') {
      resumeGame()
    }
    return
  }

  // 防止按住按键时重复触发
  if (keysPressed.value.has(key)) return

  // 添加到已按键集合（用于防止重复）
  keysPressed.value.add(key)

  // 处理按键
  handleKeyPress(key.toUpperCase())
}

const handleKeyUp = event => {
  event.preventDefault()
  const key = event.key.toLowerCase()
  keysPressed.value.delete(key)
}

// 窗口大小调整（带防抖优化）
let resizeTimeout = null
const handleResize = () => {
  if (!gameCanvas.value || !camera || !renderer) return

  // 防抖：延迟执行，避免频繁调用
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }

  resizeTimeout = setTimeout(() => {
    const width = gameCanvas.value.clientWidth
    const height = gameCanvas.value.clientHeight

    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    updateFrustumBounds()
  }, 100) // 100ms防抖延迟
}

// 生命周期
onMounted(() => {
  initGameScene()
  initMusic()

  // 确保清理旧数据
  letterBlocks.length = 0
  particles.length = 0

  // 渲染一帧，显示初始状态
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }

  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  // 清理所有追踪的GSAP动画
  activeAnimations.forEach(tween => {
    if (tween && tween.kill) {
      tween.kill()
    }
  })
  activeAnimations.length = 0

  // 清理所有GSAP动画（全局清理）
  gsap.killTweensOf('*')
  gsap.globalTimeline.clear()

  // 清理动画帧
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  // 清理所有定时器
  if (spawnInterval) {
    clearInterval(spawnInterval)
    spawnInterval = null
  }

  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }

  // 清理连击计时器
  if (comboTimer.value) {
    clearTimeout(comboTimer.value)
    comboTimer.value = null
  }

  // 移除事件监听器
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)

  // 清理字母方块
  letterBlocks.forEach(block => {
    // 清理彩虹方块的缓存属性
    if (block.lastColorUpdate) {
      delete block.lastColorUpdate
    }
    if (block.cachedColor) {
      delete block.cachedColor
    }
    disposeBlock(block)
  })
  letterBlocks.length = 0

  // 清理粒子并回收到对象池
  particles.forEach(p => {
    if (p.mesh && scene) {
      scene.remove(p.mesh)
    }
    if (p.material && p.mesh) {
      recycleParticle(p.mesh, p.material)
    }
  })
  particles.length = 0

  // 清理浮动文本
  floatingTextSprites.forEach(item => {
    if (item.sprite && scene) {
      scene.remove(item.sprite)
    }
    if (item.texture) {
      item.texture.dispose()
    }
    if (item.canvas) {
      item.canvas.width = 0
      item.canvas.height = 0
    }
    if (item.sprite && item.sprite.material) {
      item.sprite.material.dispose()
    }
  })
  floatingTextSprites.length = 0

  // 清理材质缓存
  materialCache.forEach(materials => {
    if (Array.isArray(materials)) {
      materials.forEach(mat => {
        if (mat && typeof mat.dispose === 'function') {
          mat.dispose()
        }
      })
    }
  })
  materialCache.clear()

  // 清理纹理缓存
  textureCache.forEach(tex => {
    if (tex && typeof tex.dispose === 'function') {
      tex.dispose()
    }
  })
  textureCache.clear()

  // 清理几何体对象池
  if (geometryPool.cube) {
    geometryPool.cube.dispose()
    geometryPool.cube = null
  }
  if (geometryPool.frame) {
    geometryPool.frame.dispose()
    geometryPool.frame = null
  }

  // 清理粒子几何体和对象池
  if (particleGeometry) {
    particleGeometry.dispose()
  }

  // 清理粒子对象池
  particlePool.mesh.forEach(mesh => {
    if (mesh && mesh.geometry) {
      mesh.geometry.dispose()
    }
  })
  particlePool.material.forEach(material => {
    if (material && typeof material.dispose === 'function') {
      material.dispose()
    }
  })
  particlePool.mesh.length = 0
  particlePool.material.length = 0

  // 清理边界辅助线
  if (scene && scene.userData.boundaryHelpers) {
    scene.userData.boundaryHelpers.forEach(line => {
      if (line) {
        if (line.geometry) {
          line.geometry.dispose()
        }
        if (line.material) {
          line.material.dispose()
        }
        scene.remove(line)
      }
    })
    scene.userData.boundaryHelpers = []
  }

  // 清理音乐
  if (bgMusic) {
    bgMusic.pause()
    bgMusic.src = ''
    bgMusic.removeEventListener('ended', musicEndedHandler)
  }

  // 清理音效 AudioContext
  if (audioContext) {
    audioContext.close().catch(err => {
      console.warn('AudioContext 关闭失败:', err)
    })
    audioContext = null
    audioContextResumed = false // 重置恢复状态标志
  }

  // 清理渲染器
  if (renderer) {
    renderer.dispose()
  }

  // 清理场景
  if (scene) {
    scene.traverse(object => {
      if (object.isMesh || object.isSprite) {
        if (object.geometry) {
          object.geometry.dispose()
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose())
          } else {
            object.material.dispose()
          }
        }
      }
    })
    scene.clear()
  }
})
</script>

<style scoped>
.meteor-game-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: url('/quanjingtu/game.png') center center / cover no-repeat;
}

.game-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}

.game-ui {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
}

.game-info {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%);
  padding: 20px;
  border-radius: 16px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  pointer-events: auto;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  min-width: 240px;
  animation: slideInLeft 0.5s ease-out;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-icon {
  font-size: 24px;
  filter: drop-shadow(0 0 10px rgba(102, 126, 234, 0.6));
}

.info-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}

.stat-icon {
  font-size: 28px;
  filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.5));
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.stat-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 0 20px rgba(102, 126, 234, 0.8);
}

.stat-item.score .stat-value {
  background: linear-gradient(135deg, #ffd700 0%, #ff6b6b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-item.combo .stat-value {
  background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: all 0.3s ease;
}

.stat-item.combo.combo-active .stat-value {
  animation: comboPulse 0.5s ease-in-out infinite alternate;
}

.stat-item.accuracy .stat-value {
  background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-item.wpm .stat-value {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.combo-bonus {
  text-align: center;
  padding: 8px 12px;
  margin-top: 8px;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 165, 0, 0.2) 100%);
  border-radius: 8px;
  border: 1px solid rgba(255, 165, 0, 0.3);
  animation: slideIn 0.3s ease-out;
}

.combo-bonus-text {
  color: #ffa500;
  font-size: 14px;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(255, 165, 0, 0.8);
  letter-spacing: 1px;
}

/* 倒计时进度条（顶部正前方） */
.timer-progress-top {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 32px;
  background: linear-gradient(135deg, rgba(10, 30, 38, 0.76) 0%, rgba(2, 31, 49, 0.68) 100%);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  pointer-events: auto;
  z-index: 20;
  animation: slideDown 0.5s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.timer-progress-bar-top {
  width: 500px;
  height: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.timer-progress-fill-top {
  height: 100%;
  border-radius: 8px;
  transition:
    width 0.1s linear,
    background 0.3s ease;
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.8);
  position: relative;
}

.timer-progress-fill-top::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* 音乐控制 */
.music-control {
  position: absolute;
  top: 30px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(20, 20, 40, 0.4) 100%);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  pointer-events: auto;
  z-index: 20;
  animation: fadeInRight 0.5s ease-out;
  transition: all 0.3s ease;
}

.music-control.expanded {
  padding: 12px 20px;
}

.music-toggle-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.music-toggle-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.music-toggle-btn:active {
  transform: translateY(0);
}

.music-controls-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 5px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.music-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.music-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.music-btn:active {
  transform: translateY(0);
}

.music-btn.switch-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.music-icon {
  font-size: 22px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 5px;
}

.volume-icon {
  font-size: 16px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.volume-slider {
  width: 80px;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.6);
  transition: all 0.2s ease;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.8);
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.6);
}

.timer-text-top {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 700;
  text-shadow: 0 0 15px rgba(76, 175, 80, 0.8);
  letter-spacing: 1.5px;
  text-align: right;
}

.level-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.level-name {
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  text-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
  letter-spacing: 1px;
}

.level-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease-out;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: progressShine 2s ease-in-out infinite;
}

@keyframes progressShine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  font-weight: 500;
}

@keyframes comboPulse {
  from {
    transform: scale(1);
    text-shadow: 0 0 20px rgba(255, 107, 107, 0.8);
  }
  to {
    transform: scale(1.1);
    text-shadow: 0 0 30px rgba(255, 165, 0, 1);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.game-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}

.control-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  font-size: 15px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
}

.control-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn-icon {
  font-size: 16px;
}

.control-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.control-btn:hover::before {
  left: 100%;
}

.control-btn:active {
  transform: translateY(0);
}

.control-btn.pause-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
}

.control-btn.pause-btn:hover {
  box-shadow: 0 6px 20px rgba(240, 147, 251, 0.6);
}

.control-btn.resume-btn {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  box-shadow: 0 4px 15px rgba(79, 172, 254, 0.4);
}

.control-btn.resume-btn:hover {
  box-shadow: 0 6px 20px rgba(79, 172, 254, 0.6);
}

.control-btn.restart-btn {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  box-shadow: 0 4px 15px rgba(250, 112, 154, 0.4);
}

.control-btn.restart-btn:hover {
  box-shadow: 0 6px 20px rgba(250, 112, 154, 0.6);
}

.game-status {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(20, 20, 40, 0.7) 100%);
  padding: 50px 80px;
  border-radius: 24px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  pointer-events: auto;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: fadeInUp 0.6s ease-out;
  min-width: 600px;
  max-width: 800px;
}

.status-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.game-icon {
  font-size: 64px;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(102, 126, 234, 0.6));
}

.game-status h2 {
  color: #fff;
  font-size: 42px;
  margin: 10px 0 15px;
  text-shadow:
    0 0 30px rgba(102, 126, 234, 0.8),
    0 4px 8px rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.game-description p {
  color: rgba(255, 255, 255, 0.85);
  font-size: 18px;
  margin: 8px 0;
  line-height: 1.8;
  font-weight: 400;
}

.game-features {
  display: flex;
  gap: 12px;
  margin: 10px 0;
  flex-wrap: wrap;
  justify-content: center;
}

.feature-tag {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  color: rgba(255, 255, 255, 0.9);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid rgba(102, 126, 234, 0.3);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.feature-tag:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.time-selector {
  margin: 15px 0;

  .selector-title {
    font-size: 18px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    text-align: center;
    margin-bottom: 12px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .time-options {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .time-option {
    padding: 10px 20px;
    font-size: 16px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(102, 126, 234, 0.4);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    backdrop-filter: blur(10px);
    min-width: 90px;
  }

  .time-option:hover {
    background: rgba(102, 126, 234, 0.2);
    border-color: rgba(102, 126, 234, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .time-option.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: #764ba2;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
  }

  .time-option:active {
    transform: translateY(0);
  }
}

.game-status .start-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px;
  font-size: 22px;
  font-weight: bold;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow:
    0 6px 20px rgba(102, 126, 234, 0.5),
    0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 10px;
  position: relative;
  overflow: hidden;
  min-width: 200px;
}

.game-status .start-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: btnShine 2s ease-in-out infinite;
}

.game-status .back-home-btn {
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  color: white;
  border: none;
  padding: 10px;
  font-size: 22px;
  font-weight: bold;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow:
    0 6px 20px rgba(108, 117, 125, 0.5),
    0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 10px;
  position: relative;
  overflow: hidden;
  min-width: 200px;
}

.game-status .back-home-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.game-status .start-btn:hover {
  transform: translateY(-3px);
  box-shadow:
    0 10px 30px rgba(102, 126, 234, 0.6),
    0 4px 12px rgba(0, 0, 0, 0.4);
}

.game-status .start-btn:hover::before {
  left: 100%;
}

.game-status .start-btn:active {
  transform: translateY(-1px);
}

.game-status .back-home-btn:hover {
  transform: translateY(-3px);
  box-shadow:
    0 10px 30px rgba(108, 117, 125, 0.6),
    0 4px 12px rgba(0, 0, 0, 0.4);
}

.game-status .back-home-btn:hover::before {
  left: 100%;
}

.game-status .back-home-btn:active {
  transform: translateY(-1px);
}

.game-status.ready {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(20, 20, 40, 0.9) 100%);
}

.game-status.ready .game-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
}

.game-status.gameover {
  background: linear-gradient(135deg, rgba(20, 0, 0, 0.9) 0%, rgba(40, 20, 20, 0.9) 100%);
  border-color: rgba(255, 107, 107, 0.2);
}

.game-status.gameover h2 {
  background: linear-gradient(135deg, #ff6b6b 0%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.game-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 30px;
  margin: 15px 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 107, 107, 0.2);
  border-radius: 12px;
  padding: 20px 40px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.stat-row .stat-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  font-weight: 600;
}

.stat-row .stat-value {
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  text-shadow: 0 0 15px rgba(255, 107, 107, 0.6);
}

.stat-row .stat-value.highlight {
  background: linear-gradient(135deg, #ffd700 0%, #ff6b6b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 38px;
}

.game-message {
  margin: 15px 0;
}

.game-message p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 20px;
  font-style: italic;
  line-height: 1.6;
  font-weight: 500;
}

.game-status .restart-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #f093fb 100%);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.5);
  padding: 10px;
  font-size: 22px;
  min-width: 200px;
}

.game-status .restart-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(255, 107, 107, 0.6);
}

.game-status .restart-btn:active {
  transform: translateY(-1px);
}

.game-status .game-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

.game-status .continue-btn {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  box-shadow: 0 6px 20px rgba(79, 172, 254, 0.5);
  padding: 10px;
  font-size: 22px;
  min-width: 200px;
  transition: all 0.3s ease;
}

.game-status .continue-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(79, 172, 254, 0.6);
}

.game-status .continue-btn:active {
  transform: translateY(-1px);
}

.game-status .back-home-btn {
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  box-shadow: 0 6px 20px rgba(108, 117, 125, 0.5);
  padding: 10px;
  font-size: 22px;
  min-width: 200px;
  transition: all 0.3s ease;
}

.game-status .back-home-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(108, 117, 125, 0.6);
}

.game-status .back-home-btn:active {
  transform: translateY(-1px);
}

.game-status .back-home-btn-gameover {
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  box-shadow: 0 6px 20px rgba(108, 117, 125, 0.5);
  padding: 12px 24px;
  font-size: 24px;
  min-width: 220px;
  transition: all 0.3s ease;
  border: none;
  border-radius: 30px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.game-status .back-home-btn-gameover:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(108, 117, 125, 0.6);
  background: linear-gradient(135deg, #7d868c 0%, #5a6268 100%);
}

.game-status .back-home-btn-gameover:active {
  transform: translateY(-1px);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate(-50%, -45%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.controls-hint {
  position: absolute;
  bottom: 2px;
  left: 10%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  backdrop-filter: blur(15px);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: fadeInUp 0.8s ease-out 0.3s both;
}

.hint-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
}

.hint-icon {
  font-size: 24px;
  filter: drop-shadow(0 0 10px rgba(102, 126, 234, 0.6));
  animation: pulse 2s ease-in-out infinite;
}

.hint-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

@media (max-width: 768px) {
  .game-info {
    top: 10px;
    left: 10px;
    padding: 15px;
    min-width: 200px;
  }

  .game-status {
    padding: 35px 40px;
    max-width: 90vw;
    min-width: 400px;
  }

  .game-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px 20px;
    padding: 15px 30px;
  }

  .stat-row .stat-label {
    font-size: 16px;
  }

  .stat-row .stat-value {
    font-size: 22px;
  }

  .stat-row .stat-value.highlight {
    font-size: 30px;
  }

  .controls-hint {
    bottom: 15px;
  }
}

@media (max-width: 480px) {
  .game-info {
    top: 8px;
    left: 8px;
    padding: 12px;
    min-width: 180px;
  }

  .game-status {
    padding: 25px 30px;
    min-width: 300px;
    max-width: 95vw;
  }

  .game-stats {
    grid-template-columns: 1fr;
    gap: 8px 15px;
    padding: 12px 20px;
  }

  .stat-row .stat-label {
    font-size: 15px;
  }

  .stat-row .stat-value {
    font-size: 20px;
  }

  .stat-row .stat-value.highlight {
    font-size: 26px;
  }

  .game-status .start-btn,
  .game-status .restart-btn {
    padding: 14px 20px;
    font-size: 18px;
    min-width: 160px;
  }

  .controls-hint {
    bottom: 10px;
  }

  .timer-progress-top {
    padding: 12px 20px;
    top: 20px;
  }

  .timer-progress-bar-top {
    width: 280px;
    height: 12px;
  }

  .timer-text-top {
    font-size: 14px;
    min-width: 80px;
  }
}
</style>
