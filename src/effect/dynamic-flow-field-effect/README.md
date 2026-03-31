# 动态流场粒子特效

基于 Three.js TSL (Three Shading Language) 创建的流动波浪粒子场特效。

## 特性

- **TSL 材质**: 使用 Three.js TSL 节点着色语言创建动态材质效果
- **流动波浪**: 粒子呈现波浪状流动运动
- **渐变色彩**: 基于位置和时间的动态渐变色
- **流场运动**: 每个粒子有独特的流动偏移和速度
- **2000 粒子**: 网格状分布的粒子阵列
- **相机运镜**: 多角度自动运镜
- **GSAP 动画**: 弹性入场 + 呼吸动画

## 技术要点

### TSL 节点使用

```typescript
import { color, positionWorld, time, sin, cos, mul, add, mix, remapClamp } from 'three/tsl'
```

### 核心算法

1. **波浪计算**: `sin(x * frequency + time) * amplitude`
2. **流动偏移**: 基于粒子的 `flowOffset` 和 `flowSpeed`
3. **渐变色**: 使用 `remapClamp` 将距离映射到色相
4. **动态混合**: `baseColor.mix(waveColor, waveIntensity)`

## 参数配置

```typescript
{
  particleCount: 2000,        // 粒子数量
  particleSize: 0.15,         // 粒子基础大小
  baseSize: 0.3,              // 粒子缩放系数
  alpha: 0.85,               // 透明度
  flowSpeed: 1.0,            // 流动速度
  waveAmplitude: 0.5,        // 波浪振幅
  waveFrequency: 2.0,        // 波浪频率
  rotationSpeed: 0.0005,     // 整体旋转速度
  colorCycleSpeed: 0.0003,   // 颜色循环速度
  updateInterval: 3          // 颜色更新间隔帧数
}
```

## 性能优化

- 使用 `InstancedMesh` 批量渲染
- 预计算 cos/sin 值
- 颜色降频更新（每 3 帧）
- 降低 pixelRatio 到 1.0
- 禁用抗锯齿

## 视觉效果

- 粒子呈网格状分布（20×100 阵列）
- 颜色从青色到紫色渐变
- 波浪状上下浮动
- 整体旋转 + 流场运动
- 相机多角度运镜展示
