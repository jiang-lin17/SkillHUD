# 🎯 SkillHUD · Agent 技能抬头显示

> 一个 TRAE Skill — 装上之后 Agent 就能自动扫描所有已安装的 Skill，以玻璃材质面板展示功能和用法。

## ✨ 是什么

SkillHUD **本身就是一个 TRAE Skill**。在 TRAE 里对 Agent 说：

```
skillhud
我的 Skill 列表
dynamic-ui 这个 Skill 怎么用
有哪些开发类 Skill
```

Agent 会：
1. **自动扫描** 项目级 / 插件级 / 内置级 三层 Skill 目录
2. **解析** 每个 SKILL.md 的 YAML frontmatter
3. **合并** `skills.json` 里的 overlay（icon / category / prompts / tips）
4. **渲染** 玻璃材质面板（分类分组 + 搜索 + 展开触发词/贴士）

```
┌─────────────────────────┐
│ 🎯 SkillHUD              │  ← 玻璃材质面板
│ 🔍 搜索 Skill…           │
│ [全部][开发][界面][浏览器]│
│                          │
│ 🛠️ skill-creator   开发   │
│    创建新 Skill…💬        │  ← 点卡片展开
│ 💬 帮我创建一个新 Skill   │  ← 一键复制
│                          │
│ 📊 dynamic-ui      界面   │
│    动态 UI 图表生成…      │
└─────────────────────────┘
```

## 🚀 安装（就像装 Skill 一样）

### Windows

```powershell
mkdir -Force .trae\skills
git clone https://github.com/jiang-lin17/SkillHUD.git .trae\skills\skillhud
```

### macOS / Linux

```bash
mkdir -p .trae/skills
git clone https://github.com/jiang-lin17/SkillHUD.git .trae/skills/skillhud
```

### 验证

在 TRAE 里对 Agent 说 `skillhud`，如果触发面板展示就装好了。

## 📝 自定义：skills.json（Overlay 语义）

`skills.json` 是一个 **overlay**，**只能给已扫描到的 skill 补充字段**。扫描不到的条目**不会**出现在主清单。

```json
{
  "schemaVersion": 1,
  "skills": [
    {
      "name": "dynamic-ui",
      "icon": "📊",
      "category": "界面",
      "prompts": ["画一个柱状图", "帮我做个流程图表"],
      "tips": ["支持 16+ 种图表模板"]
    }
  ],
  "suggested": [
    {
      "name": "申论范文",
      "icon": "📝",
      "category": "公考",
      "_reason": "当前未安装 — 可参考 skill-creator 自建"
    }
  ]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `schemaVersion` | ✅ | 当前固定为 `1` |
| `skills[]` | ✅ | overlay 条目，只对**扫描命中**的 name 生效 |
| `suggested[]` | ❌ | 未安装/推荐条目，仅在「未安装」折叠区展示 |

### description 归属

**以 SKILL.md frontmatter 为准**。`skills.json` 里 `description` 仅作兜底（扫描失败时使用）。

### 优先级

**项目级 > 插件级 > 内置级**。同名 skill 后者被前者覆盖。

## 🎨 独立预览（index.html）

```bash
python -m http.server 8080   # Windows / macOS / Linux 通用
# 浏览器打开 http://localhost:8080
```

玻璃材质 + 紧凑侧边栏风格，纯 HTML + CSS + 原生 JS，零依赖。

## 📂 目录结构

```
SkillHUD/
├── SKILL.md       ⭐ TRAE Skill 核心 — Agent 读到这个就会触发
├── skills.json    ⭐ overlay 配置（编辑这个补充触发词/分类）
├── index.html     独立预览面板（玻璃材质）
├── README.md
├── LICENSE
└── .gitignore
```

## 🛠️ 技术说明

- **扫描逻辑**：SKILL.md 里的 Prompt Engineering 指令，告诉 Agent 用 PowerShell / find 递归扫描三层目录，解析每个 SKILL.md 的 YAML frontmatter
- **路径跨平台**：Windows 用 `%USERPROFILE%` + PowerShell 内联函数，macOS/Linux 用 `~` + find
- **frontmatter 解析**：读首个 `---` 到下一个 `---` 之间的全部行，支持带引号的值
- **渲染**：主路径调用 `dynamic-ui` 的 PureShowWidget 渲染玻璃面板；降级路径输出 Markdown 清单
- **零运行时依赖**：无 npm / 无构建工具

## ⚠️ 已知约束

- **自动读取已装 Skill** 受限于各 Agent 的 Skill 目录结构不同。SkillHUD 是 TRAE 专用，其他 Agent 不支持
- **插件 Skill** 目录深度不一（`plugins/<plugin>/<version>/skills/<name>/SKILL.md`），必须递归扫描
- **SKILL.md 自身不展示** — SkillHUD 是展示者不是被展示者

## 📜 License

MIT — 见 `LICENSE` 文件。
