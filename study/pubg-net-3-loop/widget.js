// 3장 — 서버 한 틱 파이프라인: Before #14 vs After #14(Net Send Flush)
// RPC(🔫)가 어디서 탈출하는지 애니메이션으로 비교.
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var cv = $('pn3-canvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var CW = cv.width, CH = cv.height;
    var boxY = 96, boxH = 74, cy = boxY + boxH / 2;
    var mode = 'before', visible = true, cycleT = 2900;

    // 박스 정의 (mode별)
    var BOXES = {
        before: [
            { n: '① Net Dispatch', sub: '입력 풀기', x: 30, w: 200, c: '#42a5f5' },
            { n: '② Simulate & Render', sub: '세계 계산(무거움)', x: 250, w: 330, c: '#ab47bc' },
            { n: '③ Net Flush', sub: '모아서 전송', x: 600, w: 250, c: '#66bb6a' }
        ],
        after: [
            { n: '① Net Dispatch', sub: '입력 풀기', x: 24, w: 158, c: '#42a5f5' },
            { n: '★ Net Send Flush', sub: 'RPC 먼저 전송', x: 196, w: 168, c: '#ffd54f' },
            { n: '② Simulate & Render', sub: '세계 계산', x: 378, w: 244, c: '#ab47bc' },
            { n: '③ Net Flush', sub: '상태 전송', x: 636, w: 214, c: '#66bb6a' }
        ]
    };
    // 토큰 일정 {bi, dur}
    var SEG = {
        before: { rpc: [{ bi: 0, d: 400 }, { bi: 1, d: 1150 }, { bi: 2, d: 500 }] },
        after: {
            rpc: [{ bi: 0, d: 360 }, { bi: 1, d: 360 }],
            repl: [{ bi: 0, d: 360 }, { bi: 1, d: 200 }, { bi: 2, d: 1150 }, { bi: 3, d: 480 }]
        }
    };

    $('pn3-before').addEventListener('click', function () { setMode('before'); });
    $('pn3-after').addEventListener('click', function () { setMode('after'); });
    function setMode(m) {
        mode = m;
        $('pn3-before').classList.toggle('active', m === 'before');
        $('pn3-after').classList.toggle('active', m === 'after');
    }
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
    }

    function place(segs, boxes, tEl) {
        var acc = 0;
        for (var i = 0; i < segs.length; i++) {
            if (tEl < acc + segs[i].d) {
                var sub = (tEl - acc) / segs[i].d;
                var b = boxes[segs[i].bi];
                return { x: b.x + sub * b.w, bi: segs[i].bi, exited: false };
            }
            acc += segs[i].d;
        }
        var lb = boxes[segs[segs.length - 1].bi];
        return { x: lb.x + lb.w, bi: segs[segs.length - 1].bi, exited: true, exitBox: lb };
    }

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function drawBoxes(boxes) {
        for (var i = 0; i < boxes.length; i++) {
            var b = boxes[i];
            ctx.fillStyle = '#101a30'; ctx.strokeStyle = b.c; ctx.lineWidth = 2;
            roundRect(b.x, boxY, b.w, boxH, 10); ctx.fill(); ctx.stroke();
            ctx.fillStyle = b.c; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(b.n, b.x + b.w / 2, cy - 4);
            ctx.fillStyle = '#90a4c4'; ctx.font = '11px sans-serif';
            ctx.fillText(b.sub, b.x + b.w / 2, cy + 16);
            if (i < boxes.length - 1) {
                ctx.strokeStyle = '#3d4f78'; ctx.lineWidth = 2;
                var ax = b.x + b.w, axe = boxes[i + 1].x;
                ctx.beginPath(); ctx.moveTo(ax, cy); ctx.lineTo(axe, cy); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(axe - 6, cy - 4); ctx.lineTo(axe, cy); ctx.lineTo(axe - 6, cy + 4); ctx.stroke();
            }
        }
    }

    function token(x, y, emoji, color) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
        ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(emoji, x, y + 1); ctx.textBaseline = 'alphabetic';
    }

    function exitArrow(b, txt, color) {
        var x = b.x + b.w / 2, y0 = boxY + boxH, y1 = CH - 30;
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 5, y1 - 6); ctx.lineTo(x, y1); ctx.lineTo(x + 5, y1 - 6); ctx.stroke();
        ctx.fillStyle = color; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(txt, x, y1 + 14);
    }

    function render(t) {
        ctx.fillStyle = '#0a0f1e'; ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#54678f'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('클라 입력 →', 24, boxY - 14);
        var boxes = BOXES[mode];
        drawBoxes(boxes);
        var tEl = t % cycleT;

        if (mode === 'before') {
            var r = place(SEG.before.rpc, boxes, tEl);
            if (!r.exited) token(r.x, cy, '🔫', '#26c6da');
            else exitArrow(boxes[2], '📤 사격 신호 전송 (지연 큼)', '#ef5350');
        } else {
            var rp = place(SEG.after.repl, boxes, tEl);
            if (!rp.exited) token(rp.x, cy + 0, '📍', '#ab47bc');
            else exitArrow(boxes[3], '📤 위치 전송', '#66bb6a');
            var rc = place(SEG.after.rpc, boxes, tEl);
            if (!rc.exited) token(rc.x, cy, '🔫', '#26c6da');
            else exitArrow(boxes[1], '📤 사격 신호 먼저 전송!', '#ffd54f');
        }
    }

    function status() {
        if (mode === 'before') {
            $('pn3-stat').innerHTML = "🔫 RPC(사격)가 ②Simulate&Render를 <b>다 거친 뒤</b>에야 ③에서 전송된다. 평균 사격 딜레이 <b>94.5ms</b> (40명 생존 기준).";
        } else {
            $('pn3-stat').innerHTML = "🔫 RPC는 ★Net Send Flush에서 <b>먼저 탈출</b>, 📍위치(Replication)만 ②를 거쳐 ③으로. 사격 딜레이 94.5 → <b>77ms (18%↓)</b>. 전송 순서만 바꿔 얻은 이득.";
        }
    }

    function loop(t) {
        if (visible) { render(t); status(); }
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    window.__pn3Ready = true;
})();
