/**
 * 🌌 量子织梦机 v2.0 - 多维时空编织系统
 *
 * 创新亮点：
 * - 基于 Three.js WebGPU + InstancedMesh 批量渲染
 * - 五层独立系统：螺旋能量流、量子纠缠球、时空涟漪、霓虹光环、数据流
 * - 动态连线系统：节点间的量子纠缠效果
 * - 呼吸动画 + 粒子波浪 + 颜色渐变
 *
 * 核心特性：
 * 1. 12个量子节点形成动态网络
 * 2. 5000个螺旋能量粒子
 * 3. 8层时空涟漪波纹
 * 4. 5层霓虹光环
 * 5. 2000个数据流粒子
 * 6. 节点间的动态量子纠缠线
 * 7. 完整的GSAP电影级运镜（4个角度切换）
 */

import * as THREE from 'three/webgpu'
import gsap from 'gsap'

/**
 * 量子织梦机参数导出
 */
export const quantumDreamWeaverEffectParams = {
  quantumNodes: 12,       // 量子节点数量
  spiralParticles: 5000,  // 螺旋粒子数量
  rippleLayers: 8,        // 涟漪层数
  haloLayers: 5,          // 光环层数
  dataParticles: 2000,    // 数据流粒子数量
  maxConnections: 8,       // 每个节点最大连接数
  orbitRadius: 60,         // 轨道半径
  connectionDistance: 40   // 连接距离阈值
}

/**
 * 量子织梦机主函数
 */
export const quantumDreamWeaverEffect = (container: HTMLElement) => {
  const { width, height } = container.getBoundingClientRect()

  // 🎨 性能配置
  const config = {
    ...quantumDreamWeaverEffectParams
  }

  // 🎥 相机设置
  let camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000)
  camera.position.set(0, 40, 200)

  // 🌌 场景（透明背景）
  let scene = new THREE.Scene()

  // 📐 WebGPU 渲染器初始化
  let renderer = new THREE.WebGPURenderer({
    antialias: false,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
  container.appendChild(renderer.domElement)

  // 🎭 所有GSAP动画收集
  const allTweensArray: any[] = []
  let cameraAnimationTimer: number | null = null
  let cinematicTimeline: gsap.core.Timeline | null = null

  // 临时对象（复用）
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  // ============================================================
  // 🌀 第一层：螺旋能量流粒子系统
  // ============================================================
  const spiralGeometry = new THREE.SphereGeometry(0.4, 8, 8)
  const spiralMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.8
  })

  let spiralMesh = new THREE.InstancedMesh(
    spiralGeometry,
    spiralMaterial,
    config.spiralParticles
  )

  interface SpiralParticleData {
    angle: number
    radius: number
    height: number
    angleSpeed: number
    verticalSpeed: number
    phase: number
    layer: number
    hue: number
  }

  const spiralParticles: SpiralParticleData[] = []
  const spiralLayers = 3

  for (let i = 0; i < config.spiralParticles; i++) {
    const layer = i % spiralLayers
    const layerIndex = Math.floor(i / spiralLayers)
    const angle = (layerIndex / (config.spiralParticles / spiralLayers)) * Math.PI * 2
    const radius = 30 + layer * 15
    const height = (Math.random() - 0.5) * 100
    const hue = 0.5 + layer * 0.15

    dummy.position.set(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    )
    dummy.scale.setScalar(0.3 + Math.random() * 0.4)
    dummy.updateMatrix()
    spiralMesh.setMatrixAt(i, dummy.matrix)

    spiralParticles.push({
      angle,
      radius,
      height,
      angleSpeed: 0.0003 + Math.random() * 0.0005 * (layer + 1),
      verticalSpeed: 0.0002 + Math.random() * 0.0003,
      phase: Math.random() * Math.PI * 2,
      layer,
      hue
    })
  }

  scene.add(spiralMesh)

  // ============================================================
  // ⚛️ 第二层：量子纠缠球网络
  // ============================================================
  const nodeGeometry = new THREE.IcosahedronGeometry(3, 1)
  const nodeMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color().setHSL(0.6, 0.9, 0.6),
    transparent: true,
    opacity: 0.85,
    wireframe: false
  })

  let nodeMesh = new THREE.InstancedMesh(
    nodeGeometry,
    nodeMaterial,
    config.quantumNodes
  )

  interface NodeData {
    position: THREE.Vector3
    orbitAngle: number
    orbitRadius: number
    orbitSpeed: number
    verticalAngle: number
    verticalSpeed: number
    pulsePhase: number
    connections: number[]
  }

  const nodesData: NodeData[] = []

  for (let i = 0; i < config.quantumNodes; i++) {
    const angle = (i / config.quantumNodes) * Math.PI * 2
    const radius = config.orbitRadius + Math.random() * 20
    const verticalAngle = (Math.random() - 0.5) * Math.PI * 0.8

    dummy.position.set(
      Math.cos(angle) * radius,
      Math.sin(verticalAngle) * 40,
      Math.sin(angle) * radius
    )
    dummy.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    )
    dummy.scale.setScalar(1)
    dummy.updateMatrix()
    nodeMesh.setMatrixAt(i, dummy.matrix)

    nodesData.push({
      position: dummy.position.clone(),
      orbitAngle: angle,
      orbitRadius: radius,
      orbitSpeed: 0.0002 + Math.random() * 0.0004,
      verticalAngle,
      verticalSpeed: 0.0001 + Math.random() * 0.0002,
      pulsePhase: Math.random() * Math.PI * 2,
      connections: []
    })
  }

  scene.add(nodeMesh)

  // 创建量子纠缠线
  let connectionGroup = new THREE.Group()
  const connections: THREE.Line[] = []

  for (let i = 0; i < config.quantumNodes; i++) {
    for (let j = i + 1; j < config.quantumNodes; j++) {
      const distance = nodesData[i].position.distanceTo(nodesData[j].position)

      if (distance < config.connectionDistance) {
        const points = [
          nodesData[i].position.clone(),
          nodesData[j].position.clone()
        ]
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
        const lineMaterial = new THREE.LineBasicMaterial({
          color: new THREE.Color().setHSL(0.6, 0.8, 0.5),
          transparent: true,
          opacity: 0.3
        })
        const line = new THREE.Line(lineGeometry, lineMaterial)
        line.userData = { nodeA: i, nodeB: j }
        connectionGroup.add(line)
        connections.push(line)

        nodesData[i].connections.push(j)
        nodesData[j].connections.push(i)
      }
    }
  }

  scene.add(connectionGroup)

  // ============================================================
  // 🌊 第三层：时空涟漪
  // ============================================================
  let rippleGroup = new THREE.Group()

  for (let r = 0; r < config.rippleLayers; r++) {
    const rippleGeometry = new THREE.RingGeometry(
      10 + r * 8,
      10 + r * 8 + 1.5,
      64
    )
    const rippleMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.55 + r * 0.05, 0.8, 0.5),
      transparent: true,
      opacity: 0.15 - r * 0.015,
      side: THREE.DoubleSide
    })
    const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial)
    ripple.rotation.x = -Math.PI / 2
    ripple.userData = {
      baseScale: 1,
      phase: r * 0.5,
      speed: 0.5 + r * 0.1
    }
    rippleGroup.add(ripple)
  }

  scene.add(rippleGroup)

  // ============================================================
  // 💫 第四层：霓虹光环
  // ============================================================
  let haloGroup = new THREE.Group()

  for (let h = 0; h < config.haloLayers; h++) {
    const haloGeometry = new THREE.TorusGeometry(
      45 + h * 12,
      0.5,
      16,
      100
    )
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.5 + h * 0.1, 0.9, 0.6),
      transparent: true,
      opacity: 0.2 - h * 0.03
    })
    const halo = new THREE.Mesh(haloGeometry, haloMaterial)
    halo.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3
    halo.rotation.y = (Math.random() - 0.5) * 0.3
    halo.userData = {
      rotationSpeed: 0.001 + Math.random() * 0.002,
      pulsePhase: Math.random() * Math.PI * 2
    }
    haloGroup.add(halo)
  }

  scene.add(haloGroup)

  // ============================================================
  // 💾 第五层：数据流粒子
  // ============================================================
  const dataGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3)
  const dataMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.7
  })

  let dataMesh = new THREE.InstancedMesh(
    dataGeometry,
    dataMaterial,
    config.dataParticles
  )

  interface DataParticle {
    position: THREE.Vector3
    targetPosition: THREE.Vector3
    speed: number
    hue: number
    phase: number
    layer: number
  }

  const dataParticles: DataParticle[] = []

  for (let i = 0; i < config.dataParticles; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 20 + Math.random() * 80
    const y = (Math.random() - 0.5) * 120
    const hue = 0.4 + Math.random() * 0.4

    dummy.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    )
    dummy.scale.setScalar(0.3 + Math.random() * 0.3)
    dummy.updateMatrix()
    dataMesh.setMatrixAt(i, dummy.matrix)

    dataParticles.push({
      position: dummy.position.clone(),
      targetPosition: new THREE.Vector3(
        Math.cos(angle + Math.random() * 0.5) * radius,
        y + (Math.random() - 0.5) * 20,
        Math.sin(angle + Math.random() * 0.5) * radius
      ),
      speed: 0.5 + Math.random() * 1.5,
      hue,
      phase: Math.random() * Math.PI * 2,
      layer: Math.floor(Math.random() * 3)
    })
  }

  scene.add(dataMesh)

  // ============================================================
  // 🔄 动画循环
  // ============================================================
  const timer = new THREE.Timer()

  // 节点缩放数组（用于GSAP动画）
  let nodeScales: number[] = new Array(config.quantumNodes).fill(0)

  const animate = () => {
    const elapsed = timer.getElapsed()

    // 更新螺旋能量流
    spiralParticles.forEach((data, i) => {
      data.angle += data.angleSpeed
      data.height = Math.sin(elapsed * data.verticalSpeed + data.phase) * 50

      const waveRadius = data.radius + Math.sin(elapsed * 2 + data.phase) * 3

      dummy.position.set(
        Math.cos(data.angle) * waveRadius,
        data.height,
        Math.sin(data.angle) * waveRadius
      )

      const pulseScale = 0.3 + Math.sin(elapsed * 3 + data.phase) * 0.2
      dummy.scale.setScalar(pulseScale)

      color.setHSL((data.hue + elapsed * 0.05) % 1, 0.85, 0.65)
      spiralMesh.setColorAt(i, color)

      dummy.updateMatrix()
      spiralMesh.setMatrixAt(i, dummy.matrix)
    })
    spiralMesh.instanceMatrix.needsUpdate = true
    spiralMesh.instanceColor!.needsUpdate = true

    // 更新量子节点
    nodesData.forEach((data, i) => {
      data.orbitAngle += data.orbitSpeed
      data.verticalAngle += data.verticalSpeed

      dummy.position.set(
        Math.cos(data.orbitAngle) * data.orbitRadius,
        Math.sin(data.verticalAngle) * 40,
        Math.sin(data.orbitAngle) * data.orbitRadius
      )

      // 呼吸缩放（GSAP控制 + 自身呼吸）
      const pulseScale = 1 + Math.sin(elapsed * 2 + data.pulsePhase) * 0.2
      const gsapScale = nodeScales[i] || 0
      dummy.scale.setScalar(pulseScale * (0.2 + gsapScale * 0.8))

      dummy.rotation.x += 0.01
      dummy.rotation.y += 0.015
      dummy.updateMatrix()
      nodeMesh.setMatrixAt(i, dummy.matrix)
    })
    nodeMesh.instanceMatrix.needsUpdate = true

    // 更新量子纠缠线
    connections.forEach(line => {
      const { nodeA, nodeB } = line.userData
      const posA = new THREE.Vector3()
      const posB = new THREE.Vector3()

      dummy.matrix.decompose(posA, new THREE.Quaternion(), new THREE.Vector3())
      nodeMesh.getMatrixAt(nodeA, dummy.matrix)
      dummy.matrix.decompose(posA, new THREE.Quaternion(), new THREE.Vector3())

      dummy.matrix.decompose(posB, new THREE.Quaternion(), new THREE.Vector3())
      nodeMesh.getMatrixAt(nodeB, dummy.matrix)
      dummy.matrix.decompose(posB, new THREE.Quaternion(), new THREE.Vector3())

      const positions = line.geometry.attributes.position
      positions.setXYZ(0, posA.x, posA.y, posA.z)
      positions.setXYZ(1, posB.x, posB.y, posB.z)
      positions.needsUpdate = true

      // 动态透明度
      const distance = posA.distanceTo(posB)
      if (line.material instanceof THREE.Material) {
        line.material.opacity = Math.max(0, 0.4 - distance * 0.01)
      }
    })

    // 更新时空涟漪
    rippleGroup.children.forEach((ripple: any, i) => {
      const phase = ripple.userData.phase
      const speed = ripple.userData.speed
      const scale = 1 + Math.sin(elapsed * speed + phase) * 0.3
      ripple.scale.setScalar(scale)
      ripple.material.opacity = (0.15 - i * 0.015) * (0.5 + Math.sin(elapsed + phase) * 0.5)
    })

    // 更新霓虹光环
    haloGroup.children.forEach((halo: any) => {
      halo.rotation.z += halo.userData.rotationSpeed
      const pulseScale = 1 + Math.sin(elapsed * 1.5 + halo.userData.pulsePhase) * 0.1
      halo.scale.setScalar(pulseScale)
    })

    // 更新数据流粒子
    dataParticles.forEach((data, i) => {
      data.position.lerp(data.targetPosition, 0.02)

      dummy.position.copy(data.position)
      dummy.scale.setScalar(0.3 + Math.sin(elapsed * 5 + data.phase) * 0.15)

      color.setHSL((data.hue + elapsed * 0.08) % 1, 0.8, 0.6)
      dataMesh.setColorAt(i, color)

      dummy.updateMatrix()
      dataMesh.setMatrixAt(i, dummy.matrix)

      // 随机更新目标位置
      if (Math.random() < 0.005) {
        const angle = Math.random() * Math.PI * 2
        const radius = 20 + Math.random() * 80
        data.targetPosition.set(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 120,
          Math.sin(angle) * radius
        )
      }
    })
    dataMesh.instanceMatrix.needsUpdate = true
    dataMesh.instanceColor!.needsUpdate = true

    renderer.render(scene, camera)
  }

  // 初始化 WebGPU
  const init = async () => {
    try {
      await renderer.init()
      renderer.setAnimationLoop(animate)

      // 播放入场动画
      playEntranceAnimation()

      // 2.5秒后启动运镜
      cameraAnimationTimer = window.setTimeout(() => {
        playCameraAnimation()
        cameraAnimationTimer = null
      }, 2500)

      console.log('[量子织梦机特效 v2.0] 初始化完成')
    } catch (error) {
      console.error('[量子织梦机特效 v2.0] 初始化失败:', error)
    }
  }

  // ============================================================
  // 🎬 GSAP动画系统
  // ============================================================

  // 入场动画
  const playEntranceAnimation = () => {
    // 相机推近
    const cameraTween = gsap.to(camera.position, {
      x: 0,
      y: 20,
      z: 150,
      duration: 2.5,
      ease: 'power3.out'
    })
    allTweensArray.push(cameraTween)

    // 量子节点弹入
    nodeScales = new Array(config.quantumNodes).fill(0)
    nodesData.forEach((_, i) => {
      const tween = gsap.to({ value: 0 }, {
        value: 1,
        duration: 1.2,
        delay: i * 0.1,
        ease: 'elastic.out(1, 0.5)',
        onUpdate: function() {
          nodeScales[i] = this.progress()
        }
      })
      allTweensArray.push(tween)
    })

    // 螺旋能量流扩散
    const spiralExpand = gsap.fromTo(
      { expansion: 0 },
      { expansion: 1 },
      {
        duration: 1.8,
        delay: 0.3,
        ease: 'power2.out'
      }
    )
    allTweensArray.push(spiralExpand)

    // 涟漪展开
    rippleGroup.children.forEach((ripple: any, i) => {
      const tween = gsap.from(ripple.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2,
        delay: i * 0.15,
        ease: 'power2.out'
      })
      allTweensArray.push(tween)
    })

    // 光环淡入
    haloGroup.children.forEach((halo: any, i) => {
      const tween = gsap.from(halo.material as THREE.Material, {
        opacity: 0,
        duration: 1.5,
        delay: 0.8 + i * 0.1,
        ease: 'power2.out'
      })
      allTweensArray.push(tween)
    })

    // 数据流淡入
    gsap.from(dataMaterial, {
      opacity: 0,
      duration: 1.5,
      delay: 1,
      ease: 'power2.out'
    })
    allTweensArray.push(gsap.from(dataMaterial, {
      opacity: 0,
      duration: 1.5,
      delay: 1,
      ease: 'power2.out'
    }) as any)
  }

  // 运镜动画
  const playCameraAnimation = () => {
    // 检查 camera 是否存在（可能在切换特效时已被清理）
    if (!camera) {
      console.warn('[量子织梦机特效] camera 已被清理，跳过运镜动画')
      return
    }

    if (cinematicTimeline) {
      cinematicTimeline.kill()
    }

    cinematicTimeline = gsap.timeline({
      repeat: 0,
      onComplete: () => {
        console.log('[量子织梦机特效] 运镜动画完成，开始清理特效')
        clearEffect()
      }
    })

    // 角度1：俯视全景
    cinematicTimeline.to(camera.position, {
      x: 80,
      y: 100,
      z: 120,
      duration: 4,
      ease: 'power2.inOut'
    }, 0)

    // 角度2：环绕穿梭
    cinematicTimeline.to(camera.position, {
      x: -100,
      y: 50,
      z: 100,
      duration: 4,
      ease: 'power2.inOut'
    }, 4)

    // 角度3：底部仰望
    cinematicTimeline.to(camera.position, {
      x: 60,
      y: -80,
      z: 140,
      duration: 4,
      ease: 'power2.inOut'
    }, 8)

    // 角度4：回归正面
    cinematicTimeline.to(camera.position, {
      x: 0,
      y: 20,
      z: 150,
      duration: 4,
      ease: 'power2.inOut'
    }, 12)

    allTweensArray.push(cinematicTimeline)
  }

  // 窗口调整
  const handleResize = () => {
    const { width, height } = container.getBoundingClientRect()
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }

  window.addEventListener('resize', handleResize)

  // 启动初始化
  init()

  // ============================================================
  // 🧹 内部清理函数
  // ============================================================
  const performCleanup = () => {
    try {
      // 清除延迟执行的运镜动画 timer
      if (cameraAnimationTimer !== null) {
        clearTimeout(cameraAnimationTimer)
        cameraAnimationTimer = null
      }

      // 杀死所有 tweens
      allTweensArray.forEach((tween: any) => {
        if (tween && tween.kill) tween.kill()
      })
      allTweensArray.length = 0

      // 杀死对象 tweens
      gsap.killTweensOf(camera.position)
      gsap.killTweensOf(nodeMesh)
      gsap.killTweensOf(spiralMesh)
      gsap.killTweensOf(dataMesh)

      // 停止相机时间线
      if (cinematicTimeline) {
        cinematicTimeline.kill()
        cinematicTimeline = null
      }

      // 停止渲染循环
      if (renderer) {
        renderer.setAnimationLoop(null)
      }

      // 移除事件监听
      window.removeEventListener('resize', handleResize)

      // 清理临时对象
      dummy.position.set(0, 0, 0)
      dummy.scale.setScalar(1)
      dummy.rotation.set(0, 0, 0)
      color.set(0xffffff)

      // 从场景移除所有对象
      if (scene) {
        scene.remove(spiralMesh)
        scene.remove(nodeMesh)
        scene.remove(connectionGroup)
        scene.remove(rippleGroup)
        scene.remove(haloGroup)
        scene.remove(dataMesh)
      }

      // 释放几何体和材质
      if (spiralGeometry) spiralGeometry.dispose()
      if (spiralMaterial) spiralMaterial.dispose()
      if (nodeGeometry) nodeGeometry.dispose()
      if (nodeMaterial) nodeMaterial.dispose()
      if (rippleGroup) {
        rippleGroup.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose()
          if (obj.material) obj.material.dispose()
        })
      }
      if (haloGroup) {
        haloGroup.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose()
          if (obj.material) obj.material.dispose()
        })
      }
      if (connectionGroup) {
        connectionGroup.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose()
          if (obj.material) obj.material.dispose()
        })
      }
      if (dataGeometry) dataGeometry.dispose()
      if (dataMaterial) dataMaterial.dispose()

      // 从DOM移除canvas
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement)
        }
      }

      // 释放渲染器
      if (renderer) {
        renderer.dispose()
      }

      // 清空数组
      spiralParticles.length = 0
      nodesData.length = 0
      connections.length = 0
      dataParticles.length = 0
      nodeScales.length = 0

  // 清空所有引用
  spiralMesh = null as any
  nodeMesh = null as any
  connectionGroup = null as any
  rippleGroup = null as any
  haloGroup = null as any
  dataMesh = null as any

      console.log('[量子织梦机特效] 清理完成')
    } catch (error) {
      console.error('[量子织梦机特效] 清理时出错:', error)
    }
  }

  // ============================================================
  // 🧹 清除特效（淡出后清理）
  // ============================================================
  const clearEffect = () => {
    const fadeOutTimeline = gsap.timeline({
      onComplete: () => {
        performCleanup()
      }
    })

    // 淡出螺旋粒子
    if (spiralMaterial) {
      fadeOutTimeline.to(spiralMaterial, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0)
    }

    // 淡出量子节点
    if (nodeMaterial) {
      fadeOutTimeline.to(nodeMaterial, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0.1)
    }

    // 淡出连接线
    connections.forEach((line: any, i) => {
      if (line.material) {
        fadeOutTimeline.to(line.material, {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out'
        }, 0.2 + i * 0.02)
      }
    })

    // 淡出涟漪
    rippleGroup.children.forEach((ripple: any, i) => {
      if (ripple.material) {
        fadeOutTimeline.to(ripple.material as THREE.Material, {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out'
        }, 0.3 + i * 0.05)
      }
    })

    // 淡出光环
    haloGroup.children.forEach((halo: any, i) => {
      if (halo.material) {
        fadeOutTimeline.to(halo.material as THREE.Material, {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out'
        }, 0.4 + i * 0.05)
      }
    })

    // 淡出数据流
    if (dataMaterial) {
      fadeOutTimeline.to(dataMaterial, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0.5)
    }
  }

  // ============================================================
  // 🧹 停止相机动画
  // ============================================================
  const stopCameraAnimation = () => {
    if (cinematicTimeline) {
      console.log('停止量子织梦机运镜动画')
      cinematicTimeline.kill()
      cinematicTimeline = null
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
