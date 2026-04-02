<template>
  <div class="poem-game" :style="{ background: currentPoem?.theme.bg || '#0a0a1a' }">
    <!-- 粒子背景 Canvas -->
    <canvas ref="bgCanvas" class="bg-canvas"></canvas>

    <!-- CRT 扫描线 -->
    <div class="crt-overlay"></div>

    <!-- 背景音乐 -->
    <audio ref="bgAudio" loop preload="auto" src="https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/5.mp3"></audio>

    <!-- 音乐控制按钮 -->
    <button class="music-btn" @click="toggleMusic" :title="musicPlaying ? '暂停音乐' : '播放音乐'">
      <span class="music-icon">{{ musicPlaying ? '♫' : '♪' }}</span>
      <span class="music-bars" v-if="musicPlaying">
        <span class="bar b1"></span>
        <span class="bar b2"></span>
        <span class="bar b3"></span>
      </span>
    </button>

    <!-- ========== 选篇界面 ========== -->
    <transition name="fade">
      <div v-if="phase === 'select'" class="select-screen">

        <!-- 顶部导航 -->
        <div class="select-nav">
          <button class="back-btn" @click="goBack">
            <span class="back-icon">‹</span> 返回
          </button>
          <div class="select-title-wrap">
            <div class="select-title-deco"></div>
            <h1 class="select-title">诗·词·歌</h1>
            <div class="select-title-deco"></div>
          </div>
          <div class="select-count">共 {{ filteredPoems.length }} 首</div>
        </div>

        <!-- 副标题 -->
        <p class="select-subtitle">用指尖触碰经典，感受文字的温度</p>

        <!-- 分类 Tab -->
        <div class="type-tabs">
          <button
            v-for="t in POEM_TYPES"
            :key="t.id"
            class="tab-btn"
            :class="{ active: activeType === t.id }"
            @click="activeType = t.id"
          >{{ t.label }}</button>
        </div>

        <!-- 诗词卡片网格 -->
        <div class="poem-grid">
          <div
            v-for="poem in filteredPoems"
            :key="poem.id"
            class="poem-card"
            :style="{ '--accent': poem.theme.accent, '--cover': poem.cover }"
            :class="{ 'has-record': bestRecords[poem.id] }"
            @click="selectPoem(poem)"
          >
            <!-- 顶部封面渐变 -->
            <div class="card-cover">
              <div class="card-cover-img"></div>
              <!-- 古典网格纹 -->
              <div class="card-cover-pattern"></div>
              <div class="card-cover-overlay"></div>
              <!-- 大字装饰 -->
              <span class="card-cover-icon" :style="{ color: poem.theme.accent }">{{ poem.coverIcon }}</span>
              <span class="card-difficulty" :style="{ color: getDifficultyColor(poem.difficulty) }">
                {{ getDifficultyStars(poem.difficulty) }}
              </span>
              <span class="card-type-badge">{{ typeLabel(poem.type) }}</span>
            </div>

            <!-- 底部内容 -->
            <div class="card-body">
              <div class="card-dynasty-author">{{ poem.dynasty }} · {{ poem.author }}</div>
              <div class="card-title">{{ poem.title }}</div>
              <div class="card-quote">{{ poem.desc }}</div>
              <div class="card-footer">
                <span v-if="bestRecords[poem.id]" class="best-badge">
                  ✦ {{ bestRecords[poem.id]!.wpm }} 字/分
                </span>
                <span v-else class="unplayed">{{ poem.lines.length }} 行</span>
                <span class="card-go">开始 →</span>
              </div>
            </div>

            <!-- 悬浮辉光 -->
            <div class="card-glow"></div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ========== 游戏界面 ========== -->
    <transition name="fade">
      <div v-if="phase === 'playing' && currentPoem" class="game-screen">
        <!-- 顶栏 HUD -->
        <div class="hud" :style="{ '--ac': currentPoem.theme.accent }">

          <!-- 左区：退出 + 诗词标题 -->
          <div class="hud-left">
            <button class="quit-btn" @click="quitGame" title="退出">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
            <div class="hud-poem-block">
              <div class="hud-accent-bar" :style="{ background: currentPoem.theme.accent }"></div>
              <div class="hud-poem-meta">
                <span class="hud-poem-title">《{{ currentPoem.title }}》</span>
                <span class="hud-poem-author">{{ currentPoem.dynasty }} · {{ currentPoem.author }}</span>
              </div>
            </div>
          </div>

          <!-- 中区：进度 -->
          <div class="hud-center">
            <div class="hud-progress">
              <div class="hud-progress-nums">
                <span class="hud-prog-cur" :style="{ color: currentPoem.theme.accent }">{{ currentLineIdx + 1 }}</span>
                <span class="hud-prog-sep">/</span>
                <span class="hud-prog-total">{{ currentPoem.lines.length }}</span>
              </div>
              <div class="hud-progress-track">
                <div class="hud-progress-bg-glow" :style="{ background: `linear-gradient(90deg, transparent, ${currentPoem.theme.accent}18)` }"></div>
                <div
                  class="hud-progress-fill"
                  :style="{ width: progressPct + '%', background: `linear-gradient(90deg, #7c3aed, #2563eb 30%, #06b6d4 60%, ${currentPoem.theme.accent})` }"
                ></div>
                <div class="hud-progress-glow" :style="{ width: progressPct + '%', background: `linear-gradient(90deg, #7c3aed, #2563eb 30%, #06b6d4 60%, ${currentPoem.theme.accent})` }"></div>
                <div class="hud-progress-shine"></div>
                <div class="hud-progress-dot" :style="{ left: progressPct + '%', background: currentPoem.theme.accent, boxShadow: `0 0 0 3px ${currentPoem.theme.accent}33, 0 0 12px ${currentPoem.theme.accent}` }"></div>
              </div>
              <span class="hud-prog-pct">{{ Math.round(progressPct) }}%</span>
            </div>
          </div>

          <!-- 右区：统计数据 + 拼音开关 -->
          <div class="hud-right">
            <div class="hud-stats">
              <div class="hud-stat">
                <span class="hud-stat-val">{{ formatTime(elapsed) }}</span>
                <span class="hud-stat-key">用时</span>
              </div>
              <div class="hud-stat-sep"></div>
              <div class="hud-stat">
                <span class="hud-stat-val combo-val" :class="comboClass">{{ combo }}</span>
                <span class="hud-stat-key">连击</span>
              </div>
              <div class="hud-stat-sep"></div>
              <div class="hud-stat">
                <span class="hud-stat-val acc-val" :class="accuracy >= 95 ? 'acc-good' : accuracy >= 80 ? 'acc-mid' : 'acc-low'">{{ accuracy }}<em>%</em></span>
                <span class="hud-stat-key">准确</span>
              </div>
            </div>

            <button
              class="hud-pinyin-btn"
              :class="{ on: showPinyin }"
              :style="showPinyin ? { '--btn-c': currentPoem.theme.accent } : {}"
              @click="showPinyin = !showPinyin"
            >
              <span class="hud-pinyin-zh">拼</span>
              <span class="hud-pinyin-state">{{ showPinyin ? 'ON' : 'OFF' }}</span>
            </button>
          </div>

          <!-- 底部细线装饰 -->
          <div class="hud-bottom-line"></div>
        </div>

        <!-- 连击特效标语 -->
        <transition name="combo-pop">
          <div v-if="comboLabel" class="combo-label" :style="{ color: currentPoem.theme.accent }">
            {{ comboLabel }}
          </div>
        </transition>

        <!-- 主游戏区 -->
        <div class="game-area" @click="focusInput">
          <!-- 已完成的行 -->
          <div class="done-lines">
            <transition-group name="line-done">
              <div
                v-for="item in doneLinesDisplay"
                :key="'done-' + item.idx"
                class="done-line"
                :style="{ color: currentPoem.theme.accent, opacity: 0.3 + (doneLinesDisplay.indexOf(item)) * 0.2 }"
              >
                {{ item.text }}
              </div>
            </transition-group>
          </div>

          <!-- 当前行 -->
          <div v-if="!gameFinished" class="current-line-wrap">
            <!-- 拼音行 -->
            <div v-if="showPinyin" class="pinyin-row">
              <span
                v-for="(py, ci) in currentLine.pinyin"
                :key="'py-' + ci"
                class="pinyin-char"
                :class="{
                  done: ci < charIdx,
                  current: ci === charIdx,
                  pending: ci > charIdx,
                }"
              >{{ py }}</span>
            </div>

            <!-- 汉字行 -->
            <div class="char-row">
              <span
                v-for="(ch, ci) in currentLine.text"
                :key="'ch-' + ci"
                class="char"
                :class="{
                  done: ci < charIdx,
                  current: ci === charIdx,
                  error: ci === charIdx && hasError,
                  pending: ci > charIdx,
                }"
                :style="ci < charIdx ? { color: currentPoem.theme.accent } : {}"
              >{{ ch }}</span>
              <span v-if="charIdx >= currentLine.text.length" class="cursor blink">|</span>
            </div>

            <!-- 译文 -->
            <div class="translation">{{ currentLine.translation }}</div>
          </div>

          <!-- 输入区（紧贴诗句下方） -->
          <div v-if="!gameFinished" class="input-box"
            :class="{ focused: inputFocused, error: hasError }"
            :style="{ '--ac': currentPoem.theme.accent }"
          >
            <div class="input-box-left">
              <span class="next-char" :style="{ color: currentPoem.theme.accent }">
                {{ currentLine.text[charIdx] ?? '↵' }}
              </span>
              <span class="next-label">待输入</span>
            </div>
            <div class="input-box-divider"></div>
            <div class="input-box-right">
              <span v-if="!inputFocused" class="input-placeholder">点击开始输入…</span>
              <span v-else class="input-active-text">
                <span v-if="hasError" class="err-hint">✗ 输入有误，请重新输入正确字符</span>
                <span v-else>输入中 <span class="i-cursor blink">|</span></span>
              </span>
            </div>
            <input
              ref="hiddenInput"
              class="real-input"
              v-model="inputBuf"
              @compositionstart="composing = true"
              @compositionend="onCompositionEnd"
              @input="onInput"
              @keydown="onKeyDown"
              @focus="inputFocused = true"
              @blur="inputFocused = false"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              enterkeyhint="send"
            />
          </div>

          <!-- 完成 Overlay -->
          <transition name="finish-overlay">
            <div v-if="showFinishOverlay" class="finish-overlay" :style="{ '--ac': currentPoem.theme.accent }">
              <div class="finish-icon">✦</div>
              <div class="finish-text">完成！</div>
            </div>
          </transition>

        </div><!-- end game-area -->

      </div>
    </transition>

    <!-- ========== 结算界面 ========== -->
    <transition name="fade">
      <div v-if="phase === 'result' && currentPoem" class="result-screen">
        <div class="result-card" :style="{ '--accent': currentPoem.theme.accent }">
          <div class="result-icon">{{ resultIcon }}</div>
          <h2 class="result-title">《{{ currentPoem.title }}》 完成！</h2>
          <p class="result-author">{{ currentPoem.dynasty }} · {{ currentPoem.author }}</p>

          <!-- 数据卡片 -->
          <div class="result-stats">
            <div class="rs-item" data-color="cyan">
              <div class="rs-label">用时</div>
              <div class="rs-val">{{ formatTime(elapsed) }}</div>
            </div>
            <div class="rs-item" data-color="green">
              <div class="rs-label">打字速度</div>
              <div class="rs-val">{{ wpm }}<span class="rs-unit">字/分</span></div>
            </div>
            <div class="rs-item" data-color="yellow">
              <div class="rs-label">准确率</div>
              <div class="rs-val">{{ accuracy }}<span class="rs-unit">%</span></div>
            </div>
            <div class="rs-item" data-color="purple">
              <div class="rs-label">最高连击</div>
              <div class="rs-val">{{ maxCombo }}<span class="rs-unit">连</span></div>
            </div>
          </div>

          <!-- 评级 -->
          <div class="rating-wrap">
            <div class="rating-ring" :class="'grade-' + grade">
              <span class="grade-text">{{ grade }}</span>
            </div>
            <p class="grade-desc">{{ gradeDesc }}</p>
          </div>

          <!-- 成就 -->
          <div v-if="achievements.length" class="achievements">
            <span v-for="ach in achievements" :key="ach" class="ach-badge">🏆 {{ ach }}</span>
          </div>

          <!-- 诗词全文展示 -->
          <div class="full-poem">
            <div v-for="(line, i) in currentPoem.lines" :key="i" class="full-line">
              {{ line.text }}
            </div>
          </div>

          <div class="result-btns">
            <button class="r-btn primary" @click="replayPoem">再来一次</button>
            <button class="r-btn secondary" @click="phase = 'select'">换一首</button>
            <button class="r-btn back" @click="goBack">返回主页</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { POEMS, POEM_TYPES, getDifficultyStars, getDifficultyColor, type Poem, type PoemLine } from './config'

const router = useRouter()

// ─── 状态 ───────────────────────────────────────────────
type Phase = 'select' | 'playing' | 'result'
const phase = ref<Phase>('select')
const activeType = ref<string>('all')
const currentPoem = ref<Poem | null>(null)

// 游戏核心状态
const currentLineIdx = ref(0)
const charIdx = ref(0)
const hasError = ref(false)
const combo = ref(0)
const maxCombo = ref(0)
const totalKeys = ref(0)
const correctKeys = ref(0)
const comboLabel = ref('')
const comboLabelTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const gameFinished = ref(false)
const showFinishOverlay = ref(false)

// 输入
const hiddenInput = ref<HTMLInputElement | null>(null)
const inputBuf = ref('')
const composing = ref(false)
const inputFocused = ref(false)

// 时间
const startTime = ref(0)
const elapsed = ref(0)
const timerInterval = ref<ReturnType<typeof setInterval> | null>(null)

// 辅助
const showPinyin = ref(true)

// 历史记录
interface BestRecord { wpm: number; accuracy: number; time: number }
const STORAGE_KEY = 'poem-game-best-records'
function loadBestRecords(): Record<string, BestRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}
function saveBestRecords(records: Record<string, BestRecord>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)) } catch {}
}
const bestRecords = ref<Record<string, BestRecord>>(loadBestRecords())

// Canvas
const bgCanvas = ref<HTMLCanvasElement | null>(null)
let animFrameId: number | null = null
let particleCtx: CanvasRenderingContext2D | null = null

// ─── 音乐播放 ──────────────────────────────────────────
const bgAudio = ref<HTMLAudioElement | null>(null)
const musicPlaying = ref(false)

function toggleMusic() {
  const audio = bgAudio.value
  if (!audio) return
  if (musicPlaying.value) {
    audio.pause()
    musicPlaying.value = false
  } else {
    audio.play().then(() => { musicPlaying.value = true }).catch(() => {})
  }
}

function startMusic() {
  const audio = bgAudio.value
  if (!audio || musicPlaying.value) return
  audio.volume = 0.4
  audio.play().then(() => {
    musicPlaying.value = true
    removeAutoplayListeners()
  }).catch(() => {})
}

// 监听第一次用户交互后自动播放（绕过浏览器限制）
function onFirstInteraction() {
  startMusic()
}

function removeAutoplayListeners() {
  document.removeEventListener('click', onFirstInteraction)
  document.removeEventListener('keydown', onFirstInteraction)
  document.removeEventListener('touchstart', onFirstInteraction)
}

function addAutoplayListeners() {
  document.addEventListener('click', onFirstInteraction, { once: true })
  document.addEventListener('keydown', onFirstInteraction, { once: true })
  document.addEventListener('touchstart', onFirstInteraction, { once: true })
}

// ─── 粒子系统 ──────────────────────────────────────────
interface Particle {
  x: number; y: number; vx: number; vy: number
  size: number; alpha: number; color: string; life: number; maxLife: number
}
let particles: Particle[] = []
let currentParticleColor = '#66ccff'

function initCanvas() {
  const canvas = bgCanvas.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  particleCtx = canvas.getContext('2d')
  spawnInitialParticles()
  renderLoop()
}

function spawnInitialParticles() {
  particles = []
  const count = Math.min(80, Math.floor(window.innerWidth / 16))
  for (let i = 0; i < count; i++) {
    particles.push(createParticle(true))
  }
}

function createParticle(random = false): Particle {
  const w = window.innerWidth
  const h = window.innerHeight
  return {
    x: Math.random() * w,
    y: random ? Math.random() * h : h + 10,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -(Math.random() * 0.6 + 0.2),
    size: Math.random() * 3 + 1,
    alpha: Math.random() * 0.6 + 0.2,
    color: currentParticleColor,
    life: 0,
    maxLife: Math.random() * 400 + 200,
  }
}

function renderLoop() {
  animFrameId = requestAnimationFrame(renderLoop)
  const ctx = particleCtx
  const canvas = bgCanvas.value
  if (!ctx || !canvas) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 更新粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    p.life++
    const lifeRatio = p.life / p.maxLife
    p.alpha = lifeRatio < 0.1 ? lifeRatio * 6 : lifeRatio > 0.7 ? (1 - lifeRatio) * 3 : 1
    p.alpha *= 0.7
    if (p.life > p.maxLife || p.y < -20) {
      particles[i] = createParticle()
    }
    const alpha = Math.max(0, p.alpha)
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.shadowBlur = 8
    ctx.shadowColor = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}

function burstParticles(count = 20) {
  const w = window.innerWidth
  const h = window.innerHeight
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
    particles.push({
      x: w / 2 + (Math.random() - 0.5) * 200,
      y: h * 0.55,
      vx: Math.cos(angle) * (Math.random() * 3 + 1),
      vy: Math.sin(angle) * (Math.random() * 3 + 1) - 2,
      size: Math.random() * 4 + 2,
      alpha: 1,
      color: currentParticleColor,
      life: 0,
      maxLife: Math.random() * 80 + 40,
    })
  }
}

// ─── 计算属性 ──────────────────────────────────────────
const filteredPoems = computed(() => {
  if (activeType.value === 'all') return POEMS
  return POEMS.filter(p => p.type === activeType.value)
})

const currentLine = computed<PoemLine>(() => {
  if (!currentPoem.value) return { text: '', pinyin: [], translation: '', mood: '' }
  return currentPoem.value.lines[currentLineIdx.value] ?? { text: '', pinyin: [], translation: '', mood: '' }
})

const progressPct = computed(() => {
  if (!currentPoem.value) return 0
  const total = currentPoem.value.lines.length
  const done = currentLineIdx.value + charIdx.value / Math.max(1, currentLine.value.text.length)
  return (done / total) * 100
})

const accuracy = computed(() => {
  if (totalKeys.value === 0) return 100
  return Math.round((correctKeys.value / totalKeys.value) * 100)
})

const wpm = computed(() => {
  const sec = Math.max(1, elapsed.value)
  // 已完成行的字数 + 当前行已输入字数
  const doneChars = currentPoem.value?.lines
    .slice(0, currentLineIdx.value)
    .reduce((s, l) => s + l.text.length, 0) ?? 0
  const inputChars = doneChars + charIdx.value
  return Math.round((inputChars / sec) * 60)
})

const comboClass = computed(() => {
  if (combo.value >= 20) return 'legendary'
  if (combo.value >= 10) return 'fire'
  if (combo.value >= 5) return 'flow'
  return ''
})

const doneLinesDisplay = computed(() => {
  if (!currentPoem.value) return []
  const lines = currentPoem.value.lines
  const count = currentLineIdx.value
  // 返回带绝对索引，作为 transition-group key 使用
  return lines
    .slice(0, count)
    .map((l, i) => ({ text: l.text, idx: i }))
    .slice(-3)
})

const grade = computed(() => {
  const acc = accuracy.value
  if (acc === 100 && maxCombo.value >= 10) return 'S'
  if (acc >= 95) return 'A'
  if (acc >= 85) return 'B'
  if (acc >= 70) return 'C'
  return 'D'
})

const gradeDesc = computed(() => {
  const map: Record<string, string> = {
    S: '完美！行云流水，字字珠玑',
    A: '出色！功底扎实，文采飞扬',
    B: '不错！继续练习，更上层楼',
    C: '加油！熟能生巧，勤加练习',
    D: '继续努力！每一次都是进步',
  }
  return map[grade.value] ?? ''
})

const resultIcon = computed(() => {
  const map: Record<string, string> = { S: '🏆', A: '🎖️', B: '🎗️', C: '📜', D: '📝' }
  return map[grade.value] ?? '📜'
})

const achievements = computed(() => {
  const list: string[] = []
  if (accuracy.value === 100) list.push('流水行云（全程零错误）')
  if (maxCombo.value >= 20) list.push('文思泉涌（20连击）')
  if (elapsed.value < 30) list.push('下笔如飞（30秒内完成）')
  if (maxCombo.value >= 10) list.push('神来之笔（10连击）')
  return list
})

// ─── 工具函数 ──────────────────────────────────────────
function typeLabel(t: string) {
  const map: Record<string, string> = { poem: '古诗', ci: '宋词', modern: '现代诗', lyric: '歌词' }
  return map[t] ?? t
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

// ─── 选篇 & 开始 ───────────────────────────────────────
function selectPoem(poem: Poem) {
  currentPoem.value = poem
  currentParticleColor = poem.theme.particle
  spawnInitialParticles()
  resetGame()
  phase.value = 'playing'
  nextTick(() => {
    hiddenInput.value?.focus()
    startTimer()
  })
}

function resetGame() {
  currentLineIdx.value = 0
  charIdx.value = 0
  hasError.value = false
  combo.value = 0
  maxCombo.value = 0
  totalKeys.value = 0
  correctKeys.value = 0
  comboLabel.value = ''
  gameFinished.value = false
  inputBuf.value = ''
  composing.value = false
  elapsed.value = 0
  stopTimer()
}

function startTimer() {
  startTime.value = Date.now()
  timerInterval.value = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - startTime.value) / 1000)
  }, 100)
}

function stopTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

function quitGame() {
  stopTimer()
  phase.value = 'select'
  resetGame()
}

function replayPoem() {
  if (!currentPoem.value) return
  resetGame()
  phase.value = 'playing'
  nextTick(() => {
    hiddenInput.value?.focus()
    startTimer()
  })
}

// ─── 输入处理 ──────────────────────────────────────────
function onCompositionEnd(e: CompositionEvent) {
  composing.value = false
  processChar(e.data ?? '')
  inputBuf.value = ''
}

function onInput() {
  if (composing.value) return
  const val = inputBuf.value
  if (!val) return
  // 处理最后输入的字符
  const last = val[val.length - 1]
  processChar(last)
  inputBuf.value = ''
}

function onKeyDown(e: KeyboardEvent) {
  // 防止 Backspace 跳转页面
  if (e.key === 'Backspace') {
    e.preventDefault()
  }
  // Tab 切换拼音
  if (e.key === 'Tab') {
    e.preventDefault()
    showPinyin.value = !showPinyin.value
  }
}

function focusInput() {
  hiddenInput.value?.focus()
}

function processChar(inputChar: string) {
  if (!currentPoem.value || gameFinished.value) return
  const line = currentLine.value
  const target = line.text[charIdx.value]
  if (!target) return

  totalKeys.value++

  if (inputChar === target) {
    // 正确
    correctKeys.value++
    hasError.value = false
    combo.value++
    if (combo.value > maxCombo.value) maxCombo.value = combo.value
    charIdx.value++
    triggerComboLabel()

    // 本行完成？
    if (charIdx.value >= line.text.length) {
      burstParticles(15 + combo.value)
      charIdx.value = 0
      currentLineIdx.value++

      // 全篇完成？
      if (currentLineIdx.value >= currentPoem.value.lines.length) {
        finishGame()
      }
    }
  } else {
    // 错误
    hasError.value = true
    combo.value = 0
    // 震动效果
    triggerShake()
  }
}

function triggerComboLabel() {
  if (comboLabelTimer.value) clearTimeout(comboLabelTimer.value)
  if (combo.value >= 20) comboLabel.value = '⚡ LEGENDARY'
  else if (combo.value >= 10) comboLabel.value = '🔥 ON FIRE'
  else if (combo.value >= 5) comboLabel.value = '✨ FLOW'
  else { comboLabel.value = ''; return }
  comboLabelTimer.value = setTimeout(() => { comboLabel.value = '' }, 1200)
}

function triggerShake() {
  const el = document.querySelector('.current-line-wrap') as HTMLElement
  if (!el) return
  el.classList.add('shake')
  setTimeout(() => el.classList.remove('shake'), 400)
}

function finishGame() {
  gameFinished.value = true
  stopTimer()
  elapsed.value = Math.floor((Date.now() - startTime.value) / 1000)
  burstParticles(60)
  showFinishOverlay.value = true

  // 保存最佳记录（持久化到 localStorage）
  if (currentPoem.value) {
    const id = currentPoem.value.id
    const cur = bestRecords.value[id]
    if (!cur || wpm.value > cur.wpm) {
      bestRecords.value[id] = {
        wpm: wpm.value,
        accuracy: accuracy.value,
        time: elapsed.value,
      }
      saveBestRecords(bestRecords.value)
    }
  }

  setTimeout(() => {
    showFinishOverlay.value = false
    phase.value = 'result'
  }, 800)
}

function goBack() {
  stopTimer()
  router.push('/')
}

// ─── 全局兜底聚焦（防止输入框失焦卡死）──────────────────
function onGlobalKeyDown(e: KeyboardEvent) {
  if (phase.value !== 'playing') return
  // 不是功能键时自动重新聚焦输入框
  if (hiddenInput.value && document.activeElement !== hiddenInput.value) {
    hiddenInput.value.focus()
  }
}

// ─── 生命周期 ──────────────────────────────────────────
onMounted(() => {
  initCanvas()
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onGlobalKeyDown)
  // 先尝试直接播放，失败则等待用户第一次交互
  setTimeout(() => {
    const audio = bgAudio.value
    if (!audio) { addAutoplayListeners(); return }
    audio.volume = 0.4
    audio.play().then(() => {
      musicPlaying.value = true
    }).catch(() => {
      // 浏览器阻止了自动播放，等待用户交互
      addAutoplayListeners()
    })
  }, 300)
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  stopTimer()
  if (comboLabelTimer.value) clearTimeout(comboLabelTimer.value)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onGlobalKeyDown)
  removeAutoplayListeners()
  // 停止音乐
  if (bgAudio.value) {
    bgAudio.value.pause()
    bgAudio.value.currentTime = 0
  }
})

function onResize() {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  animFrameId = null
  if (bgCanvas.value) {
    bgCanvas.value.width = window.innerWidth
    bgCanvas.value.height = window.innerHeight
  }
  spawnInitialParticles()
  renderLoop()
}

// 点击游戏区保持输入框聚焦
watch(phase, (val) => {
  if (val === 'playing') {
    nextTick(() => hiddenInput.value?.focus())
  }
})
</script>

<style scoped>
/* ═══ 全局 ═══ */
.poem-game {
  position: fixed;
  inset: 0;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  overflow: hidden;
  transition: background 1.2s ease;
}

.bg-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.crt-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.04) 2px,
    rgba(0, 0, 0, 0.04) 4px
  );
}

/* ─── 过渡动画 ─── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s, transform 0.5s; }
.fade-enter-from { opacity: 0; transform: translateY(20px); }
.fade-leave-to { opacity: 0; transform: translateY(-20px); }

/* ═══ 选篇界面 ═══ */
.select-screen {
  position: relative;
  z-index: 10;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 0 32px 24px;
  overflow: hidden;
}

/* 顶部导航 */
.select-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0 16px;
  flex-shrink: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.55);
  padding: 7px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  letter-spacing: 0.5px;
}
.back-btn:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.3);
  color: #fff;
}
.back-icon { font-size: 18px; line-height: 1; margin-top: -1px; }

.select-title-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
}
.select-title-deco {
  width: 40px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3));
}
.select-title-wrap .select-title-deco:last-child {
  transform: scaleX(-1);
}
.select-title {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: 6px;
  text-shadow: 0 0 30px rgba(255,255,255,0.2);
}

.select-count {
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  letter-spacing: 1px;
  min-width: 60px;
  text-align: right;
}

/* 副标题 */
.select-subtitle {
  text-align: center;
  font-size: 12px;
  color: rgba(255,255,255,0.25);
  letter-spacing: 3px;
  margin: 0 0 20px;
  flex-shrink: 0;
}

/* 分类 Tab */
.type-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.tab-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.4);
  padding: 5px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
  letter-spacing: 1px;
  transition: all 0.2s;
}
.tab-btn.active {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.4);
  color: #fff;
}
.tab-btn:hover:not(.active) {
  border-color: rgba(255,255,255,0.25);
  color: rgba(255,255,255,0.7);
}

/* 诗词卡片网格 */
.poem-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  overflow-y: auto;
  padding: 15px;
  flex: 1;
  min-height: 0;
  align-content: start;
}
.poem-grid::-webkit-scrollbar { width: 4px; }
.poem-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

/* ── 卡片容器 ── */
.poem-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 300px;
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(10,10,20,0.9);
  backdrop-filter: blur(12px);
  transition:
    transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1),
    box-shadow 0.35s ease,
    border-color 0.25s ease;
  box-shadow:
    0 6px 24px rgba(0,0,0,0.5),
    0 1px 0 rgba(255,255,255,0.05) inset;
}
.poem-card:hover {
  transform: translateY(-8px) scale(1.02);
  border-color: color-mix(in srgb, var(--accent) 55%, transparent);
  box-shadow:
    0 20px 60px rgba(0,0,0,0.6),
    0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent),
    0 0 40px color-mix(in srgb, var(--accent) 20%, transparent),
    0 1px 0 rgba(255,255,255,0.08) inset;
}
.poem-card.has-record {
  border-color: rgba(255,255,255,0.12);
}

/* ── 顶部封面图 ── */
.card-cover {
  position: relative;
  height: 165px;
  flex-shrink: 0;
  overflow: hidden;
}
.card-cover-img {
  position: absolute;
  inset: 0;
  background: var(--cover);
  transition: transform 0.6s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.3s;
  opacity: 1;
}
.poem-card:hover .card-cover-img {
  transform: scale(1.05);
}
/* 古典几何纹样 — 用径向+线性渐变模拟回纹/云纹 */
.card-cover-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.18;
  background-image:
    repeating-linear-gradient(
      45deg,
      rgba(255,255,255,0.08) 0px,
      rgba(255,255,255,0.08) 1px,
      transparent 1px,
      transparent 12px
    ),
    repeating-linear-gradient(
      -45deg,
      rgba(255,255,255,0.05) 0px,
      rgba(255,255,255,0.05) 1px,
      transparent 1px,
      transparent 12px
    );
  transition: opacity 0.3s;
}
.poem-card:hover .card-cover-pattern { opacity: 0.28; }
/* 封面底部渐变过渡 */
.card-cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 30%,
    rgba(10,10,20,0.95) 100%
  );
}
/* 大字装饰居中 */
.card-cover-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -58%);
  font-size: 72px;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
  opacity: 0.22;
  text-shadow: 0 0 40px currentColor, 0 2px 0 rgba(0,0,0,0.5);
  pointer-events: none;
  z-index: 1;
  font-family: 'Noto Serif SC', 'STSong', '宋体', serif;
  transition: opacity 0.35s, transform 0.5s cubic-bezier(0.34,1.2,0.64,1);
  user-select: none;
}
.poem-card:hover .card-cover-icon {
  opacity: 0.42;
  transform: translate(-50%, -58%) scale(1.1);
  text-shadow: 0 0 60px currentColor, 0 0 20px currentColor;
}
/* 难度星（右上角） */
.card-difficulty {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 11px;
  letter-spacing: 2px;
  text-shadow: 0 1px 6px rgba(0,0,0,0.9);
  z-index: 2;
}
/* 类型徽章（左上角） */
.card-type-badge {
  position: absolute;
  top: 10px;
  left: 12px;
  font-size: 10px;
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent);
  border-radius: 4px;
  padding: 2px 7px;
  background: color-mix(in srgb, var(--accent) 12%, rgba(0,0,0,0.6));
  letter-spacing: 1px;
  z-index: 2;
  backdrop-filter: blur(4px);
}

/* ── 底部内容 ── */
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 14px 16px 14px;
  position: relative;
  z-index: 1;
}

.card-dynasty-author {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  letter-spacing: 1.5px;
  margin-bottom: 4px;
}

.card-title {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 5px;
  line-height: 1.1;
  transition: color 0.2s, text-shadow 0.2s;
}
.poem-card:hover .card-title {
  color: var(--accent);
  text-shadow: 0 0 20px color-mix(in srgb, var(--accent) 60%, transparent);
}

.card-quote {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  letter-spacing: 1px;
  line-height: 1.6;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  flex: 1;
  margin: 6px 0 0;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.best-badge {
  font-size: 10px;
  color: #4ade80;
  background: rgba(74,222,128,0.08);
  border: 1px solid rgba(74,222,128,0.2);
  border-radius: 8px;
  padding: 2px 8px;
  letter-spacing: 0.5px;
}
.unplayed {
  font-size: 10px;
  color: rgba(255,255,255,0.2);
  letter-spacing: 1px;
}
.card-go {
  font-size: 11px;
  color: var(--accent);
  letter-spacing: 1px;
  opacity: 0;
  transform: translateX(-6px);
  transition: all 0.22s;
}
.poem-card:hover .card-go { opacity: 1; transform: translateX(0); }

/* ── 悬浮辉光层 ── */
.card-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 100%,
    color-mix(in srgb, var(--accent) 14%, transparent),
    transparent 70%
  );
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s;
}
.poem-card:hover .card-glow { opacity: 1; }

/* ═══ 游戏界面 ═══ */
.game-screen {
  position: relative;
  z-index: 10;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* ── HUD 主体 ── */
.hud {
  display: flex;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background: linear-gradient(90deg, rgba(11, 61, 101, 0.96) 0%, rgba(7, 48, 77, 0.58) 100%);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  gap: 0;
  flex-shrink: 0;
  position: relative;
}

/* 底部装饰线 */
.hud-bottom-line {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--ac) 25%, transparent) 20%,
    color-mix(in srgb, var(--ac) 50%, transparent) 50%,
    color-mix(in srgb, var(--ac) 25%, transparent) 80%,
    transparent 100%
  );
}

/* ── 左区 ── */
.hud-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

/* 退出按钮 */
.quit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: rgba(255, 50, 50, 0.06);
  border: 1px solid rgba(255, 80, 80, 0.18);
  color: rgba(255, 100, 100, 0.6);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.22s;
  flex-shrink: 0;
}
.quit-btn:hover {
  background: rgba(255, 50, 50, 0.15);
  border-color: rgba(255, 80, 80, 0.55);
  color: #ff7070;
  transform: scale(1.06);
  box-shadow: 0 0 12px rgba(255,60,60,0.2);
}

/* 诗词信息块 */
.hud-poem-block {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.hud-accent-bar {
  width: 3px;
  height: 28px;
  border-radius: 2px;
  flex-shrink: 0;
  opacity: 0.85;
  box-shadow: 0 0 8px currentColor;
}
.hud-poem-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.hud-poem-title {
  font-size: 15px;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
  letter-spacing: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Noto Serif SC', 'STSong', '宋体', serif;
}
.hud-poem-author {
  font-size: 10px;
  color: rgba(255,255,255,0.28);
  letter-spacing: 2px;
  white-space: nowrap;
}

/* ── 中区 ── */
.hud-center {
  flex: 2;
  padding: 0 24px;
}
.hud-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}
.hud-progress-nums {
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex-shrink: 0;
}
.hud-prog-cur {
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0;
}
.hud-prog-sep {
  font-size: 11px;
  color: rgba(255,255,255,0.2);
}
.hud-prog-total {
  font-size: 12px;
  color: rgba(255,255,255,0.28);
  letter-spacing: 0;
}
.hud-progress-track {
  position: relative;
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.06);
  border-radius: 8px;
  overflow: visible;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.4);
}
/* 轨道背景辉光 */
.hud-progress-bg-glow {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  pointer-events: none;
}
.hud-progress-fill {
  position: relative;
  height: 100%;
  border-radius: 8px;
  transition: width 0.6s cubic-bezier(0.34, 1.4, 0.64, 1);
  z-index: 1;
}
/* 高光条纹扫描感 */
.hud-progress-shine {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 40%;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.12), transparent);
  pointer-events: none;
  z-index: 3;
}
.hud-progress-glow {
  position: absolute;
  top: 50%;
  left: 0;
  height: 8px;
  transform: translateY(-50%);
  border-radius: 8px;
  filter: blur(8px);
  opacity: 0.55;
  transition: width 0.6s cubic-bezier(0.34, 1.4, 0.64, 1);
  pointer-events: none;
  z-index: 0;
}
.hud-progress-dot {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.9);
  transform: translate(-50%, -50%);
  transition: left 0.6s cubic-bezier(0.34, 1.4, 0.64, 1);
  z-index: 4;
}
.hud-prog-pct {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.35);
  letter-spacing: 0.5px;
  flex-shrink: 0;
  min-width: 32px;
  text-align: right;
}

/* ── 右区 ── */
.hud-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

/* 统计组 */
.hud-stats {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  overflow: hidden;
}
.hud-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 14px;
}
.hud-stat-sep {
  width: 1px;
  height: 26px;
  background: rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.hud-stat-val {
  font-size: 15px;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
  letter-spacing: 0;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.hud-stat-val em {
  font-style: normal;
  font-size: 11px;
  font-weight: 400;
  color: rgba(255,255,255,0.4);
  margin-left: 1px;
}
.hud-stat-key {
  font-size: 9px;
  color: rgba(255,255,255,0.22);
  letter-spacing: 1.5px;
  line-height: 1;
}

/* 连击颜色 */
.combo-val.flow { color: #ffe066; text-shadow: 0 0 10px rgba(255,224,102,0.6); }
.combo-val.fire { color: #ff8844; text-shadow: 0 0 12px rgba(255,120,60,0.7); }
.combo-val.legendary { color: #dd44ff; text-shadow: 0 0 16px rgba(200,60,255,0.8); animation: hudPulse 0.6s ease infinite; }
@keyframes hudPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }

/* 准确率颜色 */
.acc-good { color: #4ade80 !important; text-shadow: 0 0 10px rgba(74,222,128,0.5); }
.acc-mid  { color: #fbbf24 !important; }
.acc-low  { color: #f87171 !important; }

/* 拼音按钮 */
.hud-pinyin-btn {
  --btn-c: rgba(255,255,255,0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.3);
  padding: 5px 11px;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.hud-pinyin-btn:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.7);
}
.hud-pinyin-btn.on {
  background: color-mix(in srgb, var(--btn-c) 12%, transparent);
  border-color: color-mix(in srgb, var(--btn-c) 45%, transparent);
  color: var(--btn-c);
  box-shadow: 0 0 10px color-mix(in srgb, var(--btn-c) 15%, transparent);
}
.hud-pinyin-zh { font-size: 14px; font-weight: 700; line-height: 1; }
.hud-pinyin-state { font-size: 8px; letter-spacing: 1.5px; line-height: 1; }

/* 旧 HUD 类保留（兼容其他地方引用，但不显示） */
.stat-item, .stat-icon, .stat-label, .stat-val,
.stat-divider, .progress-wrap, .progress-label,
.progress-bar, .progress-fill, .progress-glow,
.poem-info, .poem-cover-dot, .poem-title-hud,
.poem-sep, .poem-author-hud, .quit-icon,
.pinyin-toggle-hud, .toggle-icon, .toggle-label { display: none; }

/* 连击标语 */
.combo-label {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 4px;
  text-shadow: 0 0 20px currentColor;
  pointer-events: none;
  z-index: 20;
}
.combo-pop-enter-active { animation: comboPop 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.combo-pop-leave-active { animation: comboPop 0.3s reverse ease-in; }
@keyframes comboPop { from { transform: translateX(-50%) scale(0.5); opacity: 0; } to { transform: translateX(-50%) scale(1); opacity: 1; } }

/* 主游戏区 */
.game-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 20px 20px;
  gap: 16px;
  cursor: text;
  min-height: 0;
}

/* 已完成行 */
.done-lines {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-height: 70px;
  justify-content: flex-end;
}
.done-line {
  font-size: 20px;
  letter-spacing: 8px;
  font-weight: 500;
  transition: all 0.3s;
}
.line-done-enter-active { transition: all 0.4s; }
.line-done-enter-from { opacity: 0; transform: translateY(16px); }

/* 当前行 */
.current-line-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.current-line-wrap.shake { animation: shakeX 0.4s ease; }
@keyframes shakeX {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(5px); }
}

/* 拼音行 */
.pinyin-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
}
.pinyin-char {
  font-size: 13px;
  letter-spacing: 0;
  transition: all 0.2s;
  min-width: 26px;
  text-align: center;
}
.pinyin-char.done { color: rgba(255,255,255,0.2); }
.pinyin-char.current { color: #fff; font-weight: 700; text-shadow: 0 0 8px #fff; }
.pinyin-char.pending { color: rgba(255,255,255,0.15); }

/* 汉字行 */
.char-row {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}
.char {
  font-size: clamp(32px, 5vw, 52px);
  font-weight: 700;
  letter-spacing: 0;
  transition: all 0.15s;
  line-height: 1;
}
.char.done { text-shadow: 0 0 10px currentColor; transform: scale(0.93); }
.char.current { color: #fff; text-shadow: 0 0 20px rgba(255,255,255,0.8); transform: scale(1.1); }
.char.error { color: #ff4444 !important; text-shadow: 0 0 20px #ff4444; animation: errorFlash 0.3s ease; }
.char.pending { color: rgba(255,255,255,0.18); }
.cursor.blink { color: #fff; animation: blink 1s step-end infinite; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes errorFlash { 0%,100% { transform: scale(1.1); } 50% { transform: scale(1.2); } }

/* 译文 */
.translation {
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  letter-spacing: 2px;
  max-width: 480px;
  text-align: center;
}

/* ── 输入框（紧贴诗句） ── */
.input-box {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  max-width: 480px;
  background: rgba(255,255,255,0.04);
  border: 1.5px solid rgba(255,255,255,0.12);
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
  cursor: text;
  -webkit-tap-highlight-color: transparent;
}
.input-box.focused {
  border-color: var(--ac);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ac) 18%, transparent),
              0 4px 24px rgba(0,0,0,0.3);
  background: rgba(255,255,255,0.07);
}
.input-box.error {
  border-color: #ff4444 !important;
  box-shadow: 0 0 0 3px rgba(255,68,68,0.15) !important;
  animation: shakeX 0.35s ease;
}

.input-box-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-right: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  min-width: 56px;
  flex-shrink: 0;
}
.next-char {
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
}
.next-label {
  font-size: 9px;
  color: rgba(255,255,255,0.3);
  letter-spacing: 1px;
  margin-top: 3px;
}

.input-box-right {
  flex: 1;
  padding: 0 16px;
  font-size: 14px;
  min-width: 0;
}

/* 分割线 */
.input-box-divider {
  width: 1px;
  height: 36px;
  background: rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.input-placeholder { color: rgba(255,255,255,0.25); letter-spacing: 1px; }
.input-active-text { letter-spacing: 1px; }
.err-hint { color: #ff7777; font-size: 13px; }
.i-cursor { color: #fff; animation: blink 1s step-end infinite; }

/* real-input 覆盖整个输入框，透明可交互 */
.real-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: text;
  font-size: 16px;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
}

/* 移动端输入区（兼容旧名） */
.mobile-input-area { display: none; }

/* 旧输入提示（已移除但保留空规则防报错） */
.input-hint, .hint-key, .hint-text,
.input-area, .input-area-inner, .input-area-icon, .input-area-label,
.input-area-idle, .input-area-active, .m-cursor,
.pinyin-toggle, .error-toast { display: none; }

/* 移动端 */
@media (max-width: 600px) {
  .select-screen { padding: 0 12px 16px; }
  .poem-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .poem-card { height: 240px; }
  .card-cover { height: 130px; }
  .card-title { font-size: 18px; letter-spacing: 3px; }
  .hud { padding: 0 12px; height: 54px; }
  .hud-poem-block { display: none; }
  .hud-center { flex: 3; padding: 0 12px; }
  .hud-stat { padding: 5px 10px; }
  .hud-stat-val { font-size: 13px; }
  .hud-stat-key { display: none; }
  .hud-pinyin-btn { padding: 4px 8px; }
  .hud-pinyin-zh { font-size: 12px; }
  .game-area { padding: 16px 12px 16px; gap: 12px; }
  .done-lines { min-height: 52px; }
  .done-line { font-size: 17px; letter-spacing: 6px; }
  .input-box { max-width: 100%; border-radius: 12px; }
  .input-box-left { padding: 10px 12px; min-width: 48px; }
  .next-char { font-size: 22px; }
}

/* ─── 音乐控制按钮 ─── */
.music-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(10, 10, 30, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50px;
  padding: 8px 14px;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition: all 0.25s ease;
  color: rgba(255, 255, 255, 0.7);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}
.music-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.35);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.5);
}
.music-icon {
  font-size: 18px;
  line-height: 1;
}
/* 音乐跳动条 */
.music-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}
.bar {
  display: block;
  width: 3px;
  border-radius: 2px;
  background: #7dd3fc;
  animation: musicBar 0.8s ease-in-out infinite;
}
.b1 { height: 6px; animation-delay: 0s; }
.b2 { height: 12px; animation-delay: 0.2s; }
.b3 { height: 8px; animation-delay: 0.4s; }
@keyframes musicBar {
  0%, 100% { transform: scaleY(0.5); opacity: 0.6; }
  50% { transform: scaleY(1); opacity: 1; }
}

/* 游戏完成 Overlay */
.finish-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, color-mix(in srgb, var(--ac) 18%, transparent) 0%, rgba(4,4,16,0.7) 70%);
  z-index: 50;
  pointer-events: none;
}
.finish-icon {
  font-size: 72px;
  color: var(--ac);
  text-shadow: 0 0 40px var(--ac), 0 0 80px color-mix(in srgb, var(--ac) 50%, transparent);
  animation: finishPop 0.5s cubic-bezier(0.34,1.56,0.64,1);
}
.finish-text {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 8px;
  margin-top: 16px;
  text-shadow: 0 0 20px rgba(255,255,255,0.5);
  animation: finishPop 0.5s 0.1s cubic-bezier(0.34,1.56,0.64,1) both;
}
@keyframes finishPop {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.finish-overlay-enter-active { transition: opacity 0.3s; }
.finish-overlay-leave-active { transition: opacity 0.4s; }
.finish-overlay-enter-from, .finish-overlay-leave-to { opacity: 0; }

/* ═══ 结算界面 ═══ */
.result-screen {
  position: relative;
  z-index: 10;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.result-card {
  background: rgba(10,10,20,0.85);
  border: 1px solid rgba(255,255,255,0.12);
  border-top: 3px solid var(--accent);
  border-radius: 16px;
  padding: 40px 48px;
  max-width: 600px;
  width: 100%;
  text-align: center;
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px color-mix(in srgb, var(--accent) 15%, transparent);
  overflow-y: auto;
  max-height: 90vh;
}
.result-card::-webkit-scrollbar { width: 3px; }
.result-card::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }

.result-icon { font-size: 56px; margin-bottom: 16px; animation: iconPop 0.6s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes iconPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.result-title { font-size: 24px; font-weight: 700; color: #fff; margin: 0 0 6px; letter-spacing: 3px; }
.result-author { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 28px; }

/* 数据卡片 */
.result-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}
.rs-item {
  background: rgba(255,255,255,0.04);
  border-radius: 10px;
  padding: 14px 8px;
  position: relative;
  overflow: hidden;
}
.rs-item::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
}
.rs-item[data-color="cyan"]::before { background: #22d3ee; }
.rs-item[data-color="green"]::before { background: #4ade80; }
.rs-item[data-color="yellow"]::before { background: #fbbf24; }
.rs-item[data-color="purple"]::before { background: #a78bfa; }

.rs-label { font-size: 11px; color: rgba(255,255,255,0.35); letter-spacing: 1px; margin-bottom: 6px; }
.rs-val { font-size: 22px; font-weight: 700; color: #fff; }
.rs-unit { font-size: 11px; font-weight: 400; color: rgba(255,255,255,0.4); margin-left: 2px; }

/* 评级 */
.rating-wrap { margin-bottom: 20px; }
.rating-ring {
  width: 80px; height: 80px;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}
.grade-S { border-color: #fbbf24; box-shadow: 0 0 20px #fbbf24, 0 0 40px rgba(251,191,36,0.3); animation: pulse 1.5s ease infinite; }
.grade-A { border-color: #4ade80; box-shadow: 0 0 12px rgba(74,222,128,0.5); }
.grade-B { border-color: #60a5fa; box-shadow: 0 0 12px rgba(96,165,250,0.4); }
.grade-C { border-color: #fb923c; }
.grade-D { border-color: rgba(255,255,255,0.2); }
.grade-text { font-size: 32px; font-weight: 900; color: #fff; letter-spacing: 0; }
.grade-desc { font-size: 13px; color: rgba(255,255,255,0.5); letter-spacing: 1px; margin: 0; }

/* 成就 */
.achievements { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 20px; }
.ach-badge {
  font-size: 12px;
  background: rgba(251,191,36,0.1);
  border: 1px solid rgba(251,191,36,0.3);
  color: #fbbf24;
  border-radius: 20px;
  padding: 4px 12px;
}

/* 全文展示 */
.full-poem {
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 24px;
  background: rgba(255,255,255,0.02);
}
.full-line {
  font-size: 18px;
  color: var(--accent);
  letter-spacing: 6px;
  line-height: 2;
  text-shadow: 0 0 10px color-mix(in srgb, var(--accent) 40%, transparent);
}

/* 结算按钮 */
.result-btns { display: flex; gap: 12px; justify-content: center; }
.r-btn {
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  letter-spacing: 1px;
  transition: all 0.2s;
  border: 1px solid;
}
.r-btn.primary { background: var(--accent); border-color: var(--accent); color: #000; font-weight: 700; }
.r-btn.primary:hover { filter: brightness(1.2); transform: translateY(-2px); }
.r-btn.secondary { background: transparent; border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.7); }
.r-btn.secondary:hover { border-color: rgba(255,255,255,0.6); color: #fff; }
.r-btn.back { background: transparent; border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.35); }
.r-btn.back:hover { color: rgba(255,255,255,0.6); }
</style>
