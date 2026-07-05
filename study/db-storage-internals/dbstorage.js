/* db-storage-internals: 페이지 vs 통파일 · 힙 vs 클러스터드 · B-Tree 탐색
   바닐라 JS + Canvas. 수치는 "구조를 보여주는 예시값". */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  function fitCanvas(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth || cv.parentElement.clientWidth || 600;
    const h = cv.height;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv._cw = w; cv._ch = h; return ctx;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  const fmt = (n) => n.toLocaleString('en-US');

  /* ===== Widget 1: 페이지 vs 통파일 ===== */
  (function page() {
    const cv = $('#pg-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const sizeS = $('#pg-size'), sizev = $('#pg-sizev');
    const fileOut = $('#pg-file'), dbOut = $('#pg-db'), ratioOut = $('#pg-ratio'), cap = $('#pg-cap');
    let flash = 0, raf = 0;
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const gb = +sizeS.value;
      // 좌: 메모장(통째) 우: DB(페이지)
      const colW = w / 2;
      ctx.textAlign = 'center'; ctx.font = '700 12px Pretendard';
      ctx.fillStyle = '#ff8a80'; ctx.fillText('메모장식 — 통째로', colW / 2, 16);
      ctx.fillStyle = '#69f0ae'; ctx.fillText('DB식 — 8KB 페이지만', colW + colW / 2, 16);
      // 메모장: 하나의 큰 블록 전체 하이라이트
      ctx.fillStyle = flash ? '#5a2a2a' : '#2a1a1a';
      rr(ctx, 14, 28, colW - 28, h - 42, 8); ctx.fill();
      ctx.strokeStyle = '#6b2b2b'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffb4a8'; ctx.font = '800 15px Pretendard';
      ctx.fillText(gb + ' GB 전체', colW / 2, (h + 20) / 2);
      // DB: 격자 페이지, 하나만 하이라이트
      const cols = 8, rows = 5, gx = colW + 14, gw = colW - 28;
      const cw = gw / cols, chh = (h - 42) / rows;
      let hi = 17; // 하이라이트할 페이지 인덱스
      for (let i = 0; i < cols * rows; i++) {
        const r = Math.floor(i / cols), c = i % cols;
        const x = gx + c * cw, y = 28 + r * chh;
        ctx.fillStyle = (flash && i === hi) ? '#1e88e5' : '#14243a';
        rr(ctx, x + 1.5, y + 1.5, cw - 3, chh - 3, 3); ctx.fill();
      }
      ctx.fillStyle = '#8ba0c4'; ctx.font = '10px Pretendard';
      ctx.fillText('필요한 페이지 몇 개만', colW + colW / 2, h - 6);
      ctx.textAlign = 'left';
      // stats
      const fileKB = gb * 1024 * 1024; // KB
      const dbKB = 8 * 3;              // 3 pages
      if (fileOut) fileOut.textContent = gb >= 1 ? gb + ' GB' : fileKB + ' KB';
      if (dbOut) dbOut.textContent = dbKB + ' KB';
      if (ratioOut) ratioOut.textContent = fmt(Math.round(fileKB / dbKB)) + '배';
    }
    function read() {
      flash = 1; draw();
      cancelAnimationFrame(raf);
      let t = 0;
      (function a() { t++; if (t > 30) { flash = 0; draw(); return; } draw(); raf = requestAnimationFrame(a); })();
      const gb = +sizeS.value;
      if (cap) cap.textContent = `${gb}GB 테이블에서 유저 1명 조회: 메모장식이면 ${gb}GB를 통째로, DB식이면 그 유저가 든 8KB 페이지 3개(=24KB)만 읽어. ${fmt(Math.round(gb * 1024 * 1024 / 24))}배 차이야.`;
    }
    sizeS.addEventListener('input', () => { sizev.textContent = sizeS.value; draw(); });
    $$('[data-pg]', cv.closest('.dbw')).forEach(b => b.addEventListener('click', read));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    sizev.textContent = sizeS.value; draw();
  })();

  /* ===== Widget 2: 힙 vs 클러스터드 ===== */
  (function layout() {
    const cv = $('#ly-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const scanOut = $('#ly-scan'), modeOut = $('#ly-mode'), cap = $('#ly-cap');
    let mode = 'heap';
    // 힙: 무작위 순서 / 클러스터드: 정렬
    const heapVals = [71, 12, 55, 3, 88, 42, 26, 60, 9, 34, 77, 50, 18, 63, 40, 5];
    const sorted = heapVals.slice().sort((a, b) => a - b);
    let scanIdx = -1, found = -1, raf = 0;
    function vals() { return mode === 'heap' ? heapVals : sorted; }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const V = vals(), cols = 8, rows = Math.ceil(V.length / cols);
      const cw = (w - 24) / cols, chh = Math.min(46, (h - 30) / rows);
      ctx.font = '700 13px Pretendard';
      for (let i = 0; i < V.length; i++) {
        const r = Math.floor(i / cols), c = i % cols;
        const x = 12 + c * cw, y = 16 + r * chh;
        let bg = '#14243a';
        if (found === i) bg = '#1b5e20';
        else if (scanIdx >= 0 && i <= scanIdx) bg = mode === 'clustered' && V[i] > 42 ? '#14243a' : '#3a2f14';
        ctx.fillStyle = bg; rr(ctx, x + 2, y + 2, cw - 4, chh - 4, 5); ctx.fill();
        ctx.strokeStyle = found === i ? '#69f0ae' : (scanIdx === i ? '#ffca28' : '#223052');
        ctx.lineWidth = found === i || scanIdx === i ? 2 : 1; ctx.stroke();
        ctx.fillStyle = V[i] === 42 ? '#ffd54f' : '#c6d4ec';
        ctx.textAlign = 'center'; ctx.fillText(V[i], x + cw / 2, y + chh / 2 + 4);
      }
      ctx.textAlign = 'left';
      if (modeOut) modeOut.textContent = mode === 'heap' ? '힙' : '클러스터드';
    }
    function find() {
      cancelAnimationFrame(raf); scanIdx = -1; found = -1;
      const V = vals(); const target = 42;
      let i = 0;
      (function step() {
        scanIdx = i;
        // 클러스터드: 정렬돼 있으니 target 넘으면 멈춤(그 전까지만 확인). 힙: 끝까지.
        if (V[i] === target) { found = i; draw();
          const checked = i + 1;
          if (scanOut) scanOut.textContent = checked + ' / ' + V.length + ' 칸';
          if (cap) cap.textContent = mode === 'heap'
            ? `힙: 순서가 없어서 42가 나올 때까지 앞에서부터 ${checked}칸을 확인했어(운 나쁘면 전부).`
            : `클러스터드: 정렬돼 있어 42까지 딱 ${checked}칸만 보면 돼 — 넘어가면 뒤엔 없다는 걸 아니까(실제 B-Tree는 더 빨라).`;
          return;
        }
        if (mode === 'clustered' && V[i] > target) { // 정렬: 넘으면 없음
          found = -2; draw();
          if (scanOut) scanOut.textContent = (i + 1) + ' / ' + V.length + ' 칸';
          return;
        }
        i++;
        if (i >= V.length) { draw(); if (scanOut) scanOut.textContent = V.length + ' / ' + V.length + ' 칸'; return; }
        draw(); raf = requestAnimationFrame(() => setTimeout(step, 120));
      })();
    }
    $$('[data-ly]', cv.closest('.dbw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-ly');
      if (a === 'find') { find(); return; }
      mode = a; scanIdx = -1; found = -1;
      $$('[data-ly]', cv.closest('.dbw')).forEach(x => { if (x.getAttribute('data-ly') !== 'find') x.classList.toggle('active', x === b); });
      if (scanOut) scanOut.textContent = '-';
      draw();
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();

  /* ===== Widget 3: B-Tree 탐색 ===== */
  (function btree() {
    const cv = $('#bt-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const readsOut = $('#bt-reads'), scanOut = $('#bt-scan'), cap = $('#bt-cap');
    // 3 tier: root -> 3 mid -> each 3 leaf (9 leaves)
    const root = { keys: [30, 60], label: '루트' };
    const mids = [
      { range: '1~30', keys: [10, 20], leaves: [[1, 5, 9], [12, 17, 25], [26, 28, 30]] },
      { range: '31~60', keys: [40, 50], leaves: [[34, 38, 40], [42, 45, 50], [51, 55, 60]] },
      { range: '61~90', keys: [70, 80], leaves: [[63, 66, 70], [72, 77, 80], [82, 88, 90]] }
    ];
    let target = null, path = { mid: -1, leaf: -1 }, stage = 0, raf = 0;
    function locate(v) {
      const mi = v <= 30 ? 0 : v <= 60 ? 1 : 2;
      const m = mids[mi];
      let li = 0;
      for (let i = 0; i < m.leaves.length; i++) { if (m.leaves[i].includes(v)) { li = i; break; } }
      return { mi, li };
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const yR = 20, yM = 120, yL = 220, bh = 40;
      // root
      const rootActive = stage >= 1;
      drawNode(w / 2 - 55, yR, 110, bh, '루트 [' + root.keys.join(' | ') + ']', rootActive ? '#1e88e5' : '#223052', rootActive);
      // mids
      const midW = 110, midGap = (w - 40 - midW * 3) / 2;
      mids.forEach((m, i) => {
        const x = 20 + i * (midW + midGap);
        const act = stage >= 2 && path.mid === i;
        drawNode(x, yM, midW, bh, m.range + ' [' + m.keys.join('|') + ']', act ? '#1e88e5' : '#1a2742', act);
        // line root->mid if active path
        if (stage >= 1 && path.mid === i) { line(w / 2, yR + bh, x + midW / 2, yM, stage >= 2 ? '#42a5f5' : '#37475f'); }
        // leaves under active mid
        if (stage >= 2 && path.mid === i) {
          const lw = (w - 40) / 3, lgap = 6;
          m.leaves.forEach((lf, j) => {
            const lx = 20 + j * lw;
            const lact = stage >= 3 && path.leaf === j;
            drawNode(lx + 2, yL, lw - lgap, bh, lf.join(' '), lact ? '#2e7d32' : '#14243a', lact, lact ? '#69f0ae' : '#223052');
            if (path.leaf === j && stage >= 2) line(x + midW / 2, yM + bh, lx + (lw) / 2, yL, stage >= 3 ? '#66bb6a' : '#37475f');
          });
        }
      });
      // found marker
      if (stage >= 3 && target != null) {
        ctx.fillStyle = '#ffd54f'; ctx.font = '800 13px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('✅ id=' + target + ' 찾음! (읽은 페이지 ' + 3 + '개)', w / 2, h - 8);
        ctx.textAlign = 'left';
      }
    }
    function drawNode(x, y, w2, h2, txt, bg, active, edge) {
      ctx.fillStyle = bg; rr(ctx, x, y, w2, h2, 7); ctx.fill();
      ctx.strokeStyle = edge || (active ? '#42a5f5' : '#223052'); ctx.lineWidth = active ? 2.2 : 1; ctx.stroke();
      ctx.fillStyle = active ? '#fff' : '#b7c6e0'; ctx.font = '700 12px Pretendard'; ctx.textAlign = 'center';
      ctx.fillText(txt, x + w2 / 2, y + h2 / 2 + 4); ctx.textAlign = 'left';
    }
    function line(x1, y1, x2, y2, col) {
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    function search(v) {
      target = v; const loc = locate(v); path = { mid: loc.mi, leaf: loc.li }; stage = 0;
      cancelAnimationFrame(raf);
      const msgs = [
        '루트를 읽어: "' + v + '는 어느 범위?"',
        '중간 노드로: "' + mids[loc.mi].range + ' 안에서 더 좁히자"',
        '잎 페이지 도착: 실제 행 발견! 총 3번 페이지 읽기.'
      ];
      let s = 0;
      (function adv() {
        stage = s + 1; draw();
        if (cap) cap.textContent = (s + 1) + '/3 · ' + msgs[s];
        if (readsOut) readsOut.textContent = (s + 1) + '개';
        if (scanOut) scanOut.textContent = '9개(전체 잎)';
        s++;
        if (s < 3) raf = requestAnimationFrame(() => setTimeout(adv, 700));
      })();
    }
    $$('[data-bt]', cv.closest('.dbw')).forEach(b => b.addEventListener('click', () => search(+b.getAttribute('data-bt'))));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    // 초기: 안내
    stage = 0; draw();
    if (readsOut) readsOut.textContent = '-';
    if (scanOut) scanOut.textContent = '9개(전체 잎)';
  })();
})();
