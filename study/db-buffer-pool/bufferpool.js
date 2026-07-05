/* db-buffer-pool: 디스크 vs RAM 속도 · 버퍼 풀 히트/미스+LRU · 더티 페이지/체크포인트
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

  /* ===== Widget 1: 디스크 vs RAM 속도 ===== */
  (function speed() {
    const cv = $('#sp-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const oneOut = $('#sp-one'), totalOut = $('#sp-total'), ratioOut = $('#sp-ratio'), cap = $('#sp-cap');
    const DEV = {
      ram: { name: 'RAM', ms: 0.0001, col: '#66bb6a' },
      ssd: { name: 'SSD', ms: 0.1, col: '#ffca28' },
      hdd: { name: 'HDD', ms: 10, col: '#ef5350' }
    };
    let mode = 'ram';
    const N = 1e6;
    function human(sec) {
      if (sec < 1) return (sec * 1000).toFixed(0) + ' ms';
      if (sec < 60) return sec.toFixed(1) + ' 초';
      if (sec < 3600) return (sec / 60).toFixed(1) + ' 분';
      return (sec / 3600).toFixed(1) + ' 시간';
    }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      const order = ['ram', 'ssd', 'hdd'];
      const totalHDD = DEV.hdd.ms * N / 1000;
      const barMax = w - 150;
      ctx.font = '700 13px Pretendard';
      order.forEach((k, i) => {
        const d = DEV[k], y = 24 + i * 40;
        const totalSec = d.ms * N / 1000;
        const frac = Math.log10(totalSec * 1000 + 1) / Math.log10(totalHDD * 1000 + 1);
        ctx.fillStyle = k === mode ? d.col : '#9fb0cc'; ctx.textAlign = 'left';
        ctx.fillText(d.name, 12, y + 18);
        ctx.fillStyle = '#141d33'; rr(ctx, 60, y, barMax, 24, 6); ctx.fill();
        ctx.fillStyle = d.col; rr(ctx, 60, y, Math.max(8, barMax * frac), 24, 6);
        ctx.globalAlpha = k === mode ? 1 : 0.5; ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#e3eaf5'; ctx.font = '700 12px Pretendard';
        ctx.fillText(human(totalSec), 60 + Math.max(8, barMax * frac) + 8, y + 17);
        ctx.font = '700 13px Pretendard';
      });
      ctx.textAlign = 'left';
      const d = DEV[mode], totalSec = d.ms * N / 1000;
      if (oneOut) oneOut.textContent = d.ms < 0.001 ? (d.ms * 1e6).toFixed(0) + ' ns' : d.ms + ' ms';
      if (totalOut) totalOut.textContent = human(totalSec);
      if (ratioOut) { const r = Math.round(d.ms / DEV.ram.ms); ratioOut.textContent = r <= 1 ? '기준(1×)' : r.toLocaleString('en-US') + '× 느림'; ratioOut.className = 'v' + (r <= 1 ? ' good' : ' warn'); }
    }
    function setCap() {
      const d = DEV[mode], totalSec = d.ms * N / 1000;
      if (cap) cap.textContent = mode === 'ram'
        ? 'RAM은 책상 위 — 100만 페이지도 0.1초. 이 속도를 최대한 쓰려고 버퍼 풀이 있는 거야.'
        : `${d.name}에서 100만 페이지 = ${human(totalSec)}. 매번 여기서 읽으면 DB가 기어가. 그래서 RAM에 쟁여둬(다음 위젯).`;
    }
    $$('[data-sp]', cv.closest('.bpw')).forEach(b => b.addEventListener('click', () => {
      mode = b.getAttribute('data-sp');
      $$('[data-sp]', cv.closest('.bpw')).forEach(x => x.classList.toggle('active', x === b));
      draw(); setCap();
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw(); setCap();
  })();

  /* ===== Widget 2: 버퍼 풀 히트/미스 + LRU ===== */
  (function pool() {
    const cv = $('#pool-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const hitOut = $('#pool-hit'), missOut = $('#pool-miss'), rateOut = $('#pool-rate'), cap = $('#pool-cap');
    const CAP = 4;
    let buf = [];      // MRU first
    let hits = 0, miss = 0, lastResult = null, lastPage = null, evicted = null, autoT = 0, flash = 0, raf = 0;
    function request(pg) {
      lastPage = pg; evicted = null;
      const idx = buf.indexOf(pg);
      if (idx >= 0) { buf.splice(idx, 1); buf.unshift(pg); hits++; lastResult = 'hit'; }
      else {
        miss++; lastResult = 'miss';
        if (buf.length >= CAP) evicted = buf.pop();
        buf.unshift(pg);
      }
      flash = 12; anim();
      const total = hits + miss;
      if (hitOut) hitOut.textContent = hits;
      if (missOut) missOut.textContent = miss;
      if (rateOut) rateOut.textContent = total ? Math.round(hits / total * 100) + '%' : '-';
      if (cap) cap.textContent = lastResult === 'hit'
        ? `⚡ 페이지 ${pg} 히트! 버퍼(RAM)에 있어서 디스크 안 가고 바로 꺼냈어. 맨 앞으로 이동(최근 사용).`
        : `💽 페이지 ${pg} 미스 — 디스크에서 로드했어(느림).` + (evicted != null ? ` 버퍼가 꽉 차서 가장 오래 안 쓴 ${evicted}번을 버렸어(LRU).` : ' 버퍼에 올려뒀어.');
    }
    function anim() { cancelAnimationFrame(raf); (function a() { if (flash > 0) { flash--; draw(); raf = requestAnimationFrame(a); } else draw(); })(); }
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      // buffer pool (RAM) top row
      ctx.font = '700 12px Pretendard'; ctx.textAlign = 'left';
      ctx.fillStyle = '#8ba0c4'; ctx.fillText('버퍼 풀 (RAM · 4칸)  ← 왼쪽=최근 사용', 12, 18);
      const slotW = (w - 24) / CAP, sy = 28, sh = 60;
      for (let i = 0; i < CAP; i++) {
        const x = 12 + i * slotW; const pg = buf[i];
        const isNew = flash > 0 && pg === lastPage;
        ctx.fillStyle = pg == null ? '#101827' : (isNew ? (lastResult === 'hit' ? '#1b5e20' : '#5d1a1a') : '#16233c');
        rr(ctx, x + 3, sy, slotW - 6, sh, 8); ctx.fill();
        ctx.strokeStyle = pg == null ? '#223052' : (isNew ? (lastResult === 'hit' ? '#69f0ae' : '#ef5350') : '#2f4468');
        ctx.lineWidth = isNew ? 2.5 : 1; ctx.stroke();
        if (pg != null) { ctx.fillStyle = '#fff'; ctx.font = '800 20px Pretendard'; ctx.textAlign = 'center'; ctx.fillText('P' + pg, x + slotW / 2, sy + sh / 2 + 7); }
        else { ctx.fillStyle = '#37475f'; ctx.font = '12px Pretendard'; ctx.textAlign = 'center'; ctx.fillText('빈 칸', x + slotW / 2, sy + sh / 2 + 4); }
      }
      // disk bottom
      ctx.textAlign = 'left'; ctx.fillStyle = '#8ba0c4'; ctx.font = '700 12px Pretendard';
      ctx.fillText('💽 디스크 (모든 페이지의 원본)', 12, sy + sh + 34);
      ctx.fillStyle = '#0c1424'; rr(ctx, 12, sy + sh + 42, w - 24, 46, 8); ctx.fill();
      ctx.strokeStyle = '#223052'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#4a5670'; ctx.textAlign = 'center'; ctx.font = '13px Pretendard';
      ctx.fillText('P1  P2  P3  P4  P5  P6  ...  (느림)', w / 2, sy + sh + 42 + 28);
      // result banner
      if (lastResult) {
        ctx.textAlign = 'center'; ctx.font = '800 13px Pretendard';
        ctx.fillStyle = lastResult === 'hit' ? '#69f0ae' : '#ff8a80';
        ctx.fillText(lastResult === 'hit' ? '⚡ 히트 (RAM)' : '💽 미스 → 디스크', w / 2, sy - 8 + sh + 8);
      }
      ctx.textAlign = 'left';
    }
    function reset() { buf = []; hits = 0; miss = 0; lastResult = null; lastPage = null; evicted = null; if (autoT) { clearInterval(autoT); autoT = 0; } if (hitOut) hitOut.textContent = 0; if (missOut) missOut.textContent = 0; if (rateOut) rateOut.textContent = '-'; if (cap) cap.textContent = '페이지 번호를 눌러 요청해봐. 같은 페이지를 다시 요청하면 히트가 뜰 거야.'; draw(); }
    $$('[data-req]', cv.closest('.bpw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-req');
      if (a === 'reset') { reset(); return; }
      if (a === 'auto') {
        if (autoT) { clearInterval(autoT); autoT = 0; b.classList.remove('active'); }
        else {
          b.classList.add('active');
          // 지역성 있는 랜덤: 1~3 자주, 4~6 가끔
          autoT = setInterval(() => { const r = Math.random(); const pg = r < 0.7 ? 1 + Math.floor(Math.random() * 3) : 4 + Math.floor(Math.random() * 3); request(pg); }, 850);
        }
        return;
      }
      request(+a);
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    reset();
  })();

  /* ===== Widget 3: 더티 페이지 & 체크포인트 ===== */
  (function dirty() {
    const cv = $('#dirty-canvas'); if (!cv) return;
    let ctx = fitCanvas(cv);
    const dirtyOut = $('#dt-dirty'), cleanOut = $('#dt-clean'), cap = $('#dt-cap');
    const N = 6;
    let pages = Array.from({ length: N }, (_, i) => ({ id: i + 1, dirty: false }));
    let crashFlash = 0, raf = 0;
    function draw() {
      const w = cv._cw, h = cv._ch; ctx.clearRect(0, 0, w, h);
      ctx.font = '700 12px Pretendard'; ctx.textAlign = 'left'; ctx.fillStyle = '#8ba0c4';
      ctx.fillText('버퍼 풀 페이지 (RAM)', 12, 18);
      const cols = N, cw = (w - 24) / cols, sy = 28, sh = 66;
      pages.forEach((p, i) => {
        const x = 12 + i * cw;
        const danger = crashFlash > 0 && p.dirty;
        ctx.fillStyle = danger ? '#5d1a1a' : (p.dirty ? '#4a3a10' : '#123024');
        rr(ctx, x + 3, sy, cw - 6, sh, 8); ctx.fill();
        ctx.strokeStyle = danger ? '#ef5350' : (p.dirty ? '#ffca28' : '#66bb6a'); ctx.lineWidth = danger ? 2.5 : 1.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '800 16px Pretendard'; ctx.textAlign = 'center';
        ctx.fillText('P' + p.id, x + cw / 2, sy + 26);
        ctx.font = '700 10px Pretendard'; ctx.fillStyle = p.dirty ? '#ffd54f' : '#69f0ae';
        ctx.fillText(p.dirty ? '더티' : '깨끗', x + cw / 2, sy + 46);
      });
      // disk
      ctx.textAlign = 'left'; ctx.fillStyle = '#8ba0c4'; ctx.font = '700 12px Pretendard';
      ctx.fillText('💽 디스크', 12, sy + sh + 30);
      ctx.fillStyle = '#0c1424'; rr(ctx, 12, sy + sh + 38, w - 24, 34, 8); ctx.fill();
      ctx.strokeStyle = '#223052'; ctx.stroke();
      const cleanCnt = pages.filter(p => !p.dirty).length;
      ctx.fillStyle = '#4a5670'; ctx.textAlign = 'center'; ctx.font = '12px Pretendard';
      ctx.fillText(`디스크에 반영된 페이지: ${cleanCnt} / ${N}`, w / 2, sy + sh + 38 + 22);
      ctx.textAlign = 'left';
      const d = pages.filter(p => p.dirty).length;
      if (dirtyOut) dirtyOut.textContent = d;
      if (cleanOut) cleanOut.textContent = N - d;
    }
    $$('[data-dt]', cv.closest('.bpw')).forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-dt');
      if (a === 'mod') {
        const clean = pages.filter(p => !p.dirty); if (clean.length) { clean[Math.floor(Math.random() * clean.length)].dirty = true; }
        crashFlash = 0; draw();
        const d = pages.filter(p => p.dirty).length;
        if (cap) cap.textContent = `RAM의 페이지를 수정했어(빠름). 지금 더티 ${d}개 — 아직 디스크엔 안 쓴 상태야.`;
      } else if (a === 'ckpt') {
        pages.forEach(p => p.dirty = false); crashFlash = 0; draw();
        if (cap) cap.textContent = '💾 체크포인트! 더티 페이지를 전부 디스크로 flush 했어 — 이제 다 깨끗(안전). 복구 부담도 줄었지.';
      } else if (a === 'crash') {
        const d = pages.filter(p => p.dirty).length;
        crashFlash = 20; cancelAnimationFrame(raf);
        (function a2() { if (crashFlash > 0) { crashFlash--; draw(); raf = requestAnimationFrame(a2); } else draw(); })();
        if (cap) cap.textContent = d === 0
          ? '지금 죽어도 더티가 0개라 잃을 게 없어(방금 체크포인트 함). 하지만 더티가 있을 때 죽으면…'
          : `💥 지금 죽으면 더티 ${d}개(빨강)가 통째로 날아가! 커밋했다고 해놓고 데이터가 사라지는 거야. 이걸 막는 게 WAL — 다음 편.`;
      }
    }));
    window.addEventListener('resize', () => { ctx = fitCanvas(cv); draw(); });
    draw();
  })();
})();
