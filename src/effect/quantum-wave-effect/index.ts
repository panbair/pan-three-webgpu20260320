// 量子波动特效 (Quantum Wave Effect)
// 特性: 量子纠缠粒子 + 波动传播 + 干涉图案
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'

// 性能优化常量
const TIME_SCALE_FACTOR = 0.001
const FULL_ROTATION = Math.PI * 2

// 配置参数
export const quantumWaveEffectParams = {
  particleCount: 1000, // 粒子数量
  particleSize: 0.15, // 粒子大小
  alpha: 0.8, // 透明度
  alphaHash: true, // 是否启用 alphaHash
  rotationSpeed: 0.0002, // 整体旋转速度
  autoRotate: true, // 是否自动旋转
  colorCycleSpeed: 0.0003, // 颜色变化速度
  waveSpeed: 1.5, // 波动速度
  waveAmplitude: 0.8, // 波动幅度
  entanglementStrength: 0.5, // 纠缠强度
  interferencePattern: true, // 是否显示干涉图案
  pulseSpeed: 2.0, // 脉冲速度
  updateInterval: 4 // 颜色更新间隔帧数（优化性能）
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
  entangledIndex: number // 纠缠粒子的索引
}

/**
 * 创建量子波动特效
 * @param container - 容器元素
 * @returns 清理函数
 */
export const quantumWaveEffect = (container: HTMLElement) => {
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: WebGPURendererType
  let controls: OrbitControls
  let mesh: THREE.InstancedMesh
  let material: THREE.MeshStandardMaterial
  let particles: ParticleData[] = []

  const count = quantumWaveEffectParams.particleCount
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  // GSAP 动画对象
  const waveAnimation = { value: 0 }
  const entanglementAnimation = { value: 1 }

  // 电影级运镜相关变量
  let cameraTimeline: gsap.core.Timeline | null = null

  // 存储所有 GSAP tweens，用于清理
  const allTweens: gsap.core.Tween[] = []

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
      camera.position.set(12, 10, 12)
      camera.lookAt(0, 0, 0)

      // 创建场景
      scene = new THREE.Scene()
      scene.background = null

      // 创建几何体 - 八面体（更有科技感）
      const geometry = new THREE.OctahedronGeometry(quantumWaveEffectParams.particleSize, 0)

      // 创建材质
      material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: quantumWaveEffectParams.alphaHash,
        opacity: quantumWaveEffectParams.alpha,
        roughness: 0.1,
        metalness: 0.9,
        envMapIntensity: 2.0,
        emissive: 0x00aaff,
        emissiveIntensity: 0.4
      })

      // 创建实例化网格
      mesh = new THREE.InstancedMesh(geometry, material, count)

      // 使用量子波动分布初始化粒子
      initQuantumParticles()

      scene.add(mesh)

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
      controls.minDistance = 3
      controls.maxDistance = 40

      // 初始化 GSAP 动画
      initGSAPAnimations()

      // 播放入场动画
      playEntranceAnimation()

      // 启动电影级自动运镜（延迟 2.5 秒）
      setTimeout(() => {
        playCameraAnimation()
      }, 2500)

      console.log('量子波动特效初始化完成')
    } catch (error) {
      console.error('量子波动特效初始化失败:', error)
    }
  }

  /**
   * 量子波动分布初始化粒子
   */
  const initQuantumParticles = () => {
    for (let i = 0; i < count; i++) {
      // 球形波前分布
      const t = i / count
      const radius = 1 + t * 10
      const theta = t * Math.PI * 8 // 多圈螺旋
      const phi = Math.acos(1 - 2 * Math.random()) // 均匀分布在球面上

      // 转换为笛卡尔坐标
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)

      // 量子纠缠：每个粒子与另一个随机粒子建立关联
      const entangledIndex = Math.floor(Math.random() * count)

      particles.push({
        orbitRadius: radius,
        orbitAngle: theta,
        orbitSpeed: (0.5 + Math.random() * 0.5) * 0.0004,
        orbitHeight: y,
        orbitPhase: Math.random() * Math.PI * 2,
        baseSize: 0.4 + Math.random() * 0.8,
        hue: (t * 0.5 + Math.random() * 0.1) % 1,
        saturation: 0.8 + Math.random() * 0.2,
        lightness: 0.5 + Math.random() * 0.3,
        entangledIndex
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
    // 波动传播动画
    const waveTween = gsap.to(waveAnimation, {
      value: FULL_ROTATION * 2,
      duration: 3 / quantumWaveEffectParams.waveSpeed,
      ease: 'sine.inOut',
      repeat: -1
    })
    allTweens.push(waveTween)

    // 纠连脉冲动画
    const entanglementTween = gsap.to(entanglementAnimation, {
      value: 1.5,
      duration: 1.5 / quantumWaveEffectParams.pulseSpeed,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    })
    allTweens.push(entanglementTween)
  }

  /**
   * 入场动画
   */
  const playEntranceAnimation = () => {
    // 相机入场 - 从远处快速推进
    const cameraTween = gsap.from(camera.position, {
      x: 60,
      y: 50,
      z: 60,
      duration: 2,
      ease: 'power3.out'
    })
    allTweens.push(cameraTween)

    // 粒子从中心量子隧穿爆发
    const scaleTween = gsap.from(mesh.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 2,
      ease: 'elastic.out(1, 0.5)'
    })
    allTweens.push(scaleTween)

    // 整体旋转入场
    const rotationTween = gsap.from(mesh.rotation, {
      x: Math.PI * 0.5,
      y: Math.PI * 0.5,
      duration: 3,
      ease: 'power2.out'
    })
    allTweens.push(rotationTween)

    // 材质淡入
    const materialTween = gsap.from(material, {
      opacity: 0,
      duration: 1.8,
      ease: 'power2.out'
    })
    allTweens.push(materialTween)
  }

  /**
   * 停止相机运镜动画
   */
  const stopCameraAnimation = () => {
    if (cameraTimeline) {
      cameraTimeline.kill()
      cameraTimeline = null
    }
  }

  /**
   * 播放电影级运镜动画
   */
  const playCameraAnimation = () => {
    // 检查是否已清理
    if (!camera) return

    if (cameraTimeline) {
      cameraTimeline.kill()
    }

    // 创建电影级运镜时间线（单次播放，结束后自动清理）
    cameraTimeline = gsap.timeline({
      repeatDelay: 0.5,
      onComplete: () => {
        console.log('[量子波动特效] 运镜动画完成，开始清理特效')
        clearEffect()
      }
    })

    // 运镜轨迹：环绕 → 俯视 → 穿梭 → 底部仰视 → 回归
    const positions = [
      { x: 15, y: 12, z: 15, target: new THREE.Vector3(0, 0, 0) },
      { x: 5, y: 20, z: 5, target: new THREE.Vector3(0, 0, 0) },
      { x: -18, y: 5, z: -18, target: new THREE.Vector3(0, 0, 0) },
      { x: 8, y: -5, z: 15, target: new THREE.Vector3(0, 5, 0) },
      { x: 12, y: 8, z: -12, target: new THREE.Vector3(0, 0, 0) }
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
          duration: 6,
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
    if (!mesh) return

    frameCount++

    const wavePhase = waveAnimation.value
    const entanglementScale = entanglementAnimation.value
    const shouldUpdateColor = frameCount % quantumWaveEffectParams.updateInterval === 0

    // 性能优化：提前计算常用值
    const timeScale = time * TIME_SCALE_FACTOR
    const waveTime = time * quantumWaveEffectParams.waveSpeed * TIME_SCALE_FACTOR
    const colorTime = time * quantumWaveEffectParams.colorCycleSpeed * TIME_SCALE_FACTOR

    for (let i = 0; i < count; i++) {
      const p = particles[i]

      // 量子波动运动
      const currentAngle = p.orbitAngle + timeScale * p.orbitSpeed
      const waveDisplacement =
        Math.sin(wavePhase + p.orbitPhase) * quantumWaveEffectParams.waveAmplitude

      // 基础轨道运动 + 波动
      let x = Math.cos(currentAngle) * (p.orbitRadius + waveDisplacement)
      let z = Math.sin(currentAngle) * (p.orbitRadius + waveDisplacement)
      let y = p.orbitHeight + Math.sin(waveTime + p.orbitPhase) * 0.5

      // 量子纠缠效果：与纠缠粒子的位置相互作用
      if (p.entangledIndex !== i && p.entangledIndex < particles.length) {
        const entangledParticle = particles[p.entangledIndex]
        const entangleFactor = quantumWaveEffectParams.entanglementStrength * entanglementScale

        x += (Math.cos(currentAngle + entangleFactor) - Math.cos(currentAngle)) * entangleFactor
        y += (Math.sin(waveTime + entangleFactor) - Math.sin(waveTime)) * entangleFactor
        z += (Math.sin(currentAngle + entangleFactor) - Math.sin(currentAngle)) * entangleFactor
      }

      // 更新位置
      dummy.position.set(x, y, z)

      // 波动缩放
      const size = p.baseSize * (1 + Math.sin(wavePhase + p.orbitPhase) * 0.3)
      dummy.scale.setScalar(size)

      // 量子旋转
      dummy.rotation.set(timeScale * 0.3, timeScale * 0.5, timeScale * 0.2)

      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      // 仅在指定帧数更新颜色（性能优化）
      if (shouldUpdateColor) {
        // 干涉图案效果：颜色随波动相位变化
        let currentHue = p.hue + colorTime
        if (currentHue > 1) currentHue -= 1

        const interferenceEffect = quantumWaveEffectParams.interferencePattern
          ? Math.sin(wavePhase * 2 + p.orbitPhase) * 0.1
          : 0

        color.setHSL(
          currentHue,
          p.saturation,
          Math.max(0.3, Math.min(0.9, p.lightness + interferenceEffect))
        )
        mesh.setColorAt(i, color)
      }
    }

    mesh.instanceMatrix.needsUpdate = true

    if (shouldUpdateColor) {
      mesh.instanceColor!.needsUpdate = true
    }
  }

  /**
   * 动画循环
   */
  const animate = (time: number) => {
    // 整体自动旋转
    if (quantumWaveEffectParams.autoRotate && mesh) {
      mesh.rotation.y += quantumWaveEffectParams.rotationSpeed
      mesh.rotation.x += quantumWaveEffectParams.rotationSpeed * 0.3
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
    console.log('清理量子波动特效...')

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
      gsap.killTweensOf(waveAnimation)
      gsap.killTweensOf(entanglementAnimation)

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

      // 清理临时对象（重置为初始值而非 null）
      dummy.position.set(0, 0, 0)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      color.set(0xffffff)
      waveAnimation.value = 0
      entanglementAnimation.value = 1

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

      console.log('量子波动特效清理完成')
    } catch (error) {
      console.error('清理量子波动特效时出错:', error)
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

    // 淡出粒子
    if (material) {
      fadeOutTimeline.to(
        material,
        {
          opacity: 0,
          duration: 1,
          ease: 'power2.out'
        },
        0
      )
    }
  }

  // ============================================================
  // 🧹 对外暴露的清理函数
  // ============================================================
  const cleanup = () => {
    performCleanup()
  }

  return { cleanup, clearEffect, stopCameraAnimation }
}
