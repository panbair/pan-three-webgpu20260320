// GPU 星际穿越之门特效 (GPU Interstellar Portal Effect)
// 特性: 环绕能量环、粒子穿梭、时空扭曲、电影级运镜
// 技术栈: Three.js WebGPU + 粒子系统 + GSAP 动画
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'

// 配置参数
export const interstellarPortalEffectParams = {
  ringCount: 5, // 能量环数量
  particleCount: 3000, // 粒子数量
  portalRadius: 3, // 传送门半径
  coreColor: 0x00d4ff, // 核心颜色（青蓝）
  ringColor1: 0xff0080, // 环颜色1（洋红）
  ringColor2: 0x00ff88, // 环颜色2（青绿）
  ringColor3: 0xff8800, // 环颜色3（橙黄）
  particleSpeed: 2.0, // 粒子速度
  ringRotationSpeed: 0.5, // 环旋转速度
  autoRotate: true, // 自动运镜
  bloomEnabled: true, // 发光效果
  warpEffect: true, // 空间扭曲效果
  rainbowGradient: true, // 粒子彩虹渐变
  ringFlowGradient: true, // 环流动渐变
  coreNeonGradient: true, // 核心霓虹渐变
  starColorGradient: true // 星空颜色渐变
}

type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

// 能量环接口
interface EnergyRing {
  mesh: THREE.Mesh
  radius: number
  rotationSpeed: { x: number; y: number; z: number }
  tiltAngle: number
  baseColor: THREE.Color
}

// 粒子接口
interface PortalParticle {
  mesh: THREE.InstancedMesh
  position: THREE.Vector3
  velocity: THREE.Vector3
  phase: number
  orbitRadius: number
  orbitSpeed: number
  orbitAngle: number
}

/**
 * 创建星际穿越之门特效 (别名 crystalPalaceEffect)
 * @param container - 容器元素
 * @returns 清理函数
 */
export const interstellarPortalEffect = (container: HTMLElement) => {
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: WebGPURendererType
  let controls: OrbitControls

  // 能量环系统
  const rings: EnergyRing[] = []

  // 粒子系统
  const particles: PortalParticle[] = []
  let particleSystem: THREE.InstancedMesh | null = null
  let particleColors: Float32Array | null = null

  // 传送门核心
  let portalCore: THREE.Mesh | null = null
  let portalInner: THREE.Mesh | null = null

  // 光照系统
  let coreLight: THREE.PointLight
  let ambientLight: THREE.AmbientLight

  // 时间控制
  let timestamp = 0

  // GSAP 动画
  let cameraTimeline: gsap.core.Timeline | null = null
  const allTweens: gsap.core.Tween[] = []

  // 虚拟对象
  const dummy = new THREE.Object3D()

  const init = async () => {
    try {
      const width = container.clientWidth
      const height = container.clientHeight

      // 创建 WebGPU 渲染器
      renderer = new THREE.WebGPURenderer({
        antialias: true,
        alpha: true
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      renderer.setSize(width, height)
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.5
      container.appendChild(renderer.domElement)
      await renderer.init()

      camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100)
      camera.position.set(0, 2, 10)

      scene = new THREE.Scene()
      scene.background = null

      // 添加环境光
      ambientLight = new THREE.AmbientLight(0x0a1030, 0.3)
      scene.add(ambientLight)

      // 创建场景元素
      createPortalCore()
      createEnergyRings()
      createParticles()
      createStarField()

      // 设置控制器
      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.06
      controls.minDistance = 4
      controls.maxDistance = 25
      controls.target.set(0, 0, 0)
      controls.enablePan = false

      // 启动动画
      renderer.setAnimationLoop(animate)

      // GSAP 动画
      initCameraAnimation()
      playEntranceAnimation()
      // 运镜动画已在 initCameraAnimation 中设置，不需要额外调用

      console.log('[星际穿越之门]初始化完成')
    } catch (error) {
      console.error('[星际穿越之门]初始化失败:', error)
    }
  }

  // 创建传送门核心
  const createPortalCore = () => {
    const { coreColor, portalRadius, coreNeonGradient } = interstellarPortalEffectParams

    // 霓虹渐变色数组
    const neonColors = [0x00d4ff, 0xff00ff, 0x00ff88, 0xffff00, 0xff4400, 0x8800ff]

    // 外核心 - 支持霓虹渐变
    const outerGeometry = new THREE.TorusGeometry(portalRadius * 0.3, 0.3, 32, 64)
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    portalCore = new THREE.Mesh(outerGeometry, outerMaterial)
    portalCore.userData = { neonColors, currentColorIndex: 0 }
    scene.add(portalCore)

    // 内核心 - 白色发光球
    const innerGeometry = new THREE.SphereGeometry(portalRadius * 0.5, 32, 32)
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    portalInner = new THREE.Mesh(innerGeometry, innerMaterial)
    scene.add(portalInner)

    // 核心光源
    coreLight = new THREE.PointLight(coreColor, 5, 20)
    coreLight.position.set(0, 0, 0)
    scene.add(coreLight)
  }

  // 创建能量环
  const createEnergyRings = () => {
    const { ringCount, ringColor1, ringColor2, ringColor3, portalRadius, ringFlowGradient } =
      interstellarPortalEffectParams
    const colors = [ringColor1, ringColor2, ringColor3]

    // 流动渐变色数组
    const flowColors = [ringColor1, ringColor2, ringColor3, 0x00ffff, 0xff00ff, 0xffff00]

    for (let i = 0; i < ringCount; i++) {
      const radius = portalRadius * (0.5 + i * 0.3)
      const tubeRadius = 0.05 + (ringCount - i) * 0.02

      const geometry = new THREE.TorusGeometry(radius, tubeRadius, 16, 128)
      const material = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.4 + (ringCount - i) * 0.1,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })

      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      rings.push({
        mesh,
        radius,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.5,
          y: 0.3 + Math.random() * 0.3,
          z: (Math.random() - 0.5) * 0.3
        },
        tiltAngle: Math.random() * Math.PI * 0.3,
        baseColor: new THREE.Color(colors[i % colors.length]),
        ...(ringFlowGradient && {
          flowColors,
          currentFlowIndex: i % flowColors.length,
          flowSpeed: 0.3 + Math.random() * 0.4
        })
      })
    }
  }

  // 创建粒子系统
  const createParticles = () => {
    const { particleCount, portalRadius, rainbowGradient } = interstellarPortalEffectParams

    const geometry = new THREE.SphereGeometry(0.04, 8, 8)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })

    particleSystem = new THREE.InstancedMesh(geometry, material, particleCount)
    particleSystem.frustumCulled = false

    // 初始化粒子颜色数组
    particleColors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      // 螺旋分布
      const spiralAngle = (i / particleCount) * Math.PI * 20
      const spiralRadius = portalRadius * 0.8 + Math.random() * portalRadius * 0.5
      const height = (i / particleCount - 0.5) * portalRadius * 3

      const x = Math.cos(spiralAngle) * spiralRadius
      const y = height
      const z = Math.sin(spiralAngle) * spiralRadius

      particles.push({
        mesh: particleSystem,
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(0, 0, 0),
        phase: Math.random() * Math.PI * 2,
        orbitRadius: spiralRadius,
        orbitSpeed: 0.5 + Math.random() * 1.0,
        orbitAngle: spiralAngle,
        ...(rainbowGradient && {
          hueOffset: (i / particleCount) * Math.PI * 2, // 彩虹色偏移
          rainbowSpeed: 0.5 + Math.random() * 0.5 // 彩虹流动速度
        })
      })

      // 彩虹渐变初始颜色
      if (rainbowGradient) {
        const hue = (i / particleCount) * Math.PI * 2
        const color = new THREE.Color().setHSL(hue / (Math.PI * 2), 1, 0.6)
        particleColors[i * 3] = color.r
        particleColors[i * 3 + 1] = color.g
        particleColors[i * 3 + 2] = color.b
      }

      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      particleSystem.setMatrixAt(i, dummy.matrix)
    }

    scene.add(particleSystem)
  }

  // 创建背景星空
  const createStarField = () => {
    const { starColorGradient } = interstellarPortalEffectParams
    const starCount = 500
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)

    const starColors = [0xffffff, 0x00ffff, 0xff88ff, 0x88ffff, 0xffff88]

    for (let i = 0; i < starCount; i++) {
      const radius = 30 + Math.random() * 40
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

      // 根据距离和随机性选择颜色
      if (starColorGradient) {
        const distance = radius / 70 // 归一化距离 0-1
        let colorHex: number

        // 近处星星更亮、更暖色，远处星星更冷色
        if (distance < 0.3) {
          colorHex = starColors[Math.floor(Math.random() * 3)] // 近处
        } else if (distance < 0.6) {
          colorHex = starColors[Math.floor(Math.random() * 4)] // 中间
        } else {
          colorHex = starColors[Math.floor(Math.random() * 2)] // 远处
        }

        const color = new THREE.Color(colorHex)
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
      } else {
        colors[i * 3] = 1
        colors[i * 3 + 1] = 1
        colors[i * 3 + 2] = 1
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      vertexColors: starColorGradient // 启用顶点颜色
    })

    const stars = new THREE.Points(geometry, material)
    scene.add(stars)
  }

  // 相机路径动画
  const initCameraAnimation = () => {
    if (!interstellarPortalEffectParams.autoRotate) return

    cameraTimeline = gsap.timeline({
      repeatDelay: 0.3,
      duration: 18,
      onComplete: () => {
        console.log('[水晶宫殿特效] 运镜动画完成，开始清理特效')
        clearEffect()
      }
    })

    // 第一阶段：正面推进
    cameraTimeline.to(
      camera.position,
      {
        x: 0,
        y: 1,
        z: 7,
        duration: 5,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, 0, 0)
      },
      0
    )

    // 第二阶段：环绕上升
    cameraTimeline.to(
      camera.position,
      {
        x: 6,
        y: 4,
        z: 6,
        duration: 5,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, 0, 0)
      },
      5
    )

    // 第三阶段：俯视穿越
    cameraTimeline.to(
      camera.position,
      {
        x: -4,
        y: 5,
        z: 8,
        duration: 4,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, 0, 0)
      },
      10
    )

    // 第四阶段：返回起始
    cameraTimeline.to(
      camera.position,
      {
        x: 0,
        y: 2,
        z: 10,
        duration: 4,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, 0, 0)
      },
      14
    )
  }

  // 入场动画
  const playEntranceAnimation = () => {
    // 相机远距离俯冲
    const t1 = gsap.from(camera.position, {
      x: 0,
      y: 20,
      z: 30,
      duration: 5,
      ease: 'power3.out'
    })
    allTweens.push(t1)

    // 能量环依次展开
    rings.forEach((ring, index) => {
      const t = gsap.from(ring.mesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2,
        delay: index * 0.2,
        ease: 'elastic.out(1, 0.5)'
      })
      allTweens.push(t)
    })

    // 传送门核心爆发
    if (portalCore) {
      gsap.from(portalCore.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2.5,
        ease: 'elastic.out(1, 0.5)'
      })
    }
    if (portalInner) {
      gsap.from(portalInner.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2,
        delay: 0.5,
        ease: 'elastic.out(1, 0.5)'
      })
    }

    // 粒子从中心向外扩散
    if (particleSystem) {
      const t = gsap.fromTo(
        particleSystem.scale,
        { x: 0, y: 0, z: 0 },
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 3,
          ease: 'power2.out'
        }
      )
      allTweens.push(t)
    }
  }

  const animate = (time: number) => {
    timestamp = time * 0.001

    // 更新控制器
    if (controls) controls.update()

    const { rainbowGradient, ringFlowGradient, coreNeonGradient } = interstellarPortalEffectParams

    // 更新传送门核心（霓虹渐变）
    if (portalCore) {
      const corePulse = 1 + Math.sin(timestamp * 3) * 0.2
      portalCore.scale.setScalar(corePulse)
      portalCore.rotation.z += 0.02

      // 霓虹渐变效果
      if (coreNeonGradient && portalCore.userData.neonColors) {
        const { neonColors } = portalCore.userData
        const colorCycleSpeed = 0.8
        const colorIndex = Math.floor(timestamp * colorCycleSpeed) % neonColors.length
        const nextColorIndex = (colorIndex + 1) % neonColors.length
        const colorLerp = (timestamp * colorCycleSpeed) % 1

        const currentColor = new THREE.Color(neonColors[colorIndex])
        const nextColor = new THREE.Color(neonColors[nextColorIndex])

        // 平滑渐变
        portalCore.material.color.lerpColors(currentColor, nextColor, colorLerp)

        // 同步光源颜色
        if (coreLight) {
          coreLight.color.copy(portalCore.material.color)
        }
      }
    }
    if (portalInner) {
      const innerPulse = 1 + Math.sin(timestamp * 2) * 0.15
      portalInner.scale.setScalar(innerPulse)
    }
    if (coreLight) {
      coreLight.intensity = 4 + Math.sin(timestamp * 4) * 2
    }

    // 更新能量环（流动渐变）
    rings.forEach((ring, index) => {
      ring.mesh.rotation.x += ring.rotationSpeed.x * 0.01
      ring.mesh.rotation.y += ring.rotationSpeed.y * 0.01
      ring.mesh.rotation.z += ring.rotationSpeed.z * 0.01

      // 环形脉冲
      const ringPulse = 1 + Math.sin(timestamp * 2 + index) * 0.1
      ring.mesh.scale.setScalar(ringPulse)

      // 流动渐变效果
      if (ringFlowGradient && (ring as any).flowColors) {
        const { flowColors, flowSpeed } = ring as any
        const flowIndex = Math.floor(timestamp * flowSpeed + index) % flowColors.length
        const nextFlowIndex = (flowIndex + 1) % flowColors.length
        const flowLerp = (timestamp * flowSpeed + index) % 1

        const currentFlowColor = new THREE.Color(flowColors[flowIndex])
        const nextFlowColor = new THREE.Color(flowColors[nextFlowIndex])

        ring.mesh.material.color.lerpColors(currentFlowColor, nextFlowColor, flowLerp)
      }
    })

    // 更新粒子系统（彩虹渐变）
    if (particleSystem) {
      const { particleSpeed, portalRadius, rainbowGradient } = interstellarPortalEffectParams

      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i]
        particle.phase += 0.05

        // 螺旋运动
        particle.orbitAngle += particle.orbitSpeed * 0.01
        const targetX = Math.cos(particle.orbitAngle) * particle.orbitRadius
        const targetZ = Math.sin(particle.orbitAngle) * particle.orbitRadius

        // 穿越运动（向中心）
        const warpFactor = Math.sin(timestamp * 0.5 + particle.phase) * 0.5 + 0.5
        const x = targetX * (1 - warpFactor * 0.3)
        const z = targetZ * (1 - warpFactor * 0.3)
        const y = particle.position.y + Math.sin(timestamp + particle.phase) * 0.02

        particle.position.set(x, y, z)

        // 彩虹渐变颜色
        if (rainbowGradient && (particle as any).hueOffset !== undefined && particleColors) {
          const { hueOffset, rainbowSpeed } = particle as any
          const dynamicHue = (hueOffset + timestamp * rainbowSpeed) % (Math.PI * 2)
          const color = new THREE.Color().setHSL(dynamicHue / (Math.PI * 2), 1, 0.6)

          particleColors[i * 3] = color.r
          particleColors[i * 3 + 1] = color.g
          particleColors[i * 3 + 2] = color.b

          particleSystem.setColorAt(i, color)
        }

        // 闪烁效果
        const brightness = 0.4 + Math.sin(particle.phase) * 0.4
        dummy.position.copy(particle.position)
        dummy.scale.setScalar(brightness)
        dummy.updateMatrix()
        particleSystem.setMatrixAt(i, dummy.matrix)
      }
      particleSystem.instanceMatrix.needsUpdate = true
      if (rainbowGradient) {
        particleSystem.instanceColor!.needsUpdate = true
      }
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
      allTweens.forEach(t => {
        if (t?.kill) t.kill()
      })
      allTweens.length = 0

      if (camera) {
        gsap.killTweensOf(camera.position)
        gsap.killTweensOf(camera.rotation)
      }
      if (cameraTimeline) {
        cameraTimeline.kill()
        cameraTimeline = null
      }
      if (renderer) {
        renderer.setAnimationLoop(null)
      }
      window.removeEventListener('resize', handleResize)

      // 清理场景对象
      rings.forEach(ring => {
        if (ring.mesh.geometry) ring.mesh.geometry.dispose()
        if (ring.mesh.material instanceof THREE.Material) {
          ring.mesh.material.dispose()
        }
        if (scene) scene.remove(ring.mesh)
      })

      if (portalCore) {
        if (portalCore.geometry) portalCore.geometry.dispose()
        if (portalCore.material instanceof THREE.Material) {
          portalCore.material.dispose()
        }
        if (scene) scene.remove(portalCore)
      }

      if (portalInner) {
        if (portalInner.geometry) portalInner.geometry.dispose()
        if (portalInner.material instanceof THREE.Material) {
          portalInner.material.dispose()
        }
        if (scene) scene.remove(portalInner)
      }

      if (particleSystem) {
        if (particleSystem.geometry) particleSystem.geometry.dispose()
        if (particleSystem.material instanceof THREE.Material) {
          particleSystem.material.dispose()
        }
        if (scene) scene.remove(particleSystem)
      }

      if (scene) {
        scene.remove(coreLight)
        scene.remove(ambientLight)
      }

      if (renderer?.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      if (renderer) {
        renderer.dispose()
      }

      // 清理数组
      rings.length = 0
      particles.length = 0

      scene = null
      camera = null
      renderer = null
      controls = null
      portalCore = null
      portalInner = null
      particleSystem = null
      coreLight = null
      ambientLight = null

      console.log('[星际穿越之门]清理完成')
    } catch (error) {
      console.error('清理[星际穿越之门]时出错:', error)
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

    // 淡出传送门核心
    if (portalCore && portalCore.material instanceof THREE.Material) {
      fadeOutTimeline.to(
        portalCore.material,
        {
          opacity: 0,
          duration: 1,
          ease: 'power2.out'
        },
        0
      )
    }

    // 淡出传送门内部
    if (portalInner && portalInner.material instanceof THREE.Material) {
      fadeOutTimeline.to(
        portalInner.material,
        {
          opacity: 0,
          duration: 1,
          ease: 'power2.out'
        },
        0.2
      )
    }

    // 淡出粒子系统
    if (particleSystem && particleSystem.material instanceof THREE.Material) {
      fadeOutTimeline.to(
        particleSystem.material,
        {
          opacity: 0,
          duration: 1,
          ease: 'power2.out'
        },
        0.4
      )
    }
  }

  // ============================================================
  // 🧹 对外暴露的清理函数
  // ============================================================
  const cleanup = () => {
    performCleanup()
  }

  return { cleanup, clearEffect }
}

// 导出别名，保持向后兼容
export const crystalPalaceEffect = interstellarPortalEffect
