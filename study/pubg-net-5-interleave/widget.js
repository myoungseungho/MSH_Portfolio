// 5장 — Replication Interleaving: 거리 링 + 드래그. 거리별로 점이 반짝이는 주기가 달라진다.
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var cv = $('pn5-canvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var CW = cv.width, CH = cv.height;
    var cx = 235, cy = 210, scale = 0.5; // px per meter
    var R70 = 70 * scale, R400 = 400 * scale, RMAX = 230;
    var TICK_MS = 320;
    var visible = true, drag = null, prevTick = -1;

    var dots = [
        { x: cx + 22, y: cy - 16, off: 0, flash: -9999 },
        { x: cx + 95, y: cy + 48, off: 1, flash: -9999 },
        { x: cx - 120, y: cy + 70, off: 0, flash: -9999 },
        { x: cx + 60, y: cy - 30, off: 1, flash: -9999, hot: true },
        { x: cx + 165, y: cy - 130, off: 2, flash: -9999 },
        { x: cx - 150, y: cy - 95, off: 1, flash: -9999 }
    ];

    function dist(d) { return Math.hypot(d.x - cx, d.y - cy) / scale; }
    function period(m) { return m <= 70 ? 1 : (m <= 400 ? 2 : 3); }
    function tierColor(m) { return m <= 70 ? '#ef5350' : (m <= 400 ? '#ffd54f' : '#42a5f5'); }
    function tierName(m) { return m <= 70 ? '교전권(≤70m): 매 틱' : (m <= 400 ? '중거리(70~400m): 1프레임 스킵(½)' : '원거리(>400m): 2프레임 스킵(⅓)'); }

    function evPos(e) {
        var r = cv.getBoundingClientRect();
        var t = e.touches ? e.touches[0] : e;
        return { x: (t.clientX - r.left) * CW / r.width, y: (t.clientY - r.top) * CH / r.height };
    }
    function pick(p) {
        for (var i = 0; i < dots.length; i++) if (Math.hypot(p.x - dots[i].x, p.y - dots[i].y) < 18) return dots[i];
        return null;
    }
    cv.addEventListener('mousedown', function (e) { drag = pick(evPos(e)); if (drag) e.preventDefault(); });
    cv.addEventListener('touchstart', function (e) { drag = pick(evPos(e)); if (drag) e.preventDefault(); }, { passive: false });
    function moveH(e) {
        if (!drag) return;
        var p = evPos(e);
        var dx = p.x - cx, dy = p.y - cy, r = Math.hypot(dx, dy);
        if (r > RMAX) { dx = dx / r * RMAX; dy = dy / r * RMAX; }
        drag.x = cx + dx; drag.y = cy + dy; e.preventDefault();
    }
    cv.addEventListener('mousemove', moveH);
    cv.addEventListener('touchmove', moveH, { passive: false });
    window.addEventListener('mouseup', function () { drag = null; });
    cv.addEventListener('touchend', function () { drag = null; });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
    }

    function ring(r, color, label) {
        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = color; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(label, cx, cy - r - 5);
    }

    function render(t) {
        ctx.fillStyle = '#0a0f1e'; ctx.fillRect(0, 0, CW, CH);
        // 영역 음영
        ctx.fillStyle = 'rgba(66,165,245,0.05)'; ctx.beginPath(); ctx.arc(cx, cy, RMAX, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,213,79,0.06)'; ctx.beginPath(); ctx.arc(cx, cy, R400, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(239,83,80,0.08)'; ctx.beginPath(); ctx.arc(cx, cy, R70, 0, 7); ctx.fill();
        ring(R70, '#ef5350', '70m');
        ring(R400, '#ffd54f', '400m');

        // 나
        ctx.fillStyle = '#26c6da'; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.fill();
        ctx.fillStyle = '#aef3fb'; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('나', cx, cy + 24);

        var actual = 0;
        for (var i = 0; i < dots.length; i++) {
            var d = dots[i], m = dist(d);
            actual += 1 / period(m);
            var b = Math.max(0, 1 - (t - d.flash) / 280);
            var col = tierColor(m);
            // 후광(반짝)
            if (b > 0) {
                ctx.globalAlpha = b * 0.5; ctx.fillStyle = col;
                ctx.beginPath(); ctx.arc(d.x, d.y, 9 + b * 12, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
            }
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(d.x, d.y, d.hot ? 9 : 7, 0, 7); ctx.fill();
            if (d.hot) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.x, d.y, 13, 0, 7); ctx.stroke(); }
        }

        // 정보 패널
        var px = 480;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff'; ctx.font = '700 13px sans-serif';
        ctx.fillText('흰 테두리 점을 드래그해봐', px, 40);
        var hot = dots[3], hm = dist(hot);
        ctx.fillStyle = tierColor(hm); ctx.font = '700 15px sans-serif';
        ctx.fillText('이 점: ' + hm.toFixed(0) + 'm', px, 74);
        ctx.fillStyle = '#cfe0ff'; ctx.font = '12px sans-serif';
        ctx.fillText('→ ' + tierName(hm), px, 96);

        var naive = dots.length;
        var saved = (1 - actual / naive) * 100;
        ctx.fillStyle = '#90a4c4'; ctx.font = '12px sans-serif';
        ctx.fillText('매 틱 전부 보낼 때: ' + naive.toFixed(0) + ' 갱신/틱', px, 140);
        ctx.fillStyle = '#66bb6a';
        ctx.fillText('Interleaving 적용: ' + actual.toFixed(2) + ' 갱신/틱', px, 162);
        ctx.fillStyle = '#fff'; ctx.font = '700 22px sans-serif';
        ctx.fillText('전송량 ' + saved.toFixed(0) + '% 절감', px, 196);
        ctx.fillStyle = '#54678f'; ctx.font = '11px sans-serif';
        ctx.fillText('(점을 바깥으로 옮길수록 절감↑, 끊김↑)', px, 218);

        // 범례
        var ly = 270;
        [['#ef5350', '≤70m  매 틱 (교전 — 절대 안 건드림)'], ['#ffd54f', '70~400m  ½ 빈도'], ['#42a5f5', '>400m  ⅓ 빈도']].forEach(function (e, i) {
            ctx.fillStyle = e[0]; ctx.beginPath(); ctx.arc(px + 6, ly + i * 24, 6, 0, 7); ctx.fill();
            ctx.fillStyle = '#b5c2db'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
            ctx.fillText(e[1], px + 20, ly + i * 24 + 4);
        });
    }

    function status() {
        $('pn5-stat').innerHTML = "점이 <b>반짝</b>일 때마다 그 플레이어 위치가 서버에서 갱신·전송된 거야. 안쪽은 빠르게, 바깥은 띄엄띄엄 — 같은 주기여도 점마다 어긋나게(interleave) 반짝이는 게 핵심.";
    }

    function loop(t) {
        if (visible) {
            var tickCount = Math.floor(t / TICK_MS);
            if (tickCount !== prevTick) {
                prevTick = tickCount;
                for (var i = 0; i < dots.length; i++) {
                    var p = period(dist(dots[i]));
                    if ((tickCount + dots[i].off) % p === 0) dots[i].flash = t;
                }
            }
            render(t); status();
        }
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    window.__pn5Ready = true;
})();
