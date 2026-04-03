<template>
  <div class="pretext-embedder">
    <!-- 顶部工具栏 -->
    <header class="toolbar">
      <h1 class="title">🎨 PreTeXt 动画嵌入器</h1>
      <div class="actions">
        <button class="btn btn-primary" @click="generatePreTeXtCode">
          📋 生成 PreTeXt 代码
        </button>
        <button class="btn btn-secondary" @click="previewStandalone">
          👁️ 独立预览
        </button>
        <button class="btn btn-info" @click="showHelp = true">
          ❓ 使用帮助
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧：控制面板 -->
      <aside class="control-panel">
        <div class="panel-section">
          <h3>🎬 选择动画</h3>
          <select v-model="selectedEffect" class="effect-select" @change="loadEffect">
            <option value="">-- 请选择特效 --</option>
            <optgroup label="🌌 星系与星云">
              <option value="galaxyVortex">星系漩涡</option>
              <option value="nebulaCloud">星云云雾</option>
              <option value="neonNebula">霓虹星云</option>
            </optgroup>
            <optgroup label="✨ 量子特效">
              <option value="quantumWave">量子波动</option>
              <option value="quantumDreamWeaver">量子织梦机</option>
              <option value="quantumConsciousness">量子意识</option>
            </optgroup>
            <optgroup label="🌊 流体与粒子">
              <option value="dynamicFlowField">动态流场</option>
              <option value="quantumFluidTaichi">量子流体 (Taichi)</option>
              <option value="gpuParticleFlock">GPU粒子群</option>
            </optgroup>
            <optgroup label="🔮 水晶与宫殿">
              <option value="crystalPalace">水晶宫殿</option>
              <option value="crystalGarden">水晶花园</option>
            </optgroup>
            <optgroup label="🌌 极光与梦境">
              <option value="auroraDream">极光梦境</option>
              <option value="auroraFantasy">极光幻想</option>
              <option value="quantumAuroraDream">量子极光梦境</option>
            </optgroup>
            <optgroup label="⚡ 其他特效">
              <option value="clothSimulation">布料模拟</option>
              <option value="dimensionalRift">次元裂隙</option>
              <option value="temporalRiftEye">时空裂隙之眼</option>
              <option value="cyberNeuralNetwork">赛博神经网络</option>
              <option value="quantumStorm">量子风暴</option>
              <option value="stellarSupernova">恒星超新星</option>
            </optgroup>
          </select>
        </div>

        <div class="panel-section">
          <h3>⚙️ 嵌入配置</h3>
          <div class="config-item">
            <label>宽度</label>
            <input v-model.number="config.width" type="number" min="200" max="1920" />
            <span>px</span>
          </div>
          <div class="config-item">
            <label>高度</label>
            <input v-model.number="config.height" type="number" min="150" max="1080" />
            <span>px</span>
          </div>
          <div class="config-item">
            <label>自动播放</label>
            <input v-model="config.autoplay" type="checkbox" />
          </div>
          <div class="config-item">
            <label>循环播放</label>
            <input v-model="config.loop" type="checkbox" />
          </div>
          <div class="config-item">
            <label>显示控制栏</label>
            <input v-model="config.controls" type="checkbox" />
          </div>
          <div class="config-item">
            <label>背景透明</label>
            <input v-model="config.transparent" type="checkbox" />
          </div>
        </div>

        <div class="panel-section">
          <h3>📝 嵌入说明</h3>
          <div class="embed-info">
            <p>生成的代码可直接嵌入 PreTeXt 的 <code>&lt;figure&gt;</code> 或 <code>&lt;sidebyside&gt;</code> 元素中。</p>
            <p class="tip">💡 建议在文档中使用 <code>xml:id</code> 为每个动画指定唯一标识符。</p>
          </div>
        </div>

        <div class="panel-section">
          <h3>🎨 当前状态</h3>
          <div class="status-info">
            <div class="status-item">
              <span class="status-label">状态:</span>
              <span :class="['status-value', statusClass]">{{ statusText }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">WebGPU:</span>
              <span :class="['status-value', webgpuSupported ? 'success' : 'error']">
                {{ webgpuSupported ? '✅ 支持' : '❌ 不支持' }}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">特效数:</span>
              <span class="status-value">{{ availableEffects.length }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧：预览区域 -->
      <div class="preview-area">
        <div class="preview-header">
          <span class="preview-title">📺 实时预览</span>
          <div class="preview-actions">
            <button class="btn-icon" @click="reloadEffect" title="重新加载">
              🔄
            </button>
            <button class="btn-icon" @click="toggleFullscreen" title="全屏">
              ⛶
            </button>
          </div>
        </div>
        <div 
          ref="previewContainer" 
          class="preview-container"
          :style="previewStyle"
        >
          <div v-if="!selectedEffect" class="empty-state">
            <div class="empty-icon">🎨</div>
            <p>请从左侧选择一个特效开始预览</p>
          </div>
          <div v-else-if="isLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>正在加载特效...</p>
          </div>
          <div v-else ref="effectContainer" class="effect-wrapper"></div>
        </div>
        <div class="preview-footer">
          <span class="dimension-label">{{ config.width }} × {{ config.height }}</span>
          <span class="effect-name">{{ currentEffectName }}</span>
        </div>
      </div>
    </div>

    <!-- 代码生成弹窗 -->
    <div v-if="showCodeModal" class="modal-overlay" @click.self="showCodeModal = false">
      <div class="modal-content code-modal">
        <div class="modal-header">
          <h3>📋 PreTeXt 嵌入代码</h3>
          <button class="btn-close" @click="showCodeModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="code-tabs">
            <button 
              :class="['tab-btn', activeTab === 'pretext' && 'active']"
              @click="activeTab = 'pretext'"
            >
              PreTeXt XML
            </button>
            <button 
              :class="['tab-btn', activeTab === 'html' && 'active']"
              @click="activeTab = 'html'"
            >
              HTML/JS
            </button>
            <button 
              :class="['tab-btn', activeTab === 'iframe' && 'active']"
              @click="activeTab = 'iframe'"
            >
              iframe 嵌入
            </button>
          </div>
          <div class="code-block">
            <pre><code>{{ generatedCode }}</code></pre>
            <button class="btn-copy" @click="copyCode">
              {{ copied ? '✅ 已复制' : '📋 复制' }}
            </button>
          </div>
          <div class="code-hints">
            <h4>💡 使用提示</h4>
            <ul>
              <li>将代码复制到 PreTeXt 源文件的 <code>&lt;figure&gt;</code> 元素中</li>
              <li>确保已引入 Three.js 库（可通过 CDN 或本地）</li>
              <li>对于复杂特效，建议使用 iframe 方式嵌入</li>
              <li>可通过 CSS 自定义容器的样式和边框</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- 帮助弹窗 -->
    <div v-if="showHelp" class="modal-overlay" @click.self="showHelp = false">
      <div class="modal-content help-modal">
        <div class="modal-header">
          <h3>❓ 使用帮助</h3>
          <button class="btn-close" @click="showHelp = false">×</button>
        </div>
        <div class="modal-body">
          <div class="help-section">
            <h4>🎯 什么是 PreTeXt?</h4>
            <p>PreTeXt 是一个学术文档创作与出版系统，支持"一次编写，多处输出"（HTML、PDF、EPUB、盲文等）。</p>
          </div>
          <div class="help-section">
            <h4>📖 嵌入步骤</h4>
            <ol>
              <li>从左侧选择想要展示的 Three.js 特效</li>
              <li>调整嵌入配置（尺寸、自动播放等）</li>
              <li>点击"生成 PreTeXt 代码"按钮</li>
              <li>复制生成的代码到你的 PreTeXt 文档中</li>
              <li>编译 PreTeXt 文档查看效果</li>
            </ol>
          </div>
          <div class="help-section">
            <h4>📝 PreTeXt 示例</h4>
            <pre class="example-code"><code>&lt;figure xml:id="fig-galaxy-vortex"&gt;
  &lt;caption&gt;星系漩涡特效演示&lt;/caption&gt;
  &lt;interactive platform="javascript" 
             source="galaxy-vortex.js" 
             width="800" 
             height="600"/&gt;
&lt;/figure&gt;</code></pre>
          </div>
          <div class="help-section">
            <h4>🔗 相关链接</h4>
            <ul>
              <li><a href="https://pretextbook.org" target="_blank">PreTeXt 官网</a></li>
              <li><a href="https://github.com/PreTeXtBook/pretext" target="_blank">PreTeXt GitHub</a></li>
              <li><a href="https://threejs.org" target="_blank">Three.js 官网</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
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

// ============ 类型定义 ============
interface EffectController {
  cleanup: () => void
  stopCameraAnimation?: () => void
  clearEffect?: () => void
}

interface EmbedConfig {
  width: number
  height: number
  autoplay: boolean
  loop: boolean
  controls: boolean
  transparent: boolean
}

// ============ 响应式数据 ============
const selectedEffect = ref('')
const effectContainer = ref<HTMLDivElement>()
const previewContainer = ref<HTMLDivElement>()
const effectController = ref<EffectController | null>(null)
const isLoading = ref(false)
const showCodeModal = ref(false)
const showHelp = ref(false)
const activeTab = ref<'pretext' | 'html' | 'iframe'>('pretext')
const copied = ref(false)
const webgpuSupported = ref(false)

const config = ref<EmbedConfig>({
  width: 800,
  height: 600,
  autoplay: true,
  loop: true,
  controls: false,
  transparent: false
})

// ============ 特效映射表 ============
const effectMap: Record<string, { fn: Function; name: string; description: string }> = {
  galaxyVortex: { 
    fn: galaxyVortexEffect, 
    name: '星系漩涡',
    description: '壮观的星系漩涡粒子特效，展现宇宙星系的壮丽景象'
  },
  quantumWave: { 
    fn: quantumWaveEffect, 
    name: '量子波动',
    description: '量子力学的波动效果，展现微观世界的奇妙现象'
  },
  nebulaCloud: { 
    fn: nebulaCloudEffect, 
    name: '星云云雾',
    description: '蝴蝶纹理的星云粒子效果，神秘而梦幻'
  },
  dynamicFlowField: { 
    fn: dynamicFlowFieldEffect, 
    name: '动态流场',
    description: 'TSL节点着色器实现的流动波浪效果'
  },
  gpuParticleFlock: { 
    fn: gpuParticleFlockEffect, 
    name: 'GPU粒子群',
    description: 'WebGPU计算的粒子群集动画'
  },
  clothSimulation: { 
    fn: clothSimulationEffect, 
    name: '布料模拟',
    description: '基于物理的布料变形模拟'
  },
  crystalPalace: { 
    fn: crystalPalaceEffect, 
    name: '水晶宫殿',
    description: '水晶折射的光学效果，晶莹剔透'
  },
  crystalGarden: { 
    fn: crystalGardenEffect, 
    name: '水晶花园',
    description: '水晶生长的动态花园效果'
  },
  quantumConsciousness: { 
    fn: quantumConsciousnessEffect, 
    name: '量子意识',
    description: '量子纠缠与意识的抽象可视化'
  },
  dimensionalRift: { 
    fn: dimensionalRiftEffect, 
    name: '次元裂隙',
    description: '时空维度的裂缝效果'
  },
  quantumDreamWeaver: { 
    fn: quantumDreamWeaverEffect, 
    name: '量子织梦机',
    description: '量子节点与光子光束的梦境编织'
  },
  temporalRiftEye: { 
    fn: temporalRiftEyeEffect, 
    name: '时空裂隙之眼',
    description: '穿越时空的神秘之眼'
  },
  neonNebula: { 
    fn: neonNebulaEffect, 
    name: '霓虹星云',
    description: '赛博朋克风格的霓虹光效'
  },
  auroraDream: { 
    fn: auroraDreamEffect, 
    name: '极光梦境',
    description: '极光效果的梦幻展示'
  },
  auroraFantasy: { 
    fn: auroraFantasyEffect, 
    name: '极光幻想',
    description: '极致性能的极光特效'
  },
  quantumAuroraDream: { 
    fn: quantumAuroraDreamEffect, 
    name: '量子极光梦境',
    description: '量子与极光的融合效果'
  },
  quantumDimensionalAurora: { 
    fn: quantumDimensionalAuroraEffect, 
    name: '量子次元极光',
    description: '多维度极光展示'
  },
  cyberNeuralNetwork: { 
    fn: cyberNeuralNetworkEffect, 
    name: '赛博神经网络',
    description: 'AI神经网络的3D可视化'
  },
  quantumFluidSimulation: { 
    fn: quantumFluidSimulationEffect, 
    name: '量子流体模拟',
    description: 'GPU加速的流体动力学模拟'
  },
  quantumFluidZCopy: { 
    fn: quantumFluidZCopyEffect, 
    name: '量子流体ZCopy',
    description: '优化的量子流体效果'
  },
  quantumFluidGPU: { 
    fn: quantumFluidGPUEffect, 
    name: '量子流体GPU',
    description: '纯GPU计算的量子流体'
  },
  quantumFluidHybrid: { 
    fn: quantumFluidHybridEffect, 
    name: '量子流体混合',
    description: 'CPU+GPU混合计算流体'
  },
  quantumFluidTaichi: { 
    fn: quantumFluidTaichiEffect, 
    name: '量子流体Taichi',
    description: 'Taichi框架优化的流体效果'
  },
  quantumStorm: { 
    fn: quantumStormEffect, 
    name: '量子风暴',
    description: '激烈的量子能量风暴'
  },
  stellarSupernova: { 
    fn: stellarSupernovaEffect, 
    name: '恒星超新星',
    description: '恒星爆发的壮观场景'
  }
}

// ============ 计算属性 ============
const availableEffects = computed(() => Object.keys(effectMap))

const currentEffectName = computed(() => {
  if (!selectedEffect.value) return '未选择'
  return effectMap[selectedEffect.value]?.name || '未知'
})

const previewStyle = computed(() => ({
  width: `${config.value.width}px`,
  height: `${config.value.height}px`,
  backgroundColor: config.value.transparent ? 'transparent' : '#000'
}))

const statusText = computed(() => {
  if (isLoading.value) return '加载中...'
  if (effectController.value) return '运行中'
  if (!selectedEffect.value) return '待选择'
  return '就绪'
})

const statusClass = computed(() => {
  if (isLoading.value) return 'loading'
  if (effectController.value) return 'running'
  return 'idle'
})

const generatedCode = computed(() => {
  const effect = effectMap[selectedEffect.value]
  if (!effect) return '// 请先选择一个特效'

  switch (activeTab.value) {
    case 'pretext':
      return generatePreTeXtXML(effect)
    case 'html':
      return generateHTMLJS(effect)
    case 'iframe':
      return generateIframeEmbed(effect)
    default:
      return ''
  }
})

// ============ 代码生成函数 ============
function generatePreTeXtXML(effect: { name: string; description: string }) {
  const id = selectedEffect.value.replace(/([A-Z])/g, '-$1').toLowerCase()
  return `<!-- PreTeXt 嵌入代码 - ${effect.name} -->
<figure xml:id="fig-${id}">
  <caption>${effect.name} - ${effect.description}</caption>
  <interactive 
    platform="javascript"
    source="effects/${selectedEffect.value}.js"
    width="${config.value.width}"
    height="${config.value.height}"
    preview="${selectedEffect.value}-preview.png"
  />
  <description>
    <p>${effect.description}。此动画使用 Three.js WebGPU 技术渲染。</p>
  </description>
</figure>

<!-- 或者在 sidebyside 中使用 -->
<sidebyside widths="45% 45%" margins="auto">
  <figure xml:id="fig-${id}-left">
    <caption>${effect.name} 效果</caption>
    <interactive 
      platform="javascript"
      source="effects/${selectedEffect.value}.js"
      width="400"
      height="300"
    />
  </figure>
  <figure xml:id="fig-${id}-right">
    <caption>说明文字</caption>
    <p>这里是关于该特效的文字说明...</p>
  </figure>
</sidebyside>`
}

function generateHTMLJS(effect: { name: string; description: string }) {
  return `<!-- Three.js ${effect.name} 嵌入代码 -->
<div id="${selectedEffect.value}-container" 
     style="width: ${config.value.width}px; height: ${config.value.height}px; background: #000;">
</div>

<script type="module">
  // 引入 Three.js (根据你的项目调整路径)
  import * as THREE from 'three/webgpu';
  
  // 特效配置
  const config = {
    container: document.getElementById('${selectedEffect.value}-container'),
    width: ${config.value.width},
    height: ${config.value.height},
    autoplay: ${config.value.autoplay},
    loop: ${config.value.loop}
  };
  
  // 初始化特效 (这里需要根据实际特效导入对应模块)
  // import { ${selectedEffect.value}Effect } from './effects/${selectedEffect.value}';
  // const cleanup = ${selectedEffect.value}Effect(config.container);
  
  console.log('${effect.name} 动画已加载');
<\/script>`
}

function generateIframeEmbed(effect: { name: string; description: string }) {
  const baseUrl = window.location.origin
  return `<!-- iframe 嵌入方式 (推荐) -->
<figure xml:id="fig-${selectedEffect.value.toLowerCase()}">
  <caption>${effect.name}</caption>
  <iframe 
    src="${baseUrl}/embed/${selectedEffect.value}?width=${config.value.width}&height=${config.value.height}&autoplay=${config.value.autoplay}"
    width="${config.value.width}"
    height="${config.value.height}"
    frameborder="0"
    allowfullscreen
    title="${effect.name} - ${effect.description}"
    loading="lazy"
  ></iframe>
</figure>

<!-- 带控制栏的版本 -->
<figure>
  <caption>${effect.name} (含控制栏)</caption>
  <div class="animation-wrapper">
    <iframe 
      id="anim-${selectedEffect.value}"
      src="${baseUrl}/embed/${selectedEffect.value}"
      width="${config.value.width}"
      height="${config.value.height - 40}"
      frameborder="0"
    ></iframe>
    <div class="animation-controls">
      <button onclick="document.getElementById('anim-${selectedEffect.value}').contentWindow.postMessage('play', '*')">播放</button>
      <button onclick="document.getElementById('anim-${selectedEffect.value}').contentWindow.postMessage('pause', '*')">暂停</button>
      <button onclick="document.getElementById('anim-${selectedEffect.value}').contentWindow.postMessage('reset', '*')">重置</button>
    </div>
  </div>
</figure>`
}

// ============ 方法 ============
async function loadEffect() {
  if (!selectedEffect.value) {
    clearCurrentEffect()
    return
  }

  isLoading.value = true
  clearCurrentEffect()

  await nextTick()

  if (!effectContainer.value) {
    isLoading.value = false
    return
  }

  const effect = effectMap[selectedEffect.value]
  if (!effect) {
    isLoading.value = false
    return
  }

  try {
    // 等待容器尺寸生效
    await new Promise(resolve => setTimeout(resolve, 100))

    const result = effect.fn(effectContainer.value)

    // 兼容同步/异步返回值
    if (result instanceof Promise) {
      const resolvedResult = await result
      if (typeof resolvedResult === 'function') {
        effectController.value = { cleanup: resolvedResult }
      } else if (resolvedResult && typeof resolvedResult === 'object') {
        effectController.value = resolvedResult as EffectController
      }
    } else if (typeof result === 'function') {
      effectController.value = { cleanup: result }
    } else if (result && typeof result === 'object') {
      effectController.value = result as EffectController
    }

    console.log(`✅ 特效 "${effect.name}" 加载成功`)
  } catch (error) {
    console.error('加载特效失败:', error)
    alert(`加载特效失败: ${error}`)
  } finally {
    isLoading.value = false
  }
}

function clearCurrentEffect() {
  if (effectController.value) {
    try {
      effectController.value.cleanup()
    } catch (e) {
      console.warn('清理特效时出错:', e)
    }
    effectController.value = null
  }

  if (effectContainer.value) {
    effectContainer.value.innerHTML = ''
  }
}

function reloadEffect() {
  if (selectedEffect.value) {
    loadEffect()
  }
}

function toggleFullscreen() {
  if (!previewContainer.value) return

  if (!document.fullscreenElement) {
    previewContainer.value.requestFullscreen().catch(err => {
      console.error('全屏模式错误:', err)
    })
  } else {
    document.exitFullscreen()
  }
}

function generatePreTeXtCode() {
  if (!selectedEffect.value) {
    alert('请先选择一个特效')
    return
  }
  activeTab.value = 'pretext'
  showCodeModal.value = true
}

function previewStandalone() {
  if (!selectedEffect.value) {
    alert('请先选择一个特效')
    return
  }
  // 在新标签页打开独立预览
  const url = `/embed/${selectedEffect.value}?width=${config.value.width}&height=${config.value.height}&standalone=true`
  window.open(url, '_blank')
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(generatedCode.value)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (err) {
    console.error('复制失败:', err)
    alert('复制失败，请手动复制')
  }
}

// ============ 生命周期 ============
onMounted(() => {
  // 检查 WebGPU 支持
  webgpuSupported.value = !!navigator.gpu

  if (!webgpuSupported.value) {
    console.warn('浏览器不支持 WebGPU，部分特效可能无法正常运行')
  }

  console.log('🎨 PreTeXt 动画嵌入器已就绪')
  console.log(`可用特效数量: ${availableEffects.value.length}`)
})

onBeforeUnmount(() => {
  clearCurrentEffect()
})
</script>

<style lang="scss" scoped>
.pretext-embedder {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
  color: #e0e0e0;
  overflow: hidden;
}

// ============ 工具栏 ============
.toolbar {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);

  .title {
    font-size: 20px;
    font-weight: 600;
    background: linear-gradient(90deg, #00f5ff, #ff00ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
  }

  .actions {
    display: flex;
    gap: 12px;
  }
}

// ============ 按钮样式 ============
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }
  }

  &.btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #e0e0e0;
    border: 1px solid rgba(255, 255, 255, 0.2);

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }

  &.btn-info {
    background: rgba(0, 245, 255, 0.2);
    color: #00f5ff;
    border: 1px solid rgba(0, 245, 255, 0.3);

    &:hover {
      background: rgba(0, 245, 255, 0.3);
    }
  }
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
}

// ============ 主内容区 ============
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

// ============ 控制面板 ============
.control-panel {
  width: 320px;
  background: rgba(0, 0, 0, 0.3);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
}

.panel-section {
  margin-bottom: 24px;

  h3 {
    font-size: 14px;
    font-weight: 600;
    color: #00f5ff;
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
}

.effect-select {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.5);
  color: #e0e0e0;
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #00f5ff;
  }

  optgroup {
    color: #ff00ff;
    font-weight: 600;
  }

  option {
    color: #e0e0e0;
    background: #1a1a2e;
    padding: 8px;
  }
}

.config-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  label {
    flex: 1;
    font-size: 13px;
    color: #b0b0b0;
  }

  input[type="number"] {
    width: 80px;
    padding: 8px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(0, 0, 0, 0.5);
    color: #e0e0e0;
    text-align: center;
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    accent-color: #00f5ff;
    cursor: pointer;
  }

  span {
    font-size: 12px;
    color: #808080;
  }
}

.embed-info {
  background: rgba(0, 245, 255, 0.1);
  border: 1px solid rgba(0, 245, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;

  code {
    background: rgba(0, 0, 0, 0.5);
    padding: 2px 6px;
    border-radius: 4px;
    color: #ff00ff;
  }

  .tip {
    color: #ffd700;
    margin-top: 8px;
  }
}

.status-info {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;

  &:last-child {
    margin-bottom: 0;
  }
}

.status-label {
  color: #808080;
}

.status-value {
  font-weight: 600;

  &.loading {
    color: #ffd700;
  }

  &.running {
    color: #00ff88;
  }

  &.idle {
    color: #808080;
  }

  &.success {
    color: #00ff88;
  }

  &.error {
    color: #ff4444;
  }
}

// ============ 预览区域 ============
.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .preview-title {
    font-size: 16px;
    font-weight: 600;
    color: #e0e0e0;
  }

  .preview-actions {
    display: flex;
    gap: 8px;
  }
}

.preview-container {
  flex: 1;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  transition: all 0.3s ease;
}

.effect-wrapper {
  width: 100%;
  height: 100%;
}

.empty-state {
  text-align: center;
  color: #808080;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  p {
    font-size: 16px;
  }
}

.loading-state {
  text-align: center;
  color: #00f5ff;

  .loading-spinner {
    width: 60px;
    height: 60px;
    border: 3px solid rgba(0, 245, 255, 0.2);
    border-top-color: #00f5ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }

  p {
    font-size: 14px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  font-size: 13px;

  .dimension-label {
    color: #808080;
    font-family: monospace;
  }

  .effect-name {
    color: #00f5ff;
    font-weight: 600;
  }
}

// ============ 弹窗样式 ============
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  max-width: 900px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h3 {
    margin: 0;
    font-size: 18px;
    color: #e0e0e0;
  }
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 68, 68, 0.3);
    color: #ff4444;
  }
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.code-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;

  .tab-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: #b0b0b0;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    &:hover:not(.active) {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.code-block {
  position: relative;
  background: #0d1117;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;

  pre {
    margin: 0;
    padding: 20px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.6;

    code {
      color: #e0e0e0;
      font-family: 'Fira Code', 'Consolas', monospace;
    }
  }

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
}

.btn-copy {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.code-hints {
  background: rgba(0, 245, 255, 0.1);
  border: 1px solid rgba(0, 245, 255, 0.2);
  border-radius: 8px;
  padding: 16px;

  h4 {
    margin: 0 0 12px 0;
    color: #00f5ff;
    font-size: 14px;
  }

  ul {
    margin: 0;
    padding-left: 20px;
    font-size: 13px;
    line-height: 1.8;
    color: #b0b0b0;

    code {
      background: rgba(0, 0, 0, 0.5);
      padding: 2px 6px;
      border-radius: 4px;
      color: #ff00ff;
    }
  }
}

// ============ 帮助弹窗 ============
.help-section {
  margin-bottom: 24px;

  h4 {
    color: #00f5ff;
    font-size: 16px;
    margin: 0 0 12px 0;
  }

  p {
    color: #b0b0b0;
    line-height: 1.6;
    margin: 0;
  }

  ol {
    color: #b0b0b0;
    line-height: 2;
    padding-left: 20px;

    li {
      margin-bottom: 4px;
    }
  }

  ul {
    color: #b0b0b0;
    line-height: 2;
    padding-left: 20px;

    a {
      color: #00f5ff;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.example-code {
  background: #0d1117;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;

  code {
    color: #e0e0e0;
    font-family: 'Fira Code', 'Consolas', monospace;
  }
}

// ============ 响应式适配 ============
@media (max-width: 1024px) {
  .control-panel {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }

  .control-panel {
    width: 100%;
    height: 300px;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .preview-area {
    padding: 16px;
  }

  .toolbar {
    flex-direction: column;
    height: auto;
    padding: 16px;
    gap: 12px;
  }
}
</style>
