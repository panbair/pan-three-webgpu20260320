// 霓虹星云云层特效 (Nebula Cloud Effect) - 重新设计
// 特性: 多层体积云雾 + 湍流流动 + 星光闪烁 + 内部发光 + 动态变形 + 鼠标交互
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'

// 性能优化常量
const TIME_SCALE_FACTOR = 0.001
const NOISE_SCALE = 0.5

// 配置参数
export const nebulaCloudEffectParams = {
  particleCount: 1500, // 总粒子数量
  cloudLayers: 5, // 云层数量
  particleSize: 0.12, // 粒子大小
  alpha: 0.85, // 透明度
  alphaHash: true, // 是否启用 alphaHash
  rotationSpeed: 0.00015, // 整体旋转速度
  autoRotate: true, // 是否自动旋转
  colorCycleSpeed: 0.00015, // 颜色变化速度
  turbulenceSpeed: 1.2, // 湍流速度
  nebulaSize: 18, // 星云大小
  starCount: 500, // 背景星星数量
  glowIntensity: 2.0, // 发光强度
  pulseSpeed: 3.0, // 脉冲速度
  waveAmplitude: 0.8, // 波浪幅度
  waveFrequency: 2.5, // 波浪频率
  interactionRadius: 12, // 交互影响半径
  interactionStrength: 2.0, // 交互强度
  updateInterval: 3 // 颜色更新间隔帧数（优化性能）
}

// 渲染器类型
type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

// 粒子类型
enum ParticleType {
  CLOUD_CORE = 'cloud_core', // 云层核心粒子
  CLOUD_MID = 'cloud_mid', // 云层中层粒子
  CLOUD_OUTER = 'cloud_outer', // 云层外围粒子
  STAR = 'star', // 背景星星
  SPARKLE = 'sparkle' // 闪烁火花
}

// 粒子数据类型
interface ParticleData {
  type: ParticleType
  basePosition: THREE.Vector3 // 基础位置
  orbitRadius: number // 轨道半径
  orbitAngle: number // 轨道角度
  orbitSpeed: number // 轨道速度
  orbitHeight: number // 轨道高度
  orbitPhase: number // 轨道相位
  baseSize: number // 基础大小
  hue: number // 色相
  saturation: number // 饱和度
  lightness: number // 亮度
  layerIndex: number // 云层索引
  turbulenceOffset: number // 湍流偏移
  sparklePhase: number // 闪烁相位
  sparkleSpeed: number // 闪烁速度
  glowIntensity: number // 发光强度
}

// 交互状态
interface InteractionState {
  isInteracting: boolean
  mouseX: number
  mouseY: number
  mousePosition: THREE.Vector3
  interactionIntensity: number
}

// 噪声函数 - 简化的 Perlin 噪声
const noise = (x: number, y: number, z: number): number => {
  return (Math.sin(x * NOISE_SCALE) + Math.sin(y * NOISE_SCALE * 1.3) + Math.sin(z * NOISE_SCALE * 1.7)) / 3
}

// 获取星云颜色分布
const getNebulaColor = (layerIndex: number, randomOffset: number): { hue: number; saturation: number; lightness: number } => {
  // 星云颜色方案：紫色(0.75) -> 蓝色(0.6) -> 青色(0.5) -> 粉色(0.85) -> 金色(0.1)
  const baseHues = [0.75, 0.6, 0.5, 0.85, 0.1]
  const hue = (baseHues[layerIndex % baseHues.length] + randomOffset * 0.1) % 1

  return {
    hue,
    saturation: 0.8 + randomOffset * 0.2,
    lightness: 0.55 + randomOffset * 0.25
  }
}

// 3D 噪声函数（用于湍流效果）
const noise3D = (x: number, y: number, z: number, time: number): number => {
  return (
    Math.sin(x * 0.3 + time) * 0.5 +
    Math.sin(y * 0.4 + time * 1.2) * 0.3 +
    Math.sin(z * 0.35 + time * 0.8) * 0.2
  )
}

/**
 * 创建霓虹星云云层特效
 * @param container - 容器元素
 * @returns 清理函数
 */
export const nebulaCloudEffect = (container: HTMLElement) => {
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: WebGPURendererType
  let controls: OrbitControls

  // 多层云雾网格
  let cloudCoreMesh: THREE.InstancedMesh
  let cloudMidMesh: THREE.InstancedMesh
  let cloudOuterMesh: THREE.InstancedMesh
  let starMesh: THREE.InstancedMesh
  let sparkleMesh: THREE.InstancedMesh

  // 材质
  let cloudCoreMaterial: THREE.MeshStandardMaterial
  let cloudMidMaterial: THREE.MeshStandardMaterial
  let cloudOuterMaterial: THREE.MeshStandardMaterial
  let starMaterial: THREE.MeshBasicMaterial
  let sparkleMaterial: THREE.MeshStandardMaterial

  let particles: ParticleData[] = []

  // 临时对象（复用）
  let dummy: THREE.Object3D | null = new THREE.Object3D()
  let color: THREE.Color | null = new THREE.Color()

  // GSAP 动画对象
  let turbulenceAnimation: { value: number } | null = { value: 0 }
  let pulseAnimation: { value: number } | null = { value: 1 }
  let waveAnimation: { value: number } | null = { value: 0 }
  let interactionAnimation: { value: number } | null = { value: 0 }

  // 电影级运镜相关变量
  let cameraTimeline: gsap.core.Timeline | null = null

  // 存储所有 GSAP tweens，用于清理
  const allTweens: gsap.core.Tween[] = []

  // 帧计数器（用于优化性能）
  let frameCount = 0

  // 交互状态
  const interactionState: InteractionState = {
    isInteracting: false,
    mouseX: 0,
    mouseY: 0,
    mousePosition: new THREE.Vector3(),
    interactionIntensity: 0
  }

  /**
   * 初始化场景
   */
  const init = async () => {
    try {
      // 创建相机
      const width = container.clientWidth
      const height = container.clientHeight
      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
      camera.position.set(18, 12, 18)
      camera.lookAt(0, 0, 0)

      // 创建场景
      scene = new THREE.Scene()
      scene.background = null

      // 计算粒子分布
      const armCount = Math.floor(nebulaCloudEffectParams.particleCount * 0.55) // 55% 旋臂
      const coreCount = Math.floor(nebulaCloudEffectParams.particleCount * 0.25) // 25% 核心
      const dustCount = nebulaCloudEffectParams.particleCount - armCount - coreCount // 20% 尘埃

      // 创建旋臂粒子（四面体 - 碎片感）
      const armGeometry = new THREE.TetrahedronGeometry(nebulaCloudEffectParams.particleSize, 0)
      armMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: nebulaCloudEffectParams.alphaHash,
        opacity: nebulaCloudEffectParams.alpha,
        roughness: 0.3,
        metalness: 0.7,
        envMapIntensity: 1.5,
        emissive: 0xff6600,
        emissiveIntensity: 0.3
      })
      armMesh = new THREE.InstancedMesh(armGeometry, armMaterial, armCount)

      // 创建核心粒子（二十面体 - 高亮度）
      const coreGeometry = new THREE.IcosahedronGeometry(nebulaCloudEffectParams.particleSize * 1.5, 0)
      coreMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: nebulaCloudEffectParams.alphaHash,
        opacity: nebulaCloudEffectParams.alpha * 1.1,
        roughness: 0.15,
        metalness: 0.85,
        envMapIntensity: 2.0,
        emissive: 0xffffaa,
        emissiveIntensity: 0.6
      })
      coreMesh = new THREE.InstancedMesh(coreGeometry, coreMaterial, coreCount)

      // 创建尘埃粒子（小圆点 - 散布感）
      const dustGeometry = new THREE.SphereGeometry(nebulaCloudEffectParams.particleSize * 0.6, 4, 4)
      dustMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: nebulaCloudEffectParams.alphaHash,
        opacity: nebulaCloudEffectParams.alpha * 0.8,
        roughness: 0.6,
        metalness: 0.4,
        envMapIntensity: 1.0,
        emissive: 0x8866ff,
        emissiveIntensity: 0.2
      })
      dustMesh = new THREE.InstancedMesh(dustGeometry, dustMaterial, dustCount)

      // 初始化粒子分布
      let armIndex = 0
      let coreIndex = 0
      let dustIndex = 0

      // 初始化旋臂粒子 - 螺旋结构
      for (let arm = 0; arm < nebulaCloudEffectParams.armCount; arm++) {
        const particlesPerArm = Math.floor(armCount / nebulaCloudEffectParams.armCount)

        for (let i = 0; i < particlesPerArm; i++) {
          const t = i / particlesPerArm
          const radius = 1 + t * nebulaCloudEffectParams.nebulaSize
          const armAngle = (arm / nebulaCloudEffectParams.armCount) * Math.PI * 2
          const twistAngle = t * nebulaCloudEffectParams.armTwist * Math.PI
          const totalAngle = armAngle + twistAngle

          // 添加噪声偏移
          const spread = 0.8 * (1 - t * 0.5)
          const noiseAngle = (Math.random() - 0.5) * spread
          const noiseRadius = (Math.random() - 0.5) * spread * 2

          const x = Math.cos(totalAngle + noiseAngle) * (radius + noiseRadius)
          const z = Math.sin(totalAngle + noiseAngle) * (radius + noiseRadius)
          const y = (Math.random() - 0.5) * (0.3 + t * 1.2)

          // 温度渐变：中心暖色 -> 外围冷色
          const temperatureColor = getTemperatureColor(t)

          particles.push({
            type: ParticleType.ARM,
            orbitRadius: radius,
            orbitAngle: totalAngle + noiseAngle,
            orbitSpeed: (0.3 + t * 0.7) * 0.0002,
            orbitHeight: y,
            orbitPhase: Math.random() * Math.PI * 2,
            baseSize: 0.3 + t * 1.0 + Math.random() * 0.4,
            hue: temperatureColor.hue,
            saturation: temperatureColor.saturation,
            lightness: temperatureColor.lightness,
            noiseOffset: Math.random() * 10,
            armIndex: arm
          })

          // 设置旋臂粒子
          if (dummy) {
            dummy.position.set(x, y, z)
            dummy.scale.setScalar(particles[armIndex].baseSize)
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
            dummy.updateMatrix()
            armMesh.setMatrixAt(armIndex, dummy.matrix)
          }

          if (color) {
            color.setHSL(
              particles[armIndex].hue,
              particles[armIndex].saturation,
              particles[armIndex].lightness
            )
            armMesh.setColorAt(armIndex, color)
          }

          armIndex++
        }
      }

      // 初始化核心粒子 - 球形分布
      for (let i = 0; i < coreCount; i++) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(1 - 2 * Math.random())
        const radius = Math.pow(Math.random(), 0.5) * 1.5

        const x = radius * Math.sin(phi) * Math.cos(theta)
        const y = radius * Math.sin(phi) * Math.sin(theta)
        const z = radius * Math.cos(phi)

        particles.push({
          type: ParticleType.CORE,
          orbitRadius: radius,
          orbitAngle: theta,
          orbitSpeed: 0.0003 + Math.random() * 0.0002,
          orbitHeight: y,
          orbitPhase: Math.random() * Math.PI * 2,
          baseSize: 0.6 + Math.random() * 0.4,
          hue: 0.1 + Math.random() * 0.05, // 橙黄色
          saturation: 0.9 + Math.random() * 0.1,
          lightness: 0.6 + Math.random() * 0.2,
          noiseOffset: Math.random() * 10,
          armIndex: 0
        })

        const idx = armCount + coreIndex
        if (dummy) {
          dummy.position.set(x, y, z)
          dummy.scale.setScalar(particles[idx].baseSize)
          dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
          dummy.updateMatrix()
          coreMesh.setMatrixAt(coreIndex, dummy.matrix)
        }

        if (color) {
          color.setHSL(
            particles[idx].hue,
            particles[idx].saturation,
            particles[idx].lightness
          )
          coreMesh.setColorAt(coreIndex, color)
        }

        coreIndex++
      }

      // 初始化尘埃粒子 - 随机散布
      for (let i = 0; i < dustCount; i++) {
        const u = Math.random()
        const v = Math.random()
        const theta = 2 * Math.PI * u
        const phi = Math.acos(2 * v - 1)
        const radius = 3 + Math.pow(Math.random(), 0.5) * nebulaCloudEffectParams.nebulaSize * 1.3

        const x = radius * Math.sin(phi) * Math.cos(theta)
        const y = radius * Math.sin(phi) * Math.sin(theta)
        const z = radius * Math.cos(phi)

        // 尘埃颜色：冷色调
        const dustColor = {
          hue: 0.6 + Math.random() * 0.15, // 蓝紫色
          saturation: 0.7 + Math.random() * 0.2,
          lightness: 0.5 + Math.random() * 0.3
        }

        particles.push({
          type: ParticleType.DUST,
          orbitRadius: radius,
          orbitAngle: theta,
          orbitSpeed: 0.0001 + Math.random() * 0.0001,
          orbitHeight: y,
          orbitPhase: Math.random() * Math.PI * 2,
          baseSize: 0.2 + Math.random() * 0.4,
          hue: dustColor.hue,
          saturation: dustColor.saturation,
          lightness: dustColor.lightness,
          noiseOffset: Math.random() * 10,
          armIndex: Math.floor(Math.random() * nebulaCloudEffectParams.armCount)
        })

        const idx = armCount + coreCount + dustIndex
        if (dummy) {
          dummy.position.set(x, y, z)
          dummy.scale.setScalar(particles[idx].baseSize)
          dummy.updateMatrix()
          dustMesh.setMatrixAt(dustIndex, dummy.matrix)
        }

        if (color) {
          color.setHSL(
            particles[idx].hue,
            particles[idx].saturation,
            particles[idx].lightness
          )
          dustMesh.setColorAt(dustIndex, color)
        }

        dustIndex++
      }

      armMesh.instanceMatrix.needsUpdate = true
      armMesh.instanceColor!.needsUpdate = true
      coreMesh.instanceMatrix.needsUpdate = true
      coreMesh.instanceColor!.needsUpdate = true
      dustMesh.instanceMatrix.needsUpdate = true
      dustMesh.instanceColor!.needsUpdate = true

      // 添加到场景
      scene.add(armMesh)
      scene.add(coreMesh)
      scene.add(dustMesh)

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

      // 创建 RoomEnvironment 环境贴图
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
      controls.minDistance = 5
      controls.maxDistance = 50

      // 初始化 GSAP 动画
      initGSAPAnimations()

      // 播放入场动画
      playEntranceAnimation()

      // 启动电影级自动运镜
      setTimeout(() => {
        playCameraAnimation()
      }, 3000)

      // 添加交互事件监听
      setupInteractionEvents()

      console.log('螺旋星云特效初始化完成')
    } catch (error) {
      console.error('螺旋星云特效初始化失败:', error)
    }
  }

  /**
   * 获取温度颜色（中心暖色 -> 外围冷色）
   */
  const getTemperatureColor = (t: number) => {
    // t: 0 (中心) -> 1 (外围)
    // 颜色：橙色 -> 黄色 -> 绿色 -> 蓝色
    if (t < 0.25) {
      // 橙色到黄色
      const t2 = t / 0.25
      return {
        hue: 0.08 + t2 * 0.02,
        saturation: 0.95,
        lightness: 0.55 + t2 * 0.1
      }
    } else if (t < 0.5) {
      // 黄色到绿色
      const t2 = (t - 0.25) / 0.25
      return {
        hue: 0.1 + t2 * 0.3,
        saturation: 0.9,
        lightness: 0.65
      }
    } else if (t < 0.75) {
      // 绿色到蓝色
      const t2 = (t - 0.5) / 0.25
      return {
        hue: 0.4 + t2 * 0.2,
        saturation: 0.85,
        lightness: 0.6
      }
    } else {
      // 蓝色到紫色
      const t2 = (t - 0.75) / 0.25
      return {
        hue: 0.6 + t2 * 0.1,
        saturation: 0.8,
        lightness: 0.55 - t2 * 0.05
      }
    }
  }

  /**
   * 初始化 GSAP 动画
   */
  const initGSAPAnimations = () => {
    // 粒子流动动画
    const flowTween = gsap.to(flowAnimation, {
      value: 1,
      duration: 3 / nebulaCloudEffectParams.flowSpeed,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
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
   * 入场动画
   */
  const playEntranceAnimation = () => {
    // 相机入场 - 从远处快速推进
    const cameraTween = gsap.from(camera.position, {
      x: 80,
      y: 60,
      z: 80,
      duration: 4,
      ease: 'power3.out'
    })
    allTweens.push(cameraTween)

    // 旋臂从中心扩散
    const armTween = gsap.from(armMesh.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 3,
      ease: 'elastic.out(1, 0.6)'
    })
    allTweens.push(armTween)

    // 核心爆发
    const coreTween = gsap.from(coreMesh.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 2.5,
      ease: 'elastic.out(1, 0.7)'
    })
    allTweens.push(coreTween)

    // 尘埃逐渐显现
    const dustTween = gsap.from(dustMesh.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 3.5,
      ease: 'power2.out'
    })
    allTweens.push(dustTween)

    // 整体旋转入场
    const rotationTween = gsap.from(armMesh.rotation, {
      y: Math.PI,
      duration: 5,
      ease: 'power2.out'
    })
    allTweens.push(rotationTween)
  }

  /**
   * 电影级运镜动画
   */
  const playCameraAnimation = () => {
    // 检查是否已清理
    if (!camera) return

    if (cameraTimeline) {
      cameraTimeline.kill()
    }

    // 创建电影级运镜时间线
    cameraTimeline = gsap.timeline({
      repeat: -1,
      repeatDelay: 0.5,
      onComplete: () => {
        cameraTimeline = null
      }
    })

    // 运镜轨迹：环绕 → 穿梭 → 俯视 → 底部 → 侧面 → 回归
    const positions = [
      { x: 20, y: 10, z: 20, target: new THREE.Vector3(0, 0, 0) },
      { x: -25, y: 5, z: -25, target: new THREE.Vector3(0, 0, 0) },
      { x: 5, y: 30, z: 5, target: new THREE.Vector3(0, 0, 0) },
      { x: 15, y: -10, z: 20, target: new THREE.Vector3(0, 2, 0) },
      { x: -20, y: 8, z: 15, target: new THREE.Vector3(0, 0, 0) }
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
   * 更新粒子动画
   */
  const updateParticles = (time: number) => {
    frameCount++

    const flowPhase = flowAnimation?.value || 0
    const pulseScale = pulseAnimation?.value || 1
    const shouldUpdateColor = frameCount % nebulaCloudEffectParams.updateInterval === 0

    // 性能优化：提前计算常用值
    const timeScale = time * TIME_SCALE_FACTOR
    const colorTime = time * nebulaCloudEffectParams.colorCycleSpeed * TIME_SCALE_FACTOR

    let armIndex = 0
    let coreIndex = 0
    let dustIndex = 0

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      let mesh: THREE.InstancedMesh
      let idx: number

      // 根据类型选择网格和索引
      if (p.type === ParticleType.ARM) {
        mesh = armMesh
        idx = armIndex++
      } else if (p.type === ParticleType.CORE) {
        mesh = coreMesh
        idx = coreIndex++
      } else {
        mesh = dustMesh
        idx = dustIndex++
      }

      // 轨道运动
      const currentAngle = p.orbitAngle + timeScale * p.orbitSpeed

      let x, y, z

      if (p.type === ParticleType.ARM) {
        // 旋臂粒子 - 螺旋运动 + 流动波动
        const flowOffset = Math.sin(flowPhase * Math.PI * 2 + p.orbitPhase) * 0.3
        const radius = p.orbitRadius + flowOffset

        x = Math.cos(currentAngle) * radius
        z = Math.sin(currentAngle) * radius
        y = p.orbitHeight + Math.sin(timeScale + p.orbitPhase) * 0.2

        // 旋臂旋转
        if (dummy) {
          dummy.position.set(x, y, z)

          // 脉冲缩放
          const size = p.baseSize * pulseScale * (1 + Math.sin(flowPhase * Math.PI + p.orbitPhase) * 0.15)
          dummy.scale.setScalar(size)

          dummy.rotation.set(timeScale * 0.2, timeScale * 0.3, timeScale * 0.1)
          dummy.updateMatrix()
          mesh.setMatrixAt(idx, dummy.matrix)
        }
      } else if (p.type === ParticleType.CORE) {
        // 核心粒子 - 球面运动
        x = p.orbitRadius * Math.cos(currentAngle)
        z = p.orbitRadius * Math.sin(currentAngle)
        y = p.orbitHeight * Math.cos(timeScale * 0.5 + p.orbitPhase)

        if (dummy) {
          dummy.position.set(x, y, z)

          const size = p.baseSize * pulseScale
          dummy.scale.setScalar(size)

          dummy.rotation.set(timeScale * 0.4, timeScale * 0.5, timeScale * 0.3)
          dummy.updateMatrix()
          mesh.setMatrixAt(idx, dummy.matrix)
        }
      } else {
        // 尘埃粒子 - 缓慢漂移
        const driftX = Math.sin(timeScale * 0.1 + p.noiseOffset) * 0.5
        const driftY = Math.cos(timeScale * 0.1 + p.noiseOffset) * 0.5
        const driftZ = Math.sin(timeScale * 0.15 + p.noiseOffset) * 0.5

        x = Math.cos(currentAngle) * p.orbitRadius + driftX
        z = Math.sin(currentAngle) * p.orbitRadius + driftZ
        y = p.orbitHeight + driftY

        if (dummy) {
          dummy.position.set(x, y, z)

          const size = p.baseSize * (0.8 + Math.sin(pulseScale * Math.PI + p.orbitPhase) * 0.2)
          dummy.scale.setScalar(size)

          dummy.updateMatrix()
          mesh.setMatrixAt(idx, dummy.matrix)
        }
      }

      // 仅在指定帧数更新颜色（性能优化）
      if (shouldUpdateColor && color) {
        let currentHue = p.hue + colorTime
        if (currentHue > 1) currentHue -= 1

        color.setHSL(currentHue, p.saturation, p.lightness)
        mesh.setColorAt(idx, color)
      }
    }

    armMesh.instanceMatrix.needsUpdate = true
    coreMesh.instanceMatrix.needsUpdate = true
    dustMesh.instanceMatrix.needsUpdate = true

    if (shouldUpdateColor) {
      armMesh.instanceColor!.needsUpdate = true
      coreMesh.instanceColor!.needsUpdate = true
      dustMesh.instanceColor!.needsUpdate = true
    }
  }

  /**
   * 动画循环
   */
  const animate = (time: number) => {
    // 整体自动旋转
    if (nebulaCloudEffectParams.autoRotate) {
      armMesh.rotation.y += nebulaCloudEffectParams.rotationSpeed
      armMesh.rotation.x += nebulaCloudEffectParams.rotationSpeed * 0.2
      coreMesh.rotation.y += nebulaCloudEffectParams.rotationSpeed * 1.2
      dustMesh.rotation.y += nebulaCloudEffectParams.rotationSpeed * 0.5
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
   * 设置交互事件
   */
  const setupInteractionEvents = () => {
    const handleMouseDown = (event: MouseEvent | TouchEvent) => {
      interactionState.isInteracting = true

      let clientX: number, clientY: number

      if (event instanceof MouseEvent) {
        clientX = event.clientX
        clientY = event.clientY
      } else {
        clientX = event.touches[0].clientX
        clientY = event.touches[0].clientY
      }

      interactionState.mouseX = clientX
      interactionState.mouseY = clientY

      // 淡入交互动画
      if (interactionAnimation) {
        gsap.to(interactionAnimation, {
          value: 1,
          duration: 0.3
        })
      }
    }

    const handleMouseMove = (event: MouseEvent | TouchEvent) => {
      let clientX: number, clientY: number

      if (event instanceof MouseEvent) {
        clientX = event.clientX
        clientY = event.clientY
      } else {
        clientX = event.touches[0].clientX
        clientY = event.touches[0].clientY
      }

      if (interactionState.isInteracting) {
        interactionState.mouseX = clientX
        interactionState.mouseY = clientY

        // 计算鼠标在 3D 空间中的位置
        updateMousePosition()
      }
    }

    const handleMouseUp = () => {
      interactionState.isInteracting = false

      // 淡出交互动画
      if (interactionAnimation) {
        gsap.to(interactionAnimation, {
          value: 0,
          duration: 0.5
        })
      }
    }

    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('mouseleave', handleMouseUp)

    container.addEventListener('touchstart', handleMouseDown)
    container.addEventListener('touchmove', handleMouseMove)
    container.addEventListener('touchend', handleMouseUp)
  }

  /**
   * 更新鼠标在 3D 空间中的位置
   */
  const updateMousePosition = () => {
    const rect = container.getBoundingClientRect()
    const x = ((interactionState.mouseX - rect.left) / rect.width) * 2 - 1
    const y = -((interactionState.mouseY - rect.top) / rect.height) * 2 + 1

    const vector = new THREE.Vector3(x, y, 0.5)
    vector.unproject(camera)

    const dir = vector.sub(camera.position).normalize()
    const distance = -camera.position.z / dir.z
    const pos = camera.position.clone().add(dir.multiplyScalar(distance))

    interactionState.mousePosition.copy(pos)
  }

  /**
   * 窗口大小调整
   */
  const handleResize = () => {
    if (camera && renderer && container) {
      const width = container.clientWidth
      const height = container.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
  }

  window.addEventListener('resize', handleResize)

  // 初始化
  init()

  // 返回清理函数
  const cleanup = () => {
    console.log('清理螺旋星云特效...')

    try {
      // 立即杀掉所有存储的 tweens
      allTweens.forEach(tween => {
        if (tween && tween.kill) tween.kill()
      })
      allTweens.length = 0

      // 立即杀掉所有相机相关的 GSAP 动画
      if (camera) {
        gsap.killTweensOf(camera.position)
        gsap.killTweensOf(camera.rotation)
      }
      if (armMesh) {
        gsap.killTweensOf(armMesh.scale)
        gsap.killTweensOf(armMesh.rotation)
      }
      if (coreMesh) {
        gsap.killTweensOf(coreMesh.scale)
        gsap.killTweensOf(coreMesh.rotation)
      }
      if (dustMesh) {
        gsap.killTweensOf(dustMesh.scale)
        gsap.killTweensOf(dustMesh.rotation)
      }
      if (flowAnimation) gsap.killTweensOf(flowAnimation)
      if (pulseAnimation) gsap.killTweensOf(pulseAnimation)
      if (interactionAnimation) gsap.killTweensOf(interactionAnimation)

      // 清理相机时间线
      if (cameraTimeline) {
        cameraTimeline.kill()
        cameraTimeline = null
      }

      // 取消动画循环
      if (renderer) {
        renderer.setAnimationLoop(null)
      }

      // 移除事件监听
      if (typeof handleResize === 'function') {
        window.removeEventListener('resize', handleResize)
      }

      // 清理临时对象
      dummy = null
      color = null
      flowAnimation = null
      pulseAnimation = null
      interactionAnimation = null

      // 从场景中移除网格
      if (armMesh && scene) {
        scene.remove(armMesh)
      }
      if (coreMesh && scene) {
        scene.remove(coreMesh)
      }
      if (dustMesh && scene) {
        scene.remove(dustMesh)
      }

      // 清理资源
      if (armMesh) {
        if (armMesh.geometry) armMesh.geometry.dispose()
        if (armMesh.material instanceof THREE.Material) {
          armMesh.material.dispose()
        }
      }
      if (coreMesh) {
        if (coreMesh.geometry) coreMesh.geometry.dispose()
        if (coreMesh.material instanceof THREE.Material) {
          coreMesh.material.dispose()
        }
      }
      if (dustMesh) {
        if (dustMesh.geometry) dustMesh.geometry.dispose()
        if (dustMesh.material instanceof THREE.Material) {
          dustMesh.material.dispose()
        }
      }

      // 移除 DOM 元素
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }

      // 释放渲染器
      if (renderer) {
        renderer.dispose()
      }

      // 清空引用
      scene = null
      camera = null
      renderer = null
      controls = null
      armMesh = null
      coreMesh = null
      dustMesh = null
      armMaterial = null
      coreMaterial = null
      dustMaterial = null
      particles = []

      console.log('螺旋星云特效清理完成')
    } catch (error) {
      console.error('清理螺旋星云特效时出错:', error)
    }
  }

  return cleanup
}
