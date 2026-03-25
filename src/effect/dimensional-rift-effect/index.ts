// GPU 维度裂隙创世曲特效 (GPU Dimensional Rift Genesis)
// 特性: 维度核心、裂隙能量、量子纠缠、创世波纹、黑洞视界、电影级运镜
// 技术栈: Three.js WebGPU + 物理材质 + 粒子系统 + GSAP 动画
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)
// 原理分析: 基于全息创世纪，使用 MeshPhysicalMaterial 实现发光效果

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'

// 配置参数
export const dimensionalRiftEffectParams = {
  particleCount: 4000, // 粒子数量
  riftRingCount: 5, // 裂隙环数量
  waveCount: 7, // 波纹数量
  coreComplexity: 128, // 核心复杂度
  coreRadius: 2.5, // 核心半径
  riftRadius: 12, // 裂隙半径
  eventHorizonRadius: 4, // 事件视界半径
  accretionDiskCount: 3, // 吸积盘数量
  dimensionColors: [0x00d4ff, 0xff00ff, 0x00ff88, 0xffff00, 0xff4400, 0x8800ff], // 维度颜色
  ambientLightIntensity: 0.1, // 环境光强度
  coreLightIntensity: 3, // 核心光源强度
  riftIntensity: 0.8, // 裂隙强度
  quantumEntanglement: true, // 量子纠缠
  gravitationalWaves: true, // 引力波
  dimensionShift: true, // 维度漂移
  autoRotate: true // 自动运镜
}

type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

// 粒子接口
interface DimensionalParticle {
  position: THREE.Vector3
  originalPosition: THREE.Vector3
  partnerIndex: number
  phase: number
  entanglementStrength: number
}

// 裂隙环接口
interface RiftRing {
  mesh: THREE.Mesh
  radius: number
  rotationSpeed: THREE.Vector3
  pulsePhase: number
}

/**
 * 创建维度裂隙创世曲特效
 * @param container - 容器元素
 * @returns 清理函数
 */
export const dimensionalRiftEffect = (container: HTMLElement) => {
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: WebGPURendererType
  let controls: OrbitControls

  // 维度核心系统
  let dimensionCore: THREE.Mesh | null = null
  let eventHorizon: THREE.Mesh | null = null

  // 裂隙环系统
  const riftRings: RiftRing[] = []

  // 量子粒子系统
  const particles: DimensionalParticle[] = []
  let particleSystem: THREE.InstancedMesh | null = null

  // 吸积盘系统
  const accretionDisks: THREE.Mesh[] = []

  // 引力波系统
  const gravitationalWaves: THREE.Mesh[] = []

  // 光照系统
  let coreLight: THREE.PointLight | null = null
  let ambientLight: THREE.AmbientLight

  // 时间控制
  let timestamp = 0

  // GSAP 动画
  let cameraTimeline: gsap.core.Timeline | null = null
  let cameraAnimationTimer: number | null = null
  const allTweens: gsap.core.Tween[] = []

  // 虚拟对象
  const dummy = new THREE.Object3D()
  const tempColor = new THREE.Color()

  const init = async () => {
    try {
      const width = container.clientWidth
      const height = container.clientHeight

      // 创建 WebGPU 渲染器
      renderer = new THREE.WebGPURenderer({
        antialias: false,
        alpha: true
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
      renderer.setSize(width, height)
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 2.2
      container.appendChild(renderer.domElement)
      await renderer.init()

      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
      camera.position.set(0, 8, 25)

      scene = new THREE.Scene()
      scene.background = null

      // 添加环境光
      ambientLight = new THREE.AmbientLight(0x050510, 0.15)
      scene.add(ambientLight)

      // 创建场景元素
      createDimensionCore()
      createEventHorizon()
      createRiftRings()
      createQuantumParticles()
      createAccretionDisks()
      createGravitationalWaves()
      createLighting()

      // 设置控制器
      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.06
      controls.minDistance = 6
      controls.maxDistance = 50
      controls.target.set(0, 0, 0)
      controls.enablePan = false

      // 启动动画
      renderer.setAnimationLoop(animate)

      // GSAP 动画
      initGSAPAnimations()
      playEntranceAnimation()

      console.log('[维度裂隙]初始化完成')
    } catch (error) {
      console.error('[维度裂隙]初始化失败:', error)
    }
  }

  // 创建维度核心
  const createDimensionCore = () => {
    const { coreComplexity, coreRadius, dimensionColors } = dimensionalRiftEffectParams

    // 使用 TorusKnotGeometry 创建复杂核心
    const geometry = new THREE.TorusKnotGeometry(coreRadius, coreRadius * 0.3, coreComplexity, 32, 2, 3)

    // 使用 MeshPhysicalMaterial 实现发光和折射
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(dimensionColors[0]),
      metalness: 0.2,
      roughness: 0.2,
      transmission: 0.5,
      thickness: 1.0,
      transparent: true,
      opacity: 0.85,
      emissive: new THREE.Color(dimensionColors[0]),
      emissiveIntensity: 0.8,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      envMapIntensity: 2,
      side: THREE.DoubleSide
    })

    dimensionCore = new THREE.Mesh(geometry, material)
    scene.add(dimensionCore)
  }

  // 创建事件视界（黑洞）
  const createEventHorizon = () => {
    const { eventHorizonRadius, dimensionColors } = dimensionalRiftEffectParams

    // 外部光环
    const geometry = new THREE.SphereGeometry(eventHorizonRadius, 64, 64)

    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(dimensionColors[1]),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide // 渲染内部
    })

    eventHorizon = new THREE.Mesh(geometry, material)
    scene.add(eventHorizon)

    // 内部黑色核心
    const blackHoleGeometry = new THREE.SphereGeometry(eventHorizonRadius * 0.9, 64, 64)
    const blackHoleMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.95
    })

    const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial)
    scene.add(blackHole)
  }

  // 创建裂隙环
  const createRiftRings = () => {
    const { riftRingCount, riftRadius, eventHorizonRadius, dimensionColors, riftIntensity } = dimensionalRiftEffectParams

    for (let i = 0; i < riftRingCount; i++) {
      const radius = eventHorizonRadius * 1.5 + i * (riftRadius - eventHorizonRadius * 1.5) / riftRingCount

      // 使用 TorusGeometry 创建环
      const geometry = new THREE.TorusGeometry(radius, radius * 0.02, 16, 128)

      const colorIndex = i % dimensionColors.length
      const baseColor = new THREE.Color(dimensionColors[colorIndex])

      const material = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: riftIntensity * 0.4,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })

      const mesh = new THREE.Mesh(geometry, material)

      // 随机倾斜角度
      mesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3
      mesh.rotation.y = (Math.random() - 0.5) * 0.3

      scene.add(mesh)

      riftRings.push({
        mesh,
        radius,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          0.01 + Math.random() * 0.01,
          (Math.random() - 0.5) * 0.01
        ),
        pulsePhase: Math.random() * Math.PI * 2
      })
    }
  }

  // 创建量子粒子
  const createQuantumParticles = () => {
    const { particleCount, riftRadius, eventHorizonRadius, quantumEntanglement } = dimensionalRiftEffectParams

    const geometry = new THREE.SphereGeometry(0.04, 8, 8)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })

    particleSystem = new THREE.InstancedMesh(geometry, material, particleCount)
    particleSystem.frustumCulled = false

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = eventHorizonRadius * 1.2 + Math.random() * riftRadius * 1.5

      const position = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )

      particles.push({
        position,
        originalPosition: position.clone(),
        partnerIndex: quantumEntanglement ? (i + 1) % particleCount : -1,
        phase: Math.random() * Math.PI * 2,
        entanglementStrength: quantumEntanglement ? 0.5 + Math.random() * 0.5 : 0
      })

      dummy.position.copy(position)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      particleSystem.setMatrixAt(i, dummy.matrix)
    }

    scene.add(particleSystem)
  }

  // 创建吸积盘
  const createAccretionDisks = () => {
    const { accretionDiskCount, eventHorizonRadius, dimensionColors } = dimensionalRiftEffectParams

    for (let i = 0; i < accretionDiskCount; i++) {
      const innerRadius = eventHorizonRadius * 1.5 + i * 3
      const outerRadius = innerRadius + 4

      const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 128, 64)

      const colorIndex = i % dimensionColors.length
      const baseColor = new THREE.Color(dimensionColors[colorIndex])

      const material = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.rotation.x = -Math.PI / 2 + (i % 2 === 0 ? 0.1 : -0.1)
      scene.add(mesh)

      accretionDisks.push(mesh)
    }
  }

  // 创建引力波
  const createGravitationalWaves = () => {
    const { waveCount, riftRadius, dimensionColors } = dimensionalRiftEffectParams

    for (let i = 0; i < waveCount; i++) {
      const radius = riftRadius * 0.8 + i * (riftRadius * 0.4)

      const geometry = new THREE.RingGeometry(radius, radius + 1.5, 128)

      const colorIndex = i % dimensionColors.length
      const baseColor = new THREE.Color(dimensionColors[colorIndex])

      const material = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.rotation.x = -Math.PI / 2
      scene.add(mesh)

      gravitationalWaves.push(mesh)
    }
  }

  // 创建光照系统
  const createLighting = () => {
    const { coreLightIntensity, ambientLightIntensity, dimensionColors } = dimensionalRiftEffectParams

    // 核心光源（模拟事件视界）
    coreLight = new THREE.PointLight(dimensionColors[0], coreLightIntensity, 30)
    coreLight.position.set(0, 0, 0)
    scene.add(coreLight)

    // 环境光
    ambientLight.intensity = ambientLightIntensity
  }

  // 相机路径动画
  const playCameraAnimation = () => {
    if (!dimensionalRiftEffectParams.autoRotate) return

    // 检查 camera 是否存在（可能在切换特效时已被清理）
    if (!camera) {
      console.warn('[维度裂隙特效] camera 已被清理，跳过运镜动画')
      return
    }

    cameraTimeline = gsap.timeline({
      repeatDelay: 0.5,
      duration: 24,
      repeat: 0,
      onComplete: () => {
        console.log('[维度裂隙特效] 运镜动画完成，开始清理特效')
        clearEffect()
      }
    })

    // 第一阶段：正面俯视
    cameraTimeline.to(camera.position, {
      x: 0,
      y: 12,
      z: 18,
      duration: 6,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    }, 0)

    // 第二阶段：环绕下降
    cameraTimeline.to(camera.position, {
      x: 15,
      y: 5,
      z: 15,
      duration: 6,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    }, 6)

    // 第三阶段：穿越裂隙
    cameraTimeline.to(camera.position, {
      x: -12,
      y: -8,
      z: 20,
      duration: 6,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    }, 12)

    // 第四阶段：返回起点
    cameraTimeline.to(camera.position, {
      x: 0,
      y: 8,
      z: 25,
      duration: 6,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    }, 18)
  }

  // 停止运镜动画
  const stopCameraAnimation = () => {
    if (cameraTimeline) {
      cameraTimeline.kill()
      cameraTimeline = null
    }
  }

  // 初始化GSAP呼吸动画
  const initGSAPAnimations = () => {
    // 维度核心呼吸动画
    if (dimensionCore) {
      const t = gsap.to(
        { value: 0 },
        {
          value: Math.PI * 2,
          duration: 2.5,
          repeat: -1,
          ease: 'none',
          onUpdate: function () {
            if (dimensionCore) {
              const pulse = 1 + Math.sin(this.targets()[0].value * 2.5) * 0.15
              dimensionCore.scale.setScalar(pulse)
            }
          }
        }
      )
      allTweens.push(t)
    }

    // 事件视界呼吸动画
    if (eventHorizon) {
      const t = gsap.to(
        { value: 0 },
        {
          value: Math.PI * 2,
          duration: 1.5,
          repeat: -1,
          ease: 'none',
          onUpdate: function () {
            if (eventHorizon) {
              const pulse = 1 + Math.sin(this.targets()[0].value * 1.5) * 0.05
              eventHorizon.scale.setScalar(pulse)
            }
          }
        }
      )
      allTweens.push(t)
    }

    // 裂隙环呼吸动画
    riftRings.forEach((ring, index) => {
      const t = gsap.to(
        { value: 0 },
        {
          value: Math.PI * 2,
          duration: 2,
          repeat: -1,
          ease: 'none',
          delay: index * 0.1,
          onUpdate: function () {
            if (ring.mesh) {
              const pulse = 1 + Math.sin(this.targets()[0].value * 2 + ring.pulsePhase) * 0.08
              ring.mesh.scale.setScalar(pulse)
            }
          }
        }
      )
      allTweens.push(t)
    })

    // 吸积盘呼吸动画
    accretionDisks.forEach((disk, index) => {
      const t = gsap.to(
        { value: 0 },
        {
          value: Math.PI * 2,
          duration: 1.5,
          repeat: -1,
          ease: 'none',
          delay: index * 0.2,
          onUpdate: function () {
            disk.material.opacity = 0.25 + Math.sin(this.targets()[0].value * 1.5 + index * 0.5) * 0.1
          }
        }
      )
      allTweens.push(t)
    })

    // 引力波呼吸动画
    gravitationalWaves.forEach((wave, index) => {
      const t = gsap.to(
        { value: 0 },
        {
          value: Math.PI * 2,
          duration: 3,
          repeat: -1,
          ease: 'none',
          delay: index * 0.15,
          onUpdate: function () {
            const wavePhase = index * 0.5
            wave.material.opacity = 0.1 + Math.sin(this.targets()[0].value * 3 + wavePhase) * 0.08
            wave.scale.setScalar(1 + Math.sin(this.targets()[0].value * 1.2 + wavePhase) * 0.05)
          }
        }
      )
      allTweens.push(t)
    })

    // 核心光源呼吸动画
    if (coreLight) {
      const t = gsap.to(
        { value: 0 },
        {
          value: Math.PI * 2,
          duration: 2.5,
          repeat: -1,
          ease: 'none',
          onUpdate: function () {
            if (coreLight) {
              coreLight.intensity = dimensionalRiftEffectParams.coreLightIntensity + Math.sin(this.targets()[0].value * 2.5) * 0.5
            }
          }
        }
      )
      allTweens.push(t)
    }
  }

  // 入场动画
  const playEntranceAnimation = () => {
    // 相机从远处高速俯冲
    const t1 = gsap.from(camera.position, {
      x: 0,
      y: 50,
      z: 80,
      duration: 6,
      ease: 'power3.out'
    })
    allTweens.push(t1)

    // 维度核心爆发
    if (dimensionCore) {
      const t2 = gsap.from(dimensionCore.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2.5,
        delay: 0.8,
        ease: 'elastic.out(1, 0.6)'
      })
      allTweens.push(t2)

      // 材质淡入
      const t3 = gsap.from(dimensionCore.material, {
        opacity: 0,
        duration: 2,
        delay: 0.8,
        ease: 'power2.out'
      })
      allTweens.push(t3)
    }

    // 事件视界展开
    if (eventHorizon) {
      const t4 = gsap.from(eventHorizon.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2,
        delay: 0.4,
        ease: 'elastic.out(1, 0.5)'
      })
      allTweens.push(t4)
    }

    // 裂隙环依次展开
    riftRings.forEach((ring, index) => {
      const t = gsap.from(ring.mesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.2,
        delay: 1.2 + index * 0.2,
        ease: 'elastic.out(1, 0.7)'
      })
      allTweens.push(t)
    })

    // 量子粒子爆发
    if (particleSystem) {
      const t = gsap.from(particleSystem.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2.5,
        delay: 1.6,
        ease: 'power2.out'
      })
      allTweens.push(t)
    }

    // 吸积盘渐显
    accretionDisks.forEach((disk, index) => {
      const t = gsap.from(disk.material, {
        opacity: 0,
        duration: 1.5,
        delay: 2 + index * 0.3,
        ease: 'power2.out'
      })
      allTweens.push(t)
    })

    // 引力波依次扩散
    gravitationalWaves.forEach((wave, index) => {
      const t = gsap.from(wave.material, {
        opacity: 0,
        duration: 1.5,
        delay: 2.4 + index * 0.2,
        ease: 'power2.out'
      })
      allTweens.push(t)
    })

    // 核心光源点亮
    if (coreLight) {
      const t = gsap.from(coreLight, {
        intensity: 0,
        duration: 2.5,
        delay: 1.2,
        ease: 'power2.out'
      })
      allTweens.push(t)
    }

    // 2.5秒后启动运镜动画
    cameraAnimationTimer = window.setTimeout(() => {
      playCameraAnimation()
      cameraAnimationTimer = null
    }, 2500)
  }

  const animate = (time: number) => {
    timestamp = time * 0.001

    // 更新控制器
    if (controls) controls.update()

    const { dimensionColors, quantumEntanglement, dimensionShift } = dimensionalRiftEffectParams

    // 更新维度核心
    if (dimensionCore) {
      // 复杂旋转
      dimensionCore.rotation.x += 0.008
      dimensionCore.rotation.y += 0.012
      dimensionCore.rotation.z += 0.004

      // 维度漂移 - 颜色渐变
      if (dimensionShift) {
        const hue = (timestamp * 0.08) % 1
        const driftColor = new THREE.Color().setHSL(hue, 1, 0.6)
        dimensionCore.material.emissive.lerp(driftColor, 0.015)
        dimensionCore.material.emissiveIntensity = 0.6 + Math.sin(timestamp * 3) * 0.2
      }
    }

    // 更新事件视界
    if (eventHorizon) {
      // 视界颜色脉动
      if (dimensionShift) {
        const hue = (timestamp * 0.05 + 0.5) % 1
        const horizonColor = new THREE.Color().setHSL(hue, 0.8, 0.5)
        eventHorizon.material.color.lerp(horizonColor, 0.01)
      }
    }

    // 更新裂隙环
    riftRings.forEach((ring, i) => {
      ring.mesh.rotation.x += ring.rotationSpeed.x
      ring.mesh.rotation.y += ring.rotationSpeed.y
      ring.mesh.rotation.z += ring.rotationSpeed.z

      // 维度颜色流动
      if (dimensionShift) {
        const hue = (timestamp * 0.06 + i * 0.1) % 1
        const ringColor = new THREE.Color().setHSL(hue, 1, 0.6)
        ring.mesh.material.color.lerp(ringColor, 0.02)
      }
    })

    // 更新量子粒子
    if (particleSystem) {
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i]
        particle.phase += 0.03

        // 轨道运动
        const orbit = Math.sin(timestamp * 0.8 + particle.phase) * 0.5

        // 量子纠缠效果
        if (quantumEntanglement && particle.partnerIndex >= 0) {
          const partner = particles[particle.partnerIndex]
          const entanglement = Math.sin(timestamp * 2 + particle.phase) * particle.entanglementStrength * 0.3

          particle.position.x = particle.originalPosition.x + entanglement
          particle.position.y = particle.originalPosition.y + orbit
          particle.position.z = particle.originalPosition.z

          // 闪烁效果 - 纠缠对同步
          const flicker = 0.5 + Math.sin(timestamp * 6 + particle.phase) * 0.5
          dummy.position.copy(particle.position)
          dummy.scale.setScalar(flicker * 0.8)
          dummy.updateMatrix()
          particleSystem.setMatrixAt(i, dummy.matrix)
        } else {
          // 常规运动
          particle.position.x = particle.originalPosition.x * Math.cos(timestamp * 0.2) - particle.originalPosition.z * Math.sin(timestamp * 0.2)
          particle.position.y = particle.originalPosition.y + orbit
          particle.position.z = particle.originalPosition.x * Math.sin(timestamp * 0.2) + particle.originalPosition.z * Math.cos(timestamp * 0.2)

          const flicker = 0.6 + Math.sin(timestamp * 5 + particle.phase) * 0.4
          dummy.position.copy(particle.position)
          dummy.scale.setScalar(flicker * 0.9)
          dummy.updateMatrix()
          particleSystem.setMatrixAt(i, dummy.matrix)
        }
      }
      particleSystem.instanceMatrix.needsUpdate = true
    }

    // 更新吸积盘
    accretionDisks.forEach((disk, i) => {
      disk.rotation.z += 0.003 * (i % 2 === 0 ? 1 : -1)
      disk.rotation.x = -Math.PI / 2 + Math.sin(timestamp + i) * 0.05

      // 颜色渐变
      if (dimensionShift) {
        const hue = (timestamp * 0.04 + i * 0.08) % 1
        const diskColor = new THREE.Color().setHSL(hue, 0.9, 0.6)
        disk.material.color.lerp(diskColor, 0.01)
      }
    })

    // 更新引力波
    gravitationalWaves.forEach((wave, i) => {
      const wavePhase = i * 0.5

      // 颜色渐变
      if (dimensionShift) {
        const hue = (timestamp * 0.03 + i * 0.07) % 1
        const waveColor = new THREE.Color().setHSL(hue, 0.8, 0.6)
        wave.material.color.lerp(waveColor, 0.015)
      }
    })

    // 更新核心光源
    if (coreLight) {
      // 光源颜色渐变
      if (dimensionShift) {
        const hue = (timestamp * 0.08) % 1
        const lightColor = new THREE.Color().setHSL(hue, 1, 0.6)
        coreLight.color.lerp(lightColor, 0.02)
      }
    }

    // 整个场景缓慢旋转
    if (particleSystem) {
      particleSystem.rotation.y += 0.001
    }

    // 渲染
    if (renderer) {
      renderer.render(scene, camera)
    }
  }

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

  init()

  // ============================================================
  // 🧹 内部清理函数（实际执行清理）
  // ============================================================
  const performCleanup = () => {
    try {
      // 清除延迟执行的运镜动画 timer
      if (cameraAnimationTimer !== null) {
        clearTimeout(cameraAnimationTimer)
        cameraAnimationTimer = null
      }

      // 1. 清理所有tween
      allTweens.forEach(t => {
        if (t?.kill) t.kill()
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

      // 5. 移除事件监听
      window.removeEventListener('resize', handleResize)

      // 6. 清理虚拟对象
      dummy.position.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      tempColor.set(0xffffff)

      // 7. 清理维度核心
      if (dimensionCore) {
        if (dimensionCore.geometry) dimensionCore.geometry.dispose()
        if (dimensionCore.material instanceof THREE.Material) {
          dimensionCore.material.dispose()
        }
        if (scene) scene.remove(dimensionCore)
      }

      // 7. 清理事件视界
      if (eventHorizon) {
        if (eventHorizon.geometry) eventHorizon.geometry.dispose()
        if (eventHorizon.material instanceof THREE.Material) {
          eventHorizon.material.dispose()
        }
        if (scene) scene.remove(eventHorizon)
      }

      // 7. 清理裂隙环
      riftRings.forEach(ring => {
        if (ring.mesh.geometry) ring.mesh.geometry.dispose()
        if (ring.mesh.material instanceof THREE.Material) {
          ring.mesh.material.dispose()
        }
        if (scene) scene.remove(ring.mesh)
      })

      // 7. 清理量子粒子
      if (particleSystem) {
        if (particleSystem.geometry) particleSystem.geometry.dispose()
        if (particleSystem.material instanceof THREE.Material) {
          particleSystem.material.dispose()
        }
        if (scene) scene.remove(particleSystem)
      }

      // 7. 清理吸积盘
      accretionDisks.forEach(disk => {
        if (disk.geometry) disk.geometry.dispose()
        if (disk.material instanceof THREE.Material) {
          disk.material.dispose()
        }
        if (scene) scene.remove(disk)
      })

      // 7. 清理引力波
      gravitationalWaves.forEach(wave => {
        if (wave.geometry) wave.geometry.dispose()
        if (wave.material instanceof THREE.Material) {
          wave.material.dispose()
        }
        if (scene) scene.remove(wave)
      })

      // 8. 清理光源
      if (coreLight && scene) {
        scene.remove(coreLight)
      }
      if (scene) {
        scene.remove(ambientLight)
      }

      // 9. 清理DOM
      if (renderer?.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }

      // 10. 清理renderer
      if (renderer) {
        renderer.dispose()
      }

      // 11. 清理数组
      riftRings.length = 0
      particles.length = 0
      accretionDisks.length = 0
      gravitationalWaves.length = 0

      // 12. 置null
      scene = null as any
      camera = null as any
      renderer = null
      controls = null
      dimensionCore = null
      eventHorizon = null
      particleSystem = null
      coreLight = null
      ambientLight = null

      console.log('[维度裂隙]清理完成')
    } catch (error) {
      console.error('清理[维度裂隙]时出错:', error)
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

    // 淡出维度核心
    if (dimensionCore && dimensionCore.material instanceof THREE.Material) {
      fadeOutTimeline.to(dimensionCore.material, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0)
    }

    // 淡出事件视界
    if (eventHorizon && eventHorizon.material instanceof THREE.Material) {
      fadeOutTimeline.to(eventHorizon.material, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0)
    }

    // 淡出粒子系统
    if (particleSystem && particleSystem.material instanceof THREE.Material) {
      fadeOutTimeline.to(particleSystem.material, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out'
      }, 0.2)
    }

    // 淡出吸积盘
    accretionDisks.forEach((disk, index) => {
      if (disk.material instanceof THREE.Material) {
        fadeOutTimeline.to(
          disk.material,
          {
            opacity: 0,
            duration: 0.6,
            ease: 'power2.out'
          },
          0.2 + index * 0.05
        )
      }
    })

    // 淡出引力波
    gravitationalWaves.forEach((wave, index) => {
      if (wave.material instanceof THREE.Material) {
        fadeOutTimeline.to(
          wave.material,
          {
            opacity: 0,
            duration: 0.6,
            ease: 'power2.out'
          },
          0.4 + index * 0.05
        )
      }
    })

    // 淡出维度环
    riftRings.forEach((ring, index) => {
      if (ring.mesh && ring.mesh.material instanceof THREE.Material) {
        fadeOutTimeline.to(
          ring.mesh.material,
          {
            opacity: 0,
            duration: 0.6,
            ease: 'power2.out'
          },
          0.3 + index * 0.05
        )
      }
    })
  }

  // ============================================================
  // 🧹 对外暴露的清理函数
  // ============================================================
  const cleanup = () => {
    performCleanup()
  }

  return { cleanup, clearEffect, stopCameraAnimation }
}
