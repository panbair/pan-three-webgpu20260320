<template>
  <div class="game-menu">
    <div class="menu-container">
      <h1 class="title">打字训练游戏</h1>
      <div class="game-cards">
        <div class="game-card" @click="startGame('meteor')">
          <div class="game-icon">☄️</div>
          <h2 class="game-name">三维打字雨</h2>
          <p class="game-desc">字母方块从天空掉落 按下对应按键消灭它们</p>
          <div class="game-features">
            <span>⭐ 推荐</span>
            <span>难度递增</span>
            <span>爆炸特效</span>
          </div>
          <button class="play-btn">开始游戏</button>
        </div>

        <div class="game-card" @click="startGame('game-2d')">
          <div class="game-icon">🌍</div>
          <h2 class="game-name">我的世界打字高手</h2>
          <p class="game-desc">字母方块从天空掉落 按下对应按键消灭它们</p>
          <div class="game-features">
            <span>⭐ 推荐</span>
            <span>难度递增</span>
            <span>很酷</span>
          </div>
          <button class="play-btn">开始游戏</button>
        </div>

        <div class="game-card" @click="startGame('game-text')">
          <div class="game-icon">🚀</div>
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
}
</script>

<style scoped>
.game-menu {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.menu-container {
  max-width: 1200px;
  width: 100%;
}

.title {
  text-align: center;
  font-size: 48px;
  color: #00ffff;
  text-shadow: 0 0 20px #00ffff;
  margin-bottom: 60px;
  letter-spacing: 4px;
}

.game-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.game-card {
  background: linear-gradient(145deg, rgba(30, 30, 60, 0.9), rgba(10, 10, 30, 0.9));
  border: 2px solid #00ffff;
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.game-card:hover:not(.disabled) {
  transform: translateY(-10px);
  border-color: #00ff66;
  box-shadow: 0 20px 40px rgba(0, 255, 102, 0.3);
}

.game-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.game-icon {
  font-size: 80px;
  margin-bottom: 20px;
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.3));
}

.game-name {
  font-size: 28px;
  color: #ffffff;
  margin-bottom: 15px;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.game-desc {
  color: #aaaaaa;
  font-size: 16px;
  margin-bottom: 20px;
  line-height: 1.6;
}

.game-features {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.game-features span {
  background: rgba(0, 255, 102, 0.2);
  color: #00ff66;
  padding: 5px 12px;
  border-radius: 15px;
  font-size: 12px;
  border: 1px solid #00ff66;
}

.play-btn {
  background: linear-gradient(135deg, #00ffff, #0066ff);
  color: #000;
  border: none;
  padding: 15px 40px;
  font-size: 18px;
  font-weight: bold;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.play-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #00ff66, #00ffff);
  transform: scale(1.05);
  box-shadow: 0 10px 30px rgba(0, 255, 102, 0.4);
}

.play-btn:disabled {
  background: #444;
  cursor: not-allowed;
  color: #888;
}
</style>
