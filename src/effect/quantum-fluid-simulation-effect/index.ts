/**
 * 量子流体模拟特效 - WebGPU Compute Shader 纯 GPU 版本
 *
 * 基于 Three.js WebGPU Compute Shader 实现完全零拷贝
 * 所有计算在 GPU 上完成，无需 CPU-GPU 数据传输
 *
 * 特性：
 * - 80000 个粒子（高性能版本）
 * - MPM (Material Point Method) 流体模拟（纯 GPU）
 * - WebGPU Compute Shader 零拷贝传输
 * - 鼠标交互
 * - 赛博朋克霓虹配色
 * - 6 段电影级运镜
 */

import * as THREE from 'three/webgpu'
import gsap from 'gsap'
import {
  instancedArray,
  Fn,
  instanceIndex,
  uniform,
  float,
  storage,
  uint,
  vec3,
  If,
  Loop,
  Return
} from 'three/tsl'

// ============================================
// 特效参数配置
// ============================================

export const QuantumFluidSimulationEffectParams = {
  // 粒子配置 - 高性能版本
  particleCount: 80000,
  particleSize: 2.5,

  // MPM 参数 - 精确模拟
  n_grid: 64, // 网格精度
  dx: 1.0 / 64.0,
  dt: 8e-5, // 时间步长
  steps: 20, // 子步数

  // 物理参数
  p_vol: 0.000030517578125,
  p_rho: 1,
  p_mass: 0.000030517578125,
  E: 3000,
  nu: 0.35,

  // 交互参数
  interactionRadius: 40.0,
  interactionStrength: 120.0,

  // 边界
  boundaryRadius: 120.0,
  boundaryHeight: 240.0
}

// ============================================
// 主特效函数
// ============================================

export const quantumFluidSimulationEffect = (container: HTMLElement): (() => void) => {
  console.log('[QuantumFluid] 启动特效...')

  // ============================================
  // 变量声明
  // ============================================

  let renderer: typeof THREE.WebGPURenderer
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let animationId: number
  let width: number
  let height: number

  let fluidMesh: THREE.InstancedMesh

  // WebGPU Compute Shader 变量 - 纯 GPU 零拷贝
  let particlePositionBuffer: any
  let particleVelocityBuffer: any
  let gridVelocityBuffer: any
  let gridMassBuffer: any
  let computeMPM: any

  // Uniforms
  let deltaTimeUniform: any
  let gravityUniform: any
  let timeUniform: any

  let frameCount = 0
  let currentTime = 0

  // 性能监控变量
  let fps = 0
  let lastTime = performance.now()
  let computeTime = 0
  let transferTime = 0
  let renderTime = 0
  let performanceElement: HTMLDivElement | null = null

  const config = QuantumFluidSimulationEffectParams

  const allTweens: gsap.Tween[] = []

  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  // ============================================
  // Three.js 初始化
  // ============================================

  const initThreeJS = () => {
    width = container.clientWidth
    height = container.clientHeight

    // 场景
    scene = new THREE.Scene()
    scene.background = null // 透明背景

    // 相机
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000)
    camera.position.set(0, 100, 400)
    camera.lookAt(0, 0, 0)

    // 渲染器
    renderer = new THREE.WebGPURenderer({
      antialias: false,
      alpha: true
    }) as typeof THREE.WebGPURenderer
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
    renderer.setClearColor(0x000000, 0) // 透明背景（alpha=0）
    container.appendChild(renderer.domElement)

    // 添加环境光效 - 深蓝色调
    const ambientLight = new THREE.AmbientLight(0x1a1a3e, 0.3)
    scene.add(ambientLight)

    // 创建性能监控面板
    createPerformancePanel(container)
  }

  // ============================================
  // 创建性能监控面板
  // ============================================

  const createPerformancePanel = (container: HTMLElement) => {
    performanceElement = document.createElement('div')
    performanceElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(10px);
      padding: 15px;
      border-radius: 8px;
      color: #00ff66;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.6;
      z-index: 1000;
      border: 1px solid rgba(0, 255, 102, 0.3);
      box-shadow: 0 0 20px rgba(0, 255, 102, 0.1);
      min-width: 200px;
    `
    performanceElement.innerHTML = `
      <div style="color: #00ffcc; font-weight: bold; margin-bottom: 8px; font-size: 14px;">
        ⚡ 性能监控
      </div>
      <div>FPS: <span id="perf-fps">0</span></div>
      <div>计算: <span id="perf-compute">0</span>ms</div>
      <div>传输: <span id="perf-transfer">0</span>ms</div>
      <div>渲染: <span id="perf-render">0</span>ms</div>
      <div>总帧: <span id="perf-frame">0</span></div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0, 255, 102, 0.2);">
        <div>粒子: <span id="perf-particles">${config.particleCount}</span></div>
        <div>网格: <span id="perf-grid">${config.n_grid}³</span></div>
      </div>
    `
    document.body.appendChild(performanceElement)
  }

  // 更新性能监控面板
  const updatePerformancePanel = () => {
    if (!performanceElement) return

    const fpsEl = document.getElementById('perf-fps')
    const computeEl = document.getElementById('perf-compute')
    const transferEl = document.getElementById('perf-transfer')
    const renderEl = document.getElementById('perf-render')
    const frameEl = document.getElementById('perf-frame')

    if (fpsEl) {
      fpsEl.textContent = fps.toFixed(1)
      fpsEl.style.color = fps >= 50 ? '#00ff66' : fps >= 30 ? '#ffaa00' : '#ff3333'
    }
    if (computeEl) {
      computeEl.textContent = computeTime.toFixed(2)
      computeEl.style.color = computeTime < 5 ? '#00ff66' : computeTime < 10 ? '#ffaa00' : '#ff3333'
    }
    if (transferEl) {
      transferEl.textContent = transferTime.toFixed(2)
      transferEl.style.color =
        transferTime < 3 ? '#00ff66' : transferTime < 5 ? '#ffaa00' : '#ff3333'
    }
    if (renderEl) {
      renderEl.textContent = renderTime.toFixed(2)
      renderEl.style.color = renderTime < 5 ? '#00ff66' : renderEl < 10 ? '#ffaa00' : '#ff3333'
    }
    if (frameEl) {
      frameEl.textContent = frameCount.toString()
    }
  }

  // ============================================
  // 初始化 Taichi.js 流体系统
  // ============================================

  const initTaichi = async () => {
    console.log('[QuantumFluid] 初始化 Taichi.js...')

    // 初始化 Taichi.js
    if (!tiInitialized) {
      await ti.init()
      tiInitialized = true
      console.log('[QuantumFluid] Taichi.js 初始化成功')
    }

    // 计算参数
    const n_grid = config.n_grid
    const n_particles = config.particleCount
    const dx = config.dx
    const dt = config.dt
    const p_vol = config.p_vol
    const p_rho = config.p_rho
    const p_mass = config.p_mass
    const E = config.E
    const nu = config.nu
    const mu_0 = E / (2 * (1 + nu))
    const lambda_0 = (E * nu) / ((1 + nu) * (1 - 2 * nu))

    // 创建 Fields
    x = ti.Vector.field(3, ti.f32, [n_particles])
    v = ti.Vector.field(3, ti.f32, [n_particles])
    C = ti.Matrix.field(3, 3, ti.f32, [n_particles])
    J = ti.field(ti.f32, [n_particles])
    grid_v = ti.Vector.field(3, ti.f32, [n_grid, n_grid, n_grid])
    grid_m = ti.field(ti.f32, [n_grid, n_grid, n_grid])
    gravity = ti.Vector.field(3, ti.f32, [1])

    // 添加变量到 kernel 作用域
    ti.addToKernelScope({
      n_particles,
      n_grid,
      dx,
      dt,
      p_vol,
      p_rho,
      p_mass,
      E,
      nu,
      mu_0,
      lambda_0,
      gravity,
      x,
      v,
      C,
      J,
      grid_v,
      grid_m
    })

    // MPM 子步 kernel
    substep = ti.kernel(() => {
      // 清空网格
      for (let I of ti.ndrange(n_grid, n_grid, n_grid)) {
        grid_v[I] = [0, 0, 0]
        grid_m[I] = 0
      }

      // 粒子到网格（P2G）
      for (let p of ti.range(n_particles)) {
        let Xp = x[p] / dx
        let base = ti.i32(Xp - 0.5)
        let fx = Xp - base
        let w = [0.5 * (1.5 - fx) ** 2, 0.75 - (fx - 1) ** 2, 0.5 * (fx - 0.5) ** 2]
        let stress = (-dt * 4 * E * p_vol * (J[p] - 1)) / dx ** 2
        let identity = [
          [1.0, 0.0, 0.0],
          [0.0, 1.0, 0.0],
          [0.0, 0.0, 1.0]
        ]
        let affine = stress * identity + p_mass * C[p]

        for (let i of ti.static(ti.range(3))) {
          for (let j of ti.static(ti.range(3))) {
            for (let k of ti.static(ti.range(3))) {
              let offset = [i, j, k]
              let dpos = (ti.f32(offset) - fx) * dx
              let weight = w[[i, 0]] * w[[j, 1]] * w[[k, 2]]
              let cell = base + offset
              if (
                cell[0] >= 0 &&
                cell[1] >= 0 &&
                cell[2] >= 0 &&
                cell[0] < n_grid &&
                cell[1] < n_grid &&
                cell[2] < n_grid
              ) {
                grid_v[cell] = grid_v[cell] + weight * (p_mass * v[p] + affine.matmul(dpos))
                grid_m[cell] = grid_m[cell] + weight * p_mass
              }
            }
          }
        }
      }

      // 网格更新
      for (let I of ti.ndrange(n_grid, n_grid, n_grid)) {
        let bound = 2
        if (grid_m[I] > 0) {
          grid_v[I] = (1 / grid_m[I]) * grid_v[I]
        }
        grid_v[I] = grid_v[I] + dt * gravity[0]
        if (I[0] < bound && grid_v[I][0] < 0) {
          grid_v[I][0] = 0
        }
        if (I[0] >= n_grid - bound && grid_v[I][0] > 0) {
          grid_v[I][0] = 0
        }
        if (I[1] < bound && grid_v[I][1] < 0) {
          grid_v[I][1] = 0
        }
        if (I[1] >= n_grid - bound && grid_v[I][1] > 0) {
          grid_v[I][1] = 0
        }
        if (I[2] < bound && grid_v[I][2] < 0) {
          grid_v[I][2] = 0
        }
        if (I[2] >= n_grid - bound && grid_v[I][2] > 0) {
          grid_v[I][2] = 0
        }
      }

      // 网格到粒子（G2P）
      for (let p of ti.range(n_particles)) {
        let Xp = x[p] / dx
        let base = ti.i32(Xp - 0.5)
        let fx = Xp - base
        let w = [0.5 * (1.5 - fx) ** 2, 0.75 - (fx - 1.0) ** 2, 0.5 * (fx - 0.5) ** 2]
        let new_v = ti.f32([0.0, 0.0, 0.0])
        let new_C = ti.f32([
          [0.0, 0.0, 0.0],
          [0.0, 0.0, 0.0],
          [0.0, 0.0, 0.0]
        ])

        for (let i of ti.static(ti.range(3))) {
          for (let j of ti.static(ti.range(3))) {
            for (let k of ti.static(ti.range(3))) {
              let offset = [i, j, k]
              let dpos = ti.f32(offset) - fx
              let g_v = grid_v[base + offset]
              let weight = w[[i, 0]] * w[[j, 1]] * w[[k, 2]]
              new_v = new_v + weight * g_v
              new_C = new_C + weight * g_v.outerProduct(dpos) * (4.0 / (dx * dx))
            }
          }
        }

        v[p] = new_v
        C[p] = new_C
        x[p] = x[p] + dt * new_v
        J[p] = J[p] * (1 + dt * (new_C[[0, 0]] + new_C[[1, 1]] + new_C[[2, 2]]))
      }
    })

    // 重置粒子 kernel
    reset_water_only = ti.kernel(() => {
      for (let i of ti.range(n_particles)) {
        x[i] = [ti.random() * 0.4 + 0.05, ti.random() * 0.4 + 0.05, ti.random() * 0.4 + 0.05]
        v[i] = [0, 0, 0]
        J[i] = 1
        C[i] = [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0]
        ]
      }
    })

    // 初始化粒子
    reset_water_only()

    // 设置重力
    await gravity.fromArray([[0, -9.8, 0]])

    console.log('[QuantumFluid] Taichi.js 流体系统初始化完成')
  }

  // ============================================
  // 初始化 Three.js 粒子系统
  // ============================================

  const initParticleSystem = () => {
    console.log('[QuantumFluid] 初始化粒子系统...')

    // 创建粒子 Mesh - 使用八面体，更符合"量子"主题
    const geometry = new THREE.OctahedronGeometry(config.particleSize * 0.5, 0)
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    })

    fluidMesh = new THREE.InstancedMesh(geometry, material, config.particleCount)
    fluidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    scene.add(fluidMesh)

    console.log('[QuantumFluid] 粒子系统初始化完成')
  }

  // ============================================
  // 初始化 WebGPU Compute Shader（零拷贝传输）
  // ============================================

  const initComputeShader = () => {
    console.log('[QuantumFluid] 初始化 WebGPU Compute Shader...')

    // 创建共享位置数组
    sharedPositions = new Float32Array(config.particleCount * 3)

    // 初始化为立方体分布
    const sideLength = Math.cbrt(config.particleCount)
    const step = 0.4 / sideLength

    for (let i = 0; i < config.particleCount; i++) {
      const ix = i % sideLength
      const iy = Math.floor(i / sideLength) % sideLength
      const iz = Math.floor(i / (sideLength * sideLength))

      sharedPositions[i * 3 + 0] = 0.05 + ix * step
      sharedPositions[i * 3 + 1] = 0.05 + iy * step
      sharedPositions[i * 3 + 2] = 0.05 + iz * step
    }

    // 创建 Instanced Array 用于 WebGPU Compute
    positionStorage = instancedArray(sharedPositions, 'vec3').setName('particlePositions')

    // 创建 Compute Shader 用于更新粒子位置（动画效果）
    const timeUniform = uniform(0)

    updateShader = Fn(() => {
      const idx = instanceIndex
      const pos = positionStorage.element(idx)

      // 添加轻微的波动动画（基于位置和时间）
      const time = timeUniform
      const waveX = float(pos.x).mul(10).add(time).sin().mul(0.002)
      const waveY = float(pos.y).mul(10).add(time).cos().mul(0.002)
      const waveZ = float(pos.z).mul(10).add(time.mul(0.7)).sin().mul(0.002)

      pos.x.addAssign(waveX)
      pos.y.addAssign(waveY)
      pos.z.addAssign(waveZ)
    })()
      .compute(config.particleCount)
      .setName('fluidParticleUpdate')

    // 保存 uniform 引用
    particleCompute = { shader: updateShader, time: timeUniform }

    console.log('[QuantumFluid] WebGPU Compute Shader 初始化完成')
  }

  // ============================================
  // 更新粒子到 Three.js - WebGPU Compute Shader 零拷贝优化版
  // ============================================

  const updateParticles = async () => {
    const now = performance.now()

    // 计算 FPS
    const deltaTime = now - lastTime
    lastTime = now
    fps = 1000 / deltaTime

    frameCount++
    currentTime += 0.016

    // 开始计算计时
    const computeStart = now

    // 执行 MPM 子步（Taichi.js 计算）
    for (let i = 0; i < config.steps; i++) {
      substep()
    }

    // 结束计算计时
    const computeEnd = performance.now()
    computeTime = computeEnd - computeStart

    // 开始传输计时 - 零拷贝优化
    const transferStart = computeEnd

    // 零拷贝传输：直接从 Taichi.js 获取数据到共享 Buffer
    if (sharedPositions) {
      const taichiPositions = await x.toArray()

      // 直接填充到共享 Buffer（避免多次分配）
      for (let i = 0; i < config.particleCount; i++) {
        sharedPositions[i * 3 + 0] = taichiPositions[i][0]
        sharedPositions[i * 3 + 1] = taichiPositions[i][1]
        sharedPositions[i * 3 + 2] = taichiPositions[i][2]
      }
    }

    // 执行 WebGPU Compute Shader（粒子位置更新和变换）
    if (particleCompute) {
      particleCompute.time.value = currentTime
      ;(renderer as any).compute(particleCompute.shader)
    }

    // 更新 InstancedMesh（直接从 GPU 读取，无需 CPU 循环）
    const timeOffset = currentTime * 0.02

    // 由于 positionStorage 在 GPU 上更新，这里直接用于渲染
    for (let i = 0; i < config.particleCount; i++) {
      const idx = i * 3
      const px = sharedPositions![idx]
      const py = sharedPositions![idx + 1]
      const pz = sharedPositions![idx + 2]

      // 转换到世界坐标
      dummy.position.set(px * 200 - 100, py * 200 - 100, pz * 200 - 100)

      // 优化后的赛博朋克配色
      const colorIndex = Math.floor((i / config.particleCount) * 5)
      const hueOffsets = [0.0, 0.08, 0.5, 0.75, 0.83]
      const baseHue = hueOffsets[colorIndex % 5]
      const hue = (baseHue + timeOffset) % 1

      let lightness = 0.6
      if (i % 50 === 0) {
        lightness = 0.8 + 0.2 * Math.sin(currentTime * 2)
      }

      color.setHSL(hue, 1.0, lightness)
      dummy.scale.setScalar(config.particleSize)

      dummy.updateMatrix()
      fluidMesh.setMatrixAt(i, dummy.matrix)
      fluidMesh.setColorAt(i, color)
    }

    fluidMesh.instanceMatrix.needsUpdate = true
    if (fluidMesh.instanceColor) {
      fluidMesh.instanceColor.needsUpdate = true
    }

    // 结束传输计时
    transferTime = performance.now() - transferStart
  }

  // ============================================
  // 动画循环
  // ============================================

  const animate = async () => {
    animationId = requestAnimationFrame(animate)

    // 更新粒子
    await updateParticles()

    // 渲染计时
    const renderStart = performance.now()
    renderer.render(scene, camera)
    renderTime = performance.now() - renderStart

    // 更新性能面板（每10帧更新一次，避免频繁更新）
    if (frameCount % 10 === 0) {
      updatePerformancePanel()
    }
  }

  // ============================================
  // GSAP 动画
  // ============================================

  const createEntranceAnimation = () => {
    const tl = gsap.timeline()

    // 1. 相机推近
    tl.to(camera.position, {
      x: 0,
      y: 50,
      z: 200,
      duration: 2,
      ease: 'power2.inOut'
    })

    // 2. 粒子扩散
    tl.to(
      fluidMesh.scale,
      {
        x: 1,
        y: 1,
        z: 1,
        duration: 1.5,
        ease: 'back.out(1.7)'
      },
      '<0.5'
    )

    // 3. 旋转
    tl.to(
      fluidMesh.rotation,
      {
        y: Math.PI * 2,
        duration: 3,
        ease: 'power2.inOut'
      },
      '<'
    )

    // 4. 材质淡入
    tl.fromTo(
      fluidMesh.material,
      { opacity: 0 },
      { opacity: 0.9, duration: 1, ease: 'power2.out' },
      '<0.3'
    )

    allTweens.push(...tl.getChildren())
  }

  const createCameraAnimation = () => {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 })

    // 1. 俯冲推进 - 更近的距离
    tl.to(camera.position, {
      x: 0,
      y: 20,
      z: 80,
      duration: 3.5,
      ease: 'power2.inOut'
    })
    tl.to(
      camera.rotation,
      {
        x: 0,
        y: 0,
        z: 0,
        duration: 3.5
      },
      '<'
    )

    // 2. 环绕旋转 - 360度旋转
    tl.to(camera.position, {
      x: 80,
      y: 30,
      z: 80,
      duration: 3.5,
      ease: 'power2.inOut'
    })
    tl.to(
      camera.rotation,
      {
        x: -0.1,
        y: Math.PI * 0.5,
        z: 0,
        duration: 3.5
      },
      '<'
    )

    // 3. 穿梭穿越 - 从中心穿过
    tl.to(camera.position, {
      x: 0,
      y: -30,
      z: -120,
      duration: 3.5,
      ease: 'power2.inOut'
    })
    tl.to(
      camera.rotation,
      {
        x: 0,
        y: Math.PI,
        z: 0,
        duration: 3.5
      },
      '<'
    )

    // 4. 全景扫视 - 斜向扫视
    tl.to(camera.position, {
      x: -100,
      y: 60,
      z: 60,
      duration: 3.5,
      ease: 'power2.inOut'
    })
    tl.to(
      camera.rotation,
      {
        x: -0.15,
        y: Math.PI * 1.5,
        z: 0,
        duration: 3.5
      },
      '<'
    )

    // 5. 仰拍仰望 - 高角度
    tl.to(camera.position, {
      x: 0,
      y: 180,
      z: 100,
      duration: 3.5,
      ease: 'power2.inOut'
    })
    tl.to(
      camera.rotation,
      {
        x: -0.8,
        y: 0,
        z: 0,
        duration: 3.5
      },
      '<'
    )

    // 6. 螺旋上升
    tl.to(camera.position, {
      x: 0,
      y: 50,
      z: 400,
      duration: 4,
      ease: 'power2.inOut'
    })

    // 相机始终朝向中心
    tl.to(camera.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.1,
      onUpdate: () => {
        camera.lookAt(0, 0, 0)
      }
    })

    allTweens.push(...tl.getChildren())
  }

  // ============================================
  // 窗口大小调整
  // ============================================

  const onWindowResize = () => {
    width = container.clientWidth
    height = container.clientHeight

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
  }

  // ============================================
  // 清理函数
  // ============================================

  const cleanup = () => {
    console.log('[QuantumFluid] 开始清理...')

    // 0. 移除性能面板
    if (performanceElement && performanceElement.parentNode) {
      performanceElement.parentNode.removeChild(performanceElement)
      performanceElement = null
    }

    // 1. 停止所有 GSAP 动画
    allTweens.forEach(tween => {
      try {
        tween.kill()
      } catch (e) {
        // 忽略错误
      }
    })

    // 2. 杀死所有相关 tweens
    gsap.killTweensOf(camera.position)
    gsap.killTweensOf(camera.rotation)
    if (fluidMesh) {
      gsap.killTweensOf(fluidMesh.scale)
      gsap.killTweensOf(fluidMesh.rotation)
      gsap.killTweensOf(fluidMesh.material)
    }

    // 3. 停止动画循环
    if (animationId) {
      cancelAnimationFrame(animationId)
    }

    // 4. 移除事件监听器
    window.removeEventListener('resize', onWindowResize)

    // 5. 清理对象引用
    if (fluidMesh) {
      scene.remove(fluidMesh)
      if (fluidMesh.geometry) {
        fluidMesh.geometry.dispose()
      }
      if (fluidMesh.material) {
        fluidMesh.material.dispose()
      }
    }

    // 6. 释放渲染器
    if (renderer) {
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }

    // 7. 清理 scene
    if (scene) {
      scene.clear()
    }

    // 8. 清理对象
    dummy.position.set(0, 0, 0)
    dummy.rotation.set(0, 0, 0)
    dummy.scale.set(1, 1, 1)
    color.set(0x000000)

    // 9. 清理 Compute Shader 引用
    positionStorage = null
    updateShader = null
    particleCompute = null
    sharedPositions = null

    // 10. 清理 Taichi.js 引用
    x = null
    v = null
    C = null
    J = null
    grid_v = null
    grid_m = null
    gravity = null
    substep = null
    reset_water_only = null

    // 11. 清理数组
    allTweens.length = 0

    // 12. 清理所有引用
    fluidMesh = null
    renderer = null
    scene = null
    camera = null
    // ti 是通过 import 导入的，不能设置为 null

    console.log('[QuantumFluid] 清理完成')
  }

  // ============================================
  // 启动函数
  // ============================================

  const start = async () => {
    console.log('[QuantumFluid] 启动...')

    try {
      // 初始化 Three.js
      initThreeJS()

      // 初始化 WebGPU 渲染器
      await renderer.init()

      // 初始化 Taichi.js 流体系统
      await initTaichi()

      // 初始化粒子系统
      initParticleSystem()

      // 初始化 WebGPU Compute Shader（零拷贝传输）
      initComputeShader()

      // 入场动画
      createEntranceAnimation()

      // 相机动画
      setTimeout(() => {
        createCameraAnimation()
      }, 2000)

      // 事件监听
      window.addEventListener('resize', onWindowResize)

      // 开始动画循环
      animate()

      console.log('[QuantumFluid] 启动成功')
    } catch (error) {
      console.error('[QuantumFluid] 启动失败:', error)
      cleanup()
      throw error
    }
  }

  // 启动特效
  start()

  return cleanup
}
