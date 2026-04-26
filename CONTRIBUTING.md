# Contributing to Tritai 🥋

欢迎为 **Tritai** 做贡献！这是一个致力于解决大语言模型幻觉问题的开源项目，核心通过 **WFGY（伪感知检测）**、**知识图谱验证** 和 **太极推理引擎** 来提升 LLM 输出的可靠性。

## 🚀 快速开始

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/tritai.git
cd tritai
```

### 2. 安装依赖

```bash
npm install
```

### 3. 运行测试

```bash
npm test
```

## 🏗️ 项目结构

```
tritai/
├── core/               # 核心模块
│   ├── wfgy/           # WFGY 伪感知检测引擎
│   ├── knowledge-graph/ # 知识图谱验证
│   └── taiji/          # 太极推理引擎
├── src/                # 源代码
├── bin/                # CLI 工具
├── docs/               # 文档
├── examples/           # 示例代码
└── test-*.js           # 测试文件
```

## 🛠️ 开发流程

### 创建 Issue

在提交代码之前，建议先创建一个 Issue 来讨论你的想法：

- **Bug 报告**：请包含复现步骤、预期行为和实际行为
- **功能请求**：请描述使用场景和期望的效果
- **好问题（Good First Issue）**：查看带有 `good first issue` 标签的 Issue，适合第一次贡献

### 提交 Pull Request

1. 从 `main` 分支创建你的功能分支

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

2. 编写代码并添加测试
3. 确保所有测试通过

```bash
npm test
```

4. 提交你的更改

```bash
git add -A
git commit -m "feat: describe your change"
```

提交信息请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式（不影响代码运行）
- `refactor:` 重构（不是新功能也不是 Bug 修复）
- `test:` 添加或修改测试
- `chore:` 构建过程或辅助工具的变动

5. 推送到你的 Fork 并创建 Pull Request

```bash
git push origin feature/your-feature-name
```

## 📋 编码规范

- 使用 **TypeScript** 编写新代码
- 遵循现有代码风格
- 添加清晰的注释，解释"为什么"而不是"是什么"
- 为新功能编写测试

## 🔍 WFGY 规则贡献

如果你想添加新的 WFGY（伪感知检测）规则：

1. 在 `core/wfgy/` 目录下创建新的规则文件
2. 规则文件应包含：
   - 规则名称和描述
   - 检测逻辑（正则表达式或 AST 分析）
   - 触发条件和严重级别
   - 测试用例
3. 在规则注册表中注册你的规则

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
node test-knowledge-graph.js
node test-integration.js
```

## 💬 讨论

有问题或想法？欢迎：

- 创建 [Issue](https://github.com/xiejianjun000/tritai/issues)
- 参与已有 Issue 的讨论
- 改进文档

## 📜 行为准则

- 尊重所有贡献者
- 建设性地讨论技术问题
- 帮助新手入门

---

感谢你的贡献！每一次 PR 都让 Tritai 变得更好 🎉
