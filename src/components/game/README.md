# 游戏UI组件说明

本目录包含打字雨游戏的UI组件，按功能拆分成独立模块，便于维护和复用。

## 组件列表

### 1. GameInfoPanel.vue - 游戏信息面板

**功能：** 显示游戏数据（得分、等级、生命）和控制按钮

**Props:**
- `score` (Number) - 当前分数
- `level` (Number) - 当前等级
- `lives` (Number) - 剩余生命
- `gameState` (String) - 游戏状态 ('ready' | 'playing' | 'paused' | 'gameover')

**Events:**
- `@start` - 开始游戏
- `@pause` - 暂停游戏
- `@resume` - 继续游戏
- `@restart` - 重新开始

**特性：**
- 响应式设计（支持 768px / 480px 断点）
- Glassmorphism 玻璃拟态效果
- 渐变色彩和动画
- 根据游戏状态动态显示控制按钮

---

### 2. GameStatus.vue - 游戏状态显示

**功能：** 显示游戏准备界面和游戏结束界面

**Props:**
- `gameState` (String) - 游戏状态
- `score` (Number) - 最终分数（游戏结束时显示）
- `level` (Number) - 最终等级（游戏结束时显示）

**Events:**
- `@start` - 开始游戏（准备界面）
- `@restart` - 重新开始（游戏结束界面）

**特性：**
- 根据状态自动切换准备/结束界面
- 游戏结束界面显示最终统计数据
- 响应式设计
- 浮动图标动画
- 渐变文字效果

---

### 3. ControlsHint.vue - 操作提示

**功能：** 显示游戏操作提示（ESC快捷键）

**Props:** 无

**Events:** 无

**特性：**
- 底部居中固定位置
- 脉冲动画效果
- 响应式设计
- 半透明玻璃效果

---

## 使用示例

```vue
<template>
  <div class="game-container">
    <!-- 游戏画布 -->
    <canvas ref="gameCanvas" />

    <!-- 信息面板 -->
    <GameInfoPanel
      :score="score"
      :level="level"
      :lives="lives"
      :game-state="gameState"
      @start="startGame"
      @pause="pauseGame"
      @resume="resumeGame"
      @restart="restartGame"
    />

    <!-- 游戏状态 -->
    <GameStatus
      :game-state="gameState"
      :score="score"
      :level="level"
      @start="startGame"
      @restart="restartGame"
    />

    <!-- 操作提示 -->
    <ControlsHint />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GameInfoPanel from '@/components/game/GameInfoPanel.vue'
import GameStatus from '@/components/game/GameStatus.vue'
import ControlsHint from '@/components/game/ControlsHint.vue'

const score = ref(0)
const level = ref(1)
const lives = ref(3)
const gameState = ref('ready')

const startGame = () => {
  gameState.value = 'playing'
  // 游戏逻辑...
}

const pauseGame = () => {
  gameState.value = 'paused'
}

const resumeGame = () => {
  gameState.value = 'playing'
}

const restartGame = () => {
  score.value = 0
  level.value = 1
  lives.value = 3
  gameState.value = 'ready'
}
</script>
```

## 设计原则

1. **单一职责：** 每个组件只负责一个UI模块
2. **Props向下传递：** 通过props传递数据
3. **Events向上传递：** 通过emits触发父组件方法
4. **响应式设计：** 支持移动端和桌面端
5. **性能优化：** CSS动画、硬件加速
6. **可维护性：** 清晰的组件结构和命名

## 样式特点

- **Glassmorphism:** `backdrop-filter: blur()` 玻璃拟态
- **渐变色:** `linear-gradient()` 现代渐变效果
- **动画:** CSS Keyframes 动画（fadeInUp, slideInLeft, float, pulse）
- **阴影:** 多层次阴影增强层次感
- **响应式:** Media Queries 适配不同屏幕

## 文件结构

```
src/components/game/
├── GameInfoPanel.vue    # 信息面板组件
├── GameStatus.vue       # 游戏状态组件
├── ControlsHint.vue     # 操作提示组件
└── README.md           # 组件说明文档
```
