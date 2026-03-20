// AlphaHash 透明哈希特效 - 优化版
// 特性: 螺旋分布粒子系统 + 流畅动画
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'

// 配置参数
export const alphaHashEffectParams = {
  particleCount: 300,         // 粒子数量
  alpha: 0.7,                 // 透明度
  alphaHash: true,            // 是否启用 alphaHash
  rotationSpeed: 0.0005,      // 整体旋转速度
  autoRotate: true,           // 是否自动旋转
  colorCycleSpeed: 0.0002,    // 颜色循环速度
  particleSize: 0.3,          // 粒子大小
  spreadRadius: 8,            // 分布半径
  breatheSpeed: 1.5,          // 呼吸动画速度
  waveSpeed: 0.8,             // 波浪动画速度
  orbitSpeed: 0.3,            // 轨道动画速度
  updateInterval: 5           // 颜色更新间隔帧数（优化性能）
}

// 渲染器类型
type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

// 粒子数据类型
interface ParticleData {
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
}

/**
 * 创建 AlphaHash 透明哈希特效 (优化版 + GSAP 动画)
 * @param container - 容器元素
 * @returns 清理函数
 */
export const alphaHashEffect = (container: HTMLElement) => {
  // 场景变量
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: WebGPURendererType
  let controls: OrbitControls
  let mesh: THREE.InstancedMesh
  let material: THREE.MeshStandardMaterial
  let particles: ParticleData[] = []

  const count = alphaHashEffectParams.particleCount
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const tempColor = new THREE.Color()

  // GSAP 动画对象
  let breatheAnimation: { value: number } = { value: 1 }

  // 帧计数器（用于优化性能）
  let frameCount = 0

  /**
   * 初始化场景
   */
  const init = async () => {
    try {
      // 创建相机
      const width = container.clientWidth
      const height = container.clientHeight
      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
      camera.position.set(12, 8, 12)
      camera.lookAt(0, 0, 0)

      // 创建场景
      scene = new THREE.Scene()
      scene.background = null

      // 创建几何体 - 球体
      const geometry = new THREE.SphereGeometry(alphaHashEffectParams.particleSize, 16, 12)

      // 创建材质
      material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: alphaHashEffectParams.alphaHash,
        opacity: alphaHashEffectParams.alpha,
        roughness: 0.2,
        metalness: 0.8,
        envMapIntensity: 1.5
      })

      // 创建实例化网格
      mesh = new THREE.InstancedMesh(geometry, material, count)

      // 使用螺旋分布初始化粒子
      initSpiralParticles()

      scene.add(mesh)

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
      controls.minDistance = 5
      controls.maxDistance = 30

      // 初始化 GSAP 动画
      initGSAPAnimations()

      // 入场动画
      playEntranceAnimation()

      console.log('WebGPU AlphaHash 特效初始化完成 (优化版)')

    } catch (error) {
      console.error('WebGPU AlphaHash 特效初始化失败:', error)
    }
  }

  /**
   * 螺旋分布初始化粒子
   */
  const initSpiralParticles = () => {
    const matrix = new THREE.Matrix4()

    for (let i = 0; i < count; i++) {
      // 螺旋参数
      const t = i / count
      const angle = t * Math.PI * 8  // 4圈
      const height = (t - 0.5) * alphaHashEffectParams.spreadRadius * 2
      const radius = alphaHashEffectParams.spreadRadius * (0.2 + t * 0.8)

      // 添加噪声偏移
      const noise = 0.3
      const noiseX = (Math.random() - 0.5) * noise
      const noiseY = (Math.random() - 0.5) * noise
      const noiseZ = (Math.random() - 0.5) * noise

      // 初始位置
      const x = Math.cos(angle) * radius + noiseX
      const y = height + noiseY
      const z = Math.sin(angle) * radius + noiseZ

      // 存储粒子数据
      particles.push({
        initialPosition: new THREE.Vector3(x, y, z),
        orbitRadius: radius,
        orbitAngle: angle,
        orbitSpeed: (0.5 + Math.random() * 0.5) * alphaHashEffectParams.orbitSpeed,
        orbitHeight: height,
        orbitPhase: Math.random() * Math.PI * 2,
        baseSize: 0.5 + Math.random() * 1.5,
        hue: (t * 0.6 + Math.random() * 0.1) % 1,  // 渐变色
        saturation: 0.7 + Math.random() * 0.3,
        lightness: 0.5 + Math.random() * 0.2
      })

      // 设置初始位置
      dummy.position.set(x, y, z)
      dummy.scale.setScalar(particles[i].baseSize)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      // 设置颜色
      color.setHSL(particles[i].hue, particles[i].saturation, particles[i].lightness)
      mesh.setColorAt(i, color)
    }

    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor!.needsUpdate = true
  }

  /**
   * 初始化 GSAP 动画
   */
  const initGSAPAnimations = () => {
    // 呼吸动画
    gsap.to(breatheAnimation, {
      value: 1.2,
      duration: 2 / alphaHashEffectParams.breatheSpeed,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    })
  }

  /**
   * 入场动画
   */
  const playEntranceAnimation = () => {
    // 相机入场 - 平滑滑入
    gsap.from(camera.position, {
      x: 20,
      y: 15,
      z: 20,
      duration: 2.5,
      ease: 'power2.out'
    })

    // 粒子缩放入场 - 从中心扩散
    gsap.from(mesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 2,
      ease: 'back.out(1.7)'
    })

    // 整体旋转入场
    gsap.from(mesh.rotation, {
      x: Math.PI,
      duration: 3,
      ease: 'power2.out'
    })

    // 材质淡入
    gsap.from(material, {
      opacity: 0,
      duration: 1.5,
      ease: 'power2.out',
      onUpdate: () => {
        material.opacity = material.opacity * alphaHashEffectParams.alpha
      }
    })
  }

  /**
   * 更新粒子动画
   */
  const updateParticles = (time: number) => {
    if (!mesh) return

    frameCount++

    const breatheScale = breatheAnimation.value
    const shouldUpdateColor = frameCount % alphaHashEffectParams.updateInterval === 0

    for (let i = 0; i < count; i++) {
      const particle = particles[i]

      // 轨道运动
      const currentAngle = particle.orbitAngle + time * 0.001 * particle.orbitSpeed
      const x = Math.cos(currentAngle) * particle.orbitRadius
      const z = Math.sin(currentAngle) * particle.orbitRadius

      // 波浪高度
      const waveY = particle.orbitHeight +
                   Math.sin(time * alphaHashEffectParams.waveSpeed * 0.001 + particle.orbitPhase) * 0.8

      // 更新位置
      dummy.position.set(x, waveY, z)

      // 呼吸缩放
      const size = particle.baseSize * breatheScale
      dummy.scale.setScalar(size)

      // 自转
      dummy.rotation.set(
        time * 0.0005 * particle.orbitSpeed,
        time * 0.001 * particle.orbitSpeed,
        0
      )

      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      // 仅在指定帧数更新颜色（性能优化）
      if (shouldUpdateColor) {
        const currentHue = (particle.hue + time * alphaHashEffectParams.colorCycleSpeed * 0.001) % 1
        tempColor.setHSL(currentHue, particle.saturation, particle.lightness)
        mesh.setColorAt(i, tempColor)
      }
    }

    mesh.instanceMatrix.needsUpdate = true

    // 仅在颜色更新时标记颜色需要更新
    if (shouldUpdateColor) {
      mesh.instanceColor!.needsUpdate = true
    }
  }

  /**
   * 动画循环
   */
  const animate = (time: number) => {
    // 整体自动旋转
    if (alphaHashEffectParams.autoRotate && mesh) {
      mesh.rotation.y += alphaHashEffectParams.rotationSpeed
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
  const updateParams = (params: Partial<typeof alphaHashEffectParams>) => {
    Object.assign(alphaHashEffectParams, params)

    // 更新材质参数
    if (material) {
      material.alphaHash = alphaHashEffectParams.alphaHash
      material.opacity = alphaHashEffectParams.alpha
      material.transparent = !alphaHashEffectParams.alphaHash
      material.depthWrite = alphaHashEffectParams.alphaHash
      material.needsUpdate = true
    }
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
    gsap.killTweensOf(breatheAnimation)

    // 取消动画循环
    if (renderer) {
      renderer.setAnimationLoop(null)
    }

    // 移除事件监听
    window.removeEventListener('resize', handleResize)

    // 清理资源
    if (mesh) {
      mesh.geometry.dispose()
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose()
      }
    }

    if (renderer) {
      renderer.dispose()
    }

    scene = null
    camera = null
    renderer = null
    controls = null
    mesh = null
    material = null
    particles = []
  }
}

// 向后兼容的别名
export const pointEffect = alphaHashEffect

