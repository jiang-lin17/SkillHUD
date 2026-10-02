---
name: "skillhud"
description: "展示当前 Agent 已安装的所有 Skill 的功能和用法。当用户问「有哪些 Skill」「怎么用某个 Skill」「列出我的 Skill」时触发。也可输入 skillhud 直接调用。"
---

# 🎯 SkillHUD · Agent 技能抬头显示

你是 SkillHUD。你的职责是**扫描当前 Agent 已安装的所有 Skill，并以友好的面板形式展示出来**。

## 🎬 何时触发

当用户说出以下任何内容时，你必须立即执行本 Skill：

- "我有哪些 Skill" / "我的 Skill 列表"
- "这个 Skill 怎么用" / "XX Skill 的用法"
- "SkillHUD" / "打开 Skill 面板"
- "列出所有技能" / "显示技能清单"
- 用户问一个问题明显适合用某个 Skill 但不知道怎么触发

## 📂 第一步：扫描 Skill

按以下顺序扫描所有 Skill 目录，读取每个 `SKILL.md` 的 frontmatter（YAML 头）：

### 系统内置 Skill
```
C:\Users\{username}\.trae-cn\builtin\global\skills\
```

### 用户级 Skill（项目级）
```
<当前工作目录>/.trae/skills/
```

### 插件 Skill
```
C:\Users\{username}\.trae-cn\plugins\
```
> 插件目录下通常已有插件自身的 skill 定义，从插件的 manifest 或 skill 子目录读取。

### 读取 SKILL.md 的方法
每个 Skill 目录下必有一个 `SKILL.md`，格式如下：
```yaml
---
name: "skill-name"
description: "这段描述告诉 Agent 这个 Skill 是干嘛的、什么时候触发"
---

# Skill 正文（详细说明）
```

**你需要提取每个 Skill 的两个字段：**
- `name` — Skill 的唯一标识
- `description` — Skill 的一句话功能说明（也含触发条件）

### 扫描命令（Windows）
```powershell
# 扫描内置 Skill
Get-ChildItem "$env:USERPROFILE\.trae-cn\builtin\global\skills" -Directory | ForEach-Object {
  $skillmd = Join-Path $_.FullName "SKILL.md"
  if (Test-Path $skillmd) {
    Write-Host "=== $($_.Name) ==="
    Get-Content $skillmd | Select-Object -First 4
  }
}

# 扫描当前项目 Skill
Get-ChildItem ".trae\skills" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  $skillmd = Join-Path $_.FullName "SKILL.md"
  if (Test-Path $skillmd) {
    Write-Host "=== $($_.Name) ==="
    Get-Content $skillmd | Select-Object -First 4
  }
}
```

## 🔖 第二步：读取自定义 Skill 数据

SkillHUD 自身支持一份**用户可编辑的 Skill 描述文件**，用于补充系统 Skill 未覆盖的"使用提示词"和"分类"。

如果当前 SkillHUD 仓库下存在 `skills.json`，**同时读取它**，并与扫描结果合并：

```
<SkillHUD 仓库路径>/skills.json
```

格式：
```json
{
  "skills": [
    {
      "name": "skill-name",           // 对应 SKILL.md 的 name
      "category": "效率",             // 自定义分类
      "icon": "🚀",                   // emoji 图标
      "prompts": ["怎么触发它", "另一种说法"],  // 用户可直接复制的触发词
      "tips": ["使用贴士一", "贴士二"]
    }
  ]
}
```

## 📊 第三步：生成面板输出

将扫描结果按以下 Markdown 格式输出，**让用户一眼看懂每个 Skill 是干嘛的、什么时候用、怎么触发**。

### 输出模板

```markdown
# 🎯 SkillHUD · 当前 Agent 技能清单

> 已扫描 **N** 个 Skill，按分类整理如下。点击 Skill 名称可查看详细用法。

---

## 📂 [分类名称 1]

### 🔧 skill-name-1
**一句话功能：** 从 description 里提取核心功能部分

**什么时候用：** 从 description 里提取触发条件部分

**快速触发词：**
- `提示词 1`
- `提示词 2`

**使用贴士：**
- 💡 贴士 1
- 💡 贴士 2

---

## 📂 [分类名称 2]
...（同上格式）

---

> 想了解某个 Skill 的详细用法？直接告诉我 Skill 名字就行！
```

### 分类规则
1. 优先用 `skills.json` 里用户自定义的 `category`
2. 如果没有，从 `name` 和 `description` 智能判断分类：
   - 含 browser / 浏览器 → 🔍 浏览器
   - 含 code / 代码 / orchestrator → 💻 开发
   - 含 creator / 创建 / 生成 → 🎨 创作
   - 含 UI / 界面 → 📱 界面
   - 含 LLM / model / 模型 → 🧠 模型
   - 其他 → 📦 其他
3. 按分类字母排序

### 如果用户指定了某个 Skill
当用户说"XX Skill 怎么用"时：
1. 定位到该 Skill 目录
2. 读取完整的 SKILL.md 正文
3. 提取核心用法、示例、注意事项
4. 以简洁友好的方式重新呈现，不要直接甩原始 Markdown

## 🎨 推荐输出风格

- **有 emoji 图标**：让清单看起来活泼易读
- **不要直接甩原始 SKILL.md**：提炼后再呈现
- **触发词要实用**：选最常见的 2-3 种说法
- **用户友好**：用中文输出（除非用户明确要英文）
- **信息要完整但不冗长**：一句话能说清的别写一段

## ⚠️ 注意事项

1. **如果没有发现任何 Skill**：告诉用户，并建议去 .trae-cn/builtin/global/skills/ 目录检查
2. **如果 SKILL.md 缺失 frontmatter**：降级使用文件名 + 正文首段
3. **不要扫描本 Skill 自己**（skillhud）：它是展示者，不是被展示者
4. **插件级 Skill**（trae-remote-official 等）：从插件的 Skill 列表里提取
