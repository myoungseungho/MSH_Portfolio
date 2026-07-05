/* lock-free (renewed): 레이스 인터리빙 · CAS 재시도 루프 · 처리량 비교
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

  /* ===== Widget 1: 레이스 인터리빙 ===== */
  (function race() {
    const cv = $('#race-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const realOut = $('#race-real'), cap = $('#race-cap');
    const steps = [
      { who: 'A', act: '읽기', hand: 100, shared: 100, msg: 'A가 창고 HP 100을 손에 복사했어.' },
      { who: 'B', act: '읽기', hand: 100, shared: 100, msg: 'B도 같은 100을 복사 — 여기서 사고가 예약됐어. 둘 다 100을 봤거든.' },
      { who: 'A', act: '계산 -30', hand: 70, shared: 100, msg: 'A는 손에서 100-30=70을 만들어.' },
      { who: 'A', act: '쓰기 70', hand: 70, shared: 70, msg: 'A가 창고에 70을 써. 지금까진 정상.' },
      { who: 'B', act: '계산 -50', hand: 50, shared: 70, msg: 'B는 아까 본 100 기준으로 100-50=50을 만들어. (창고는 이미 70인데!)' },
      { who: 'B', act: '쓰기 50', hand: 50, shared: 50, msg: '💥 B가 50을 덮어써. A의 -30이 통째로 사라졌어! 20이어야 할 HP가 50.' }
    ];
    let i = -1;
    let A = { hand: null }, B = { hand: null }, shared = 100, active = null;
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      ctx.font = '700 13px Pretendard'; ctx.textAlign = 'center';
      ctx.fillStyle = '#8ba0c4'; ctx.fillText('공유 창고 HP', w / 2, 22);
      ctx.fillStyle = '#1c2740'; rr(ctx, w / 2 - 45, 30, 90, 44, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '800 22px Pretendard'; ctx.fillText(shared, w / 2, 60);
      const lanes = [{ x: w * 0.24, who: 'A', col: '#42a5f5', hand: A.hand }, { x: w * 0.76, who: 'B', col: '#ef5350', hand: B.hand }];
      lanes.forEach(L => {
        ctx.fillStyle = active === L.who ? L.col : '#37475f';
        ctx.font = '700 13px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('스레드 ' + L.who, L.x, 120);
        ctx.fillStyle = '#0f1830'; rr(ctx, L.x - 50, 130, 100, 46, 8); ctx.fill();
        ctx.strokeStyle = active === L.who ? L.col : '#223052'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = L.hand == null ? '#4a5670' : '#ffd54f'; ctx.font = '800 18px Pretendard';
        ctx.fillText(L.hand == null ? '(빈손)' : '손:' + L.hand, L.x, 160);
      });
      if (i >= 0) {
        const s = steps[i];
        ctx.fillStyle = s.who === 'A' ? '#42a5f5' : '#ef5350';
        ctx.font = '700 12px Pretendard';
        ctx.fillText(s.who + ' — ' + s.act, s.who === 'A' ? w * 0.24 : w * 0.76, 200);
      }
      ctx.textAlign = 'left';
      if (realOut) realOut.textContent = shared;
    }
    function step() {
      if (i >= steps.length - 1) return;
      i++; const s = steps[i];
      active = s.who;
      if (s.act === '읽기') { if (s.who === 'A') A.hand = s.hand; else B.hand = s.hand; }
      else if (s.act.startsWith('계산')) { if (s.who === 'A') A.hand = s.hand; else B.hand = s.hand; }
      else if (s.act.startsWith('쓰기')) { shared = s.shared; }
      if (cap) cap.textContent = s.msg;
      draw();
    }
    function reset() { i = -1; A = { hand: null }; B = { hand: null }; shared = 100; active = null; if (cap) cap.textContent = 'A는 -30, B는 -50. 순서대로 하면 20이어야 하는데…'; draw(); }
    $$('[data-race]', cv.closest('.lfw')).forEach(b => b.addEventListener('click', () => {
      b.getAttribute('data-race') === 'step' ? step() : reset();
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    reset();
  })();

  /* ===== Widget 2: CAS 재시도 루프 (핵심) ===== */
  (function cas() {
    const cv = $('#cas-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const sharedOut = $('#cas-shared'), okOut = $('#cas-ok'), retryOut = $('#cas-retry'), cap = $('#cas-cap');
    const steps = [
      { who: 'A', st: 'read', hand: 0, msg: 'A: 공유 카운터 0을 읽어 손에 담아.' },
      { who: 'B', st: 'read', hand: 0, msg: 'B도 0을 읽어. (둘 다 0을 봤다!)' },
      { who: 'A', st: 'calc', hand: 1, msg: 'A: 손에서 0+1=1.' },
      { who: 'A', st: 'cas-ok', shared: 1, msg: 'A CAS: "공유가 아직 0 맞아?" → 맞음 → 1로 교체 성공! ✅' },
      { who: 'B', st: 'calc', hand: 1, msg: 'B: 손에서 0+1=1. (근데 공유는 이미 1인데…)' },
      { who: 'B', st: 'cas-fail', msg: 'B CAS: "공유가 아직 0 맞아?" → ❌ 아니 1이잖아! 실패 → 재시도.' },
      { who: 'B', st: 'read', hand: 1, msg: 'B 재시도: 새 값 1을 다시 읽어. (덮어쓰기 사고 방지!)' },
      { who: 'B', st: 'calc', hand: 2, msg: 'B: 손에서 1+1=2.' },
      { who: 'B', st: 'cas-ok', shared: 2, msg: 'B CAS: "공유가 아직 1 맞아?" → 맞음 → 2로 교체 성공! ✅ 유실 0.' }
    ];
    let i = -1, shared = 0, A = null, B = null, ok = 0, retry = 0, flash = '';
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      ctx.textAlign = 'center'; ctx.font = '700 13px Pretendard';
      ctx.fillStyle = '#8ba0c4'; ctx.fillText('공유 카운터', w / 2, 24);
      ctx.fillStyle = flash === 'ok' ? '#173a2a' : flash === 'fail' ? '#3a1a1a' : '#1c2740';
      rr(ctx, w / 2 - 44, 32, 88, 48, 9); ctx.fill();
      ctx.strokeStyle = flash === 'ok' ? '#69f0ae' : flash === 'fail' ? '#ff8a80' : '#223052'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '800 24px Pretendard'; ctx.fillText(shared, w / 2, 66);
      const cur = i >= 0 ? steps[i] : null;
      [{ x: w * 0.23, who: 'A', col: '#42a5f5', hand: A }, { x: w * 0.77, who: 'B', col: '#ef5350', hand: B }].forEach(L => {
        const act = cur && cur.who === L.who;
        ctx.fillStyle = act ? L.col : '#37475f'; ctx.font = '700 13px Pretendard';
        ctx.fillText('스레드 ' + L.who, L.x, 118);
        ctx.fillStyle = '#0f1830'; rr(ctx, L.x - 52, 128, 104, 44, 8); ctx.fill();
        ctx.strokeStyle = act ? L.col : '#223052'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = L.hand == null ? '#4a5670' : '#ffd54f'; ctx.font = '800 17px Pretendard';
        ctx.fillText(L.hand == null ? '(빈손)' : '손:' + L.hand, L.x, 156);
        if (act) {
          const map = { read: '📖 읽기', calc: '➕ 계산', 'cas-ok': '🔄 CAS 성공', 'cas-fail': '✋ CAS 실패' };
          ctx.fillStyle = cur.st === 'cas-fail' ? '#ff8a80' : cur.st === 'cas-ok' ? '#69f0ae' : L.col;
          ctx.font = '700 12px Pretendard'; ctx.fillText(map[cur.st] || '', L.x, 190);
        }
      });
      ctx.textAlign = 'center'; ctx.fillStyle = '#5a6b8a'; ctx.font = '11px Pretendard';
      ctx.fillText('읽기 → 계산 → CAS(비교교체) → 실패면 다시 읽기 ↺', w / 2, h - 14);
      ctx.textAlign = 'left';
      if (sharedOut) sharedOut.textContent = shared;
      if (okOut) okOut.textContent = ok;
      if (retryOut) retryOut.textContent = retry;
    }
    function apply(s) {
      flash = '';
      if (s.st === 'read') { if (s.who === 'A') A = s.hand; else B = s.hand; }
      else if (s.st === 'calc') { if (s.who === 'A') A = s.hand; else B = s.hand; }
      else if (s.st === 'cas-ok') { shared = s.shared; ok++; flash = 'ok'; }
      else if (s.st === 'cas-fail') { retry++; flash = 'fail'; }
      if (cap) cap.textContent = s.msg;
    }
    function step() { if (i >= steps.length - 1) return; i++; apply(steps[i]); draw(); }
    let autoT = 0;
    function reset() { i = -1; shared = 0; A = null; B = null; ok = 0; retry = 0; flash = ''; if (autoT) { clearInterval(autoT); autoT = 0; } if (cap) cap.textContent = '두 스레드가 같은 카운터를 +1 하려고 해. 자물쇠 없이 어떻게 안 깨질까?'; draw(); }
    $$('[data-cas]', cv.closest('.lfw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-cas');
      if (a === 'step') step();
      else if (a === 'reset') reset();
      else {
        if (autoT) { clearInterval(autoT); autoT = 0; b.classList.remove('active'); }
        else {
          if (i >= steps.length - 1) reset();
          b.classList.add('active');
          autoT = setInterval(() => { if (i >= steps.length - 1) { clearInterval(autoT); autoT = 0; b.classList.remove('active'); } else step(); }, 1100);
        }
      }
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    reset();
  })();

  /* ===== Widget 3: 처리량 락 vs 락프리 ===== */
  (function tput() {
    const cv = $('#tp-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const nS = $('#tp-n'), nv = $('#tp-nv');
    const lockOut = $('#tp-lock'), lfOut = $('#tp-lf'), wasteOut = $('#tp-waste'), cap = $('#tp-cap');
    function model(n) {
      const lock = 100 / (1 + (n - 1) * 0.06);
      const contention = Math.min(0.9, (n - 1) * 0.045);
      const lf = 100 * n * (1 - contention) / (1 + (n - 1) * 0.02);
      const waste = Math.round(contention * 100);
      return { lock: Math.round(lock), lf: Math.round(lf), waste };
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const n = +nS.value, m = model(n);
      const rows = [{ k: '락 (줄서기)', v: m.lock, col: '#ef5350' }, { k: '락프리 (CAS)', v: m.lf, col: '#66bb6a' }];
      const maxV = Math.max(100, model(32).lf);
      const padL = 110, padR = 60, barH = 30, gap = 24, y0 = 26;
      ctx.font = '600 12px Pretendard';
      rows.forEach((r, idx) => {
        const y = y0 + idx * (barH + gap);
        ctx.fillStyle = '#9fb0cc'; ctx.textAlign = 'right'; ctx.fillText(r.k, padL - 10, y + barH / 2 + 4);
        ctx.textAlign = 'left';
        const full = w - padL - padR;
        ctx.fillStyle = '#141d33'; rr(ctx, padL, y, full, barH, 6); ctx.fill();
        ctx.fillStyle = r.col; rr(ctx, padL, y, Math.max(6, full * (r.v / maxV)), barH, 6); ctx.fill();
        ctx.fillStyle = '#e3eaf5'; ctx.font = '700 12px Pretendard';
        ctx.fillText(r.v + ' ops', padL + full * (r.v / maxV) + 8, y + barH / 2 + 4);
        ctx.font = '600 12px Pretendard';
      });
      if (lockOut) lockOut.textContent = m.lock + ' ops';
      if (lfOut) lfOut.textContent = m.lf + ' ops';
      if (wasteOut) wasteOut.textContent = m.waste + '%';
      if (cap) {
        cap.textContent = n <= 2
          ? '스레드가 적을 땐 둘 다 비슷해 — 부딪힐 일이 별로 없거든.'
          : m.waste >= 60
            ? '경합이 너무 세! 락프리 재시도 낭비가 ' + m.waste + '%까지 치솟아 이득이 깎여. 이럴 땐 샤딩/설계로 경합 자체를 줄이는 게 답.'
            : '락은 천장에 눌려 그대로, 락프리는 스레드에 비례해 늘어 — 단 재시도 낭비 ' + m.waste + '%는 따라붙어.';
      }
    }
    nS.addEventListener('input', () => { nv.textContent = nS.value; draw(); });
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    nv.textContent = nS.value; draw();
  })();
})();
