// 星系漩涡特效 (Galaxy Vortex Effect)
// 特性: 多层螺旋星系 + 粒子漩涡 + 动态光效
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'

// 配置参数
export const galaxyVortexEffectParams = {
  armCount: 5,                  // 星系臂数量
  particlesPerArm: 200,         // 每臂粒子数
  coreParticles: 150,           // 核心粒子数
  haloParticles: 100,           // 光晕粒子数
  alpha: 0.85,                  // 透明度
  alphaHash: true,              // 是否启用 alphaHash
  rotationSpeed: 0.0003,        // 整体旋转速度
  autoRotate: true,             // 是否自动旋转
  colorShiftSpeed: 0.00015,     // 颜色变化速度
  vortexStrength: 0.8,          // 漩涡强度
  particleSize: 0.15,           // 粒子大小
  coreGlowSpeed: 2.0,           // 核心光晕速度
  armSpread: 0.6,               // 臂扩展度
  armTwist: 3.5,                // 臂扭曲度
  pulseIntensity: 0.3,         // 脉冲强度
  pulseSpeed: 1.8,              // 脉冲速度
  updateInterval: 4             // 颜色更新间隔帧数（优化性能）
}

// 渲染器类型
type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

// 粒子类型
enum ParticleType {
  ARM = 'arm',           // 星系臂粒子
  CORE = 'core',         // 核心粒子
  HALO = 'halo'          // 光晕粒子
}

// 粒子数据
interface ParticleData {
  type: ParticleType
  initialPosition: THREE.Vector3
  orbitRadius: number
  orbitAngle: number
  orbitSpeed: number
  orbitHeight: number
  orbitPhase: number
  baseSize: number
  hue: number
  saturation: number
  lightness: number
  armIndex: number
  armProgress: number
  verticalOffset: number
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
  const tempColor = new THREE.Color()

  // GSAP 动画对象
  let pulseAnimation: { value: number } = { value: 0 }
  let coreGlowAnimation: { value: number } = { value: 0 }

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
      const coreGeometry = new THREE.SphereGeometry(galaxyVortexEffectParams.particleSize * 1.5, 16, 12)
      const haloGeometry = new THREE.SphereGeometry(galaxyVortexEffectParams.particleSize * 2, 12, 8)

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
        antialias: false,  // 禁用原生抗锯齿，使用SSAA代替
        alpha: true,
        samples: 1  // 固定采样数为1
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))  // 降低像素比以提升性能
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
        const radius = 1 + progress * 9  // 半径从 1 到 10

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
          initialPosition: new THREE.Vector3(x, y, z),
          orbitRadius: radius,
          orbitAngle: totalAngle + noiseAngle,
          orbitSpeed: (0.5 + progress * 0.5) * 0.0003,
          orbitHeight: y,
          orbitPhase: Math.random() * Math.PI * 2,
          baseSize: 0.3 + progress * 0.7 + Math.random() * 0.3,
          hue: (progress * 0.4 + arm * 0.1 + Math.random() * 0.05) % 1,
          saturation: 0.8 + Math.random() * 0.2,
          lightness: 0.55 + Math.random() * 0.15,
          armIndex: arm,
          armProgress: progress,
          verticalOffset: y
        })

        // 设置臂粒子
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(particles[armIndex].baseSize)
        dummy.updateMatrix()
        armMesh.setMatrixAt(armIndex, dummy.matrix)

        color.setHSL(particles[armIndex].hue, particles[armIndex].saturation, particles[armIndex].lightness)
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
        initialPosition: new THREE.Vector3(x, y, z),
        orbitRadius: radius,
        orbitAngle: theta,
        orbitSpeed: 0.001 + Math.random() * 0.002,
        orbitHeight: y,
        orbitPhase: Math.random() * Math.PI * 2,
        baseSize: 0.8 + Math.random() * 1.5,
        hue: 0.08 + Math.random() * 0.12,  // 金黄色
        saturation: 0.9 + Math.random() * 0.1,
        lightness: 0.6 + Math.random() * 0.2,
        armIndex: -1,
        armProgress: 0,
        verticalOffset: y
      })

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(particles[armIndex].baseSize)
      dummy.updateMatrix()
      coreMesh.setMatrixAt(coreIndex, dummy.matrix)

      color.setHSL(particles[armIndex].hue, particles[armIndex].saturation, particles[armIndex].lightness)
      coreMesh.setColorAt(coreIndex, color)

      coreIndex++
    }

    // 初始化光晕粒子
    for (let i = 0; i < haloCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const radius = 10 + Math.random() * 5

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta) * 0.3  // 压扁
      const z = radius * Math.cos(phi)

      particles.push({
        type: ParticleType.HALO,
        initialPosition: new THREE.Vector3(x, y, z),
        orbitRadius: radius,
        orbitAngle: theta,
        orbitSpeed: 0.0001 + Math.random() * 0.0002,
        orbitHeight: y,
        orbitPhase: Math.random() * Math.PI * 2,
        baseSize: 2 + Math.random() * 2,
        hue: 0.5 + Math.random() * 0.2,  // 青蓝色
        saturation: 0.6 + Math.random() * 0.3,
        lightness: 0.4 + Math.random() * 0.2,
        armIndex: -1,
        armProgress: 0,
        verticalOffset: y
      })

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(particles[armIndex].baseSize)
      dummy.updateMatrix()
      haloMesh.setMatrixAt(haloIndex, dummy.matrix)

      color.setHSL(particles[armIndex].hue, particles[armIndex].saturation, particles[armIndex].lightness)
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
   * 初始化 GSAP 动画
   */
  const initGSAPAnimations = () => {
    // 脉冲动画
    gsap.to(pulseAnimation, {
      value: Math.PI * 2,
      duration: 2 / galaxyVortexEffectParams.pulseSpeed,
      ease: 'sine.inOut',
      repeat: -1
    })

    // 核心光晕动画
    gsap.to(coreGlowAnimation, {
      value: 1,
      duration: 1 / galaxyVortexEffectParams.coreGlowSpeed,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    })
  }

  /**
   * 入场动画
   */
  const playEntranceAnimation = () => {
    // 相机入场
    gsap.from(camera.position, {
      x: 25,
      y: 20,
      z: 25,
      duration: 3,
      ease: 'power2.out'
    })

    // 星系臂展开
    gsap.from(armMesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 2.5,
      ease: 'back.out(1.5)'
    })

    // 核心爆发
    gsap.from(coreMesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 2,
      ease: 'elastic.out(1, 0.4)',
      delay: 0.3
    })

    // 光晕渐入
    gsap.from(haloMesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 3,
      ease: 'power2.out',
      delay: 0.6
    })

    // 整体旋转入场
    gsap.from(armMesh.rotation, {
      x: Math.PI * 0.5,
      duration: 4,
      ease: 'power2.out'
    })

    // 材质淡入
    gsap.from(armMaterial, {
      opacity: 0,
      duration: 2,
      ease: 'power2.out'
    })

    gsap.from(coreMaterial, {
      opacity: 0,
      duration: 2,
      ease: 'power2.out',
      delay: 0.3
    })
  }

  // 帧计数器（用于优化性能）
  let frameCount = 0

  /**
   * 更新粒子动画
   */
  const updateParticles = (time: number) => {
    frameCount++

    const pulseScale = 1 + Math.sin(pulseAnimation.value) * galaxyVortexEffectParams.pulseIntensity
    const coreGlowScale = 1 + coreGlowAnimation.value * 0.3

    const shouldUpdateColor = frameCount % galaxyVortexEffectParams.updateInterval === 0

    let armIndex = 0
    let coreIndex = 0
    let haloIndex = 0

    // 更新臂粒子
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i]

      if (particle.type === ParticleType.ARM) {
        // 漩涡运动
        const currentAngle = particle.orbitAngle + time * particle.orbitSpeed
        const x = Math.cos(currentAngle) * particle.orbitRadius
        const z = Math.sin(currentAngle) * particle.orbitRadius

        // 垂直波动
        const waveY = particle.verticalOffset +
                     Math.sin(time * 0.002 + particle.orbitPhase) * 0.3

        dummy.position.set(x, waveY, z)
        dummy.scale.setScalar(particle.baseSize * pulseScale)
        dummy.rotation.set(0, time * 0.0005 * particle.orbitSpeed, 0)
        dummy.updateMatrix()
        armMesh.setMatrixAt(armIndex, dummy.matrix)

        // 仅在指定帧数更新颜色（性能优化）
        if (shouldUpdateColor) {
          const currentHue = (particle.hue + time * galaxyVortexEffectParams.colorShiftSpeed * 0.001) % 1
          tempColor.setHSL(currentHue, particle.saturation, particle.lightness)
          armMesh.setColorAt(armIndex, tempColor)
        }

        armIndex++
      } else if (particle.type === ParticleType.CORE) {
        // 核心粒子运动
        const currentAngle = particle.orbitAngle + time * particle.orbitSpeed
        const x = Math.cos(currentAngle) * particle.orbitRadius * coreGlowScale
        const y = Math.sin(particle.orbitPhase + time * 0.001) * particle.orbitRadius * coreGlowScale
        const z = Math.sin(currentAngle) * particle.orbitRadius * coreGlowScale

        dummy.position.set(x, y, z)
        dummy.scale.setScalar(particle.baseSize * coreGlowScale)
        dummy.rotation.set(time * 0.001, time * 0.0015, 0)
        dummy.updateMatrix()
        coreMesh.setMatrixAt(coreIndex, dummy.matrix)

        if (shouldUpdateColor) {
          const currentHue = (particle.hue + time * galaxyVortexEffectParams.colorShiftSpeed * 0.0005) % 1
          tempColor.setHSL(currentHue, particle.saturation, particle.lightness)
          coreMesh.setColorAt(coreIndex, tempColor)
        }

        coreIndex++
      } else if (particle.type === ParticleType.HALO) {
        // 光晕粒子运动
        const currentAngle = particle.orbitAngle + time * particle.orbitSpeed
        const x = Math.cos(currentAngle) * particle.orbitRadius
        const z = Math.sin(currentAngle) * particle.orbitRadius

        dummy.position.set(x, particle.orbitHeight, z)
        dummy.scale.setScalar(particle.baseSize * (1 + Math.sin(time * 0.001 + particle.orbitPhase) * 0.2))
        dummy.updateMatrix()
        haloMesh.setMatrixAt(haloIndex, dummy.matrix)

        if (shouldUpdateColor) {
          const currentHue = (particle.hue + time * galaxyVortexEffectParams.colorShiftSpeed * 0.0003) % 1
          tempColor.setHSL(currentHue, particle.saturation * 0.7, particle.lightness)
          haloMesh.setColorAt(haloIndex, tempColor)
        }

        haloIndex++
      }
    }

    armMesh.instanceMatrix.needsUpdate = true

    // 仅在颜色更新时标记颜色需要更新
    if (shouldUpdateColor) {
      armMesh.instanceColor!.needsUpdate = true
      coreMesh.instanceColor!.needsUpdate = true
      haloMesh.instanceColor!.needsUpdate = true
    }

    coreMesh.instanceMatrix.needsUpdate = true
    haloMesh.instanceMatrix.needsUpdate = true
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
   * 更新参数
   */
  const updateParams = (params: Partial<typeof galaxyVortexEffectParams>) => {
    Object.assign(galaxyVortexEffectParams, params)

    // 更新材质参数
    [armMaterial, coreMaterial, haloMaterial].forEach(material => {
      material.alphaHash = galaxyVortexEffectParams.alphaHash
      material.needsUpdate = true
    })

    armMaterial.opacity = galaxyVortexEffectParams.alpha * 0.9
    coreMaterial.opacity = galaxyVortexEffectParams.alpha
    haloMaterial.opacity = galaxyVortexEffectParams.alpha * 0.4
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
  return () => {
    // 清理 GSAP 动画
    gsap.killTweensOf(pulseAnimation)
    gsap.killTweensOf(coreGlowAnimation)

    // 取消动画循环
    if (renderer) {
      renderer.setAnimationLoop(null)
    }

    // 移除事件监听
    window.removeEventListener('resize', handleResize)

    // 清理资源
    [armMesh, coreMesh, haloMesh].forEach(mesh => {
      mesh.geometry.dispose()
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose()
      }
    })

    if (renderer) {
      renderer.dispose()
    }

    scene = null
    camera = null
    renderer = null
    controls = null
    armMesh = null
    coreMesh = null
    haloMesh = null
    armMaterial = null
    coreMaterial = null
    haloMaterial = null
    particles = []
  }
}
