/* zero-copy: 복사 횟수 시각화 (일반 vs 제로카피). 바닐라 JS + Canvas. 예시 모델값. */
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

  (function hops() {
    const cv = $('#zc-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const sizeS = $('#zc-size'), sizev = $('#zc-sizev');
    const copiesOut = $('#zc-copies'), bytesOut = $('#zc-bytes'), savedOut = $('#zc-saved'), cap = $('#zc-cap');
    let mode = 'normal';
    // 노드: 디스크 → 커널버퍼 → 유저버퍼 → 커널버퍼(소켓) → 랜카드
    // 일반: 디스크→커널(DMA,복사X)→유저(복사①)→커널소켓(복사②)→랜카드(DMA,복사X) => 앱경유 복사 2회
    // 제로카피: 디스크→커널(DMA)→커널소켓(복사, 커널내부 1회 or DMA직결)→랜카드 => 유저 안 거침, 복사 0(앱관점)
    const NODES_N = [
      { t: '💽 디스크(파일)', zone: 'hw' },
      { t: '커널 버퍼', zone: 'ker' },
      { t: '유저(앱) 버퍼', zone: 'usr' },
      { t: '커널 소켓 버퍼', zone: 'ker' },
      { t: '🌐 랜카드 → 네트워크', zone: 'hw' }
    ];
    // 엣지 라벨: 복사 여부
    const EDGES_N = ['DMA (복사 아님)', '복사 ①', '복사 ②', 'DMA (복사 아님)'];
    const EDGES_Z = ['DMA (복사 아님)', '위치만 전달 (복사 X)', 'DMA (복사 아님)'];
    const NODES_Z = [
      { t: '💽 디스크(파일)', zone: 'hw' },
      { t: '커널 버퍼', zone: 'ker' },
      { t: '커널 소켓 버퍼', zone: 'ker' },
      { t: '🌐 랜카드 → 네트워크', zone: 'hw' }
    ];
    const zc = { hw: ['#3a2a4a', '#7e57c2'], ker: ['#22314a', '#42a5f5'], usr: ['#4a3a1a', '#ffca28'] };
    let anim = -1, raf = 0;

    function nodes() { return mode === 'normal' ? NODES_N : NODES_Z; }
    function edges() { return mode === 'normal' ? EDGES_N : EDGES_Z; }
    function copies() { return mode === 'normal' ? 2 : 0; }

    function metrics() {
      const gb = +sizeS.value;
      const cN = 2, cZ = 0;
      const c = copies();
      const moved = gb * c;               // 앱 경유 복사량
      const saved = gb * (cN - c);        // 아낀 복사량 (일반 대비)
      return { gb, c, moved, saved };
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const N = nodes(), E = edges();
      const n = N.length, top = 14, boxH = 40, gapY = (h - top - boxH - 10) / (n - 1);
      ctx.textAlign = 'left';
      for (let i = 0; i < n; i++) {
        const y = top + i * gapY;
        const [bg, edge] = zc[N[i].zone];
        ctx.fillStyle = bg; rr(ctx, 12, y, w - 24, boxH, 8); ctx.fill();
        ctx.strokeStyle = edge; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#e6eefc'; ctx.font = '700 13px Pretendard';
        ctx.fillText(N[i].t, 24, y + boxH / 2 + 5);
        // zone tag
        ctx.fillStyle = edge; ctx.font = '10px Pretendard'; ctx.textAlign = 'right';
        ctx.fillText(N[i].zone === 'usr' ? '유저 영역' : N[i].zone === 'ker' ? '커널 영역' : '하드웨어', w - 24, y + boxH / 2 + 4);
        ctx.textAlign = 'left';
        // edge label
        if (i < n - 1) {
          const my = y + boxH + gapY / 2 - boxH / 2;
          const isCopy = E[i].startsWith('복사');
          ctx.fillStyle = isCopy ? '#ff8a80' : (E[i].startsWith('위치') ? '#69f0ae' : '#5a6b8a');
          ctx.font = '700 11px Pretendard'; ctx.textAlign = 'center';
          ctx.fillText((isCopy ? '⬇ ' : '⬇ ') + E[i], w / 2, y + (gapY + boxH) / 2 + 2);
          ctx.textAlign = 'left';
        }
      }
      // traveling packet
      if (anim >= 0) {
        const seg = Math.floor(anim), frac = anim - seg;
        if (seg < n - 1) {
          const y0 = top + seg * gapY + boxH / 2, y1 = top + (seg + 1) * gapY + boxH / 2;
          const y = y0 + (y1 - y0) * frac;
          ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(w / 2 - 90, y, 6, 0, 7); ctx.fill();
        }
      }
      const m = metrics();
      if (copiesOut) { copiesOut.textContent = m.c + '회'; copiesOut.className = 'v' + (m.c === 0 ? ' good' : ''); }
      if (bytesOut) bytesOut.textContent = m.moved + ' GB';
      if (savedOut) savedOut.textContent = m.saved + ' GB';
    }
    function send() {
      anim = 0; cancelAnimationFrame(raf);
      const n = nodes().length;
      (function a() {
        anim += 0.05; if (anim >= n - 1) { anim = -1; draw(); setCap(true); return; }
        draw(); raf = requestAnimationFrame(a);
      })();
      setCap(false);
    }
    function setCap(done) {
      const m = metrics();
      if (!cap) return;
      if (mode === 'normal') {
        cap.textContent = `일반 방식: 유저 버퍼를 거치며 복사 2회. ${m.gb}GB 보내는데 CPU가 ${m.moved}GB를 헛옮겼어(빨간 화살표).`;
      } else {
        cap.textContent = `제로카피: 유저 버퍼를 아예 안 거쳐(위치만 전달). 복사 0회 — ${m.gb}GB 그대로 흘러가고 ${m.saved}GB만큼의 헛복사를 아꼈어.`;
      }
    }
    $$('[data-zc]', cv.closest('.zcw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-zc');
      if (a === 'send') { send(); return; }
      mode = a;
      $$('[data-zc]', cv.closest('.zcw')).forEach(x => { if (x.getAttribute('data-zc') !== 'send') x.classList.toggle('active', x === b); });
      anim = -1; draw(); setCap(true);
    }));
    sizeS.addEventListener('input', () => { sizev.textContent = sizeS.value; draw(); setCap(true); });
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    sizev.textContent = sizeS.value; draw();
  })();
})();
