# 星云云雾特效 - 参数配置说明

## 参数概览

所有配置参数都在 `nebulaCloudEffectParams` 对象中，可以直接修改以调整特效效果。

### 快速配置示例

```typescript
// 高性能配置（低端设备）
nebulaCloudEffectParams.particleCount = 500      // 减少粒子数量
nebulaCloudEffectParams.updateInterval = 6        // 降低颜色更新频率
nebulaCloudEffectParams.resizeDebounceDelay = 200 // 增加防抖延迟

// 高质量配置（高端设备）
nebulaCloudEffectParams.particleCount = 3000     // 增加粒子数量
nebulaCloudEffectParams.alpha = 0.85             // 提高透明度
nebulaCloudEffectParams.updateInterval = 2        // 提高颜色更新频率

// 交互增强配置
nebulaCloudEffectParams.interactionRadius = 25     // 扩大交互范围
nebulaCloudEffectParams.interactionStrength = 3.0  // 增强交互力度
nebulaCloudEffectParams.gravityMode = 'repel'     // 改为斥力模式

// 巨型星云配置
nebulaCloudEffectParams.particleCount = 2500
nebulaCloudEffectParams.nebulaSize = 20          // 扩大星云范围
nebulaCloudEffectParams.particleSize = 0.15       // 增大粒子
```

---

## 详细参数说明

### 1. 粒子数量与大小

#### `particleCount` (默认: 1500)
- **作用**: 控制星云中的总粒子数量
- **影响范围**: 100 - 10000
- **性能影响**: ⭐⭐⭐⭐⭐（极高）
- **效果说明**:
  - 粒子总数会自动按以下比例分配到三层：
    - 核心层 (CORE): 25% → 375 粒子
    - 内层 (INNER): 40% → 600 粒子
    - 外层 (OUTER): 35% → 525 粒子
- **推荐值**:
  - 低端设备: 300-800
  - 中端设备: 800-2000
  - 高端设备: 2000-5000

#### `particleSize` (默认: 0.12)
- **作用**: 基础粒子大小
- **影响范围**: 0.05 - 0.5
- **效果说明**:
  - 核心层: `particleSize × 2`
  - 内层: `particleSize × 1.5`
  - 外层: `particleSize × 1`
- **推荐值**:
  - 精细效果: 0.08-0.12
  - 豪华效果: 0.12-0.2
  - 巨型效果: 0.2-0.5

---

### 2. 外观效果

#### `alpha` (默认: 0.75)
- **作用**: 整体透明度
- **影响范围**: 0.0 - 1.0
- **性能影响**: ⭐⭐⭐（中）
- **效果说明**:
  - 0.3-0.5: 非常稀薄，适合背景
  - 0.5-0.75: 中等密度，推荐值
  - 0.75-1.0: 浓密，可能遮挡

#### `alphaHash` (默认: true)
- **作用**: 是否启用透明度抖动（提升混合效果）
- **性能影响**: ⭐⭐（低）
- **效果说明**:
  - true: 更平滑的透明过渡
  - false: 较锐利的边缘，性能稍好

#### `nebulaSize` (默认: 12)
- **作用**: 星云整体范围大小
- **影响范围**: 5 - 30
- **效果说明**:
  - 核心层半径: `nebulaSize × 0.25` = 3
  - 内层半径: `nebulaSize × 0.5` = 6
  - 外层半径: `nebulaSize × 0.8` = 9.6
- **推荐值**:
  - 小型: 5-8
  - 中型: 8-15
  - 大型: 15-25

---

### 3. 运动控制

#### `rotationSpeed` (默认: 0.00015)
- **作用**: 整体旋转速度
- **影响范围**: 0 - 0.001
- **效果说明**:
  - 0: 不旋转
  - 0.00005: 慢速旋转
  - 0.00015: 中速旋转（默认）
  - 0.0005: 快速旋转

#### `autoRotate` (默认: true)
- **作用**: 是否自动旋转
- **性能影响**: ⭐（极低）
- **效果说明**:
  - true: 三层以不同速度旋转
  - false: 静态，只有粒子运动

#### `colorCycleSpeed` (默认: 0.00025)
- **作用**: 颜色循环速度
- **影响范围**: 0 - 0.001
- **效果说明**:
  - 0: 颜色不变
  - 0.0001: 慢速变色
  - 0.00025: 中速变色（默认）
  - 0.0005: 快速变色

#### `flowSpeed` (默认: 1.2)
- **作用**: 粒子流动速度
- **影响范围**: 0.5 - 3.0
- **效果说明**: 控制粒子在轨道上的运动速度

#### `pulseSpeed` (默认: 1.8)
- **作用**: 脉冲缩放速度
- **影响范围**: 0.5 - 5.0
- **效果说明**: 粒子呼吸效果的频率

---

### 4. 交互效果

#### `interactionRadius` (默认: 15)
- **作用**: 鼠标交互影响半径
- **影响范围**: 5 - 50
- **性能影响**: ⭐⭐⭐⭐（高）
- **效果说明**:
  - 越大，鼠标影响的范围越广
  - 推荐值: 10-20

#### `interactionStrength` (默认: 2.0)
- **作用**: 交互强度
- **影响范围**: 0.5 - 5.0
- **效果说明**:
  - 越大，鼠标对粒子的推拉越强
  - 推荐值: 1.5-3.0

#### `gravityMode` (默认: 'attract')
- **作用**: 引力/斥力模式
- **可选值**:
  - `'attract'`: 引力模式（粒子被吸引到鼠标）
  - `'repel'`: 斥力模式（粒子被推开）

---

### 5. 光照

#### `lightingIntensity` (默认: 1.5)
- **作用**: 光照强度
- **影响范围**: 0.5 - 3.0
- **效果说明**:
  - 越高，粒子越亮
  - 推荐值: 1.0-2.0

---

### 6. 性能优化

#### `updateInterval` (默认: 4)
- **作用**: 颜色更新间隔帧数
- **影响范围**: 1 - 10
- **性能影响**: ⭐⭐⭐⭐（高）
- **效果说明**:
  - 1: 每帧更新（最流畅，最耗性能）
  - 2-4: 平滑（推荐）
  - 6-8: 略微卡顿，但性能好
  - 10: 明显卡顿，但性能最佳

#### `resizeDebounceDelay` (默认: 100)
- **作用**: 窗口调整防抖延迟（毫秒）
- **影响范围**: 50 - 500
- **性能影响**: ⭐⭐（中）
- **效果说明**:
  - 防抖期间的所有调整会被合并
  - 延迟越大，性能越好，但响应越慢

---

## 性能调优指南

### 低端设备（≤ 4GB 内存，集成显卡）
```typescript
nebulaCloudEffectParams.particleCount = 500
nebulaCloudEffectParams.particleSize = 0.1
nebulaCloudEffectParams.alpha = 0.7
nebulaCloudEffectParams.updateInterval = 6
nebulaCloudEffectParams.interactionRadius = 10
```

### 中端设备（8GB 内存，独立显卡）
```typescript
nebulaCloudEffectParams.particleCount = 1500
nebulaCloudEffectParams.particleSize = 0.12
nebulaCloudEffectParams.alpha = 0.75
nebulaCloudEffectParams.updateInterval = 4
nebulaCloudEffectParams.interactionRadius = 15
```

### 高端设备（16GB+ 内存，高端显卡）
```typescript
nebulaCloudEffectParams.particleCount = 3000
nebulaCloudEffectParams.particleSize = 0.15
nebulaCloudEffectParams.alpha = 0.85
nebulaCloudEffectParams.updateInterval = 2
nebulaCloudEffectParams.interactionRadius = 20
```

---

## 常见问题

### Q: 为什么修改 `particleCount` 没有效果？
A: 现在已经修复！修改后会自动按 25%:40%:35% 分配到三层。

### Q: 粒子太多导致卡顿怎么办？
A:
1. 降低 `particleCount` 到 500-800
2. 增加 `updateInterval` 到 6-8
3. 减小 `interactionRadius`
4. 关闭 `alphaHash`

### Q: 如何让星云更密集？
A:
1. 增加 `particleCount`
2. 减小 `nebulaSize`
3. 增加 `alpha` 值

### Q: 如何让星云更大？
A:
1. 增加 `nebulaSize`
2. 增加 `particleSize`
3. 增加 `nebulaSize` 的同时也要增加 `particleCount` 以保持密度

### Q: 交互效果不明显？
A:
1. 增加 `interactionRadius`
2. 增加 `interactionStrength`
3. 切换 `gravityMode` 到 'repel' 测试

---

## 更新日志

### v2.0 (2025-03-20)
- ✅ 修复 `particleCount` 参数不生效的问题
- ✅ 修复 `particleSize` 参数不生效的问题
- ✅ 修复 `nebulaSize` 参数不生效的问题
- ✅ 所有参数现在都能正确生效
- ✅ 性能优化：减少对象创建、预计算常量
- ✅ 添加窗口调整防抖
- ✅ 改进代码结构和类型安全
