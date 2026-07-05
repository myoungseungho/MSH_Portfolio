/* db-wal-recovery: WAL 순서 · 순차 vs 랜덤 쓰기 · redo/undo 복구
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

  /* ===== Widget 1: WAL 순서 ===== */
  (function order() {
    const cv = $('#wo-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const cap = $('#wo-cap');
    // step: 0 초기, 1 로그append, 2 커밋, 3 데이터RAM변경(더티), 4 체크포인트flush
    const steps = [
      { log: [], ramVal: 100, ramDirty: false, diskVal: 100, committed: false, msg: 'HP 100→70 커밋을 시작해. 아직 로그도 데이터도 그대로야.' },
      { log: ['TX1: P3 100→70'], ramVal: 100, ramDirty: false, diskVal: 100, committed: false, msg: '① 변경 내용을 디스크 로그에 먼저 append 했어(가볍고 순차라 빠름). 데이터는 아직 안 건드림.' },
      { log: ['TX1: P3 100→70', 'TX1: COMMIT ✔'], ramVal: 100, ramDirty: false, diskVal: 100, committed: true, msg: '② COMMIT이 디스크 로그에 닿았어 → 커밋 확정! 유저에게 성공 응답. ★이 순간부터 죽어도 안전(로그로 복구).' },
      { log: ['TX1: P3 100→70', 'TX1: COMMIT ✔'], ramVal: 70, ramDirty: true, diskVal: 100, committed: true, msg: '③ 이제서야 데이터 페이지 P3를 RAM에서 70으로 바꿔(더티). 디스크 데이터는 아직 100 — 상관없어, 로그에 다 있으니.' },
      { log: ['TX1: P3 100→70', 'TX1: COMMIT ✔'], ramVal: 70, ramDirty: false, diskVal: 70, committed: true, msg: '④ 나중에 체크포인트가 더티를 디스크에 flush → 디스크 데이터도 70. 로그와 데이터가 완전히 일치.' }
    ];
    let i = 0;
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const s = steps[i];
      const colW = (w - 36) / 2;
      // Left: 디스크 로그 (순차 append)
      ctx.textAlign = 'left'; ctx.font = '700 12px Pretendard'; ctx.fillStyle = '#8ba0c4';
      ctx.fillText('💾 디스크 로그 (순차 append)', 12, 18);
      ctx.fillStyle = '#0c1424'; rr(ctx, 12, 26, colW, h - 40, 8); ctx.fill();
      ctx.strokeStyle = '#223052'; ctx.lineWidth = 1; ctx.stroke();
      s.log.forEach((rec, k) => {
        const commit = rec.includes('COMMIT');
        ctx.fillStyle = commit ? '#173a2a' : '#16233c'; rr(ctx, 20, 36 + k * 40, colW - 16, 32, 6); ctx.fill();
        ctx.strokeStyle = commit ? '#69f0ae' : '#2f4468'; ctx.stroke();
        ctx.fillStyle = commit ? '#69f0ae' : '#cfe0ff'; ctx.font = '700 12px Pretendard';
        ctx.fillText(rec, 28, 56 + k * 40);
      });
      // Right: 데이터 페이지 (RAM) + 디스크 데이터
      const rx = 24 + colW;
      ctx.fillStyle = '#8ba0c4'; ctx.font = '700 12px Pretendard';
      ctx.fillText('데이터 페이지 P3', rx, 18);
      // RAM
      ctx.fillStyle = s.ramDirty ? '#4a3a10' : '#123024'; rr(ctx, rx, 30, colW, 60, 8); ctx.fill();
      ctx.strokeStyle = s.ramDirty ? '#ffca28' : '#66bb6a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '800 22px Pretendard'; ctx.textAlign = 'center';
      ctx.fillText('RAM: ' + s.ramVal, rx + colW / 2, 62);
      ctx.font = '700 10px Pretendard'; ctx.fillStyle = s.ramDirty ? '#ffd54f' : '#69f0ae';
      ctx.fillText(s.ramDirty ? '더티(디스크 반영 전)' : '깨끗', rx + colW / 2, 80);
      // Disk data
      ctx.fillStyle = '#0c1424'; rr(ctx, rx, 104, colW, 56, 8); ctx.fill();
      ctx.strokeStyle = '#223052'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#9fb0cc'; ctx.font = '800 18px Pretendard'; ctx.textAlign = 'center';
      ctx.fillText('💽 디스크: ' + s.diskVal, rx + colW / 2, 138);
      // safety marker
      ctx.textAlign = 'center';
      if (s.committed) { ctx.fillStyle = '#69f0ae'; ctx.font = '800 13px Pretendard'; ctx.fillText('✔ 커밋 확정 — 지금 죽어도 복구 가능', rx + colW / 2, h - 14); }
      else { ctx.fillStyle = '#8ba0c4'; ctx.font = '700 12px Pretendard'; ctx.fillText('커밋 전 — 아직 없던 일', rx + colW / 2, h - 14); }
      ctx.textAlign = 'left';
    }
    function setCap(extra) { if (cap) cap.textContent = extra || steps[i].msg; }
    $$('[data-wo]', cv.closest('.waw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-wo');
      if (a === 'step') { if (i < steps.length - 1) i++; draw(); setCap(); }
      else if (a === 'reset') { i = 0; draw(); setCap(); }
      else { // crash
        const s = steps[i];
        setCap(s.committed
          ? '💥 지금 죽어도 안전! 로그에 COMMIT이 있으니, 살아나서 로그를 보고 P3=70을 다시 만들어(redo). 유실 없음.'
          : '💥 지금은 커밋 전이라 로그에 COMMIT이 없어 → 살아나면 이 변경은 그냥 없던 일. (유저에게 성공이라 한 적도 없음)');
      }
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw(); setCap();
  })();

  /* ===== Widget 2: 순차 vs 랜덤 ===== */
  (function seq() {
    const cv = $('#sq-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const dev = $('#sq-dev');
    const seqOut = $('#sq-seq'), randOut = $('#sq-rand'), ratioOut = $('#sq-ratio'), cap = $('#sq-cap');
    const N = 100;
    const MS = { hdd: { seq: 0.1, rand: 8 }, ssd: { seq: 0.02, rand: 0.1 } };
    let shown = false;
    function human(ms) { return ms >= 1000 ? (ms / 1000).toFixed(1) + ' 초' : ms.toFixed(0) + ' ms'; }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const d = MS[dev.value];
      const seqT = d.seq * N, randT = d.rand * N;
      const rows = [{ k: '로그 (순차)', v: seqT, col: '#66bb6a' }, { k: '데이터 (랜덤)', v: randT, col: '#ef5350' }];
      const maxV = Math.max(randT, seqT);
      const padL = 110, padR = 70, barH = 30, gap = 26, y0 = 30;
      ctx.font = '600 12px Pretendard';
      rows.forEach((r, idx) => {
        const y = y0 + idx * (barH + gap);
        ctx.fillStyle = '#9fb0cc'; ctx.textAlign = 'right'; ctx.fillText(r.k, padL - 10, y + barH / 2 + 4);
        ctx.textAlign = 'left'; const full = w - padL - padR;
        ctx.fillStyle = '#141d33'; rr(ctx, padL, y, full, barH, 6); ctx.fill();
        ctx.fillStyle = r.col; rr(ctx, padL, y, Math.max(6, full * (shown ? r.v / maxV : 0)), barH, 6); ctx.fill();
        if (shown) { ctx.fillStyle = '#e3eaf5'; ctx.font = '700 12px Pretendard'; ctx.fillText(human(r.v), padL + full * (r.v / maxV) + 8, y + barH / 2 + 4); ctx.font = '600 12px Pretendard'; }
      });
      if (shown) {
        if (seqOut) seqOut.textContent = human(seqT);
        if (randOut) randOut.textContent = human(randT);
        if (ratioOut) ratioOut.textContent = Math.round(randT / seqT) + '× 느림';
      }
    }
    $$('[data-sq]', cv.closest('.waw')).forEach(b => b.addEventListener('click', () => {
      shown = true; draw();
      const d = MS[dev.value]; const r = Math.round(d.rand / d.seq);
      if (cap) cap.textContent = `${dev.value.toUpperCase()}에서 100번 쓰기: 순차(로그)가 랜덤(데이터)보다 약 ${r}배 빨라. 그래서 작고 순차적인 로그를 먼저 확정하고, 무거운 랜덤 데이터 쓰기는 나중에 몰아서 하는 거야.`;
    }));
    dev.addEventListener('change', () => { draw(); });
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();

  /* ===== Widget 3: redo / undo 복구 ===== */
  (function recover() {
    const cv = $('#rc-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const redoOut = $('#rc-redo'), undoOut = $('#rc-undo'), stateOut = $('#rc-state'), cap = $('#rc-cap');
    // 로그(디스크, durable)
    const log = [
      { t: 'TX1: P3 100→70', kind: 'w' },
      { t: 'TX1: COMMIT ✔', kind: 'c' },
      { t: 'TX2: P5 50→30', kind: 'w' },
      { t: '(TX2 COMMIT 없음 — 크래시)', kind: 'x' }
    ];
    // 데이터 페이지 상태 (크래시 시점): P3 커밋됐지만 미반영(=100), P5 미커밋인데 반영됨(=30)
    let P3, P5, redo, undo, phase; // phase: 'run' | 'crash' | 'redone' | 'undone'
    function reset() { P3 = 100; P5 = 30; redo = 0; undo = 0; phase = 'run'; upd(); draw(); if (cap) cap.textContent = 'TX1은 커밋됐지만 데이터가 디스크에 반영 전(P3=100), TX2는 커밋도 안 했는데 데이터가 반영됨(P5=30). 💥 크래시를 눌러봐.'; }
    function upd() {
      if (redoOut) redoOut.textContent = redo;
      if (undoOut) undoOut.textContent = undo;
      if (stateOut) { stateOut.textContent = phase === 'undone' ? '일관됨 ✔' : phase === 'crash' ? '불일치!' : '정상'; stateOut.className = 'v' + (phase === 'undone' ? ' good' : phase === 'crash' ? ' warn' : ''); }
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      // 로그 (top)
      ctx.textAlign = 'left'; ctx.font = '700 12px Pretendard'; ctx.fillStyle = '#8ba0c4';
      ctx.fillText('💾 디스크 로그 (죽어도 살아있음)', 12, 16);
      const lw = (w - 24) / 4;
      log.forEach((r, k) => {
        const x = 12 + k * lw;
        ctx.fillStyle = r.kind === 'c' ? '#173a2a' : r.kind === 'x' ? '#2a1a1a' : '#16233c';
        rr(ctx, x + 2, 24, lw - 4, 44, 6); ctx.fill();
        ctx.strokeStyle = r.kind === 'c' ? '#69f0ae' : r.kind === 'x' ? '#6b2b2b' : '#2f4468'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = r.kind === 'c' ? '#69f0ae' : r.kind === 'x' ? '#ef9a9a' : '#cfe0ff';
        ctx.font = '700 11px Pretendard'; ctx.textAlign = 'center';
        wrap(r.t, x + lw / 2, 42, lw - 12);
      });
      // 데이터 페이지 (bottom)
      ctx.textAlign = 'left'; ctx.fillStyle = '#8ba0c4'; ctx.font = '700 12px Pretendard';
      ctx.fillText('💽 디스크 데이터 페이지', 12, 100);
      drawPage(w * 0.27, 110, 'P3', P3, 70, 'TX1 커밋됨 → 70이어야', phase);
      drawPage(w * 0.73, 110, 'P5', P5, 50, 'TX2 미커밋 → 50이어야', phase);
      // banner
      ctx.textAlign = 'center'; ctx.font = '800 13px Pretendard';
      if (phase === 'crash') { ctx.fillStyle = '#ff8a80'; ctx.fillText('💥 크래시! 데이터가 로그와 안 맞아 — 복구 필요', w / 2, h - 12); }
      else if (phase === 'undone') { ctx.fillStyle = '#69f0ae'; ctx.fillText('✔ 복구 완료: 커밋된 TX1은 살고(redo), 미커밋 TX2는 사라짐(undo)', w / 2, h - 12); }
      else if (phase === 'redone') { ctx.fillStyle = '#ffd54f'; ctx.fillText('REDO 완료 → 이제 UNDO 차례', w / 2, h - 12); }
      ctx.textAlign = 'left';
    }
    function drawPage(cx, y, name, val, want, note, ph) {
      const w2 = 150, x = cx - w2 / 2;
      const ok = (ph === 'undone') && val === want;
      ctx.fillStyle = ph === 'crash' && val !== want ? '#3a1a1a' : (ok ? '#123024' : '#16233c');
      rr(ctx, x, y, w2, 54, 8); ctx.fill();
      ctx.strokeStyle = ph === 'crash' && val !== want ? '#ef5350' : (ok ? '#66bb6a' : '#2f4468'); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '800 18px Pretendard'; ctx.textAlign = 'center';
      ctx.fillText(name + ' = ' + val, cx, y + 26);
      ctx.font = '600 10px Pretendard'; ctx.fillStyle = '#8ba0c4';
      ctx.fillText(note, cx, y + 44);
      ctx.textAlign = 'left';
    }
    function wrap(text, cx, cy, maxw) {
      const words = text.split(' '); let line = '', yy = cy;
      words.forEach(wd => { const test = line + wd + ' '; if (ctx.measureText(test).width > maxw && line) { ctx.fillText(line.trim(), cx, yy); line = wd + ' '; yy += 13; } else line = test; });
      ctx.fillText(line.trim(), cx, yy);
    }
    let raf = 0;
    $$('[data-rc]', cv.closest('.waw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-rc');
      if (a === 'reset') { reset(); return; }
      if (a === 'crash') { phase = 'crash'; upd(); draw(); if (cap) cap.textContent = '💥 크래시! P3는 70이어야 하는데 100(커밋된 변경 미반영), P5는 50이어야 하는데 30(미커밋 변경 반영됨). 🔄 복구를 눌러봐.'; return; }
      if (a === 'recover') {
        if (phase !== 'crash') { if (cap) cap.textContent = '먼저 💥 크래시를 눌러야 복구할 게 생겨.'; return; }
        // REDO first
        phase = 'redone'; P3 = 70; redo = 1; upd(); draw();
        if (cap) cap.textContent = 'REDO: 로그에 TX1 COMMIT이 있는데 P3가 미반영(100) → 로그대로 다시 적용 → P3=70. (커밋 약속을 지킴)';
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => setTimeout(() => {
          phase = 'undone'; P5 = 50; undo = 1; upd(); draw();
          if (cap) cap.textContent = 'UNDO: P5는 반영됐는데 로그에 TX2 COMMIT이 없음 → 되돌림 → P5=50. 결과: 커밋된 것만 살고(P3=70) 미커밋은 사라짐(P5=50). 정확히 그 시점으로 복구 완료!';
        }, 1100));
      }
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    reset();
  })();
})();
