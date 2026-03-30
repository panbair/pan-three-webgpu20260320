<template>
  <div class="meteor-game-container">
    <!-- 全景图背景 -->
 <PanoramaViewer />
    
    <!-- 游戏UI覆盖层 -->
    <div class="game-ui">
      <!-- 游戏信息面板 -->
      <div class="game-info">
        <div class="score">得分: {{ score }}</div>
        <div class="level">等级: {{ level }}</div>
        <div class="lives">生命: {{ lives }}</div>
        
        <!-- 游戏控制按钮 -->
        <div class="game-controls">
          <button 
            v-if="gameState === 'ready' || gameState === 'gameover'"
            class="control-btn start-btn" 
            @click="startGame"
          >
            开始
          </button>
          <button 
            v-if="gameState === 'playing'"
            class="control-btn pause-btn" 
            @click="pauseGame"
          >
            停止
          </button>
          <button 
            v-if="gameState === 'paused'"
            class="control-btn resume-btn" 
            @click="resumeGame"
          >
            继续
          </button>
          <button 
            v-if="gameState === 'playing' || gameState === 'paused' || gameState === 'gameover'"
            class="control-btn restart-btn" 
            @click="restartGame"
          >
            重新开始
          </button>
        </div>
      </div>
      
      <!-- 游戏状态 -->
      <div v-if="gameState === 'ready'" class="game-status ready">
        <h2>三维打字雨</h2>
        <p>字母方块从天空掉落，按下对应按键消灭它们！</p>
        <button class="start-btn" @click="startGame">开始游戏</button>
      </div>
      

      
      <div v-else-if="gameState === 'gameover'" class="game-status gameover">
        <h2>游戏结束</h2>
        <p>最终得分: {{ score }}</p>
        <p>到达等级: {{ level }}</p>
        <button class="restart-btn" @click="restartGame">重新开始</button>
      </div>
      
      <!-- 操作提示 -->
      <div class="controls-hint">
        <p>ESC 暂停/继续</p>
      </div>
    </div>
    
    <!-- 简单的3D场景容器 -->
    <canvas ref="gameCanvas" class="game-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
// 引入 Three.js
import * as THREE from 'three'
import PanoramaViewer from '@/components/PanoramaViewer.vue'

// 游戏状态
    const gameState = ref('ready') // ready, playing, paused, gameover
    const score = ref(0)
    const level = ref(1)
    const lives = ref(3)
    const gameCanvas = ref(null)
    
    // Three.js 相关
    let scene = null
    let camera = null
    let renderer = null
    let animationId = null
    
    // 游戏对象
    const letterBlocks = []
    const keysPressed = ref(new Set())
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    
    // 方块图片纹理加载（六个面共用）
    const textureLoader = new THREE.TextureLoader()
    let blockTexture = null
    
    // 创建单个大方框（为每个方块创建）
    const createBigFrameForBlock = (letter, blockPosition, blockRotation) => {
      const frameSize = 0.96 // 比方块稍大一点 (0.8 * 1.2)
      const frameGeom = new THREE.BoxGeometry(frameSize, frameSize, frameSize)

      // 创建字母 Canvas 纹理 - 提高透明度便于观察
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = 256
      canvas.height = 256

      if (ctx) {
        // 提高透明度从0.3到0.6，更容易看到
        ctx.fillStyle = 'rgba(0, 150, 255, 0.6)'
        ctx.fillRect(0, 0, 256, 256)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 200px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(letter, 128, 128)
      }

      const tex = new THREE.CanvasTexture(canvas)
      const materials = []
      for (let i = 0; i < 6; i++) {
        materials.push(new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.5, // 提高透明度从0.2到0.5
          side: THREE.DoubleSide
        }))
      }

      const bigFrameMesh = new THREE.Mesh(frameGeom, materials)
      // 设置大方框位置与方块相同，但稍微上移避免z-fighting
      const framePosition = blockPosition.clone()
      framePosition.z += 0.1 // 稍微偏移避免重叠
      bigFrameMesh.position.copy(framePosition)

      // 设置大方框的旋转角度与方块相同
      if (blockRotation) {
        bigFrameMesh.rotation.copy(blockRotation)
      }

      if (scene) {
        scene.add(bigFrameMesh)
        console.log(`Created big frame for letter ${letter} at position:`, framePosition, 'rotation:', bigFrameMesh.rotation)
      }

      return {
        mesh: bigFrameMesh,
        geometry: frameGeom,
        materials: materials,
        texture: tex
      }
    }
    
    const loadBlockTexture = () => {
      if (blockTexture) return blockTexture
      // 使用 public/game/1.png，路径相对于 public
      blockTexture = textureLoader.load('/game/1.png')
      return blockTexture
    }
    
    // 游戏参数
    const letterSpeed = 0.02
    const spawnRate = 0.02
    
    // 初始化简单3D场景
    const initGameScene = () => {
      if (!gameCanvas.value) return
      
      const canvas = gameCanvas.value
      const width = canvas.clientWidth || 800
      const height = canvas.clientHeight || 600
      
      // 创建场景
      scene = new THREE.Scene()
      
      // 创建相机 - 调整位置以便更好地观察大方框
      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
      camera.position.set(0, 5, 15) // 从斜上方观察，便于看到大方框
      camera.lookAt(0, 5, 0)
      
      // 创建渲染器
      renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true, 
        alpha: true
      })
      renderer.setSize(width, height)
      renderer.setClearColor(0x000000, 0)
      
      // 添加光源
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      scene.add(ambientLight)
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(10, 10, 5)
      scene.add(directionalLight)
      
      // 开始渲染循环
      animate()
      
      // 调试：3秒后输出场景中所有对象
      setTimeout(() => {
        if (scene) {
          console.log('Scene children count:', scene.children.length)
          scene.children.forEach((child, index) => {
            if (child.type === 'Mesh') {
              console.log(`Mesh ${index}: position=${JSON.stringify(child.position)}, visible=${child.visible}`)
            }
          })
        }
      }, 3000)
    }
    
// 创建图片材质方块 + 表面字母Sprite + 透明大方框
const createLetterBlock = (letter) => {
  const cubeGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8)

  // 1. 加载图片纹理（六个面共用）
  const texture = loadBlockTexture()

  const materials = []
  for (let i = 0; i < 6; i++) {
    materials.push(new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9
    }))
  }

  const cubeMesh = new THREE.Mesh(cubeGeometry, materials)

  // 不再创建字母Sprite，只保留图片材质方块

  // 随机位置
  const blockPosition = new THREE.Vector3(
    (Math.random() - 0.5) * 20,
    15,
    (Math.random() - 0.5) * 10
  )
  cubeMesh.position.copy(blockPosition)

  // 随机旋转
  cubeMesh.rotation.set(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  )

  // 随机旋转
  const blockRotation = new THREE.Euler(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  )
  cubeMesh.rotation.copy(blockRotation)

  // 3. 创建透明大方框（比方块稍大，六个面都是该字母）
  const bigFrame = createBigFrameForBlock(letter, blockPosition, blockRotation)

  if (scene) {
    scene.add(cubeMesh)
  }

  return {
    mesh: cubeMesh,
    letter,
    speed: letterSpeed + Math.random() * 0.01,
    hit: false,
    bigFrame: bigFrame // 保存大方框引用
  }
}
    
    // 生成字母方块
    const spawnLetterBlock = () => {
      if (gameState.value !== 'playing') return
      
      const letter = letters[Math.floor(Math.random() * letters.length)]
      const block = createLetterBlock(letter)
      letterBlocks.push(block)
    }
    
// 方块爆炸（含大方框清理）
const explodeLetter = (block) => {
  if (!block || !block.mesh || !scene) return
  
  scene.remove(block.mesh)
  
  // 清理几何体和材质
  if (block.mesh.geometry && typeof block.mesh.geometry.dispose === 'function') {
    block.mesh.geometry.dispose()
  }
  
  // 清理大方框及其资源
  if (block.bigFrame) {
    scene.remove(block.bigFrame.mesh)
    if (block.bigFrame.geometry && typeof block.bigFrame.geometry.dispose === 'function') {
      block.bigFrame.geometry.dispose()
    }
    if (block.bigFrame.materials) {
      block.bigFrame.materials.forEach(mat => {
        if (mat && typeof mat.dispose === 'function') {
          mat.dispose()
        }
      })
    }
    if (block.bigFrame.texture && typeof block.bigFrame.texture.dispose === 'function') {
      block.bigFrame.texture.dispose()
    }
    block.bigFrame = null
  }
  // 注意：底图纹理 blockTexture 是共享的，不在这里释放
}
    
    // 更新游戏逻辑
    const updateGame = () => {
      if (gameState.value !== 'playing') return
      
    // 移动字母方块和大方框
    letterBlocks.forEach((block, index) => {
      if (!block || !block.mesh || block.hit) return
      
      // 移动方块
      block.mesh.position.y -= block.speed
      
      // 同步移动大方框
      if (block.bigFrame && block.bigFrame.mesh) {
        block.bigFrame.mesh.position.y = block.mesh.position.y
        // 保持z轴偏移
        block.bigFrame.mesh.position.z = block.mesh.position.z + 0.1
      }
      
      // 旋转动画
      block.mesh.rotation.x += 0.01
      block.mesh.rotation.y += 0.02
      
      // 同步旋转大方框
      if (block.bigFrame && block.bigFrame.mesh) {
        block.bigFrame.mesh.rotation.x = block.mesh.rotation.x
        block.bigFrame.mesh.rotation.y = block.mesh.rotation.y
      }
      
      // 检查是否落地
        if (block.mesh.position.y < -10) {
          if (scene && block.mesh) {
            scene.remove(block.mesh)
            if (block.mesh.geometry && typeof block.mesh.geometry.dispose === 'function') {
              block.mesh.geometry.dispose()
            }
            // 清理大方框及其资源
            if (block.bigFrame) {
              scene.remove(block.bigFrame.mesh)
              if (block.bigFrame.geometry && typeof block.bigFrame.geometry.dispose === 'function') {
                block.bigFrame.geometry.dispose()
              }
              if (block.bigFrame.materials) {
                block.bigFrame.materials.forEach(mat => {
                  if (mat && typeof mat.dispose === 'function') {
                    mat.dispose()
                  }
                })
              }
              if (block.bigFrame.texture && typeof block.bigFrame.texture.dispose === 'function') {
                block.bigFrame.texture.dispose()
              }
              block.bigFrame = null
            }
            // 底图纹理 blockTexture 是共享的，不在此释放
          }
          letterBlocks.splice(index, 1)
          
          // 失去生命
          lives.value--
          if (lives.value <= 0) {
            endGame()
          }
        }
    })
      
      // 检查按键命中
      keysPressed.value.forEach(key => {
        const upperKey = key.toUpperCase()
        if (!upperKey) return
        
        const targetBlock = letterBlocks.find(block => 
          block && !block.hit && block.letter === upperKey
        )
        
        if (targetBlock) {
          targetBlock.hit = true
          explodeLetter(targetBlock)
          letterBlocks.splice(letterBlocks.indexOf(targetBlock), 1)
          
          // 增加分数
          score.value += 10 * level.value
          
          // 检查升级
          if (score.value > level.value * 100) {
            level.value++
          }
        }
      })
    }
    
    // 渲染循环
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      
      updateGame()
      
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    }
    
    // 开始游戏
    const startGame = () => {
      // 如果是从ready或gameover状态开始新游戏，才重置分数
      if (gameState.value === 'ready' || gameState.value === 'gameover') {
        score.value = 0
        level.value = 1
        lives.value = 3
        letterBlocks.length = 0
      }
      
      gameState.value = 'playing'
      
      // 开始生成字母
      const spawnInterval = setInterval(() => {
        if (gameState.value === 'playing') {
          spawnLetterBlock()
        } else {
          clearInterval(spawnInterval)
        }
      }, 1000 / (spawnRate * 10))
    }
    
    // 结束游戏
    const endGame = () => {
      gameState.value = 'gameover'
    }
    
    // 重新开始游戏
    const restartGame = () => {
      // 清理当前游戏状态
      if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
      
      // 清理所有字母方块
      letterBlocks.forEach(block => {
        if (scene && block && block.mesh) {
          scene.remove(block.mesh)
          if (block.mesh.geometry && typeof block.mesh.geometry.dispose === 'function') {
            block.mesh.geometry.dispose()
          }
          if (block.bigFrame) {
            scene.remove(block.bigFrame.mesh)
            if (block.bigFrame.geometry && typeof block.bigFrame.geometry.dispose === 'function') {
              block.bigFrame.geometry.dispose()
            }
            if (block.bigFrame.materials) {
              block.bigFrame.materials.forEach(mat => {
                if (mat && typeof mat.dispose === 'function') {
                  mat.dispose()
                }
              })
            }
            if (block.bigFrame.texture && typeof block.bigFrame.texture.dispose === 'function') {
              block.bigFrame.texture.dispose()
            }
            block.bigFrame = null
          }
        }
      })
      letterBlocks.length = 0
      keysPressed.value.clear()
      
      // 重置游戏状态
      gameState.value = 'ready'
      score.value = 0
      level.value = 1
      lives.value = 3
    }
    
    // 暂停游戏
    const pauseGame = () => {
      if (gameState.value === 'playing') {
        gameState.value = 'paused'
        if (animationId) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
      }
    }
    
    // 继续游戏
    const resumeGame = () => {
      if (gameState.value === 'paused') {
        gameState.value = 'playing'
      }
    }
    
    // 键盘事件处理
    const handleKeyDown = (event) => {
      event.preventDefault()
      
      const key = event.key.toLowerCase()
      keysPressed.value.add(key)
      
      // 特殊按键
      if (event.key === 'Escape') {
        if (gameState.value === 'playing') {
          gameState.value = 'paused'
        } else if (gameState.value === 'paused') {
          gameState.value = 'playing'
        }
      }
    }
    
    const handleKeyUp = (event) => {
      event.preventDefault()
      const key = event.key.toLowerCase()
      keysPressed.value.delete(key)
    }
    
    // 窗口大小调整
    const handleResize = () => {
      if (!gameCanvas.value || !camera || !renderer) return
      
      const width = gameCanvas.value.clientWidth
      const height = gameCanvas.value.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    
    // 生命周期
    onMounted(() => {
      initGameScene()
      
      // 添加键盘事件监听
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('keyup', handleKeyUp)
      window.addEventListener('resize', handleResize)
    })
    
    onBeforeUnmount(() => {
      // 清理资源
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
      
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      
      // 清理Three.js资源
      letterBlocks.forEach(block => {
  if (scene && block && block.mesh) {
    scene.remove(block.mesh)
    
    // 清理几何体和材质
    if (block.mesh.geometry && typeof block.mesh.geometry.dispose === 'function') {
      block.mesh.geometry.dispose()
    }
    // 清理大方框及其资源
    if (block.bigFrame) {
      scene.remove(block.bigFrame.mesh)
      if (block.bigFrame.geometry && typeof block.bigFrame.geometry.dispose === 'function') {
        block.bigFrame.geometry.dispose()
      }
      if (block.bigFrame.materials) {
        block.bigFrame.materials.forEach(mat => {
          if (mat && typeof mat.dispose === 'function') {
            mat.dispose()
          }
        })
      }
      if (block.bigFrame.texture && typeof block.bigFrame.texture.dispose === 'function') {
        block.bigFrame.texture.dispose()
      }
      block.bigFrame = null
    }
    // 底图纹理 blockTexture 是共享的，不在此释放
  }
})
// 全局共享纹理在应用卸载时不主动 dispose，由浏览器回收
      
      if (renderer) {
        renderer.dispose()
      }
      
      scene = null
      camera = null
      renderer = null
    })
</script>

<style scoped>
.meteor-game-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: url('/quanjingtu/game.png') center center / cover no-repeat;
}

.panorama-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.game-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}

.game-ui {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
}

.game-info {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(255, 255, 255, 0.15);
  padding: 15px;
  border-radius: 10px;
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  pointer-events: auto;

  .game-info .score, .game-info .level, .game-info .lives {
    color: #fff;
    font-size: 18px;
    font-weight: bold;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  }

  .game-controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }

  .game-info .control-btn {
    background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    font-size: 14px;
    border-radius: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
    font-weight: bold;
  }

  .game-info .control-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.6);
  }

  .game-info .control-btn:active {
    transform: translateY(0);
  }

  .game-info .pause-btn {
    background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%);
    box-shadow: 0 2px 10px rgba(245, 87, 108, 0.4);
  }

  .game-info .pause-btn:hover {
    box-shadow: 0 4px 15px rgba(245, 87, 108, 0.6);
  }

  .game-info .resume-btn {
    background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
    box-shadow: 0 2px 10px rgba(79, 172, 254, 0.4);
  }

  .game-info .resume-btn:hover {
    box-shadow: 0 4px 15px rgba(79, 172, 254, 0.6);
  }

  .game-info .restart-btn {
    background: linear-gradient(45deg, #fa709a 0%, #fee140 100%);
    box-shadow: 0 2px 10px rgba(250, 112, 154, 0.4);
  }

  .game-info .restart-btn:hover {
    box-shadow: 0 4px 15px rgba(250, 112, 154, 0.6);
  }

  .game-info .stop-btn {
    background: linear-gradient(45deg, #ff6b6b 0%, #ee5a24 100%);
    box-shadow: 0 2px 10px rgba(255, 107, 107, 0.4);
  }

  .game-info .stop-btn:hover {
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.6);
  }
}

.game-status {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(0, 0, 0, 0.8);
  padding: 40px;
  border-radius: 20px;
  backdrop-filter: blur(15px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  pointer-events: auto;

  h2 {
    color: #fff;
    font-size: 36px;
    margin-bottom: 20px;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
  }

  p {
    color: #ccc;
    font-size: 18px;
    margin-bottom: 15px;
    line-height: 1.5;
  }

  .game-status .start-btn, .game-status .restart-btn {
    background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 15px 30px;
    font-size: 18px;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  }

  .game-status .start-btn:hover, .game-status .restart-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  }
}

.current-target {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 107, 107, 0.9);
  color: white;
  padding: 15px 25px;
  border-radius: 15px;
  font-size: 24px;
  font-weight: bold;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.5);

  .target-key {
    background: rgba(255, 255, 255, 0.2);
    padding: 5px 15px;
    border-radius: 8px;
    margin-left: 10px;
    font-size: 28px;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
  }
}

.controls-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: #ccc;
  padding: 10px 20px;
  border-radius: 8px;
  backdrop-filter: blur(5px);
  font-size: 14px;
  text-align: center;

  p {
    margin: 5px 0;
  }
}

/* 全景图加载样式 */
.panorama-container {
  width: 100%;
  height: 100%;
  background: #000;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 20px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .game-info {
    top: 10px;
    left: 10px;
    padding: 10px;
    
    .score, .level, .lives {
      font-size: 16px;
    }
  }
  
  .current-target {
    top: 10px;
    right: 10px;
    padding: 10px 15px;
    font-size: 18px;
    
    .target-key {
      font-size: 22px;
      padding: 3px 10px;
    }
  }
  
  .game-status {
    padding: 30px 20px;
  }
  
  .game-status h2 {
    font-size: 28px;
  }
  
  .game-status p {
    font-size: 16px;
  }
  
  .start-btn, .restart-btn {
    padding: 12px 24px;
    font-size: 16px;
  }
}
</style>