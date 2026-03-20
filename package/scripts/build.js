const fs = require('fs')
const path = require('path')

// 源文件路径指向主项目
const sourceCss = path.resolve(__dirname, '../../src/views/animation/animation.css')
const distDir = path.resolve(__dirname, '../dist')

console.log('🚀 Building Universal Animation Library...')
console.log('📂 Source:', sourceCss)
console.log('📂 Dist:', distDir)

// 检查源文件是否存在
if (!fs.existsSync(sourceCss)) {
  console.error('❌ Error: Source file not found:', sourceCss)
  console.error('Please ensure animation.css exists in the main project.')
  process.exit(1)
}

// 读取 CSS 内容
const cssContent = fs.readFileSync(sourceCss, 'utf8')

// 确保输出目录存在
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

console.log('📦 Processing animations...')

// 查找各版本的起始位置
const v1Start = cssContent.indexOf('/* ========================================')
const v2Start = cssContent.indexOf('/*\n * Ultra Animate V2')
const v3Start = cssContent.indexOf('/*\n * Ultra Animate V3')
const v4Start = cssContent.indexOf('/*\n * Ultra Animate V4')
const v5Start = cssContent.indexOf('/*\n * Ultra Animate V5')
const v6Start = cssContent.indexOf('/*\n * Ultra Animate V6')
const v7Start = cssContent.indexOf('/*\n * Ultra Animate V7')

// 提取各版本内容
const v1Content = v2Start !== -1 ? cssContent.substring(v1Start, v2Start) : cssContent
const v2Content = v3Start !== -1 ? cssContent.substring(v2Start, v3Start) :
  v4Start !== -1 ? cssContent.substring(v2Start, v4Start) :
    v5Start !== -1 ? cssContent.substring(v2Start, v5Start) :
      v6Start !== -1 ? cssContent.substring(v2Start, v6Start) :
        v7Start !== -1 ? cssContent.substring(v2Start, v7Start) : ''

const v3Content = v4Start !== -1 ? cssContent.substring(v3Start, v4Start) :
  v5Start !== -1 ? cssContent.substring(v3Start, v5Start) :
    v6Start !== -1 ? cssContent.substring(v3Start, v6Start) :
      v7Start !== -1 ? cssContent.substring(v3Start, v7Start) : ''

const v4Content = v5Start !== -1 ? cssContent.substring(v4Start, v5Start) :
  v6Start !== -1 ? cssContent.substring(v4Start, v6Start) :
    v7Start !== -1 ? cssContent.substring(v4Start, v7Start) : ''

const v5Content = v6Start !== -1 ? cssContent.substring(v5Start, v6Start) :
  v7Start !== -1 ? cssContent.substring(v5Start, v7Start) : ''

const v6Content = v7Start !== -1 ? cssContent.substring(v6Start, v7Start) : cssContent.substring(v6Start)
const v7Content = v7Start !== -1 ? cssContent.substring(v7Start) : ''

// 创建各个版本的文件

// V1
const v1Header = `/*\n * Universal Animation Library - V1 Basic Series\n * 18 basic animations: fade, zoom, rotate, bounce, flash, shake, pulse\n * Version: 1.0.0\n * License: MIT\n */\n\n`
fs.writeFileSync(path.join(distDir, 'v1.css'), v1Header + v1Content)
console.log('✓ Created v1.css (Basic Series - 18 animations)')

// V2
if (v2Content) {
  const v2Header = `/*\n * Universal Animation Library - V2 Super Animation\n * 15 advanced animations: hologram, vortex, sine wave, origami, orbit, kaleidoscope\n * Version: 1.0.0\n * License: MIT\n */\n\n`
  fs.writeFileSync(path.join(distDir, 'v2.css'), v2Header + v2Content)
  console.log('✓ Created v2.css (Super Animation - 15 animations)')
}

// V3
if (v3Content) {
  const v3Header = `/*\n * Universal Animation Library - V3 Surreal Animation\n * 14 surreal animations: wormhole, hologram Pro, quantum entanglement, neural network\n * Version: 1.0.0\n * License: MIT\n */\n\n`
  fs.writeFileSync(path.join(distDir, 'v3.css'), v3Header + v3Content)
  console.log('✓ Created v3.css (Surreal Animation - 14 animations)')
}

// V4
if (v4Content) {
  const v4Header = `/*\n * Universal Animation Library - V4 Creative Interactive\n * 18 interactive animations: magnet, float, wave, elastic pop, focus, draw, prism\n * Version: 1.0.0\n * License: MIT\n */\n\n`
  fs.writeFileSync(path.join(distDir, 'v4.css'), v4Header + v4Content)
  console.log('✓ Created v4.css (Creative Interactive - 18 animations)')
}

// V5
if (v5Content) {
  const v5Header = `/*\n * Universal Animation Library - V5 Extreme Breakthrough\n * 10 extreme animations: extreme vortex, morphing kaleidoscope, aurora phantom\n * Version: 1.0.0\n * License: MIT\n */\n\n`
  fs.writeFileSync(path.join(distDir, 'v5.css'), v5Header + v5Content)
  console.log('✓ Created v5.css (Extreme Breakthrough - 10 animations)')
}

// V6
if (v6Content) {
  const v6Header = `/*\n * Universal Animation Library - V6 Legendary Animation\n * 12 legendary animations: light shadow, space fold, crystal fission\n * Version: 1.0.0\n * License: MIT\n */\n\n`
  fs.writeFileSync(path.join(distDir, 'v6.css'), v6Header + v6Content)
  console.log('✓ Created v6.css (Legendary Animation - 12 animations)')
}

// V7
if (v7Content) {
  const v7Header = `/*\n * Universal Animation Library - V7 Ultimate Animation\n * 16 ultimate animations: liquid, crystal, vortex, ray, fractal, rainbow, bounce, ripple\n * Version: 1.0.0\n * License: MIT\n */\n\n`
  fs.writeFileSync(path.join(distDir, 'v7.css'), v7Header + v7Content)
  console.log('✓ Created v7.css (Ultimate Animation - 16 animations)')
}

// 完整版
const mainHeader = `/*\n * Universal Animation Library - Complete Version\n * 105+ animations across 7 versions\n * V1 Basic, V2 Super, V3 Surreal, V4 Creative, V5 Extreme, V6 Legendary, V7 Ultimate\n * Version: 1.0.0\n * License: MIT\n */\n\n`
fs.writeFileSync(path.join(distDir, 'index.css'), mainHeader + cssContent)
console.log('✓ Created index.css (Complete - 105+ animations)')

// 轻量版（仅 V1）
fs.writeFileSync(path.join(distDir, 'index.lite.css'), v1Header + v1Content)
console.log('✓ Created index.lite.css (Lite Version - V1 only)')

// 创建使用指南
const usageGuide = `# Universal Animation Library - Usage Guide

## Installation

\`\`\`bash
npm install universal-animation-library
\`\`\`

or

\`\`\`bash
yarn add universal-animation-library
\`\`\`

or

\`\`\`bash
pnpm add universal-animation-library
\`\`\`

## Quick Start

### 1. Import the full library (all 105+ animations)

\`\`\`css
@import 'universal-animation-library';
\`\`\`

or

\`\`\`html
<link rel="stylesheet" href="node_modules/universal-animation-library/dist/index.css">
\`\`\`

### 2. Import specific version

\`\`\`css
/* V1 Basic Series (18 animations) */
@import 'universal-animation-library/dist/v1.css';

/* V2 Super Animation (15 animations) */
@import 'universal-animation-library/dist/v2.css';

/* V3 Surreal Animation (14 animations) */
@import 'universal-animation-library/dist/v3.css';

/* V4 Creative Interactive (18 animations) */
@import 'universal-animation-library/dist/v4.css';

/* V5 Extreme Breakthrough (10 animations) */
@import 'universal-animation-library/dist/v5.css';

/* V6 Legendary Animation (12 animations) */
@import 'universal-animation-library/dist/v6.css';

/* V7 Ultimate Animation (16 animations) */
@import 'universal-animation-library/dist/v7.css';
\`\`\`

### 3. Lite version (V1 only, smaller file size)

\`\`\`css
@import 'universal-animation-library/dist/index.lite.css';
\`\`\`

## Usage Examples

### V1 Basic Animations

\`\`\`html
<!-- Need base class + animation class -->
<div class="ua-v1-animated ua-v1-fadeIn">Fade In</div>
<div class="ua-v1-animated ua-v1-bounceIn">Bounce In</div>
<div class="ua-v1-animated ua-v1-zoomIn">Zoom In</div>
<div class="ua-v1-animated ua-v1-rotateIn">Rotate In</div>
\`\`\`

### V2-V6 Animations

\`\`\`html
<div class="ua-v2-animated ua-v2-hologram">Hologram</div>
<div class="ua-v3-animated ua-v3-wormhole">Wormhole</div>
<div class="ua-v4-animated ua-v4-magnetPull">Magnet Pull</div>
<div class="ua-v5-animated ua-v5-extremeVortex">Extreme Vortex</div>
<div class="ua-v6-animated ua-v6-lightShadow">Light Shadow</div>
\`\`\`

### V7 Ultimate Animations

\`\`\`html
<!-- V7 animations don't need base class -->
<div class="ua-v7-liquidIn">Liquid In</div>
<div class="ua-v7-crystalIn">Crystal In</div>
<div class="ua-v7-fractalIn">Fractal In</div>
<div class="ua-v7-rainbowIn">Rainbow In</div>
\`\`\`

## Customization

### Adjust animation duration

\`\`\`css
.ua-v1-animated {
  --ua-v1-duration: 1.5s;
}

.ua-v7-liquidIn {
  --ua-v7-duration-in: 2s;
}
\`\`\`

### Adjust easing function

\`\`\`css
.ua-v1-animated {
  --ua-v1-ease-out: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
\`\`\`

## Available Animations

### V1 Basic (18 animations)
- Fade: fadeIn, fadeOut, fadeInDown, fadeOutDown, fadeInUp, fadeOutUp, fadeInLeft, fadeOutLeft, fadeInRight, fadeOutRight
- Zoom: zoomIn, zoomOut
- Rotate: rotateIn, rotateOut
- Bounce: bounceIn, bounceOut
- Flash: flash
- Shake: shake
- Pulse: pulse

### V2 Super (15 animations)
- hologram, vortexIn, sineWave, origami, orbitIn, kaleidoscope, nebulaExplosion, transformer, tidalWave, magicTransform, dnaHelix, quantumLeap, flameBurst, aurora, blackHole

### V3 Surreal (14 animations)
- wormhole, hologramPro, quantumEntanglement, neuralNetwork, metaverse, vrImmersive, warpDrive, cyberpunk, galaxyVortex, nftReveal, astralProjection, timeTravel, crystalBall, bigBang

### V4 Creative (18 animations)
- magnetPull, floatIn, waveIn, elasticPop, focusIn, drawIn, rotateIn, prismIn, scalePulse, gradientFadeIn, linkIn, flipIn, driftOut, shrinkOut, spiralOut, explodeOut, disintegrateOut

### V5 Extreme (10 animations)
- extremeVortex, morphingKaleidoscope, auroraPhantom, glassShatter, dimensionTransit, liquidMorph, particleReassemble, spiralTime, pixelCollapse, interstellar

### V6 Legendary (12 animations)
- lightShadow, spaceFold, crystalFission, electromagneticStorm, quantumRipples, dimensionGate, auroraSpectrum, stardustAssembly, rainbowFission, lightningPulse, singularityExplosion, deepSpace

### V7 Ultimate (16 animations)
- liquidIn/Out, crystalIn/Out, vortexIn/Out, rayIn/Out, fractalIn/Out, rainbowIn/Out, bounceIn/Out, rippleIn/Out

## Browser Support

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## License

MIT License - Copyright (c) 2025 Universal Animation Library Contributors

## Documentation

For more information, visit: https://github.com/your-username/universal-animation-library
`

fs.writeFileSync(path.join(distDir, 'USAGE.md'), usageGuide)
console.log('✓ Created USAGE.md')

console.log('\n✅ Build complete!')
console.log('\n📦 Output files:')
console.log('  - dist/index.css (All 105+ animations)')
console.log('  - dist/index.lite.css (V1 only - lite version)')
console.log('  - dist/v1.css (V1 Basic - 18 animations)')
console.log('  - dist/v2.css (V2 Super - 15 animations)')
console.log('  - dist/v3.css (V3 Surreal - 14 animations)')
console.log('  - dist/v4.css (V4 Creative - 18 animations)')
console.log('  - dist/v5.css (V5 Extreme - 10 animations)')
console.log('  - dist/v6.css (V6 Legendary - 12 animations)')
console.log('  - dist/v7.css (V7 Ultimate - 16 animations)')
console.log('  - dist/USAGE.md (Usage Guide)')
