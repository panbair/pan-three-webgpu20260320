<template>
  <div class="home-container">
    <PanoramaViewer />
    <div ref="effectRef" class="effect-container"></div>
    <div v-if="webgpuNotSupported" class="webgpu-warning">
      <div class="warning-content">
        <h3>⚠️ WebGPU 不支持</h3>
        <p>当前浏览器不支持 WebGPU，无法启用特效</p>
        <p class="browser-requirement">请使用 Chrome 113+ 或 Edge 113+</p>
      </div>
    </div>

    <!-- 特效切换按钮 -->
    <div class="effect-switcher">
      <button
        v-for="effect in effects"
        :key="effect.id"
        :class="['effect-btn', { active: currentEffect === effect.id }]"
        @click="switchEffect(effect.id)"
      >
        {{ effect.name }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import PanoramaViewer from '@/components/PanoramaViewer.vue'
import { alphaHashEffect, galaxyVortexEffect } from '@/effect'

const effectRef = ref<HTMLDivElement>()
const webgpuNotSupported = ref(false)
const currentEffect = ref<'alphaHash' | 'galaxyVortex'>('galaxyVortex')

let cleanupEffect: (() => void) | null = null

// 可用特效列表
const effects = [
  { id: 'alphaHash', name: '🌟 星系螺旋' },
  { id: 'galaxyVortex', name: '🌌 星系漩涡' }
]

const switchEffect = (effectId: 'alphaHash' | 'galaxyVortex') => {
  if (currentEffect.value === effectId) return

  // 清理当前特效
  if (cleanupEffect) {
    cleanupEffect()
    cleanupEffect = null
  }

  currentEffect.value = effectId

  // 初始化新特效
  if (effectRef.value) {
    if (effectId === 'alphaHash') {
      cleanupEffect = alphaHashEffect(effectRef.value)
    } else {
      cleanupEffect = galaxyVortexEffect(effectRef.value)
    }
  }
}

onMounted(() => {
  console.log('Home 页面已挂载')

  // 检查 WebGPU 支持
  if (!navigator.gpu) {
    console.warn('WebGPU 不支持，无法启用特效')
    webgpuNotSupported.value = true
    return
  }

  // 初始化默认特效（星系漩涡）
  if (effectRef.value) {
    cleanupEffect = galaxyVortexEffect(effectRef.value)
  }
})

onBeforeUnmount(() => {
  // 清理特效
  if (cleanupEffect) {
    cleanupEffect()
  }
})
</script>

<style lang="scss" scoped>
.home-container {
  width: 100vw;
  height: 100vh;
  background-color: #000;
  margin: 0;
  padding: 0;
  position: relative;
}

.effect-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.9;
  z-index: 1;
}

.effect-switcher {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 100;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.effect-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);

  &:hover {
    background: rgba(74, 158, 255, 0.3);
    border-color: rgba(74, 158, 255, 0.5);
    color: #fff;
    transform: translateY(-2px);
  }

  &.active {
    background: rgba(74, 158, 255, 0.6);
    border-color: #4a9eff;
    color: #fff;
    box-shadow: 0 0 20px rgba(74, 158, 255, 0.4);
  }
}

.webgpu-warning {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #ff6b6b;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  max-width: 400px;
  backdrop-filter: blur(10px);
}

.warning-content {
  h3 {
    color: #ff6b6b;
    margin: 0 0 15px 0;
    font-size: 24px;
  }

  p {
    color: #fff;
    margin: 10px 0;
    font-size: 14px;
    line-height: 1.6;
  }

  .browser-requirement {
    color: #ffd93d;
    font-weight: 500;
    margin-top: 15px;
  }
}
</style>
