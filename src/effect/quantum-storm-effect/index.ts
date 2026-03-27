/**
 * 量子风暴特效 - WebGPU 混合优化版
 *
 * 技术栈：
 * - WebGPU Compute Shader（并行物理计算）
 * - GPU 动态着色（TSL）- 动态闪电效果
 * - CPU 降频渲染（每2-3帧更新一次）
 * - InstancedMesh 批量渲染
 *
 * 视觉效果：
 * - 中心能量漩涡（吸引所有粒子）
 * - 闪电粒子（间歇性爆发）
 * - 能量光环（动态扩散）
 * - 霓虹渐变色（蓝紫-金-红）
 *
 * 性能目标：
 * - 300,000 粒子 @ 25-35 FPS
 * - 支持鼠标交互
 * - 电影级运镜
 */

import * as THREE from 'three/webgpu'
import gsap from 'gsap'
import {
  Fn,
  uniform,
  float,
  instanceIndex,
  instancedArray,
  length,
  normalize,
  mix,
  time,
  select,
  sin,
  cos,
  abs,
  vec3
} from 'three/tsl'

// ============================================
// 1. 特效参数配置
// ============================================

export const quantumStormEffectParams = {
  particleCount: 300000,
  particleSize: 3.0,

  // 漩涡参数
  vortexStrength: 50.0,      // 漩涡强度
  vortexRadius: 60.0,         // 漩涡影响半径
  vortexRotationSpeed: 2.0,   // 漩涡旋转速度

  // 闪电参数
  lightningCount: 500,        // 闪电粒子数量
  lightningInterval: 30,      // 闪电间隔（帧数）

  // 能量光环参数
  haloCount: 8,              // 光环数量
  haloRadius: 40.0,          // 光环半径

  // 物理参数
  gravity: -2.0,             // 微弱重力
  damping: 0.985,            // 速度衰减
  boundaryRadius: 100.0,      // 边界半径
  restitution: 0.6,          // 碰撞弹性

  // 交互参数
  interactionRadius: 20.0,    // 鼠标交互半径
  interactionStrength: 150.0, // 鼠标交互强度

  // 渲染参数
  pixelRatio: Math.min(window.devicePixelRatio, 0.75),
  antialias: false,

  // 性能优化参数
  updateInterval: 2,
  colorUpdateInterval: 800,
  useFrustumCulling: false,
  instanceUpdateBatchSize: 40000
}

// ============================================
// 2. 主特效函数
// ============================================

export const quantumStormEffect = async (container: HTMLElement): Promise<(() => void)> => {
  console.log('[QuantumStorm] 开始初始化量子风暴特效...')

  // ============================================
  // 2.1 核心变量声明
  // ============================================

  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: THREE.WebGPURenderer | null = null
  let animationId: number | null = null
  let allTweens: (gsap.core.Tween | gsap.core.Timeline)[] = []
  let cinematicTimeline: gsap.core.Timeline | null = null

  // 粒子网格
  let stormMesh: THREE.InstancedMesh | null = null
  let stormMaterial: THREE.MeshBasicNodeMaterial | null = null
  let lightningMesh: THREE.InstancedMesh | null = null
  let lightningMaterial: THREE.MeshBasicNodeMaterial | null = null

  // 能量光环
  let haloMeshes: THREE.Mesh[] = []
  let haloMaterials: THREE.MeshBasicMaterial[] = []
  let haloGeometries: THREE.BufferGeometry[] = []

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
  let lightningFrameCount = 0

  // 配置
  const config = { ...quantumStormEffectParams }

  // ============================================
  // 2.2 性能监控面板
  // ============================================

  function createPerformancePanel() {
    performancePanel = document.createElement('div')
    performancePanel.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ffff;
      padding: 15px;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 1000;
      min-width: 240px;
      border: 2px solid #00ffff;
      box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
    `

    performancePanel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px; color: #ff00ff; text-shadow: 0 0 10px #ff00ff;">⚡ 量子风暴 - 混合优化</div>
      <div style="margin-bottom: 5px;">FPS: <span id="perf-fps">0</span></div>
      <div style="margin-bottom: 5px;">计算时间: <span id="perf-compute">0</span> ms</div>
      <div style="margin-bottom: 5px;">粒子数量: ${config.particleCount.toLocaleString()}</div>
      <div style="margin-bottom: 5px;">闪电粒子: ${config.lightningCount}</div>
      <div style="margin-bottom: 5px;">物理引擎: WebGPU Compute</div>
      <div style="margin-bottom: 5px;">渲染模式: GPU着色 + 降频CPU</div>
      <div style="margin-bottom: 5px;">漩涡强度: ${config.vortexStrength}</div>
      <div style="margin-bottom: 5px;">更新间隔: ${config.updateInterval} 帧</div>
      <div style="margin-bottom: 5px;">像素比: ${config.pixelRatio.toFixed(2)}</div>
    `

    document.body.appendChild(performancePanel)

    fpsElement = performancePanel.querySelector('#perf-fps')!
    computeTimeElement = performancePanel.querySelector('#perf-compute')!
  }

  function updatePerformancePanel() {
    if (!fpsElement || !computeTimeElement) return
    fpsElement.textContent = fps.toFixed(1)
    computeTimeElement.textContent = computeTime.toFixed(2)
  }

  // ============================================
  // 2.3 初始化函数
  // ============================================

  async function init() {
    console.log('[QuantumStorm] 初始化 WebGPU 场景...')

    // 创建场景
    scene = new THREE.Scene()

    // 创建相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 50, 120)
    camera.lookAt(0, 0, 0)

    // 创建渲染器
    renderer = new THREE.WebGPURenderer({ antialias: config.antialias, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(config.pixelRatio)
    container.appendChild(renderer.domElement)

    // 等待 WebGPU 后端初始化
    console.log('[QuantumStorm] 初始化 WebGPU 后端...')
    await renderer.init()
    console.log('[QuantumStorm] WebGPU 后端初始化完成')

    // ============================================
    // 2.4 创建粒子数据
    // ============================================

    console.log('[QuantumStorm] 初始化粒子数据...')

    // 主漩涡粒子
    const stormPositionArray = new Float32Array(config.particleCount * 3)
    const stormVelocityArray = new Float32Array(config.particleCount * 3)

    // 闪电粒子
    const lightningPositionArray = new Float32Array(config.lightningCount * 3)
    const lightningVelocityArray = new Float32Array(config.lightningCount * 3)

    // 初始化漩涡粒子（环形分布）
    for (let i = 0; i < config.particleCount; i++) {
      const angle = (i / config.particleCount) * Math.PI * 2 * 5 // 5圈
      const radius = 20 + Math.random() * 60

      stormPositionArray[i * 3] = Math.cos(angle) * radius
      stormPositionArray[i * 3 + 1] = (Math.random() - 0.5) * 40
      stormPositionArray[i * 3 + 2] = Math.sin(angle) * radius

      // 初始切向速度（形成漩涡）
      const tangentAngle = angle + Math.PI / 2
      const speed = 5 + Math.random() * 10
      stormVelocityArray[i * 3] = Math.cos(tangentAngle) * speed
      stormVelocityArray[i * 3 + 1] = (Math.random() - 0.5) * 2
      stormVelocityArray[i * 3 + 2] = Math.sin(tangentAngle) * speed
    }

    // 初始化闪电粒子（随机分布）
    for (let i = 0; i < config.lightningCount; i++) {
      lightningPositionArray[i * 3] = (Math.random() - 0.5) * 30
      lightningPositionArray[i * 3 + 1] = (Math.random() - 0.5) * 30
      lightningPositionArray[i * 3 + 2] = (Math.random() - 0.5) * 30

      lightningVelocityArray[i * 3] = 0
      lightningVelocityArray[i * 3 + 1] = 0
      lightningVelocityArray[i * 3 + 2] = 0
    }

    // ============================================
    // 2.5 创建 Compute Shader（漩涡物理）
    // ============================================

    console.log('[QuantumStorm] 创建漩涡 Compute Shader...')

    const deltaTime = uniform(0.016)
    const mousePosition = uniform(new THREE.Vector3())
    const vortexStrength = uniform(config.vortexStrength)
    const vortexRadius = uniform(config.vortexRadius)
    const gravity = uniform(config.gravity)
    const damping = uniform(config.damping)
    const boundary = uniform(config.boundaryRadius)
    const restitution = uniform(config.restitution)
    const interactionRadius = uniform(config.interactionRadius)
    const interactionStrength = uniform(config.interactionStrength)

    const stormPositions = instancedArray(stormPositionArray, 'vec3').setName('stormPositionStorage')
    const stormVelocities = instancedArray(stormVelocityArray, 'vec3').setName('stormVelocityStorage')

    const updateVortexPhysics = Fn(() => {
      const idx = instanceIndex.toConst()

      const pos = stormPositions.element(idx).toVar()
      const vel = stormVelocities.element(idx).toVar()

      // 漩涡效果：向心力 + 切向力
      const toCenter = pos.negate()
      const distToCenter = length(toCenter)

      const inwardForce = toCenter.normalize().mul(vortexStrength.mul(deltaTime).mul(
        float(1.0).sub(distToCenter.div(vortexRadius)).max(float(0))
      ))

      vel.addAssign(inwardForce)

      // 切向旋转力（形成漩涡）
      const tangent = vec3(pos.z.negate(), float(0.0), pos.x).normalize()
      vel.addAssign(tangent.mul(float(10.0).mul(deltaTime)))

      // 重力
      vel.y.addAssign(gravity.mul(deltaTime))

      // 鼠标交互
      const toMouse = mousePosition.sub(pos)
      const distToMouse = length(toMouse)
      const mouseForce = interactionStrength.mul(
        float(1.0).sub(distToMouse.div(interactionRadius)).max(float(0))
      )
      const mouseForceVec = normalize(toMouse).mul(mouseForce).mul(deltaTime)
      vel.addAssign(mouseForceVec)

      // 更新位置
      pos.addAssign(vel.mul(deltaTime))

      // 边界反弹
      const overflow = pos.abs().greaterThan(boundary)
      vel.x.assign(overflow.x.select(vel.x.mul(restitution.negate()), vel.x))
      vel.y.assign(overflow.y.select(vel.y.mul(restitution.negate()), vel.y))
      vel.z.assign(overflow.z.select(vel.z.mul(restitution.negate()), vel.z))

      // 阻尼
      vel.mulAssign(damping)
    })

    const vortexPipeline = updateVortexPhysics().compute(config.particleCount).setName('vortexUpdate')

    // ============================================
    // 2.6 创建闪电 Compute Shader
    // ============================================

    console.log('[QuantumStorm] 创建闪电 Compute Shader...')

    const lightningPositions = instancedArray(lightningPositionArray, 'vec3').setName('lightningPositionStorage')
    const lightningVelocities = instancedArray(lightningVelocityArray, 'vec3').setName('lightningVelocityStorage')
    const isActive = uniform(0.0) // 闪电激活状态

    const updateLightningPhysics = Fn(() => {
      const idx = instanceIndex.toConst()

      const pos = lightningPositions.element(idx).toVar()
      const vel = lightningVelocities.element(idx).toVar()

      // 随机跳跃（闪电效果）
      const randomOffset = vec3(
        float(Math.random() - 0.5).mul(float(5)),
        float(Math.random() - 0.5).mul(float(5)),
        float(Math.random() - 0.5).mul(float(5))
      )

      vel.addAssign(randomOffset.mul(deltaTime).mul(float(20.0)))

      // 阻尼
      vel.mulAssign(float(0.9))

      // 向中心聚集
      const toCenter = pos.negate().normalize()
      vel.addAssign(toCenter.mul(deltaTime).mul(float(5.0)))

      // 更新位置
      pos.addAssign(vel.mul(deltaTime))
    })

    const lightningPipeline = updateLightningPhysics().compute(config.lightningCount).setName('lightningUpdate')

    // ============================================
    // 2.7 创建能量光环
    // ============================================

    console.log('[QuantumStorm] 创建能量光环...')

    const haloColors = [
      new THREE.Color(0x00ffff), // 青色
      new THREE.Color(0xff00ff), // 紫色
      new THREE.Color(0xffff00),  // 黄色
      new THREE.Color(0xff0000),  // 红色
    ]

    for (let i = 0; i < config.haloCount; i++) {
      const geometry = new THREE.TorusGeometry(config.haloRadius + i * 5, 0.3, 16, 100)
      const material = new THREE.MeshBasicMaterial({
        color: haloColors[i % haloColors.length],
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })

      const halo = new THREE.Mesh(geometry, material)
      halo.rotation.x = Math.PI / 2
      halo.scale.set(0, 0, 1)
      scene!.add(halo)

      haloMeshes.push(halo)
      haloMaterials.push(material)
      haloGeometries.push(geometry)
    }

    // ============================================
    // 2.8 创建 GPU 渲染网格（漩涡粒子）
    // ============================================

    console.log('[QuantumStorm] 创建 GPU 渲染网格...')

    const stormGeometry = new THREE.TetrahedronGeometry(config.particleSize * 0.1, 0)

    // 霓虹配色（GPU 端）
    const stormColor0 = uniform(new THREE.Vector3(0.0, 1.0, 1.0)) // 青色
    const stormColor1 = uniform(new THREE.Vector3(1.0, 0.0, 1.0)) // 紫色
    const stormColor2 = uniform(new THREE.Vector3(1.0, 1.0, 0.0)) // 金色
    const stormColor3 = uniform(new THREE.Vector3(1.0, 0.0, 0.0)) // 红色
    const stormColor4 = uniform(new THREE.Vector3(0.5, 0.0, 1.0)) // 深紫

    // CPU 端霓虹配色
    const stormColors = [
      new THREE.Color(0x00ffff),
      new THREE.Color(0xff00ff),
      new THREE.Color(0xffff00),
      new THREE.Color(0xff0000),
      new THREE.Color(0x8000ff)
    ]

    stormMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      opacity: 0.9,
      side: THREE.FrontSide,
      fragmentNode: Fn(() => {
        const idx = instanceIndex.toVar()

        // 基于索引和距离中心的动态颜色
        const pos = stormPositions.element(idx)
        const dist = length(pos)

        const colorIndex = float(idx).div(config.particleCount).mul(float(5)).floor()
        const baseHue = colorIndex.mul(float(0.2)).add(time.mul(float(0.08))).add(dist.mul(float(0.02)))
        const hue = baseHue.mod(float(1.0))

        // 动态色相映射
        const segment = hue.mul(float(5))
        const segmentIndex = segment.floor().clamp(float(0), float(4))
        const segmentT = segment.sub(segmentIndex)

        const color0 = segmentIndex.equal(float(0)).select(stormColor0,
                       segmentIndex.equal(float(1)).select(stormColor1,
                       segmentIndex.equal(float(2)).select(stormColor2,
                       segmentIndex.equal(float(3)).select(stormColor3, stormColor4))))

        const color1 = segmentIndex.equal(float(0)).select(stormColor1,
                       segmentIndex.equal(float(1)).select(stormColor2,
                       segmentIndex.equal(float(2)).select(stormColor3,
                       segmentIndex.equal(float(3)).select(stormColor4, stormColor0))))

        return mix(color0, color1, segmentT)
      })()
    })

    stormMesh = new THREE.InstancedMesh(stormGeometry, stormMaterial as THREE.Material, config.particleCount)
    stormMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    stormMesh.frustumCulled = false

    // 设置初始实例矩阵
    const dummyInit = new THREE.Object3D()
    for (let i = 0; i < config.particleCount; i++) {
      dummyInit.position.set(stormPositionArray[i * 3], stormPositionArray[i * 3 + 1], stormPositionArray[i * 3 + 2])
      dummyInit.updateMatrix()
      stormMesh.setMatrixAt(i, dummyInit.matrix)
      stormMesh.setColorAt(i, stormColors[Math.floor((i / config.particleCount) * 5)])
    }

    scene!.add(stormMesh)

    // ============================================
    // 2.9 创建 GPU 渲染网格（闪电粒子）
    // ============================================

    console.log('[QuantumStorm] 创建闪电粒子...')

    const lightningGeometry = new THREE.TetrahedronGeometry(config.particleSize * 0.2, 0)

    lightningMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.FrontSide,
      fragmentNode: Fn(() => {
        const idx = instanceIndex.toVar()

        // 基于时间和索引的闪烁效果
        const flicker = sin(time.mul(float(20)).add(float(idx).mul(float(0.1))).mul(float(0.5)).add(float(0.5)))

        // 纯白色闪电
        const lightningColor = vec3(float(1.0))

        return lightningColor.mul(flicker)
      })()
    })

    lightningMesh = new THREE.InstancedMesh(lightningGeometry, lightningMaterial as THREE.Material, config.lightningCount)
    lightningMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    lightningMesh.frustumCulled = false

    // 设置初始实例矩阵
    for (let i = 0; i < config.lightningCount; i++) {
      dummyInit.position.set(lightningPositionArray[i * 3], lightningPositionArray[i * 3 + 1], lightningPositionArray[i * 3 + 2])
      dummyInit.updateMatrix()
      lightningMesh.setMatrixAt(i, dummyInit.matrix)
    }

    scene!.add(lightningMesh)

    // ============================================
    // 2.10 CPU 端更新实例矩阵（降频优化）
    // ============================================

    const dummy = new THREE.Object3D()
    const tempColor = new THREE.Color()

    const stormPositionCache = new Float32Array(stormPositionArray)
    const lightningPositionCache = new Float32Array(lightningPositionArray)

    let updateFrameCounter = 0

    const updateInstances = () => {
      // 更新漩涡粒子
      for (let i = 0; i < config.particleCount * 3; i++) {
        stormPositionCache[i] = stormPositionArray[i]
      }

      for (let i = 0; i < config.particleCount; i++) {
        const idx = i * 3
        dummy.position.set(stormPositionCache[idx], stormPositionCache[idx + 1], stormPositionCache[idx + 2])
        dummy.updateMatrix()
        stormMesh!.setMatrixAt(i, dummy.matrix)

        if (i % config.colorUpdateInterval === 0) {
          const colorIndex = Math.floor((i / config.particleCount) * 5)
          tempColor.setHSL((performance.now() * 0.00008 + colorIndex * 0.2) % 1.0, 1.0, 0.6)
          stormMesh!.setColorAt(i, tempColor)
        }
      }

      stormMesh!.instanceMatrix.needsUpdate = true
      if (stormMesh!.instanceColor) {
        stormMesh!.instanceColor.needsUpdate = true
      }

      // 更新闪电粒子
      for (let i = 0; i < config.lightningCount * 3; i++) {
        lightningPositionCache[i] = lightningPositionArray[i]
      }

      for (let i = 0; i < config.lightningCount; i++) {
        const idx = i * 3
        dummy.position.set(lightningPositionCache[idx], lightningPositionCache[idx + 1], lightningPositionCache[idx + 2])
        dummy.updateMatrix()
        lightningMesh!.setMatrixAt(i, dummy.matrix)
      }

      lightningMesh!.instanceMatrix.needsUpdate = true
    }

    // ============================================
    // 2.11 GSAP 电影级运镜
    // ============================================

    cinematicTimeline = gsap.timeline({
      repeatDelay: 0.3,
      repeat: 0,
      onComplete: () => {
        console.log('[QuantumStorm] 运镜动画完成，开始清理特效')
        clearEffect()
      }
    })

    // 镜头 1: 俯视漩涡
    cinematicTimeline.to(camera.position, {
      x: 0, y: 150, z: 30,
      duration: 4,
      ease: 'power2.inOut'
    })

    // 镜头 2: 环绕俯冲
    cinematicTimeline.to(camera.position, {
      x: 80, y: 60, z: -50,
      duration: 4,
      ease: 'power2.inOut'
    })

    // 镜头 3: 近景漩涡中心
    cinematicTimeline.to(camera.position, {
      x: 20, y: 20, z: 20,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 4: 底部仰视
    cinematicTimeline.to(camera.position, {
      x: 0, y: -100, z: 60,
      duration: 4,
      ease: 'power2.inOut'
    })

    // 镜头 5: 侧面全景
    cinematicTimeline.to(camera.position, {
      x: 120, y: 40, z: 0,
      duration: 4,
      ease: 'power2.inOut'
    })

    // 镜头 6: 远景（回到初始位置）
    cinematicTimeline.to(camera.position, {
      x: 0, y: 50, z: 120,
      duration: 3,
      ease: 'power2.inOut'
    })

    allTweens.push(cinematicTimeline)

    // ============================================
    // 2.12 GSAP 入场动画
    // ============================================

    const entranceTimeline = gsap.timeline()

    // 相机推近
    entranceTimeline.fromTo(
      camera!.position,
      { z: 250 },
      { z: 120, duration: 2, ease: 'power2.out' }
    )

    // 能量光环淡入
    haloMaterials.forEach((mat, i) => {
      entranceTimeline.to(mat, {
        opacity: 0.3 + Math.random() * 0.4,
        duration: 1.5,
        delay: i * 0.1,
        ease: 'power2.out'
      })

      entranceTimeline.to(haloMeshes[i].scale, {
        x: 1, y: 1, z: 1,
        duration: 2,
        delay: i * 0.1,
        ease: 'back.out(1.5)'
      })
    })

    // 闪电淡入
    entranceTimeline.to(lightningMaterial!, {
      opacity: 0.8,
      duration: 1,
      delay: 1,
      ease: 'power2.out'
    })

    allTweens.push(entranceTimeline)

    // ============================================
    // 2.13 创建性能监控面板
    // ============================================

    createPerformancePanel()

    // ============================================
    // 2.14 事件监听
    // ============================================

    container!.addEventListener('mousemove', onMouseMove)
    window.addEventListener('resize', onWindowResize)

    // ============================================
    // 2.15 动画循环
    // ============================================

    console.log('[QuantumStorm] 开始动画循环...')

    function animate() {
      animationId = requestAnimationFrame(animate)

      frameCount++

      const currentTime = performance.now()
      if (currentTime - lastTime >= 1000) {
        fps = frameCount * 1000 / (currentTime - lastTime)
        frameCount = 0
        lastTime = currentTime
      }

      // 更新鼠标位置
      mouseWorld.set(mouseX * config.boundaryRadius, mouseY * config.boundaryRadius, 0)
      mousePosition.value.copy(mouseWorld)

      // 执行漩涡物理计算
      const computeStart = performance.now()
      renderer!.compute(vortexPipeline)

      // 闪电逻辑：每 N 帧触发一次
      lightningFrameCount++
      if (lightningFrameCount % config.lightningInterval === 0) {
        // 激活闪电效果
        lightningFrameCount = 0
        gsap.to(lightningMaterial!, {
          opacity: 1.0,
          duration: 0.1,
          onComplete: () => {
            gsap.to(lightningMaterial!, {
              opacity: 0,
              duration: 0.3,
              ease: 'power2.out'
            })
          }
        })

        // 随机重置闪电粒子位置
        for (let i = 0; i < config.lightningCount; i++) {
          lightningPositionArray[i * 3] = (Math.random() - 0.5) * 40
          lightningPositionArray[i * 3 + 1] = (Math.random() - 0.5) * 40
          lightningPositionArray[i * 3 + 2] = (Math.random() - 0.5) * 40
        }

        renderer!.compute(lightningPipeline)
      } else if (lightningMaterial!.opacity > 0) {
        // 继续计算闪电物理
        renderer!.compute(lightningPipeline)
      }

      const computeEnd = performance.now()
      computeTime = computeEnd - computeStart

      // 降频更新实例矩阵
      updateFrameCounter++
      if (updateFrameCounter % config.updateInterval === 0) {
        updateInstances()
      }

      // 更新光环动画（旋转和脉冲）
      haloMeshes.forEach((halo, i) => {
        halo.rotation.z += 0.005 * (i % 2 === 0 ? 1 : -1)
        halo.scale.setScalar(1 + Math.sin(currentTime * 0.002 + i * 0.5) * 0.2)
      })

      // 更新性能面板
      if (frameCount % 30 === 0) {
        updatePerformancePanel()
      }

      // 渲染
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    }

    animate()

    // 立即初始化粒子
    updateInstances()

    // ============================================
    // 2.16 清理特效函数
    // ============================================

    function clearEffect() {
      console.log('[QuantumStorm] 开始清理特效...')

      // 淡出所有元素
      const fadeOutTimeline = gsap.timeline()

      if (stormMaterial) {
        fadeOutTimeline.to(stormMaterial, {
          opacity: 0,
          duration: 1,
          ease: 'power2.out'
        })
      }

      if (lightningMaterial) {
        fadeOutTimeline.to(lightningMaterial, {
          opacity: 0,
          duration: 0.5,
          ease: 'power2.out'
        })
      }

      haloMaterials.forEach((mat) => {
        fadeOutTimeline.to(mat, {
          opacity: 0,
          duration: 1,
          ease: 'power2.out'
        })
      })

      fadeOutTimeline.eventCallback('onComplete', () => {
        performCleanup()
      })
    }

    function performCleanup() {
      console.log('[QuantumStorm] 执行清理流程...')

      if (cinematicTimeline) {
        cinematicTimeline.kill()
        cinematicTimeline = null
      }

      cleanup()
    }

    console.log('[QuantumStorm] 初始化完成')
  }

  // ============================================
  // 2.17 事件处理函数
  // ============================================

  function onMouseMove(event: MouseEvent) {
    const rect = container.getBoundingClientRect()
    mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  function onWindowResize() {
    if (!camera || !renderer) return
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  // ============================================
  // 2.18 清理函数（12步完整流程）
  // ============================================

  function cleanup(): void {
    console.log('[QuantumStorm] 开始清理资源...')

    // 1. 停止动画
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    // 2. 杀死所有 GSAP 动画
    allTweens.forEach(tween => tween.kill())
    allTweens = []

    // 3. 杀死运镜动画
    if (cinematicTimeline) {
      cinematicTimeline.kill()
      cinematicTimeline = null
    }

    // 4. 杀死元素动画
    if (stormMesh) {
      gsap.killTweensOf(stormMesh)
      gsap.killTweensOf(stormMesh.scale)
    }
    if (lightningMesh) {
      gsap.killTweensOf(lightningMesh)
      gsap.killTweensOf(lightningMesh.scale)
    }
    if (stormMaterial) {
      gsap.killTweensOf(stormMaterial)
    }
    if (lightningMaterial) {
      gsap.killTweensOf(lightningMaterial)
    }
    haloMaterials.forEach((mat) => {
      gsap.killTweensOf(mat)
    })
    haloMeshes.forEach((halo) => {
      gsap.killTweensOf(halo.scale)
    })
    if (camera) {
      gsap.killTweensOf(camera.position)
      gsap.killTweensOf(camera.rotation)
    }

    // 5. 移除事件监听
    container.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('resize', onWindowResize)

    // 6. 从场景移除
    if (stormMesh && scene) {
      scene.remove(stormMesh)
    }
    if (lightningMesh && scene) {
      scene.remove(lightningMesh)
    }
    haloMeshes.forEach((halo) => {
      if (scene) scene.remove(halo)
    })

    // 7. 释放几何体
    if (stormMesh && stormMesh.geometry) {
      stormMesh.geometry.dispose()
    }
    if (lightningMesh && lightningMesh.geometry) {
      lightningMesh.geometry.dispose()
    }
    haloGeometries.forEach((geo) => geo.dispose())

    // 8. 释放材质
    if (stormMesh && stormMesh.material) {
      (stormMesh.material as THREE.Material).dispose()
    }
    if (lightningMesh && lightningMesh.material) {
      (lightningMesh.material as THREE.Material).dispose()
    }
    haloMaterials.forEach((mat) => mat.dispose())

    // 9. 释放渲染器
    if (renderer) {
      renderer.dispose()
    }

    // 10. 从 DOM 移除画布
    if (container && renderer && renderer.domElement) {
      container.removeChild(renderer.domElement)
    }

    // 11. 移除性能面板
    if (performancePanel && performancePanel.parentNode) {
      performancePanel.parentNode.removeChild(performancePanel)
      performancePanel = null
    }

    // 12. 清空引用
    scene = null
    camera = null
    renderer = null
    stormMesh = null
    stormMaterial = null
    lightningMesh = null
    lightningMaterial = null
    haloMeshes = []
    haloMaterials = []
    haloGeometries = []
    fpsElement = null
    computeTimeElement = null
    cinematicTimeline = null

    console.log('[QuantumStorm] 清理完成')
  }

  // ============================================
  // 2.19 开始初始化
  // ============================================

  try {
    await init()
  } catch (error) {
    console.error('[QuantumStorm] 初始化失败:', error)
    cleanup()
    throw error
  }

  return cleanup
}
