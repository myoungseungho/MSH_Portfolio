/* false-sharing (renewed): 캐시라인 배치 · 핑퐁 vs 패딩 처리량
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

  /* ===== Widget 1: 캐시라인 배치 ===== */
  (function line() {
    const cv = $('#line-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const invalOut = $('#ln-inval'), modeOut = $('#ln-mode'), cap = $('#ln-cap');
    let mode = 'same';            // same | pad
    let inval = 0;
    // 코어 캐시 상태: 어떤 라인을 갖고 있고 valid 한지
    let c1 = { line: null, valid: true }, c2 = { line: null, valid: true };
    let flash = '';              // 'A' or 'B' 방금 쓴 것
    // 배치: same → A,B 모두 라인0. pad → A 라인0, B 라인1
    function lineOfA() { return 0; }
    function lineOfB() { return mode === 'same' ? 0 : 1; }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      // 메모리 스트립: 2개 캐시라인
      ctx.textAlign = 'left'; ctx.font = '700 12px Pretendard'; ctx.fillStyle = '#8ba0c4';
      ctx.fillText('💾 메모리 (캐시라인 = 64바이트 칠판)', 12, 16);
      const lw = w - 24, lh = 40, ly0 = 26, gap = 10;
      for (let L = 0; L < 2; L++) {
        const y = ly0 + L * (lh + gap);
        ctx.fillStyle = '#0c1424'; rr(ctx, 12, y, lw, lh, 8); ctx.fill();
        ctx.strokeStyle = '#223052'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#4a5670'; ctx.font = '10px Pretendard'; ctx.fillText('라인 ' + L + ' (64B)', 20, y + 14);
        // A, B 위치 표시
        if (lineOfA() === L) chip('A', '#42a5f5', 12 + lw * 0.28, y + lh / 2, flash === 'A');
        if (lineOfB() === L) chip('B', '#ef5350', 12 + lw * (mode === 'same' ? 0.6 : 0.28), y + lh / 2, flash === 'B');
      }
      function chip(name, col, cx, cy, hot) {
        ctx.fillStyle = hot ? col : '#16233c'; rr(ctx, cx - 26, cy - 12, 52, 24, 6); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = hot ? 2.2 : 1.4; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '800 13px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText(name, cx, cy + 5); ctx.textAlign = 'left';
      }
      // 코어 캐시 2개
      const cy = ly0 + 2 * (lh + gap) + 10;
      core('🔵 코어1 캐시 (A 담당)', c1, '#42a5f5', 12, cy);
      core('🔴 코어2 캐시 (B 담당)', c2, '#ef5350', 12 + (lw / 2) + 6, cy);
      function core(label, st, col, x, y) {
        const bw = lw / 2 - 6;
        const stale = st.line !== null && !st.valid;
        ctx.fillStyle = stale ? '#2a1a1a' : '#101827'; rr(ctx, x, y, bw, 66, 8); ctx.fill();
        ctx.strokeStyle = stale ? '#ef5350' : col; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = col; ctx.font = '700 11px Pretendard'; ctx.textAlign = 'left';
        ctx.fillText(label, x + 12, y + 20);
        ctx.font = '700 12px Pretendard';
        ctx.fillStyle = st.line === null ? '#4a5670' : (stale ? '#ff8a80' : '#69f0ae');
        ctx.fillText(st.line === null ? '(비어있음)' : '라인 ' + st.line + ' 보유 · ' + (stale ? '❌ 무효(다시 읽어야 함)' : '✓ 유효'), x + 12, y + 46);
      }
      if (invalOut) invalOut.textContent = inval;
      if (modeOut) modeOut.textContent = mode === 'same' ? '같은 라인' : '패딩(다른 라인)';
    }
    function write(who) {
      flash = who;
      const myLine = who === 'A' ? lineOfA() : lineOfB();
      const me = who === 'A' ? c1 : c2, other = who === 'A' ? c2 : c1;
      me.line = myLine; me.valid = true;
      // 상대가 같은 라인을 유효 상태로 갖고 있었으면 → 무효화
      let invalidated = false;
      if (other.line === myLine && other.valid) { other.valid = false; inval++; invalidated = true; }
      draw();
      if (cap) {
        if (mode === 'same') {
          cap.textContent = invalidated
            ? `${who} 쓰기 → 라인 ${myLine} 독점. 상대 코어도 같은 라인을 갖고 있어서 ❌ 무효화됨! 상대는 다시 읽어와야 해(핑퐁). A·B는 상관없는 변수인데도.`
            : `${who} 쓰기 → 라인 ${myLine} 독점. 이제 상대가 자기 변수를 건드리면 이 라인이 무효화될 거야.`;
        } else {
          cap.textContent = `${who} 쓰기 → 라인 ${myLine}. A는 라인0, B는 라인1로 떨어져 있어서 서로 무효화 안 됨 ✓ (패딩의 효과).`;
        }
      }
    }
    $$('[data-ly]', cv.closest('.fsw')).forEach(b => b.addEventListener('click', () => {
      mode = b.getAttribute('data-ly') === 'same' ? 'same' : 'pad';
      $$('[data-ly]', cv.closest('.fsw')).forEach(x => x.classList.toggle('active', x === b));
      inval = 0; c1 = { line: null, valid: true }; c2 = { line: null, valid: true }; flash = '';
      if (cap) cap.textContent = mode === 'same' ? 'A와 B가 같은 라인0에 있어. 각 코어가 자기 변수에 써봐.' : 'A는 라인0, B는 라인1로 패딩해 떼어놨어. 이제 써봐.';
      draw();
    }));
    $$('[data-wr]', cv.closest('.fsw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-wr');
      if (a === 'reset') { inval = 0; c1 = { line: null, valid: true }; c2 = { line: null, valid: true }; flash = ''; draw(); return; }
      write(a);
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();

  /* ===== Widget 2: 핑퐁 vs 패딩 처리량 ===== */
  (function perf() {
    const cv = $('#perf-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const opsOut = $('#pf-ops'), bounceOut = $('#pf-bounce'), relOut = $('#pf-rel'), cap = $('#pf-cap');
    let mode = 'false';
    let ops = 0, bounce = 0, raf = 0, running = false, t = 0;
    const RATE = { false: 1, pad: 8 };  // 패딩이 8배 빠름(예시)
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      // 두 코어 + 캐시라인
      const cy = 44;
      ctx.textAlign = 'center'; ctx.font = '700 12px Pretendard';
      ctx.fillStyle = '#42a5f5'; ctx.fillText('🔵 코어1 (A++)', w * 0.2, 20);
      ctx.fillStyle = '#ef5350'; ctx.fillText('🔴 코어2 (B++)', w * 0.8, 20);
      // 라인 위치: false면 중앙에서 핑퐁, pad면 각자 옆에 고정
      let lx;
      if (mode === 'false') { lx = w / 2 + Math.sin(t * 0.4) * (w * 0.28); }
      else { lx = w / 2; }
      // 코어 박스
      [[w * 0.2, '#42a5f5'], [w * 0.8, '#ef5350']].forEach(([x, col]) => {
        ctx.fillStyle = '#16233c'; rr(ctx, x - 46, cy, 92, 42, 8); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.stroke();
      });
      if (mode === 'false') {
        // 핑퐁하는 라인 한 장
        ctx.fillStyle = '#5d1a1a'; rr(ctx, lx - 30, cy + 6, 60, 30, 6); ctx.fill();
        ctx.strokeStyle = '#ef5350'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ff8a80'; ctx.font = '700 10px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('공유 라인', lx, cy + 24);
      } else {
        // 각자 자기 라인
        [[w * 0.2, '#1e88e5'], [w * 0.8, '#c62828']].forEach(([x, c]) => {
          ctx.fillStyle = '#123024'; rr(ctx, x - 30, cy + 6, 60, 30, 6); ctx.fill();
          ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 1.6; ctx.stroke();
          ctx.fillStyle = '#69f0ae'; ctx.font = '700 10px Pretendard'; ctx.textAlign = 'center';
          ctx.fillText('전용 라인', x, cy + 24);
        });
      }
      // 처리량 바
      const by = 110, bw = w - 24;
      ctx.fillStyle = '#141d33'; rr(ctx, 12, by, bw, 26, 6); ctx.fill();
      const maxOps = 8000;
      ctx.fillStyle = mode === 'false' ? '#ef5350' : '#66bb6a';
      rr(ctx, 12, by, Math.min(bw, bw * (ops / maxOps)), 26, 6); ctx.fill();
      ctx.fillStyle = '#e3eaf5'; ctx.font = '700 12px Pretendard'; ctx.textAlign = 'left';
      ctx.fillText(ops.toLocaleString('en-US') + ' ops', 20, by + 18);
      ctx.textAlign = 'left';
      if (opsOut) opsOut.textContent = ops.toLocaleString('en-US');
      if (bounceOut) bounceOut.textContent = bounce.toLocaleString('en-US');
      if (relOut) { relOut.textContent = mode === 'false' ? '1×(기준)' : '8× 빠름'; relOut.className = 'v' + (mode === 'false' ? ' warn' : ' good'); }
    }
    function loop() {
      if (!running) return;
      t++;
      ops += RATE[mode] * 40;
      if (mode === 'false') bounce += 30;
      if (ops >= 8000) { ops = 8000; running = false; finish(); }
      draw();
      if (running) raf = requestAnimationFrame(loop);
    }
    function finish() {
      if (cap) cap.textContent = mode === 'false'
        ? '같은 라인이라 코어끼리 라인을 뺏느라(핑퐁 ' + bounce.toLocaleString('en-US') + '회) 처리량이 바닥. 계산은 +1인데 통신비가 폭발한 거야.'
        : '패딩해서 각자 전용 라인 → 핑퐁 0, 처리량 약 8배. 같은 코드, 변수 배치만 바꿨을 뿐이야.';
    }
    function reset() { ops = 0; bounce = 0; t = 0; running = false; cancelAnimationFrame(raf); draw(); }
    $$('[data-pf]', cv.closest('.fsw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-pf');
      if (a === 'run') { reset(); running = true; loop(); return; }
      mode = a; $$('[data-pf]', cv.closest('.fsw')).forEach(x => { const v = x.getAttribute('data-pf'); if (v === 'false' || v === 'pad') x.classList.toggle('active', x === b); });
      reset();
      if (cap) cap.textContent = mode === 'false' ? 'false sharing 모드: 같은 라인 공유. ▶ 실행.' : '패딩 모드: 각자 전용 라인. ▶ 실행해 비교.';
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();
})();
