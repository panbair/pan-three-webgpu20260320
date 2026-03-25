// GPU 水晶花园梦境特效 (GPU Crystal Garden Dream Effect)
// 特性: 悬浮水晶、花瓣飘落、光影折射、物理碰撞、电影级运镜
// 技术栈: Three.js WebGPU + 物理引擎 + 粒子系统 + GSAP 动画
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'

// 配置参数
export const crystalGardenEffectParams = {
  crystalCount: 40, // 水晶数量
  petalCount: 1500, // 花瓣数量
  starCount: 300, // 星星数量
  gardenRadius: 8, // 花园半径
  crystalMinSize: 0.3, // 水晶最小尺寸
  crystalMaxSize: 0.8, // 水晶最大尺寸
  crystalColors: [0x00d4ff, 0xff00ff, 0x00ff88, 0xffff00, 0xff8800], // 水晶颜色
  ambientLightIntensity: 0.2, // 环境光强度
  pointLightIntensity: 2, // 点光源强度
  petalSpeed: 1.5, // 花瓣速度
  crystalRotationSpeed: 0.3, // 水晶旋转速度
  autoRotate: true, // 自动运镜
  physicsEnabled: true, // 物理碰撞
  reflectionEffect: true, // 光影折射效果
  rainbowGlow: true // 彩虹发光效果
}

type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

// 水晶接口
interface Crystal {
  mesh: THREE.Mesh
  originalPosition: THREE.Vector3
  velocity: THREE.Vector3
  rotationSpeed: THREE.Vector3
  glowPhase: number
}

// 花瓣接口
interface Petal {
  position: THREE.Vector3
  velocity: THREE.Vector3
  rotation: THREE.Vector3
  rotationSpeed: THREE.Vector3
  phase: number
  floatSpeed: number
}

/**
 * 创建水晶花园梦境特效
 * @param container - 容器元素
 * @returns 清理函数
 */
export const crystalGardenEffect = (container: HTMLElement) => {
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: WebGPURendererType
  let controls: OrbitControls

  // 水晶系统
  const crystals: Crystal[] = []

  // 花瓣系统
  const petals: Petal[] = []
  let petalSystem: THREE.InstancedMesh | null = null

  // 粒子系统
  let starField: THREE.Points | null = null

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
      renderer.toneMappingExposure = 1.8
      container.appendChild(renderer.domElement)
      await renderer.init()

      camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100)
      camera.position.set(0, 3, 12)

      scene = new THREE.Scene()
      scene.background = null

      // 添加环境光
      ambientLight = new THREE.AmbientLight(0x1a0a30, 0.3)
      scene.add(ambientLight)

      // 创建场景元素
      createCrystals()
      createPetals()
      createStarField()
      createLighting()

      // 设置控制器
      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.minDistance = 3
      controls.maxDistance = 30
      controls.target.set(0, 0, 0)
      controls.enablePan = false

      // 启动动画
      renderer.setAnimationLoop(animate)

      // GSAP 动画
      initGSAPAnimations()
      playEntranceAnimation()

      // 启动电影级自动运镜
      setTimeout(() => {
        playCameraAnimation()
      }, 2500)

      console.log('[水晶花园]初始化完成')
    } catch (error) {
      console.error('[水晶花园]初始化失败:', error)
    }
  }

  // 创建水晶系统
  const createCrystals = () => {
    const { crystalCount, gardenRadius, crystalMinSize, crystalMaxSize, crystalColors, reflectionEffect } = crystalGardenEffectParams

    for (let i = 0; i < crystalCount; i++) {
      const size = crystalMinSize + Math.random() * (crystalMaxSize - crystalMinSize)

      // 创建几何体：八面体
      const geometry = new THREE.OctahedronGeometry(size, 0)

      // 创建材质：支持反射和折射
      const material = new THREE.MeshPhysicalMaterial({
        color: crystalColors[Math.floor(Math.random() * crystalColors.length)],
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.6, // 透射率
        thickness: 0.5,
        transparent: true,
        opacity: 0.8,
        envMapIntensity: reflectionEffect ? 2 : 1,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        emissive: 0x000000,
        emissiveIntensity: 0
      })

      const mesh = new THREE.Mesh(geometry, material)

      // 随机位置（在花园半径内）
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * gardenRadius
      const height = Math.random() * 4 - 2

      mesh.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      )

      scene.add(mesh)

      crystals.push({
        mesh,
        originalPosition: mesh.position.clone(),
        velocity: new THREE.Vector3(0, 0, 0),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        glowPhase: Math.random() * Math.PI * 2
      })
    }
  }

  // 创建花瓣系统
  const createPetals = () => {
    const { petalCount, gardenRadius } = crystalGardenEffectParams

    const geometry = new THREE.ConeGeometry(0.08, 0.15, 3)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffb7c5,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })

    petalSystem = new THREE.InstancedMesh(geometry, material, petalCount)
    petalSystem.frustumCulled = false

    for (let i = 0; i < petalCount; i++) {
      const x = (Math.random() - 0.5) * gardenRadius * 3
      const y = Math.random() * 10 - 2
      const z = (Math.random() - 0.5) * gardenRadius * 3

      petals.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(0, -0.5 - Math.random() * 0.5, 0),
        rotation: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        ),
        phase: Math.random() * Math.PI * 2,
        floatSpeed: 0.5 + Math.random() * 1
      })

      dummy.position.set(x, y, z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      petalSystem.setMatrixAt(i, dummy.matrix)
    }

    scene.add(petalSystem)
  }

  // 创建星空
  const createStarField = () => {
    const { starCount, rainbowGlow } = crystalGardenEffectParams
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)

    for (let i = 0; i < starCount; i++) {
      const radius = 20 + Math.random() * 30
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

      // 彩虹发光星星
      if (rainbowGlow) {
        const hue = (i / starCount) * Math.PI * 2
        const color = new THREE.Color().setHSL(hue / (Math.PI * 2), 1, 0.7)
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
      } else {
        colors[i * 3] = 1
        colors[i * 3 + 1] = 1
        colors[i * 3 + 2] = 1
      }

      sizes[i] = 0.03 + Math.random() * 0.05
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true
    })

    starField = new THREE.Points(geometry, material)
    scene.add(starField)
  }

  // 创建光照系统
  const createLighting = () => {
    const { crystalColors, pointLightIntensity, ambientLightIntensity } = crystalGardenEffectParams

    // 多个彩色点光源
    const lightPositions = [
      { pos: [5, 3, 5], color: crystalColors[0] },
      { pos: [-5, 2, 5], color: crystalColors[1] },
      { pos: [5, -2, -5], color: crystalColors[2] },
      { pos: [-5, 4, -5], color: crystalColors[3] },
      { pos: [0, 5, 0], color: crystalColors[4] }
    ]

    lightPositions.forEach(({ pos, color }) => {
      const light = new THREE.PointLight(color, pointLightIntensity, 15)
      light.position.set(...pos)
      scene.add(light)
      pointLights.push(light)
    })

    // 更新环境光
    ambientLight.intensity = ambientLightIntensity
  }

  // 物理碰撞检测
  const handlePhysics = () => {
    const { physicsEnabled } = crystalGardenEffectParams
    if (!physicsEnabled) return

    // 水晶碰撞检测
    crystals.forEach((crystal, i) => {
      crystals.forEach((other, j) => {
        if (i === j) return

        const distance = crystal.mesh.position.distanceTo(other.mesh.position)
        const minDist = 1.2 // 最小碰撞距离

        if (distance < minDist) {
          const pushDirection = crystal.mesh.position.clone().sub(other.mesh.position).normalize()
          crystal.velocity.add(pushDirection.multiplyScalar(0.01))
        }
      })
    })

    // 应用物理
    crystals.forEach(crystal => {
      crystal.mesh.position.add(crystal.velocity)
      crystal.velocity.multiplyScalar(0.95) // 阻尼

      // 回到原位的力
      const returnForce = crystal.originalPosition.clone().sub(crystal.mesh.position).multiplyScalar(0.01)
      crystal.velocity.add(returnForce)
    })
  }

  // GSAP 动画初始化
  const initGSAPAnimations = () => {
    // 呼吸动画
    const breatheAnimation = { value: 1 }
    const breatheTween = gsap.to(breatheAnimation, {
      value: 1.2,
      duration: 2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    })
    allTweens.push(breatheTween)
  }

  // 相机路径动画
  const playCameraAnimation = () => {
    if (!crystalGardenEffectParams.autoRotate || !camera) return

    // 清理之前的运镜动画
    if (cameraTimeline) {
      cameraTimeline.kill()
    }

    // 创建电影级运镜时间线
    cameraTimeline = gsap.timeline({
      repeat: 0, // 只播放一次，不再循环
      repeatDelay: 0.5,
      onComplete: () => {
        console.log('[水晶花园特效] 运镜动画完成 - 自动清除特效')
        cameraTimeline = null
        // 运镜完成后自动清除特效
        clearEffect()
      }
    })

    // 第一阶段：正面缓缓进入
    cameraTimeline.to(
      camera.position,
      {
        x: 0,
        y: 2,
        z: 8,
        duration: 5,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, 0, 0)
      },
      0
    )

    // 第二阶段：环绕上升
    cameraTimeline.to(
      camera.position,
      {
        x: 8,
        y: 4,
        z: 5,
        duration: 5,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, 0, 0)
      },
      '>'
    )

    // 第三阶段：俯视下落
    cameraTimeline.to(
      camera.position,
      {
        x: -6,
        y: 5,
        z: 7,
        duration: 5,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, 0, 0)
      },
      '>'
    )

    // 第四阶段：螺旋返回
    cameraTimeline.to(
      camera.position,
      {
        x: 0,
        y: 3,
        z: 12,
        duration: 5,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, 0, 0)
      },
      '>'
    )
  }

  // 入场动画
  const playEntranceAnimation = () => {
    // 相机从高处缓慢下降
    const t1 = gsap.from(camera.position, {
      x: 0,
      y: 15,
      z: 20,
      duration: 4,
      ease: 'power3.out'
    })
    allTweens.push(t1)

    // 水晶依次浮现
    crystals.forEach((crystal, index) => {
      const t = gsap.from(crystal.mesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.2,
        delay: index * 0.04,
        ease: 'elastic.out(1, 0.6)'
      })
      allTweens.push(t)
    })

    // 光源依次点亮
    pointLights.forEach((light, index) => {
      const t = gsap.from(light, {
        intensity: 0,
        duration: 1.5,
        delay: index * 0.25,
        ease: 'power2.out'
      })
      allTweens.push(t)
    })

    // 花瓣从上方飘落
    if (petalSystem) {
      const t = gsap.from(petalSystem.position, {
        y: 15,
        duration: 3,
        ease: 'power2.out'
      })
      allTweens.push(t)
    }
  }

  const animate = (time: number) => {
    timestamp = time * 0.001

    // 更新控制器
    if (controls) controls.update()

    const { crystalRotationSpeed, rainbowGlow, petalSpeed } = crystalGardenEffectParams

    // 更新水晶
    crystals.forEach((crystal, index) => {
      // 旋转
      crystal.mesh.rotation.x += crystal.rotationSpeed.x * crystalRotationSpeed
      crystal.mesh.rotation.y += crystal.rotationSpeed.y * crystalRotationSpeed
      crystal.mesh.rotation.z += crystal.rotationSpeed.z * crystalRotationSpeed

      // 悬浮效果
      const floatOffset = Math.sin(timestamp + crystal.glowPhase) * 0.02
      crystal.mesh.position.y = crystal.originalPosition.y + floatOffset

      // 彩虹发光效果
      if (rainbowGlow) {
        const hue = (timestamp * 0.2 + index * 0.1) % 1
        const emissiveColor = new THREE.Color().setHSL(hue, 1, 0.5)
        const intensity = 0.3 + Math.sin(timestamp * 2 + crystal.glowPhase) * 0.2
        crystal.mesh.material.emissive = emissiveColor
        crystal.mesh.material.emissiveIntensity = intensity
      }
    })

    // 物理碰撞
    handlePhysics()

    // 更新花瓣
    if (petalSystem) {
      for (let i = 0; i < petals.length; i++) {
        const petal = petals[i]
        petal.phase += 0.03

        // 螺旋飘落
        petal.position.y += petal.velocity.y * petalSpeed * 0.01
        petal.position.x += Math.sin(timestamp + petal.phase) * 0.01
        petal.position.z += Math.cos(timestamp + petal.phase) * 0.01

        // 旋转
        petal.rotation.x += petal.rotationSpeed.x
        petal.rotation.y += petal.rotationSpeed.y
        petal.rotation.z += petal.rotationSpeed.z

        // 重置超出范围的花瓣
        if (petal.position.y < -3) {
          petal.position.y = 8 + Math.random() * 3
          petal.position.x = (Math.random() - 0.5) * crystalGardenEffectParams.gardenRadius * 2
          petal.position.z = (Math.random() - 0.5) * crystalGardenEffectParams.gardenRadius * 2
        }

        dummy.position.copy(petal.position)
        dummy.rotation.set(petal.rotation.x, petal.rotation.y, petal.rotation.z)
        dummy.scale.setScalar(0.8 + Math.sin(timestamp + petal.phase) * 0.2)
        dummy.updateMatrix()
        petalSystem.setMatrixAt(i, dummy.matrix)
      }
      petalSystem.instanceMatrix.needsUpdate = true
    }

    // 更新点光源（动态颜色）
    pointLights.forEach((light, index) => {
      if (rainbowGlow) {
        const hue = (timestamp * 0.1 + index * 0.2) % 1
        const color = new THREE.Color().setHSL(hue, 1, 0.5)
        light.color.lerp(color, 0.02)
        light.intensity = crystalGardenEffectParams.pointLightIntensity + Math.sin(timestamp * 2 + index) * 0.5
      }
    })

    // 更新星空（闪烁效果）
    if (starField) {
      const sizes = starField.geometry.attributes.size.array as Float32Array
      for (let i = 0; i < sizes.length; i++) {
        sizes[i] = 0.03 + Math.sin(timestamp * 3 + i * 0.1) * 0.02
      }
      starField.geometry.attributes.size.needsUpdate = true
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
    console.log('清理水晶花园特效...')

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

      // 杀掉水晶 tweens
      crystals.forEach(crystal => {
        gsap.killTweensOf(crystal.mesh.scale)
        gsap.killTweensOf(crystal.mesh.material)
      })

      // 杀掉花瓣系统 tweens
      if (petalSystem) {
        gsap.killTweensOf(petalSystem.position)
        gsap.killTweensOf(petalSystem.material)
      }

      // 杀掉光源 tweens
      pointLights.forEach(light => {
        gsap.killTweensOf(light)
      })

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

      // 清理水晶
      crystals.forEach(crystal => {
        if (scene) scene.remove(crystal.mesh)
        if (crystal.mesh.geometry) crystal.mesh.geometry.dispose()
        if (crystal.mesh.material instanceof THREE.Material) {
          crystal.mesh.material.dispose()
        }
      })

      // 清理花瓣
      if (petalSystem && scene) {
        scene.remove(petalSystem)
      }
      if (petalSystem) {
        if (petalSystem.geometry) petalSystem.geometry.dispose()
        if (petalSystem.material instanceof THREE.Material) {
          petalSystem.material.dispose()
        }
      }

      // 清理星空
      if (starField && scene) {
        scene.remove(starField)
      }
      if (starField) {
        if (starField.geometry) starField.geometry.dispose()
        if (starField.material instanceof THREE.Material) {
          starField.material.dispose()
        }
      }

      // 清理光源
      pointLights.forEach(light => {
        if (scene) scene.remove(light)
      })
      if (ambientLight && scene) {
        scene.remove(ambientLight)
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
      scene = null as any
      camera = null as any
      renderer = null as any
      controls = null as any
      petalSystem = null
      starField = null
      ambientLight = null

      // 清理数组
      crystals.length = 0
      petals.length = 0
      pointLights.length = 0

      console.log('水晶花园特效清理完成')
    } catch (error) {
      console.error('清理水晶花园特效时出错:', error)
    }
  }

  // ============================================================
  // 🧹 清除特效（淡出后清理）
  // ============================================================
  const clearEffect = () => {
    console.log('开始淡出水晶花园特效...')

    // 先停止所有动画
    allTweens.forEach(tween => {
      if (tween && tween.kill) tween.kill()
    })
    allTweens.length = 0

    // 停止运镜动画
    if (cameraTimeline) {
      cameraTimeline.kill()
      cameraTimeline = null
    }

    // 先淡出所有元素
    const fadeOutTimeline = gsap.timeline({
      onComplete: () => {
        // 淡出完成后执行完整清理
        console.log('淡出完成，开始清理...')
        performCleanup()
      }
    })

    // 淡出水晶
    crystals.forEach((crystal) => {
      if (crystal.mesh && crystal.mesh.material instanceof THREE.Material) {
        fadeOutTimeline.to(crystal.mesh.material, {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out'
        }, 0)
      }
    })

    // 淡出花瓣粒子
    if (petalSystem && petalSystem.material instanceof THREE.Material) {
      fadeOutTimeline.to(petalSystem.material, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      }, 0)
    }

    // 淡出星空
    if (starField && starField.material instanceof THREE.Material) {
      fadeOutTimeline.to(starField.material, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out'
      }, 0.2)
    }
  }

  // 停止相机动画
  const stopCameraAnimation = () => {
    if (cameraTimeline) {
      console.log('停止水晶花园运镜动画')
      cameraTimeline.kill()
      cameraTimeline = null
    }
  }

  // 返回清理函数
  const cleanup = () => {
    performCleanup()
  }

  return { cleanup, clearEffect, stopCameraAnimation }
}
