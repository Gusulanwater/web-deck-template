/* Web Deck Template · MIT — 演讲引擎
   观众屏：→ / 空格 / 点击 下一下（这一页的步骤走完自动翻页） ← 上一下  O 总览  F 全屏  B 黑屏  S 演讲者视图
   三种身份（URL 参数）：
     （默认）        观众屏，投到大屏
     ?presenter=1    演讲者视图：当前页 + 下一下预览 + 备注 + 计时
     ?preview=1      演讲者视图里的预览 iframe：只显示，不响应按键
   深链：#5 或 #5.2（第 5 页第 2 下，从 1 数页）；也兼容 ?s=4&t=2（从 0 数）
   同步：postMessage（观众屏 ⇄ 演讲者 ⇄ 预览）+ BroadcastChannel 兜底，双向；file:// 下也能用 */
(function () {
  const q = new URLSearchParams(location.search);
  const MODE = q.get('presenter') === '1' ? 'presenter' : q.get('preview') === '1' ? 'preview' : 'audience';
  const CH = 'web-deck:' + location.pathname;          // 同一域名下多个 deck 互不干扰
  const MAXST = 20;                                     // 一页最多几下（st0..st20）
  const stage = document.getElementById('stage');
  const slides = [...document.querySelectorAll('.slide')];
  slides.forEach(s => (s._max = Math.max(0, ...[...s.querySelectorAll('[data-s]')].map(e => +e.dataset.s || 0))));
  const N = slides.length;

  const clamp = (i, t) => { i = Math.max(0, Math.min(+i || 0, N - 1)); return [i, Math.max(0, Math.min(+t || 0, slides[i]._max))]; };
  const next = (i, t) => t < slides[i]._max ? [i, t + 1] : i < N - 1 ? [i + 1, 0] : [i, t];
  const prev = (i, t) => t > 0 ? [i, t - 1] : i > 0 ? [i - 1, slides[i - 1]._max] : [i, t];
  function fromURL() {
    const h = location.hash.match(/^#(\d+)(?:\.(\d+))?/);
    if (h) return clamp(+h[1] - 1, +(h[2] || 0));
    return clamp(q.get('s'), q.get('t'));
  }
  const pad2 = n => String(n).padStart(2, '0');
  const typing = e => e.target && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName));

  /* ---------- 跨窗口消息 ---------- */
  let bc = null, peer = null;     // 观众屏 peer = 它打开的演讲者窗口；演讲者用 window.opener
  try { if (MODE !== 'preview') bc = new BroadcastChannel(CH); } catch (e) {}
  function send(m) {
    m.wdt = 1; m.from = MODE;
    try { bc && bc.postMessage(m); } catch (e) {}
    const w = MODE === 'presenter' ? window.opener : peer;
    try { w && !w.closed && w.postMessage(m, '*'); } catch (e) {}
  }
  function listen(fn) {
    const ok = d => d && d.wdt && d.from !== MODE;
    addEventListener('message', e => ok(e.data) && fn(e.data));
    if (bc) bc.onmessage = e => ok(e.data) && fn(e.data);
  }

  /* ---------- 总览（O）：每页克隆一份「讲完时」的样子做缩略图 ---------- */
  function overview(getCur, pick) {
    let box = null, sel = 0, open = false;
    const css = `#ov{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.93);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);display:none;flex-direction:column;font-family:var(--sans);color:#f5f5f7}
      #ov.open{display:flex}#ov .hd{display:flex;justify-content:space-between;align-items:baseline;padding:22px 34px 12px;font-size:20px;font-weight:700}
      #ov .hd span{font-size:13px;color:#86868b;font-weight:500}
      #ov .gr{flex:1;overflow:auto;padding:6px 34px 40px;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:22px 18px;align-content:start}
      #ov .th{cursor:pointer}#ov .bx{position:relative;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000;box-shadow:0 0 0 1px #2c2c2e;transition:transform .2s,box-shadow .2s}
      #ov .th:hover .bx{transform:translateY(-3px)}#ov .th.sel .bx{box-shadow:0 0 0 3px var(--a2)}
      #ov .in{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0;pointer-events:none}
      #ov .in *{transition:none!important;animation:none!important}
      #ov .lb{margin-top:8px;font-size:13px;color:#a1a1a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#ov .lb b{color:#f5f5f7;margin-right:6px}
      #ov .th.cur .lb b{color:var(--a1)}`;
    function build() {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      box = document.createElement('div'); box.id = 'ov';
      box.innerHTML = '<div class="hd">全部页面<span>点击跳转 · ←→↑↓ 选择 · Enter 确定 · O / Esc 关闭</span></div><div class="gr"></div>';
      const gr = box.querySelector('.gr');
      slides.forEach((s, k) => {
        const t = document.createElement('div'); t.className = 'th';
        t.innerHTML = `<div class="bx"><div class="in"></div></div><div class="lb"><b>${pad2(k + 1)}</b>${(s.dataset.title || s.dataset.id).replace(/</g, '&lt;')}</div>`;
        const c = s.cloneNode(true);
        c._sp = s._sp; c.classList.add('active'); c.classList.remove('past', 'far', 'shake');
        c.querySelectorAll('canvas,video').forEach(v => v.remove());
        for (let n = 0; n <= s._max; n++) c.classList.add('st' + n);
        c.querySelectorAll('[data-s]').forEach(e => e.classList.add('on'));
        t.querySelector('.in').appendChild(c);
        try { window.onStep && window.onStep(k, s._max, c); } catch (e) {}
        t.onclick = e => { e.stopPropagation(); close(); pick(k); };
        gr.appendChild(t);
      });
      box.addEventListener('click', e => e.stopPropagation());
      document.body.appendChild(box);
      addEventListener('resize', () => open && fitThumbs());
    }
    const ths = () => [...box.querySelectorAll('.th')];
    const fitThumbs = () => ths().forEach(t => (t.querySelector('.in').style.transform = `scale(${t.querySelector('.bx').clientWidth / 1920})`));
    const mark = () => { ths().forEach((t, k) => { t.classList.toggle('sel', k === sel); t.classList.toggle('cur', k === getCur()); }); ths()[sel].scrollIntoView({ block: 'nearest' }); };
    const show = () => { if (!box) build(); open = true; box.classList.add('open'); sel = getCur(); fitThumbs(); mark(); };
    const close = () => { open = false; box && box.classList.remove('open'); };
    const cols = () => { const t = ths(); const y = t[0].offsetTop, k = t.findIndex(x => x.offsetTop !== y); return k < 1 ? t.length : k; };
    addEventListener('keydown', e => {
      if (typing(e)) return;
      if (e.key === 'o' || e.key === 'O') { e.preventDefault(); e.stopImmediatePropagation(); open ? close() : show(); return; }
      if (!open) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const c = cols();
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') sel = Math.min(N - 1, sel + 1);
      else if (e.key === 'ArrowLeft') sel = Math.max(0, sel - 1);
      else if (e.key === 'ArrowDown') sel = Math.min(N - 1, sel + c);
      else if (e.key === 'ArrowUp') sel = Math.max(0, sel - c);
      else if (e.key === 'Enter' || e.key === ' ') { close(); pick(sel); return; }
      mark();
    }, true);   // 捕获阶段：总览打开时吃掉方向键
    return { get open() { return open; }, show, close };
  }

  if (MODE === 'presenter') return presenter();

  /* ================= 观众屏 / 预览 ================= */
  let i = 0, step = 0, last = -1;
  const bar = document.getElementById('bar');
  const fit = () => { stage.style.transform = `translate(-50%,-50%) scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; };
  addEventListener('resize', fit); fit();
  const pg = document.createElement('div');
  pg.style.cssText = 'position:absolute;right:44px;bottom:28px;z-index:70;font:600 22px var(--sans);color:#48484a;font-variant-numeric:tabular-nums;pointer-events:none';
  stage.appendChild(pg);

  function apply(silent) {
    slides.forEach((s, k) => {
      s.classList.toggle('active', k === i);
      s.classList.toggle('past', k < i);
      s.classList.toggle('far', Math.abs(k - i) > 2);     // 远处的页不渲染，省显存
      if (k === last && last !== i) return;               // 刚离开的页保留最后状态淡出
      for (let n = 0; n <= MAXST; n++) s.classList.toggle('st' + n, k === i && n <= step);
    });
    if (last !== i && slides[last]) {                       // 淡出后清零，回退进来从头播
      const old = slides[last];
      setTimeout(() => {
        if (old === slides[i]) return;
        old.classList.add('rst');
        for (let n = 0; n <= MAXST; n++) old.classList.remove('st' + n);
        old.querySelectorAll('[data-s].on').forEach(e => e.classList.remove('on'));
        try { window.onStep && window.onStep(slides.indexOf(old), -1, old); } catch (e) {}
        void old.offsetWidth; old.classList.remove('rst');
      }, 900);
    }
    last = i;
    const s = slides[i];
    s.querySelectorAll('[data-s]').forEach(e => e.classList.toggle('on', +e.dataset.s <= step));
    if (bar) bar.innerHTML = slides.map((_, k) => `<i class="${k === i ? 'cur' : k < i ? 'done' : ''}"></i>`).join('');
    pg.textContent = `${pad2(i + 1)} / ${N}`;
    try { window.onStep && window.onStep(i, step, s); } catch (e) { console.error(e); }
    if (MODE === 'audience') {
      try { history.replaceState(null, '', location.pathname + location.search.replace(/[?&](s|t)=\d+/g, '') + `#${i + 1}${step ? '.' + step : ''}`); } catch (e) {}
      if (!silent) send({ type: 'state', i, step });
    }
  }
  function go(st, silent) {
    const [a, b] = clamp(st[0], st[1]);
    if (a === i && b === step && last !== -1) return;
    i = a; step = b; apply(silent);
  }
  const meta = k => ({ id: slides[k].dataset.id || '', title: slides[k].dataset.title || '' });
  window.DECK = { mode: MODE, go: (a, b) => go([a, b]), next: () => go(next(i, step)), prev: () => go(prev(i, step)), get i() { return i; }, get step() { return step; }, n: N, max: k => slides[k]._max, meta };

  [i, step] = fromURL();
  if (MODE === 'preview') {
    document.documentElement.classList.add('is-preview');
    listen(m => m.type === 'state' && go([m.i, m.step], true));
    apply(true);
    return;
  }

  // 黑屏
  const black = document.createElement('div');
  black.style.cssText = 'position:fixed;inset:0;background:#000;z-index:999;opacity:0;pointer-events:none;transition:opacity .4s';
  document.body.appendChild(black);
  let isBlack = false;
  const setBlack = (on, silent) => { isBlack = on; black.style.opacity = on ? 1 : 0; if (!silent) send({ type: 'black', on }); };

  function openPresenter() {
    if (peer && !peer.closed) return peer.focus();
    peer = window.open(location.pathname + `?presenter=1&s=${i}&t=${step}`, 'wdt-presenter', 'width=1440,height=900');
    if (!peer) alert('浏览器拦截了弹窗：请允许本页弹出窗口后再按 S。\nPopup blocked: allow popups and press S again.');
  }

  listen(m => {
    if (m.type === 'state' && m.from === 'presenter') go([m.i, m.step], true);
    else if (m.type === 'black') setBlack(m.on, true);
    else if (m.type === 'hello') send({ type: 'state', i, step, black: isBlack });
  });
  addEventListener('hashchange', () => go(fromURL(), false));

  addEventListener('keydown', e => {
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); go(next(i, step)); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); go(prev(i, step)); }
    else if (k === 'Home') go([0, 0]);
    else if (k === 'End') go([N - 1, slides[N - 1]._max]);
    else if (k === 'f' || k === 'F') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
    else if (k === 's' || k === 'S') openPresenter();
    else if (k === 'b' || k === 'B' || k === '.') setBlack(!isBlack);
  });
  addEventListener('click', e => { if (!e.target.closest('a,button,#ov,.an-wrap') && !ov.open) go(next(i, step)); });
  const ov = overview(() => i, k => go([k, 0]));
  apply();

  /* ================= 演讲者视图 ================= */
  function presenter() {
    /* NOTES 格式（见 notes.js）：
         页id: ['进页就讲', [n, '第 n 下讲']]
         任意key: { span: ['页A', '页B'], paras: ['…', [1, '…'], ['页B', 0, '换到页B后讲'], [2, '…']] }   一段稿子跨几页
       也兼容 [{id, paras:[[step,text]]}]。
       内部统一成 NOTE[key] = { key, span:[id…], paras:[{sl, st, t}] }，BY[页id] = key */
    const RAW = window.NOTES || {}, NOTE = {}, BY = {};
    const entries = Array.isArray(RAW) ? RAW.map(x => [x.id, x.paras]) : Object.entries(RAW);
    entries.forEach(([key, v]) => {
      const span = v && !Array.isArray(v) && typeof v === 'object' ? (v.span || [key]) : [key];
      let list = v && v.paras ? v.paras : v;
      if (typeof list === 'string') list = [list];
      let cur = span[0];
      const paras = (list || []).map(x => {
        if (!Array.isArray(x)) return { sl: cur, st: 0, t: String(x) };
        if (x.length >= 3) { cur = String(x[0]); return { sl: cur, st: +x[1] || 0, t: String(x[2]) }; }
        return { sl: cur, st: +x[0] || 0, t: String(x[1]) };
      });
      NOTE[key] = { key, span, paras, spanned: !!(v && v.span) };
      span.forEach(id => (BY[id] = BY[id] || key));
    });
    /* 本机修改：localStorage 里按 key 存一组文字，覆盖 notes.js 原文 */
    const EKEY = 'wdt-notes-edit:' + location.pathname;
    const loadEd = () => { try { return JSON.parse(localStorage.getItem(EKEY)) || {}; } catch (e) { return {}; } };
    let ED = loadEd();
    const saveEd = () => { try { localStorage.setItem(EKEY, JSON.stringify(ED)); } catch (e) {} };
    const textOf = (key, n) => ED[key] && ED[key][n] != null ? ED[key][n] : NOTE[key].paras[n].t;
    const isEdited = (key, n) => ED[key] && ED[key][n] != null && ED[key][n] !== NOTE[key].paras[n].t;

    const L = slides.map((s, k) => {
      const id = s.dataset.id, key = BY[id], cues = {};
      s.querySelectorAll('[data-s]').forEach(e => {
        const t = (e.dataset.cue || e.textContent || '').replace(/\s+/g, ' ').trim();
        if (!cues[e.dataset.s] && t) cues[e.dataset.s] = t.length > 28 ? t.slice(0, 28) + '…' : t;
      });
      const chars = key ? NOTE[key].paras.filter(p => p.sl === id).reduce((a, p) => a + p.t.length, 0) : 0;
      return { id, key, title: s.dataset.title || '第 ' + (k + 1) + ' 页', cues, max: s._max, plan: Math.max(15, Math.round(chars / 220 * 60)) }; // 约 220 字/分钟
    });
    const PLAN = L.reduce((a, s) => a + s.plan, 0);
    const deckTitle = document.title;
    document.title = '演讲者视图 · ' + deckTitle;
    document.body.className = 'pv-body';
    document.body.innerHTML = `
      <header class="pv-top">
        <div class="pv-deck">${deckTitle.replace(/</g, '&lt;')}<span>演讲者视图 · Presenter</span></div>
        <div class="pv-where"><b id="pvPage"></b><span id="pvTitle"></span><i id="pvDots"></i></div>
        <div class="pv-clock"><span id="pvNow"></span><b id="pvTotal">00:00</b><em id="pvPace" class="mu">未开始</em></div>
      </header>
      <main class="pv-main">
        <section class="pv-notes"><div class="pv-lab"><span>备注 Notes <em id="pvSpan" class="mu"></em></span><span id="pvEditTip">E 修改 · X 导出 · +/− 字号</span></div><div class="pv-scroll" id="pvNotes"></div></section>
        <aside class="pv-side">
          <div class="pv-card"><div class="pv-lab"><span>观众正在看 Now</span><span id="pvBlack" class="pv-black">● 黑屏中</span></div><div class="pv-frame"><iframe id="fCur" tabindex="-1"></iframe></div></div>
          <div class="pv-card"><div class="pv-lab"><span>下一下 Next</span><span id="pvCue"></span></div><div class="pv-frame small"><iframe id="fNext" tabindex="-1"></iframe><div class="pv-end" id="pvEnd">讲完了 🎉</div></div></div>
          <div class="pv-card"><div class="pv-lab"><span>本页用时</span><span id="pvSlideT"></span></div><div class="pv-meter"><i id="pvMeter"></i></div>
            <div class="pv-btns"><button id="bStart">▶ 开始计时</button><button id="bReset">↺ 归零</button><button id="bBlack">黑屏 B</button><button id="bEdit">修改备注 E</button><button id="bRevert" hidden>恢复本页原稿</button><button id="bExport">导出备注 X</button></div></div>
        </aside>
      </main>
      <footer class="pv-foot">→ / 空格 下一下　← 上一下　O 总览　B 黑屏　E 修改备注　X 导出备注　A 批注　L 批注清单　+/− 字号　P 暂停计时　R 归零</footer>`;
    const $ = id => document.getElementById(id);
    const fCur = $('fCur'), fNext = $('fNext'), notes = $('pvNotes');
    let [ci, ct] = fromURL(), isBlack = false, lastSlide = -1;

    // 预览 iframe：第一次用 URL 加载，之后只发消息，不重载不闪烁
    function preview(fr, st) {
      fr._st = st;
      if (!fr.src) { fr.src = `${location.pathname}?preview=1&s=${st[0]}&t=${st[1]}`; fr.onload = () => fr.contentWindow.postMessage({ wdt: 1, from: 'presenter', type: 'state', i: fr._st[0], step: fr._st[1] }, '*'); }
      else try { fr.contentWindow.postMessage({ wdt: 1, from: 'presenter', type: 'state', i: st[0], step: st[1] }, '*'); } catch (e) {}
    }
    // 备注小语法：（舞台提示） **重音**
    const fmt = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/（([^）]*)）/g, '<span class="dir">（$1）</span>');
    let editing = false;
    function renderNotes() {
      const s = L[ci], nt = s.key && NOTE[s.key];
      $('pvSpan').textContent = nt && nt.span.length > 1 ? `· 跨 ${nt.span.length} 页（${nt.span.indexOf(s.id) + 1}/${nt.span.length}）` : '';
      $('bRevert').hidden = !editing;
      if (!nt || !nt.paras.length) { notes.innerHTML = `<h2>${pad2(ci + 1)} · ${s.title}</h2><p class="empty">这一页没有备注</p>`; return; }
      notes.innerHTML = `<h2>${pad2(ci + 1)} · ${s.title}</h2>` + nt.paras.map((p, n) => {
        const t = textOf(nt.key, n);
        return `<p data-n="${n}" data-sl="${p.sl.replace(/"/g, '&quot;')}" data-st="${p.st}" class="${isEdited(nt.key, n) ? 'edited' : ''}"${editing ? ' contenteditable="plaintext-only" spellcheck="false"' : ''}>${editing ? t.replace(/&/g, '&amp;').replace(/</g, '&lt;') : fmt(t)}</p>`;
      }).join('');
      if (editing) notes.querySelectorAll('p[data-n]').forEach(el => {
        const commit = () => {
          const n = +el.dataset.n, v = el.innerText.replace(/\n+$/, '');
          ED = loadEd(); ED[nt.key] = ED[nt.key] || [];
          ED[nt.key][n] = v === nt.paras[n].t ? null : v;
          if (!ED[nt.key].some(x => x != null)) delete ED[nt.key];
          saveEd(); el.classList.toggle('edited', isEdited(nt.key, n));
        };
        el.addEventListener('input', commit); el.addEventListener('blur', commit);
        el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); commit(); toggleEdit(false); } e.stopPropagation(); });
      });
      markNotes();
    }
    // 高亮：属于本页、步骤 ≤ 当前步的最后一段 = now；更早的（含跨页的前几页）= past；还没到的 = 淡
    function markNotes() {
      const s = L[ci], nt = s.key && NOTE[s.key]; if (!nt) return;
      const pos = id => nt.span.indexOf(id), me = pos(s.id);
      const ps = [...notes.querySelectorAll('p[data-st]')];
      const mine = ps.filter(p => p.dataset.sl === s.id && +p.dataset.st <= ct);
      const now = mine.length ? mine[mine.length - 1] : null;
      let seenNow = !now;
      ps.forEach(p => {
        const sp = pos(p.dataset.sl), st = +p.dataset.st, isNow = p === now;
        if (isNow) seenNow = true;
        const past = !isNow && (sp < me || (sp === me && st <= ct && !seenNow));
        const future = sp > me || (sp === me && st > ct);
        p.classList.toggle('now', isNow); p.classList.toggle('past', past); p.classList.toggle('future', future);
        p.classList.toggle('other', sp !== me);
      });
      now && !editing && now.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function toggleEdit(on) {
      editing = on == null ? !editing : on;
      document.body.classList.toggle('is-edit', editing);
      $('pvEditTip').textContent = editing ? '修改中 · 自动保存在本机 · Esc 完成' : 'E 修改 · X 导出 · +/− 字号';
      renderNotes();
      if (editing) { const el = notes.querySelector('p.now') || notes.querySelector('p[data-n]'); el && el.focus(); }
    }
    function revertSlide() {
      const k = L[ci].key; if (!k) return;
      ED = loadEd(); delete ED[k]; saveEd(); renderNotes();
    }
    /* 导出：合并本机修改，生成可直接替换的 notes.js，外加一份 Markdown */
    function merged() {
      const out = {};
      Object.values(NOTE).forEach(nt => {
        let cur = nt.span[0];
        const paras = nt.paras.map((p, n) => {
          const t = textOf(nt.key, n);
          if (p.sl !== cur) { cur = p.sl; return [p.sl, p.st, t]; }
          return p.st ? [p.st, t] : t;
        });
        out[nt.key] = nt.spanned ? { span: nt.span, paras } : paras;
      });
      return out;
    }
    function download(name, text, type) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
    function exportNotes() {
      const m = merged(), lines = Object.entries(m).map(([k, v]) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(v, null, 2).replace(/\n/g, '\n  ') + ',');
      const js = `/* 演讲者备注（从演讲者视图导出，已合并本机修改）${new Date().toLocaleString('zh-CN')}\n   直接替换 assets/notes.js 即可。格式说明见 README。 */\nwindow.NOTES = {\n${lines.join('\n')}\n};\n`;
      const md = `# ${deckTitle} · 演讲备注\n\n` + L.map((s, k) => {
        const nt = s.key && NOTE[s.key]; if (!nt) return `## ${pad2(k + 1)} ${s.title}\n\n（无）`;
        const ps = nt.paras.map((p, n) => [p, textOf(nt.key, n)]).filter(([p]) => p.sl === s.id);
        return `## ${pad2(k + 1)} ${s.title}\n\n` + ps.map(([p, t]) => (p.st ? `**[第 ${p.st} 下]** ` : '') + t).join('\n\n');
      }).join('\n\n---\n\n') + '\n';
      download('notes.js', js, 'text/javascript');
      setTimeout(() => download('notes.md', md, 'text/markdown'), 300);
      return { js, md };
    }
    function render(fromPeer) {
      $('pvPage').textContent = `${ci + 1} / ${N}`;
      $('pvTitle').textContent = L[ci].title;
      $('pvDots').innerHTML = Array.from({ length: L[ci].max + 1 }, (_, n) => `<s class="${n < ct ? 'done' : n === ct ? 'cur' : ''}"></s>`).join('');
      preview(fCur, [ci, ct]);
      const nx = next(ci, ct), end = nx[0] === ci && nx[1] === ct;
      $('pvEnd').style.display = end ? 'flex' : 'none';
      fNext.style.visibility = end ? 'hidden' : '';
      if (!end) preview(fNext, nx);
      $('pvCue').textContent = end ? '' : nx[0] !== ci ? '翻页 → ' + L[nx[0]].title : (L[ci].cues[nx[1]] || '第 ' + nx[1] + ' 下');
      if (ci !== lastSlide) { lastSlide = ci; renderNotes(); } else markNotes();
      updTime();
      if (!fromPeer) send({ type: 'state', i: ci, step: ct });
    }
    function go(st, fromPeer) {
      const [a, b] = clamp(st[0], st[1]);
      if (a === ci && b === ct && fromPeer && lastSlide !== -1) return;
      if (!running && total === 0 && (a > 0 || b > 0)) startTimer();   // 第一次往前讲自动开始计时
      ci = a; ct = b; render(fromPeer);
    }
    window.DECK = { mode: MODE, go: (a, b) => go([a, b]), next: () => go(next(ci, ct)), prev: () => go(prev(ci, ct)), get i() { return ci; }, get step() { return ct; }, n: N, max: k => slides[k]._max, meta: k => ({ id: L[k].id, title: L[k].title }),
      notes: { edit: toggleEdit, revert: revertSlide, export: exportNotes, merged, get editing() { return editing; } } };

    // 计时
    let running = false, total = 0, per = L.map(() => 0), tick = null;
    const mmss = s => Math.floor(s / 60) + ':' + pad2(s % 60);
    function startTimer() { if (running) return; running = true; $('bStart').textContent = '⏸ 暂停'; tick = setInterval(() => { total++; per[ci]++; updTime(); }, 1000); }
    function pauseTimer() { running = false; clearInterval(tick); $('bStart').textContent = '▶ 继续'; updTime(); }
    function resetTimer() { pauseTimer(); total = 0; per = L.map(() => 0); $('bStart').textContent = '▶ 开始计时'; updTime(); }
    function updTime() {
      $('pvNow').textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      $('pvTotal').textContent = mmss(total).padStart(5, '0') + ' / ' + mmss(PLAN);
      const plan = L[ci].plan, used = per[ci], r = used / plan;
      $('pvSlideT').textContent = `${mmss(used)} / 建议 ${mmss(plan)}`;
      $('pvMeter').style.width = Math.min(100, r * 100) + '%';
      $('pvMeter').className = r > 1.25 ? 'over' : r > 1 ? 'warn' : '';
      const d = total - (L.slice(0, ci).reduce((a, s) => a + s.plan, 0) + Math.min(used, plan)), pace = $('pvPace');
      pace.textContent = !running && !total ? '未开始' : Math.abs(d) < 15 ? '节奏刚好' : d > 0 ? '慢了 ' + mmss(d) : '快了 ' + mmss(-d);
    }
    setInterval(updTime, 15000);

    const setBlack = (on, fromPeer) => { isBlack = on; $('pvBlack').style.display = on ? 'inline' : 'none'; document.body.classList.toggle('is-black', on); if (!fromPeer) send({ type: 'black', on }); };
    let fs = +(localStorage.getItem('wdt-note-fs') || 30);
    const setFs = v => { fs = Math.max(16, Math.min(60, v)); document.body.style.setProperty('--nfs', fs + 'px'); try { localStorage.setItem('wdt-note-fs', fs); } catch (e) {} };
    setFs(fs);

    $('bStart').onclick = () => running ? pauseTimer() : startTimer();
    $('bReset').onclick = resetTimer;
    $('bBlack').onclick = () => setBlack(!isBlack);
    $('bEdit').onclick = () => toggleEdit();
    $('bRevert').onclick = revertSlide;
    $('bExport').onclick = () => exportNotes();
    listen(m => {
      if (m.type === 'state' && m.from === 'audience') go([m.i, m.step], true);
      else if (m.type === 'black') setBlack(m.on, true);
      if (m.black != null) setBlack(m.black, true);
    });
    addEventListener('keydown', e => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); go(next(ci, ct)); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); go(prev(ci, ct)); }
      else if (k === 'Home') go([0, 0]);
      else if (k === 'b' || k === 'B' || k === '.') setBlack(!isBlack);
      else if (k === '+' || k === '=') setFs(fs + 2);
      else if (k === '-' || k === '_') setFs(fs - 2);
      else if (k === 'p' || k === 'P') running ? pauseTimer() : startTimer();
      else if (k === 'r' || k === 'R') resetTimer();
      else if (k === 'e' || k === 'E') { e.preventDefault(); toggleEdit(); }
      else if (k === 'x' || k === 'X') exportNotes();
      else if (k === 'Escape' && editing) toggleEdit(false);
    });
    // 演讲者视图里的总览：用一个隐藏的舞台承载克隆
    overview(() => ci, k => go([k, 0]));
    render(true);              // 首次不广播，免得把观众屏拉回来
    send({ type: 'hello' });   // 问一下观众屏现在在哪（若观众屏已打开，以它为准）
  }
})();
