// GPU 粒子群集特效 (GPU Particle Flock Effect)
// 特性: 使用 GPU Compute 并行计算粒子群集行为（分离、对齐、凝聚）
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import {
  uniform,
  varying,
  vec4,
  add,
  sub,
  max,
  dot,
  sin,
  uint,
  instancedArray,
  cameraProjectionMatrix,
  cameraViewMatrix,
  positionLocal,
  modelWorldMatrix,
  sqrt,
  float,
  Fn,
  If,
  cos,
  Loop,
  Continue,
  normalize,
  instanceIndex,
  length,
  texture,
  uv
} from 'three/tsl'
import gsap from 'gsap'

// 性能优化常量
const TIME_SCALE_FACTOR = 0.001
const FULL_ROTATION = Math.PI * 2

// 配置参数
export const gpuParticleFlockEffectParams = {
  particleCount: 2048, // 粒子数量
  particleSize: 1, // 粒子大小
  speedLimit: 8.0, // 速度限制
  bounds: 600, // 边界范围
  separation: 15.0, // 分离距离
  alignment: 20.0, // 对齐距离
  cohesion: 20.0, // 凝聚距离
  freedom: 0.75, // 自由度
  baseAlpha: 0.9, // 基础透明度
  colorCycleSpeed: 0.0002, // 颜色循环速度
  rotationSpeed: 0.0003, // 整体旋转速度
  autoRotate: true
}

type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

interface ParticleData {
  hue: number
  saturation: number
  lightness: number
}

/**
 * 创建 GPU 粒子群集特效
 * @param container - 容器元素
 * @returns 清理函数
 */
export const gpuParticleFlockEffect = (container: HTMLElement) => {
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: WebGPURendererType
  let controls: OrbitControls
  let mesh: THREE.InstancedMesh
  let material: THREE.NodeMaterial

  const count = gpuParticleFlockEffectParams.particleCount
  let particles: ParticleData[] = []

  // GSAP 动画对象
  let cameraTimeline: gsap.core.Timeline | null = null
  let cameraAnimationTimer: number | null = null
  const allTweens: gsap.core.Tween[] = []

  let raycaster: THREE.Raycaster
  let pointer: THREE.Vector2
  let computeVelocity: any
  let computePosition: any
  let effectController: any
  let positionStorage: any
  let velocityStorage: any
  let phaseStorage: any

  const SPEED_LIMIT = gpuParticleFlockEffectParams.speedLimit
  const BOUNDS = gpuParticleFlockEffectParams.bounds
  const BOUNDS_HALF = BOUNDS / 2

  const init = async () => {
    try {
      const width = container.clientWidth
      const height = container.clientHeight
      camera = new THREE.PerspectiveCamera(60, width / height, 1, 5000)
      camera.position.set(0, 200, 500)

      scene = new THREE.Scene()
      scene.background = null
      scene.fog = new THREE.Fog(0x000033, 300, 1500)

      // 初始化指针和射线
      pointer = new THREE.Vector2(0, 10)
      raycaster = new THREE.Raycaster()

      // 创建蝴蝶纹理（使用加载管理器确保纹理加载完成）
      const textureLoader = new THREE.TextureLoader()
      let butterflyTexture: THREE.Texture

      try {
        butterflyTexture = await new Promise<THREE.Texture>((resolve, reject) => {
          textureLoader.load(
            '/images/mifeng.jpg',
            texture => {
              texture.colorSpace = THREE.SRGBColorSpace
              // 启用透明度处理
              texture.minFilter = THREE.LinearMipMapLinearFilter
              texture.magFilter = THREE.LinearFilter
              // 确保纹理完全加载
              texture.needsUpdate = true
              resolve(texture)
            },
            undefined,
            error => {
              console.error('[GPU 粒子群集特效]纹理加载失败，使用备用方案', error)
              // 创建简单的圆形纹理作为备用
              const canvas = document.createElement('canvas')
              canvas.width = 64
              canvas.height = 64
              const ctx = canvas.getContext('2d')!
              const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
              gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
              gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
              ctx.fillStyle = gradient
              ctx.fillRect(0, 0, 64, 64)
              const fallbackTexture = new THREE.CanvasTexture(canvas)
              fallbackTexture.colorSpace = THREE.SRGBColorSpace
              resolve(fallbackTexture)
            }
          )
        })
      } catch (error) {
        console.error('[GPU 粒子群集特效]纹理初始化失败，使用备用方案', error)
        // 创建简单的圆形纹理作为备用
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 64
        const ctx = canvas.getContext('2d')!
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 64, 64)
        butterflyTexture = new THREE.CanvasTexture(canvas)
        butterflyTexture.colorSpace = THREE.SRGBColorSpace
      }

      // 创建粒子几何体（平面）- 使用蝴蝶图片
      const geometry = new THREE.PlaneGeometry(
        gpuParticleFlockEffectParams.particleSize * 3,
        gpuParticleFlockEffectParams.particleSize * 2
      )

      // 初始化位置、速度和相位数组
      const positionArray = new Float32Array(count * 3)
      const velocityArray = new Float32Array(count * 3)
      const phaseArray = new Float32Array(count)

      for (let i = 0; i < count; i++) {
        // 随机位置
        const posX = Math.random() * BOUNDS - BOUNDS_HALF
        const posY = Math.random() * BOUNDS - BOUNDS_HALF
        const posZ = Math.random() * BOUNDS - BOUNDS_HALF

        positionArray[i * 3 + 0] = posX
        positionArray[i * 3 + 1] = posY
        positionArray[i * 3 + 2] = posZ

        // 随机速度
        const velX = Math.random() - 0.5
        const velY = Math.random() - 0.5
        const velZ = Math.random() - 0.5

        velocityArray[i * 3 + 0] = velX * SPEED_LIMIT
        velocityArray[i * 3 + 1] = velY * SPEED_LIMIT
        velocityArray[i * 3 + 2] = velZ * SPEED_LIMIT

        // 随机相位
        phaseArray[i] = Math.random() * Math.PI * 2

        // 存储颜色信息（用于颜色更新）
        const hue = ((i / count) * 0.6 + Math.random() * 0.1) % 1
        const saturation = 0.7 + Math.random() * 0.3
        const lightness = 0.5 + Math.random() * 0.2
        particles.push({ hue, saturation, lightness })
      }

      // 创建存储节点
      positionStorage = instancedArray(positionArray, 'vec3').setName('positionStorage')
      velocityStorage = instancedArray(velocityArray, 'vec3').setName('velocityStorage')
      phaseStorage = instancedArray(phaseArray, 'float').setName('phaseStorage')

      // 启用 PBO（Pixel Buffer Object）以支持 WebGL2 回退
      positionStorage.setPBO(true)
      velocityStorage.setPBO(true)
      phaseStorage.setPBO(true)

      // 定义 Uniforms
      effectController = {
        separation: uniform(gpuParticleFlockEffectParams.separation).setName('separation'),
        alignment: uniform(gpuParticleFlockEffectParams.alignment).setName('alignment'),
        cohesion: uniform(gpuParticleFlockEffectParams.cohesion).setName('cohesion'),
        freedom: uniform(gpuParticleFlockEffectParams.freedom).setName('freedom'),
        deltaTime: uniform(0.0).setName('deltaTime'),
        rayOrigin: uniform(new THREE.Vector3()).setName('rayOrigin'),
        rayDirection: uniform(new THREE.Vector3()).setName('rayDirection'),
        time: uniform(0.0).setName('time')
      }

      // 创建材质
      material = new THREE.NodeMaterial()

      // 将纹理添加到材质
      material.map = butterflyTexture
      material.transparent = true
      material.side = THREE.DoubleSide
      material.depthWrite = false
      material.alphaToCoverage = true // 使用 alpha to coverage 改善透明边缘

      mesh = new THREE.InstancedMesh(geometry, material, count)
      mesh.matrixAutoUpdate = false
      mesh.frustumCulled = false
      scene.add(mesh)

      // 创建 WebGPU 渲染器
      renderer = new THREE.WebGPURenderer({
        antialias: false,
        alpha: true,
        samples: 1,
        requiredLimits: { maxStorageBuffersInVertexStage: 3 }
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
      renderer.setSize(width, height)
      container.appendChild(renderer.domElement)
      await renderer.init()

      // 顶点着色器：粒子形状动画 + Billboard 效果
      const particleVertexTSL = Fn(() => {
        const position = positionLocal.toVar()
        const newPhase = phaseStorage.element(instanceIndex).toVar()
        const particlePos = positionStorage.element(instanceIndex).toVar()

        // 根据相位动态缩放粒子
        const scale = sin(newPhase).mul(0.3).add(1.0)
        position.mulAssign(scale)

        // Billboard：将位置变换到世界空间后，让平面始终朝向相机
        const worldPosition = particlePos.add(position)
        const viewPosition = cameraViewMatrix.mul(
          vec4(worldPosition.x, worldPosition.y, worldPosition.z, 1.0)
        )

        return cameraProjectionMatrix.mul(viewPosition)
      })

      // 片段着色器：使用纹理颜色，增强饱和度
      const textureNode = texture(butterflyTexture, uv())
      // 增强颜色饱和度（乘以1.3倍）
      const colorNode = vec4(
        textureNode.r.mul(1.3),
        textureNode.g.mul(1.3),
        textureNode.b.mul(1.3),
        // 使用纹理的alpha通道，如果没有则使用baseAlpha
        textureNode.a.mul(gpuParticleFlockEffectParams.baseAlpha)
      )

      material.vertexNode = particleVertexTSL()
      material.colorNode = colorNode
      material.needsUpdate = true

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
      controls.minDistance = 100
      controls.maxDistance = 1000

      // 定义 GPU Compute 着色器 - 速度计算
      computeVelocity = Fn(() => {
        const PI = float(3.141592653589793)
        const PI_2 = PI.mul(2.0)
        const limit = float(SPEED_LIMIT).toVar('limit')

        const { alignment, separation, cohesion, deltaTime, rayOrigin, rayDirection, time } =
          effectController

        const zoneRadius = separation.add(alignment).add(cohesion).toConst()
        const separationThresh = separation.div(zoneRadius).toConst()
        const alignmentThresh = separation.add(alignment).div(zoneRadius).toConst()
        const zoneRadiusSq = zoneRadius.mul(zoneRadius).toConst()

        const birdIndex = instanceIndex.toConst('birdIndex')
        const position = positionStorage.element(birdIndex).toVar()
        const velocity = velocityStorage.element(birdIndex).toVar()

        // 指针交互：被鼠标影响
        const directionToRay = rayOrigin.sub(position).toConst()
        const projectionLength = dot(directionToRay, rayDirection).toConst()
        const closestPoint = rayOrigin.sub(rayDirection.mul(projectionLength)).toConst()
        const directionToClosestPoint = closestPoint.sub(position).toConst()
        const distanceToClosestPoint = length(directionToClosestPoint).toConst()
        const distanceToClosestPointSq = distanceToClosestPoint
          .mul(distanceToClosestPoint)
          .toConst()

        const rayRadius = float(200.0).toConst()
        const rayRadiusSq = rayRadius.mul(rayRadius).toConst()

        If(distanceToClosestPointSq.lessThan(rayRadiusSq), () => {
          const velocityAdjust = distanceToClosestPointSq
            .div(rayRadiusSq)
            .sub(1.0)
            .mul(deltaTime)
            .mul(100.0)
          velocity.addAssign(normalize(directionToClosestPoint).mul(velocityAdjust))
          limit.addAssign(5.0)
        })

        // 吸引到中心
        const dirToCenter = position.toVar()
        dirToCenter.y.mulAssign(2.5)
        velocity.subAssign(normalize(dirToCenter).mul(deltaTime).mul(5.0))

        // 粒子间交互
        Loop({ start: uint(0), end: uint(count), type: 'uint', condition: '<' }, ({ i }) => {
          If(i.equal(birdIndex), () => {
            Continue()
          })

          const birdPosition = positionStorage.element(i)
          const dirToBird = birdPosition.sub(position)
          const distToBird = length(dirToBird)

          If(distToBird.lessThan(0.0001), () => {
            Continue()
          })

          const distToBirdSq = distToBird.mul(distToBird)

          If(distToBirdSq.greaterThan(zoneRadiusSq), () => {
            Continue()
          })

          const percent = distToBirdSq.div(zoneRadiusSq)

          If(percent.lessThan(separationThresh), () => {
            // 分离：粒子远离
            const velocityAdjust = separationThresh.div(percent).sub(1.0).mul(deltaTime)
            velocity.subAssign(normalize(dirToBird).mul(velocityAdjust))
          })
            .ElseIf(percent.lessThan(alignmentThresh), () => {
              // 对齐：同向飞行
              const threshDelta = alignmentThresh.sub(separationThresh)
              const adjustedPercent = percent.sub(separationThresh).div(threshDelta)
              const birdVelocity = velocityStorage.element(i)

              const cosRange = cos(adjustedPercent.mul(PI_2))
              const cosRangeAdjust = float(0.5).sub(cosRange.mul(0.5)).add(0.5)
              const velocityAdjust = cosRangeAdjust.mul(deltaTime)
              velocity.addAssign(normalize(birdVelocity).mul(velocityAdjust))
            })
            .Else(() => {
              // 凝聚：靠近群集
              const threshDelta = alignmentThresh.oneMinus()
              const adjustedPercent = threshDelta
                .equal(0.0)
                .select(1.0, percent.sub(alignmentThresh).div(threshDelta))

              const cosRange = cos(adjustedPercent.mul(PI_2))
              const adj1 = cosRange.mul(-0.5)
              const adj2 = adj1.add(0.5)
              const adj3 = float(0.5).sub(adj2)

              const velocityAdjust = adj3.mul(deltaTime)
              velocity.addAssign(normalize(dirToBird).mul(velocityAdjust))
            })
        })

        // 速度限制
        If(length(velocity).greaterThan(limit), () => {
          velocity.assign(normalize(velocity).mul(limit))
        })

        velocityStorage.element(birdIndex).assign(velocity)
      })()
        .compute(count)
        .setName('Particle Velocity')

      // 位置计算
      computePosition = Fn(() => {
        const { deltaTime } = effectController
        positionStorage
          .element(instanceIndex)
          .addAssign(velocityStorage.element(instanceIndex).mul(deltaTime).mul(20.0))

        const velocity = velocityStorage.element(instanceIndex)
        const phase = phaseStorage.element(instanceIndex)

        const modValue = phase
          .add(deltaTime)
          .add(length(velocity.xz).mul(deltaTime).mul(3.0))
          .add(max(velocity.y, 0.0).mul(deltaTime).mul(6.0))
        phaseStorage.element(instanceIndex).assign(modValue.mod(62.83))
      })()
        .compute(count)
        .setName('Particle Position')

      // 启动动画循环
      renderer.setAnimationLoop(animate)

      // GSAP 动画
      initGSAPAnimations()
      playEntranceAnimation()
      console.log('[GPU 粒子群集特效]初始化完成')
    } catch (error) {
      console.error('[GPU 粒子群集特效]初始化失败:', error)
    }
  }

  // 相机运镜动画
  const playCameraAnimation = () => {
    if (!gpuParticleFlockEffectParams.autoRotate) return

    // 检查 camera 是否存在（可能在切换特效时已被清理）
    if (!camera) {
      console.warn('[GPU 粒子群集特效] camera 已被清理，跳过运镜动画')
      return
    }

    cameraTimeline = gsap.timeline({
      repeatDelay: 0.3,
      duration: 10,
      repeat: 0,
      onComplete: () => {
        console.log('[GPU 粒子群集特效] 运镜动画完成，开始清理特效')
        clearEffect()
      }
    })

    // 第一阶段：正面推进
    cameraTimeline.to(
      camera.position,
      {
        x: 300,
        y: 100,
        z: 300,
        duration: 5,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, 0, 0)
      },
      0
    )

    // 第二阶段：环绕切换
    cameraTimeline.to(
      camera.position,
      {
        x: -300,
        y: 200,
        z: -300,
        duration: 5,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, 0, 0)
      },
      5
    )
  }

  // 停止运镜动画
  const stopCameraAnimation = () => {
    if (cameraTimeline) {
      cameraTimeline.kill()
      cameraTimeline = null
    }
  }

  // 初始化GSAP呼吸动画
  const initGSAPAnimations = () => {
    // 粒子整体旋转呼吸
    const t = gsap.to(
      { rotation: 0 },
      {
        rotation: Math.PI * 2,
        duration: 60,
        repeat: -1,
        ease: 'none',
        onUpdate: function () {
          if (mesh) {
            mesh.rotation.y = this.targets()[0].rotation * 0.01
          }
        }
      }
    )
    allTweens.push(t)
  }

  // 入场动画
  const playEntranceAnimation = () => {
    // 相机远距离俯冲
    const t1 = gsap.from(camera.position, {
      x: 0,
      y: 800,
      z: 1000,
      duration: 2.5,
      ease: 'power3.out'
    })
    allTweens.push(t1)

    // 粒子群弹入
    const t2 = gsap.from(mesh.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 2,
      ease: 'elastic.out(1, 0.5)'
    })
    allTweens.push(t2)

    // 粒子旋转入场
    const t3 = gsap.from(mesh.rotation, {
      y: Math.PI * 2,
      duration: 2.5,
      ease: 'power2.out'
    })
    allTweens.push(t3)

    // 2.5秒后启动运镜动画
    cameraAnimationTimer = window.setTimeout(() => {
      playCameraAnimation()
      cameraAnimationTimer = null
    }, 2500)
  }

  const animate = (time: number) => {
    const now = performance.now()
    const deltaTime = Math.min((now - (effectController?.now?.value || now)) / 1000, 1)

    // 更新控制器
    if (controls) controls.update()

    // 更新 raycaster
    raycaster.setFromCamera(pointer, camera)

    // 更新 uniforms
    if (effectController) {
      effectController.deltaTime.value = deltaTime
      effectController.time.value = time * TIME_SCALE_FACTOR
      effectController.rayOrigin.value.copy(raycaster.ray.origin)
      effectController.rayDirection.value.copy(raycaster.ray.direction)
    }

    // GPU 计算
    if (renderer && computeVelocity && computePosition) {
      renderer.compute(computeVelocity)
      renderer.compute(computePosition)
    }

    // 渲染
    if (renderer) {
      renderer.render(scene, camera)
    }

    // 移开指针（仅在移动鼠标时影响粒子）
    pointer.y = 10
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

  const handlePointerMove = (event: PointerEvent) => {
    if (!container) return

    const rect = container.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2.0 - 1.0
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2.0 + 1.0
  }

  window.addEventListener('resize', handleResize)
  if (container) {
    container.addEventListener('pointermove', handlePointerMove)
  }

  init()

  // ============================================================
  // 🧹 内部清理函数（实际执行清理）
  // ============================================================
  const performCleanup = () => {
    try {
      // 清除延迟执行的运镜动画 timer
      if (cameraAnimationTimer !== null) {
        clearTimeout(cameraAnimationTimer)
        cameraAnimationTimer = null
      }

      // 1. 清理所有tween
      allTweens.forEach(t => {
        if (t?.kill) t.kill()
      })
      allTweens.length = 0

      // 2. 清理相机动画
      if (camera) {
        gsap.killTweensOf(camera.position)
        gsap.killTweensOf(camera.rotation)
      }

      // 3. 清理相机timeline
      if (cameraTimeline) {
        cameraTimeline.kill()
        cameraTimeline = null
      }

      // 4. 停止动画循环
      if (renderer) {
        renderer.setAnimationLoop(null)
      }

      // 5. 移除事件监听
      window.removeEventListener('resize', handleResize)
      if (container) {
        container.removeEventListener('pointermove', handlePointerMove)
      }

      // 6. 清理场景对象 - 粒子系统
      if (scene && mesh) scene.remove(mesh)
      if (mesh) {
        if (mesh.geometry) mesh.geometry.dispose()
        if (mesh.material instanceof THREE.Material) {
          // 清理材质的纹理
          const nodeMaterial = mesh.material as any
          if (nodeMaterial.map) {
            nodeMaterial.map.dispose()
            nodeMaterial.map = null
          }
          mesh.material.dispose()
        }
      }

      // 7. 清理DOM
      if (renderer?.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }

      // 8. 清理renderer
      if (renderer) {
        renderer.dispose()
      }

      // 9. 清理数组
      particles.length = 0

      // 10. 置null
      scene = null as any
      camera = null as any
      renderer = null
      controls = null
      mesh = null
      material = null
      particles = []
      raycaster = null
      pointer = null
      computeVelocity = null
      computePosition = null
      effectController = null
      positionStorage = null
      velocityStorage = null
      phaseStorage = null

      console.log('[GPU 粒子群集特效]清理完成')
    } catch (error) {
      console.error('清理[GPU 粒子群集特效]时出错:', error)
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
          duration: 0.8,
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
