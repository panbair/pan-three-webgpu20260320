// 星系漩涡特效 (Galaxy Vortex Effect)
// 特性: 多层螺旋星系 + 粒子漩涡 + 动态光效
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'

// 性能优化常量
const TIME_SCALE_FACTOR = 0.001
const FULL_ROTATION = Math.PI * 2

// 配置参数
export const galaxyVortexEffectParams = {
  armCount: 8, // 星系臂数量
  particlesPerArm: 800, // 每臂粒子数
  coreParticles: 500, // 核心粒子数
  haloParticles: 500, // 光晕粒子数
  alpha: 0.85, // 透明度
  alphaHash: true, // 是否启用 alphaHash
  rotationSpeed: 0.0003, // 整体旋转速度
  autoRotate: true, // 是否自动旋转
  colorShiftSpeed: 0.00015, // 颜色变化速度
  particleSize: 0.15, // 粒子大小
  coreGlowSpeed: 2.0, // 核心光晕速度
  armSpread: 0.6, // 臂扩展度
  armTwist: 3.5, // 臂扭曲度
  pulseIntensity: 0.3, // 脉冲强度
  pulseSpeed: 1.8, // 脉冲速度
  updateInterval: 4 // 颜色更新间隔帧数（优化性能）
}

// 渲染器类型
type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

// 粒子类型
enum ParticleType {
  ARM = 'arm', // 星系臂粒子
  CORE = 'core', // 核心粒子
  HALO = 'halo' // 光晕粒子
}

// 粒子数据
interface ParticleData {
  type: ParticleType
  orbitRadius: number
  orbitAngle: number
  orbitSpeed: number
  orbitHeight: number
  orbitPhase: number
  baseSize: number
  hue: number
  saturation: number
  lightness: number
}

/**
 * 创建星系漩涡特效 (Galaxy Vortex + GSAP 动画)
 * @param container - 容器元素
 * @returns 清理函数
 */
export const galaxyVortexEffect = (container: HTMLElement) => {
  // 场景变量
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: WebGPURendererType
  let controls: OrbitControls
  let armMesh: THREE.InstancedMesh
  let coreMesh: THREE.InstancedMesh
  let haloMesh: THREE.InstancedMesh
  let armMaterial: THREE.MeshStandardMaterial
  let coreMaterial: THREE.MeshStandardMaterial
  let haloMaterial: THREE.MeshStandardMaterial
  let particles: ParticleData[] = []

  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  // GSAP 动画对象
  const pulseAnimation = { value: 0 }
  const coreGlowAnimation = { value: 0 }

  // 电影级运镜相关变量
  let cameraTimeline: gsap.core.Timeline | null = null
  let cameraAnimationTimer: number | null = null

  // 存储所有 GSAP tweens，用于清理
  const allTweens: gsap.core.Tween[] = []
  const entranceCameraPositions = [
    // 入场镜头1: 极远距离仰望 - 宇宙尺度
    { position: new THREE.Vector3(80, 60, 80), target: new THREE.Vector3(0, 0, 0) },
    // 入场镜头2: 快速俯冲 - 冲击感
    { position: new THREE.Vector3(30, 25, 30), target: new THREE.Vector3(0, 0, 0) },
    // 入场镜头3: 侧面环绕 - 展示漩涡结构
    { position: new THREE.Vector3(20, 8, -20), target: new THREE.Vector3(0, 0, 0) },
    // 入场镜头4: 核心仰望 - 戏剧性
    { position: new THREE.Vector3(5, 3, 15), target: new THREE.Vector3(0, 5, 0) },
    // 入场镜头5: 最终位置 - 经典视角
    { position: new THREE.Vector3(15, 12, 15), target: new THREE.Vector3(0, 0, 0) }
  ]

  /**
   * 初始化场景
   */
  const init = async () => {
    try {
      // 创建相机
      const width = container.clientWidth
      const height = container.clientHeight
      camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 150)
      camera.position.set(15, 12, 15)
      camera.lookAt(0, 0, 0)

      // 创建场景
      scene = new THREE.Scene()
      scene.background = null

      // 创建三种几何体
      const armGeometry = new THREE.SphereGeometry(galaxyVortexEffectParams.particleSize, 12, 8)
      const coreGeometry = new THREE.SphereGeometry(
        galaxyVortexEffectParams.particleSize * 1.5,
        16,
        12
      )
      const haloGeometry = new THREE.SphereGeometry(
        galaxyVortexEffectParams.particleSize * 2,
        12,
        8
      )

      // 创建三种材质
      armMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: galaxyVortexEffectParams.alphaHash,
        opacity: galaxyVortexEffectParams.alpha * 0.9,
        roughness: 0.1,
        metalness: 0.9,
        envMapIntensity: 2.0,
        emissive: 0x0044ff,
        emissiveIntensity: 0.3
      })

      coreMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: galaxyVortexEffectParams.alphaHash,
        opacity: galaxyVortexEffectParams.alpha,
        roughness: 0.05,
        metalness: 1.0,
        envMapIntensity: 3.0,
        emissive: 0xffaa00,
        emissiveIntensity: 0.5
      })

      haloMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: galaxyVortexEffectParams.alphaHash,
        opacity: galaxyVortexEffectParams.alpha * 0.4,
        roughness: 0.2,
        metalness: 0.8,
        envMapIntensity: 1.5,
        emissive: 0x00ffff,
        emissiveIntensity: 0.2
      })

      // 创建实例化网格
      const armCount = galaxyVortexEffectParams.armCount * galaxyVortexEffectParams.particlesPerArm
      const coreCount = galaxyVortexEffectParams.coreParticles
      const haloCount = galaxyVortexEffectParams.haloParticles

      armMesh = new THREE.InstancedMesh(armGeometry, armMaterial, armCount)
      coreMesh = new THREE.InstancedMesh(coreGeometry, coreMaterial, coreCount)
      haloMesh = new THREE.InstancedMesh(haloGeometry, haloMaterial, haloCount)

      // 初始化星系
      initGalaxyParticles(armCount, coreCount, haloCount)

      scene.add(armMesh)
      scene.add(coreMesh)
      scene.add(haloMesh)

      // 创建 WebGPU 渲染器
      renderer = new THREE.WebGPURenderer({
        antialias: false,
        alpha: true,
        samples: 1
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0)) // 降低像素比以提升性能
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
      controls.minDistance = 3
      controls.maxDistance = 50

      // 初始化 GSAP 动画
      initGSAPAnimations()

      // 入场动画
      playEntranceAnimation()

      console.log('星系漩涡特效初始化完成')
    } catch (error) {
      console.error('星系漩涡特效初始化失败:', error)
    }
  }

  /**
   * 初始化星系粒子
   */
  const initGalaxyParticles = (armCount: number, coreCount: number, haloCount: number) => {
    let armIndex = 0
    let coreIndex = 0
    let haloIndex = 0

    // 初始化星系臂粒子
    for (let arm = 0; arm < galaxyVortexEffectParams.armCount; arm++) {
      const armAngle = (arm / galaxyVortexEffectParams.armCount) * Math.PI * 2

      for (let i = 0; i < galaxyVortexEffectParams.particlesPerArm; i++) {
        const progress = i / galaxyVortexEffectParams.particlesPerArm
        const radius = 1 + progress * 9 // 半径从 1 到 10

        // 漩涡扭曲
        const twistAngle = progress * galaxyVortexEffectParams.armTwist
        const totalAngle = armAngle + twistAngle

        // 添加随机偏移
        const spread = galaxyVortexEffectParams.armSpread * (1 - progress * 0.7)
        const noiseAngle = (Math.random() - 0.5) * spread
        const noiseRadius = (Math.random() - 0.5) * spread

        const x = Math.cos(totalAngle + noiseAngle) * (radius + noiseRadius)
        const z = Math.sin(totalAngle + noiseAngle) * (radius + noiseRadius)
        const y = (Math.random() - 0.5) * (0.5 + progress * 1.5)

        particles.push({
          type: ParticleType.ARM,
          orbitRadius: radius,
          orbitAngle: totalAngle + noiseAngle,
          orbitSpeed: (0.5 + progress * 0.5) * 0.0003,
          orbitHeight: y,
          orbitPhase: Math.random() * Math.PI * 2,
          baseSize: 0.3 + progress * 0.7 + Math.random() * 0.3,
          hue: (progress * 0.4 + arm * 0.1 + Math.random() * 0.05) % 1,
          saturation: 0.8 + Math.random() * 0.2,
          lightness: 0.55 + Math.random() * 0.15
        })

        // 设置臂粒子
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(particles[armIndex].baseSize)
        dummy.updateMatrix()
        armMesh.setMatrixAt(armIndex, dummy.matrix)

        color.setHSL(
          particles[armIndex].hue,
          particles[armIndex].saturation,
          particles[armIndex].lightness
        )
        armMesh.setColorAt(armIndex, color)

        armIndex++
      }
    }

    // 初始化核心粒子
    for (let i = 0; i < coreCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const radius = Math.random() * 2

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)

      particles.push({
        type: ParticleType.CORE,
        orbitRadius: radius,
        orbitAngle: theta,
        orbitSpeed: 0.001 + Math.random() * 0.002,
        orbitHeight: y,
        orbitPhase: Math.random() * Math.PI * 2,
        baseSize: 0.8 + Math.random() * 1.5,
        hue: 0.08 + Math.random() * 0.12,
        saturation: 0.9 + Math.random() * 0.1,
        lightness: 0.6 + Math.random() * 0.2
      })

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(particles[armCount + coreIndex].baseSize)
      dummy.updateMatrix()
      coreMesh.setMatrixAt(coreIndex, dummy.matrix)

      color.setHSL(
        particles[armCount + coreIndex].hue,
        particles[armCount + coreIndex].saturation,
        particles[armCount + coreIndex].lightness
      )
      coreMesh.setColorAt(coreIndex, color)

      coreIndex++
    }

    // 初始化光晕粒子
    for (let i = 0; i < haloCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const radius = 10 + Math.random() * 5

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta) * 0.3 // 压扁
      const z = radius * Math.cos(phi)

      particles.push({
        type: ParticleType.HALO,
        orbitRadius: radius,
        orbitAngle: theta,
        orbitSpeed: 0.0001 + Math.random() * 0.0002,
        orbitHeight: y,
        orbitPhase: Math.random() * Math.PI * 2,
        baseSize: 2 + Math.random() * 2,
        hue: 0.5 + Math.random() * 0.2,
        saturation: 0.6 + Math.random() * 0.3,
        lightness: 0.4 + Math.random() * 0.2
      })

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(particles[armCount + coreCount + haloIndex].baseSize)
      dummy.updateMatrix()
      haloMesh.setMatrixAt(haloIndex, dummy.matrix)

      color.setHSL(
        particles[armCount + coreCount + haloIndex].hue,
        particles[armCount + coreCount + haloIndex].saturation,
        particles[armCount + coreCount + haloIndex].lightness
      )
      haloMesh.setColorAt(haloIndex, color)

      haloIndex++
    }

    armMesh.instanceMatrix.needsUpdate = true
    armMesh.instanceColor!.needsUpdate = true
    coreMesh.instanceMatrix.needsUpdate = true
    coreMesh.instanceColor!.needsUpdate = true
    haloMesh.instanceMatrix.needsUpdate = true
    haloMesh.instanceColor!.needsUpdate = true
  }

  /**
   * 初始化 GSAP 呼吸动画
   */
  const initGSAPAnimations = () => {
    // 脉冲动画
    const pulseTween = gsap.to(pulseAnimation, {
      value: FULL_ROTATION,
      duration: 2 / galaxyVortexEffectParams.pulseSpeed,
      ease: 'sine.inOut',
      repeat: -1
    })
    allTweens.push(pulseTween)

    // 核心光晕动画
    const coreGlowTween = gsap.to(coreGlowAnimation, {
      value: 1,
      duration: 1 / galaxyVortexEffectParams.coreGlowSpeed,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    })
    allTweens.push(coreGlowTween)
  }

  /**
   * 相机运镜动画
   */
  const playCameraAnimation = () => {
    // 检查 camera 是否存在（可能在切换特效时已被清理）
    if (!camera) {
      console.warn('[星系漩涡特效] camera 已被清理，跳过运镜动画')
      return
    }

    if (cameraTimeline) {
      cameraTimeline.kill()
    }

    // 创建运镜时间线
    cameraTimeline = gsap.timeline({
      repeat: 0,
      onComplete: () => {
        console.log('[星系漩涡特效] 运镜动画完成，开始清理特效')
        clearEffect()
      }
    })

    // 镜头1: 极远距离 → 镜头2: 快速俯冲（宇宙尺度感）
    cameraTimeline.to(
      camera.position,
      {
        x: entranceCameraPositions[1].position.x,
        y: entranceCameraPositions[1].position.y,
        z: entranceCameraPositions[1].position.z,
        duration: 3,
        ease: 'power4.in',
        onUpdate: () => {
          camera.lookAt(0, 0, 0)
        }
      },
      0
    )

    // 镜头2: 快速俯冲 → 镜头3: 侧面环绕（冲击感）
    cameraTimeline.to(
      camera.position,
      {
        x: entranceCameraPositions[2].position.x,
        y: entranceCameraPositions[2].position.y,
        z: entranceCameraPositions[2].position.z,
        duration: 2.5,
        ease: 'expo.inOut',
        onUpdate: () => {
          camera.lookAt(0, 0, 0)
        }
      },
      3
    )

    // 镜头3: 侧面环绕 → 镜头4: 核心仰望（展示漩涡结构）
    cameraTimeline.to(
      camera.position,
      {
        x: entranceCameraPositions[3].position.x,
        y: entranceCameraPositions[3].position.y,
        z: entranceCameraPositions[3].position.z,
        duration: 3,
        ease: 'circ.inOut',
        onUpdate: () => {
          camera.lookAt(0, 5, 0)
        }
      },
      5.5
    )

    // 镜头4: 核心仰望 → 镜头5: 最终位置（戏剧性到经典视角）
    cameraTimeline.to(
      camera.position,
      {
        x: entranceCameraPositions[4].position.x,
        y: entranceCameraPositions[4].position.y,
        z: entranceCameraPositions[4].position.z,
        duration: 3.5,
        ease: 'power3.out',
        onUpdate: () => {
          camera.lookAt(0, 0, 0)
        }
      },
      8.5
    )

    // 相机FOV动态变化（从超广角到标准视角）
    gsap.set(camera, { fov: 70 })
    camera.updateProjectionMatrix()

    cameraTimeline.to(
      camera,
      {
        fov: 55, // 恢复到标准视角
        duration: 12, // 整个运镜过程
        ease: 'power3.out',
        onUpdate: () => {
          camera.updateProjectionMatrix()
        }
      },
      0
    )
  }

  // 停止运镜动画
  const stopCameraAnimation = () => {
    if (cameraTimeline) {
      cameraTimeline.kill()
      cameraTimeline = null
    }
  }

  /**
   * 入场动画
   */
  const playEntranceAnimation = () => {
    // 星系臂展开
    const t1 = gsap.from(armMesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 2,
      ease: 'back.out(1.5)'
    })
    allTweens.push(t1)

    // 核心爆发
    const t2 = gsap.from(coreMesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 1.5,
      ease: 'elastic.out(1, 0.4)',
      delay: 0.2
    })
    allTweens.push(t2)

    // 光晕渐入
    const t3 = gsap.from(haloMesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 2.5,
      ease: 'power2.out',
      delay: 0.5
    })
    allTweens.push(t3)

    // 整体旋转入场
    const t4 = gsap.from(armMesh.rotation, {
      x: Math.PI * 0.5,
      duration: 3,
      ease: 'power2.out'
    })
    allTweens.push(t4)

    // 材质淡入
    const t5 = gsap.from(armMaterial, {
      opacity: 0,
      duration: 1.5,
      ease: 'power2.out'
    })
    allTweens.push(t5)

    const t6 = gsap.from(coreMaterial, {
      opacity: 0,
      duration: 1.5,
      ease: 'power2.out',
      delay: 0.2
    })
    allTweens.push(t6)

    // 2.5秒后启动运镜动画
    cameraAnimationTimer = window.setTimeout(() => {
      playCameraAnimation()
      cameraAnimationTimer = null
    }, 2500)
  }

  // 帧计数器（用于优化性能）
  let frameCount = 0

  /**
   * 更新粒子动画（极致性能优化版）
   */
  const updateParticles = (time: number) => {
    frameCount++

    const pulseScale = 1 + Math.sin(pulseAnimation.value) * galaxyVortexEffectParams.pulseIntensity
    const coreGlowScale = 1 + coreGlowAnimation.value * 0.3

    const shouldUpdateColor = frameCount % galaxyVortexEffectParams.updateInterval === 0

    // 缓存常用计算
    const timeScale = time * TIME_SCALE_FACTOR
    const colorShift = galaxyVortexEffectParams.colorShiftSpeed * timeScale

    let armIndex = 0
    let coreIndex = 0
    let haloIndex = 0
    const plen = particles.length

    // 分别遍历三种粒子类型，避免条件判断
    for (let i = 0; i < plen; i++) {
      const p = particles[i]

      if (p.type === ParticleType.ARM) {
        // 漩涡运动 - 优化计算
        const angle = p.orbitAngle + timeScale * p.orbitSpeed
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)
        const radius = p.orbitRadius

        dummy.position.set(cosA * radius, p.orbitHeight, sinA * radius)
        dummy.scale.setScalar(p.baseSize * pulseScale)
        dummy.rotation.set(0, timeScale * 0.5 * p.orbitSpeed, 0)
        dummy.updateMatrix()
        armMesh.setMatrixAt(armIndex, dummy.matrix)

        if (shouldUpdateColor) {
          let hue = p.hue + colorShift
          if (hue > 1) hue -= 1 // 比 % 1 更快
          color.setHSL(hue, p.saturation, p.lightness)
          armMesh.setColorAt(armIndex, color)
        }
        armIndex++
      } else if (p.type === ParticleType.CORE) {
        // 核心粒子运动 - 优化计算
        const angle = p.orbitAngle + timeScale * p.orbitSpeed
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)
        const radius = p.orbitRadius * coreGlowScale
        const phaseY = Math.sin(p.orbitPhase + timeScale) * radius

        dummy.position.set(cosA * radius, phaseY, sinA * radius)
        dummy.scale.setScalar(p.baseSize * coreGlowScale)
        dummy.rotation.set(timeScale, timeScale * 1.5, 0)
        dummy.updateMatrix()
        coreMesh.setMatrixAt(coreIndex, dummy.matrix)

        if (shouldUpdateColor) {
          let hue = p.hue + colorShift * 0.5
          if (hue > 1) hue -= 1
          color.setHSL(hue, p.saturation, p.lightness)
          coreMesh.setColorAt(coreIndex, color)
        }
        coreIndex++
      } else {
        // 光晕粒子运动 - 优化计算
        const angle = p.orbitAngle + timeScale * p.orbitSpeed
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)
        const radius = p.orbitRadius
        const scale = p.baseSize * (1 + Math.sin(timeScale + p.orbitPhase) * 0.2)

        dummy.position.set(cosA * radius, p.orbitHeight, sinA * radius)
        dummy.scale.setScalar(scale)
        dummy.updateMatrix()
        haloMesh.setMatrixAt(haloIndex, dummy.matrix)

        if (shouldUpdateColor) {
          let hue = p.hue + colorShift * 0.3
          if (hue > 1) hue -= 1
          color.setHSL(hue, p.saturation * 0.7, p.lightness)
          haloMesh.setColorAt(haloIndex, color)
        }
        haloIndex++
      }
    }

    // 批量更新矩阵
    armMesh.instanceMatrix.needsUpdate = true
    coreMesh.instanceMatrix.needsUpdate = true
    haloMesh.instanceMatrix.needsUpdate = true

    // 仅在颜色更新时标记颜色需要更新
    if (shouldUpdateColor) {
      armMesh.instanceColor!.needsUpdate = true
      coreMesh.instanceColor!.needsUpdate = true
      haloMesh.instanceColor!.needsUpdate = true
    }
  }

  /**
   * 动画循环
   */
  const animate = (time: number) => {
    // 整体自动旋转
    if (galaxyVortexEffectParams.autoRotate) {
      armMesh.rotation.y += galaxyVortexEffectParams.rotationSpeed
      coreMesh.rotation.y += galaxyVortexEffectParams.rotationSpeed * 1.2
      haloMesh.rotation.y += galaxyVortexEffectParams.rotationSpeed * 0.8
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

  // ============================================================
  // 🧹 内部清理函数（实际执行清理）
  // ============================================================
  const performCleanup = () => {
    console.log('清理星系漩涡特效...')

    try {
      // 清除延迟执行的运镜动画 timer
      if (cameraAnimationTimer !== null) {
        clearTimeout(cameraAnimationTimer)
        cameraAnimationTimer = null
      }

      // 立即杀掉所有存储的 tweens
      allTweens.forEach(tween => {
        if (tween && tween.kill) tween.kill()
      })
      allTweens.length = 0

      // 立即杀掉所有相机相关的 GSAP 动画
      if (camera) {
        gsap.killTweensOf(camera.position)
        gsap.killTweensOf(camera.rotation)
        gsap.killTweensOf(camera)
      }
      if (armMesh) {
        gsap.killTweensOf(armMesh.scale)
        gsap.killTweensOf(armMesh.rotation)
      }
      if (coreMesh) {
        gsap.killTweensOf(coreMesh.scale)
      }
      if (haloMesh) {
        gsap.killTweensOf(haloMesh.scale)
        gsap.killTweensOf(haloMesh.material)
      }
      gsap.killTweensOf(pulseAnimation)
      gsap.killTweensOf(coreGlowAnimation)

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
      window.removeEventListener('resize', handleResize)

      // 清理临时对象
      dummy.position.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      color.set(0xffffff)

      // 从场景中移除网格
      if (scene) {
        if (armMesh) scene.remove(armMesh)
        if (coreMesh) scene.remove(coreMesh)
        if (haloMesh) scene.remove(haloMesh)
      }

      // 清理资源
      ;[armMesh, coreMesh, haloMesh].forEach(mesh => {
        if (mesh) {
          if (mesh.geometry) mesh.geometry.dispose()
          if (mesh.material instanceof THREE.Material) {
            mesh.material.dispose()
          }
        }
      })

      // 移除 DOM 元素
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }

      // 释放渲染器
      if (renderer) {
        renderer.dispose()
      }

      // 清空引用
      scene = null as any
      camera = null as any
      renderer = null
      controls = null
      armMesh = null
      coreMesh = null
      haloMesh = null
      armMaterial = null
      coreMaterial = null
      haloMaterial = null
      particles = []

      console.log('星系漩涡特效清理完成')
    } catch (error) {
      console.error('清理星系漩涡特效时出错:', error)
    }
  }

  // ============================================================
  // 🧹 清除特效（淡出后清理）
  // ============================================================
  const clearEffect = () => {
    console.log('开始淡出特效...')
    // 先淡出所有元素
    const fadeOutTimeline = gsap.timeline({
      onComplete: () => {
        // 淡出完成后执行完整清理
        console.log('淡出完成，开始清理...')
        performCleanup()
      }
    })

    // 淡出星系臂
    if (armMaterial) {
      fadeOutTimeline.to(
        armMaterial,
        {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out'
        },
        0
      )
    }

    // 淡出核心
    if (coreMaterial) {
      fadeOutTimeline.to(
        coreMaterial,
        {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out'
        },
        0.2
      )
    }

    // 淡出光晕
    if (haloMaterial) {
      fadeOutTimeline.to(
        haloMaterial,
        {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out'
        },
        0.4
      )
    }
  }

  // 返回清理函数
  const cleanup = () => {
    performCleanup()
  }

  return { cleanup, clearEffect, stopCameraAnimation }
}
