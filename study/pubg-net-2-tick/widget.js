// 2장 — 틱레이트 체험: 연속 진짜 위치 vs 틱마다 끊어 받는 위치 + 서버틱/네트워크전송 박동 비교
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var cv = $('pn2-canvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var CW = cv.width, CH = cv.height;

    var laneL = 40, laneR = 840;
    var trueY = 70, recvY = 138;
    var tickBarY = 212, netBarY = 256;
    var PERIOD = 3400, w = 2 * Math.PI / PERIOD;
    var amp = (laneR - laneL) / 2 - 26, mid = (laneL + laneR) / 2;
    var WINDOW = 1500;

    var tick = 15, net2 = false, visible = true;

    function trueX(t) { return mid + amp * Math.sin(w * t); }

    $('pn2-tick').addEventListener('input', function (e) {
        tick = parseInt(e.target.value, 10); $('pn2-tick-v').textContent = tick;
    });
    $('pn2-net').addEventListener('change', function (e) { net2 = e.target.checked; });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
    }

    function dot(x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }

    function pulseBar(t, y, interval, color, labelTxt) {
        // 스크롤 박동: [t-WINDOW, t] 구간의 박동을 오른쪽=현재로
        ctx.strokeStyle = '#1c2740'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(laneL, y); ctx.lineTo(laneR, y); ctx.stroke();
        var first = Math.ceil((t - WINDOW) / interval);
        var last = Math.floor(t / interval);
        for (var k = first; k <= last; k++) {
            var m = k * interval;
            var x = laneR - ((t - m) / WINDOW) * (laneR - laneL);
            var age = t - m;
            var fresh = age < 130;
            ctx.strokeStyle = color; ctx.lineWidth = fresh ? 3 : 1.5;
            ctx.globalAlpha = fresh ? 1 : 0.5;
            ctx.beginPath(); ctx.moveTo(x, y - (fresh ? 16 : 10)); ctx.lineTo(x, y + (fresh ? 16 : 10)); ctx.stroke();
            ctx.globalAlpha = 1;
        }
        ctx.fillStyle = color; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(labelTxt, laneL, y - 24);
    }

    function render(t) {
        ctx.fillStyle = '#0a0f1e'; ctx.fillRect(0, 0, CW, CH);

        var sendRate = tick * (net2 ? 2 : 1);
        var sendInt = 1000 / sendRate;
        var lastSend = Math.floor(t / sendInt) * sendInt;

        // 진짜(연속) 위치
        ctx.fillStyle = '#90a4c4'; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('진짜 움직임 (연속)', laneL, trueY - 26);
        ctx.strokeStyle = '#1c2740'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.moveTo(laneL, trueY); ctx.lineTo(laneR, trueY); ctx.stroke(); ctx.setLineDash([]);
        var tx = trueX(t);
        dot(tx, trueY, 13, '#42a5f5');

        // 받는(끊어진) 위치 — 마지막 네트워크 전송 시점의 값으로 hold
        ctx.fillStyle = '#90a4c4';
        ctx.fillText('내가 받는 위치 (틱마다 끊김)', laneL, recvY - 26);
        ctx.strokeStyle = '#1c2740'; ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.moveTo(laneL, recvY); ctx.lineTo(laneR, recvY); ctx.stroke(); ctx.setLineDash([]);
        var rx = trueX(lastSend);
        // 끊김 강조: 진짜 위치와의 간극을 회색 선으로
        ctx.strokeStyle = 'rgba(239,83,80,0.5)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(rx, recvY); ctx.lineTo(tx, recvY - (recvY - trueY)); ctx.stroke();
        dot(rx, recvY, 13, net2 ? '#ffd54f' : '#26c6da');

        // 박동 막대
        pulseBar(t, tickBarY, 1000 / tick, '#42a5f5', '💓 서버 틱 (세계 계산): ' + tick + '/초');
        pulseBar(t, netBarY, sendInt, net2 ? '#ffd54f' : '#26c6da', '📡 네트워크 전송 (위치 부치기): ' + sendRate + '/초');
    }

    function status() {
        var sendRate = tick * (net2 ? 2 : 1);
        var s = '서버 틱 <b>' + tick + '/초</b> → 한 틱 <b>' + (1000 / tick).toFixed(1) + 'ms</b>. ';
        s += '네트워크 전송 <b>' + sendRate + '/초</b>';
        if (net2) s += ' (틱은 그대로인데 전송만 2배 — 서버 틱 ≠ 네트워크 업데이트 레이트!)';
        else s += '. ‘네트워크 업데이트 2배’를 켜면 계산은 그대로, 전송만 촘촘해진다.';
        $('pn2-stat').innerHTML = s;
    }

    function loop(t) {
        if (visible) { render(t); status(); }
        requestAnimationFrame(loop);
    }
    $('pn2-tick-v').textContent = tick;
    requestAnimationFrame(loop);
    window.__pn2Ready = true;
})();
