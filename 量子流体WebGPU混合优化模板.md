# 量子流体 WebGPU 混合优化特效模板

## 适用场景

**大规模粒子模拟特效**（10万-100万+粒子），需要高性能物理计算和渲染：
- ✅ 粒子流体模拟（液态/气态）
- ✅ 群体行为模拟（鱼群/鸟群/粒子群）
- ✅ 爆炸/烟雾/火焰特效
- ✅ 粒子风暴/漩涡效果
- ❌ 小规模装饰性粒子（<1万）

---

## 核心技术架构

```
┌─────────────────────────────────────────────────────┐
│              量子流体 - 混合优化方案                    │
├─────────────────────────────────────────────────────┤
│  物理层 (GPU Compute Shader)                         │
│  ├─ 并行计算 100K+ 粒子物理                           │
│  ├─ 重力/碰撞/边界检测                                │
│  └─ 交互响应（鼠标/力场）                             │
├─────────────────────────────────────────────────────┤
│  渲染层 (GPU 动态着色 + CPU 降频渲染)                 │
│  ├─ GPU: 霓虹渐变色实时计算                           │
│  ├─ CPU: 每 N 帧更新实例矩阵                          │
│  └─ InstancedMesh 批量渲染                           │
├─────────────────────────────────────────────────────┤
│  优化层 (多层降频 + 对象复用)                         │
│  ├─ updateInterval: 2-3 帧更新一次                    │
│  ├─ colorUpdateInterval: 500-1000 粒子更新一次        │
│  ├─ pixelRatio: 0.7-0.8 降低渲染精度                 │
│  └─ dummy/tempColor 对象复用                          │
└─────────────────────────────────────────────────────┘
```

**需要图片**：
- 图片都放在public/images目录下，有星星，蝴蝶，雨，雪，花，叶子，水晶，钻石等图片
- 可以来这里取，也可以自行到网上找

---

## 完整代码模板

### 第1步：导入和参数配置

```typescript
/**
 * [特效名称] - WebGPU 混合优化版
 *
 * 技术栈：
 * - WebGPU Compute Shader（并行物理计算）
 * - GPU 动态着色（TSL）
 * - CPU 降频渲染（每2-3帧更新一次）
 * - InstancedMesh 批量渲染
 *
 * 性能目标：
 * - 500,000 粒子 @ 20-30 FPS
 * - 支持鼠标交互
 * - 电影级运镜
 */

import * as THREE from 'three/webgpu'
import gsap from 'gsap'
import {
  Fn,
  uniform,
  float,
  instanceIndex,
  instancedArray,
  length,
  normalize,
  mix,
  time,
  vec3,
  select
} from 'three/tsl'

// ============================================
// 1. 特效参数配置（可调整）
// ============================================

export const [特效名CamelCase]EffectParams = {
  // 粒子数量（建议：10万-50万）
  particleCount: 500000,
  particleSize: 2.5,

  // 物理参数
  gravity: -9.8,        // 重力加速度
  damping: 0.995,        // 速度衰减
  boundaryRadius: 80.0,  // 边界半径
  restitution: 0.7,     // 碰撞弹性

  // 交互参数
  interactionRadius: 15.0,    // 鼠标交互半径
  interactionStrength: 100.0,  // 鼠标交互强度

  // 渲染参数（性能优化）
  pixelRatio: Math.min(window.devicePixelRatio, 0.8), // 降低像素比
  antialias: false,  // 关闭抗锯齿

  // 性能优化参数（关键！）
  updateInterval: 2,             // 每2帧更新一次实例矩阵
  colorUpdateInterval: 500,       // 每500个粒子更新一次颜色
  useFrustumCulling: false,       // 关闭视锥剔除
  instanceUpdateBatchSize: 50000  // 批量更新大小
}
```

---

### 第2步：主函数骨架

```typescript
// ============================================
// 2. 主特效函数
// ============================================

export const [特效名CamelCase]Effect = async (container: HTMLElement): Promise<(() => void)> => {
  console.log(`[[特效名CamelCase]] 开始初始化...`)

  // ============================================
  // 2.1 核心变量声明
  // ============================================

  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: THREE.WebGPURenderer | null = null
  let animationId: number | null = null
  let allTweens: (gsap.core.Tween | gsap.core.Timeline)[] = []
  let cinematicTimeline: gsap.core.Timeline | null = null

  // 粒子网格
  let [mesh名]: THREE.InstancedMesh | null = null
  let [material名]: THREE.MeshBasicNodeMaterial | null = null

  // 性能监控面板
  let performancePanel: HTMLDivElement | null = null
  let fpsElement: HTMLElement | null = null
  let computeTimeElement: HTMLElement | null = null

  // 交互相关
  let mouseX = 0
  let mouseY = 0
  let mouseWorld = new THREE.Vector3()

  // 性能统计
  let frameCount = 0
  let lastTime = performance.now()
  let fps = 0
  let computeTime = 0

  // 配置（必须从参数对象复制！）
  const config = { ...[特效名CamelCase]EffectParams }

  // ============================================
  // 2.2 性能监控面板
  // ============================================

  function createPerformancePanel() {
    performancePanel = document.createElement('div')
    performancePanel.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #00ff00;
      padding: 15px;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 1000;
      min-width: 220px;
      border: 1px solid #00ff00;
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
    `

    performancePanel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px; color: #00ffff;">[特效显示名] - 混合优化</div>
      <div style="margin-bottom: 5px;">FPS: <span id="perf-fps">0</span></div>
      <div style="margin-bottom: 5px;">计算时间: <span id="perf-compute">0</span> ms</div>
      <div style="margin-bottom: 5px;">粒子数量: ${config.particleCount.toLocaleString()}</div>
      <div style="margin-bottom: 5px;">物理引擎: WebGPU Compute</div>
      <div style="margin-bottom: 5px;">渲染模式: GPU着色 + 降频CPU</div>
      <div style="margin-bottom: 5px;">更新间隔: ${config.updateInterval} 帧</div>
      <div style="margin-bottom: 5px;">颜色间隔: ${config.colorUpdateInterval} 粒子</div>
      <div style="margin-bottom: 5px;">像素比: ${config.pixelRatio.toFixed(1)}</div>
    `

    document.body.appendChild(performancePanel)

    fpsElement = performancePanel.querySelector('#perf-fps')!
    computeTimeElement = performancePanel.querySelector('#perf-compute')!
  }

  function updatePerformancePanel() {
    if (!fpsElement || !computeTimeElement) return
    fpsElement.textContent = fps.toFixed(1)
    computeTimeElement.textContent = computeTime.toFixed(2)
  }

  // ============================================
  // 2.3 初始化函数
  // ============================================

  async function init() {
    console.log(`[[特效名CamelCase]] 初始化 WebGPU 场景...`)

    // 创建场景
    scene = new THREE.Scene()

    // 创建相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 40, 100)
    camera.lookAt(0, 0, 0)

    // 创建渲染器（关键：WebGPU）
    renderer = new THREE.WebGPURenderer({ antialias: config.antialias, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(config.pixelRatio)  // 降低像素比提升性能
    container.appendChild(renderer.domElement)

    // 等待 WebGPU 后端初始化完成
    console.log(`[[特效名CamelCase]] 初始化 WebGPU 后端...`)
    await renderer.init()
    console.log(`[[特效名CamelCase]] WebGPU 后端初始化完成`)

    // ============================================
    // 2.4 创建粒子数据（CPU 端初始化）
    // ============================================

    console.log(`[[特效名CamelCase]] 初始化粒子数据...`)

    const positionArray = new Float32Array(config.particleCount * 3)
    const velocityArray = new Float32Array(config.particleCount * 3)

    // 初始化粒子位置（根据特效需求选择分布方式）
    for (let i = 0; i < config.particleCount; i++) {
      // 方案A：球形分布（推荐）
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = Math.pow(Math.random(), 1/3) * config.boundaryRadius

      positionArray[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positionArray[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positionArray[i * 3 + 2] = radius * Math.cos(phi)

      // 方案B：立方体分布（可选）
      // positionArray[i * 3] = (Math.random() - 0.5) * config.boundaryRadius * 2
      // positionArray[i * 3 + 1] = (Math.random() - 0.5) * config.boundaryRadius * 2
      // positionArray[i * 3 + 2] = (Math.random() - 0.5) * config.boundaryRadius * 2

      // 方案C：平面分布（可选）
      // positionArray[i * 3] = (Math.random() - 0.5) * config.boundaryRadius * 2
      // positionArray[i * 3 + 1] = (Math.random() - 0.5) * config.boundaryRadius * 2
      // positionArray[i * 3 + 2] = 0

      // 随机初速度
      velocityArray[i * 3] = (Math.random() - 0.5) * 10
      velocityArray[i * 3 + 1] = (Math.random() - 0.5) * 10
      velocityArray[i * 3 + 2] = (Math.random() - 0.5) * 10
    }

    // ============================================
    // 2.5 创建 Compute Shader（GPU 物理计算）
    // ============================================

    console.log(`[[特效名CamelCase]] 创建 Compute Shader...`)

    // Uniform 变量（可从 CPU 更新）
    const deltaTime = uniform(0.016)
    const mousePosition = uniform(new THREE.Vector3())
    const gravity = uniform(config.gravity)
    const damping = uniform(config.damping)
    const boundary = uniform(config.boundaryRadius)
    const restitution = uniform(config.restitution)
    const interactionRadius = uniform(config.interactionRadius)
    const interactionStrength = uniform(config.interactionStrength)

    // Storage Buffer（GPU 端存储）
    const positions = instancedArray(positionArray, 'vec3').setName('positionStorage')
    const velocities = instancedArray(velocityArray, 'vec3').setName('velocityStorage')

    // Compute Shader 函数：更新粒子物理
    const updatePhysics = Fn(() => {
      const idx = instanceIndex.toConst()

      // 获取当前位置和速度
      const pos = positions.element(idx).toVar()
      const vel = velocities.element(idx).toVar()

      // === 物理计算（根据特效需求修改） ===

      // 1. 重力
      vel.y.addAssign(gravity.mul(deltaTime))

      // 2. 鼠标交互（吸引/排斥）
      const toMouse = mousePosition.sub(pos)
      const distToMouse = length(toMouse)
      const force = interactionStrength.mul(float(1.0).sub(distToMouse.div(interactionRadius)).max(float(0)))
      const forceVec = normalize(toMouse).mul(force).mul(deltaTime)
      vel.addAssign(forceVec)

      // 3. 更新位置
      pos.addAssign(vel.mul(deltaTime))

      // 4. 边界检测（简化版：使用 clamp）
      pos.x.assign(pos.x.max(boundary.negate()).min(boundary))
      pos.y.assign(pos.y.max(boundary.negate()).min(boundary))
      pos.z.assign(pos.z.max(boundary.negate()).min(boundary))

      // 5. 边界反弹
      const xOverflow = pos.x.abs().greaterThan(boundary)
      const yOverflow = pos.y.abs().greaterThan(boundary)
      const zOverflow = pos.z.abs().greaterThan(boundary)

      vel.x.assign(xOverflow.select(vel.x.mul(restitution.negate()), vel.x))
      vel.y.assign(yOverflow.select(vel.y.mul(restitution.negate()), vel.y))
      vel.z.assign(zOverflow.select(vel.z.mul(restitution.negate()), vel.z))

      // 6. 应用阻尼
      vel.mulAssign(damping)

      // === 自定义物理效果（可选） ===
      // 示例：漩涡效果
      // const center = vec3(0, 0, 0)
      // const toCenter = center.sub(pos)
      // const distToCenter = length(toCenter)
      // const tangent = vec3(-toCenter.z, 0, toCenter.x).normalize()
      // vel.addAssign(tangent.mul(float(5.0).mul(deltaTime)))
    })

    // 创建 Compute Pipeline
    const computePipeline = updatePhysics().compute(config.particleCount).setName('physicsUpdate')

    // ============================================
    // 2.6 创建 GPU 渲染网格
    // ============================================

    console.log(`[[特效名CamelCase]] 创建 GPU 渲染网格...`)

    // 选择几何体（根据视觉效果选择）
    // 方案A：四面体（最轻量，推荐用于大量粒子）
    const geometry = new THREE.TetrahedronGeometry(config.particleSize * 0.1, 0)

    // 方案B：球体（视觉效果更好，性能稍差）
    // const geometry = new THREE.SphereGeometry(config.particleSize * 0.05, 8, 6)

    // 方案C：平面（用于卡片/纸片效果）
    // const geometry = new THREE.PlaneGeometry(config.particleSize * 0.2, config.particleSize * 0.2)

    // === GPU 动态着色材质 ===
    // 定义霓虹配色（GPU 端）
    const neonColor0 = uniform(new THREE.Vector3(1.0, 0.0, 0.4)) // 霓虹粉
    const neonColor1 = uniform(new THREE.Vector3(0.0, 0.94, 1.0)) // 电光蓝
    const neonColor2 = uniform(new THREE.Vector3(0.0, 1.0, 0.4)) // 激光绿
    const neonColor3 = uniform(new THREE.Vector3(0.6, 0.0, 1.0)) // 紫罗兰
    const neonColor4 = uniform(new THREE.Vector3(1.0, 0.6, 0.0)) // 金橙

    // CPU 端霓虹配色（用于初始化）
    const neonColors = [
      new THREE.Color(0xff0066), // 霓虹粉
      new THREE.Color(0x00f0ff), // 电光蓝
      new THREE.Color(0x00ff66), // 激光绿
      new THREE.Color(0x9900ff), // 紫罗兰
      new THREE.Color(0xff9900)  // 金橙
    ]

    // 创建 GPU 渲染材质（完全在 GPU 上计算动态颜色）
    [material名] = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      opacity: 0.85,
      side: THREE.FrontSide, // 只渲染正面，减少渲染负担
      fragmentNode: Fn(() => {
        const idx = instanceIndex.toVar()

        // 基于索引和时间的动态颜色（完全在 GPU 上计算）
        const colorIndex = float(idx).div(config.particleCount).mul(float(5)).floor()
        const baseHue = colorIndex.mul(float(0.2)).add(time.mul(float(0.05)))
        const hue = baseHue.mod(float(1.0))

        // 将色相映射到 5 个霓虹色区间
        const segment = hue.mul(float(5))
        const segmentIndex = segment.floor().clamp(float(0), float(4))
        const segmentT = segment.sub(segmentIndex)

        // 根据段索引选择颜色对进行混合
        const color0 = segmentIndex.equal(float(0)).select(neonColor0,
                       segmentIndex.equal(float(1)).select(neonColor1,
                       segmentIndex.equal(float(2)).select(neonColor2,
                       segmentIndex.equal(float(3)).select(neonColor3, neonColor4))))

        const color1 = segmentIndex.equal(float(0)).select(neonColor1,
                       segmentIndex.equal(float(1)).select(neonColor2,
                       segmentIndex.equal(float(2)).select(neonColor3,
                       segmentIndex.equal(float(3)).select(neonColor4, neonColor0))))

        // 在颜色对之间进行平滑过渡
        const color = mix(color0, color1, segmentT)

        return color
      })()
    })

    // 创建 InstancedMesh（批量渲染）
    [mesh名] = new THREE.InstancedMesh(geometry, [material名] as THREE.Material, config.particleCount)
    [mesh名].instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    [mesh名].frustumCulled = false // 关闭视锥剔除，对于大量粒子反而更快

    // 设置初始实例矩阵
    const dummyInit = new THREE.Object3D()
    for (let i = 0; i < config.particleCount; i++) {
      dummyInit.position.set(positionArray[i * 3], positionArray[i * 3 + 1], positionArray[i * 3 + 2])
      dummyInit.updateMatrix()
      [mesh名].setMatrixAt(i, dummyInit.matrix)
      [mesh名].setColorAt(i, neonColors[Math.floor((i / config.particleCount) * 5)])
    }

    scene!.add([mesh名])

    // ============================================
    // 2.7 CPU 端更新实例矩阵（降频优化）
    // ============================================

    // 复用对象避免重复创建（性能优化关键！）
    const dummy = new THREE.Object3D()
    const tempColor = new THREE.Color()

    // CPU 端缓存（用于更新实例矩阵）
    const positionCache = new Float32Array(positionArray)

    // 降频更新：每 N 帧读取 GPU 结果并更新实例矩阵
    let updateFrameCounter = 0

    const updateInstances = () => {
      // 读取 GPU 计算的粒子位置
      for (let i = 0; i < config.particleCount * 3; i++) {
        positionCache[i] = positionArray[i]
      }

      // 更新实例矩阵
      for (let i = 0; i < config.particleCount; i++) {
        const idx = i * 3
        const x = positionCache[idx]
        const y = positionCache[idx + 1]
        const z = positionCache[idx + 2]

        // 使用复用的 dummy 对象
        dummy.position.set(x, y, z)
        dummy.updateMatrix()
        [mesh名]!.setMatrixAt(i, dummy.matrix)

        // 颜色更新优化：每 N 个粒子更新一次颜色（大幅减少颜色计算）
        if (i % config.colorUpdateInterval === 0) {
          const colorIndex = Math.floor((i / config.particleCount) * 5)
          const hue = (performance.now() * 0.001 * 0.05 + colorIndex * 0.2) % 1.0
          tempColor.setHSL(hue, 1.0, 0.6)
          [mesh名]!.setColorAt(i, tempColor)
        } else {
          // 使用之前的颜色
          const colorIndex = Math.floor((i / config.particleCount) * 5)
          [mesh名]!.setColorAt(i, neonColors[colorIndex])
        }
      }

      [mesh名]!.instanceMatrix.needsUpdate = true
      if ([mesh名]!.instanceColor) {
        [mesh名]!.instanceColor.needsUpdate = true
      }
    }

    // ============================================
    // 2.8 GSAP 电影级运镜（可选）
    // ============================================

    // 使用外部变量，以便在 cleanup 中可以访问
    cinematicTimeline = gsap.timeline({
      repeatDelay: 0.3,
      repeat: 0, // 不重复（设为 -1 则无限循环）
      onComplete: () => {
        console.log(`[[特效名CamelCase]] 运镜动画完成，开始清理特效`)
        clearEffect()
      }
    })

    // 镜头 1: 俯视
    cinematicTimeline.to(camera.position, {
      x: 0, y: 120, z: 50,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 2: 侧面
    cinematicTimeline.to(camera.position, {
      x: 100, y: 40, z: 0,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 3: 底部仰视
    cinematicTimeline.to(camera.position, {
      x: 0, y: -80, z: 80,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 4: 近景
    cinematicTimeline.to(camera.position, {
      x: 50, y: 20, z: 50,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 5: 旋转环绕
    cinematicTimeline.to(camera.position, {
      x: -70, y: 30, z: 70,
      duration: 3,
      ease: 'power2.inOut'
    })

    // 镜头 6: 远景（回到初始位置）
    cinematicTimeline.to(camera.position, {
      x: 0, y: 40, z: 100,
      duration: 3,
      ease: 'power2.inOut'
    })

    allTweens.push(cinematicTimeline)

    // ============================================
    // 2.9 创建性能监控面板
    // ============================================

    createPerformancePanel()

    // ============================================
    // 2.10 事件监听
    // ============================================

    container!.addEventListener('mousemove', onMouseMove)
    window.addEventListener('resize', onWindowResize)

    // ============================================
    // 2.11 动画循环
    // ============================================

    console.log(`[[特效名CamelCase]] 开始动画循环...`)

    function animate() {
      animationId = requestAnimationFrame(animate)

      frameCount++

      // 计算 FPS
      const currentTime = performance.now()
      if (currentTime - lastTime >= 1000) {
        fps = frameCount * 1000 / (currentTime - lastTime)
        frameCount = 0
        lastTime = currentTime
      }

      // 更新鼠标位置（世界坐标）
      mouseWorld.set(mouseX * config.boundaryRadius, mouseY * config.boundaryRadius, 0)
      mousePosition.value.copy(mouseWorld)

      // 执行 GPU 计算（物理模拟）
      const computeStart = performance.now()
      renderer!.compute(computePipeline)
      const computeEnd = performance.now()
      computeTime = computeEnd - computeStart

      // 降频更新实例矩阵（关键优化！）
      updateFrameCounter++
      if (updateFrameCounter % config.updateInterval === 0) {
        updateInstances()
      }

      // 更新性能面板（降低频率减少DOM操作）
      if (frameCount % 30 === 0) {
        updatePerformancePanel()
      }

      // 渲染
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    }

    animate()

    // ============================================
    // 2.12 清理特效函数（运镜完成后自动调用）
    // ============================================

    function clearEffect() {
      console.log(`[[特效名CamelCase]] 开始清理特效...`)

      // 1. 淡出所有元素（平滑退出）
      if ([material名]) {
        gsap.to([material名], {
          opacity: 0,
          duration: 1,
          ease: 'power2.out',
          onComplete: () => {
            // 淡出完成后执行清理
            performCleanup()
          }
        })
      } else {
        // 如果没有材质，直接清理
        performCleanup()
      }
    }

    function performCleanup() {
      console.log(`[[特效名CamelCase]] 执行清理流程...`)

      // 停止运镜动画
      if (cinematicTimeline) {
        cinematicTimeline.kill()
        cinematicTimeline = null
      }

      // 调用完整清理函数
      cleanup()
    }

      // 计算 FPS
      const currentTime = performance.now()
      if (currentTime - lastTime >= 1000) {
        fps = frameCount * 1000 / (currentTime - lastTime)
        frameCount = 0
        lastTime = currentTime
      }

      // 更新鼠标位置（世界坐标）
      mouseWorld.set(mouseX * config.boundaryRadius, mouseY * config.boundaryRadius, 0)
      mousePosition.value.copy(mouseWorld)

      // 执行 GPU 计算（物理模拟）
      const computeStart = performance.now()
      renderer!.compute(computePipeline)
      const computeEnd = performance.now()
      computeTime = computeEnd - computeStart

      // 降频更新实例矩阵（关键优化！）
      updateFrameCounter++
      if (updateFrameCounter % config.updateInterval === 0) {
        updateInstances()
      }

      // 更新性能面板（降低频率减少DOM操作）
      if (frameCount % 30 === 0) {
        updatePerformancePanel()
      }

      // 渲染
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    }

    animate()

    // 立即初始化粒子位置和颜色
    updateInstances()

    // GSAP 入场动画
    const entranceTimeline = gsap.timeline()

    // 相机推近
    entranceTimeline.fromTo(
      camera!.position,
      { z: 200 },
      { z: 100, duration: 2, ease: 'power2.out' }
    )

    // 粒子扩散（通过缩放模拟）
    entranceTimeline.fromTo(
      [mesh名]!.scale,
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1, duration: 1.5, ease: 'back.out(1.7)' }
    )

    allTweens.push(entranceTimeline)

    console.log(`[[特效名CamelCase]] 初始化完成`)
  }

  // ============================================
  // 2.12 事件处理函数
  // ============================================

  function onMouseMove(event: MouseEvent) {
    const rect = container.getBoundingClientRect()
    mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  function onWindowResize() {
    if (!camera || !renderer) return
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  // ============================================
  // 2.13 清理函数（11步完整流程）
  // ============================================

  function cleanup(): void {
    console.log(`[[特效名CamelCase]] 开始清理资源...`)

    // 1. 停止动画
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    // 2. 杀死所有 GSAP 动画
    allTweens.forEach(tween => tween.kill())
    allTweens = []

    // 3. 杀死运镜动画
    if (cinematicTimeline) {
      cinematicTimeline.kill()
      cinematicTimeline = null
    }

    // 4. 杀死所有与元素相关的动画
    if ([mesh名]) {
      gsap.killTweensOf([mesh名])
      gsap.killTweensOf([mesh名].scale)
    }
    if (camera) {
      gsap.killTweensOf(camera.position)
      gsap.killTweensOf(camera.rotation)
    }

    // 5. 移除事件监听
    container.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('resize', onWindowResize)

    // 6. 从场景中移除
    if ([mesh名] && scene) {
      scene.remove([mesh名])
    }

    // 7. 释放几何体
    if ([mesh名] && [mesh名].geometry) {
      [mesh名].geometry.dispose()
    }

    // 8. 释放材质
    if ([mesh名] && [mesh名].material) {
      ([mesh名].material as THREE.Material).dispose()
    }

    // 9. 释放渲染器
    if (renderer) {
      renderer.dispose()
    }

    // 10. 从 DOM 中移除画布
    if (container && renderer && renderer.domElement) {
      container.removeChild(renderer.domElement)
    }

    // 11. 移除性能面板
    if (performancePanel && performancePanel.parentNode) {
      performancePanel.parentNode.removeChild(performancePanel)
      performancePanel = null
    }

    // 12. 所有变量置为 null
    scene = null
    camera = null
    renderer = null
    [mesh名] = null
    [material名] = null
    fpsElement = null
    computeTimeElement = null
    cinematicTimeline = null

    console.log(`[[特效名CamelCase]] 清理完成`)
  }

  // ============================================
  // 2.14 开始初始化
  // ============================================

  try {
    await init()
  } catch (error) {
    console.error(`[[特效名CamelCase]] 初始化失败:`, error)
    cleanup()
    throw error
  }

  return cleanup
}
```

---

## 集成到项目（3步）

### 第1步：在 `src/effect/index.ts` 中注册

```typescript
import { [特效名CamelCase]Effect } from './[特效名-kebab-case]-effect'

// 添加到导出
export const allEffects = [
  // ... 其他特效
  {
    id: '[特效名-kebab-case]',
    name: '[特效显示名]',
    description: 'WebGPU 混合优化版，支持50万+粒子并行计算',
    effect: [特效名CamelCase]Effect,
    params: [特效名CamelCase]EffectParams
  }
]
```

### 第2步：在 `src/components/EffectSwitcher.vue` 中添加选项

```vue
<template>
  <select v-model="currentEffect" @change="switchEffect">
    <!-- ... 其他选项 -->
    <option value="[特效名-kebab-case]">[特效显示名]</option>
  </select>
</template>
```

### 第3步：在 `src/views/Home/index.vue` 中处理切换

```typescript
// 在 switchEffect 函数中添加
case '[特效名-kebab-case]':
  currentEffectFn = [特效名CamelCase]Effect
  break
```

---

## 开发检查清单

完成特效开发后，确保以下18项检查点全部通过：

### 基础检查（必检项）

- [ ] 1. 使用 `import * as THREE from 'three/webgpu'` 而不是 `'three'`
- [ ] 2. 函数签名符合规范：`export const [特效名]Effect = (container: HTMLElement): Promise<(() => void)>`
- [ ] 3. 目录命名使用 kebab-case：`src/effect/[特效名]-effect/index.ts`
- [ ] 4. 所有 GSAP tween 都收集到 `allTweens` 数组
- [ ] 5. cleanup 函数包含完整的11步清理流程

### 性能优化检查（必检项）

- [ ] 6. 使用 `InstancedMesh` 批量渲染（不是单个Mesh）
- [ ] 7. 复用 `dummy` 和 `tempColor` 对象（避免 GC）
- [ ] 8. 设置 `config.pixelRatio: Math.min(window.devicePixelRatio, 0.8)`
- [ ] 9. 设置 `config.updateInterval: 2-3`（降频更新）
- [ ] 10. 设置 `config.colorUpdateInterval: 500-1000`（降频颜色计算）
- [ ] 11. 创建 GPU 动态着色材质（`MeshBasicNodeMaterial` + `fragmentNode`）
- [ ] 12. 使用 Compute Shader 并行计算物理
- [ ] 13. 等待 `await renderer.init()` 后再创建对象

### 功能检查（必检项）

- [ ] 14. 鼠标交互功能正常（鼠标移动影响粒子）
- [ ] 15. 性能监控面板显示正确（FPS/粒子数/配置参数）
- [ ] 16. GSAP 入场动画流畅（相机推近 + 粒子扩散）
- [ ] 17. GSAP 电影级运镜正常（至少6个角度切换）
- [ ] 18. cleanup 清理干净（无内存泄漏）

---

## 性能调优指南

### 根据实际性能调整参数

| 粒子数 | updateInterval | colorUpdateInterval | pixelRatio | 预期FPS |
|-------|---------------|-------------------|-----------|---------|
| 100K  | 2             | 500               | 0.8       | 50-60   |
| 200K  | 2             | 500               | 0.8       | 35-45   |
| 500K  | 3             | 1000              | 0.7       | 20-30   |
| 1M    | 3             | 1000              | 0.7       | 10-15   |

### 如果 FPS 仍然过低

1. **降低粒子数量**：500K → 200K
2. **增加降频间隔**：updateInterval: 3 → 4
3. **降低像素比**：pixelRatio: 0.8 → 0.6
4. **简化几何体**：Sphere → Tetrahedron
5. **关闭颜色计算**：移除 GPU 动态着色，使用静态颜色

---

## 常见问题

### Q1: Compute Shader 编译失败
**A:** 检查 TSL 语法，确保所有变量都在 `Fn()` 内声明，使用 `toVar()` 和 `toConst()`。

### Q2: 粒子颜色单一
**A:** 检查 GPU 动态着色的 `fragmentNode` 逻辑，确保 `time` 参数正确传递。

### Q3: FPS 低于预期
**A:** 检查是否使用了降频优化（`updateInterval`、`colorUpdateInterval`），以及是否复用了 `dummy` 对象。

### Q4: 内存泄漏
**A:** 检查 cleanup 函数是否执行了完整的11步清理流程。

---

## 进阶优化方向

1. **纯 GPU 渲染**：手写 WGSL shader，完全绕过 CPU 更新（需要2-3天工作量）
2. **多级 LOD**：根据距离使用不同精度的几何体
3. **空间分区**：使用 Octree 或 BVH 加速碰撞检测
4. **多线程渲染**：使用 Web Workers 分离物理计算和渲染

---

## 示例特效列表

基于此模板已创建的特效：
- ✅ `quantum-fluid-taichi-effect` - 量子流体 WebGPU 混合优化版（500K粒子）
- ✅ [你的特效名1] - [特效描述1]
- ✅ [你的特效名2] - [特效描述2]

---




**特效制作**：
- 特效不仅仅只能是粒子，也可以运用立方体，圆柱体，球体等几何体
- 颜色渐变或者半透明过度
- 运镜效果电影的震撼效果，流畅。
- 可以运用物理引擎，实现粒子碰撞，粒子碰撞效果等。
- 可以运用粒子系统，实现粒子系统效果。
- 可以用几个图形经过动画组成好看的特效，或者拆分成好看的特效。
- 运镜动画结束，清除所有的特效和动画。

深入分析这个（src/views/Home/源码/home/components/animation/animations/holographic-nexus-rift.js）特效，
提取出其中的特效原理，实现一个全新的特效，因为不是webgpu开发的，所以需要自己实现。

发挥创意，制作一个全新的特效，要比这个还要好看的特效！特别是配色和运镜。







**模板版本：** v1.0
**最后更新：** 2025-03-27
**适用项目：** three-gpu-effect20260319
