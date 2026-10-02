---
name: "skillhud"
description: "展示当前 Agent 已安装的所有 Skill 的功能和用法。当用户问「有哪些 Skill」「怎么用某个 Skill」「列出我的 Skill」时触发。也可输入 skillhud 直接调用。"
---

# 🎯 SkillHUD · Agent 技能抬头显示

你是 SkillHUD。扫描当前 Agent 的所有 Skill，以**玻璃材质面板**形式展示。

## 🎬 触发条件

用户说出以下任何内容时必须执行本 Skill：

- "skillhud" / "打开 Skill 面板"
- "我有哪些 Skill" / "我的 Skill 列表" / "列出我的 Skill"
- "XX Skill 怎么用" / "XX 的用法" / "XX 这个 Skill"
- 用户问题明显适合某个 Skill 但不知道怎么触发

## 📂 第一步：跨平台扫描所有 Skill

### 路径解析规则

| 类型 | Windows | macOS / Linux |
|---|---|---|
| 内置 | `%USERPROFILE%\.trae-cn\builtin\global\skills\<name>\SKILL.md` | `~/.trae-cn/builtin/global/skills/<name>/SKILL.md` |
| 插件 | 递归搜索 `%USERPROFILE%\.trae-cn\plugins\**\skills\*\SKILL.md` | `~/.trae-cn/plugins/**/skills/*/SKILL.md` |
| 项目 | `<cwd>\.trae\skills\<name>\SKILL.md` | `<cwd>/.trae/skills/<name>/SKILL.md` |

> **重要**：插件路径必须递归到深层（实测结构为 `plugins/<plugin>/<version>/skills/<name>/SKILL.md`），不要停留在 `plugins/` 一层。

### 优先级

**项目级 > 插件级 > 内置级**，同名 skill 后者被覆盖。

### Windows 扫描命令

```powershell
# 内置
$builtin = Get-ChildItem "$env:USERPROFILE\.trae-cn\builtin\global\skills" -Directory |
  ForEach-Object { Join-Path $_.FullName 'SKILL.md' } | Where-Object { Test-Path $_ }

# 插件（递归）
$plugin = Get-ChildItem "$env:USERPROFILE\.trae-cn\plugins" -Recurse -Filter SKILL.md -ErrorAction SilentlyContinue

# 项目（当前目录）
$project = Get-ChildItem ".trae\skills" -Directory -ErrorAction SilentlyContinue |
  ForEach-Object { Join-Path $_.FullName 'SKILL.md' } | Where-Object { Test-Path $_ }

# 合并（优先级：项目 > 插件 > 内置，同名后者覆盖前者）
$all = @($project + $plugin + $builtin)
```

### macOS / Linux 扫描命令

```bash
# 内置、插件、项目一次性递归（glob 自动展开）
find ~/.trae-cn/builtin/global/skills -name SKILL.md 2>/dev/null
find ~/.trae-cn/plugins -name SKILL.md 2>/dev/null
find ./.trae/skills -name SKILL.md 2>/dev/null
```

## 🧩 第二步：健壮解析 frontmatter

**禁止** `Get-Content | Select-Object -First 4` 这种写法。必须读首个 `---` 到下一个 `---` 之间的**全部**行。

### PowerShell frontmatter 解析

```powershell
function Get-Frontmatter($path){
  $lines = Get-Content -LiteralPath $path -TotalCount 80
  if(-not $lines -or $lines[0].Trim() -ne '---'){ return $null }
  $end = 1
  while($end -lt $lines.Count -and $lines[$end].Trim() -ne '---'){ $end++ }
  $fm = @{}; $key = $null
  for($i=1; $i -lt $end; $i++){
    $l = $lines[$i]
    if($l -match '^\s*([A-Za-z0-9_-]+):\s*(.*)$'){
      $key = $Matches[1]; $fm[$key] = $Matches[2].Trim(' ','"',"'")
    } elseif($key -and $l -match '^\s+(.+)$'){
      $fm[$key] += ' ' + $Matches[1].Trim()
    }
  }
  return $fm
}
```

### macOS / Linux frontmatter 解析（awk）

```bash
awk 'BEGIN{p=0} /^---$/{p++; next} p==1 && /:/{key=$1; sub(/:$/,"",key); val=substr($0,index($0,":")+2); gsub(/^["\047]|["\047]$/,"",val); print key"="val}' <path>
```

### 提取字段

每个 SKILL.md 提取 `name` 和 `description`。用 `name` 做去重键（trim + 大小写不敏感归一化）。

### 去重 + 合并规则

1. 三个来源按优先级顺序扫描，同名后者覆盖前者
2. **排除本 Skill 自己**（`skillhud`）——它是展示者不是被展示者
3. 读 `skills.json`，**仅对已命中的 name** 合并 overlay 字段（icon / category / prompts / tips）
4. 未命中的条目 → 移入「未安装 / 推荐」区，不计入主清单

### description 归属

**以 SKILL.md frontmatter 为准**。`skills.json` 的 `description` 仅作兜底（扫描失败时使用）。

## 🎨 第三步：渲染玻璃面板

### 主路径（调用 dynamic-ui）

```
调用 dynamic-ui 技能的 PureShowWidget，渲染玻璃面板：
  - 分类分组（按 category，用 localeCompare 中文拼音排序）
  - 顶部搜索框
  - 点击卡片展开：触发提示词 + 使用贴士
  - 点击触发词 → 可一键复制
  - 底部：统计数量 + 「未安装 / 推荐」折叠区
```

### 降级路径

如果 dynamic-ui 不可用，输出 Markdown 清单：

```markdown
# 🎯 SkillHUD · 当前 Agent 技能清单

> 已扫描 **N** 个 Skill。

---

## 📂 分类名

### 🔧 skill-name
**功能：** description

**快速触发：**
- `提示词 1`
- `提示词 2`

**贴士：**
- 💡 贴士 1

---

## 📂 下一个分类
...

<details><summary>📌 未安装 / 推荐</summary>
- skill-name — description — 可自建或从仓库安装
</details>
```

### 排序规则

- **分类**：`localeCompare(name, 'zh')` 中文拼音排序
- **分类内 Skill**：同样 `localeCompare(name, 'zh')`
- **不要**用字母排序，避免中文乱序

## 📋 输出要求

- 用中文输出（除非用户明确要英文）
- 信息完整但不冗长——一句话能说清的别写一段
- 不要直接甩原始 SKILL.md 正文——提炼后再呈现
- "未安装 / 推荐"区默认折叠，不计入主清单数量

## ⚠️ 注意事项

1. 如果没发现任何 Skill，告诉用户并建议检查 `.trae-cn/builtin/global/skills/` 目录
2. 不要扫描展示本 Skill 自己（skillhud）
3. 插件级 Skill 要深层递归，不要停在 plugins/ 一层
4. 路径绝对不要硬编码 `C:\Users\...`，必须用跨平台写法
