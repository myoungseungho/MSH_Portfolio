/* lock-striping: 단일 락 vs 샤딩 락 · 해시 분배(핫샤드)
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

  /* ===== Widget 1: 단일 락 vs 샤딩 락 ===== */
  (function lock() {
    const cv = $('#lock-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const tputOut = $('#lock-tput'), waitOut = $('#lock-wait'), relOut = $('#lock-rel'), cap = $('#lock-cap');
    let mode = 'single';
    let queues = [0];         // 각 자물쇠 대기 줄
    let processed = 0, raf = 0, running = false, t = 0, total = 0;
    function N() { return mode === 'single' ? 1 : 4; }
    function reset() {
      queues = new Array(N()).fill(0); processed = 0; t = 0; total = 0; running = false; cancelAnimationFrame(raf); draw();
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const n = N();
      ctx.textAlign = 'left'; ctx.font = '700 12px Pretendard'; ctx.fillStyle = '#8ba0c4';
      ctx.fillText(n === 1 ? '🚪 자물쇠 1개 — 전부 여기로' : '🚪 자물쇠 4개 — id로 나뉨', 12, 16);
      const gap = 12, bw = (w - 24 - gap * (n - 1)) / n, y = 30, maxQ = 40;
      for (let i = 0; i < n; i++) {
        const x = 12 + i * (bw + gap);
        // 자물쇠 헤더
        ctx.fillStyle = '#16233c'; rr(ctx, x, y, bw, 34, 8); ctx.fill();
        ctx.strokeStyle = queues[i] > 20 ? '#ef5350' : '#2f4468'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = '#cfe0ff'; ctx.font = '700 12px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('🔒 락' + i + (n > 1 ? ' (id%4=' + i + ')' : ''), x + bw / 2, y + 22);
        // 대기 줄 바
        const qh = h - y - 44;
        ctx.fillStyle = '#0c1424'; rr(ctx, x, y + 40, bw, qh, 6); ctx.fill();
        const fill = Math.min(1, queues[i] / maxQ);
        ctx.fillStyle = queues[i] > 20 ? '#ef5350' : queues[i] > 8 ? '#ffca28' : '#66bb6a';
        rr(ctx, x, y + 40 + qh * (1 - fill), bw, qh * fill, 6); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '800 14px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('대기 ' + queues[i], x + bw / 2, y + 40 + qh - 10);
      }
      ctx.textAlign = 'left';
      const maxWait = Math.max(...queues);
      if (tputOut) tputOut.textContent = processed + ' 건';
      if (waitOut) { waitOut.textContent = maxWait + ' 명'; waitOut.className = 'v' + (maxWait > 20 ? ' warn' : maxWait > 8 ? '' : ' good'); }
      if (relOut) { relOut.textContent = n === 1 ? '1×(기준)' : '≈4× 빠름'; relOut.className = 'v' + (n === 1 ? ' warn' : ' good'); }
    }
    function run() {
      reset(); running = true; total = 100;
      let queued = total;
      // 100건을 각 자물쇠에 분배(샤딩이면 id%4로 골고루)
      const n = N();
      const incoming = new Array(n).fill(0);
      for (let k = 0; k < total; k++) { const id = (k * 7 + 3) % 100; incoming[id % n]++; }
      for (let i = 0; i < n; i++) queues[i] = incoming[i];
      (function step() {
        t++;
        // 각 자물쇠는 tick당 1건씩 처리(병렬)
        let did = 0;
        for (let i = 0; i < queues.length; i++) { if (queues[i] > 0) { queues[i]--; did++; processed++; } }
        draw();
        if (queues.some(q => q > 0)) raf = requestAnimationFrame(() => setTimeout(step, 60));
        else { running = false; finish(); }
      })();
      draw();
    }
    function finish() {
      if (cap) cap.textContent = N() === 1
        ? '단일 락: 100건이 자물쇠 하나에 다 줄 서서 100틱 걸려(대기 최대 100). 코어를 늘려도 자물쇠가 하나라 소용없어.'
        : '샤딩(4개): id%4로 4갈래로 갈라져 각 자물쇠가 ~25건씩 동시에 처리 → 약 25틱. 경합이 1/4로 흩어져 4배 빨라졌어.';
    }
    $$('[data-sk]', cv.closest('.skw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-sk');
      if (a === 'run') { run(); return; }
      mode = a; $$('[data-sk]', cv.closest('.skw')).forEach(x => { const v = x.getAttribute('data-sk'); if (v === 'single' || v === 'shard') x.classList.toggle('active', x === b); });
      reset();
      if (cap) cap.textContent = mode === 'single' ? '자물쇠 1개 모드. ▶ 요청 쏟기.' : '샤딩(4개) 모드. ▶ 요청 쏟기로 비교.';
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    reset();
  })();

  /* ===== Widget 2: 해시 분배 & 핫샤드 ===== */
  (function dist() {
    const cv = $('#dist-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const cap = $('#dist-cap');
    let mode = 'even';
    const N = 4;
    function loads() {
      if (mode === 'even') return [25, 24, 26, 25];
      return [8, 7, 77, 8]; // 핫샤드: 한 키가 3번 샤드에 몰림
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const L = loads(), max = Math.max(...L);
      ctx.textAlign = 'left'; ctx.font = '700 12px Pretendard'; ctx.fillStyle = '#8ba0c4';
      ctx.fillText('해시로 4개 샤드에 분배', 12, 16);
      const gap = 14, bw = (w - 24 - gap * (N - 1)) / N, base = h - 24, top = 30;
      for (let i = 0; i < N; i++) {
        const x = 12 + i * (bw + gap);
        const hot = L[i] > 50;
        const bh = (base - top) * (L[i] / 100);
        ctx.fillStyle = '#0c1424'; rr(ctx, x, top, bw, base - top, 6); ctx.fill();
        ctx.fillStyle = hot ? '#ef5350' : '#66bb6a';
        rr(ctx, x, base - bh, bw, bh, 6); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '800 13px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText(L[i] + '%', x + bw / 2, base - bh - 6 > top + 12 ? base - bh - 6 : base - bh + 16);
        ctx.fillStyle = hot ? '#ff8a80' : '#8ba0c4'; ctx.font = '700 11px Pretendard';
        ctx.fillText('샤드' + i + (hot ? ' 🔥' : ''), x + bw / 2, base + 16);
      }
      ctx.textAlign = 'left';
    }
    $$('[data-ds]', cv.closest('.skw')).forEach(b => b.addEventListener('click', () => {
      mode = b.getAttribute('data-ds') === 'even' ? 'even' : 'hot';
      $$('[data-ds]', cv.closest('.skw')).forEach(x => x.classList.toggle('active', x === b));
      if (cap) cap.textContent = mode === 'even'
        ? '균등 분배: 각 샤드가 ~25%씩. 4갈래로 골고루 나뉘어 이상적 — 이게 샤딩이 노리는 그림이야.'
        : '핫스팟: 인기 키(보스 몹/인기 아이템)에 요청이 3번 샤드로 몰려 77%. 쪼갰는데도 한 샤드만 과부하 = 핫샤드. 샤딩은 "골고루 나뉜다"가 전제라 이럴 땐 키를 더 잘게/다르게 나눠야 해.';
      draw();
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();
})();
