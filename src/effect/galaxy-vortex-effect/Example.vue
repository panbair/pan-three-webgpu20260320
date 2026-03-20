<template>
  <div class="galaxy-vortex-container">
    <div ref="containerRef" class="galaxy-canvas"></div>

    <!-- 控制面板 -->
    <div class="control-panel" v-if="showControls">
      <div class="panel-header">
        <h3>星系漩涡特效控制</h3>
        <button @click="showControls = false" class="close-btn">×</button>
      </div>

      <div class="panel-content">
        <div class="control-group">
          <label>旋转速度</label>
          <input
            type="range"
            v-model.number="rotationSpeed"
            :min="0"
            :max="0.001"
            :step="0.0001"
            @input="updateRotationSpeed"
          />
          <span>{{ rotationSpeed.toFixed(4) }}</span>
        </div>

        <div class="control-group">
          <label>颜色变化速度</label>
          <input
            type="range"
            v-model.number="colorShiftSpeed"
            :min="0"
            :max="0.001"
            :step="0.00005"
            @input="updateColorShiftSpeed"
          />
          <span>{{ colorShiftSpeed.toFixed(5) }}</span>
        </div>

        <div class="control-group">
          <label>脉冲强度</label>
          <input
            type="range"
            v-model.number="pulseIntensity"
            :min="0"
            :max="0.5"
            :step="0.05"
            @input="updatePulseIntensity"
          />
          <span>{{ pulseIntensity.toFixed(2) }}</span>
        </div>

        <div class="control-group">
          <label>核心光晕速度</label>
          <input
            type="range"
            v-model.number="coreGlowSpeed"
            :min="0.5"
            :max="5"
            :step="0.5"
            @input="updateCoreGlowSpeed"
          />
          <span>{{ coreGlowSpeed.toFixed(1) }}</span>
        </div>

        <div class="control-group">
          <label>透明度</label>
          <input
            type="range"
            v-model.number="alpha"
            :min="0.1"
            :max="1"
            :step="0.05"
            @input="updateAlpha"
          />
          <span>{{ alpha.toFixed(2) }}</span>
        </div>

        <div class="control-group">
          <label>星系臂数</label>
          <input
            type="range"
            v-model.number="armCount"
            :min="3"
            :max="8"
            :step="1"
            @input="updateArmCount"
          />
          <span>{{ armCount }}</span>
        </div>

        <div class="toggle-group">
          <label>
            <input type="checkbox" v-model="autoRotate" @change="updateAutoRotate" />
            自动旋转
          </label>
        </div>
      </div>
    </div>

    <!-- 控制按钮 -->
    <button v-if="!showControls" @click="showControls = true" class="toggle-btn">
      ⚙️
    </button>

    <!-- 信息显示 -->
    <div class="info-panel">
      <div class="info-item">
        <span class="label">粒子总数:</span>
        <span class="value">{{ totalParticles }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { galaxyVortexEffect, galaxyVortexEffectParams } from './index'

const containerRef = ref<HTMLDivElement>()
const showControls = ref(false)

// 控制参数
const rotationSpeed = ref(galaxyVortexEffectParams.rotationSpeed)
const colorShiftSpeed = ref(galaxyVortexEffectParams.colorShiftSpeed)
const pulseIntensity = ref(galaxyVortexEffectParams.pulseIntensity)
const coreGlowSpeed = ref(galaxyVortexEffectParams.coreGlowSpeed)
const alpha = ref(galaxyVortexEffectParams.alpha)
const armCount = ref(galaxyVortexEffectParams.armCount)
const autoRotate = ref(galaxyVortexEffectParams.autoRotate)

// 计算总粒子数
const totalParticles = computed(() => {
  return (
    galaxyVortexEffectParams.armCount * galaxyVortexEffectParams.particlesPerArm +
    galaxyVortexEffectParams.coreParticles +
    galaxyVortexEffectParams.haloParticles
  )
})

let cleanup: (() => void) | null = null

const updateRotationSpeed = () => {
  galaxyVortexEffectParams.rotationSpeed = rotationSpeed.value
}

const updateColorShiftSpeed = () => {
  galaxyVortexEffectParams.colorShiftSpeed = colorShiftSpeed.value
}

const updatePulseIntensity = () => {
  galaxyVortexEffectParams.pulseIntensity = pulseIntensity.value
}

const updateCoreGlowSpeed = () => {
  galaxyVortexEffectParams.coreGlowSpeed = coreGlowSpeed.value
}

const updateAlpha = () => {
  galaxyVortexEffectParams.alpha = alpha.value
}

const updateArmCount = () => {
  galaxyVortexEffectParams.armCount = armCount.value
}

const updateAutoRotate = () => {
  galaxyVortexEffectParams.autoRotate = autoRotate.value
}

onMounted(() => {
  if (containerRef.value) {
    cleanup = galaxyVortexEffect(containerRef.value)
  }
})

onBeforeUnmount(() => {
  if (cleanup) {
    cleanup()
  }
})
</script>

<style scoped>
.galaxy-vortex-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

.galaxy-canvas {
  width: 100%;
  height: 100%;
}

.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  width: 280px;
  color: #fff;
  z-index: 100;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.control-group input[type="range"] {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
}

.control-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #4a9eff;
  border-radius: 50%;
  cursor: pointer;
}

.control-group span {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
}

.toggle-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-group label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  user-select: none;
}

.toggle-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.toggle-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(74, 158, 255, 0.8);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 20px;
  cursor: pointer;
  z-index: 99;
  transition: all 0.3s ease;
}

.toggle-btn:hover {
  background: rgba(74, 158, 255, 1);
  transform: scale(1.1);
}

.info-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  gap: 20px;
  z-index: 100;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.info-item .label {
  color: rgba(255, 255, 255, 0.6);
}

.info-item .value {
  color: #4a9eff;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}
</style>
