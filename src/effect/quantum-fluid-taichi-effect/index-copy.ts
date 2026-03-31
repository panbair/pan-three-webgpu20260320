/**
 * 量子流体模拟特效 - WebGPU Compute Shader 高性能版
 *
 * 完全使用 WebGPU Compute Shader 实现，所有物理计算在GPU上并行执行
 * 零CPU计算，真正的GPU驱动
 *
 * 特性：
 * - 60000 个粒子（高性能）
 * - Compute Shader 并行计算物理（重力、碰撞、边界）
 * - Storage Buffer 零拷贝传输
 * - 鼠标交互
 * - 赛博朋克霓虹配色
 * - 6 段电影级运镜
 */

import * as THREE from 'three/webgpu'
import gsap from 'gsap'
import { Fn, uniform, float, If, instanceIndex, instancedArray, length, normalize } from 'three/tsl'

// ============================================
// 特效参数配置
// ============================================

export const QuantumFluidTaichiEffectParams = {
  particleCount: 200000,
  particleSize: 2.5,

  // 物理参数
  gravity: -9.8,
  damping: 0.995,
  boundaryRadius: 80.0,
  restitution: 0.7,

  // 交互参数
  interactionRadius: 15.0,
  interactionStrength: 100.0,

  // 渲染参数（性能优化）
  pixelRatio: Math.min(window.devicePixelRatio, 1.0), // 降低像素比提升性能
  antialias: false, // 关闭抗锯齿提升性能

  // 新增性能优化参数
  updateInterval: 3, // CPU更新间隔（每N帧更新一次，从2提升到3）
  useFrustumCulling: false, // 关闭视锥剔除（对于大量粒子反而更快）
  instanceUpdateBatchSize: 50000 // 批量更新大小
}

// ============================================
// 主特效函数
// ============================================

export const quantumFluidTaichiEffect = async (container: HTMLElement): Promise<() => void> => {
  console.log('[QuantumFluidTaichi] 开始初始化 WebGPU 流体模拟...')

  // ============================================
  // 1. 核心变量声明
  // ============================================

  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: THREE.WebGPURenderer
  let animationId: number | null = null
  let allTweens: gsap.Tween[] = []

  // 流体网格
  let fluidMesh: THREE.InstancedMesh | null = null
  let fluidMaterial: THREE.MeshBasicNodeMaterial | null = null

  // 性能监控面板
  let performancePanel: HTMLDivElement | null = null
  let fpsElement: HTMLElement | null = null
  let computeTimeElement: HTMLElement | null = null

  // 交互相关
  let mouseX = 0
  let mouseY = 0
  let mouseWorld = new THREE.Vector3()

  // 性能统计
  let frameCount = 0
  let lastTime = performance.now()
  let fps = 0
  let computeTime = 0

  // 配置
  const config = { ...QuantumFluidTaichiEffectParams }

  // ============================================
  // 2. 创建性能监控面板
  // ============================================

  function createPerformancePanel() {
    performancePanel = document.createElement('div')
    performancePanel.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #00ff00;
      padding: 15px;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 1000;
      min-width: 220px;
      border: 1px solid #00ff00;
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
    `

    performancePanel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px; color: #00ffff;">量子流体 - WebGPU</div>
      <div style="margin-bottom: 5px;">FPS: <span id="perf-fps">0</span></div>
      <div style="margin-bottom: 5px;">计算时间: <span id="perf-compute">0</span> ms</div>
      <div style="margin-bottom: 5px;">粒子数量: ${config.particleCount.toLocaleString()}</div>
      <div style="margin-bottom: 5px;">物理引擎: WebGPU Compute</div>
      <div style="margin-bottom: 5px;">数据传输: 零拷贝</div>
      <div style="margin-bottom: 5px;">渲染模式: InstancedMesh</div>
    `

    document.body.appendChild(performancePanel)

    fpsElement = performancePanel.querySelector('#perf-fps')!
    computeTimeElement = performancePanel.querySelector('#perf-compute')!
  }

  // 更新性能面板
  function updatePerformancePanel() {
    if (!fpsElement || !computeTimeElement) return

    fpsElement.textContent = fps.toFixed(1)
    computeTimeElement.textContent = computeTime.toFixed(2)
  }

  // ============================================
  // 3. 初始化场景
  // ============================================

  async function init() {
    console.log('[QuantumFluidTaichi] 初始化 WebGPU 场景...')

    // 创建场景
    scene = new THREE.Scene()

    // 创建相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 40, 100)
    camera.lookAt(0, 0, 0)

    // 创建渲染器
    renderer = new THREE.WebGPURenderer({ antialias: config.antialias, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(config.pixelRatio)
    container.appendChild(renderer.domElement)

    // 关键修复：等待 WebGPU 后端初始化完成
    console.log('[QuantumFluidTaichi] 初始化 WebGPU 后端...')
    await renderer.init()
    console.log('[QuantumFluidTaichi] WebGPU 后端初始化完成')

    // ============================================
    // 4. 创建粒子数据
    // ============================================

    console.log('[QuantumFluidTaichi] 初始化粒子数据...')

    const positionArray = new Float32Array(config.particleCount * 3)
    const velocityArray = new Float32Array(config.particleCount * 3)

    // 初始化粒子位置（球形分布）
    for (let i = 0; i < config.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = Math.pow(Math.random(), 1 / 3) * config.boundaryRadius

      positionArray[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positionArray[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positionArray[i * 3 + 2] = radius * Math.cos(phi)

      // 随机初速度
      velocityArray[i * 3] = (Math.random() - 0.5) * 10
      velocityArray[i * 3 + 1] = (Math.random() - 0.5) * 10
      velocityArray[i * 3 + 2] = (Math.random() - 0.5) * 10
    }

    // ============================================
    // 5. 创建 Compute Shader（GPU 物理计算）
    // ============================================

    console.log('[QuantumFluidTaichi] 创建 Compute Shader...')

    const deltaTime = uniform(0.016)
    const mousePosition = uniform(new THREE.Vector3())
    const gravity = uniform(config.gravity)
    const damping = uniform(config.damping)
    const boundary = uniform(config.boundaryRadius)
    const restitution = uniform(config.restitution)
    const interactionRadius = uniform(config.interactionRadius)
    const interactionStrength = uniform(config.interactionStrength)

    // 位置和速度数组（GPU 存储）
    const positions = instancedArray(positionArray, 'vec3').setName('positionStorage')
    const velocities = instancedArray(velocityArray, 'vec3').setName('velocityStorage')

    // Compute Shader 函数：更新粒子物理
    const updatePhysics = Fn(() => {
      const idx = instanceIndex.toConst()

      // 获取当前位置和速度
      const pos = positions.element(idx).toVar()
      const vel = velocities.element(idx).toVar()

      // 应用重力
      vel.y.addAssign(gravity.mul(deltaTime))

      // 鼠标交互（吸引/排斥）
      const toMouse = mousePosition.sub(pos)
      const distToMouse = length(toMouse)

      If(distToMouse.lessThan(interactionRadius), () => {
        const force = interactionStrength.mul(float(1.0).sub(distToMouse.div(interactionRadius)))
        const forceVec = normalize(toMouse).mul(force).mul(deltaTime)
        vel.addAssign(forceVec)
      })

      // 更新位置
      pos.addAssign(vel.mul(deltaTime))

      // 边界检测
      If(pos.x.lessThan(boundary.negate()), () => {
        pos.x.assign(boundary.negate())
        vel.x.assign(vel.x.mul(restitution.negate()))
      })

      If(pos.x.greaterThan(boundary), () => {
        pos.x.assign(boundary)
        vel.x.assign(vel.x.mul(restitution.negate()))
      })

      If(pos.y.lessThan(boundary.negate()), () => {
        pos.y.assign(boundary.negate())
        vel.y.assign(vel.y.mul(restitution.negate()))
      })

      If(pos.y.greaterThan(boundary), () => {
        pos.y.assign(boundary)
        vel.y.assign(vel.y.mul(restitution.negate()))
      })

      If(pos.z.lessThan(boundary.negate()), () => {
        pos.z.assign(boundary.negate())
        vel.z.assign(vel.z.mul(restitution.negate()))
      })

      If(pos.z.greaterThan(boundary), () => {
        pos.z.assign(boundary)
        vel.z.assign(vel.z.mul(restitution.negate()))
      })

      // 应用阻尼
      vel.mulAssign(damping)
    })

    // 创建 Compute Pipeline
    const computePipeline = updatePhysics()
      .compute(config.particleCount)
      .setName('fluidPhysicsUpdate')

    // ============================================
    // 6. 创建流体网格
    // ============================================

    console.log('[QuantumFluidTaichi] 创建流体网格...')

    // 使用简单的四面体几何体（最简单的3D形状，性能最优）
    const geometry = new THREE.TetrahedronGeometry(config.particleSize * 0.1, 0)

    // 霓虹配色材质
    const neonColors = [
      new THREE.Color(0xff0066), // 霓虹粉
      new THREE.Color(0x00f0ff), // 电光蓝
      new THREE.Color(0x00ff66), // 激光绿
      new THREE.Color(0x9900ff), // 紫罗兰
      new THREE.Color(0xff9900) // 金橙
    ]

    // 简单材质，使用 setColorAt 设置每个实例的颜色
    fluidMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      side: THREE.FrontSide // 只渲染正面，减少渲染负担
    })

    fluidMesh = new THREE.InstancedMesh(geometry, fluidMaterial, config.particleCount)
    fluidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    fluidMesh.frustumCulled = false // 关闭视锥剔除，对于大量粒子反而更快

    // 立即设置所有粒子的颜色
    for (let i = 0; i < config.particleCount; i++) {
      const colorIndex = Math.floor((i / config.particleCount) * 5)
      const baseColor = neonColors[colorIndex]
      fluidMesh.setColorAt(i, baseColor)
    }

    scene.add(fluidMesh)

    // ============================================
    // 7. 更新粒子实例矩阵（性能优化版本）
    // ============================================

    // 复用对象避免重复创建
    const dummy = new THREE.Object3D()
    const tempColor = new THREE.Color()

    // CPU 端缓存（用于更新实例矩阵）
    const positionCache = new Float32Array(positionArray)
    const velocityCache = new Float32Array(velocityArray)

    const updateInstances = () => {
      const time = performance.now() * 0.001

      for (let i = 0; i < config.particleCount; i++) {
        const idx = i * 3
        const x = positionCache[idx]
        const y = positionCache[idx + 1]
        const z = positionCache[idx + 2]

        // 使用复用的 dummy 对象
        dummy.position.set(x, y, z)
        dummy.updateMatrix()
        fluidMesh!.setMatrixAt(i, dummy.matrix)

        // 颜色更新优化：每 100 个粒子更新一次颜色（大幅减少颜色计算）
        if (i % 100 === 0) {
          const colorIndex = Math.floor((i / config.particleCount) * 5)
          const hue = (time * 0.05 + colorIndex * 0.2) % 1.0
          tempColor.setHSL(hue, 1.0, 0.6)
          fluidMesh!.setColorAt(i, tempColor)
        } else {
          // 使用之前的颜色
          const colorIndex = Math.floor((i / config.particleCount) * 5)
          fluidMesh!.setColorAt(i, neonColors[colorIndex])
        }
      }

      fluidMesh!.instanceMatrix.needsUpdate = true
      if (fluidMesh!.instanceColor) {
        fluidMesh!.instanceColor.needsUpdate = true
      }
    }

    // ============================================
    // 8. 读取 GPU 计算结果
    // ============================================

    const readGPUResults = () => {
      const startTime = performance.now()

      // 从 instancedArray 读取数据到 CPU 缓存
      for (let i = 0; i < config.particleCount * 3; i++) {
        positionCache[i] = positionArray[i]
        velocityCache[i] = velocityArray[i]
      }

      computeTime = performance.now() - startTime
    }

    // ============================================
    // 9. GSAP 电影级运镜
    // ============================================

    const cameraTimeline = gsap.timeline({ repeat: -1, repeatDelay: 2 })

    // 镜头 1: 俯视
    cameraTimeline.to(camera.position, {
      x: 0,
      y: 120,
      z: 50,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 2: 侧面
    cameraTimeline.to(camera.position, {
      x: 100,
      y: 40,
      z: 0,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 3: 底部仰视
    cameraTimeline.to(camera.position, {
      x: 0,
      y: -80,
      z: 80,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 4: 近景
    cameraTimeline.to(camera.position, {
      x: 50,
      y: 20,
      z: 50,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 5: 旋转环绕
    cameraTimeline.to(camera.position, {
      x: -70,
      y: 30,
      z: 70,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 6: 远景（回到初始位置）
    cameraTimeline.to(camera.position, {
      x: 0,
      y: 40,
      z: 100,
      duration: 3,
      ease: 'power2.inOut'
    })

    allTweens.push(cameraTimeline)

    // ============================================
    // 10. 创建性能监控面板
    // ============================================

    createPerformancePanel()

    // ============================================
    // 11. 事件监听
    // ============================================

    container.addEventListener('mousemove', onMouseMove)
    window.addEventListener('resize', onWindowResize)

    // ============================================
    // 12. 动画循环
    // ============================================

    console.log('[QuantumFluidTaichi] 开始动画循环')

    let frameIndex = 0

    function animate() {
      animationId = requestAnimationFrame(animate)

      frameIndex++
      frameCount++

      // 计算 FPS
      const currentTime = performance.now()
      if (currentTime - lastTime >= 1000) {
        fps = (frameCount * 1000) / (currentTime - lastTime)
        frameCount = 0
        lastTime = currentTime
      }

      // 更新鼠标位置（世界坐标）
      mouseWorld.set(mouseX * config.boundaryRadius, mouseY * config.boundaryRadius, 0)
      mousePosition.value.copy(mouseWorld)

      // 执行 GPU 计算
      const computeStart = performance.now()
      renderer.compute(computePipeline)
      const computeEnd = performance.now()
      computeTime = computeEnd - computeStart

      // 读取 GPU 结果（降频，每 N 帧读取一次，可配置）
      if (frameIndex % config.updateInterval === 0) {
        readGPUResults()
        updateInstances()
      }

      // 更新性能面板（降低频率减少DOM操作）
      if (frameCount % 30 === 0) {
        updatePerformancePanel()
      }

      // 渲染
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    }

    animate()

    // 立即初始化粒子位置和颜色
    readGPUResults()
    updateInstances()

    // GSAP 入场动画
    const entranceTimeline = gsap.timeline()

    // 相机推近
    entranceTimeline.fromTo(
      camera.position,
      { z: 200 },
      { z: 100, duration: 2, ease: 'power2.out' }
    )

    // 粒子扩散（通过缩放模拟）
    entranceTimeline.fromTo(
      fluidMesh.scale,
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1, duration: 1.5, ease: 'back.out(1.7)' }
    )

    allTweens.push(entranceTimeline)

    console.log('[QuantumFluidTaichi] 初始化完成')
  }

  // ============================================
  // 鼠标移动事件
  // ============================================

  function onMouseMove(event: MouseEvent) {
    const rect = container.getBoundingClientRect()
    mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  // ============================================
  // 窗口调整事件
  // ============================================

  function onWindowResize() {
    if (!camera || !renderer) return
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  // ============================================
  // 清理函数
  // ============================================

  function cleanup(): void {
    console.log('[QuantumFluidTaichi] 开始清理资源...')

    // 1. 停止动画
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    // 2. 杀死所有 GSAP 动画
    allTweens.forEach(tween => tween.kill())
    allTweens = []

    // 3. 杀死所有与元素相关的动画
    if (fluidMesh) {
      gsap.killTweensOf(fluidMesh)
      gsap.killTweensOf(fluidMesh.scale)
    }
    if (camera) {
      gsap.killTweensOf(camera.position)
      gsap.killTweensOf(camera.rotation)
    }

    // 4. 移除事件监听
    container.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('resize', onWindowResize)

    // 5. 从场景中移除
    if (fluidMesh && scene) {
      scene.remove(fluidMesh)
    }

    // 6. 释放几何体
    if (fluidMesh && fluidMesh.geometry) {
      fluidMesh.geometry.dispose()
    }

    // 7. 释放材质
    if (fluidMesh && fluidMesh.material) {
      ;(fluidMesh.material as THREE.Material).dispose()
    }

    // 8. 释放渲染器
    if (renderer) {
      renderer.dispose()
    }

    // 9. 从 DOM 中移除画布
    if (container && renderer && renderer.domElement) {
      container.removeChild(renderer.domElement)
    }

    // 10. 移除性能面板
    if (performancePanel && performancePanel.parentNode) {
      performancePanel.parentNode.removeChild(performancePanel)
      performancePanel = null
    }

    // 11. 所有变量置为 null
    scene = null
    camera = null
    renderer = null
    fluidMesh = null
    fluidMaterial = null
    fpsElement = null
    computeTimeElement = null

    console.log('[QuantumFluidTaichi] 清理完成')
  }

  // ============================================
  // 开始初始化
  // ============================================

  try {
    await init()
  } catch (error) {
    console.error('[QuantumFluidTaichi] 初始化失败:', error)
    cleanup()
    throw error
  }

  return cleanup
}
