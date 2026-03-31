<template>
  <div class="test-container">
    <h1>Three.js 全景图测试</h1>
    <div class="test-info">
      <p>测试图片路径: {{ imagePath }}</p>
      <p>Three.js 版本: {{ threeVersion }}</p>
      <p>容器尺寸: {{ containerSize }}</p>
    </div>
    <div ref="testContainerRef" class="test-canvas-container"></div>
    <button @click="testImageLoad" class="test-button">测试图片加载</button>
    <div v-if="loadError" class="error-message">错误: {{ loadError }}</div>
    <div v-if="loadSuccess" class="success-message">✓ 图片加载成功!</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as THREE from 'three'

const testContainerRef = ref<HTMLDivElement>()
const imagePath = ref('')
const threeVersion = ref(THREE.REVISION)
const containerSize = ref({ width: 0, height: 0 })
const loadError = ref('')
const loadSuccess = ref(false)

onMounted(() => {
  console.log('测试页面已挂载')
  if (testContainerRef.value) {
    containerSize.value = {
      width: testContainerRef.value.clientWidth,
      height: testContainerRef.value.clientHeight
    }
  }
})

const testImageLoad = () => {
  console.log('开始测试图片加载')

  const textureLoader = new THREE.TextureLoader()

  // 测试不同的图片路径
  const testPaths = [
    '/src/assets/quanjingtu/home.png',
    '/assets/quanjingtu/home.png',
    '/src/assets/image/1.png',
    '/assets/image/1.png'
  ]

  let currentPathIndex = 0

  const tryLoad = () => {
    if (currentPathIndex >= testPaths.length) {
      loadError.value = '所有路径都测试失败，请检查图片文件是否存在'
      console.error('所有路径都测试失败')
      return
    }

    const currentPath = testPaths[currentPathIndex]
    imagePath.value = `正在测试: ${currentPath}`

    console.log(`测试路径 ${currentPathIndex + 1}/${testPaths.length}:`, currentPath)

    textureLoader.load(
      currentPath,
      texture => {
        console.log('图片加载成功!', currentPath)
        loadSuccess.value = true
        loadError.value = ''
        imagePath.value = `成功路径: ${currentPath}`

        // 创建一个简单的场景来显示图片
        displayTestImage(texture)
      },
      progress => {
        console.log('加载进度:', progress)
      },
      err => {
        console.error(`路径 ${currentPath} 加载失败:`, err)
        currentPathIndex++
        tryLoad()
      }
    )
  }

  tryLoad()
}

const displayTestImage = (texture: THREE.Texture) => {
  if (!testContainerRef.value) return

  const width = testContainerRef.value.clientWidth
  const height = testContainerRef.value.clientHeight

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.position.z = 5

  const renderer = new THREE.WebGLRenderer()
  renderer.setSize(width, height)
  testContainerRef.value.appendChild(renderer.domElement)

  const geometry = new THREE.PlaneGeometry(4, 4)
  const material = new THREE.MeshBasicMaterial({ map: texture })
  const mesh = new THREE.Mesh(geometry, material)

  scene.add(mesh)

  const animate = () => {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
  }

  animate()
}
</script>

<style scoped>
.test-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.test-info {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.test-info p {
  margin: 10px 0;
  color: #666;
}

.test-canvas-container {
  width: 100%;
  height: 400px;
  background: #000;
  margin-bottom: 20px;
  border-radius: 8px;
}

.test-button {
  padding: 12px 24px;
  background: #4a9eff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
}

.test-button:hover {
  background: #3a8eef;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}

.success-message {
  background: #efe;
  color: #3c3;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}
</style>
