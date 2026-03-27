/**
 * 🌟 星际超新星特效 - Stellar Supernova
 *
 * 核心概念：
 * 模拟超新星爆发的壮观景象，包含中心爆炸、激波扩散、星云演化、引力波涟漪等多层次视觉效果
 *
 * 视觉层次：
 * - 第1层：核心能量球（超新星原点，400K粒子）- 极高密度聚变发光
 * - 第2层：爆炸激波（300K粒子）- 超音速向外扩散的冲击波
 * - 第3层：星云云团（200K粒子）- 膨胀的电离气体云
 * - 第4层：引力波涟漪（100K粒子）- 时空扭曲的波浪
 * - 第5层：高能射线（50K粒子）- 垂直喷射的伽马射线流
 * - 第6层：光环脉冲（8个动态光环）- 能量波前的可视化
 *
 * 颜色系统（7段色相循环）：
 * 核心白(1.0,1.0,1.0) → 超新星橙(1.0,0.6,0.0) → 星云紫(0.8,0.0,1.0) → 
 * 星际蓝(0.0,0.8,1.0) → 电光绿(0.0,1.0,0.6) → 等离子粉(1.0,0.0,0.6) → 深空蓝(0.2,0.0,1.0)
 *
 * 技术栈：
 * - WebGPU Compute Shader（多管道并行物理计算）
 * - GPU 动态着色（TSL）- 实时温度映射和亮度衰减
 * - CPU 降频渲染（每2帧更新一次）
 * - InstancedMesh 批量渲染
 * - GSAP 电影级运镜（10个角度）
 *
 * 性能目标：
 * - 1,050,000 总粒子数 @ 20-25 FPS
 * - 支持5个独立的 Compute Pipeline
 * - 完整的物理模拟（重力、激波、阻力）
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
  vec3,
  pow
} from 'three/tsl'

// ============================================
// 1. 特效参数配置
// ============================================

export const stellarSupernovaEffectParams = {
  // 核心能量球粒子
  coreCount: 400000,
  coreSize: 2.5,

  // 爆炸激波粒子
  shockwaveCount: 300000,
  shockwaveSize: 2.0,

  // 星云云团粒子
  nebulaCount: 200000,
  nebulaSize: 1.5,

  // 引力波粒子
  gravityWaveCount: 100000,
  gravityWaveSize: 1.8,

  // 高能射线粒子
  jetCount: 50000,
  jetSize: 2.2,

  // 光环数量
  haloCount: 8,

  // 物理参数
  gravity: -5.0,             // 微弱重力
  damping: 0.990,            // 速度衰减
  shockwaveSpeed: 80.0,      // 激波扩散速度
  shockwaveDecay: 0.005,     // 激波衰减率
  boundaryRadius: 150.0,     // 边界半径
  restitution: 0.5,         // 碰撞弹性

  // 交互参数
  interactionRadius: 25.0,    // 鼠标交互半径
  interactionStrength: 200.0, // 鼠标交互强度

  // 渲染参数
  pixelRatio: Math.min(window.devicePixelRatio, 0.75),
  antialias: false,

  // 性能优化参数
  updateInterval: 2,
  colorUpdateInterval: 1000,
  useFrustumCulling: false,
  instanceUpdateBatchSize: 50000
}

// ============================================
// 2. 主特效函数
// ============================================

export const stellarSupernovaEffect = async (container: HTMLElement): Promise<(() => void)> => {
  console.log('[StellarSupernova] 开始初始化星际超新星特效...')

  // ============================================
  // 2.1 核心变量声明
  // ============================================

  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: THREE.WebGPURenderer | null = null
  let animationId: number | null = null
  let allTweens: (gsap.core.Tween | gsap.core.Timeline)[] = []
  let cinematicTimeline: gsap.core.Timeline | null = null

  // 5层粒子网格
  let coreMesh: THREE.InstancedMesh | null = null
  let coreMaterial: THREE.MeshBasicNodeMaterial | null = null
  let shockwaveMesh: THREE.InstancedMesh | null = null
  let shockwaveMaterial: THREE.MeshBasicNodeMaterial | null = null
  let nebulaMesh: THREE.InstancedMesh | null = null
  let nebulaMaterial: THREE.MeshBasicNodeMaterial | null = null
  let gravityWaveMesh: THREE.InstancedMesh | null = null
  let gravityWaveMaterial: THREE.MeshBasicNodeMaterial | null = null
  let jetMesh: THREE.InstancedMesh | null = null
  let jetMaterial: THREE.MeshBasicNodeMaterial | null = null

  // 光环
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

  // 配置
  const config = { ...stellarSupernovaEffectParams }

  // ============================================
  // 2.2 性能监控面板
  // ============================================

  function createPerformancePanel() {
    performancePanel = document.createElement('div')
    performancePanel.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.92);
      color: #ffcc00;
      padding: 15px;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      z-index: 1000;
      min-width: 260px;
      border: 2px solid #ffcc00;
      box-shadow: 0 0 20px rgba(255, 204, 0, 0.5);
    `

    const totalParticles = config.coreCount + config.shockwaveCount +
                           config.nebulaCount + config.gravityWaveCount + config.jetCount

    performancePanel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px; color: #ff6600; text-shadow: 0 0 10px #ff6600;">🌟 星际超新星 - 混合优化</div>
      <div style="margin-bottom: 5px;">FPS: <span id="perf-fps">0</span></div>
      <div style="margin-bottom: 5px;">计算时间: <span id="perf-compute">0</span> ms</div>
      <div style="margin-bottom: 5px;">总粒子: ${totalParticles.toLocaleString()}</div>
      <div style="margin-bottom: 4px; color: #ffff00;">├─ 核心能量球: ${config.coreCount.toLocaleString()}</div>
      <div style="margin-bottom: 4px; color: #ff6600;">├─ 爆炸激波: ${config.shockwaveCount.toLocaleString()}</div>
      <div style="margin-bottom: 4px; color: #9900ff;">├─ 星云云团: ${config.nebulaCount.toLocaleString()}</div>
      <div style="margin-bottom: 4px; color: #00ccff;">├─ 引力波: ${config.gravityWaveCount.toLocaleString()}</div>
      <div style="margin-bottom: 4px; color: #00ff66;">├─ 高能射线: ${config.jetCount.toLocaleString()}</div>
      <div style="margin-bottom: 5px;">物理引擎: WebGPU Compute (5管道)</div>
      <div style="margin-bottom: 5px;">渲染模式: GPU着色 + 降频CPU</div>
      <div style="margin-bottom: 5px;">激波速度: ${config.shockwaveSpeed}</div>
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
    console.log('[StellarSupernova] 初始化 WebGPU 场景...')

    // 创建场景
    scene = new THREE.Scene()

    // 创建相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 60, 150)
    camera.lookAt(0, 0, 0)

    // 创建渲染器
    renderer = new THREE.WebGPURenderer({ antialias: config.antialias, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(config.pixelRatio)
    container.appendChild(renderer.domElement)

    // 等待 WebGPU 后端初始化
    console.log('[StellarSupernova] 初始化 WebGPU 后端...')
    await renderer.init()
    console.log('[StellarSupernova] WebGPU 后端初始化完成')

    // ============================================
    // 2.4 创建粒子数据
    // ============================================

    console.log('[StellarSupernova] 初始化粒子数据...')

    // 1. 核心能量球（高密度球体分布）
    const corePositionArray = new Float32Array(config.coreCount * 3)
    const coreVelocityArray = new Float32Array(config.coreCount * 3)
    const coreTemperatureArray = new Float32Array(config.coreCount) // 温度影响颜色

    for (let i = 0; i < config.coreCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = Math.pow(Math.random(), 0.3) * 15 // 高密度中心

      corePositionArray[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      corePositionArray[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      corePositionArray[i * 3 + 2] = radius * Math.cos(phi)

      coreVelocityArray[i * 3] = (Math.random() - 0.5) * 5
      coreVelocityArray[i * 3 + 1] = (Math.random() - 0.5) * 5
      coreVelocityArray[i * 3 + 2] = (Math.random() - 0.5) * 5

      // 温度：中心更热（1.0）边缘较冷（0.3）
      coreTemperatureArray[i] = 1.0 - (radius / 15) * 0.7
    }

    // 2. 爆炸激波（球形向外扩散）
    const shockwavePositionArray = new Float32Array(config.shockwaveCount * 3)
    const shockwaveVelocityArray = new Float32Array(config.shockwaveCount * 3)
    const shockwaveDistanceArray = new Float32Array(config.shockwaveCount) // 距离中心的距离

    for (let i = 0; i < config.shockwaveCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 20 + Math.random() * 30 // 激波初始半径

      shockwavePositionArray[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      shockwavePositionArray[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      shockwavePositionArray[i * 3 + 2] = radius * Math.cos(phi)

      // 径向速度（向外爆炸）
      const speed = 20 + Math.random() * 40
      shockwaveVelocityArray[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      shockwaveVelocityArray[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
      shockwaveVelocityArray[i * 3 + 2] = Math.cos(phi) * speed

      shockwaveDistanceArray[i] = radius
    }

    // 3. 星云云团（不规则分布）
    const nebulaPositionArray = new Float32Array(config.nebulaCount * 3)
    const nebulaVelocityArray = new Float32Array(config.nebulaCount * 3)

    for (let i = 0; i < config.nebulaCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 40 + Math.random() * 60

      nebulaPositionArray[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 20
      nebulaPositionArray[i * 3 + 1] = (Math.random() - 0.5) * 40
      nebulaPositionArray[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 20

      nebulaVelocityArray[i * 3] = (Math.random() - 0.5) * 15
      nebulaVelocityArray[i * 3 + 1] = (Math.random() - 0.5) * 10
      nebulaVelocityArray[i * 3 + 2] = (Math.random() - 0.5) * 15
    }

    // 4. 引力波（同心圆扩散）
    const gravityWavePositionArray = new Float32Array(config.gravityWaveCount * 3)
    const gravityWaveVelocityArray = new Float32Array(config.gravityWaveCount * 3)
    const gravityWavePhaseArray = new Float32Array(config.gravityWaveCount) // 相位偏移

    for (let i = 0; i < config.gravityWaveCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 30 + Math.random() * 80

      gravityWavePositionArray[i * 3] = Math.cos(angle) * radius
      gravityWavePositionArray[i * 3 + 1] = (Math.random() - 0.5) * 20
      gravityWavePositionArray[i * 3 + 2] = Math.sin(angle) * radius

      gravityWaveVelocityArray[i * 3] = Math.cos(angle) * 5
      gravityWaveVelocityArray[i * 3 + 1] = (Math.random() - 0.5) * 2
      gravityWaveVelocityArray[i * 3 + 2] = Math.sin(angle) * 5

      gravityWavePhaseArray[i] = Math.random() * Math.PI * 2
    }

    // 5. 高能射线（垂直喷射，两极）
    const jetPositionArray = new Float32Array(config.jetCount * 3)
    const jetVelocityArray = new Float32Array(config.jetCount * 3)

    for (let i = 0; i < config.jetCount; i++) {
      // 上极或下极
      const pole = Math.random() > 0.5 ? 1 : -1
      const angle = Math.random() * Math.PI * 2
      const radius = 2 + Math.random() * 8

      jetPositionArray[i * 3] = Math.cos(angle) * radius
      jetPositionArray[i * 3 + 1] = pole * (20 + Math.random() * 40)
      jetPositionArray[i * 3 + 2] = Math.sin(angle) * radius

      // 垂直向外喷射
      const speed = 30 + Math.random() * 30
      jetVelocityArray[i * 3] = Math.cos(angle) * 2
      jetVelocityArray[i * 3 + 1] = pole * speed
      jetVelocityArray[i * 3 + 2] = Math.sin(angle) * 2
    }

    // ============================================
    // 2.5 创建 Compute Shader（核心能量球物理）
    // ============================================

    console.log('[StellarSupernova] 创建核心能量球 Compute Shader...')

    const deltaTime = uniform(0.016)
    const mousePosition = uniform(new THREE.Vector3())
    const gravity = uniform(config.gravity)
    const damping = uniform(config.damping)
    const boundary = uniform(config.boundaryRadius)
    const restitution = uniform(config.restitution)
    const interactionRadius = uniform(config.interactionRadius)
    const interactionStrength = uniform(config.interactionStrength)

    // 核心能量球物理
    const corePositions = instancedArray(corePositionArray, 'vec3').setName('corePositionStorage')
    const coreVelocities = instancedArray(coreVelocityArray, 'vec3').setName('coreVelocityStorage')
    const coreTemperatures = instancedArray(coreTemperatureArray, 'float').setName('coreTemperatureStorage')

    const updateCorePhysics = Fn(() => {
      const idx = instanceIndex.toConst()

      const pos = corePositions.element(idx).toVar()
      const vel = coreVelocities.element(idx).toVar()

      // 向心吸引力（模拟引力坍缩）
      const toCenter = pos.negate()
      const distToCenter = length(toCenter)
      const inwardForce = toCenter.normalize().mul(float(20.0).mul(deltaTime))
      vel.addAssign(inwardForce)

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

    const corePipeline = updateCorePhysics().compute(config.coreCount).setName('coreUpdate')

    // ============================================
    // 2.6 创建 Compute Shader（爆炸激波物理）
    // ============================================

    console.log('[StellarSupernova] 创建爆炸激波 Compute Shader...')

    const shockwavePositions = instancedArray(shockwavePositionArray, 'vec3').setName('shockwavePositionStorage')
    const shockwaveVelocities = instancedArray(shockwaveVelocityArray, 'vec3').setName('shockwaveVelocityStorage')
    const shockwaveDistances = instancedArray(shockwaveDistanceArray, 'float').setName('shockwaveDistanceStorage')
    const shockwaveSpeed = uniform(config.shockwaveSpeed)
    const shockwaveDecay = uniform(config.shockwaveDecay)

    const updateShockwavePhysics = Fn(() => {
      const idx = instanceIndex.toConst()

      const pos = shockwavePositions.element(idx).toVar()
      const vel = shockwaveVelocities.element(idx).toVar()
      const dist = shockwaveDistances.element(idx).toVar()

      // 持续向外爆炸
      const outwardDir = normalize(pos)
      vel.addAssign(outwardDir.mul(float(5.0).mul(deltaTime)))

      // 阻尼（模拟激波衰减）
      const decayFactor = float(1.0).sub(dist.mul(shockwaveDecay)).max(float(0.3))
      vel.mulAssign(decayFactor)

      // 更新位置
      pos.addAssign(vel.mul(deltaTime))

      // 更新距离
      dist.assign(length(pos))

      // 边界反弹
      const overflow = pos.abs().greaterThan(boundary)
      vel.x.assign(overflow.x.select(vel.x.mul(restitution.negate()), vel.x))
      vel.y.assign(overflow.y.select(vel.y.mul(restitution.negate()), vel.y))
      vel.z.assign(overflow.z.select(vel.z.mul(restitution.negate()), vel.z))
    })

    const shockwavePipeline = updateShockwavePhysics().compute(config.shockwaveCount).setName('shockwaveUpdate')

    // ============================================
    // 2.7 创建 Compute Shader（星云云团物理）
    // ============================================

    console.log('[StellarSupernova] 创建星云云团 Compute Shader...')

    const nebulaPositions = instancedArray(nebulaPositionArray, 'vec3').setName('nebulaPositionStorage')
    const nebulaVelocities = instancedArray(nebulaVelocityArray, 'vec3').setName('nebulaVelocityStorage')

    const updateNebulaPhysics = Fn(() => {
      const idx = instanceIndex.toConst()

      const pos = nebulaPositions.element(idx).toVar()
      const vel = nebulaVelocities.element(idx).toVar()

      // 螺旋运动（形成星云漩涡）
      const toCenter = pos.negate()
      const distToCenter = length(toCenter)
      const tangent = vec3(pos.z.negate(), float(0.0), pos.x).normalize()
      vel.addAssign(tangent.mul(float(5.0).mul(deltaTime)))

      // 微弱向心力
      const inwardForce = toCenter.normalize().mul(float(2.0).mul(deltaTime))
      vel.addAssign(inwardForce)

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

    const nebulaPipeline = updateNebulaPhysics().compute(config.nebulaCount).setName('nebulaUpdate')

    // ============================================
    // 2.8 创建 Compute Shader（引力波物理）
    // ============================================

    console.log('[StellarSupernova] 创建引力波 Compute Shader...')

    const gravityWavePositions = instancedArray(gravityWavePositionArray, 'vec3').setName('gravityWavePositionStorage')
    const gravityWaveVelocities = instancedArray(gravityWaveVelocityArray, 'vec3').setName('gravityWaveVelocityStorage')
    const gravityWavePhases = instancedArray(gravityWavePhaseArray, 'float').setName('gravityWavePhaseStorage')

    const updateGravityWavePhysics = Fn(() => {
      const idx = instanceIndex.toConst()

      const pos = gravityWavePositions.element(idx).toVar()
      const vel = gravityWaveVelocities.element(idx).toVar()
      const phase = gravityWavePhases.element(idx).toVar()

      // 波浪运动（正弦波）
      const waveEffect = sin(time.mul(float(2.0)).add(phase)).mul(float(5.0))
      vel.y.addAssign(waveEffect.mul(deltaTime).mul(float(0.1)))

      // 向外扩散
      const outwardDir = normalize(pos)
      vel.addAssign(outwardDir.mul(float(2.0).mul(deltaTime)))

      // 更新位置
      pos.addAssign(vel.mul(deltaTime))

      // 边界反弹
      const overflow = pos.abs().greaterThan(boundary)
      vel.x.assign(overflow.x.select(vel.x.mul(restitution.negate()), vel.x))
      vel.y.assign(overflow.y.select(vel.y.mul(restitution.negate()), vel.y))
      vel.z.assign(overflow.z.select(vel.z.mul(restitution.negate()), vel.z))
    })

    const gravityWavePipeline = updateGravityWavePhysics().compute(config.gravityWaveCount).setName('gravityWaveUpdate')

    // ============================================
    // 2.9 创建 Compute Shader（高能射线物理）
    // ============================================

    console.log('[StellarSupernova] 创建高能射线 Compute Shader...')

    const jetPositions = instancedArray(jetPositionArray, 'vec3').setName('jetPositionStorage')
    const jetVelocities = instancedArray(jetVelocityArray, 'vec3').setName('jetVelocityStorage')

    const updateJetPhysics = Fn(() => {
      const idx = instanceIndex.toConst()

      const pos = jetPositions.element(idx).toVar()
      const vel = jetVelocities.element(idx).toVar()

      // 持续向外喷射
      const outwardDir = normalize(vel)
      vel.addAssign(outwardDir.mul(float(10.0).mul(deltaTime)))

      // 微弱横向扩散
      const randomDrift = vec3(
        float(Math.random() - 0.5).mul(float(0.5)),
        float(Math.random() - 0.5).mul(float(0.5)),
        float(Math.random() - 0.5).mul(float(0.5))
      )
      vel.addAssign(randomDrift)

      // 更新位置
      pos.addAssign(vel.mul(deltaTime))

      // 边界反弹
      const overflow = pos.abs().greaterThan(boundary)
      vel.x.assign(overflow.x.select(vel.x.mul(restitution.negate()), vel.x))
      vel.y.assign(overflow.y.select(vel.y.mul(restitution.negate()), vel.y))
      vel.z.assign(overflow.z.select(vel.z.mul(restitution.negate()), vel.z))
    })

    const jetPipeline = updateJetPhysics().compute(config.jetCount).setName('jetUpdate')

    // ============================================
    // 2.10 创建光环
    // ============================================

    console.log('[StellarSupernova] 创建光环...')

    const haloColors = [
      new THREE.Color(0xffffff), // 核心
      new THREE.Color(0xff9900), // 橙色
      new THREE.Color(0x9900ff), // 紫色
      new THREE.Color(0x00ccff), // 蓝色
      new THREE.Color(0x00ff66), // 绿色
      new THREE.Color(0xff0066), // 粉色
      new THREE.Color(0xff0000), // 红色
      new THREE.Color(0x3300ff), // 深蓝
    ]

    for (let i = 0; i < config.haloCount; i++) {
      const geometry = new THREE.TorusGeometry(50 + i * 12, 0.5, 16, 100)
      const material = new THREE.MeshBasicMaterial({
        color: haloColors[i],
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
    // 2.11 创建 GPU 渲染网格（核心能量球）
    // ============================================

    console.log('[StellarSupernova] 创建 GPU 渲染网格...')

    // 1. 核心能量球
    const coreGeometry = new THREE.SphereGeometry(config.coreSize * 0.08, 8, 6)

    const coreColor0 = uniform(new THREE.Vector3(1.0, 1.0, 1.0)) // 核心白
    const coreColor1 = uniform(new THREE.Vector3(1.0, 0.6, 0.0)) // 橙色
    const coreColor2 = uniform(new THREE.Vector3(0.8, 0.0, 1.0)) // 紫色
    const coreColor3 = uniform(new THREE.Vector3(0.0, 0.8, 1.0)) // 蓝色
    const coreColor4 = uniform(new THREE.Vector3(0.2, 0.0, 1.0)) // 深蓝

    coreMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      opacity: 0.95,
      side: THREE.FrontSide,
      fragmentNode: Fn(() => {
        const idx = instanceIndex.toVar()
        const temp = coreTemperatures.element(idx)

        // 基于温度的颜色映射
        const colorIndex = temp.mul(float(4)).floor().clamp(float(0), float(3))
        const t = temp.mul(float(4)).sub(colorIndex).clamp(float(0), float(1))

        const color0 = colorIndex.equal(float(0)).select(coreColor0,
                       colorIndex.equal(float(1)).select(coreColor1,
                       colorIndex.equal(float(2)).select(coreColor2, coreColor3)))

        const color1 = colorIndex.equal(float(0)).select(coreColor1,
                       colorIndex.equal(float(1)).select(coreColor2,
                       colorIndex.equal(float(2)).select(coreColor3, coreColor4)))

        return mix(color0, color1, t)
      })()
    })

    coreMesh = new THREE.InstancedMesh(coreGeometry, coreMaterial as THREE.Material, config.coreCount)
    coreMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    coreMesh.frustumCulled = false

    const dummyInit = new THREE.Object3D()
    for (let i = 0; i < config.coreCount; i++) {
      dummyInit.position.set(corePositionArray[i * 3], corePositionArray[i * 3 + 1], corePositionArray[i * 3 + 2])
      dummyInit.updateMatrix()
      coreMesh.setMatrixAt(i, dummyInit.matrix)
      coreMesh.setColorAt(i, new THREE.Color(1.0, 1.0, 1.0))
    }

    scene!.add(coreMesh)

    // 2. 爆炸激波
    const shockwaveGeometry = new THREE.TetrahedronGeometry(config.shockwaveSize * 0.1, 0)

    const shockColor0 = uniform(new THREE.Vector3(1.0, 0.6, 0.0)) // 橙色
    const shockColor1 = uniform(new THREE.Vector3(1.0, 0.0, 0.0)) // 红色

    shockwaveMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      opacity: 0.8,
      side: THREE.FrontSide,
      fragmentNode: Fn(() => {
        const idx = instanceIndex.toVar()
        const dist = shockwaveDistances.element(idx)

        // 基于距离的颜色渐变（橙色→红色）
        const t = dist.div(float(100.0)).clamp(float(0), float(1))
        return mix(shockColor0, shockColor1, t)
      })()
    })

    shockwaveMesh = new THREE.InstancedMesh(shockwaveGeometry, shockwaveMaterial as THREE.Material, config.shockwaveCount)
    shockwaveMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    shockwaveMesh.frustumCulled = false

    for (let i = 0; i < config.shockwaveCount; i++) {
      dummyInit.position.set(shockwavePositionArray[i * 3], shockwavePositionArray[i * 3 + 1], shockwavePositionArray[i * 3 + 2])
      dummyInit.updateMatrix()
      shockwaveMesh.setMatrixAt(i, dummyInit.matrix)
      shockwaveMesh.setColorAt(i, new THREE.Color(1.0, 0.6, 0.0))
    }

    scene!.add(shockwaveMesh)

    // 3. 星云云团
    const nebulaGeometry = new THREE.TetrahedronGeometry(config.nebulaSize * 0.1, 0)

    const nebulaColor0 = uniform(new THREE.Vector3(0.8, 0.0, 1.0)) // 紫色
    const nebulaColor1 = uniform(new THREE.Vector3(0.0, 0.8, 1.0)) // 蓝色
    const nebulaColor2 = uniform(new THREE.Vector3(0.0, 1.0, 0.6)) // 绿色
    const nebulaColor3 = uniform(new THREE.Vector3(1.0, 0.0, 0.6)) // 粉色

    nebulaMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      opacity: 0.7,
      side: THREE.FrontSide,
      fragmentNode: Fn(() => {
        const idx = instanceIndex.toVar()
        const pos = nebulaPositions.element(idx)
        const dist = length(pos)

        // 基于位置和时间的动态颜色
        const colorIndex = float(idx).div(config.nebulaCount).mul(float(4)).floor()
        const t = sin(time.mul(float(0.1)).add(dist.mul(float(0.01))).mul(float(0.5)).add(float(0.5)))

        // 使用 mix 和 select 构建颜色选择
        const isColor0 = colorIndex.equal(float(0))
        const isColor1 = colorIndex.equal(float(1))
        const isColor2 = colorIndex.equal(float(2))
        const isColor3 = colorIndex.equal(float(3))

        const color0 = mix(
          nebulaColor3,
          nebulaColor2,
          isColor2.select(float(1.0), float(0.0))
        )
        const color1 = mix(
          color0,
          nebulaColor1,
          isColor1.select(float(1.0), float(0.0))
        )
        const finalColor0 = mix(
          color1,
          nebulaColor0,
          isColor0.select(float(1.0), float(0.0))
        )

        const color2 = mix(
          nebulaColor0,
          nebulaColor3,
          isColor3.select(float(1.0), float(0.0))
        )
        const color3 = mix(
          color2,
          nebulaColor2,
          isColor2.select(float(1.0), float(0.0))
        )
        const finalColor1 = mix(
          color3,
          nebulaColor1,
          isColor1.select(float(1.0), float(0.0))
        )

        return mix(finalColor0, finalColor1, t)
      })()
    })

    nebulaMesh = new THREE.InstancedMesh(nebulaGeometry, nebulaMaterial as THREE.Material, config.nebulaCount)
    nebulaMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    nebulaMesh.frustumCulled = false

    for (let i = 0; i < config.nebulaCount; i++) {
      dummyInit.position.set(nebulaPositionArray[i * 3], nebulaPositionArray[i * 3 + 1], nebulaPositionArray[i * 3 + 2])
      dummyInit.updateMatrix()
      nebulaMesh.setMatrixAt(i, dummyInit.matrix)
      nebulaMesh.setColorAt(i, new THREE.Color(0.8, 0.0, 1.0))
    }

    scene!.add(nebulaMesh)

    // 4. 引力波
    const gravityWaveGeometry = new THREE.TetrahedronGeometry(config.gravityWaveSize * 0.1, 0)

    const gravityWaveColor0 = uniform(new THREE.Vector3(0.0, 0.8, 1.0)) // 蓝色
    const gravityWaveColor1 = uniform(new THREE.Vector3(0.2, 0.0, 1.0)) // 深蓝

    gravityWaveMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      opacity: 0.6,
      side: THREE.FrontSide,
      fragmentNode: Fn(() => {
        const idx = instanceIndex.toVar()
        const pos = gravityWavePositions.element(idx)
        const dist = length(pos)

        // 基于距离的颜色渐变
        const t = dist.div(float(150.0)).clamp(float(0), float(1))
        return mix(gravityWaveColor0, gravityWaveColor1, t)
      })()
    })

    gravityWaveMesh = new THREE.InstancedMesh(gravityWaveGeometry, gravityWaveMaterial as THREE.Material, config.gravityWaveCount)
    gravityWaveMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    gravityWaveMesh.frustumCulled = false

    for (let i = 0; i < config.gravityWaveCount; i++) {
      dummyInit.position.set(gravityWavePositionArray[i * 3], gravityWavePositionArray[i * 3 + 1], gravityWavePositionArray[i * 3 + 2])
      dummyInit.updateMatrix()
      gravityWaveMesh.setMatrixAt(i, dummyInit.matrix)
      gravityWaveMesh.setColorAt(i, new THREE.Color(0.0, 0.8, 1.0))
    }

    scene!.add(gravityWaveMesh)

    // 5. 高能射线
    const jetGeometry = new THREE.TetrahedronGeometry(config.jetSize * 0.1, 0)

    const jetColor = uniform(new THREE.Vector3(1.0, 1.0, 1.0)) // 白色

    jetMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      opacity: 0.9,
      side: THREE.FrontSide,
      fragmentNode: Fn(() => {
        const idx = instanceIndex.toVar()
        const pos = jetPositions.element(idx)
        const dist = length(pos)

        // 基于距离的亮度衰减
        const brightness = float(1.0).sub(dist.div(float(100.0))).max(float(0.2))
        return jetColor.mul(brightness)
      })()
    })

    jetMesh = new THREE.InstancedMesh(jetGeometry, jetMaterial as THREE.Material, config.jetCount)
    jetMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    jetMesh.frustumCulled = false

    for (let i = 0; i < config.jetCount; i++) {
      dummyInit.position.set(jetPositionArray[i * 3], jetPositionArray[i * 3 + 1], jetPositionArray[i * 3 + 2])
      dummyInit.updateMatrix()
      jetMesh.setMatrixAt(i, dummyInit.matrix)
      jetMesh.setColorAt(i, new THREE.Color(1.0, 1.0, 1.0))
    }

    scene!.add(jetMesh)

    // ============================================
    // 2.12 CPU 端更新实例矩阵
    // ============================================

    const dummy = new THREE.Object3D()
    const tempColor = new THREE.Color()

    const corePositionCache = new Float32Array(corePositionArray)
    const shockwavePositionCache = new Float32Array(shockwavePositionArray)
    const nebulaPositionCache = new Float32Array(nebulaPositionArray)
    const gravityWavePositionCache = new Float32Array(gravityWavePositionArray)
    const jetPositionCache = new Float32Array(jetPositionArray)

    let updateFrameCounter = 0

    const updateInstances = () => {
      // 更新核心能量球
      for (let i = 0; i < config.coreCount * 3; i++) {
        corePositionCache[i] = corePositionArray[i]
      }

      for (let i = 0; i < config.coreCount; i++) {
        const idx = i * 3
        dummy.position.set(corePositionCache[idx], corePositionCache[idx + 1], corePositionCache[idx + 2])
        dummy.updateMatrix()
        coreMesh!.setMatrixAt(i, dummy.matrix)

        if (i % config.colorUpdateInterval === 0) {
          const temp = coreTemperatureArray[i]
          const r = 1.0
          const g = 1.0 - temp * 0.6
          const b = 1.0 - temp * 0.5
          tempColor.setRGB(r, g, b)
          coreMesh!.setColorAt(i, tempColor)
        }
      }

      coreMesh!.instanceMatrix.needsUpdate = true
      if (coreMesh!.instanceColor) {
        coreMesh!.instanceColor.needsUpdate = true
      }

      // 更新爆炸激波
      for (let i = 0; i < config.shockwaveCount * 3; i++) {
        shockwavePositionCache[i] = shockwavePositionArray[i]
      }

      for (let i = 0; i < config.shockwaveCount; i++) {
        const idx = i * 3
        dummy.position.set(shockwavePositionCache[idx], shockwavePositionCache[idx + 1], shockwavePositionCache[idx + 2])
        dummy.updateMatrix()
        shockwaveMesh!.setMatrixAt(i, dummy.matrix)
      }

      shockwaveMesh!.instanceMatrix.needsUpdate = true

      // 更新星云云团
      for (let i = 0; i < config.nebulaCount * 3; i++) {
        nebulaPositionCache[i] = nebulaPositionArray[i]
      }

      for (let i = 0; i < config.nebulaCount; i++) {
        const idx = i * 3
        dummy.position.set(nebulaPositionCache[idx], nebulaPositionCache[idx + 1], nebulaPositionCache[idx + 2])
        dummy.updateMatrix()
        nebulaMesh!.setMatrixAt(i, dummy.matrix)
      }

      nebulaMesh!.instanceMatrix.needsUpdate = true

      // 更新引力波
      for (let i = 0; i < config.gravityWaveCount * 3; i++) {
        gravityWavePositionCache[i] = gravityWavePositionArray[i]
      }

      for (let i = 0; i < config.gravityWaveCount; i++) {
        const idx = i * 3
        dummy.position.set(gravityWavePositionCache[idx], gravityWavePositionCache[idx + 1], gravityWavePositionCache[idx + 2])
        dummy.updateMatrix()
        gravityWaveMesh!.setMatrixAt(i, dummy.matrix)
      }

      gravityWaveMesh!.instanceMatrix.needsUpdate = true

      // 更新高能射线
      for (let i = 0; i < config.jetCount * 3; i++) {
        jetPositionCache[i] = jetPositionArray[i]
      }

      for (let i = 0; i < config.jetCount; i++) {
        const idx = i * 3
        dummy.position.set(jetPositionCache[idx], jetPositionCache[idx + 1], jetPositionCache[idx + 2])
        dummy.updateMatrix()
        jetMesh!.setMatrixAt(i, dummy.matrix)
      }

      jetMesh!.instanceMatrix.needsUpdate = true
    }

    // ============================================
    // 2.13 GSAP 电影级运镜（10个角度）
    // ============================================

    cinematicTimeline = gsap.timeline({
      repeatDelay: 0.3,
      repeat: 0,
      onComplete: () => {
        console.log('[StellarSupernova] 运镜动画完成，开始清理特效')
        clearEffect()
      }
    })

    // 镜头 1: 俯视核心
    cinematicTimeline.to(camera.position, {
      x: 0, y: 200, z: 50,
      duration: 4,
      ease: 'power2.inOut'
    })

    // 镜头 2: 穿梭激波
    cinematicTimeline.to(camera.position, {
      x: 80, y: 80, z: -60,
      duration: 4,
      ease: 'power2.inOut'
    })

    // 镜头 3: 星云内部
    cinematicTimeline.to(camera.position, {
      x: 40, y: 30, z: 40,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 4: 极地射线俯冲
    cinematicTimeline.to(camera.position, {
      x: 10, y: 180, z: 10,
      duration: 4,
      ease: 'power2.inOut'
    })

    // 镜头 5: 引力波纹
    cinematicTimeline.to(camera.position, {
      x: -100, y: 20, z: 80,
      duration: 4,
      ease: 'power2.inOut'
    })

    // 镜头 6: 侧面全景
    cinematicTimeline.to(camera.position, {
      x: 150, y: 50, z: 0,
      duration: 4,
      ease: 'power2.inOut'
    })

    // 镜头 7: 底部仰望
    cinematicTimeline.to(camera.position, {
      x: 0, y: -120, z: 60,
      duration: 4,
      ease: 'power2.inOut'
    })

    // 镜头 8: 螺旋环绕
    cinematicTimeline.to(camera.position, {
      x: -80, y: -40, z: -80,
      duration: 4,
      ease: 'power2.inOut'
    })

    // 镜头 9: 近景核心
    cinematicTimeline.to(camera.position, {
      x: 15, y: 15, z: 15,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 10: 远景（回到初始位置）
    cinematicTimeline.to(camera.position, {
      x: 0, y: 60, z: 150,
      duration: 4,
      ease: 'power2.out'
    })

    allTweens.push(cinematicTimeline)

    // ============================================
    // 2.14 GSAP 入场动画
    // ============================================

    const entranceTimeline = gsap.timeline()

    // 相机推近
    entranceTimeline.fromTo(
      camera!.position,
      { z: 300 },
      { z: 150, duration: 2, ease: 'power2.out' }
    )

    // 光环淡入
    haloMaterials.forEach((mat, i) => {
      entranceTimeline.to(mat, {
        opacity: 0.2 + Math.random() * 0.3,
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

    allTweens.push(entranceTimeline)

    // ============================================
    // 2.15 创建性能监控面板
    // ============================================

    createPerformancePanel()

    // ============================================
    // 2.16 事件监听
    // ============================================

    container!.addEventListener('mousemove', onMouseMove)
    window.addEventListener('resize', onWindowResize)

    // ============================================
    // 2.17 动画循环
    // ============================================

    console.log('[StellarSupernova] 开始动画循环...')

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

      // 执行所有 Compute Pipeline
      const computeStart = performance.now()
      renderer!.compute(corePipeline)
      renderer!.compute(shockwavePipeline)
      renderer!.compute(nebulaPipeline)
      renderer!.compute(gravityWavePipeline)
      renderer!.compute(jetPipeline)
      const computeEnd = performance.now()
      computeTime = computeEnd - computeStart

      // 降频更新实例矩阵
      updateFrameCounter++
      if (updateFrameCounter % config.updateInterval === 0) {
        updateInstances()
      }

      // 更新光环动画
      haloMeshes.forEach((halo, i) => {
        halo.rotation.z += 0.003 * (i % 2 === 0 ? 1 : -1)
        halo.scale.setScalar(1 + Math.sin(currentTime * 0.003 + i * 0.5) * 0.15)
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
    // 2.18 清理特效函数
    // ============================================

    function clearEffect() {
      console.log('[StellarSupernova] 开始清理特效...')

      const fadeOutTimeline = gsap.timeline()

      const materialsToFade = [
        coreMaterial, shockwaveMaterial, nebulaMaterial,
        gravityWaveMaterial, jetMaterial
      ]

      materialsToFade.forEach(mat => {
        if (mat) {
          fadeOutTimeline.to(mat, {
            opacity: 0,
            duration: 1.2,
            ease: 'power2.out'
          })
        }
      })

      haloMaterials.forEach((mat) => {
        fadeOutTimeline.to(mat, {
          opacity: 0,
          duration: 1.2,
          ease: 'power2.out'
        })
      })

      fadeOutTimeline.eventCallback('onComplete', () => {
        performCleanup()
      })
    }

    function performCleanup() {
      console.log('[StellarSupernova] 执行清理流程...')

      if (cinematicTimeline) {
        cinematicTimeline.kill()
        cinematicTimeline = null
      }

      cleanup()
    }

    console.log('[StellarSupernova] 初始化完成')
  }

  // ============================================
  // 2.19 事件处理函数
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
  // 2.20 清理函数（12步完整流程）
  // ============================================

  function cleanup(): void {
    console.log('[StellarSupernova] 开始清理资源...')

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
    const meshes = [coreMesh, shockwaveMesh, nebulaMesh, gravityWaveMesh, jetMesh]
    const materials = [coreMaterial, shockwaveMaterial, nebulaMaterial, gravityWaveMaterial, jetMaterial]

    meshes.forEach(mesh => {
      if (mesh) {
        gsap.killTweensOf(mesh)
        gsap.killTweensOf(mesh.scale)
      }
    })

    materials.forEach(mat => {
      if (mat) {
        gsap.killTweensOf(mat)
      }
    })

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
    meshes.forEach(mesh => {
      if (mesh && scene) {
        scene.remove(mesh)
      }
    })

    haloMeshes.forEach((halo) => {
      if (scene) scene.remove(halo)
    })

    // 7. 释放几何体
    meshes.forEach(mesh => {
      if (mesh && mesh.geometry) {
        mesh.geometry.dispose()
      }
    })

    haloGeometries.forEach((geo) => geo.dispose())

    // 8. 释放材质
    meshes.forEach(mesh => {
      if (mesh && mesh.material) {
        (mesh.material as THREE.Material).dispose()
      }
    })

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
    coreMesh = null
    coreMaterial = null
    shockwaveMesh = null
    shockwaveMaterial = null
    nebulaMesh = null
    nebulaMaterial = null
    gravityWaveMesh = null
    gravityWaveMaterial = null
    jetMesh = null
    jetMaterial = null
    haloMeshes = []
    haloMaterials = []
    haloGeometries = []
    fpsElement = null
    computeTimeElement = null
    cinematicTimeline = null

    console.log('[StellarSupernova] 清理完成')
  }

  // ============================================
  // 2.21 开始初始化
  // ============================================

  try {
    await init()
  } catch (error) {
    console.error('[StellarSupernova] 初始化失败:', error)
    cleanup()
    throw error
  }

  return cleanup
}
