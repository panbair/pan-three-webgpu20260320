import { ref, shallowRef } from 'vue'
import * as THREE from 'three'
import { loadBlockTexture, getCubeGeometry, getFrameGeometry, getLetterMaterials, geometryPool } from './useResourceManager'

/**
 * 游戏逻辑 Composable
 * 封装游戏状态、方块管理和游戏规则
 */

// 游戏配置常量
const GAME_CONFIG = {
  MAX_BLOCKS: 50,
  LETTER_SPEED: 0.02,
  SPAWN_RATE: 0.1, // 提高生成速率
  BLOCK_SIZE: 0.8,
  FRAME_SIZE: 0.96,
  ROTATION_SPEED_X: 0.005,
  ROTATION_SPEED_Y: 0.01,
  SAFE_MARGIN_X: 1.5,
  SAFE_MARGIN_Z: 1.5,
  SPAWN_Y: 15
}

// 视锥体边界
let frustumBounds = {
  left: -10,
  right: 10,
  top: 20,
  bottom: -5,
  nearZ: 0,
  farZ: 10
}

export const useGameLogic = (sceneParam: THREE.Scene | null, cameraParam: THREE.PerspectiveCamera | null) => {
  // 保存 scene 和 camera 引用
  const scene = sceneParam
  const camera = cameraParam

  // 游戏状态
  const gameState = ref<'ready' | 'playing' | 'paused' | 'gameover'>('ready')
  const score = ref(0)
  const level = ref(1)
  const lives = ref(3)
  const keysPressed = ref(new Set<string>())

  // 游戏对象
  const letterBlocks: any[] = []
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  let spawnInterval: NodeJS.Timeout | null = null

  // 计算视锥体边界
  const updateFrustumBounds = () => {
    if (!camera) return

    const aspect = camera.aspect
    const fov = camera.fov * (Math.PI / 180)
    const cameraY = camera.position.y
    const cameraZ = camera.position.z

    const distanceToSpawn = Math.abs(cameraZ)
    const visibleHeightAtSpawn = 2 * Math.tan(fov / 2) * distanceToSpawn
    const visibleWidthAtSpawn = visibleHeightAtSpawn * aspect

    const safeMarginX = (GAME_CONFIG.BLOCK_SIZE + GAME_CONFIG.FRAME_SIZE) / 2 + GAME_CONFIG.SAFE_MARGIN_X
    const safeMarginZ = (GAME_CONFIG.BLOCK_SIZE + GAME_CONFIG.FRAME_SIZE) / 2 + GAME_CONFIG.SAFE_MARGIN_Z

    const lookAtY = 5
    const visibleBottomY = lookAtY - (lookAtY - cameraY) * Math.tan(fov / 2) * 2 - 5

    frustumBounds = {
      left: -visibleWidthAtSpawn / 2 + safeMarginX,
      right: visibleWidthAtSpawn / 2 - safeMarginX,
      top: GAME_CONFIG.SPAWN_Y,
      bottom: Math.max(visibleBottomY, -15),
      nearZ: safeMarginZ,
      farZ: 10 - safeMarginZ
    }

    // 确保边界有效
    if (frustumBounds.left >= frustumBounds.right) {
      frustumBounds.left = -8
      frustumBounds.right = 8
    }
    if (frustumBounds.nearZ >= frustumBounds.farZ) {
      frustumBounds.nearZ = 2
      frustumBounds.farZ = 8
    }
  }

  // 清理大方框
  const disposeBigFrame = (bigFrame: any) => {
    if (!bigFrame || !scene) return
    if (bigFrame.mesh) {
      scene.remove(bigFrame.mesh)
    }
  }

  // 清理方块
  const disposeBlock = (block: any) => {
    if (!block || !block.mesh || !scene) return
    scene.remove(block.mesh)
    if (block.bigFrame) {
      disposeBigFrame(block.bigFrame)
      block.bigFrame = null
    }
  }

  // 创建大方框
  const createBigFrameForBlock = (letter: string, blockPosition: THREE.Vector3, blockRotation: THREE.Euler) => {
    const materials = getLetterMaterials(letter)
    const geometry = getFrameGeometry(GAME_CONFIG.FRAME_SIZE)

    const bigFrameMesh = new THREE.Mesh(geometry, materials)
    const framePosition = blockPosition.clone()
    framePosition.z += 0.1
    bigFrameMesh.position.copy(framePosition)

    if (blockRotation) {
      bigFrameMesh.rotation.copy(blockRotation)
    }

    if (scene) {
      scene.add(bigFrameMesh)
    }

    return {
      mesh: bigFrameMesh,
      geometry,
      materials,
      texture: materials[0].map
    }
  }

  // 创建字母方块
  const createLetterBlock = (letter: string) => {
    const cubeGeometry = getCubeGeometry(GAME_CONFIG.BLOCK_SIZE)
    const texture = loadBlockTexture()

    const materials = []
    for (let i = 0; i < 6; i++) {
      materials.push(
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.9
        })
      )
    }

    const cubeMesh = new THREE.Mesh(cubeGeometry, materials)

    const blockPosition = new THREE.Vector3(
      frustumBounds.left + Math.random() * (frustumBounds.right - frustumBounds.left),
      frustumBounds.top,
      frustumBounds.nearZ + Math.random() * (frustumBounds.farZ - frustumBounds.nearZ)
    )
    cubeMesh.position.copy(blockPosition)

    const blockRotation = new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    )
    cubeMesh.rotation.copy(blockRotation)

    const bigFrame = createBigFrameForBlock(letter, blockPosition, blockRotation)

    console.log('createLetterBlock: scene is', scene, 'cubeMesh is', cubeMesh)
    if (scene) {
      scene.add(cubeMesh)
      console.log('createLetterBlock: cubeMesh added to scene, parent now:', cubeMesh.parent)
    } else {
      console.error('createLetterBlock: scene is null, cannot add cubeMesh!')
    }

    return {
      mesh: cubeMesh,
      letter,
      speed: GAME_CONFIG.LETTER_SPEED + Math.random() * 0.01,
      hit: false,
      bigFrame
    }
  }

  // 生成字母方块
  const spawnLetterBlock = () => {
    if (gameState.value !== 'playing') {
      console.log('spawnLetterBlock: gameState is not playing:', gameState.value)
      return
    }
    if (letterBlocks.length >= GAME_CONFIG.MAX_BLOCKS) {
      console.log('spawnLetterBlock: max blocks reached:', letterBlocks.length)
      return
    }

    const letter = letters[Math.floor(Math.random() * letters.length)]
    console.log('spawnLetterBlock: creating block for letter:', letter)
    const block = createLetterBlock(letter)
    console.log('spawnLetterBlock: block created, mesh:', block.mesh)
    letterBlocks.push(block)
  }

  // 爆炸方块
  const explodeLetter = (block: any) => {
    disposeBlock(block)
  }

  // 更新游戏逻辑
  const updateGame = () => {
    if (gameState.value !== 'playing') return

    console.log('updateGame: gameState is playing, blocks count:', letterBlocks.length)

    // 更新方块位置和旋转
    for (let i = letterBlocks.length - 1; i >= 0; i--) {
      const block = letterBlocks[i]
      if (!block || !block.mesh || block.hit) continue

      // 移动方块
      block.mesh.position.y -= block.speed

      // 同步移动大方框
      if (block.bigFrame && block.bigFrame.mesh) {
        block.bigFrame.mesh.position.y = block.mesh.position.y
        block.bigFrame.mesh.position.z = block.mesh.position.z + 0.1
      }

      // 旋转动画
      block.mesh.rotation.x += GAME_CONFIG.ROTATION_SPEED_X
      block.mesh.rotation.y += GAME_CONFIG.ROTATION_SPEED_Y

      // 同步旋转大方框
      if (block.bigFrame && block.bigFrame.mesh) {
        block.bigFrame.mesh.rotation.x = block.mesh.rotation.x
        block.bigFrame.mesh.rotation.y = block.mesh.rotation.y
      }

      // 检查是否超出边界
      if (block.mesh.position.y < frustumBounds.bottom) {
        disposeBlock(block)
        letterBlocks.splice(i, 1)
        lives.value--
        if (lives.value <= 0) {
          endGame()
        }
      }
    }

    // 检查按键命中
    keysPressed.value.forEach(key => {
      const upperKey = key.toUpperCase()
      if (!upperKey) return

      const targetBlock = letterBlocks.find(block => block && !block.hit && block.letter === upperKey)

      if (targetBlock) {
        targetBlock.hit = true
        explodeLetter(targetBlock)
        letterBlocks.splice(letterBlocks.indexOf(targetBlock), 1)

        score.value += 10 * level.value

        if (score.value > level.value * 100) {
          level.value++
        }
      }
    })
  }

  // 开始游戏
  const startGame = () => {
    console.log('startGame in useGameLogic, current gameState:', gameState.value)
    if (gameState.value === 'ready' || gameState.value === 'gameover') {
      score.value = 0
      level.value = 1
      lives.value = 3
      letterBlocks.length = 0
      keysPressed.value.clear()
    }

    gameState.value = 'playing'
    console.log('startGame: set gameState to playing')

    spawnInterval = setInterval(() => {
      console.log('Interval callback, gameState:', gameState.value)
      if (gameState.value === 'playing') {
        spawnLetterBlock()
        console.log('spawned block, total blocks:', letterBlocks.length)
      } else {
        if (spawnInterval) {
          clearInterval(spawnInterval)
          spawnInterval = null
        }
      }
    }, 1000 / (GAME_CONFIG.SPAWN_RATE * 10))
    console.log('startGame: setInterval created, interval:', 1000 / (GAME_CONFIG.SPAWN_RATE * 10))
  }

  // 结束游戏
  const endGame = () => {
    gameState.value = 'gameover'
  }

  // 重新开始游戏
  const restartGame = () => {
    if (spawnInterval) {
      clearInterval(spawnInterval)
      spawnInterval = null
    }

    letterBlocks.forEach(block => disposeBlock(block))
    letterBlocks.length = 0
    keysPressed.value.clear()

    gameState.value = 'ready'
    score.value = 0
    level.value = 1
    lives.value = 3

    updateFrustumBounds()
  }

  // 暂停游戏
  const pauseGame = () => {
    if (gameState.value === 'playing') {
      gameState.value = 'paused'
      if (spawnInterval) {
        clearInterval(spawnInterval)
        spawnInterval = null
      }
    }
  }

  // 继续游戏
  const resumeGame = () => {
    if (gameState.value === 'paused') {
      if (spawnInterval) {
        clearInterval(spawnInterval)
        spawnInterval = null
      }

      gameState.value = 'playing'

      spawnInterval = setInterval(() => {
        if (gameState.value === 'playing') {
          spawnLetterBlock()
        } else {
          if (spawnInterval) {
            clearInterval(spawnInterval)
            spawnInterval = null
          }
        }
      }, 1000 / (GAME_CONFIG.SPAWN_RATE * 10))
    }
  }

  // 键盘事件处理
  const handleKeyDown = (event: KeyboardEvent) => {
    event.preventDefault()
    const key = event.key.toLowerCase()
    keysPressed.value.add(key)

    if (event.key === 'Escape') {
      if (gameState.value === 'playing') {
        pauseGame()
      } else if (gameState.value === 'paused') {
        resumeGame()
      }
    }
  }

  const handleKeyUp = (event: KeyboardEvent) => {
    event.preventDefault()
    const key = event.key.toLowerCase()
    keysPressed.value.delete(key)
  }

  // 清理游戏逻辑
  const cleanup = () => {
    if (spawnInterval) {
      clearInterval(spawnInterval)
      spawnInterval = null
    }

    letterBlocks.forEach(block => disposeBlock(block))
    letterBlocks.length = 0
    keysPressed.value.clear()
  }

  return {
    gameState,
    score,
    level,
    lives,
    updateFrustumBounds,
    updateGame,
    startGame,
    endGame,
    restartGame,
    pauseGame,
    resumeGame,
    handleKeyDown,
    handleKeyUp,
    cleanup
  }
}
