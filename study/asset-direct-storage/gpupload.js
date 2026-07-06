/* asset-direct-storage (renewed): CPU 직접복사 vs DMA · 업로드 경로 일반 vs DirectStorage
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

  /* ===== Widget 1: CPU 직접 복사 vs DMA ===== */
  (function dma() {
    const cv = $('#dma-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const cpuOut = $('#dma-cpu'), byOut = $('#dma-by'), logicOut = $('#dma-logic'), cap = $('#dma-cap');
    let mode = 'cpu';
    let prog = 0, running = false, raf = 0;
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      // CPU box (left) and DMA engine box (right)
      const cpuBusy = mode === 'cpu' ? (running ? 100 : 0) : (running && prog < 0.1 ? 40 : running ? 5 : 0);
      const dmaBusy = mode === 'dma' && running && prog >= 0.1;
      // CPU
      ctx.fillStyle = cpuBusy >= 80 ? '#5d1a1a' : cpuBusy > 10 ? '#3a2f14' : '#16233c';
      rr(ctx, 12, 24, 150, 64, 8); ctx.fill();
      ctx.strokeStyle = cpuBusy >= 80 ? '#ef5350' : cpuBusy > 10 ? '#ffca28' : '#2f4468'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#cfe0ff'; ctx.font = '700 13px Pretendard'; ctx.textAlign = 'center';
      ctx.fillText('🧠 CPU', 87, 46);
      ctx.fillStyle = cpuBusy >= 80 ? '#ff8a80' : cpuBusy > 10 ? '#ffd54f' : '#69f0ae'; ctx.font = '800 15px Pretendard';
      ctx.fillText('점유 ' + cpuBusy + '%', 87, 70);
      // DMA engine
      ctx.fillStyle = dmaBusy ? '#123a2a' : '#16233c'; rr(ctx, w - 162, 24, 150, 64, 8); ctx.fill();
      ctx.strokeStyle = dmaBusy ? '#69f0ae' : '#2f4468'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#cfe0ff'; ctx.font = '700 13px Pretendard'; ctx.fillText('⚙️ DMA 엔진', w - 87, 46);
      ctx.fillStyle = dmaBusy ? '#69f0ae' : '#4a5670'; ctx.font = '700 12px Pretendard';
      ctx.fillText(dmaBusy ? '전송 중…' : '대기', w - 87, 68);
      // transfer bar RAM -> VRAM
      ctx.fillStyle = '#8ba0c4'; ctx.font = '600 11px Pretendard'; ctx.textAlign = 'left';
      ctx.fillText('RAM', 12, 118); ctx.textAlign = 'right'; ctx.fillText('VRAM', w - 12, 118); ctx.textAlign = 'left';
      const bx = 12, bw = w - 24, by = 124;
      ctx.fillStyle = '#141d33'; rr(ctx, bx, by, bw, 26, 6); ctx.fill();
      const mover = mode === 'cpu' ? '#ef5350' : '#66bb6a';
      ctx.fillStyle = mover; rr(ctx, bx, by, Math.max(2, bw * prog), 26, 6); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 11px Pretendard'; ctx.textAlign = 'center';
      ctx.fillText(Math.round(prog * 100) + '%  (' + (mode === 'cpu' ? 'CPU가 복사' : 'DMA가 복사') + ')', w / 2, by + 17);
      // logic status
      ctx.textAlign = 'center'; ctx.font = '700 12px Pretendard';
      const logicOk = !(mode === 'cpu' && running);
      ctx.fillStyle = logicOk ? '#69f0ae' : '#ff8a80';
      ctx.fillText(logicOk ? '🎮 게임 로직: 실행 가능' : '🎮 게임 로직: 정지 (CPU가 복사에 묶임)', w / 2, by + 52);
      ctx.textAlign = 'left';
      // stats
      if (cpuOut) { cpuOut.textContent = (running ? cpuBusy : (mode === 'cpu' ? '100' : '~5')) + '%'; cpuOut.className = 'v' + (mode === 'cpu' ? ' warn' : ' good'); }
      if (byOut) byOut.textContent = mode === 'cpu' ? 'CPU' : 'DMA 엔진';
      if (logicOut) { logicOut.textContent = mode === 'cpu' ? '정지' : '실행 가능'; logicOut.className = 'v' + (mode === 'cpu' ? ' warn' : ' good'); }
    }
    function go() {
      running = true; prog = 0; cancelAnimationFrame(raf);
      (function a() { prog += 0.02; if (prog >= 1) { prog = 1; running = false; draw(); finish(); return; } draw(); raf = requestAnimationFrame(a); })();
      draw();
    }
    function finish() {
      if (cap) cap.textContent = mode === 'cpu'
        ? 'CPU가 직접 복사 = 100MB 옮기는 내내 CPU가 그 단순 작업에 묶여 게임 로직이 멈춰. 프레임이 뚝뚝 끊기는 원인.'
        : 'DMA 엔진이 복사 = CPU는 "옮겨줘" 명령만 던지고(잠깐) 빠져. 옮기는 동안 게임 로직을 그대로 돌릴 수 있어. 랜카드 DMA와 같은 원리.';
    }
    $$('[data-dma]', cv.closest('.gpw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-dma');
      if (a === 'go') { go(); return; }
      mode = a; running = false; prog = 0;
      $$('[data-dma]', cv.closest('.gpw')).forEach(x => { const v = x.getAttribute('data-dma'); if (v === 'cpu' || v === 'dma') x.classList.toggle('active', x === b); });
      draw();
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();

  /* ===== Widget 2: 업로드 경로 일반 vs DirectStorage ===== */
  (function path() {
    const cv = $('#path-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const bwOut = $('#path-bw'), cpuOut = $('#path-cpu'), copyOut = $('#path-copy'), cap = $('#path-cap');
    let mode = 'normal', anim = -1, raf = 0;
    const NORMAL = [
      { t: '💽 NVMe SSD (7GB/s 가능)', who: 'io' },
      { t: 'OS 파일시스템 (수천 syscall)', who: 'cpu' },
      { t: 'CPU RAM — 압축 해제(CPU 병목) + 포맷 변환', who: 'cpu' },
      { t: 'PCIe / DMA → RAM→VRAM 복사', who: 'dma' },
      { t: '🎮 GPU VRAM', who: 'gpu' }
    ];
    const DS = [
      { t: '💽 NVMe SSD (7GB/s) — 배치 요청', who: 'io' },
      { t: 'PCIe / DMA — CPU RAM 건너뜀 (직행)', who: 'dma' },
      { t: '🎮 GPU VRAM — GPU가 압축 해제(GDeflate)', who: 'gpu' }
    ];
    const COL = { io: ['#22314a', '#42a5f5'], cpu: ['#3a2f14', '#ffca28'], dma: ['#123a2a', '#66bb6a'], gpu: ['#2a1a3a', '#ab47bc'] };
    function nodes() { return mode === 'normal' ? NORMAL : DS; }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const N = nodes(), n = N.length, top = 14, bh = 42, gap = (h - top - bh - 8) / (n - 1);
      ctx.textAlign = 'left';
      for (let i = 0; i < n; i++) {
        const y = top + i * gap;
        const [bg, edge] = COL[N[i].who];
        const active = anim >= i;
        ctx.globalAlpha = active ? 1 : 0.5;
        ctx.fillStyle = bg; rr(ctx, 12, y, w - 24, bh, 8); ctx.fill();
        ctx.strokeStyle = edge; ctx.lineWidth = active ? 2 : 1; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#e6eefc'; ctx.font = '700 12px Pretendard';
        ctx.fillText(N[i].t, 22, y + bh / 2 + 4);
        ctx.fillStyle = edge; ctx.font = '10px Pretendard'; ctx.textAlign = 'right';
        const tag = { io: '저장장치', cpu: 'CPU 관여', dma: 'DMA', gpu: 'GPU' }[N[i].who];
        ctx.fillText(tag, w - 22, y + bh / 2 + 4); ctx.textAlign = 'left';
        // arrow
        if (i < n - 1) {
          const cpuHop = mode === 'normal';
          ctx.fillStyle = '#5a6b8a'; ctx.font = '700 11px Pretendard'; ctx.textAlign = 'center';
          ctx.fillText('▼', w / 2, y + bh + gap / 2 - bh / 2 + 4);
          ctx.textAlign = 'left';
        }
      }
      // stats
      const cpuHops = N.filter(x => x.who === 'cpu').length;
      const bw = mode === 'normal' ? '2~3 GB/s' : '~7 GB/s';
      if (bwOut) { bwOut.textContent = bw; bwOut.className = 'v' + (mode === 'normal' ? ' warn' : ' good'); }
      if (cpuOut) { cpuOut.textContent = mode === 'normal' ? '경유 (병목)' : '우회 ✓'; cpuOut.className = 'v' + (mode === 'normal' ? ' warn' : ' good'); }
      if (copyOut) copyOut.textContent = mode === 'normal' ? '여러 번' : '최소화';
    }
    function go() {
      anim = -1; cancelAnimationFrame(raf);
      const n = nodes().length;
      (function a() { anim++; draw(); if (anim < n - 1) raf = requestAnimationFrame(() => setTimeout(a, 340)); else finish(); })();
      draw();
    }
    function finish() {
      if (cap) cap.textContent = mode === 'normal'
        ? '일반 경로: SSD→OS→CPU RAM(압축 해제)→PCIe→VRAM. CPU가 파일시스템·압축 해제를 하며 7GB/s가 2~3GB/s로 막혀(노란=CPU 관여).'
        : 'DirectStorage: SSD→(DMA 직행)→GPU VRAM, 압축 해제도 GPU가. CPU RAM·CPU 압축해제를 건너뛰어 SSD의 7GB/s를 거의 그대로 뽑아.';
    }
    $$('[data-pt]', cv.closest('.gpw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-pt');
      if (a === 'go') { go(); return; }
      mode = a; anim = -1;
      $$('[data-pt]', cv.closest('.gpw')).forEach(x => { const v = x.getAttribute('data-pt'); if (v === 'normal' || v === 'ds') x.classList.toggle('active', x === b); });
      draw();
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();
})();
