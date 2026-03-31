// 量子极光织梦特效 (Quantum Aurora Dream Effect)
// 特性: 融合水晶节点、蝴蝶飞舞、钻石星光、极光光带的四层粒子系统 + 赛博极光配色 + 电影级运镜
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'

// 性能优化常量
const TIME_SCALE_FACTOR = 0.001

// 配置参数
export const quantumAuroraDreamEffectParams = {
  // 水晶节点层
  crystalCount: 12,
  crystalSize: 1.5,

  // 蝴蝶粒子层
  butterflyCount: 4000,
  butterflySize: 0.6,

  // 钻石粒子层
  diamondCount: 2500,
  diamondSize: 0.4,

  // 极光光带层
  auroraCurtains: 8,
  auroraSegments: 60,

  // 外观
  alpha: 0.9,
  alphaHash: true,

  // 运动
  rotationSpeed: 0.0003,
  autoRotate: true,
  colorCycleSpeed: 0.0004,

  // 性能
  updateInterval: 3
}

type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

interface CrystalData {
  baseRadius: number
  orbitAngle: number
  orbitSpeed: number
  orbitHeight: number
  orbitPhase: number
  baseSize: number
  hue: number
  rotationSpeed: number
}

interface ButterflyData {
  orbitRadius: number
  orbitAngle: number
  orbitSpeed: number
  orbitHeight: number
  orbitPhase: number
  baseSize: number
  hue: number
  layer: number
}

interface DiamondData {
  orbitRadius: number
  orbitAngle: number
  orbitSpeed: number
  orbitHeight: number
  orbitPhase: number
  baseSize: number
  hue: number
  twinkleSpeed: number
}

interface AuroraData {
  basePoints: THREE.Vector3[]
  phase: number
  speed: number
  amplitude: number
  hue: number
}

/**
 * 创建量子极光织梦特效
 * @param container - 容器元素
 * @returns 清理函数
 */
export const quantumAuroraDreamEffect = (container: HTMLElement) => {
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: WebGPURendererType | null = null
  let controls: OrbitControls | null = null

  // 四层粒子系统
  let crystalMesh: THREE.InstancedMesh | null = null
  let crystalMaterial: THREE.MeshStandardMaterial | null = null
  let butterflyMesh: THREE.InstancedMesh | null = null
  let butterflyMaterial: THREE.MeshBasicMaterial | null = null
  let diamondMesh: THREE.InstancedMesh | null = null
  let diamondMaterial: THREE.MeshBasicMaterial | null = null
  let auroraMeshes: THREE.Mesh[] = []
  let auroraMaterials: THREE.MeshBasicMaterial[] = []

  let crystals: CrystalData[] = []
  let butterflies: ButterflyData[] = []
  let diamonds: DiamondData[] = []
  let auroraCurtains: AuroraData[] = []

  let dummy: THREE.Object3D | null = new THREE.Object3D()
  let color: THREE.Color | null = new THREE.Color()
  let crystalTexture: THREE.Texture | null = null
  let butterflyTexture: THREE.Texture | null = null
  let diamondTexture: THREE.Texture | null = null

  // GSAP 动画对象
  let breatheState: { value: number } | null = { value: 1 }
  let pulseState: { value: number } | null = { value: 1 }
  let cameraTimeline: gsap.core.Timeline | null = null
  const allTweens: gsap.core.Tween[] = []

  let frameCount = 0

  const init = async () => {
    try {
      const width = container.clientWidth
      const height = container.clientHeight
      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
      camera.position.set(22, 15, 22)
      camera.lookAt(0, 0, 0)

      scene = new THREE.Scene()
      scene.background = null

      // 加载纹理
      const textureLoader = new THREE.TextureLoader()
      crystalTexture = await textureLoader.loadAsync('/images/shuijing1.jpg')
      crystalTexture.colorSpace = THREE.SRGBColorSpace
      butterflyTexture = await textureLoader.loadAsync('/images/hudie.jpg')
      butterflyTexture.colorSpace = THREE.SRGBColorSpace
      diamondTexture = await textureLoader.loadAsync('/images/zuanshi1.jpg')
      diamondTexture.colorSpace = THREE.SRGBColorSpace

      // ===== 第一层：水晶立方体（量子节点）=====
      const crystalGeometry = new THREE.BoxGeometry(
        quantumAuroraDreamEffectParams.crystalSize,
        quantumAuroraDreamEffectParams.crystalSize,
        quantumAuroraDreamEffectParams.crystalSize
      )
      crystalMaterial = new THREE.MeshStandardMaterial({
        map: crystalTexture,
        color: 0xffffff,
        alphaHash: quantumAuroraDreamEffectParams.alphaHash,
        opacity: quantumAuroraDreamEffectParams.alpha,
        roughness: 0.1,
        metalness: 0.9,
        envMapIntensity: 2.5,
        transparent: true
      })
      crystalMesh = new THREE.InstancedMesh(
        crystalGeometry,
        crystalMaterial,
        quantumAuroraDreamEffectParams.crystalCount
      )
      initCrystals()
      scene.add(crystalMesh)

      // ===== 第二层：蝴蝶粒子（灵性飞舞）=====
      const butterflyGeometry = new THREE.PlaneGeometry(
        quantumAuroraDreamEffectParams.butterflySize * 2,
        quantumAuroraDreamEffectParams.butterflySize
      )
      butterflyMaterial = new THREE.MeshBasicMaterial({
        map: butterflyTexture,
        color: 0xffffff,
        alphaHash: quantumAuroraDreamEffectParams.alphaHash,
        opacity: 0.85,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
      butterflyMesh = new THREE.InstancedMesh(
        butterflyGeometry,
        butterflyMaterial,
        quantumAuroraDreamEffectParams.butterflyCount
      )
      initButterflies()
      scene.add(butterflyMesh)

      // ===== 第三层：钻石粒子（星光闪烁）=====
      const diamondGeometry = new THREE.BoxGeometry(
        quantumAuroraDreamEffectParams.diamondSize,
        quantumAuroraDreamEffectParams.diamondSize,
        quantumAuroraDreamEffectParams.diamondSize
      )
      diamondMaterial = new THREE.MeshBasicMaterial({
        map: diamondTexture,
        color: 0xffffff,
        alphaHash: quantumAuroraDreamEffectParams.alphaHash,
        opacity: 0.9,
        transparent: true,
        blending: THREE.AdditiveBlending
      })
      diamondMesh = new THREE.InstancedMesh(
        diamondGeometry,
        diamondMaterial,
        quantumAuroraDreamEffectParams.diamondCount
      )
      initDiamonds()
      scene.add(diamondMesh)

      // ===== 第四层：极光光带（赛博流动）=====
      initAuroraCurtains()

      renderer = new THREE.WebGPURenderer({ antialias: false, alpha: true, samples: 1 })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
      renderer.setSize(width, height)
      renderer.setAnimationLoop(animate)
      container.appendChild(renderer.domElement)
      await renderer.init()

      const environment = new RoomEnvironment()
      const pmremGenerator = new THREE.PMREMGenerator(renderer)
      scene.environment = pmremGenerator.fromScene(environment, 0.04).texture
      environment.dispose()
      pmremGenerator.dispose()

      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.enableZoom = true
      controls.enablePan = false
      controls.minDistance = 5
      controls.maxDistance = 45

      initGSAPAnimations()
      playEntranceAnimation()
      console.log('[量子极光织梦]初始化完成')
    } catch (error) {
      console.error('[量子极光织梦]初始化失败:', error)
    }
  }

  // 初始化水晶立方体
  const initCrystals = () => {
    if (!crystalMesh) return

    for (let i = 0; i < quantumAuroraDreamEffectParams.crystalCount; i++) {
      const angle = (i / quantumAuroraDreamEffectParams.crystalCount) * Math.PI * 2
      const radius = 7 + Math.random() * 3

      crystals.push({
        baseRadius: radius,
        orbitAngle: angle,
        orbitSpeed: 0.0001 + Math.random() * 0.0002,
        orbitHeight: (Math.random() - 0.5) * 5,
        orbitPhase: Math.random() * Math.PI * 2,
        baseSize: 0.9 + Math.random() * 0.4,
        hue: 0.45 + (i / quantumAuroraDreamEffectParams.crystalCount) * 0.12,
        rotationSpeed: 0.001 + Math.random() * 0.002
      })

      const x = Math.cos(angle) * radius
      const y = crystals[i].orbitHeight
      const z = Math.sin(angle) * radius

      if (dummy) {
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(crystals[i].baseSize)
        dummy.updateMatrix()
        crystalMesh.setMatrixAt(i, dummy.matrix)
      }
      if (color) {
        color.setHSL(crystals[i].hue, 0.9, 0.65)
        crystalMesh.setColorAt(i, color)
      }
    }
    crystalMesh.instanceMatrix.needsUpdate = true
    if (crystalMesh.instanceColor) crystalMesh.instanceColor.needsUpdate = true
  }

  // 初始化蝴蝶粒子
  const initButterflies = () => {
    if (!butterflyMesh) return

    const layers = 4
    for (let i = 0; i < quantumAuroraDreamEffectParams.butterflyCount; i++) {
      const layer = Math.floor(Math.random() * layers)
      const t = i / quantumAuroraDreamEffectParams.butterflyCount

      butterflies.push({
        orbitRadius: 4 + layer * 2.5 + Math.random() * 2,
        orbitAngle: t * Math.PI * 2 * 4,
        orbitSpeed: 0.0004 + Math.random() * 0.0005,
        orbitHeight: (Math.random() - 0.5) * 10,
        orbitPhase: Math.random() * Math.PI * 2,
        baseSize: 0.4 + Math.random() * 0.8,
        hue: 0.5 + layer * 0.08 + Math.random() * 0.06,
        layer
      })

      const x = Math.cos(butterflies[i].orbitAngle) * butterflies[i].orbitRadius
      const y = butterflies[i].orbitHeight
      const z = Math.sin(butterflies[i].orbitAngle) * butterflies[i].orbitRadius

      if (dummy) {
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(butterflies[i].baseSize)
        dummy.rotation.set(0, 0, Math.random() * Math.PI * 2)
        dummy.updateMatrix()
        butterflyMesh.setMatrixAt(i, dummy.matrix)
      }
      if (color) {
        color.setHSL(butterflies[i].hue, 0.95, 0.7)
        butterflyMesh.setColorAt(i, color)
      }
    }
    butterflyMesh.instanceMatrix.needsUpdate = true
    if (butterflyMesh.instanceColor) butterflyMesh.instanceColor.needsUpdate = true
  }

  // 初始化钻石粒子
  const initDiamonds = () => {
    if (!diamondMesh) return

    const layers = 3
    for (let i = 0; i < quantumAuroraDreamEffectParams.diamondCount; i++) {
      const layer = Math.floor(Math.random() * layers)
      const t = i / quantumAuroraDreamEffectParams.diamondCount

      diamonds.push({
        orbitRadius: 2 + layer * 2 + Math.random() * 2,
        orbitAngle: t * Math.PI * 2 * 5,
        orbitSpeed: 0.0006 + Math.random() * 0.0008,
        orbitHeight: (Math.random() - 0.5) * 6,
        orbitPhase: Math.random() * Math.PI * 2,
        baseSize: 0.3 + Math.random() * 0.6,
        hue: 0.55 + layer * 0.1 + Math.random() * 0.07,
        twinkleSpeed: 0.5 + Math.random() * 1.5
      })

      const x = Math.cos(diamonds[i].orbitAngle) * diamonds[i].orbitRadius
      const y = diamonds[i].orbitHeight
      const z = Math.sin(diamonds[i].orbitAngle) * diamonds[i].orbitRadius

      if (dummy) {
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(diamonds[i].baseSize)
        dummy.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        )
        dummy.updateMatrix()
        diamondMesh.setMatrixAt(i, dummy.matrix)
      }
      if (color) {
        color.setHSL(diamonds[i].hue, 0.9, 0.8)
        diamondMesh.setColorAt(i, color)
      }
    }
    diamondMesh.instanceMatrix.needsUpdate = true
    if (diamondMesh.instanceColor) diamondMesh.instanceColor.needsUpdate = true
  }

  // 初始化极光光带
  const initAuroraCurtains = () => {
    if (!scene) return

    for (let i = 0; i < quantumAuroraDreamEffectParams.auroraCurtains; i++) {
      const curvePoints = []
      const segments = quantumAuroraDreamEffectParams.auroraSegments

      for (let j = 0; j <= segments; j++) {
        const t = j / segments
        const x = (t - 0.5) * 60
        const y =
          Math.sin(t * Math.PI) * 20 + (i - quantumAuroraDreamEffectParams.auroraCurtains / 2) * 5
        const z = Math.cos(t * Math.PI * 3) * 10
        curvePoints.push(new THREE.Vector3(x, y, z))
      }

      const curve = new THREE.CatmullRomCurve3(curvePoints)
      const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.3, 12, false)
      const auroraMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.55 + i * 0.05, 0.95, 0.6),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
      auroraMaterials.push(auroraMaterial)

      const curtain = new THREE.Mesh(tubeGeometry, auroraMaterial)
      auroraMeshes.push(curtain)
      scene.add(curtain)

      auroraCurtains.push({
        basePoints: curvePoints,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.3,
        amplitude: 2 + Math.random() * 2,
        hue: 0.55 + i * 0.05
      })
    }
  }

  // GSAP 动画初始化
  const initGSAPAnimations = () => {
    // 水晶呼吸动画
    if (breatheState) {
      gsap.to(breatheState, {
        value: 1.2,
        duration: 2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      })
    }

    // 钻石脉冲动画
    if (pulseState) {
      gsap.to(pulseState, {
        value: 1.4,
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      })
    }
  }

  // 播放电影级运镜动画
  const playCameraAnimation = () => {
    if (!camera) return

    const cam = camera

    cameraTimeline = gsap.timeline({
      onComplete: () => {
        console.log('[量子极光织梦]运镜动画完成，开始清理...')
        performCleanup()
      }
    })

    // 第一段：远景俯冲
    cameraTimeline.to(
      cam.position,
      {
        x: 30,
        y: 35,
        z: 30,
        duration: 4,
        ease: 'power2.inOut',
        onUpdate: () => cam.lookAt(0, 0, 0)
      },
      0
    )

    // 第二段：环绕左侧
    cameraTimeline.to(
      cam.position,
      {
        x: -25,
        y: 18,
        z: 20,
        duration: 4.5,
        ease: 'sine.inOut',
        onUpdate: () => cam.lookAt(0, 0, 0)
      },
      '>'
    )

    // 第三段：环绕右侧
    cameraTimeline.to(
      cam.position,
      {
        x: 25,
        y: 12,
        z: -22,
        duration: 4.5,
        ease: 'sine.inOut',
        onUpdate: () => cam.lookAt(0, 0, 0)
      },
      '>'
    )

    // 第四段：高空俯视
    cameraTimeline.to(
      cam.position,
      {
        x: 10,
        y: 40,
        z: 10,
        duration: 4,
        ease: 'power2.inOut',
        onUpdate: () => cam.lookAt(0, 0, 0)
      },
      '>'
    )

    // 第五段：穿越光子海
    cameraTimeline.to(
      cam.position,
      {
        x: 6,
        y: 6,
        z: 6,
        duration: 3,
        ease: 'expo.inOut',
        onUpdate: () => cam.lookAt(0, 0, 0)
      },
      '>'
    )

    // 第六段：缓慢拉远
    cameraTimeline.to(
      cam.position,
      {
        x: 22,
        y: 15,
        z: 22,
        duration: 5,
        ease: 'power4.out',
        onUpdate: () => cam.lookAt(0, 0, 0)
      },
      '>'
    )
  }

  // 入场动画
  const playEntranceAnimation = () => {
    if (!camera || !crystalMesh || !butterflyMesh || !diamondMesh) return

    const cam = camera

    // 相机从远处推近
    const t1 = gsap.from(cam.position, {
      x: 45,
      y: 40,
      z: 45,
      duration: 2.5,
      ease: 'power3.out',
      onUpdate: () => cam.lookAt(0, 0, 0),
      onComplete: () => {
        console.log('[量子极光织梦]入场动画完成，开始运镜...')
        playCameraAnimation()
      }
    })
    allTweens.push(t1)

    // 水晶弹入
    const t2 = gsap.from(crystalMesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 2.2,
      ease: 'back.out(1.7)'
    })
    allTweens.push(t2)

    // 蝴蝶扩散
    const t3 = gsap.from(butterflyMesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 2.4,
      ease: 'back.out(1.5)',
      delay: 0.15
    })
    allTweens.push(t3)

    // 钻石淡入
    const t4 = gsap.from(diamondMesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 2,
      ease: 'back.out(1.3)',
      delay: 0.3
    })
    allTweens.push(t4)
  }

  // 更新水晶
  const updateCrystals = (time: number) => {
    if (!crystalMesh) return
    const timeScale = time * TIME_SCALE_FACTOR
    const breathe = breatheState?.value || 1

    for (let i = 0; i < quantumAuroraDreamEffectParams.crystalCount; i++) {
      const c = crystals[i]
      const angle = c.orbitAngle + timeScale * c.orbitSpeed
      const waveY = Math.sin(timeScale * 0.4 + c.orbitPhase) * 1.2

      const x = Math.cos(angle) * c.baseRadius
      const y = c.orbitHeight + waveY
      const z = Math.sin(angle) * c.baseRadius

      if (dummy) {
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(c.baseSize * breathe)
        dummy.rotation.set(
          timeScale * c.rotationSpeed,
          timeScale * c.rotationSpeed * 0.8,
          timeScale * c.rotationSpeed * 1.2
        )
        dummy.updateMatrix()
        crystalMesh.setMatrixAt(i, dummy.matrix)
      }

      // 五段色相循环
      let h = c.hue + time * quantumAuroraDreamEffectParams.colorCycleSpeed * TIME_SCALE_FACTOR
      if (h > 1) h -= 1
      if (color) {
        color.setHSL(h, 0.9, 0.65)
        crystalMesh.setColorAt(i, color)
      }
    }
    crystalMesh.instanceMatrix.needsUpdate = true
    if (crystalMesh.instanceColor) crystalMesh.instanceColor.needsUpdate = true
  }

  // 更新蝴蝶（Billboard效果）
  const updateButterflies = (time: number) => {
    if (!butterflyMesh || !camera) return
    const timeScale = time * TIME_SCALE_FACTOR

    for (let i = 0; i < quantumAuroraDreamEffectParams.butterflyCount; i++) {
      const b = butterflies[i]
      const angle = b.orbitAngle + timeScale * b.orbitSpeed * (b.layer + 1)
      const waveX = Math.sin(timeScale * 0.6 + b.orbitPhase) * 0.8
      const waveY = Math.cos(timeScale * 0.4 + b.orbitPhase) * 1

      const x = Math.cos(angle) * b.orbitRadius + waveX
      const y = b.orbitHeight + waveY
      const z = Math.sin(angle) * b.orbitRadius

      if (dummy) {
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(b.baseSize)
        dummy.lookAt(camera.position)
        dummy.rotation.z = Math.sin(timeScale * 5 + b.orbitPhase) * 0.3
        dummy.updateMatrix()
        butterflyMesh.setMatrixAt(i, dummy.matrix)
      }

      // 色相循环
      let h =
        b.hue + time * quantumAuroraDreamEffectParams.colorCycleSpeed * TIME_SCALE_FACTOR * 1.2
      if (h > 1) h -= 1
      if (color) {
        color.setHSL(h, 0.95, 0.7)
        butterflyMesh.setColorAt(i, color)
      }
    }
    butterflyMesh.instanceMatrix.needsUpdate = true
    if (butterflyMesh.instanceColor) butterflyMesh.instanceColor.needsUpdate = true
  }

  // 更新钻石
  const updateDiamonds = (time: number) => {
    if (!diamondMesh) return
    const timeScale = time * TIME_SCALE_FACTOR
    const pulse = pulseState?.value || 1

    for (let i = 0; i < quantumAuroraDreamEffectParams.diamondCount; i++) {
      const d = diamonds[i]
      const angle = d.orbitAngle + timeScale * d.orbitSpeed * 2
      const twinkle = Math.sin(timeScale * d.twinkleSpeed * 10) * 0.5 + 0.5

      const x = Math.cos(angle) * d.orbitRadius
      const y = d.orbitHeight
      const z = Math.sin(angle) * d.orbitRadius

      if (dummy) {
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(d.baseSize * pulse * (0.7 + twinkle * 0.6))
        dummy.rotation.x += timeScale * d.twinkleSpeed * 2
        dummy.rotation.y += timeScale * d.twinkleSpeed * 1.5
        dummy.updateMatrix()
        diamondMesh.setMatrixAt(i, dummy.matrix)
      }

      // 闪烁色相
      let h =
        d.hue +
        twinkle * 0.1 +
        time * quantumAuroraDreamEffectParams.colorCycleSpeed * TIME_SCALE_FACTOR * 1.5
      if (h > 1) h -= 1
      if (color) {
        color.setHSL(h, 0.9, 0.8 + twinkle * 0.2)
        diamondMesh.setColorAt(i, color)
      }
    }
    diamondMesh.instanceMatrix.needsUpdate = true
    if (diamondMesh.instanceColor) diamondMesh.instanceColor.needsUpdate = true
  }

  // 更新极光光带
  const updateAuroraCurtains = (time: number) => {
    const timeScale = time * TIME_SCALE_FACTOR

    auroraCurtains.forEach((aurora, i) => {
      if (auroraMeshes[i]) {
        // 波浪运动
        const wave = Math.sin(timeScale * aurora.speed + aurora.phase) * aurora.amplitude
        auroraMeshes[i].position.y = wave * 0.5
        auroraMeshes[i].rotation.z = Math.sin(timeScale * 0.5 + i) * 0.15

        // 色相循环
        let h =
          aurora.hue + time * quantumAuroraDreamEffectParams.colorCycleSpeed * TIME_SCALE_FACTOR
        if (h > 1) h -= 1
        auroraMaterials[i].color.setHSL(h, 0.95, 0.6)
      }
    })
  }

  const animate = (time: number) => {
    frameCount++

    if (quantumAuroraDreamEffectParams.autoRotate) {
      if (crystalMesh) crystalMesh.rotation.y += quantumAuroraDreamEffectParams.rotationSpeed
      if (butterflyMesh)
        butterflyMesh.rotation.y -= quantumAuroraDreamEffectParams.rotationSpeed * 1.8
      if (diamondMesh) diamondMesh.rotation.y += quantumAuroraDreamEffectParams.rotationSpeed * 2.2
    }

    // 降频更新
    if (frameCount % quantumAuroraDreamEffectParams.updateInterval === 0) {
      updateCrystals(time)
      updateButterflies(time)
      updateDiamonds(time)
    }

    // 极光光带每帧更新
    updateAuroraCurtains(time)

    if (controls) controls.update()
    if (renderer && scene && camera) renderer.render(scene, camera)
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

  // 停止运镜动画
  const stopCameraAnimation = () => {
    if (cameraTimeline) {
      cameraTimeline.kill()
      cameraTimeline = null
      console.log('[量子极光织梦]运镜动画已停止')
    }
  }

  // 执行完整的淡出清理
  const performCleanup = () => {
    console.log('[量子极光织梦]开始淡出清理...')

    stopCameraAnimation()

    const fadeOutTimeline = gsap.timeline({
      onComplete: () => {
        console.log('[量子极光织梦]淡出完成，执行最终清理...')
        cleanupImmediate()
      }
    })

    // 所有元素淡出
    if (crystalMaterial) {
      fadeOutTimeline.to(crystalMaterial, { opacity: 0, duration: 1.5, ease: 'power2.inOut' }, 0)
    }
    if (butterflyMaterial) {
      fadeOutTimeline.to(butterflyMaterial, { opacity: 0, duration: 1.5, ease: 'power2.inOut' }, 0)
    }
    if (diamondMaterial) {
      fadeOutTimeline.to(diamondMaterial, { opacity: 0, duration: 1.5, ease: 'power2.inOut' }, 0)
    }
    auroraMaterials.forEach((material, index) => {
      fadeOutTimeline.to(material, { opacity: 0, duration: 1.5, ease: 'power2.inOut' }, 0)
    })

    // 所有粒子缩小
    if (crystalMesh) {
      fadeOutTimeline.to(
        crystalMesh.scale,
        { x: 0.01, y: 0.01, z: 0.01, duration: 1.5, ease: 'back.in(1.7)' },
        0
      )
    }
    if (butterflyMesh) {
      fadeOutTimeline.to(
        butterflyMesh.scale,
        { x: 0.01, y: 0.01, z: 0.01, duration: 1.5, ease: 'back.in(1.5)' },
        0
      )
    }
    if (diamondMesh) {
      fadeOutTimeline.to(
        diamondMesh.scale,
        { x: 0.01, y: 0.01, z: 0.01, duration: 1.5, ease: 'back.in(1.3)' },
        0
      )
    }

    // 相机拉远
    if (camera) {
      const cam = camera
      fadeOutTimeline.to(
        cam.position,
        {
          x: 50,
          y: 50,
          z: 50,
          duration: 1.5,
          ease: 'power2.inOut',
          onUpdate: () => cam.lookAt(0, 0, 0)
        },
        0
      )
    }
  }

  // 立即清理（不包含淡出动画）
  const cleanupImmediate = () => {
    try {
      allTweens.forEach(t => {
        if (t?.kill) t.kill()
      })
      allTweens.length = 0

      if (camera) {
        gsap.killTweensOf(camera.position)
        gsap.killTweensOf(camera.rotation)
      }
      if (crystalMesh) {
        gsap.killTweensOf(crystalMesh.scale)
        gsap.killTweensOf(crystalMesh.rotation)
      }
      if (butterflyMesh) {
        gsap.killTweensOf(butterflyMesh.scale)
        gsap.killTweensOf(butterflyMesh.rotation)
      }
      if (diamondMesh) {
        gsap.killTweensOf(diamondMesh.scale)
        gsap.killTweensOf(diamondMesh.rotation)
      }
      if (crystalMaterial) gsap.killTweensOf(crystalMaterial)
      if (butterflyMaterial) gsap.killTweensOf(butterflyMaterial)
      if (diamondMaterial) gsap.killTweensOf(diamondMaterial)
      if (breatheState) gsap.killTweensOf(breatheState)
      if (pulseState) gsap.killTweensOf(pulseState)

      if (renderer) renderer.setAnimationLoop(null)
      window.removeEventListener('resize', handleResize)

      dummy = null
      color = null
      breatheState = null
      pulseState = null

      if (scene) {
        if (crystalMesh) scene.remove(crystalMesh)
        if (butterflyMesh) scene.remove(butterflyMesh)
        if (diamondMesh) scene.remove(diamondMesh)
        auroraMeshes.forEach(mesh => scene.remove(mesh))
      }

      if (crystalMesh) {
        crystalMesh.geometry?.dispose()
        if (crystalMesh.material instanceof THREE.Material) crystalMesh.material.dispose()
      }
      if (butterflyMesh) {
        butterflyMesh.geometry?.dispose()
        if (butterflyMesh.material instanceof THREE.Material) butterflyMesh.material.dispose()
      }
      if (diamondMesh) {
        diamondMesh.geometry?.dispose()
        if (diamondMesh.material instanceof THREE.Material) diamondMesh.material.dispose()
      }
      auroraMeshes.forEach((mesh, i) => {
        mesh.geometry?.dispose()
        auroraMaterials[i]?.dispose()
      })

      if (crystalTexture) {
        crystalTexture.dispose()
        crystalTexture = null
      }
      if (butterflyTexture) {
        butterflyTexture.dispose()
        butterflyTexture = null
      }
      if (diamondTexture) {
        diamondTexture.dispose()
        diamondTexture = null
      }

      if (renderer?.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      renderer?.dispose()

      scene = null
      camera = null
      renderer = null
      controls = null
      crystalMesh = null
      crystalMaterial = null
      butterflyMesh = null
      butterflyMaterial = null
      diamondMesh = null
      diamondMaterial = null
      auroraMeshes = []
      auroraMaterials = []
      crystals = []
      butterflies = []
      diamonds = []
      auroraCurtains = []

      console.log('[量子极光织梦]清理完成')
    } catch (error) {
      console.error('清理[量子极光织梦]时出错:', error)
    }
  }

  // 公开的清理函数（带淡出效果）
  const clearEffect = () => {
    console.log('[量子极光织梦]调用 clearEffect（淡出清理）')
    performCleanup()
  }

  // 向后兼容的立即清理函数
  const cleanup = () => {
    console.log('[量子极光织梦]调用 cleanup（立即清理）')
    cleanupImmediate()
  }

  window.addEventListener('resize', handleResize)
  init()

  // 返回控制器对象（支持新旧两种格式）
  return {
    cleanup,
    clearEffect,
    stopCameraAnimation
  }
}
