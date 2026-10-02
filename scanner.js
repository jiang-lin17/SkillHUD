/**
 * 扫描本机已安装的 Skill，并与 skills.json 的 overlay 合并。
 * 纯 Node 实现（不依赖 Electron），便于单独测试：node -e "require('./scanner').scanSkills()"
 *
 * 扫描层级（后者覆盖前者）：内置 < 插件 < 项目
 * 只收 <...>/skills/<name>/SKILL.md，排除 pages/ 等更深层的子文件。
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const OVERLAY_FILE = path.join(__dirname, 'skills.json');
const SELF_NAME = 'skillhud'; // 展示者不展示自己

function readOverlay(){
  try {
    const j = JSON.parse(fs.readFileSync(OVERLAY_FILE, 'utf8'));
    return { skills: Array.isArray(j.skills) ? j.skills : [], suggested: Array.isArray(j.suggested) ? j.suggested : [] };
  } catch {
    return { skills: [], suggested: [] };
  }
}

/** 解析 SKILL.md 首个 --- 区块内的全部键值，支持带引号的值与缩进续行 */
function parseFrontmatter(file){
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return null; }
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/);
  if (!lines.length || lines[0].trim() !== '---') return null;
  let end = 1;
  while (end < lines.length && lines[end].trim() !== '---') end++;
  const fm = {};
  let key = null;
  for (let i = 1; i < end; i++){
    const line = lines[i];
    const m = line.match(/^\s*([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m){
      key = m[1];
      fm[key] = m[2].trim().replace(/^["']|["']$/g, '');
    } else if (key){
      const cont = line.match(/^\s+(.+)$/);
      if (cont) fm[key] += ' ' + cont[1].trim();
    }
  }
  return fm;
}

function walk(dir, depth, out){
  if (depth > 8) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries){
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth + 1, out);
    else if (e.isFile() && e.name === 'SKILL.md') out.push(p);
  }
}

/** .../skills/<name>/SKILL.md —— 排除 skills/<name>/pages/<page>/SKILL.md */
function isDirectSkillFile(file){
  const seg = file.split(/[\\/]/);
  const i = seg.lastIndexOf('skills');
  return i !== -1 && i === seg.length - 3;
}

function roots(){
  const home = os.homedir();
  return [
    { source: '内置', dir: path.join(home, '.trae-cn', 'builtin', 'global', 'skills') },
    { source: '插件', dir: path.join(home, '.trae-cn', 'plugins') },
    { source: '项目', dir: path.join(process.cwd(), '.trae', 'skills') },
  ];
}

const norm = s => String(s || '').trim().toLowerCase();

/** overlay 未覆盖时按命名推断分类，保证清单始终有分组 */
function inferCategory(name){
  const n = norm(name);
  if (n.startsWith('lark')) return '飞书';
  if (n.startsWith('wecom')) return '企业微信';
  if (['github', 'gh-address-comments', 'gh-fix-ci', 'yeet'].includes(n)) return 'GitHub';
  if (['full-link-stock-analysis', 'ifind-finance-data', 'tdx'].includes(n)) return '金融';
  if (n === 'ppt-generator') return '演示';
  if (n.includes('browser')) return '浏览器';
  if (n === 'dynamic-ui') return '界面';
  if (n === 'skill-creator' || n.includes('code-mode')) return '开发';
  if (n === 'digital-avatar-creator') return '创作';
  return '工具';
}

function scanSkills(){
  const overlay = readOverlay();
  const overlayByName = new Map(overlay.skills.map(s => [norm(s.name), s]));
  const found = new Map();

  for (const root of roots()){
    const files = [];
    walk(root.dir, 0, files);
    for (const file of files){
      if (!isDirectSkillFile(file)) continue;
      const fm = parseFrontmatter(file);
      const name = (fm && fm.name) || path.basename(path.dirname(file));
      if (!name || norm(name) === SELF_NAME) continue;
      found.set(norm(name), {
        name: String(name),
        description: (fm && (fm.description_zh || fm.description)) || '',
        source: root.source,
        path: file,
      });
    }
  }

  const skills = [...found.values()].map(item => {
    const o = overlayByName.get(norm(item.name)) || {};
    return {
      name: item.name,
      description: item.description || o.description || '',
      category: o.category || inferCategory(item.name),
      icon: typeof o.icon === 'string' ? o.icon : '',
      prompts: Array.isArray(o.prompts) ? o.prompts : [],
      tips: Array.isArray(o.tips) ? o.tips : [],
      source: item.source,
    };
  });
  skills.sort((a, b) => a.name.localeCompare(b.name, 'zh'));

  return {
    skills,
    suggested: overlay.suggested,
    scannedAt: Date.now(),
    overlayAvailable: fs.existsSync(OVERLAY_FILE),
  };
}

module.exports = { scanSkills, readOverlay, parseFrontmatter, inferCategory };