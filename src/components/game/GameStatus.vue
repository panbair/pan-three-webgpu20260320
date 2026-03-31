<template>
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
      <button class="start-btn" @click="$emit('start')">
        <span class="btn-icon">▶</span>
        <span>开始游戏</span>
      </button>
    </div>
  </div>
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
      </div>
      <div class="game-message">
        <p>再接再厉，挑战更高分数！</p>
      </div>
      <button class="restart-btn" @click="$emit('restart')">
        <span class="btn-icon">🔄</span>
        <span>重新开始</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  gameState: {
    type: String,
    default: 'ready'
  },
  score: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  }
})

defineEmits(['start', 'restart'])
</script>

<style scoped>
.game-status {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(20, 20, 40, 0.9) 100%);
  padding: 50px 60px;
  border-radius: 24px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  pointer-events: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: fadeInUp 0.6s ease-out;
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

h2 {
  color: #fff;
  font-size: 42px;
  margin: 10px 0 15px;
  text-shadow: 0 0 30px rgba(102, 126, 234, 0.8), 0 4px 8px rgba(0, 0, 0, 0.5);
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

.start-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 16px 48px;
  font-size: 20px;
  font-weight: bold;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  position: relative;
  overflow: hidden;
}

.start-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.start-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4);
}

.start-btn:hover::before {
  left: 100%;
}

.start-btn:active {
  transform: translateY(-1px);
}

.start-btn .btn-icon {
  font-size: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.game-status.ready {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(20, 20, 40, 0.9) 100%);
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
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 15px 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 107, 107, 0.2);
  border-radius: 12px;
  padding: 20px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.stat-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  font-weight: 500;
}

.stat-value {
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 0 15px rgba(255, 107, 107, 0.6);
}

.stat-value.highlight {
  background: linear-gradient(135deg, #ffd700 0%, #ff6b6b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 32px;
}

.game-message {
  margin: 15px 0;
}

.game-message p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  font-style: italic;
  line-height: 1.6;
}

.restart-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #f093fb 100%);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.5);
  color: white;
  border: none;
  padding: 16px 48px;
  font-size: 20px;
  font-weight: bold;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 12px;
}

.restart-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(255, 107, 107, 0.6);
}

.restart-btn:active {
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
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .game-status {
    padding: 35px 30px;
    max-width: 90vw;
  }

  .game-icon {
    font-size: 48px;
  }

  h2 {
    font-size: 32px;
    margin: 8px 0;
  }

  .game-description p {
    font-size: 16px;
    margin: 6px 0;
  }

  .game-features {
    gap: 8px;
  }

  .feature-tag {
    font-size: 12px;
    padding: 6px 12px;
  }

  .start-btn {
    padding: 14px 36px;
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .game-status {
    padding: 30px 25px;
  }

  .game-icon {
    font-size: 40px;
  }

  h2 {
    font-size: 28px;
  }

  .game-description p {
    font-size: 14px;
  }

  .game-features .feature-tag {
    font-size: 11px;
    padding: 5px 10px;
  }

  .start-btn {
    padding: 12px 28px;
    font-size: 16px;
  }
}
</style>
