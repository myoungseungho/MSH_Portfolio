/* network-io-evolution interactive widgets (vanilla JS + Canvas)
   각 위젯은 요소 존재 여부로 가드. 수치는 "구조를 보여주는 예시값". */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = (n) => n.toLocaleString('en-US');
  function fitCanvas(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth || cv.parentElement.clientWidth || 600;
    const h = cv.height; // logical height attribute
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv._cw = w; cv._ch = h;
    return ctx;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ===== Widget 1: 동기 vs 비동기 타임라인 ===== */
  (function syncAsync() {
    const cv = $('#sa-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const DB = 60, LOGIC = 12; // ticks: DB 대기 vs 로직
    // 동기: 유저마다 [logic + DB] 직렬. 비동기: logic만 직렬, DB는 백그라운드
    const syncEnd = [];   // 각 유저 완료 시점
    const asyncStart = []; // 각 유저 로직 시작 시점
    for (let i = 0; i < 3; i++) {
      syncEnd[i] = (i + 1) * (LOGIC + DB);
      asyncStart[i] = i * LOGIC;
    }
    const TOTAL = 3 * (LOGIC + DB) + 20;
    let t = 0, playing = false, raf = 0;
    const syncOut = $('#sa-sync'), asyncOut = $('#sa-async');

    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const padL = 12, padR = 12, usable = w - padL - padR;
      const px = (tick) => padL + usable * (tick / TOTAL);
      const laneH = 52, gap = 30;
      const lanes = [
        { y: 26, title: '동기 — 기다림', col: '#ff8a80' },
        { y: 26 + laneH + gap, title: '비동기 — 안 기다림', col: '#69f0ae' }
      ];
      ctx.font = '600 12px Pretendard, sans-serif';
      lanes.forEach(L => { ctx.fillStyle = L.col; ctx.fillText(L.title, padL, L.y - 8); });

      // playhead
      const hx = px(t);
      // ---- 동기 lane ----
      let ly = lanes[0].y;
      for (let i = 0; i < 3; i++) {
        const s0 = i * (LOGIC + DB);
        // logic block
        ctx.fillStyle = t > s0 ? '#42a5f5' : '#1c2740';
        roundRect(ctx, px(s0), ly, Math.max(2, px(s0 + LOGIC) - px(s0)), laneH, 5); ctx.fill();
        // DB wait block
        ctx.fillStyle = t > s0 + LOGIC ? '#4a5670' : '#141d33';
        roundRect(ctx, px(s0 + LOGIC), ly, Math.max(2, px(s0 + LOGIC + DB) - px(s0 + LOGIC)), laneH, 5); ctx.fill();
        ctx.fillStyle = '#cfe0ff'; ctx.font = '700 11px Pretendard'; ctx.fillText('U' + (i + 1), px(s0) + 4, ly + 15);
        ctx.fillStyle = '#8ba0c4'; ctx.font = '10px Pretendard'; ctx.fillText('DB대기', px(s0 + LOGIC) + 4, ly + laneH - 8);
      }
      // ---- 비동기 lane ----
      ly = lanes[1].y;
      for (let i = 0; i < 3; i++) {
        const s0 = i * LOGIC;
        ctx.fillStyle = t > s0 ? '#42a5f5' : '#1c2740';
        roundRect(ctx, px(s0), ly, Math.max(2, px(s0 + LOGIC) - px(s0)), laneH, 5); ctx.fill();
        ctx.fillStyle = '#cfe0ff'; ctx.font = '700 11px Pretendard'; ctx.fillText('U' + (i + 1), px(s0) + 3, ly + 15);
        // DB in background (thin, dashed further right)
        ctx.strokeStyle = 'rgba(105,240,174,.5)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px(s0 + LOGIC), ly + laneH - 6); ctx.lineTo(px(s0 + LOGIC + DB), ly + laneH - 6); ctx.stroke();
        ctx.setLineDash([]);
      }
      // playhead line
      ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx, 18); ctx.lineTo(hx, h - 6); ctx.stroke();

      // stats
      if (syncOut) syncOut.textContent = syncEnd[2] > 0 ? (asyncStart[2]) + ' → ' + '완료 ' + syncEnd[2] : '-';
      if (syncOut) syncOut.textContent = syncEnd[2] + ' tick';
      if (asyncOut) asyncOut.textContent = asyncStart[2] + ' tick';
    }
    function loop() {
      if (!playing) return;
      t += 1.4; if (t >= TOTAL) { t = TOTAL; playing = false; }
      draw(); if (playing) raf = requestAnimationFrame(loop);
    }
    $$('[data-sa]', cv.closest('.niow')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-sa');
      if (a === 'play') { if (t >= TOTAL) t = 0; playing = true; cancelAnimationFrame(raf); loop(); }
      else { playing = false; cancelAnimationFrame(raf); t = 0; draw(); }
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();

  /* ===== Widget 2: select → IOCP → RIO ===== */
  (function evolution() {
    const cv = $('#ev-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    let model = 'select';
    const conn = $('#ev-conn'), pps = $('#ev-pps');
    const connv = $('#ev-connv'), ppsv = $('#ev-ppsv');
    const sysOut = $('#ev-sys'), scanOut = $('#ev-scan'), pinOut = $('#ev-pin'), cap = $('#ev-cap');
    const POLL = 1000; // select가 초당 소켓목록을 훑는 횟수(예시)
    const CAPS = {
      select: 'select: 초당 ' + POLL + '번 전체 소켓을 훑어 — 연결이 늘수록 헛스캔이 폭증하고, 패킷마다 recv 문턱을 넘어.',
      iocp: 'IOCP: 헛스캔이 0이 됐어(완료 통보). 하지만 패킷마다 커널 문턱과 버퍼 핀고정은 여전히 남아있어.',
      rio: 'RIO: 버퍼를 미리 등록해서 핀고정 잔손질이 사라지고, 완료 큐를 유저모드에서 모아 꺼내 문턱도 거의 0이야.'
    };
    function metrics() {
      const c = +conn.value, p = +pps.value;
      let sys, scan, pin;
      if (model === 'select') { sys = p; scan = POLL * c; pin = p; }
      else if (model === 'iocp') { sys = p; scan = 0; pin = p; }
      else { sys = Math.round(p * 0.01); scan = 0; pin = 0; }
      return { sys, scan, pin, registered: model === 'rio' };
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const m = metrics();
      const rows = [
        { k: '커널 문턱(syscall)', v: m.sys, col: '#ef5350' },
        { k: '헛스캔', v: m.scan, col: '#ffa726' },
        { k: '핀고정 잔손질', v: m.pin, col: '#ab47bc' }
      ];
      const maxV = Math.max(1, m.sys, m.scan, m.pin, 1);
      const padL = 130, padR = 70, barH = 26, gap = 18, y0 = 20;
      ctx.font = '600 12px Pretendard';
      rows.forEach((r, i) => {
        const y = y0 + i * (barH + gap);
        ctx.fillStyle = '#9fb0cc'; ctx.textAlign = 'right'; ctx.fillText(r.k, padL - 10, y + barH / 2 + 4);
        ctx.textAlign = 'left';
        const full = w - padL - padR;
        // log scale for visibility
        const frac = r.v <= 0 ? 0 : Math.log10(r.v + 1) / Math.log10(maxV + 1);
        ctx.fillStyle = '#141d33'; roundRect(ctx, padL, y, full, barH, 6); ctx.fill();
        ctx.fillStyle = r.col; roundRect(ctx, padL, y, Math.max(r.v > 0 ? 8 : 0, full * frac), barH, 6); ctx.fill();
        ctx.fillStyle = r.v === 0 ? '#69f0ae' : '#e3eaf5'; ctx.font = '700 12px Pretendard';
        ctx.fillText(r.v === 0 ? '0 ✓' : fmt(r.v) + '/s', padL + full * frac + 8, y + barH / 2 + 4);
        ctx.font = '600 12px Pretendard';
      });
      if (sysOut) { sysOut.textContent = fmt(m.sys) + '/s'; sysOut.className = 'v' + (m.sys === 0 ? ' good' : ''); }
      if (scanOut) { scanOut.textContent = m.scan === 0 ? '0 ✓' : fmt(m.scan) + '/s'; scanOut.className = 'v' + (m.scan === 0 ? ' good' : ' warn'); }
      if (pinOut) { pinOut.textContent = m.registered ? '미리 등록(0)' : fmt(m.pin) + '/s'; pinOut.className = 'v' + (m.pin === 0 ? ' good' : ''); }
      if (cap) cap.textContent = CAPS[model];
    }
    conn && conn.addEventListener('input', () => { connv.textContent = fmt(+conn.value); draw(); });
    pps && pps.addEventListener('input', () => { ppsv.textContent = fmt(+pps.value); draw(); });
    $$('[data-ev]', cv.closest('.niow')).forEach(b => b.addEventListener('click', () => {
      model = b.getAttribute('data-ev');
      $$('[data-ev]', cv.closest('.niow')).forEach(x => x.classList.toggle('active', x === b));
      draw();
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    connv.textContent = fmt(+conn.value); ppsv.textContent = fmt(+pps.value);
    draw();
  })();

  /* ===== Widget 3: 폴링 vs 완료 통보 ===== */
  (function polling() {
    const cv = $('#pl-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const nSlider = $('#pl-n'), nv = $('#pl-nv');
    const pollOut = $('#pl-poll'), iocpOut = $('#pl-iocp');
    let N = +nSlider.value, ready = [], pollCnt = 0, iocpCnt = 0, sweep = -1, autoT = 0;
    function reseed() { N = +nSlider.value; ready = Array.from({ length: N }, () => Math.random() < 0.18); }
    reseed();
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const colW = w / 2;
      ctx.font = '700 12px Pretendard'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ff8a80'; ctx.fillText('select — 전부 물어봄', colW / 2, 16);
      ctx.fillStyle = '#69f0ae'; ctx.fillText('IOCP — 접수함만 봄', colW + colW / 2, 16);
      ctx.textAlign = 'left';
      const cols = Math.min(6, Math.ceil(Math.sqrt(N)));
      const rows = Math.ceil(N / cols);
      const cellW = (colW - 24) / cols, cellH = Math.min(26, (h - 40) / rows);
      for (let i = 0; i < N; i++) {
        const r = Math.floor(i / cols), c = i % cols;
        const bx = 12 + c * cellW, by = 26 + r * cellH;
        // left: select — sweep highlights current
        let fill = ready[i] ? '#ffca28' : '#37475f';
        if (sweep === i) fill = '#42a5f5';
        ctx.fillStyle = fill; roundRect(ctx, bx, by, cellW - 4, cellH - 4, 4); ctx.fill();
        // right: IOCP — only ready ones shown in 접수함 style
        const bx2 = colW + 12 + c * cellW;
        ctx.fillStyle = ready[i] ? '#ffca28' : '#1a2338';
        roundRect(ctx, bx2, by, cellW - 4, cellH - 4, 4); ctx.fill();
      }
      // divider
      ctx.strokeStyle = '#223052'; ctx.beginPath(); ctx.moveTo(colW, 6); ctx.lineTo(colW, h - 6); ctx.stroke();
      if (pollOut) pollOut.textContent = fmt(pollCnt);
      if (iocpOut) iocpOut.textContent = fmt(iocpCnt);
    }
    function tick() {
      // one full pass: select scans ALL N, iocp only ready ones
      pollCnt += N;
      iocpCnt += ready.filter(Boolean).length;
      // animate sweep
      sweep = 0;
      const iv = setInterval(() => {
        sweep++; if (sweep >= N) { clearInterval(iv); sweep = -1; reseed(); draw(); }
        else draw();
      }, Math.max(10, 260 / N));
      draw();
    }
    nSlider.addEventListener('input', () => { nv.textContent = nSlider.value; reseed(); draw(); });
    $$('[data-pl]', cv.closest('.niow')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-pl');
      if (a === 'tick') tick();
      else { // auto toggle
        if (autoT) { clearInterval(autoT); autoT = 0; b.classList.remove('active'); }
        else { b.classList.add('active'); autoT = setInterval(tick, 900); }
      }
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    nv.textContent = N; draw();
  })();

  /* ===== Widget 4: 핀 고정 ===== */
  (function pinning() {
    const cv = $('#pn-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const pin = $('#pn-pin'), okOut = $('#pn-ok'), lostOut = $('#pn-lost'), cap = $('#pn-cap');
    const SLOTS = 6;
    let pageSlot = 1, ok = 0, lost = 0, flash = '', flashT = 0;
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const shelfY = 70, slotW = (w - 24) / SLOTS, slotH = 60;
      ctx.font = '600 12px Pretendard'; ctx.fillStyle = '#8ba0c4';
      ctx.fillText('물리 메모리(RAM) 선반', 12, 28);
      // DMA source
      ctx.fillStyle = '#42a5f5'; ctx.fillText('📥 랜카드(DMA) → 가상주소 7번', 12, 50);
      for (let i = 0; i < SLOTS; i++) {
        const x = 12 + i * slotW;
        ctx.strokeStyle = '#2a3650'; ctx.lineWidth = 1;
        roundRect(ctx, x, shelfY, slotW - 6, slotH, 6); ctx.stroke();
        ctx.fillStyle = '#4a5670'; ctx.font = '10px Pretendard';
        ctx.fillText('선반 ' + i, x + 6, shelfY + slotH - 8);
        if (i === pageSlot) {
          ctx.fillStyle = pin.checked ? '#1e88e5' : '#8d6e00';
          roundRect(ctx, x + 4, shelfY + 4, slotW - 14, slotH - 24, 5); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '700 11px Pretendard';
          ctx.fillText(pin.checked ? '📌7번' : '7번', x + 9, shelfY + 22);
        }
      }
      // flash message
      if (flash) {
        ctx.fillStyle = flash.startsWith('LOST') ? '#ff8a80' : '#69f0ae';
        ctx.font = '700 13px Pretendard';
        ctx.fillText(flash.replace(/^LOST:|^OK:/, ''), 12, h - 14);
      }
      if (okOut) okOut.textContent = ok;
      if (lostOut) lostOut.textContent = lost;
    }
    function setFlash(m) { flash = m; clearTimeout(flashT); flashT = setTimeout(() => { flash = ''; draw(); }, 2200); draw(); }
    // swapped-out state: track whether OS moved page while unpinned
    let movedWhileUnpinned = false;
    $$('[data-pn]', cv.closest('.niow')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-pn');
      if (a === 'swap') {
        if (pin.checked) { setFlash('OK:📌 고정돼서 OS가 못 옮겨 — 안전'); return; }
        const old = pageSlot; do { pageSlot = Math.floor(Math.random() * SLOTS); } while (pageSlot === old);
        movedWhileUnpinned = true;
        setFlash('OK:OS가 7번 페이지를 다른 선반으로 옮김(스와핑)');
      } else if (a === 'dma') {
        if (!pin.checked && movedWhileUnpinned) {
          lost++; movedWhileUnpinned = false;
          setFlash('LOST:❌ DMA가 옛 주소(빈 선반)에 데이터를 쏟음 — 유실!');
        } else {
          ok++; setFlash('OK:✅ 7번 선반에 데이터 정확히 도착');
        }
      }
    }));
    pin.addEventListener('change', () => { if (pin.checked) movedWhileUnpinned = false; draw(); });
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();

  /* ===== Widget 5: 패킷 여행 레이어 ===== */
  (function journey() {
    const cv = $('#jn-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const cap = $('#jn-cap'), modelSel = $('#jn-model');
    const layers = [
      { t: '① 인터넷 → 랜카드(NIC)', d: '전기신호로 패킷 도착. 유저 프로그램은 절대 여길 직접 못 만져.', zone: 'hw' },
      { t: '② DMA로 커널 메모리에 직접 쓰기', d: 'CPU를 안 거치고 랜카드가 커널 버퍼에 바로 씀(DMA).', zone: 'hw' },
      { t: '③ 인터럽트로 CPU에 알림', d: '"패킷 왔어!" 어깨 툭툭. 폴링이 아니라 통보.', zone: 'hw' },
      { t: '④ 커널: TCP/IP 검사·조립·분류', d: '송장 확인, 부서진 박스 재조립, 주인(소켓) 분류.', zone: 'ker' },
      { t: '⑤ 소켓 수신 버퍼에 쌓임', d: '아직 커널 창고 안. 여기까진 어느 모델이든 똑같아.', zone: 'ker' },
      { t: '⑥ ★주소 변환 + 핀 고정', d: '', zone: 'bound' },
      { t: '⑦ 유저 버퍼로 복사 → 직렬화 해제', d: '내 7번 상자로 복사(또는 제로카피). 비트를 구조체로.', zone: 'usr' },
      { t: '⑧ 로직 스레드가 처리', d: '"A유저가 공격했구나" — 싱글스레드 게임 로직.', zone: 'usr' }
    ];
    const zoneCol = { hw: '#3a2a4a', ker: '#22314a', bound: '#4a3a1a', usr: '#1f3a2e' };
    const zoneEdge = { hw: '#7e57c2', ker: '#42a5f5', bound: '#ffca28', usr: '#66bb6a' };
    let cur = -1, anim = 0, raf = 0;
    function stepText(i) {
      if (layers[i].zone === 'bound') {
        return modelSel && modelSel.value === 'rio'
          ? 'RIO: 버퍼를 개업 때 등록해둬서 이 단계를 건너뛴다 — 변환·고정 잔손질 없음.'
          : 'IOCP: 이 패킷을 위해 지금 주소 변환+핀 고정을 새로 한다(매번 반복되는 비용).';
      }
      return layers[i].d;
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const n = layers.length, top = 8, bh = (h - top - 8) / n - 6;
      ctx.font = '600 12px Pretendard';
      let boundaryDrawn = false;
      for (let i = 0; i < n; i++) {
        const y = top + i * (bh + 6);
        // draw user/kernel boundary line before ⑥/⑦ transition (index 5 is bound)
        const active = i === cur;
        const done = i < cur;
        ctx.globalAlpha = done ? 0.55 : 1;
        ctx.fillStyle = zoneCol[layers[i].zone];
        roundRect(ctx, 10, y, w - 20, bh, 7); ctx.fill();
        ctx.strokeStyle = active ? zoneEdge[layers[i].zone] : 'transparent';
        ctx.lineWidth = active ? 2.5 : 0; if (active) ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = active ? '#fff' : '#c6d4ec';
        ctx.font = (active ? '800 ' : '600 ') + '12px Pretendard';
        ctx.fillText(layers[i].t, 20, y + bh / 2 + 4);
        if (layers[i].zone === 'bound') {
          ctx.fillStyle = '#ffca28'; ctx.font = '10px Pretendard'; ctx.textAlign = 'right';
          ctx.fillText('유저/커널 문턱', w - 24, y + bh / 2 + 4); ctx.textAlign = 'left';
        }
        // traveling dot
        if (active) {
          const dotX = 14 + (w - 40) * (anim);
          ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(dotX, y + bh - 6, 4, 0, 7); ctx.fill();
        }
      }
    }
    function run(i) {
      cur = i; anim = 0;
      cancelAnimationFrame(raf);
      (function a() {
        anim += 0.06; if (anim >= 1) { anim = 1; draw(); if (cap) cap.textContent = (i + 1) + '/8 · ' + stepText(i); if (i + 1 < layers.length) setTimeout(() => run(i + 1), 480); return; }
        draw(); raf = requestAnimationFrame(a);
      })();
      if (cap) cap.textContent = (i + 1) + '/8 · ' + stepText(i);
    }
    $$('[data-jn]', cv.closest('.niow')).forEach(b => b.addEventListener('click', () => { run(0); }));
    modelSel && modelSel.addEventListener('change', () => { if (cur === 5) { if (cap) cap.textContent = '6/8 · ' + stepText(5); } });
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();
})();
