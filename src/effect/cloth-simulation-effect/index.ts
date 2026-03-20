// GPU 布料模拟特效 (GPU Cloth Simulation Effect)
// 特性: 使用 Verlet 积分系统和 GPU Compute 着色器实现真实布料物理模拟
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
  vec3
} from 'three/tsl'
import gsap from 'gsap'

// 性能优化常量
const TIME_SCALE_FACTOR = 0.001

// 配置参数
export const clothSimulationEffectParams = {
  clothWidth: 2, // 布料宽度
  clothHeight: 2, // 布料高度
  clothSegmentsX: 40, // 水平分段数
  clothSegmentsY: 40, // 垂直分段数
  sphereRadius: 0.25, // 碰撞球半径
  stiffness: 0.3, // 刚度
  dampening: 0.99, // 阻尼
  windStrength: 1.5, // 风力强度
  gravity: 0.00008, // 重力
  sphereEnabled: true, // 碰撞球启用
  wireframe: false, // 线框模式
  clothColor: 0x4080ff, // 布料颜色
  sheen: 0.8, // 光泽
  opacity: 0.9, // 透明度
  autoRotate: true // 自动旋转
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
  let sphere: THREE.Mesh | null
  let wireframeMesh: THREE.Line | null

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
  let spherePositionUniform: any
  let sphereUniform: any
  let windUniform: any
  let stiffnessUniform: any

  // 时间控制
  let timeSinceLastStep = 0
  let timestamp = 0
  const STEPS_PER_SECOND = 360
  const TIME_PER_STEP = 1 / STEPS_PER_SECOND

  // GSAP 动画
  let cameraTimeline: gsap.core.Timeline | null = null
  const allTweens: gsap.core.Tween[] = []

  const {
    clothWidth,
    clothHeight,
    clothSegmentsX,
    clothSegmentsY,
    sphereRadius
  } = clothSimulationEffectParams

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
      camera.position.set(-2.5, -0.1, -2.5)

      scene = new THREE.Scene()
      scene.background = null  // 使用透明背景，避免覆盖整个页面

      // 添加环境光和方向光
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
      scene.add(ambientLight)

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
      directionalLight.position.set(1, 1, 1)
      scene.add(directionalLight)

      // 设置 Verlet 系统
      setupVerletGeometry()
      setupVerletVertexBuffers()
      setupVerletSpringBuffers()
      setupUniforms()
      setupComputeShaders()
      setupSphere()
      setupClothMesh()
      setupWireframe()

      renderer.setAnimationLoop(animate)

      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.minDistance = 1
      controls.maxDistance = 5
      controls.target.set(0, -0.1, 0)
      controls.update()

      // GSAP 动画
      initGSAPAnimations()
      playEntranceAnimation()
      console.log('[GPU 布料模拟特效]初始化完成')
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

    // 创建布料顶点
    for (let x = 0; x <= clothSegmentsX; x++) {
      const column: VerletVertex[] = []
      for (let y = 0; y <= clothSegmentsY; y++) {
        const posX = x * (clothWidth / clothSegmentsX) - clothWidth * 0.5
        const posZ = y * (clothHeight / clothSegmentsY)
        // 固定顶部顶点
        const isFixed = y === 0 && x % 4 === 0
        const vertex = addVerletVertex(posX, clothHeight * 0.5, posZ, isFixed)
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
    spherePositionUniform = uniform(new THREE.Vector3(0, 0, 0))
    sphereUniform = uniform(clothSimulationEffectParams.sphereEnabled ? 1.0 : 0.0)
    windUniform = uniform(clothSimulationEffectParams.windStrength)
    stiffnessUniform = uniform(clothSimulationEffectParams.stiffness)
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
    })().compute(springCount).setName('Spring Forces')

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

      // 风力（使用三重噪声）
      const noise = triNoise3D(position, 1, time).sub(0.2).mul(0.00015)
      const windForce = noise.mul(windUniform)
      force.z.subAssign(windForce)

      // 球体碰撞
      const deltaSphere = position.add(force).sub(spherePositionUniform)
      const dist = deltaSphere.length()
      const sphereForce = float(sphereRadius)
        .sub(dist)
        .max(0)
        .mul(deltaSphere)
        .div(dist)
        .mul(sphereUniform)
      force.addAssign(sphereForce)

      vertexForceBuffer.element(instanceIndex).assign(force)
      vertexPositionBuffer.element(instanceIndex).addAssign(force)
    })().compute(vertexCount).setName('Vertex Forces')
  }

  // 设置碰撞球
  const setupSphere = () => {
    const geometry = new THREE.IcosahedronGeometry(sphereRadius * 0.95, 4)
    const material = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      metalness: 0.8,
      roughness: 0.2
    })
    sphere = new THREE.Mesh(geometry, material)
    sphere.visible = clothSimulationEffectParams.sphereEnabled
    scene.add(sphere)
  }

  // 设置布料网格
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
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3, false))
    geometry.setAttribute('vertexIds', verletVertexIdBufferAttr)
    geometry.setIndex(indices)

    // 使用 MeshPhysicalNodeMaterial 支持 TSL 节点
    const clothMaterial = new THREE.MeshPhysicalNodeMaterial({
      color: new THREE.Color().setHex(clothSimulationEffectParams.clothColor),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: clothSimulationEffectParams.opacity,
      sheen: clothSimulationEffectParams.sheen,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0xffffff),
      metalness: 0.3,
      roughness: 0.6
    })

    // 使用 TSL 节点更新位置和计算法线
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
      color: 0x00ff88,
      transparent: true,
      opacity: 0.5
    })

    wireframeMesh = new THREE.Line(geometry, material)
    wireframeMesh.visible = clothSimulationEffectParams.wireframe
    wireframeMesh.frustumCulled = false
    scene.add(wireframeMesh)
  }

  // 更新球体位置
  const updateSphere = () => {
    if (!sphere || !spherePositionUniform) return

    sphere.position.set(
      Math.sin(timestamp * 2.5) * 0.15,
      0,
      Math.sin(timestamp * 1.2) * 0.1
    )
    spherePositionUniform.value.copy(sphere.position)
  }

  // GSAP 动画
  const initGSAPAnimations = () => {
    if (clothSimulationEffectParams.autoRotate) {
      cameraTimeline = gsap.timeline({
        repeat: -1,
        repeatDelay: 1,
        duration: 12
      })

      cameraTimeline.to(camera.position, {
        x: -2.0,
        y: 0.5,
        z: -2.0,
        duration: 6,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, -0.1, 0)
      }, 0)

      cameraTimeline.to(camera.position, {
        x: -2.5,
        y: -0.5,
        z: -2.5,
        duration: 6,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, -0.1, 0)
      }, 6)
    }
  }

  const playEntranceAnimation = () => {
    const t1 = gsap.from(camera.position, {
      x: -5,
      y: 3,
      z: -5,
      duration: 3,
      ease: 'power3.out'
    })
    allTweens.push(t1)

    if (sphere) {
      const t2 = gsap.from(sphere.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2,
        ease: 'elastic.out(1, 0.5)'
      })
      allTweens.push(t2)
    }
  }

  const animate = (time: number) => {
    const deltaTime = Math.min(0.016, timeSinceLastStep + 0.001)

    // 更新控制器
    if (controls) controls.update()

    // 更新球体和 uniforms
    updateSphere()

    // 物理模拟步进
    timeSinceLastStep += deltaTime
    while (timeSinceLastStep >= TIME_PER_STEP) {
      timestamp += TIME_PER_STEP
      timeSinceLastStep -= TIME_PER_STEP
      updateSphere()

      if (renderer && computeSpringForces && computeVertexForces) {
        renderer.compute(computeSpringForces)
        renderer.compute(computeVertexForces)
      }
    }

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

  // 清理函数
  const cleanup = () => {
    try {
      allTweens.forEach(t => {
        if (t?.kill) t.kill()
      })
      allTweens.length = 0

      if (camera) {
        gsap.killTweensOf(camera.position)
        gsap.killTweensOf(camera.rotation)
      }
      if (sphere) {
        gsap.killTweensOf(sphere.scale)
      }
      if (cameraTimeline) {
        cameraTimeline.kill()
        cameraTimeline = null
      }
      if (renderer) {
        renderer.setAnimationLoop(null)
      }
      window.removeEventListener('resize', handleResize)

      if (scene) {
        if (clothMesh) scene.remove(clothMesh)
        if (sphere) scene.remove(sphere)
        if (wireframeMesh) scene.remove(wireframeMesh)
      }
      if (clothMesh) {
        if (clothMesh.geometry) clothMesh.geometry.dispose()
        if (clothMesh.material instanceof THREE.Material) {
          clothMesh.material.dispose()
        }
      }
      if (sphere) {
        if (sphere.geometry) sphere.geometry.dispose()
        if (sphere.material instanceof THREE.Material) {
          sphere.material.dispose()
        }
      }
      if (wireframeMesh) {
        if (wireframeMesh.geometry) wireframeMesh.geometry.dispose()
        if (wireframeMesh.material instanceof THREE.Material) {
          wireframeMesh.material.dispose()
        }
      }
      if (renderer?.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      if (renderer) {
        renderer.dispose()
      }

      // 清理 Verlet 系统
      verletVertices.length = 0
      verletSprings.length = 0
      verletVertexColumns.length = 0

      scene = null
      camera = null
      renderer = null
      controls = null
      clothMesh = null
      sphere = null
      wireframeMesh = null

      vertexPositionBuffer = null
      vertexForceBuffer = null
      vertexParamsBuffer = null
      springVertexIdBuffer = null
      springRestLengthBuffer = null
      springForceBuffer = null
      springListBuffer = null

      computeSpringForces = null
      computeVertexForces = null

      dampeningUniform = null
      spherePositionUniform = null
      sphereUniform = null
      windUniform = null
      stiffnessUniform = null

      console.log('[GPU 布料模拟特效]清理完成')
    } catch (error) {
      console.error('清理[GPU 布料模拟特效]时出错:', error)
    }
  }

  return cleanup
}
