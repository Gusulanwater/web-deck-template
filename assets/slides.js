/* Web Deck Template · MIT
   全片页面数据 + 版式渲染器。改字、改顺序、改步骤，都只动这个文件里的 SLIDES。
   行内小标记：[[强调渐变]]  {{灰色}}  ((钛银))  \n 换行
   步骤：每个列表项默认依次占一下（第 1 下、第 2 下…）；写成 {t:'文字', s:0} 可以指定第几下出现（0 = 进页就有）。
   版式（type）：title section lines quote stats bars compare image steps canvas end */
(function () {
  const SLIDES = [
    { id: 'cover', type: 'title', title: '封面',
      kick: 'WEB DECK TEMPLATE · DEMO',
      h: '[[AI 漫剧]]\n从 0 到 1', sub: '一个人 + 一台电脑，做出一部能上线的竖屏短剧' },

    { id: 's1', type: 'section', no: '01', title: '为什么是现在', h: '为什么是现在', sub: '成本塌缩，窗口打开' },

    { id: 'why', type: 'lines', title: '三件事同时发生', kick: '三件事同时发生',
      lines: ['[[画面]]：文生图、图生视频进入可用区间', '[[声音]]：配音、音效、配乐一键生成', '[[分发]]：竖屏短剧平台每天都在找新内容', '{{——单人工作室第一次有了完整工具链}}'] },

    // 真实公开数据：每个数字都带 source，显示在页面上
    { id: 'market', type: 'stats', title: '微短剧有多大', h: '微短剧，已经是一个大市场',
      items: [
        { n: 504.4, dec: 1, unit: '亿元', lab: '2024 年市场规模{{（预估）}}', w: 100,
          source: '中国网络视听协会《中国微短剧行业发展白皮书（2024）》，2024-11-06 发布' },
        { n: 6.62, dec: 2, unit: '亿人', lab: '微短剧用户规模\n{{截至 2024 年 12 月}}', w: 64,
          source: '《中国网络视听发展研究报告（2025）》，2025-03 发布' },
        { n: 59.7, dec: 1, unit: '%', lab: '网民使用率\n{{截至 2024 年 12 月}}', w: 59.7,
          source: '同上' }] },

    { id: 'quote1', type: 'quote', title: '一句话', lightup: '工具越便宜，[[故事]]越值钱。', cite: '—— 本模板演示用语' },

    { id: 's2', type: 'section', no: '02', title: '怎么做', h: '怎么做', sub: '五步流水线' },

    { id: 'pipeline', type: 'steps', title: '五步流水线', h: '从一句梗概到一集成片',
      cards: [
        { k: 'STEP 1', h: '剧本', p: '大模型扩写梗概，\n人来定冲突与反转' },
        { k: 'STEP 2', h: '分镜', p: '每镜一句画面描述\n+ 一句台词' },
        { k: 'STEP 3', h: '角色', p: '先定角色设定图，\n全片锁住同一张脸' },
        { k: 'STEP 4', h: '镜头', p: '图生视频，\n每镜 3–5 秒' },
        { k: 'STEP 5', h: '合成', p: '配音、字幕、音乐，\n剪成 60–90 秒一集' }] },

    { id: 'consistency', type: 'image', title: '角色一致性', h: '最难的是：[[同一张脸]]',
      art: 'portrait', cap: '示意插画（SVG 生成）',
      paras: ['同一个角色在 40 个镜头里不能「换人」。', '做法：固定设定图 + 参考图生成，\n{{每 10 镜人工抽查一次}}。', '((一致性，是观众愿意追下去的前提。))'] },

    { id: 'vs', type: 'compare', title: '两种做法', h: '手搓 vs 流水线', focusAt: 2,
      source: '作者个人工作流经验，非统计数据（非公开统计）',
      a: { h: '{{一镜一镜手搓}}', li: ['每次重新写提示词', '角色越做越走样', '一集要做一周'] },
      b: { h: '[[模板化流水线]]', li: ['分镜表驱动批量生成', '设定图锁定角色', '一集一到两天'] } },

    { id: 'usage', type: 'bars', title: '用户规模对比', h: '网络视听各类应用使用率 {{（2024 年 12 月）}}',
      source: '《中国网络视听发展研究报告（2025）》，中国网络视听协会，2025-03 发布（数据来源 CNNIC）',
      rows: [{ k: '短视频', v: 93.8 }, { k: '微短剧', v: 59.7 }] },

    { id: 'spark', type: 'canvas', title: 'Canvas 效果示例', fx: 'particles',
      h: '每一帧，都是\n[[一颗火花]]', sub: '按一下：粒子汇聚成光' },

    { id: 'end', type: 'end', title: '结尾', h: '[[开拍吧]]', sub: '按 O 看全部页面 · 按 S 打开演讲者视图' },
  ];

  /* ---------- 小工具 ---------- */
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const F = s => esc(s)
    .replace(/\[\[(.+?)\]\]/g, '<span class="ac">$1</span>')
    .replace(/\{\{(.+?)\}\}/g, '<span class="mu">$1</span>')
    .replace(/\(\((.+?)\)\)/g, '<span class="si">$1</span>')
    .replace(/\n/g, '<br>');
  // 逐字点亮：每个字一个 <i>，延迟递增；[[ ]] 内的字用强调色
  const LU = s => {
    let n = 0, out = '';
    String(s).split(/(\[\[.+?\]\])/).forEach(seg => {
      const hot = /^\[\[/.test(seg);
      for (const ch of seg.replace(/^\[\[|\]\]$/g, '')) out += ch === '\n' ? '<br>' : `<i class="${hot ? 'h' : ''}" style="transition-delay:${n++ * 60}ms">${esc(ch)}</i>`;
    });
    return `<span class="lightup">${out}</span>`;
  };
  const S = n => n == null ? '' : ` data-s="${n}"`;
  // 列表项：字符串 = 依次占一下；{t, s} = 指定步骤
  const items = (arr, start = 1) => arr.map((x, k) => typeof x === 'string' ? { t: x, s: start + k } : { s: start + k, ...x });
  // 来源：字符串，或 { text, example:true }；页面级 source 显示在左下角，条目级显示在条目下
  const SRC = (src, ex) => { if (!src && !ex) return ''; const o = typeof src === 'object' && src ? src : { text: src || '' };
    const isEx = ex || o.example; return `<div class="src${isEx ? ' ex' : ''}">${isEx ? '⚠ 示例数据 · Example data' + (o.text ? ' — ' + esc(o.text) : '') : esc(o.text)}</div>`; };
  const K = sp => sp.kick ? `<div class="kick">${F(sp.kick)}</div>` : '';

  /* ---------- 示意插画（原创 SVG，避免附带图片版权问题） ---------- */
  const ART = {
    portrait: `<svg viewBox="0 0 900 760" xmlns="http://www.w3.org/2000/svg"><defs>
      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b2a6b"/><stop offset="1" stop-color="#3a1460"/></linearGradient>
      <radialGradient id="g2" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#7ee8fa" stop-opacity=".55"/><stop offset="1" stop-color="#7ee8fa" stop-opacity="0"/></radialGradient></defs>
      <rect width="900" height="760" fill="url(#g1)"/><rect width="900" height="760" fill="url(#g2)"/>
      ${[0, 1, 2].map(k => `<g transform="translate(${150 + k * 300} 400)" opacity="${1 - k * .25}">
        <ellipse cx="0" cy="250" rx="120" ry="170" fill="#0b0f2a"/><circle cx="0" cy="0" r="95" fill="#f2d7c4"/>
        <path d="M-100 -10 Q-90 -120 0 -115 Q95 -120 102 -5 Q60 -70 -100 -10Z" fill="#141a3d"/>
        <circle cx="-32" cy="5" r="9" fill="#141a3d"/><circle cx="32" cy="5" r="9" fill="#141a3d"/>
        <path d="M-25 45 Q0 62 25 45" stroke="#b5655a" stroke-width="6" fill="none" stroke-linecap="round"/>
        <text x="0" y="170" fill="#7ee8fa" font-size="26" text-anchor="middle" font-family="sans-serif">SHOT ${String(k * 12 + 3).padStart(2, '0')}</text></g>`).join('')}
    </svg>`,
  };

  /* ---------- 版式渲染器：返回 section 的 innerHTML ---------- */
  const R = {
    title: sp => `<div class="glow"></div>${K(sp)}<h1${S(0)}>${F(sp.h)}</h1><div class="sub"${S(1)}>${F(sp.sub || '')}</div>`,
    section: sp => `<div class="no">${esc(sp.no || '')}</div><div class="ln"></div><h2>${F(sp.h)}</h2><div class="sub"${S(1)}>${F(sp.sub || '')}</div>`,
    lines: sp => `${K(sp)}<div class="ls">${items(sp.lines).map(x => `<div${S(x.s)}>${F(x.t)}</div>`).join('')}</div>`,
    quote: sp => `<div class="mk">“</div><blockquote${S(1)}>${sp.lightup ? LU(sp.lightup) : F(sp.q)}</blockquote><cite${S(2)}>${F(sp.cite || '')}</cite>`,
    stats: sp => `<h2>${F(sp.h)}</h2><div class="grid" style="--n:${sp.items.length}">${items(sp.items).map(x =>
      `<div${S(x.s)}><div class="num" data-to="${x.n}" data-dec="${x.dec || 0}">0<small>${esc(x.unit || '')}</small></div><div class="lab">${F(x.lab)}</div><div class="meter"><i style="--w:${x.w ?? 100}%"></i></div>${SRC(x.source)}</div>`).join('')}</div>${SRC(sp.source, sp.example)}`,
    bars: sp => `<h2>${F(sp.h)}</h2>${items(sp.rows).map(x => `<div class="row"${S(x.s)}><span>${F(x.k)}</span><div class="trk"><i style="--w:${x.v}%"></i></div><b>${x.v}%</b>${x.source ? `<span class="rs" title="${esc(x.source)}">${esc(x.source)}</span>` : ''}</div>`).join('')}${SRC(sp.source, sp.example)}`,
    compare: sp => { const col = (c, cls, s) => `<div class="col ${cls}"${S(s)}><h3>${F(c.h)}</h3><ul>${c.li.map(t => `<li>${F(t)}</li>`).join('')}</ul>${SRC(c.source)}</div>`;
      return `<h2>${F(sp.h)}</h2><div class="cols">${col(sp.a, 'a', 0)}<div class="vs"></div>${col(sp.b, 'b', 1)}</div>` +
        (sp.focusAt != null ? `<i hidden data-s="${sp.focusAt}" data-cue="聚焦右栏"></i>` : '') + SRC(sp.source, sp.example); },   // 隐形步骤：只用来多占一下
    image: sp => `<div class="pic"${S(0)}>${sp.src ? `<img src="${esc(sp.src)}" alt="">` : ART[sp.art] || ''}<div class="cap">${F(sp.cap || '')}</div></div>
      <div class="txt"><h2>${F(sp.h)}</h2>${items(sp.paras).map(x => `<p${S(x.s)}>${F(x.t)}</p>`).join('')}</div>`,
    steps: sp => `<h2>${F(sp.h)}</h2><div class="flow">${items(sp.cards).map(x => `<div class="card"${S(x.s)}><div class="k">${esc(x.k)}</div><h4>${F(x.h)}</h4><p>${F(x.p)}</p></div>`).join('')}</div>`,
    canvas: sp => `<canvas width="1920" height="1080"></canvas><div class="over"><div${S(0)}>${F(sp.h)}</div><div class="sub"${S(1)}>${F(sp.sub || '')}</div></div>`,
    end: sp => `<h1 class="float">${F(sp.h)}</h1><div class="sub"${S(1)}>${F(sp.sub || '')}</div>`,
  };

  const stage = document.getElementById('stage');
  SLIDES.forEach(sp => {
    const s = document.createElement('section');
    s.className = 'slide t-' + sp.type;
    s.dataset.id = sp.id; s.dataset.title = sp.title || '';
    if (sp.shake) s.dataset.shake = sp.shake.join(',');
    s.innerHTML = (R[sp.type] || R.lines)(sp);
    s._sp = sp;
    stage.appendChild(s);
  });
  window.SLIDES = SLIDES;

  /* ---------- Canvas 2D 示例效果：粒子（第 0 下漂散，第 1 下汇聚成光环） ---------- */
  function particles(s) {
    const cv = s.querySelector('canvas'); if (!cv || cv._run) return; cv._run = 1;
    const g = cv.getContext('2d'), W = 1920, H = 1080, N = 520;
    const P = Array.from({ length: N }, (_, k) => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .6, vy: (Math.random() - .5) * .6, a: k / N * Math.PI * 2, r: Math.random() * 2 + .6, h: 190 + Math.random() * 90 }));
    let pull = 0;
    (function tick(t) {
      if (!s.classList.contains('active')) { cv._run = 0; return; }       // 离开这一页就停，省电
      const goal = s.classList.contains('st1') ? 1 : 0;
      pull += (goal - pull) * .03;                                          // 缓动：跟随步骤
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      const R0 = 330 + Math.sin(t / 900) * 18;
      for (const p of P) {
        const tx = W / 2 + Math.cos(p.a + t / 4000) * R0, ty = H / 2 + Math.sin(p.a + t / 4000) * R0;
        p.x += p.vx * (1 - pull) + (tx - p.x) * .04 * pull;
        p.y += p.vy * (1 - pull) + (ty - p.y) * .04 * pull;
        if (p.x < 0) p.x += W; if (p.x > W) p.x -= W; if (p.y < 0) p.y += H; if (p.y > H) p.y -= H;
        const rad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        rad.addColorStop(0, `hsla(${p.h},100%,75%,${.5 + pull * .4})`); rad.addColorStop(1, 'hsla(0,0%,0%,0)');
        g.fillStyle = rad; g.beginPath(); g.arc(p.x, p.y, p.r * 6, 0, 7); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      requestAnimationFrame(tick);
    })(0);
  }

  /* ---------- 数字滚动 ---------- */
  const fmtN = (v, d) => v.toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
  function countUp(el) {
    const d = +el.dataset.dec || 0, to = +el.dataset.to, unit = el.querySelector('small').outerHTML, t0 = performance.now();
    cancelAnimationFrame(el._raf);
    (function f(t) { const k = Math.min(1, (t - t0) / 1400), v = to * (1 - Math.pow(1 - k, 4));
      el.innerHTML = fmtN(v, d) + unit; if (k < 1) el._raf = requestAnimationFrame(f); })(t0);
  }

  /* ---------- 引擎每一步都会调用：给特殊版式加效果（也用于总览缩略图，c 为克隆） ---------- */
  window.onStep = function (i, step, s) {
    const sp = s._sp || SLIDES[i] || {};
    if (sp.type === 'compare') s.classList.toggle('focus', step >= (sp.focusAt ?? 99));
    if (sp.type === 'stats') s.querySelectorAll('.num').forEach(el => {
      const on = el.parentElement.classList.contains('on');
      if (!s.isConnected || s.closest('#ov')) { el.innerHTML = fmtN(+el.dataset.to, +el.dataset.dec || 0) + el.querySelector('small').outerHTML; return; }
      if (on && !el._done) { el._done = 1; countUp(el); } else if (!on) { el._done = 0; }
    });
    if (sp.type === 'canvas' && sp.fx === 'particles' && s.classList.contains('active') && !s.closest('#ov')) particles(s);
    if (s.dataset.shake && s.dataset.shake.split(',').map(Number).includes(step)) { s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); }
  };
})();
