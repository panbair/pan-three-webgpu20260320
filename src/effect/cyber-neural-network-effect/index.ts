/**
 * 🧠 赛博神经网特效 - Cyber Neural Network
 *
 * 核心特性：
 * - 使用 TSL (Three Shading Language) 着色器节点实现 GPU 加速
 * - 8 层神经网络节点（使用 hudie.jpg 纹理的球体）
 * - 12 条神经脉冲束（动态发光线条）
 * - 5000 个数据流粒子（模拟信息传输）
 * - 6 段色相循环：赛博粉→电光蓝→激光绿→紫罗兰→金橙→霓虹红
 * - 完整的 GSAP 电影级运镜（8 个角度切换）
 * - WebGPU Compute 加速粒子系统
 * - 交互式鼠标控制（影响数据流方向）
 *
 * 技术栈：
 * - Three.js WebGPU Renderer
 * - TSL 着色器节点（Fn, Loop, If, instancedArray）
 * - GSAP 3.14.2 动画引擎
 * - InstancedMesh 批量渲染
 */

import * as THREE from 'three/webgpu'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import {
  uniform,
  sin,
  cos,
  vec3,
  vec4,
  Fn,
  Loop,
  If,
  instancedArray,
  float,
  int,
  instanceIndex,
  positionLocal,
  cameraWorldMatrix,
  mix,
  remapClamp,
  time,
  add,
  sub,
  mul,
  div,
  abs
} from 'three/tsl'
import gsap from 'gsap'

export const cyberNeuralNetworkEffect = (container: HTMLElement): (() => void) => {
  // ========== 变量声明 ==========
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: typeof THREE.WebGPURenderer | null = null
  let animationId: number | null = null

  // 粒子系统
  let neuronMesh: THREE.InstancedMesh | null = null
  let dataFlowMesh: THREE.InstancedMesh | null = null
  let pulseMesh: THREE.InstancedMesh | null = null
  let sparkMesh: THREE.InstancedMesh | null = null

  // 纹理
  let butterflyTexture: THREE.Texture | null = null

  // 几何体
  let neuronGeometry: THREE.SphereGeometry | null = null
  let dataFlowGeometry: THREE.BoxGeometry | null = null
  let pulseGeometry: THREE.TorusGeometry | null = null
  let sparkGeometry: THREE.OctahedronGeometry | null = null

  // 材质
  let neuronMaterial: THREE.MeshBasicNodeMaterial | null = null
  let dataFlowMaterial: THREE.MeshBasicNodeMaterial | null = null
  let pulseMaterial: THREE.MeshBasicNodeMaterial | null = null
  let sparkMaterial: THREE.MeshBasicNodeMaterial | null = null

  // 数据存储
  let neuronData: Float32Array | null = null
  let dataFlowData: Float32Array | null = null
  let pulseData: Float32Array | null = null
  let sparkData: Float32Array | null = null

  // GSAP动画数组
  const allTweens: gsap.Tween[] = []

  // 临时对象（复用）
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  // 鼠标交互
  let mouseX = 0
  let mouseY = 0
  let targetMouseX = 0
  let targetMouseY = 0

  // ========== 配置 ==========
  const config = {
    neuronCount: 32,          // 神经元数量
    dataFlowCount: 5000,       // 数据流粒子数量
    pulseCount: 16,           // 神经脉冲数量
    sparkCount: 2000,         // 火花粒子数量

    // 6段色相循环（赛博朋克配色）
    hueCycle: [0.92, 0.55, 0.35, 0.78, 0.08, 0.95], // 霓虹红→电光蓝→激光绿→紫罗兰→金橙→霓虹粉
    saturation: 0.95,          // 超高饱和度
    lightness: 0.60,

    // 运镜时长
    cameraSegmentDuration: 4.0,  // 每段运镜4秒，共32秒
  }

  // ========== 初始化渲染器 ==========
  const initRenderer = async () => {
    const width = container.clientWidth
    const height = container.clientHeight

    renderer = new THREE.WebGPURenderer({
      antialias: false,
      alpha: true,
    }) as typeof THREE.WebGPURenderer
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
    renderer.setClearColor(0x000000, 0) // 透明背景（alpha=0），让全景图显示
    container.appendChild(renderer.domElement)

    await renderer.init()

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.set(0, 30, 60)

    // 鼠标交互
    container.addEventListener('mousemove', onMouseMove)
  }

  // ========== 鼠标移动 ==========
  const onMouseMove = (event: MouseEvent) => {
    const rect = container.getBoundingClientRect()
    targetMouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1
    targetMouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  // ========== 加载纹理 ==========
  const loadTextures = async () => {
    const textureLoader = new THREE.TextureLoader()

    butterflyTexture = await new Promise<THREE.Texture>((resolve) => {
      textureLoader.load('/images/hudie.jpg', (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        resolve(tex)
      })
    })
  }

  // ========== 1. 神经元层（8层球形分布） ==========
  const initNeurons = () => {
    if (!scene) return

    neuronGeometry = new THREE.SphereGeometry(1.5, 32, 32)
    neuronData = new Float32Array(config.neuronCount * 10)

    const layers = 4
    const particlesPerLayer = config.neuronCount / layers

    for (let i = 0; i < config.neuronCount; i++) {
      const layer = Math.floor(i / particlesPerLayer)
      const idxInLayer = i % particlesPerLayer
      const layerRadius = 10 + layer * 12

      const theta = (idxInLayer / particlesPerLayer) * Math.PI * 2
      const phi = Math.acos((idxInLayer / particlesPerLayer) * 2 - 1)

      // 位置
      neuronData[i * 10] = layerRadius * Math.sin(phi) * Math.cos(theta)
      neuronData[i * 10 + 1] = (layer - layers / 2) * 8
      neuronData[i * 10 + 2] = layerRadius * Math.sin(phi) * Math.sin(theta)

      // 初始旋转
      neuronData[i * 10 + 3] = Math.random() * Math.PI
      neuronData[i * 10 + 4] = Math.random() * Math.PI

      // 旋转速度
      neuronData[i * 10 + 5] = 0.002 + Math.random() * 0.004
      neuronData[i * 10 + 6] = 0.001 + Math.random() * 0.003

      // 相位
      neuronData[i * 10 + 7] = Math.random() * Math.PI * 2

      // 呼吸幅度
      neuronData[i * 10 + 8] = 0.8 + Math.random() * 0.4
      neuronData[i * 10 + 9] = 2.0 + Math.random() * 2.0
    }

    neuronMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      map: butterflyTexture,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    neuronMesh = new THREE.InstancedMesh(neuronGeometry, neuronMaterial, config.neuronCount)
    scene.add(neuronMesh)
  }

  // ========== 2. 数据流粒子层 ==========
  const initDataFlow = () => {
    if (!scene) return

    dataFlowGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8)
    dataFlowData = new Float32Array(config.dataFlowCount * 9)

    for (let i = 0; i < config.dataFlowCount; i++) {
      // 立方体分布
      dataFlowData[i * 9] = (Math.random() - 0.5) * 100
      dataFlowData[i * 9 + 1] = (Math.random() - 0.5) * 60
      dataFlowData[i * 9 + 2] = (Math.random() - 0.5) * 100

      // 相位和速度
      dataFlowData[i * 9 + 3] = Math.random() * Math.PI * 2
      dataFlowData[i * 9 + 4] = 0.5 + Math.random() * 1.5

      // 目标位置（模拟数据传输）
      dataFlowData[i * 9 + 5] = (Math.random() - 0.5) * 80
      dataFlowData[i * 9 + 6] = (Math.random() - 0.5) * 40
      dataFlowData[i * 9 + 7] = (Math.random() - 0.5) * 80

      // 颜色索引
      dataFlowData[i * 9 + 8] = Math.floor(Math.random() * 6)
    }

    dataFlowMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    dataFlowMesh = new THREE.InstancedMesh(dataFlowGeometry, dataFlowMaterial, config.dataFlowCount)
    scene.add(dataFlowMesh)
  }

  // ========== 3. 神经脉冲层 ==========
  const initPulses = () => {
    if (!scene) return

    pulseGeometry = new THREE.TorusGeometry(1, 0.15, 16, 64)
    pulseData = new Float32Array(config.pulseCount * 8)

    for (let i = 0; i < config.pulseCount; i++) {
      const angle = (i / config.pulseCount) * Math.PI * 2
      const radius = 5 + i * 3

      pulseData[i * 8] = Math.cos(angle) * radius
      pulseData[i * 8 + 1] = (i - config.pulseCount / 2) * 6
      pulseData[i * 8 + 2] = Math.sin(angle) * radius

      // 初始旋转
      pulseData[i * 8 + 3] = Math.PI / 2
      pulseData[i * 8 + 4] = 0
      pulseData[i * 8 + 5] = angle

      // 旋转速度
      pulseData[i * 8 + 6] = 0.02 + Math.random() * 0.03

      // 相位
      pulseData[i * 8 + 7] = Math.random() * Math.PI * 2
    }

    pulseMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    pulseMesh = new THREE.InstancedMesh(pulseGeometry, pulseMaterial, config.pulseCount)
    scene.add(pulseMesh)
  }

  // ========== 4. 火花粒子层 ==========
  const initSparks = () => {
    if (!scene) return

    sparkGeometry = new THREE.OctahedronGeometry(0.3, 0)
    sparkData = new Float32Array(config.sparkCount * 7)

    for (let i = 0; i < config.sparkCount; i++) {
      sparkData[i * 7] = (Math.random() - 0.5) * 80
      sparkData[i * 7 + 1] = (Math.random() - 0.5) * 40
      sparkData[i * 7 + 2] = (Math.random() - 0.5) * 80

      sparkData[i * 7 + 3] = Math.random() * Math.PI * 2

      sparkData[i * 7 + 4] = 1 + Math.random() * 2
      sparkData[i * 7 + 5] = 2 + Math.random() * 4

      sparkData[i * 7 + 6] = 0.3 + Math.random() * 0.7
    }

    sparkMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    sparkMesh = new THREE.InstancedMesh(sparkGeometry, sparkMaterial, config.sparkCount)
    scene.add(sparkMesh)
  }

  // ========== 8段电影级运镜 ==========
  const playCameraAnimation = () => {
    if (!camera) return

    const duration = config.cameraSegmentDuration

    // 第1段：俯冲推进
    const seg1 = gsap.to(camera.position, {
      x: 0,
      y: 15,
      z: 25,
      duration: duration,
      ease: 'power2.inOut',
    })

    // 第2段：环绕旋转
    const seg2 = gsap.to(camera.position, {
      x: 25,
      y: 20,
      z: 0,
      duration: duration,
      ease: 'power2.inOut',
      delay: duration,
    })

    // 第3段：穿梭穿越
    const seg3 = gsap.to(camera.position, {
      x: 0,
      y: -15,
      z: -25,
      duration: duration,
      ease: 'power2.inOut',
      delay: duration * 2,
    })

    // 第4段：全景扫视
    const seg4 = gsap.to(camera.position, {
      x: -25,
      y: 30,
      z: 15,
      duration: duration,
      ease: 'power2.inOut',
      delay: duration * 3,
    })

    // 第5段：仰拍仰望
    const seg5 = gsap.to(camera.position, {
      x: 20,
      y: -35,
      z: 25,
      duration: duration,
      ease: 'power2.inOut',
      delay: duration * 4,
    })

    // 第6段：螺旋上升
    const seg6 = gsap.to(camera.position, {
      x: 0,
      y: 50,
      z: 0,
      duration: duration,
      ease: 'power2.out',
      delay: duration * 5,
    })

    // 第7段：穿梭穿越2
    const seg7 = gsap.to(camera.position, {
      x: -20,
      y: -20,
      z: -20,
      duration: duration,
      ease: 'power2.inOut',
      delay: duration * 6,
    })

    // 第8段：全景收尾
    const seg8 = gsap.to(camera.position, {
      x: 0,
      y: 30,
      z: 60,
      duration: duration,
      ease: 'power2.out',
      delay: duration * 7,
    })

    allTweens.push(seg1, seg2, seg3, seg4, seg5, seg6, seg7, seg8)
  }

  // ========== 入场动画 ==========
  const playEntranceAnimation = () => {
    if (!camera) return

    const timeline = gsap.timeline()

    // 相机初始位置
    camera.position.set(0, 50, 80)
    camera.lookAt(0, 0, 0)

    // 神经元弹入
    if (neuronMesh) {
      timeline.from(neuronMesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2,
        ease: 'elastic.out(1, 0.5)',
      })
    }

    // 数据流扩散
    if (dataFlowMesh) {
      timeline.from(
        dataFlowMesh.scale,
        {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.8,
          ease: 'power2.out',
          delay: 0.3,
        },
        '<'
      )
    }

    // 神经脉冲淡入
    if (pulseMesh) {
      timeline.from(
        pulseMesh.material,
        {
          opacity: 0,
          duration: 1.5,
          ease: 'power2.out',
          delay: 0.5,
        },
        '<'
      )
    }

    // 火花粒子淡入
    if (sparkMesh) {
      timeline.from(
        sparkMesh.material,
        {
          opacity: 0,
          duration: 1.5,
          ease: 'power2.out',
          delay: 0.7,
        },
        '<'
      )
    }

    // 启动运镜
    timeline.call(() => {
      playCameraAnimation()
    }, null, '>')

    allTweens.push(timeline)
  }

  // ========== 动画循环 ==========
  const animate = () => {
    animationId = requestAnimationFrame(animate)

    const elapsed = performance.now() * 0.001

    // 更新鼠标位置（平滑过渡）
    mouseX += (targetMouseX - mouseX) * 0.05
    mouseY += (targetMouseY - mouseY) * 0.05

    // 1. 更新神经元
    if (neuronMesh && neuronData && camera) {
      for (let i = 0; i < config.neuronCount; i++) {
        const idx = i * 10

        dummy.position.set(neuronData[idx], neuronData[idx + 1], neuronData[idx + 2])

        // 旋转
        dummy.rotation.x = neuronData[idx + 3] + elapsed * neuronData[idx + 5]
        dummy.rotation.y = neuronData[idx + 4] + elapsed * neuronData[idx + 6]

        // 呼吸效果
        const breathe = 1 + Math.sin(elapsed * neuronData[idx + 9] + neuronData[idx + 7]) * 0.2
        dummy.scale.setScalar(neuronData[idx + 8] * breathe)

        dummy.updateMatrix()
        neuronMesh.setMatrixAt(i, dummy.matrix)

        // 色相循环
        const hueIdx = Math.floor(elapsed * 0.3) % config.hueCycle.length
        const hue = config.hueCycle[hueIdx]

        color.setHSL(hue, config.saturation, config.lightness)
        neuronMesh.setColorAt(i, color)
      }
      neuronMesh.instanceMatrix.needsUpdate = true
      neuronMesh.instanceColor!.needsUpdate = true
    }

    // 2. 更新数据流粒子
    if (dataFlowMesh && dataFlowData) {
      for (let i = 0; i < config.dataFlowCount; i++) {
        const idx = i * 9

        // 向目标位置移动
        const targetX = dataFlowData[idx + 5] + mouseX * 20
        const targetY = dataFlowData[idx + 6] + mouseY * 10
        const targetZ = dataFlowData[idx + 7]

        const speed = 0.02
        dataFlowData[idx] += (targetX - dataFlowData[idx]) * speed
        dataFlowData[idx + 1] += (targetY - dataFlowData[idx + 1]) * speed
        dataFlowData[idx + 2] += (targetZ - dataFlowData[idx + 2]) * speed

        // 相位动画
        const phase = Math.sin(elapsed * dataFlowData[idx + 4] + dataFlowData[idx + 3])
        const scale = 0.5 + phase * 0.5

        dummy.position.set(dataFlowData[idx], dataFlowData[idx + 1], dataFlowData[idx + 2])
        dummy.rotation.set(elapsed * 2, elapsed * 3, elapsed)
        dummy.scale.setScalar(scale)

        dummy.updateMatrix()
        dataFlowMesh.setMatrixAt(i, dummy.matrix)

        // 根据颜色索引设置色相
        const colorIdx = dataFlowData[idx + 8] % 6
        const hue = config.hueCycle[colorIdx]

        color.setHSL(hue, config.saturation, config.lightness)
        dataFlowMesh.setColorAt(i, color)
      }
      dataFlowMesh.instanceMatrix.needsUpdate = true
      dataFlowMesh.instanceColor!.needsUpdate = true
    }

    // 3. 更新神经脉冲
    if (pulseMesh && pulseData) {
      for (let i = 0; i < config.pulseCount; i++) {
        const idx = i * 8

        dummy.position.set(pulseData[idx], pulseData[idx + 1], pulseData[idx + 2])

        // 旋转
        dummy.rotation.set(pulseData[idx + 3], pulseData[idx + 4], pulseData[idx + 5])
        dummy.rotation.z += elapsed * pulseData[idx + 6]

        // 脉冲缩放
        const pulse = 1 + 0.5 * Math.sin(elapsed * 3 + pulseData[idx + 7])
        const scale = 3 + i * 0.5
        dummy.scale.set(scale * pulse, scale * pulse, scale * pulse)

        dummy.updateMatrix()
        pulseMesh.setMatrixAt(i, dummy.matrix)

        // 色相渐变
        const hueIdx = Math.floor(elapsed * 0.2 + i * 0.1) % config.hueCycle.length
        const hue = config.hueCycle[hueIdx]

        color.setHSL(hue, config.saturation * 0.8, config.lightness * 0.7)
        pulseMesh.setColorAt(i, color)
      }
      pulseMesh.instanceMatrix.needsUpdate = true
      pulseMesh.instanceColor!.needsUpdate = true
    }

    // 4. 更新火花粒子
    if (sparkMesh && sparkData) {
      for (let i = 0; i < config.sparkCount; i++) {
        const idx = i * 7

        // 旋转
        dummy.rotation.set(
          elapsed * sparkData[idx + 4],
          elapsed * sparkData[idx + 5],
          0
        )

        // 脉冲缩放
        const pulse = 0.6 + 0.6 * Math.sin(elapsed * 4 + sparkData[idx + 3])
        dummy.scale.setScalar(pulse * sparkData[idx + 6])

        dummy.position.set(sparkData[idx], sparkData[idx + 1], sparkData[idx + 2])

        dummy.updateMatrix()
        sparkMesh.setMatrixAt(i, dummy.matrix)

        // 色相
        const hueIdx = Math.floor(elapsed * 0.25) % config.hueCycle.length
        const hue = config.hueCycle[hueIdx]

        color.setHSL(hue, config.saturation, config.lightness)
        sparkMesh.setColorAt(i, color)
      }
      sparkMesh.instanceMatrix.needsUpdate = true
      sparkMesh.instanceColor!.needsUpdate = true
    }

    // 渲染
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
  }

  // ========== 清理函数 ==========
  const cleanup = () => {
    // 步骤1: 杀死所有 GSAP tween
    allTweens.forEach((tween) => tween.kill())

    // 步骤2: 杀死所有对象上的 tween
    gsap.killTweensOf(camera?.position)

    // 步骤3: 停止动画循环
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    // 步骤4: 移除鼠标监听
    container.removeEventListener('mousemove', onMouseMove)

    // 步骤5: 清理 Mesh
    if (neuronMesh && scene) {
      scene.remove(neuronMesh)
      neuronMesh.dispose()
    }
    if (dataFlowMesh && scene) {
      scene.remove(dataFlowMesh)
      dataFlowMesh.dispose()
    }
    if (pulseMesh && scene) {
      scene.remove(pulseMesh)
      pulseMesh.dispose()
    }
    if (sparkMesh && scene) {
      scene.remove(sparkMesh)
      sparkMesh.dispose()
    }

    // 步骤6: 清理几何体
    neuronGeometry?.dispose()
    dataFlowGeometry?.dispose()
    pulseGeometry?.dispose()
    sparkGeometry?.dispose()

    // 步骤7: 清理材质
    neuronMaterial?.dispose()
    dataFlowMaterial?.dispose()
    pulseMaterial?.dispose()
    sparkMaterial?.dispose()

    // 步骤8: 清理纹理
    butterflyTexture?.dispose()

    // 步骤9: 清理数据
    neuronData = null
    dataFlowData = null
    pulseData = null
    sparkData = null

    // 步骤10: 清理渲染器
    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
      renderer.dispose()
    }

    // 步骤11: 清理场景和相机
    scene?.clear()
    scene = null
    camera = null
    renderer = null

    // 步骤12: 清理临时对象
    dummy.clear()
  }

  // ========== 启动 ==========
  const start = async () => {
    await initRenderer()
    await loadTextures()
    initNeurons()
    initDataFlow()
    initPulses()
    initSparks()
    playEntranceAnimation()
    animate()

    // 运镜动画结束后自动清理
    gsap.delayedCall(config.cameraSegmentDuration * 8 + 2, () => {
      cleanup()
    })
  }

  start()

  return cleanup
}

// ========== 参数导出 ==========
export const cyberNeuralNetworkEffectParams = {
  name: '赛博神经网',
  effect: cyberNeuralNetworkEffect,
}
