// 动态流场粒子特效 (Dynamic Flow Field Effect)
// 特性: 使用 TSL (Three Shading Language) 创建流动的波浪形粒子场
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'

// 性能优化常量
const TIME_SCALE_FACTOR = 0.001
const FULL_ROTATION = Math.PI * 2

// 配置参数
export const dynamicFlowFieldEffectParams = {
  particleCount: 5000,
  particleSize: 0.15,
  baseSize: 0.3,
  alpha: 0.85,
  alphaHash: true,
  rotationSpeed: 0.0005,
  autoRotate: true,
  colorCycleSpeed: 0.0003,
  updateInterval: 3,
  flowSpeed: 1.0,
  waveAmplitude: 0.5,
  waveFrequency: 2.0
}

type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

interface ParticleData {
  baseX: number
  baseY: number
  baseZ: number
  flowOffset: number
  flowSpeed: number
  wavePhase: number
  waveAmplitude: number
  hue: number
  saturation: number
  lightness: number
  scale: number
}

/**
 * 创建动态流场粒子特效
 * @param container - 容器元素
 * @returns 清理函数
 */
export const dynamicFlowFieldEffect = (container: HTMLElement) => {
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: WebGPURendererType
  let controls: OrbitControls
  let mesh: THREE.InstancedMesh
  let material: THREE.MeshBasicNodeMaterial
  let particles: ParticleData[] = []

  const count = dynamicFlowFieldEffectParams.particleCount
  let dummy: THREE.Object3D | null = new THREE.Object3D()
  let color: THREE.Color | null = new THREE.Color()

  // GSAP 动画对象
  let flowIntensity: { value: number } | null = { value: 1 }
  let cameraTimeline: gsap.core.Timeline | null = null
  const allTweens: gsap.core.Tween[] = []

  let frameCount = 0
  let timeValue = 0

  const init = async () => {
    try {
      const width = container.clientWidth
      const height = container.clientHeight
      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
      camera.position.set(15, 12, 15)
      camera.lookAt(0, 0, 0)

      scene = new THREE.Scene()
      scene.background = null

      // 创建几何体
      const geometry = new THREE.SphereGeometry(dynamicFlowFieldEffectParams.particleSize, 8, 6)

      // 创建材质
      material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.8,
        envMapIntensity: 2.0
      })

      mesh = new THREE.InstancedMesh(geometry, material, count)
      initParticles()
      scene.add(mesh)

      renderer = new THREE.WebGPURenderer({
        antialias: false,
        alpha: true,
        samples: 1
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
      renderer.setSize(width, height)
      renderer.setAnimationLoop(animate)
      container.appendChild(renderer.domElement)
      await renderer.init()

      // 创建环境贴图
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
      controls.maxDistance = 40

      initGSAPAnimations()
      playEntranceAnimation()
      console.log('[动态流场特效]初始化完成')
    } catch (error) {
      console.error('[动态流场特效]初始化失败:', error)
    }
  }

  // 初始化粒子
  const initParticles = () => {
    const gridX = 20
    const gridZ = Math.ceil(count / gridX)
    const spacing = 1.2
    const offsetX = (gridX * spacing) / 2
    const offsetZ = (gridZ * spacing) / 2

    for (let i = 0; i < count; i++) {
      const x = (i % gridX) * spacing - offsetX
      const z = Math.floor(i / gridX) * spacing - offsetZ
      const y = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 2

      const flowOffset = Math.random() * Math.PI * 2
      const flowSpeed = 0.5 + Math.random() * 1.5
      const wavePhase = Math.random() * Math.PI * 2
      const waveAmp = 0.3 + Math.random() * 0.7

      const hue = (i / count * 0.5 + Math.random() * 0.1) % 1
      const saturation = 0.7 + Math.random() * 0.3
      const lightness = 0.5 + Math.random() * 0.2
      const scale = 0.8 + Math.random() * 0.8

      particles.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        flowOffset,
        flowSpeed,
        wavePhase,
        waveAmplitude: waveAmp,
        hue,
        saturation,
        lightness,
        scale
      })

      if (dummy) {
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(scale * dynamicFlowFieldEffectParams.baseSize)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      if (color) {
        color.setHSL(hue, saturation, lightness)
        mesh.setColorAt(i, color)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor!.needsUpdate = true
  }

  // GSAP 动画
  const initGSAPAnimations = () => {
    const tween = gsap.to(flowIntensity, {
      value: 1.5,
      duration: 2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    })
    allTweens.push(tween)

    // 创建相机运镜动画
    cameraTimeline = gsap.timeline({
      repeat: -1,
      repeatDelay: 1,
      duration: 8
    })

    cameraTimeline.to(camera.position, {
      x: 20,
      y: 10,
      z: 10,
      duration: 4,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    }, 0)

    cameraTimeline.to(camera.position, {
      x: 10,
      y: 15,
      z: 20,
      duration: 4,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0)
    }, 4)
  }

  // 入场动画
  const playEntranceAnimation = () => {
    // 相机从上方俯冲
    const t1 = gsap.from(camera.position, {
      x: 30,
      y: 40,
      z: 30,
      duration: 3,
      ease: 'power3.out'
    })
    allTweens.push(t1)

    // 粒子从中心扩散
    const t2 = gsap.from(mesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 2.5,
      ease: 'elastic.out(1, 0.5)'
    })
    allTweens.push(t2)

    // 整体旋转入场
    const t3 = gsap.from(mesh.rotation, {
      y: Math.PI * 2,
      x: Math.PI,
      duration: 3,
      ease: 'power2.out'
    })
    allTweens.push(t3)
  }

  // 更新粒子位置
  const updateParticles = (time: number) => {
    if (!mesh) return

    frameCount++
    timeValue += TIME_SCALE_FACTOR
    const shouldUpdateColor = frameCount % dynamicFlowFieldEffectParams.updateInterval === 0
    const intensity = flowIntensity?.value || 1

    const cosA = Math.cos(timeValue * dynamicFlowFieldEffectParams.flowSpeed)
    const sinA = Math.sin(timeValue * dynamicFlowFieldEffectParams.flowSpeed)

    for (let i = 0; i < count; i++) {
      const p = particles[i]

      // 流场运动
      const flowX = Math.sin(timeValue * p.flowSpeed + p.flowOffset) * dynamicFlowFieldEffectParams.waveAmplitude * intensity
      const flowZ = Math.cos(timeValue * p.flowSpeed + p.flowOffset) * dynamicFlowFieldEffectParams.waveAmplitude * intensity

      // 波浪运动
      const waveY = Math.sin(p.baseX * dynamicFlowFieldEffectParams.waveFrequency + timeValue + p.wavePhase)
        * Math.cos(p.baseZ * dynamicFlowFieldEffectParams.waveFrequency + timeValue + p.wavePhase)
        * p.waveAmplitude
        * dynamicFlowFieldEffectParams.waveAmplitude
        * intensity

      const x = p.baseX + flowX
      const y = p.baseY + waveY
      const z = p.baseZ + flowZ

      if (dummy) {
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(p.scale * dynamicFlowFieldEffectParams.baseSize * (0.8 + 0.4 * flowIntensity!.value))
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }

      // 颜色变化
      if (shouldUpdateColor && color) {
        let hue = p.hue + time * dynamicFlowFieldEffectParams.colorCycleSpeed * 0.001
        if (hue > 1) hue -= 1

        const lightness = p.lightness + Math.sin(timeValue + i * 0.1) * 0.1
        color.setHSL(hue, p.saturation, lightness)
        mesh.setColorAt(i, color)
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    if (shouldUpdateColor) {
      mesh.instanceColor!.needsUpdate = true
    }
  }

  const animate = (time: number) => {
    if (dynamicFlowFieldEffectParams.autoRotate && mesh) {
      mesh.rotation.y += dynamicFlowFieldEffectParams.rotationSpeed
    }

    updateParticles(time)

    if (controls) controls.update()
    renderer.render(scene, camera)
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

  // 清理函数
  const cleanup = () => {
    try {
      // 第1步: 杀掉所有 tweens
      allTweens.forEach(tween => {
        if (tween && tween.kill) tween.kill()
      })
      allTweens.length = 0

      // 第2步: killTweensOf
      if (camera) {
        gsap.killTweensOf(camera.position)
        gsap.killTweensOf(camera.rotation)
      }
      if (mesh) {
        gsap.killTweensOf(mesh.scale)
        gsap.killTweensOf(mesh.rotation)
      }
      if (material) gsap.killTweensOf(material)
      if (flowIntensity) gsap.killTweensOf(flowIntensity)

      // 第3步: 清理相机 Timeline
      if (cameraTimeline) {
        cameraTimeline.kill()
        cameraTimeline = null
      }

      // 第4步: 停止动画循环
      if (renderer) {
        renderer.setAnimationLoop(null)
      }

      // 第5步: 移除事件监听
      window.removeEventListener('resize', handleResize)

      // 第6步: 清理临时对象
      dummy = null
      color = null
      flowIntensity = null

      // 第7步: 从场景移除网格
      if (scene && mesh) scene.remove(mesh)

      // 第8步: 释放几何体和材质
      if (mesh) {
        if (mesh.geometry) mesh.geometry.dispose()
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose()
        }
      }

      // 第9步: 移除 DOM 中的 canvas
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }

      // 第10步: 释放渲染器
      if (renderer) {
        renderer.dispose()
      }

      // 第11步: 所有引用置 null
      scene = null
      camera = null
      renderer = null
      controls = null
      mesh = null
      material = null
      particles = []

      console.log('[动态流场特效]清理完成')
    } catch (error) {
      console.error('清理[动态流场特效]时出错:', error)
    }
  }

  return cleanup
}
