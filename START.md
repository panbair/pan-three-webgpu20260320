# 快速启动指南

## 环境要求

- Node.js: 18.17.1 (推荐使用 nvm 管理 Node 版本)
- npm: >= 9.0.0

## 安装步骤

### 1. 确保 Node 版本正确

```bash
# 检查当前 Node 版本
node -v

# 如果不是 18.17.1，使用 nvm 切换
nvm use 18.17.1
```

### 2. 安装依赖

```bash
cd demo
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 查看应用

## 可用命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 预览
npm run preview

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 默认账户

用户名: admin
密码: 123456

## 项目特性

- ✅ Vue 3 + TypeScript + Vite
- ✅ Element Plus UI 组件库
- ✅ Pinia 状态管理
- ✅ Vue Router 路由
- ✅ 国际化支持 (中文/英文)
- ✅ 暗黑模式
- ✅ 响应式布局
- ✅ Axios 请求封装
- ✅ UnoCSS 原子化样式

## 目录结构

```
demo/
├── public/              # 静态资源
├── src/
│   ├── api/            # API 接口
│   ├── assets/         # 资源文件
│   ├── components/     # 公共组件
│   ├── config/         # 配置文件
│   ├── hooks/          # 自定义 Hooks
│   ├── i18n/           # 国际化
│   ├── layout/         # 布局组件
│   ├── router/         # 路由配置
│   ├── store/          # 状态管理
│   ├── styles/         # 样式文件
│   ├── types/          # 类型定义
│   ├── utils/          # 工具函数
│   ├── views/          # 页面视图
│   ├── App.vue         # 根组件
│   ├── main.ts         # 入口文件
│   ├── permission.ts   # 路由守卫
│   └── env.d.ts        # 环境类型
├── .env                # 环境变量
├── .eslintrc.cjs       # ESLint 配置
├── .prettierrc         # Prettier 配置
├── .nvmrc              # Node 版本配置
├── index.html          # HTML 模板
├── package.json        # 依赖配置
├── tsconfig.json       # TypeScript 配置
├── uno.config.ts       # UnoCSS 配置
├── vite.config.ts      # Vite 配置
└── README.md           # 项目说明
```

## 常见问题

### 1. 依赖安装失败

如果遇到依赖安装失败，可以尝试：

```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules

# 重新安装
npm install
```

### 2. Node 版本不匹配

确保使用 Node 18.17.1：

```bash
# 安装 nvm（如果还没有）
# Windows: https://github.com/coreybutler/nvm-windows
# macOS/Linux: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装 Node 18.17.1
nvm install 18.17.1

# 切换到 18.17.1
nvm use 18.17.1
```

### 3. 端口被占用

如果 5173 端口被占用，可以在 `.env` 文件中修改：

```bash
VITE_PORT=3000
```

### 4. 样式不生效

确保 SCSS 依赖已正确安装：

```bash
npm install sass --save-dev
```

## 开发建议

1. 使用 TypeScript 的类型检查，避免运行时错误
2. 遵循 Vue 3 Composition API 最佳实践
3. 使用 Pinia 进行状态管理，而不是 Vuex
4. 使用 ESLint 和 Prettier 保持代码风格一致
5. 组件名使用 PascalCase 命名
6. 文件名使用 kebab-case 命名（Vue 文件除外）

## 下一步

- 查看 `src/views/Home/index.vue` 了解页面开发
- 查看 `src/layout/components/` 了解布局组件
- 查看 `src/store/modules/` 了解状态管理
- 查看 `src/router/index.ts` 了解路由配置
- 查看 `src/i18n/` 了解国际化配置
