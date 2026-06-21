// 6장 — Before/After 라이브 비교. 같은 적을 개선 전(틱18.5/149ms) vs 개선 후(틱22.9/62ms)로 렌더, 손잡이로 분할.
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var cv = $('pn6-canvas'), wrap = $('cmp-wrap'), handle = $('cmp-handle');
    if (!cv || !wrap) return;
    var ctx = cv.getContext('2d');
    var CW = cv.width, CH = cv.height;
    var split = 0.5, visible = true;
    var trackL = 110, trackR = 770, enemyY = 96;
    var PERIOD = 3200, w = 2 * Math.PI / PERIOD;
    var mid = (trackL + trackR) / 2, amp = (trackR - trackL) / 2;

    function trueX(t) { return mid + amp * Math.sin(w * t); }
    function received(t, rate) { var iv = 1000 / rate; return trueX(Math.floor(t / iv) * iv); }

    function drawScene(t, kind) {
        var before = kind === 'before';
        var tint = before ? 'rgba(239,83,80,0.10)' : 'rgba(102,187,106,0.10)';
        var col = before ? '#ef5350' : '#66bb6a';
        ctx.fillStyle = tint; ctx.fillRect(0, 0, CW, CH);

        // 트랙
        ctx.strokeStyle = '#1c2740'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(trackL, enemyY); ctx.lineTo(trackR, enemyY); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#54678f'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('멀리서 횡이동하는 적', mid, enemyY - 34);

        // 적 위치 (sample-hold)
        var rate = before ? 6 : 24;
        var ex = received(t, rate);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ex, enemyY, 13, 0, 7); ctx.fill();
        // 조준점
        ctx.strokeStyle = '#e3eaf5'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(ex, enemyY, 20, 0, 7); ctx.stroke();

        // 헤더 라벨 (각 반쪽에 위치)
        var lx = before ? 24 : CW - 250;
        ctx.textAlign = 'left';
        ctx.fillStyle = col; ctx.font = '700 16px sans-serif';
        ctx.fillText(before ? '개선 전' : '개선 후', lx, 36);
        ctx.fillStyle = '#cfe0ff'; ctx.font = '12px sans-serif';
        ctx.fillText(before ? '서버 틱 18.5' : '서버 틱 22.9', lx, 58);

        // 사격 딜레이 막대
        var delay = before ? 149.4 : 61.6;
        var barY = 200, barX = lx, maxLen = 230;
        ctx.fillStyle = '#90a4c4'; ctx.font = '11px sans-serif';
        ctx.fillText('사격 딜레이', barX, barY - 8);
        ctx.fillStyle = '#101a30'; ctx.fillRect(barX, barY, maxLen, 26);
        ctx.fillStyle = col; ctx.fillRect(barX, barY, maxLen * (delay / 200), 26);
        ctx.fillStyle = '#fff'; ctx.font = '700 13px sans-serif';
        ctx.fillText(delay.toFixed(1) + 'ms', barX + 6, barY + 18);

        // 끊김 표시(개선 전): 다음 갱신까지의 간극
        if (before) {
            var tx = trueX(t);
            ctx.strokeStyle = 'rgba(239,83,80,0.45)'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(ex, enemyY + 22); ctx.lineTo(tx, enemyY + 40); ctx.stroke();
            ctx.fillStyle = 'rgba(239,83,80,0.55)'; ctx.beginPath(); ctx.arc(tx, enemyY + 44, 4, 0, 7); ctx.fill();
        }
    }

    function render(t) {
        ctx.fillStyle = '#0a0f1e'; ctx.fillRect(0, 0, CW, CH);
        var sx = split * CW;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, sx, CH); ctx.clip(); drawScene(t, 'before'); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(sx, 0, CW - sx, CH); ctx.clip(); drawScene(t, 'after'); ctx.restore();
        // 가운데 분할선(보강)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, CH); ctx.stroke();
    }

    function setPos(frac) {
        split = Math.max(0.04, Math.min(0.96, frac));
        handle.style.left = (split * 100) + '%';
    }
    function onMove(e) {
        var r = wrap.getBoundingClientRect();
        var t = e.touches ? e.touches[0] : e;
        setPos((t.clientX - r.left) / r.width);
    }
    var dragging = false;
    wrap.addEventListener('mousedown', function (e) { dragging = true; onMove(e); e.preventDefault(); });
    window.addEventListener('mousemove', function (e) { if (dragging) onMove(e); });
    window.addEventListener('mouseup', function () { dragging = false; });
    wrap.addEventListener('touchstart', function (e) { dragging = true; onMove(e); }, { passive: true });
    wrap.addEventListener('touchmove', function (e) { if (dragging) onMove(e); }, { passive: true });
    wrap.addEventListener('touchend', function () { dragging = false; });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
    }

    $('pn6-stat').innerHTML = '왼쪽(개선 전)은 적 위치가 듬성듬성 갱신돼 뚝뚝 끊기고, 오른쪽(개선 후)은 부드럽다. 사격 딜레이 막대: <b>149.4ms → 61.6ms</b>. 손잡이를 끝까지 밀어 양쪽을 비교해봐.';

    function loop(t) { if (visible) render(t); requestAnimationFrame(loop); }
    setPos(0.5);
    requestAnimationFrame(loop);
    window.__pn6Ready = true;
})();
