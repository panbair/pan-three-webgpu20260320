<template>
  <div class="map-controls">
    <div class="control-section">
      <h3>视图控制</h3>
      <div class="control-grid">
        <button class="control-btn" title="重置视图" @click="$emit('resetView')">
          <span class="icon">⟲</span>
          重置
        </button>
        <button class="control-btn" title="顶视图" @click="$emit('setTopView')">
          <span class="icon">⬆</span>
          俯视
        </button>
        <button class="control-btn" title="正视图" @click="$emit('setFrontView')">
          <span class="icon">⬇</span>
          正视
        </button>
        <button class="control-btn" title="侧视图" @click="$emit('setSideView')">
          <span class="icon">➡</span>
          侧视
        </button>
      </div>
    </div>

    <div class="control-section">
      <h3>相机控制</h3>
      <div class="control-grid">
        <button class="control-btn" title="上移" @click="$emit('moveCamera', 'up')">
          <span class="icon">▲</span>
        </button>
        <button class="control-btn" title="下移" @click="$emit('moveCamera', 'down')">
          <span class="icon">▼</span>
        </button>
        <button class="control-btn" title="左移" @click="$emit('moveCamera', 'left')">
          <span class="icon">◀</span>
        </button>
        <button class="control-btn" title="右移" @click="$emit('moveCamera', 'right')">
          <span class="icon">▶</span>
        </button>
      </div>
      <div class="control-grid">
        <button class="control-btn" title="放大" @click="$emit('zoomCamera', 'in')">
          <span class="icon">+</span>
          放大
        </button>
        <button class="control-btn" title="缩小" @click="$emit('zoomCamera', 'out')">
          <span class="icon">−</span>
          缩小
        </button>
      </div>
    </div>

    <div class="control-section">
      <h3>自动旋转</h3>
      <button :class="['control-btn', { active }]" @click="$emit('toggleAutoRotate')">
        <span class="icon">⟳</span>
        {{ active ? '停止旋转' : '自动旋转' }}
      </button>
      <div v-if="active" class="speed-control">
        <label>旋转速度: {{ rotateSpeed.toFixed(1) }}</label>
        <input
          type="range"
          :value="rotateSpeed"
          min="0.1"
          max="5"
          step="0.1"
          @input="$emit('updateSpeed', Number.parseFloat($event.target.value))"
        />
      </div>
    </div>

    <div class="control-section">
      <h3>相机位置</h3>
      <div class="camera-info">
        <p>X: {{ position.x.toFixed(1) }}</p>
        <p>Y: {{ position.y.toFixed(1) }}</p>
        <p>Z: {{ position.z.toFixed(1) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Position {
  x: number
  y: number
  z: number
}

defineProps<{
  active?: boolean
  rotateSpeed?: number
  position: Position
}>()

defineEmits<{
  resetView: []
  setTopView: []
  setFrontView: []
  setSideView: []
  moveCamera: [direction: string]
  zoomCamera: [direction: string]
  toggleAutoRotate: []
  updateSpeed: [value: number]
}>()
</script>

<style scoped lang="scss">
.map-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.85);
  padding: 20px;
  border-radius: 12px;
  color: white;
  z-index: 10;
  width: 200px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
  max-height: calc(100vh - 40px);
  overflow-y: auto;

  .control-section {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    &:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #00ffff;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  }

  .control-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .control-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 10px 8px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-height: 50px;
    justify-content: center;

    &:hover {
      background: rgba(0, 255, 255, 0.2);
      border-color: #00ffff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
    }

    &:active {
      transform: translateY(0);
    }

    &.active {
      background: #00ffff;
      color: #000;
      border-color: #00ffff;
      font-weight: bold;
      box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
    }

    .icon {
      font-size: 18px;
      line-height: 1;
    }
  }

  .speed-control {
    margin-top: 12px;

    label {
      display: block;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 6px;
    }

    input[type='range'] {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      outline: none;
      -webkit-appearance: none;

      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: #00ffff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
      }

      &::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #00ffff;
        border-radius: 50%;
        cursor: pointer;
        border: none;
      }
    }
  }

  .camera-info {
    background: rgba(0, 0, 0, 0.5);
    padding: 10px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);

    p {
      margin: 4px 0;
      font-size: 13px;
      font-family: 'Courier New', monospace;
      color: #00ff88;

      &:first-child {
        color: #ff6b9d;
      }

      &:nth-child(2) {
        color: #ffd93d;
      }

      &:last-child {
        color: #6bcfff;
      }
    }
  }
}
</style>
