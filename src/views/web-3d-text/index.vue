<template>
  <div ref="containerRef" class="text-wall-container">
    <div class="ui-overlay">
      <div class="title">🚀 WebGPU 3D 文本矩阵</div>
      <div class="stats">
        <span>卡片数: {{ cardCount }}</span>
        <span>FPS: {{ fps }}</span>
        <span>渲染器: WebGPU</span>
      </div>
      <div class="controls">
        <button @click="toggleRotation">{{ autoRotate ? '⏸️ 暂停' : '▶️ 旋转' }}</button>
        <button @click="resetView">🎯 重置视角</button>
        <button @click="scrambleText">🔀 随机文本</button>
      </div>
    </div>
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>正在生成文本矩阵...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three/webgpu'
import { Fn, vec3, vec4, sin, cos, time, mix, length, normalize, add, mul, sub, max, min, abs, floor, fract, pow, saturate, remapClamp } from 'three/tsl'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'

// ============ 响应式状态 ============
const containerRef = ref<HTMLDivElement>()
const loading = ref(true)
const fps = ref(60)
const autoRotate = ref(true)
const cardCount = ref(400)

// ============ 文本内容池 ============
const textPool = [
  'WebGPU 高性能渲染',
  'Three.js TSL 着色器',
  'InstancedMesh 批量渲染',
  '实时光线追踪效果',
  'GPU 粒子系统',
  '时空扭曲特效',
  '量子波动可视化',
  '星云粒子模拟',
  '水晶折射光学',
  '神经网络可视化',
  '流体动力学模拟',
  '布料物理仿真',
  '极光梦境效果',
  '星系漩涡动画',
  '赛博朋克风格',
  '全息投影技术',
  '虚拟现实界面',
  '增强现实交互',
  '人工智能算法',
  '深度学习模型',
  '区块链去中心化',
  '元宇宙构建',
  '数字孪生技术',
  '边缘计算节点',
  '5G 网络传输',
  '物联网传感器',
  '云计算平台',
  '大数据可视化',
  '机器学习训练',
  '神经网络推理'
]

// ============ 场景变量 ============
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGPURenderer
let controls: OrbitControls
let textWall: THREE.InstancedMesh
let glowParticles: THREE.Points
let raycaster: THREE.Raycaster
let mouse = new THREE.Vector2()
let animationId: number
let isRunning = true

// ============ 文本纹理生成 ============
function createTextTexture(text: string, index: number): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size * 0.6
  const ctx = canvas.getContext('2d')!

  // 渐变背景
  const gradient = ctx.createLinearGradient(0, 0, size, size * 0.6)
  const hue = (index * 15) % 360
  gradient.addColorStop(0, `hsla(${hue}, 80%, 20%, 0.9)`)
  gradient.addColorStop(0.5, `hsla(${hue + 30}, 70%, 15%, 0.8)`)
  gradient.addColorStop(1, `hsla(${hue + 60}, 60%, 10%, 0.9)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size * 0.6)

  // 发光边框
  ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`
  ctx.lineWidth = 8
  ctx.strokeRect(4, 4, size - 8, size * 0.6 - 8)

  // 内发光
  ctx.shadowColor = `hsla(${hue}, 100%, 50%, 1)`
  ctx.shadowBlur = 20
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // 文字
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 自动换行
  const maxWidth = size - 60
  const lineHeight = 44
  const words = text.split('')
  let line = ''
  let y = size * 0.3 - lineHeight / 2

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i]
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, size / 2, y)
      line = words[i]
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, size / 2, y)

  // 重置阴影
  ctx.shadowBlur = 0

  // 添加科技装饰线
  ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.5)`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(20, size * 0.6 - 20)
  ctx.lineTo(100, size * 0.6 - 20)
  ctx.lineTo(120, size * 0.6 - 40)
  ctx.stroke()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

// ============ 初始化场景 ============
const initScene = async () => {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  // 场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020205)
  scene.fog = new THREE.FogExp2(0x020205, 0.015)

  // 相机
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.set(0, 0, 50)

  // WebGPU 渲染器
  renderer = new THREE.WebGPURenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  await renderer.init()
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.5
  containerRef.value.appendChild(renderer.domElement)

  // 控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.5
  controls.maxDistance = 150
  controls.minDistance = 10

  // 射线检测
  raycaster = new THREE.Raycaster()

  loading.value = false
}

// ============ 创建 3D 文本墙 ============
const createTextWall = () => {
  const count = cardCount.value
  const cols = 20
  const rows = Math.ceil(count / cols)
  const cardWidth = 3
  const cardHeight = 1.8
  const spacing = 0.3

  // 几何体
  const geometry = new THREE.PlaneGeometry(cardWidth, cardHeight, 32, 32)

  // 创建纹理数组 - 每个卡片一个纹理
  const textures: THREE.CanvasTexture[] = []
  for (let i = 0; i < count; i++) {
    const text = textPool[i % textPool.length]
    const tex = createTextTexture(text, i)
    textures.push(tex)
  }

  // 使用单个材质，通过实例颜色来区分（简化方案）
  // 或者使用 BatchedMesh (Three.js 新特性)
  // 这里改用 Group + Mesh 方案确保每个卡片有独立材质
  
  const wallGroup = new THREE.Group()
  const positionData: Array<{ x: number; y: number; z: number; angle: number; radius: number; mesh: THREE.Mesh }> = []

  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: textures[i],
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const mesh = new THREE.Mesh(geometry, mat)

    const col = i % cols
    const row = Math.floor(i / cols)

    // 基础网格位置
    let x = (col - cols / 2) * (cardWidth + spacing)
    let y = (row - rows / 2) * (cardHeight + spacing)
    let z = 0

    // 添加螺旋扭曲
    const angle = (i / count) * Math.PI * 4
    const radius = 5 + (i / count) * 20
    const spiralX = Math.cos(angle) * radius * 0.3
    const spiralZ = Math.sin(angle) * radius * 0.3

    // 波浪效果
    const waveY = Math.sin(col * 0.3) * 2 + Math.cos(row * 0.2) * 2

    x += spiralX
    y += waveY
    z += spiralZ

    mesh.position.set(x, y, z)
    mesh.rotation.set(
      Math.sin(angle) * 0.1,
      Math.cos(angle) * 0.1,
      0
    )

    positionData.push({ x, y, z, angle, radius, mesh })
    wallGroup.add(mesh)

    // 入场动画
    mesh.scale.set(0, 0, 0)
    gsap.to(mesh.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.8,
      delay: i * 0.005,
      ease: 'back.out(1.7)'
    })
  }

  // 存储引用
  ;(wallGroup as any).positionData = positionData
  textWall = wallGroup as any
  scene.add(wallGroup)

  // 5秒后启动瀑布动画
  setTimeout(() => {
    startWaterfallAnimation()
  }, 5000)
}

// ============ 创建发光粒子背景 ============
const createGlowParticles = () => {
  const particleCount = 2000
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)

  for (let i = 0; i < particleCount; i++) {
    // 球形分布
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const radius = 30 + Math.random() * 70

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)

    // 彩虹色
    const hue = Math.random()
    colors[i * 3] = 0.5 + 0.5 * Math.sin(hue * Math.PI * 2)
    colors[i * 3 + 1] = 0.5 + 0.5 * Math.sin((hue + 0.33) * Math.PI * 2)
    colors[i * 3 + 2] = 0.5 + 0.5 * Math.sin((hue + 0.66) * Math.PI * 2)

    sizes[i] = 0.5 + Math.random() * 1.5
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  // 使用 TSL 创建动态材质
  const material = new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  })

  glowParticles = new THREE.Points(geometry, material)
  scene.add(glowParticles)
}

// ============ 创建光源 ============
const createLights = () => {
  // 多色点光源
  const colors = [0xff0088, 0x0088ff, 0x88ff00, 0xff8800]
  colors.forEach((color, i) => {
    const light = new THREE.PointLight(color, 300, 100)
    const angle = (i / colors.length) * Math.PI * 2
    light.position.set(
      Math.cos(angle) * 30,
      Math.sin(angle * 2) * 20,
      Math.sin(angle) * 30
    )
    scene.add(light)

    // 光源动画
    gsap.to(light.position, {
      x: Math.cos(angle + Math.PI) * 30,
      z: Math.sin(angle + Math.PI) * 30,
      duration: 10 + i * 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })
  })

  // 环境光
  const ambient = new THREE.AmbientLight(0x1a1a2e, 0.6)
  scene.add(ambient)
}

// ============ 动画循环 ============
let lastTime = performance.now()
let frameCount = 0
let isCylinderMode = false

const animate = () => {
  if (!isRunning) return
  animationId = requestAnimationFrame(animate)

  const currentTime = performance.now()
  const delta = currentTime - lastTime

  // FPS 计算
  frameCount++
  if (frameCount % 30 === 0) {
    fps.value = Math.round(1000 / delta)
  }
  lastTime = currentTime

  const t = currentTime * 0.001

  // 文本墙动态效果
  if (textWall) {
    if (!isCylinderMode) {
      // 初始螺旋模式
      const positionData = (textWall as any).positionData

      for (let i = 0; i < cardCount.value; i++) {
        const data = positionData[i]
        const mesh = data.mesh as THREE.Mesh

        // 波浪浮动
        const floatY = Math.sin(t * 2 + data.x * 0.1) * 0.5
        const floatZ = Math.cos(t * 1.5 + data.y * 0.1) * 0.3

        mesh.position.set(
          data.x,
          data.y + floatY,
          data.z + floatZ
        )

        // 面向相机
        mesh.lookAt(camera.position)
      }

      // 整体缓慢旋转
      textWall.rotation.y = Math.sin(t * 0.1) * 0.1
      textWall.rotation.x = Math.cos(t * 0.08) * 0.05
    }
  }

  // 粒子旋转
  if (glowParticles) {
    glowParticles.rotation.y += 0.001
    glowParticles.rotation.z += 0.0005
  }

  controls.update()
  renderer.render(scene, camera)
}

// ============ 鼠标交互 ============
const onMouseMove = (e: MouseEvent) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
}

const onClick = () => {
  if (!textWall) return

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(textWall.children)

  if (intersects.length > 0) {
    const mesh = intersects[0].object as THREE.Mesh
    if (mesh) {
      // 点击效果 - 卡片弹出
      gsap.to(mesh.scale, {
        x: 1.3,
        y: 1.3,
        z: 1.3,
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out'
      })
    }
  }
}

// ============ 控制方法 ============
const toggleRotation = () => {
  autoRotate.value = !autoRotate.value
  controls.autoRotate = autoRotate.value
}

const resetView = () => {
  gsap.to(camera.position, {
    x: 0,
    y: 0,
    z: 50,
    duration: 1.5,
    ease: 'power2.inOut'
  })
  controls.target.set(0, 0, 0)
}

const scrambleText = () => {
  // 随机打乱文本墙
  if (!textWall) return

  const positionData = (textWall as any).positionData

  for (let i = 0; i < cardCount.value; i++) {
    const data = positionData[i]
    const mesh = data.mesh as THREE.Mesh

    gsap.to(mesh.position, {
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 40,
      z: (Math.random() - 0.5) * 30,
      duration: 1,
      delay: Math.random() * 0.5,
      ease: 'power2.inOut',
      onUpdate: () => mesh.lookAt(camera.position)
    })
  }
}

// ============ 圆柱环绕动画 ============
const startWaterfallAnimation = () => {
  if (!textWall) return

  console.log('启动圆柱环绕动画...')
  const positionData = (textWall as any).positionData

  const cols = 20
  const cardsPerCol = Math.ceil(cardCount.value / cols)
  const cylinderRadius = 25 // 圆柱半径
  const cylinderHeight = 60 // 圆柱高度

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < cardsPerCol; row++) {
      const index = col + row * cols
      if (index >= cardCount.value) continue

      const data = positionData[index]
      const mesh = data.mesh as THREE.Mesh

      // 计算圆柱坐标
      const angle = (col / cols) * Math.PI * 2 // 每列对应一个角度
      const targetY = (cylinderHeight / 2) - (row / cardsPerCol) * cylinderHeight
      const targetX = Math.sin(angle) * cylinderRadius
      const targetZ = Math.cos(angle) * cylinderRadius

      // 延迟根据列和行计算，形成螺旋波浪效果
      const delay = col * 0.08 + row * 0.03

      // 先向外爆发
      gsap.to(mesh.position, {
        x: data.x * 2 + (Math.random() - 0.5) * 30,
        y: data.y * 1.5 + (Math.random() - 0.5) * 20,
        z: data.z * 2 + (Math.random() - 0.5) * 30,
        duration: 0.6,
        delay: delay,
        ease: 'power2.out'
      })

      // 然后汇聚成圆柱
      gsap.to(mesh.position, {
        x: targetX,
        y: targetY,
        z: targetZ,
        duration: 1.5,
        delay: delay + 0.6,
        ease: 'elastic.out(1, 0.5)',
        onUpdate: () => {
          // 卡片始终面向圆柱外侧（背向中心）
          mesh.lookAt(targetX * 2, targetY, targetZ * 2)
        }
      })

      // 旋转效果 - 螺旋入场
      gsap.to(mesh.rotation, {
        y: -angle + Math.PI, // 面向外侧
        duration: 1.5,
        delay: delay + 0.6,
        ease: 'power2.out'
      })
    }
  }

  // 圆柱完成后启动持续旋转效果
  setTimeout(() => {
    startCylinderRotation()
  }, 3000)
}

// 圆柱持续旋转效果
const startCylinderRotation = () => {
  if (!textWall) return

  isCylinderMode = true
  const positionData = (textWall as any).positionData
  const cols = 20
  const cardsPerCol = Math.ceil(cardCount.value / cols)
  const cylinderRadius = 25
  const cylinderHeight = 60

  // 取消旧的动画循环
  cancelAnimationFrame(animationId)

  // 整体圆柱缓慢旋转
  gsap.to(textWall.rotation, {
    y: Math.PI * 2,
    duration: 30,
    repeat: -1,
    ease: 'none'
  })

  // 每列卡片上下波动
  for (let col = 0; col < cols; col++) {
    const angle = (col / cols) * Math.PI * 2

    for (let row = 0; row < cardsPerCol; row++) {
      const index = col + row * cols
      if (index >= cardCount.value) continue

      const data = positionData[index]
      const mesh = data.mesh as THREE.Mesh

      const baseY = (cylinderHeight / 2) - (row / cardsPerCol) * cylinderHeight

      // 上下波动动画
      gsap.to(mesh.position, {
        y: baseY + Math.sin(row * 0.5) * 3,
        duration: 2 + Math.random(),
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: col * 0.1 + row * 0.05
      })

      // 保持面向外侧
      mesh.userData.baseAngle = angle
      mesh.userData.radius = cylinderRadius
    }
  }

  // 启动圆柱模式的动画循环
  const cylinderAnimate = () => {
    if (!isRunning) return
    animationId = requestAnimationFrame(cylinderAnimate)

    const currentTime = performance.now()
    const delta = currentTime - lastTime

    // FPS 计算
    frameCount++
    if (frameCount % 30 === 0) {
      fps.value = Math.round(1000 / delta)
    }
    lastTime = currentTime

    // 更新每个卡片的朝向
    if (textWall) {
      textWall.children.forEach((child: any) => {
        const mesh = child as THREE.Mesh
        if (mesh.userData.baseAngle !== undefined) {
          const currentAngle = mesh.userData.baseAngle + textWall.rotation.y
          const lookX = Math.sin(currentAngle) * (mesh.userData.radius + 10)
          const lookZ = Math.cos(currentAngle) * (mesh.userData.radius + 10)
          mesh.lookAt(lookX, mesh.position.y, lookZ)
        }
      })
    }

    // 粒子旋转
    if (glowParticles) {
      glowParticles.rotation.y += 0.001
      glowParticles.rotation.z += 0.0005
    }

    controls.update()
    renderer.render(scene, camera)
  }

  // 启动新的动画循环
  cylinderAnimate()
}

// ============ 窗口调整 ============
const onResize = () => {
  if (!containerRef.value || !camera || !renderer) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

// ============ 清理 ============
const cleanup = () => {
  isRunning = false
  cancelAnimationFrame(animationId)

  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('click', onClick)

  if (textWall) {
    textWall.children.forEach(child => {
      gsap.killTweensOf(child.position)
      gsap.killTweensOf(child.scale)
    })
  }

  if (renderer) {
    renderer.dispose()
    if (containerRef.value?.contains(renderer.domElement)) {
      containerRef.value.removeChild(renderer.domElement)
    }
  }
}

// ============ 生命周期 ============
onMounted(async () => {
  await initScene()
  createTextWall()
  createGlowParticles()
  createLights()
  animate()

  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('click', onClick)
})

onBeforeUnmount(cleanup)
</script>

<style lang="scss" scoped>
.text-wall-container {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #020205 0%, #0a0a1a 50%, #050510 100%);
  position: relative;
  overflow: hidden;

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
}

.ui-overlay {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
  z-index: 10;

  .title {
    font-size: 24px;
    font-weight: 700;
    background: linear-gradient(90deg, #ff0088, #0088ff, #88ff00);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .stats {
    display: flex;
    gap: 20px;
    font-size: 14px;
    color: #888;
    font-family: monospace;
  }

  .controls {
    display: flex;
    gap: 10px;
    pointer-events: auto;

    button {
      padding: 8px 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.5);
      color: #fff;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s;
      backdrop-filter: blur(10px);

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.4);
        transform: translateY(-2px);
      }
    }
  }
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #fff;
  font-size: 16px;

  .spinner {
    width: 50px;
    height: 50px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: #ff0088;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
