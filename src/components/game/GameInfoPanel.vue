<template>
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

      <div class="stat-item level">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <div class="stat-label">等级</div>
          <div class="stat-value">LV.{{ level }}</div>
        </div>
      </div>

      <div class="stat-item lives">
        <div class="stat-icon">❤️</div>
        <div class="stat-content">
          <div class="stat-label">生命</div>
          <div class="stat-value">{{ lives }}</div>
        </div>
      </div>
    </div>

    <div class="game-controls">
      <button
        v-if="gameState === 'ready' || gameState === 'gameover'"
        class="control-btn start-btn"
        @click="$emit('start')"
      >
        <span class="btn-icon">▶</span>
        <span>开始</span>
      </button>
      <button v-if="gameState === 'playing'" class="control-btn pause-btn" @click="$emit('pause')">
        <span class="btn-icon">⏸</span>
        <span>暂停</span>
      </button>
      <button v-if="gameState === 'paused'" class="control-btn resume-btn" @click="$emit('resume')">
        <span class="btn-icon">▶</span>
        <span>继续</span>
      </button>
      <button
        v-if="gameState === 'playing' || gameState === 'paused' || gameState === 'gameover'"
        class="control-btn restart-btn"
        @click="$emit('restart')"
      >
        <span class="btn-icon">🔄</span>
        <span>重开</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  score: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  lives: {
    type: Number,
    default: 3
  },
  gameState: {
    type: String,
    default: 'ready'
  }
})

defineEmits(['start', 'pause', 'resume', 'restart'])
</script>

<style scoped>
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
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

.stat-item.level .stat-value {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-item.lives .stat-value {
  background: linear-gradient(135deg, #ff6b6b 0%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .game-info {
    top: 10px;
    left: 10px;
    padding: 15px;
    min-width: 200px;
  }

  .info-header .info-icon {
    font-size: 20px;
  }

  .info-header .info-title {
    font-size: 14px;
  }

  .stats-grid {
    gap: 10px;
  }

  .stat-item {
    padding: 10px 12px;
  }

  .stat-icon {
    font-size: 24px;
  }

  .stat-content .stat-label {
    font-size: 11px;
  }

  .stat-content .stat-value {
    font-size: 18px;
  }

  .game-controls {
    gap: 8px;
  }

  .control-btn {
    padding: 10px 16px;
    font-size: 14px;
  }

  .control-btn .btn-icon {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .game-info {
    top: 8px;
    left: 8px;
    padding: 12px;
    min-width: 180px;
  }

  .info-header {
    padding-bottom: 10px;
  }

  .info-header .info-icon {
    font-size: 18px;
  }

  .info-header .info-title {
    font-size: 13px;
  }

  .stats-grid {
    gap: 8px;
  }

  .stat-item {
    padding: 8px 10px;
  }

  .stat-icon {
    font-size: 20px;
  }

  .stat-content .stat-label {
    font-size: 10px;
  }

  .stat-content .stat-value {
    font-size: 16px;
  }

  .game-controls {
    gap: 6px;
  }

  .control-btn {
    padding: 8px 12px;
    font-size: 13px;
  }

  .control-btn .btn-icon {
    font-size: 12px;
  }
}
</style>
