<template>
  <div class="game-menu">
    <div class="menu-container">
      <h1 class="title">打字训练游戏</h1>
      <div class="game-cards">
        <div class="game-card" @click="startGame('meteor')">
          <div class="game-icon">☄️</div>
          <div class="card-body">
            <h2 class="game-name">三维打字雨</h2>
            <p class="game-desc">字母方块从天空掉落 按下对应按键消灭它们</p>
            <div class="game-features">
              <span>⭐ 推荐</span>
              <span>难度递增</span>
              <span>爆炸特效</span>
            </div>
            <button class="play-btn">开始游戏</button>
          </div>
        </div>

        <div class="game-card" @click="startGame('game-2d')">
          <div class="game-icon">🌍</div>
          <div class="card-body">
            <h2 class="game-name">我的世界打字高手</h2>
            <p class="game-desc">字母方块从天空掉落 按下对应按键消灭它们</p>
            <div class="game-features">
              <span>⭐ 推荐</span>
              <span>难度递增</span>
              <span>很酷</span>
            </div>
            <button class="play-btn">开始游戏</button>
          </div>
        </div>

        <div class="game-card" @click="startGame('game-text')">
          <div class="game-icon">🚀</div>
          <div class="card-body">
            <h2 class="game-name">赛博朋克黑客终端</h2>
            <p class="game-desc">视觉冲击力最强</p>
            <div class="game-features">
              <span>⭐ 推荐</span>
              <span>有故事感</span>
              <span>破关爽感</span>
            </div>
            <button class="play-btn">开始游戏</button>
          </div>
        </div>

        <div class="game-card poem-card-entry" @click="startGame('game-gushi')">
          <div class="game-icon">📜</div>
          <div class="card-body">
            <h2 class="game-name">诗·词·歌</h2>
            <p class="game-desc">打出经典古诗与歌词，感受文字的温度</p>
            <div class="game-features">
              <span>🌟 新上线</span>
              <span>拼音辅助</span>
              <span>连击特效</span>
            </div>
            <button class="play-btn">开始游戏</button>
          </div>
        </div>

        <div class="game-card mc-card-entry" @click="startGame('game-mc')">
          <div class="game-icon">⛏️</div>
          <div class="card-body">
            <h2 class="game-name">我的世界打字冒险</h2>
            <p class="game-desc">儿童专属！像素风冒险，挖矿建造，零压力学打字</p>
            <div class="game-features">
              <span>👧 儿童专属</span>
              <span>手指引导</span>
              <span>零惩罚</span>
              <span>5大关卡</span>
            </div>
            <button class="play-btn">开始冒险</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function startGame(gameType: string) {
  if (gameType === 'meteor') {
    router.push('/meteor-game')
  }
  if (gameType === 'game-2d') {
    router.push('/game-2d')
  }
  if (gameType === 'game-text') {
    router.push('/game-text')
  }
  if (gameType === 'game-gushi') {
    router.push('/game-gushi')
  }
  if (gameType === 'game-mc') {
    router.push('/game-mc')
  }
}
</script>

<style scoped>
/* ═══ 基础 ═══ */
.game-menu {
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 20px 60px;
  box-sizing: border-box;
  overflow-y: auto;
}

.menu-container {
  max-width: 1200px;
  width: 100%;
}

/* ─── 标题 ─── */
.title {
  text-align: center;
  font-size: clamp(28px, 6vw, 48px);
  color: #00ffff;
  text-shadow: 0 0 20px #00ffff;
  margin-bottom: clamp(28px, 5vw, 60px);
  letter-spacing: 4px;
}

/* ─── 卡片网格 ─── */
.game-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

/* ─── 游戏卡片 ─── */
.game-card {
  background: linear-gradient(145deg, rgba(30, 30, 60, 0.9), rgba(10, 10, 30, 0.9));
  border: 2px solid #00ffff;
  border-radius: 20px;
  padding: clamp(20px, 4vw, 30px);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  /* 移动端点击高亮去除 */
  -webkit-tap-highlight-color: transparent;
}

.game-card:hover:not(.disabled) {
  transform: translateY(-8px);
  border-color: #00ff66;
  box-shadow: 0 20px 40px rgba(0, 255, 102, 0.3);
}

/* 移动端：active 态替代 hover */
.game-card:active:not(.disabled) {
  transform: scale(0.97);
  box-shadow: 0 4px 20px rgba(0, 255, 102, 0.2);
}

.game-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.game-icon {
  font-size: clamp(48px, 10vw, 80px);
  margin-bottom: 16px;
  filter: drop-shadow(0 0 16px rgba(255, 255, 255, 0.3));
  line-height: 1;
}

.game-name {
  font-size: clamp(20px, 4vw, 28px);
  color: #ffffff;
  margin: 0 0 12px;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.game-desc {
  color: #aaaaaa;
  font-size: clamp(13px, 2.5vw, 16px);
  margin: 0 0 16px;
  line-height: 1.6;
}

.game-features {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.game-features span {
  background: rgba(0, 255, 102, 0.15);
  color: #00ff66;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: clamp(11px, 2vw, 13px);
  border: 1px solid #00ff66;
  white-space: nowrap;
}

.play-btn {
  background: linear-gradient(135deg, #00ffff, #0066ff);
  color: #000;
  border: none;
  padding: clamp(11px, 2.5vw, 15px) clamp(28px, 6vw, 40px);
  font-size: clamp(14px, 3vw, 18px);
  font-weight: bold;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 2px;
  width: 100%;
  max-width: 220px;
  touch-action: manipulation;
}

.play-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #00ff66, #00ffff);
  transform: scale(1.04);
  box-shadow: 0 10px 30px rgba(0, 255, 102, 0.4);
}

.play-btn:disabled {
  background: #444;
  cursor: not-allowed;
  color: #888;
}

/* ─── 诗词卡片专属 ─── */
.poem-card-entry {
  border-color: #ffcc66;
}
.poem-card-entry:hover:not(.disabled) {
  border-color: #ffe0a0 !important;
  box-shadow: 0 20px 40px rgba(255, 204, 102, 0.3) !important;
}
.poem-card-entry .game-features span {
  background: rgba(255, 204, 102, 0.15);
  color: #ffcc66;
  border-color: #ffcc66;
}
.poem-card-entry .play-btn {
  background: linear-gradient(135deg, #ffcc66, #ff9933);
}
.poem-card-entry .play-btn:hover {
  background: linear-gradient(135deg, #ffe0a0, #ffcc66) !important;
  box-shadow: 0 10px 30px rgba(255, 204, 102, 0.4) !important;
}

/* ─── MC儿童卡片专属 ─── */
.mc-card-entry {
  border-color: #a8e063;
}
.mc-card-entry:hover:not(.disabled) {
  border-color: #c8f582 !important;
  box-shadow: 0 20px 40px rgba(168, 224, 99, 0.3) !important;
}
.mc-card-entry .game-features span {
  background: rgba(168, 224, 99, 0.15);
  color: #a8e063;
  border-color: #a8e063;
}
.mc-card-entry .play-btn {
  background: linear-gradient(135deg, #a8e063, #27ae60);
}
.mc-card-entry .play-btn:hover {
  background: linear-gradient(135deg, #c8f582, #a8e063) !important;
  box-shadow: 0 10px 30px rgba(168, 224, 99, 0.4) !important;
}

/* ═══ 移动端断点 ═══ */

/* 平板：2列 */
@media (max-width: 768px) {
  .game-menu {
    padding: 28px 16px 48px;
    align-items: flex-start;
  }

  .game-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .game-card {
    border-radius: 16px;
  }
}

/* 手机：单列 */
@media (max-width: 480px) {
  .game-menu {
    padding: 24px 12px 40px;
  }

  .title {
    letter-spacing: 2px;
    margin-bottom: 24px;
  }

  .game-cards {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  /* 手机竖屏：卡片改为横向布局 */
  .game-card {
    display: flex;
    align-items: center;
    text-align: left;
    padding: 16px 18px;
    gap: 16px;
    border-radius: 14px;
  }

  .game-icon {
    font-size: 44px;
    margin-bottom: 0;
    flex-shrink: 0;
  }

  .card-body {
    flex: 1;
    min-width: 0;
  }

  .game-name {
    font-size: 17px;
    margin-bottom: 5px;
  }

  .game-desc {
    font-size: 12px;
    margin-bottom: 10px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .game-features {
    justify-content: flex-start;
    margin-bottom: 12px;
    gap: 6px;
  }

  .play-btn {
    width: auto;
    max-width: none;
    padding: 9px 20px;
    font-size: 13px;
    letter-spacing: 1px;
  }
}

/* 超小屏 */
@media (max-width: 360px) {
  .game-card {
    padding: 14px;
    gap: 12px;
  }

  .game-icon {
    font-size: 36px;
  }
}
</style>
