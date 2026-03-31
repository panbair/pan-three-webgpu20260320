/**
 * 🌌 极光梦境 - Aurora Dream (简化版)
 *
 * 核心特性：
 * 1. 50,000个星尘粒子（使用星星纹理）
 * 2. 8条动态极光带（贝塞尔曲线）
 * 3. 6个垂直光柱脉冲
 * 4. 5层能量涟漪波纹
 * 5. 完整的GSAP电影级运镜（6个角度切换）
 *
 * 技术栈：
 * - Three.js WebGPU
 * - GPU 动态着色（TSL）
 * - InstancedMesh 批量渲染
 * - 简化架构（无 Compute Shader）
 *
 * 性能目标：
 * - 50,000+ 总粒子数 @ 40-50 FPS
 * - pixelRatio: 0.75
 * - updateInterval: 2
 */

import * as THREE from 'three/webgpu'
import gsap from 'gsap'
import { Fn, float, instanceIndex, sin, time, uniform, mix } from 'three/tsl'

// ============================================
// 特效参数配置
// ============================================

export const AuroraFantasyEffectParams = {
  // 粒子系统参数
  starDustCount: 50000, // 星尘粒子数量

  // 极光参数
  auroraRibbons: 8, // 极光带数量
  lightPillars: 6, // 光柱数量
  energyRipples: 5, // 能量涟漪层数量

  // 渲染参数（性能优化）
  pixelRatio: Math.min(window.devicePixelRatio, 0.75),
  antialias: false,
  updateInterval: 2, // 每2帧更新一次

  // 动画参数
  cinematicDuration: 30, // 运镜时长
  cameraPositions: [
    // 相机位置数组
    { x: 0, y: 60, z: 120 },
    { x: 80, y: 40, z: 80 },
    { x: -80, y: 60, z: 100 },
    { x: 0, y: 100, z: 80 },
    { x: 100, y: 30, z: 50 },
    { x: -60, y: 80, z: 120 }
  ]
}

// ============================================
// 主特效函数
// ============================================

export const auroraFantasyEffect = (container: HTMLElement) => {
  console.log('[AuroraFantasy] 开始初始化极光梦境（简化版）...')

  // ============================================
  // 1. 核心变量声明
  // ============================================

  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: THREE.WebGPURenderer | null = null
  let animationId: number | null = null
  let allTweens: (gsap.core.Tween | gsap.core.Timeline)[] = []
  let cinematicTimeline: gsap.core.Timeline | null = null
  let frameCounter = 0 // 用于降频更新

  // 几何体和材质
  let starGeometry: THREE.BufferGeometry | null = null
  let starMaterial: THREE.MeshBasicNodeMaterial | null = null
  let starMesh: THREE.InstancedMesh | null = null

  // 极光带
  let auroraCurves: THREE.CatmullRomCurve3[] = []
  let auroraTubes: THREE.Mesh[] = []
  let auroraMaterials: THREE.MeshBasicNodeMaterial[] = []

  // 光柱
  let lightPillars: THREE.Mesh[] = []
  let pillarMaterials: THREE.MeshBasicNodeMaterial[] = []

  // 能量涟漪
  let energyRipples: THREE.Mesh[] = []
  let rippleMaterials: THREE.MeshBasicNodeMaterial[] = []

  // 性能配置
  const config = { ...AuroraFantasyEffectParams }

  // ============================================
  // 2. 初始化函数
  // ============================================

  async function init() {
    console.log('[AuroraFantasy] 初始化 WebGPU 场景...')

    // 创建场景
    scene = new THREE.Scene()

    // 创建相机
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 60, 120)
    camera.lookAt(0, 0, 0)

    // 创建渲染器
    renderer = new THREE.WebGPURenderer({ antialias: config.antialias, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(config.pixelRatio)
    container.appendChild(renderer.domElement)

    // 等待 WebGPU 后端初始化
    console.log('[AuroraFantasy] 初始化 WebGPU 后端...')
    await renderer.init()
    console.log('[AuroraFantasy] WebGPU 后端初始化完成')

    // ============================================
    // 3. 创建星尘粒子系统
    // ============================================

    console.log('[AuroraFantasy] 创建星尘粒子...')

    starGeometry = new THREE.SphereGeometry(0.3, 8, 8)

    // 定义 7 段颜色循环的 RGB 向量
    const neonColor0 = uniform(new THREE.Vector3(0.0, 1.0, 0.5)) // 极光绿
    const neonColor1 = uniform(new THREE.Vector3(0.6, 0.0, 1.0)) // 紫色
    const neonColor2 = uniform(new THREE.Vector3(0.0, 0.1, 0.4)) // 午夜蓝
    const neonColor3 = uniform(new THREE.Vector3(1.0, 0.0, 0.4)) // 霓虹粉
    const neonColor4 = uniform(new THREE.Vector3(1.0, 0.6, 0.0)) // 金橙
    const neonColor5 = uniform(new THREE.Vector3(0.0, 0.94, 1.0)) // 电光蓝
    const neonColor6 = uniform(new THREE.Vector3(1.0, 1.0, 0.95)) // 星光白

    starMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      fragmentNode: Fn(() => {
        const idx = instanceIndex.toVar()
        const t = float(idx).div(float(config.starDustCount))

        // 基于实例索引的颜色循环（7段颜色）
        const segment = t.mul(float(7.0))
        const segmentIndex = segment.floor().clamp(float(0), float(6))
        const segmentT = segment.sub(segmentIndex)

        // 根据段索引选择颜色对进行混合
        const color0 = segmentIndex
          .equal(float(0))
          .select(
            neonColor0,
            segmentIndex
              .equal(float(1))
              .select(
                neonColor1,
                segmentIndex
                  .equal(float(2))
                  .select(
                    neonColor2,
                    segmentIndex
                      .equal(float(3))
                      .select(
                        neonColor3,
                        segmentIndex
                          .equal(float(4))
                          .select(
                            neonColor4,
                            segmentIndex.equal(float(5)).select(neonColor5, neonColor6)
                          )
                      )
                  )
              )
          )

        const color1 = segmentIndex
          .equal(float(0))
          .select(
            neonColor1,
            segmentIndex
              .equal(float(1))
              .select(
                neonColor2,
                segmentIndex
                  .equal(float(2))
                  .select(
                    neonColor3,
                    segmentIndex
                      .equal(float(3))
                      .select(
                        neonColor4,
                        segmentIndex
                          .equal(float(4))
                          .select(
                            neonColor5,
                            segmentIndex.equal(float(5)).select(neonColor6, neonColor0)
                          )
                      )
                  )
              )
          )

        // 在颜色对之间进行平滑过渡
        const color = mix(color0, color1, segmentT)

        // 时间闪烁
        const twinkle = sin(time.mul(float(3.0)).add(float(idx).mul(float(0.001))))

        // 应用闪烁到颜色亮度
        const finalColor = color.mul(float(0.7)).add(color.mul(twinkle.mul(float(0.3))))

        return finalColor
      })()
    })

    starMesh = new THREE.InstancedMesh(
      starGeometry,
      starMaterial as THREE.Material,
      config.starDustCount
    )
    starMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    starMesh.frustumCulled = false

    // 初始化粒子位置
    const dummy = new THREE.Object3D()
    for (let i = 0; i < config.starDustCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 20 + Math.random() * 60

      dummy.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      )
      dummy.updateMatrix()
      starMesh.setMatrixAt(i, dummy.matrix)
    }

    scene.add(starMesh)

    // ============================================
    // 4. 创建极光带
    // ============================================

    console.log('[AuroraFantasy] 创建极光带...')

    for (let i = 0; i < config.auroraRibbons; i++) {
      const points: THREE.Vector3[] = []
      for (let j = 0; j < 20; j++) {
        const t = j / 19
        const x = Math.sin(t * Math.PI * 2 + i) * 60
        const y = 40 + Math.sin(t * Math.PI * 4) * 20
        const z = Math.cos(t * Math.PI * 2 + i) * 60
        points.push(new THREE.Vector3(x, y, z))
      }

      const curve = new THREE.CatmullRomCurve3(points)
      auroraCurves.push(curve)

      const tubeGeometry = new THREE.TubeGeometry(curve, 100, 0.8, 8, false)

      const hue = (i * 0.1) % 1.0
      const auroraMat = new THREE.MeshBasicNodeMaterial({
        transparent: true,
        opacity: 0.5,
        color: new THREE.Color().setHSL(hue, 1.0, 0.6).multiplyScalar(0.7)
      })

      auroraMaterials.push(auroraMat)

      const tubeMesh = new THREE.Mesh(tubeGeometry, auroraMat)
      auroraTubes.push(tubeMesh)
      scene.add(tubeMesh)
    }

    // ============================================
    // 5. 创建光柱脉冲
    // ============================================

    console.log('[AuroraFantasy] 创建光柱脉冲...')

    for (let i = 0; i < config.lightPillars; i++) {
      const angle = (i / config.lightPillars) * Math.PI * 2
      const radius = 50

      const pillarGeometry = new THREE.CylinderGeometry(2, 2, 150, 16, 1, true)
      pillarGeometry.translate(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)

      const pillarMat = new THREE.MeshBasicNodeMaterial({
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        color: new THREE.Color().setHSL(0.6 + ((i * 0.1) % 0.4), 0.8, 0.5)
      })

      pillarMaterials.push(pillarMat)

      const pillarMesh = new THREE.Mesh(pillarGeometry, pillarMat)
      lightPillars.push(pillarMesh)
      scene.add(pillarMesh)
    }

    // ============================================
    // 6. 创建能量涟漪
    // ============================================

    console.log('[AuroraFantasy] 创建能量涟漪...')

    for (let i = 0; i < config.energyRipples; i++) {
      const rippleGeometry = new THREE.RingGeometry(10 + i * 15, 12 + i * 15, 64, 1)
      rippleGeometry.rotateX(-Math.PI / 2)

      const rippleMat = new THREE.MeshBasicNodeMaterial({
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        color: new THREE.Color().setHSL(0.4 + ((i * 0.1) % 0.3), 0.9, 0.6)
      })

      rippleMaterials.push(rippleMat)

      const rippleMesh = new THREE.Mesh(rippleGeometry, rippleMat)
      rippleMesh.position.y = -30
      energyRipples.push(rippleMesh)
      scene.add(rippleMesh)
    }

    console.log('[AuroraFantasy] 初始化完成')

    // ============================================
    // 7. 创建入场动画
    // ============================================

    createIntroAnimation()
  }

  // ============================================
  // 入场动画
  // ============================================

  function createIntroAnimation() {
    console.log('[AuroraFantasy] 创建入场动画...')

    // 相机推近
    const initialPosition = { x: 0, y: 300, z: 400 }
    const targetPosition = { x: 0, y: 60, z: 120 }

    const cameraTween = gsap.to(initialPosition, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: 3,
      ease: 'power3.out',
      onUpdate: () => {
        if (camera) {
          camera.position.set(initialPosition.x, initialPosition.y, initialPosition.z)
          camera.lookAt(0, 0, 0)
        }
      }
    })
    allTweens.push(cameraTween)

    // 星尘扩散
    gsap.from(starMesh!.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 2.5,
      ease: 'power2.out'
    })

    // 极光带淡入
    auroraTubes.forEach((tube, i) => {
      gsap.from(tube.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2,
        delay: i * 0.1,
        ease: 'power2.out'
      })
    })

    // 光柱淡入
    lightPillars.forEach((pillar, i) => {
      gsap.from(pillar.scale, {
        y: 0,
        duration: 1.5,
        delay: i * 0.15,
        ease: 'back.out(1.7)'
      })
    })

    // 能量涟漪扩散
    energyRipples.forEach((ripple, i) => {
      gsap.from(ripple.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2,
        delay: i * 0.2,
        ease: 'power2.out'
      })
    })

    console.log('[AuroraFantasy] 入场动画创建完成')
  }

  // ============================================
  // 电影级运镜
  // ============================================

  function createCinematicAnimation() {
    console.log('[AuroraFantasy] 创建电影级运镜...')

    // 计算总时长：6个相机位置 × 1.8秒 = 10.8秒
    const totalDuration = config.cameraPositions.length * 1.8

    cinematicTimeline = gsap.timeline({
      repeat: 0, // 不重复
      repeatDelay: 0,
      duration: totalDuration,
      onComplete: () => {
        console.log('[AuroraFantasy] 运镜动画完成，开始清理特效')
        clearEffect()
      }
    })

    config.cameraPositions.forEach((pos, index) => {
      if (cinematicTimeline) {
        cinematicTimeline.to(
          camera!.position,
          {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            duration: 1.8,
            ease: 'power2.inOut',
            onUpdate: () => {
              if (camera) {
                camera!.lookAt(0, 0, 0)
              }
            }
          },
          index * 1.8
        ) // 每个相机位置延迟 1.8 秒
      }
    })

    if (cinematicTimeline) {
      allTweens.push(cinematicTimeline)
    }
  }

  // ============================================
  // 动画循环
  // ============================================

  function animate() {
    animationId = requestAnimationFrame(animate)

    if (!renderer || !scene || !camera) return

    // 星尘缓慢旋转
    if (starMesh && frameCounter % config.updateInterval === 0) {
      starMesh.rotation.y += 0.001
    }

    // 极光带波动
    auroraTubes.forEach((tube, i) => {
      tube.rotation.z = Math.sin(Date.now() * 0.001 + i) * 0.1
    })

    // 光柱脉冲
    lightPillars.forEach((pillar, i) => {
      const scale = 0.8 + Math.sin(Date.now() * 0.002 + i) * 0.2
      pillar.scale.set(scale, 1, scale)
    })

    // 能量涟漪扩散
    energyRipples.forEach((ripple, i) => {
      const scale = 1 + Math.sin(Date.now() * 0.0015 + i * 0.5) * 0.3
      ripple.scale.set(scale, scale, scale)
    })

    frameCounter++

    // 渲染
    renderer.render(scene, camera)
  }

  // ============================================
  // 🛑 停止运镜动画
  // ============================================
  const stopCameraAnimation = () => {
    console.log('[AuroraFantasy] 停止运镜动画')

    // 停止相机运镜时间线
    if (cinematicTimeline) {
      cinematicTimeline.pause()
    }

    // 清除相机位置的 tweens
    if (camera) {
      gsap.killTweensOf(camera.position)
      gsap.killTweensOf(camera.rotation)
    }
  }

  // ============================================
  // 🧹 清除特效（淡出后清理）
  // ============================================
  const clearEffect = () => {
    console.log('[AuroraFantasy] 开始淡出清理...')

    // 先停止运镜
    stopCameraAnimation()

    // 创建淡出时间线
    const fadeOutTimeline = gsap.timeline({
      onComplete: () => {
        // 淡出完成后执行完整清理
        performCleanup()
      }
    })

    // 淡出星尘粒子
    if (starMaterial) {
      fadeOutTimeline.to(
        starMaterial,
        {
          opacity: 0,
          duration: 1,
          ease: 'power2.out'
        },
        0
      )
    }

    // 淡出极光带
    auroraMaterials.forEach((mat, i) => {
      fadeOutTimeline.to(
        mat,
        {
          opacity: 0,
          duration: 1,
          ease: 'power2.out'
        },
        0.2 + i * 0.05
      )
    })

    // 淡出光柱
    pillarMaterials.forEach((mat, i) => {
      fadeOutTimeline.to(
        mat,
        {
          opacity: 0,
          duration: 1,
          ease: 'power2.out'
        },
        0.3 + i * 0.05
      )
    })

    // 淡出能量涟漪
    rippleMaterials.forEach((mat, i) => {
      fadeOutTimeline.to(
        mat,
        {
          opacity: 0,
          duration: 1,
          ease: 'power2.out'
        },
        0.4 + i * 0.05
      )
    })
  }

  // ============================================
  // 🧹 内部清理函数（实际执行清理）
  // ============================================
  const performCleanup = () => {
    console.log('[AuroraFantasy] 执行内部清理...')

    // 1. 停止所有动画
    allTweens.forEach(tween => {
      tween.kill()
    })
    allTweens = []

    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    // 2. 停止 GSAP 动画
    gsap.killTweensOf('*')

    // 3. 停止电影级运镜
    if (cinematicTimeline) {
      cinematicTimeline.kill()
      cinematicTimeline = null
    }

    // 4. 清空所有数组
    auroraCurves = []

    auroraTubes.forEach(mesh => {
      scene?.remove(mesh)
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => mat.dispose())
      } else {
        mesh.material.dispose()
      }
    })
    auroraTubes = []

    auroraMaterials.forEach(mat => mat.dispose())
    auroraMaterials = []

    lightPillars.forEach(mesh => {
      scene?.remove(mesh)
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => mat.dispose())
      } else {
        mesh.material.dispose()
      }
    })
    lightPillars = []

    pillarMaterials.forEach(mat => mat.dispose())
    pillarMaterials = []

    energyRipples.forEach(mesh => {
      scene?.remove(mesh)
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => mat.dispose())
      } else {
        mesh.material.dispose()
      }
    })
    energyRipples = []

    rippleMaterials.forEach(mat => mat.dispose())
    rippleMaterials = []

    // 5. 移除星尘网格
    if (starMesh && scene) {
      scene.remove(starMesh)
    }

    // 6. 释放几何体
    starGeometry?.dispose()

    // 7. 释放材质
    starMaterial?.dispose()

    // 10. 移除事件监听器
    if (renderer && container && renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement)
    }

    // 11. 清理渲染器
    if (renderer) {
      renderer.dispose()
      renderer = null
    }

    // 清空所有引用
    scene = null
    camera = null
    starMesh = null
    starGeometry = null
    starMaterial = null

    console.log('[AuroraFantasy] 清理完成')
  }

  // ============================================
  // 🧹 对外暴露的清理函数（调用内部清理）
  // ============================================
  const cleanup = () => {
    console.log('[AuroraFantasy] 调用 cleanup（直接清理）')
    performCleanup()
  }

  // ============================================
  // 启动特效
  // ============================================

  // 使用异步启动确保 WebGPU 初始化完成后再启动渲染循环
  ;(async () => {
    await init()
    createCinematicAnimation()
    animate()
    console.log('[AuroraFantasy] 启动完成')
  })()

  return {
    cleanup,
    stopCameraAnimation,
    clearEffect
  }
}

// 导出别名以兼容旧代码
export const auroraDreamEffect = auroraFantasyEffect
