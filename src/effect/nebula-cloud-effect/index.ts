// 动态粒子星云特效 (Nebula Cloud Effect)
// 特性: 动态粒子流 + 光影折射 + 鼠标交互反馈 + 引力/斥力场
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'

// 性能优化常量
const TIME_SCALE_FACTOR = 0.001
const FULL_ROTATION = Math.PI * 2

// 配置参数
export const nebulaCloudEffectParams = {
  // ==================== 粒子数量与大小 ====================
  particleCount: 5000, // 粒子总数（自动按 25%:40%:35% 分配到三层）
  particleSize: 0.12, // 基础粒子大小（核心×2、内层×1.5、外层×1）

  // ==================== 外观效果 ====================
  alpha: 0.75, // 整体透明度（0-1）
  alphaHash: true, // 是否启用 alphaHash（透明度抖动，提升混合效果）
  nebulaSize: 12, // 星云整体大小（核心=0.25×、内层=0.5×、外层=0.8×）

  // ==================== 运动控制 ====================
  rotationSpeed: 0.00015, // 整体旋转速度
  autoRotate: true, // 是否自动旋转
  colorCycleSpeed: 0.00025, // 颜色循环速度
  flowSpeed: 1.2, // 粒子流动速度
  pulseSpeed: 1.8, // 脉冲缩放速度

  // ==================== 交互效果 ====================
  interactionRadius: 15, // 鼠标交互影响半径
  interactionStrength: 2.0, // 交互强度
  gravityMode: 'attract' as 'attract' | 'repel', // 引力/斥力模式

  // ==================== 性能优化 ====================
  updateInterval: 4, // 颜色更新间隔帧数（越大性能越好，但颜色变化越卡顿）
  resizeDebounceDelay: 100 // 窗口调整防抖延迟（毫秒）
}

// 渲染器类型
type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

// 粒子层级类型
enum NebulaLayer {
  CORE = 'core', // 核心层
  INNER = 'inner', // 内层
  OUTER = 'outer' // 外层
}

// 粒子数据类型
interface ParticleData {
  layer: NebulaLayer
  orbitRadius: number
  orbitAngle: number
  orbitSpeed: number
  orbitHeight: number
  orbitPhase: number
  baseSize: number
  hue: number
  saturation: number
  lightness: number
  noiseOffset: number // 噪声偏移
  flowDirection: number // 流动方向
}

// 交互状态
interface InteractionState {
  isInteracting: boolean
  mouseX: number
  mouseY: number
  mousePosition: THREE.Vector3
  interactionIntensity: number
}

/**
 * 创建动态粒子星云特效
 * @param container - 容器元素
 * @returns 清理函数
 */
export const nebulaCloudEffect = (container: HTMLElement) => {
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: WebGPURendererType
  let controls: OrbitControls
  let coreMesh: THREE.InstancedMesh
  let innerMesh: THREE.InstancedMesh
  let outerMesh: THREE.InstancedMesh
  let coreMaterial: THREE.MeshStandardMaterial
  let innerMaterial: THREE.MeshStandardMaterial
  let outerMaterial: THREE.MeshStandardMaterial
  let particles: ParticleData[] = []

  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  // GSAP 动画对象
  const flowAnimation = { value: 0 }
  const pulseAnimation = { value: 1 }
  const interactionAnimation = { value: 0 }

  // 电影级运镜相关变量
  let cameraTimeline: gsap.core.Timeline | null = null

  // 存储所有 GSAP tweens，用于清理
  const allTweens: gsap.core.Tween[] = []

  // 交互状态
  const interaction: InteractionState = {
    isInteracting: false,
    mouseX: 0,
    mouseY: 0,
    mousePosition: new THREE.Vector3(),
    interactionIntensity: 0
  }

  // 帧计数器（用于优化性能）
  let frameCount = 0

  // 窗口调整防抖定时器
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null

  // 粒子层数配置 - 使用 particleCount 动态计算
  const totalParticles = nebulaCloudEffectParams.particleCount
  const nebulaSize = nebulaCloudEffectParams.nebulaSize
  const baseParticleSize = nebulaCloudEffectParams.particleSize

  const layerConfig: Record<
    NebulaLayer,
    { count: number; radius: number; size: number; hue: number; lightness: number }
  > = {
    [NebulaLayer.CORE]: {
      count: Math.floor(totalParticles * 0.25), // 核心层占 25%
      radius: nebulaSize * 0.25, // 使用 nebulaSize 缩放
      size: baseParticleSize * 2, // 核心粒子最大
      hue: 0.55,
      lightness: 0.6
    },
    [NebulaLayer.INNER]: {
      count: Math.floor(totalParticles * 0.4), // 内层占 40%
      radius: nebulaSize * 0.5, // 使用 nebulaSize 缩放
      size: baseParticleSize * 1.5, // 内层中等
      hue: 0.45,
      lightness: 0.5
    },
    [NebulaLayer.OUTER]: {
      count: Math.floor(totalParticles * 0.35), // 外层占 35%
      radius: nebulaSize * 0.8, // 使用 nebulaSize 缩放
      size: baseParticleSize, // 外层最小
      hue: 0.65,
      lightness: 0.45
    }
  }

  /**
   * 初始化场景
   */
  const init = async () => {
    try {
      // 创建相机
      const width = container.clientWidth
      const height = container.clientHeight
      camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100)
      camera.position.set(15, 10, 15)
      camera.lookAt(0, 0, 0)

      // 创建场景
      scene = new THREE.Scene()
      scene.background = null

      // 创建几何体 - 使用 plane 几何体配合纹理
      const textureLoader = new THREE.TextureLoader()
      const butterflyTexture = textureLoader.load('/images/hudie.jpg')
      butterflyTexture.colorSpace = THREE.SRGBColorSpace

      const planeGeometry = new THREE.PlaneGeometry(baseParticleSize * 3, baseParticleSize * 2)

      // 创建核心层材质（高亮度）
      coreMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: nebulaCloudEffectParams.alphaHash,
        opacity: nebulaCloudEffectParams.alpha * 0.9,
        roughness: 0.05,
        metalness: 0.95,
        envMapIntensity: 3.0,
        emissive: 0x88aaff,
        emissiveIntensity: 0.6,
        map: butterflyTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      })

      // 创建内层材质
      innerMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: nebulaCloudEffectParams.alphaHash,
        opacity: nebulaCloudEffectParams.alpha * 0.8,
        roughness: 0.15,
        metalness: 0.85,
        envMapIntensity: 2.0,
        emissive: 0x5588ff,
        emissiveIntensity: 0.4,
        map: butterflyTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      })

      // 创建外层材质
      outerMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: nebulaCloudEffectParams.alphaHash,
        opacity: nebulaCloudEffectParams.alpha * 0.7,
        roughness: 0.2,
        metalness: 0.8,
        envMapIntensity: 1.5,
        emissive: 0x3355aa,
        emissiveIntensity: 0.3,
        map: butterflyTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      })

      // 创建实例化网格
      const coreCount = layerConfig[NebulaLayer.CORE].count
      const innerCount = layerConfig[NebulaLayer.INNER].count
      const outerCount = layerConfig[NebulaLayer.OUTER].count

      coreMesh = new THREE.InstancedMesh(planeGeometry, coreMaterial, coreCount)
      innerMesh = new THREE.InstancedMesh(planeGeometry, innerMaterial, innerCount)
      outerMesh = new THREE.InstancedMesh(planeGeometry, outerMaterial, outerCount)

      // 初始化星云粒子
      initNebulaParticles(coreCount, innerCount, outerCount)

      scene.add(coreMesh)
      scene.add(innerMesh)
      scene.add(outerMesh)

      // 创建 WebGPU 渲染器
      renderer = new THREE.WebGPURenderer({
        antialias: false,
        alpha: true,
        samples: 1
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
      renderer.setSize(width, height)
      renderer.setAnimationLoop(animate)
      container.appendChild(renderer.domElement)

      // 初始化 WebGPU (异步)
      await renderer.init()

      // 创建 RoomEnvironment 环境贴图（增强光影折射）
      const environment = new RoomEnvironment()
      const pmremGenerator = new THREE.PMREMGenerator(renderer)
      scene.environment = pmremGenerator.fromScene(environment, 0.04).texture
      environment.dispose()
      pmremGenerator.dispose()

      // 创建控制器
      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.enableZoom = true
      controls.enablePan = false
      controls.minDistance = 4
      controls.maxDistance = 40

      // 初始化 GSAP 动画
      initGSAPAnimations()

      // 设置交互事件
      setupInteraction(container)

      // 播放入场动画
      playEntranceAnimation()

      console.log('动态粒子星云特效初始化完成')
    } catch (error) {
      console.error('动态粒子星云特效初始化失败:', error)
    }
  }

  /**
   * 初始化星云粒子 - 性能优化版本
   */
  const initNebulaParticles = (coreCount: number, innerCount: number, outerCount: number) => {
    let coreIndex = 0
    let innerIndex = 0
    let outerIndex = 0

    // 辅助函数：创建粒子并设置初始状态
    const createParticle = (
      layer: NebulaLayer,
      index: number,
      x: number,
      y: number,
      z: number,
      mesh: THREE.InstancedMesh,
      meshIndex: number
    ) => {
      const config = layerConfig[layer]

      particles.push({
        layer,
        orbitRadius: Math.sqrt(x * x + z * z),
        orbitAngle: Math.atan2(z, x),
        orbitSpeed: (0.8 + Math.random() * 0.4) * 0.0005 * (layer === NebulaLayer.CORE ? 1 : layer === NebulaLayer.INNER ? 0.8 : 0.6),
        orbitHeight: y,
        orbitPhase: Math.random() * Math.PI * 2,
        baseSize: config.size * (0.8 + Math.random() * 0.4),
        hue: config.hue + Math.random() * (layer === NebulaLayer.CORE ? 0.1 : layer === NebulaLayer.INNER ? 0.15 : 0.2),
        saturation: 0.85 + Math.random() * 0.15 - (layer === NebulaLayer.OUTER ? 0.2 : 0),
        lightness: config.lightness + Math.random() * (layer === NebulaLayer.CORE ? 0.1 : layer === NebulaLayer.INNER ? 0.15 : 0.2),
        noiseOffset: Math.random() * 100,
        flowDirection: Math.random() > 0.5 ? 1 : -1
      })

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(particles[index].baseSize)
      dummy.updateMatrix()
      mesh.setMatrixAt(meshIndex, dummy.matrix)

      color.setHSL(
        particles[index].hue,
        particles[index].saturation,
        particles[index].lightness
      )
      mesh.setColorAt(meshIndex, color)
    }

    // 初始化核心层粒子
    for (let i = 0; i < coreCount; i++) {
      const config = layerConfig[NebulaLayer.CORE]
      const phi = Math.random() * Math.PI * 2
      const theta = Math.acos(1 - 2 * Math.random())
      const radius = Math.random() * config.radius * 0.8

      const x = radius * Math.sin(theta) * Math.cos(phi)
      const y = radius * Math.sin(theta) * Math.sin(phi)
      const z = radius * Math.cos(theta)

      createParticle(NebulaLayer.CORE, coreIndex, x, y, z, coreMesh, coreIndex)
      coreIndex++
    }

    // 初始化内层粒子
    for (let i = 0; i < innerCount; i++) {
      const config = layerConfig[NebulaLayer.INNER]
      const phi = (i / innerCount) * Math.PI * 6 // 多圈螺旋
      const radius = config.radius * 0.3 + Math.random() * config.radius * 0.7

      const x = Math.cos(phi) * radius
      const y = (Math.random() - 0.5) * config.radius * 0.6
      const z = Math.sin(phi) * radius

      createParticle(NebulaLayer.INNER, coreCount + innerIndex, x, y, z, innerMesh, innerIndex)
      innerIndex++
    }

    // 初始化外层粒子
    for (let i = 0; i < outerCount; i++) {
      const config = layerConfig[NebulaLayer.OUTER]
      const phi = (i / outerCount) * Math.PI * 8
      const radius = config.radius * 0.5 + Math.random() * config.radius * 0.5

      const x = Math.cos(phi) * radius
      const y = (Math.random() - 0.5) * config.radius * 0.4
      const z = Math.sin(phi) * radius

      createParticle(NebulaLayer.OUTER, coreCount + innerCount + outerIndex, x, y, z, outerMesh, outerIndex)
      outerIndex++
    }

    coreMesh.instanceMatrix.needsUpdate = true
    coreMesh.instanceColor!.needsUpdate = true
    innerMesh.instanceMatrix.needsUpdate = true
    innerMesh.instanceColor!.needsUpdate = true
    outerMesh.instanceMatrix.needsUpdate = true
    outerMesh.instanceColor!.needsUpdate = true
  }

  /**
   * 相机运镜动画
   */
  const playCameraAnimation = () => {
    if (!nebulaCloudEffectParams.autoRotate) return
    if (!camera) return

    if (cameraTimeline) {
      cameraTimeline.kill()
    }

    // 创建电影级运镜时间线
    cameraTimeline = gsap.timeline({
      repeatDelay: 0.3,
      duration: 35,
      repeat: 0,
      onComplete: () => {
        console.log('[星云特效] 运镜动画完成，开始清理特效')
        clearEffect()
      }
    })

    // 运镜轨迹：环绕 → 穿梭 → 俯视 → 底部 → 侧面 → 回归
    const positions = [
      { x: 18, y: 12, z: 18, target: new THREE.Vector3(0, 0, 0) },
      { x: -20, y: 6, z: -20, target: new THREE.Vector3(0, 0, 0) },
      { x: 6, y: 25, z: 6, target: new THREE.Vector3(0, 0, 0) },
      { x: 12, y: -8, z: 18, target: new THREE.Vector3(0, 2, 0) },
      { x: -15, y: 10, z: 12, target: new THREE.Vector3(0, 0, 0) }
    ]

    positions.forEach((pos, index) => {
      const nextPos = positions[(index + 1) % positions.length]

      // 在每次更新时检查 camera 是否存在
      cameraTimeline.to(
        camera.position,
        {
          x: nextPos.x,
          y: nextPos.y,
          z: nextPos.z,
          duration: 7,
          ease: 'sine.inOut',
          onUpdate: () => {
            if (camera) {
              camera.lookAt(nextPos.target)
            }
          }
        },
        index > 0 ? '>' : 0
      )
    })
  }

  /**
   * 停止运镜动画
   */
  const stopCameraAnimation = () => {
    if (cameraTimeline) {
      cameraTimeline.kill()
      cameraTimeline = null
    }
  }

  /**
   * 初始化 GSAP 呼吸动画
   */
  const initGSAPAnimations = () => {
    // 流动动画
    const flowTween = gsap.to(flowAnimation, {
      value: FULL_ROTATION * 2,
      duration: 4 / nebulaCloudEffectParams.flowSpeed,
      ease: 'sine.inOut',
      repeat: -1
    })
    allTweens.push(flowTween)

    // 脉冲动画
    const pulseTween = gsap.to(pulseAnimation, {
      value: 1.3,
      duration: 1.5 / nebulaCloudEffectParams.pulseSpeed,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    })
    allTweens.push(pulseTween)
  }

  /**
   * 设置交互事件 - 性能优化版本
   */
  const setupInteraction = (container: HTMLElement) => {
    // 复用 Vector3 对象，避免每帧创建
    const tempVector = new THREE.Vector3()
    const tempDir = new THREE.Vector3()

    const updateMousePosition = (event: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect()
      const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX
      const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY

      // 归一化到 -1 到 1
      interaction.mouseX = ((clientX - rect.left) / rect.width) * 2 - 1
      interaction.mouseY = -((clientY - rect.top) / rect.height) * 2 + 1

      // 复用 Vector3 对象，避免创建新对象
      tempVector.set(interaction.mouseX, interaction.mouseY, 0.5)
      tempVector.unproject(camera)
      tempDir.copy(tempVector).sub(camera.position).normalize()
      const distance = -camera.position.z / tempDir.z

      interaction.mousePosition.copy(camera.position).add(tempDir.multiplyScalar(distance))
    }

    const handleInteractionStart = (event: MouseEvent | TouchEvent) => {
      interaction.isInteracting = true
      updateMousePosition(event)

      // 交互强度动画
      gsap.killTweensOf(interactionAnimation)
      const tween = gsap.to(interactionAnimation, {
        value: 1,
        duration: 0.3,
        ease: 'power2.out'
      })
      allTweens.push(tween)
    }

    const handleInteractionMove = (event: MouseEvent | TouchEvent) => {
      if (interaction.isInteracting) {
        updateMousePosition(event)
      }
    }

    const handleInteractionEnd = () => {
      interaction.isInteracting = false

      // 交互强度衰减动画
      gsap.killTweensOf(interactionAnimation)
      const tween = gsap.to(interactionAnimation, {
        value: 0,
        duration: 0.5,
        ease: 'power2.out'
      })
      allTweens.push(tween)
    }

    // 鼠标事件
    container.addEventListener('mousedown', handleInteractionStart)
    container.addEventListener('mousemove', handleInteractionMove)
    container.addEventListener('mouseup', handleInteractionEnd)
    container.addEventListener('mouseleave', handleInteractionEnd)

    // 触摸事件
    container.addEventListener('touchstart', handleInteractionStart, { passive: false })
    container.addEventListener('touchmove', handleInteractionMove, { passive: false })
    container.addEventListener('touchend', handleInteractionEnd)
  }

  /**
   * 计算交互影响（引力/斥力）- 性能优化版本
   */
  const calculateInteractionEffect = (
    particleX: number,
    particleY: number,
    particleZ: number
  ): { offsetX: number; offsetY: number; offsetZ: number } => {
    if (!interaction.isInteracting || interactionAnimation.value < 0.01) {
      return { offsetX: 0, offsetY: 0, offsetZ: 0 }
    }

    const intensity = interactionAnimation.value * nebulaCloudEffectParams.interactionStrength
    const mousePos = interaction.mousePosition

    // 避免创建 Vector3，直接计算距离
    const dx = particleX - mousePos.x
    const dy = particleY - mousePos.y
    const dz = particleZ - mousePos.z
    const distanceSquared = dx * dx + dy * dy + dz * dz
    const radiusSquared = nebulaCloudEffectParams.interactionRadius * nebulaCloudEffectParams.interactionRadius

    if (distanceSquared > radiusSquared) {
      return { offsetX: 0, offsetY: 0, offsetZ: 0 }
    }

    const distance = Math.sqrt(distanceSquared)
    const effectFactor = intensity * (1 - distance / nebulaCloudEffectParams.interactionRadius)

    // 归一化方向向量（避免创建新对象）
    const invDist = 1 / distance
    const dirX = dx * invDist
    const dirY = dy * invDist
    const dirZ = dz * invDist

    if (nebulaCloudEffectParams.gravityMode === 'attract') {
      return {
        offsetX: -dirX * effectFactor * 2,
        offsetY: -dirY * effectFactor * 2,
        offsetZ: -dirZ * effectFactor * 2
      }
    } else {
      return {
        offsetX: dirX * effectFactor * 2,
        offsetY: dirY * effectFactor * 2,
        offsetZ: dirZ * effectFactor * 2
      }
    }
  }

  /**
   * 入场动画
   */
  const playEntranceAnimation = () => {
    // 相机入场 - 从远处缓慢推进
    const cameraTween = gsap.from(camera.position, {
      x: 50,
      y: 40,
      z: 50,
      duration: 3,
      ease: 'power2.out'
    })
    allTweens.push(cameraTween)

    // 核心爆发
    const t1 = gsap.from(coreMesh.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 1.8,
      ease: 'elastic.out(1, 0.4)'
    })
    allTweens.push(t1)

    // 内层展开
    const t2 = gsap.from(innerMesh.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 2,
      ease: 'back.out(1.3)',
      delay: 0.3
    })
    allTweens.push(t2)

    // 外层渐入
    const t3 = gsap.from(outerMesh.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 2.5,
      ease: 'power2.out',
      delay: 0.5
    })
    allTweens.push(t3)

    // 整体旋转入场
    const t4 = gsap.from(coreMesh.rotation, {
      x: Math.PI,
      y: Math.PI,
      duration: 3.5,
      ease: 'power2.out'
    })
    allTweens.push(t4)

    // 材质淡入
    const t5 = gsap.from(coreMaterial, {
      opacity: 0,
      duration: 2,
      ease: 'power2.out'
    })
    allTweens.push(t5)

    // 2.5秒后启动运镜动画
    setTimeout(() => {
      playCameraAnimation()
    }, 2500)
  }

  /**
   * 更新粒子动画 - 性能优化版本
   */
  const updateParticles = (time: number) => {
    frameCount++

    const flowPhase = flowAnimation.value
    const pulseScale = pulseAnimation.value
    const shouldUpdateColor = frameCount % nebulaCloudEffectParams.updateInterval === 0

    // 性能优化：提前计算常用值
    const timeScale = time * TIME_SCALE_FACTOR
    const flowTime = time * nebulaCloudEffectParams.flowSpeed * TIME_SCALE_FACTOR
    const colorTime = time * nebulaCloudEffectParams.colorCycleSpeed * TIME_SCALE_FACTOR
    const rotX = timeScale * 0.3
    const rotY = timeScale * 0.5
    const rotZ = timeScale * 0.2

    let coreIndex = 0
    let innerIndex = 0
    let outerIndex = 0

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      // 基础轨道运动
      const currentAngle = p.orbitAngle + timeScale * p.orbitSpeed
      const cosAngle = Math.cos(currentAngle)
      const sinAngle = Math.sin(currentAngle)

      // 流动效果
      const flowOffset = Math.sin(flowPhase + p.orbitPhase) * 0.3 * p.flowDirection
      const flowHeight = Math.sin(flowTime + p.noiseOffset) * 0.5
      const effectiveRadius = p.orbitRadius + flowOffset

      // 基础位置 - 使用缓存的 cos/sin
      let x = cosAngle * effectiveRadius
      let y = p.orbitHeight + flowHeight
      let z = sinAngle * effectiveRadius

      // 计算交互影响
      const interactionEffect = calculateInteractionEffect(x, y, z)
      x += interactionEffect.offsetX
      y += interactionEffect.offsetY
      z += interactionEffect.offsetZ

      // 根据层级更新对应的 mesh
      let targetMesh: THREE.InstancedMesh
      let targetIndex: number

      if (p.layer === NebulaLayer.CORE) {
        targetMesh = coreMesh
        targetIndex = coreIndex
        coreIndex++
      } else if (p.layer === NebulaLayer.INNER) {
        targetMesh = innerMesh
        targetIndex = innerIndex
        innerIndex++
      } else {
        targetMesh = outerMesh
        targetIndex = outerIndex
        outerIndex++
      }

      // 更新位置
      dummy.position.set(x, y, z)

      // 脉冲缩放
      dummy.scale.setScalar(p.baseSize * pulseScale)

      // Billboard 效果：让粒子始终朝向相机
      dummy.lookAt(camera.position)

      dummy.updateMatrix()
      targetMesh.setMatrixAt(targetIndex, dummy.matrix)

      // 仅在指定帧数更新颜色（性能优化）
      if (shouldUpdateColor) {
        let currentHue = p.hue + colorTime
        if (currentHue > 1) currentHue -= 1

        // 交互时亮度增强
        const interactionBrightness = interactionAnimation.value * 0.2
        const currentLightness = Math.min(0.9, p.lightness + interactionBrightness)

        color.setHSL(currentHue, p.saturation, currentLightness)
        targetMesh.setColorAt(targetIndex, color)
      }
    }

    // 批量更新
    coreMesh.instanceMatrix.needsUpdate = true
    innerMesh.instanceMatrix.needsUpdate = true
    outerMesh.instanceMatrix.needsUpdate = true

    if (shouldUpdateColor) {
      coreMesh.instanceColor!.needsUpdate = true
      innerMesh.instanceColor!.needsUpdate = true
      outerMesh.instanceColor!.needsUpdate = true
    }
  }

  /**
   * 动画循环 - 性能优化版本
   */
  const animate = (time: number) => {
    // 整体自动旋转 - 预计算旋转增量
    if (nebulaCloudEffectParams.autoRotate) {
      const rotationSpeed = nebulaCloudEffectParams.rotationSpeed
      coreMesh.rotation.y += rotationSpeed * 1.5
      innerMesh.rotation.y += rotationSpeed
      outerMesh.rotation.y += rotationSpeed * 0.8
    }

    // 更新粒子动画
    updateParticles(time)

    // 更新控制器
    if (controls) {
      controls.update()
    }

    // 渲染场景
    renderer.render(scene, camera)
  }

  /**
   * 窗口大小调整 - 性能优化版本（防抖）
   */
  const handleResize = () => {
    // 防抖：避免频繁调整大小
    if (resizeTimeout) clearTimeout(resizeTimeout)

    resizeTimeout = setTimeout(() => {
      if (camera && renderer && container) {
        const width = container.clientWidth
        const height = container.clientHeight
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
      }
      resizeTimeout = null
    }, nebulaCloudEffectParams.resizeDebounceDelay) // 使用配置的防抖延迟
  }

  window.addEventListener('resize', handleResize)

  // 初始化
  init()

  // ============================================================
  // 🧹 内部清理函数（实际执行清理）
  // ============================================================
  const performCleanup = () => {
    console.log('清理动态粒子星云特效...')

    try {
      // 1. 清理所有tween
      allTweens.forEach(tween => {
        if (tween && tween.kill) tween.kill()
      })
      allTweens.length = 0

      // 2. 清理相机动画
      if (camera) {
        gsap.killTweensOf(camera.position)
        gsap.killTweensOf(camera.rotation)
      }

      // 3. 清理相机timeline
      if (cameraTimeline) {
        cameraTimeline.kill()
        cameraTimeline = null
      }

      // 4. 停止动画循环
      if (renderer) {
        renderer.setAnimationLoop(null)
      }

      // 5. 移除事件监听 - 清理防抖定时器
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
        resizeTimeout = null
      }
      window.removeEventListener('resize', handleResize)

      // 注意：由于使用了闭包，这里无法精确移除容器上的所有事件监听器
      // 在实际应用中，应该将处理函数提取到外部以便精确移除

      // 6. 清理临时对象
      dummy.position.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.rotation.set(0, 0, 0)

      // 7. 清理场景对象 - 星云粒子
      if (scene) {
        if (coreMesh) scene.remove(coreMesh)
        if (innerMesh) scene.remove(innerMesh)
        if (outerMesh) scene.remove(outerMesh)
      }

      ;[coreMesh, innerMesh, outerMesh].forEach(mesh => {
        if (mesh) {
          if (mesh.geometry) mesh.geometry.dispose()
          if (mesh.material instanceof THREE.Material) {
            mesh.material.dispose()
          }
        }
      })

      // 8. 清理DOM
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }

      // 9. 清理renderer
      if (renderer) {
        renderer.dispose()
      }

      // 10. 清空数组
      particles.length = 0

      // 11. 置null
      scene = null as any
      camera = null as any
      renderer = null
      controls = null
      coreMesh = null
      innerMesh = null
      outerMesh = null
      coreMaterial = null
      innerMaterial = null
      outerMaterial = null

      console.log('动态粒子星云特效清理完成')
    } catch (error) {
      console.error('清理动态粒子星云特效时出错:', error)
    }
  }

  // ============================================================
  // 🧹 清除特效（淡出后清理）
  // ============================================================
  const clearEffect = () => {
    // 先淡出所有元素
    const fadeOutTimeline = gsap.timeline({
      onComplete: () => {
        // 淡出完成后执行完整清理
        performCleanup()
      }
    })

    // 淡出星云粒子
    if (coreMaterial) {
      fadeOutTimeline.to(coreMaterial, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0)
    }
    if (innerMaterial) {
      fadeOutTimeline.to(innerMaterial, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0.2)
    }
    if (outerMaterial) {
      fadeOutTimeline.to(outerMaterial, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0.4)
    }
  }

  // ============================================================
  // 🧹 对外暴露的清理函数
  // ============================================================
  const cleanup = () => {
    performCleanup()
  }

  return { cleanup, clearEffect, stopCameraAnimation }
}
