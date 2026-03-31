<template>
  <div class="controls-hint">
    <div class="hint-content">
      <div class="hint-icon">⌨️</div>
      <div class="hint-text">ESC 暂停/继续游戏</div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.controls-hint {
  position: absolute;
  bottom: 25px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  backdrop-filter: blur(15px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: fadeInUp 0.8s ease-out 0.3s both;
}

.hint-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
}

.hint-icon {
  font-size: 24px;
  filter: drop-shadow(0 0 10px rgba(102, 126, 234, 0.6));
  animation: pulse 2s ease-in-out infinite;
}

.hint-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .controls-hint {
    bottom: 15px;
  }

  .hint-content {
    padding: 10px 18px;
  }

  .hint-icon {
    font-size: 20px;
  }

  .hint-text {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .controls-hint {
    bottom: 10px;
  }

  .hint-content {
    padding: 8px 14px;
  }

  .hint-icon {
    font-size: 18px;
  }

  .hint-text {
    font-size: 12px;
  }
}
</style>
