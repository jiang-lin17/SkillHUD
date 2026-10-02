/* =========================================================
   SkillHUD · Chrome Extension · Content Script
   注入到所有 Agent 网页，构建紧凑浮动侧边面板
   Shadow DOM 隔离样式 · 零侵入宿主页面
   ========================================================= */

(function () {
  "use strict";

  // ---------- 基础防重入 ----------
  if (window.__skillhudInjected) return;
  window.__skillhudInjected = true;

  // ---------- 样式（全部注入 Shadow DOM） ----------
  const HUD_STYLES = `
  :host { all: initial; display: block; }

  /* 浮动按钮（收起态） */
  .sh-fab {
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2147483646;
    width: 32px;
    height: 72px;
    background: linear-gradient(135deg, #3370ff, #7b61ff);
    border-radius: 8px 0 0 8px;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 2px;
    cursor: pointer;
    box-shadow: -2px 0 12px rgba(51,112,255,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, right 0.2s;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  }
  .sh-fab:hover { transform: translateY(-50%) translateX(-4px); }
  .sh-fab .sh-dot {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px; height: 6px;
    background: #fff;
    border-radius: 50%;
    opacity: 0.6;
  }

  /* 展开面板 */
  .sh-panel {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2147483647;
    width: 280px;
    max-height: 85vh;
    background: #ffffff;
    border-radius: 12px 0 0 12px;
    box-shadow: -4px 0 24px rgba(0,0,0,0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 13px;
    color: #1d2129;
    border-left: 1px solid #e3e6ed;
  }
  .sh-panel[data-pos="right"] { right: 0; border-radius: 12px 0 0 12px; border-left: 1px solid #e3e6ed; }
  .sh-panel[data-pos="left"] { left: 0; border-radius: 0 12px 12px 0; border-left: none; border-right: 1px solid #e3e6ed; }
  .sh-panel[data-pos="left"] .sh-caret { transform: rotate(180deg); }

  /* 暗色主题 */
  .sh-panel.dark {
    background: #1f2329;
    color: #e5e6eb;
    border-color: #2f343d;
    box-shadow: -4px 0 24px rgba(0,0,0,0.5);
  }
  .sh-panel.dark .sh-head,
  .sh-panel.dark .sh-foot { background: #1f2329; border-color: #2f343d; }
  .sh-panel.dark .sh-srch { background: #262b33; border-color: #2f343d; color: #e5e6eb; }
  .sh-panel.dark .sh-tab { background: #262b33; color: #c9cdd4; border-color: #2f343d; }
  .sh-panel.dark .sh-tab.on { background: #4080ff; border-color: #4080ff; color: #fff; }
  .sh-panel.dark .sh-card { background: #262b33; border-color: #2f343d; }
  .sh-panel.dark .sh-card:hover { border-color: #4080ff; }
  .sh-panel.dark .sh-hint { background: #14171d; color: #86909c; }
  .sh-panel.dark .sh-detail { background: #14171d; }
  .sh-panel.dark .sh-prompt { background: #262b33; border-color: #2f343d; }
  .sh-panel.dark .sh-empty { color: #86909c; }

  /* 面板头部 */
  .sh-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 8px;
    border-bottom: 1px solid #e3e6ed;
    background: #ffffff;
    flex-shrink: 0;
    cursor: move;
  }
  .sh-title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; }
  .sh-logo { font-size: 16px; }
  .sh-actions { display: flex; gap: 4px; }
  .sh-btn {
    width: 22px; height: 22px;
    border: none; background: transparent;
    border-radius: 4px; cursor: pointer;
    font-size: 12px; line-height: 1;
    color: #86909c; display: flex;
    align-items: center; justify-content: center;
  }
  .sh-btn:hover { background: #f1f3f7; color: #1d2129; }

  /* 搜索 */
  .sh-srch-wrap { padding: 8px 12px; flex-shrink: 0; }
  .sh-srch {
    width: 100%; padding: 7px 10px 7px 28px;
    font-size: 12px; background: #f1f3f7;
    border: 1px solid transparent; border-radius: 8px;
    outline: none; color: inherit;
    font-family: inherit;
  }
  .sh-srch:focus { border-color: #3370ff; background: #fff; }
  .sh-srch-wrap { position: relative; }
  .sh-srch-wrap::before {
    content: "🔍"; position: absolute; left: 20px; top: 50%;
    transform: translateY(-50%); font-size: 11px; opacity: 0.5; pointer-events: none;
  }

  /* 分类 tabs */
  .sh-tabs {
    display: flex; gap: 4px; padding: 0 12px 8px;
    overflow-x: auto; flex-shrink: 0;
    scrollbar-width: none;
  }
  .sh-tabs::-webkit-scrollbar { display: none; }
  .sh-tab {
    padding: 4px 10px; font-size: 11px; white-space: nowrap;
    background: #f1f3f7; border: 1px solid transparent;
    border-radius: 12px; cursor: pointer;
    color: #4e5969; transition: 0.15s; flex-shrink: 0;
  }
  .sh-tab:hover { background: #e8f3ff; }
  .sh-tab.on { background: #3370ff; color: #fff; border-color: #3370ff; }

  /* 列表 */
  .sh-list {
    flex: 1; overflow-y: auto; padding: 0 12px 12px;
    scrollbar-width: thin;
  }
  .sh-list::-webkit-scrollbar { width: 4px; }
  .sh-list::-webkit-scrollbar-thumb { background: #e3e6ed; border-radius: 2px; }

  /* 分组标题 */
  .sh-grp {
    font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.5px;
    color: #86909c; margin: 14px 2px 6px;
  }
  .sh-grp:first-child { margin-top: 4px; }

  /* Skill 卡片 */
  .sh-card {
    background: #f8f9fb; border: 1px solid transparent;
    border-radius: 8px; padding: 10px; margin-bottom: 6px;
    cursor: pointer; transition: 0.15s;
  }
  .sh-card:hover { border-color: #3370ff; background: #ffffff; }
  .sh-card.open { background: #ffffff; border-color: #3370ff; }

  .sh-card-top { display: flex; align-items: center; gap: 8px; }
  .sh-ic { font-size: 16px; width: 22px; text-align: center; }
  .sh-nm { flex: 1; font-weight: 600; font-size: 12.5px; }
  .sh-bd {
    font-size: 9px; padding: 1px 5px;
    background: #f1f3f7; color: #86909c;
    border-radius: 3px; font-weight: 400;
  }
  .sh-ds {
    font-size: 11.5px; color: #86909c;
    margin-top: 4px; line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }

  /* 展开详情 */
  .sh-detail {
    margin-top: 8px; padding-top: 8px;
    border-top: 1px dashed #e3e6ed;
    display: none;
  }
  .sh-card.open .sh-detail { display: block; }
  .sh-sec { font-size: 10px; font-weight: 600; color: #86909c; margin: 6px 0 3px; }
  .sh-sec:first-child { margin-top: 0; }

  .sh-prompt {
    position: relative; padding: 6px 32px 6px 8px;
    background: #f1f3f7; border: 1px solid transparent;
    border-radius: 5px; font-size: 11px; line-height: 1.45;
    margin-bottom: 4px; cursor: pointer;
    font-family: "SF Mono", Consolas, monospace;
    transition: 0.15s; word-break: break-all;
  }
  .sh-prompt:hover { border-color: #3370ff; }
  .sh-prompt:hover .sh-cp { opacity: 1; }
  .sh-cp {
    position: absolute; top: 4px; right: 4px;
    width: 18px; height: 18px; border: none;
    background: #fff; border-radius: 3px;
    cursor: pointer; font-size: 10px;
    opacity: 0; transition: 0.15s;
    display: flex; align-items: center; justify-content: center;
  }
  .sh-tip { font-size: 11px; color: #86909c; padding-left: 12px; position: relative; line-height: 1.4; }
  .sh-tip::before { content: "💡"; position: absolute; left: 0; font-size: 9px; top: 1px; }

  .sh-empty { padding: 40px 10px; text-align: center; color: #c9cdd4; font-size: 12px; }
  .sh-empty-e { font-size: 28px; opacity: 0.4; margin-bottom: 6px; }

  /* 底部 */
  .sh-foot {
    padding: 6px 12px; border-top: 1px solid #e3e6ed;
    background: #ffffff; font-size: 10px; color: #86909c;
    flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  }
  .sh-foot a { color: #3370ff; text-decoration: none; }
  .sh-foot a:hover { text-decoration: underline; }

  /* Toast */
  .sh-toast {
    position: fixed; bottom: 32px; left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px; background: #1d2129; color: #fff;
    border-radius: 8px; font-size: 12px;
    z-index: 2147483647; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    animation: shToast 1.5s ease forwards;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  }
  @keyframes shToast {
    0% { opacity: 0; transform: translateX(-50%) translateY(8px); }
    15% { opacity: 1; transform: translateX(-50%) translateY(0); }
    85% { opacity: 1; }
    100% { opacity: 0; }
  }
  `;

  // ---------- 状态 ----------
  const state = {
    skills: [],
    filtered: [],
    activeCat: "all",
    openCards: new Set(),
    panelOpen: false,
    panelPos: "right", // right | left
    posX: null, // 自定义位置（百分比）
    theme: "auto", // auto | light | dark
  };

  let rootEl, shadow, fab, panel;

  // ---------- 初始化 ----------
  function init() {
    buildShadowHost();
    applySavedState();
    loadSkills();
    bindEvents();
    if (state.panelOpen) showPanel(false);
  }

  function buildShadowHost() {
    // 创建宿主元素
    rootEl = document.createElement("div");
    rootEl.id = "__skillhud_host";
    rootEl.style.cssText = "all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483646;";
    // 保证不被页面样式影响
    if (document.body) {
      document.body.appendChild(rootEl);
    } else {
      document.addEventListener("DOMContentLoaded", () => document.body.appendChild(rootEl), { once: true });
      return;
    }

    shadow = rootEl.attachShadow({ mode: "open" });

    // 注入样式
    const styleEl = document.createElement("style");
    styleEl.textContent = HUD_STYLES;
    shadow.appendChild(styleEl);

    // 浮动按钮（可点击区域需要 pointer-events）
    fab = document.createElement("div");
    fab.className = "sh-fab";
    fab.innerHTML = `<span class="sh-dot"></span>SKILLHUD`;
    fab.style.pointerEvents = "auto";
    fab.title = "点击展开 Skill 面板";
    shadow.appendChild(fab);

    // 面板
    panel = document.createElement("div");
    panel.className = "sh-panel";
    panel.style.pointerEvents = "auto";
    panel.innerHTML = `
      <div class="sh-head" id="shHead">
        <div class="sh-title"><span class="sh-logo">🎯</span><span>SkillHUD</span></div>
        <div class="sh-actions">
          <button class="sh-btn" id="shFlip" title="换到另一边">⇄</button>
          <button class="sh-btn" id="shTheme" title="切换主题">🌓</button>
          <button class="sh-btn" id="shClose" title="收起">✕</button>
        </div>
      </div>
      <div class="sh-srch-wrap">
        <input class="sh-srch" id="shSrch" placeholder="搜索 Skill…" />
      </div>
      <div class="sh-tabs" id="shTabs"></div>
      <div class="sh-list" id="shList"><div class="sh-empty"><div class="sh-empty-e">⏳</div>加载中…</div></div>
      <div class="sh-foot">
        <span id="shStat">—</span>
        <a href="https://github.com/" target="_blank" rel="noopener">GitHub ↗</a>
      </div>
    `;
    shadow.appendChild(panel);
  }

  function applySavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem("skillhud_state") || "{}");
      if (saved.panelPos) state.panelPos = saved.panelPos;
      if (saved.theme) state.theme = saved.theme;
      if (saved.posX != null) state.posX = saved.posX;
      state.panelOpen = !!saved.panelOpen;
    } catch {}
  }

  function saveState() {
    try {
      localStorage.setItem("skillhud_state", JSON.stringify({
        panelPos: state.panelPos, theme: state.theme,
        posX: state.posX, panelOpen: state.panelOpen,
      }));
    } catch {}
  }

  // ---------- 加载配置 ----------
  function loadSkills() {
    // 先试扩展内置的 skills.json
    const url = chrome.runtime?.getURL
      ? chrome.runtime.getURL("skills.json")
      : chrome.runtime?.getURL("assets/skills.json");

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        state.skills = (data.skills || []).filter((s) => s && s.name).map(norm);
        buildTabs();
        render();
        applyTheme();
      })
      .catch(() => {
        // 最后兜底：内置默认 Skill
        state.skills = DEFAULT_SKILLS.map(norm);
        buildTabs();
        render();
        applyTheme();
      });
  }

  function norm(s) {
    return {
      name: String(s.name || "").trim(),
      icon: String(s.icon || "⚡").trim() || "⚡",
      category: String(s.category || "其他").trim() || "其他",
      description: String(s.description || "").trim(),
      prompts: Array.isArray(s.prompts) ? s.prompts.map(String) : [],
      tips: Array.isArray(s.tips) ? s.tips.map(String) : [],
    };
  }

  // ---------- 渲染 ----------
  function buildTabs() {
    const tabsEl = shadow.getElementById("shTabs");
    const cats = [...new Set(state.skills.map((s) => s.category))].sort();
    state.activeCat = "all";

    const html =
      `<div class="sh-tab on" data-cat="all">全部 ${state.skills.length}</div>` +
      cats
        .map(
          (c) =>
            `<div class="sh-tab" data-cat="${c}">${c} ${state.skills.filter((s) => s.category === c).length}</div>`
        )
        .join("");
    tabsEl.innerHTML = html;

    tabsEl.querySelectorAll(".sh-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.activeCat = tab.dataset.cat;
        tabsEl.querySelectorAll(".sh-tab").forEach((t) => t.classList.remove("on"));
        tab.classList.add("on");
        render();
      });
    });
  }

  function render() {
    const listEl = shadow.getElementById("shList");
    const q = (shadow.getElementById("shSrch").value || "").toLowerCase();

    state.filtered = state.skills.filter((s) => {
      if (state.activeCat !== "all" && s.category !== state.activeCat) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.prompts.some((p) => p.toLowerCase().includes(q))
      );
    });

    if (state.filtered.length === 0) {
      listEl.innerHTML = `<div class="sh-empty"><div class="sh-empty-e">🔍</div>没有匹配的 Skill</div>`;
      shadow.getElementById("shStat").textContent = state.skills.length + " 个已装";
      return;
    }

    // 按分类分组
    const groups = {};
    state.filtered.forEach((s) => (groups[s.category] = groups[s.category] || []).push(s));

    let html = "";
    Object.keys(groups).sort().forEach((cat) => {
      html += `<div class="sh-grp">${esc(cat)}</div>`;
      groups[cat].forEach((s) => (html += card(s)));
    });
    listEl.innerHTML = html;
    shadow.getElementById("shStat").textContent =
      (q ? `${state.filtered.length}/${state.skills.length}` : state.skills.length + " 个已装");

    // 绑定卡片交互
    listEl.querySelectorAll(".sh-card").forEach((el) => {
      const name = el.dataset.name;
      if (state.openCards.has(name)) el.classList.add("open");
      el.addEventListener("click", (e) => {
        if (e.target.classList.contains("sh-cp") || e.target.closest(".sh-prompt")) return;
        toggleCard(name, el);
      });
    });
    listEl.querySelectorAll(".sh-prompt").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        copyText(el.dataset.text);
      });
    });
  }

  function card(s) {
    const open = state.openCards.has(s.name);
    const prompts = s.prompts
      .map(
        (p) =>
          `<div class="sh-prompt" data-text="${escAttr(p)}">💬 ${esc(p)}<button class="sh-cp" title="复制">📋</button></div>`
      )
      .join("");
    const tips = s.tips.map((t) => `<div class="sh-tip">${esc(t)}</div>`).join("");
    return `
      <div class="sh-card ${open ? "open" : ""}" data-name="${escAttr(s.name)}">
        <div class="sh-card-top">
          <div class="sh-ic">${s.icon}</div>
          <div class="sh-nm">${esc(s.name)}</div>
          <div class="sh-bd">${esc(s.category)}</div>
        </div>
        <div class="sh-ds">${esc(s.description)}</div>
        <div class="sh-detail">
          ${prompts ? `<div class="sh-sec">💬 触发提示词</div>${prompts}` : ""}
          ${tips ? `<div class="sh-sec">💡 使用贴士</div>${tips}` : ""}
        </div>
      </div>`;
  }

  function toggleCard(name, el) {
    if (state.openCards.has(name)) state.openCards.delete(name);
    else state.openCards.add(name);
    el.classList.toggle("open");
  }

  // ---------- 显示 / 隐藏面板 ----------
  function showPanel(animate = true) {
    state.panelOpen = true;
    applyPanelPos();
    applyTheme();
    saveState();
    fab.style.display = "none";
    panel.style.display = "flex";
    if (animate) {
      panel.animate(
        [{ transform: "translateY(-50%) translateX(20px)", opacity: 0 }, { transform: "translateY(-50%)", opacity: 1 }],
        { duration: 200, easing: "ease-out" }
      );
    }
  }

  function hidePanel() {
    state.panelOpen = false;
    saveState();
    panel.style.display = "none";
    fab.style.display = "flex";
  }

  function applyPanelPos() {
    panel.dataset.pos = state.panelPos;
    // 清除旧的内联位置
    panel.style.left = panel.style.right = "";
    if (state.panelPos === "left") {
      panel.style.left = state.posX != null ? state.posX + "%" : "0";
    } else {
      panel.style.right = state.posX != null ? state.posX + "%" : "0";
    }
  }

  // ---------- 主题 ----------
  function applyTheme() {
    let dark = state.theme === "dark";
    if (state.theme === "auto") {
      dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    panel.classList.toggle("dark", dark);
  }

  function cycleTheme() {
    state.theme = state.theme === "auto" ? "light" : state.theme === "light" ? "dark" : "auto";
    applyTheme();
    saveState();
    showToast("主题: " + state.theme);
  }

  // ---------- 事件绑定 ----------
  function bindEvents() {
    // 浮动按钮
    fab.addEventListener("click", () => showPanel(true));

    // 面板按钮
    shadow.getElementById("shClose").addEventListener("click", hidePanel);
    shadow.getElementById("shTheme").addEventListener("click", cycleTheme);
    shadow.getElementById("shFlip").addEventListener("click", () => {
      state.panelPos = state.panelPos === "right" ? "left" : "right";
      state.posX = null;
      applyPanelPos();
      saveState();
    });

    // 搜索
    shadow.getElementById("shSrch").addEventListener("input", render);

    // 头部拖拽移动
    const head = shadow.getElementById("shHead");
    let dragging = false, startX = 0, origRight = 0;
    head.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX;
      origRight = state.panelPos === "right"
        ? panel.getBoundingClientRect().right
        : panel.getBoundingClientRect().left;
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      // 以百分比存储新位置
      const winW = window.innerWidth;
      if (state.panelPos === "right") {
        // 从右侧算，向右拖动增加 right 值 = 面板向左移动
        const newRightPx = Math.max(0, origRight - (winW - e.clientX)) + dx;
        const rightPct = (newRightPx / winW) * 100;
        state.posX = Math.min(50, Math.max(0, rightPct));
        panel.style.right = state.posX + "%";
        panel.style.left = "";
      } else {
        const leftPct = ((e.clientX / winW) * 100);
        state.posX = Math.min(50, Math.max(0, leftPct));
        panel.style.left = state.posX + "%";
        panel.style.right = "";
      }
    });
    document.addEventListener("mouseup", () => {
      if (dragging) { dragging = false; saveState(); }
    });

    // 快捷键
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        state.panelOpen ? hidePanel() : showPanel(true);
      }
      if (e.key === "Escape" && state.panelOpen) hidePanel();
    });

    // 跟随系统主题变化
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (state.theme === "auto") applyTheme();
    });
  }

  // ---------- 工具 ----------
  function esc(s) {
    return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  function escAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("✅ 已复制提示词");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("✅ 已复制提示词");
    }
  }
  function showToast(msg) {
    const t = document.createElement("div");
    t.className = "sh-toast";
    t.textContent = msg;
    rootEl.appendChild(t);
    setTimeout(() => t.remove(), 1500);
  }

  // ---------- 默认 Skill（最后兜底） ----------
  const DEFAULT_SKILLS = [
    { name: "申论范文", icon: "📝", category: "公考", description: "申论范文生成、点评与批改", prompts: ["以"乡村振兴"为主题写一篇800字申论范文"] },
    { name: "公基速记", icon: "🧠", category: "公考", description: "公共基础知识快速记忆", prompts: ["帮我整理2026年《行政复议法》核心考点"] },
    { name: "时政热点", icon: "📰", category: "公考", description: "近期时政热点速览", prompts: ["整理本周重要时政新闻"] },
    { name: "公文写作", icon: "📄", category: "写作", description: "党政机关公文规范写作", prompts: ["帮我写一份市政府办公室通知"] },
    { name: "结构化面试", icon: "🎤", category: "公考", description: "面试模拟答题与点评", prompts: ["模拟一道综合分析题并给示范回答"] },
    { name: "代码解释", icon: "💻", category: "开发", description: "逐行解释代码逻辑", prompts: ["逐行解释这段代码"] },
    { name: "Bug排查", icon: "🐛", category: "开发", description: "快速定位和修复代码问题", prompts: ["这个报错是什么原因？"] },
    { name: "会议纪要", icon: "📋", category: "效率", description: "整理会议记录提取要点", prompts: ["整理结构化会议纪要"] },
    { name: "邮件助手", icon: "✉️", category: "效率", description: "邮件撰写润色翻译", prompts: ["写一封请假邮件"] },
  ];

  // ---------- 启动 ----------
  // 有些页面在 head 里就注入 content script，要等 body 出现
  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init, { once: true });
})();
