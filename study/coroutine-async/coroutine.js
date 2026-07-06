/* coroutine-async (renewed): 상태머신 스텝퍼 · 블로킹 vs 코루틴 타임라인
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

  /* ===== Widget 1: 상태머신 스텝퍼 ===== */
  (function sm() {
    const cv = $('#sm-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const cap = $('#sm-cap');
    const states = ['LOAD_USER', 'LOAD_INV', 'LOAD_PRICE', 'DONE'];
    const fields = [{ k: 'user', v: null }, { k: 'inv', v: null }, { k: 'prices', v: null }];
    // step: -1 시작(state=0), 0 user도착(state=1), 1 inv(state=2), 2 prices(state=3=DONE)
    let i = -1;
    const msgs = [
      'user 결과 도착 → user 저장, state를 LOAD_INV로 → loadInventory 호출.',
      'inv 결과 도착 → inv 저장, state를 LOAD_PRICE로 → loadPrices 호출.',
      'prices 결과 도착 → prices 저장, state=DONE → send(render). 완료!'
    ];
    function curState() { return Math.min(i + 1, states.length - 1); }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      // state 행
      ctx.textAlign = 'left'; ctx.font = '700 12px Pretendard'; ctx.fillStyle = '#8ba0c4';
      ctx.fillText('state (지금 몇 단계?)', 12, 16);
      const n = states.length, gap = 10, bw = (w - 24 - gap * (n - 1)) / n, y = 26, bh = 40;
      const cs = curState();
      states.forEach((s, k) => {
        const x = 12 + k * (bw + gap);
        const active = k === cs, done = k < cs;
        ctx.fillStyle = active ? '#1e88e5' : done ? '#123024' : '#16233c';
        rr(ctx, x, y, bw, bh, 8); ctx.fill();
        ctx.strokeStyle = active ? '#42a5f5' : done ? '#66bb6a' : '#2f4468'; ctx.lineWidth = active ? 2.2 : 1; ctx.stroke();
        ctx.fillStyle = active ? '#fff' : done ? '#69f0ae' : '#9fb0cc'; ctx.font = '700 11px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText(s, x + bw / 2, y + bh / 2 + 4);
        if (k < n - 1) { ctx.fillStyle = '#5a6b8a'; ctx.fillText('→', x + bw + gap / 2, y + bh / 2 + 4); }
      });
      // 필드 행
      ctx.textAlign = 'left'; ctx.fillStyle = '#8ba0c4'; ctx.font = '700 12px Pretendard';
      ctx.fillText('저장된 데이터 (필드)', 12, y + bh + 30);
      const fy = y + bh + 40;
      fields.forEach((f, k) => {
        const fbw = (w - 24 - gap * 2) / 3, x = 12 + k * (fbw + gap);
        const filled = i >= k;
        ctx.fillStyle = filled ? '#123024' : '#101827'; rr(ctx, x, fy, fbw, 46, 8); ctx.fill();
        ctx.strokeStyle = filled ? '#66bb6a' : '#223052'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = '#cfe0ff'; ctx.font = '700 12px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText(f.k, x + fbw / 2, fy + 20);
        ctx.fillStyle = filled ? '#69f0ae' : '#4a5670'; ctx.font = '700 11px Pretendard';
        ctx.fillText(filled ? '✓ 저장됨' : '(비어있음)', x + fbw / 2, fy + 38);
      });
      // switch 힌트
      ctx.textAlign = 'center'; ctx.fillStyle = '#5a6b8a'; ctx.font = '11px Pretendard';
      ctx.fillText('이벤트 도착 → switch(state) → 데이터 저장 + 다음 state', w / 2, h - 12);
      ctx.textAlign = 'left';
    }
    function step() { if (i < 2) i++; draw(); if (cap && i >= 0) cap.textContent = msgs[i]; }
    function reset() { i = -1; draw(); if (cap) cap.textContent = '유저 → 인벤 → 가격 → 완료. 각 단계는 이전 결과가 있어야 다음으로 가. 지금은 시작 전(state=LOAD_USER).'; }
    $$('[data-sm]', cv.closest('.cow')).forEach(b => b.addEventListener('click', () => {
      b.getAttribute('data-sm') === 'step' ? step() : reset();
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    reset();
  })();

  /* ===== Widget 2: 블로킹 vs 코루틴 타임라인 ===== */
  (function awaitw() {
    const cv = $('#await-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const totalOut = $('#aw-total'), idleOut = $('#aw-idle'), relOut = $('#aw-rel'), cap = $('#aw-cap');
    let mode = 'block';
    let shown = false;
    const CPU = 0.3, IO = 0.9;
    // 세그먼트: {req, type:'cpu'|'io'|'idle', start, dur}
    function segs() {
      if (mode === 'block') {
        // R1 cpu,io(idle) → R2 → R3, 직렬
        const s = []; let t = 0;
        for (let r = 0; r < 3; r++) { s.push({ r, type: 'cpu', start: t, dur: CPU }); t += CPU; s.push({ r, type: 'idle', start: t, dur: IO }); t += IO; }
        return { s, total: t, idle: 3 * IO };
      } else {
        // 코루틴: cpu 3개 인터리브(0~0.9), I/O 겹침, 마지막 I/O 꼬리
        const s = [];
        for (let r = 0; r < 3; r++) s.push({ r, type: 'cpu', start: r * CPU, dur: CPU });
        for (let r = 0; r < 3; r++) s.push({ r, type: 'io', start: (r + 1) * CPU, dur: IO }); // I/O는 백그라운드(스레드 유휴 아님)
        const total = 3 * CPU + IO; // 0.9 cpu + 마지막 io 0.9 = 1.8? 겹치므로 last io 시작 0.9 + 0.9 = 1.8
        return { s, total, idle: 0 };
      }
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const { s, total, idle } = segs();
      const maxT = 3.6, padL = 40, padR = 12, x0 = padL, fullw = w - padL - padR;
      const px = (t) => x0 + fullw * (t / maxT);
      // 스레드 타임라인 라벨
      ctx.textAlign = 'left'; ctx.font = '700 11px Pretendard'; ctx.fillStyle = '#8ba0c4';
      ctx.fillText('스레드 1개의 시간축 (초)', 12, 16);
      const laneY = 30, laneH = 34;
      // 배경
      ctx.fillStyle = '#0c1424'; rr(ctx, x0, laneY, fullw, laneH, 6); ctx.fill();
      if (shown) {
        s.forEach(seg => {
          if (seg.type === 'io' && mode === 'coro') return; // 백그라운드 I/O는 별도 표시
          const col = seg.type === 'cpu' ? '#66bb6a' : '#ef5350'; // idle=빨강
          ctx.fillStyle = col; rr(ctx, px(seg.start) + 1, laneY + 3, Math.max(2, px(seg.start + seg.dur) - px(seg.start) - 2), laneH - 6, 4); ctx.fill();
          ctx.fillStyle = '#0a1020'; ctx.font = '700 9px Pretendard'; ctx.textAlign = 'center';
          if (seg.dur > 0.25) ctx.fillText(seg.type === 'cpu' ? 'R' + (seg.r + 1) : '유휴', (px(seg.start) + px(seg.start + seg.dur)) / 2, laneY + laneH / 2 + 3);
        });
        // 코루틴: 백그라운드 I/O를 아래에 얇게
        if (mode === 'coro') {
          ctx.fillStyle = '#8ba0c4'; ctx.font = '700 10px Pretendard'; ctx.textAlign = 'left';
          ctx.fillText('백그라운드 I/O (스레드 안 씀)', 12, laneY + laneH + 22);
          s.filter(x => x.type === 'io').forEach(seg => {
            ctx.strokeStyle = 'rgba(66,165,245,.6)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 3;
            ctx.beginPath(); const yy = laneY + laneH + 30 + seg.r * 8; ctx.moveTo(px(seg.start), yy); ctx.lineTo(px(seg.start + seg.dur), yy); ctx.stroke(); ctx.setLineDash([]);
          });
        }
        // 총시간 마커
        ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px(total), laneY - 4); ctx.lineTo(px(total), laneY + laneH + 6); ctx.stroke();
      } else {
        ctx.fillStyle = '#4a5670'; ctx.font = '12px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('▶ 실행을 눌러봐', w / 2, laneY + laneH / 2 + 4);
      }
      // 눈금
      ctx.fillStyle = '#4a5670'; ctx.font = '9px Pretendard'; ctx.textAlign = 'center';
      for (let t = 0; t <= 3; t++) ctx.fillText(t + 's', px(t), h - 6);
      ctx.textAlign = 'left';
      if (shown) {
        if (totalOut) { totalOut.textContent = total.toFixed(1) + '초'; totalOut.className = 'v' + (mode === 'block' ? ' warn' : ' good'); }
        if (idleOut) { idleOut.textContent = idle.toFixed(1) + '초'; idleOut.className = 'v' + (idle > 0 ? ' warn' : ' good'); }
        if (relOut) { relOut.textContent = mode === 'block' ? '1×(기준)' : '≈3× 빠름'; relOut.className = 'v' + (mode === 'block' ? ' warn' : ' good'); }
      }
    }
    function run() {
      shown = true; draw();
      const { total, idle } = segs();
      if (cap) cap.textContent = mode === 'block'
        ? `블로킹: R1을 CPU 0.3초 + I/O 0.9초(그동안 스레드 유휴) 다 끝내야 R2 시작 → 3요청 ${total.toFixed(1)}초, 유휴 ${idle.toFixed(1)}초 낭비.`
        : `코루틴: await에서 다른 요청으로 갈아타 CPU를 꽉 채우고 I/O는 백그라운드로 겹쳐 → ${total.toFixed(1)}초, 유휴 0. 한 스레드로 3배 처리량.`;
    }
    $$('[data-aw]', cv.closest('.cow')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-aw');
      if (a === 'run') { run(); return; }
      mode = a; shown = false; $$('[data-aw]', cv.closest('.cow')).forEach(x => { const v = x.getAttribute('data-aw'); if (v === 'block' || v === 'coro') x.classList.toggle('active', x === b); });
      if (cap) cap.textContent = mode === 'block' ? '블로킹 모드. ▶ 실행.' : '코루틴 모드. ▶ 실행해 비교.';
      draw();
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();
})();
