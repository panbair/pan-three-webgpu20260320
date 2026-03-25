// GPU 量子意识网络特效 (GPU Quantum Consciousness Network Effect)
// 特性: 量子节点、神经连接、思维流动、意识波纹、电影级运镜
// 技术栈: Three.js WebGPU + 粒子系统 + GSAP 动画
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)
// 原理分析: 基于全息神经网络，使用 MeshPhysicalMaterial 替代 ShaderMaterial

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'

// 配置参数
export const quantumConsciousnessEffectParams = {
  neuronCount: 100, // 神经元数量
  thoughtParticleCount: 3000, // 思维粒子数量
  ringCount: 6, // 意识环数量
  networkRadius: 10, // 网络半径
  connectionDistance: 5, // 连接距离
  neuronMinSize: 0.2, // 神经元最小尺寸
  neuronMaxSize: 0.5, // 神经元最大尺寸
  consciousnessColors: [0x00d4ff, 0xff00ff, 0x00ff88, 0xffff00, 0xff4400], // 意识颜色
  ambientLightIntensity: 0.15, // 环境光强度
  pointLightIntensity: 1.5, // 点光源强度
  neuronPulseSpeed: 2, // 神经元脉冲速度
  signalSpeed: 0.8, // 信号传输速度
  autoRotate: true, // 自动运镜
  quantumGlow: true, // 量子发光效果
  thoughtFlow: true // 思维流动效果
}

type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

// 神经元接口
interface Neuron {
  mesh: THREE.Mesh
  originalPosition: THREE.Vector3
  pulsePhase: number
  pulseSpeed: number
  floatOffset: THREE.Vector3
}

// 突触接口
interface Synapse {
  mesh: THREE.Line
  signalPos: number
  signalSpeed: number
  active: number
}

// 思维粒子接口
interface ThoughtParticle {
  position: THREE.Vector3
  originalPosition: THREE.Vector3
  speed: number
  phase: number
}

/**
 * 创建量子意识网络特效
 * @param container - 容器元素
 * @returns 清理函数
 */
export const quantumConsciousnessEffect = (container: HTMLElement) => {
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: WebGPURendererType
  let controls: OrbitControls

  // 神经元系统
  const neurons: Neuron[] = []
  const neuronPositions: THREE.Vector3[] = []

  // 突触系统
  const synapses: Synapse[] = []

  // 思维粒子系统
  const thoughtParticles: ThoughtParticle[] = []
  let thoughtParticleSystem: THREE.InstancedMesh

  // 意识环系统
  const consciousnessRings: THREE.Mesh[] = []

  // 光照系统
  const pointLights: THREE.PointLight[] = []
  let ambientLight: THREE.AmbientLight

  // 时间控制
  let timestamp = 0

  // GSAP 动画
  let cameraTimeline: gsap.core.Timeline | null = null
  const allTweens: gsap.core.Tween[] = []

  // 虚拟对象
  const dummy = new THREE.Object3D()
  const tempColor = new THREE.Color()

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
      renderer.toneMappingExposure = 2.0
      container.appendChild(renderer.domElement)
      await renderer.init()

      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
      camera.position.set(0, 5, 20)

      scene = new THREE.Scene()
      scene.background = null

      // 添加环境光
      ambientLight = new THREE.AmbientLight(0x0a0a1a, 0.2)
      scene.add(ambientLight)

      // 创建场景元素
      createNeurons()
      createSynapses()
      createThoughtParticles()
      createConsciousnessRings()
      createLighting()

      // 设置控制器
      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.06
      controls.minDistance = 5
      controls.maxDistance = 40
      controls.target.set(0, 0, 0)
      controls.enablePan = false

      // 启动动画
      renderer.setAnimationLoop(animate)

      // GSAP 动画
      playEntranceAnimation()

      console.log('[量子意识网络]初始化完成')
    } catch (error) {
      console.error('[量子意识网络]初始化失败:', error)
    }
  }

  // 创建神经元系统
  const createNeurons = () => {
    const {
      neuronCount,
      networkRadius,
      neuronMinSize,
      neuronMaxSize,
      consciousnessColors,
      quantumGlow,
      neuronPulseSpeed
    } = quantumConsciousnessEffectParams

    for (let i = 0; i < neuronCount; i++) {
      const size = neuronMinSize + Math.random() * (neuronMaxSize - neuronMinSize)

      // 创建几何体：二十面体（比球体更有科技感）
      const geometry = new THREE.IcosahedronGeometry(size, 1)

      // 创建材质：使用 MeshPhysicalMaterial 模拟发光球体
      const colorIndex = Math.floor((i / neuronCount) * consciousnessColors.length)
      const baseColor = new THREE.Color(consciousnessColors[colorIndex])

      const material = new THREE.MeshPhysicalMaterial({
        color: baseColor,
        metalness: 0.1,
        roughness: 0.3,
        transmission: 0.3,
        thickness: 0.5,
        transparent: true,
        opacity: 0.8,
        emissive: baseColor,
        emissiveIntensity: 0.5,
        clearcoat: 1,
        clearcoatRoughness: 0.2
      })

      const mesh = new THREE.Mesh(geometry, material)

      // 随机球面分布
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = networkRadius * Math.cbrt(Math.random())

      mesh.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )

      scene.add(mesh)

      neurons.push({
        mesh,
        originalPosition: mesh.position.clone(),
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: neuronPulseSpeed + Math.random() * 2,
        floatOffset: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        )
      })

      neuronPositions.push(mesh.position.clone())
    }
  }

  // 创建突触连接
  const createSynapses = () => {
    const { connectionDistance, consciousnessColors, signalSpeed } = quantumConsciousnessEffectParams

    for (let i = 0; i < neuronPositions.length; i++) {
      const connections: number[] = []

      // 找到附近的神经元
      for (let j = i + 1; j < neuronPositions.length; j++) {
        const dist = neuronPositions[i].distanceTo(neuronPositions[j])
        if (dist < connectionDistance && connections.length < 4) {
          connections.push(j)
        }
      }

      // 创建连接线
      connections.forEach(j => {
        const points = [neuronPositions[i], neuronPositions[j]]
        const geometry = new THREE.BufferGeometry().setFromPoints(points)

        // 添加进度属性（用于信号脉冲）
        const progress = new Float32Array([0, 1])
        geometry.setAttribute('progress', new THREE.BufferAttribute(progress, 1))

        const hue = (i + j) / (neuronPositions.length * 2)
        const color = new THREE.Color().setHSL(hue, 0.8, 0.6)

        const material = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.15,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })

        const line = new THREE.Line(geometry, material)
        scene.add(line)

        synapses.push({
          mesh: line,
          signalPos: Math.random(),
          signalSpeed: signalSpeed * (0.8 + Math.random() * 0.4),
          active: 0
        })
      })
    }
  }

  // 创建思维粒子
  const createThoughtParticles = () => {
    const { thoughtParticleCount, networkRadius, consciousnessColors } = quantumConsciousnessEffectParams

    const geometry = new THREE.SphereGeometry(0.03, 8, 8)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })

    thoughtParticleSystem = new THREE.InstancedMesh(geometry, material, thoughtParticleCount)
    thoughtParticleSystem.frustumCulled = false

    for (let i = 0; i < thoughtParticleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = networkRadius * 1.5 * Math.cbrt(Math.random())

      const position = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )

      thoughtParticles.push({
        position,
        originalPosition: position.clone(),
        speed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      })

      dummy.position.copy(position)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      thoughtParticleSystem.setMatrixAt(i, dummy.matrix)
    }

    scene.add(thoughtParticleSystem)
  }

  // 创建意识环
  const createConsciousnessRings = () => {
    const { ringCount, networkRadius, consciousnessColors } = quantumConsciousnessEffectParams

    for (let i = 0; i < ringCount; i++) {
      const radius = networkRadius * 0.8 + i * 1.5

      const geometry = new THREE.TorusGeometry(radius, 0.08, 16, 100)

      const colorIndex = i % consciousnessColors.length
      const baseColor = new THREE.Color(consciousnessColors[colorIndex])

      const material = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.rotation.x = Math.PI / 2 + (i % 2 === 0 ? 0.3 : -0.3)
      scene.add(mesh)

      consciousnessRings.push(mesh)
    }
  }

  // 创建光照系统
  const createLighting = () => {
    const { consciousnessColors, pointLightIntensity, ambientLightIntensity } = quantumConsciousnessEffectParams

    // 多个彩色点光源
    const lightPositions = [
      { pos: [8, 5, 8], color: consciousnessColors[0] },
      { pos: [-8, 3, 8], color: consciousnessColors[1] },
      { pos: [8, -3, -8], color: consciousnessColors[2] },
      { pos: [-8, 6, -8], color: consciousnessColors[3] },
      { pos: [0, 8, 0], color: consciousnessColors[4] }
    ]

    lightPositions.forEach(({ pos, color }) => {
      const light = new THREE.PointLight(color, pointLightIntensity, 20)
      light.position.set(...pos)
      scene.add(light)
      pointLights.push(light)
    })

    ambientLight.intensity = ambientLightIntensity
  }

  // 相机路径动画
  const playCameraAnimation = () => {
    if (!quantumConsciousnessEffectParams.autoRotate || !camera) return

    // 清理之前的运镜动画
    if (cameraTimeline) {
      cameraTimeline.kill()
    }

    cameraTimeline = gsap.timeline({
      repeat: 0,
      repeatDelay: 0.3,
      onComplete: () => {
        console.log('[量子意识特效] 运镜动画完成，开始清理特效')
        cameraTimeline = null
        clearEffect()
      }
    })

    // 第一阶段：正面深入
    cameraTimeline.to(camera.position, {
      x: 0,
      y: 2,
      z: 15,
      duration: 5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    }, 0)

    // 第二阶段：环绕上升
    cameraTimeline.to(camera.position, {
      x: 12,
      y: 8,
      z: 10,
      duration: 5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    }, '>')

    // 第三阶段：穿越核心
    cameraTimeline.to(camera.position, {
      x: -10,
      y: -5,
      z: 12,
      duration: 4.5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    }, '>')

    // 第四阶段：返回高空
    cameraTimeline.to(camera.position, {
      x: 0,
      y: 5,
      z: 20,
      duration: 5.5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    }, '>')
  }

  // 入场动画
  const playEntranceAnimation = () => {
    // 相机从远处飞入
    const t1 = gsap.from(camera.position, {
      x: 0,
      y: 30,
      z: 40,
      duration: 5,
      ease: 'power3.out'
    })
    allTweens.push(t1)

    // 神经元依次浮现
    neurons.forEach((neuron, index) => {
      const t = gsap.from(neuron.mesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.8,
        delay: index * 0.03,
        ease: 'elastic.out(1, 0.7)'
      })
      allTweens.push(t)

      // 渐变透明度
      gsap.from(neuron.mesh.material, {
        opacity: 0,
        duration: 1.2,
        delay: index * 0.03,
        ease: 'power2.out'
      })
    })

    // 突触连接渐显
    synapses.forEach((synapse, index) => {
      gsap.from(synapse.mesh.material, {
        opacity: 0,
        duration: 1.5,
        delay: 1 + index * 0.002,
        ease: 'power2.out'
      })
    })

    // 思维粒子爆发
    const t = gsap.from(thoughtParticleSystem.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 2.5,
      delay: 2,
      ease: 'power2.out'
    })
    allTweens.push(t)

    // 意识环依次展开
    consciousnessRings.forEach((ring, index) => {
      gsap.from(ring.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.8,
        delay: 3 + index * 0.3,
        ease: 'elastic.out(1, 0.6)'
      })
    })

    // 光源渐次点亮
    pointLights.forEach((light, index) => {
      gsap.from(light, {
        intensity: 0,
        duration: 1.5,
        delay: 2 + index * 0.2,
        ease: 'power2.out'
      })
    })

    // 延迟启动运镜
    setTimeout(() => {
      playCameraAnimation()
    }, 2500)
  }

  const animate = (time: number) => {
    timestamp = time * 0.001

    // 更新控制器
    if (controls) controls.update()

    const { quantumGlow, thoughtFlow } = quantumConsciousnessEffectParams

    // 更新神经元
    neurons.forEach((neuron, i) => {
      // 脉冲效果
      const pulse = Math.sin(timestamp * neuron.pulseSpeed + neuron.pulsePhase) * 0.5 + 0.5
      const scale = 1 + pulse * 0.3
      neuron.mesh.scale.setScalar(scale)

      // 量子发光
      if (quantumGlow) {
        const hue = (timestamp * 0.1 + i * 0.05) % 1
        const glowColor = new THREE.Color().setHSL(hue, 1, 0.6)
        neuron.mesh.material.emissive.lerp(glowColor, 0.02)
        neuron.mesh.material.emissiveIntensity = 0.3 + pulse * 0.4
      }

      // 悬浮动画
      const floatY = Math.sin(timestamp * 0.5 + neuron.pulsePhase) * 0.01
      neuron.mesh.position.y = neuron.originalPosition.y + floatY
    })

    // 更新突触（信号脉冲）
    synapses.forEach((synapse, i) => {
      // 信号沿连接线移动
      synapse.signalPos = (synapse.signalPos + synapse.signalSpeed * 0.016) % 1.0

      // 随机激活
      if (Math.random() < 0.008) {
        synapse.active = 1.0
      }
      synapse.active *= 0.98

      // 根据激活状态改变不透明度
      const baseOpacity = 0.15
      const signalOpacity = Math.exp(-Math.pow(synapse.signalPos - 0.5, 2) * 8) * 0.8
      const activeOpacity = synapse.active * 0.5

      synapse.mesh.material.opacity = baseOpacity + signalOpacity * synapse.active + activeOpacity

      // 激活时改变颜色
      if (synapse.active > 0.1) {
        const hue = (timestamp * 0.2 + i * 0.01) % 1
        synapse.mesh.material.color.setHSL(hue, 1, 0.7)
      }
    })

    // 更新思维粒子
    if (thoughtParticleSystem) {
      for (let i = 0; i < thoughtParticles.length; i++) {
        const particle = thoughtParticles[i]
        particle.phase += 0.02

        // 轨道运动
        const orbit = Math.sin(timestamp * particle.speed + particle.phase) * 0.5

        if (thoughtFlow) {
          // 流动效果：粒子围绕中心旋转
          const angle = timestamp * 0.2 * particle.speed
          const x = particle.originalPosition.x * Math.cos(angle) - particle.originalPosition.z * Math.sin(angle)
          const z = particle.originalPosition.x * Math.sin(angle) + particle.originalPosition.z * Math.cos(angle)

          particle.position.x = x
          particle.position.y = particle.originalPosition.y + orbit
          particle.position.z = z
        } else {
          particle.position.y = particle.originalPosition.y + orbit
        }

        // 闪烁效果
        const flicker = 0.6 + Math.sin(timestamp * 8 + particle.phase) * 0.4

        dummy.position.copy(particle.position)
        dummy.scale.setScalar(flicker * 0.8)
        dummy.updateMatrix()
        thoughtParticleSystem.setMatrixAt(i, dummy.matrix)
      }
      thoughtParticleSystem.instanceMatrix.needsUpdate = true
    }

    // 更新意识环
    consciousnessRings.forEach((ring, i) => {
      ring.rotation.z += 0.002 * (i % 2 === 0 ? 1 : -1)
      ring.rotation.x = Math.PI / 2 + Math.sin(timestamp + i) * 0.1

      // 脉冲缩放
      const pulse = 1 + Math.sin(timestamp * 2 + i * 0.5) * 0.05
      ring.scale.setScalar(pulse)

      // 颜色渐变
      if (quantumGlow) {
        const hue = (timestamp * 0.05 + i * 0.1) % 1
        ring.material.color.setHSL(hue, 1, 0.6)
      }
    })

    // 更新点光源（动态颜色）
    pointLights.forEach((light, i) => {
      if (quantumGlow) {
        const hue = (timestamp * 0.08 + i * 0.15) % 1
        const color = new THREE.Color().setHSL(hue, 1, 0.6)
        light.color.lerp(color, 0.01)
        light.intensity = quantumConsciousnessEffectParams.pointLightIntensity + Math.sin(timestamp * 3 + i) * 0.3
      }
    })

    // 整个场景缓慢旋转
    if (thoughtParticleSystem) {
      thoughtParticleSystem.rotation.y += 0.001
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

      // 清理神经元
      neurons.forEach(neuron => {
        if (neuron.mesh && neuron.mesh.geometry) {
          neuron.mesh.geometry.dispose()
        }
        if (neuron.mesh && neuron.mesh.material instanceof THREE.Material) {
          neuron.mesh.material.dispose()
        }
        if (neuron.mesh && scene) {
          scene.remove(neuron.mesh)
        }
      })

      // 清理突触
      synapses.forEach(synapse => {
        if (synapse.mesh && synapse.mesh.geometry) {
          synapse.mesh.geometry.dispose()
        }
        if (synapse.mesh && synapse.mesh.material instanceof THREE.Material) {
          synapse.mesh.material.dispose()
        }
        if (synapse.mesh && scene) {
          scene.remove(synapse.mesh)
        }
      })

      // 清理思维粒子
      if (thoughtParticleSystem && thoughtParticleSystem.geometry) {
        thoughtParticleSystem.geometry.dispose()
      }
      if (thoughtParticleSystem && thoughtParticleSystem.material instanceof THREE.Material) {
        thoughtParticleSystem.material.dispose()
      }
      if (thoughtParticleSystem && scene) {
        scene.remove(thoughtParticleSystem)
      }

      // 清理意识环
      consciousnessRings.forEach(ring => {
        if (ring && ring.geometry) {
          ring.geometry.dispose()
        }
        if (ring && ring.material instanceof THREE.Material) {
          ring.material.dispose()
        }
        if (ring && scene) {
          scene.remove(ring)
        }
      })

      // 清理光源
      pointLights.forEach(light => {
        if (scene) scene.remove(light)
      })
      if (scene) {
        scene.remove(ambientLight)
      }

      if (renderer?.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      if (renderer) {
        renderer.dispose()
      }

      // 清理数组
      neurons.length = 0
      neuronPositions.length = 0
      synapses.length = 0
      thoughtParticles.length = 0
      consciousnessRings.length = 0
      pointLights.length = 0

      scene = null
      camera = null
      renderer = null
      controls = null
      thoughtParticleSystem = null
      ambientLight = null

      console.log('[量子意识网络]清理完成')
    } catch (error) {
      console.error('清理[量子意识网络]时出错:', error)
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

    // 淡出神经元
    neurons.forEach((neuron) => {
      fadeOutTimeline.to(neuron.mesh.material, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0)
    })

    // 淡出突触
    synapses.forEach((synapse) => {
      fadeOutTimeline.to(synapse.mesh.material, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0.2)
    })

    // 淡出思维粒子
    fadeOutTimeline.to(thoughtParticleSystem.material, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, 0.3)

    // 淡出意识环
    consciousnessRings.forEach((ring) => {
      fadeOutTimeline.to(ring.material, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0.4)
    })
  }

  // ============================================================
  // 🧹 停止相机动画
  // ============================================================
  const stopCameraAnimation = () => {
    if (cameraTimeline) {
      console.log('停止量子意识运镜动画')
      cameraTimeline.kill()
      cameraTimeline = null
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
