window.__ModuleLoader__.load({
  id: 'knowledge-workshop',
  factory(require) {
    const React = require('react');
    const { useState, useEffect, useRef } = React;
    const h = React.createElement;

    const API = (path, opts) =>
      fetch('/api/kw2' + path, Object.assign({ credentials: 'same-origin' }, opts))
        .then((r) => r.json());

    const CATEGORIES = ['全部', '项目', '代码', '设计', '产品', '学习', '生活', '其他'];
    const CAT_ICON = { 项目: '📁', 代码: '💻', 设计: '🎨', 产品: '📦', 学习: '📚', 生活: '🌿', 其他: '📝', 全部: '🗂️' };
    const catIcon = (c) => CAT_ICON[c] || '📝';

    const escapeHtml = (s) =>
      String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const renderMd = (md) => {
      const esc = escapeHtml(md);
      let html = esc
        .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
        .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
        .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
        .replace(/^### (.*)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+?)`/g, '<code>$1</code>')
        .replace(/^\s*[-*] (.*)$/gm, '<li>$1</li>');
      // 渲染图片 ![](url) 或 ![alt](url)
      html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        return `<img src="${src}" alt="${alt || ''}" style="max-width:100%;border-radius:8px;margin:8px 0;">`;
      });
      // 渲染视频 [视频:xxx](url)
      html = html.replace(/\[视频:?\s*([^\]]*)\]\(([^)]+)\)/g, (match, title, src) => {
        return `<div style="margin:8px 0;"><video controls style="max-width:100%;border-radius:8px;"><source src="${src}">视频不支持</video><br><small>${title || src}</small></div>`;
      });
      html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
      html = html.split(/\n{2,}/).map((b) => {
        if (/^<(h\d|ul|ol|pre|blockquote|img|div|video)/.test(b.trim())) return b;
        if (!b.trim()) return '';
        return '<p>' + b.replace(/\n/g, '<br>') + '</p>';
      }).join('');
      return html;
    };

    const fmtTime = (ms) => {
      if (!ms) return '';
      try { return new Date(ms).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
      catch { return ''; }
    };
    const snippet = (md) => {
      const txt = String(md || '').replace(/^# .*\n+/, '').replace(/^tags:.*\n+/, '').replace(/^## .*\n[\s\S]*?---\n+/, '').replace(/[#*`>]/g, '').replace(/\n+/g, ' ').trim();
      return txt.length > 90 ? txt.slice(0, 90) + '…' : txt;
    };

    const styles = {
      wrap: { display: 'flex', flexDirection: 'column', gap: 16, padding: 20, maxWidth: 1080, margin: '0 auto', width: '100%', boxSizing: 'border-box', textAlign: 'start', color: 'var(--dsw-alias-label-primary,#18202c)', flex: 1, overflow: 'auto' },
      head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
      title: { fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 },
      toolbar: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
      search: { flex: 1, minWidth: 180, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--dsw-alias-border-l3,#e7e9ef)', borderRadius: 8, padding: '0 10px', background: 'var(--dsw-alias-bg-layer-1,#fff)' },
      input: { border: 0, outline: 0, background: 'transparent', padding: '9px 0', width: '100%', fontSize: 14, color: 'inherit' },
      nav: { display: 'flex', flexWrap: 'wrap', gap: 6 },
      chip: (active) => ({ fontSize: 12, padding: '5px 12px', borderRadius: 999, cursor: 'pointer', border: '1px solid var(--dsw-alias-border-l3,#e7e9ef)', background: active ? 'var(--dsw-alias-bg-layer-2,#f0f2f5)' : 'transparent', color: active ? 'var(--dsw-alias-label-primary,#18202c)' : 'var(--dsw-alias-label-secondary,#667085)', fontWeight: active ? 600 : 400 }),
      grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 },
      card: { border: '1px solid var(--dsw-alias-border-l3,#e7e9ef)', borderRadius: 12, padding: 16, background: 'var(--dsw-alias-bg-layer-1,#fff)', display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', transition: 'box-shadow .15s, transform .15s' },
      cardTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
      cardTitle: { fontSize: 15, fontWeight: 650, lineHeight: 1.4 },
      cardSnip: { fontSize: 13, color: 'var(--dsw-alias-label-secondary,#667085)', lineHeight: 1.6, flex: 1 },
      meta: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--dsw-alias-label-secondary,#667085)' },
      tag: (kind) => ({ fontSize: 11, padding: '1px 7px', borderRadius: 5, background: 'var(--dsw-alias-bg-layer-2,#f0f2f5)', color: kind === 'cat' ? 'var(--dsw-alias-label-primary,#18202c)' : 'var(--dsw-alias-label-secondary,#667085)' }),
      cardActions: { display: 'flex', gap: 6, borderTop: '1px solid var(--dsw-alias-border-l3,#e7e9ef)', paddingTop: 10, marginTop: 2 },
      btn: { border: '1px solid var(--dsw-alias-border-l3,#e7e9ef)', borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer', background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'inherit' },
      primary: { background: 'var(--dsw-alias-label-primary,#18202c)', color: 'var(--dsw-alias-bg-layer-1,#fff)', borderColor: 'var(--dsw-alias-label-primary,#18202c)' },
      danger: { color: 'var(--dsw-alias-state-error-primary,#b43c3c)', borderColor: 'var(--dsw-alias-state-error-primary,#b43c3c)' },
      link: { border: 0, background: 'transparent', color: 'var(--dsw-alias-label-secondary,#667085)', cursor: 'pointer', fontSize: 13, padding: '4px 6px', borderRadius: 6 },
      view: { display: 'flex', flexDirection: 'column', gap: 12 },
      content: { fontSize: 14, lineHeight: 1.75, overflowWrap: 'anywhere', background: 'var(--dsw-alias-bg-layer-2,#f7f8fa)', borderRadius: 10, padding: 16 },
      overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000, padding: 12, overflow: 'auto' },
      editorWrap: { display: 'flex', flexDirection: 'column', gap: 0 },
      editorToolbar: { display: 'flex', gap: 4, padding: '8px 0', borderBottom: '1px solid var(--dsw-alias-border-l3,#e7e9ef)', marginBottom: 8, flexWrap: 'wrap' },
      tbBtn: { border: '1px solid var(--dsw-alias-border-l3,#e7e9ef)', borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer', background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'inherit', display: 'flex', alignItems: 'center', gap: 4 },
      imgPreview: { maxWidth: '100%', borderRadius: 8, margin: '8px 0' },
      modal: { width: 'min(560px,100%)', maxHeight: '100%', overflow: 'auto', background: 'var(--dsw-alias-bg-layer-1,#fff)', borderRadius: 12, padding: 20, boxSizing: 'border-box', color: 'inherit' },
      modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 16, fontWeight: 600, marginBottom: 14 },
      field: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 },
      label: { fontSize: 13 },
      ta: { border: '1px solid var(--dsw-alias-border-l3,#e7e9ef)', borderRadius: 8, padding: '8px 11px', fontSize: 14, fontFamily: 'inherit', minHeight: 120, color: 'inherit', background: 'var(--dsw-alias-bg-layer-1,#fff)', resize: 'vertical', width: '100%', boxSizing: 'border-box' },
      select: { border: '1px solid var(--dsw-alias-border-l3,#e7e9ef)', borderRadius: 8, padding: '8px 11px', fontSize: 14, minHeight: 38, color: 'inherit', background: 'var(--dsw-alias-bg-layer-1,#fff)' },
      empty: { padding: 48, textAlign: 'center', color: 'var(--dsw-alias-label-secondary,#667085)' },
      toast: { position: 'fixed', left: '50%', bottom: 36, transform: 'translateX(-50%)', background: 'var(--dsw-alias-label-primary,#18202c)', color: 'var(--dsw-alias-bg-layer-1,#fff)', padding: '9px 16px', borderRadius: 8, fontSize: 13, zIndex: 1100 },
    };

    function download(filename, data, mime) {
      const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
    }
    function b64ToBytes(b64) {
      const bin = atob(b64); const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }

    function Panel() {
      const [notes, setNotes] = useState([]);
      const [cat, setCat] = useState('全部');
      const [query, setQuery] = useState('');
      const [loading, setLoading] = useState(true);
      const [active, setActive] = useState(null);
      const [showNew, setShowNew] = useState(false);
      const [editTarget, setEditTarget] = useState(null);
      const [showImport, setShowImport] = useState(false);
      const [toast, setToast] = useState('');
      const did = useRef(false);

      const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };

      useEffect(() => {
        if (did.current) return; did.current = true;
        load();
      }, []);

      function load() {
        setLoading(true);
        API('/list' + (cat !== '全部' ? '?category=' + encodeURIComponent(cat) : '')).then((d) => { if (d.success) setNotes(d.notes || []); setLoading(false); }).catch(() => { setLoading(false); flash('加载失败'); });
      }
      useEffect(() => { if (did.current) load(); }, [cat]);

      function doSearch(q) {
        setQuery(q);
        if (!q) { load(); return; }
        setLoading(true);
        API('/searchq?q=' + encodeURIComponent(q)).then((d) => { if (d.success) setNotes(d.results.map((r) => ({ id: r.id, title: r.title, category: r.category }))); setLoading(false); }).catch(() => { setLoading(false); flash('搜索失败'); });
      }

      function openNote(id) {
        API('/get?id=' + encodeURIComponent(id)).then((d) => { if (d.success) setActive(d); else flash('未找到'); }).catch(() => flash('打开失败'));
      }

      function create() {
        const title = document.getElementById('kw-title').value.trim();
        const category = document.getElementById('kw-cat').value;
        const tags = document.getElementById('kw-tags').value.split(',').map((s) => s.trim()).filter(Boolean);
        const content = document.getElementById('kw-content').value;
        if (!title) { flash('请填写标题'); return; }
        API('/note/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, category, tags, content }) })
          .then((d) => { if (d.success) { setShowNew(false); setActive({ id: d.id, title, content }); load(); flash('已创建'); } else flash(d.error || '创建失败'); })
          .catch(() => flash('创建失败'));
      }

      function saveEdit() {
        const title = document.getElementById('ed-title').value.trim();
        const category = document.getElementById('ed-cat').value;
        const tags = document.getElementById('ed-tags').value.split(',').map((s) => s.trim()).filter(Boolean);
        const content = document.getElementById('ed-content').value;
        if (!title) { flash('请填写标题'); return; }
        API('/note/update', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editTarget.id, title, category, tags, content }) })
          .then((d) => { if (d.success) { const newId = d.id; setEditTarget(null); setActive(null); load(); API('/get?id=' + encodeURIComponent(newId)).then((nd) => { if (nd.success) setActive(nd); }); flash('已保存'); } else flash(d.error || '保存失败'); })
          .catch(() => flash('保存失败'));
      }

      function removeNote(n) {
        if (!confirm(`确定删除「${n.title}」？`)) return;
        API('/note/delete?id=' + encodeURIComponent(n.id), { method: 'DELETE' })
          .then((d) => { if (d.success) { if (active && active.id === n.id) setActive(null); load(); flash('已删除'); } else flash(d.error || '删除失败'); })
          .catch(() => flash('删除失败'));
      }

      function editNote(n) {
        API('/get?id=' + encodeURIComponent(n.id)).then((d) => { if (d.success) setEditTarget(d); else flash('未找到'); }).catch(() => flash('打开失败'));
      }

      function exportAll() {
        API('/exportdl?format=zip').then((d) => {
          if (d.success && d.zipBase64) { download('知识工坊-整库.zip', new Blob([b64ToBytes(d.zipBase64)]), 'application/zip'); flash(`已导出 ${d.count} 篇`); }
          else flash('导出失败');
        }).catch(() => flash('导出失败'));
      }
      function exportOne() {
        if (!active) return;
        API('/exportdl?format=markdown&id=' + encodeURIComponent(active.id)).then((d) => {
          if (d.success) download((d.title || 'note') + '.md', d.markdown, 'text/markdown');
          else flash('导出失败');
        }).catch(() => flash('导出失败'));
      }

      // ---------- 导入弹窗 ----------
      function ImportModal() {
        const [fmt, setFmt] = useState('markdown');
        const [cat, setCat] = useState('其他');
        const [text, setText] = useState('');
        const [busy, setBusy] = useState(false);
        const fileRef = useRef(null);
        function onFile(e) {
          const f = e.target.files[0]; if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result;
            const b64 = typeof res === 'string' && res.startsWith('data:') ? res.split(',')[1] : res;
            setText(b64); setFmt('zip');
          };
          reader.readAsDataURL(f);
        }
        function doImport() {
          if (!text.trim()) { flash('请粘贴内容或选择文件'); return; }
          setBusy(true);
          API('/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: fmt, content: text, category: cat }) })
            .then((d) => { setBusy(false); if (d.success) { setShowImport(false); setText(''); load(); flash(`已导入 ${d.imported} 篇`); } else { flash(d.error || '导入失败'); } })
            .catch(() => { setBusy(false); flash('导入失败'); });
        }
        return h('div', { style: styles.overlay, onClick: (e) => { if (e.target === e.currentTarget) setShowImport(false); } },
          h('div', { style: styles.modal },
            h('div', { style: styles.modalHead }, '导入笔记', h('button', { style: styles.btn, onClick: () => setShowImport(false) }, '✕')),
            h('div', { style: styles.field }, h('div', { style: styles.label }, '格式'),
              h('select', { style: styles.select, value: fmt, onChange: (e) => setFmt(e.target.value) },
                h('option', { value: 'markdown' }, 'Markdown 单篇'), h('option', { value: 'json' }, 'JSON 单篇'), h('option', { value: 'zip' }, '整库 zip（含多个 .md）'))),
            fmt !== 'zip' && h('div', { style: styles.field }, h('div', { style: styles.label }, '目标分类（Markdown 导入时）'),
              h('select', { id: 'im-cat', style: styles.select, value: cat, onChange: (e) => setCat(e.target.value) }, CATEGORIES.filter((c) => c !== '全部').map((c) => h('option', { value: c }, catIcon(c) + ' ' + c)))),
            h('div', { style: styles.field }, h('div', { style: styles.label }, fmt === 'zip' ? '选择 .zip 文件' : '粘贴内容'),
              fmt === 'zip'
                ? h('input', { ref: fileRef, type: 'file', accept: '.zip', onChange: onFile, style: { fontSize: 13 } })
                : h('textarea', { id: 'im-text', style: styles.ta, value: text, onChange: (e) => setText(e.target.value), placeholder: fmt === 'json' ? '{"title":"...","content":"...","category":"其他","tags":[]}' : '# 标题\ntags: [标签]\n\n正文…' })),
            h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } },
              h('button', { style: styles.btn, onClick: () => setShowImport(false) }, '取消'),
              h('button', { style: { ...styles.btn, ...styles.primary }, onClick: doImport, disabled: busy }, busy ? '导入中…' : '导入'))));
      }

      // ---------- 新建 / 编辑弹窗 ----------
      function EditorModal({ editing }) {
        const target = editing ? editTarget : null;
        const initTitle = target ? target.title : '';
        const initCat = target ? (target.category || '其他') : '其他';
        const initTags = target ? (target.tags || []).join(', ') : '';
        const initContent = target && target.content ? target.content : '';
        const [pendingMedia, setPendingMedia] = useState([]);

        function insertMedia(type, url, alt) {
          const ta = document.getElementById(editing ? 'ed-content' : 'kw-content');
          if (!ta) return;
          const pos = ta.selectionStart || ta.value.length;
          const before = ta.value.slice(0, pos);
          const after = ta.value.slice(pos);
          const insert = type === 'image'
            ? `![${alt || '图片'}](${url})`
            : `[视频: ${alt || '点击播放'}](${url})`;
          ta.value = before + insert + after;
          ta.selectionStart = ta.selectionEnd = pos + insert.length;
          ta.focus();
        }

        function handleMediaUpload(e, type) {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            setPendingMedia(prev => [...prev, { type, url: dataUrl, name: file.name }]);
          };
          reader.readAsDataURL(file);
        }

        function uploadPending() {
          if (pendingMedia.length === 0) return;
          pendingMedia.forEach((m) => {
            API('/media/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: m.type, data: m.url, name: m.name })
            }).then((d) => {
              if (!d.success) { flash('上传失败: ' + (d.error || '未知错误')); return; }
              // 如果返回的是相对 URL（/api/kw2/media/xxx），转为 data URL
              let finalUrl = d.url;
              if (finalUrl && !finalUrl.startsWith('data:')) {
                // 尝试从本地路径读取并转为 data URL
                const b64 = finalUrl.split('/').pop(); // 文件名
                // 直接用原始 dataUrl（已在 pendingMedia 中）
                finalUrl = m.url;
              }
              insertMedia(m.type, finalUrl, m.name);
            }).catch(() => flash('上传失败'));
          });
          setPendingMedia([]);
        }

        function removePending(idx) {
          setPendingMedia(prev => prev.filter((_, i) => i !== idx));
        }

        const contentField = h('div', { style: styles.field },
          h('div', { style: styles.label }, '内容（Markdown）'),
          h('div', { style: styles.editorWrap },
            h('div', { style: styles.editorToolbar },
              h('button', {
                style: styles.tbBtn,
                title: '插入图片',
                onClick: () => { const inp = document.getElementById('img-upload-btn'); if (inp) inp.click(); }
              }, '🖼️ 图片'),
              h('button', {
                style: styles.tbBtn,
                title: '插入视频',
                onClick: () => { const inp = document.getElementById('vid-upload-btn'); if (inp) inp.click(); }
              }, '🎬 视频'),
              h('input', { id: 'img-upload-btn', type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: (e) => handleMediaUpload(e, 'image') }),
              h('input', { id: 'vid-upload-btn', type: 'file', accept: 'video/*', style: { display: 'none' }, onChange: (e) => handleMediaUpload(e, 'video') }),
              pendingMedia.length > 0 && h('button', {
                style: { ...styles.tbBtn, ...styles.primary },
                onClick: uploadPending
              }, `上传 ${pendingMedia.length} 个`)),
            pendingMedia.length > 0 && h('div', {
              style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }
            }, pendingMedia.map((m, i) =>
              h('div', {
                key: i,
                style: { position: 'relative', width: 80, height: 80 }
              },
                m.type === 'image'
                  ? h('img', { src: m.url, style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l3,#e7e9ef)' } })
                  : h('div', { style: { width: '100%', height: '100%', background: '#18202c', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 } }, '🎬'),
                h('button', {
                  style: {
                    position: 'absolute', top: -4, right: -4,
                    background: '#b43c3c', color: '#fff',
                    border: 'none', borderRadius: '50%',
                    width: 18, height: 18, cursor: 'pointer',
                    fontSize: 10, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  },
                  onClick: () => removePending(i)
                }, '✕')
              )
            )),
            h('textarea', {
              id: editing ? 'ed-content' : 'kw-content',
              style: { ...styles.ta, flex: 1, minHeight: 200 },
              defaultValue: initContent,
              placeholder: '支持 Markdown，可插入 ![图片](url) 或 [视频](url)…'
            })
          )
        );

        return h('div', {
          style: styles.overlay,
          onClick: (e) => {
            if (e.target === e.currentTarget) {
              editing ? setEditTarget(null) : setShowNew(false);
            }
          }
        },
          h('div', { style: { ...styles.modal, maxWidth: 640 } },
            h('div', { style: styles.modalHead },
              editing ? '编辑笔记' : '新建笔记',
              h('button', {
                style: styles.btn,
                onClick: () => { editing ? setEditTarget(null) : setShowNew(false); }
              }, '✕')
            ),
            h('div', { style: styles.field },
              h('div', { style: styles.label }, '标题'),
              h('input', {
                id: editing ? 'ed-title' : 'kw-title',
                style: styles.input,
                defaultValue: initTitle,
                placeholder: '标题'
              })
            ),
            h('div', { style: styles.field },
              h('div', { style: styles.label }, '分类'),
              h('select', {
                id: editing ? 'ed-cat' : 'kw-cat',
                style: styles.select,
                defaultValue: initCat
              }, CATEGORIES.filter((c) => c !== '全部').map((c) =>
                h('option', { value: c }, catIcon(c) + ' ' + c)
              ))
            ),
            h('div', { style: styles.field },
              h('div', { style: styles.label }, '标签（逗号分隔）'),
              h('input', {
                id: editing ? 'ed-tags' : 'kw-tags',
                style: styles.input,
                defaultValue: initTags,
                placeholder: 'DSH, 教程'
              })
            ),
            contentField,
            h('div', {
              style: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }
            },
              h('button', {
                style: styles.btn,
                onClick: () => { editing ? setEditTarget(null) : setShowNew(false); }
              }, '取消'),
              h('button', {
                style: { ...styles.btn, ...styles.primary },
                onClick: editing ? saveEdit : create
              }, editing ? '保存' : '创建')
            )
          )
        );
      }

      // ---------- 详情 ----------
      if (active) {
        return h('div', { style: styles.wrap },
          h('div', { style: styles.head },
            h('div', { style: styles.title }, '📖 ', active.title),
            h('div', { style: styles.toolbar },
              h('button', { style: styles.btn, onClick: () => setEditTarget(active) }, '✏️ 编辑'),
              h('button', { style: styles.btn, onClick: exportOne }, '📤 导出'),
              h('button', { style: { ...styles.btn, ...styles.danger }, onClick: () => removeNote(active) }, '🗑️ 删除'),
              h('button', { style: styles.btn, onClick: () => setActive(null) }, '← 返回'))),
          h('div', { style: styles.view },
            h('div', { style: styles.meta }, h('span', { style: styles.tag('cat') }, active.category), (active.tags || []).map((t) => h('span', { style: styles.tag('tag') }, '#' + t)), active.id ? h('span', null, fmtTime(active.modified)) : null),
            h('div', { style: styles.content, dangerouslySetInnerHTML: { __html: renderMd(active.content) } })));
      }

      // ---------- 列表（卡片式） ----------
      const cards = loading
        ? h('div', { style: styles.empty }, '加载中…')
        : notes.length === 0
          ? h('div', { style: styles.empty }, '📭 还没有笔记')
          : h('div', { style: styles.grid }, notes.map((n) => {
              const onCard = (e) => { if (e.target.closest('[data-act]')) return; openNote(n.id); };
              return h('div', { style: styles.card, key: n.id, onClick: onCard },
                h('div', { style: styles.cardTop },
                  h('div', { style: styles.cardTitle }, catIcon(n.category), ' ', n.title),
                  h('span', { style: styles.tag('cat') }, n.category)),
                h('div', { style: styles.cardSnip }, snippet(n.content) || '（无正文）'),
                h('div', { style: styles.meta }, h('span', null, fmtTime(n.modified)), (n.tags || []).slice(0, 3).map((t) => h('span', { style: styles.tag('tag') }, '#' + t))),
                h('div', { style: styles.cardActions },
                  h('button', { style: styles.link, 'data-act': 'view', onClick: () => openNote(n.id) }, '查看'),
                  h('button', { style: styles.link, 'data-act': 'edit', onClick: () => editNote(n) }, '编辑'),
                  h('button', { style: { ...styles.link, ...styles.danger }, 'data-act': 'del', onClick: () => removeNote(n) }, '删除')));
            }));

      return h('div', { style: styles.wrap },
        h('div', { style: styles.head },
          h('div', { style: styles.title }, '📚 知识工坊'),
          h('div', { style: styles.toolbar },
            h('button', { style: { ...styles.btn, ...styles.primary }, onClick: () => setShowNew(true) }, '✨ 新建'),
            h('button', { style: styles.btn, onClick: () => setShowImport(true) }, '📥 导入'),
            h('button', { style: styles.btn, onClick: exportAll }, '📤 导出整库'))),
        h('div', { style: styles.search }, h('input', { style: styles.input, placeholder: '搜索笔记…', value: query, onInput: (e) => doSearch(e.target.value) })),
        h('div', { style: styles.nav }, CATEGORIES.map((c) => h('span', { style: styles.chip(cat === c), onClick: () => setCat(c) }, c))),
        cards,
        showNew && h(EditorModal, { editing: false }),
        editTarget && h(EditorModal, { editing: true }),
        showImport && h(ImportModal, null),
        toast ? h('div', { style: styles.toast }, toast) : null);
    }

    function SidebarIcon({ size }) {
      return h('span', { 'aria-hidden': true, style: { fontSize: size || 18, lineHeight: 1 } }, '📚');
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        // 防重复注册：用 window 级标记跨 fiber 去重
        if (!window.__kw2_sidebar_registered__) {
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
            { name: 'sidebar.panellist', id: 'knowledge-workshop', order: 40, label: () => '📚 知识工坊' },
            SidebarIcon));
          window.__kw2_sidebar_registered__ = true;
        }
        if (!window.__kw2_main_registered__) {
          ctx.slots.inject('main', () => ctx.slots.register(
            { name: 'main', key: 'knowledge-workshop', title: () => '知识工坊', inject: () => ({ workbench: true }) },
            Panel));
          window.__kw2_main_registered__ = true;
        }
        console.log('[knowledge-workshop] 已注册左侧栏入口与主页面');
      },
    };
  },
});
