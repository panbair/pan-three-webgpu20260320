<template>
  <div class="home-container">
    <PanoramaViewer />
    <div ref="effectRef" class="effect-container"></div>
    <WebGPUNotSupported />

    <!-- 特效切换器 -->
    <EffectSwitcher @switch="switchEffect" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import PanoramaViewer from '@/components/PanoramaViewer.vue'
import EffectSwitcher from '@/components/EffectSwitcher.vue'
import WebGPUNotSupported from '@/components/WebGPUNotSupported.vue'
import { alphaHashEffect, galaxyVortexEffect, quantumWaveEffect, nebulaCloudEffect } from '@/effect'

const effectRef = ref<HTMLDivElement>()

let cleanupEffect: (() => void) | null = null

const clearEffect = () => {
  console.log('清理旧特效...')
  if (cleanupEffect) {
    cleanupEffect()
    cleanupEffect = null
  }

  // 清空容器内容，移除旧的 canvas 元素
  if (effectRef.value) {
    effectRef.value.innerHTML = ''
  }
}

const switchEffect = async (effectId: string) => {
  console.log('切换特效:', effectId)

  // 如果是清除指令，只清理不创建新特效
  if (effectId === 'clear') {
    clearEffect()
    return
  }

  // 清理旧特效
  clearEffect()

  // 等待 DOM 更新完成
  await nextTick()

  // 初始化新特效
  if (effectRef.value) {
    if (effectId === 'alphaHash') {
      cleanupEffect = alphaHashEffect(effectRef.value)
    } else if (effectId === 'galaxyVortex') {
      cleanupEffect = galaxyVortexEffect(effectRef.value)
    } else if (effectId === 'quantumWave') {
      cleanupEffect = quantumWaveEffect(effectRef.value)
    } else if (effectId === 'nebulaCloud') {
      cleanupEffect = nebulaCloudEffect(effectRef.value)
    }
  }
}

onMounted(() => {
  console.log('Home 页面已挂载')

  // 检查 WebGPU 支持
  if (!navigator.gpu) {
    console.warn('WebGPU 不支持，无法启用特效')
    return
  }

  // 初始化默认特效（星系漩涡）
  if (effectRef.value) {
    cleanupEffect = galaxyVortexEffect(effectRef.value)
  }
})

onBeforeUnmount(() => {
  console.log('Home 页面即将卸载')

  // 清理特效
  clearEffect()
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

</style>

