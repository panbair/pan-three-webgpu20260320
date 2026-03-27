<template>
  <div class="model-container">
    <div ref="canvasContainer" class="canvas-container"></div>
    <div class="model-controls">
      <h2>3D模型查看器</h2>
      <div class="view-mode">
        <button :class="{ active: !showAllModels }" @click="switchViewMode(false)">单个模型</button>
        <button :class="{ active: showAllModels }" @click="switchViewMode(true)">全部显示</button>
      </div>
      <div v-if="!showAllModels" class="model-selector">
        <button
          v-for="model in modelFiles"
          :key="model.name"
          :class="{ active: currentModel === model.path }"
          @click="loadModel(model.path)"
        >
          {{ model.name }}
        </button>
      </div>
      <div class="info">
        <p v-if="showAllModels">显示所有模型 ({{ modelFiles.length }}个)</p>
        <p v-else-if="currentModelName">当前模型: {{ currentModelName }}</p>
        <p>拖动旋转 | 滚轮缩放 | 右键平移</p>
      </div>
    </div>

    <!-- 加载进度提示 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-text">{{ loadingText }}</p>
        <div class="loading-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
          </div>
          <p class="progress-text">{{ loadingProgress.toFixed(1) }}%</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'

// 模型文件列表
const modelFiles = [
  { name: '城堡1', path: '/model/chengbao.glb' },
  { name: '城堡2', path: '/model/chengbao2.glb' },
  { name: '城堡3', path: '/model/chengbao3.glb' },
  { name: '城堡4', path: '/model/chengbao4.glb' },
  { name: '城堡5', path: '/model/chengbao5.glb' },
  { name: '城堡6', path: '/model/chengbao6.glb' },
  { name: '城堡7', path: '/model/chengbao7.glb' },
  { name: '城堡8', path: '/model/chengbao8.glb' },
  { name: '城堡9', path: '/model/chengbao9.glb' },
  { name: '城堡10', path: '/model/chengbao10.glb' },
  { name: '城堡11', path: '/model/chengbao11.glb' },
  { name: '城堡12', path: '/model/chengbao12.glb' },
  { name: '城堡13', path: '/model/chengbao13.glb' }

]

// 响应式引用
const canvasContainer = ref<HTMLDivElement>()
const currentModel = ref('')
const currentModelName = ref('')
const showAllModels = ref(false)
const loading = ref(false)
const loadingProgress = ref(0)
const loadingText = ref('')

// Three.js 核心对象
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGPURenderer | null = null
let controls: OrbitControls | null = null
let stats: Stats | null = null
let currentGLTF: any = null
let allGLTFs: any[] = []
let animationId: number | null = null

// 初始化场景
const initScene = async () => {
  if (!canvasContainer.value) return

  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight

  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f5f5)
  scene.fog = new THREE.Fog(0xf5f5f5, 30, 150)

  // 创建相机
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.set(0, 10, 30)

  // 创建渲染器
  renderer = new THREE.WebGPURenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance'
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  canvasContainer.value.appendChild(renderer.domElement)

  // 初始化 WebGPU
  await renderer.init()

  // 添加灯光 - 简化灯光数量提升性能
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
  directionalLight.position.set(10, 20, 10)
  directionalLight.castShadow = false
  scene.add(directionalLight)

  // 创建控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 5
  controls.maxDistance = 100
  controls.maxPolarAngle = Math.PI / 2

  // 添加网格辅助 - 降低精度
  const gridHelper = new THREE.GridHelper(100, 50, 0xcccccc, 0xe5e5e5)
  scene.add(gridHelper)

  // 添加性能监控
  stats = new Stats()
  stats.dom.style.position = 'absolute'
  stats.dom.style.top = '20px'
  stats.dom.style.right = '20px'
  stats.dom.style.left = 'auto'
  canvasContainer.value.appendChild(stats.dom)

  // 开始渲染循环
  animate()

  // 默认加载第一个模型
  await loadModel(modelFiles[0].path)
}

// 加载模型
const loadModel = async (path: string) => {
  if (!scene || !camera) return

  // 移除旧模型
  if (currentGLTF) {
    scene.remove(currentGLTF.scene)
    currentGLTF = null
  }

  currentModel.value = path
  const modelName = modelFiles.find((m) => m.path === path)?.name || ''
  currentModelName.value = modelName

  // 显示加载状态
  loading.value = true
  loadingProgress.value = 0
  loadingText.value = `正在加载: ${modelName}`

  try {
    const loader = new GLTFLoader()

    loader.load(
      path,
      (gltf: any) => {
        currentGLTF = gltf

        // 自动缩放模型以适应场景
        const box = new THREE.Box3().setFromObject(gltf.scene)
        const size = new THREE.Vector3()
        box.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 20 / maxDim
        gltf.scene.scale.setScalar(scale)

        // 居中模型
        const center = new THREE.Vector3()
        box.getCenter(center)
        gltf.scene.position.sub(center.multiplyScalar(scale))

        scene.add(gltf.scene)

        // 优化模型渲染 - 禁用阴影和实时更新
        gltf.scene.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = false
            child.receiveShadow = false
            child.frustumCulled = false
          }
        })

        // 完成加载
        loadingProgress.value = 100
        setTimeout(() => {
          loading.value = false
        }, 500)

        console.log(`模型加载成功: ${path}`)
        console.log(`缩放比例: ${scale.toFixed(2)}`)
      },
      (progress: any) => {
        const percent = (progress.loaded / progress.total) * 100
        loadingProgress.value = percent
        console.log(`加载进度: ${percent.toFixed(1)}%`)
      },
      (error: any) => {
        loading.value = false
        loadingText.value = `加载失败: ${modelName}`
        console.error('模型加载失败:', error)
      }
    )
  } catch (error) {
    loading.value = false
    console.error('加载模型时出错:', error)
  }
}

// 切换视图模式
const switchViewMode = async (showAll: boolean) => {
  if (showAllModels.value === showAll) return
  showAllModels.value = showAll

  if (showAll) {
    // 切换到全部显示模式
    await loadAllModels()
  } else {
    // 切换到单个模型模式
    await clearAllModels()
    if (currentModel.value) {
      await loadModel(currentModel.value)
    } else {
      await loadModel(modelFiles[0].path)
    }
  }
}

// 加载所有模型
const loadAllModels = async () => {
  if (!scene || !camera) return

  // 显示加载状态
  loading.value = true
  loadingProgress.value = 0
  loadingText.value = '正在加载所有模型...'

  // 清除当前单个模型
  if (currentGLTF) {
    scene.remove(currentGLTF.scene)
    currentGLTF = null
  }

  // 清除之前的所有模型
  allGLTFs.forEach((gltf) => {
    scene?.remove(gltf.scene)
  })
  allGLTFs = []

  currentModel.value = ''
  currentModelName.value = ''

  try {
    const loader = new GLTFLoader()
    const gridSize = 4 // 4x4 网格
    const spacing = 30 // 模型间距

    let loadedCount = 0

    // 加载所有模型
    const loadPromises = modelFiles.map((modelFile, index) => {
      return new Promise<void>((resolve) => {
        loader.load(
          modelFile.path,
          (gltf: any) => {
            allGLTFs.push(gltf)

            // 计算网格位置
            const row = Math.floor(index / gridSize)
            const col = index % gridSize
            const x = (col - gridSize / 2) * spacing + spacing / 2
            const z = (row - 2) * spacing + spacing / 2

            // 自动缩放模型
            const box = new THREE.Box3().setFromObject(gltf.scene)
            const size = new THREE.Vector3()
            box.getSize(size)
            const maxDim = Math.max(size.x, size.y, size.z)
            const scale = 15 / maxDim // 全部显示时缩小一点
            gltf.scene.scale.setScalar(scale)

            // 居中模型
            const center = new THREE.Vector3()
            box.getCenter(center)
            gltf.scene.position.sub(center.multiplyScalar(scale))

            // 放置到网格位置
            gltf.scene.position.x += x
            gltf.scene.position.z += z

            scene?.add(gltf.scene)

            // 优化模型渲染
            gltf.scene.traverse((child: any) => {
              if (child.isMesh) {
                child.castShadow = false
                child.receiveShadow = false
                child.frustumCulled = false
              }
            })

            // 更新加载进度
            loadedCount++
            loadingProgress.value = (loadedCount / modelFiles.length) * 100
            loadingText.value = `正在加载: ${modelFile.name} (${loadedCount}/${modelFiles.length})`

            console.log(`模型加载成功: ${modelFile.name}，位置: (${x}, 0, ${z})`)
            resolve()
          },
          (progress: any) => {
            const percent = (progress.loaded / progress.total) * 100
            const overallProgress =
              ((loadedCount * 100 + percent) / modelFiles.length).toFixed(1)
            loadingProgress.value = Number.parseFloat(overallProgress)
            console.log(`${modelFile.name} 加载进度: ${percent.toFixed(1)}%`)
          },
          (error: any) => {
            console.error(`模型 ${modelFile.name} 加载失败:`, error)
            loadedCount++
            loadingProgress.value = (loadedCount / modelFiles.length) * 100
            resolve()
          }
        )
      })
    })

    await Promise.all(loadPromises)
    console.log(`所有模型加载完成，共 ${allGLTFs.length} 个`)

    // 完成加载
    loadingText.value = '加载完成!'
    setTimeout(() => {
      loading.value = false
    }, 800)

    // 调整相机位置以查看所有模型
    if (camera) {
      camera.position.set(0, 60, 80)
      camera.lookAt(0, 0, 0)
    }
  } catch (error) {
    loading.value = false
    loadingText.value = '加载失败'
    console.error('加载所有模型时出错:', error)
  }
}

// 清除所有模型
const clearAllModels = () => {
  if (!scene) return

  allGLTFs.forEach((gltf) => {
    scene.remove(gltf.scene)
  })
  allGLTFs = []
}

// 动画循环
const animate = () => {
  animationId = requestAnimationFrame(animate)

  if (!renderer || !scene || !camera) return

  // 更新控制器
  if (controls) {
    controls.update()
  }

  // 更新性能监控
  if (stats) {
    stats.update()
  }

  // 渲染
  renderer.render(scene, camera)
}

// 窗口大小调整
const handleResize = () => {
  if (!camera || !renderer || !canvasContainer.value) return

  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  renderer.setSize(width, height)
}

// 清理资源
const cleanup = () => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  // 清除单个模型
  if (currentGLTF) {
    scene?.remove(currentGLTF.scene)
    currentGLTF = null
  }

  // 清除所有模型
  allGLTFs.forEach((gltf) => {
    scene?.remove(gltf.scene)
  })
  allGLTFs = []

  controls?.dispose()
  stats?.dom.remove()

  if (renderer) {
    renderer.dispose()
    renderer = null
  }

  scene = null
  camera = null
}

// 生命周期钩子
onMounted(async () => {
  await initScene()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  cleanup()
})
</script>

<style lang="scss" scoped>
.model-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.canvas-container {
  width: 100%;
  height: 100%;
  display: block;
}

.model-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 12px;
  color: white;
  z-index: 10;
  max-width: 300px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);

  h2 {
    margin: 0 0 15px 0;
    font-size: 18px;
    color: #00ffff;
  }

  .view-mode {
    display: flex;
    gap: 8px;
    margin-bottom: 15px;

    button {
      flex: 1;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s ease;

      &:hover {
        background: rgba(0, 255, 255, 0.2);
        border-color: #00ffff;
      }

      &.active {
        background: #00ffff;
        color: #000;
        border-color: #00ffff;
        font-weight: bold;
      }
    }
  }

  .model-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 15px;

    button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s ease;

      &:hover {
        background: rgba(0, 255, 255, 0.2);
        border-color: #00ffff;
      }

      &.active {
        background: #00ffff;
        color: #000;
        border-color: #00ffff;
        font-weight: bold;
      }
    }
  }

  .info {
    p {
      margin: 5px 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.6;

      &:first-child {
        color: #00ffff;
        font-weight: bold;
      }
    }
  }
}

// 加载进度遮罩
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.loading-content {
  text-align: center;
  color: white;
  padding: 40px 60px;
  background: rgba(30, 30, 50, 0.9);
  border-radius: 20px;
  border: 2px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 40px rgba(0, 255, 255, 0.2);
}

.loading-spinner {
  width: 60px;
  height: 60px;
  margin: 0 auto 20px;
  border: 4px solid rgba(0, 255, 255, 0.2);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 18px;
  margin: 0 0 20px 0;
  color: #00ffff;
  font-weight: 600;
}

.loading-progress {
  margin-top: 20px;
}

.progress-bar {
  width: 300px;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin: 0 auto 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ffff, #00ff88, #00ffff);
  background-size: 200% 100%;
  animation: shimmer 2s linear infinite;
  border-radius: 4px;
  transition: width 0.3s ease;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.progress-text {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}
</style>
