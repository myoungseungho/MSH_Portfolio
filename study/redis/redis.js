/* redis (renewed): 로컬변수 vs Redis 공유 · MSSQL vs Redis 속도 · 랭킹 Sorted Set
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

  /* ===== Widget 1: 로컬 변수 vs Redis 공유 ===== */
  (function shared() {
    const cv = $('#sh-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const cap = $('#sh-cap');
    let mode = 'local';
    let local = [0, 0, 0]; // 서버별 로컬 카운터
    let redis = 0;         // 공유 카운터
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const sw = (w - 48) / 3, sy = 30;
      // 3 game servers
      for (let i = 0; i < 3; i++) {
        const x = 12 + i * (sw + 12);
        ctx.fillStyle = '#16233c'; rr(ctx, x, sy, sw, 70, 8); ctx.fill();
        ctx.strokeStyle = '#2f4468'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#cfe0ff'; ctx.font = '700 12px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('🖥️ 게임서버 ' + (i + 1), x + sw / 2, sy + 20);
        if (mode === 'local') {
          ctx.fillStyle = '#ffd54f'; ctx.font = '800 22px Pretendard';
          ctx.fillText('킬 ' + local[i], x + sw / 2, sy + 50);
          ctx.fillStyle = '#8ba0c4'; ctx.font = '9px Pretendard'; ctx.fillText('(자기 메모리)', x + sw / 2, sy + 64);
        } else {
          ctx.fillStyle = '#66bb6a'; ctx.font = '800 18px Pretendard';
          ctx.fillText('킬 ' + redis, x + sw / 2, sy + 48);
          ctx.fillStyle = '#8ba0c4'; ctx.font = '9px Pretendard'; ctx.fillText('(Redis 조회)', x + sw / 2, sy + 64);
          // arrow down to redis
          ctx.strokeStyle = '#42a5f5'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.moveTo(x + sw / 2, sy + 70); ctx.lineTo(w / 2, sy + 130); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      // bottom: total or redis
      const by = sy + 130;
      if (mode === 'local') {
        ctx.fillStyle = '#2a1a1a'; rr(ctx, 12, by, w - 24, 56, 8); ctx.fill();
        ctx.strokeStyle = '#6b2b2b'; ctx.stroke();
        ctx.fillStyle = '#ff8a80'; ctx.font = '800 15px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('❓ 전체 랭킹 = ? — 서버마다 값이 따로라 아무도 전체를 몰라', w / 2, by + 26);
        ctx.fillStyle = '#c98', ctx.font = '11px Pretendard';
        ctx.fillStyle = '#e0a0a0'; ctx.fillText(`서버1=${local[0]}, 서버2=${local[1]}, 서버3=${local[2]}  (합치는 주체가 없음)`, w / 2, by + 46);
      } else {
        ctx.fillStyle = '#123024'; rr(ctx, w / 2 - 110, by, 220, 56, 10); ctx.fill();
        ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#69f0ae'; ctx.font = '700 12px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('📦 Redis (별도 서버·공용)', w / 2, by + 22);
        ctx.fillStyle = '#fff'; ctx.font = '800 22px Pretendard'; ctx.fillText('전체 킬 ' + redis, w / 2, by + 46);
      }
      ctx.textAlign = 'left';
    }
    function kill(i) {
      if (mode === 'local') local[i]++; else redis++;
      draw();
      if (cap) cap.textContent = mode === 'local'
        ? `로컬 변수: 서버${i + 1}만 +1 됐어(${local.join('/')}). 각 서버가 자기 메모리에만 기록 → 전체 랭킹을 계산할 주체가 없어.`
        : `Redis: 어느 서버에서 눌러도 공용 창고 하나가 +1(전체 ${redis}). 3대가 모두 같은 값을 봐 — 이게 '공유'야.`;
    }
    $$('[data-sh]', cv.closest('.rdw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-sh');
      if (a === 'reset') { local = [0, 0, 0]; redis = 0; draw(); if (cap) cap.textContent = '리셋했어. 모드를 바꿔가며 서버에서 킬 +1을 눌러봐.'; return; }
      mode = a;
      $$('[data-sh]', cv.closest('.rdw')).forEach(x => { const v = x.getAttribute('data-sh'); if (v === 'local' || v === 'redis') x.classList.toggle('active', x === b); });
      draw();
      if (cap) cap.textContent = mode === 'local' ? '로컬 변수 모드: 각 서버가 자기 메모리에 따로 기록해. 갈라지는 걸 봐.' : 'Redis 모드: 모든 서버가 별도 서버(Redis) 하나를 같이 봐. 값이 항상 같아.';
    }));
    $$('[data-kill]', cv.closest('.rdw')).forEach(b => b.addEventListener('click', () => kill(+b.getAttribute('data-kill'))));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();

  /* ===== Widget 2: MSSQL vs Redis 속도 ===== */
  (function speed() {
    const cv = $('#spd-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const sc = $('#spd-sc');
    const sqlOut = $('#spd-sql'), redisOut = $('#spd-redis'), ratioOut = $('#spd-ratio'), cap = $('#spd-cap');
    let shown = false;
    function times() {
      const shards = +sc.value;
      // MSSQL: 기본 조회 + 샤딩 병합 비용. Redis: RAM 상수.
      const sql = 8 + shards * 3.5;   // ms (예시)
      const redis = 0.3;              // ms
      return { sql: Math.round(sql * 10) / 10, redis };
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const t = times();
      const rows = [{ k: 'MSSQL (디스크)', v: t.sql, col: '#ef5350' }, { k: 'Redis (RAM)', v: t.redis, col: '#66bb6a' }];
      const maxV = t.sql;
      const padL = 120, padR = 80, barH = 30, gap = 26, y0 = 30;
      ctx.font = '600 12px Pretendard';
      rows.forEach((r, idx) => {
        const y = y0 + idx * (barH + gap);
        ctx.fillStyle = '#9fb0cc'; ctx.textAlign = 'right'; ctx.fillText(r.k, padL - 10, y + barH / 2 + 4);
        ctx.textAlign = 'left'; const full = w - padL - padR;
        ctx.fillStyle = '#141d33'; rr(ctx, padL, y, full, barH, 6); ctx.fill();
        ctx.fillStyle = r.col; rr(ctx, padL, y, Math.max(6, full * (shown ? r.v / maxV : 0)), barH, 6); ctx.fill();
        if (shown) { ctx.fillStyle = '#e3eaf5'; ctx.font = '700 12px Pretendard'; ctx.fillText(r.v + ' ms', padL + Math.max(6, full * (r.v / maxV)) + 8, y + barH / 2 + 4); ctx.font = '600 12px Pretendard'; }
      });
      if (shown) {
        const t2 = times();
        if (sqlOut) sqlOut.textContent = t2.sql + ' ms';
        if (redisOut) redisOut.textContent = t2.redis + ' ms';
        if (ratioOut) ratioOut.textContent = Math.round(t2.sql / t2.redis) + '× 빠름';
      }
    }
    $$('[data-spd]', cv.closest('.rdw')).forEach(b => b.addEventListener('click', () => {
      shown = true; draw();
      const t = times(), sh = +sc.value;
      if (cap) cap.textContent = sh === 1
        ? `단일 테이블도 Redis가 약 ${Math.round(t.sql / t.redis)}배 빨라(디스크 원본·락·정렬 오버헤드). 데이터가 뜨거울수록 이 차이가 쌓여.`
        : `21개 샤딩이면 MSSQL은 21곳을 다 조회해 병합·정렬 → ${t.sql}ms. Redis는 Sorted Set 하나라 ${t.redis}ms. 약 ${Math.round(t.sql / t.redis)}배 차이!`;
    }));
    sc.addEventListener('change', () => { draw(); });
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();

  /* ===== Widget 3: 랭킹 Sorted Set ===== */
  (function rank() {
    const cv = $('#rk-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const cap = $('#rk-cap');
    let mode = null, anim = 0, raf = 0;
    const SHARDS = 4; // 화면상 4개로 축약(실제 21)
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      if (mode === 'sql') {
        ctx.textAlign = 'left'; ctx.font = '700 12px Pretendard'; ctx.fillStyle = '#ff8a80';
        ctx.fillText('MSSQL: 관문 DB 4개(실제 21개)를 각각 조회 → 앱에서 합쳐 재정렬', 12, 18);
        const bw = (w - 24 - 18 * (SHARDS - 1)) / SHARDS;
        for (let i = 0; i < SHARDS; i++) {
          const x = 12 + i * (bw + 18);
          const lit = anim > i;
          ctx.fillStyle = lit ? '#3a2f14' : '#16233c'; rr(ctx, x, 30, bw, 70, 8); ctx.fill();
          ctx.strokeStyle = lit ? '#ffca28' : '#2f4468'; ctx.lineWidth = lit ? 2 : 1; ctx.stroke();
          ctx.fillStyle = '#cfe0ff'; ctx.font = '700 11px Pretendard'; ctx.textAlign = 'center';
          ctx.fillText('관문DB ' + (i + 1), x + bw / 2, 50);
          ctx.fillStyle = '#8ba0c4'; ctx.font = '9px Pretendard'; ctx.fillText(lit ? '조회✔' : '대기', x + bw / 2, 66);
        }
        // merge box
        const my = 120;
        const merged = anim >= SHARDS;
        ctx.fillStyle = merged ? '#3a2f14' : '#101827'; rr(ctx, 12, my, w - 24, 60, 8); ctx.fill();
        ctx.strokeStyle = merged ? '#ffca28' : '#223052'; ctx.stroke();
        ctx.fillStyle = merged ? '#ffd54f' : '#4a5670'; ctx.font = '700 13px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText(merged ? '🔀 4곳 결과 합쳐 다시 정렬 완료 (관문 늘면 더 무거움)' : '앱에서 병합·재정렬 대기…', w / 2, my + 35);
      } else if (mode === 'redis') {
        ctx.textAlign = 'left'; ctx.font = '700 12px Pretendard'; ctx.fillStyle = '#69f0ae';
        ctx.fillText('Redis: Sorted Set 하나 — 항상 정렬된 상태로 유지', 12, 18);
        ctx.fillStyle = '#123024'; rr(ctx, 12, 30, w - 24, 150, 10); ctx.fill();
        ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 2; ctx.stroke();
        const ranks = [['1위', 980], ['2위', 940], ['3위', 910], ['4위', 870]];
        ranks.forEach((r, i) => {
          if (anim <= i) return;
          const y = 48 + i * 30;
          ctx.fillStyle = '#0e2a1e'; rr(ctx, 28, y, w - 56, 24, 5); ctx.fill();
          ctx.fillStyle = '#69f0ae'; ctx.font = '700 12px Pretendard'; ctx.textAlign = 'left';
          ctx.fillText(r[0] + '   점수 ' + r[1], 40, y + 16);
        });
        ctx.fillStyle = '#8ba0c4'; ctx.font = '11px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('ZREVRANGE 0 3 → 상위 4명 즉시 (병합·재정렬 없음)', w / 2, 172);
      } else {
        ctx.fillStyle = '#4a5670'; ctx.font = '13px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('MSSQL 방식 / Redis 방식 버튼을 눌러 전체 랭킹 조회를 비교해봐', w / 2, h / 2);
      }
      ctx.textAlign = 'left';
    }
    function run(m) {
      mode = m; anim = 0; cancelAnimationFrame(raf);
      const steps = m === 'sql' ? SHARDS + 1 : 4;
      (function a() { anim++; draw(); if (anim < steps) raf = requestAnimationFrame(() => setTimeout(a, 320)); else finish(); })();
      draw();
    }
    function finish() {
      if (cap) cap.textContent = mode === 'sql'
        ? 'MSSQL: 관문 4개(실제 21개)를 각각 조회하고 앱에서 합쳐 재정렬 — 관문 수에 비례해 무거워져. 실시간으로 반복하면 부하 폭발.'
        : 'Redis: Sorted Set이 내부적으로 이미 정렬을 유지 → ZREVRANGE 한 방에 상위 N명 즉시. 21곳 병합이 통째로 사라졌어.';
    }
    $$('[data-rk]', cv.closest('.rdw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-rk');
      if (a === 'reset') { mode = null; anim = 0; draw(); if (cap) cap.textContent = 'MSSQL 방식과 Redis 방식을 각각 눌러 비교해봐.'; return; }
      run(a);
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();

  /* ===== Widget 4: SQL(선언적) vs Redis(명령적) 파이프라인 ===== */
  (function proto() {
    const cv = $('#pr-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const sqlOut = $('#pr-sql'), redisOut = $('#pr-redis'), cap = $('#pr-cap');
    const SQL = ['SQL 문장 수신', '파싱', '옵티마이저', '실행계획 수립', '인덱스 탐색', '행 수정'];
    const RED = ['RESP 명령 수신', 'skiplist 직접 갱신'];
    let si = -1, ri = -1, raf = 0;
    function col(x, w, title, steps, active, col1) {
      ctx.textAlign = 'center'; ctx.font = '700 12px Pretendard'; ctx.fillStyle = col1;
      ctx.fillText(title, x + w / 2, 16);
      const bh = 30, gap = 6, y0 = 28;
      steps.forEach((s, i) => {
        const y = y0 + i * (bh + gap);
        const on = active >= i && active >= 0;
        ctx.fillStyle = on ? (col1 === '#ef5350' ? '#3a1a1a' : '#123024') : '#16233c';
        rr(ctx, x, y, w, bh, 6); ctx.fill();
        ctx.strokeStyle = on ? col1 : '#2f4468'; ctx.lineWidth = on ? 2 : 1; ctx.stroke();
        ctx.fillStyle = on ? '#fff' : '#9fb0cc'; ctx.font = '600 11px Pretendard';
        ctx.fillText(s, x + w / 2, y + bh / 2 + 4);
      });
      ctx.textAlign = 'left';
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const cw = (w - 40) / 2;
      col(14, cw, 'SQL (선언적)', SQL, si, '#ef5350');
      col(26 + cw, cw, 'Redis (명령적)', RED, ri, '#66bb6a');
      if (sqlOut) sqlOut.textContent = SQL.length + '단계';
      if (redisOut) redisOut.textContent = RED.length + '단계';
    }
    function go() {
      cancelAnimationFrame(raf); si = -1; ri = -1;
      let t = 0;
      (function a() {
        t++;
        si = Math.min(SQL.length - 1, Math.floor(t / 3));
        ri = Math.min(RED.length - 1, Math.floor(t / 3));
        draw();
        if (si < SQL.length - 1) raf = requestAnimationFrame(a);
        else if (cap) cap.textContent = 'SQL은 원하는 결과만 말하면 DB가 파싱→옵티마이저→실행계획→인덱스 탐색으로 방법을 찾아(6단계). Redis는 방법을 직접 지정해 자료구조를 바로 조작(2단계) — 그래서도 빠르고, 보내는 것도 짧은 명령어야.';
      })();
    }
    $$('[data-pr]', cv.closest('.rdw')).forEach(b => b.addEventListener('click', go));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();

  /* ===== Widget 5: 단일 스레드 명령 처리 = 원자성 ===== */
  (function thread() {
    const cv = $('#th-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const sentOut = $('#th-sent'), doneOut = $('#th-done'), cap = $('#th-cap');
    let queue = [];      // 대기 명령 {from}
    let sent = 0, done = 0, processing = null, procT = 0, raf = 0, tick = 0;
    const COL = ['#42a5f5', '#ffca28', '#ef5350'];
    function enqueue(from) { queue.push({ from }); sent++; if (sentOut) sentOut.textContent = sent; pump(); draw(); }
    function pump() {
      if (processing || queue.length === 0) return;
      processing = queue.shift(); procT = 0;
      cancelAnimationFrame(raf);
      (function a() {
        procT++;
        if (procT > 26) { done++; if (doneOut) doneOut.textContent = done; processing = null; draw(); pump(); return; }
        draw(); raf = requestAnimationFrame(a);
      })();
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      // 좌: 클라이언트 3
      ctx.textAlign = 'center'; ctx.font = '700 11px Pretendard';
      for (let i = 0; i < 3; i++) {
        const y = 24 + i * 62;
        ctx.fillStyle = '#16233c'; rr(ctx, 12, y, 90, 48, 8); ctx.fill();
        ctx.strokeStyle = COL[i]; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = COL[i]; ctx.fillText('🖥️ 서버' + (i + 1), 57, y + 20);
        ctx.fillStyle = '#8ba0c4'; ctx.font = '9px Pretendard'; ctx.fillText('INCR', 57, y + 36); ctx.font = '700 11px Pretendard';
      }
      // 중앙: 큐
      const qx = 128, qw = w - 128 - 150;
      ctx.fillStyle = '#8ba0c4'; ctx.font = '700 11px Pretendard'; ctx.textAlign = 'left';
      ctx.fillText('명령 큐 (한 줄로 대기)', qx, 16);
      ctx.fillStyle = '#0c1424'; rr(ctx, qx, 22, qw, h - 34, 8); ctx.fill();
      ctx.strokeStyle = '#223052'; ctx.lineWidth = 1; ctx.stroke();
      queue.slice(0, 6).forEach((c, i) => {
        const y = 30 + i * 30;
        ctx.fillStyle = '#16233c'; rr(ctx, qx + 8, y, qw - 16, 24, 5); ctx.fill();
        ctx.strokeStyle = COL[c.from]; ctx.stroke();
        ctx.fillStyle = COL[c.from]; ctx.font = '700 11px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('INCR kills  (서버' + (c.from + 1) + ')', qx + qw / 2, y + 16);
      });
      ctx.textAlign = 'left';
      // 우: 이벤트 루프 + 카운터
      const ex = w - 138;
      ctx.fillStyle = processing ? '#123024' : '#101827'; rr(ctx, ex, 22, 126, 66, 8); ctx.fill();
      ctx.strokeStyle = processing ? '#69f0ae' : '#223052'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#cfe0ff'; ctx.font = '700 11px Pretendard'; ctx.textAlign = 'center';
      ctx.fillText('🧵 단일 스레드', ex + 63, 42);
      ctx.fillStyle = processing ? '#69f0ae' : '#4a5670'; ctx.font = '700 11px Pretendard';
      ctx.fillText(processing ? '처리중… (서버' + (processing.from + 1) + ')' : '대기', ex + 63, 66);
      // counter
      ctx.fillStyle = '#0c1424'; rr(ctx, ex, 100, 126, 60, 8); ctx.fill();
      ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#8ba0c4'; ctx.font = '10px Pretendard'; ctx.fillText('kills (원자적)', ex + 63, 118);
      ctx.fillStyle = '#fff'; ctx.font = '800 24px Pretendard'; ctx.fillText(String(done), ex + 63, 146);
      ctx.textAlign = 'left';
    }
    function reset() { queue = []; sent = 0; done = 0; processing = null; if (sentOut) sentOut.textContent = 0; if (doneOut) doneOut.textContent = 0; draw(); if (cap) cap.textContent = '3대에서 동시에 INCR을 쏴봐. 명령들이 큐에 한 줄로 서고, 단일 스레드가 하나씩 처리해 — 카운터는 항상 정확해.'; }
    $$('[data-th]', cv.closest('.rdw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-th');
      if (a === 'reset') { reset(); return; }
      if (a === 'all') {
        enqueue(0); enqueue(1); enqueue(2);
        if (cap) cap.textContent = '3대가 동시에 쐈어! 그래도 명령이 큐에 한 줄로 서서 하나씩 처리돼 — 레이스 없이 정확히 +3. 게임 서버 싱글스레드와 똑같은 원리(락 불필요).';
      } else enqueue(+a);
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    reset();
  })();

})();
