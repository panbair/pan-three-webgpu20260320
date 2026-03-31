/**
 * GPU 计算性能基准测试
 * 用于对比不同方案的性能
 */

import * as THREE from 'three/webgpu'
import {
  ThreeTSLParticleEffect,
  TaichiJSParticleEffect,
  ParticleComplexity
} from './hybrid-gpu-compute'

export interface BenchmarkResult {
  backend: 'three-tsl' | 'taichi-js'
  particleCount: number
  complexity: ParticleComplexity
  fps: number
  avgFrameTime: number
  initTime: number
  memoryUsage: number
}

export class GPUComputeBenchmark {
  private results: BenchmarkResult[] = []

  /**
   * 运行基准测试
   */
  async runBenchmark(
    particleCounts: number[],
    complexities: ParticleComplexity[],
    duration: number = 5000 // 测试时长（毫秒）
  ): Promise<BenchmarkResult[]> {
    this.results = []

    for (const particleCount of particleCounts) {
      for (const complexity of complexities) {
        console.log(`[Benchmark] 测试 ${particleCount} 粒子, 复杂度: ${complexity}`)

        // 测试 Three.js TSL
        const threeTSLResult = await this.testThreeTSL(particleCount, complexity, duration)
        this.results.push(threeTSLResult)

        // 测试 Taichi.js（仅对复杂场景）
        if (complexity !== ParticleComplexity.Simple) {
          const taichiJSResult = await this.testTaichiJS(particleCount, complexity, duration)
          this.results.push(taichiJSResult)
        }
      }
    }

    this.printSummary()
    return this.results
  }

  /**
   * 测试 Three.js TSL 方案
   */
  private async testThreeTSL(
    particleCount: number,
    complexity: ParticleComplexity,
    duration: number
  ): Promise<BenchmarkResult> {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 1, 5000)
    camera.position.set(0, 200, 500)

    const renderer = new THREE.WebGPURenderer({ antialias: false, alpha: true })
    renderer.setSize(1, 1)
    await renderer.init()

    // 测量初始化时间
    const initStartTime = performance.now()
    const effect = new ThreeTSLParticleEffect(scene, renderer, particleCount)
    effect.init()
    const initTime = performance.now() - initStartTime

    // 测量性能
    const frameTimes: number[] = []
    let frameCount = 0
    const startTime = performance.now()

    return new Promise(resolve => {
      const animate = () => {
        const frameStart = performance.now()

        effect.update()
        renderer.render(scene, camera)

        const frameTime = performance.now() - frameStart
        frameTimes.push(frameTime)
        frameCount++

        if (performance.now() - startTime < duration) {
          requestAnimationFrame(animate)
        } else {
          // 计算统计数据
          const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
          const fps = 1000 / avgFrameTime
          const memoryUsage = performance.memory?.usedJSHeapSize || 0

          resolve({
            backend: 'three-tsl',
            particleCount,
            complexity,
            fps,
            avgFrameTime,
            initTime,
            memoryUsage: memoryUsage / 1024 / 1024 // MB
          })
        }
      }

      requestAnimationFrame(animate)
    })
  }

  /**
   * 测试 Taichi.js 方案
   */
  private async testTaichiJS(
    particleCount: number,
    complexity: ParticleComplexity,
    duration: number
  ): Promise<BenchmarkResult> {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 1, 5000)
    camera.position.set(0, 200, 500)

    const renderer = new THREE.WebGPURenderer({ antialias: false, alpha: true })
    renderer.setSize(1, 1)
    await renderer.init()

    // 测量初始化时间
    const initStartTime = performance.now()
    const effect = new TaichiJSParticleEffect(scene, renderer, particleCount)
    await effect.init()
    const initTime = performance.now() - initStartTime

    // 测量性能
    const frameTimes: number[] = []
    let frameCount = 0
    const startTime = performance.now()

    return new Promise(resolve => {
      const animate = () => {
        const frameStart = performance.now()

        effect.update()
        renderer.render(scene, camera)

        const frameTime = performance.now() - frameStart
        frameTimes.push(frameTime)
        frameCount++

        if (performance.now() - startTime < duration) {
          requestAnimationFrame(animate)
        } else {
          // 计算统计数据
          const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
          const fps = 1000 / avgFrameTime
          const memoryUsage = performance.memory?.usedJSHeapSize || 0

          resolve({
            backend: 'taichi-js',
            particleCount,
            complexity,
            fps,
            avgFrameTime,
            initTime,
            memoryUsage: memoryUsage / 1024 / 1024 // MB
          })
        }
      }

      requestAnimationFrame(animate)
    })
  }

  /**
   * 打印测试结果摘要
   */
  private printSummary() {
    console.log('\n========================================')
    console.log('GPU 计算性能基准测试结果')
    console.log('========================================\n')

    // 按粒子数分组
    const grouped = new Map<number, BenchmarkResult[]>()
    this.results.forEach(r => {
      if (!grouped.has(r.particleCount)) {
        grouped.set(r.particleCount, [])
      }
      grouped.get(r.particleCount)!.push(r)
    })

    grouped.forEach((results, particleCount) => {
      console.log(`粒子数量: ${particleCount}`)
      console.log('----------------------------------------')

      results.forEach(r => {
        const speedup =
          results.length > 1
            ? (() => {
                const other = results.find(x => x.backend !== r.backend)
                if (!other) return '-'
                const ratio = other.avgFrameTime / r.avgFrameTime
                return ratio > 1
                  ? `+${((ratio - 1) * 100).toFixed(1)}%`
                  : `${((ratio - 1) * 100).toFixed(1)}%`
              })()
            : '-'

        console.log(
          `  ${r.backend.padEnd(15)} | 复杂度: ${r.complexity.padEnd(10)} | FPS: ${r.fps.toFixed(1)} | 帧时间: ${r.avgFrameTime.toFixed(2)}ms | 初始化: ${r.initTime.toFixed(0)}ms | 性能: ${speedup}`
        )
      })
      console.log('')
    })

    // 找出最优方案
    const bestPerformances = new Map<string, BenchmarkResult>()
    this.results.forEach(r => {
      const key = `${r.particleCount}-${r.complexity}`
      if (!bestPerformances.has(key) || bestPerformances.get(key)!.avgFrameTime > r.avgFrameTime) {
        bestPerformances.set(key, r)
      }
    })

    console.log('推荐方案（基于性能）:')
    console.log('----------------------------------------')
    bestPerformances.forEach((r, key) => {
      console.log(`  ${key}: ${r.backend}`)
    })
    console.log('\n========================================\n')
  }

  /**
   * 导出测试结果为 JSON
   */
  exportResults(): string {
    return JSON.stringify(this.results, null, 2)
  }

  /**
   * 生成性能对比图表数据（可用于 Chart.js）
   */
  generateChartData() {
    const labels = [...new Set(this.results.map(r => r.particleCount))].sort((a, b) => a - b)

    const threeTSLData = labels.map(
      count =>
        this.results.find(r => r.backend === 'three-tsl' && r.particleCount === count)?.fps || 0
    )

    const taichiJSData = labels.map(
      count =>
        this.results.find(r => r.backend === 'taichi-js' && r.particleCount === count)?.fps || 0
    )

    return {
      labels: labels.map(n => n.toString()),
      datasets: [
        {
          label: 'Three.js TSL',
          data: threeTSLData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)'
        },
        {
          label: 'Taichi.js',
          data: taichiJSData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)'
        }
      ]
    }
  }
}

/**
 * 使用示例
 */
export async function runBenchmark() {
  const benchmark = new GPUComputeBenchmark()

  // 测试不同粒子数量
  const particleCounts = [500, 1000, 2000, 5000]
  const complexities = [ParticleComplexity.Simple, ParticleComplexity.Complex]

  const results = await benchmark.runBenchmark(particleCounts, complexities, 3000)

  console.log('测试完成！')
  console.log('\n完整结果:')
  console.log(benchmark.exportResults())

  console.log('\n图表数据:')
  console.log(JSON.stringify(benchmark.generateChartData(), null, 2))

  return results
}
