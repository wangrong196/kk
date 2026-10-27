/**
 * 知识工坊 — Host half
 * 提供一组 Agent 工具 + 同源 HTTP 路由（供侧边栏面板调用）。
 * 支持：列表、搜索、查看、新建、编辑、删除、导入(.md/.json/整库.zip)、导出(单篇/.json/整库.zip)。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync, rmdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

// 与 knowledge-cli.js 保持一致：笔记根目录 = 知识工坊 文件夹本身
const KB_ROOT =
  process.env.KNOWLEDGE_WORKSHOP_ROOT ||
  'D:\\Program Files (x86)\\DeepSeek Harness工作空间\\知识工坊';

if (!existsSync(KB_ROOT)) mkdirSync(KB_ROOT, { recursive: true });

// 媒体存储目录
const MEDIA_ROOT = join(KB_ROOT, '_media');
if (!existsSync(MEDIA_ROOT)) mkdirSync(MEDIA_ROOT, { recursive: true });
const MEDIA_URL_PREFIX = '/api/kw2/media';

const CATEGORIES = ['项目', '代码', '设计', '产品', '学习', '生活', '其他'];

// ---------- 文件 / 笔记辅助 ----------
function scanDir(dir, rel = '') {
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const fp = join(dir, e.name);
    const rp = rel ? join(rel, e.name) : e.name;
    if (e.isDirectory()) out.push(...scanDir(fp, rp));
    else if (e.name.endsWith('.md')) {
      try {
        const c = readFileSync(fp, 'utf8');
        const titleMatch = c.match(/^# (.+)$/m);
        const tagMatch = c.match(/tags:\s*\[(.+?)\]/);
        const st = statSync(fp);
        out.push({
          id: rp.replace(/\.md$/, ''),
          name: e.name.replace(/\.md$/, ''),
          title: titleMatch ? titleMatch[1].trim() : e.name.replace(/\.md$/, ''),
          category: (() => { const base = rp.replace(/\.md$/, ''); const segs = base.split(/[\\/]/); return segs.length > 1 ? segs[0] : '其他'; })(),
          tags: tagMatch ? tagMatch[1].split(',').map(t => t.trim()).filter(Boolean) : [],
          size: st.size,
          modified: st.mtimeMs,
          path: rp,
        });
      } catch {}
    }
  }
  return out;
}

function safeId(id) {
  return String(id).replace(/\.md$/, '').replace(/^[/\\]+/, '').replace(/\.\.+/g, '').replace(/[<>:"|?*]/g, '_');
}

function readNote(id) {
  const raw = String(id || '');
  // 候选文件路径：直接 safeId、带 .md、以及 join(KB_ROOT, ...)
  const candidates = [
    join(KB_ROOT, safeId(raw) + '.md'),
    join(KB_ROOT, safeId(raw)),
    join(KB_ROOT, raw.replace(/^[/\\]+/, '')),
    raw.replace(/\.md$/, ''),
    raw,
  ];
  for (const c of candidates) {
    if (existsSync(c)) return { path: c.replace(/\.md$/, '') + '.md', id: raw };
  }
  // 回退：按 id/title/name 匹配
  const all = scanDir(KB_ROOT);
  const hit = all.find(n => n.id === raw || n.name === raw || n.title === raw || n.path.includes(raw));
  return hit ? { path: join(KB_ROOT, hit.path), id: hit.id } : null;
}

// 把笔记内容块解析为 { title, tags, body }
function parseNoteContent(content) {
  const titleMatch = content.match(/^# (.+)$/m);
  const tagMatch = content.match(/tags:\s*\[(.+?)\]/);
  const title = titleMatch ? titleMatch[1].trim() : '';
  const tags = tagMatch ? tagMatch[1].split(',').map(t => t.trim()).filter(Boolean) : [];
  return { title, tags, body: content };
}

// 写出一篇笔记（保留 frontmatter 风格：# 标题 + tags + 创建时间）
function writeNote(category, title, content, tags = []) {
  const slug = (title || 'untitled').replace(/[^\w一-龥-]/g, '-').slice(0, 60) || 'untitled';
  const stamp = Date.now();
  const fp = join(KB_ROOT, category, `${slug}-${stamp}.md`);
  mkdirSync(dirname(fp), { recursive: true });
  const ts = new Date().toLocaleString('zh-CN');
  const body = `# ${title}\n\ntags: [${tags.join(', ')}]\n\n## 创建时间\n${ts}\n\n---\n\n${content}`;
  writeFileSync(fp, body, 'utf8');
  return { id: join(category, `${slug}-${stamp}`).replace(/\\/g, '/'), path: fp, title };
}

// 删除一篇笔记（及其所在目录若为空）
function deleteNote(id) {
  const hit = readNote(id);
  if (!hit) return { success: false, error: '未找到笔记' };
  try { unlinkSync(hit.path); } catch (e) { return { success: false, error: '删除失败: ' + e.message }; }
  // 清理空目录
  try {
    let d = dirname(hit.path);
    while (d !== KB_ROOT && d.startsWith(KB_ROOT)) {
      const left = readdirSync(d);
      if (left.length === 0) { rmdirSync(d); d = dirname(d); } else break;
    }
  } catch {}
  return { success: true, id: hit.id };
}

// ---------- 极简 store-only ZIP（无依赖） ----------
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// files: [{ name, data: Buffer }] -> zip Buffer (store, no compression)
function buildZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data), 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10); // store
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, data);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0, 8); cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12); cen.writeUInt16LE(0, 14);
    cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(data.length, 20); cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28); cen.writeUInt16LE(0, 30); cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34); cen.writeUInt16LE(0, 36); cen.writeUInt16LE(0, 38);
    cen.writeUInt32LE(0, 40); cen.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([cen, nameBuf]));
    offset += 30 + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, centralBuf, end]);
}

// 解析 zip（仅 store 条目）。返回 [{ name, data }]
function parseZip(buf) {
  const files = [];
  let i = 0;
  while (i + 4 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    // local header 30 字节 + name + extra
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const compSize = buf.readUInt32LE(i + 18);
    const name = buf.toString('utf8', i + 30, i + 30 + nameLen);
    const dataStart = i + 30 + nameLen + extraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    files.push({ name, data: Buffer.from(data) });
    i = dataStart + compSize;
  }
  return files;
}

const OUTPUT = {
  schema: { type: 'object', properties: { success: { type: 'boolean' } }, additionalProperties: true },
  render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
};

const TOOLS = [
  {
    name: 'knowledge_list',
    description: '列出知识工坊中的笔记（可按分类筛选，返回标题/分类/标签/修改时间）。',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: '分类名，留空或"全部"返回所有' },
        limit: { type: 'integer', description: '返回条数上限', default: 50 },
      },
    },
    output: OUTPUT,
    execute: async ({ category, limit = 50 } = {}) => {
      let notes = scanDir(KB_ROOT);
      if (category && category !== '全部') notes = notes.filter(n => n.category === category);
      notes.sort((a, b) => b.modified - a.modified);
      return { success: true, total: notes.length, notes: notes.slice(0, limit) };
    },
  },
  {
    name: 'knowledge_get',
    description: '按 id 获取一篇笔记的完整 Markdown 内容。',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: '笔记 id，如 "项目/小瘦AI减肥项目"' } },
      required: ['id'],
    },
    output: OUTPUT,
    execute: async ({ id } = {}) => {
      if (!id) return { success: false, error: '缺少 id' };
      const hit = readNote(id);
      if (!hit) return { success: false, error: '未找到笔记' };
      const c = readFileSync(hit.path, 'utf8');
      return { success: true, id: hit.id, title: c.match(/^# (.+)$/m)?.[1] || hit.id, content: c, category: hit.id.split(/[\\/]/)[0] };
    },
  },
  {
    name: 'knowledge_create',
    description: '新建一篇 Markdown 笔记（按分类落盘到对应子目录）。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '标题' },
        content: { type: 'string', description: '正文（Markdown）' },
        category: { type: 'string', enum: CATEGORIES, default: '其他' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
      },
      required: ['title', 'content'],
    },
    output: OUTPUT,
    execute: async ({ title, content, category = '其他', tags = [] } = {}) => {
      if (!title || !content) return { success: false, error: '标题和内容不能为空' };
      const r = writeNote(category, title, content, tags);
      return { success: true, id: r.id, title, path: r.path };
    },
  },
  {
    name: 'knowledge_update',
    description: '编辑/更新一篇已有笔记：可改标题、正文、分类、标签（重写整篇 Markdown）。',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '要更新的笔记 id' },
        title: { type: 'string', description: '新标题' },
        content: { type: 'string', description: '新正文（Markdown）' },
        category: { type: 'string', enum: CATEGORIES, description: '新分类' },
        tags: { type: 'array', items: { type: 'string' }, description: '新标签列表' },
      },
      required: ['id'],
    },
    output: OUTPUT,
    execute: async ({ id, title, content, category, tags } = {}) => {
      if (!id) return { success: false, error: '缺少 id' };
      const hit = readNote(id);
      if (!hit) return { success: false, error: '未找到笔记' };
      const old = readFileSync(hit.path, 'utf8');
      const parsed = parseNoteContent(old);
      const newTitle = title != null ? title : parsed.title;
      const newTags = tags != null ? tags : parsed.tags;
      const newContent = content != null ? content : stripMeta(old);
      const newCategory = category != null ? category : hit.id.split(/[\\/]/)[0];
      // 删除旧文件，按新分类/标题写新文件
      try { unlinkSync(hit.path); } catch {}
      const cleaned = String(newContent).replace(/^# .*\n+/, '').replace(/^tags:\s*\[.*\]\n+/, '').replace(/^## 创建时间\n[\s\S]*?---\n+/, '');
      const r = writeNote(newCategory, newTitle, cleaned, newTags);
      return { success: true, id: r.id, title: newTitle, path: r.path };
    },
  },
  {
    name: 'knowledge_delete',
    description: '删除一篇笔记（按 id）。',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: '要删除的笔记 id' } },
      required: ['id'],
    },
    output: OUTPUT,
    execute: async ({ id } = {}) => deleteNote(id),
  },
  {
    name: 'knowledge_import',
    description: '导入笔记：单篇 Markdown、单篇 JSON({title,content,category,tags})，或整库 zip（内含若干 .md）。',
    parameters: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['markdown', 'json', 'zip'], description: '导入格式' },
        content: { type: 'string', description: 'markdown 或 json 文本；zip 为 base64' },
        category: { type: 'string', enum: CATEGORIES, description: 'markdown 导入时的目标分类' },
        filename: { type: 'string', description: 'zip 导入时的文件名（用于记录）' },
      },
      required: ['format', 'content'],
    },
    output: OUTPUT,
    execute: async ({ format, content, category = '其他', filename } = {}) => {
      if (!content) return { success: false, error: '内容为空' };
      if (format === 'markdown') {
        const p = parseNoteContent(content);
        const t = p.title || '未命名导入';
        const r = writeNote(category, t, p.body.replace(/^# .*\n+/, '').replace(/^tags:\s*\[.*\]\n+/, '').replace(/^## 创建时间\n[\s\S]*?---\n+/, ''), p.tags);
        return { success: true, imported: 1, id: r.id, title: t };
      }
      if (format === 'json') {
        const obj = typeof content === 'string' ? JSON.parse(content) : content;
        const r = writeNote(obj.category || '其他', obj.title || '未命名', obj.content || '', obj.tags || []);
        return { success: true, imported: 1, id: r.id, title: r.title };
      }
      if (format === 'zip') {
        const buf = Buffer.from(content, 'base64');
        const files = parseZip(buf);
        let count = 0;
        for (const f of files) {
          if (!f.name.endsWith('.md') || f.name.endsWith('/')) continue;
          const text = f.data.toString('utf8');
          const p = parseNoteContent(text);
          const rel = relative('', f.name);
          const top = rel.split(/[\\/]/)[0];
          const cat = CATEGORIES.includes(top) ? top : '其他';
          const cleaned = text.replace(/^# .*\n+/, '').replace(/^tags:\s*\[.*\]\n+/, '').replace(/^## 创建时间\n[\s\S]*?---\n+/, '');
          writeNote(cat, p.title || '未命名', cleaned, p.tags);
          count++;
        }
        return { success: true, imported: count, filename };
      }
      return { success: false, error: '未知格式' };
    },
  },
  {
    name: 'knowledge_export',
    description: '导出笔记：单篇 markdown、单篇 json，或整库 zip（base64）。',
    parameters: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['markdown', 'json', 'zip'], description: '导出格式' },
        id: { type: 'string', description: '单篇导出时的笔记 id' },
      },
      required: ['format'],
    },
    output: OUTPUT,
    execute: async ({ format, id } = {}) => {
      const notes = scanDir(KB_ROOT);
      if (format === 'markdown' || format === 'json') {
        const hit = readNote(id);
        if (!hit) return { success: false, error: '未找到笔记' };
        const c = readFileSync(hit.path, 'utf8');
        const p = parseNoteContent(c);
        if (format === 'markdown') return { success: true, id: hit.id, title: p.title, markdown: c };
        return { success: true, id: hit.id, title: p.title, json: { title: p.title, content: stripMeta(c), category: hit.id.split(/[\\/]/)[0], tags: p.tags } };
      }
      if (format === 'zip') {
        const files = notes.map(n => ({ name: n.path + '.md', data: readFileSync(join(KB_ROOT, n.path + '.md'), 'utf8') }));
        const zip = buildZip(files);
        return { success: true, count: files.length, zipBase64: zip.toString('base64') };
      }
      return { success: false, error: '未知格式' };
    },
  },
  {
    name: 'knowledge_search',
    description: '在知识工坊全文搜索关键词，返回命中的笔记与匹配片段。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        category: { type: 'string', description: '限定分类（可选）' },
        limit: { type: 'integer', default: 10 },
      },
      required: ['query'],
    },
    output: OUTPUT,
    execute: async ({ query, category, limit = 10 } = {}) => {
      if (!query) return { success: false, error: '关键词不能为空' };
      const re = new RegExp(query, 'i');
      const results = [];
      for (const n of scanDir(KB_ROOT)) {
        if (category && n.category !== category) continue;
        const c = readFileSync(join(KB_ROOT, n.path + '.md'), 'utf8');
        const lines = c.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (re.test(lines[i])) {
            results.push({ id: n.id, title: n.title, category: n.category, line: i + 1, match: lines[i].trim().slice(0, 120) });
            break;
          }
        }
      }
      return { success: true, query, total: results.length, results: results.slice(0, limit) };
    },
  },
  {
    name: 'knowledge_stats',
    description: '返回知识工坊统计：笔记总数、各分类数量、最近更新。',
    parameters: { type: 'object', properties: {} },
    output: OUTPUT,
    execute: async () => {
      const notes = scanDir(KB_ROOT);
      const byCategory = {};
      for (const n of notes) byCategory[n.category] = (byCategory[n.category] || 0) + 1;
      const recent = notes.sort((a, b) => b.modified - a.modified).slice(0, 10)
        .map(n => ({ title: n.title, category: n.category, modified: n.modified }));
      return { success: true, totalNotes: notes.length, byCategory, recentUpdates: recent };
    },
  },
];

function stripMeta(content) {
  return String(content)
    .replace(/^# .*\n+/, '')
    .replace(/^tags:\s*\[.*\]\n+/, '')
    .replace(/^## 创建时间\n[\s\S]*?---\n+/, '')
    .trim();
}

export const name = 'knowledge-workshop';
export const inject = ['tools', 'webServer'];

export function apply(ctx) {
  for (const t of TOOLS) ctx.tools.register(t);

  // 同源 HTTP 路由：供侧边栏面板调用
  const disposers = [];
  const json = (res, code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  const readBody = (req) => new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { resolve({}); } });
  });

  const routes = [
    ['GET', '/api/kw2/list', async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const cat = url.searchParams.get('category');
      let notes = scanDir(KB_ROOT);
      if (cat && cat !== '全部') notes = notes.filter(n => n.category === cat);
      notes.sort((a, b) => b.modified - a.modified);
      json(res, 200, { success: true, total: notes.length, notes });
    }],
    ['GET', '/api/kw2/searchq', async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const q = url.searchParams.get('q') || '';
      const cat = url.searchParams.get('category');
      const re = q ? new RegExp(q, 'i') : null;
      const results = [];
      for (const n of scanDir(KB_ROOT)) {
        if (cat && n.category !== cat) continue;
        if (!re) continue;
        const c = readFileSync(join(KB_ROOT, n.path + '.md'), 'utf8');
        const lines = c.split('\n');
        for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) { results.push({ id: n.id, title: n.title, category: n.category, line: i + 1, match: lines[i].trim().slice(0, 120) }); break; }
      }
      json(res, 200, { success: true, query: q, total: results.length, results });
    }],
    ['GET', '/api/kw2/get', async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id') || '';
      const hit = readNote(id);
      if (!hit) return json(res, 404, { success: false, error: '未找到' });
      const c = readFileSync(hit.path, 'utf8');
      json(res, 200, { success: true, id: hit.id, title: c.match(/^# (.+)$/m)?.[1] || hit.id, content: c, category: hit.id.split(/[\\/]/)[0] });
    }],
    ['POST', '/api/kw2/note/create', async (req, res) => {
      const p = await readBody(req);
      if (!p.title || !p.content) return json(res, 400, { success: false, error: '标题和内容不能为空' });
      const r = writeNote(p.category || '其他', p.title, p.content, p.tags || []);
      json(res, 200, { success: true, id: r.id, title: p.title, path: r.path });
    }],
    ['PUT', '/api/kw2/note/update', async (req, res) => {
      const p = await readBody(req);
      if (!p.id) return json(res, 400, { success: false, error: '缺少 id' });
      const hit = readNote(p.id);
      if (!hit) return json(res, 404, { success: false, error: '未找到笔记' });
      const old = readFileSync(hit.path, 'utf8');
      const parsed = parseNoteContent(old);
      const newTitle = p.title != null ? p.title : parsed.title;
      const newTags = p.tags != null ? p.tags : parsed.tags;
      const newContent = p.content != null ? p.content : stripMeta(old);
      const newCategory = p.category != null ? p.category : hit.id.split(/[\\/]/)[0];
      try { unlinkSync(hit.path); } catch {}
      const cleaned = String(newContent).replace(/^# .*\n+/, '').replace(/^tags:\s*\[.*\]\n+/, '').replace(/^## 创建时间\n[\s\S]*?---\n+/, '');
      const r = writeNote(newCategory, newTitle, cleaned, newTags);
      json(res, 200, { success: true, id: r.id, title: newTitle, path: r.path });
    }],
    ['DELETE', '/api/kw2/note/delete', async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id') || '';
      const r = deleteNote(id);
      if (!r.success) return json(res, r.error === '未找到笔记' ? 404 : 500, r);
      json(res, 200, r);
    }],
    ['POST', '/api/kw2/import', async (req, res) => {
      const p = await readBody(req);
      const { format, content, category = '其他', filename } = p;
      if (!content) return json(res, 400, { success: false, error: '内容为空' });
      try {
        if (format === 'markdown') {
          const pc = parseNoteContent(content);
          const r = writeNote(category, pc.title || '未命名导入', stripMeta(content), pc.tags);
          return json(res, 200, { success: true, imported: 1, id: r.id, title: r.title });
        }
        if (format === 'json') {
          const obj = typeof content === 'string' ? JSON.parse(content) : content;
          const r = writeNote(obj.category || '其他', obj.title || '未命名', obj.content || '', obj.tags || []);
          return json(res, 200, { success: true, imported: 1, id: r.id, title: r.title });
        }
        if (format === 'zip') {
          const buf = Buffer.from(content, 'base64');
          const files = parseZip(buf);
          let count = 0;
          for (const f of files) {
            const clean = f.name.replace(/\.md$/i, '');
            if (f.name.endsWith('/') || !clean) continue;
            const text = f.data.toString('utf8');
            const pc = parseNoteContent(text);
            const top = clean.split(/[\\/]/)[0];
            const cat = CATEGORIES.includes(top) ? top : '其他';
            writeNote(cat, pc.title || '未命名', stripMeta(text), pc.tags);
            count++;
          }
          return json(res, 200, { success: true, imported: count, filename });
        }
        return json(res, 400, { success: false, error: '未知格式' });
      } catch (e) { return json(res, 500, { success: false, error: String(e?.message || e) }); }
    }],
    ['GET', '/api/kw2/exportdl', async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const format = url.searchParams.get('format') || 'zip';
      const id = url.searchParams.get('id') || '';
      const notes = scanDir(KB_ROOT);
      try {
        if (format === 'markdown' || format === 'json') {
          const hit = readNote(id);
          if (!hit) return json(res, 404, { success: false, error: '未找到笔记' });
          const c = readFileSync(hit.path, 'utf8');
          const p = parseNoteContent(c);
          const rel = hit.path.replace(KB_ROOT, '').replace(/^[\\/]+/, '').replace(/\.md$/, '');
          const segs = rel.split(/[\\/]/);
          const category = segs.length > 1 ? segs[0] : '其他';
          if (format === 'markdown') return json(res, 200, { success: true, id: hit.id, title: p.title, markdown: c });
          return json(res, 200, { success: true, id: hit.id, title: p.title, json: { title: p.title, content: stripMeta(c), category, tags: p.tags } });
        }
        if (format === 'zip') {
          const files = notes.map(n => {
            const rel = n.path.replace(/\.md$/, '');
            return { name: rel + '.md', data: readFileSync(join(KB_ROOT, n.path), 'utf8') };
          });
          const zip = buildZip(files);
          return json(res, 200, { success: true, count: files.length, zipBase64: zip.toString('base64') });
        }
        return json(res, 400, { success: false, error: '未知格式' });
      } catch (e) { return json(res, 500, { success: false, error: String(e?.message || e) }); }
    }],
    ['GET', '/api/kw2/stats', async (_req, res) => {
      const notes = scanDir(KB_ROOT);
      const byCategory = {};
      for (const n of notes) byCategory[n.category] = (byCategory[n.category] || 0) + 1;
      json(res, 200, { success: true, totalNotes: notes.length, byCategory, recentUpdates: notes.sort((a, b) => b.modified - a.modified).slice(0, 10).map(n => ({ title: n.title, category: n.category, modified: n.modified })) });
    }],
    ['POST', '/api/kw2/media/upload', async (req, res) => {
      const mediaDir = join(KB_ROOT, '_media');
      if (!existsSync(mediaDir)) mkdirSync(mediaDir, { recursive: true });
      const body = await readBody(req);
      const { type, data, name } = body;
      if (!data || !type) return json(res, 400, { success: false, error: '缺少数据' });
      // data 可能是 data:mime;base64,xxxx 格式
      let b64Data = data;
      if (typeof data === 'string' && data.startsWith('data:')) {
        b64Data = data.split(',')[1];
      }
      const buf = Buffer.from(b64Data, 'base64');
      // 存储到文件（用于导出 zip）
      const ext = type === 'image' ? '.png' : '.mp4';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      const filePath = join(mediaDir, fileName);
      writeFileSync(filePath, buf);
      // 返回 data URL 供 Markdown 直接使用（绕过 DSH 认证）
      const mimeType = type === 'image' ? 'image/png' : 'video/mp4';
      const dataUrl = `data:${mimeType};base64,${b64Data}`;
      json(res, 200, { success: true, url: dataUrl, name: name || fileName, localPath: filePath });
    }],
  ];

  for (const [method, path, handler] of routes) {
    try {
      disposers.push(ctx.webServer.register({
        kind: 'exact',
        path,
        handler: async (req, res) => {
          if (req.method !== method) { json(res, 405, { success: false, error: 'Method Not Allowed' }); return; }
          try { await handler(req, res); }
          catch (e) { json(res, 500, { success: false, error: String(e?.message || e) }); }
        },
      }));
    } catch (e) { ctx.logger?.warn?.('[knowledge-workshop] route ' + path + ' 注册失败: ' + (e?.message || e)); }
  }

  return () => { for (const d of disposers) try { d(); } catch {} };
}
