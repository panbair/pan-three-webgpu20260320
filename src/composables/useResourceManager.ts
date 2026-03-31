/**
 * 资源管理 Composable
 * 管理纹理、材质、几何体的缓存和复用
 */
import * as THREE from 'three'

// 纹理缓存
const textureCache = new Map<string, THREE.Texture>()
const textureLoader = new THREE.TextureLoader()
let blockTexture: THREE.Texture | null = null

// 材质缓存
const materialCache = new Map<string, THREE.Material[]>()

// 几何体对象池
const geometryPool = {
  cube: null as THREE.BoxGeometry | null,
  frame: null as THREE.BoxGeometry | null
}

// 方块图片纹理加载
export const loadBlockTexture = (): THREE.Texture => {
  if (blockTexture) return blockTexture
  blockTexture = textureLoader.load('/game/1.png')
  return blockTexture
}

// 获取或创建字母材质
export const getLetterMaterials = (letter: string): THREE.Material[] => {
  let cachedMaterials = materialCache.get(letter)

  if (!cachedMaterials) {
    let tex = textureCache.get(letter)

    if (!tex) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = 256
      canvas.height = 256

      if (ctx) {
        ctx.fillStyle = 'rgba(0, 150, 255, 0.6)'
        ctx.fillRect(0, 0, 256, 256)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 200px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(letter, 128, 128)
      }

      tex = new THREE.CanvasTexture(canvas)
      textureCache.set(letter, tex)
    }

    // 创建材质数组并缓存
    cachedMaterials = []
    for (let i = 0; i < 6; i++) {
      cachedMaterials.push(
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.3,
          side: THREE.FrontSide,
          depthWrite: false,
          blending: THREE.NormalBlending
        })
      )
    }
    materialCache.set(letter, cachedMaterials)
  }

  return cachedMaterials
}

// 获取或创建立方体几何体
export const getCubeGeometry = (size: number): THREE.BoxGeometry => {
  if (!geometryPool.cube) {
    geometryPool.cube = new THREE.BoxGeometry(size, size, size)
  }
  return geometryPool.cube
}

// 获取或创建大方框几何体
export const getFrameGeometry = (size: number): THREE.BoxGeometry => {
  if (!geometryPool.frame) {
    geometryPool.frame = new THREE.BoxGeometry(size, size, size)
  }
  return geometryPool.frame
}

// 清理所有资源
export const cleanupResources = () => {
  // 清理材质缓存
  materialCache.forEach(materials => {
    materials.forEach(mat => {
      if (mat && typeof mat.dispose === 'function') {
        mat.dispose()
      }
    })
  })
  materialCache.clear()

  // 清理纹理缓存
  textureCache.forEach(tex => {
    if (typeof tex.dispose === 'function') {
      tex.dispose()
    }
  })
  textureCache.clear()

  // 清理纹理引用
  if (blockTexture) {
    blockTexture.dispose()
    blockTexture = null
  }

  // 清理几何体对象池
  if (geometryPool.cube) {
    geometryPool.cube.dispose()
    geometryPool.cube = null
  }
  if (geometryPool.frame) {
    geometryPool.frame.dispose()
    geometryPool.frame = null
  }
}

export { geometryPool }
