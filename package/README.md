# Universal Animation Library

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/universal-animation-library.svg)](https://www.npmjs.com/package/universal-animation-library)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dm/universal-animation-library.svg)](https://www.npmjs.com/package/universal-animation-library)
[![Bundle Size](https://img.shields.io/bundlephobia/min/universal-animation-library)](https://bundlephobia.com/result?p=universal-animation-library)

**🎨 105+ 精心设计的 CSS 动画效果**

[在线演示](#) · [GitHub](https://github.com/your-username/universal-animation-library) · [文档](dist/USAGE.md)

</div>

## ✨ 特性

- 🎨 **105+ 动画效果** - 从基础到终极的完整动画库
- 🚀 **7 个版本系列** - V1 基础到 V7 终极的渐进式学习路径
- 💪 **零依赖** - 纯 CSS 实现，即插即用
- 📱 **响应式设计** - 适配各种屏幕尺寸
- 🎯 **易于使用** - 简洁的 API，只需添加 class
- 🔧 **高度可定制** - 支持自定义时长、缓动函数等
- 🌐 **浏览器兼容** - 支持 Chrome 87+、Firefox 78+、Safari 14+、Edge 88+
- 📦 **模块化导入** - 可按需导入特定版本

## 📦 安装

```bash
npm install universal-animation-library
```

或使用其他包管理器：

```bash
yarn add universal-animation-library
pnpm add universal-animation-library
```

## 🚀 快速开始

### 方式 1: 导入完整库（所有 105+ 动画）

```css
@import 'universal-animation-library';
```

### 方式 2: 导入特定版本

```css
/* V1 基础系列 (18 动画) */
@import 'universal-animation-library/dist/v1.css';

/* V2 超级动画 (15 动画) */
@import 'universal-animation-library/dist/v2.css';

/* V3 超现实动画 (14 动画) */
@import 'universal-animation-library/dist/v3.css';

/* V4 创意互动 (18 动画) */
@import 'universal-animation-library/dist/v4.css';

/* V5 极限突破 (10 动画) */
@import 'universal-animation-library/dist/v5.css';

/* V6 传奇动画 (12 动画) */
@import 'universal-animation-library/dist/v6.css';

/* V7 终极动画 (16 动画) */
@import 'universal-animation-library/dist/v7.css';
```

### 方式 3: 轻量版（仅 V1）

```css
@import 'universal-animation-library/dist/index.lite.css';
```

## 💻 使用示例

### V1 基础动画

```html
<!-- 需要基础类 + 动画类 -->
<div class="ua-v1-animated ua-v1-fadeIn">淡入</div>
<div class="ua-v1-animated ua-v1-bounceIn">弹跳进入</div>
<div class="ua-v1-animated ua-v1-zoomIn">缩放进入</div>
<div class="ua-v1-animated ua-v1-rotateIn">旋转进入</div>
<div class="ua-v1-animated ua-v1-fadeInDown">从上淡入</div>
```

### V2-V6 高级动画

```html
<div class="ua-v2-animated ua-v2-hologram">全息投影</div>
<div class="ua-v3-animated ua-v3-wormhole">虫洞穿越</div>
<div class="ua-v4-animated ua-v4-magnetPull">磁吸进入</div>
<div class="ua-v5-animated ua-v5-extremeVortex">极限漩涡</div>
<div class="ua-v6-animated ua-v6-lightShadow">光影穿梭</div>
```

### V7 终极动画

```html
<!-- V7 动画不需要基础类 -->
<div class="ua-v7-liquidIn">液态进入</div>
<div class="ua-v7-crystalIn">晶体进入</div>
<div class="ua-v7-fractalIn">分形进入</div>
<div class="ua-v7-rainbowIn">彩虹绽放</div>
<div class="ua-v7-rippleIn">波纹扩散</div>
```

## 🎨 自定义配置

### 调整动画时长

```css
.ua-v1-animated {
  --ua-v1-duration: 1.5s;
}

.ua-v7-liquidIn {
  --ua-v7-duration-in: 2s;
}
```

### 调整缓动函数

```css
.ua-v1-animated {
  --ua-v1-ease-out: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.ua-v7-liquidIn {
  --ua-v7-ease-physics: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

## 📋 可用动画列表

### V1 基础系列 (18 个)

**淡入淡出**: fadeIn, fadeOut, fadeInDown, fadeOutDown, fadeInUp, fadeOutUp, fadeInLeft, fadeOutLeft, fadeInRight, fadeOutRight

**缩放**: zoomIn, zoomOut

**旋转**: rotateIn, rotateOut

**弹跳**: bounceIn, bounceOut

**其他**: flash, shake, pulse

### V2 超级动画 (15 个)

hologram, vortexIn, sineWave, origami, orbitIn, kaleidoscope, nebulaExplosion, transformer, tidalWave, magicTransform, dnaHelix, quantumLeap, flameBurst, aurora, blackHole

### V3 超现实动画 (14 个)

wormhole, hologramPro, quantumEntanglement, neuralNetwork, metaverse, vrImmersive, warpDrive, cyberpunk, galaxyVortex, nftReveal, astralProjection, timeTravel, crystalBall, bigBang

### V4 创意互动 (18 个)

magnetPull, floatIn, waveIn, elasticPop, focusIn, drawIn, rotateIn, prismIn, scalePulse, gradientFadeIn, linkIn, flipIn, driftOut, shrinkOut, spiralOut, explodeOut, disintegrateOut

### V5 极限突破 (10 个)

extremeVortex, morphingKaleidoscope, auroraPhantom, glassShatter, dimensionTransit, liquidMorph, particleReassemble, spiralTime, pixelCollapse, interstellar

### V6 传奇动画 (12 个)

lightShadow, spaceFold, crystalFission, electromagneticStorm, quantumRipples, dimensionGate, auroraSpectrum, stardustAssembly, rainbowFission, lightningPulse, singularityExplosion, deepSpace

### V7 终极动画 (16 个)

- **液态**: liquidIn, liquidOut
- **晶体**: crystalIn, crystalOut
- **涡流**: vortexIn, vortexOut
- **光芒**: rayIn, rayOut
- **分形**: fractalIn, fractalOut
- **彩虹**: rainbowIn, rainbowOut
- **弹跳**: bounceIn, bounceOut
- **波纹**: rippleIn, rippleOut

## 🌐 浏览器支持

| Chrome | Firefox | Safari | Edge |
|--------|---------|--------|------|
| >= 87  | >= 78   | >= 14  | >= 88 |

## 📦 包大小

- `index.css` (完整版): ~330 KB
- `index.lite.css` (轻量版): ~30 KB
- `v1.css`: ~30 KB
- `v2.css`: ~50 KB
- `v3.css`: ~45 KB
- `v4.css`: ~60 KB
- `v5.css`: ~40 KB
- `v6.css`: ~50 KB
- `v7.css`: ~55 KB

## 🔗 相关链接

- [在线演示](https://your-username.github.io/universal-animation-library)
- [使用文档](dist/USAGE.md)
- [GitHub 仓库](https://github.com/your-username/universal-animation-library)
- [问题反馈](https://github.com/your-username/universal-animation-library/issues)

## 📝 许可证

[MIT License](LICENSE)

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](../../CONTRIBUTING.md) 了解详情。

---

<div align="center">

Made with ❤️ by Universal Animation Library Contributors

⭐ 如果这个项目对你有帮助，请给我们一个 Star！

</div>
