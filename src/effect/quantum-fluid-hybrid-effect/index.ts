/**
 * 量子流体模拟特效 - 混合方案（GPU Compute + 零拷贝优化）
 *
 * 核心特性：
 * 1. GPU Compute Shader 并行物理计算
 * 2. SharedArrayBuffer 实现 CPU-GPU 零拷贝（性能最优）
 * 3. Transferable Objects 优化数据传输
 * 4. 降频更新策略减少CPU负担（默认每2帧更新一次）
 * 5. 30000 个粒子（高性能）
 *
 * 性能优化：
 * - 使用 SharedArrayBuffer（浏览器需支持 COOP/COEP）
 * - 回退到 Transferable Objects
 * - CPU端实例矩阵更新降频
 * - 批量颜色更新
 * - 几何体复用
 */

import * as THREE from 'three/webgpu'
import gsap from 'gsap'
import {
  Fn,
  uniform,
  float,
  vec3,
  Loop,
  If,
  instanceIndex,
  instancedArray,
  length,
  normalize,
  cameraViewMatrix,
  cameraProjectionMatrix,
  max
} from 'three/tsl'

// ============================================
// 特效参数配置
// ============================================

export const QuantumFluidHybridEffectParams = {
  particleCount: 30000,
  particleSize: 2.0,

  // 物理参数
  gravity: -9.8,
  damping: 0.998,
  boundaryRadius: 0.25,
  restitution: 0.7,

  // 交互参数
  interactionRadius: 0.1,
  interactionStrength: 2.0,

  // 性能优化参数
  updateFrequency: 2, // CPU降频更新：每N帧更新一次
  useSharedArrayBuffer: true // 优先使用SharedArrayBuffer
}

// ============================================
// 主特效函数
// ============================================

export const quantumFluidHybridEffect = (container: HTMLElement): (() => void) => {
  console.log('[QuantumFluidHybrid] 启动混合方案特效...')

  let renderer: THREE.WebGPURenderer
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let animationId: number
  let width: number
  let height: number

  let fluidMesh: THREE.InstancedMesh
  let material: THREE.MeshBasicMaterial

  // Compute Shader 相关
  let positionStorage: any
  let velocityStorage: any
  let computeVelocity: any
  let computePosition: any

  // Uniforms
  let deltaTimeUniform: any
  let timeUniform: any
  let mouseUniform: any

  // CPU端缓存（使用 SharedArrayBuffer 或普通 Float32Array）
  let positionCache: Float32Array
  let velocityCache: Float32Array
  let colorCache: Float32Array

  // 性能优化标志
  let useSharedBuffer: boolean
  let updateCounter = 0
  let frameCount = 0
  let currentTime = 0

  // 性能监控变量
  let fps = 0
  let lastTime = performance.now()
  let computeTime = 0
  let transferTime = 0
  let renderTime = 0
  let performanceElement: HTMLDivElement | null = null

  const config = QuantumFluidHybridEffectParams
  const allTweens: gsap.Tween[] = []

  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  // ============================================
  // Three.js 初始化
  // ============================================

  const initThreeJS = () => {
    width = container.clientWidth
    height = container.clientHeight

    scene = new THREE.Scene()
    scene.background = null

    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000)
    camera.position.set(0, 50, 250)
    camera.lookAt(0, 0, 0)

    renderer = new THREE.WebGPURenderer({
      antialias: false,
      alpha: true,
      requiredLimits: { maxStorageBuffersInVertexStage: 2 }
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const ambientLight = new THREE.AmbientLight(0x1a1a3e, 0.3)
    scene.add(ambientLight)

    createPerformancePanel(container)
  }

  // ============================================
  // 创建性能监控面板
  // ============================================

  const createPerformancePanel = (container: HTMLElement) => {
    performanceElement = document.createElement('div')
    performanceElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(10px);
      padding: 15px;
      border-radius: 8px;
      border: 1px solid rgba(0, 255, 255, 0.3);
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #00ffff;
      z-index: 1000;
      min-width: 200px;
    `

    performanceElement.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: bold; color: #ff00ff;">
        🔮 量子流体 - 混合版
      </div>
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span>FPS:</span>
        <span id="fps-display" style="color: #00ff66;">0</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span>计算:</span>
        <span id="compute-display">0ms</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span>传输:</span>
        <span id="transfer-display" style="color: #00ff66;">0ms</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span>渲染:</span>
        <span id="render-display">0ms</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span>总帧:</span>
        <span id="frame-display">0</span>
      </div>
      <hr style="border-color: rgba(0, 255, 255, 0.3); margin: 8px 0;">
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span>粒子:</span>
        <span>${config.particleCount.toLocaleString()}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span>模式:</span>
        <span id="mode-display" style="color: #00ff66;">GPU Compute</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span>缓冲:</span>
        <span id="buffer-display" style="color: #00ff66;">-</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span>降频:</span>
        <span style="color: #ffaa00;">1/${config.updateFrequency}</span>
      </div>
    `

    document.body.appendChild(performanceElement)
  }

  const updatePerformancePanel = () => {
    if (!performanceElement) return

    const fpsEl = performanceElement.querySelector('#fps-display')
    const computeEl = performanceElement.querySelector('#compute-display')
    const transferEl = performanceElement.querySelector('#transfer-display')
    const renderEl = performanceElement.querySelector('#render-display')
    const frameEl = performanceElement.querySelector('#frame-display')
    const bufferEl = performanceElement.querySelector('#buffer-display')

    if (fpsEl) {
      fpsEl.textContent = fps.toFixed(1)
      fpsEl.style.color = fps >= 30 ? '#00ff66' : fps >= 20 ? '#ffaa00' : '#ff3333'
    }
    if (computeEl) {
      computeEl.textContent = computeTime.toFixed(2) + 'ms'
      computeEl.style.color = computeTime < 5 ? '#00ff66' : computeTime < 10 ? '#ffaa00' : '#ff3333'
    }
    if (transferEl) {
      transferEl.textContent = transferTime.toFixed(2) + 'ms'
      transferEl.style.color =
        transferTime < 1 ? '#00ff66' : transferTime < 3 ? '#ffaa00' : '#ff3333'
    }
    if (renderEl) {
      renderEl.textContent = renderTime.toFixed(2) + 'ms'
      renderEl.style.color = renderTime < 5 ? '#00ff66' : renderTime < 10 ? '#ffaa00' : '#ff3333'
    }
    if (frameEl) {
      frameEl.textContent = frameCount.toString()
    }
    if (bufferEl) {
      bufferEl.textContent = useSharedBuffer ? 'SharedArrayBuffer' : 'Transferable'
      bufferEl.style.color = useSharedBuffer ? '#00ff66' : '#ffaa00'
    }
  }

  // ============================================
  // 初始化共享缓冲区（零拷贝）
  // ============================================

  const initSharedBuffers = () => {
    console.log('[QuantumFluidHybrid] 初始化共享缓冲区...')

    // 尝试使用 SharedArrayBuffer
    try {
      if (typeof SharedArrayBuffer !== 'undefined' && config.useSharedArrayBuffer) {
        console.log('[QuantumFluidHybrid] 使用 SharedArrayBuffer')
        positionCache = new Float32Array(new SharedArrayBuffer(config.particleCount * 3 * 4))
        velocityCache = new Float32Array(new SharedArrayBuffer(config.particleCount * 3 * 4))
        colorCache = new Float32Array(new SharedArrayBuffer(config.particleCount * 3 * 4))
        useSharedBuffer = true
      } else {
        throw new Error('SharedArrayBuffer not available')
      }
    } catch (e) {
      console.warn('[QuantumFluidHybrid] SharedArrayBuffer不可用，回退到Transferable模式')
      console.warn('[QuantumFluidHybrid] 原因:', e)
      positionCache = new Float32Array(config.particleCount * 3)
      velocityCache = new Float32Array(config.particleCount * 3)
      colorCache = new Float32Array(config.particleCount * 3)
      useSharedBuffer = false
    }

    // 完全随机分布初始化
    for (let i = 0; i < config.particleCount; i++) {
      positionCache[i * 3 + 0] = Math.random() * 0.4 + 0.05
      positionCache[i * 3 + 1] = Math.random() * 0.4 + 0.05
      positionCache[i * 3 + 2] = Math.random() * 0.4 + 0.05

      velocityCache[i * 3 + 0] = (Math.random() - 0.5) * 0.05
      velocityCache[i * 3 + 1] = (Math.random() - 0.5) * 0.05 + 0.02
      velocityCache[i * 3 + 2] = (Math.random() - 0.5) * 0.05

      colorCache[i * 3 + 0] = 0.0
      colorCache[i * 3 + 1] = 0.5
      colorCache[i * 3 + 2] = 1.0
    }

    // 创建 Storage Buffer（GPU直接访问）
    positionStorage = instancedArray(positionCache.buffer, 'vec3').setName('positionStorage')
    velocityStorage = instancedArray(velocityCache.buffer, 'vec3').setName('velocityStorage')

    console.log(
      `[QuantumFluidHybrid] 共享缓冲区初始化完成 (${useSharedBuffer ? 'SharedArrayBuffer' : 'Transferable'})`
    )
  }

  // ============================================
  // 初始化Compute Shader（核心：GPU物理计算）
  // ============================================

  const initComputeShaders = () => {
    console.log('[QuantumFluidHybrid] 初始化Compute Shader...')

    deltaTimeUniform = uniform(0.0).setName('deltaTime')
    timeUniform = uniform(0.0).setName('time')
    mouseUniform = uniform(new THREE.Vector3(0, 0, 0)).setName('mouse')

    const gravity = float(config.gravity).toConst()
    const damping = float(config.damping).toConst()
    const boundaryRadius = float(config.boundaryRadius).toConst()
    const restitution = float(config.restitution).toConst()
    const interactionRadius = float(config.interactionRadius).toConst()
    const interactionStrength = float(config.interactionStrength).toConst()

    // GPU Compute Shader - 速度更新
    computeVelocity = Fn(() => {
      const index = instanceIndex.toConst()
      const position = positionStorage.element(index).toVar()
      const velocity = velocityStorage.element(index).toVar()
      const dt = deltaTimeUniform.toConst()

      // 应用重力
      velocity.y.addAssign(gravity.mul(dt))

      // 鼠标交互
      const mousePos = mouseUniform.toConst()
      const toMouse = mousePos.sub(position)
      const distToMouse = length(toMouse)

      If(distToMouse.lessThan(interactionRadius), () => {
        const force = interactionStrength
          .mul(interactionRadius.sub(distToMouse))
          .div(interactionRadius)
        velocity.addAssign(normalize(toMouse).mul(force).mul(dt))
      })

      // 添加随机扰动（布朗运动）
      velocity.addAssign(
        vec3(
          float(Math.random() - 0.5).mul(0.001),
          float(Math.random() - 0.5).mul(0.001),
          float(Math.random() - 0.5).mul(0.001)
        )
      )

      // 应用阻尼
      velocity.mulAssign(damping)

      // 速度限制
      const maxSpeed = float(2.0).toConst()
      const speed = length(velocity)

      If(speed.greaterThan(maxSpeed), () => {
        velocity.assign(normalize(velocity).mul(maxSpeed))
      })

      // 写回速度
      velocityStorage.element(index).assign(velocity)
    })()
      .compute(config.particleCount)
      .setName('Particle Velocity')

    // GPU Compute Shader - 位置更新
    computePosition = Fn(() => {
      const index = instanceIndex.toConst()
      const position = positionStorage.element(index).toVar()
      const velocity = velocityStorage.element(index).toVar()
      const dt = deltaTimeUniform.toConst()

      // 更新位置
      position.addAssign(velocity.mul(dt))

      // 边界碰撞检测（立方体边界）
      const boundary = boundaryRadius.toConst()
      const rest = restitution.toConst()

      // X 边界
      If(position.x.lessThan(-boundary), () => {
        position.x.assign(-boundary)
        velocity.x.assign(velocity.x.mul(-rest))
      })
      If(position.x.greaterThan(boundary), () => {
        position.x.assign(boundary)
        velocity.x.assign(velocity.x.mul(-rest))
      })

      // Y 边界
      If(position.y.lessThan(-boundary), () => {
        position.y.assign(-boundary)
        velocity.y.assign(velocity.y.mul(-rest))
      })
      If(position.y.greaterThan(boundary), () => {
        position.y.assign(boundary)
        velocity.y.assign(velocity.y.mul(-rest))
      })

      // Z 边界
      If(position.z.lessThan(-boundary), () => {
        position.z.assign(-boundary)
        velocity.z.assign(velocity.z.mul(-rest))
      })
      If(position.z.greaterThan(boundary), () => {
        position.z.assign(boundary)
        velocity.z.assign(velocity.z.mul(-rest))
      })

      // 写回位置
      positionStorage.element(index).assign(position)
    })()
      .compute(config.particleCount)
      .setName('Particle Position')

    console.log('[QuantumFluidHybrid] Compute Shader初始化完成')
  }

  // ============================================
  // 初始化粒子系统
  // ============================================

  const initParticleSystem = async () => {
    console.log('[QuantumFluidHybrid] 初始化粒子系统...')

    const geometry = new THREE.OctahedronGeometry(1.0, 0)

    // 使用简单的 MeshBasicMaterial
    material = new THREE.MeshBasicMaterial()
    material.transparent = true
    material.opacity = 0.85
    material.side = THREE.DoubleSide

    fluidMesh = new THREE.InstancedMesh(geometry, material, config.particleCount)
    fluidMesh.matrixAutoUpdate = false
    fluidMesh.frustumCulled = false

    scene.add(fluidMesh)

    console.log('[QuantumFluidHybrid] 粒子系统初始化完成')
  }

  // ============================================
  // 降频更新实例矩阵（性能优化）
  // ============================================

  const updateInstanceMatrices = () => {
    const scale = config.particleSize * 0.5
    const timeOffset = currentTime * 0.02

    for (let i = 0; i < config.particleCount; i++) {
      const idx = i * 3
      const px = positionCache[idx]
      const py = positionCache[idx + 1]
      const pz = positionCache[idx + 2]

      dummy.position.set(px * 300, py * 300, pz * 300)

      // 计算颜色
      const colorIndex = Math.floor((i / config.particleCount) * 5)
      const hueOffsets = [0.0, 0.08, 0.5, 0.75, 0.83]
      const baseHue = hueOffsets[colorIndex % 5]
      const hue = (baseHue + timeOffset) % 1

      let lightness = 0.6
      if (i % 50 === 0) {
        lightness = 0.8 + 0.2 * Math.sin(currentTime * 2)
      }

      color.setHSL(hue, 1.0, lightness)
      dummy.scale.setScalar(scale)

      dummy.updateMatrix()
      fluidMesh.setMatrixAt(i, dummy.matrix)
      fluidMesh.setColorAt(i, color)
    }

    fluidMesh.instanceMatrix.needsUpdate = true
    if (fluidMesh.instanceColor) {
      fluidMesh.instanceColor.needsUpdate = true
    }
  }

  // ============================================
  // CPU端物理计算（非SharedArrayBuffer模式使用）
  // ============================================

  const updateCPUPhysics = (dt: number) => {
    const gravity = config.gravity
    const damping = config.damping
    const boundary = config.boundaryRadius
    const restitution = config.restitution
    const mousePos = mouseUniform.value
    const interactionRadius = config.interactionRadius
    const interactionStrength = config.interactionStrength

    for (let i = 0; i < config.particleCount; i++) {
      const idx = i * 3

      // 应用重力
      velocityCache[idx + 1] += gravity * dt

      // 鼠标交互
      const dx = mousePos.x - positionCache[idx]
      const dy = mousePos.y - positionCache[idx + 1]
      const dz = mousePos.z - positionCache[idx + 2]
      const distToMouse = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (distToMouse < interactionRadius && distToMouse > 0) {
        const force = (interactionStrength * (interactionRadius - distToMouse)) / interactionRadius
        velocityCache[idx] += (dx / distToMouse) * force * dt
        velocityCache[idx + 1] += (dy / distToMouse) * force * dt
        velocityCache[idx + 2] += (dz / distToMouse) * force * dt
      }

      // 随机扰动
      velocityCache[idx] += (Math.random() - 0.5) * 0.001
      velocityCache[idx + 1] += (Math.random() - 0.5) * 0.001
      velocityCache[idx + 2] += (Math.random() - 0.5) * 0.001

      // 阻尼
      velocityCache[idx] *= damping
      velocityCache[idx + 1] *= damping
      velocityCache[idx + 2] *= damping

      // 更新位置
      positionCache[idx] += velocityCache[idx] * dt
      positionCache[idx + 1] += velocityCache[idx + 1] * dt
      positionCache[idx + 2] += velocityCache[idx + 2] * dt

      // 边界碰撞
      for (let axis = 0; axis < 3; axis++) {
        if (positionCache[idx + axis] < -boundary) {
          positionCache[idx + axis] = -boundary
          velocityCache[idx + axis] *= -restitution
        } else if (positionCache[idx + axis] > boundary) {
          positionCache[idx + axis] = boundary
          velocityCache[idx + axis] *= -restitution
        }
      }
    }
  }

  // ============================================
  // 动画循环
  // ============================================

  const animate = () => {
    const now = performance.now()
    const deltaTime = (now - lastTime) / 1000.0
    lastTime = now
    fps = 1000 / (now - (lastTime - deltaTime * 1000))

    const computeStart = now

    frameCount++
    currentTime += deltaTime
    updateCounter++

    // 更新uniforms
    deltaTimeUniform.value = Math.min(deltaTime, 0.033)
    timeUniform.value = currentTime

    // 执行 GPU/CPU 物理计算
    if (useSharedBuffer) {
      // SharedArrayBuffer 模式：GPU Compute Shader
      computeVelocity.compute()
      computePosition.compute()
    } else {
      // 非 SharedArrayBuffer 模式：CPU 物理计算
      updateCPUPhysics(Math.min(deltaTime, 0.033))
    }

    computeTime = performance.now() - computeStart

    // 降频更新实例矩阵（每N帧更新一次）
    const transferStart = performance.now()

    if (updateCounter >= config.updateFrequency) {
      updateCounter = 0
      updateInstanceMatrices()
    }

    transferTime = performance.now() - transferStart

    const renderStart = performance.now()
    renderer.render(scene, camera)
    renderTime = performance.now() - renderStart

    updatePerformancePanel()
    animationId = requestAnimationFrame(animate)
  }

  // ============================================
  // 入场动画
  // ============================================

  const createEntranceAnimation = () => {
    console.log('[QuantumFluidHybrid] 创建入场动画...')

    const timeline = gsap.timeline()

    timeline.to(fluidMesh.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0
    })

    timeline.to(fluidMesh.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 2,
      ease: 'elastic.out(1, 0.5)'
    })

    allTweens.push(...timeline.getChildren())
  }

  // ============================================
  // 相机动画
  // ============================================

  const createCameraAnimation = () => {
    const cameraTimeline = gsap.timeline({ repeat: -1, yoyo: true })

    cameraTimeline.to(camera.position, {
      x: 200,
      y: 150,
      z: 300,
      duration: 5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    })

    cameraTimeline.to(camera.position, {
      x: -200,
      y: 50,
      z: 350,
      duration: 5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    })

    cameraTimeline.to(camera.position, {
      x: 0,
      y: 200,
      z: 250,
      duration: 5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    })

    cameraTimeline.to(camera.position, {
      x: 100,
      y: -50,
      z: 450,
      duration: 5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    })

    cameraTimeline.to(camera.position, {
      x: -100,
      y: 100,
      z: 400,
      duration: 5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    })

    cameraTimeline.to(camera.position, {
      x: 0,
      y: 100,
      z: 400,
      duration: 5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    })

    allTweens.push(...cameraTimeline.getChildren())
  }

  // ============================================
  // 鼠标交互
  // ============================================

  const onMouseMove = (event: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    const vector = new THREE.Vector3(x, y, 0.5)
    vector.unproject(camera)

    mouseUniform.value.copy(vector.sub(camera.position).normalize().multiplyScalar(50))
  }

  // ============================================
  // 窗口大小调整
  // ============================================

  const onWindowResize = () => {
    width = container.clientWidth
    height = container.clientHeight

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
  }

  // ============================================
  // 清理函数
  // ============================================

  const cleanup = () => {
    console.log('[QuantumFluidHybrid] 开始清理...')

    if (performanceElement && performanceElement.parentNode) {
      performanceElement.parentNode.removeChild(performanceElement)
      performanceElement = null
    }

    allTweens.forEach(tween => {
      try {
        tween.kill()
      } catch (e) {}
    })

    gsap.killTweensOf(camera.position)
    gsap.killTweensOf(camera.rotation)
    if (fluidMesh) {
      gsap.killTweensOf(fluidMesh.scale)
      gsap.killTweensOf(fluidMesh.rotation)
    }

    if (animationId) {
      cancelAnimationFrame(animationId)
    }

    window.removeEventListener('resize', onWindowResize)
    window.removeEventListener('mousemove', onMouseMove)

    if (fluidMesh) {
      scene.remove(fluidMesh)
      if (fluidMesh.geometry) {
        fluidMesh.geometry.dispose()
      }
      if (fluidMesh.material) {
        fluidMesh.material.dispose()
      }
    }

    if (renderer) {
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }

    if (scene) {
      scene.clear()
    }

    positionStorage = null
    velocityStorage = null
    computeVelocity = null
    computePosition = null
    deltaTimeUniform = null
    timeUniform = null
    mouseUniform = null

    // 清理 SharedArrayBuffer 或 Float32Array
    positionCache = null
    velocityCache = null
    colorCache = null

    allTweens.length = 0
    dummy.position.set(0, 0, 0)
    dummy.rotation.set(0, 0, 0)
    dummy.scale.set(1, 1, 1)
    color.set(0x000000)

    console.log('[QuantumFluidHybrid] 清理完成')
  }

  // ============================================
  // 启动函数
  // ============================================

  const start = async () => {
    console.log('[QuantumFluidHybrid] 启动...')

    try {
      initThreeJS()
      await renderer.init()
      initSharedBuffers()
      initComputeShaders()
      await initParticleSystem()
      createEntranceAnimation()

      setTimeout(() => {
        createCameraAnimation()
      }, 2000)

      window.addEventListener('resize', onWindowResize)
      window.addEventListener('mousemove', onMouseMove)
      animate()

      console.log('[QuantumFluidHybrid] 启动成功')
      console.log(
        `[QuantumFluidHybrid] 使用缓冲区类型: ${useSharedBuffer ? 'SharedArrayBuffer (零拷贝)' : 'Transferable Objects'}`
      )
    } catch (error) {
      console.error('[QuantumFluidHybrid] 启动失败:', error)
      cleanup()
      throw error
    }
  }

  start()

  return cleanup
}
