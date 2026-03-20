// AlphaHash 透明哈希特效 - 优化版
// 特性: 螺旋分布粒子系统 + 流畅动画
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'

// 性能优化常量
const TIME_SCALE_FACTOR = 0.001
const FULL_ROTATION = Math.PI * 2
const SPIRAL_TURNS = Math.PI * 8

// 配置参数
export const alphaHashEffectParams = {
  particleCount: 1000, // 粒子数量
  alpha: 0.7, // 透明度
  alphaHash: true, // 是否启用 alphaHash
  rotationSpeed: 0.0005, // 整体旋转速度
  autoRotate: true, // 是否自动旋转
  colorCycleSpeed: 0.0002, // 颜色循环速度
  particleSize: 0.3, // 粒子大小
  spreadRadius: 8, // 分布半径
  breatheSpeed: 1.5, // 呼吸动画速度
  waveSpeed: 0.8, // 波浪动画速度
  orbitSpeed: 0.3, // 轨道动画速度
  updateInterval: 5 // 颜色更新间隔帧数（优化性能）
}

// 渲染器类型
type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

// 粒子数据类型
interface ParticleData {
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
  let dummy: THREE.Object3D | null = new THREE.Object3D()
  let color: THREE.Color | null = new THREE.Color()

  // GSAP 动画对象
  let breatheAnimation: { value: number } | null = { value: 1 }

  // 电影级运镜相关变量
  let cameraTimeline: gsap.core.Timeline | null = null
  const isAutoCamera = true // 默认开启自动运镜

  // 存储所有 GSAP tweens，用于清理
  const allTweens: gsap.core.Tween[] = []
  const cameraPositions = [
    // 镜头1: 远景俯视 - 展示整体
    { position: new THREE.Vector3(20, 15, 20), target: new THREE.Vector3(0, 0, 0) },
    // 镜头2: 低角度仰视 - 戏剧性
    { position: new THREE.Vector3(8, 3, 15), target: new THREE.Vector3(0, 2, 0) },
    // 镜头3: 侧面环绕 - 动态
    { position: new THREE.Vector3(18, 8, -8), target: new THREE.Vector3(0, 0, 0) },
    // 镜头4: 近景特写 - 细节
    { position: new THREE.Vector3(6, 5, 6), target: new THREE.Vector3(2, 3, 2) },
    // 镜头5: 顶部鸟瞰 - 全景
    { position: new THREE.Vector3(5, 25, 5), target: new THREE.Vector3(0, 0, 0) },
    // 镜头6: 穿梭视角 - 沉浸
    { position: new THREE.Vector3(-15, 6, -15), target: new THREE.Vector3(0, 0, 0) },
    // 镜头7: 倾斜角度 - 动感
    { position: new THREE.Vector3(16, 10, 6), target: new THREE.Vector3(-2, 1, 2) },
    // 镜头8: 底部向上 - 升华
    { position: new THREE.Vector3(-10, 2, 12), target: new THREE.Vector3(0, 5, 0) }
  ]

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
      controls.minDistance = 5
      controls.maxDistance = 30

      // 初始化 GSAP 动画
      initGSAPAnimations()

      // 播放入场动画
      playEntranceAnimation()

      // 启动电影级自动运镜
      setTimeout(() => {
        playCameraAnimation()
      }, 2500)

      console.log('WebGPU AlphaHash 特效初始化完成 (优化版)')
    } catch (error) {
      console.error('WebGPU AlphaHash 特效初始化失败:', error)
    }
  }

  /**
   * 螺旋分布初始化粒子
   */
  const initSpiralParticles = () => {
    for (let i = 0; i < count; i++) {
      // 螺旋参数
      const t = i / count
      const angle = t * Math.PI * 8 // 4圈
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
        orbitRadius: radius,
        orbitAngle: angle,
        orbitSpeed: (0.5 + Math.random() * 0.5) * alphaHashEffectParams.orbitSpeed,
        orbitHeight: height,
        orbitPhase: Math.random() * Math.PI * 2,
        baseSize: 0.5 + Math.random() * 1.5,
        hue: (t * 0.6 + Math.random() * 0.1) % 1,
        saturation: 0.7 + Math.random() * 0.3,
        lightness: 0.5 + Math.random() * 0.2
      })

      // 设置初始位置
      if (dummy) {
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(particles[i].baseSize)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }

      // 设置颜色
      if (color) {
        color.setHSL(particles[i].hue, particles[i].saturation, particles[i].lightness)
        mesh.setColorAt(i, color)
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor!.needsUpdate = true
  }

  /**
   * 初始化 GSAP 动画
   */
  const initGSAPAnimations = () => {
    // 呼吸动画
    const breatheTween = gsap.to(breatheAnimation, {
      value: 1.2,
      duration: 2 / alphaHashEffectParams.breatheSpeed,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    })
    allTweens.push(breatheTween)
  }

  /**
   * 入场动画
   */
  const playEntranceAnimation = () => {
    // 相机入场 - 从远处快速推进
    const cameraTween = gsap.from(camera.position, {
      x: 50,
      y: 40,
      z: 50,
      duration: 2.5,
      ease: 'power3.out'
    })
    allTweens.push(cameraTween)

    // 相机目标点入场
    const initialTarget = new THREE.Vector3(0, 0, 0)
    const targetTween = gsap.to(initialTarget, {
      x: 0,
      y: 0,
      z: 0,
      duration: 2.5,
      ease: 'power3.out',
      onUpdate: () => {
        if (camera) camera.lookAt(initialTarget.x, initialTarget.y, initialTarget.z)
      }
    })
    allTweens.push(targetTween)

    // 粒子缩放入场 - 从中心扩散
    const scaleTween = gsap.from(mesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 2,
      ease: 'back.out(1.7)'
    })
    allTweens.push(scaleTween)

    // 整体旋转入场
    const rotationTween = gsap.from(mesh.rotation, {
      x: Math.PI,
      duration: 3,
      ease: 'power2.out'
    })
    allTweens.push(rotationTween)

    // 材质淡入
    const materialTween = gsap.from(material, {
      opacity: 0,
      duration: 1.5,
      ease: 'power2.out',
      onUpdate: () => {
        if (material) material.opacity = material.opacity * alphaHashEffectParams.alpha
      }
    })
    allTweens.push(materialTween)
  }

  /**
   * 电影级运镜动画
   */
  const playCameraAnimation = () => {
    if (!isAutoCamera || !camera) return

    // 清理之前的运镜动画
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

    // 镜头1: 远景俯视 → 镜头2: 低角度仰视
    cameraTimeline.to(
      camera.position,
      {
        x: cameraPositions[1].position.x,
        y: cameraPositions[1].position.y,
        z: cameraPositions[1].position.z,
        duration: 6,
        ease: 'power1.inOut',
        onUpdate: () => {
          if (camera) camera.lookAt(0, 0, 0)
        }
      },
      0
    )

    // 镜头2: 低角度仰视 → 镜头3: 侧面环绕
    cameraTimeline.to(
      camera.position,
      {
        x: cameraPositions[2].position.x,
        y: cameraPositions[2].position.y,
        z: cameraPositions[2].position.z,
        duration: 5,
        ease: 'sine.inOut'
      },
      '>'
    )

    cameraTimeline.to(
      camera.rotation,
      {
        onUpdate: () => {
          if (camera) camera.lookAt(0, 0, 0)
        },
        duration: 5
      },
      '<'
    )

    // 镜头3: 侧面环绕 → 镜头4: 近景特写
    cameraTimeline.to(
      camera.position,
      {
        x: cameraPositions[3].position.x,
        y: cameraPositions[3].position.y,
        z: cameraPositions[3].position.z,
        duration: 7,
        ease: 'expo.inOut'
      },
      '>'
    )

    cameraTimeline.to(
      camera.rotation,
      {
        onUpdate: () => {
          if (camera) camera.lookAt(2, 3, 2)
        },
        duration: 7
      },
      '<'
    )

    // 镜头4: 近景特写 → 镜头5: 顶部鸟瞰
    cameraTimeline.to(
      camera.position,
      {
        x: cameraPositions[4].position.x,
        y: cameraPositions[4].position.y,
        z: cameraPositions[4].position.z,
        duration: 6,
        ease: 'circ.inOut'
      },
      '>'
    )

    cameraTimeline.to(
      camera.rotation,
      {
        onUpdate: () => {
          if (camera) camera.lookAt(0, 0, 0)
        },
        duration: 6
      },
      '<'
    )

    // 镜头5: 顶部鸟瞰 → 镜头6: 穿梭视角
    cameraTimeline.to(
      camera.position,
      {
        x: cameraPositions[5].position.x,
        y: cameraPositions[5].position.y,
        z: cameraPositions[5].position.z,
        duration: 5.5,
        ease: 'power2.inOut'
      },
      '>'
    )

    cameraTimeline.to(
      camera.rotation,
      {
        onUpdate: () => {
          if (camera) camera.lookAt(0, 0, 0)
        },
        duration: 5.5
      },
      '<'
    )

    // 镜头6: 穿梭视角 → 镜头7: 倾斜角度
    cameraTimeline.to(
      camera.position,
      {
        x: cameraPositions[6].position.x,
        y: cameraPositions[6].position.y,
        z: cameraPositions[6].position.z,
        duration: 6,
        ease: 'back.out(1.2)'
      },
      '>'
    )

    cameraTimeline.to(
      camera.rotation,
      {
        onUpdate: () => {
          if (camera) camera.lookAt(-2, 1, 2)
        },
        duration: 6
      },
      '<'
    )

    // 镜头7: 倾斜角度 → 镜头8: 底部向上
    cameraTimeline.to(
      camera.position,
      {
        x: cameraPositions[7].position.x,
        y: cameraPositions[7].position.y,
        z: cameraPositions[7].position.z,
        duration: 6.5,
        ease: 'elastic.out(1, 0.5)'
      },
      '>'
    )

    cameraTimeline.to(
      camera.rotation,
      {
        onUpdate: () => {
          if (camera) camera.lookAt(0, 5, 0)
        },
        duration: 6.5
      },
      '<'
    )

    // 镜头8: 底部向上 → 镜头1: 远景俯视 (完成循环)
    cameraTimeline.to(
      camera.position,
      {
        x: cameraPositions[0].position.x,
        y: cameraPositions[0].position.y,
        z: cameraPositions[0].position.z,
        duration: 7,
        ease: 'power4.inOut'
      },
      '>'
    )

    cameraTimeline.to(
      camera.rotation,
      {
        onUpdate: () => {
          if (camera) camera.lookAt(0, 0, 0)
        },
        duration: 7
      },
      '<'
    )
  }

  /**
   * 更新粒子动画
   */
  const updateParticles = (time: number) => {
    if (!mesh) return

    frameCount++

    const breatheScale = breatheAnimation.value
    const shouldUpdateColor = frameCount % alphaHashEffectParams.updateInterval === 0

    // 性能优化：提前计算常用值
    const timeScale = time * TIME_SCALE_FACTOR
    const waveTime = time * alphaHashEffectParams.waveSpeed * TIME_SCALE_FACTOR
    const colorTime = time * alphaHashEffectParams.colorCycleSpeed * TIME_SCALE_FACTOR
    const rotationSpeed = timeScale * 0.5 // 0.0005 = 0.001 * 0.5

    for (let i = 0; i < count; i++) {
      const particle = particles[i]

      // 轨道运动
      const currentAngle = particle.orbitAngle + timeScale * particle.orbitSpeed
      const x = Math.cos(currentAngle) * particle.orbitRadius
      const z = Math.sin(currentAngle) * particle.orbitRadius

      // 波浪高度
      const waveY = particle.orbitHeight + Math.sin(waveTime + particle.orbitPhase) * 0.8

      // 更新位置
      if (dummy) {
        dummy.position.set(x, waveY, z)

        // 呼吸缩放
        const size = particle.baseSize * breatheScale
        dummy.scale.setScalar(size)

        // 自转
        dummy.rotation.set(rotationSpeed * particle.orbitSpeed, timeScale * particle.orbitSpeed, 0)

        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }

      // 仅在指定帧数更新颜色（性能优化）
      if (shouldUpdateColor && color) {
        let currentHue = particle.hue + colorTime
        if (currentHue > 1) currentHue -= 1 // 比 % 1 更快
        color.setHSL(currentHue, particle.saturation, particle.lightness)
        mesh.setColorAt(i, color)
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

    // 更新控制器（仅在非自动运镜模式下）
    if (controls && !isAutoCamera) {
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

  // 返回清理函数
  const cleanup = () => {
    console.log('清理 AlphaHash 特效...')

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
      if (mesh) {
        gsap.killTweensOf(mesh.scale)
        gsap.killTweensOf(mesh.rotation)
      }
      if (material) {
        gsap.killTweensOf(material)
      }
      if (breatheAnimation) gsap.killTweensOf(breatheAnimation)

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
      breatheAnimation = null

      // 从场景中移除网格
      if (mesh && scene) {
        scene.remove(mesh)
      }

      // 清理资源
      if (mesh) {
        if (mesh.geometry) mesh.geometry.dispose()
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose()
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
      mesh = null
      material = null
      particles = []

      console.log('AlphaHash 特效清理完成')
    } catch (error) {
      console.error('清理 AlphaHash 特效时出错:', error)
    }
  }

  return cleanup
}

// 向后兼容的别名
export const pointEffect = alphaHashEffect
