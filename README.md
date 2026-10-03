# 🎯 SkillHUD — 吸附在 TRAE 窗口上的 Skill 面板

> 装了一堆 Skill 却记不住怎么用？SkillHUD 把它们变成一面随手可查的吸附面板。

![status](https://img.shields.io/badge/TRAE-SOLO%20CN-blueviolet) ![os](https://img.shields.io/badge/OS-Windows-blue) ![electron](https://img.shields.io/badge/Electron-v33.4.11-47848F) ![skills](https://img.shields.io/badge/dynamic%20scan-54%20skills-12A150)

---

## 🖼️ 效果

<img src="docs/screenshot.png" width="352" alt="SkillHUD 悬浮窗：搜索框、分类 Tab、平台型开关、按分类分组的 Skill 卡片与状态栏">

> 实测截图：本地清单 54 项，当前显示 13 项。每张卡片都带 **来源徽章**（内置 / 插件 / 项目），点触发词即可复制。

窗口**吸附停靠**在 TRAE 窗口内侧上沿、水平居中（上沿是标题 / 标签栏，不挡工作区）：TRAE 移动 / 缩放它自动跟随，TRAE 最小化它自动收起，还原时自动出现，TRAE 退出它自动关闭。可折叠、可换主题、可手动置顶。检测不到 TRAE 窗口时退化为普通悬浮窗（位置 / 尺寸记忆）。

## ✨ 解决什么问题

在 TRAE 里装了一堆 Skill（Lark、企微、GitHub、金融、PPT 生成器…），但：

- 不知道**装了哪些**、各自**能干什么**
- 想用的时候找不到**正确的触发词**
- 每次都得翻 `SKILL.md` 说明书

SkillHUD 把这些信息摊在屏幕边缘：**打开 TRAE 就在旁边，点两下就能用**。

## 🧩 功能

| 功能 | 说明 |
|------|------|
| **吸附停靠** | 自动吸附到 TRAE 窗口内侧上沿、水平居中，跟随其移动 / 缩放 / 最小化 / 还原 / 退出 |
| **真实扫描** | 启动即扫描本机三层 Skill 目录，不依赖任何硬编码清单 |
| **来源徽章** | 每项标注「内置 / 插件 / 项目」，来源一目了然 |
| **分类 Tab** | 按分类自动分组，Tab 上带实时计数 |
| **搜索** | 名称、描述、分类、触发词全文匹配 |
| **触发词一键复制** | 点触发词或复制按钮即可进剪贴板，成功切换为对勾 |
| **平台型开关** | 一键隐藏飞书 / 企微这类平台型 Skill，只看实用工具 |
| **未安装 / 推荐** | overlay 里但本机没扫到的，收在底部折叠区，不占主清单数量 |
| **重新扫描** | 顶栏常驻刷新按钮；窗口重新获得焦点时也会自动重扫（有变化才重渲染，不闪） |
| **主题 / 折叠 / 置顶 / 最小化** | 顶栏一键操作，状态跨会话记忆 |

## 🚀 快速开始

### 方式一：Electron 悬浮窗（推荐）

```powershell
cd SkillHUD
npm install
npm start
```

窗口启动后自动吸附到 TRAE 窗口内侧上沿；未检测到 TRAE 时退化为普通悬浮窗。展开态尺寸、置顶、主题都会记住（停靠期间位置由 TRAE 决定，不会覆盖你手动摆放的状态）。

### 方式二：PowerShell 快速预览

```powershell
powershell -ExecutionPolicy Bypass -File run-win.ps1
```

用 .NET WebBrowser 包装同一个 `index.html`，**无需 Electron**。注意该内核较旧，不支持扫描接口，会降级为「离线预览（仅 overlay）」，仅供看样式。

### 方式三：TRAE Skill（对话内触发）

把 `SKILL.md` 和 `skills.json` 复制到 `.trae\skills\skillhud\`，在 TRAE 对话里直接说：

```
skillhud
我的 Skill 列表
dynamic-ui 这个 Skill 怎么用
有哪些开发类 Skill
```

Agent 会按同样的三层扫描规则在对话里渲染面板，不用开窗口。

## 🛡️ TRAE 自启动守护（Watchdog）

`watchdog.ps1` 是后台监控脚本，**双向同步** TRAE 与悬浮窗：

- 检测到 TRAE 进程启动 → **自动拉起** SkillHUD
- SkillHUD 被手动关掉 → **守护模式**重新拉起（约 8 秒内）
- **TRAE 退出 → 自动关闭 SkillHUD**（反向同步）
- 全程写 `watchdog.log`，随时可查

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

> ⚠️ PowerShell 5 写脚本必须存成 **UTF-8 BOM**（否则中文路径会炸），且**不要用 emoji**（GBK 不识别）。

### 手动控制

| 操作 | 命令 |
|------|------|
| 立即启动 SkillHUD | `node_modules\electron\dist\electron.exe .` |
| 手动跑 watchdog | `powershell -File watchdog.ps1` |
| 实时看日志 | `Get-Content watchdog.log -Tail 20 -Wait` |
| 结束 watchdog | 任务管理器结束命令行含 `watchdog` 的 `powershell.exe` |
| 卸载自启 | 删启动文件夹里的 `SkillHUD-Watchdog.lnk` |

## 🗂️ 项目结构

```
SkillHUD/
├── main.js           Electron 主进程（吸附停靠控制器、窗口状态持久化、折叠、置顶、主题底色）
├── dock.ps1          TRAE 主窗口跟随传感器（Win32 P/Invoke，按行输出 JSON，只读不改）
├── scanner.js        扫描三层 Skill 目录 + frontmatter 解析 + overlay 合并
├── preload.js        IPC bridge（close / min / top / collapse / scan）
├── index.html        UI（设计 Token + SVG 图标 + 真实数据渲染 + try/catch 兜底）
├── watchdog.ps1      TRAE 跟随启动守护脚本（UTF-8 BOM + 纯 ASCII）
├── run-win.ps1       PowerShell/.NET 快速预览（旧内核，仅离线预览）
├── docs/screenshot.png  README 截图
├── package.json      electron 依赖声明
├── SKILL.md          TRAE Skill 说明
├── skills.json       Skill overlay（图标 / 分类 / 触发词 / 贴士）
└── LICENSE           MIT
```

## 📐 overlay 语义

`skills.json` **只做增补，不产生条目**：

- 给「已扫描到的 Skill」补充 `icon / category / prompts / tips`
- 扫描不到的条目放进 `suggested`，只在底部「未安装 / 推荐」折叠区出现，**不计入主清单数量**
- `description` 以 `SKILL.md` frontmatter 为准（优先取 `description_zh`），overlay 仅作兜底

## 🎨 设计系统

| Token | 值 | 说明 |
|-------|-----|------|
| 强调色 | `#3D6BFF` | 按钮 / 选中态 / 聚焦 |
| 成功色 | `#12A150` | 已安装徽章 |
| 文本主 | `#16181D` | 深色 `#E8EAEE` |
| 面板 | `#FFFFFF` | 深色 `#1B1E24` |
| 圆角 | 14 / 10 / 8 / 999 | 容器 / 卡片 / 按钮 / chip |
| 边框 | 1px solid `rgba(16,18,29,.08)` | 深色 `rgba(255,255,255,.08)` |

功能图标一律内联 SVG（不用 emoji），完整支持浅色 / 深色两套主题。

## 🔍 工作原理

```
SkillHUD 启动
  ├─ main.js: 初始化 BrowserWindow → 加载 index.html
  │            ipcMain.handle('scan-skills') → scanner.scanSkills()
  ├─ index.html: window.skillhud.scan() ── IPC(invoke) ──→ 返回真实清单
  │            window.skillhud.send('theme' / 'close-window' / …) ──→ main.js 处理
  │
  │  scanner.js 扫描三层目录（后者覆盖前者：内置 < 插件 < 项目）
  │     · 内置级  ~/.trae-cn/builtin/global/skills/<name>/SKILL.md
  │     · 插件级  ~/.trae-cn/plugins/**/skills/<name>/SKILL.md（递归到版本号）
  │     · 项目级  <cwd>/.trae/skills/<name>/SKILL.md
  │     解析 frontmatter(name / description) → 合并 skills.json overlay
  │
  │  重新扫描（两种触发）
  │     · 顶栏刷新按钮手动触发
  │     · 窗口重新获得焦点时自动触发（1.5s 防抖，比对技能名集合，
  │       无变化直接返回不重渲染，避免闪烁）
  │
  │  TRAE Skill 模式（对话内）
  │  └─ SKILL.md 指引 Agent 走同样的三层扫描 + overlay 规则
  │
  ├─ 吸附停靠（dock.ps1）
  │     · main.js spawn dock.ps1 -ProcName "TRAE SOLO CN"
  │     · Win32 取 TRAE 主窗口几何（先声明 DPI 感知，最小化时回退
  │       GetWindowPlacement.rcNormalPosition），按行输出 JSON
  │     · main.js 逐行解析：screenToDipRect 换算 DIP → setBounds 吸附到
  │       内侧上沿、水平居中；最小化 → hide，还原 → showInactive，窗口消失 → 退出
  │     · 置顶 = 手动置顶 || TRAE 在前台
  │
  └─ Watchdog 守护（双向）
     · 检测 TRAE 进程启动 → 拉起 SkillHUD
     · 检测 SkillHUD 窗口被关 → 守护重新拉起
     · 检测 TRAE 退出 → 关闭 SkillHUD
```

## ⚠️ 已知限制

- **项目级 Skill 的扫描根是启动时的工作目录**（`process.cwd()`）。经 watchdog 拉起时 cwd 为 SkillHUD 目录，因此放在工作区 `.trae\skills\` 下的 Skill 暂不会被计入；内置级与插件级不受影响。
- **吸附停靠按「进程名 + 窗口类名」识别 TRAE**（`TRAE SOLO CN` / `Chrome_WidgetWin_1`，见 `main.js` 的 `DOCK_TARGET`），不看窗口标题（标题随工作区变化）；TRAE 若改进程名，改这一处即可。
- 停靠期间窗口位置由 TRAE 决定：手动拖拽只在「未检测到 TRAE」时生效，TRAE 最小化时面板会跟着隐藏（任务栏图标仍在）。
- `dock.ps1` 必须存成 **UTF-8 BOM + 纯 ASCII**（与 `watchdog.ps1` 同理）。
- `run-win.ps1` 走的旧内核不支持 IPC 扫描接口，只作样式预览。

## 📄 License

MIT © 2026 jiang-lin17