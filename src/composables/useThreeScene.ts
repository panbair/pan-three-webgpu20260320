import { ref, shallowRef } from 'vue'
import * as THREE from 'three'

/**
 * Three.js 场景管理 Composable
 * 封装场景初始化、渲染循环和清理逻辑
 */
export const useThreeScene = (canvas: HTMLCanvasElement) => {
  const scene = shallowRef<THREE.Scene | null>(null)
  const camera = shallowRef<THREE.PerspectiveCamera | null>(null)
  const renderer = shallowRef<THREE.WebGLRenderer | null>(null)
  const animationId = ref<number | null>(null)

  // 初始化场景
  const initScene = () => {
    const width = canvas.clientWidth || 800
    const height = canvas.clientHeight || 600

    // 创建场景
    scene.value = new THREE.Scene()

    // 创建相机
    camera.value = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.value.position.set(0, 5, 15)
    camera.value.lookAt(0, 5, 0)

    // 创建渲染器
    renderer.value = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.value.setSize(width, height)
    renderer.value.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.value.setClearColor(0x000000, 0)

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.value.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    scene.value.add(directionalLight)

    return { scene: scene.value, camera: camera.value, renderer: renderer.value }
  }

  // 开始渲染循环
  const startRenderLoop = (updateCallback: () => void) => {
    console.log('startRenderLoop: starting animation loop')
    const animate = () => {
      animationId.value = requestAnimationFrame(animate)
      updateCallback()
      if (renderer.value && scene.value && camera.value) {
        renderer.value.render(scene.value, camera.value)
      }
    }
    animate()
  }

  // 停止渲染循环
  const stopRenderLoop = () => {
    if (animationId.value) {
      cancelAnimationFrame(animationId.value)
      animationId.value = null
    }
  }

  // 处理窗口大小变化
  const handleResize = () => {
    if (!camera.value || !renderer.value) return

    const width = canvas.clientWidth
    const height = canvas.clientHeight

    camera.value.aspect = width / height
    camera.value.updateProjectionMatrix()
    renderer.value.setSize(width, height)
  }

  // 清理资源
  const cleanup = () => {
    stopRenderLoop()

    if (renderer.value) {
      renderer.value.dispose()
      renderer.value = null
    }

    scene.value = null
    camera.value = null
  }

  return {
    scene,
    camera,
    renderer,
    initScene,
    startRenderLoop,
    stopRenderLoop,
    handleResize,
    cleanup
  }
}
