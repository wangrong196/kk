# DSH Knowledge Workshop 📚

> DeepSeek Harness 知识库工作台插件 — 卡片式 Markdown 笔记管理，支持图片/视频上传、Agent 工具调用、ZIP 导入导出。

## 功能特性

| 功能 | 说明 |
|------|------|
| 📚 左侧栏入口 | 原生 sidebar.panellist 注册，一键打开 |
| 🃏 卡片式列表 | 按分类浏览（项目/代码/设计/产品/学习/生活/其他） |
| 🔍 实时搜索 | 全文搜索，支持分类筛选 |
| ✨ 新建 / ✏️ 编辑 / 🗑️ 删除 | 直接落盘到知识库目录，Markdown 格式 |
| 🖼️ 图片 / 🎬 视频 | 本地文件上传，base64 内联存储到 Markdown |
| 📥 导入 | 单篇 Markdown / JSON，或整库 ZIP |
| 📤 导出 | 单篇或整库 ZIP（含媒体文件） |
| 🤖 Agent 工具 | 9 个知识工具供 AI Agent 调用 |

## 快速开始

### 安装

**Windows (PowerShell):**
```powershell
cd knowledge-workshop-plugin
.\install.ps1
```

**Linux/macOS (Bash):**
```bash
cd knowledge-workshop-plugin
chmod +x install.sh
./install.sh --kb-root "$HOME/.dsh/knowledge"
```

### 在 DSH 中启用

1. 打开 DSH → 设置 → 插件
2. 点击「安装本地插件」，选择 `dsh-knowledge-workshop` 目录
3. 启用插件
4. 刷新 DSH Web GUI 页面

左侧栏出现 📚 图标即安装成功。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `KNOWLEDGE_WORKSHOP_ROOT` | 知识库根目录 | `~/.dsh/knowledge-workshop` |

创建 `.env` 文件或设置系统环境变量可自定义路径。

## Agent 工具

```javascript
knowledge_list({ category: "全部", limit: 50 })
knowledge_get({ id: "项目/xxx-123" })
knowledge_create({ title: "标题", content: "正文", category: "其他" })
knowledge_update({ id: "项目/xxx-123", title: "新标题", content: "新内容" })
knowledge_delete({ id: "项目/xxx-123" })
knowledge_import({ format: "markdown", content: "# 标题\n\n正文" })
knowledge_export({ format: "zip" })
knowledge_search({ query: "关键词", limit: 10 })
knowledge_stats()
```

## 依赖

纯 Node.js 内置模块，无外部 npm 依赖。

## 许可证

本软件为专有软件（Proprietary），仅供个人学习使用。商业授权请联系作者。

See [LICENSE.md](./LICENSE.md)
