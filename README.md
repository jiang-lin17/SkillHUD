# 🎯 SkillHUD · Agent 技能抬头显示

> 一个 TRAE Skill，**装上之后 Agent 就能帮你扫描所有已安装的 Skill，以玻璃材质面板展示功能和用法**。

## ✨ 是什么

SkillHUD 本身就是一个 **TRAE Skill**。像装任何 Skill 一样装上它，然后在 TRAE 里说：

```
skillhud
我有哪些 Skill
列出我的 Skill 列表
dynamic-ui 这个 Skill 怎么用
```

Agent 就会自动：
1. 扫描 `.trae-cn/builtin/global/skills/` 里的所有 Skill
2. 读取每个 SKILL.md 的功能描述
3. 读取你自定义的 `skills.json` 补充触发提示词和分类
4. 输出一个**玻璃材质风格的面板**，清晰展示每个 Skill

```
┌─────────────────────────┐
│ 🎯 SkillHUD              │  ← 玻璃材质面板
│ 🔍 搜索 Skill…           │
│ [全部][公考][开发][界面]  │
│                          │
│ 🛠️ skill-creator   开发   │
│    创建新的 TRAE Skill…   │
│ 💬 帮我创建一个新 Skill   │  ← 点卡片展开触发词
│                          │
│ 📊 dynamic-ui      界面   │
│    生成动态 UI 图表…      │
│ 💬 画一个柱状图           │
└─────────────────────────┘
```

## 🚀 安装（就像装 Skill 一样）

### 方式一：手动安装（推荐）

```bash
# 克隆到 TRAE 的项目级 Skill 目录
# 注意：放在当前项目下 .trae/skills/ 里，该项目专用
# 或者放在 ~/.trae-cn/ 某个全局位置（取决于 TRAE 版本）
cd <你的项目目录>
mkdir -p .trae/skills
git clone https://github.com/jiang-lin17/SkillHUD.git .trae/skills/skillhud
```

### 方式二：复制粘贴（最省事）

直接把仓库里的这两个文件拷贝到**当前项目**的 `.trae/skills/skillhud/` 目录：
- `SKILL.md` ← 核心（必须）
- `skills.json` ← 自定义 Skill 描述（可选，改完记得重启 TRAE 或刷新）

### 验证安装

在 TRAE 里对 Agent 说：
```
skillhud
```
如果触发了面板展示，说明装好了！

## 📝 自定义 Skill 描述

编辑 `skills.json`，补充每个 Skill 的**触发提示词**和**使用贴士**：

```json
{
  "skills": [
    {
      "name": "dynamic-ui",
      "icon": "📊",
      "category": "界面",
      "prompts": ["画一个柱状图", "帮我做个流程图表"],
      "tips": ["支持 16+ 种图表模板"]
    }
  ]
}
```

SKILL.md 会自动扫描 TRAE 内置 Skill（从 `SKILL.md` 的 YAML frontmatter 里读 name/description），`skills.json` 用来**补充**：
- 🏷️ 分类标签（自动分组）
- 💬 用户友好的触发提示词
- 💡 使用贴士

## 🎨 独立预览（浏览器打开 index.html）

```bash
# 启动本地服务
python -m http.server 8080
# 浏览器访问
open http://localhost:8080
```

直接打开 `index.html` 也能看（但加载 `skills.json` 可能有 CORS 限制）。这是一份**纯展示面板**，玻璃材质 + 紧凑侧边栏风格，让你预览效果。

## 📂 目录结构

```
SkillHUD/
├── SKILL.md       ⭐ TRAE Skill 核心 — Agent 读到这个就会触发面板
├── skills.json    ⭐ 你的 Skill 描述库（编辑这个）
├── index.html     独立预览面板（浏览器直接打开）
└── README.md      本文件
```

## ⌨️ 使用

安装后在 TRAE 里对 Agent 说：

| 你说的 | Agent 做的 |
|--------|-----------|
| `skillhud` | 展示完整 Skill 清单（玻璃面板风格） |
| `我的 Skill 列表` | 同上 |
| `dynamic-ui 怎么用` | 定位到该 Skill，读取完整 SKILL.md 并提炼成使用指南 |
| `有哪些公考类 Skill` | 按分类过滤后展示 |

## 🛠️ 技术说明

- **Skill 扫描逻辑**：SKILL.md 里的 Prompt Engineering 指令告诉 Agent 如何用 PowerShell 扫描 `.trae-cn/builtin/global/skills/` 目录、解析每个 SKILL.md 的 YAML frontmatter
- **合并策略**：先扫描系统 Skill，再合并 `skills.json` 里的补充信息
- **零外部依赖**：SKILL.md 不依赖任何第三方库，纯 Prompt Engineering

## 📜 License

MIT
