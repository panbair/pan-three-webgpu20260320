/**
 * 🌌 霓虹星云 - 超越维度的色彩漩涡
 *
 * 创新亮点：
 * - 基于Three.js WebGPU渲染器
 * - 蝴蝶纹理 + 霓虹光带 + 星云云团的完美融合
 * - 五层独立系统：光子海、霓虹光带、星云云团、流星雨、光环脉冲
 *
 * 核心特性：
 * 1. 8000个光子粒子模拟霓虹流动
 * 2. 12层动态霓虹光带（贝塞尔曲线）
 * 3. 3000个星云云团粒子（蝴蝶纹理）
 * 4. 1500个流星雨粒子（快速下落）
 * 5. 6个光环脉冲扩散
 * 6. 震撼的配色：霓虹粉→电光蓝→激光绿→紫罗兰→金橙
 * 7. 完整的GSAP电影级运镜（5个角度切换）
 */

import * as THREE from 'three/webgpu'
import gsap from 'gsap'

// 特效参数导出
export const neonNebulaEffectParams = {
  photonParticles: 8000,
  neonRibbons: 12,
  nebulaClouds: 3000,
  meteorShower: 1500,
  haloPulses: 6,
  animationDuration: 20
}

export const neonNebulaEffect = (container: HTMLElement) => {
  // ============================================================
  // 🎨 配置参数
  // ============================================================
  const config = {
    photonParticles: 8000,
    neonRibbons: 12,
    nebulaClouds: 3000,
    meteorShower: 1500,
    haloPulses: 6
  }

  const colors = {
    neonPink: new THREE.Color(0xff0066),
    electricBlue: new THREE.Color(0x00f0ff),
    laserGreen: new THREE.Color(0x00ff66),
    violet: new THREE.Color(0x9900ff),
    goldOrange: new THREE.Color(0xff9900)
  }

  // ============================================================
  // 🎬 场景初始化
  // ============================================================
  const width = container.clientWidth
  const height = container.clientHeight

  const renderer = new THREE.WebGPURenderer({
    antialias: false,
    alpha: true
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
  container.appendChild(renderer.domElement)

  // 🌌 场景（透明背景，显示全景图）
  const scene = new THREE.Scene()
  // 不设置背景颜色，保持透明

  // 🎥 相机设置
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000)
  camera.position.set(0, 50, 260)

  // ============================================================
  // 💎 加载蝴蝶纹理
  // ============================================================
  const textureLoader = new THREE.TextureLoader()
  let butterflyTexture: THREE.Texture | null = null

  try {
    butterflyTexture = textureLoader.load('/images/hudie.jpg')
    butterflyTexture.colorSpace = THREE.SRGBColorSpace
  } catch (error) {
    console.warn('蝴蝶纹理加载失败，使用默认材质')
  }

  // ============================================================
  // ✨ 创建光子海（霓虹粒子）
  // ============================================================
  const photonGroup = new THREE.Group()
  scene.add(photonGroup)

  const photonGeometry = new THREE.BufferGeometry()
  const photonPositions = new Float32Array(config.photonParticles * 3)
  const photonColors = new Float32Array(config.photonParticles * 3)
  const photonSizes = new Float32Array(config.photonParticles)
  const photonPhases = new Float32Array(config.photonParticles)
  const photonLayers = new Float32Array(config.photonParticles)

  for (let i = 0; i < config.photonParticles; i++) {
    const layer = Math.floor(Math.random() * 5)
    photonLayers[i] = layer

    // 扩大光子分布范围，避免聚集
    const radius = 50 + Math.random() * 200
    const theta = Math.random() * Math.PI * 2
    const phi = (Math.random() - 0.5) * Math.PI * 0.9 // 限制纬度避免过度聚集

    photonPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    photonPositions[i * 3 + 1] = radius * Math.cos(phi) * 0.8
    photonPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

    // 霓虹色系
    const colorArray = [
      colors.neonPink,
      colors.electricBlue,
      colors.laserGreen,
      colors.violet,
      colors.goldOrange
    ]
    const baseColor = colorArray[layer]
    const hueShift = (Math.random() - 0.5) * 0.1
    const hsl: any = {}
    baseColor.getHSL(hsl)
    const color = new THREE.Color().setHSL(hsl.h! + hueShift, 0.9, 0.65)

    photonColors[i * 3] = color.r
    photonColors[i * 3 + 1] = color.g
    photonColors[i * 3 + 2] = color.b

    photonSizes[i] = 2 + Math.random() * 3
    photonPhases[i] = Math.random() * Math.PI * 2
  }

  photonGeometry.setAttribute('position', new THREE.BufferAttribute(photonPositions, 3))
  photonGeometry.setAttribute('color', new THREE.BufferAttribute(photonColors, 3))
  photonGeometry.setAttribute('size', new THREE.BufferAttribute(photonSizes, 1))
  photonGeometry.setAttribute('phase', new THREE.BufferAttribute(photonPhases, 1))
  photonGeometry.setAttribute('layer', new THREE.BufferAttribute(photonLayers, 1))
  // 添加 UV 坐标（纹理映射需要）
  const photonUVs = new Float32Array(config.photonParticles * 2)
  for (let i = 0; i < config.photonParticles; i++) {
    photonUVs[i * 2] = 0.5
    photonUVs[i * 2 + 1] = 0.5
  }
  photonGeometry.setAttribute('uv', new THREE.BufferAttribute(photonUVs, 2))

  // 创建霓虹粒子纹理
  const neonCanvas = document.createElement('canvas')
  neonCanvas.width = 64
  neonCanvas.height = 64
  const nCtx = neonCanvas.getContext('2d')!
  const nGradient = nCtx.createRadialGradient(32, 32, 0, 32, 32, 32)
  nGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  nGradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.9)')
  nGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)')
  nGradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.1)')
  nGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  nCtx.fillStyle = nGradient
  nCtx.fillRect(0, 0, 64, 64)
  const neonTexture = new THREE.CanvasTexture(neonCanvas)

  const photonMaterial = new THREE.PointsMaterial({
    size: 3,
    map: neonTexture,
    transparent: true,
    opacity: 0,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })

  const photons = new THREE.Points(photonGeometry, photonMaterial)
  photonGroup.add(photons)

  // ============================================================
  // 🌈 创建霓虹光带
  // ============================================================
  const ribbonGroup = new THREE.Group()
  scene.add(ribbonGroup)

  const ribbonGeometries: THREE.BufferGeometry[] = []
  const ribbonMaterials: THREE.LineBasicMaterial[] = []

  for (let i = 0; i < config.neonRibbons; i++) {
    const points: THREE.Vector3[] = []
    const segments = 80

    for (let j = 0; j <= segments; j++) {
      const t = j / segments
      const x = (t - 0.5) * 200
      const y = Math.sin(t * Math.PI * 2) * 40 + (i - config.neonRibbons / 2) * 12
      const z = Math.cos(t * Math.PI * 2) * 30 + Math.sin(t * Math.PI * 4) * 15
      points.push(new THREE.Vector3(x, y, z))
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    ribbonGeometries.push(geometry)

    // 霓虹色
    const colorArray = [
      colors.neonPink,
      colors.electricBlue,
      colors.laserGreen,
      colors.violet,
      colors.goldOrange
    ]
    const baseColor = colorArray[i % colorArray.length]
    const hsl: any = {}
    baseColor.getHSL(hsl)
    const color = new THREE.Color().setHSL(hsl.h! + i * 0.05, 0.95, 0.6)

    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    ribbonMaterials.push(material)

    const ribbon = new THREE.Line(geometry, material)
    ribbon.userData = {
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
      amplitude: 10 + Math.random() * 10
    }
    ribbonGroup.add(ribbon)
  }

  // ============================================================
  // ☁️ 创建星云云团（蝴蝶纹理）
  // ============================================================
  const nebulaGroup = new THREE.Group()
  scene.add(nebulaGroup)

  const nebulaGeometry = new THREE.PlaneGeometry(12, 12)
  // PlaneGeometry 自带 UV 坐标，无需手动添加
  const nebulaMaterials: THREE.MeshBasicMaterial[] = []

  for (let i = 0; i < config.nebulaClouds; i++) {
    // 渐变色
    const t = i / config.nebulaClouds
    let color: THREE.Color
    if (t < 0.25) {
      color = colors.neonPink.clone().lerp(colors.electricBlue, t * 4)
    } else if (t < 0.5) {
      color = colors.electricBlue.clone().lerp(colors.laserGreen, (t - 0.25) * 4)
    } else if (t < 0.75) {
      color = colors.laserGreen.clone().lerp(colors.violet, (t - 0.5) * 4)
    } else {
      color = colors.violet.clone().lerp(colors.goldOrange, (t - 0.75) * 4)
    }

    const material = new THREE.MeshBasicMaterial({
      map: butterflyTexture,
      color: color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    nebulaMaterials.push(material)

    const nebula = new THREE.Mesh(nebulaGeometry, material)

    // 分层分布：更广阔的空间分布
    const layerIndex = i % 5
    let radius: number
    if (layerIndex === 0) {
      radius = 60 + Math.random() * 40 // 内层
    } else if (layerIndex === 1) {
      radius = 110 + Math.random() * 50 // 中内层
    } else if (layerIndex === 2) {
      radius = 170 + Math.random() * 60 // 中层
    } else if (layerIndex === 3) {
      radius = 240 + Math.random() * 70 // 中外层
    } else {
      radius = 320 + Math.random() * 80 // 外层
    }

    const theta = Math.random() * Math.PI * 2
    const phi = (Math.random() - 0.5) * Math.PI * 0.8 // 限制纬度范围，避免过于聚集

    nebula.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    )
    nebula.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)

    nebula.userData = {
      phase: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.4,
      orbitSpeed: 0.001 + Math.random() * 0.002,
      baseRadius: radius,
      theta,
      phi
    }

    nebulaGroup.add(nebula)
  }

  // ============================================================
  // ☄️ 创建流星雨
  // ============================================================
  const meteorGroup = new THREE.Group()
  scene.add(meteorGroup)

  const meteorGeometry = new THREE.BufferGeometry()
  const meteorPositions = new Float32Array(config.meteorShower * 3)
  const meteorColors = new Float32Array(config.meteorShower * 3)
  const meteorSizes = new Float32Array(config.meteorShower)
  const meteorSpeeds = new Float32Array(config.meteorShower)

  for (let i = 0; i < config.meteorShower; i++) {
    // 扩大流星分布范围
    meteorPositions[i * 3] = (Math.random() - 0.5) * 400
    meteorPositions[i * 3 + 1] = Math.random() * 250
    meteorPositions[i * 3 + 2] = (Math.random() - 0.5) * 400

    // 随机霓虹色
    const colorArray = [
      colors.neonPink,
      colors.electricBlue,
      colors.laserGreen,
      colors.violet,
      colors.goldOrange
    ]
    const color = colorArray[Math.floor(Math.random() * colorArray.length)]

    meteorColors[i * 3] = color.r
    meteorColors[i * 3 + 1] = color.g
    meteorColors[i * 3 + 2] = color.b

    meteorSizes[i] = 1 + Math.random() * 2
    meteorSpeeds[i] = 8 + Math.random() * 12
  }

  meteorGeometry.setAttribute('position', new THREE.BufferAttribute(meteorPositions, 3))
  meteorGeometry.setAttribute('color', new THREE.BufferAttribute(meteorColors, 3))
  meteorGeometry.setAttribute('size', new THREE.BufferAttribute(meteorSizes, 1))
  // 添加 UV 坐标（纹理映射需要）
  const meteorUVs = new Float32Array(config.meteorShower * 2)
  for (let i = 0; i < config.meteorShower; i++) {
    meteorUVs[i * 2] = 0.5
    meteorUVs[i * 2 + 1] = 0.5
  }
  meteorGeometry.setAttribute('uv', new THREE.BufferAttribute(meteorUVs, 2))

  // 流星尾迹纹理
  const meteorCanvas = document.createElement('canvas')
  meteorCanvas.width = 64
  meteorCanvas.height = 128
  const mCtx = meteorCanvas.getContext('2d')!
  const mGradient = mCtx.createLinearGradient(0, 0, 0, 128)
  mGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
  mGradient.addColorStop(1, 'rgba(255, 255, 255, 1)')
  mCtx.fillStyle = mGradient
  mCtx.fillRect(0, 0, 64, 128)
  const meteorTexture = new THREE.CanvasTexture(meteorCanvas)

  const meteorMaterial = new THREE.PointsMaterial({
    size: 4,
    map: meteorTexture,
    transparent: true,
    opacity: 0,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })

  const meteors = new THREE.Points(meteorGeometry, meteorMaterial)
  meteorGroup.add(meteors)

  // ============================================================
  // 💫 创建光环脉冲
  // ============================================================
  const haloGroup = new THREE.Group()
  scene.add(haloGroup)

  const haloGeometries: THREE.RingGeometry[] = []
  const haloMaterials: THREE.MeshBasicMaterial[] = []
  const haloMeshes: THREE.Mesh[] = []

  for (let i = 0; i < config.haloPulses; i++) {
    const geometry = new THREE.RingGeometry(0, 1, 64)
    haloGeometries.push(geometry)

    // 渐变色
    const colorArray = [
      colors.neonPink,
      colors.electricBlue,
      colors.laserGreen,
      colors.violet,
      colors.goldOrange
    ]
    const baseColor = colorArray[i % colorArray.length]
    const hsl: any = {}
    baseColor.getHSL(hsl)
    const color = new THREE.Color().setHSL(hsl.h!, 0.9, 0.65)

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    haloMaterials.push(material)

    const halo = new THREE.Mesh(geometry, material)
    halo.rotation.x = Math.PI / 2
    halo.rotation.z = (i / config.haloPulses) * Math.PI
    halo.scale.set(0, 0, 1)
    haloGroup.add(halo)
    haloMeshes.push(halo)
  }

  // ============================================================
  // ✨ GSAP动画系统
  // ============================================================
  const allTweensArray: any[] = []
  let cameraTimeline: gsap.core.Timeline | null = null
  let cinematicTimeline: gsap.core.Timeline | null = null
  let fadeOutTimeline: gsap.core.Timeline | null = null
  let cleanupTimer: number | null = null
  let isCleaningUp = false

  // 相机运镜动画
  const playCameraAnimation = () => {
    cinematicTimeline = gsap.timeline({
      repeatDelay: 0.3,
      duration: 20,
      repeat: 0,
      onComplete: () => {
        console.log('[霓虹星云特效] 运镜动画完成，开始清理特效')
        clearEffect()
      }
    })

    // 角度1：俯视
    cinematicTimeline.to(
      camera.position,
      {
        x: 100,
        y: 150,
        z: 120,
        duration: 4,
        ease: 'power2.inOut'
      },
      0
    )

    // 角度2：侧面
    cinematicTimeline.to(
      camera.position,
      {
        x: -180,
        y: 60,
        z: 100,
        duration: 4,
        ease: 'power2.inOut'
      },
      4
    )

    // 角度3：底部仰视
    cinematicTimeline.to(
      camera.position,
      {
        x: 80,
        y: -140,
        z: 140,
        duration: 4,
        ease: 'power2.inOut'
      },
      8
    )

    // 角度4：环绕
    cinematicTimeline.to(
      camera.position,
      {
        x: -100,
        y: 100,
        z: 160,
        duration: 4,
        ease: 'power2.inOut'
      },
      12
    )

    // 角度5：回归正面
    cinematicTimeline.to(
      camera.position,
      {
        x: 0,
        y: 40,
        z: 180,
        duration: 4,
        ease: 'power2.inOut'
      },
      16
    )
  }

  // 停止运镜动画
  const stopCameraAnimation = () => {
    if (cameraTimeline) {
      cameraTimeline.kill()
      cameraTimeline = null
    }
    if (cinematicTimeline) {
      cinematicTimeline.kill()
      cinematicTimeline = null
    }
  }

  // 初始化GSAP呼吸动画
  const initGSAPAnimations = () => {
    // 光环脉冲动画循环
    haloMeshes.forEach((halo, i) => {
      const tween = gsap.to(halo.scale, {
        x: 180 + Math.random() * 60,
        y: 180 + Math.random() * 60,
        z: 1,
        duration: 5,
        delay: i * 0.8,
        ease: 'power1.out',
        repeat: -1,
        repeatDelay: 1.5,
        onRepeat: function () {
          halo.scale.set(0, 0, 1)
        },
        onStart: function () {
          if (Array.isArray(halo.material)) {
            halo.material[0].opacity = 0.5
          } else {
            halo.material.opacity = 0.5
          }
        },
        onUpdate: function () {
          const progress = this.progress()
          if (Array.isArray(halo.material)) {
            halo.material[0].opacity = 0.5 * (1 - progress * 0.85)
          } else {
            halo.material.opacity = 0.5 * (1 - progress * 0.85)
          }
        }
      })
      allTweensArray.push(tween)
    })
  }

  // 入场动画
  const playEntranceAnimation = () => {
    // 相机推近
    cameraTimeline = gsap.timeline()
    const t1 = gsap.from(camera.position, {
      x: 0,
      y: 50,
      z: 260,
      duration: 2.5,
      ease: 'power3.out'
    })
    allTweensArray.push(t1)

    // 光子海淡入
    const t2 = gsap.to(photonMaterial, {
      opacity: 0.85,
      duration: 2,
      ease: 'power2.out',
      delay: 0.3
    })
    allTweensArray.push(t2)

    // 霓虹光带淡入
    ribbonMaterials.forEach((mat, i) => {
      const t = gsap.to(mat, {
        opacity: 0.6 + Math.random() * 0.3,
        duration: 2,
        delay: 0.8 + i * 0.12,
        ease: 'power2.out'
      })
      allTweensArray.push(t)
    })

    // 星云云团淡入
    nebulaMaterials.forEach((mat, i) => {
      const t = gsap.to(mat, {
        opacity: 0.4 + Math.random() * 0.3,
        duration: 2,
        delay: 1.2 + i * 0.005,
        ease: 'power2.out'
      })
      allTweensArray.push(t)
    })

    // 流星雨淡入
    const t3 = gsap.to(meteorMaterial, {
      opacity: 0.7,
      duration: 2,
      ease: 'power2.out',
      delay: 1.5
    })
    allTweensArray.push(t3)

    // 2.5秒后启动运镜动画
    setTimeout(() => {
      playCameraAnimation()
    }, 2500)
  }

  // ============================================================
  // 🔄 动画循环
  // ============================================================
  const timer = new THREE.Timer()
  const originalPhotonPositions = photonPositions.slice()

  function animate() {
    renderer.setAnimationLoop(() => {
      const elapsed = timer.getElapsed()

      // 更新光子海
      const posAttr = photonGeometry.attributes.position as THREE.BufferAttribute

      for (let i = 0; i < config.photonParticles; i++) {
        const i3 = i * 3
        const layer = photonLayers[i]
        const phase = photonPhases[i]

        // 霓虹波浪运动
        let x = originalPhotonPositions[i3]
        let y = originalPhotonPositions[i3 + 1]
        let z = originalPhotonPositions[i3 + 2]

        // 螺旋运动
        const dist = Math.sqrt(x * x + z * z)
        const angle = Math.atan2(z, x)
        const speed = 0.015 + (5 - layer) * 0.003
        const newAngle = angle + speed

        x = Math.cos(newAngle) * dist
        z = Math.sin(newAngle) * dist

        // 垂直波浪
        y += Math.sin(elapsed * 2 + phase + layer * 0.5) * 0.5

        posAttr.array[i3] = x
        posAttr.array[i3 + 1] = y
        posAttr.array[i3 + 2] = z
      }

      posAttr.needsUpdate = true
      photonGroup.rotation.y += 0.0003

      // 更新霓虹光带
      ribbonGroup.children.forEach((ribbon: any, i) => {
        const data = ribbon.userData
        const positions = (ribbon.geometry as THREE.BufferGeometry).attributes.position
          .array as Float32Array

        for (let j = 0; j <= 80; j++) {
          const t = j / 80
          const baseX = (t - 0.5) * 200
          const baseY = Math.sin(t * Math.PI * 2) * 40 + (i - config.neonRibbons / 2) * 12
          const baseZ = Math.cos(t * Math.PI * 2) * 30 + Math.sin(t * Math.PI * 4) * 15

          // 霓虹波浪
          const wave = Math.sin(elapsed * data.speed * 2 + t * 10 + data.phase) * data.amplitude
          const wave2 = Math.cos(elapsed * data.speed * 1.5 + t * 8) * data.amplitude * 0.5

          positions[j * 3] = baseX + wave * 0.3
          positions[j * 3 + 1] = baseY + wave2
          positions[j * 3 + 2] = baseZ + wave * 0.2
        }

        ;(ribbon.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true

        // 脉冲透明度
        const pulse = Math.sin(elapsed * 3 + data.phase) * 0.5 + 0.5
        ribbon.material.opacity = 0.6 + pulse * 0.3
      })

      ribbonGroup.rotation.z += 0.001

      // 更新星云云团
      nebulaGroup.children.forEach((nebula: any) => {
        const data = nebula.userData

        // 轨道运动
        data.theta += data.orbitSpeed
        nebula.position.x = data.baseRadius * Math.sin(data.phi) * Math.cos(data.theta)
        nebula.position.z = data.baseRadius * Math.sin(data.phi) * Math.sin(data.theta)

        // 呼吸缩放
        const breathe = Math.sin(elapsed * data.speed + data.phase) * 0.5 + 0.5
        const scale = 0.8 + breathe * 0.4
        nebula.scale.set(scale, scale, scale)

        // 旋转
        nebula.rotation.x += 0.003
        nebula.rotation.y += 0.005
        nebula.rotation.z += 0.002

        // Billboard效果：始终朝向相机
        nebula.lookAt(camera.position)
      })

      // 更新流星雨（快速下落）
      const meteorPos = meteorGeometry.attributes.position as THREE.BufferAttribute

      for (let i = 0; i < config.meteorShower; i++) {
        const i3 = i * 3
        const speed = meteorSpeeds[i]

        meteorPos.array[i3 + 1] -= speed * 0.05

        // 循环重生
        if (meteorPos.array[i3 + 1] < -180) {
          meteorPos.array[i3 + 1] = 180
          meteorPos.array[i3] = (Math.random() - 0.5) * 400
          meteorPos.array[i3 + 2] = (Math.random() - 0.5) * 400
        }
      }

      meteorPos.needsUpdate = true

      // 相机轻微摆动
      camera.position.y += Math.sin(elapsed * 0.4) * 0.1

      renderer.render(scene, camera)
    })
  }

  // 初始化 GSAP 动画
  initGSAPAnimations()
  playEntranceAnimation()
  animate()

  // ============================================================
  // 📐 窗口自适应
  // ============================================================
  const handleResize = () => {
    const newWidth = container.clientWidth
    const newHeight = container.clientHeight

    camera.aspect = newWidth / newHeight
    camera.updateProjectionMatrix()

    renderer.setSize(newWidth, newHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
  }

  window.addEventListener('resize', handleResize)

  // ============================================================
  // 🧹 内部清理函数（实际执行清理）
  // ============================================================
  const performCleanup = () => {
    console.log('[霓虹星云特效] 执行清理流程')

    // 防止重复清理
    if (isCleaningUp) {
      console.log('[霓虹星云特效] 清理已在进行中，跳过')
      return
    }
    isCleaningUp = true

    // 清理定时器
    if (cleanupTimer) {
      clearTimeout(cleanupTimer)
      cleanupTimer = null
    }

    // 1. 停止所有GSAP动画（除了 fadeOutTimeline）
    allTweensArray.forEach(tween => {
      try {
        tween.kill()
      } catch (e) {}
    })

    // 2. 清理特定目标的tweens
    gsap.killTweensOf(photonMaterial)
    gsap.killTweensOf(photonMaterial, 'opacity')
    gsap.killTweensOf(meteorMaterial)

    // 清理霓虹光带材质的 tweens
    ribbonMaterials.forEach(mat => {
      gsap.killTweensOf(mat)
    })

    // 清理星云云团材质的 tweens
    nebulaMaterials.forEach(mat => {
      gsap.killTweensOf(mat)
    })

    // 清理光环材质和缩放的 tweens
    haloMaterials.forEach(mat => {
      gsap.killTweensOf(mat)
    })
    haloMeshes.forEach(halo => {
      gsap.killTweensOf(halo.scale)
    })

    // 3. 清理相机动画
    if (cameraTimeline) {
      cameraTimeline.kill()
      cameraTimeline = null
    }
    if (cinematicTimeline) {
      cinematicTimeline.kill()
      cinematicTimeline = null
    }

    // 4. 停止渲染循环
    renderer.setAnimationLoop(null)

    // 5. 移除事件监听器
    window.removeEventListener('resize', handleResize)

    // 6. 清理引用
    // (无需清理dummy引用)

    // 7. 从场景移除
    if (scene) {
      scene.remove(photonGroup)
      scene.remove(ribbonGroup)
      scene.remove(nebulaGroup)
      scene.remove(meteorGroup)
      scene.remove(haloGroup)
    }

    // 8. 释放几何体
    photonGeometry.dispose()
    ribbonGeometries.forEach(geo => geo.dispose())
    nebulaGeometry.dispose()
    meteorGeometry.dispose()
    haloGeometries.forEach(geo => geo.dispose())

    // 9. 释放材质
    photonMaterial.dispose()
    ribbonMaterials.forEach(mat => mat.dispose())
    nebulaMaterials.forEach(mat => mat.dispose())
    meteorMaterial.dispose()
    haloMaterials.forEach(mat => mat.dispose())

    // 10. 从容器移除
    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }

    // 11. 释放渲染器
    renderer.dispose()

    // 12. 清空引用
    if (butterflyTexture) {
      butterflyTexture.dispose()
      butterflyTexture = null
    }
    neonTexture.dispose()
    meteorTexture.dispose()

    // 清空所有引用
    allTweensArray.length = 0
    haloMeshes.length = 0

    console.log('[霓虹星云特效] 清理完成')
  }

  // ============================================================
  // 🧹 清除特效（淡出后清理）
  // ============================================================
  const clearEffect = () => {
    console.log('[霓虹星云特效] 开始淡出并清理特效')

    // 防止重复清理
    if (isCleaningUp) {
      console.log('[霓虹星云特效] 清理已在进行中')
      return
    }

    // 停止光环的循环动画
    haloMeshes.forEach(halo => {
      gsap.killTweensOf(halo.scale)
    })

    // 先淡出所有元素
    fadeOutTimeline = gsap.timeline({
      onComplete: () => {
        // 清理定时器
        if (cleanupTimer) {
          clearTimeout(cleanupTimer)
          cleanupTimer = null
        }
        // 淡出完成后执行完整清理
        performCleanup()
      }
    })

    // 淡出光子粒子
    fadeOutTimeline!.to(
      photonMaterial,
      {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      },
      0
    )

    // 淡出霓虹光带
    ribbonMaterials.forEach((mat, i) => {
      fadeOutTimeline!.to(
        mat,
        {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out'
        },
        0.2 + i * 0.05
      )
    })

    // 淡出星云云团
    nebulaMaterials.forEach((mat, i) => {
      fadeOutTimeline!.to(
        mat,
        {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out'
        },
        0.3 + i * 0.03
      )
    })

    // 淡出流星雨
    fadeOutTimeline!.to(
      meteorMaterial,
      {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      },
      0.4
    )

    // 淡出光环（同时将缩放也淡出为0）
    haloMaterials.forEach((mat, i) => {
      fadeOutTimeline!.to(
        mat,
        {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out'
        },
        0.5 + i * 0.05
      )
      fadeOutTimeline!.to(
        haloMeshes[i].scale,
        {
          x: 0,
          y: 0,
          z: 1,
          duration: 0.8,
          ease: 'power2.out'
        },
        0.5 + i * 0.05
      )
    })

    // 1.5秒后强制执行清理（作为备用方案）
    cleanupTimer = setTimeout(() => {
      performCleanup()
    }, 1500)
  }

  // ============================================================
  // 🧹 对外暴露的清理函数
  // ============================================================
  const cleanup = () => {
    performCleanup()
  }

  return { cleanup, clearEffect, stopCameraAnimation }
}
