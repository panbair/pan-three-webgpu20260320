# 贡献指南

感谢您对 Universal Animation Library 的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告问题

如果您发现了 bug 或有新的功能建议，请：

1. 在 [Issues](../../issues) 中搜索是否已有相关问题
2. 如果没有，创建一个新的 Issue，包含：
   - 清晰的标题和描述
   - 复现步骤（如果是 bug）
   - 预期行为和实际行为
   - 截图或代码示例（如果适用）

### 提交代码

#### 开发环境设置

```bash
# 1. Fork 本仓库到您的 GitHub 账户
# 2. Clone 您的 fork
git clone https://github.com/your-username/animation-library.git

# 3. 安装依赖
npm install

# 4. 启动开发服务器
npm run dev
```

#### 分支策略

- `main` - 主分支，用于生产环境
- `develop` - 开发分支
- `feature/*` - 新功能分支
- `fix/*` - bug 修复分支
- `docs/*` - 文档更新分支

#### 提交规范

提交信息请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型说明：
- `feat`: 新功能
- `fix`: bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行的变动）
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(animation): 添加 V8 系列动画

新增 10 个 V8 动画效果，包括宇宙、维度等主题

Closes #123
```

#### Pull Request 流程

1. 从 `main` 分支创建新分支
2. 进行开发并提交代码
3. 推送到您的 fork 仓库
4. 在 GitHub 上创建 Pull Request
5. 等待代码审查

PR 标题应遵循相同的提交规范，描述中应：
- 说明这个 PR 的目的
- 关联相关的 Issue（如 `Closes #123`）
- 如果有破坏性变更，清楚说明
- 添加截图或演示（如果是 UI 变更）

#### 代码规范

提交前请确保：

```bash
# 运行代码检查
npm run lint

# 运行代码格式化
npm run format

# 运行类型检查
npm run build
```

## 开发指南

### 添加新动画

1. 在 `src/views/animation/animation.css` 中添加动画定义
2. 遵循现有的命名规范 `ua-v[version]-[animationName]`
3. 在 `src/views/animation/index.vue` 中添加对应的选项
4. 更新 README.md 中的动画列表

### 项目结构

```
src/
├── views/
│   └── animation/
│       ├── index.vue        # 动画演示组件
│       └── animation.css    # 动画样式定义
├── router/                  # 路由配置
├── store/                   # 状态管理
└── utils/                   # 工具函数
```

### 编码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 和 Prettier 配置
- 组件使用 PascalCase 命名
- CSS 类名使用 kebab-case 命名

## 社区

- GitHub Issues: 报告问题和功能请求
- Discussions: 技术讨论和问答

## 行为准则

- 尊重所有贡献者
- 建设性地接受和提供反馈
- 关注问题本身，而非个人
- 对所有人保持友善和专业

再次感谢您的贡献！
