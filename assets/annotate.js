/* Web Deck Template · MIT — 批注（排练时给「这一页的第几下」记修改意见）
   A 写批注：Enter 保存，Shift+Enter 换行，Esc 取消
   L 批注清单：点一条跳过去，× 删除；可复制 / 下载 Markdown / 清空
   存在本机 localStorage，观众屏和演讲者视图共用。 */
(function () {
  if (new URLSearchParams(location.search).get('preview') === '1' || !window.DECK) return;
  const D = window.DECK, KEY = 'wdt-annotations:' + location.pathname;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const save = a => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const where = a => `第 ${a.i + 1} 页「${a.title || a.id}」${a.t ? ' · 第 ' + a.t + ' 下' : ' · 进页'}`;

  const st = document.createElement('style');
  st.textContent = `.an-wrap{position:fixed;inset:0;z-index:3000;display:none;align-items:flex-start;justify-content:center;padding-top:10vh;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:var(--sans);color:#f5f5f7}
  .an-wrap.open{display:flex}
  .an-card{width:min(760px,92vw);max-height:78vh;display:flex;flex-direction:column;background:rgba(28,28,30,.95);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:22px 24px;box-shadow:0 30px 80px rgba(0,0,0,.6)}
  .an-hd{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-bottom:14px}.an-hd b{font-size:20px}.an-hd span{font-size:14px;color:var(--a1)}
  .an-card textarea{width:100%;min-height:100px;resize:vertical;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:14px;color:#f5f5f7;font:18px/1.55 var(--sans);outline:none}
  .an-card textarea:focus{border-color:var(--a2)}
  .an-tip{margin-top:10px;font-size:13px;color:#8e8e93}
  .an-list{overflow:auto}.an-it{display:flex;gap:12px;padding:10px;border-radius:10px;cursor:pointer}.an-it:hover{background:rgba(255,255,255,.06)}
  .an-it .w{flex:0 0 240px;font-size:14px;color:var(--a1)}.an-it .t{flex:1;font-size:16px;white-space:pre-wrap}
  .an-it .x{border:0;background:none;color:#8e8e93;font-size:20px;cursor:pointer}.an-it .x:hover{color:#ff453a}
  .an-empty{padding:28px 0;text-align:center;color:#8e8e93}
  .an-btns{display:flex;gap:8px;margin-top:14px}.an-btns button{background:#2c2c2e;color:#f5f5f7;border:0;border-radius:8px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer}`;
  document.head.appendChild(st);
  const wrap = document.createElement('div'); wrap.className = 'an-wrap';
  wrap.innerHTML = '<div class="an-card"></div>';
  document.body.appendChild(wrap);
  const card = wrap.firstChild;
  let mode = null;
  const close = () => { mode = null; wrap.classList.remove('open'); if (wrap.contains(document.activeElement)) document.activeElement.blur(); };
  wrap.addEventListener('click', e => { e.stopPropagation(); if (e.target === wrap) close(); });

  function openAdd() {
    mode = 'add';
    const here = { i: D.i, t: D.step, ...D.meta(D.i) };
    card.innerHTML = `<div class="an-hd"><b>写批注</b><span>${esc(where(here))}</span></div><textarea placeholder="这里要改什么？"></textarea><div class="an-tip">Enter 保存 · Shift+Enter 换行 · Esc 取消 · L 查看全部</div>`;
    wrap.classList.add('open');
    const ta = card.querySelector('textarea'); ta.focus();
    ta.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') close();
      else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = ta.value.trim();
        if (text) { const a = load(); a.push({ ...here, text, at: Date.now() }); save(a); }
        close();
      }
    });
  }
  const md = () => load().sort((a, b) => a.i - b.i || a.t - b.t).map(a => `- ${where(a)}：${a.text}`).join('\n');
  function openList() {
    mode = 'list';
    const a = load().map((x, k) => ({ ...x, k })).sort((x, y) => x.i - y.i || x.t - y.t);
    card.innerHTML = `<div class="an-hd"><b>批注清单</b><span>${a.length} 条</span></div><div class="an-list">${a.length ? a.map(x =>
      `<div class="an-it" data-k="${x.k}"><div class="w">${esc(where(x))}</div><div class="t">${esc(x.text)}</div><button class="x" title="删除">×</button></div>`).join('') : '<div class="an-empty">还没有批注，按 A 写一条</div>'}</div>
      <div class="an-btns"><button data-a="copy">复制 Markdown</button><button data-a="dl">下载 .md</button><button data-a="clear">清空</button></div>`;
    wrap.classList.add('open');
    card.querySelectorAll('.an-it').forEach(el => el.addEventListener('click', e => {
      const all = load(), x = all[+el.dataset.k];
      if (e.target.classList.contains('x')) { all.splice(+el.dataset.k, 1); save(all); return openList(); }
      close(); D.go(x.i, x.t);
    }));
    card.querySelector('[data-a=copy]').onclick = () => navigator.clipboard && navigator.clipboard.writeText(md());
    card.querySelector('[data-a=dl]').onclick = () => { const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([md()], { type: 'text/markdown' })); l.download = '批注-annotations.md'; l.click(); };
    card.querySelector('[data-a=clear]').onclick = () => { if (confirm('清空全部批注？')) { save([]); openList(); } };
  }
  addEventListener('keydown', e => {
    if (e.target && (e.target.isContentEditable || /INPUT|TEXTAREA/.test(e.target.tagName))) return;
    if (mode) { if (e.key === 'Escape' || (mode === 'list' && (e.key === 'l' || e.key === 'L'))) { e.preventDefault(); close(); } e.stopImmediatePropagation(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'a' || e.key === 'A') { e.preventDefault(); e.stopImmediatePropagation(); openAdd(); }
    else if (e.key === 'l' || e.key === 'L') { e.preventDefault(); e.stopImmediatePropagation(); openList(); }
  }, true);
  window.ANNOTATE = { load, openAdd, openList, close };
})();
