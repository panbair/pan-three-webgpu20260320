<template>
  <div ref="gameRoot" class="cyber-hacker-game">
    <!-- Three.js 粒子背景 Canvas -->
    <canvas ref="bgCanvas" class="bg-canvas"></canvas>

    <!-- CRT 扫描线叠加层 -->
    <div class="crt-overlay"></div>

    <!-- 故障滤镜层 -->
    <div class="glitch-layer" :class="{ active: glitchActive }"></div>

    <!-- ========== 开始界面 ========== -->
    <transition name="screen-fade">
      <div v-if="gameState === 'start'" class="start-screen">
        <!-- 角落装饰 -->
        <div class="corner tl"></div>
        <div class="corner tr"></div>
        <div class="corner bl"></div>
        <div class="corner br"></div>

        <div class="start-logo">
          <div class="logo-scan-line"></div>
          <div class="logo-glitch" data-text="CYBER HACK">CYBER HACK</div>
          <div class="logo-badge">
            <span class="badge-dot"></span>
            Terminal v2.0.77
            <span class="badge-sep">·</span>
            赛博朋克黑客终端
            <span class="badge-dot"></span>
          </div>
        </div>

        <div class="start-terminal">
          <div class="terminal-titlebar">
            <span class="tb-dot red"></span>
            <span class="tb-dot yellow"></span>
            <span class="tb-dot green"></span>
            <span class="tb-title">HACK_TERMINAL — bash</span>
          </div>
          <div class="terminal-body">
            <div
              v-for="(line, i) in bootLines"
              :key="i"
              class="terminal-line"
              :style="{ animationDelay: i * 0.12 + 's' }"
            >
              <span class="prompt">$</span>
              {{ line }}
            </div>
          </div>
        </div>

        <div class="start-buttons">
          <button class="cyber-btn primary" @click="startGame">
            <span class="btn-icon">▶</span>
            <span class="btn-glitch" data-text="开始入侵">开始入侵</span>
          </button>
          <button class="cyber-btn secondary" @click="showHelp = true">
            <span class="btn-icon">?</span>查看教程
          </button>
          <button class="cyber-btn back" @click="goBack">← 返回</button>
        </div>

        <div class="difficulty-select">
          <span class="d-label">// DIFFICULTY</span>
          <button
            v-for="d in difficulties"
            :key="d.id"
            class="d-btn"
            :class="{ active: selectedDifficulty === d.id }"
            :title="d.desc"
            @click="selectedDifficulty = d.id"
          >
            <span class="d-indicator"></span>
            <span class="d-name">{{ d.name }}</span>
            <span class="d-desc">{{ d.desc }}</span>
          </button>
        </div>
      </div>
    </transition>

    <!-- ========== 游戏界面 ========== -->
    <transition name="screen-fade">
      <div v-if="gameState === 'playing'" class="game-screen">
        <!-- 顶部系统状态条 -->
        <div class="sys-bar">
          <span class="sys-dot active"></span>
          <span class="sys-text">INTRUSION ACTIVE</span>
          <span class="sys-sep">|</span>
          <span class="sys-text">LV.{{ level }}/5</span>
          <span class="sys-fill"></span>
          <span class="sys-text muted">{{ new Date().toLocaleTimeString('en-US', { hour12: false }) }}</span>
        </div>

        <!-- 顶部HUD -->
        <div class="hud-top">
          <div class="hud-item">
            <span class="hud-label">SCORE</span>
            <span class="hud-value score-val">{{ score.toString().padStart(6, '0') }}</span>
          </div>
          <div class="hud-timer" :class="timerClass">
            <svg class="timer-ring" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="26" class="timer-bg-circle" />
              <circle
                cx="30"
                cy="30"
                r="26"
                class="timer-fg-circle"
                :style="{ strokeDashoffset: timerDashOffset }"
              />
            </svg>
            <div class="timer-inner">
              <span class="timer-num">{{ Math.ceil(timeLeft) }}</span>
              <span class="timer-unit">SEC</span>
            </div>
          </div>
          <div class="hud-item right">
            <span class="hud-label">LEVEL</span>
            <span class="hud-value level-val">{{ level }}<span class="level-max">/5</span></span>
          </div>
        </div>

        <!-- 关卡进度 -->
        <div class="level-progress">
          <div class="lp-bar">
            <div class="lp-fill" :style="{ width: levelProgress + '%' }"></div>
            <div
              v-for="n in currentWords.length"
              :key="n"
              class="lp-node"
              :class="{ passed: n - 1 < currentWordIndex }"
              :style="{ left: ((n - 1) / currentWords.length) * 100 + '%' }"
            ></div>
          </div>
          <span class="lp-text">
            <span class="lp-cur">{{ currentWordIndex + 1 }}</span>
            <span class="lp-sep">/</span>
            <span>{{ currentWords.length }}</span>
          </span>
        </div>

        <!-- 连击 + 准确率 -->
        <div class="side-stats">
          <div class="stat-combo" :class="{ 'combo-fire': combo >= 3 }">
            <div class="stat-icon">⚡</div>
            <span class="combo-num">{{ combo }}</span>
            <span class="combo-label">COMBO</span>
            <div v-if="combo >= 3" class="combo-flames">🔥</div>
          </div>
          <div class="stat-acc">
            <div class="stat-icon dim">◉</div>
            <span class="acc-num">{{ accuracy }}<span class="acc-unit">%</span></span>
            <span class="acc-label">ACC</span>
          </div>
        </div>

        <!-- 主破解区域 -->
        <div class="hack-zone">
          <!-- 角落装饰 -->
          <span class="hz-corner tl"></span>
          <span class="hz-corner tr"></span>
          <span class="hz-corner bl"></span>
          <span class="hz-corner br"></span>

          <!-- 目标词汇显示 -->
          <div class="target-display">
            <div class="target-label">
              <span class="tl-line"></span>
              ⚡ DECRYPT TARGET
              <span class="tl-line"></span>
            </div>
            <!-- 中文提示 + 音标 -->
            <div class="target-zh">{{ currentZh }}</div>
            <div v-if="currentPhonetic" class="target-phonetic">{{ currentPhonetic }}</div>
            <div class="target-word">
              <span
                v-for="(char, i) in targetChars"
                :key="i"
                class="target-char"
                :class="{
                  typed: i < typedCount,
                  current: i === typedCount,
                  error: i === typedCount && hasError,
                  pending: i > typedCount
                }"
              >
                {{ char }}
              </span>
            </div>
            <!-- 输入进度条 -->
            <div class="word-progress">
              <div class="wp-fill" :style="{ width: wordProgress + '%' }"></div>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="input-zone">
            <div class="input-wrap" :class="{ shake: hasError, success: wordSuccess }">
              <span class="input-cursor-label">INPUT ›</span>
              <span class="typed-text">{{ typedText }}</span>
              <span class="cursor-blink">▌</span>
            </div>
          </div>

          <!-- 消息提示 -->
          <transition name="msg-pop">
            <div v-if="feedbackMsg" class="feedback-msg" :class="feedbackType">
              {{ feedbackMsg }}
            </div>
          </transition>
        </div>

        <!-- 任务队列（待破解词队列） -->
        <div class="word-queue">
          <div class="wq-label">// NEXT TARGETS</div>
          <div class="wq-items">
            <div
              v-for="(item, i) in upcomingWords"
              :key="i"
              class="queue-item"
              :style="{ opacity: 1 - i * 0.28, transform: `scale(${1 - i * 0.04})` }"
            >
              <span class="q-index">{{ String(i + 1).padStart(2, '0') }}</span>
              <div class="q-info">
                <span class="q-word">{{ item.word }}</span>
                <div class="q-meta">
                  <span class="q-zh">{{ item.zh }}</span>
                  <span v-if="item.phonetic" class="q-phonetic">{{ item.phonetic }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 粒子特效叠加层（命中爆炸） -->
        <div ref="fxLayer" class="fx-layer">
          <div
            v-for="fx in activeFx"
            :key="fx.id"
            class="fx-particle"
            :class="fx.type"
            :style="{ left: fx.x + 'px', top: fx.y + 'px' }"
          >
            {{ fx.text }}
          </div>
        </div>

        <!-- 数据流侧边装饰 -->
        <div class="data-stream left">
          <span v-for="(c, i) in dataStreamL" :key="i" :style="{ animationDelay: i * 0.08 + 's' }">
            {{ c }}
          </span>
        </div>
        <div class="data-stream right">
          <span v-for="(c, i) in dataStreamR" :key="i" :style="{ animationDelay: i * 0.1 + 's' }">
            {{ c }}
          </span>
        </div>

        <!-- 音乐控制浮窗 -->
        <div class="music-ctrl">
          <button class="music-btn" :title="isMuted ? '取消静音' : '静音'" @click="toggleMute">
            {{ isMuted ? '🔇' : '🎵' }}
          </button>
          <input
            v-model.number="musicVolume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="vol-slider"
            @input="setVolume(musicVolume)"
          />
        </div>
      </div>
    </transition>

    <!-- ========== 结算界面 ========== -->
    <transition name="screen-fade">
      <div v-if="gameState === 'result'" class="result-screen">
        <!-- 角落装饰 -->
        <div class="corner tl"></div>
        <div class="corner tr"></div>
        <div class="corner bl"></div>
        <div class="corner br"></div>

        <div class="result-header" :class="isVictory ? 'victory' : 'defeat'">
          <div class="result-status-icon">{{ isVictory ? '🔓' : '🔒' }}</div>
          <div class="result-title">
            <span class="r-glitch" :data-text="isVictory ? 'ACCESS GRANTED' : 'ACCESS DENIED'">
              {{ isVictory ? 'ACCESS GRANTED' : 'ACCESS DENIED' }}
            </span>
          </div>
          <div class="result-sub">
            {{ isVictory ? '防火墙已成功突破 · 任务完成' : '系统防御启动 · 入侵失败' }}
          </div>
        </div>

        <div class="result-body">
          <div class="result-stats">
            <div class="rs-item" data-color="cyan">
              <span class="rs-icon">◈</span>
              <span class="rs-value score">{{ score }}</span>
              <span class="rs-label">SCORE</span>
            </div>
            <div class="rs-item" data-color="green">
              <span class="rs-icon">◉</span>
              <span class="rs-value">{{ completedWords }}</span>
              <span class="rs-label">WORDS</span>
            </div>
            <div class="rs-item" data-color="teal">
              <span class="rs-icon">◆</span>
              <span class="rs-value">{{ accuracy }}<span class="rs-unit">%</span></span>
              <span class="rs-label">ACCURACY</span>
            </div>
            <div class="rs-item" data-color="orange">
              <span class="rs-icon">🔥</span>
              <span class="rs-value">{{ maxCombo }}</span>
              <span class="rs-label">MAX COMBO</span>
            </div>
            <div class="rs-item" data-color="purple">
              <span class="rs-icon">▲</span>
              <span class="rs-value">{{ level }}<span class="rs-unit">/5</span></span>
              <span class="rs-label">LEVEL</span>
            </div>
          </div>

          <div class="result-rating-wrap">
            <div class="result-rating">
              <div class="rating-ring" :class="ratingClass">
                <span class="rating-val" :class="ratingClass">{{ rating }}</span>
              </div>
              <div class="rating-info">
                <span class="rating-title">PERFORMANCE RATING</span>
                <span class="rating-desc">{{
                  rating.startsWith('S')
                    ? '完美表现！无可挑剔'
                    : rating === 'A'
                      ? '优秀！继续保持'
                      : rating === 'B'
                        ? '良好，还有提升空间'
                        : '继续练习，你能做到！'
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="result-buttons">
          <button class="cyber-btn primary" @click="restartGame">
            <span class="btn-icon">↺</span> 再次入侵
          </button>
          <button class="cyber-btn back" @click="goBack">← 返回</button>
        </div>
      </div>
    </transition>

    <!-- ========== 教程弹窗 ========== -->
    <transition name="screen-fade">
      <div v-if="showHelp" class="help-overlay" @click.self="showHelp = false">
        <div class="help-modal">
          <div class="help-title">操作说明</div>
          <ul class="help-list">
            <li>
              ⌨️ 看清屏幕上显示的目标词，直接
              <b>键盘输入</b>
              对应字符
            </li>
            <li>
              ✅ 输入
              <b>完全匹配</b>
              后自动跳到下一个词
            </li>
            <li>
              ❌ 输入
              <b>错误字符</b>
              会触发屏幕抖动，需删除重输
            </li>
            <li>
              ⏱️ 每关有
              <b>倒计时</b>
              ，时间耗尽则失败
            </li>
            <li>
              🔥 连续正确完成词汇可触发
              <b>连击加成</b>
            </li>
            <li>
              ⚡ 速度越快，分数越高（有
              <b>速度奖励</b>
              ）
            </li>
          </ul>
          <button class="cyber-btn primary" @click="showHelp = false">明白了</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { difficultyMeta, generateLevelWords } from './config'
import type { WordItem } from './config'

const router = useRouter()

// ─── 状态 ──────────────────────────────────────────────────────────────
const gameRoot = ref<HTMLElement | null>(null)
const bgCanvas = ref<HTMLCanvasElement | null>(null)
const fxLayer = ref<HTMLElement | null>(null)
const gameState = ref<'start' | 'playing' | 'result'>('start')
const showHelp = ref(false)
const selectedDifficulty = ref('normal')

// ─── 音乐 ──────────────────────────────────────────────────────────────
const MUSIC_URL = 'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/4.mp3'
let bgAudio: HTMLAudioElement | null = null
const isMuted = ref(false)
const musicVolume = ref(0.5)

function initAudio() {
  if (bgAudio) return
  bgAudio = new Audio(MUSIC_URL)
  bgAudio.loop = true
  bgAudio.volume = musicVolume.value
  bgAudio.preload = 'auto'
}

function playMusic() {
  if (!bgAudio) initAudio()
  bgAudio!.currentTime = 0
  bgAudio!.play().catch(() => {
    /* 浏览器自动播放限制，用户交互后触发 */
  })
}

function pauseMusic() {
  bgAudio?.pause()
}

function toggleMute() {
  isMuted.value = !isMuted.value
  if (bgAudio) bgAudio.muted = isMuted.value
}

function setVolume(v: number) {
  musicVolume.value = v
  if (bgAudio) bgAudio.volume = v
}

function destroyAudio() {
  if (bgAudio) {
    bgAudio.pause()
    bgAudio.src = ''
    bgAudio = null
  }
}

// 游戏数据
const score = ref(0)
const level = ref(1)
const combo = ref(0)
const maxCombo = ref(0)
const timeLeft = ref(60)
const totalTime = ref(60)
const totalKeys = ref(0)
const correctKeys = ref(0)
const currentWordIndex = ref(0)
const typedText = ref('')
const hasError = ref(false)
const wordSuccess = ref(false)
const glitchActive = ref(false)
const feedbackMsg = ref('')
const feedbackType = ref('good')
const isVictory = ref(false)

// 特效
const activeFx = ref<Array<{ id: number; x: number; y: number; text: string; type: string }>>([])
let fxId = 0

// 按键防重（防止按住键重复触发）
const keysPressed = new Set<string>()

// 结算统计：累计完成词汇数（含所有关卡）
const completedWords = ref(0)

// 数据流装饰字符
const HEX_CHARS = '0123456789ABCDEF'
const dataStreamL = ref<string[]>(
  Array.from({ length: 30 }, () => HEX_CHARS[Math.floor(Math.random() * 16)])
)
const dataStreamR = ref<string[]>(
  Array.from({ length: 30 }, () => HEX_CHARS[Math.floor(Math.random() * 16)])
)

// ─── 词库（随机生成） ──────────────────────────────────────────────────
/** 当前关卡实际使用的词列表（每关进入时重新随机抽取） */
const levelWords = ref<WordItem[]>([])

function refreshLevelWords() {
  levelWords.value = generateLevelWords(selectedDifficulty.value, level.value - 1)
}

const difficulties = difficultyMeta

const bootLines = [
  'Connecting to target system...',
  'Bypassing firewall layer 1... [OK]',
  'Injecting proxy tunnel...',
  'Loading exploit modules... [READY]',
  'System breach initiated. Good luck, hacker.'
]

// ─── 计算属性 ──────────────────────────────────────────────────────────
const currentWords = computed((): WordItem[] => levelWords.value)

const currentItem = computed(
  (): WordItem => currentWords.value[currentWordIndex.value] ?? { word: '', zh: '', phonetic: '' }
)
const currentWord = computed(() => currentItem.value.word)
const currentZh = computed(() => currentItem.value.zh)
const currentPhonetic = computed(() => currentItem.value.phonetic)

const targetChars = computed(() => currentWord.value.split(''))

const typedCount = computed(() => {
  const t = typedText.value
  const w = currentWord.value
  let count = 0
  for (let i = 0; i < t.length; i++) {
    if (t[i] === w[i]) count++
    else break
  }
  return count
})

const wordProgress = computed(() => {
  if (!currentWord.value.length) return 0
  return (typedCount.value / currentWord.value.length) * 100
})

const levelProgress = computed(() => {
  if (!currentWords.value.length) return 0
  return (currentWordIndex.value / currentWords.value.length) * 100
})

const timerDashOffset = computed(() => {
  const circumference = 2 * Math.PI * 26 // r=26
  return circumference * (1 - timeLeft.value / totalTime.value)
})

const timerClass = computed(() => {
  if (timeLeft.value <= 10) return 'danger'
  if (timeLeft.value <= 20) return 'warning'
  return ''
})

const accuracy = computed(() => {
  if (totalKeys.value === 0) return 100
  return Math.round((correctKeys.value / totalKeys.value) * 100)
})

const upcomingWords = computed((): WordItem[] => {
  return currentWords.value.slice(currentWordIndex.value + 1, currentWordIndex.value + 4)
})

const rating = computed(() => {
  const acc = accuracy.value
  const sc = score.value
  if (acc >= 98 && sc >= 2000) return 'S+'
  if (acc >= 95 && sc >= 1500) return 'S'
  if (acc >= 90 && sc >= 1000) return 'A'
  if (acc >= 80 && sc >= 600) return 'B'
  if (acc >= 70) return 'C'
  return 'D'
})

const ratingClass = computed(() => {
  const r = rating.value
  if (r.startsWith('S')) return 'rating-s'
  if (r === 'A') return 'rating-a'
  if (r === 'B') return 'rating-b'
  return 'rating-c'
})

// ─── 计时器 ────────────────────────────────────────────────────────────
let timerInterval: ReturnType<typeof setInterval> | null = null
let wordStartTime = 0

function startTimer() {
  const meta = difficultyMeta.find(d => d.id === selectedDifficulty.value)
  totalTime.value = meta?.timeLimit ?? 50
  timeLeft.value = totalTime.value
  timerInterval = setInterval(() => {
    timeLeft.value -= 0.1
    if (timeLeft.value <= 0) {
      timeLeft.value = 0
      endGame(false)
    }
    // 危险时触发故障效果
    if (timeLeft.value <= 10 && Math.random() < 0.05) triggerGlitch(150)
    // 刷新数据流
    if (Math.random() < 0.3) {
      const idx = Math.floor(Math.random() * dataStreamL.value.length)
      dataStreamL.value[idx] = HEX_CHARS[Math.floor(Math.random() * 16)]
      dataStreamR.value[idx] = HEX_CHARS[Math.floor(Math.random() * 16)]
    }
  }, 100)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

// ─── 游戏逻辑 ──────────────────────────────────────────────────────────
function startGame() {
  score.value = 0
  level.value = 1
  combo.value = 0
  maxCombo.value = 0
  currentWordIndex.value = 0
  completedWords.value = 0
  typedText.value = ''
  totalKeys.value = 0
  correctKeys.value = 0
  hasError.value = false
  wordSuccess.value = false
  feedbackMsg.value = ''
  activeFx.value = []
  keysPressed.clear()
  refreshLevelWords()
  wordStartTime = Date.now()
  gameState.value = 'playing'
  startTimer()
  playMusic()
  triggerGlitch(300)
  nextTick(() => {
    document.addEventListener('keydown', onKeyDown)
  })
}

function restartGame() {
  stopTimer()
  document.removeEventListener('keydown', onKeyDown)
  nextTick(() => startGame())
}

function endGame(victory: boolean) {
  stopTimer()
  pauseMusic()
  keysPressed.clear()
  document.removeEventListener('keydown', onKeyDown)
  isVictory.value = victory
  gameState.value = 'result'
  triggerGlitch(500)
  // 胜利爆炸粒子
  if (victory) spawnVictoryFx()
}

function goBack() {
  stopTimer()
  pauseMusic()
  keysPressed.clear()
  document.removeEventListener('keydown', onKeyDown)
  router.push('/')
}

function onKeyDown(e: KeyboardEvent) {
  if (gameState.value !== 'playing') return

  // 退格
  if (e.key === 'Backspace') {
    keysPressed.delete('Backspace')
    if (typedText.value.length > 0) {
      typedText.value = typedText.value.slice(0, -1)
      hasError.value = false
    }
    return
  }

  // 只处理可打印字符
  if (e.key.length !== 1) return
  const char = e.key

  // 防止按住键重复触发
  if (keysPressed.has(char)) return
  keysPressed.add(char)

  const expected = currentWord.value[typedText.value.length]
  totalKeys.value++

  if (char === expected) {
    correctKeys.value++
    hasError.value = false
    typedText.value += char
    keysPressed.delete(char) // 输入成功后立即解锁，允许下一个位置同字符

    // 打字粒子
    spawnTypeFx(char, false)

    // 单词完成
    if (typedText.value === currentWord.value) {
      keysPressed.clear()
      onWordComplete()
    }
  } else {
    hasError.value = true
    keysPressed.delete(char) // 输错后解锁，允许重新输入
    triggerGlitch(200)
    spawnTypeFx(char, true)
    showFeedback('错误字符！', 'bad')
    // 自动抖动
    gsap.to('.input-wrap', {
      x: 8,
      duration: 0.05,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        gsap.set('.input-wrap', { x: 0 })
      }
    })
  }
}

function onWordComplete() {
  const elapsed = (Date.now() - wordStartTime) / 1000
  const speedBonus = Math.max(0, Math.floor((5 - elapsed) * 20))
  combo.value++
  if (combo.value > maxCombo.value) maxCombo.value = combo.value
  completedWords.value++

  const base = 100 + currentWord.value.length * 10
  const comboBonus = combo.value * 15
  const gained = base + comboBonus + speedBonus
  score.value += gained

  wordSuccess.value = true
  spawnWordCompleteFx(gained)

  const msg =
    combo.value >= 5
      ? `🔥 HYPER COMBO x${combo.value}! +${gained}`
      : combo.value >= 3
        ? `⚡ COMBO x${combo.value}! +${gained}`
        : `✅ 破解成功! +${gained}`
  showFeedback(msg, 'good')

  setTimeout(() => {
    wordSuccess.value = false
    typedText.value = ''
    hasError.value = false
    wordStartTime = Date.now()
    currentWordIndex.value++

    // 关卡结束
    if (currentWordIndex.value >= currentWords.value.length) {
      onLevelComplete()
    }
  }, 300)
}

function onLevelComplete() {
  stopTimer()
  document.removeEventListener('keydown', onKeyDown)
  triggerGlitch(600)
  spawnVictoryFx()
  showFeedback(`🎉 第 ${level.value} 关突破！`, 'good')

  setTimeout(() => {
    level.value++
    if (level.value > 5) {
      endGame(true)
      return
    }
    currentWordIndex.value = 0
    typedText.value = ''
    wordStartTime = Date.now()
    refreshLevelWords()
    // 关卡间给一点时间奖励
    timeLeft.value = Math.min(totalTime.value, timeLeft.value + 15)
    startTimer()
    document.addEventListener('keydown', onKeyDown)
  }, 1500)
}

// ─── 反馈 ────────────────────────────────────────────────────────────
function showFeedback(msg: string, type: string) {
  feedbackMsg.value = msg
  feedbackType.value = type
  setTimeout(() => {
    feedbackMsg.value = ''
  }, 1800)
}

// ─── 故障特效 ──────────────────────────────────────────────────────────
function triggerGlitch(duration: number) {
  glitchActive.value = true
  setTimeout(() => {
    glitchActive.value = false
  }, duration)
}

// ─── 粒子特效 ──────────────────────────────────────────────────────────
function spawnTypeFx(char: string, isError: boolean) {
  const el = document.querySelector('.input-wrap')
  if (!el || !fxLayer.value) return
  const rect = el.getBoundingClientRect()
  const rootRect = gameRoot.value!.getBoundingClientRect()
  const x = rect.right - rootRect.left + Math.random() * 30 - 15
  const y = rect.top - rootRect.top + Math.random() * 20 - 10

  const id = fxId++
  activeFx.value.push({
    id,
    x,
    y,
    text: isError ? '✗' : char,
    type: isError ? 'fx-bad' : 'fx-good'
  })
  setTimeout(() => {
    activeFx.value = activeFx.value.filter(f => f.id !== id)
  }, 800)
}

function spawnWordCompleteFx(gained: number) {
  const zone = document.querySelector('.hack-zone')
  if (!zone || !fxLayer.value) return
  const rect = zone.getBoundingClientRect()
  const rootRect = gameRoot.value!.getBoundingClientRect()
  const cx = rect.left + rect.width / 2 - rootRect.left
  const cy = rect.top + rect.height / 2 - rootRect.top

  // 爆炸粒子
  for (let i = 0; i < 12; i++) {
    const id = fxId++
    const chars = ['◆', '★', '▲', '⬟', '+', '×', '✦']
    activeFx.value.push({
      id,
      x: cx + (Math.random() - 0.5) * 200,
      y: cy + (Math.random() - 0.5) * 150,
      text: chars[Math.floor(Math.random() * chars.length)],
      type: 'fx-burst'
    })
    setTimeout(() => {
      activeFx.value = activeFx.value.filter(f => f.id !== id)
    }, 900)
  }

  // 得分弹出
  const sid = fxId++
  activeFx.value.push({ id: sid, x: cx - 30, y: cy - 60, text: `+${gained}`, type: 'fx-score' })
  setTimeout(() => {
    activeFx.value = activeFx.value.filter(f => f.id !== sid)
  }, 1200)
}

function spawnVictoryFx() {
  if (!fxLayer.value || !gameRoot.value) return
  const W = gameRoot.value.clientWidth
  const H = gameRoot.value.clientHeight
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const id = fxId++
      const chars = ['◆', '★', '▲', '⬟', '✦', '◉', '⚡', '🔓']
      activeFx.value.push({
        id,
        x: Math.random() * W,
        y: Math.random() * H,
        text: chars[Math.floor(Math.random() * chars.length)],
        type: 'fx-victory'
      })
      setTimeout(() => {
        activeFx.value = activeFx.value.filter(f => f.id !== id)
      }, 1500)
    }, i * 50)
  }
}

// ─── Three.js 粒子背景 ────────────────────────────────────────────────
let animFrameId: number | null = null
let ctx2d: CanvasRenderingContext2D | null = null

interface MatrixDrop {
  x: number
  y: number
  speed: number
  chars: string[]
  charIdx: number
  alpha: number
  color: string
}

const matrixDrops: MatrixDrop[] = []
const MATRIX_CHARS =
  '01アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHIJKLMNOPQRSTUVWXYZ'

function initMatrixBg() {
  const canvas = bgCanvas.value
  if (!canvas) return
  const container = gameRoot.value!
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
  ctx2d = canvas.getContext('2d')!

  const cols = Math.floor(canvas.width / 18)
  for (let i = 0; i < cols; i++) {
    matrixDrops.push({
      x: i * 18,
      y: Math.random() * canvas.height,
      speed: 1.5 + Math.random() * 3,
      chars: Array.from(
        { length: 20 },
        () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
      ),
      charIdx: 0,
      alpha: 0.3 + Math.random() * 0.5,
      color: Math.random() < 0.15 ? '#00ffff' : Math.random() < 0.1 ? '#ff00ff' : '#00ff41'
    })
  }
  renderMatrix()
}

function renderMatrix() {
  if (!ctx2d || !bgCanvas.value) return
  const { width, height } = bgCanvas.value

  // 拖尾效果
  ctx2d.fillStyle = 'rgba(0,0,0,0.06)'
  ctx2d.fillRect(0, 0, width, height)

  for (const drop of matrixDrops) {
    // 随机刷新字符
    if (Math.random() < 0.02) {
      drop.chars[Math.floor(Math.random() * drop.chars.length)] =
        MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
    }

    // 绘制字符列
    for (let i = 0; i < drop.chars.length; i++) {
      const yy = drop.y - i * 18
      if (yy < 0 || yy > height) continue
      const fade = 1 - i / drop.chars.length
      ctx2d.globalAlpha = fade * drop.alpha
      ctx2d.fillStyle = i === 0 ? '#ffffff' : drop.color
      ctx2d.font = `${i === 0 ? 'bold ' : ''}14px monospace`
      ctx2d.fillText(drop.chars[i], drop.x, yy)
    }

    drop.y += drop.speed
    if (drop.y - drop.chars.length * 18 > height) {
      drop.y = -Math.random() * height * 0.5
      drop.speed = 1.5 + Math.random() * 3
      drop.color = Math.random() < 0.15 ? '#00ffff' : Math.random() < 0.1 ? '#ff00ff' : '#00ff41'
    }
  }
  ctx2d.globalAlpha = 1

  animFrameId = requestAnimationFrame(renderMatrix)
}

function resizeCanvas() {
  if (!bgCanvas.value || !gameRoot.value) return
  // 先停止旧的 RAF 循环，避免多个循环并存
  if (animFrameId) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
  bgCanvas.value.width = gameRoot.value.clientWidth
  bgCanvas.value.height = gameRoot.value.clientHeight
  matrixDrops.length = 0
  initMatrixBg()
}

// ─── 生命周期 ──────────────────────────────────────────────────────────
onMounted(() => {
  initMatrixBg()
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  stopTimer()
  keysPressed.clear()
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', resizeCanvas)
  if (animFrameId) cancelAnimationFrame(animFrameId)
  destroyAudio()
})

// 监听难度切换重置词库显示（仅在开始界面预览用）
watch(selectedDifficulty, () => {
  if (gameState.value !== 'playing') {
    currentWordIndex.value = 0
    typedText.value = ''
    refreshLevelWords()
  }
})
</script>

<style scoped>
/* ═══════════════════════════════════════
   CSS 变量
══════════════════════════════════════════ */
:root {
  --c-green: #00ff41;
  --c-cyan: #00f0ff;
  --c-pink: #ff00ff;
  --c-orange: #ff6600;
  --c-gold: #ffdd00;
  --c-white: rgba(255, 255, 255, 0.85);
}

/* ═══════════════════════════════════════
   基础布局
══════════════════════════════════════════ */
.cyber-hacker-game {
  position: fixed;
  inset: 0;
  background: #000;
  overflow: hidden;
  font-family: 'Courier New', 'Consolas', monospace;
  user-select: none;
  color: #00ff41;
}

.bg-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.crt-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.07) 2px,
    rgba(0, 0, 0, 0.07) 4px
  );
}

.glitch-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.05s;
}
.glitch-layer.active {
  opacity: 1;
  animation: glitch-flash 0.1s steps(2) infinite;
}
@keyframes glitch-flash {
  0% {
    background: rgba(0, 255, 65, 0.04);
    clip-path: polygon(0 15%, 100% 15%, 100% 35%, 0 35%);
    transform: translateX(-3px);
  }
  25% {
    background: rgba(255, 0, 255, 0.05);
    clip-path: polygon(0 55%, 100% 55%, 100% 75%, 0 75%);
    transform: translateX(3px);
  }
  50% {
    background: rgba(0, 255, 255, 0.04);
    clip-path: polygon(0 5%, 100% 5%, 100% 20%, 0 20%);
    transform: translateX(-1px);
  }
  75% {
    background: rgba(255, 0, 0, 0.03);
    clip-path: polygon(0 80%, 100% 80%, 100% 95%, 0 95%);
    transform: translateX(2px);
  }
  100% {
    background: transparent;
  }
}

/* ═══════════════════════════════════════
   角落装饰（全局复用）
══════════════════════════════════════════ */
.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  z-index: 15;
  pointer-events: none;
}
.corner.tl { top: 16px; left: 16px; border-top: 2px solid #00ff41; border-left: 2px solid #00ff41; }
.corner.tr { top: 16px; right: 16px; border-top: 2px solid #00ff41; border-right: 2px solid #00ff41; }
.corner.bl { bottom: 16px; left: 16px; border-bottom: 2px solid #00ff41; border-left: 2px solid #00ff41; }
.corner.br { bottom: 16px; right: 16px; border-bottom: 2px solid #00ff41; border-right: 2px solid #00ff41; }

/* ═══════════════════════════════════════
   开始界面
══════════════════════════════════════════ */
.start-screen,
.game-screen,
.result-screen {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.start-logo {
  margin-bottom: 28px;
  text-align: center;
  position: relative;
}

.logo-scan-line {
  position: absolute;
  top: 50%;
  left: -20px;
  right: -20px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.6), transparent);
  animation: scan-sweep 3s ease-in-out infinite;
  pointer-events: none;
}
@keyframes scan-sweep {
  0%   { top: 0%;   opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

.logo-glitch {
  font-size: clamp(44px, 7vw, 82px);
  font-weight: 900;
  color: #00ff41;
  letter-spacing: 10px;
  text-shadow:
    0 0 20px #00ff41,
    0 0 50px rgba(0, 255, 65, 0.4);
  position: relative;
  animation: logo-pulse 2s ease-in-out infinite;
}
.logo-glitch::before,
.logo-glitch::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  animation: logo-glitch-r 3s infinite;
}
.logo-glitch::before {
  color: #ff00ff;
  clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
  transform: translate(-3px, 0);
  animation-delay: 0.5s;
}
.logo-glitch::after {
  color: #00ffff;
  clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
  transform: translate(3px, 0);
}
@keyframes logo-glitch-r {
  0%,  90%,  100% { opacity: 0; }
  92%, 96% { opacity: 1; transform: translate(-4px, 0) skewX(-5deg); }
  94%, 98% { opacity: 1; transform: translate(4px, 0) skewX(5deg); }
}
@keyframes logo-pulse {
  0%,  100% { text-shadow: 0 0 20px #00ff41, 0 0 50px rgba(0,255,65,0.4); }
  50% { text-shadow: 0 0 32px #00ff41, 0 0 70px #00ff41, 0 0 100px rgba(0,255,65,0.2); }
}

.logo-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 4px 16px;
  border: 1px solid rgba(0, 255, 204, 0.3);
  border-radius: 20px;
  background: rgba(0, 255, 204, 0.05);
  font-size: 12px;
  color: #00ffcc;
  letter-spacing: 2px;
}
.badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #00ffcc;
  box-shadow: 0 0 6px #00ffcc;
  animation: dot-pulse 1.5s ease-in-out infinite alternate;
}
.badge-sep { color: rgba(0, 255, 204, 0.4); }
@keyframes dot-pulse {
  from { opacity: 0.5; transform: scale(0.8); }
  to   { opacity: 1;   transform: scale(1.2); }
}

.start-terminal {
  background: rgba(0, 12, 0, 0.92);
  border: 1px solid rgba(0, 255, 65, 0.35);
  border-radius: 8px;
  margin-bottom: 28px;
  min-width: 420px;
  max-width: 540px;
  box-shadow:
    0 0 30px rgba(0, 255, 65, 0.12),
    inset 0 0 30px rgba(0, 255, 65, 0.03);
  overflow: hidden;
}
.terminal-titlebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(0, 30, 0, 0.9);
  border-bottom: 1px solid rgba(0, 255, 65, 0.2);
}
.tb-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.tb-dot.red    { background: #ff5f56; }
.tb-dot.yellow { background: #ffbd2e; }
.tb-dot.green  { background: #27c93f; }
.tb-title {
  flex: 1;
  text-align: center;
  font-size: 11px;
  color: rgba(0, 255, 65, 0.4);
  letter-spacing: 2px;
}
.terminal-body {
  padding: 14px 20px 16px;
}
.terminal-line {
  color: #00ff41;
  font-size: 13px;
  line-height: 1.9;
  opacity: 0;
  animation: term-appear 0.3s forwards;
}
.terminal-line .prompt {
  color: #ff00ff;
  margin-right: 8px;
}
@keyframes term-appear {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: none; }
}

.start-buttons {
  display: flex;
  gap: 14px;
  margin-bottom: 22px;
  flex-wrap: wrap;
  justify-content: center;
}

.difficulty-select {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(0, 10, 0, 0.6);
  border: 1px solid rgba(0, 255, 65, 0.15);
  border-radius: 6px;
}
.d-label {
  color: rgba(0, 255, 204, 0.5);
  font-size: 11px;
  letter-spacing: 2px;
  white-space: nowrap;
}
.d-btn {
  background: rgba(0, 255, 65, 0.04);
  border: 1px solid rgba(0, 255, 65, 0.25);
  color: rgba(0, 255, 65, 0.7);
  padding: 8px 20px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  letter-spacing: 1px;
  transition: all 0.2s;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  position: relative;
}
.d-indicator {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(0, 255, 65, 0.3);
  margin-bottom: 2px;
  transition: all 0.2s;
}
.d-name {
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 2px;
}
.d-desc {
  font-size: 10px;
  color: rgba(0, 255, 65, 0.4);
  letter-spacing: 0;
  font-weight: normal;
}
.d-btn:hover {
  background: rgba(0, 255, 65, 0.1);
  border-color: rgba(0, 255, 65, 0.5);
  color: #00ff41;
}
.d-btn.active {
  background: rgba(0, 255, 65, 0.15);
  border-color: #00ff41;
  color: #fff;
  box-shadow: 0 0 14px rgba(0, 255, 65, 0.35);
}
.d-btn.active .d-indicator {
  background: #00ff41;
  box-shadow: 0 0 6px #00ff41;
}

/* ═══════════════════════════════════════
   通用按钮
══════════════════════════════════════════ */
.cyber-btn {
  position: relative;
  padding: 11px 30px;
  font-family: inherit;
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 2px;
  cursor: pointer;
  border: none;
  clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
  transition: all 0.2s;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btn-icon {
  font-style: normal;
  opacity: 0.8;
}
.cyber-btn.primary {
  background: linear-gradient(135deg, #00ff41, #00cc33);
  color: #000;
  box-shadow: 0 0 24px rgba(0, 255, 65, 0.55), inset 0 1px 0 rgba(255,255,255,0.2);
}
.cyber-btn.primary:hover {
  box-shadow: 0 0 36px rgba(0, 255, 65, 0.85), inset 0 1px 0 rgba(255,255,255,0.2);
  transform: translateY(-2px);
}
.cyber-btn.secondary {
  background: transparent;
  border: 1px solid #00ffcc;
  color: #00ffcc;
  clip-path: none;
  border-radius: 4px;
}
.cyber-btn.secondary:hover {
  background: rgba(0, 255, 204, 0.1);
  box-shadow: 0 0 12px rgba(0, 255, 204, 0.3);
}
.cyber-btn.back {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.5);
  clip-path: none;
  border-radius: 4px;
  font-size: 12px;
}
.cyber-btn.back:hover {
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}

/* ═══════════════════════════════════════
   系统状态栏
══════════════════════════════════════════ */
.sys-bar {
  width: 100%;
  max-width: 800px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 16px;
  background: rgba(0, 20, 0, 0.7);
  border: 1px solid rgba(0, 255, 65, 0.15);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  font-size: 10px;
  letter-spacing: 2px;
  margin-bottom: 0;
}
.sys-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(0,255,65,0.3);
}
.sys-dot.active {
  background: #00ff41;
  box-shadow: 0 0 6px #00ff41;
  animation: sys-blink 1.2s ease-in-out infinite;
}
@keyframes sys-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.sys-text { color: rgba(0, 255, 65, 0.55); }
.sys-sep  { color: rgba(0, 255, 65, 0.2); }
.sys-fill { flex: 1; }
.sys-text.muted { color: rgba(0, 255, 65, 0.3); }

/* ═══════════════════════════════════════
   游戏界面 HUD
══════════════════════════════════════════ */
.game-screen {
  padding: 16px;
  gap: 0;
  justify-content: flex-start;
}

.hud-top {
  width: 100%;
  max-width: 800px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: rgba(0, 10, 0, 0.88);
  border: 1px solid rgba(0, 255, 65, 0.25);
  border-top: 2px solid rgba(0, 255, 65, 0.5);
  border-radius: 0 0 4px 4px;
  margin-bottom: 8px;
  box-shadow:
    0 4px 20px rgba(0, 255, 65, 0.08),
    inset 0 0 30px rgba(0, 255, 65, 0.02);
}

.hud-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 80px;
}
.hud-label {
  font-size: 9px;
  color: rgba(0, 255, 65, 0.45);
  letter-spacing: 3px;
}
.hud-value {
  font-size: 24px;
  font-weight: bold;
  line-height: 1;
}
.score-val {
  color: #00ffff;
  text-shadow: 0 0 14px rgba(0,240,255,0.7);
  font-variant-numeric: tabular-nums;
}
.level-val {
  color: #ff00ff;
  text-shadow: 0 0 14px rgba(255,0,255,0.7);
}
.level-max {
  font-size: 14px;
  opacity: 0.45;
}

/* 圆形计时器 */
.hud-timer {
  position: relative;
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.timer-ring {
  width: 68px;
  height: 68px;
  transform: rotate(-90deg);
  position: absolute;
}
.timer-bg-circle {
  fill: none;
  stroke: rgba(0, 255, 65, 0.1);
  stroke-width: 3.5;
}
.timer-fg-circle {
  fill: none;
  stroke: #00ff41;
  stroke-width: 3.5;
  stroke-dasharray: 163.4;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear, stroke 0.3s;
  filter: drop-shadow(0 0 3px #00ff41);
}
.hud-timer.warning .timer-fg-circle {
  stroke: #ffaa00;
  filter: drop-shadow(0 0 3px #ffaa00);
}
.hud-timer.danger .timer-fg-circle {
  stroke: #ff3333;
  filter: drop-shadow(0 0 4px #ff3333);
  animation: timer-pulse 0.5s ease-in-out infinite alternate;
}
@keyframes timer-pulse {
  from { filter: drop-shadow(0 0 2px #ff3333); }
  to   { filter: drop-shadow(0 0 8px #ff3333); }
}
.timer-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}
.timer-num {
  font-size: 20px;
  font-weight: bold;
  color: #00ff41;
}
.timer-unit {
  font-size: 8px;
  color: rgba(0, 255, 65, 0.4);
  letter-spacing: 1px;
  margin-top: 1px;
}
.hud-timer.warning .timer-num { color: #ffaa00; }
.hud-timer.danger  .timer-num { color: #ff3333; }

/* 关卡进度条 */
.level-progress {
  width: 100%;
  max-width: 800px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.lp-bar {
  flex: 1;
  height: 5px;
  background: rgba(0, 255, 65, 0.08);
  border-radius: 3px;
  overflow: visible;
  position: relative;
}
.lp-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ff41, #00ffcc);
  border-radius: 3px;
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(0,255,65,0.6);
}
.lp-node {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(0, 255, 65, 0.2);
  border: 1px solid rgba(0, 255, 65, 0.3);
  transition: all 0.3s;
}
.lp-node.passed {
  background: #00ffcc;
  border-color: #00ffcc;
  box-shadow: 0 0 6px #00ffcc;
}
.lp-text {
  font-size: 11px;
  color: rgba(0, 255, 65, 0.5);
  letter-spacing: 1px;
  white-space: nowrap;
  min-width: 36px;
  text-align: right;
}
.lp-cur {
  color: #00ffcc;
  font-weight: bold;
}
.lp-sep { color: rgba(0, 255, 65, 0.3); }

/* 侧边统计 */
.side-stats {
  position: fixed;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 20;
}
.stat-combo {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 14px 10px;
  background: rgba(0, 8, 0, 0.9);
  border: 1px solid rgba(0, 255, 65, 0.2);
  border-radius: 6px;
  position: relative;
  backdrop-filter: blur(4px);
  transition: all 0.3s;
}
.stat-combo.combo-fire {
  border-color: rgba(255, 102, 0, 0.7);
  box-shadow:
    0 0 20px rgba(255, 102, 0, 0.25),
    inset 0 0 20px rgba(255, 102, 0, 0.05);
}
.stat-icon {
  font-size: 14px;
  margin-bottom: 2px;
  opacity: 0.6;
}
.stat-icon.dim { opacity: 0.35; font-size: 12px; color: #00ffcc; }
.combo-num {
  font-size: 38px;
  font-weight: 900;
  color: #ff6600;
  text-shadow: 0 0 16px rgba(255, 102, 0, 0.8);
  line-height: 1;
}
.combo-label {
  font-size: 9px;
  color: rgba(255, 102, 0, 0.6);
  letter-spacing: 2px;
  margin-top: 2px;
}
.combo-flames {
  font-size: 18px;
  position: absolute;
  top: -12px;
  right: -6px;
  animation: flame 0.4s ease-in-out infinite alternate;
}
@keyframes flame {
  from { transform: scale(1) rotate(-5deg); }
  to   { transform: scale(1.3) rotate(5deg); }
}

.stat-acc {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 14px 10px;
  background: rgba(0, 8, 0, 0.9);
  border: 1px solid rgba(0, 255, 204, 0.2);
  border-radius: 6px;
  backdrop-filter: blur(4px);
}
.acc-num {
  font-size: 22px;
  font-weight: bold;
  color: #00ffcc;
  text-shadow: 0 0 12px rgba(0, 255, 204, 0.7);
  line-height: 1;
}
.acc-unit {
  font-size: 14px;
  opacity: 0.6;
}
.acc-label {
  font-size: 9px;
  color: rgba(0, 255, 204, 0.5);
  letter-spacing: 2px;
  margin-top: 2px;
}

/* ═══════════════════════════════════════
   主破解区域
══════════════════════════════════════════ */
.hack-zone {
  width: 100%;
  max-width: 720px;
  padding: 28px 36px;
  background: rgba(0, 6, 0, 0.92);
  border: 1px solid rgba(0, 255, 65, 0.3);
  border-radius: 8px;
  box-shadow:
    0 0 50px rgba(0, 255, 65, 0.08),
    inset 0 0 50px rgba(0, 255, 65, 0.02);
  position: relative;
  margin: 8px 0;
}
/* 顶部发光线 */
.hack-zone::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 30px;
  right: 30px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00ff41 40%, #00ffcc 60%, transparent);
  box-shadow: 0 0 12px #00ff41;
}
/* 底部发光线 */
.hack-zone::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 30px;
  right: 30px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00ffcc 40%, #00ff41 60%, transparent);
  box-shadow: 0 0 12px #00ffcc;
}

/* hack-zone 内角落 */
.hz-corner {
  position: absolute;
  width: 10px;
  height: 10px;
  pointer-events: none;
}
.hz-corner.tl { top: 6px;  left: 6px;  border-top: 1px solid rgba(0,255,65,0.6); border-left: 1px solid rgba(0,255,65,0.6); }
.hz-corner.tr { top: 6px;  right: 6px; border-top: 1px solid rgba(0,255,65,0.6); border-right: 1px solid rgba(0,255,65,0.6); }
.hz-corner.bl { bottom: 6px; left: 6px;  border-bottom: 1px solid rgba(0,255,65,0.6); border-left: 1px solid rgba(0,255,65,0.6); }
.hz-corner.br { bottom: 6px; right: 6px; border-bottom: 1px solid rgba(0,255,65,0.6); border-right: 1px solid rgba(0,255,65,0.6); }

.target-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 10px;
  color: rgba(0, 255, 65, 0.4);
  letter-spacing: 4px;
  margin-bottom: 12px;
  text-align: center;
}
.tl-line {
  flex: 1;
  max-width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,255,65,0.3));
}
.tl-line:last-child {
  background: linear-gradient(90deg, rgba(0,255,65,0.3), transparent);
}

/* 中文提示大字 */
.target-zh {
  text-align: center;
  font-size: clamp(24px, 3.8vw, 40px);
  font-weight: 900;
  color: #ffdd00;
  text-shadow:
    0 0 20px rgba(255, 221, 0, 0.8),
    0 2px 0 rgba(0,0,0,0.5);
  letter-spacing: 5px;
  margin-bottom: 6px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  animation: zh-breathe 2.5s ease-in-out infinite alternate;
}

/* 音标 */
.target-phonetic {
  text-align: center;
  font-size: clamp(13px, 1.8vw, 17px);
  color: rgba(0, 240, 255, 0.75);
  letter-spacing: 2px;
  margin-bottom: 14px;
  font-family: 'Segoe UI', 'Lucida Sans Unicode', sans-serif;
  text-shadow: 0 0 12px rgba(0, 240, 255, 0.4);
}
@keyframes zh-breathe {
  from { text-shadow: 0 0 12px rgba(255, 221, 0, 0.5), 0 2px 0 rgba(0,0,0,0.5); }
  to   { text-shadow: 0 0 28px rgba(255, 221, 0, 0.95), 0 0 50px rgba(255, 170, 0, 0.3), 0 2px 0 rgba(0,0,0,0.5); }
}

.target-word {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
  min-height: 60px;
  align-items: center;
}

.target-char {
  font-size: clamp(34px, 5.2vw, 54px);
  font-weight: 900;
  letter-spacing: 2px;
  transition: all 0.12s;
  position: relative;
  display: inline-block;
}
.target-char.pending {
  color: rgba(0, 255, 65, 0.22);
}
.target-char.typed {
  color: #00ffcc;
  text-shadow: 0 0 14px rgba(0, 255, 204, 0.8);
  transform: scale(1.06);
}
.target-char.current {
  color: #00ff41;
  text-shadow: 0 0 20px #00ff41;
  animation: char-blink 0.65s ease-in-out infinite alternate;
}
.target-char.error {
  color: #ff3333;
  text-shadow: 0 0 16px #ff3333;
  animation: char-shake 0.12s ease-in-out infinite;
}
@keyframes char-blink {
  from { opacity: 1; text-shadow: 0 0 20px #00ff41; }
  to   { opacity: 0.35; text-shadow: 0 0 6px #00ff41; }
}
@keyframes char-shake {
  0%,  100% { transform: translateX(0); }
  25%        { transform: translateX(-5px) rotate(-1deg); }
  75%        { transform: translateX(5px) rotate(1deg); }
}

.word-progress {
  height: 3px;
  background: rgba(0, 255, 65, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 18px;
}
.wp-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ff41, #00ffcc);
  border-radius: 2px;
  transition: width 0.08s ease;
  box-shadow: 0 0 8px rgba(0, 255, 65, 0.7);
}

.input-zone {
  display: flex;
  justify-content: center;
}
.input-wrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: rgba(0, 16, 0, 0.85);
  border: 1px solid rgba(0, 255, 65, 0.4);
  border-radius: 6px;
  min-width: 320px;
  transition: border-color 0.2s, box-shadow 0.2s;
  position: relative;
}
.input-wrap::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,255,65,0.4), transparent);
}
.input-wrap.shake {
  animation: input-shake 0.12s ease infinite;
  border-color: #ff3333;
  box-shadow: 0 0 16px rgba(255, 51, 51, 0.45), inset 0 0 10px rgba(255,51,51,0.05);
}
.input-wrap.success {
  border-color: #00ffcc;
  box-shadow: 0 0 20px rgba(0, 255, 204, 0.55), inset 0 0 10px rgba(0,255,204,0.05);
}
@keyframes input-shake {
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-6px); }
  75%       { transform: translateX(6px); }
}

.input-cursor-label {
  font-size: 11px;
  color: rgba(0, 255, 65, 0.4);
  letter-spacing: 2px;
  flex-shrink: 0;
}
.typed-text {
  font-size: 22px;
  color: #00ffcc;
  letter-spacing: 3px;
  flex: 1;
  text-shadow: 0 0 10px rgba(0,255,204,0.5);
  min-width: 20px;
}
.cursor-blink {
  color: #00ff41;
  animation: cursor 0.8s step-end infinite;
  font-size: 22px;
  text-shadow: 0 0 8px #00ff41;
}
@keyframes cursor {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

/* 反馈消息 */
.feedback-msg {
  text-align: center;
  margin-top: 14px;
  font-size: 13px;
  letter-spacing: 2px;
  font-weight: bold;
  padding: 6px 16px;
  border-radius: 4px;
}
.feedback-msg.good {
  color: #00ffcc;
  text-shadow: 0 0 10px #00ffcc;
  background: rgba(0, 255, 204, 0.06);
}
.feedback-msg.bad {
  color: #ff3333;
  text-shadow: 0 0 10px #ff3333;
  background: rgba(255, 51, 51, 0.06);
}

/* ═══════════════════════════════════════
   词汇队列
══════════════════════════════════════════ */
.word-queue {
  width: 100%;
  max-width: 720px;
  margin-top: 2px;
}
.wq-label {
  font-size: 10px;
  color: rgba(0, 255, 65, 0.3);
  letter-spacing: 3px;
  margin-bottom: 6px;
  padding-left: 4px;
}
.wq-items {
  display: flex;
  gap: 10px;
}
.queue-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: rgba(0, 8, 0, 0.75);
  border: 1px solid rgba(0, 255, 65, 0.15);
  border-radius: 5px;
  transition: all 0.3s;
  min-width: 0;
}
.q-index {
  font-size: 10px;
  color: rgba(0, 255, 65, 0.3);
  letter-spacing: 1px;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.q-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.q-word {
  font-size: 14px;
  color: rgba(0, 255, 65, 0.55);
  letter-spacing: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.q-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}
.q-zh {
  font-size: 11px;
  color: rgba(255, 221, 0, 0.5);
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}
.q-phonetic {
  font-size: 10px;
  color: rgba(0, 220, 255, 0.38);
  font-family: 'Segoe UI', 'Lucida Sans Unicode', sans-serif;
}

/* ═══════════════════════════════════════
   粒子特效层
══════════════════════════════════════════ */
.fx-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 30;
  overflow: hidden;
}

.fx-particle {
  position: absolute;
  font-size: 14px;
  font-weight: bold;
  pointer-events: none;
  animation: fx-float 0.8s ease-out forwards;
}
.fx-good {
  color: #00ffcc;
  text-shadow: 0 0 8px #00ffcc;
}
.fx-bad {
  color: #ff3333;
  text-shadow: 0 0 8px #ff3333;
  animation-name: fx-float-bad;
}
.fx-burst {
  font-size: 18px;
  color: #00ff41;
  text-shadow: 0 0 10px #00ff41;
  animation: fx-burst-anim 0.9s ease-out forwards;
}
.fx-score {
  font-size: 22px;
  font-weight: 900;
  color: #ffcc00;
  text-shadow: 0 0 14px #ffcc00;
  animation: fx-score-anim 1.2s ease-out forwards;
}
.fx-victory {
  font-size: 24px;
  animation: fx-victory-anim 1.5s ease-out forwards;
}

@keyframes fx-float {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-60px) scale(0.5); }
}
@keyframes fx-float-bad {
  0%   { opacity: 1; transform: translateY(0) scale(1.2); }
  100% { opacity: 0; transform: translateY(30px) scale(0.5); }
}
@keyframes fx-burst-anim {
  0%   { opacity: 1; transform: scale(0.2) rotate(0deg); }
  50%  { opacity: 1; transform: scale(1.5) rotate(180deg); }
  100% { opacity: 0; transform: scale(0.5) rotate(360deg) translate(var(--dx, 30px), var(--dy, -50px)); }
}
@keyframes fx-score-anim {
  0%  { opacity: 1; transform: translateY(0) scale(0.8); }
  30% { transform: translateY(-20px) scale(1.3); }
  100% { opacity: 0; transform: translateY(-80px) scale(0.6); }
}
@keyframes fx-victory-anim {
  0%   { opacity: 1; transform: scale(0) rotate(0deg); }
  50%  { opacity: 1; transform: scale(1.5) rotate(180deg); }
  100% { opacity: 0; transform: scale(0.3) rotate(360deg) translateY(-100px); }
}

/* ═══════════════════════════════════════
   数据流装饰
══════════════════════════════════════════ */
.data-stream {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 36px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  z-index: 5;
  pointer-events: none;
}
.data-stream.left  { left: 0; }
.data-stream.right { right: 0; }
.data-stream span {
  font-size: 11px;
  color: rgba(0, 255, 65, 0.25);
  text-align: center;
  animation: ds-flicker 1s ease-in-out infinite alternate;
}
@keyframes ds-flicker {
  from { opacity: 0.15; }
  to   { opacity: 0.5; }
}

/* ═══════════════════════════════════════
   结算界面
══════════════════════════════════════════ */
.result-screen {
  gap: 20px;
  padding: 32px;
}

.result-header {
  text-align: center;
}
.result-status-icon {
  font-size: 40px;
  margin-bottom: 10px;
  animation: icon-bounce 0.6s ease-out;
}
@keyframes icon-bounce {
  0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
  70%  { transform: scale(1.2) rotate(5deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
.result-header.victory .result-title { color: #00ff41; }
.result-header.defeat  .result-title { color: #ff3333; }
.result-title {
  font-size: clamp(28px, 5vw, 54px);
  font-weight: 900;
  letter-spacing: 6px;
  position: relative;
}
.r-glitch {
  position: relative;
  display: inline-block;
  animation: r-glitch-anim 2s infinite;
}
.r-glitch::before,
.r-glitch::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  top: 0;
}
.result-header.victory .r-glitch::before {
  color: #00ffcc;
  clip-path: polygon(0 0, 100% 0, 100% 40%, 0 40%);
  transform: translate(-2px, 0);
}
.result-header.victory .r-glitch::after {
  color: #ff00ff;
  clip-path: polygon(0 60%, 100% 60%, 100% 100%, 0 100%);
  transform: translate(2px, 0);
}
.result-header.defeat .r-glitch::before { color: #ff6600; }
.result-header.defeat .r-glitch::after  { color: #ffcc00; }
@keyframes r-glitch-anim {
  0%, 85%, 100% { opacity: 1; }
  87%, 93%      { transform: skewX(-5deg); }
  90%, 96%      { transform: skewX(5deg); }
}
.result-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 3px;
  margin-top: 8px;
}

.result-body {
  display: flex;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 680px;
  flex-wrap: wrap;
  justify-content: center;
}

.result-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.rs-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 16px 20px;
  background: rgba(0, 8, 0, 0.9);
  border: 1px solid rgba(0, 255, 65, 0.18);
  border-radius: 6px;
  min-width: 90px;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s;
}
.rs-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
}
.rs-item[data-color="cyan"]::before   { background: #00ffff; box-shadow: 0 0 8px #00ffff; }
.rs-item[data-color="green"]::before  { background: #00ff41; box-shadow: 0 0 8px #00ff41; }
.rs-item[data-color="teal"]::before   { background: #00ffcc; box-shadow: 0 0 8px #00ffcc; }
.rs-item[data-color="orange"]::before { background: #ff6600; box-shadow: 0 0 8px #ff6600; }
.rs-item[data-color="purple"]::before { background: #aa44ff; box-shadow: 0 0 8px #aa44ff; }
.rs-item:hover { transform: translateY(-3px); }
.rs-icon {
  font-size: 14px;
  opacity: 0.5;
}
.rs-label {
  font-size: 9px;
  color: rgba(0, 255, 65, 0.45);
  letter-spacing: 2px;
}
.rs-value {
  font-size: 30px;
  font-weight: 900;
  color: #00ff41;
  line-height: 1;
}
.rs-unit {
  font-size: 16px;
  opacity: 0.5;
}
.rs-value.score {
  color: #00ffff;
  text-shadow: 0 0 12px rgba(0, 240, 255, 0.7);
}

.result-rating-wrap {
  flex-shrink: 0;
}
.result-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.rating-ring {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(0, 255, 65, 0.3);
  position: relative;
}
.rating-ring.rating-s {
  border-color: #ffcc00;
  box-shadow: 0 0 24px rgba(255, 204, 0, 0.5), inset 0 0 20px rgba(255, 204, 0, 0.1);
  animation: rating-ring-glow 1.2s ease-in-out infinite alternate;
}
.rating-ring.rating-a {
  border-color: #00ffcc;
  box-shadow: 0 0 18px rgba(0, 255, 204, 0.4);
}
.rating-ring.rating-b {
  border-color: #00ff41;
  box-shadow: 0 0 14px rgba(0, 255, 65, 0.35);
}
.rating-ring.rating-c {
  border-color: rgba(0, 255, 65, 0.3);
}
@keyframes rating-ring-glow {
  from { box-shadow: 0 0 20px rgba(255,204,0,0.4), inset 0 0 16px rgba(255,204,0,0.05); }
  to   { box-shadow: 0 0 40px rgba(255,204,0,0.7), inset 0 0 30px rgba(255,204,0,0.1); }
}
.rating-val {
  font-size: 48px;
  font-weight: 900;
  line-height: 1;
}
.rating-s { color: #ffcc00; text-shadow: 0 0 20px #ffcc00; }
.rating-a { color: #00ffcc; text-shadow: 0 0 14px #00ffcc; }
.rating-b { color: #00ff41; text-shadow: 0 0 10px #00ff41; }
.rating-c { color: rgba(0, 255, 65, 0.5); }
.rating-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}
.rating-title {
  font-size: 9px;
  color: rgba(0, 255, 65, 0.4);
  letter-spacing: 2px;
}
.rating-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-family: 'Microsoft YaHei', sans-serif;
}

.result-buttons {
  display: flex;
  gap: 14px;
}

/* ═══════════════════════════════════════
   教程弹窗
══════════════════════════════════════════ */
.help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.help-modal {
  background: rgba(0, 10, 0, 0.97);
  border: 1px solid rgba(0, 255, 65, 0.4);
  border-radius: 10px;
  padding: 32px 40px;
  max-width: 500px;
  width: 90%;
  box-shadow:
    0 0 50px rgba(0, 255, 65, 0.15),
    inset 0 0 30px rgba(0, 255, 65, 0.02);
  position: relative;
  overflow: hidden;
}
.help-modal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #00ff41 30%, #00ffcc 70%, transparent);
  box-shadow: 0 0 10px #00ff41;
}
.help-title {
  font-size: 18px;
  color: #00ffcc;
  letter-spacing: 5px;
  margin-bottom: 24px;
  text-align: center;
  text-transform: uppercase;
}
.help-list {
  padding-left: 0;
  margin-bottom: 28px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.help-list li {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  line-height: 2;
  padding: 0 4px;
  border-left: 2px solid rgba(0, 255, 65, 0.15);
  padding-left: 12px;
  transition: border-color 0.2s;
}
.help-list li:hover {
  border-left-color: rgba(0, 255, 65, 0.5);
}
.help-list b {
  color: #00ff41;
}

/* ═══════════════════════════════════════
   音乐控制
══════════════════════════════════════════ */
.music-ctrl {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  background: rgba(0, 10, 0, 0.88);
  border: 1px solid rgba(0, 255, 65, 0.25);
  border-radius: 30px;
  z-index: 50;
  backdrop-filter: blur(6px);
  box-shadow: 0 0 14px rgba(0, 255, 65, 0.08);
}
.music-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  transition: transform 0.15s;
  opacity: 0.8;
}
.music-btn:hover {
  transform: scale(1.25);
  opacity: 1;
}
.vol-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 70px;
  height: 3px;
  background: rgba(0, 255, 65, 0.2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #00ff41;
  box-shadow: 0 0 6px #00ff41;
  cursor: pointer;
}

/* ═══════════════════════════════════════
   过渡动画
══════════════════════════════════════════ */
.screen-fade-enter-active {
  animation: screen-in 0.4s ease;
}
.screen-fade-leave-active {
  animation: screen-out 0.3s ease;
}
@keyframes screen-in {
  from { opacity: 0; filter: brightness(2) blur(6px); transform: scale(1.02); }
  to   { opacity: 1; filter: none; transform: scale(1); }
}
@keyframes screen-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; filter: brightness(2) blur(6px); transform: scale(0.98); }
}

.msg-pop-enter-active {
  animation: msg-in 0.2s ease-out;
}
.msg-pop-leave-active {
  animation: msg-out 0.3s ease-in;
}
@keyframes msg-in {
  from { opacity: 0; transform: translateY(8px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes msg-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(-8px) scale(0.9); }
}
</style>
