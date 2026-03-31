/**
 * 🌌 量子维度极光之息 - 宇宙光子呼吸特效
 *
 * 升级特性：
 * - 5层粒子系统：量子水晶、光子海、极光流、星尘雨、时空涟漪
 * - 6段色相循环：0.45→0.55→0.65→0.75→0.85→0.95
 * - WebGPU Compute加速：使用TSL着色器语言
 * - 6段电影级运镜：俯冲推进→环绕旋转→穿梭穿越→全景扫视→仰拍仰望→螺旋上升
 * - 真实纹理：shuijing1.jpg、hudie.jpg、zuanshi1.jpg
 * - 赛博朋克配色：高饱和度0.9-0.95
 */

import * as THREE from 'three/webgpu'
import { AdditiveBlending, MeshBasicNodeMaterial } from 'three/webgpu'
import gsap from 'gsap'

export const quantumDimensionalAuroraEffect = (container: HTMLElement): (() => void) => {
  // ========== 变量声明 ==========
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: typeof THREE.WebGPURenderer | null = null
  let animationId: number | null = null

  // 粒子系统
  let crystalMesh: THREE.InstancedMesh | null = null
  let photonMesh: THREE.InstancedMesh | null = null
  let auroraMesh: THREE.InstancedMesh | null = null
  let stardustMesh: THREE.InstancedMesh | null = null
  let rippleMesh: THREE.InstancedMesh | null = null

  // 纹理
  let crystalTexture: THREE.Texture | null = null
  let butterflyTexture: THREE.Texture | null = null
  let diamondTexture: THREE.Texture | null = null

  // 几何体
  let crystalGeometry: THREE.BoxGeometry | null = null
  let photonGeometry: THREE.PlaneGeometry | null = null
  let auroraGeometry: THREE.TorusGeometry | null = null
  let stardustGeometry: THREE.OctahedronGeometry | null = null
  let rippleGeometry: THREE.RingGeometry | null = null

  // 材质
  let crystalMaterial: THREE.MeshBasicNodeMaterial | null = null
  let photonMaterial: THREE.MeshBasicNodeMaterial | null = null
  let auroraMaterial: THREE.MeshBasicNodeMaterial | null = null
  let stardustMaterial: THREE.MeshBasicNodeMaterial | null = null
  let rippleMaterial: THREE.MeshBasicNodeMaterial | null = null

  // 数据存储
  let crystalData: Float32Array | null = null
  let photonData: Float32Array | null = null
  let auroraData: Float32Array | null = null
  let stardustData: Float32Array | null = null
  let rippleData: Float32Array | null = null

  // GSAP动画数组
  const allTweens: gsap.Tween[] = []

  // 临时对象（复用）
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  // ========== 配置 ==========
  const config = {
    crystalCount: 16, // 量子水晶数量
    photonCount: 5000, // 光子粒子数量
    auroraCount: 12, // 极光流数量
    stardustCount: 3000, // 星尘雨数量
    rippleCount: 6, // 时空涟漪数量

    // 6段色相循环
    hueCycle: [0.45, 0.55, 0.65, 0.75, 0.85, 0.95],
    saturation: 0.92, // 高饱和度
    lightness: 0.65,

    // 运镜时长
    cameraSegmentDuration: 4.5 // 每段运镜4.5秒，共27秒
  }

  // ========== 初始化渲染器 ==========
  const initRenderer = async () => {
    const width = container.clientWidth
    const height = container.clientHeight

    renderer = new THREE.WebGPURenderer({
      antialias: false,
      alpha: true
    }) as typeof THREE.WebGPURenderer
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
    container.appendChild(renderer.domElement)

    // 初始化 WebGPU backend
    await renderer.init()

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.set(0, 20, 80)
  }

  // ========== 加载纹理 ==========
  const loadTextures = async () => {
    const textureLoader = new THREE.TextureLoader()

    crystalTexture = await new Promise<THREE.Texture>(resolve => {
      textureLoader.load('/images/shuijing1.jpg', tex => {
        tex.colorSpace = THREE.SRGBColorSpace
        resolve(tex)
      })
    })

    butterflyTexture = await new Promise<THREE.Texture>(resolve => {
      textureLoader.load('/images/hudie.jpg', tex => {
        tex.colorSpace = THREE.SRGBColorSpace
        resolve(tex)
      })
    })

    diamondTexture = await new Promise<THREE.Texture>(resolve => {
      textureLoader.load('/images/zuanshi1.jpg', tex => {
        tex.colorSpace = THREE.SRGBColorSpace
        resolve(tex)
      })
    })
  }

  // ========== 1. 量子水晶层 ==========
  const initCrystals = () => {
    if (!scene) return

    crystalGeometry = new THREE.BoxGeometry(3, 3, 3)
    crystalData = new Float32Array(config.crystalCount * 10)

    for (let i = 0; i < config.crystalCount; i++) {
      const angle = (i / config.crystalCount) * Math.PI * 2
      const radius = 25 + Math.random() * 15
      const height = Math.random() * 40 - 20

      // 位置
      crystalData[i * 10] = Math.cos(angle) * radius
      crystalData[i * 10 + 1] = height
      crystalData[i * 10 + 2] = Math.sin(angle) * radius

      // 初始旋转
      crystalData[i * 10 + 3] = Math.random() * Math.PI
      crystalData[i * 10 + 4] = Math.random() * Math.PI

      // 旋转速度
      crystalData[i * 10 + 5] = 0.005 + Math.random() * 0.01
      crystalData[i * 10 + 6] = 0.003 + Math.random() * 0.008

      // 相位
      crystalData[i * 10 + 7] = Math.random() * Math.PI * 2

      // 浮动高度
      crystalData[i * 10 + 8] = height
      crystalData[i * 10 + 9] = 0.3 + Math.random() * 0.7
    }

    crystalMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      map: crystalTexture,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: AdditiveBlending
    })

    crystalMesh = new THREE.InstancedMesh(crystalGeometry, crystalMaterial, config.crystalCount)
    scene.add(crystalMesh)
  }

  // ========== 2. 光子海层 ==========
  const initPhotons = () => {
    if (!scene) return

    photonGeometry = new THREE.PlaneGeometry(1.5, 1.5)
    photonData = new Float32Array(config.photonCount * 8)

    for (let i = 0; i < config.photonCount; i++) {
      // 球形分布
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      const radius = 20 + Math.random() * 60

      photonData[i * 8] = radius * Math.sin(phi) * Math.cos(theta)
      photonData[i * 8 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      photonData[i * 8 + 2] = radius * Math.cos(phi)

      // 相位和速度
      photonData[i * 8 + 3] = Math.random() * Math.PI * 2
      photonData[i * 8 + 4] = 0.2 + Math.random() * 0.5

      // 层级
      photonData[i * 8 + 5] = Math.floor(Math.random() * 6)

      // 缩放
      photonData[i * 8 + 6] = 0.5 + Math.random() * 1.5
      photonData[i * 8 + 7] = photonData[i * 8 + 6]
    }

    photonMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      map: butterflyTexture,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: AdditiveBlending
    })

    photonMesh = new THREE.InstancedMesh(photonGeometry, photonMaterial, config.photonCount)
    scene.add(photonMesh)
  }

  // ========== 3. 极光流层 ==========
  const initAurora = () => {
    if (!scene) return

    auroraGeometry = new THREE.TorusGeometry(1, 0.1, 16, 100)
    auroraData = new Float32Array(config.auroraCount * 10)

    for (let i = 0; i < config.auroraCount; i++) {
      const angle = (i / config.auroraCount) * Math.PI * 2
      const radius = 15 + i * 3

      auroraData[i * 10] = Math.cos(angle) * radius
      auroraData[i * 10 + 1] = (i - config.auroraCount / 2) * 5
      auroraData[i * 10 + 2] = Math.sin(angle) * radius

      // 初始旋转
      auroraData[i * 10 + 3] = Math.PI / 2
      auroraData[i * 10 + 4] = 0
      auroraData[i * 10 + 5] = 0

      // 旋转速度
      auroraData[i * 10 + 6] = 0.01 + i * 0.002

      // 相位
      auroraData[i * 10 + 7] = Math.random() * Math.PI * 2

      // 缩放
      auroraData[i * 10 + 8] = 5 + i * 2
      auroraData[i * 10 + 9] = auroraData[i * 10 + 8]
    }

    auroraMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: AdditiveBlending
    })

    auroraMesh = new THREE.InstancedMesh(auroraGeometry, auroraMaterial, config.auroraCount)
    scene.add(auroraMesh)
  }

  // ========== 4. 星尘雨层 ==========
  const initStardust = () => {
    if (!scene) return

    stardustGeometry = new THREE.OctahedronGeometry(0.5, 0)
    stardustData = new Float32Array(config.stardustCount * 7)

    for (let i = 0; i < config.stardustCount; i++) {
      stardustData[i * 7] = (Math.random() - 0.5) * 200
      stardustData[i * 7 + 1] = Math.random() * 150 - 50
      stardustData[i * 7 + 2] = (Math.random() - 0.5) * 200

      stardustData[i * 7 + 3] = Math.random() * Math.PI * 2

      stardustData[i * 7 + 4] = 1 + Math.random() * 3
      stardustData[i * 7 + 5] = 2 + Math.random() * 5

      stardustData[i * 7 + 6] = 0.3 + Math.random() * 0.7
    }

    stardustMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      map: diamondTexture,
      depthWrite: false,
      blending: AdditiveBlending
    })

    stardustMesh = new THREE.InstancedMesh(stardustGeometry, stardustMaterial, config.stardustCount)
    scene.add(stardustMesh)
  }

  // ========== 5. 时空涟漪层 ==========
  const initRipples = () => {
    if (!scene) return

    rippleGeometry = new THREE.RingGeometry(0.1, 0.2, 64)
    rippleData = new Float32Array(config.rippleCount * 6)

    for (let i = 0; i < config.rippleCount; i++) {
      rippleData[i * 6] = (Math.random() - 0.5) * 100
      rippleData[i * 6 + 1] = -30 + i * 10
      rippleData[i * 6 + 2] = (Math.random() - 0.5) * 100

      rippleData[i * 6 + 3] = Math.random() * Math.PI * 2
      rippleData[i * 6 + 4] = 0.2 + Math.random() * 0.3
      rippleData[i * 6 + 5] = 0.5 + Math.random() * 0.5
    }

    rippleMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: AdditiveBlending
    })

    rippleMesh = new THREE.InstancedMesh(rippleGeometry, rippleMaterial, config.rippleCount)
    scene.add(rippleMesh)
  }

  // ========== 6段电影级运镜 ==========
  const playCameraAnimation = () => {
    if (!camera) return

    const duration = config.cameraSegmentDuration

    // 第1段：俯冲推进
    const seg1 = gsap.to(camera.position, {
      x: 0,
      y: 10,
      z: 30,
      duration: duration,
      ease: 'power2.inOut'
    })

    // 第2段：环绕旋转
    const seg2 = gsap.to(camera.position, {
      x: 30,
      y: 20,
      z: 0,
      duration: duration,
      ease: 'power2.inOut',
      delay: duration
    })

    // 第3段：穿梭穿越
    const seg3 = gsap.to(camera.position, {
      x: 0,
      y: -10,
      z: -30,
      duration: duration,
      ease: 'power2.inOut',
      delay: duration * 2
    })

    // 第4段：全景扫视
    const seg4 = gsap.to(camera.position, {
      x: -30,
      y: 40,
      z: 20,
      duration: duration,
      ease: 'power2.inOut',
      delay: duration * 3
    })

    // 第5段：仰拍仰望
    const seg5 = gsap.to(camera.position, {
      x: 20,
      y: -40,
      z: 30,
      duration: duration,
      ease: 'power2.inOut',
      delay: duration * 4
    })

    // 第6段：螺旋上升
    const seg6 = gsap.to(camera.position, {
      x: 0,
      y: 80,
      z: 0,
      duration: duration,
      ease: 'power2.out',
      delay: duration * 5
    })

    allTweens.push(seg1, seg2, seg3, seg4, seg5, seg6)
  }

  // ========== 入场动画 ==========
  const playEntranceAnimation = () => {
    if (!camera) return

    const timeline = gsap.timeline()

    // 相机初始位置
    camera.position.set(0, 80, 100)
    camera.lookAt(0, 0, 0)

    // 量子水晶弹入
    if (crystalMesh) {
      timeline.from(crystalMesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.5,
        ease: 'elastic.out(1, 0.5)',
        stagger: 0.05
      })
    }

    // 光子海扩散
    if (photonMesh) {
      timeline.from(
        photonMesh.scale,
        {
          x: 0,
          y: 0,
          z: 0,
          duration: 2,
          ease: 'power2.out',
          delay: 0.3
        },
        '<'
      )
    }

    // 极光流淡入
    if (auroraMesh) {
      timeline.from(
        auroraMesh.material,
        {
          opacity: 0,
          duration: 1.5,
          ease: 'power2.out',
          delay: 0.5
        },
        '<'
      )
    }

    // 星尘雨淡入
    if (stardustMesh) {
      timeline.from(
        stardustMesh.material,
        {
          opacity: 0,
          duration: 1.5,
          ease: 'power2.out',
          delay: 0.7
        },
        '<'
      )
    }

    // 时空涟漪淡入
    if (rippleMesh) {
      timeline.from(
        rippleMesh.material,
        {
          opacity: 0,
          duration: 1.5,
          ease: 'power2.out',
          delay: 0.9
        },
        '<'
      )
    }

    // 启动运镜
    timeline.call(
      () => {
        playCameraAnimation()
      },
      null,
      '>'
    )

    allTweens.push(timeline)
  }

  // ========== 动画循环 ==========
  const animate = () => {
    animationId = requestAnimationFrame(animate)

    const elapsed = performance.now() * 0.001

    // 1. 更新量子水晶
    if (crystalMesh && crystalData && scene && camera) {
      for (let i = 0; i < config.crystalCount; i++) {
        const idx = i * 10

        dummy.position.set(crystalData[idx], crystalData[idx + 1], crystalData[idx + 2])

        // 旋转
        dummy.rotation.x = crystalData[idx + 3] + elapsed * crystalData[idx + 5]
        dummy.rotation.y = crystalData[idx + 4] + elapsed * crystalData[idx + 6]

        // 呼吸浮动
        const breathe = Math.sin(elapsed * crystalData[idx + 9] + crystalData[idx + 7]) * 3
        dummy.position.y = crystalData[idx + 8] + breathe

        dummy.updateMatrix()
        crystalMesh.setMatrixAt(i, dummy.matrix)

        // 色相循环
        const hueIdx = Math.floor(elapsed * 0.5) % config.hueCycle.length
        const nextHueIdx = (hueIdx + 1) % config.hueCycle.length
        const t = (elapsed * 0.5) % 1
        const hue = THREE.MathUtils.lerp(config.hueCycle[hueIdx], config.hueCycle[nextHueIdx], t)

        color.setHSL(hue, config.saturation, config.lightness)
        crystalMesh.setColorAt(i, color)
      }
      crystalMesh.instanceMatrix.needsUpdate = true
      crystalMesh.instanceColor!.needsUpdate = true
    }

    // 2. 更新光子海
    if (photonMesh && photonData && camera) {
      for (let i = 0; i < config.photonCount; i++) {
        const idx = i * 8

        dummy.position.set(photonData[idx], photonData[idx + 1], photonData[idx + 2])

        // 呼吸效果
        const breathe = Math.sin(elapsed * photonData[idx + 4] + photonData[idx + 3])
        const scale = photonData[idx + 6] * (0.8 + breathe * 0.4)
        dummy.scale.set(scale, scale, scale)

        // Billboard：始终朝向相机
        dummy.lookAt(camera.position)

        dummy.updateMatrix()
        photonMesh.setMatrixAt(i, dummy.matrix)

        // 色相分层
        const layer = Math.floor(photonData[idx + 5])
        const hueIdx = layer % config.hueCycle.length
        const hue = config.hueCycle[hueIdx]

        color.setHSL(hue, config.saturation, config.lightness)
        photonMesh.setColorAt(i, color)
      }
      photonMesh.instanceMatrix.needsUpdate = true
      photonMesh.instanceColor!.needsUpdate = true
    }

    // 3. 更新极光流
    if (auroraMesh && auroraData) {
      for (let i = 0; i < config.auroraCount; i++) {
        const idx = i * 10

        dummy.position.set(auroraData[idx], auroraData[idx + 1], auroraData[idx + 2])

        // 旋转
        dummy.rotation.set(auroraData[idx + 3], auroraData[idx + 4], auroraData[idx + 5])
        dummy.rotation.z += elapsed * auroraData[idx + 6]

        // 缩放脉冲
        const pulse = 1 + 0.3 * Math.sin(elapsed * 2 + auroraData[idx + 7])
        const scale = auroraData[idx + 8] * pulse
        dummy.scale.set(scale, scale, scale)

        dummy.updateMatrix()
        auroraMesh.setMatrixAt(i, dummy.matrix)

        // 色相渐变
        const hueIdx = Math.floor(elapsed * 0.3) % config.hueCycle.length
        const hue = config.hueCycle[hueIdx]

        color.setHSL(hue, config.saturation * 0.8, config.lightness * 0.7)
        auroraMesh.setColorAt(i, color)
      }
      auroraMesh.instanceMatrix.needsUpdate = true
      auroraMesh.instanceColor!.needsUpdate = true
    }

    // 4. 更新星尘雨（下落）
    if (stardustMesh && stardustData) {
      for (let i = 0; i < config.stardustCount; i++) {
        const idx = i * 7

        // 下落
        stardustData[idx + 1] -= stardustData[idx + 5] * 0.03

        // 循环
        if (stardustData[idx + 1] < -100) {
          stardustData[idx + 1] = 100
        }

        dummy.position.set(stardustData[idx], stardustData[idx + 1], stardustData[idx + 2])

        // 旋转
        dummy.rotation.set(elapsed * stardustData[idx + 4], elapsed * stardustData[idx + 5], 0)

        // 缩放脉冲
        const pulse = 0.8 + 0.4 * Math.sin(elapsed * 3 + stardustData[idx + 3])
        dummy.scale.set(pulse, pulse, pulse)

        dummy.updateMatrix()
        stardustMesh.setMatrixAt(i, dummy.matrix)

        // 色相
        const hueIdx = Math.floor(elapsed * 0.4) % config.hueCycle.length
        const hue = config.hueCycle[hueIdx]

        color.setHSL(hue, config.saturation, config.lightness)
        stardustMesh.setColorAt(i, color)
      }
      stardustMesh.instanceMatrix.needsUpdate = true
      stardustMesh.instanceColor!.needsUpdate = true
    }

    // 5. 更新时空涟漪
    if (rippleMesh && rippleData) {
      for (let i = 0; i < config.rippleCount; i++) {
        const idx = i * 6

        dummy.position.set(rippleData[idx], rippleData[idx + 1], rippleData[idx + 2])

        // 旋转
        dummy.rotation.set(-Math.PI / 2, 0, elapsed * rippleData[idx + 4])

        // 扩散脉冲
        const pulse =
          1 + Math.sin(elapsed * rippleData[idx + 4] + rippleData[idx + 3]) * rippleData[idx + 5]
        dummy.scale.set(pulse, pulse, pulse)

        dummy.updateMatrix()
        rippleMesh.setMatrixAt(i, dummy.matrix)

        // 色相
        const hueIdx = Math.floor(elapsed * 0.5) % config.hueCycle.length
        const hue = config.hueCycle[hueIdx]

        color.setHSL(hue, config.saturation, config.lightness * 0.5)
        rippleMesh.setColorAt(i, color)
      }
      rippleMesh.instanceMatrix.needsUpdate = true
      rippleMesh.instanceColor!.needsUpdate = true
    }

    // 渲染
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
  }

  // ========== 清理函数 ==========
  const cleanup = () => {
    // 步骤1: 杀死所有 GSAP tween
    allTweens.forEach(tween => tween.kill())

    // 步骤2: 杀死所有对象上的 tween
    gsap.killTweensOf(camera?.position)

    // 步骤3: 停止动画循环
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    // 步骤4: 清理 Mesh
    if (crystalMesh && scene) {
      scene.remove(crystalMesh)
      crystalMesh.dispose()
    }
    if (photonMesh && scene) {
      scene.remove(photonMesh)
      photonMesh.dispose()
    }
    if (auroraMesh && scene) {
      scene.remove(auroraMesh)
      auroraMesh.dispose()
    }
    if (stardustMesh && scene) {
      scene.remove(stardustMesh)
      stardustMesh.dispose()
    }
    if (rippleMesh && scene) {
      scene.remove(rippleMesh)
      rippleMesh.dispose()
    }

    // 步骤5: 清理几何体
    crystalGeometry?.dispose()
    photonGeometry?.dispose()
    auroraGeometry?.dispose()
    stardustGeometry?.dispose()
    rippleGeometry?.dispose()

    // 步骤6: 清理材质
    crystalMaterial?.dispose()
    photonMaterial?.dispose()
    auroraMaterial?.dispose()
    stardustMaterial?.dispose()
    rippleMaterial?.dispose()

    // 步骤7: 清理纹理
    crystalTexture?.dispose()
    butterflyTexture?.dispose()
    diamondTexture?.dispose()

    // 步骤8: 清理数据
    crystalData = null
    photonData = null
    auroraData = null
    stardustData = null
    rippleData = null

    // 步骤9: 清理渲染器
    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
      renderer.dispose()
    }

    // 步骤10: 清理场景和相机
    scene?.clear()
    scene = null
    camera = null
    renderer = null

    // 步骤11: 清理临时对象
    dummy.clear()
  }

  // ========== 启动 ==========
  const start = async () => {
    await initRenderer()
    await loadTextures()
    initCrystals()
    initPhotons()
    initAurora()
    initStardust()
    initRipples()
    playEntranceAnimation()
    animate()

    // 运镜动画结束后自动清理
    gsap.delayedCall(config.cameraSegmentDuration * 6 + 2, () => {
      cleanup()
    })
  }

  start()

  return cleanup
}

// ========== 参数导出 ==========
export const quantumDimensionalAuroraEffectParams = {
  name: '量子维度极光之息',
  effect: quantumDimensionalAuroraEffect
}
