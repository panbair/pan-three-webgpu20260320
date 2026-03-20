# 🔍 全景图调试指南

## 🚨 问题: 浏览器看不到内容

### 🔍 诊断步骤

#### 1. 访问测试页面
```
http://localhost:5174/test
```

测试页面会自动测试不同的图片路径，找出正确的路径。

#### 2. 检查浏览器控制台
按 `F12` 打开开发者工具，查看 Console 标签页：

**正常输出应该是:**
```
测试页面已挂载
Home 页面已挂载
PanoramaViewer: 初始化开始
PanoramaViewer: 图片路径: /src/assets/quanjingtu/home.png
PanoramaViewer: 容器尺寸 1920 1080
```

**如果有错误，请查看:**
- 红色的错误信息
- 网络请求是否失败
- 404 错误（文件找不到）

#### 3. 检查网络请求
在开发者工具中，转到 Network 标签页：

- 查找 `.png` 文件
- 检查状态码（200 = 成功，404 = 未找到）
- 检查文件大小（应该是 ~3.89MB）

### 🛠️ 常见问题和解决方案

#### 问题 1: 图片路径错误

**症状:**
```
GET http://localhost:5174/src/assets/quanjingtu/home.png 404 (Not Found)
```

**解决方案:**

1. **使用 Vite 的静态资源导入**
```typescript
// ✅ 正确方式
import panoramaImage from '@/assets/quanjingtu/home.png'

// ❌ 错误方式
const panoramaImage = '/src/assets/quanjingtu/home.png'
```

2. **检查文件是否存在**
```
src/assets/quanjingtu/home.png
```

3. **尝试不同路径**
```typescript
// 方案 1: 使用 @ 别名
import image from '@/assets/quanjingtu/home.png'

// 方案 2: 使用相对路径
import image from '../assets/quanjingtu/home.png'

// 方案 3: 使用 public 目录
// 将图片放到 public/assets/quanjingtu/home.png
// 然后使用 '/assets/quanjingtu/home.png'
```

#### 问题 2: Three.js 未正确初始化

**症状:**
```
PanoramaViewer: containerRef 为空
```

**解决方案:**

1. **检查 DOM 是否已挂载**
```typescript
onMounted(() => {
  // 确保 DOM 已准备好
  nextTick(() => {
    initThree()
  })
})
```

2. **检查容器尺寸**
```typescript
const width = containerRef.value?.clientWidth || 0
const height = containerRef.value?.clientHeight || 0

if (width === 0 || height === 0) {
  console.error('容器尺寸为 0')
  return
}
```

#### 问题 3: WebGL 不支持

**症状:**
```
WebGL is not supported
```

**解决方案:**

1. **检查浏览器 WebGL 支持**
访问: `https://webglreport.com/`

2. **启用硬件加速**
- Chrome: 设置 → 系统 → 使用硬件加速
- Firefox: 选项 → 常规 → 性能 → 勾选"使用推荐的性能设置"

3. **更新显卡驱动**
- NVIDIA GeForce: https://www.nvidia.com/Download/index.aspx
- AMD: https://www.amd.com/en/support
- Intel: https://www.intel.com/content/www/us/en/download-center/home.html

#### 问题 4: 路由问题

**症状:**
```
Cannot read properties of null (reading 'ce')
```

**解决方案:**

这个错误已经在最新版本中修复。如果仍然出现：

1. **检查路由配置**
```typescript
// src/router/index.ts
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/views/Home/index.vue'),
  }
]
```

2. **确保 App.vue 正确**
```vue
<template>
  <router-view />
</template>
```

### 🧪 测试工具

#### 使用测试页面

访问 `http://localhost:5174/test` 可以:

1. ✅ 测试不同的图片路径
2. ✅ 显示 Three.js 版本
3. ✅ 显示容器尺寸
4. ✅ 测试图片加载
5. ✅ 显示加载进度
6. ✅ 错误诊断

#### 手动测试

```javascript
// 在浏览器控制台运行

// 1. 测试图片路径
const testImage = new Image()
testImage.onload = () => console.log('图片加载成功')
testImage.onerror = () => console.error('图片加载失败')
testImage.src = '/src/assets/quanjingtu/home.png'

// 2. 测试 WebGL
const canvas = document.createElement('canvas')
const gl = canvas.getContext('webgl2')
if (gl) {
  console.log('WebGL 2.0 支持')
} else {
  console.log('WebGL 2.0 不支持')
}

// 3. 测试 Three.js
import * as THREE from 'three'
console.log('Three.js 版本:', THREE.REVISION)
```

### 📋 调试清单

- [ ] 开发服务器正在运行 (`http://localhost:5174/`)
- [ ] 没有控制台错误
- [ ] 图片文件存在 (`src/assets/quanjingtu/home.png`)
- [ ] 图片大小正确 (~3.89MB)
- [ ] WebGL 支持已启用
- [ ] 硬件加速已开启
- [ ] 浏览器已更新到最新版本
- [ ] 容器尺寸不为 0
- [ ] `PanoramaViewer` 组件已正确导入
- [ ] 图片路径使用 Vite 导入方式

### 🚀 快速修复

如果仍然看不到内容，尝试以下步骤:

1. **清除浏览器缓存**
   - Ctrl + Shift + Delete
   - 选择"缓存的图片和文件"
   - 点击"清除数据"

2. **重启开发服务器**
   ```bash
   # 停止服务器 (Ctrl + C)
   npm run dev
   ```

3. **使用测试页面**
   ```
   http://localhost:5174/test
   ```

4. **检查网络请求**
   - 打开开发者工具 (F12)
   - 转到 Network 标签
   - 刷新页面
   - 查找图片请求

### 📞 获取帮助

如果以上步骤都没有解决问题，请提供以下信息:

1. 浏览器控制台的完整错误信息
2. Network 标签页中图片请求的状态
3. `http://localhost:5174/test` 测试页面的结果
4. 浏览器版本和操作系统
5. WebGL 支持情况 (访问 `https://webglreport.com/`)

---

**最后更新**: 2025-03-19
**状态**: 调试工具已就绪
