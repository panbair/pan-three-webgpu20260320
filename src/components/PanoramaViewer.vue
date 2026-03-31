<template>
  <div ref="containerRef" class="panorama-container">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载全景图中... ({{ loadingProgress }}%)</div>
    </div>
    <div v-if="showHint" class="hint-overlay">
      <div class="hint-text">双击开启/关闭自动旋转</div>
    </div>
    <div v-if="error" class="error-overlay">
      <div class="error-text">{{ error }}</div>
      <button @click="retry" class="retry-button">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const containerRef = ref<HTMLDivElement>()
const loading = ref(true)
const loadingProgress = ref(0)
const showHint = ref(true)
const error = ref('')

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let sphere: THREE.Mesh | null = null
let animationId: number | null = null
let hintTimeout: number | null = null

// 使用 public 目录的图片路径
// const PANORAMA_IMAGE = '/quanjingtu/home.png'

const props = defineProps({
  imageUrl: {
    type: String,
    default: '/quanjingtu/home.png'
  },
  autoRotate: {
    type: Boolean,
    default: true
  },
  autoRotateSpeed: {
    type: Number,
    default: 0.8
  }
})

const initThree = async () => {
  try {
    console.log('PanoramaViewer: 初始化开始')
    console.log('PanoramaViewer: 图片路径:', props.imageUrl)

    if (!containerRef.value) {
      console.error('PanoramaViewer: containerRef 为空')
      return
    }

    const width = containerRef.value.clientWidth
    const height = containerRef.value.clientHeight

    console.log('PanoramaViewer: 容器尺寸', width, height)

    // 创建场景
    scene = new THREE.Scene()

    // 创建相机 - 相机在球体内部原点
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(0.00993113, 0.000887497, -0.0007647989)

    // 创建WebGL渲染器，优先使用WebGPU（如果可用）
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      stencil: false,
      depth: true
    })

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setRenderTarget(null)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0

    // 优化性能设置
    renderer.setClearColor(0x000000)

    containerRef.value.appendChild(renderer.domElement)

    // 创建OrbitControls - 腾讯混元风格参数
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enableZoom = true
    controls.enablePan = false
    controls.minDistance = 0.01
    controls.maxDistance = 10
    controls.rotateSpeed = -0.5
    controls.zoomSpeed = 1.2
    controls.autoRotate = props.autoRotate
    controls.autoRotateSpeed = props.autoRotateSpeed
    controls.enableKeys = false

    // 加载全景图纹理
    const textureLoader = new THREE.TextureLoader()

    // 使用加载进度回调
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      textureLoader.load(
        props.imageUrl,
        loadedTexture => {
          resolve(loadedTexture)
        },
        progress => {
          const percent = (progress.loaded / progress.total) * 100
          loadingProgress.value = Math.round(percent)
        },
        err => {
          console.error('加载全景图失败:', err)
          reject(err)
        }
      )
    })

    // 优化纹理设置 - 使用高性能配置
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy()

    // 创建球体几何 - 优化分段数以平衡质量和性能
    const geometry = new THREE.SphereGeometry(100, 60, 40)

    // 反转几何体的X轴，使纹理映射到球体内部
    geometry.scale(-1, 1, 1)

    // 创建材质 - 使用MeshBasicMaterial以获得最佳性能
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide,
      toneMapped: true
    })

    // 创建球体网格
    sphere = new THREE.Mesh(geometry, material)
    scene?.add(sphere)

    // 立即渲染第一帧，不等待动画循环
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }

    loading.value = false

    // 5秒后隐藏提示
    hintTimeout = window.setTimeout(() => {
      showHint.value = false
    }, 5000)

    // 双击事件处理 - 开启/关闭自动旋转
    containerRef.value.addEventListener('dblclick', handleDoubleClick)

    // 开始动画循环
    animate()
  } catch (err) {
    console.error('初始化失败:', err)
    error.value = '加载全景图失败，请重试'
    loading.value = false
  }
}

const retry = () => {
  error.value = ''
  loading.value = true
  loadingProgress.value = 0
  initThree()
}

const handleDoubleClick = () => {
  if (controls) {
    controls.autoRotate = !controls.autoRotate

    // 显示提示
    if (hintTimeout) {
      clearTimeout(hintTimeout)
    }
    showHint.value = true
    hintTimeout = window.setTimeout(() => {
      showHint.value = false
    }, 2000)
  }
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  if (controls) {
    controls.update()
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}

onMounted(() => {
  initThree()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
  }

  window.removeEventListener('resize', handleResize)

  if (containerRef.value) {
    containerRef.value.removeEventListener('dblclick', handleDoubleClick)
  }

  if (hintTimeout) {
    clearTimeout(hintTimeout)
  }

  // 清理Three.js资源
  if (sphere) {
    sphere.geometry.dispose()
    if (sphere.material instanceof THREE.Material) {
      sphere.material.dispose()
    }
  }

  if (renderer) {
    renderer.dispose()
  }

  scene = null
  camera = null
  renderer = null
  controls = null
  sphere = null
})
</script>

<style scoped>
.panorama-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background: #000;
  min-height: 100vh;
}

.panorama-container :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  position: absolute;
  top: 0;
  left: 0;
}

.panorama-container :deep(canvas):active {
  cursor: grabbing;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 20px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

.hint-overlay {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 12px 24px;
  border-radius: 8px;
  z-index: 5;
  backdrop-filter: blur(10px);
  transition: opacity 0.3s ease;
}

.hint-text {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 20;
  gap: 20px;
}

.error-text {
  color: #ff6b6b;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  max-width: 80%;
}

.retry-button {
  padding: 10px 30px;
  background: #4a9eff;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s ease;
}

.retry-button:hover {
  background: #3a8eef;
}
</style>
