# 🎯 SkillHUD · Agent 技能抬头显示

> 一个 Chrome 扩展，像**抬头显示器**一样贴在 Agent 网页边上——你装了哪些 Skill、功能是啥、怎么触发，一眼全看到。

## ✨ 是什么

打开任意 Agent 网页（TRAE、Claude.ai、Kimi、豆包、Copilot Chat…），页面右侧会出现一个 **"SKILLHUD"竖条小按钮** → 点一下展开紧凑侧边面板，里面就是你的 Skill 清单。

```
┌─────────────┐  ┌───────────────────┐
│   你的 Agent   │  │ 🎯 SkillHUD        │
│   对话界面     │  │ 🔍 搜索 Skill…     │
│              │  │ [全部][公考][开发] │
│   👈 主要区域   │  │ 📝 申论范文    公考 │
│              │  │    范文生成…💬       │
│              │  │ 🧠 公基速记    公考 │
│              │  │  ⋯ 点击看详情⋯      │
│              │  └───────────────────┘
└─────────────┘         ⬆ 280px 紧凑
```

## ✅ 特性

| 特性 | 说明 |
|------|------|
| 🔌 **Chrome 扩展** | Manifest V3，安装即用，贴在任何网页边上 |
| 🪶 **零侵入** | Shadow DOM 隔离，不影响宿主页面任何样式和脚本 |
| 🎛️ **紧凑面板** | 280px 宽，可折叠、可拖拽、可换边 |
| 🔍 **搜索 + 分类** | 秒搜 + 分类 Tab |
| 📋 **一键复制** | 提示词点一下就复制到剪贴板 |
| 🌓 **明暗主题** | 自动跟随系统 / 手动切换 |
| ⌨️ **快捷键** | `Ctrl/Cmd + Shift + H` 切换面板、`Esc` 收起 |
| 💾 **自动记忆** | 位置、主题、展开状态全部本地保存 |

## 🚀 安装

### 方法一：加载已解压的扩展（推荐开发者）

1. **下载/克隆** 本仓库
2. 打开 Chrome，访问 `chrome://extensions/`
3. 右上角开启 **开发者模式**
4. 点 **加载已解压的扩展程序** → 选择 `SkillHUD` 文件夹
5. 打开任意网页（比如 https://trae.ai / https://claude.ai / https://kimi.moonshot.cn 等）
6. 页面右边中间会出现一个 **"SKILLHUD"竖条** → 点它！

### 方法二：发布后安装（将来）

上架 Chrome Web Store 后直接点"添加至 Chrome"。

## 📝 自定义你的 Skill

**编辑一个文件就够了**：`skills.json`

```json
{
  "skills": [
    {
      "name": "我的新技能",
      "icon": "🚀",
      "category": "效率",
      "description": "一句话说清楚它能干嘛",
      "prompts": ["帮我做 XXX", "换个方式做 YYY"],
      "tips": ["贴士一", "贴士二"]
    }
  ]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | ✅ | Skill 显示名称 |
| `icon` | ❌ | emoji 图标，默认 ⚡ |
| `category` | ❌ | 分类标签，相同分类自动分组 |
| `description` | ✅ | 功能一句话描述 |
| `prompts` | ❌ | 触发提示词数组，点卡片可一键复制 |
| `tips` | ❌ | 使用小贴士数组 |

### 改完怎么生效

`chrome://extensions/` → SkillHUD 那张卡片上点 **🔄 刷新**（或者点扩展图标里的刷新按钮）。

## 📁 目录结构

```
SkillHUD/
├── manifest.json     # Chrome 扩展配置（Manifest V3）
├── content.js        # 注入脚本 + 完整面板逻辑（约 500 行，零依赖）
├── skills.json       # ⭐ 你的 Skill 配置（编辑这个）
├── icons/            # 扩展图标
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

**没有 node_modules，没有构建，没有打包工具。** 纯原生 JS + Shadow DOM。

## 🛠️ 技术亮点

- **Shadow DOM**：所有样式和 DOM 节点完全隔离，不被宿主页面污染
- **pointer-events 分层**：宿主容器 `pointer-events: none`，只有面板区域 `pointer-events: auto`——面板外的页面正常点击穿透
- **极简 YAML → 改成 JSON 了**：直接 fetch 内置 JSON 配置，避免 YAML 解析器的复杂性
- **position: fixed + transform**：面板绝对定位 + 拖拽移动，百分比存储位置，响应式自适应窗口缩放

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl / Cmd + Shift + H` | 切换面板展开/收起 |
| `Esc` | 收起面板 |
| 点击浮动竖条 | 展开面板 |
| 拖拽面板头部 | 移动面板位置 |
| 面板头部 ⇄ 按钮 | 切换到另一边 |
| 面板头部 🌓 按钮 | 切换主题（自动/浅色/深色） |

## 💡 典型使用场景

- **贴在 Agent 对话页边上** — 边聊边看提示词，不用切窗口
- **学习阶段** — 展开面板对照着试各种 Skill
- **团队共享** — 把 `skills.json` 发群里，大家用同款面板
- **新人入门** — 给新同事装一个，快速知道团队 Agent 有啥能力

## 🤔 常见问题

**Q: 为什么不能自动读取我在 TRAE/Claude 里装的 Skill？**  
每个 Agent 生态的 Skill 格式和存储方式完全不同（有的在本地配置，有的是 prompt templates，有的根本不叫 Skill），**统一自动发现不可行**。但手动配置一份 `skills.json` 只需要几分钟，而且你能完全掌控展示哪些 Skill。

**Q: 面板位置记不住？**  
拖拽面板头部到你喜欢的位置，刷新页面/重启浏览器都能记住。位置、主题、展开状态全部存在 `localStorage`。

**Q: 支持 Safari/Firefox/Edge？**  
- Edge：完全兼容（同 Chromium）
- Firefox：需要把 Manifest V3 改成 Firefox MV3 格式，主要是权限声明方式略有不同
- Safari：需要用 Safari Web Extension Converter 转换

## 📜 License

MIT — 随便改、随便用。
