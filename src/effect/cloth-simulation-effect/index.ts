// GPU 丝绸波浪特效 (GPU Silk Wave Effect)
// 特性: 使用 Verlet 积分系统和 GPU Compute 着色器实现梦幻丝绸效果
// 拓展: 极光渐变、流动波纹、星空粒子、动态光照
// 注意: 需要浏览器支持 WebGPU (Chrome 113+, Edge 113+)

import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  uniform,
  uint,
  instancedArray,
  instanceIndex,
  Loop,
  float,
  Fn,
  If,
  Return,
  triNoise3D,
  time,
  select,
  attribute,
  cross,
  transformNormalToView,
  vec3,
  mix,
  sin,
  cos,
  positionWorld,
  smoothstep,
  max
} from 'three/tsl'
import gsap from 'gsap'

// 性能优化常量
const TIME_SCALE_FACTOR = 0.001

// 配置参数
export const clothSimulationEffectParams = {
  clothWidth: 3, // 丝绸宽度
  clothHeight: 4, // 丝绸高度
  clothSegmentsX: 60, // 水平分段数
  clothSegmentsY: 70, // 垂直分段数
  stiffness: 0.25, // 刚度（更柔软）
  dampening: 0.985, // 阻尼
  windStrength: 1.5, // 风力强度
  gravity: 0.00005, // 重力（更轻）
  wireframe: false, // 线框模式
  // 极光渐变色
  clothColor1: 0x00ffff, // 青色
  clothColor2: 0xff00ff, // 洋红
  clothColor3: 0x0066ff, // 深蓝
  clothColor4: 0xffaa00, // 金橙
  sheen: 0.95, // 光泽
  opacity: 0.85, // 透明度
  autoRotate: true, // 自动旋转
  rippleEnabled: true, // 波纹效果启用
  rippleStrength: 0.4, // 波纹强度
  windNoiseScale: 1.2, // 风场噪声缩放
  particleCount: 300, // 星空粒子数量
  particleSize: 0.02, // 粒子大小
  gradientEnabled: true, // 渐变着色启用
  auroraEffect: true, // 极光效果
  flowSpeed: 2.0 // 流动速度
}

type WebGPURendererType = InstanceType<typeof THREE.WebGPURenderer>

// Verlet 顶点数据结构
interface VerletVertex {
  id: number
  position: THREE.Vector3
  isFixed: boolean
  springIds: number[]
}

// Verlet 弹簧数据结构
interface VerletSpring {
  id: number
  vertex0: VerletVertex
  vertex1: VerletVertex
}

/**
 * 创建 GPU 布料模拟特效
 * @param container - 容器元素
 * @returns 清理函数
 */
export const clothSimulationEffect = (container: HTMLElement) => {
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let renderer: WebGPURendererType
  let controls: OrbitControls
  let clothMesh: THREE.Mesh | null
  let wireframeMesh: THREE.Line | null
  let particleMesh: THREE.InstancedMesh | null

  // Verlet 系统数据
  const verletVertices: VerletVertex[] = []
  const verletSprings: VerletSpring[] = []
  const verletVertexColumns: VerletVertex[][] = []

  // GPU 缓冲区
  let vertexPositionBuffer: any
  let vertexForceBuffer: any
  let vertexParamsBuffer: any
  let springVertexIdBuffer: any
  let springRestLengthBuffer: any
  let springForceBuffer: any
  let springListBuffer: any

  // Compute 着色器
  let computeSpringForces: any
  let computeVertexForces: any

  // Uniforms
  let dampeningUniform: any
  let windUniform: any
  let stiffnessUniform: any
  let rippleUniform: any
  let rippleStrengthUniform: any
  let windScaleUniform: any
  let flowSpeedUniform: any
  let auroraUniform: any

  // 装饰粒子系统
  const particles: THREE.Vector3[] = []
  const particleVelocities: THREE.Vector3[] = []
  const particlePhases: number[] = []

  // 时间控制
  let timeSinceLastStep = 0
  let timestamp = 0
  const STEPS_PER_SECOND = 360
  const TIME_PER_STEP = 1 / STEPS_PER_SECOND

  // GSAP 动画
  let cameraTimeline: gsap.core.Timeline | null = null
  const allTweens: gsap.core.Tween[] = []

  const { clothWidth, clothHeight, clothSegmentsX, clothSegmentsY } = clothSimulationEffectParams

  const init = async () => {
    try {
      const width = container.clientWidth
      const height = container.clientHeight

      // 创建 WebGPU 渲染器
      renderer = new THREE.WebGPURenderer({
        antialias: true,
        alpha: true,
        requiredLimits: { maxStorageBuffersInVertexStage: 1 }
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
      renderer.setSize(width, height)
      container.appendChild(renderer.domElement)
      await renderer.init()

      camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 10)
      camera.position.set(-3.5, -0.3, -3.5)

      scene = new THREE.Scene()
      scene.background = null // 使用透明背景，避免覆盖整个页面

      // 添加环境光和方向光
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
      scene.add(ambientLight)

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
      directionalLight.position.set(1, 1, 1)
      scene.add(directionalLight)

      const backLight = new THREE.DirectionalLight(0x00ffff, 0.6)
      backLight.position.set(-1, 0.3, -1)
      scene.add(backLight)

      const sideLight1 = new THREE.DirectionalLight(0xff00ff, 0.4)
      sideLight1.position.set(0, -1, 1)
      scene.add(sideLight1)

      const sideLight2 = new THREE.DirectionalLight(0x0066ff, 0.3)
      sideLight2.position.set(1, 0, -1)
      scene.add(sideLight2)

      // 设置 Verlet 系统
      setupVerletGeometry()
      setupVerletVertexBuffers()
      setupVerletSpringBuffers()
      setupUniforms()
      setupComputeShaders()
      setupClothMesh()
      setupWireframe()
      setupParticles()

      renderer.setAnimationLoop(animate)

      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.minDistance = 2
      controls.maxDistance = 10
      controls.target.set(0, -0.2, 0)
      controls.update()

      // GSAP 动画
      initGSAPAnimations()
      playEntranceAnimation()

      // 启动电影级自动运镜
      setTimeout(() => {
        playCameraAnimation()
      }, 2500)

      console.log('[GPU 丝绸波浪特效]初始化完成')
    } catch (error) {
      console.error('[GPU 布料模拟特效]初始化失败:', error)
    }
  }

  // 设置 Verlet 几何结构
  const setupVerletGeometry = () => {
    const addVerletVertex = (x: number, y: number, z: number, isFixed: boolean) => {
      const id = verletVertices.length
      const vertex: VerletVertex = {
        id,
        position: new THREE.Vector3(x, y, z),
        isFixed,
        springIds: []
      }
      verletVertices.push(vertex)
      return vertex
    }

    const addVerletSpring = (vertex0: VerletVertex, vertex1: VerletVertex) => {
      const id = verletSprings.length
      const spring: VerletSpring = {
        id,
        vertex0,
        vertex1
      }
      vertex0.springIds.push(id)
      vertex1.springIds.push(id)
      verletSprings.push(spring)
      return spring
    }

    // 创建丝绸顶点 - 增加初始波动
    for (let x = 0; x <= clothSegmentsX; x++) {
      const column: VerletVertex[] = []
      for (let y = 0; y <= clothSegmentsY; y++) {
        const posX = x * (clothWidth / clothSegmentsX) - clothWidth * 0.5
        const posZ = y * (clothHeight / clothSegmentsY) - clothHeight * 0.5
        // 添加初始波浪效果
        const waveX = Math.sin(y * 0.2) * 0.1
        // 固定顶部和两侧部分顶点（更少固定点，更飘逸）
        const isFixed = y === 0 && x % 8 === 0
        const vertex = addVerletVertex(posX + waveX, clothHeight * 0.3, posZ, isFixed)
        column.push(vertex)
      }
      verletVertexColumns.push(column)
    }

    // 创建弹簧连接
    for (let x = 0; x <= clothSegmentsX; x++) {
      for (let y = 0; y <= clothSegmentsY; y++) {
        const vertex0 = verletVertexColumns[x][y]
        if (x > 0) addVerletSpring(vertex0, verletVertexColumns[x - 1][y])
        if (y > 0) addVerletSpring(vertex0, verletVertexColumns[x][y - 1])
        if (x > 0 && y > 0) addVerletSpring(vertex0, verletVertexColumns[x - 1][y - 1])
        if (x > 0 && y < clothSegmentsY) addVerletSpring(vertex0, verletVertexColumns[x - 1][y + 1])

        // 添加额外的弹簧增加刚性
        if (x > 1) addVerletSpring(vertex0, verletVertexColumns[x - 2][y])
        if (y > 1) addVerletSpring(vertex0, verletVertexColumns[x][y - 2])
      }
    }
  }

  // 设置顶点缓冲区
  const setupVerletVertexBuffers = () => {
    const vertexCount = verletVertices.length
    const springListArray: number[] = []

    const vertexPositionArray = new Float32Array(vertexCount * 3)
    const vertexParamsArray = new Uint32Array(vertexCount * 3)

    for (let i = 0; i < vertexCount; i++) {
      const vertex = verletVertices[i]
      vertexPositionArray[i * 3] = vertex.position.x
      vertexPositionArray[i * 3 + 1] = vertex.position.y
      vertexPositionArray[i * 3 + 2] = vertex.position.z
      vertexParamsArray[i * 3] = vertex.isFixed ? 1 : 0
      if (!vertex.isFixed) {
        vertexParamsArray[i * 3 + 1] = vertex.springIds.length
        vertexParamsArray[i * 3 + 2] = springListArray.length
        springListArray.push(...vertex.springIds)
      }
    }

    vertexPositionBuffer = instancedArray(vertexPositionArray, 'vec3').setPBO(true)
    vertexForceBuffer = instancedArray(vertexCount, 'vec3')
    vertexParamsBuffer = instancedArray(vertexParamsArray, 'uvec3')
    springListBuffer = instancedArray(new Uint32Array(springListArray), 'uint').setPBO(true)
  }

  // 设置弹簧缓冲区
  const setupVerletSpringBuffers = () => {
    const springCount = verletSprings.length

    const springVertexIdArray = new Uint32Array(springCount * 2)
    const springRestLengthArray = new Float32Array(springCount)

    for (let i = 0; i < springCount; i++) {
      const spring = verletSprings[i]
      springVertexIdArray[i * 2] = spring.vertex0.id
      springVertexIdArray[i * 2 + 1] = spring.vertex1.id
      springRestLengthArray[i] = spring.vertex0.position.distanceTo(spring.vertex1.position)
    }

    springVertexIdBuffer = instancedArray(springVertexIdArray, 'uvec2').setPBO(true)
    springRestLengthBuffer = instancedArray(springRestLengthArray, 'float')
    springForceBuffer = instancedArray(springCount * 3, 'vec3').setPBO(true)
  }

  // 设置 Uniforms
  const setupUniforms = () => {
    dampeningUniform = uniform(clothSimulationEffectParams.dampening)
    windUniform = uniform(clothSimulationEffectParams.windStrength)
    stiffnessUniform = uniform(clothSimulationEffectParams.stiffness)
    rippleUniform = uniform(clothSimulationEffectParams.rippleEnabled ? 1.0 : 0.0)
    rippleStrengthUniform = uniform(clothSimulationEffectParams.rippleStrength)
    windScaleUniform = uniform(clothSimulationEffectParams.windNoiseScale)
    flowSpeedUniform = uniform(clothSimulationEffectParams.flowSpeed)
    auroraUniform = uniform(clothSimulationEffectParams.auroraEffect ? 1.0 : 0.0)
  }

  // 设置 Compute 着色器
  const setupComputeShaders = () => {
    const vertexCount = verletVertices.length
    const springCount = verletSprings.length

    // 弹簧力计算
    computeSpringForces = Fn(() => {
      If(instanceIndex.greaterThanEqual(uint(springCount)), () => {
        Return()
      })

      const vertexIds = springVertexIdBuffer.element(instanceIndex)
      const restLength = springRestLengthBuffer.element(instanceIndex)

      const vertex0Position = vertexPositionBuffer.element(vertexIds.x)
      const vertex1Position = vertexPositionBuffer.element(vertexIds.y)

      const delta = vertex1Position.sub(vertex0Position).toVar()
      const dist = delta.length().max(0.000001).toVar()
      const force = dist.sub(restLength).mul(stiffnessUniform).mul(delta).mul(0.5).div(dist)
      springForceBuffer.element(instanceIndex).assign(force)
    })()
      .compute(springCount)
      .setName('Spring Forces')

    // 顶点力计算
    computeVertexForces = Fn(() => {
      If(instanceIndex.greaterThanEqual(uint(vertexCount)), () => {
        Return()
      })

      const params = vertexParamsBuffer.element(instanceIndex).toVar()
      const isFixed = params.x
      const springCount = params.y
      const springPointer = params.z

      If(isFixed, () => {
        Return()
      })

      const position = vertexPositionBuffer.element(instanceIndex).toVar('vertexPosition')
      const force = vertexForceBuffer.element(instanceIndex).toVar('vertexForce')

      force.mulAssign(dampeningUniform)

      const ptrStart = springPointer.toVar('ptrStart')
      const ptrEnd = ptrStart.add(springCount).toVar('ptrEnd')

      Loop({ start: ptrStart, end: ptrEnd, type: 'uint', condition: '<' }, ({ i }) => {
        const springId = springListBuffer.element(i).toVar('springId')
        const springForce = springForceBuffer.element(springId)
        const springVertexIds = springVertexIdBuffer.element(springId)
        const factor = select(springVertexIds.x.equal(instanceIndex), 1.0, -1.0)
        force.addAssign(springForce.mul(factor))
      })

      // 重力
      force.y.subAssign(float(clothSimulationEffectParams.gravity))

      // 风力（使用三重噪声 - 动态风场）
      const noise = triNoise3D(position.mul(windScaleUniform), 1, time.mul(flowSpeedUniform))
        .sub(0.3)
        .mul(0.00015)
      const windForce = noise.mul(windUniform)
      force.z.subAssign(windForce)

      // 多层波纹效果
      const rippleDist = position.x.mul(position.x).add(position.z.mul(position.z)).sqrt()
      const rippleWave1 = sin(rippleDist.mul(8).sub(time.mul(2)))
      const rippleWave2 = sin(rippleDist.mul(5).sub(time.mul(3)))
      const rippleWave3 = sin(position.x.mul(10).add(time.mul(1.5)))
      const rippleWave = rippleWave1
        .mul(rippleWave2)
        .add(rippleWave3.mul(0.5))
        .mul(rippleStrengthUniform)
        .mul(rippleUniform)
        .mul(0.0003)
      force.y.addAssign(rippleWave)

      // 极光效果 - 垂直波动
      if (auroraUniform.value > 0) {
        const auroraWave = sin(position.x.mul(3).add(time.mul(1.5)))
          .mul(cos(position.z.mul(2).sub(time.mul(1.2))))
          .mul(auroraUniform)
          .mul(0.0002)
        force.x.addAssign(auroraWave)
      }

      vertexForceBuffer.element(instanceIndex).assign(force)
      vertexPositionBuffer.element(instanceIndex).addAssign(force)
    })()
      .compute(vertexCount)
      .setName('Vertex Forces')
  }

  // 设置丝绸网格
  const setupClothMesh = () => {
    const vertexCount = clothSegmentsX * clothSegmentsY
    const geometry = new THREE.BufferGeometry()

    const verletVertexIdArray = new Uint32Array(vertexCount * 4)
    const indices: number[] = []

    const getIndex = (x: number, y: number) => {
      return y * clothSegmentsX + x
    }

    for (let x = 0; x < clothSegmentsX; x++) {
      for (let y = 0; y < clothSegmentsY; y++) {
        const index = getIndex(x, y)
        verletVertexIdArray[index * 4] = verletVertexColumns[x][y].id
        verletVertexIdArray[index * 4 + 1] = verletVertexColumns[x + 1][y].id
        verletVertexIdArray[index * 4 + 2] = verletVertexColumns[x][y + 1].id
        verletVertexIdArray[index * 4 + 3] = verletVertexColumns[x + 1][y + 1].id

        if (x > 0 && y > 0) {
          indices.push(getIndex(x, y), getIndex(x - 1, y), getIndex(x - 1, y - 1))
          indices.push(getIndex(x, y), getIndex(x - 1, y - 1), getIndex(x, y - 1))
        }
      }
    }

    const verletVertexIdBufferAttr = new THREE.BufferAttribute(verletVertexIdArray, 4, false)
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3, false)
    )
    geometry.setAttribute('vertexIds', verletVertexIdBufferAttr)
    geometry.setIndex(indices)

    // 极光四色渐变配置
    const color1 = new THREE.Color(clothSimulationEffectParams.clothColor1)
    const color2 = new THREE.Color(clothSimulationEffectParams.clothColor2)
    const color3 = new THREE.Color(clothSimulationEffectParams.clothColor3)
    const color4 = new THREE.Color(clothSimulationEffectParams.clothColor4)

    // 使用 MeshPhysicalNodeMaterial 支持 TSL 节点
    const clothMaterial = new THREE.MeshPhysicalNodeMaterial({
      color: new THREE.Color().setHex(clothSimulationEffectParams.clothColor1),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: clothSimulationEffectParams.opacity,
      sheen: clothSimulationEffectParams.sheen,
      sheenRoughness: 0.2,
      sheenColor: new THREE.Color(0xffffff),
      metalness: 0.1,
      roughness: 0.4,
      transmission: 0.25,
      thickness: 0.15,
      clearcoat: 0.8,
      clearcoatRoughness: 0.3,
      iridescence: 0.6,
      iridescenceIOR: 1.8,
      iridescenceThicknessRange: [100, 400]
    })

    // 使用 TSL 节点更新位置、计算法线和极光渐变着色
    const updatePosition = Fn(() => {
      const vertexIds = attribute('vertexIds')
      const v0 = vertexPositionBuffer.element(vertexIds.x).toVar()
      const v1 = vertexPositionBuffer.element(vertexIds.y).toVar()
      const v2 = vertexPositionBuffer.element(vertexIds.z).toVar()
      const v3 = vertexPositionBuffer.element(vertexIds.w).toVar()

      // 计算中心位置
      const position = v0.add(v1).add(v2).add(v3).mul(0.25)

      // 计算切线和副切线
      const top = v0.add(v1)
      const right = v1.add(v3)
      const bottom = v2.add(v3)
      const left = v0.add(v2)

      const tangent = right.sub(left).normalize()
      const bitangent = bottom.sub(top).normalize()

      // 计算法线
      const normal = cross(tangent, bitangent).normalize()

      // 设置法线到材质
      clothMaterial.normalNode = transformNormalToView(normal)

      // 极光四色渐变着色（基于位置和时间的动态渐变）
      if (clothSimulationEffectParams.gradientEnabled) {
        const heightFactor = smoothstep(-clothHeight * 0.5, clothHeight * 0.5, position.y)
        const horizontalFactor = smoothstep(-clothWidth * 0.5, clothWidth * 0.5, position.x)
        const timeFactor = sin(time.mul(flowSpeedUniform).mul(0.5)).mul(0.5).add(0.5)

        // 多层混合实现极光效果
        const mix1 = mix(
          vec3(color1.r, color1.g, color1.b),
          vec3(color2.r, color2.g, color2.b),
          horizontalFactor
        )
        const mix2 = mix(
          vec3(color3.r, color3.g, color3.b),
          vec3(color4.r, color4.g, color4.b),
          horizontalFactor
        )
        const finalMix = mix(mix1, mix2, heightFactor)

        // 添加时间变化
        const auroraPulse = sin(position.y.mul(4).add(time.mul(2)))
          .mul(0.3)
          .add(0.7)
        clothMaterial.colorNode = finalMix.mul(auroraPulse)
      }

      // 动态光泽（虹彩效果）
      const sheenIntensity = smoothstep(-clothHeight * 0.5, clothHeight * 0.5, position.y).mul(
        sin(time).mul(0.2).add(0.8)
      )
      clothMaterial.sheenNode = uniform(clothSimulationEffectParams.sheen).mul(sheenIntensity)

      return position
    })

    clothMaterial.positionNode = updatePosition()

    clothMesh = new THREE.Mesh(geometry, clothMaterial)
    clothMesh.frustumCulled = false
    scene.add(clothMesh)
  }

  // 设置线框
  const setupWireframe = () => {
    if (!wireframeMesh) return

    const springWireframePositionBuffer = new THREE.BufferAttribute(new Float32Array(6), 3, false)
    const springWireframeIndexBuffer = new THREE.BufferAttribute(new Uint32Array([0, 1]), 1, false)

    const geometry = new THREE.InstancedBufferGeometry()
    geometry.setAttribute('position', springWireframePositionBuffer)
    geometry.setAttribute('vertexIndex', springWireframeIndexBuffer)
    geometry.instanceCount = verletSprings.length

    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.15
    })

    wireframeMesh = new THREE.Line(geometry, material)
    wireframeMesh.visible = clothSimulationEffectParams.wireframe
    wireframeMesh.frustumCulled = false
    scene.add(wireframeMesh)
  }

  // 设置星空粒子系统
  const setupParticles = () => {
    const particleCount = clothSimulationEffectParams.particleCount
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    for (let i = 0; i < particleCount; i++) {
      // 在丝绸周围随机生成星空粒子
      const radius = Math.random() * clothWidth * 2 + 1
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.cos(phi) * 1.5
      const z = radius * Math.sin(phi) * Math.sin(theta)

      particles.push(new THREE.Vector3(x, y, z))
      particleVelocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.002,
          (Math.random() - 0.5) * 0.002,
          (Math.random() - 0.5) * 0.002
        )
      )
      particlePhases.push(Math.random() * Math.PI * 2)
    }

    const geometry = new THREE.IcosahedronGeometry(clothSimulationEffectParams.particleSize, 0)
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1.2,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9
    })

    particleMesh = new THREE.InstancedMesh(geometry, material, particleCount)
    particleMesh.frustumCulled = false

    for (let i = 0; i < particleCount; i++) {
      dummy.position.copy(particles[i])
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      particleMesh.setMatrixAt(i, dummy.matrix)
    }

    scene.add(particleMesh)
  }

  // 更新星空粒子
  const updateParticles = () => {
    if (!particleMesh) return

    const dummy = new THREE.Object3D()
    const particleCount = clothSimulationEffectParams.particleCount

    for (let i = 0; i < particleCount; i++) {
      // 更新粒子位置 - 缓慢旋转
      particlePhases[i] += 0.01

      // 粒子围绕丝绸旋转
      const rotSpeed = 0.0005
      const cosRot = Math.cos(rotSpeed)
      const sinRot = Math.sin(rotSpeed)
      const x = particles[i].x
      const z = particles[i].z

      particles[i].x = x * cosRot - z * sinRot
      particles[i].z = x * sinRot + z * cosRot

      // 上下漂浮
      particles[i].y += Math.sin(particlePhases[i]) * 0.0003

      // 更新实例矩阵
      dummy.position.copy(particles[i])
      const brightness = 0.5 + Math.sin(particlePhases[i]) * 0.5
      const scale = brightness * 0.8
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      particleMesh.setMatrixAt(i, dummy.matrix)
    }

    particleMesh.instanceMatrix.needsUpdate = true
  }

  // GSAP 动画
  const initGSAPAnimations = () => {
    // 呼吸动画
    const breatheAnimation = { value: 1 }
    const breatheTween = gsap.to(breatheAnimation, {
      value: 1.3,
      duration: 2.5,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    })
    allTweens.push(breatheTween)
  }

  const playEntranceAnimation = () => {
    // 相机俯冲入场
    const t1 = gsap.from(camera.position, {
      x: -7,
      y: 5,
      z: -7,
      duration: 3,
      ease: 'power3.out'
    })
    allTweens.push(t1)

    // 丝绸材质淡入
    if (clothMesh && clothMesh.material instanceof THREE.Material) {
      const t2 = gsap.fromTo(
        clothMesh.material,
        { opacity: 0 },
        {
          opacity: clothSimulationEffectParams.opacity,
          duration: 2,
          ease: 'power2.out'
        }
      )
      allTweens.push(t2)
    }

    // 星空粒子弹性进场
    if (particleMesh) {
      const t3 = gsap.from(particleMesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2,
        ease: 'elastic.out(1, 0.7)'
      })
      allTweens.push(t3)
    }
  }

  const playCameraAnimation = () => {
    if (!clothSimulationEffectParams.autoRotate || !camera) return

    // 清理之前的运镜动画
    if (cameraTimeline) {
      cameraTimeline.kill()
    }

    // 创建电影级运镜时间线
    cameraTimeline = gsap.timeline({
      repeat: 0, // 只播放一次，不再循环
      repeatDelay: 0.5,
      onComplete: () => {
        console.log('[布料模拟特效] 运镜动画完成 - 自动清除特效')
        cameraTimeline = null
        // 运镜完成后自动清除特效
        clearEffect()
      }
    })

    // 多角度运镜 - 梦幻轨迹
    cameraTimeline.to(
      camera.position,
      {
        x: -2.8,
        y: 0.5,
        z: -2.2,
        duration: 6,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, -0.2, 0)
      },
      0
    )

    cameraTimeline.to(
      camera.position,
      {
        x: -1.2,
        y: -0.1,
        z: -3.5,
        duration: 5,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, -0.2, 0)
      },
      '>'
    )

    cameraTimeline.to(
      camera.position,
      {
        x: -3.2,
        y: -0.6,
        z: -2.8,
        duration: 5,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, -0.2, 0)
      },
      '>'
    )
  }

  const animate = (time: number) => {
    const deltaTime = Math.min(0.016, timeSinceLastStep + 0.001)

    // 更新控制器
    if (controls) controls.update()

    // 物理模拟步进
    timeSinceLastStep += deltaTime
    while (timeSinceLastStep >= TIME_PER_STEP) {
      timestamp += TIME_PER_STEP
      timeSinceLastStep -= TIME_PER_STEP

      if (renderer && computeSpringForces && computeVertexForces) {
        renderer.compute(computeSpringForces)
        renderer.compute(computeVertexForces)
      }
    }

    // 更新装饰粒子
    updateParticles()

    // 渲染（布料网格位置由 GPU TSL 节点自动更新）
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
    console.log('清理 GPU 丝绸波浪特效...')

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
      if (clothMesh) {
        gsap.killTweensOf(clothMesh.scale)
        gsap.killTweensOf(clothMesh.material)
      }
      if (particleMesh) {
        gsap.killTweensOf(particleMesh.scale)
      }

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

      // 从场景中移除网格
      if (scene) {
        if (clothMesh) scene.remove(clothMesh)
        if (particleMesh) scene.remove(particleMesh)
        if (wireframeMesh) scene.remove(wireframeMesh)
      }

      // 清理资源
      if (clothMesh) {
        if (clothMesh.geometry) clothMesh.geometry.dispose()
        if (clothMesh.material instanceof THREE.Material) {
          clothMesh.material.dispose()
        }
      }
      if (particleMesh) {
        if (particleMesh.geometry) particleMesh.geometry.dispose()
        if (particleMesh.material instanceof THREE.Material) {
          particleMesh.material.dispose()
        }
      }
      if (wireframeMesh) {
        if (wireframeMesh.geometry) wireframeMesh.geometry.dispose()
        if (wireframeMesh.material instanceof THREE.Material) {
          wireframeMesh.material.dispose()
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
      scene = null as any
      camera = null as any
      renderer = null as any
      controls = null as any
      clothMesh = null
      particleMesh = null
      wireframeMesh = null

      // 清理 Verlet 系统
      verletVertices.length = 0
      verletSprings.length = 0
      verletVertexColumns.length = 0

      // 清理粒子系统
      particles.length = 0
      particleVelocities.length = 0
      particlePhases.length = 0

      // 清理 GPU 缓冲区
      vertexPositionBuffer = null
      vertexForceBuffer = null
      vertexParamsBuffer = null
      springVertexIdBuffer = null
      springRestLengthBuffer = null
      springForceBuffer = null
      springListBuffer = null

      // 清理 Compute 着色器
      computeSpringForces = null
      computeVertexForces = null

      // 清理 Uniforms
      dampeningUniform = null
      windUniform = null
      stiffnessUniform = null
      rippleUniform = null
      rippleStrengthUniform = null
      windScaleUniform = null
      flowSpeedUniform = null
      auroraUniform = null

      console.log('GPU 丝绸波浪特效清理完成')
    } catch (error) {
      console.error('清理 GPU 丝绸波浪特效时出错:', error)
    }
  }

  // ============================================================
  // 🧹 清除特效（淡出后清理）
  // ============================================================
  const clearEffect = () => {
    console.log('开始淡出 GPU 丝绸波浪特效...')

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

    // 淡出布料
    if (clothMesh && clothMesh.material instanceof THREE.Material) {
      fadeOutTimeline.to(
        clothMesh.material,
        {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out'
        },
        0
      )
    }

    // 淡出粒子缩放
    if (particleMesh) {
      fadeOutTimeline.to(
        particleMesh.scale,
        {
          x: 0.01,
          y: 0.01,
          z: 0.01,
          duration: 0.6,
          ease: 'back.in(1.7)'
        },
        0
      )
    }
  }

  // 停止相机动画
  const stopCameraAnimation = () => {
    if (cameraTimeline) {
      console.log('停止 GPU 丝绸波浪运镜动画')
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
