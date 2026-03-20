# 星系漩涡特效 (Galaxy Vortex Effect)

基于 `point-effect` 拓展的高级 WebGPU 粒子特效。

## 特性

### 🌌 三层粒子系统
- **星系臂粒子**: 5条螺旋臂，每臂300个粒子，共1500个粒子
- **核心粒子**: 200个金色发光粒子，形成星系核心
- **光晕粒子**: 150个青蓝色大粒子，营造外围光晕

### ✨ 动画效果
- **漩涡运动**: 粒子沿圆形轨道旋转，形成漩涡效果
- **扭曲螺旋**: 星系臂自然扭曲，模拟真实星系
- **脉冲呼吸**: 整体周期性缩放
- **核心光晕**: 核心粒子动态发光
- **颜色变换**: 持续的 HSL 色相变化
- **垂直波动**: 粒子在垂直方向有波浪运动

### 🎨 视觉效果
- **渐变色彩**: 从中心的金黄色到外围的青蓝色
- **自发光材质**: 使用 emissive 属性增强发光感
- **金属质感**: 高金属度，配合环境反射
- **AlphaHash**: 使用 WebGPU 的 alphaHash 特性实现半透明效果

## 使用方法

```typescript
import { galaxyVortexEffect } from '@/effect/galaxy-vortex-effect'

// 创建特效
const cleanup = galaxyVortexEffect(containerElement)

// 组件卸载时清理
onBeforeUnmount(() => {
  cleanup()
})
```

## 配置参数

```typescript
{
  armCount: 5,                  // 星系臂数量 (建议: 3-8)
  particlesPerArm: 300,         // 每臂粒子数 (建议: 100-500)
  coreParticles: 200,           // 核心粒子数 (建议: 100-300)
  haloParticles: 150,           // 光晕粒子数 (建议: 50-200)
  alpha: 0.85,                  // 透明度 (0-1)
  alphaHash: true,              // 启用 alphaHash (性能优化)
  rotationSpeed: 0.0003,        // 整体旋转速度
  autoRotate: true,             // 自动旋转
  ssaaLevel: 2,                 // SSAA 采样级别 (0-4)
  colorShiftSpeed: 0.00015,     // 颜色变化速度
  vortexStrength: 0.8,          // 漩涡强度
  particleSize: 0.15,           // 粒子大小
  coreGlowSpeed: 2.0,           // 核心光晕速度
  armSpread: 0.6,               // 臂扩展度
  armTwist: 3.5,                // 臂扭曲度 (建议: 2-5)
  pulseIntensity: 0.3,         // 脉冲强度 (0-1)
  pulseSpeed: 1.8               // 脉冲速度
}
```

## 更新参数

```typescript
import { galaxyVortexEffectParams, galaxyVortexEffect } from '@/effect/galaxy-vortex-effect'

const cleanup = galaxyVortexEffect(container)

// 更新参数
galaxyVortexEffectParams.rotationSpeed = 0.0005
galaxyVortexEffectParams.colorShiftSpeed = 0.0003
```

## 性能优化

- **实例化渲染**: 使用 InstancedMesh 高效渲染大量粒子
- **SSAA 超采样**: 可调节的抗锯齿级别
- **AlphaHash**: WebGPU 特性，优化半透明渲染
- **批量更新**: 粒子矩阵和颜色批量更新

## 浏览器要求

- Chrome 113+
- Edge 113+
- 需要浏览器支持 WebGPU

## 与 point-effect 的区别

| 特性 | point-effect | galaxy-vortex-effect |
|------|-------------|---------------------|
| 粒子数量 | 500 | 1850 |
| 分布方式 | 螺旋线 | 多层星系结构 |
| 粒子类型 | 单一 | 三种（臂/核心/光晕）|
| 动画复杂度 | 中等 | 高 |
| 视觉效果 | 简洁优雅 | 华丽震撼 |
| 性能消耗 | 低 | 中高 |

## 技术栈

- **Three.js WebGPU**: 现代渲染API
- **GSAP**: 专业动画库
- **InstancedMesh**: 高性能实例化渲染
- **AlphaHash**: WebGPU 半透明优化

## 入场动画

1. 相机平滑滑入
2. 星系臂弹性展开
3. 核心爆发（带弹性效果）
4. 光晕渐入
5. 整体旋转入场
6. 材质淡入

## 颜色方案

- **核心**: 金黄色 (HSL: 0.08-0.2)
- **星系臂**: 渐变蓝紫 (HSL: 0.4-0.8)
- **光晕**: 青蓝色 (HSL: 0.5-0.7)
