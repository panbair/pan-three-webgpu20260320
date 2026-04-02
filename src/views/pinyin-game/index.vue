<template>
  <div class="pinyin-learning-container">
    <!-- 3D场景容器 -->
    <canvas ref="gameCanvas" class="game-canvas"></canvas>

    <!-- 游戏UI覆盖层 -->
    <div class="game-ui">
      <!-- 顶部导航栏 -->
      <div class="top-bar">
        <div class="game-title">
          <span class="title-icon">🎮</span>
          <span class="title-text">拼音方块小镇</span>
        </div>
        <div class="time-display">
          <span class="time-icon">⏰</span>
          <span class="time-value">{{ formatTime(timeLeft) }}</span>
        </div>
      </div>

      <!-- 左侧宠物状态面板 -->
      <div class="pet-panel">
        <div class="panel-header">
          <div class="header-icon">🐾</div>
          <div class="header-title">我的宠物</div>
        </div>

        <!-- 宠物信息 -->
        <div class="pet-info">
          <div class="pet-avatar" :class="pet.stage">
            <div class="pet-emoji">{{ pet.icon }}</div>
            <div class="pet-stage-badge">{{ pet.stageName }}</div>
          </div>
          <div class="pet-name">{{ pet.name }}</div>
        </div>

        <!-- 宠物属性 -->
        <div class="pet-stats">
          <div class="stat-item">
            <div class="stat-label">
              <span class="label-icon">🍞</span>
              <span>饥饿值</span>
            </div>
            <div class="stat-bar">
              <div class="stat-fill" :style="{ width: pet.hunger + '%' }"></div>
            </div>
            <div class="stat-value">{{ Math.round(pet.hunger) }}%</div>
          </div>

          <div class="stat-item">
            <div class="stat-label">
              <span class="label-icon">📚</span>
              <span>学习值</span>
            </div>
            <div class="stat-bar">
              <div class="stat-fill learning" :style="{ width: pet.learningPercent + '%' }"></div>
            </div>
            <div class="stat-value">{{ pet.learningPoints }}/{{ pet.nextLevelPoints }}</div>
          </div>

          <div class="stat-item">
            <div class="stat-label">
              <span class="label-icon">✨</span>
              <span>愉悦值</span>
            </div>
            <div class="stat-bar">
              <div class="stat-fill happy" :style="{ width: pet.happiness + '%' }"></div>
            </div>
            <div class="stat-value">{{ Math.round(pet.happiness) }}%</div>
          </div>
        </div>

        <!-- 宠物互动按钮 -->
        <div class="pet-actions">
          <button class="action-btn" @click="feedPet">
            <span class="btn-icon">🍖</span>
            <span>喂食</span>
          </button>
          <button class="action-btn" @click="playWithPet">
            <span class="btn-icon">🎾</span>
            <span>玩耍</span>
          </button>
          <button class="action-btn" @click="petFollow">
            <span class="btn-icon">🏃</span>
            <span>跟随</span>
          </button>
        </div>
      </div>

      <!-- 右侧学习进度面板 -->
      <div class="learning-panel">
        <div class="panel-header">
          <div class="header-icon">📖</div>
          <div class="header-title">学习进度</div>
        </div>

        <!-- 学习统计 -->
        <div class="learning-stats">
          <div class="stat-card">
            <div class="stat-icon">⭐</div>
            <div class="stat-content">
              <div class="stat-label">星星</div>
              <div class="stat-value">{{ stars }}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">🎯</div>
            <div class="stat-content">
              <div class="stat-label">已学</div>
              <div class="stat-value">{{ learnedCount }}/{{ totalCount }}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">🔥</div>
            <div class="stat-content">
              <div class="stat-label">连胜</div>
              <div class="stat-value">{{ streak }}</div>
            </div>
          </div>
        </div>

        <!-- 场景解锁进度 -->
        <div class="scene-progress">
          <div class="progress-label">场景解锁</div>
          <div class="scene-list">
            <div
              v-for="(scene, index) in scenes"
              :key="index"
              class="scene-item"
              :class="{ 'locked': !scene.unlocked, 'active': currentScene === index }"
              @click="changeScene(index)"
            >
              <div class="scene-icon">{{ scene.icon }}</div>
              <div class="scene-info">
                <div class="scene-name">{{ scene.name }}</div>
                <div class="scene-desc">{{ scene.desc }}</div>
              </div>
              <div v-if="!scene.unlocked" class="scene-lock">🔒</div>
            </div>
          </div>
        </div>

        <!-- 学习阶段 -->
        <div class="learning-stage">
          <div class="stage-label">当前阶段</div>
          <div class="stage-indicator">
            <div
              v-for="(stage, index) in learningStages"
              :key="index"
              class="stage-item"
              :class="{ 'active': currentStage === index, 'completed': currentStage > index }"
            >
              <div class="stage-icon">{{ stage.icon }}</div>
              <div class="stage-text">{{ stage.name }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中央学习区域 - 无需打字，点击和拖拽 -->
      <div class="learning-area" v-if="gameState === 'playing'">
        <!-- 声母阶段：点击收集拼音方块 -->
        <div v-if="currentStage === 0" class="stage-game initial-stage">
          <div class="game-instruction">点击拼音方块，收集声母！</div>
          <div class="pinyin-blocks-grid">
            <div
              v-for="(block, index) in currentPinyinBlocks"
              :key="index"
              class="pinyin-block-card"
              :class="{ 'collected': block.collected, 'correct': showCorrect && block.isCorrect }"
              @click="collectBlock(block)"
            >
              <div class="block-emoji">{{ block.emoji }}</div>
              <div class="block-pinyin">{{ block.pinyin }}</div>
              <div class="block-hanzi">{{ block.hanzi }}</div>
              <div v-if="block.collected" class="collected-mark">✓</div>
            </div>
          </div>
          <div class="collection-progress">
            <div class="progress-text">已收集: {{ collectedBlocks }} / {{ currentPinyinBlocks.length }}</div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (collectedBlocks / currentPinyinBlocks.length) * 100 + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- 韵母阶段：拖拽配对 -->
        <div v-if="currentStage === 1" class="stage-game match-stage">
          <div class="game-instruction">拖拽声母和韵母拼在一起！</div>
          <div class="match-area">
            <div class="drag-zone initial-zone">
              <div class="zone-label">声母</div>
              <div class="drag-items">
                <div
                  v-for="(item, index) in initialItems"
                  :key="index"
                  class="drag-item initial-item"
                  :class="{ 'dragging': draggingItem === item }"
                  draggable="true"
                  @dragstart="handleDragStart(item, $event)"
                  @dragend="handleDragEnd"
                >
                  <div class="item-text">{{ item.text }}</div>
                  <div class="item-emoji">{{ item.emoji }}</div>
                </div>
              </div>
            </div>

            <div class="drop-zone final-zone">
              <div class="zone-label">拖到这里拼读</div>
              <div class="drop-area" @dragover.prevent @drop="handleDrop">
                <div v-if="matchedItems.length === 0" class="drop-placeholder">🎯 把声母拖到这里</div>
                <div
                  v-for="(item, index) in matchedItems"
                  :key="index"
                  class="matched-item"
                  @click="removeMatchedItem(index)"
                >
                  <div class="matched-text">{{ item.initial }}{{ item.final }}</div>
                  <div class="matched-emoji">{{ item.emoji }}</div>
                  <div class="remove-hint">点击移除</div>
                </div>
              </div>
            </div>

            <div class="drag-zone final-zone">
              <div class="zone-label">韵母</div>
              <div class="drag-items">
                <div
                  v-for="(item, index) in finalItems"
                  :key="index"
                  class="drag-item final-item"
                  :class="{ 'dragging': draggingItem === item }"
                  draggable="true"
                  @dragstart="handleDragStart(item, $event)"
                  @dragend="handleDragEnd"
                >
                  <div class="item-text">{{ item.text }}</div>
                  <div class="item-emoji">{{ item.emoji }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 音节阶段：卡片翻牌配对 -->
        <div v-if="currentStage === 2" class="stage-game card-match-stage">
          <div class="game-instruction">翻牌配对，找出正确的拼音和汉字！</div>
          <div class="card-grid">
            <div
              v-for="(card, index) in flipCards"
              :key="index"
              class="flip-card"
              :class="{ 'flipped': card.flipped, 'matched': card.matched }"
              @click="flipCard(index)"
            >
              <div class="card-inner">
                <div class="card-front">
                  <div class="card-back-emoji">❓</div>
                </div>
                <div class="card-back">
                  <div v-if="card.type === 'pinyin'" class="card-content pinyin-type">
                    <div class="card-emoji">{{ card.emoji }}</div>
                    <div class="card-text">{{ card.text }}</div>
                  </div>
                  <div v-else class="card-content hanzi-type">
                    <div class="card-emoji">{{ card.emoji }}</div>
                    <div class="card-text">{{ card.text }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 反馈信息 -->
      <div class="feedback-message" :class="feedbackClass" v-if="feedbackText">
        <span class="feedback-icon">{{ feedbackIcon }}</span>
        <span class="feedback-text">{{ feedbackText }}</span>
      </div>

      <!-- 游戏控制按钮 -->
      <div class="control-buttons">
        <button class="control-btn help-btn" @click="showHelp">
          <span class="btn-icon">❓</span>
          <span>帮助</span>
        </button>
        <button class="control-btn settings-btn" @click="showSettings">
          <span class="btn-icon">⚙️</span>
          <span>设置</span>
        </button>
        <button class="control-btn back-btn" @click="goBack">
          <span class="btn-icon">🏠</span>
          <span>返回</span>
        </button>
      </div>
    </div>

    <!-- 开始界面 -->
    <div v-if="gameState === 'ready'" class="start-screen">
      <div class="start-content">
        <div class="game-logo">
          <div class="logo-emoji">🎮</div>
          <h1 class="logo-title">拼音方块小镇</h1>
          <p class="logo-subtitle">我的世界 · 拼音养成</p>
        </div>

        <!-- 宠物选择 -->
        <div class="pet-selection">
          <h3 class="selection-title">选择你的宠物伙伴</h3>
          <div class="pet-options">
            <div
              v-for="(petOption, index) in petOptions"
              :key="index"
              class="pet-option"
              :class="{ 'selected': selectedPet === index }"
              @click="selectPet(index)"
            >
              <div class="pet-option-icon">{{ petOption.icon }}</div>
              <div class="pet-option-info">
                <div class="pet-option-name">{{ petOption.name }}</div>
                <div class="pet-option-desc">{{ petOption.desc }}</div>
                <div class="pet-option-features">
                  <span v-for="feature in petOption.features" :key="feature" class="feature-tag">
                    {{ feature }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button class="start-btn" @click="startGame">
          <span class="btn-icon">▶</span>
          <span>开始冒险</span>
        </button>
        <button class="back-btn" @click="goBack">
          <span class="btn-icon">🏠</span>
          <span>返回首页</span>
        </button>
      </div>
    </div>

    <!-- 帮助弹窗 -->
    <div v-if="showHelpModal" class="modal-overlay" @click="showHelpModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>📖 学习指南</h3>
          <button class="close-btn" @click="showHelpModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="help-section">
            <h4>🎯 怎么玩?</h4>
            <p><strong>第一阶段 - 声母收集:</strong></p>
            <p>• 点击屏幕上的拼音方块进行收集</p>
            <p>• 收集所有声母方块即可过关</p>
            <p><strong>第二阶段 - 拖拽拼读:</strong></p>
            <p>• 将声母拖拽到中间区域</p>
            <p>• 再将韵母拖拽过去完成拼读</p>
            <p><strong>第三阶段 - 翻牌配对:</strong></p>
            <p>• 翻开卡片，找出对应的拼音和汉字</p>
            <p>• 每次翻开两张，配对成功则消除</p>
          </div>
          <div class="help-section">
            <h4>🐾 宠物养成</h4>
            <p>• 喂食拼音道具提升饥饿值</p>
            <p>• 完成学习任务增加学习值</p>
            <p>• 和宠物玩耍提升愉悦值</p>
            <p>• 学习值满格可升级宠物</p>
          </div>
          <div class="help-section">
            <h4>⭐ 获得星星</h4>
            <p>• 收集拼音方块 = 1颗星星</p>
            <p>• 完成拼读 = 2颗星星</p>
            <p>• 配对成功 = 1颗星星</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置弹窗 -->
    <div v-if="showSettingsModal" class="modal-overlay" @click="showSettingsModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>⚙️ 设置</h3>
          <button class="close-btn" @click="showSettingsModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="setting-item">
            <label>音效</label>
            <button class="toggle-btn" :class="{ 'on': soundEnabled }" @click="soundEnabled = !soundEnabled">
              {{ soundEnabled ? '🔊' : '🔇' }}
            </button>
          </div>
          <div class="setting-item">
            <label>动画</label>
            <button class="toggle-btn" :class="{ 'on': animationEnabled }" @click="animationEnabled = !animationEnabled">
              {{ animationEnabled ? '✅' : '❌' }}
            </button>
          </div>
          <div class="setting-item">
            <label>游戏时长</label>
            <select v-model="gameDuration" class="duration-select">
              <option :value="15">15分钟</option>
              <option :value="30">30分钟</option>
              <option :value="45">45分钟</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { useRouter } from 'vue-router'

const router = useRouter()

// 游戏状态
const gameState = ref('ready') // ready, playing, paused
const timeLeft = ref(15 * 60) // 15分钟(秒)
const gameDuration = ref(15) // 游戏时长(分钟)
const timerInterval = ref(null)

// 学习数据
const stars = ref(0)
const learnedCount = ref(0)
const streak = ref(0)
const totalCount = ref(50) // 总学习数量

// 反馈
const showCorrect = ref(false)
const showWrong = ref(false)
const feedbackClass = ref('')
const feedbackIcon = ref('')
const feedbackText = ref('')

// 宠物数据
const pet = ref({
  name: '',
  icon: '',
  stage: '幼年期',
  stageName: '幼年期',
  hunger: 80,
  happiness: 90,
  learningPoints: 0,
  nextLevelPoints: 50,
  learningPercent: 0,
  isFollowing: false
})

const selectedPet = ref(0)

const petOptions = [
  {
    name: '小狼',
    icon: '🐺',
    desc: '声母小助手 - 适合初学者',
    features: ['🦴 声母专家', '🐕 忠诚伙伴', '🎯 精准引导']
  },
  {
    name: '小熊猫',
    icon: '🐼',
    desc: '韵母小搭档 - 温柔耐心',
    features: ['🎋 韵母达人', '🥰 温柔陪伴', '🌟 慢节奏']
  },
  {
    name: '小狐狸',
    icon: '🦊',
    desc: '音节小帮手 - 活泼好动',
    features: ['🍇 音节专家', '🏃 快速探索', '🎮 互动丰富']
  }
]

// 场景数据
const scenes = ref([
  { icon: '🌱', name: '草地拼音区', desc: '声母入门', unlocked: true },
  { icon: '🌲', name: '森林拼读区', desc: '韵母入门', unlocked: false },
  { icon: '⛏️', name: '矿洞音节区', desc: '三拼练习', unlocked: false }
])
const currentScene = ref(0)

// 学习阶段
const learningStages = ref([
  { icon: '🔤', name: '声母' },
  { icon: '🅰️', name: '韵母' },
  { icon: '📝', name: '音节' }
])
const currentStage = ref(0)

// 第一阶段：拼音方块数据
const currentPinyinBlocks = ref([])
const collectedBlocks = ref(0)

const initialPinyinData = [
  { pinyin: 'b', hanzi: '玻', emoji: '🔵', collected: false, isCorrect: true },
  { pinyin: 'p', hanzi: '坡', emoji: '🟣', collected: false, isCorrect: true },
  { pinyin: 'm', hanzi: '摸', emoji: '🟡', collected: false, isCorrect: true },
  { pinyin: 'f', hanzi: '佛', emoji: '🟢', collected: false, isCorrect: true },
  { pinyin: 'd', hanzi: '得', emoji: '🔴', collected: false, isCorrect: true },
  { pinyin: 't', hanzi: '特', emoji: '🟠', collected: false, isCorrect: true },
  { pinyin: 'n', hanzi: '讷', emoji: '🟤', collected: false, isCorrect: true },
  { pinyin: 'l', hanzi: '勒', emoji: '⚪', collected: false, isCorrect: true }
]

// 第二阶段：拖拽拼读数据
const initialItems = ref([
  { text: 'b', emoji: '🔵', type: 'initial' },
  { text: 'p', emoji: '🟣', type: 'initial' },
  { text: 'm', emoji: '🟡', type: 'initial' },
  { text: 'f', emoji: '🟢', type: 'initial' },
  { text: 'd', emoji: '🔴', type: 'initial' },
  { text: 't', emoji: '🟠', type: 'initial' }
])

const finalItems = ref([
  { text: 'a', emoji: '🍎', type: 'final' },
  { text: 'o', emoji: '🥚', type: 'final' },
  { text: 'e', emoji: '🥚', type: 'final' },
  { text: 'i', emoji: '🍓', type: 'final' },
  { text: 'u', emoji: '🍇', type: 'final' },
  { text: 'ü', emoji: '🍊', type: 'final' }
])

const matchedItems = ref([])
const draggingItem = ref(null)

// 第三阶段：翻牌数据
const flipCards = ref([])
const flippedCards = ref([])
const matchedPairs = ref(0)

// 设置
const soundEnabled = ref(true)
const animationEnabled = ref(true)
const showHelpModal = ref(false)
const showSettingsModal = ref(false)

// 语音合成
let speechSynthesis = window.speechSynthesis

// Three.js 相关
let scene = null
let camera = null
let renderer = null
let animationId = null

// 游戏对象
const blocks = []
const petMesh = null

// 拼音映射表（声母读音）
const pinyinInitialMap = {
  'b': '玻',
  'p': '坡',
  'm': '摸',
  'f': '佛',
  'd': '得',
  't': '特',
  'n': '讷',
  'l': '勒',
  'g': '哥',
  'k': '科',
  'h': '喝',
  'j': '基',
  'q': '欺',
  'x': '希',
  'zh': '知',
  'ch': '吃',
  'sh': '诗',
  'r': '日',
  'z': '资',
  'c': '雌',
  's': '思',
  'y': '衣',
  'w': '乌'
}

// 韵母映射表
const pinyinFinalMap = {
  'a': '阿',
  'o': '喔',
  'e': '鹅',
  'i': '衣',
  'u': '乌',
  'ü': '迂',
  'ai': '哀',
  'ei': '诶',
  'ui': '威',
  'ao': '奥',
  'ou': '欧',
  'iu': '优',
  'ie': '耶',
  'üe': '约',
  'er': '儿',
  'an': '安',
  'en': '恩',
  'in': '因',
  'un': '温',
  'ün': '晕',
  'ang': '昂',
  'eng': '亨',
  'ing': '英',
  'ong': '轰'
}

// 将拼音转换为可发音的汉字
const pinyinToHanzi = (pinyin) => {
  // 检查是否是带声调的拼音（如 bā, mā）
  if (/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(pinyin)) {
    // 已是完整拼音，尝试查找常用汉字
    const commonHanzi = {
      'bā': '八', 'bá': '拔', 'bǎ': '把', 'bà': '爸',
      'mā': '妈', 'má': '麻', 'mǎ': '马', 'mà': '骂',
      'nǐ': '你', 'hǎo': '好', 'dà': '大', 'xiǎo': '小',
      'wǒ': '我', 'tā': '他', 'shì': '是', 'de': '的'
    }
    return commonHanzi[pinyin] || pinyin
  }

  // 检查是否是声母
  if (pinyinInitialMap[pinyin]) {
    return pinyinInitialMap[pinyin]
  }

  // 检查是否是韵母
  if (pinyinFinalMap[pinyin]) {
    return pinyinFinalMap[pinyin]
  }

  // 尝试解析为声母+韵母的组合
  for (const [initial, initialHanzi] of Object.entries(pinyinInitialMap)) {
    if (pinyin.startsWith(initial)) {
      const final = pinyin.slice(initial.length)
      if (pinyinFinalMap[final]) {
        return initialHanzi + pinyinFinalMap[final]
      }
    }
  }

  // 无法转换，直接返回原拼音
  return pinyin
}

// 播放拼音发音
const playPinyinSound = (pinyin) => {
  if (!soundEnabled.value || !speechSynthesis) return

  // 将拼音转换为可发音的汉字
  const pronounceText = pinyinToHanzi(pinyin)

  // 取消当前正在播放的语音
  speechSynthesis.cancel()

  // 创建新的语音实例
  const utterance = new SpeechSynthesisUtterance(pronounceText)
  utterance.lang = 'zh-CN' // 中文
  utterance.rate = 0.8 // 语速稍慢，适合儿童
  utterance.pitch = 1.2 // 音调稍高，更亲切
  utterance.volume = 1.0 // 音量

  speechSynthesis.speak(utterance)
}

// 播放汉字发音
const playHanziSound = (hanzi) => {
  if (!soundEnabled.value || !speechSynthesis) return

  speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(hanzi)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.8
  utterance.pitch = 1.2
  utterance.volume = 1.0

  speechSynthesis.speak(utterance)
}

// 格式化时间
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 选择宠物
const selectPet = (index) => {
  selectedPet.value = index
}

// 开始游戏
const startGame = () => {
  const selectedPetOption = petOptions[selectedPet.value]
  pet.value.name = selectedPetOption.name
  pet.value.icon = selectedPetOption.icon

  gameState.value = 'playing'
  timeLeft.value = gameDuration.value * 60

  init3DScene()
  startTimer()
  initStageGame()
}

// 初始化当前阶段的游戏
const initStageGame = () => {
  if (currentStage.value === 0) {
    // 声母收集阶段
    currentPinyinBlocks.value = JSON.parse(JSON.stringify(initialPinyinData))
    collectedBlocks.value = 0
  } else if (currentStage.value === 1) {
    // 拖拽拼读阶段
    matchedItems.value = []
  } else if (currentStage.value === 2) {
    // 翻牌配对阶段
    initFlipCards()
  }
}

// 初始化3D场景
const init3DScene = () => {
  const canvas = document.querySelector('.game-canvas')
  if (!canvas) return

  const width = window.innerWidth
  const height = window.innerHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87CEEB) // 天空蓝背景

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.set(0, 5, 15)
  camera.lookAt(0, 3, 0)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))

  // 光照
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(10, 10, 5)
  scene.add(directionalLight)

  // 创建MC风格地面
  createMCGround()

  // 创建宠物
  createPet()

  // 开始动画循环
  animate()
}

// 创建MC风格地面
const createMCGround = () => {
  // 草地地面
  const grassGeometry = new THREE.BoxGeometry(30, 1, 30)
  const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50 })
  const grass = new THREE.Mesh(grassGeometry, grassMaterial)
  grass.position.y = -0.5
  grass.receiveShadow = true
  scene.add(grass)

  // 泥土层
  const dirtGeometry = new THREE.BoxGeometry(30, 2, 30)
  const dirtMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 })
  const dirt = new THREE.Mesh(dirtGeometry, dirtMaterial)
  dirt.position.y = -2
  scene.add(dirt)

  // 添加一些方块装饰
  for (let i = 0; i < 20; i++) {
    const size = 0.5 + Math.random() * 0.5
    const geometry = new THREE.BoxGeometry(size, size, size)
    const material = new THREE.MeshStandardMaterial({
      color: [0x4CAF50, 0x8BC34A, 0xCDDC39, 0xFFEB3B, 0xFF9800, 0xF44336][Math.floor(Math.random() * 6)]
    })
    const block = new THREE.Mesh(geometry, material)
    block.position.set(
      (Math.random() - 0.5) * 20,
      size / 2,
      (Math.random() - 0.5) * 20
    )
    block.rotation.y = Math.random() * Math.PI
    scene.add(block)
    blocks.push(block)
  }
}

// 创建宠物
const createPet = () => {
  const petGroup = new THREE.Group()

  // 身体
  const bodyGeometry = new THREE.BoxGeometry(1, 1, 1)
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.y = 0.5
  petGroup.add(body)

  // 头
  const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8)
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF })
  const head = new THREE.Mesh(headGeometry, headMaterial)
  head.position.y = 1.4
  petGroup.add(head)

  // 眼睛
  const eyeGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15)
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 })
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  leftEye.position.set(-0.2, 1.5, 0.4)
  petGroup.add(leftEye)

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  rightEye.position.set(0.2, 1.5, 0.4)
  petGroup.add(rightEye)

  // 鼻子
  const noseGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1)
  const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA500 })
  const nose = new THREE.Mesh(noseGeometry, noseMaterial)
  nose.position.set(0, 1.3, 0.45)
  petGroup.add(nose)

  // 耳朵
  const earGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.2)
  const earMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA500 })
  const leftEar = new THREE.Mesh(earGeometry, earMaterial)
  leftEar.position.set(-0.3, 1.9, 0)
  petGroup.add(leftEar)

  const rightEar = new THREE.Mesh(earGeometry, earMaterial)
  rightEar.position.set(0.3, 1.9, 0)
  petGroup.add(rightEar)

  petGroup.position.set(-5, 0, 5)
  scene.add(petGroup)
}

// 动画循环
const animate = () => {
  animationId = requestAnimationFrame(animate)

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

// 开始计时器
const startTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }

  timerInterval.value = setInterval(() => {
    if (gameState.value === 'playing') {
      timeLeft.value -= 1

      // 宠物属性衰减
      pet.value.hunger = Math.max(0, pet.value.hunger - 0.01)
      pet.value.happiness = Math.max(0, pet.value.happiness - 0.005)

      if (timeLeft.value <= 0) {
        endGame()
      }
    }
  }, 1000)
}

// 第一阶段：收集拼音方块
const collectBlock = (block) => {
  if (block.collected) return

  // 播放拼音和汉字发音
  playPinyinSound(block.pinyin)
  setTimeout(() => playHanziSound(block.hanzi), 500)

  block.collected = true
  collectedBlocks.value++

  showCorrect.value = true
  feedbackClass.value = 'correct'
  feedbackIcon.value = '✅'
  feedbackText.value = `收集了 ${block.pinyin}！`

  stars.value += 1
  streak.value += 1
  learnedCount.value += 1

  // 增加学习值
  pet.value.learningPoints += 2
  updatePetLevel()

  // 增加愉悦值
  pet.value.happiness = Math.min(100, pet.value.happiness + 5)

  setTimeout(() => {
    showCorrect.value = false
    feedbackText.value = ''

    // 检查是否全部收集完成
    if (collectedBlocks.value >= currentPinyinBlocks.value.length) {
      showFeedback('恭喜！全部收集完成！即将进入下一阶段...', '🎉', 'correct')
      setTimeout(() => {
        nextStage()
      }, 2000)
    }
  }, 1000)
}

// 第二阶段：拖拽处理
const handleDragStart = (item, event) => {
  draggingItem.value = item
  event.dataTransfer.effectAllowed = 'move'
}

const handleDragEnd = () => {
  draggingItem.value = null
}

const handleDrop = () => {
  if (!draggingItem.value) return

  if (draggingItem.value.type === 'initial') {
    // 拖入声母
    if (matchedItems.value.length === 0 || matchedItems.value[matchedItems.value.length - 1].final) {
      // 播放声母发音
      playPinyinSound(draggingItem.value.text)

      matchedItems.value.push({
        initial: draggingItem.value.text,
        final: '',
        emoji: draggingItem.value.emoji
      })
      showFeedback(`声母 ${draggingItem.value.text} 拖入成功！`, '✅', 'correct')
    } else {
      showFeedback('请先拖入韵母！', '⚠️', 'wrong')
    }
  } else if (draggingItem.value.type === 'final') {
    // 拖入韵母
    if (matchedItems.value.length > 0 && !matchedItems.value[matchedItems.value.length - 1].final) {
      matchedItems.value[matchedItems.value.length - 1].final = draggingItem.value.text
      const matchedItem = matchedItems.value[matchedItems.value.length - 1]

      // 播放完整音节发音
      playPinyinSound(matchedItem.initial + matchedItem.final)

      showFeedback(`拼读成功：${matchedItem.initial}${matchedItem.final}！`, '🎉', 'correct')

      stars.value += 2
      streak.value += 1
      learnedCount.value += 1
      pet.value.learningPoints += 3
      updatePetLevel()

      // 检查是否完成所有拼读
      if (matchedItems.value.length >= 6) {
        setTimeout(() => {
          nextStage()
        }, 1500)
      }
    } else {
      showFeedback('请先拖入声母！', '⚠️', 'wrong')
    }
  }
}

const removeMatchedItem = (index) => {
  matchedItems.value.splice(index, 1)
}

// 第三阶段：初始化翻牌
const initFlipCards = () => {
  const cardPairs = [
    { pinyin: 'bā', hanzi: '八', emoji: '🍎' },
    { pinyin: 'mā', hanzi: '妈', emoji: '👩' },
    { pinyin: 'bà', hanzi: '爸', emoji: '👨' },
    { pinyin: 'nǐ', hanzi: '你', emoji: '👋' },
    { pinyin: 'wǒ', hanzi: '我', emoji: '🙋' },
    { pinyin: 'tā', hanzi: '他', emoji: '👤' },
    { pinyin: 'hǎo', hanzi: '好', emoji: '👍' },
    { pinyin: 'dà', hanzi: '大', emoji: '🔴' }
  ]

  let cards = []
  cardPairs.forEach((pair, index) => {
    // 拼音卡片
    cards.push({
      id: index * 2,
      type: 'pinyin',
      text: pair.pinyin,
      emoji: pair.emoji,
      pairId: index,
      flipped: false,
      matched: false
    })
    // 汉字卡片
    cards.push({
      id: index * 2 + 1,
      type: 'hanzi',
      text: pair.hanzi,
      emoji: pair.emoji,
      pairId: index,
      flipped: false,
      matched: false
    })
  })

  // 洗牌
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }

  flipCards.value = cards
  matchedPairs.value = 0
}

// 翻牌
const flipCard = (index) => {
  const card = flipCards.value[index]

  if (card.flipped || card.matched || flippedCards.value.length >= 2) return

  // 播放翻开的发音
  playPinyinSound(card.text)

  card.flipped = true
  flippedCards.value.push(index)

  if (flippedCards.value.length === 2) {
    const [firstIndex, secondIndex] = flippedCards.value
    const firstCard = flipCards.value[firstIndex]
    const secondCard = flipCards.value[secondIndex]

    if (firstCard.pairId === secondCard.pairId) {
      // 配对成功
      firstCard.matched = true
      secondCard.matched = true
      matchedPairs.value++

      stars.value += 1
      streak.value += 1
      learnedCount.value += 1
      pet.value.learningPoints += 2
      updatePetLevel()

      showFeedback('配对成功！', '✅', 'correct')
      flippedCards.value = []

      // 检查是否全部配对完成
      if (matchedPairs.value >= flipCards.value.length / 2) {
        setTimeout(() => {
          showFeedback('恭喜！全部配对完成！', '🎉', 'correct')
          setTimeout(() => {
            // 游戏完成
            gameState.value = 'paused'
          }, 2000)
        }, 1000)
      }
    } else {
      // 配对失败
      setTimeout(() => {
        firstCard.flipped = false
        secondCard.flipped = false
        flippedCards.value = []
        streak.value = 0
        showFeedback('再试一次！', '❌', 'wrong')
      }, 1000)
    }
  }
}

// 显示反馈
const showFeedback = (text, icon, type) => {
  feedbackText.value = text
  feedbackIcon.value = icon
  feedbackClass.value = type

  setTimeout(() => {
    feedbackText.value = ''
  }, 2000)
}

// 下一阶段
const nextStage = () => {
  currentStage.value++

  // 解锁场景
  if (currentStage.value === 1) {
    scenes.value[1].unlocked = true
  } else if (currentStage.value === 2) {
    scenes.value[2].unlocked = true
  }

  initStageGame()
  currentScene.value = currentStage.value
}

// 切换场景
const changeScene = (index) => {
  if (!scenes.value[index].unlocked) return

  currentScene.value = index
  currentStage.value = index
  initStageGame()
}

// 更新宠物等级
const updatePetLevel = () => {
  pet.value.learningPercent = (pet.value.learningPoints / pet.value.nextLevelPoints) * 100

  if (pet.value.learningPoints >= pet.value.nextLevelPoints) {
    pet.value.learningPoints = 0
    pet.value.nextLevelPoints = Math.floor(pet.value.nextLevelPoints * 1.5)

    if (pet.value.stage === '幼年期') {
      pet.value.stage = '少年期'
      pet.value.stageName = '少年期'
    } else if (pet.value.stage === '少年期') {
      pet.value.stage = '青年期'
      pet.value.stageName = '青年期'
    } else if (pet.value.stage === '青年期') {
      pet.value.stage = '成年期'
      pet.value.stageName = '成年期'
    }
  }
}

// 宠物互动
const feedPet = () => {
  pet.value.hunger = Math.min(100, pet.value.hunger + 20)
  pet.value.learningPoints += 1
  updatePetLevel()
  showFeedback('喂食成功！饥饿值+20', '🍖', 'correct')
  // 播放可爱的声音
  playPinyinSound('好吃')
}

const playWithPet = () => {
  pet.value.happiness = Math.min(100, pet.value.happiness + 15)
  showFeedback('和宠物玩得很开心！愉悦值+15', '🎾', 'correct')
  // 播放开心的声音
  playPinyinSound('开心')
}

const petFollow = () => {
  pet.value.isFollowing = !pet.value.isFollowing
  showFeedback(pet.value.isFollowing ? '宠物开始跟随' : '宠物停止跟随', '🏃', 'correct')
}

// 显示帮助
const showHelp = () => {
  showHelpModal.value = true
}

// 显示设置
const showSettings = () => {
  showSettingsModal.value = true
}

// 返回首页
const goBack = () => {
  router.push('/')
}

// 结束游戏
const endGame = () => {
  gameState.value = 'paused'

  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

// 窗口大小调整
const handleResize = () => {
  if (!camera || !renderer) return

  const width = window.innerWidth
  const height = window.innerHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

// 生命周期
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }

  // 停止语音播放
  if (speechSynthesis) {
    speechSynthesis.cancel()
  }

  window.removeEventListener('resize', handleResize)

  if (renderer) {
    renderer.dispose()
  }

  if (scene) {
    scene.traverse(object => {
      if (object.isMesh) {
        if (object.geometry) object.geometry.dispose()
        if (object.material) object.material.dispose()
      }
    })
  }
})
</script>

<style scoped>
.pinyin-learning-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.game-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
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

/* 顶部导航栏 */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.4) 100%);
  backdrop-filter: blur(10px);
  pointer-events: auto;
  z-index: 100;
}

.game-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 28px;
}

.title-text {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.time-display {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.time-icon {
  font-size: 20px;
}

.time-value {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  font-family: monospace;
}

/* 左侧宠物面板 */
.pet-panel {
  position: absolute;
  top: 80px;
  left: 20px;
  width: 280px;
  background: linear-gradient(135deg, rgba(168, 224, 99, 0.9) 0%, rgba(39, 174, 96, 0.9) 100%);
  border-radius: 20px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 3px solid rgba(255, 255, 255, 0.3);
  pointer-events: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
}

.header-icon {
  font-size: 24px;
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

.pet-info {
  text-align: center;
  margin-bottom: 20px;
}

.pet-avatar {
  width: 80px;
  height: 80px;
  margin: 0 auto 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 3px solid rgba(255, 255, 255, 0.5);
}

.pet-emoji {
  font-size: 40px;
}

.pet-stage-badge {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  color: #27ae60;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.pet-name {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

.pet-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.label-icon {
  font-size: 16px;
}

.stat-bar {
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  background: #4CAF50;
  border-radius: 5px;
  transition: width 0.3s ease;
}

.stat-fill.learning {
  background: #2196F3;
}

.stat-fill.happy {
  background: #FF9800;
}

.stat-value {
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.pet-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 10px 5px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.action-btn .btn-icon {
  font-size: 20px;
}

/* 右侧学习面板 */
.learning-panel {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 280px;
  background: linear-gradient(135deg, rgba(255, 154, 158, 0.9) 0%, rgba(233, 30, 99, 0.9) 100%);
  border-radius: 20px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 3px solid rgba(255, 255, 255, 0.3);
  pointer-events: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.learning-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 10px;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.stat-card .stat-icon {
  font-size: 24px;
  margin-bottom: 5px;
}

.stat-card .stat-label {
  font-size: 10px;
  color: #fff;
  font-weight: 600;
}

.stat-card .stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

.scene-progress {
  margin-bottom: 20px;
}

.progress-label {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 10px;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

.scene-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scene-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  position: relative;
  cursor: pointer;
  pointer-events: auto;
}

.scene-item.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.scene-item.active {
  background: rgba(255, 255, 255, 0.4);
  border-color: #fff;
}

.scene-icon {
  font-size: 24px;
}

.scene-info {
  flex: 1;
}

.scene-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.scene-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

.scene-lock {
  font-size: 16px;
}

.learning-stage {
  margin-bottom: 20px;
}

.stage-label {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 10px;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

.stage-indicator {
  display: flex;
  gap: 8px;
}

.stage-item {
  flex: 1;
  padding: 8px 5px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.stage-item.active {
  background: rgba(255, 255, 255, 0.4);
  border-color: #fff;
  transform: scale(1.1);
}

.stage-item.completed {
  opacity: 0.6;
}

.stage-icon {
  font-size: 18px;
}

.stage-text {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  margin-top: 3px;
}

/* 中央学习区域 */
.learning-area {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 640px);
  min-width: 400px;
  max-width: 600px;
  pointer-events: none;
  z-index: 50;
}

.stage-game {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  border: 3px solid rgba(168, 224, 99, 0.5);
}

.game-instruction {
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #a8e063 0%, #56ab2f 100%);
  border-radius: 15px;
  color: #fff;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

/* 第一阶段：拼音方块网格 */
.pinyin-blocks-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.pinyin-block-card {
  background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
  border: 3px solid #ddd;
  border-radius: 15px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.pinyin-block-card:hover:not(.collected) {
  transform: translateY(-5px) scale(1.05);
  border-color: #a8e063;
  box-shadow: 0 8px 16px rgba(168, 224, 99, 0.4);
}

.pinyin-block-card.collected {
  background: rgba(168, 224, 99, 0.3);
  border-color: #a8e063;
  cursor: default;
  opacity: 0.6;
}

.pinyin-block-card.correct {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.2);
  animation: pulse 0.5s ease;
}

.block-emoji {
  font-size: 48px;
  margin-bottom: 10px;
}

.block-pinyin {
  font-size: 32px;
  font-weight: 700;
  color: #333;
  margin-bottom: 5px;
}

.block-hanzi {
  font-size: 24px;
  font-weight: 700;
  color: #666;
}

.collected-mark {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 30px;
  height: 30px;
  background: #4CAF50;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
}

/* 收集进度 */
.collection-progress {
  text-align: center;
  padding: 15px;
  background: rgba(168, 224, 99, 0.2);
  border-radius: 15px;
}

.progress-text {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid rgba(168, 224, 99, 0.5);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #a8e063 0%, #56ab2f 100%);
  border-radius: 10px;
  transition: width 0.5s ease;
}

/* 第二阶段：拖拽配对 */
.match-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.drag-zone {
  background: rgba(168, 224, 99, 0.1);
  border: 3px solid rgba(168, 224, 99, 0.3);
  border-radius: 15px;
  padding: 15px;
}

.zone-label {
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: #56ab2f;
  margin-bottom: 15px;
}

.drag-items {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.drag-item {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
  border: 3px solid #ddd;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: grab;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.drag-item:hover {
  transform: scale(1.1);
  border-color: #a8e063;
  box-shadow: 0 8px 16px rgba(168, 224, 99, 0.4);
}

.drag-item.dragging {
  opacity: 0.5;
  transform: scale(1.2);
}

.drag-item .item-text {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.drag-item .item-emoji {
  font-size: 24px;
}

.drop-zone {
  min-height: 120px;
}

.drop-area {
  min-height: 120px;
  background: rgba(168, 224, 99, 0.2);
  border: 3px dashed rgba(168, 224, 99, 0.5);
  border-radius: 15px;
  padding: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

.drop-placeholder {
  font-size: 18px;
  color: #999;
  font-weight: 600;
}

.matched-item {
  background: linear-gradient(135deg, #a8e063 0%, #56ab2f 100%);
  border: 3px solid #56ab2f;
  border-radius: 10px;
  padding: 10px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: scaleIn 0.3s ease;
  cursor: pointer;
  transition: all 0.3s ease;
}

.matched-item:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 16px rgba(168, 224, 99, 0.5);
}

.matched-text {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

.matched-emoji {
  font-size: 20px;
  margin-top: 5px;
}

.remove-hint {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
}

/* 第三阶段：翻牌配对 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.flip-card {
  width: 100%;
  aspect-ratio: 1;
  perspective: 1000px;
  cursor: pointer;
}

.flip-card.flipped .card-inner,
.flip-card.matched .card-inner {
  transform: rotateY(180deg);
}

.flip-card.matched {
  cursor: default;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}

.card-front,
.card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.card-front {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 3px solid #764ba2;
}

.card-back {
  background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
  border: 3px solid #ddd;
  transform: rotateY(180deg);
}

.card-back-emoji {
  font-size: 48px;
}

.card-content {
  text-align: center;
  padding: 10px;
}

.card-content.pinyin-type {
  color: #2196F3;
}

.card-content.hanzi-type {
  color: #ff9800;
}

.card-emoji {
  font-size: 28px;
  margin-bottom: 5px;
}

.card-text {
  font-size: 20px;
  font-weight: 700;
}

/* 反馈信息 */
.feedback-message {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  padding: 15px 30px;
  border-radius: 15px;
  font-size: 18px;
  font-weight: 700;
  animation: slideUp 0.3s ease;
  pointer-events: none;
  z-index: 200;
}

.feedback-message.correct {
  background: rgba(76, 175, 80, 0.9);
  color: #fff;
}

.feedback-message.wrong {
  background: rgba(244, 67, 54, 0.9);
  color: #fff;
}

.feedback-icon {
  font-size: 24px;
  margin-right: 10px;
}

/* 控制按钮 */
.control-buttons {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 15px;
  pointer-events: auto;
}

.control-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%);
  color: #333;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.control-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.control-btn .btn-icon {
  font-size: 20px;
}

/* 开始界面 */
.start-screen {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: auto;
}

.start-content {
  text-align: center;
  max-width: 900px;
  width: 90%;
}

.game-logo {
  margin-bottom: 40px;
}

.logo-emoji {
  font-size: 80px;
  animation: float 3s ease-in-out infinite;
}

.logo-title {
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 20px rgba(168, 224, 99, 0.8);
  margin: 20px 0 10px;
  background: linear-gradient(135deg, #a8e063 0%, #56ab2f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-subtitle {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}

.pet-selection {
  margin-bottom: 40px;
}

.selection-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 20px;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.pet-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.pet-option {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  border-radius: 20px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 3px solid rgba(168, 224, 99, 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.pet-option:hover {
  transform: translateY(-5px);
  border-color: rgba(168, 224, 99, 0.6);
}

.pet-option.selected {
  border-color: #a8e063;
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(168, 224, 99, 0.5);
}

.pet-option-icon {
  font-size: 60px;
  margin-bottom: 15px;
}

.pet-option-info {
  text-align: left;
}

.pet-option-name {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.pet-option-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.pet-option-features {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.feature-tag {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(168, 224, 99, 0.2);
  color: #27ae60;
  border-radius: 12px;
  font-weight: 600;
}

.start-btn,
.back-btn {
  padding: 15px 40px;
  font-size: 20px;
  font-weight: 700;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.start-btn {
  background: linear-gradient(135deg, #a8e063 0%, #56ab2f 100%);
  color: #fff;
}

.start-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(168, 224, 99, 0.6);
}

.back-btn {
  background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
  color: #fff;
}

.back-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(149, 165, 166, 0.6);
}

/* 弹窗 */
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  pointer-events: auto;
}

.modal-content {
  background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
  border-radius: 20px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #eee;
}

.modal-header h3 {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #f44336;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-btn:hover {
  transform: scale(1.1);
}

.modal-body {
  color: #666;
}

.help-section {
  margin-bottom: 20px;
}

.help-section h4 {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin-bottom: 10px;
}

.help-section p {
  font-size: 14px;
  line-height: 1.6;
  margin: 5px 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #eee;
}

.setting-item label {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.toggle-btn {
  width: 60px;
  height: 30px;
  border: none;
  border-radius: 15px;
  background: #ccc;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle-btn.on {
  background: #4CAF50;
}

.duration-select {
  padding: 8px 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  color: #333;
  cursor: pointer;
}

/* 动画 */
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 响应式 */
@media (max-width: 1200px) {
  .learning-area {
    width: calc(100% - 620px);
  }
}

@media (max-width: 960px) {
  .learning-area {
    top: auto;
    bottom: 80px;
    left: 20px;
    right: 20px;
    transform: none;
    width: auto;
    min-width: auto;
    max-width: none;
  }

  .pinyin-blocks-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .card-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .pet-panel,
  .learning-panel {
    width: 240px;
    padding: 15px;
  }

  .learning-area {
    top: 380px;
    bottom: 80px;
  }

  .pinyin-blocks-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .card-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .pet-options {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .pet-panel,
  .learning-panel {
    display: none;
  }

  .learning-area {
    top: 60px;
    bottom: 60px;
    left: 10px;
    right: 10px;
  }

  .pinyin-blocks-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .card-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .logo-title {
    font-size: 32px;
  }

  .logo-subtitle {
    font-size: 18px;
  }

  .control-buttons {
    bottom: 10px;
    gap: 10px;
  }

  .control-btn {
    padding: 10px 16px;
    font-size: 14px;
  }
}
</style>
