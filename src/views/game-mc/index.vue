<template>
  <div ref="gameRoot" class="mc-game" :class="`scene-${currentScene}`">
    <div class="game-background"></div>
    <div class="pixel-clouds">
      <div v-for="c in clouds" :key="c.id" class="pixel-cloud" :style="{ left: c.x + 'px', top: c.y + 'px', opacity: c.opacity }">☁️</div>
    </div>
    <div class="ground-row">
      <span v-for="i in groundTiles" :key="i" class="ground-tile">{{ groundEmoji }}</span>
    </div>

    <!-- ══ 开始界面 ══ -->
    <transition name="page-fade">
      <div v-if="phase === 'start'" class="start-screen">
        <button class="back-button" @click="goBack"><span class="back-icon">←</span><span class="back-text">返回</span></button>
        <div class="overlay-content start-content">
          <div class="logo-section">
            <div class="logo-icon">⛏️</div>
            <h1 class="game-title">我的世界打字冒险</h1>
            <p class="game-subtitle">6-10岁儿童专属像素冒险</p>
          </div>
          <div class="steve-wrap">
            <div class="steve" :class="{ bounce: steveBounce }">{{ currentPet }}</div>
            <div class="steve-bubble" v-if="steveSpeech">{{ steveSpeech }}</div>
          </div>
          <div class="level-select">
            <h3 class="controls-title">🗺️ 选择关卡</h3>
            <div class="level-grid">
              <button v-for="lv in levelConfigs" :key="lv.id" class="level-card"
                :class="{ locked: !progress.unlockedLevels.includes(lv.id), active: selectedLevel === lv.id, done: (progress.bestRecords[lv.id]?.stars ?? 0) >= 3 }"
                @click="selectLevel(lv.id)">
                <div class="lv-scene">{{ sceneConfigs[lv.scene].emoji }}</div>
                <div class="lv-name">{{ lv.name }}</div>
                <div class="lv-age">{{ lv.ageRange }}</div>
                <div class="lv-stars">
                  <span v-for="s in 3" :key="s" :class="s <= (progress.bestRecords[lv.id]?.stars ?? 0) ? 'star-on' : 'star-off'">★</span>
                </div>
                <div v-if="!progress.unlockedLevels.includes(lv.id)" class="lock-icon">🔒</div>
              </button>
            </div>
          </div>
          <div class="pet-row" v-if="progress.pets.length > 0">
            <span class="pet-label">我的宠物：</span>
            <span v-for="pid in progress.pets" :key="pid" class="pet-badge" @click="currentPet = pets.find(p => p.id === pid)?.emoji ?? '🧑'">
              {{ pets.find(p => p.id === pid)?.emoji }}
            </span>
          </div>
          <div class="total-coins">🪙 总金币：{{ progress.totalCoins }}</div>
          <div class="start-btns">
            <button class="start-button" :disabled="!selectedLevel" @click="startGame">
              <span class="button-icon">▶</span><span class="button-text">开始冒险</span>
            </button>
          </div>
          <div class="sub-btns">
            <button class="home-button gray-btn" @click="showHelp = true">❓ 怎么玩</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ 游戏界面 ══ -->
    <transition name="page-fade">
      <div v-if="phase === 'playing'" class="game-screen">
        <button class="back-button" @click="quitToMenu"><span class="back-icon">←</span><span class="back-text">菜单</span></button>
        <div class="top-bar">
          <div class="info-item"><span class="label">分数</span><span class="value score-v">{{ score }}</span></div>
          <div class="info-item"><span class="label">金币</span><span class="value coins-v">{{ coins }}</span></div>
          <div class="info-item center-info">
            <span class="label level-lbl">{{ currentLevelConfig?.name }}</span>
            <span class="value prog-v">{{ doneCount }} / {{ currentLevelConfig?.targetCount }}</span>
          </div>
          <div class="info-item"><span class="label">用时</span><span class="value time-v">{{ elapsed }}s</span></div>
          <div class="info-item" :class="{ 'combo-active': combo > 0 }">
            <span class="label">连击</span><span class="value combo-v">{{ combo > 0 ? '🔥' + combo : combo }}</span>
          </div>
          <button class="pause-btn-top" @click="togglePause">{{ paused ? '▶' : '⏸' }}</button>
        </div>
        <div class="prog-bar-wrap">
          <div class="prog-bar-fill" :style="{ width: (doneCount / (currentLevelConfig?.targetCount ?? 1) * 100) + '%' }"></div>
        </div>
        <transition name="combo-pop">
          <div v-if="comboLabel" class="combo-label" :style="{ color: comboLabelColor }">{{ comboLabel }}</div>
        </transition>
        <div class="block-field" ref="blockField">
          <transition-group name="block-anim">
            <div v-for="blk in activeBlocks" :key="blk.id" class="word-block"
              :class="{ active: blk.id === focusedBlockId, warning: blk.warningLevel === 1, danger: blk.warningLevel === 2, done: blk.done, error: blk.error }"
              :style="{ left: blk.x + 'px', top: blk.y + 'px' }" @click="focusBlock(blk.id)">
              <div class="block-texture"></div>
              <div class="block-word">
                <span v-for="(ch, ci) in blk.word" :key="ci" class="block-char"
                  :class="{ typed: ci < blk.typedCount, next: ci === blk.typedCount, wrong: blk.error && ci === blk.typedCount }"
                  :style="ci === blk.typedCount ? { color: nextCharColor(blk) } : {}">{{ ch }}</span>
              </div>
              <div class="block-zh">{{ blk.zh }}</div>
              <div v-if="blk.done" class="block-score-stars"><span v-for="s in blk.stars" :key="s">⭐</span></div>
              <div class="block-prog-bar">
                <div class="block-prog-fill" :style="{ width: (1 - blk.y / (fieldHeight - 60)) * 100 + '%' }"
                  :class="{ warning: blk.warningLevel >= 1, danger: blk.warningLevel >= 2 }"></div>
              </div>
            </div>
          </transition-group>
          <div v-for="fx in groundFx" :key="fx.id" class="ground-fx" :style="{ left: fx.x + 'px' }">💥</div>
        </div>
        <!-- 消除特效 -->
        <div class="efx-layer">
          <div v-for="ef in eliminationEffects" :key="ef.id" class="elim-effect" :class="ef.type"
            :style="{ left: ef.x + 'px', top: ef.y + 'px' }">
            <div v-if="ef.type === 'normal'" class="normal-burst">
              <div class="sb"><div v-for="i in 12" :key="i" class="s-star"></div></div>
              <div class="shockwave"></div>
            </div>
            <div v-if="ef.type === 'golden'" class="golden-burst">
              <div class="gs"><div v-for="i in 10" :key="i" class="g-coin"></div></div>
            </div>
            <div class="ef-text">{{ ef.text }}</div>
          </div>
        </div>
        <div class="bottom-panel">
          <div class="finger-hint" v-if="nextFingerInfo">
            <span class="finger-dot" :style="{ background: nextFingerInfo.color }"></span>
            <span class="finger-text">{{ nextFingerInfo.name }}</span>
            <span class="finger-key">{{ nextChar?.toUpperCase() }}</span>
          </div>
          <div class="vkb" v-if="showVkb">
            <div class="vkb-row" v-for="(row, ri) in keyboardRows" :key="ri">
              <div v-for="k in row" :key="k" class="vkb-key"
                :class="{ highlight: k === nextChar, pressed: pressedKey === k }"
                :style="{ '--fc': fingerColorHex[fingerMap[k] ?? 'space'] }">{{ k.toUpperCase() }}</div>
            </div>
          </div>
          <input ref="hiddenInput" class="hidden-input" v-model="inputBuf"
            @keydown="onKeyDown" @input="onInput"
            @compositionstart="composing = true" @compositionend="composing = false; onInput()"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
          <div class="input-hint" @click="focusInput">
            <span v-if="focusedBlockId !== null">
              <span class="typed-chars">{{ typedSoFar }}</span><span class="caret blink">|</span><span class="remaining">{{ remainingChars }}</span>
            </span>
            <span v-else class="input-idle">点击方块或直接打字开始 👆</span>
          </div>
          <button class="vkb-toggle" @click="showVkb = !showVkb">{{ showVkb ? '🙈 隐藏键盘' : '⌨️ 显示键盘' }}</button>
        </div>
        <transition name="overlay-fade">
          <div v-if="paused" class="pause-overlay">
            <div class="overlay-content pause-content">
              <div class="logo-section"><div class="logo-icon">⏸</div><h1 class="game-title" style="font-size:32px">暂停</h1></div>
              <button class="start-button" @click="togglePause"><span class="button-icon">▶</span><span class="button-text">继续游戏</span></button>
              <button class="home-button" @click="quitToMenu"><span class="button-icon">🏠</span><span class="button-text">退出关卡</span></button>
            </div>
          </div>
        </transition>
      </div>
    </transition>

    <!-- ══ 结算界面 ══ -->
    <transition name="page-fade">
      <div v-if="phase === 'result'" class="full-overlay">
        <div class="overlay-content result-content">
          <div class="logo-section">
            <div class="logo-icon">{{ resultStars === 3 ? '🏆' : resultStars === 2 ? '🌟' : '✔️' }}</div>
            <h1 class="game-title game-over">{{ resultTitle }}</h1>
          </div>
          <div class="result-stars-row">
            <span v-for="s in 3" :key="s" class="result-star-big"
              :class="{ on: s <= resultStars, bounce: s <= resultStars }" :style="{ animationDelay: s * 0.15 + 's' }">★</span>
          </div>
          <div class="game-stats">
            <div class="stat-card main-stat">
              <div class="stat-icon">🪙</div>
              <div class="stat-info"><span class="stat-label">金币收获</span><span class="stat-value gold-text">+{{ coins }}</span></div>
            </div>
            <div class="stats-grid">
              <div class="stat-card"><div class="stat-icon">⏱️</div><div class="stat-info"><span class="stat-label">完成用时</span><span class="stat-value">{{ elapsed }}秒</span></div></div>
              <div class="stat-card"><div class="stat-icon">🎯</div><div class="stat-info"><span class="stat-label">准确率</span><span class="stat-value">{{ accuracy }}%</span></div></div>
              <div class="stat-card"><div class="stat-icon">🔥</div><div class="stat-info"><span class="stat-label">最高连击</span><span class="stat-value">{{ maxCombo }}</span></div></div>
            </div>
          </div>
          <div v-if="newAchievements.length > 0" class="new-achievements">
            <div class="ach-title">🎉 新成就解锁！</div>
            <div v-for="a in newAchievements" :key="a.id" class="ach-item">{{ a.emoji }} {{ a.name }}</div>
          </div>
          <div v-if="newPets.length > 0" class="new-pets-wrap">
            <div class="pet-title">🎁 新宠物！</div>
            <div class="new-pets">
              <div v-for="p in newPets" :key="p.id" class="pet-card">
                <span class="pet-emoji-big">{{ p.emoji }}</span><span class="pet-name">{{ p.name }}</span>
              </div>
            </div>
          </div>
          <button class="start-button" @click="restartLevel"><span class="button-icon">🔄</span><span class="button-text">再玩一次</span></button>
          <div class="sub-btns">
            <button class="home-button blue-btn" v-if="nextLevelId" @click="goNextLevel"><span class="button-icon">➡️</span><span class="button-text">下一关</span></button>
            <button class="home-button" @click="goMenu"><span class="button-icon">🏠</span><span class="button-text">回菜单</span></button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ 帮助弹窗 ══ -->
    <transition name="overlay-fade">
      <div v-if="showHelp" class="full-overlay" @click.self="showHelp = false">
        <div class="overlay-content help-content">
          <div class="logo-section"><div class="logo-icon">❓</div><h1 class="game-title" style="font-size:28px">怎么玩</h1></div>
          <div class="game-controls">
            <h3 class="controls-title">🎮 游戏说明</h3>
            <div class="controls-grid">
              <div class="control-item c-key"><span class="control-icon">⌨️</span><span>看方块上的字母，敲对应键</span></div>
              <div class="control-item c-coin"><span class="control-icon">🪙</span><span>打对了方块消失，收集金币</span></div>
              <div class="control-item c-safe"><span class="control-icon">⚠️</span><span>打错了温柔提示，可以重试</span></div>
              <div class="control-item c-combo"><span class="control-icon">🔥</span><span>连续打对获得连击奖励</span></div>
              <div class="control-item c-finger"><span class="control-icon">🖐️</span><span>下方键盘亮起要按的键</span></div>
              <div class="control-item c-win"><span class="control-icon">🏆</span><span>完成目标数量就过关！</span></div>
            </div>
          </div>
          <div class="help-fingers">
            <h3 class="controls-title">🖐️ 手指颜色对照</h3>
            <div class="hf-grid">
              <div v-for="(hex, fc) in fingerColorHex" :key="fc" class="hf-item">
                <span class="hf-dot" :style="{ background: hex }"></span><span class="hf-name">{{ fingerName[fc as string] }}</span>
              </div>
            </div>
          </div>
          <button class="start-button" @click="showHelp = false"><span class="button-icon">✔</span><span class="button-text">明白了！</span></button>
        </div>
      </div>
    </transition>

    <div class="fx-layer">
      <div v-for="p in particles" :key="p.id" class="fx-particle"
        :style="{ left: p.x + 'px', top: p.y + 'px', color: p.color, fontSize: p.size + 'px', opacity: p.alpha }">{{ p.char }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  levelConfigs, sceneConfigs, fingerMap, fingerColorHex, fingerName, keyboardRows,
  achievements, pets, pickWords, loadProgress, saveProgress, comboRewards, getScore,
  type LevelConfig, type SceneId, type Achievement, type Pet, type GameProgress,
} from './config'

const router = useRouter()
function goBack() { router.push('/game') }

const progress = ref<GameProgress>(loadProgress())
function persistProgress() { saveProgress(progress.value) }

type Phase = 'start' | 'playing' | 'result'
const phase = ref<Phase>('start')
const showHelp = ref(false)
const selectedLevel = ref<number>(1)
const showVkb = ref(true)

const currentScene = computed<SceneId>(() => levelConfigs.find(l => l.id === selectedLevel.value)?.scene ?? 'plains')
const groundEmoji = computed(() => {
  const map: Record<SceneId, string> = { plains: '🟩', cave: '🟫', cabin: '🟧', village: '🟩', adventure: '🟪' }
  return map[currentScene.value]
})
const groundTiles = computed(() => Math.ceil(window.innerWidth / 40) + 2)

const clouds = ref<{ id: number; x: number; y: number; opacity: number }[]>([])
function initClouds() {
  clouds.value = Array.from({ length: 5 }, (_, i) => ({ id: i, x: i * (window.innerWidth / 5) + Math.random() * 100, y: 20 + Math.random() * 60, opacity: 0.5 + Math.random() * 0.4 }))
}
let cloudTimer = 0
function animateClouds() {
  clouds.value = clouds.value.map(c => ({ ...c, x: c.x >= window.innerWidth + 60 ? -80 : c.x + 0.15 }))
  cloudTimer = requestAnimationFrame(animateClouds)
}

const currentPet = ref('🧑')
const steveBounce = ref(false)
const steveSpeech = ref<string | null>('点击关卡开始冒险！')
const steveSpeeches = ['加油！你能行！', '太棒啦！', '快打吧！', '你是最棒的！', '冲冲冲！']
function randomSteveSpeech() {
  steveSpeech.value = steveSpeeches[Math.floor(Math.random() * steveSpeeches.length)]
  steveBounce.value = true; setTimeout(() => { steveBounce.value = false }, 600)
}

function selectLevel(id: number) {
  if (!progress.value.unlockedLevels.includes(id)) { randomSteveSpeech(); steveSpeech.value = '🔒 先通过前面的关卡吧！'; return }
  selectedLevel.value = id
  steveSpeech.value = levelConfigs.find(l => l.id === id)?.description ?? ''
  steveBounce.value = true; setTimeout(() => { steveBounce.value = false }, 600)
}

const currentLevelConfig = ref<LevelConfig | null>(null)
const fieldHeight = ref(window.innerHeight - 220)
const fieldWidth = ref(window.innerWidth)
const blockField = ref<HTMLElement | null>(null)
const hiddenInput = ref<HTMLInputElement | null>(null)
const gameRoot = ref<HTMLElement | null>(null)

interface WordBlock {
  id: number; word: string; zh: string; emoji: string
  x: number; y: number; typedCount: number; done: boolean; error: boolean
  warningLevel: 0 | 1 | 2; stars: number; fallStartTime: number; landTime: number
}
const activeBlocks = ref<WordBlock[]>([])
const focusedBlockId = ref<number | null>(null)
let blockIdCounter = 0

const score = ref(0); const coins = ref(0); const combo = ref(0); const maxCombo = ref(0)
const totalKeys = ref(0); const correctKeys = ref(0); const doneCount = ref(0)
const elapsed = ref(0); const paused = ref(false)
const accuracy = computed(() => totalKeys.value === 0 ? 100 : Math.round(correctKeys.value / totalKeys.value * 100))

const comboLabel = ref(''); const comboLabelColor = ref('#ffd32a')
let comboLabelTimer: ReturnType<typeof setTimeout> | null = null

const eliminationEffects = ref<Array<{ id: string; x: number; y: number; type: string; text: string }>>([])
function createEliminationEffect(x: number, y: number, points: number, isGolden: boolean) {
  const id = `eff_${Date.now()}_${Math.random()}`
  eliminationEffects.value.push({ id, x, y, type: isGolden ? 'golden' : 'normal', text: `+${Math.floor(points)}` })
  setTimeout(() => { eliminationEffects.value = eliminationEffects.value.filter(e => e.id !== id) }, 1000)
}

const nextChar = computed<string | null>(() => {
  if (focusedBlockId.value === null) return null
  return activeBlocks.value.find(b => b.id === focusedBlockId.value)?.word[activeBlocks.value.find(b => b.id === focusedBlockId.value)!.typedCount] ?? null
})
const nextFingerInfo = computed(() => {
  if (!nextChar.value) return null
  const fc = fingerMap[nextChar.value.toLowerCase()]; if (!fc) return null
  return { color: fingerColorHex[fc], name: fingerName[fc] }
})
const typedSoFar = computed(() => {
  if (focusedBlockId.value === null) return ''
  const blk = activeBlocks.value.find(b => b.id === focusedBlockId.value)
  return blk ? blk.word.slice(0, blk.typedCount) : ''
})
const remainingChars = computed(() => {
  if (focusedBlockId.value === null) return ''
  const blk = activeBlocks.value.find(b => b.id === focusedBlockId.value)
  return blk ? blk.word.slice(blk.typedCount) : ''
})
function nextCharColor(blk: WordBlock): string {
  const fc = fingerMap[blk.word[blk.typedCount]?.toLowerCase() ?? '']; return fc ? fingerColorHex[fc] : '#fff'
}

const inputBuf = ref(''); const composing = ref(false); const pressedKey = ref<string | null>(null)
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') { if (phase.value === 'playing') togglePause(); return }
  if (e.key === 'Tab') { e.preventDefault(); cycleFocusBlock(); return }
  if (composing.value || paused.value) return
  const key = e.key; pressedKey.value = key.toLowerCase(); setTimeout(() => { pressedKey.value = null }, 120)
  if (key.length === 1) { e.preventDefault(); handleChar(key.toLowerCase()) }
  if (key === ' ') { e.preventDefault(); handleChar(' ') }
}
function onInput() { if (composing.value) return; inputBuf.value = '' }

function handleChar(ch: string) {
  totalKeys.value++
  if (focusedBlockId.value === null) {
    const match = activeBlocks.value.find(b => !b.done && b.word[b.typedCount] === ch)
    focusedBlockId.value = match?.id ?? activeBlocks.value.find(b => !b.done)?.id ?? null
  }
  const blk = focusedBlockId.value !== null ? activeBlocks.value.find(b => b.id === focusedBlockId.value && !b.done) : null
  if (!blk) return
  if (blk.word[blk.typedCount] === ch) {
    correctKeys.value++; blk.typedCount++; blk.error = false
    if (blk.typedCount >= blk.word.length) finishBlock(blk)
  } else {
    blk.error = true; combo.value = 0; spawnErrorFx(blk.x + 50, blk.y)
    setTimeout(() => { blk.error = false }, 500)
  }
}

function finishBlock(blk: WordBlock) {
  blk.done = true; doneCount.value++; combo.value++
  if (combo.value > maxCombo.value) maxCombo.value = combo.value
  const p01 = blk.y / (fieldHeight.value - 80)
  const scoreInfo = getScore(p01 >= 0.85 ? 2 : p01 >= 0.6 ? 1 : 0)
  blk.stars = scoreInfo.stars
  coins.value += scoreInfo.stars + Math.floor(combo.value / 5)
  score.value += scoreInfo.stars * 10
  showComboLabel(combo.value)
  spawnSuccessFx(blk.x + 50, blk.y + 30, blk.emoji)
  createEliminationEffect(blk.x + 50, blk.y + 30, scoreInfo.stars * 10, false)
  setTimeout(() => {
    activeBlocks.value = activeBlocks.value.filter(b => b.id !== blk.id)
    if (focusedBlockId.value === blk.id) focusedBlockId.value = activeBlocks.value.find(b => !b.done)?.id ?? null
  }, 400)
  checkLevelComplete()
}

function showComboLabel(c: number) {
  const reward = [...comboRewards].reverse().find(r => c >= r.combo); if (!reward) return
  comboLabel.value = `${reward.emoji} ${reward.label} ×${c}`; comboLabelColor.value = reward.color
  if (comboLabelTimer) clearTimeout(comboLabelTimer)
  comboLabelTimer = setTimeout(() => { comboLabel.value = '' }, 1500)
}
function cycleFocusBlock() {
  const undone = activeBlocks.value.filter(b => !b.done); if (!undone.length) return
  const idx = undone.findIndex(b => b.id === focusedBlockId.value)
  focusedBlockId.value = undone[(idx + 1) % undone.length].id
}
function focusBlock(id: number) { focusedBlockId.value = id; focusInput() }
function focusInput() { nextTick(() => hiddenInput.value?.focus()) }

let spawnTimer: ReturnType<typeof setInterval> | null = null
let fallTimer: ReturnType<typeof setInterval> | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null
let startTime = 0
const groundFx = ref<{ id: number; x: number }[]>([])

function spawnBlock() {
  if (!currentLevelConfig.value) return
  if (activeBlocks.value.filter(b => !b.done).length >= currentLevelConfig.value.maxBlocks) return
  if (doneCount.value >= currentLevelConfig.value.targetCount) return
  const cfg = currentLevelConfig.value
  const w = pickWords(cfg.wordPool, 1)[0]
  const fallDuration = (fieldHeight.value / cfg.fallSpeed) * 1000
  activeBlocks.value.push({
    id: ++blockIdCounter, word: w.word, zh: w.zh, emoji: w.emoji,
    x: 40 + Math.random() * (fieldWidth.value - 160), y: 0,
    typedCount: 0, done: false, error: false, warningLevel: 0, stars: 0,
    fallStartTime: Date.now(), landTime: Date.now() + fallDuration,
  })
}

function updateFall() {
  if (paused.value) return
  const now = Date.now(); const h = fieldHeight.value - 80
  activeBlocks.value = activeBlocks.value.map(blk => {
    if (blk.done) return blk
    const newY = (now - blk.fallStartTime) / (blk.landTime - blk.fallStartTime) * h
    const ratio = newY / h
    const warningLevel: 0 | 1 | 2 = ratio >= 0.85 ? 2 : ratio >= 0.6 ? 1 : 0
    if (newY >= h) return { ...blk, y: h, warningLevel: 2 as const }
    return { ...blk, y: newY, warningLevel }
  })
}

function startTimer() {
  startTime = Date.now()
  timerInterval = setInterval(() => { if (!paused.value) elapsed.value = Math.floor((Date.now() - startTime) / 1000) }, 200)
}
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null } }

interface FxParticle { id: number; x: number; y: number; vx: number; vy: number; char: string; color: string; size: number; alpha: number; life: number; maxLife: number }
const particles = ref<FxParticle[]>([]); let pfxId = 0; let pfxTimer = 0

function spawnSuccessFx(x: number, y: number, emoji: string) {
  for (let i = 0; i < 8; i++) {
    particles.value.push({ id: ++pfxId, x, y, vx: (Math.random()-0.5)*4, vy: -(Math.random()*3+1), char: ['⭐','✨','💫',emoji,'🌟'][Math.floor(Math.random()*5)], color: Object.values(fingerColorHex)[Math.floor(Math.random()*8)], size: 16+Math.random()*12, alpha: 1, life: 0, maxLife: 60 })
  }
}
function spawnErrorFx(x: number, y: number) {
  particles.value.push({ id: ++pfxId, x, y, vx: (Math.random()-0.5)*2, vy: -1, char: '❌', color: '#ff6b6b', size: 20, alpha: 1, life: 0, maxLife: 30 })
}
function updateParticles() {
  particles.value = particles.value.map(p => ({ ...p, x: p.x+p.vx, y: p.y+p.vy, vy: p.vy+0.1, alpha: 1-p.life/p.maxLife, life: p.life+1 })).filter(p => p.life < p.maxLife)
}
function startPfxLoop() { const loop = () => { updateParticles(); pfxTimer = requestAnimationFrame(loop) }; pfxTimer = requestAnimationFrame(loop) }

function startGame() {
  if (!selectedLevel.value) return
  const cfg = levelConfigs.find(l => l.id === selectedLevel.value); if (!cfg) return
  currentLevelConfig.value = cfg
  activeBlocks.value = []; focusedBlockId.value = null; score.value = 0; coins.value = 0
  combo.value = 0; maxCombo.value = 0; totalKeys.value = 0; correctKeys.value = 0
  doneCount.value = 0; elapsed.value = 0; comboLabel.value = ''; paused.value = false
  groundFx.value = []; particles.value = []; eliminationEffects.value = []
  phase.value = 'playing'
  nextTick(() => {
    fieldHeight.value = blockField.value?.clientHeight ?? window.innerHeight - 220
    fieldWidth.value = window.innerWidth; focusInput(); spawnBlock()
    spawnTimer = setInterval(spawnBlock, cfg.spawnInterval)
    fallTimer = setInterval(updateFall, 30); startTimer(); startPfxLoop()
  })
}

function togglePause() {
  paused.value = !paused.value
  if (!paused.value) {
    const offset = Date.now()
    activeBlocks.value = activeBlocks.value.map(blk => {
      if (blk.done) return blk
      const rem = blk.landTime - blk.fallStartTime
      return { ...blk, fallStartTime: offset, landTime: offset + rem * (1 - blk.y / (fieldHeight.value - 80)) }
    }); focusInput()
  }
}
function quitToMenu() { stopAll(); phase.value = 'start' }

const resultTitle = ref(''); const resultStars = ref(0)
const newAchievements = ref<Achievement[]>([]); const newPets = ref<Pet[]>([])
const nextLevelId = ref<number | null>(null)

function checkLevelComplete() {
  if (!currentLevelConfig.value || doneCount.value < currentLevelConfig.value.targetCount) return
  stopAll()
  const stars = accuracy.value >= 95 ? 3 : accuracy.value >= 80 ? 2 : 1
  resultStars.value = stars; resultTitle.value = stars === 3 ? '完美通关！' : stars === 2 ? '通关成功！' : '完成关卡！'
  const lvId = currentLevelConfig.value.id; const prev = progress.value.bestRecords[lvId]
  if (!prev || stars > prev.stars) progress.value.bestRecords[lvId] = { stars, coins: coins.value, time: elapsed.value }
  progress.value.totalCoins += coins.value
  const nextId = lvId + 1
  if (nextId <= levelConfigs.length && !progress.value.unlockedLevels.includes(nextId)) progress.value.unlockedLevels.push(nextId)
  nextLevelId.value = nextId <= levelConfigs.length ? nextId : null
  newAchievements.value = checkAchievements(lvId, stars); newPets.value = checkPets(lvId)
  persistProgress(); setTimeout(() => { phase.value = 'result' }, 800)
}

function checkAchievements(lvId: number, stars: number): Achievement[] {
  const earned: Achievement[] = []; const already = progress.value.achievements
  const chk = (id: string) => { if (!already.includes(id)) { const a = achievements.find(x => x.id === id); if (a) { earned.push(a); already.push(id) } } }
  chk(`level${lvId}_done`)
  if (doneCount.value >= 1) chk('first_word'); if (maxCombo.value >= 5) chk('combo_5')
  if (maxCombo.value >= 10) chk('combo_10'); if (stars === 3) chk('all_gold')
  if (totalKeys.value > 0 && correctKeys.value === totalKeys.value) chk('no_error')
  return earned
}
function checkPets(lvId: number): Pet[] {
  const earned: Pet[] = []; const already = progress.value.pets; const ach = progress.value.achievements
  pets.forEach(p => { if (!already.includes(p.id) && ach.includes(p.unlockAt)) { earned.push(p); already.push(p.id) } })
  return earned
}

function restartLevel() { phase.value = 'start'; nextTick(startGame) }
function goNextLevel() { if (!nextLevelId.value) return; selectedLevel.value = nextLevelId.value; phase.value = 'start'; nextTick(startGame) }
function goMenu() { phase.value = 'start' }
function stopAll() {
  if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null }
  if (fallTimer)  { clearInterval(fallTimer);  fallTimer  = null }
  stopTimer()
  if (pfxTimer) { cancelAnimationFrame(pfxTimer); pfxTimer = 0 }
  if (comboLabelTimer) clearTimeout(comboLabelTimer)
}

function onGlobalKeyDown(e: KeyboardEvent) {
  if (phase.value !== 'playing' || paused.value) return
  if (hiddenInput.value && document.activeElement !== hiddenInput.value) hiddenInput.value.focus()
}
function onResize() {
  fieldWidth.value = window.innerWidth
  fieldHeight.value = blockField.value?.clientHeight ?? window.innerHeight - 220
}

onMounted(() => { initClouds(); cloudTimer = requestAnimationFrame(animateClouds); window.addEventListener('keydown', onGlobalKeyDown); window.addEventListener('resize', onResize) })
onUnmounted(() => { stopAll(); cancelAnimationFrame(cloudTimer); window.removeEventListener('keydown', onGlobalKeyDown); window.removeEventListener('resize', onResize) })
</script>

<style scoped lang="scss">
.mc-game { position: fixed; inset: 0; overflow: hidden; font-family: 'Segoe UI','PingFang SC',sans-serif; user-select: none; transition: background 0.8s; }
.scene-plains    { background: linear-gradient(180deg, #87ceeb 0%, #c8e6c9 100%); }
.scene-cave      { background: linear-gradient(180deg, #1a1a2e 0%, #2d3561 100%); }
.scene-cabin     { background: linear-gradient(180deg, #f39c12 0%, #e67e22 100%); }
.scene-village   { background: linear-gradient(180deg, #2980b9 0%, #27ae60 100%); }
.scene-adventure { background: linear-gradient(180deg, #6c3483 0%, #1a5276 100%); }

.game-background { position: absolute; inset: 0; pointer-events: none; &::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.7) 0%, transparent 3%), radial-gradient(circle at 60% 20%, rgba(255,255,255,0.6) 0%, transparent 2.5%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.5) 0%, transparent 2%); animation: twinkle 3s ease-in-out infinite; } }
.pixel-clouds { position: absolute; top: 0; left: 0; right: 0; height: 120px; pointer-events: none; }
.pixel-cloud  { position: absolute; font-size: 36px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
.ground-row   { position: absolute; bottom: 0; left: 0; right: 0; height: 44px; display: flex; align-items: flex-end; overflow: hidden; }
.ground-tile  { display: inline-block; width: 40px; text-align: center; font-size: 38px; line-height: 1; filter: drop-shadow(0 -2px 0 rgba(0,0,0,0.2)); }

.back-button {
  position: fixed; left: 20px; top: 20px; display: flex; align-items: center; z-index: 9999; pointer-events: auto; gap: 6px; padding: 10px 18px;
  background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%); border: none; border-radius: 22px; cursor: pointer; font-size: 14px; font-weight: 600; color: #374151;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: all 0.3s ease;
  &:hover { transform: scale(1.05); box-shadow: 0 8px 20px rgba(0,0,0,0.12); }
  &:active { transform: scale(0.95); }
  .back-icon { font-size: 18px; font-weight: bold; }
}

.full-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,251,235,0.2) 0%, rgba(254,243,199,0.2) 30%, rgba(252,231,243,0.2) 60%, rgba(219,234,254,0.2) 100%);
  display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(20px);
  animation: fadeIn 0.5s ease-out; overflow-y: auto; padding: 20px;
}

.overlay-content {
  text-align: center; color: #1e293b; width: 620px; max-width: 94vw;
  background: rgba(255,255,255,0.96); padding: 36px 40px; border-radius: 35px; box-sizing: border-box;
  box-shadow: 0 30px 60px rgba(0,0,0,0.15), 0 0 80px rgba(99,102,241,0.3), inset 0 2px 0 rgba(255,255,255,1), 0 0 0 8px rgba(255,255,255,0.8);
  animation: slideUp 0.6s cubic-bezier(0.34,1.56,0.64,1); display: flex; flex-direction: column; align-items: center; gap: 18px;
}

.start-screen {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(20px); background: linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.1) 100%);
  padding: 20px; overflow-y: auto;
}
.start-content { max-height: 92vh; overflow-y: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }

.logo-section { .logo-icon { font-size: 60px; margin-bottom: 6px; animation: logoBounce 1.5s ease-in-out infinite; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.1)); } }
.game-title {
  font-size: 34px; font-weight: 900; margin: 0 0 6px;
  background: linear-gradient(135deg, #f472b6 0%, #a855f7 25%, #6366f1 50%, #3b82f6 75%, #0ea5e9 100%);
  background-size: 200% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  animation: titleGradient 4s ease infinite; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
  &.game-over { background: linear-gradient(135deg, #f87171 0%, #fb923c 25%, #fbbf24 50%, #34d399 75%, #22d3d1 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; }
}
.game-subtitle { font-size: 13px; color: #64748b; margin: 0; }

.steve-wrap { position: relative; display: flex; flex-direction: column; align-items: center; }
.steve { font-size: 52px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); transition: transform 0.1s; }
.steve.bounce { animation: steveBounce 0.5s ease; }
@keyframes steveBounce { 0%,100% { transform: translateY(0); } 40% { transform: translateY(-16px); } 70% { transform: translateY(-6px); } }
.steve-bubble { background: rgba(255,255,255,0.95); color: #333; font-size: 13px; padding: 6px 16px; border-radius: 16px; margin-top: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 240px; text-align: center; border: 2px solid rgba(168,85,247,0.2); }

.level-select { width: 100%; }
.controls-title {
  font-size: 16px; font-weight: 800; margin: 0 0 14px;
  background: linear-gradient(135deg, #f472b6 0%, #a855f7 50%, #6366f1 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  animation: titleGradient 4s ease infinite; background-size: 200% 100%;
}
.level-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(108px,1fr)); gap: 12px; }
.level-card {
  position: relative; background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%);
  border: 3px solid rgba(168,85,247,0.2); border-radius: 18px; padding: 14px 8px; color: #1e293b; cursor: pointer; text-align: center;
  transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); box-shadow: 0 4px 12px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,0.8);
  &:hover:not(.locked) { transform: translateY(-4px) scale(1.04); border-color: #a855f7; box-shadow: 0 12px 25px rgba(168,85,247,0.25); }
  &.active { border-color: #a855f7; background: linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(99,102,241,0.1) 100%); box-shadow: 0 8px 20px rgba(168,85,247,0.3); }
  &.done   { border-color: #34d399; background: linear-gradient(135deg, rgba(52,211,153,0.1) 0%, rgba(16,185,129,0.1) 100%); }
  &.locked { opacity: 0.5; cursor: not-allowed; filter: grayscale(0.6); }
}
.lv-scene { font-size: 28px; }
.lv-name  { font-size: 11px; font-weight: 700; color: #7c3aed; margin-top: 4px; }
.lv-age   { font-size: 10px; color: #64748b; margin-top: 2px; }
.lv-stars { font-size: 13px; margin-top: 4px; }
.star-on  { color: #fbbf24; }
.star-off { color: #d1d5db; }
.lock-icon { position: absolute; top: 6px; right: 6px; font-size: 14px; }

.pet-row { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%); padding: 10px 20px; border-radius: 20px; border: 2px solid rgba(168,85,247,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.pet-label { color: #64748b; font-size: 13px; font-weight: 600; }
.pet-badge { font-size: 22px; cursor: pointer; transition: transform 0.15s; &:hover { transform: scale(1.3); } }
.total-coins { color: #92400e; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #fef9c3 0%, #fef08a 50%, #fde047 100%); padding: 8px 24px; border-radius: 20px; border: 2px solid rgba(251,191,36,0.4); box-shadow: 0 4px 12px rgba(251,191,36,0.2); }
.start-btns { width: 100%; display: flex; justify-content: center; }
.sub-btns   { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }

.start-button {
  display: flex; align-items: center; justify-content: center; gap: 12px; padding: 18px 60px; font-size: 20px; font-weight: 900; color: white;
  background: linear-gradient(135deg, #f472b6 0%, #a855f7 50%, #6366f1 100%); border: 4px solid rgba(255,255,255,0.8); border-radius: 60px; cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); box-shadow: 0 12px 30px rgba(168,85,247,0.4), inset 0 4px 0 rgba(255,255,255,0.3);
  width: 100%; max-width: 300px; position: relative; overflow: hidden;
  &::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); animation: buttonShine 2s ease-in-out infinite; }
  &:hover:not(:disabled) { transform: translateY(-4px) scale(1.04); box-shadow: 0 20px 45px rgba(168,85,247,0.5), inset 0 4px 0 rgba(255,255,255,0.3); }
  &:active:not(:disabled) { transform: translateY(-2px) scale(1.02); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  .button-icon { font-size: 22px; }
  .button-text { font-size: 18px; font-weight: 900; }
}
.home-button {
  display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 28px; font-size: 16px; font-weight: 800; color: white;
  background: linear-gradient(135deg, #374151 0%, #1f2937 50%, #111827 100%); border: 3px solid rgba(255,255,255,0.4); border-radius: 40px; cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); box-shadow: 0 8px 20px rgba(0,0,0,0.3), inset 0 3px 0 rgba(255,255,255,0.2); pointer-events: auto; position: relative; overflow: hidden;
  &::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); animation: buttonShine 2.5s ease-in-out infinite; }
  &:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 14px 32px rgba(0,0,0,0.35); }
  &:active { transform: translateY(-1px); }
  .button-icon { font-size: 18px; }
  .button-text { font-size: 15px; font-weight: 700; }
  &.gray-btn { background: linear-gradient(135deg, #636e72 0%, #4a4a4a 100%); }
  &.blue-btn { background: linear-gradient(135deg, #2980b9 0%, #1a5276 100%); border-color: rgba(255,255,255,0.5); box-shadow: 0 8px 20px rgba(41,128,185,0.4); }
}

.game-screen { position: absolute; inset: 0; display: flex; flex-direction: column; }
.top-bar {
  display: flex; align-items: center; justify-content: center; gap: 10px; padding: 8px 120px;
  backdrop-filter: blur(15px); background: rgba(255,255,255,0.12); border-bottom: 3px solid rgba(255,255,255,0.4);
  box-shadow: 0 8px 32px rgba(0,0,0,0.1); flex-shrink: 0; z-index: 10; position: relative;
  &::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 60%; height: 3px; background: linear-gradient(90deg, #fbbf24 0%, #f472b6 25%, #a855f7 50%, #3b82f6 75%, #34d399 100%); border-radius: 0 0 4px 4px; }
}
.info-item {
  text-align: center; position: relative; padding: 7px 14px;
  background: linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.72) 100%);
  border-radius: 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.08), inset 0 2px 0 rgba(255,255,255,1), 0 0 0 2px rgba(255,255,255,0.7);
  transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); min-width: 72px;
  &:hover { transform: translateY(-2px) scale(1.04); }
  .label { display: block; font-size: 10px; font-weight: 800; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
  .value { display: block; font-size: 20px; font-weight: 900; line-height: 1; color: #1e293b; }
  &::after { content: ''; position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); width: 14px; height: 3px; background: currentColor; border-radius: 2px; opacity: 0.5; }
  &.combo-active { background: linear-gradient(135deg, rgba(253,186,116,0.3) 0%, rgba(249,115,22,0.2) 100%); }
}
.value.score-v  { color: #f59e0b; }
.value.coins-v  { color: #fbbf24; }
.value.time-v   { color: #34d399; }
.value.combo-v  { color: #f472b6; }
.center-info { min-width: 110px; .label.level-lbl { font-size: 11px; font-weight: 800; color: #7c3aed; letter-spacing: 0; text-transform: none; } .value.prog-v { font-size: 15px; color: #475569; } }
.pause-btn-top {
  background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%); border: 2px solid rgba(255,255,255,0.8); color: #374151; font-size: 16px; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  &:hover { background: white; transform: scale(1.1); }
}

.prog-bar-wrap { height: 10px; background: rgba(255,255,255,0.5); margin: 4px 20px; border-radius: 8px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); border: 2px solid rgba(255,255,255,0.8); flex-shrink: 0; }
.prog-bar-fill { height: 100%; background: linear-gradient(90deg, #f472b6 0%, #a855f7 25%, #6366f1 50%, #3b82f6 75%, #0ea5e9 100%); background-size: 200% 100%; transition: width 0.4s cubic-bezier(0.34,1.56,0.64,1); animation: progressGradient 3s ease infinite; box-shadow: 0 0 16px rgba(244,114,182,0.6); border-radius: 6px; }

.combo-label { position: absolute; top: 80px; left: 50%; transform: translateX(-50%); font-size: 20px; font-weight: 900; pointer-events: none; z-index: 20; white-space: nowrap; background: rgba(255,255,255,0.92); padding: 6px 20px; border-radius: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
.combo-pop-enter-active { animation: comboPop 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.combo-pop-leave-active { transition: opacity 0.4s; }
.combo-pop-leave-to     { opacity: 0; }
@keyframes comboPop { from { transform: translateX(-50%) scale(0.5); opacity: 0; } to { transform: translateX(-50%) scale(1); opacity: 1; } }

.block-field { flex: 1; position: relative; overflow: hidden; }
.word-block {
  position: absolute; min-width: 80px; max-width: 160px; cursor: pointer;
  background: linear-gradient(135deg, rgba(101,67,33,0.9) 0%, rgba(80,50,20,0.85) 100%);
  border: 3px solid rgba(255,255,255,0.3); border-radius: 10px; padding: 8px 10px 4px;
  box-shadow: 3px 3px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.15);
  backdrop-filter: blur(4px); transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.1s; z-index: 5;
  &:hover  { transform: scale(1.05); }
  &.active { border-color: #ffd32a; box-shadow: 3px 3px 0 rgba(0,0,0,0.4), 0 0 16px #ffd32a88; z-index: 10; }
  &.warning{ background: linear-gradient(135deg, rgba(180,100,20,0.9) 0%, rgba(160,80,10,0.9) 100%); border-color: #ff9f43; }
  &.danger { background: linear-gradient(135deg, rgba(200,40,40,0.95) 0%, rgba(180,20,20,0.95) 100%); border-color: #ff6b6b; animation: shakeDanger 0.3s ease infinite; }
  &.done   { background: linear-gradient(135deg, rgba(39,174,96,0.9) 0%, rgba(22,160,133,0.85) 100%); border-color: #0be881; box-shadow: 3px 3px 0 rgba(0,0,0,0.3), 0 0 20px rgba(11,232,129,0.4); }
  &.error  { animation: errorShake 0.3s ease; border-color: #ff6b6b; }
}
.block-texture { position: absolute; inset: 0; background: repeating-linear-gradient(0deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 4px), repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 4px); border-radius: 8px; pointer-events: none; }
.block-word { display: flex; gap: 1px; justify-content: center; flex-wrap: wrap; }
.block-char { font-size: clamp(14px,3vw,20px); font-weight: 900; color: rgba(255,255,255,0.5); transition: color 0.1s; letter-spacing: 1px; font-family: 'Courier New', monospace; }
.block-char.typed { color: rgba(11,232,129,0.85); }
.block-char.next  { font-size: clamp(16px,3.5vw,22px); text-shadow: 0 0 10px currentColor; animation: nextPulse 1s ease infinite; }
.block-char.wrong { color: #ff6b6b !important; animation: none; }
@keyframes nextPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
.block-zh { text-align: center; font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 3px; }
.block-score-stars { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 14px; animation: starPop 0.5s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes starPop { from { transform: translateX(-50%) scale(0) translateY(10px); opacity: 0; } to { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; } }
.block-prog-bar { height: 3px; background: rgba(255,255,255,0.15); border-radius: 2px; margin-top: 4px; overflow: hidden; }
.block-prog-fill { height: 100%; background: #0be881; border-radius: 2px; transition: width 0.08s; &.warning { background: #ff9f43; } &.danger { background: #ff6b6b; } }
.block-anim-enter-active { animation: blockDrop 0.4s cubic-bezier(0.34,1.56,0.64,1); }
.block-anim-leave-active { animation: blockPop 0.4s ease forwards; }
@keyframes blockDrop { from { transform: scale(0.3) translateY(-40px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
@keyframes blockPop  { from { transform: scale(1); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
@keyframes shakeDanger { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
@keyframes errorShake  { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 60% { transform: translateX(5px); } }
.ground-fx { position: absolute; bottom: 10px; font-size: 24px; pointer-events: none; animation: fxPop 0.6s ease forwards; }
@keyframes fxPop { from { transform: scale(0.5) translateY(10px); opacity: 1; } to { transform: scale(2) translateY(-20px); opacity: 0; } }

.efx-layer  { position: absolute; inset: 0; pointer-events: none; z-index: 50; }
.elim-effect { position: absolute; transform: translate(-50%,-50%); pointer-events: none; }

.normal-burst { position: relative; width: 140px; height: 140px; }
.sb { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 100%; height: 100%;
  .s-star { position: absolute; top: 50%; left: 50%; width: 3px; height: 14px; background: linear-gradient(180deg, #a855f7, #6366f1); transform-origin: center; border-radius: 2px; box-shadow: 0 0 6px #a855f7; animation: starShoot 0.8s ease-out forwards; }
  @for $i from 1 through 12 { .s-star:nth-child(#{$i}) { --rotation: #{$i * 30deg}; animation-delay: #{$i * 0.03s}; } }
}
.shockwave { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 16px; height: 16px; border: 3px solid #a855f7; border-radius: 50%; animation: shockwaveExpand 1s ease-out forwards; }

.golden-burst { position: relative; width: 180px; height: 180px; }
.gs { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 100%; height: 100%;
  .g-coin { position: absolute; top: 50%; left: 50%; width: 10px; height: 10px; background: radial-gradient(circle, #fcd34d, #f59e0b); border-radius: 50%; box-shadow: 0 0 8px #fcd34d; animation: coinFall 1.2s ease-in forwards; }
  @for $i from 1 through 10 { .g-coin:nth-child(#{$i}) { animation-delay: #{$i * 0.08s}; } }
}

.ef-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 28px; font-weight: 900; white-space: nowrap; z-index: 100; animation: effectTextFloat 1s ease-out forwards; }
.elim-effect.normal .ef-text { background: linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0 0 10px rgba(168,85,247,0.8)); }
.elim-effect.golden .ef-text { background: linear-gradient(135deg, #fcd34d 0%, #fbbf24 50%, #f59e0b 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0 0 10px rgba(251,191,36,0.8)); }

.bottom-panel { flex-shrink: 0; background: rgba(255,255,255,0.12); backdrop-filter: blur(12px); border-top: 2px solid rgba(255,255,255,0.3); padding: 8px 12px 10px; display: flex; flex-direction: column; gap: 6px; z-index: 10; box-shadow: 0 -8px 24px rgba(0,0,0,0.1); }
.finger-hint { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 5px 16px; width: fit-content; margin: 0 auto; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.finger-dot  { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.finger-text { color: rgba(255,255,255,0.9); font-size: 11px; font-weight: 600; }
.finger-key  { background: rgba(255,255,255,0.3); color: #fff; font-size: 13px; font-weight: 900; width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-family: monospace; box-shadow: 0 2px 4px rgba(0,0,0,0.15); }
.vkb { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.vkb-row { display: flex; gap: 3px; }
.vkb-key {
  width: clamp(22px,4vw,32px); height: clamp(22px,4vw,32px); display: flex; align-items: center; justify-content: center;
  background-color: color-mix(in srgb, var(--fc) 18%, rgba(255,255,255,0.15)); border: 1px solid color-mix(in srgb, var(--fc) 40%, rgba(255,255,255,0.2));
  border-radius: 5px; font-size: clamp(7px,1.5vw,11px); font-weight: 700; color: rgba(255,255,255,0.85); transition: all 0.1s; font-family: monospace;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2);
  &.highlight { background-color: color-mix(in srgb, var(--fc) 70%, rgba(255,255,255,0.2)); color: #fff; border-color: var(--fc); box-shadow: 0 0 10px var(--fc); transform: scale(1.18); animation: keyPulse 0.6s ease infinite; }
  &.pressed   { transform: scale(0.9); filter: brightness(1.5); }
}
@keyframes keyPulse { 0%,100% { box-shadow: 0 0 8px var(--fc); } 50% { box-shadow: 0 0 18px var(--fc); } }
.input-hint { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 10px; padding: 8px 16px; text-align: center; cursor: pointer; min-height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2); }
.input-idle   { color: rgba(255,255,255,0.5); font-size: 12px; }
.typed-chars  { color: #0be881; font-size: 16px; font-family: monospace; font-weight: 700; }
.caret        { color: #ffd32a; font-size: 18px; }
.caret.blink  { animation: blink 1s step-end infinite; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
.remaining    { color: rgba(255,255,255,0.5); font-size: 16px; font-family: monospace; }
.hidden-input { position: absolute; left: -9999px; top: -9999px; opacity: 0; width: 1px; height: 1px; }
.vkb-toggle   { background: transparent; border: none; color: rgba(255,255,255,0.5); font-size: 10px; cursor: pointer; align-self: center; padding: 2px 8px; border-radius: 10px; transition: color 0.2s; &:hover { color: rgba(255,255,255,0.9); } }

.pause-overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,251,235,0.25) 0%, rgba(252,231,243,0.25) 60%, rgba(219,234,254,0.25) 100%); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(20px); }
.pause-content { gap: 16px; }

.result-content { gap: 14px; }
.result-stars-row { display: flex; gap: 10px; justify-content: center; }
.result-star-big { font-size: 44px; color: #d1d5db; transition: color 0.3s; &.on { color: #fbbf24; text-shadow: 0 0 20px #fbbf24; } &.bounce { animation: starBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) both; } }
@keyframes starBounce { from { transform: scale(0) rotate(-30deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
.game-stats { width: 100%; }
.main-stat {
  background: linear-gradient(135deg, #fef9c3 0%, #fcd34d 50%, #f59e0b 100%); border: 3px solid rgba(255,255,255,0.8); margin-bottom: 14px; padding: 18px 22px; display: flex; align-items: center; gap: 18px; border-radius: 20px; box-shadow: 0 10px 24px rgba(251,191,36,0.25), inset 0 3px 0 rgba(255,255,255,0.4);
  .stat-icon  { font-size: 40px; animation: trophyWiggle 1.2s ease-in-out infinite; }
  .stat-info  { flex: 1; text-align: left; }
  .stat-label { display: block; font-size: 12px; font-weight: 700; color: #92400e; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 2px; }
  .stat-value { display: block; font-size: 48px; font-weight: 900; color: #78350f; }
  .gold-text  { color: #78350f; font-size: 48px; font-weight: 900; display: block; }
}
.stats-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
.stat-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%); padding: 18px 14px; border-radius: 18px; backdrop-filter: blur(10px);
  border: 3px solid rgba(255,255,255,0.8); box-shadow: 0 6px 16px rgba(0,0,0,0.07), inset 0 2px 0 rgba(255,255,255,1); transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
  &:hover { transform: translateY(-4px) scale(1.04); }
  .stat-icon  { font-size: 32px; margin-bottom: 8px; display: block; }
  .stat-info  { display: block; }
  .stat-label { display: block; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
  .stat-value { display: block; font-size: 26px; font-weight: 900; color: #1e293b; }
}
.new-achievements { width: 100%; background: rgba(255,211,42,0.1); border: 1px solid rgba(255,211,42,0.3); border-radius: 12px; padding: 10px 14px; }
.ach-title { color: #d97706; font-size: 13px; font-weight: 700; margin-bottom: 6px; }
.ach-item  { color: #374151; font-size: 14px; margin: 2px 0; }
.new-pets-wrap { width: 100%; text-align: center; }
.pet-title { color: #7c3aed; font-size: 13px; font-weight: 700; margin-bottom: 8px; }
.new-pets  { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.pet-card  { background: linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(99,102,241,0.1) 100%); border-radius: 12px; padding: 10px 14px; display: flex; flex-direction: column; align-items: center; gap: 4px; animation: petPop 0.5s cubic-bezier(0.34,1.56,0.64,1); border: 2px solid rgba(168,85,247,0.2); }
@keyframes petPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.pet-emoji-big { font-size: 32px; }
.pet-name      { color: #374151; font-size: 12px; font-weight: 600; }

.help-content  { gap: 14px; }
.game-controls { width: 100%; }
.controls-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
.control-item { background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%); padding: 14px; border-radius: 14px; display: flex; align-items: center; gap: 10px; border: 2px solid rgba(255,255,255,0.8); box-shadow: 0 4px 12px rgba(0,0,0,0.05); font-size: 13px; font-weight: 600; color: #475569; transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); &:hover { transform: translateY(-3px); } .control-icon { font-size: 22px; flex-shrink: 0; }
  &.c-key    { border-color: rgba(91,205,231,0.5); background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%); }
  &.c-coin   { border-color: rgba(251,191,36,0.5); background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%); }
  &.c-safe   { border-color: rgba(52,211,153,0.5); background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); }
  &.c-combo  { border-color: rgba(244,114,182,0.5); background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); }
  &.c-finger { border-color: rgba(168,85,247,0.5); background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); }
  &.c-win    { border-color: rgba(251,191,36,0.5); background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
}
.help-fingers { width: 100%; }
.hf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px,1fr)); gap: 6px; }
.hf-item { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.7); padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.05); }
.hf-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.hf-name { color: #374151; font-size: 11px; font-weight: 600; }

.fx-layer    { position: fixed; inset: 0; pointer-events: none; z-index: 50; }
.fx-particle { position: absolute; pointer-events: none; will-change: transform; }

.page-fade-enter-active, .page-fade-leave-active { transition: opacity 0.35s ease; }
.page-fade-enter-from, .page-fade-leave-to { opacity: 0; }
.overlay-fade-enter-active, .overlay-fade-leave-active { transition: opacity 0.25s; }
.overlay-fade-enter-from, .overlay-fade-leave-to { opacity: 0; }

@keyframes twinkle         { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes logoBounce      { 0%,100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-15px) rotate(-5deg); } 75% { transform: translateY(-5px) rotate(5deg); } }
@keyframes titleGradient   { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
@keyframes fadeIn          { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp         { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes progressGradient{ 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
@keyframes buttonShine     { 0% { left: -100%; } 100% { left: 200%; } }
@keyframes trophyWiggle    { 0%,100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
@keyframes starShoot       { 0% { transform: rotate(var(--rotation,0deg)) translateY(0) scale(1); opacity: 1; } 100% { transform: rotate(var(--rotation,0deg)) translateY(-90px) scale(0.5); opacity: 0; } }
@keyframes shockwaveExpand { 0% { width: 16px; height: 16px; opacity: 1; } 100% { width: 160px; height: 160px; opacity: 0; } }
@keyframes coinFall        { 0% { transform: translate(-50%,-50%) translateY(-40px) rotate(0deg); opacity: 1; } 100% { transform: translate(var(--x,20px),80px) rotate(360deg); opacity: 0; } }
@keyframes effectTextFloat { 0% { transform: translate(-50%,-50%) scale(0.6); opacity: 1; } 100% { transform: translate(-50%,-150%) scale(1.1); opacity: 0; } }
</style>
