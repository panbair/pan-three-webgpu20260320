import * as THREE from 'three/webgpu'
import { Fn, vec3, vec4, sin, cos, time, mix, length } from 'three/tsl'
import gsap from 'gsap'

export const chronoWeaverEffect = async (container: HTMLElement) => {
  const scene = new THREE.Scene()
  // 背景设为 null 以显示背后的全景图
  scene.background = null
  // 雾效使用透明色
  scene.fog = new THREE.FogExp2(0x000000, 0.015)

  const width = container.clientWidth
  const height = container.clientHeight
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.set(0, 80, 150)

  const renderer = new THREE.WebGPURenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  
  // 设置透明背景
  renderer.setClearColor(0x000000, 0)
  
  // 等待 WebGPU 后端初始化
  await renderer.init()
  
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  container.appendChild(renderer.domElement)

  const textureLoader = new THREE.TextureLoader()
  const textureMap = {
    crystal: textureLoader.load('/images/shuijing1.jpg'),
    butterfly: textureLoader.load('/images/hudie.jpg'),
    star: textureLoader.load('/images/xing.jpg'),
    flower: textureLoader.load('/images/hua1.jpg'),
    diamond: textureLoader.load('/images/zuanshi1.jpg')
  }
  Object.values(textureMap).forEach(tex => {
    tex.colorSpace = THREE.SRGBColorSpace
  })

  const portalGroup = new THREE.Group()
  scene.add(portalGroup)

  // ============ 时空之门核心 - 高亮度发光环 ============
  const innerRingGeometry = new THREE.TorusGeometry(15, 2, 32, 100)
  const innerRingMaterial = new THREE.MeshBasicNodeMaterial({
    color: new THREE.Color(0xffaa00),
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide
  })
  const innerRingShader = Fn(() => {
    const t = time.mul(3)
    const glow = sin(t).mul(0.2).add(1.0) // 1.0-1.2 范围，确保高亮
    return vec4(1.0, 0.6, 0.0, glow)
  })
  innerRingMaterial.colorNode = innerRingShader()
  const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial)
  innerRing.rotation.x = Math.PI / 2
  portalGroup.add(innerRing)

  const midRingGeometry = new THREE.TorusGeometry(22, 2.5, 32, 100)
  const midRingMaterial = new THREE.MeshBasicNodeMaterial({
    color: new THREE.Color(0x8800ff),
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide
  })
  const midRingShader = Fn(() => {
    const t = time.mul(2).add(1)
    const pulse = sin(t).mul(0.15).add(1.0)
    return vec4(0.6, 0.2, 1.0, pulse)
  })
  midRingMaterial.colorNode = midRingShader()
  const midRing = new THREE.Mesh(midRingGeometry, midRingMaterial)
  midRing.rotation.x = Math.PI / 2
  portalGroup.add(midRing)

  const outerRingGeometry = new THREE.TorusGeometry(32, 3.5, 32, 100)
  const outerRingMaterial = new THREE.MeshBasicNodeMaterial({
    color: new THREE.Color(0x00ddff),
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide
  })
  const outerRingShader = Fn(() => {
    const t = time.mul(4)
    const wave = sin(t).mul(0.2).add(1.0)
    return vec4(0.0, 0.9, 1.0, wave)
  })
  outerRingMaterial.colorNode = outerRingShader()
  const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial)
  outerRing.rotation.x = Math.PI / 2
  portalGroup.add(outerRing)

  // 核心水晶 - 增强发光效果
  const coreGeometry = new THREE.IcosahedronGeometry(10, 2)
  const coreMaterial = new THREE.MeshStandardMaterial({
    map: textureMap.crystal,
    emissive: new THREE.Color(0x6600ff),
    emissiveIntensity: 1.2, // 增强自发光
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.95
  })
  const core = new THREE.Mesh(coreGeometry, coreMaterial)
  portalGroup.add(core)

  // ============ 时空碎片 - 高亮蝴蝶 ============
  const fragmentCount = 500
  const fragmentGeometry = new THREE.PlaneGeometry(4, 4)
  const fragmentMaterial = new THREE.MeshBasicMaterial({
    map: textureMap.butterfly,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(0xffddaa) // 暖色调增强可见性
  })
  const fragments = new THREE.InstancedMesh(fragmentGeometry, fragmentMaterial, fragmentCount)
  scene.add(fragments)

  const fragmentDummy = new THREE.Object3D()
  const fragmentData: Array<{ angle: number; radius: number; height: number; speed: number; phase: number; wobble: number }> = []

  for (let i = 0; i < fragmentCount; i++) {
    const angle = (i / fragmentCount) * Math.PI * 2 * 5 + Math.random() * Math.PI
    const radius = 35 + Math.random() * 40
    const height = (Math.random() - 0.5) * 30
    const speed = 0.2 + Math.random() * 0.5
    const phase = Math.random() * Math.PI * 2
    const wobble = 0.5 + Math.random() * 1.5
    fragmentData.push({ angle, radius, height, speed, phase, wobble })
    fragmentDummy.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius)
    fragmentDummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    fragmentDummy.scale.setScalar(0.5 + Math.random() * 0.5)
    fragmentDummy.updateMatrix()
    fragments.setMatrixAt(i, fragmentDummy.matrix)
  }

  // ============ 时间节点 - 明亮星星 ============
  const nodeCount = 800
  const nodeGeometry = new THREE.PlaneGeometry(2, 2)
  const nodeMaterial = new THREE.MeshBasicMaterial({
    map: textureMap.star,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(0xffffff) // 纯白高亮
  })
  const timeNodes = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, nodeCount)
  scene.add(timeNodes)

  const nodeDummy = new THREE.Object3D()
  const nodeData: Array<{ t: number; spiralOffset: number; radiusBase: number; speed: number; size: number }> = []

  for (let i = 0; i < nodeCount; i++) {
    const t = i / nodeCount
    const spiralOffset = t * Math.PI * 8
    const radiusBase = 10 + t * 80
    const speed = 0.3 + Math.random() * 0.4
    const size = 0.3 + (1 - t) * 0.7
    nodeData.push({ t, spiralOffset, radiusBase, speed, size })
  }

  // ============ 能量脉冲 - 高亮花朵 ============
  const pulseCount = 200
  const pulseGeometry = new THREE.PlaneGeometry(5, 5)
  const pulseMaterial = new THREE.MeshBasicMaterial({
    map: textureMap.flower,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(0xff66aa) // 粉紫色增强对比
  })
  const pulses = new THREE.InstancedMesh(pulseGeometry, pulseMaterial, pulseCount)
  scene.add(pulses)

  const pulseDummy = new THREE.Object3D()
  const pulseData: Array<{ angle: number; distance: number; expandSpeed: number; life: number; maxLife: number; active: boolean }> = []

  for (let i = 0; i < pulseCount; i++) {
    pulseData.push({
      angle: Math.random() * Math.PI * 2,
      distance: 30 + Math.random() * 50,
      expandSpeed: 0.5 + Math.random() * 0.5,
      life: Math.random() * 100,
      maxLife: 100 + Math.random() * 100,
      active: Math.random() > 0.5
    })
  }

  // ============ 背景漩涡粒子 - 更亮的颜色 ============
  const vortexCount = 3000
  const vortexGeometry = new THREE.BufferGeometry()
  const vortexPositions = new Float32Array(vortexCount * 3)
  const vortexColors = new Float32Array(vortexCount * 3)

  for (let i = 0; i < vortexCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 20 + Math.random() * 100
    const height = (Math.random() - 0.5) * 60
    vortexPositions[i * 3] = Math.cos(angle) * radius
    vortexPositions[i * 3 + 1] = height
    vortexPositions[i * 3 + 2] = Math.sin(angle) * radius
    
    // 更亮的颜色：紫→青→金，提高亮度
    const t = (radius - 20) / 100
    if (t < 0.33) {
      // 紫色区域 - 加亮
      vortexColors[i * 3] = 0.8 + Math.random() * 0.2
      vortexColors[i * 3 + 1] = 0.2 + Math.random() * 0.3
      vortexColors[i * 3 + 2] = 1.0
    } else if (t < 0.66) {
      // 青色区域 - 加亮
      vortexColors[i * 3] = 0.0
      vortexColors[i * 3 + 1] = 0.8 + Math.random() * 0.2
      vortexColors[i * 3 + 2] = 1.0
    } else {
      // 金色区域 - 加亮
      vortexColors[i * 3] = 1.0
      vortexColors[i * 3 + 1] = 0.8 + Math.random() * 0.2
      vortexColors[i * 3 + 2] = 0.2 + Math.random() * 0.3
    }
  }

  vortexGeometry.setAttribute('position', new THREE.BufferAttribute(vortexPositions, 3))
  vortexGeometry.setAttribute('color', new THREE.BufferAttribute(vortexColors, 3))

  const vortexMaterial = new THREE.PointsMaterial({
    size: 0.8, // 增大粒子尺寸
    vertexColors: true,
    transparent: true,
    opacity: 0.9, // 提高不透明度
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  })
  const vortexParticles = new THREE.Points(vortexGeometry, vortexMaterial)
  scene.add(vortexParticles)

  // ============ 增强光源系统 ============
  const lights: THREE.PointLight[] = []
  const lightColors = [0xffaa00, 0x8800ff, 0x00ddff, 0xff66cc]
  lightColors.forEach((color, i) => {
    const light = new THREE.PointLight(color, 500, 300) // 增强光照强度
    const angle = (i / lightColors.length) * Math.PI * 2
    light.position.set(Math.cos(angle) * 50, 20 + i * 8, Math.sin(angle) * 50)
    scene.add(light)
    lights.push(light)
  })

  // 增强环境光
  const ambientLight = new THREE.AmbientLight(0x332244, 0.8)
  scene.add(ambientLight)

  let timeValue = 0
  let isRunning = true
  const allTweens: gsap.core.Tween[] = []

  const animate = () => {
    if (!isRunning) return
    timeValue += 0.016

    innerRing.rotation.z += 0.02
    midRing.rotation.z -= 0.015
    outerRing.rotation.z += 0.01

    const coreScale = 1 + Math.sin(timeValue * 2) * 0.1
    core.scale.setScalar(coreScale)
    core.rotation.y += 0.01
    core.rotation.z += 0.005

    for (let i = 0; i < fragmentCount; i++) {
      const data = fragmentData[i]
      const t = timeValue * data.speed + data.phase
      const angle = data.angle + t * 0.5
      const radius = data.radius + Math.sin(t * data.wobble) * 5
      const height = data.height + Math.cos(t * data.wobble * 0.7) * 8
      fragmentDummy.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius)
      fragmentDummy.lookAt(camera.position)
      fragmentDummy.scale.setScalar(0.5 + Math.sin(t) * 0.2)
      fragmentDummy.updateMatrix()
      fragments.setMatrixAt(i, fragmentDummy.matrix)
    }
    fragments.instanceMatrix.needsUpdate = true

    for (let i = 0; i < nodeCount; i++) {
      const data = nodeData[i]
      const t = timeValue * data.speed + data.spiralOffset
      const radius = data.radiusBase + Math.sin(t * 0.5) * 5
      const x = Math.cos(t) * radius
      const z = Math.sin(t) * radius
      const y = Math.sin(t * 0.3) * 20
      nodeDummy.position.set(x, y, z)
      nodeDummy.lookAt(camera.position)
      nodeDummy.scale.setScalar(data.size * (0.8 + Math.sin(timeValue * 3 + i) * 0.2))
      nodeDummy.updateMatrix()
      timeNodes.setMatrixAt(i, nodeDummy.matrix)
    }
    timeNodes.instanceMatrix.needsUpdate = true

    for (let i = 0; i < pulseCount; i++) {
      const data = pulseData[i]
      if (data.active) {
        data.life += data.expandSpeed
        const progress = data.life / data.maxLife
        if (progress >= 1) {
          data.life = 0
          data.angle = Math.random() * Math.PI * 2
          data.distance = 30 + Math.random() * 50
        }
        const scale = progress * 3
        pulseDummy.position.set(
          Math.cos(data.angle) * data.distance,
          Math.sin(timeValue + i) * 10,
          Math.sin(data.angle) * data.distance
        )
        pulseDummy.scale.setScalar(scale)
        pulseDummy.lookAt(camera.position)
        pulseDummy.updateMatrix()
        pulses.setMatrixAt(i, pulseDummy.matrix)
      }
    }
    pulses.instanceMatrix.needsUpdate = true

    vortexParticles.rotation.y += 0.002

    lights.forEach((light, i) => {
      const angle = timeValue * 0.3 + (i / lights.length) * Math.PI * 2
      light.position.x = Math.cos(angle) * 50
      light.position.z = Math.sin(angle) * 50
      light.position.y = 15 + Math.sin(timeValue + i) * 10
    })

    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }

  animate()

  const startCameraAnimation = () => {
    const tl = gsap.timeline({
      onComplete: () => {
        console.log('时空编织者运镜完成，开始清理...')
        setTimeout(() => clearEffect(), 500)
      }
    })

    tl.to(camera.position, { x: 0, y: 60, z: 100, duration: 4, ease: 'power2.inOut', onUpdate: () => camera.lookAt(0, 0, 0) })
    tl.to(camera.position, { x: 80, y: 40, z: 80, duration: 5, ease: 'power1.inOut', onUpdate: () => camera.lookAt(0, 0, 0) })
    tl.to(camera.position, { x: 100, y: 30, z: 0, duration: 5, ease: 'power1.inOut', onUpdate: () => camera.lookAt(0, 0, 0) })
    tl.to(camera.position, { x: 80, y: 20, z: -80, duration: 5, ease: 'power1.inOut', onUpdate: () => camera.lookAt(0, 0, 0) })
    tl.to(camera.position, { x: 20, y: 5, z: 40, duration: 3, ease: 'power2.in' })
    tl.to(camera.position, { x: 0, y: 0, z: 15, duration: 2, ease: 'power4.in' })
    tl.to(camera.position, { x: 0, y: 0, z: -30, duration: 1.5, ease: 'power2.out' })
    tl.to(camera.position, { x: 0, y: 50, z: -120, duration: 4, ease: 'power2.out', onUpdate: () => camera.lookAt(0, 0, 0) })
    tl.to(camera.position, { x: -60, y: 80, z: -100, duration: 4, ease: 'power1.inOut', onUpdate: () => camera.lookAt(0, 0, 0) })
    tl.to(camera.position, { x: 0, y: 120, z: -80, duration: 4, ease: 'power2.inOut', onUpdate: () => camera.lookAt(0, 0, 0) })

    allTweens.push(tl)
  }

  setTimeout(startCameraAnimation, 2000)

  gsap.fromTo(core.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: 2, ease: 'elastic.out(1, 0.5)' })
  gsap.fromTo(innerRing.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: 1.5, delay: 0.3, ease: 'back.out(1.7)' })
  gsap.fromTo(midRing.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: 1.5, delay: 0.5, ease: 'back.out(1.7)' })
  gsap.fromTo(outerRing.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: 1.5, delay: 0.7, ease: 'back.out(1.7)' })

  const clearEffect = () => {
    console.log('清理时空编织者特效...')
    isRunning = false
    allTweens.forEach(tween => tween.kill())
    gsap.killTweensOf(camera.position)

    const fadeOut = gsap.timeline({ onComplete: performCleanup })
    fadeOut.to([innerRing.scale, midRing.scale, outerRing.scale, core.scale], { x: 0, y: 0, z: 0, duration: 1.5, ease: 'power2.in', stagger: 0.1 })
    fadeOut.to([fragments, timeNodes, pulses, vortexParticles].map(m => m.material), { opacity: 0, duration: 1, stagger: 0.05 }, '-=1')
  }

  const performCleanup = () => {
    scene.remove(portalGroup)
    scene.remove(fragments)
    scene.remove(timeNodes)
    scene.remove(pulses)
    scene.remove(vortexParticles)
    lights.forEach(light => scene.remove(light))
    scene.remove(ambientLight)

    innerRingGeometry.dispose()
    midRingGeometry.dispose()
    outerRingGeometry.dispose()
    coreGeometry.dispose()
    fragmentGeometry.dispose()
    nodeGeometry.dispose()
    pulseGeometry.dispose()
    vortexGeometry.dispose()

    innerRingMaterial.dispose()
    midRingMaterial.dispose()
    outerRingMaterial.dispose()
    coreMaterial.dispose()
    fragmentMaterial.dispose()
    nodeMaterial.dispose()
    pulseMaterial.dispose()
    vortexMaterial.dispose()

    Object.values(textureMap).forEach(tex => tex.dispose())

    renderer.setAnimationLoop(null)
    renderer.dispose()

    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement)
    }

    console.log('时空编织者特效清理完成')
  }

  return {
    cleanup: performCleanup,
    clearEffect: clearEffect
  }
}
