# GPU 粒子群集特效

基于 Three.js WebGPU Compute 的并行粒子群集特效，使用 TSL (Three Shading Language) 在 GPU 上计算粒子行为。

## 特性

- **GPU 并行计算**: 使用 TSL 的 `compute()` 函数在 GPU 上并行计算 2048 个粒子
- **Boids 算法**: 实现经典的分离（Separation）、对齐（Alignment）、凝聚（Cohesion）行为
- **鼠标交互**: 鼠标移动会影响粒子群的运动方向
- **动态几何**: 粒子根据相位动态缩放（呼吸效果）
- **2048 粒子**: 大规模粒子群，性能优异
- **相机运镜**: 多角度自动运镜
- **雾效**: 增加场景深度感

## 技术要点

### GPU Compute Shaders

```typescript
// 使用 TSL 定义 compute 函数
computeVelocity = Fn(() => {
  const birdIndex = instanceIndex.toConst()
  const position = positionStorage.element(birdIndex).toVar()
  const velocity = velocityStorage.element(birdIndex).toVar()

  // 粒子间交互循环
  Loop({ start: uint(0), end: uint(count) }, ({ i }) => {
    // 分离、对齐、凝聚逻辑
  })

  velocityStorage.element(birdIndex).assign(velocity)
})().compute(count)
```

### Boids 行为规则

1. **分离 (Separation)**: 避开距离太近的其他粒子
2. **对齐 (Alignment)**: 与邻近粒子的速度方向对齐
3. **凝聚 (Cohesion)**: 向邻近粒子的中心靠近

### TSL 节点使用

```typescript
import {
  uniform, varying, vec4,
  instancedArray, instanceIndex,
  Fn, If, Loop, Continue,
  normalize, length, dot
} from 'three/tsl'
```

## 参数配置

```typescript
{
  particleCount: 2048,        // 粒子数量
  particleSize: 0.3,          // 粒子大小
  speedLimit: 8.0,            // 速度限制
  bounds: 600,                // 边界范围
  separation: 15.0,           // 分离距离
  alignment: 20.0,            // 对齐距离
  cohesion: 20.0,             // 凝聚距离
  freedom: 0.75,              // 自由度
  baseAlpha: 0.9,             // 透明度
  rotationSpeed: 0.0003,      // 旋转速度
  autoRotate: true
}
```

## 性能优势

- **GPU 加速**: 所有粒子行为在 GPU 上并行计算
- **存储优化**: 使用 `instancedArray` 高效存储粒子数据
- **PBO 支持**: 支持 WebGL2 回退（Pixel Buffer Object）
- **无 CPU 瓶颈**: 粒子行为完全在 GPU 上计算

## 交互方式

- **鼠标移动**: 影响粒子群的运动方向
- **滚轮缩放**: 调整观察距离
- **拖拽旋转**: 改变观察角度

## 视觉效果

- 粒子呈现四面体形状
- 基于位置的颜色渐变（蓝紫色系）
- 动态呼吸缩放效果
- 雾效增强深度感
- 粒子群集自然的群体运动
