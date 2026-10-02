# 🎯 SkillHUD — 围绕 TRAE 的 Skill 面板

> 给 TRAE 装一个悬浮侧边栏，所有已安装的 Skill 的功能和调用方法，就在旁边、一目了然。

![status](https://img.shields.io/badge/TRAE-SOLO%20CN-blueviolet) ![os](https://img.shields.io/badge/OS-Windows-blue) ![electron](https://img.shields.io/badge/Electron-v33.4.11-47848F)

---

## ✨ 解决什么问题

在 TRAE 里装了一堆 Skill（Lark、企微、GitHub、金融、PPT 生成器…），但：

- 不知道**装了哪些**、各自**能干什么**
- 想用的时候找不到**正确的触发词**
- 每次都得翻 SKILL.md 说明书

SkillHUD 就是贴在 TRAE 边上的**独立悬浮窗**——打开 TRAE 它自动出现，点两下就能看到所有 Skill 的用法，点一下触发词复制到剪贴板。

## 🖼️ 效果

```
┌─────────────────────────────────────┐
│ 🔴🟡🟢  SkillHUD                   ← 可拖拽顶栏
├─────────────────────────────────────┤
│ 🔍 搜索 Skill 名称、描述或触发词…   │
├─────────────────────────────────────┤
│ [全部][开发][界面][浏览器][GitHub]  │ ← 分类 Tab
├─────────────────────────────────────┤
│ 🧩 ○ 只显示实用工具（隐藏飞书/企微）│ ← 平台型开关
├─────────────────────────────────────┤
│ 🛠️ skill-creator            [内置] │
│    创建新 TRAE Skill                │
│ 💬 帮我创建一个新 Skill   💬 我想…  │ ← 点触发词 = 复制
├─────────────────────────────────────┤
│ 🐙 github                   [插件] │
│    浏览仓库 / PR / Issue             │
├─────────────────────────────────────┤
│ 📈 full-link-stock-analysis [插件] │
│    A 股 / 港股 / 美股个股分析        │
├─────────────────────────────────────┤
│ ▶ 未安装 / 推荐  9                  │ ← 折叠区（overlay 未命中）
├─────────────────────────────────────┤
│ 本地清单 · 54 项            显示 13 │ ← 状态栏（真实扫描结果）
└─────────────────────────────────────┘
        ↑ 悬浮在 TRAE 旁边，始终置顶
```

## 🚀 快速开始

### 方式一：Electron 悬浮窗（推荐）

```powershell
cd SkillHUD
npm install
npm start
```

窗口默认贴在屏幕右侧中间，**自动置顶**在 TRAE 上方。关掉 TRAE 重开 → 窗口跟着回来（见下方"自启动"）。

### 方式二：PowerShell 快速预览（没装 Electron 二进制时）

```powershell
powershell -ExecutionPolicy Bypass -File run-win.ps1
```

用 .NET WebBrowser 包装同一个 `index.html`。**注意**：该内核较旧，不支持扫描接口，只能降级为「离线预览（仅 overlay）」，功能受限，仅供看样式。

### 方式三：TRAE Skill（对话内触发）

把 `SKILL.md` 和 `skills.json` 复制到 `.trae\skills\skillhud\`，在 TRAE 对话里说：

```
skillhud
我的 Skill 列表
dynamic-ui 这个 Skill 怎么用
有哪些开发类 Skill
```

Agent 会扫描三层 Skill 目录并在对话中渲染玻璃材质面板。

## 🛡️ TRAE 自启动守护（Watchdog）

`watchdog.ps1` 是后台监控脚本（双向同步）：

- 检测到 TRAE 进程启动 → **自动拉起** SkillHUD
- SkillHUD 被用户关掉 → **守护模式**重新拉起
- **TRAE 退出 → 自动关闭 SkillHUD**（反向同步，约 8 秒内）
- 日志写到 `watchdog.log`，随时可查

### 加入开机自启

```powershell
$startup = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$shell = New-Object -ComObject WScript.Shell
$s = $shell.CreateShortcut("$startup\SkillHUD-Watchdog.lnk")
$s.TargetPath = "powershell.exe"
$s.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PWD\watchdog.ps1`""
$s.WorkingDirectory = $PWD
$s.Save()
```

> ⚠️ PowerShell 5 写脚本需用 **UTF-8 BOM** 保存（否则中文路径会炸），且**不要用 emoji**（GBK 不识别）。

### 手动控制

| 操作 | 命令 |
|------|------|
| 立即启动 SkillHUD | `node_modules\electron\dist\electron.exe .` |
| 手动跑 watchdog | `powershell -File watchdog.ps1` |
| 看日志 | `Get-Content watchdog.log -Tail 20 -Wait` |
| 结束 watchdog | 任务管理器杀 powershell.exe（命令行含 watchdog） |
| 卸载自启 | 删启动文件夹里的 `SkillHUD-Watchdog.lnk` |

## 📂 项目结构

```
SkillHUD/
├── main.js           Electron 主进程（窗口状态持久化、折叠、置顶、主题底色）
├── scanner.js        扫描本机三层 Skill 目录 + frontmatter 解析 + overlay 合并
├── preload.js        IPC bridge（close / min / top / collapse / scan）
├── index.html        UI（设计 Token + SVG 图标 + 真实数据渲染 + try/catch 兜底）
├── watchdog.ps1      TRAE 跟随启动守护脚本（UTF-8 BOM + 纯 ASCII）
├── run-win.ps1       PowerShell/.NET 快速预览（旧内核，仅离线预览）
├── package.json      electron 依赖声明
├── SKILL.md          TRAE Skill 说明
├── skills.json       Skill overlay（图标 / 分类 / 触发词 / 贴士）
└── LICENSE           MIT
```

> **overlay 语义**：`skills.json` 只给「已扫描到的 skill」补充 `icon / category / prompts / tips`，不产生条目。扫描不到的条目放在 `suggested` 里，只在面板底部的「未安装 / 推荐」折叠区展示，不计入主清单数量。`description` 以 `SKILL.md` frontmatter 为准（优先取 `description_zh`），overlay 仅作兜底。

## 🎨 设计系统

| Token | 值 | 说明 |
|-------|-----|------|
| 强调色 | `#3D6BFF` | 按钮 / 选中态 / 聚焦 |
| 成功色 | `#12A150` | 已安装徽章 |
| 文本主 | `#16181D` | 深色 `#E8EAEE` |
| 面板 | `#FFFFFF` | 深色 `#1B1E24` |
| 圆角 | 14 / 10 / 8 / 999 | 容器 / 卡片 / 按钮 / chip |
| 边框 | 1px solid `rgba(16,18,29,.08)` | 深色 `rgba(255,255,255,.08)` |

## 🔍 工作原理

```
SkillHUD 启动
  ├─ main.js: 初始化 BrowserWindow → 加载 index.html
  │            ipcMain.handle('scan-skills') → scanner.scanSkills()
  ├─ index.html: window.skillhud.scan() ── IPC(invoke) ──→ 返回真实清单
  │            window.skillhud.send('theme'/'close-window'/...) ──→ main.js 处理
  │
  │  scanner.js 扫描三层目录（后者覆盖前者：内置 < 插件 < 项目）:
  │     · 内置级  ~/.trae-cn/builtin/global/skills/<name>/SKILL.md
  │     · 插件级  ~/.trae-cn/plugins/**/skills/<name>/SKILL.md（递归到版本号）
  │     · 项目级  <cwd>/.trae/skills/<name>/SKILL.md
  │     解析 frontmatter(name/description) → 合并 skills.json overlay
  │
  │  TRAE Skill 模式（对话内）:
  │  └─ SKILL.md 指引 Agent 走同样的三层扫描 + overlay 规则
  │
  └─ Watchdog 守护（双向）:
     · 检测 TRAE 进程启动 → 拉起 SkillHUD
     · 检测 SkillHUD 窗口被关 → 守护重新拉起
     · 检测 TRAE 退出 → 关闭 SkillHUD
```

## 📄 License

MIT © 2026 jiang-lin17