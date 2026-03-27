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
import {
  galaxyVortexEffect,
  quantumWaveEffect,
  nebulaCloudEffect,
  dynamicFlowFieldEffect,
  gpuParticleFlockEffect,
  clothSimulationEffect,
  crystalPalaceEffect,
  crystalGardenEffect,
  quantumConsciousnessEffect,
  dimensionalRiftEffect,
  quantumDreamWeaverEffect,
  temporalRiftEyeEffect,
  neonNebulaEffect,
  auroraDreamEffect,
  auroraFantasyEffect,
  quantumAuroraDreamEffect,
  quantumDimensionalAuroraEffect,
  cyberNeuralNetworkEffect,
  quantumFluidSimulationEffect,
  quantumFluidZCopyEffect,
  quantumFluidGPUEffect,
  quantumFluidHybridEffect,
  quantumFluidTaichiEffect,
  quantumStormEffect,
  stellarSupernovaEffect
} from '@/effect'

const effectRef = ref<HTMLDivElement>()

// 特效控制器类型
interface EffectController {
  cleanup: () => void
  stopCameraAnimation?: () => void
  clearEffect?: () => void
}

let effectController: EffectController | null = null

const clearEffect = () => {
  console.log('清理旧特效...')
  if (effectController) {
    // 如果特效有 clearEffect 方法，使用淡出清理（用于运镜完成自动清理）
    if (effectController.clearEffect) {
      console.log('调用 clearEffect 方法（淡出）')
      effectController.clearEffect()
    } else {
      console.log('调用 cleanup 方法（立即清理）')
      effectController.cleanup()
      // 立即清空容器
      if (effectRef.value) {
        effectRef.value.innerHTML = ''
      }
    }
    effectController = null
  } else {
    // 如果没有 effectController，直接清空容器
    if (effectRef.value) {
      effectRef.value.innerHTML = ''
    }
  }
}

let effectList = {
  galaxyVortex: galaxyVortexEffect,
  quantumWave: quantumWaveEffect,
  nebulaCloud: nebulaCloudEffect,
  dynamicFlowField: dynamicFlowFieldEffect,
  gpuParticleFlock: gpuParticleFlockEffect,
  clothSimulation: clothSimulationEffect,
  crystalPalace: crystalPalaceEffect,
  crystalGarden: crystalGardenEffect,
  quantumConsciousness: quantumConsciousnessEffect,
  dimensionalRift: dimensionalRiftEffect,
  quantumDreamWeaver: quantumDreamWeaverEffect,
  temporalRiftEye: temporalRiftEyeEffect,
  neonNebula: neonNebulaEffect,
  auroraDream: auroraDreamEffect,
  auroraFantasy: auroraFantasyEffect,
  quantumAuroraDream: quantumAuroraDreamEffect,
  quantumDimensionalAurora: quantumDimensionalAuroraEffect,
  cyberNeuralNetwork: cyberNeuralNetworkEffect,
  quantumFluidSimulation: quantumFluidSimulationEffect,
  quantumFluidZCopy: quantumFluidZCopyEffect,
  quantumFluidGPU: quantumFluidGPUEffect,
  quantumFluidHybrid: quantumFluidHybridEffect,
  quantumFluidTaichi: quantumFluidTaichiEffect,
  quantumStorm: quantumStormEffect,
  stellarSupernova: stellarSupernovaEffect
}

const switchEffect = async (effectId: string) => {
  console.log('切换特效:', effectId)

  // 如果是清除指令，只清理不创建新特效
  if (effectId === 'clear') {
    clearEffect()
    return
  }

  // 停止旧特效的运镜动画（如果存在）
  if (effectController && effectController.stopCameraAnimation) {
    effectController.stopCameraAnimation()
  }

  // 清理旧特效（使用 cleanup 立即清理，不等待淡出动画）
  if (effectController) {
    console.log('立即清理旧特效（不等待淡出）')
    effectController.cleanup()
    effectController = null

    // 立即清空容器
    if (effectRef.value) {
      effectRef.value.innerHTML = ''
    }
  }

  // 等待 DOM 更新完成
  await nextTick()

  // 初始化新特效
  if (effectRef.value) {
    const fn = effectList[effectId as keyof typeof effectList]
    const result = fn(effectRef.value)

    // 兼容新旧返回值格式（支持异步）
    if (result instanceof Promise) {
      // 异步特效：等待 Promise 解析
      const resolvedResult = await result

      if (typeof resolvedResult === 'function') {
        // 旧格式：只返回 cleanup 函数
        effectController = { cleanup: resolvedResult }
      } else if (resolvedResult && typeof resolvedResult === 'object') {
        // 新格式：返回控制器对象
        effectController = resolvedResult
      }
    } else if (typeof result === 'function') {
      // 旧格式：只返回 cleanup 函数
      effectController = { cleanup: result }
    } else if (result && typeof result === 'object') {
      // 新格式：返回控制器对象
      effectController = result
    }
  }
}

onMounted(async () => {
  console.log('Home 页面已挂载')

  // 检查 WebGPU 支持
  if (!navigator.gpu) {
    console.warn('WebGPU 不支持，无法启用特效')
    return
  }

  // 初始化默认特效（星系漩涡）
  if (effectRef.value) {
    const result = galaxyVortexEffect(effectRef.value)

    // 兼容新旧返回值格式（支持异步）
    if (result instanceof Promise) {
      // 异步特效：等待 Promise 解析
      const resolvedResult = await result

      if (typeof resolvedResult === 'function') {
        // 旧格式：只返回 cleanup 函数
        effectController = { cleanup: resolvedResult }
      } else if (resolvedResult && typeof resolvedResult === 'object') {
        // 新格式：返回控制器对象
        effectController = resolvedResult
      }
    } else if (typeof result === 'function') {
      // 旧格式：只返回 cleanup 函数
      effectController = { cleanup: result }
    } else if (result && typeof result === 'object') {
      // 新格式：返回控制器对象
      effectController = result
    }
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
