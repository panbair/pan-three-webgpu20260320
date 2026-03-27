<template>
  <div class="effect-switcher">
    <div class="switcher-title"><span>特效列表</span></div>
    <div class="effect-list">
      <button
        v-for="effect in effects"
        :key="effect.id"
        :class="['effect-btn', { active: currentEffectId === effect.id }]"
        @click="handleSwitch(effect.id)"
      >
        <span class="effect-icon">{{ effect.icon }}</span>
        <span class="effect-name">{{ effect.name }}</span>
        <span v-if="currentEffectId === effect.id" class="active-indicator">●</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Effect {
  id: string
  name: string
  icon: string
}

interface Emits {
  (e: 'switch', effectId: string): void
}

// 内部维护特效列表
const effects: Effect[] = [
  { id: 'galaxyVortex', name: '星系漩涡', icon: '🌌' },
  { id: 'quantumWave', name: '量子波动', icon: '⚛️' },
  { id: 'nebulaCloud', name: '星云流', icon: '🌠' },
  { id: 'dynamicFlowField', name: '动态流场', icon: '🌊' },
  { id: 'gpuParticleFlock', name: 'GPU 粒子群', icon: '🐦' },
  { id: 'clothSimulation', name: '丝绸波浪', icon: '🧵' },
  { id: 'crystalPalace', name: '星际之门', icon: '🌀' },
  { id: 'crystalGarden', name: '水晶花园', icon: '💎' },
  { id: 'quantumConsciousness', name: '量子意识', icon: '🧠' },
  { id: 'dimensionalRift', name: '维度裂隙', icon: '🌌' },
  { id: 'quantumDreamWeaver', name: '量子织梦机', icon: '🌌' },
  { id: 'temporalRiftEye', name: '时空之眼', icon: '👁️' },
  { id: 'neonNebula', name: '霓虹星云', icon: '🌈' },
  { id: 'auroraFantasy', name: '极光梦境', icon: '🌌' },
  { id: 'quantumAuroraDream', name: '量子极光织梦', icon: '🌌' },
  { id: 'quantumDimensionalAurora', name: '量子维度极光', icon: '🌌' },
  { id: 'cyberNeuralNetwork', name: '赛博神经网', icon: '🧠' },
  { id: 'quantumFluidGPU', name: '量子流体-GPU', icon: '🚀' },
  { id: 'quantumFluidHybrid', name: '量子流体-混合', icon: '⚡' },
  { id: 'quantumFluidTaichi', name: '量子流体-Taichi', icon: '🔬' },
  { id: 'quantumStorm', name: '量子风暴', icon: '⛈️' },
  { id: 'stellarSupernova', name: '星际超新星', icon: '🌟' }
]

const currentEffectId = ref('galaxyVortex')
const emit = defineEmits<Emits>()

const handleSwitch = (effectId: string) => {
  // 如果点击当前激活的特效，则清除特效
  if (currentEffectId.value === effectId) {
    currentEffectId.value = ''
    emit('switch', 'clear')
    return
  }
  // 否则切换到新特效
  currentEffectId.value = effectId
  emit('switch', effectId)
}
</script>

<style lang="scss" scoped>
.effect-switcher {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  z-index: 100;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  min-width: 200px;
}

.switcher-title {
  padding: 16px 20px 12px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(9, 141, 137, 0.62);
  text-align: center;
  letter-spacing: 0.5px;
}

.effect-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  max-height:50vh;
  overflow-y: auto;
}

.effect-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(5px);
  text-align: left;

  &:hover {
    background: rgba(74, 158, 255, 0.25);
    border-color: rgba(74, 158, 255, 0.4);
    color: #fff;
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(74, 158, 255, 0.2);
  }

  &.active {
    background: linear-gradient(135deg, rgba(74, 158, 255, 0.5), rgba(59, 130, 246, 0.5));
    border-color: #4a9eff;
    color: #fff;
    box-shadow: 0 0 20px rgba(74, 158, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
}

.effect-icon {
  font-size: 18px;
  margin-right: 10px;
}

.effect-name {
  flex: 1;
}

.active-indicator {
  font-size: 12px;
  color: #4a9eff;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
