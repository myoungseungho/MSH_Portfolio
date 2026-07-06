/* deadlock (renewed): 데드락 순환 재현 & 순서 통일 fix
   바닐라 JS + Canvas. */
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

  (function cycle() {
    const cv = $('#cycle-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const stateOut = $('#dl-state'), cycOut = $('#dl-cycle'), cap = $('#dl-cap');
    let mode = 'bad';
    const badSteps = [
      { l1: 'T1', l2: null, w1: null, w2: null, msg: '스레드1이 락 A를 잠갔어(A→B 순서).', dead: false },
      { l1: 'T1', l2: 'T2', w1: null, w2: null, msg: '스레드2가 락 B를 잠갔어(B→A 순서). 아직은 각자 하나씩.', dead: false },
      { l1: 'T1', l2: 'T2', w1: 'B', w2: null, msg: 'T1이 락 B를 원해 → 근데 B는 T2가 쥐고 있음 → T1 대기.', dead: false },
      { l1: 'T1', l2: 'T2', w1: 'B', w2: 'A', msg: '💀 T2가 락 A를 원해 → A는 T1이 쥐고 있음 → T2도 대기. 서로 상대를 기다림 = 순환 대기 = 데드락!', dead: true }
    ];
    const fixSteps = [
      { l1: 'T1', l2: null, w1: null, w2: null, msg: '순서 통일: 둘 다 "A 먼저, B 나중". T1이 A를 잠갔어.', dead: false },
      { l1: 'T1', l2: null, w1: null, w2: 'A', msg: 'T2도 A부터 잡으려 해 → A는 T1이 쥠 → T2 대기(B는 아직 아무도 안 쥠).', dead: false },
      { l1: 'T1', l2: 'T1', w1: null, w2: 'A', msg: 'T1은 B도 무사히 잠금(아무도 B를 안 쥠) → T1 작업 끝 → 곧 둘 다 놓음.', dead: false },
      { l1: 'T2', l2: 'T2', w1: null, w2: null, msg: '✓ T1이 다 놓자 T2가 A·B를 순서대로 잠금. 순환이 안 생겨 — 데드락 없음!', dead: false }
    ];
    let i = -1;
    function steps() { return mode === 'bad' ? badSteps : fixSteps; }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const s = i >= 0 ? steps()[i] : { l1: null, l2: null, w1: null, w2: null, dead: false, msg: '' };
      const ax = w * 0.5 - 120, bx = w * 0.5 + 120, ly = 40, lw2 = 100, lh = 44;
      lock('🔒 락 A', s.l1, ax - lw2 / 2, ly, s.dead);
      lock('🔒 락 B', s.l2, bx - lw2 / 2, ly, s.dead);
      function lock(label, holder, x, y, dead) {
        ctx.fillStyle = holder ? (dead ? '#3a1a1a' : '#16233c') : '#101827';
        rr(ctx, x, y, lw2, lh, 8); ctx.fill();
        ctx.strokeStyle = holder === 'T1' ? '#42a5f5' : holder === 'T2' ? '#ef5350' : '#2f4468';
        ctx.lineWidth = holder ? 2 : 1; ctx.stroke();
        ctx.fillStyle = '#cfe0ff'; ctx.font = '700 12px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText(label, x + lw2 / 2, y + 18);
        ctx.fillStyle = holder ? (holder === 'T1' ? '#8ecbff' : '#ff9a9a') : '#4a5670';
        ctx.font = '700 11px Pretendard';
        ctx.fillText(holder ? holder + ' 보유' : '비어있음', x + lw2 / 2, y + 36);
      }
      const ty = 150;
      thread('🔵 스레드1', s.w1, w * 0.26, ty, '#42a5f5');
      thread('🔴 스레드2', s.w2, w * 0.74, ty, '#ef5350');
      function thread(label, waiting, x, y, col) {
        const bw = 150;
        ctx.fillStyle = waiting ? '#2a1a1a' : '#16233c'; rr(ctx, x - bw / 2, y, bw, 52, 8); ctx.fill();
        ctx.strokeStyle = waiting ? '#ef5350' : col; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = col; ctx.font = '700 12px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText(label, x, y + 20);
        ctx.fillStyle = waiting ? '#ff8a80' : '#69f0ae'; ctx.font = '700 11px Pretendard';
        ctx.fillText(waiting ? '⏳ 락 ' + waiting + ' 대기 중' : '진행 가능', x, y + 40);
      }
      if (s.dead) {
        ctx.strokeStyle = '#ef5350'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(w * 0.26, ty); ctx.lineTo(bx - lw2 / 2, ly + lh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w * 0.74, ty); ctx.lineTo(ax + lw2 / 2, ly + lh); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ff5252'; ctx.font = '800 18px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('💀 순환 대기 — 데드락', w / 2, h - 12);
      }
      ctx.textAlign = 'left';
      if (stateOut) { stateOut.textContent = s.dead ? '💀 얼어붙음' : (i < 0 ? '정상' : '진행 중'); stateOut.className = 'v' + (s.dead ? ' warn' : ' good'); }
      if (cycOut) { cycOut.textContent = s.dead ? '있음(A↔B)' : '없음'; cycOut.className = 'v' + (s.dead ? ' warn' : ' good'); }
    }
    function step() { const S = steps(); if (i < S.length - 1) i++; draw(); if (cap && i >= 0) cap.textContent = S[i].msg; }
    function reset() { i = -1; draw(); if (cap) cap.textContent = mode === 'bad' ? '스레드1은 A→B, 스레드2는 B→A 순서로 잠그려 해. 엇갈린 순서가 화근이야.' : '순서 통일 모드: 둘 다 A→B 같은 순서로만 잠가. ▶ 단계 진행.'; }
    $$('[data-dm]', cv.closest('.dlw')).forEach(b => b.addEventListener('click', () => {
      mode = b.getAttribute('data-dm') === 'bad' ? 'bad' : 'fix';
      $$('[data-dm]', cv.closest('.dlw')).forEach(x => x.classList.toggle('active', x === b));
      reset();
    }));
    $$('[data-dl]', cv.closest('.dlw')).forEach(b => b.addEventListener('click', () => {
      b.getAttribute('data-dl') === 'step' ? step() : reset();
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    reset();
  })();
})();
