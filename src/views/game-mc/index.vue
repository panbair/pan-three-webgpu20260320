<template>
  <div ref="gameRoot" class="mc-game" :class="`scene-${currentScene}`">
    <!-- 游戏背景 -->
    <div class="game-background" :style="{ backgroundImage: `url(${currentBackground})` }"></div>

    <!-- 游戏UI层 -->
    <div class="game-ui">
      <!-- 返回按钮 -->
      <button class="back-button" @click="goBack">
        <span class="back-icon">←</span>
        <span class="back-text">返回</span>
      </button>

      <!-- 顶部信息栏 -->
      <div class="top-bar">
        <div class="info-item">
          <span class="label">分数</span>
          <span class="value score">{{ score }}</span>
        </div>
        <div class="info-item">
          <span class="label">金币</span>
          <span class="value coins">{{ coins }}</span>
        </div>
        <div class="info-item center-info">
          <span class="label level-lbl">{{ currentLevelConfig?.name }}</span>
          <span class="value prog">{{ doneCount }} / {{ currentLevelConfig?.targetCount }}</span>
        </div>
        <div class="info-item">
          <span class="label">用时</span>
          <span class="value time">{{ elapsed }}s</span>
        </div>
        <div class="info-item" :class="{ 'combo-active': combo > 0 }">
          <span class="label">连击</span>
          <span class="value combo">{{ combo > 0 ? '🔥' + combo : combo }}</span>
        </div>
        <button class="pause-btn" @click="togglePause">{{ paused ? '▶' : '⏸' }}</button>
      </div>

      <!-- 进度条 -->
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: (doneCount / (currentLevelConfig?.targetCount ?? 1)) * 100 + '%' }"
        ></div>
      </div>
    </div>

    <!-- 连击提示 -->
    <div class="combo-display" :class="{ active: combo > 1 }">
      <div class="combo-text">{{ combo }}连击!</div>
      <div v-if="comboLabel" class="combo-label" :style="{ color: comboLabelColor }">
        {{ comboLabel }}
      </div>
    </div>

    <!-- 方块容器 -->
    <div ref="blockField" class="letters-container">
      <div
        v-for="blk in activeBlocks"
        :key="blk.id"
        class="word-block"
        :class="{
          active: blk.id === focusedBlockId,
          warning: blk.warningLevel === 1,
          danger: blk.warningLevel === 2,
          done: blk.done,
          error: blk.error
        }"
        :style="{ left: blk.x + 'px', top: blk.y + 'px', backgroundImage: `url(${blk.imageUrl})` }"
        @click="focusBlock(blk.id)"
      >
        <div class="block-content">
          <div class="block-word">
            <span
              v-for="(ch, ci) in blk.word"
              :key="ci"
              class="block-char"
              :class="{
                typed: ci < blk.typedCount,
                next: ci === blk.typedCount,
                wrong: blk.error && ci === blk.typedCount
              }"
              :style="ci === blk.typedCount ? { color: nextCharColor(blk) } : {}"
              :data-case="ch.toLowerCase()"
            >
              {{ ch.toUpperCase() }}
            </span>
          </div>
          <div class="block-zh">{{ blk.zh }}</div>
          <div v-if="blk.done" class="block-stars">
            <span v-for="s in blk.stars" :key="s">⭐</span>
          </div>
        </div>
        <div class="block-progress">
          <div
            class="block-progress-fill"
            :style="{ width: (blk.y / (fieldHeight - 60)) * 100 + '%' }"
            :class="{ warning: blk.warningLevel >= 1, danger: blk.warningLevel >= 2 }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 消除特效容器 -->
    <div class="effects-container">
      <div
        v-for="ef in eliminationEffects"
        :key="ef.id"
        class="elimination-effect"
        :class="ef.type"
        :style="{ left: ef.x + 'px', top: ef.y + 'px' }"
      >
        <!-- 普通消除特效 -->
        <template v-if="ef.type === 'normal'">
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

        <!-- 金币特效 -->
        <template v-if="ef.type === 'golden'">
          <div class="golden-effect">
            <div class="crown-emit">
              <div class="crown">👑</div>
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

        <div class="effect-text">{{ ef.text }}</div>
      </div>
    </div>

    <!-- 底部面板 -->
    <div class="bottom-panel">
      <div class="finger-hint">
        <template v-if="activeNextChars.length > 0">
          <span class="finger-dot" :style="{ background: nextFingerInfo?.color || 'rgba(255,255,255,0.3)' }"></span>
          <span class="finger-text">{{ nextFingerInfo?.name || '按键盘输入' }}</span>
          <span class="finger-key">{{ activeNextChars[0].toUpperCase() }}</span>
        </template>
        <template v-else>
          <span class="finger-dot" style="background: rgba(255,255,255,0.3)"></span>
          <span class="finger-text">等待方块出现</span>
          <span class="finger-key" style="opacity: 0.5">?</span>
        </template>
      </div>
      <div v-if="showVkb" class="vkb">
        <div v-for="(row, ri) in keyboardRows" :key="ri" class="vkb-row">
          <div
            v-for="k in row"
            :key="k"
            class="vkb-key"
            :class="{
              highlight: activeNextChars.includes(k.toLowerCase()) || k === nextChar,
              pressed: pressedKey === k
            }"
            :style="{ '--fc': fingerColorHex[fingerMap[k] ?? 'space'] }"
          >
            {{ k.toUpperCase() }}
          </div>
        </div>
      </div>
      <input
        ref="hiddenInput"
        v-model="inputBuf"
        class="hidden-input"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        @keydown="onKeyDown"
        @input="onInput"
        @compositionstart="composing = true"
        @compositionend="composing = false; onInput()"
      />
      <div class="input-hint" @click="focusInput">
        <span v-if="focusedBlockId !== null">
          <span class="typed-chars">{{ typedSoFar }}</span>
          <span class="caret blink">|</span>
          <span class="remaining">{{ remainingChars }}</span>
        </span>
        <span v-else class="input-idle">点击方块或直接打字开始 👆</span>
      </div>
      <button class="vkb-toggle" @click="showVkb = !showVkb">
        {{ showVkb ? '🙈 隐藏键盘' : '⌨️ 显示键盘' }}
      </button>
    </div>

    <!-- 暂停界面 -->
    <div v-if="paused && phase === 'playing'" class="game-overlay">
      <div class="overlay-content pause-content">
        <div class="logo-section">
          <div class="logo-icon">⏸</div>
          <h1 class="game-title" style="font-size: 32px">暂停</h1>
        </div>
        <button class="start-button" @click="togglePause">
          <span class="button-icon">▶</span>
          <span class="button-text">继续游戏</span>
        </button>
        <button class="home-button" @click="quitToMenu">
          <span class="button-icon">🏠</span>
          <span class="button-text">退出关卡</span>
        </button>
      </div>
    </div>

    <!-- 开始界面 -->
    <div v-if="phase === 'start'" class="game-overlay">
      <div class="overlay-content">
        <!-- Logo和标题 -->
        <div class="logo-section">
          <div class="logo-icon">⛏️</div>
          <h1 class="game-title">我的世界打字冒险</h1>
          <p class="game-subtitle">儿童专属像素冒险</p>
        </div>

        <!-- Steve角色 -->
        <div class="steve-wrap">
          <div class="steve" :class="{ bounce: steveBounce }">{{ currentPet }}</div>
          <div v-if="steveSpeech" class="steve-bubble">{{ steveSpeech }}</div>
        </div>

        <!-- 关卡选择 -->
        <div class="level-select">
          <h3 class="selector-title">🗺️ 选择关卡</h3>
          <div class="level-grid">
            <button
              v-for="lv in levelConfigs"
              :key="lv.id"
              class="level-card"
              :class="{
                locked: !progress.unlockedLevels.includes(lv.id),
                active: selectedLevel === lv.id,
                done: (progress.bestRecords[lv.id]?.stars ?? 0) >= 3
              }"
              @click="selectLevel(lv.id)"
            >
              <div class="lv-scene">{{ sceneConfigs[lv.scene].emoji }}</div>
              <div class="lv-name">{{ lv.name }}</div>
              <div class="lv-age">{{ lv.ageRange }}</div>
              <div class="lv-stars">
                <span
                  v-for="s in 3"
                  :key="s"
                  :class="s <= (progress.bestRecords[lv.id]?.stars ?? 0) ? 'star-on' : 'star-off'"
                >
                  ★
                </span>
              </div>
              <div v-if="!progress.unlockedLevels.includes(lv.id)" class="lock-icon">🔒</div>
            </button>
          </div>
        </div>

        <!-- 宠物展示 -->
        <div v-if="progress.pets.length > 0" class="pet-row">
          <span class="pet-label">我的宠物：</span>
          <span
            v-for="pid in progress.pets"
            :key="pid"
            class="pet-badge"
            @click="currentPet = pets.find(p => p.id === pid)?.emoji ?? '🧑'"
          >
            {{ pets.find(p => p.id === pid)?.emoji }}
          </span>
        </div>

        <!-- 总金币 -->
        <div class="total-coins">🪙 总金币：{{ progress.totalCoins }}</div>

        <!-- 开始按钮 -->
        <button class="start-button" :disabled="!selectedLevel" @click="startGame">
          <span class="button-icon">▶</span>
          <span class="button-text">开始冒险</span>
        </button>
        <!-- 返回首页 -->
        <button class="home-button" @click="goBack">
          <span class="button-icon">🏠</span>
          <span class="button-text">返回首页</span>
        </button>
        <!-- 帮助按钮 -->
        <button class="home-button gray-btn" @click="showHelp = true">❓ 怎么玩</button>


      </div>
    </div>

    <!-- 结算界面 -->
    <div v-if="phase === 'result'" class="game-overlay">
      <div class="overlay-content">
        <!-- Logo和标题 -->
        <div class="logo-section">
          <div class="logo-icon">
            {{ resultStars === 3 ? '🏆' : resultStars === 2 ? '🌟' : '✔️' }}
          </div>
          <h1 class="game-title game-over">{{ resultTitle }}</h1>
        </div>

        <!-- 星级评分 -->
        <div class="result-stars-row">
          <span
            v-for="s in 3"
            :key="s"
            class="result-star-big"
            :class="{ on: s <= resultStars, bounce: s <= resultStars }"
            :style="{ animationDelay: s * 0.15 + 's' }"
          >
            ★
          </span>
        </div>

        <!-- 统计数据 -->
        <div class="game-stats">
          <div class="stat-card main-stat">
            <div class="stat-icon">🪙</div>
            <div class="stat-info">
              <span class="stat-label">金币收获</span>
              <span class="stat-value gold-text">+{{ coins }}</span>
            </div>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">⏱️</div>
              <div class="stat-info">
                <span class="stat-label">完成用时</span>
                <span class="stat-value">{{ elapsed }}秒</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🎯</div>
              <div class="stat-info">
                <span class="stat-label">准确率</span>
                <span class="stat-value">{{ accuracy }}%</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🔥</div>
              <div class="stat-info">
                <span class="stat-label">最高连击</span>
                <span class="stat-value">{{ maxCombo }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 新成就 -->
        <div v-if="newAchievements.length > 0" class="new-achievements">
          <div class="ach-title">🎉 新成就解锁！</div>
          <div v-for="a in newAchievements" :key="a.id" class="ach-item">
            {{ a.emoji }} {{ a.name }}
          </div>
        </div>

        <!-- 新宠物 -->
        <div v-if="newPets.length > 0" class="new-pets-wrap">
          <div class="pet-title">🎁 新宠物！</div>
          <div class="new-pets">
            <div v-for="p in newPets" :key="p.id" class="pet-card">
              <span class="pet-emoji-big">{{ p.emoji }}</span>
              <span class="pet-name">{{ p.name }}</span>
            </div>
          </div>
        </div>

        <!-- 按钮 -->
        <button class="start-button" @click="restartLevel">
          <span class="button-icon">🔄</span>
          <span class="button-text">再玩一次</span>
        </button>
        <div class="sub-btns">
          <button v-if="nextLevelId" class="home-button blue-btn" @click="goNextLevel">
            <span class="button-icon">➡️</span>
            <span class="button-text">下一关</span>
          </button>
          <button class="home-button" @click="goMenu">
            <span class="button-icon">📋</span>
            <span class="button-text">回菜单</span>
          </button>
          <button class="home-button" @click="goBack">
            <span class="button-icon">🏠</span>
            <span class="button-text">返回首页</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 帮助弹窗 -->
    <div v-if="showHelp" class="game-overlay" @click.self="showHelp = false">
      <div class="overlay-content help-content">
        <div class="logo-section">
          <div class="logo-icon">❓</div>
          <h1 class="game-title" style="font-size: 28px">怎么玩</h1>
        </div>
        <div class="game-controls">
          <h3 class="controls-title">🎮 游戏说明</h3>
          <div class="controls-grid">
            <div class="control-item c-key">
              <span class="control-icon">⌨️</span>
              <span>看方块上的字母，敲对应键</span>
            </div>
            <div class="control-item c-coin">
              <span class="control-icon">🪙</span>
              <span>打对了方块消失，收集金币</span>
            </div>
            <div class="control-item c-safe">
              <span class="control-icon">⚠️</span>
              <span>打错了温柔提示，可以重试</span>
            </div>
            <div class="control-item c-combo">
              <span class="control-icon">🔥</span>
              <span>连续打对获得连击奖励</span>
            </div>
            <div class="control-item c-finger">
              <span class="control-icon">🖐️</span>
              <span>下方键盘亮起要按的键</span>
            </div>
            <div class="control-item c-win">
              <span class="control-icon">🏆</span>
              <span>完成目标数量就过关！</span>
            </div>
          </div>
        </div>
        <div class="help-fingers">
          <h3 class="controls-title">🖐️ 手指颜色对照</h3>
          <div class="hf-grid">
            <div v-for="(hex, fc) in fingerColorHex" :key="fc" class="hf-item">
              <span class="hf-dot" :style="{ background: hex }"></span>
              <span class="hf-name">{{ fingerName[fc as string] }}</span>
            </div>
          </div>
        </div>
        <button class="start-button" @click="showHelp = false">
          <span class="button-icon">✔</span>
          <span class="button-text">明白了！</span>
        </button>
      </div>
    </div>

    <!-- 粒子特效层 -->
    <div class="fx-layer">
      <div
        v-for="p in particles"
        :key="p.id"
        class="fx-particle"
        :style="{
          left: p.x + 'px',
          top: p.y + 'px',
          color: p.color,
          fontSize: p.size + 'px',
          opacity: p.alpha
        }"
      >
        {{ p.char }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  levelConfigs,
  sceneConfigs,
  fingerMap,
  fingerColorHex,
  fingerName,
  keyboardRows,
  achievements,
  pets,
  pickWords,
  loadProgress,
  saveProgress,
  comboRewards,
  getScore,
  type LevelConfig,
  type SceneId,
  type Achievement,
  type Pet,
  type GameProgress
} from './config'

const router = useRouter()
function goBack() {
  router.push('/')
}

const progress = ref<GameProgress>(loadProgress())
function persistProgress() {
  saveProgress(progress.value)
}

type Phase = 'start' | 'playing' | 'result'
const phase = ref<Phase>('start')
const showHelp = ref(false)
const selectedLevel = ref<number>(1)
const showVkb = ref(true)

const currentScene = computed<SceneId>(
  () => levelConfigs.find(l => l.id === selectedLevel.value)?.scene ?? 'plains'
)

const currentPet = ref('🧑')
const steveBounce = ref(false)
const steveSpeech = ref<string | null>('点击关卡开始冒险！')
const steveSpeeches = ['加油！你能行！', '太棒啦！', '快打吧！', '你是最棒的！', '冲冲冲！']
function randomSteveSpeech() {
  steveSpeech.value = steveSpeeches[Math.floor(Math.random() * steveSpeeches.length)]
  steveBounce.value = true
  setTimeout(() => {
    steveBounce.value = false
  }, 600)
}

function selectLevel(id: number) {
  if (!progress.value.unlockedLevels.includes(id)) {
    randomSteveSpeech()
    steveSpeech.value = '🔒 先通过前面的关卡吧！'
    return
  }
  selectedLevel.value = id
  steveSpeech.value = levelConfigs.find(l => l.id === id)?.description ?? ''
  steveBounce.value = true
  setTimeout(() => {
    steveBounce.value = false
  }, 600)
}

const currentLevelConfig = ref<LevelConfig | null>(null)
const fieldHeight = ref(window.innerHeight - 220)
const fieldWidth = ref(window.innerWidth)
const blockField = ref<HTMLElement | null>(null)
const hiddenInput = ref<HTMLInputElement | null>(null)
const gameRoot = ref<HTMLElement | null>(null)

interface WordBlock {
  id: number
  word: string
  zh: string
  emoji: string
  x: number
  y: number
  typedCount: number
  done: boolean
  error: boolean
  warningLevel: 0 | 1 | 2
  stars: number
  fallStartTime: number
  landTime: number
  imageUrl: string
}
const activeBlocks = ref<WordBlock[]>([])
const focusedBlockId = ref<number | null>(null)
let blockIdCounter = 0

// 背景图列表（7张）
const BACKGROUND_LIST = Array.from({ length: 17 }, (_, i) =>
    `https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/game3/g-v3-${i + 1}.png`
)
const currentBackground = ref(BACKGROUND_LIST[0])

// 音乐列表（7首）
const MUSIC_LIST = [
  'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/6.mp3',
  'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/7.mp3',
  'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/1.mp3',
  'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/2.mp3',
  'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/3.mp3',
  'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/4.mp3',
  'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/music/5.mp3',
]
let currentMusicIndex = 0
let audioPlayer: HTMLAudioElement | null = null

const score = ref(0)
const coins = ref(0)
const combo = ref(0)
const maxCombo = ref(0)
const totalKeys = ref(0)
const correctKeys = ref(0)
const doneCount = ref(0)
const elapsed = ref(0)
const paused = ref(false)
const accuracy = computed(() =>
  totalKeys.value === 0 ? 100 : Math.round((correctKeys.value / totalKeys.value) * 100)
)

const comboLabel = ref('')
const comboLabelColor = ref('#ffd32a')
let comboLabelTimer: ReturnType<typeof setTimeout> | null = null

const eliminationEffects = ref<
  Array<{ id: string; x: number; y: number; type: string; text: string }>
>([])
function createEliminationEffect(x: number, y: number, points: number, isGolden: boolean) {
  const id = `eff_${Date.now()}_${Math.random()}`
  eliminationEffects.value.push({
    id,
    x,
    y,
    type: isGolden ? 'golden' : 'normal',
    text: `+${Math.floor(points)}`
  })
  setTimeout(() => {
    eliminationEffects.value = eliminationEffects.value.filter(e => e.id !== id)
  }, 1000)
}

// 获取屏幕上所有未完成方块的下一个字母（去重）
const activeNextChars = computed(() => {
  const chars = activeBlocks.value
    .filter(b => !b.done)
    .map(b => b.word[b.typedCount].toLowerCase())
  return [...new Set(chars)]
})

const nextChar = computed<string | null>(() => {
  if (focusedBlockId.value === null) return null
  return (
    activeBlocks.value.find(b => b.id === focusedBlockId.value)?.word[
      activeBlocks.value.find(b => b.id === focusedBlockId.value)!.typedCount
    ] ?? null
  )
})
const nextFingerInfo = computed(() => {
  if (!nextChar.value) return null
  const fc = fingerMap[nextChar.value.toLowerCase()]
  if (!fc) return null
  return { color: fingerColorHex[fc], name: fingerName[fc] }
})
const typedSoFar = computed(() => {
  if (focusedBlockId.value === null) return ''
  const blk = activeBlocks.value.find(b => b.id === focusedBlockId.value)
  return blk ? blk.word.slice(0, blk.typedCount).toUpperCase() : ''
})
const remainingChars = computed(() => {
  if (focusedBlockId.value === null) return ''
  const blk = activeBlocks.value.find(b => b.id === focusedBlockId.value)
  return blk ? blk.word.slice(blk.typedCount).toUpperCase() : ''
})
function nextCharColor(blk: WordBlock): string {
  const fc = fingerMap[blk.word[blk.typedCount]?.toLowerCase() ?? '']
  return fc ? fingerColorHex[fc] : '#fff'
}

const inputBuf = ref('')
const composing = ref(false)
const pressedKey = ref<string | null>(null)
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (phase.value === 'playing') togglePause()
    return
  }
  if (e.key === 'Tab') {
    e.preventDefault()
    cycleFocusBlock()
    return
  }
  if (composing.value || paused.value) return
  const key = e.key
  pressedKey.value = key.toLowerCase()
  setTimeout(() => {
    pressedKey.value = null
  }, 120)
  if (key.length === 1) {
    e.preventDefault()
    handleChar(key.toLowerCase())
  }
  if (key === ' ') {
    e.preventDefault()
    handleChar(' ')
  }
}
function onInput() {
  if (composing.value) return
  inputBuf.value = ''
}

function handleChar(ch: string) {
  totalKeys.value++
  // 查找屏幕上未完成且下一个字母是 ch 的方块
  const targetBlock = activeBlocks.value.find(b => !b.done && b.word[b.typedCount] === ch)
  if (!targetBlock) {
    // 没有匹配的方块，检查当前焦点方块是否错误
    const currentBlk = focusedBlockId.value !== null
      ? activeBlocks.value.find(b => b.id === focusedBlockId.value && !b.done)
      : null
    if (currentBlk && currentBlk.word[currentBlk.typedCount] !== ch) {
      // 输入错误
      currentBlk.error = true
      combo.value = 0
      spawnErrorFx(currentBlk.x + 50, currentBlk.y)
      setTimeout(() => {
        currentBlk.error = false
      }, 500)
    }
    return
  }
  // 设置焦点为匹配的方块
  focusedBlockId.value = targetBlock.id
  // 正确输入
  correctKeys.value++
  targetBlock.typedCount++
  targetBlock.error = false
  if (targetBlock.typedCount >= targetBlock.word.length) finishBlock(targetBlock)
}

function finishBlock(blk: WordBlock) {
  blk.done = true
  doneCount.value++
  combo.value++
  if (combo.value > maxCombo.value) maxCombo.value = combo.value
  const p01 = blk.y / (fieldHeight.value - 80)
  const scoreInfo = getScore(p01 >= 0.85 ? 2 : p01 >= 0.6 ? 1 : 0)
  blk.stars = scoreInfo.stars
  coins.value += scoreInfo.stars + Math.floor(combo.value / 5)
  score.value += scoreInfo.stars * 10
  showComboLabel(combo.value)
  spawnSuccessFx(blk.x + 45, blk.y + 30, blk.emoji)
  createEliminationEffect(blk.x + 45, blk.y + 30, scoreInfo.stars * 10, false)
  setTimeout(() => {
    activeBlocks.value = activeBlocks.value.filter(b => b.id !== blk.id)
    if (focusedBlockId.value === blk.id)
      focusedBlockId.value = activeBlocks.value.find(b => !b.done)?.id ?? null
  }, 400)
  checkLevelComplete()
}

function handleBlockMiss(blk: WordBlock) {
  // 方块掉出屏幕，连击中断
  combo.value = 0
  // 如果是当前焦点方块，切换到下一个
  if (focusedBlockId.value === blk.id) {
    focusedBlockId.value = activeBlocks.value.find(b => !b.done && b.id !== blk.id)?.id ?? null
  }
  // 不做其他处理，方块已被 filter 移除
}

function showComboLabel(c: number) {
  const reward = [...comboRewards].reverse().find(r => c >= r.combo)
  if (!reward) return
  comboLabel.value = `${reward.emoji} ${reward.label} ×${c}`
  comboLabelColor.value = reward.color
  if (comboLabelTimer) clearTimeout(comboLabelTimer)
  comboLabelTimer = setTimeout(() => {
    comboLabel.value = ''
  }, 1500)
}
function cycleFocusBlock() {
  const undone = activeBlocks.value.filter(b => !b.done)
  if (!undone.length) return
  const idx = undone.findIndex(b => b.id === focusedBlockId.value)
  focusedBlockId.value = undone[(idx + 1) % undone.length].id
}
function focusBlock(id: number) {
  focusedBlockId.value = id
  focusInput()
}
function focusInput() {
  nextTick(() => hiddenInput.value?.focus())
}

let spawnTimer: ReturnType<typeof setInterval> | null = null
let fallTimer: ReturnType<typeof setInterval> | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null
let startTime = 0

// 纹理图片配置（复刻 game-2d）
const TEXTURE_BASE_URL = 'https://zooow-1258443890.cos.ap-guangzhou.myqcloud.com/game1'
const TEXTURE_MIN_INDEX = 1
const TEXTURE_MAX_INDEX = 90

function getRandomTextureUrl(): string {
  const randomIndex = Math.floor(
    Math.random() * (TEXTURE_MAX_INDEX - TEXTURE_MIN_INDEX + 1)
  ) + TEXTURE_MIN_INDEX
  return `${TEXTURE_BASE_URL}/g-v2-${randomIndex}.png`
}

function spawnBlock() {
  if (!currentLevelConfig.value) return
  if (activeBlocks.value.filter(b => !b.done).length >= currentLevelConfig.value.maxBlocks) return
  if (doneCount.value >= currentLevelConfig.value.targetCount) return
  const cfg = currentLevelConfig.value
  const w = pickWords(cfg.wordPool, 1)[0]
  const fallDuration = (fieldHeight.value / cfg.fallSpeed) * 1000
  activeBlocks.value.push({
    id: ++blockIdCounter,
    word: w.word,
    zh: w.zh,
    emoji: w.emoji,
    x: 20 + Math.random() * Math.max(50, fieldWidth.value - 200),
    y: 0,
    typedCount: 0,
    done: false,
    error: false,
    warningLevel: 0,
    stars: 0,
    fallStartTime: Date.now(),
    landTime: Date.now() + fallDuration,
    imageUrl: getRandomTextureUrl()
  })
}

function updateFall() {
  if (paused.value) return
  const now = Date.now()
  const h = fieldHeight.value - 80
  activeBlocks.value = activeBlocks.value.filter(blk => {
    // 如果方块已完成或掉出屏幕，过滤掉
    if (blk.done) return false
    const newY = ((now - blk.fallStartTime) / (blk.landTime - blk.fallStartTime)) * h
    const ratio = newY / h
    const warningLevel: 0 | 1 | 2 = ratio >= 0.85 ? 2 : ratio >= 0.6 ? 1 : 0
    // 如果方块掉出屏幕，不保留
    if (newY > h + 100) {
      // 方块掉出屏幕，触发失败或扣分
      handleBlockMiss(blk)
      return false
    }
    // 更新方块位置
    blk.y = newY
    blk.warningLevel = warningLevel
    return true
  })
}

function startTimer() {
  startTime = Date.now()
  timerInterval = setInterval(() => {
    if (!paused.value) elapsed.value = Math.floor((Date.now() - startTime) / 1000)
  }, 200)
}
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

interface FxParticle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  char: string
  color: string
  size: number
  alpha: number
  life: number
  maxLife: number
}
const particles = ref<FxParticle[]>([])
let pfxId = 0
let pfxTimer = 0

function spawnSuccessFx(x: number, y: number, emoji: string) {
  for (let i = 0; i < 8; i++) {
    particles.value.push({
      id: ++pfxId,
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: -(Math.random() * 3 + 1),
      char: ['⭐', '✨', '💫', emoji, '🌟'][Math.floor(Math.random() * 5)],
      color: Object.values(fingerColorHex)[Math.floor(Math.random() * 8)],
      size: 16 + Math.random() * 12,
      alpha: 1,
      life: 0,
      maxLife: 60
    })
  }
}
function spawnErrorFx(x: number, y: number) {
  particles.value.push({
    id: ++pfxId,
    x,
    y,
    vx: (Math.random() - 0.5) * 2,
    vy: -1,
    char: '❌',
    color: '#ff6b6b',
    size: 20,
    alpha: 1,
    life: 0,
    maxLife: 30
  })
}
function updateParticles() {
  particles.value = particles.value
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.1,
      alpha: 1 - p.life / p.maxLife,
      life: p.life + 1
    }))
    .filter(p => p.life < p.maxLife)
}
function startPfxLoop() {
  const loop = () => {
    updateParticles()
    pfxTimer = requestAnimationFrame(loop)
  }
  pfxTimer = requestAnimationFrame(loop)
}

function startGame() {
  if (!selectedLevel.value) return
  const cfg = levelConfigs.find(l => l.id === selectedLevel.value)
  if (!cfg) return
  // 随机切换背景图
  currentBackground.value = BACKGROUND_LIST[Math.floor(Math.random() * BACKGROUND_LIST.length)]
  currentLevelConfig.value = cfg
  activeBlocks.value = []
  focusedBlockId.value = null
  blockIdCounter = 0
  score.value = 0
  coins.value = 0
  combo.value = 0
  maxCombo.value = 0
  totalKeys.value = 0
  correctKeys.value = 0
  doneCount.value = 0
  elapsed.value = 0
  comboLabel.value = ''
  paused.value = false
  particles.value = []
  eliminationEffects.value = []
  phase.value = 'playing'
  // 开始播放音乐
  playMusic()
  nextTick(() => {
    fieldHeight.value = blockField.value?.clientHeight ?? window.innerHeight - 220
    fieldWidth.value = window.innerWidth
    focusInput()
    spawnBlock()
    spawnTimer = setInterval(spawnBlock, cfg.spawnInterval)
    fallTimer = setInterval(updateFall, 30)
    startTimer()
    startPfxLoop()
  })
}

function togglePause() {
  paused.value = !paused.value
  if (!paused.value) {
    const offset = Date.now()
    activeBlocks.value = activeBlocks.value.map(blk => {
      if (blk.done) return blk
      const rem = blk.landTime - blk.fallStartTime
      return {
        ...blk,
        fallStartTime: offset,
        landTime: offset + rem * (1 - blk.y / (fieldHeight.value - 80))
      }
    })
    focusInput()
  }
}
function quitToMenu() {
  stopAll()
  phase.value = 'start'
}

const resultTitle = ref('')
const resultStars = ref(0)
const newAchievements = ref<Achievement[]>([])
const newPets = ref<Pet[]>([])
const nextLevelId = ref<number | null>(null)

function checkLevelComplete() {
  if (!currentLevelConfig.value || doneCount.value < currentLevelConfig.value.targetCount) return
  stopAll()
  const stars = accuracy.value >= 95 ? 3 : accuracy.value >= 80 ? 2 : 1
  resultStars.value = stars
  resultTitle.value = stars === 3 ? '完美通关！' : stars === 2 ? '通关成功！' : '完成关卡！'
  const lvId = currentLevelConfig.value.id
  const prev = progress.value.bestRecords[lvId]
  if (!prev || stars > prev.stars)
    progress.value.bestRecords[lvId] = { stars, coins: coins.value, time: elapsed.value }
  progress.value.totalCoins += coins.value
  const nextId = lvId + 1
  if (nextId <= levelConfigs.length && !progress.value.unlockedLevels.includes(nextId))
    progress.value.unlockedLevels.push(nextId)
  nextLevelId.value = nextId <= levelConfigs.length ? nextId : null
  newAchievements.value = checkAchievements(lvId, stars)
  newPets.value = checkPets(lvId)
  persistProgress()
  setTimeout(() => {
    phase.value = 'result'
  }, 800)
}

function checkAchievements(lvId: number, stars: number): Achievement[] {
  const earned: Achievement[] = []
  const already = progress.value.achievements
  const chk = (id: string) => {
    if (!already.includes(id)) {
      const a = achievements.find(x => x.id === id)
      if (a) {
        earned.push(a)
        already.push(id)
      }
    }
  }
  chk(`level${lvId}_done`)
  if (doneCount.value >= 1) chk('first_word')
  if (maxCombo.value >= 5) chk('combo_5')
  if (maxCombo.value >= 10) chk('combo_10')
  if (stars === 3) chk('all_gold')
  if (totalKeys.value > 0 && correctKeys.value === totalKeys.value) chk('no_error')
  return earned
}
function checkPets(lvId: number): Pet[] {
  const earned: Pet[] = []
  const already = progress.value.pets
  const ach = progress.value.achievements
  pets.forEach(p => {
    if (!already.includes(p.id) && ach.includes(p.unlockAt)) {
      earned.push(p)
      already.push(p.id)
    }
  })
  return earned
}

function restartLevel() {
  phase.value = 'start'
  nextTick(startGame)
}
function goNextLevel() {
  if (!nextLevelId.value) return
  selectedLevel.value = nextLevelId.value
  phase.value = 'start'
  nextTick(startGame)
}
function goMenu() {
  phase.value = 'start'
}
function stopAll() {
  if (spawnTimer) {
    clearInterval(spawnTimer)
    spawnTimer = null
  }
  if (fallTimer) {
    clearInterval(fallTimer)
    fallTimer = null
  }
  stopTimer()
  if (pfxTimer) {
    cancelAnimationFrame(pfxTimer)
    pfxTimer = 0
  }
  if (comboLabelTimer) {
    clearTimeout(comboLabelTimer)
    comboLabelTimer = null
  }
  stopMusic()
}

// 音乐播放控制
function playMusic() {
  // 如果已有播放器，先停止
  if (audioPlayer) {
    audioPlayer.pause()
    audioPlayer.currentTime = 0
  }

  // 创建新的音频播放器
  audioPlayer = new Audio(MUSIC_LIST[currentMusicIndex])
  audioPlayer.volume = 0.4
  audioPlayer.loop = false

  // 当前歌曲播放完毕，播放下一首
  audioPlayer.addEventListener('ended', playNextMusic)

  // 尝试播放
  audioPlayer.play().catch(err => {
    console.log('音乐播放失败:', err)
  })
}

function playNextMusic() {
  currentMusicIndex = (currentMusicIndex + 1) % MUSIC_LIST.length
  playMusic()
}

function stopMusic() {
  if (audioPlayer) {
    audioPlayer.pause()
    audioPlayer.currentTime = 0
    audioPlayer.removeEventListener('ended', playNextMusic)
    audioPlayer = null
  }
}

function onGlobalKeyDown(e: KeyboardEvent) {
  if (phase.value !== 'playing' || paused.value) return
  if (hiddenInput.value && document.activeElement !== hiddenInput.value) hiddenInput.value.focus()
}
function onResize() {
  fieldWidth.value = window.innerWidth
  fieldHeight.value = blockField.value?.clientHeight ?? window.innerHeight - 220
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown)
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  stopAll()
  window.removeEventListener('keydown', onGlobalKeyDown)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped lang="scss">
.mc-game {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 30%, #fce7f3 60%, #dbeafe 100%);
  background-image: url('/assets/images/bg-stars.png');
}

.scene-plains {
  background: linear-gradient(135deg, #87ceeb 0%, #c8e6c9 100%);
}
.scene-cave {
  background: linear-gradient(135deg, #1a1a2e 0%, #2d3561 100%);
}
.scene-cabin {
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
}
.scene-village {
  background: linear-gradient(135deg, #2980b9 0%, #27ae60 100%);
}
.scene-adventure {
  background: linear-gradient(135deg, #6c3483 0%, #1a5276 100%);
}

.game-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: background-image 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;

  /* 动态粒子效果层 */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.9) 0%, transparent 4%),
      radial-gradient(circle at 40% 70%, rgba(255, 200, 100, 0.7) 0%, transparent 3%),
      radial-gradient(circle at 60% 20%, rgba(100, 200, 255, 0.8) 0%, transparent 3.5%),
      radial-gradient(circle at 80% 60%, rgba(255, 150, 200, 0.6) 0%, transparent 2.5%),
      radial-gradient(circle at 10% 80%, rgba(150, 255, 150, 0.7) 0%, transparent 3%),
      radial-gradient(circle at 90% 10%, rgba(255, 255, 100, 0.6) 0%, transparent 2%);
    animation: particleFloat 8s ease-in-out infinite;
    z-index: 1;
  }

  /* 渐变遮罩，增强可读性 */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(0, 0, 0, 0.1) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(0, 0, 0, 0.2) 0%, transparent 40%),
      rgba(0, 0, 0, 0.1);
    z-index: 0;
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
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 24px;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border-radius: 0 0 20px 20px;
  position: relative;
  margin: 0 20px;
  animation: slideInGlow 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 3px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      #fbbf24 10%,
      #f472b6 30%,
      #a855f7 50%,
      #3b82f6 70%,
      #34d399 90%,
      transparent 100%
    );
    background-size: 200% 100%;
    border-radius: 0 0 3px 3px;
    animation: borderGlow 3s ease infinite;
    filter: drop-shadow(0 2px 4px rgba(251, 191, 36, 0.5));
  }
}

.back-button {
  position: fixed;
  left: 20px;
  top: 20px;
  display: flex;
  align-items: center;
  z-index: 9999;
  pointer-events: auto;
  gap: 6px;
  padding: 10px 18px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  border: none;
  border-radius: 22px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow:
      0 8px 20px rgba(0, 0, 0, 0.12),
      0 4px 8px rgba(0, 0, 0, 0.06);
    background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 100%);
  }

  &:active {
    transform: scale(0.95);
  }

  .back-icon {
    font-size: 18px;
    font-weight: bold;
  }

  .back-text {
    font-weight: 600;
  }
}

.info-item {
  text-align: center;
  position: relative;
  padding: 12px 20px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 255, 255, 0.85) 50%,
    rgba(255, 255, 255, 0.75) 100%
  );
  border-radius: 16px;
  transform-style: preserve-3d;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow:
    0 4px 15px rgba(0, 0, 0, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  animation: floatUp 3s ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * 0.2s);

  &:hover {
    transform: translateY(-4px) scale(1.05) rotateX(5deg);
    box-shadow:
      0 12px 30px rgba(0, 0, 0, 0.15),
      0 4px 8px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  &:nth-child(1) { --i: 0; }
  &:nth-child(2) { --i: 1; }
  &:nth-child(3) { --i: 2; }
  &:nth-child(4) { --i: 3; }
  &:nth-child(5) { --i: 4; }
  &:nth-child(6) { --i: 5; }
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.08),
    inset 0 2px 0 rgba(255, 255, 255, 1),
    0 0 0 2px rgba(255, 255, 255, 0.7);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-width: 75px;

  &:hover {
    transform: translateY(-2px) scale(1.04);
  }

  .label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    margin-bottom: 2px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #64748b;
  }

  .value {
    display: block;
    font-size: 24px;
    font-weight: 900;
    line-height: 1;
    color: #1e293b;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 3px;
    background: currentColor;
    border-radius: 2px;
    opacity: 0.5;
  }

  &.combo-active {
    background: linear-gradient(135deg, rgba(253, 186, 116, 0.3) 0%, rgba(249, 115, 22, 0.2) 100%);
  }

  &.score .value {
    color: #f59e0b;
  }
  &.coins .value {
    color: #fbbf24;
  }
  &.time .value {
    color: #34d399;
  }
  &.combo .value {
    color: #f472b6;
  }
}

.center-info {
  min-width: 120px;
  .label.level-lbl {
    font-size: 12px;
    font-weight: 800;
    color: #7c3aed;
    letter-spacing: 0;
    text-transform: none;
  }
  .value.prog {
    font-size: 16px;
    color: #475569;
  }
}

.pause-btn {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.75) 100%);
  border: 2px solid rgba(255, 255, 255, 0.8);
  color: #374151;
  font-size: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  pointer-events: auto;

  &:hover {
    background: white;
    transform: scale(1.1);
  }
}

.progress-bar {
  height: 14px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 0.4) 100%
  );
  margin: 10px 30px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.1),
    0 4px 15px rgba(0, 0, 0, 0.15),
    0 0 0 2px rgba(255, 255, 255, 0.5);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    animation: shimmer 2s linear infinite;
    pointer-events: none;
  }
}

.progress-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    #f472b6 0%,
    #a855f7 20%,
    #6366f1 40%,
    #3b82f6 60%,
    #0ea5e9 80%,
    #34d399 100%
  );
  background-size: 300% 100%;
  transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: progressGradient 4s ease infinite;
  box-shadow:
    0 0 20px rgba(244, 114, 182, 0.8),
    0 0 40px rgba(168, 85, 247, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.6),
      transparent
    );
    animation: shimmer 1.5s ease-in-out infinite;
  }
}

.combo-display {
  position: fixed;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  z-index: 200;
  filter: blur(10px);
  scale: 0.5;

  &.active {
    opacity: 1;
    filter: blur(0);
    scale: 1;
    animation: comboExplosion 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

.combo-text {
  font-size: clamp(60px, 10vw, 100px);
  font-weight: 900;
  background: linear-gradient(
    135deg,
    #fbbf24 0%,
    #f472b6 25%,
    #a855f7 50%,
    #3b82f6 75%,
    #34d399 100%
  );
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  animation: gradientShift 2s ease infinite;
  position: relative;

  &::before {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(251, 191, 36, 0.5) 0%,
      rgba(244, 114, 182, 0.5) 50%,
      rgba(52, 211, 153, 0.5) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: blur(20px);
    opacity: 0.5;
    z-index: -1;
  }
}

.combo-label {
  font-size: 24px;
  font-weight: 900;
  margin-top: 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  padding: 10px 28px;
  border-radius: 30px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  backdrop-filter: blur(10px);
  transform: translateY(0);
  animation: floatUp 2s ease-in-out infinite;
}

.letters-container {
  position: absolute;
  top: 100px;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  overflow: hidden;
}

.word-block {
  position: absolute;
  min-width: 90px;
  max-width: 180px;
  cursor: pointer;
  background-color: rgba(101, 67, 33, 0.85);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  padding: 24px 14px 8px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 8px 24px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(255, 255, 255, 0.2),
    inset 0 -2px 4px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px) saturate(120%);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 5;
  overflow: hidden;
  transform-style: preserve-3d;
  animation: blockFloat 4s ease-in-out infinite;

  /* 玻璃反光效果 */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      135deg,
      transparent 40%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 60%
    );
    transform: rotate(45deg) translateY(-100%);
    transition: transform 0.6s;
    pointer-events: none;
    z-index: 2;
  }

  &:hover::before {
    transform: rotate(45deg) translateY(100%);
  }

  /* 背景遮罩 */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.2) 0%,
      rgba(0, 0, 0, 0.4) 100%
    );
    border-radius: 22px;
    z-index: 0;
  }

  &:hover {
    transform: scale(1.08) translateY(-4px) rotateX(5deg);
    box-shadow:
      0 15px 40px rgba(0, 0, 0, 0.35),
      0 6px 16px rgba(0, 0, 0, 0.25),
      inset 0 2px 4px rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.6);
  }

  &.active {
    border-color: #ffd32a;
    box-shadow:
      0 0 15px rgba(255, 211, 42, 0.6),
      0 0 30px rgba(255, 211, 42, 0.3),
      0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 15;
    transform: scale(1.1) translateY(-5px);
    animation: activePulse 1.5s ease-in-out infinite;

    &::after {
      background: linear-gradient(
        135deg,
        rgba(255, 211, 42, 0.25) 0%,
        rgba(0, 0, 0, 0.35) 100%
      );
    }
  }

  &.warning {
    background-color: rgba(180, 100, 20, 0.9);
    border-color: #ff9f43;
    animation: shakeWarning 0.5s ease infinite, warningPulse 1s ease-in-out infinite;

    &::after {
      background: linear-gradient(
        135deg,
        rgba(255, 159, 67, 0.35) 0%,
        rgba(0, 0, 0, 0.45) 100%
      );
    }
  }

  &.danger {
    background-color: rgba(200, 40, 40, 0.95);
    border-color: #ff6b6b;
    animation: shakeDanger 0.3s ease infinite, dangerPulse 0.6s ease-in-out infinite;

    &::after {
      background: linear-gradient(
        135deg,
        rgba(255, 107, 107, 0.45) 0%,
        rgba(0, 0, 0, 0.55) 100%
      );
    }
  }

  &.done {
    background-color: rgba(39, 174, 96, 0.9);
    border-color: #0be881;
    box-shadow:
      0 0 15px rgba(11, 232, 129, 0.6),
      0 0 30px rgba(11, 232, 129, 0.3),
      0 10px 30px rgba(0, 0, 0, 0.25);
    animation: successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);

    &::after {
      background: linear-gradient(
        135deg,
        rgba(11, 232, 129, 0.35) 0%,
        rgba(0, 0, 0, 0.35) 100%
      );
    }
  }

  &.error {
    animation: errorShake 0.3s ease;
    border-color: #ff6b6b;
  }

  /* 确保内容在遮罩层之上 */
  .block-content {
    position: relative;
    z-index: 1;
  }
}

.block-word {
  display: flex;
  gap: 2px;
  justify-content: center;
  flex-wrap: wrap;
}

.block-char {
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 900;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.15s ease;
  letter-spacing: 1.5px;
  font-family: 'Arial Black', 'Helvetica Black', sans-serif;
  position: relative;
  display: inline-block;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.4),
    0 2px 0 rgba(255, 255, 255, 0.3),
    0 3px 0 rgba(200, 200, 200, 0.2),
    0 4px 0 rgba(150, 150, 150, 0.15),
    0 5px 0 rgba(100, 100, 100, 0.1),
    0 6px 10px rgba(0, 0, 0, 0.4),
    0 0 30px rgba(255, 255, 255, 0.2);
  transform-style: preserve-3d;
  transform: perspective(500px) rotateX(10deg);

  /* 右下角小写字母 */
  &::after {
    content: attr(data-case);
    position: absolute;
    bottom: 1px;
    right: 0;
    font-size: 7px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    pointer-events: none;
  }

  &.typed {
    color: #0be881;
    text-shadow:
      0 1px 0 rgba(11, 232, 129, 0.5),
      0 2px 0 rgba(11, 232, 129, 0.4),
      0 3px 0 rgba(11, 200, 100, 0.3),
      0 4px 0 rgba(11, 180, 80, 0.2),
      0 5px 0 rgba(11, 150, 60, 0.15),
      0 6px 15px rgba(11, 232, 129, 0.6),
      0 0 40px rgba(11, 232, 129, 0.5);
    transform: perspective(500px) rotateX(0deg) scale(1.1);

    &::after {
      color: rgba(11, 232, 129, 0.7);
    }
  }

  &.next {
    font-size: clamp(26px, 4.5vw, 36px);
    color: #fff;
    text-shadow:
      0 0 10px currentColor,
      0 0 30px currentColor,
      0 0 60px currentColor,
      0 4px 8px rgba(0, 0, 0, 0.5);
    animation: nextPulse 1s ease infinite, letterGlow 1.5s ease-in-out infinite;
    transform: perspective(500px) rotateX(0deg) translateZ(20px);

    &::after {
      color: rgba(255, 255, 255, 0.8);
      font-size: 8px;
    }
  }

  &.wrong {
    color: #ff6b6b !important;
    text-shadow:
      0 0 10px #ff6b6b,
      0 0 30px #ff6b6b,
      0 4px 8px rgba(0, 0, 0, 0.5);
    animation: letterShake 0.4s ease;
    transform: perspective(500px) rotateX(0deg);

    &::after {
      color: rgba(255, 107, 107, 0.8);
    }
  }
}

.block-zh {
  text-align: center;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
}

.block-stars {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  animation: starPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 10;
}

.block-progress {
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}

.block-progress-fill {
  height: 100%;
  background: #0be881;
  border-radius: 4px;
  transition: width 0.08s;

  &.warning {
    background: #ff9f43;
  }
  &.danger {
    background: #ff6b6b;
  }
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
    background: linear-gradient(180deg, #a855f7, #6366f1);
    transform-origin: center;
    border-radius: 2px;
    box-shadow:
      0 0 10px #a855f7,
      0 0 20px #6366f1;
    animation: starShoot 0.8s ease-out forwards;
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
    animation: sparkleFloat 1s ease-out forwards;
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
  animation: shockwaveExpand 1.2s ease-out forwards;
}

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
    animation: crownFloat 1s ease-out forwards;
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
    animation: coinFall 1.5s ease-in forwards;
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
    animation: royalRayPulse 2s ease-in-out forwards;
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
    animation: diamondSpin 1s ease-out forwards;
  }

  @for $i from 1 through 4 {
    .diamond:nth-child(#{$i}) {
      animation-delay: #{$i * 0.15s};
    }
  }
}

.effect-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 36px;
  font-weight: 900;
  white-space: nowrap;
  z-index: 100;
  animation: effectTextFloat 1s ease-out forwards;
  background: linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.8));
}

.elimination-effect.golden .effect-text {
  background: linear-gradient(135deg, #fcd34d 0%, #fbbf24 50%, #f59e0b 100%);
  -webkit-background-clip: text;
  background-clip: text;
  filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.8));
}

.bottom-panel {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  border-top: 2px solid rgba(255, 255, 255, 0.3);
  padding: 10px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.1);
  border-radius: 20px;
}

.finger-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  padding: 6px 16px;
  margin: 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  opacity: 1;
  transform: scale(1);
}

.finger-hint.v-enter-active,
.finger-hint.v-leave-active {
  transition: all 0.3s ease;
}

.finger-hint.v-enter-from,
.finger-hint.v-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.finger-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.finger-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 600;
}

.finger-key {
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
  font-size: 14px;
  font-weight: 900;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: monospace;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.vkb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.vkb-row {
  display: flex;
  gap: 4px;
}

.vkb-key {
  width: clamp(24px, 4vw, 34px);
  height: clamp(24px, 4vw, 34px);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: color-mix(in srgb, var(--fc) 18%, rgba(255, 255, 255, 0.15));
  border: 1px solid color-mix(in srgb, var(--fc) 40%, rgba(255, 255, 255, 0.2));
  border-radius: 6px;
  font-size: clamp(8px, 1.5vw, 12px);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  transition: all 0.1s;
  font-family: monospace;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);

  &.highlight {
    background-color: color-mix(in srgb, var(--fc) 70%, rgba(255, 255, 255, 0.2));
    color: #fff;
    border-color: var(--fc);
    box-shadow: 0 0 12px var(--fc);
    transform: scale(1.15);
    animation: keyPulse 0.6s ease infinite;
  }

  &.pressed {
    transform: scale(0.9);
    filter: brightness(1.5);
  }
}

.input-hint {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 10px 18px;
  text-align: center;
  cursor: pointer;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.input-idle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.typed-chars {
  color: #0be881;
  font-size: 18px;
  font-family: monospace;
  font-weight: 700;
}

.caret {
  color: #ffd32a;
  font-size: 20px;

  &.blink {
    animation: blink 1s step-end infinite;
  }
}

.remaining {
  color: rgba(255, 255, 255, 0.6);
  font-size: 18px;
  font-family: monospace;
}

.hidden-input {
  position: absolute;
  left: -9999px;
  top: -9999px;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.vkb-toggle {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  cursor: pointer;
  align-self: center;
  padding: 4px 12px;
  border-radius: 10px;
  transition: color 0.2s;

  &:hover {
    color: rgba(255, 255, 255, 0.95);
  }
}

.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(20, 20, 40, 0.6) 0%,
    rgba(40, 30, 60, 0.5) 50%,
    rgba(20, 30, 50, 0.6) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  backdrop-filter: blur(30px) saturate(150%);
  -webkit-backdrop-filter: blur(30px) saturate(150%);
  animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
  padding: 20px;

  /* 动态背景光效 */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 20% 20%, rgba(120, 80, 200, 0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(80, 150, 200, 0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(200, 100, 150, 0.2) 0%, transparent 60%);
    animation: glowPulse 8s ease-in-out infinite;
    pointer-events: none;
  }
}

.overlay-content {
  text-align: center;
  color: #1e293b;
  width: 750px;
  max-width: 94vw;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.98) 0%,
    rgba(250, 250, 255, 0.95) 50%,
    rgba(255, 255, 255, 0.98) 100%
  );
  padding: 30px 35px;
  border-radius: 30px;
  box-sizing: border-box;
  box-shadow:
    0 25px 50px rgba(0, 0, 0, 0.2),
    0 0 60px rgba(99, 102, 241, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.8),
    inset 0 2px 4px rgba(255, 255, 255, 1);
  animation: bounceIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-height: 92vh;
  overflow-y: auto;
  position: relative;
  transform-style: preserve-3d;

  /* 顶部彩虹光条 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 10%;
    right: 10%;
    height: 4px;
    background: linear-gradient(
      90deg,
      #fbbf24 0%,
      #f472b6 20%,
      #a855f7 40%,
      #3b82f6 60%,
      #0ea5e9 80%,
      #34d399 100%
    );
    background-size: 200% 100%;
    border-radius: 0 0 4px 4px;
    animation: borderGlow 3s ease infinite;
    filter: drop-shadow(0 2px 8px rgba(168, 85, 247, 0.5));
  }

  &::-webkit-scrollbar {
    display: none;
  }
}

.logo-section {
  margin-bottom: 4px;

  .logo-icon {
    font-size: 48px;
    margin-bottom: 4px;
    animation: logoBounce 1.5s ease-in-out infinite;
    filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.1));
  }
}

.game-title {
  font-size: 28px;
  font-weight: 900;
  margin: 0 0 4px 0;
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
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.1));

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

.game-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.steve-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 6px 0;
}

.steve {
  font-size: 56px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  transition: transform 0.1s;

  &.bounce {
    animation: steveBounce 0.5s ease;
  }
}

.steve-bubble {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  font-size: 14px;
  padding: 6px 14px;
  border-radius: 18px;
  margin-top: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 260px;
  text-align: center;
  border: 2px solid rgba(168, 85, 247, 0.2);
}

.level-select {
  width: 100%;
  margin: 6px 0;
}

.selector-title {
  font-size: 22px;
  font-weight: 800;
  margin: 0 0 10px 0;
  background: linear-gradient(135deg, #f472b6 0%, #a855f7 50%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: titleGradient 4s ease infinite;
  background-size: 200% 100%;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
  gap: 10px;
}

.level-card {
  position: relative;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 100%);
  border: 3px solid rgba(168, 85, 247, 0.25);
  border-radius: 18px;
  padding: 12px 8px;
  color: #1e293b;
  cursor: pointer;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.06),
    inset 0 2px 0 rgba(255, 255, 255, 0.8);

  &:hover:not(.locked) {
    transform: translateY(-4px) scale(1.04);
    border-color: #a855f7;
    box-shadow: 0 12px 25px rgba(168, 85, 247, 0.25);
  }

  &.active {
    border-color: #a855f7;
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%);
    box-shadow: 0 8px 20px rgba(168, 85, 247, 0.3);
  }

  &.done {
    border-color: #34d399;
    background: linear-gradient(135deg, rgba(52, 211, 153, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%);
  }

  &.locked {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(0.6);
  }
}

.lv-scene {
  font-size: 32px;
}

.lv-name {
  font-size: 12px;
  font-weight: 700;
  color: #7c3aed;
  margin-top: 4px;
}

.lv-age {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.lv-stars {
  font-size: 14px;
  margin-top: 4px;
}

.star-on {
  color: #fbbf24;
}

.star-off {
  color: #d1d5db;
}

.lock-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 16px;
}

.pet-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 100%);
  padding: 8px 18px;
  border-radius: 22px;
  border: 2px solid rgba(168, 85, 247, 0.25);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.pet-label {
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
}

.pet-badge {
  font-size: 22px;
  cursor: pointer;
  transition: transform 0.15s;

  &:hover {
    transform: scale(1.3);
  }
}

.total-coins {
  color: #92400e;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #fef9c3 0%, #fef08a 50%, #fde047 100%);
  padding: 8px 20px;
  border-radius: 22px;
  border: 2px solid rgba(251, 191, 36, 0.4);
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
}

.start-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 50px;
  font-size: 18px;
  font-weight: 900;
  color: white;
  background: linear-gradient(
    135deg,
    #f472b6 0%,
    #e879f9 25%,
    #a855f7 50%,
    #6366f1 75%,
    #3b82f6 100%
  );
  background-size: 200% 200%;
  border: 3px solid rgba(255, 255, 255, 0.6);
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow:
    0 15px 40px rgba(168, 85, 247, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.3),
    inset 0 2px 4px rgba(255, 255, 255, 0.3);
  width: 100%;
  max-width: 340px;
  position: relative;
  overflow: hidden;
  pointer-events: auto;
  animation: gradientShift 4s ease infinite;
  transform-style: preserve-3d;

  /* 光泽流动效果 */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 70%
    );
    transform: rotate(45deg) translateX(-100%);
    transition: transform 0.6s;
    pointer-events: none;
  }

  /* 底部发光 */
  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 10%;
    right: 10%;
    height: 20px;
    background: radial-gradient(ellipse, rgba(168, 85, 247, 0.6) 0%, transparent 70%);
    filter: blur(10px);
    z-index: -1;
    transition: all 0.4s;
  }

  &:hover:not(:disabled) {
    transform: translateY(-6px) scale(1.05) rotateX(5deg);
    box-shadow:
      0 25px 60px rgba(168, 85, 247, 0.6),
      0 0 0 2px rgba(255, 255, 255, 0.4),
      inset 0 2px 4px rgba(255, 255, 255, 0.4);
    animation: gradientShift 2s ease infinite, neonPulse 1.5s ease-in-out infinite;

    &::before {
      transform: rotate(45deg) translateX(100%);
    }

    &::after {
      bottom: -15px;
      left: 5%;
      right: 5%;
      height: 30px;
      background: radial-gradient(ellipse, rgba(168, 85, 247, 0.8) 0%, transparent 70%);
    }
  }

  &:active:not(:disabled) {
    transform: translateY(-2px) scale(1.02);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    filter: grayscale(0.8);
  }

  .button-icon {
    font-size: 26px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    animation: floatUp 2s ease-in-out infinite;
  }

  .button-text {
    font-size: 20px;
    font-weight: 900;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
}

.home-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 36px;
  font-size: 18px;
  font-weight: 800;
  color: white;
  background: linear-gradient(135deg, #4b5563 0%, #374151 50%, #1f2937 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 40px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 2px rgba(255, 255, 255, 0.15);
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  transform-style: preserve-3d;

  /* 光泽效果 */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 40%,
      rgba(255, 255, 255, 0.15) 50%,
      transparent 60%
    );
    transform: rotate(45deg) translateX(-100%);
    transition: transform 0.5s;
    pointer-events: none;
  }

  /* 底部阴影 */
  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 15%;
    right: 15%;
    height: 15px;
    background: radial-gradient(ellipse, rgba(0, 0, 0, 0.3) 0%, transparent 70%);
    filter: blur(8px);
    z-index: -1;
    transition: all 0.3s;
  }

  &:hover {
    transform: translateY(-4px) scale(1.04) rotateX(3deg);
    box-shadow:
      0 15px 35px rgba(0, 0, 0, 0.35),
      0 0 0 2px rgba(255, 255, 255, 0.2),
      inset 0 1px 2px rgba(255, 255, 255, 0.2);
    background: linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%);

    &::before {
      transform: rotate(45deg) translateX(100%);
    }

    &::after {
      bottom: -12px;
      left: 10%;
      right: 10%;
      height: 20px;
    }
  }

  &:active {
    transform: translateY(-1px) scale(1.01);
  }

  .button-icon {
    font-size: 20px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }

  .button-text {
    font-size: 16px;
    font-weight: 700;
  }

  &.gray-btn {
    background: linear-gradient(135deg, #636e72 0%, #4a4a4a 100%);
  }

  &.blue-btn {
    background: linear-gradient(135deg, #2980b9 0%, #1a5276 100%);
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 8px 20px rgba(41, 128, 185, 0.4);
  }
}

.sub-btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.result-stars-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin: 4px 0;
}

.result-star-big {
  font-size: 36px;
  color: #d1d5db;
  transition: color 0.3s;

  &.on {
    color: #fbbf24;
    text-shadow: 0 0 18px #fbbf24;
  }

  &.bounce {
    animation: starBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
}

.game-stats {
  width: 100%;
  margin: 4px 0;
}

.main-stat {
  background: linear-gradient(135deg, #fef9c3 0%, #fcd34d 50%, #f59e0b 100%);
  border: 3px solid rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-radius: 16px;
  box-shadow:
    0 8px 20px rgba(251, 191, 36, 0.28),
    inset 0 3px 0 rgba(255, 255, 255, 0.4);

  .stat-icon {
    font-size: 32px;
    animation: trophyWiggle 1.2s ease-in-out infinite;
  }

  .stat-info {
    flex: 1;
    text-align: left;

    .stat-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }

    .stat-value {
      display: block;
      font-size: 36px;
      font-weight: 900;
      color: #78350f;
    }

    .gold-text {
      color: #78350f;
      font-size: 36px;
      font-weight: 900;
      display: block;
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.88) 100%);
  padding: 14px 12px;
  border-radius: 14px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow:
    0 5px 12px rgba(0, 0, 0, 0.07),
    inset 0 2px 0 rgba(255, 255, 255, 1);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    transform: translateY(-3px) scale(1.04);
  }

  .stat-icon {
    font-size: 24px;
    margin-bottom: 6px;
    display: block;
  }

  .stat-info {
    display: block;

    .stat-label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .stat-value {
      display: block;
      font-size: 30px;
      font-weight: 900;
      color: #1e293b;
    }
  }
}

.new-achievements {
  width: 100%;
  background: rgba(255, 211, 42, 0.12);
  border: 1px solid rgba(255, 211, 42, 0.35);
  border-radius: 14px;
  padding: 8px 12px;
}

.ach-title {
  color: #d97706;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 4px;
}

.ach-item {
  color: #374151;
  font-size: 13px;
  margin: 2px 0;
}

.new-pets-wrap {
  width: 100%;
  text-align: center;
}

.pet-title {
  color: #7c3aed;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
}

.new-pets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.pet-card {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%);
  border-radius: 14px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  animation: petPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 2px solid rgba(168, 85, 247, 0.25);
}

.pet-emoji-big {
  font-size: 28px;
}

.pet-name {
  color: #374151;
  font-size: 11px;
  font-weight: 600;
}

.help-content {
  gap: 16px;
}

.game-controls {
  width: 100%;
}

.controls-title {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 18px 0;
  background: linear-gradient(135deg, #f472b6 0%, #a855f7 50%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: titleGradient 4s ease infinite;
  background-size: 200% 100%;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.control-item {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.88) 100%);
  padding: 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    transform: translateY(-3px);
  }

  .control-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  &.c-key {
    border-color: rgba(91, 205, 231, 0.5);
    background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
  }

  &.c-coin {
    border-color: rgba(251, 191, 36, 0.5);
    background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%);
  }

  &.c-safe {
    border-color: rgba(52, 211, 153, 0.5);
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  }

  &.c-combo {
    border-color: rgba(244, 114, 182, 0.5);
    background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
  }

  &.c-finger {
    border-color: rgba(168, 85, 247, 0.5);
    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
  }

  &.c-win {
    border-color: rgba(251, 191, 36, 0.5);
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  }
}

.help-fingers {
  width: 100%;
}

.hf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}

.hf-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.75);
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.hf-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.hf-name {
  color: #374151;
  font-size: 12px;
  font-weight: 600;
}

.fx-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 50;
}

.fx-particle {
  position: absolute;
  pointer-events: none;
  will-change: transform;
}

// ==================== 动画 ====================
@keyframes particleFloat {
  0%,
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  25% {
    opacity: 0.8;
    transform: translateY(-10px) scale(1.1);
  }
  50% {
    opacity: 0.6;
    transform: translateY(-5px) scale(0.95);
  }
  75% {
    opacity: 0.9;
    transform: translateY(-15px) scale(1.05);
  }
}

@keyframes borderGlow {
  0%,
  100% {
    background-position: 0% 50%;
    filter: brightness(1);
  }
  50% {
    background-position: 100% 50%;
    filter: brightness(1.2);
  }
}

@keyframes neonPulse {
  0%,
  100% {
    box-shadow:
      0 0 5px currentColor,
      0 0 10px currentColor,
      0 0 20px currentColor,
      0 0 40px currentColor;
  }
  50% {
    box-shadow:
      0 0 10px currentColor,
      0 0 20px currentColor,
      0 0 40px currentColor,
      0 0 80px currentColor;
  }
}

@keyframes floatUp {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-8px) rotate(2deg);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes rotate3d {
  0% {
    transform: perspective(1000px) rotateY(0deg);
  }
  100% {
    transform: perspective(1000px) rotateY(360deg);
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(-50px);
  }
  50% {
    transform: scale(1.05) translateY(5px);
  }
  70% {
    transform: scale(0.9) translateY(-3px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes slideInGlow {
  0% {
    opacity: 0;
    transform: translateX(-30px);
    filter: blur(10px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
    filter: blur(0);
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

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@keyframes keyPulse {
  0%,
  100% {
    box-shadow: 0 0 8px var(--fc);
  }
  50% {
    box-shadow: 0 0 18px var(--fc);
  }
}

@keyframes nextPulse {
  0%,
  100% {
    opacity: 1;
    transform: perspective(500px) rotateX(0deg) translateZ(20px) scale(1);
  }
  50% {
    opacity: 0.85;
    transform: perspective(500px) rotateX(0deg) translateZ(30px) scale(1.08);
  }
}

@keyframes letterGlow {
  0%,
  100% {
    text-shadow:
      0 0 10px currentColor,
      0 0 30px currentColor,
      0 0 60px currentColor,
      0 4px 8px rgba(0, 0, 0, 0.5);
    filter: brightness(1);
  }
  50% {
    text-shadow:
      0 0 20px currentColor,
      0 0 50px currentColor,
      0 0 100px currentColor,
      0 6px 12px rgba(0, 0, 0, 0.6);
    filter: brightness(1.3);
  }
}

@keyframes letterShake {
  0%,
  100% {
    transform: perspective(500px) rotateX(0deg) translateX(0);
  }
  20% {
    transform: perspective(500px) rotateX(0deg) translateX(-8px);
  }
  40% {
    transform: perspective(500px) rotateX(0deg) translateX(8px);
  }
  60% {
    transform: perspective(500px) rotateX(0deg) translateX(-4px);
  }
  80% {
    transform: perspective(500px) rotateX(0deg) translateX(4px);
  }
}

@keyframes shakeWarning {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-2px);
  }
  75% {
    transform: translateX(2px);
  }
}

@keyframes shakeDanger {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-3px);
  }
  75% {
    transform: translateX(3px);
  }
}

@keyframes errorShake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-6px);
  }
  60% {
    transform: translateX(6px);
  }
}

@keyframes errorFlash {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.5) saturate(1.5);
  }
}

@keyframes blockFloat {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-3px) rotate(1deg);
  }
}

@keyframes activePulse {
  0%,
  100% {
    box-shadow:
      0 0 15px rgba(255, 211, 42, 0.6),
      0 0 30px rgba(255, 211, 42, 0.3),
      0 10px 30px rgba(0, 0, 0, 0.3);
    transform: scale(1.1) translateY(-5px);
  }
  50% {
    box-shadow:
      0 0 20px rgba(255, 211, 42, 0.8),
      0 0 40px rgba(255, 211, 42, 0.4),
      0 12px 35px rgba(0, 0, 0, 0.35);
    transform: scale(1.12) translateY(-6px);
  }
}

@keyframes warningPulse {
  0%,
  100% {
    box-shadow: 0 0 10px rgba(255, 159, 67, 0.4);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 159, 67, 0.7);
  }
}

@keyframes dangerPulse {
  0%,
  100% {
    box-shadow: 0 0 12px rgba(255, 107, 107, 0.5);
    filter: brightness(1);
  }
  50% {
    box-shadow: 0 0 25px rgba(255, 107, 107, 0.8);
    filter: brightness(1.2);
  }
}

@keyframes successPop {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  50% {
    transform: scale(1.15);
    filter: brightness(1.3);
  }
  100% {
    transform: scale(1.1);
    filter: brightness(1.1);
  }
}

@keyframes comboExplosion {
  0% {
    opacity: 0;
    filter: blur(20px);
    scale: 0.3;
  }
  30% {
    opacity: 1;
    filter: blur(0);
    scale: 1.2;
  }
  60% {
    scale: 0.95;
  }
  100% {
    opacity: 1;
    filter: blur(0);
    scale: 1;
  }
}

@keyframes gradientShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes glowPulse {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

@keyframes starPop {
  from {
    transform: translateX(-50%) scale(0) translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) scale(1) translateY(0);
    opacity: 1;
  }
}

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

@keyframes effectTextFloat {
  0% {
    transform: translate(-50%, -50%) scale(0.6);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -150%) scale(1.1);
    opacity: 0;
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

@keyframes buttonShine {
  0% {
    left: -100%;
  }
  100% {
    left: 200%;
  }
}

@keyframes steveBounce {
  0%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-16px);
  }
  70% {
    transform: translateY(-6px);
  }
}

@keyframes starBounce {
  from {
    transform: scale(0) rotate(-30deg);
    opacity: 0;
  }
  to {
    transform: scale(1) rotate(0deg);
    opacity: 1;
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

@keyframes petPop {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
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
</style>
