/**
 * 👁️ 时空裂隙之眼 - 超越维度的宇宙之眼
 *
 * 创新亮点：
 * - 基于Three.js WebGPU渲染器
 * - 钻石纹理 + 能量场 + 裂隙之眼的完美融合
 * - 五层独立系统：钻石核心、裂隙场、能量环、粒子风暴、时空涟漪
 *
 * 核心特性：
 * 1. 12个钻石晶体作为能量节点（使用zuanshi1.jpg纹理）
 * 2. 5000个时空粒子形成漩涡风暴
 * 3. 6层发光裂隙环（脉冲能量）
 * 4. 16条时空射线贯穿宇宙
 * 5. 8个引力波纹扩散
 * 6. 完整的GSAP电影级运镜（5个角度切换）
 * 7. 震撼的配色方案：深紫→洋红→金→青→银
 */

import * as THREE from 'three/webgpu'
import gsap from 'gsap'

// 特效参数导出
export const temporalRiftEyeEffectParams = {
  diamondNodes: 12,
  energyParticles: 5000,
  riftRings: 6,
  spaceRays: 16,
  gravityRipples: 8,
  animationDuration: 20
}

export const temporalRiftEyeEffect = (
  container: HTMLElement
): {
  cleanup: () => void
  stopCameraAnimation: () => void
  clearEffect: () => void
} => {
  // ============================================================
  // 🎨 配置参数
  // ============================================================
  const config = {
    diamondNodes: 12,
    energyParticles: 5000,
    riftRings: 6,
    spaceRays: 16,
    gravityRipples: 8
  }

  const dummy = new THREE.Object3D()

  let isCameraAnimationRunning = true

  const colors = {
    deepPurple: new THREE.Color(0x2a0036),
    magenta: new THREE.Color(0xff0066),
    gold: new THREE.Color(0xffd700),
    cyan: new THREE.Color(0x00ffff),
    silver: new THREE.Color(0xc0c0c0),
    energy: new THREE.Color(0x9d00ff)
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
  camera.position.set(0, 60, 280)

  // ============================================================
  // 💎 加载钻石纹理
  // ============================================================
  const textureLoader = new THREE.TextureLoader()
  const diamondTexture = textureLoader.load('/images/zuanshi1.jpg')
  diamondTexture.colorSpace = THREE.SRGBColorSpace

  // ============================================================
  // 🌟 创建钻石能量节点
  // ============================================================
  const diamondGroup = new THREE.Group()
  scene.add(diamondGroup)

  const diamondGeometry = new THREE.OctahedronGeometry(8, 0)
  // OctahedronGeometry 自带 UV 坐标，无需手动添加
  const diamondMaterial = new THREE.MeshBasicMaterial({
    map: diamondTexture,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })

  const diamondMesh = new THREE.InstancedMesh(diamondGeometry, diamondMaterial, config.diamondNodes)
  diamondGroup.add(diamondMesh)

  const diamondData: Array<{
    radius: number
    angle: number
    height: number
    speed: number
    phase: number
  }> = []

  for (let i = 0; i < config.diamondNodes; i++) {
    const radius = 40 + (i % 3) * 25
    const angle = (i / config.diamondNodes) * Math.PI * 2
    const height = (i % 2 === 0 ? 1 : -1) * (20 + Math.random() * 20)
    const speed = 0.5 + Math.random() * 0.5
    const phase = Math.random() * Math.PI * 2

    diamondData.push({ radius, angle, height, speed, phase })

    const x = Math.cos(angle) * radius
    const y = height
    const z = Math.sin(angle) * radius

    dummy.position.set(x, y, z)
    dummy.rotation.set(Math.random(), Math.random(), Math.random())
    dummy.updateMatrix()
    diamondMesh.setMatrixAt(i, dummy.matrix)
  }

  diamondMesh.instanceMatrix.needsUpdate = true

  // ============================================================
  // ⚡ 创建能量粒子风暴
  // ============================================================
  const particleGroup = new THREE.Group()
  scene.add(particleGroup)

  const particleGeometry = new THREE.BufferGeometry()
  const particlePositions = new Float32Array(config.energyParticles * 3)
  const particleColors = new Float32Array(config.energyParticles * 3)
  const particleSizes = new Float32Array(config.energyParticles)
  const particlePhases = new Float32Array(config.energyParticles)

  for (let i = 0; i < config.energyParticles; i++) {
    const radius = 50 + Math.random() * 150
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI

    particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    particlePositions[i * 3 + 1] = radius * Math.cos(phi)
    particlePositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

    // 渐变色系：深紫→洋红→金→青→银
    const t = i / config.energyParticles
    let color: THREE.Color
    if (t < 0.25) {
      color = colors.deepPurple.clone().lerp(colors.magenta, t * 4)
    } else if (t < 0.5) {
      color = colors.magenta.clone().lerp(colors.gold, (t - 0.25) * 4)
    } else if (t < 0.75) {
      color = colors.gold.clone().lerp(colors.cyan, (t - 0.5) * 4)
    } else {
      color = colors.cyan.clone().lerp(colors.silver, (t - 0.75) * 4)
    }

    particleColors[i * 3] = color.r
    particleColors[i * 3 + 1] = color.g
    particleColors[i * 3 + 2] = color.b

    particleSizes[i] = 2 + Math.random() * 4
    particlePhases[i] = Math.random() * Math.PI * 2
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1))
  particleGeometry.setAttribute('phase', new THREE.BufferAttribute(particlePhases, 1))
  // 添加 UV 坐标（纹理映射需要）
  const particleUVs = new Float32Array(config.energyParticles * 2)
  for (let i = 0; i < config.energyParticles; i++) {
    particleUVs[i * 2] = 0.5
    particleUVs[i * 2 + 1] = 0.5
  }
  particleGeometry.setAttribute('uv', new THREE.BufferAttribute(particleUVs, 2))

  // 创建粒子纹理
  const particleCanvas = document.createElement('canvas')
  particleCanvas.width = 64
  particleCanvas.height = 64
  const pCtx = particleCanvas.getContext('2d')!
  const pGradient = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32)
  pGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  pGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)')
  pGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.2)')
  pGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  pCtx.fillStyle = pGradient
  pCtx.fillRect(0, 0, 64, 64)
  const particleTexture = new THREE.CanvasTexture(particleCanvas)

  const particleMaterial = new THREE.PointsMaterial({
    size: 4,
    map: particleTexture,
    transparent: true,
    opacity: 0,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })

  const particles = new THREE.Points(particleGeometry, particleMaterial)
  particleGroup.add(particles)

  // ============================================================
  // 🔮 创建裂隙环
  // ============================================================
  const ringGroup = new THREE.Group()
  scene.add(ringGroup)

  const ringGeometries: THREE.TorusGeometry[] = []
  const ringMaterials: THREE.MeshBasicMaterial[] = []

  for (let i = 0; i < config.riftRings; i++) {
    const radius = 60 + i * 20
    const geometry = new THREE.TorusGeometry(radius, 2, 8, 100)
    ringGeometries.push(geometry)

    // 渐变色
    const t = i / config.riftRings
    const color = colors.magenta.clone().lerp(colors.gold, t)

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    ringMaterials.push(material)

    const ring = new THREE.Mesh(geometry, material)
    ring.rotation.x = Math.PI / 2
    ring.rotation.y = (i / config.riftRings) * Math.PI
    ringGroup.add(ring)
  }

  // ============================================================
  // 🌈 创建时空射线
  // ============================================================
  const rayGroup = new THREE.Group()
  scene.add(rayGroup)

  const rayGeometries: THREE.BufferGeometry[] = []
  const rayMaterials: THREE.LineBasicMaterial[] = []

  for (let i = 0; i < config.spaceRays; i++) {
    const points: THREE.Vector3[] = []
    const startRadius = 30
    const endRadius = 200

    const startAngle = (i / config.spaceRays) * Math.PI * 2
    const endAngle = startAngle + Math.PI / 4 + (Math.random() * Math.PI) / 4

    for (let j = 0; j <= 20; j++) {
      const t = j / 20
      const radius = startRadius + (endRadius - startRadius) * t
      const angle = startAngle + (endAngle - startAngle) * t
      const height = Math.sin(t * Math.PI * 3) * 30

      points.push(new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius))
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    rayGeometries.push(geometry)

    // 随机颜色
    const colorsArray = [colors.magenta, colors.gold, colors.cyan, colors.silver]
    const color = colorsArray[Math.floor(Math.random() * colorsArray.length)]

    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    rayMaterials.push(material)

    const ray = new THREE.Line(geometry, material)
    rayGroup.add(ray)
  }

  // ============================================================
  // 🌀 创建引力波纹
  // ============================================================
  const rippleGroup = new THREE.Group()
  scene.add(rippleGroup)

  const rippleGeometries: THREE.RingGeometry[] = []
  const rippleMaterials: THREE.MeshBasicMaterial[] = []
  const rippleMeshes: THREE.Mesh[] = []

  for (let i = 0; i < config.gravityRipples; i++) {
    const geometry = new THREE.RingGeometry(0, 1, 64)
    rippleGeometries.push(geometry)

    const material = new THREE.MeshBasicMaterial({
      color: colors.cyan,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    rippleMaterials.push(material)

    const ripple = new THREE.Mesh(geometry, material)
    ripple.rotation.x = Math.PI / 2
    ripple.rotation.z = Math.random() * Math.PI
    ripple.scale.set(0, 0, 0)
    rippleGroup.add(ripple)
    rippleMeshes.push(ripple)
  }

  // ============================================================
  // ✨ GSAP动画系统
  // ============================================================
  const allTweensArray: gsap.Tween[] = []

  // 入场动画：钻石节点
  const diamondTargets = diamondData.map(() => ({ scale: 0 }))
  const diamondFadeIn = gsap.to(diamondTargets, {
    scale: 1,
    duration: 1.8,
    stagger: 0.15,
    ease: 'elastic.out(1, 0.5)',
    delay: 0.5,
    onUpdate: function () {
      for (let i = 0; i < diamondData.length; i++) {
        diamondMesh.getMatrixAt(i, dummy.matrix)
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)
        const baseScale = 1 + Math.sin(Date.now() * 0.002 + diamondData[i].phase) * 0.2
        dummy.scale.setScalar(baseScale * diamondTargets[i].scale)
        dummy.updateMatrix()
        diamondMesh.setMatrixAt(i, dummy.matrix)
      }
      diamondMesh.instanceMatrix.needsUpdate = true
      diamondMaterial.opacity = Math.min(1, diamondTargets[0].scale * 0.9)
    }
  })
  allTweensArray.push(diamondFadeIn)

  // 入场动画：能量粒子
  const particleFadeIn = gsap.to(particleMaterial, {
    opacity: 1,
    duration: 2,
    ease: 'power2.out',
    delay: 0.8
  })
  allTweensArray.push(particleFadeIn)

  const particleExpand = gsap.to(
    { progress: 0 },
    {
      progress: 1,
      duration: 1.8,
      ease: 'power3.out',
      delay: 0.8
    }
  )
  allTweensArray.push(particleExpand)

  // 入场动画：裂隙环
  ringMaterials.forEach((mat, i) => {
    const tween = gsap.to(mat, {
      opacity: 0.4 + Math.random() * 0.3,
      duration: 1.8,
      delay: 1 + i * 0.2,
      ease: 'power2.out'
    })
    allTweensArray.push(tween)
  })

  // 入场动画：时空射线
  rayMaterials.forEach((mat, i) => {
    const tween = gsap.to(mat, {
      opacity: 0.5 + Math.random() * 0.4,
      duration: 1.8,
      delay: 1.5 + i * 0.1,
      ease: 'power2.out'
    })
    allTweensArray.push(tween)
  })

  // 引力波纹动画循环
  rippleMeshes.forEach((ripple, i) => {
    const tween = gsap.to(ripple.scale, {
      x: 150 + Math.random() * 50,
      y: 150 + Math.random() * 50,
      z: 1,
      duration: 3.5,
      delay: i * 0.6,
      ease: 'power1.out',
      repeat: -1,
      repeatDelay: 1,
      onRepeat: function () {
        ripple.scale.set(0, 0, 1)
      },
      onStart: function () {
        ripple.material.opacity = 0.6
      },
      onUpdate: function () {
        const progress = this.progress()
        ripple.material.opacity = 0.6 * (1 - progress * 0.8)
      }
    })
    allTweensArray.push(tween)
  })

  // 入场动画：相机推近
  const cameraTimeline = gsap.timeline({ paused: true })
  cameraTimeline.to(
    camera.position,
    {
      x: 0,
      y: 40,
      z: 200,
      duration: 2.5,
      ease: 'power3.out'
    },
    0
  )

  // 运镜动画：多角度观察
  const cinematicTimeline = gsap.timeline({
    paused: true,
    onComplete: () => {
      // 运镜结束后自动清理特效
      console.log('[时空裂隙之眼特效] 运镜动画完成，开始清理特效')
      clearEffect()
    }
  })

  // 角度1：俯视
  cinematicTimeline.to(
    camera.position,
    {
      x: 80,
      y: 140,
      z: 160,
      duration: 3,
      ease: 'power2.inOut'
    },
    0
  )

  // 角度2：侧面
  cinematicTimeline.to(
    camera.position,
    {
      x: -160,
      y: 50,
      z: 120,
      duration: 3,
      ease: 'power2.inOut'
    },
    3
  )

  // 角度3：底部仰视
  cinematicTimeline.to(
    camera.position,
    {
      x: 60,
      y: -120,
      z: 160,
      duration: 3,
      ease: 'power2.inOut'
    },
    6
  )

  // 角度4：环绕
  cinematicTimeline.to(
    camera.position,
    {
      x: -80,
      y: 80,
      z: 180,
      duration: 3,
      ease: 'power2.inOut'
    },
    9
  )

  // 角度5：回归正面
  cinematicTimeline.to(
    camera.position,
    {
      x: 0,
      y: 40,
      z: 200,
      duration: 3,
      ease: 'power2.inOut'
    },
    12
  )

  // ============================================================
  // 🔄 动画循环
  // ============================================================
  const timer = new THREE.Timer()

  function animate() {
    renderer.setAnimationLoop(() => {
      const elapsed = timer.getElapsed()

      // 更新钻石节点
      diamondData.forEach((data, i) => {
        data.angle += data.speed * 0.01

        const x = Math.cos(data.angle) * data.radius
        const y = data.height + Math.sin(elapsed * 2 + data.phase) * 5
        const z = Math.sin(data.angle) * data.radius

        diamondMesh.getMatrixAt(i, dummy.matrix)
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)
        dummy.position.set(x, y, z)
        dummy.rotation.x += 0.01
        dummy.rotation.y += 0.015
        dummy.rotation.z += 0.008

        const baseScale = 1 + Math.sin(elapsed * 3 + data.phase) * 0.15
        dummy.scale.setScalar(baseScale)

        dummy.updateMatrix()
        diamondMesh.setMatrixAt(i, dummy.matrix)
      })
      diamondMesh.instanceMatrix.needsUpdate = true

      // 更新能量粒子
      const expansion = particleExpand.progress()
      const posAttr = particleGeometry.attributes.position as THREE.BufferAttribute

      for (let i = 0; i < config.energyParticles; i++) {
        const i3 = i * 3
        const phase = particlePhases[i]

        let x = particlePositions[i3]
        let y = particlePositions[i3 + 1]
        let z = particlePositions[i3 + 2]

        // 旋涡运动
        const dist = Math.sqrt(x * x + z * z)
        const angle = Math.atan2(z, x)
        const speed = 0.02 + (150 - dist) * 0.0003
        const newAngle = angle + speed * (1 + expansion)

        x = Math.cos(newAngle) * dist
        z = Math.sin(newAngle) * dist

        // 垂直波动
        y += Math.sin(elapsed * 2 + phase) * 0.3

        posAttr.array[i3] = x
        posAttr.array[i3 + 1] = y
        posAttr.array[i3 + 2] = z
      }

      posAttr.needsUpdate = true
      particleGroup.rotation.y += 0.0005

      // 更新裂隙环
      ringMaterials.forEach((mat, i) => {
        const pulse = Math.sin(elapsed * 3 + i * 0.8) * 0.5 + 0.5
        mat.opacity = 0.4 + pulse * 0.3
      })
      ringGroup.rotation.z += 0.002

      // 更新时空射线
      rayMaterials.forEach((mat, i) => {
        const pulse = Math.sin(elapsed * 4 + i * 0.5) * 0.5 + 0.5
        mat.opacity = 0.5 + pulse * 0.4
      })
      rayGroup.rotation.y += 0.001

      // 相机轻微摆动（仅在运镜动画运行时）
      if (isCameraAnimationRunning) {
        camera.position.y += Math.sin(elapsed * 0.5) * 0.1
      }

      renderer.render(scene, camera)
    })
  }

  animate()

  // 启动相机入场动画
  cameraTimeline.play()

  // 延迟启动电影级运镜（2.5秒后）
  setTimeout(() => {
    cinematicTimeline.play()
  }, 2500)

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
  // 🛑 停止运镜动画
  // ============================================================
  const stopCameraAnimation = () => {
    isCameraAnimationRunning = false

    // 停止相机运镜
    if (cinematicTimeline) {
      cinematicTimeline.pause()
    }

    // 清除相机轻微摆动
    gsap.killTweensOf(camera.position)
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

    // 淡出钻石
    fadeOutTimeline.to(
      diamondMaterial,
      {
        opacity: 0,
        duration: 1,
        ease: 'power2.out'
      },
      0
    )

    // 淡出粒子
    fadeOutTimeline.to(
      particleMaterial,
      {
        opacity: 0,
        duration: 1,
        ease: 'power2.out'
      },
      0.2
    )

    // 淡出裂隙环
    ringMaterials.forEach((mat, i) => {
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

    // 淡出时空射线
    rayMaterials.forEach((mat, i) => {
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

    // 停止运镜
    stopCameraAnimation()
  }

  // ============================================================
  // 🧹 内部清理函数（实际执行清理）
  // ============================================================
  const performCleanup = () => {
    // 1. 停止所有GSAP动画
    allTweensArray.forEach(tween => {
      try {
        tween.kill()
      } catch (e) {}
    })

    // 2. 清理特定目标的tweens
    gsap.killTweensOf(diamondTargets)
    gsap.killTweensOf(particleMaterial)
    gsap.killTweensOf(particleMaterial, 'opacity')
    gsap.killTweensOf({ progress: 0 })

    // 3. 清理相机动画
    if (cameraTimeline) {
      cameraTimeline.kill()
    }
    if (cinematicTimeline) {
      cinematicTimeline.kill()
    }

    // 4. 停止渲染循环
    renderer.setAnimationLoop(null)

    // 5. 移除事件监听器
    window.removeEventListener('resize', handleResize)

    // 6. 清理引用
    dummy.position.set(0, 0, 0)
    dummy.rotation.set(0, 0, 0)
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()

    // 7. 从场景移除
    if (scene) {
      scene.remove(diamondGroup)
      scene.remove(particleGroup)
      scene.remove(ringGroup)
      scene.remove(rayGroup)
      scene.remove(rippleGroup)
    }

    // 8. 释放几何体
    diamondGeometry.dispose()
    particleGeometry.dispose()
    ringGeometries.forEach(geo => geo.dispose())
    rayGeometries.forEach(geo => geo.dispose())
    rippleGeometries.forEach(geo => geo.dispose())

    // 9. 释放材质
    diamondMaterial.dispose()
    particleMaterial.dispose()
    ringMaterials.forEach(mat => mat.dispose())
    rayMaterials.forEach(mat => mat.dispose())
    rippleMaterials.forEach(mat => mat.dispose())

    // 10. 从容器移除
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement)
    }

    // 11. 清空引用
    diamondTexture.dispose()
    particleTexture.dispose()

    // 清空所有引用
    diamondData.length = 0
    allTweensArray.length = 0
    rippleMeshes.length = 0
  }

  // ============================================================
  // 🧹 对外暴露的清理函数（调用内部清理）
  // ============================================================
  const cleanup = () => {
    performCleanup()
  }

  return {
    cleanup,
    stopCameraAnimation,
    clearEffect
  }
}
