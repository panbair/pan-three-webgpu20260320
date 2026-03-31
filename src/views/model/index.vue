<template>
  <div class="model-container">
    <div ref="canvasContainer" class="canvas-container"></div>
    <div class="model-controls">
      <h2>3D模型查看器</h2>
      <div class="view-mode">
        <button :class="{ active: !showAllModels }" @click="switchViewMode(false)">单个模型</button>
        <button :class="{ active: showAllModels }" @click="switchViewMode(true)">网格显示</button>
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
      <div v-if="showAllModels" class="grid-size-control">
        <label>显示数量:</label>
        <button
          v-for="size in gridSizes"
          :key="size"
          :class="{ active: currentGridSize === size }"
          @click="loadAllModels(size)"
        >
          {{ size }}个
        </button>
      </div>
      <div class="info">
        <p v-if="showAllModels">当前显示: {{ currentGridSize }}个模型</p>
        <p v-else-if="currentModelName">当前模型: {{ currentModelName }}</p>
        <p>
          左键平移 | 右键旋转 | 滚轮缩放
          <span v-if="showAllModels">| 点击模型聚焦</span>
        </p>
      </div>
    </div>

    <!-- 地图控制UI组件 -->
    <MapControlsUI
      :active="autoRotate"
      :rotate-speed="rotateSpeed"
      :position="cameraPosition"
      @reset-view="resetView"
      @set-top-view="setTopView"
      @set-front-view="setFrontView"
      @set-side-view="setSideView"
      @move-camera="moveCamera"
      @zoom-camera="zoomCamera"
      @toggle-auto-rotate="toggleAutoRotate"
      @update-speed="rotateSpeed = $event"
    />

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
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import MapControlsUI from '@/components/MapControls.vue'

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
  { name: '城堡13', path: '/model/chengbao13.glb' },
  { name: '城堡14', path: '/model/chengbao14.glb' },
  { name: '城堡15', path: '/model/chengbao15.glb' },
  { name: '城堡16', path: '/model/chengbao16.glb' },
  { name: '城堡17', path: '/model/chengbao17.glb' },
  { name: '城堡18', path: '/model/chengbao18.glb' },
  { name: '城堡19', path: '/model/chengbao19.glb' }
]

// 响应式引用
const canvasContainer = ref<HTMLDivElement>()
const currentModel = ref('')
const currentModelName = ref('')
const showAllModels = ref(false)
const loading = ref(false)
const loadingProgress = ref(0)
const loadingText = ref('')
const autoRotate = ref(false)
const rotateSpeed = ref(1.0)
const cameraPosition = ref({ x: 0, y: 10, z: 30 })
const gridSizes = [4, 9, 13, 19]
const currentGridSize = ref(19) // 默认显示全部19个模型

// Three.js 核心对象
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGPURenderer | null = null
let controls: MapControls | null = null
let stats: Stats | null = null
let raycaster: THREE.Raycaster | null = null
let mouse: THREE.Vector2 | null = null
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
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false // 禁用绘制缓冲保留以节省内存
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 0.75)) // 进一步降低像素比
  canvasContainer.value.appendChild(renderer.domElement)

  // 初始化 WebGPU
  await renderer.init()

  // 添加灯光 - 进一步简化灯光提升性能
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)

  // 只使用一个方向光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
  directionalLight.position.set(10, 20, 10)
  directionalLight.castShadow = false
  scene.add(directionalLight)

  // 创建 MapControls 控制器（专为地图设计：右键旋转，左键平移）
  controls = new MapControls(camera, renderer.domElement)
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

  // 初始化射线检测器（用于点击选择模型）
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  // 添加点击事件监听
  renderer.domElement.addEventListener('click', onCanvasClick)

  // 开始渲染循环
  animate()

  // 不再默认加载单个模型，等待 onMounted 中切换到网格模式
}

// 深度清理模型资源
const disposeModel = (gltf: any) => {
  if (!gltf) return

  gltf.scene.traverse((child: any) => {
    if (child.isMesh) {
      // 清理几何体
      if (child.geometry) {
        child.geometry.dispose()
      }
      // 清理材质和纹理
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: any) => disposeMaterial(mat))
        } else {
          disposeMaterial(child.material)
        }
      }
    }
  })
}

const disposeMaterial = (material: any) => {
  if (material.map) material.map.dispose()
  if (material.normalMap) material.normalMap.dispose()
  if (material.roughnessMap) material.roughnessMap.dispose()
  if (material.metalnessMap) material.metalnessMap.dispose()
  if (material.emissiveMap) material.emissiveMap.dispose()
  material.dispose()
}

// 加载模型
const loadModel = async (path: string) => {
  if (!scene || !camera) return

  // 移除旧模型并清理资源
  if (currentGLTF) {
    disposeModel(currentGLTF)
    scene.remove(currentGLTF.scene)
    currentGLTF = null
  }

  currentModel.value = path
  const modelName = modelFiles.find(m => m.path === path)?.name || ''
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
    // 切换到全部显示模式，默认加载4个
    await loadAllModels(currentGridSize.value)
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

// 加载指定数量的模型（优化性能）
const loadAllModels = async (count: number = 4) => {
  if (!scene || !camera) return

  // 更新当前网格大小
  currentGridSize.value = count

  // 显示加载状态
  loading.value = true
  loadingProgress.value = 0
  loadingText.value = `正在加载 ${count} 个模型...`

  // 清除当前单个模型并释放资源
  if (currentGLTF) {
    disposeModel(currentGLTF)
    scene.remove(currentGLTF.scene)
    currentGLTF = null
  }

  // 清除之前的所有模型并释放资源
  allGLTFs.forEach(gltf => {
    disposeModel(gltf)
    scene?.remove(gltf.scene)
  })
  allGLTFs = []

  currentModel.value = ''
  currentModelName.value = ''

  try {
    const loader = new GLTFLoader()
    const gridSize = Math.ceil(Math.sqrt(count))
    const spacing = 25 // 减小间距以节省视野空间

    // 只加载指定数量的模型
    const modelsToLoad = modelFiles.slice(0, count)
    let loadedCount = 0

    // 根据模型数量调整并发数
    const maxConcurrent = count <= 9 ? 3 : 2 // 19个模型时每次只加载2个
    for (let i = 0; i < modelsToLoad.length; i += maxConcurrent) {
      const batch = modelsToLoad.slice(i, i + maxConcurrent)

      const loadPromises = batch.map((modelFile, index) => {
        return new Promise<void>(resolve => {
          loader.load(
            modelFile.path,
            (gltf: any) => {
              allGLTFs.push(gltf)

              const realIndex = i + index
              const row = Math.floor(realIndex / gridSize)
              const col = realIndex % gridSize
              const x = (col - gridSize / 2) * spacing + spacing / 2
              const z = (row - gridSize / 2) * spacing + spacing / 2

              // 自动缩放模型
              const box = new THREE.Box3().setFromObject(gltf.scene)
              const size = new THREE.Vector3()
              box.getSize(size)
              const maxDim = Math.max(size.x, size.y, size.z)
              const scale = 10 / maxDim // 进一步缩小模型以减少渲染负载
              gltf.scene.scale.setScalar(scale)

              const center = new THREE.Vector3()
              box.getCenter(center)
              gltf.scene.position.sub(center.multiplyScalar(scale))

              gltf.scene.position.x += x
              gltf.scene.position.z += z

              scene?.add(gltf.scene)

              // 优化模型渲染
              gltf.scene.traverse((child: any) => {
                if (child.isMesh) {
                  child.castShadow = false
                  child.receiveShadow = false
                  child.frustumCulled = false
                  // 优化材质
                  if (child.material) {
                    child.material.side = THREE.FrontSide // 只渲染正面
                  }
                }
              })

              loadedCount++
              loadingProgress.value = (loadedCount / count) * 100
              loadingText.value = `正在加载: ${modelFile.name} (${loadedCount}/${count})`

              console.log(`模型加载成功: ${modelFile.name}，位置: (${x}, 0, ${z})`)
              resolve()
            },
            (progress: any) => {
              const percent = (progress.loaded / progress.total) * 100
              const overallProgress = ((loadedCount * 100 + percent) / count).toFixed(1)
              loadingProgress.value = Number.parseFloat(overallProgress)
              console.log(`${modelFile.name} 加载进度: ${percent.toFixed(1)}%`)
            },
            (error: any) => {
              console.error(`模型 ${modelFile.name} 加载失败:`, error)
              loadedCount++
              loadingProgress.value = (loadedCount / count) * 100
              resolve()
            }
          )
        })
      })

      await Promise.all(loadPromises)

      // 每批加载后短暂等待，让GPU释放资源
      if (i + maxConcurrent < modelsToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 150)) // 增加等待时间
      }
    }

    console.log(`模型加载完成，共 ${allGLTFs.length} 个`)

    // 完成加载
    loadingText.value = '加载完成!'
    setTimeout(() => {
      loading.value = false
    }, 800)

    // 调整相机位置以查看所有模型
    if (camera) {
      let cameraHeight = 40
      let cameraDistance = 50

      if (count > 4) {
        cameraHeight = 60
        cameraDistance = 70
      }
      if (count > 9) {
        cameraHeight = 80
        cameraDistance = 90
      }
      if (count > 13) {
        cameraHeight = 100 // 19个模型时提高相机高度
        cameraDistance = 110
      }

      camera.position.set(0, cameraHeight, cameraDistance)
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

  allGLTFs.forEach(gltf => {
    disposeModel(gltf)
    scene.remove(gltf.scene)
  })
  allGLTFs = []
}

// 地图控制功能
const resetView = () => {
  if (!camera || !controls) return
  if (showAllModels.value) {
    camera.position.set(0, 60, 80)
  } else {
    camera.position.set(0, 10, 30)
  }
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  updateCameraPosition()
}

const setTopView = () => {
  if (!camera || !controls) return
  camera.position.set(0, 100, 0)
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  updateCameraPosition()
}

const setFrontView = () => {
  if (!camera || !controls) return
  if (showAllModels.value) {
    camera.position.set(0, 30, 100)
  } else {
    camera.position.set(0, 10, 50)
  }
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  updateCameraPosition()
}

const setSideView = () => {
  if (!camera || !controls) return
  if (showAllModels.value) {
    camera.position.set(100, 30, 0)
  } else {
    camera.position.set(50, 10, 0)
  }
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  updateCameraPosition()
}

const moveCamera = (direction: string) => {
  if (!camera) return
  const step = 10
  switch (direction) {
    case 'up':
      camera.position.y += step
      break
    case 'down':
      camera.position.y -= step
      break
    case 'left':
      camera.position.x -= step
      break
    case 'right':
      camera.position.x += step
      break
  }
  updateCameraPosition()
}

const zoomCamera = (direction: string) => {
  if (!camera) return
  const zoomStep = 10
  const directionVector = new THREE.Vector3()
  camera.getWorldDirection(directionVector)

  if (direction === 'in') {
    camera.position.addScaledVector(directionVector, zoomStep)
  } else {
    camera.position.addScaledVector(directionVector, -zoomStep)
  }
  updateCameraPosition()
}

const toggleAutoRotate = () => {
  if (!controls) return
  autoRotate.value = !autoRotate.value
  controls.autoRotate = autoRotate.value
  controls.autoRotateSpeed = rotateSpeed.value * 2
}

const updateCameraPosition = () => {
  if (!camera) return
  cameraPosition.value = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z
  }
}

// 点击画布事件处理
const onCanvasClick = (event: MouseEvent) => {
  if (!scene || !camera || !raycaster || !mouse) return
  if (!showAllModels.value) return // 只在网格显示模式下启用点击

  // 获取鼠标位置（归一化到 -1 到 1）
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  // 更新射线
  raycaster.setFromCamera(mouse, camera)

  // 检测所有模型的相交
  const intersects: any[] = []

  allGLTFs.forEach((gltf, index) => {
    const modelIntersects = raycaster?.intersectObject(gltf.scene, true)
    if (modelIntersects && modelIntersects.length > 0) {
      intersects.push(...modelIntersects.map((intersect: any) => ({ ...intersect, gltf, index })))
    }
  })

  if (intersects.length > 0) {
    // 找到最近的相交对象
    intersects.sort((a, b) => a.distance - b.distance)
    const nearest = intersects[0]

    // 相机移动到选中模型的位置
    focusOnModel(nearest.index)
  }
}

// 聚焦到指定模型
const focusOnModel = async (modelIndex: number) => {
  if (!camera || !controls || !scene || allGLTFs.length === 0) return

  const gltf = allGLTFs[modelIndex]
  if (!gltf) return

  // 获取模型的世界位置
  const box = new THREE.Box3().setFromObject(gltf.scene)
  const center = new THREE.Vector3()
  box.getCenter(center)

  // 计算目标相机位置（在模型前方）
  const targetPosition = center.clone()
  targetPosition.y += 10
  targetPosition.z += 25

  // 关闭自动旋转
  controls.autoRotate = false
  autoRotate.value = false

  // 使用 OrbitControls 平滑移动到目标位置
  const startPosition = camera.position.clone()
  const startTarget = controls.target.clone()
  const duration = 1000 // 1秒
  const startTime = performance.now()

  const animateCamera = () => {
    const elapsed = performance.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeProgress = 1 - Math.pow(1 - progress, 3) // 缓动函数

    // 直接修改相机位置和目标点，让 OrbitControls 同步
    camera.position.lerpVectors(startPosition, targetPosition, easeProgress)
    controls.target.lerpVectors(startTarget, center, easeProgress)

    // 重要：更新 OrbitControls 的内部状态
    controls.update()

    if (progress < 1) {
      requestAnimationFrame(animateCamera)
    } else {
      console.log(`聚焦到模型: ${modelFiles[modelIndex].name}`)
    }
  }

  animateCamera()
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

  // 更新相机位置显示
  updateCameraPosition()

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

  // 清除单个模型并释放资源
  if (currentGLTF) {
    disposeModel(currentGLTF)
    scene?.remove(currentGLTF.scene)
    currentGLTF = null
  }

  // 清除所有模型并释放资源
  allGLTFs.forEach(gltf => {
    disposeModel(gltf)
    scene?.remove(gltf.scene)
  })
  allGLTFs = []

  // 移除点击事件监听
  if (renderer) {
    renderer.domElement.removeEventListener('click', onCanvasClick)
  }

  controls?.dispose()
  stats?.dom.remove()

  if (renderer) {
    renderer.dispose()
    renderer = null
  }

  raycaster = null
  mouse = null
  scene = null
  camera = null
}

// 生命周期钩子
onMounted(async () => {
  await initScene()
  window.addEventListener('resize', handleResize)

  // 直接切换到全部显示模式，加载4个模型
  await switchViewMode(true)
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

  .grid-size-control {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 15px;

    label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }

    button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
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
