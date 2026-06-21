// 1장 — 사격의 여정: 방아쇠와 서버 판정 사이의 데스싱크
// Canvas2D. 핑 슬라이더 + '상대 이동' 토글 + 한 발 쏘기 + 자동 데모 루프.
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var cv = $('pn1-canvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var CW = cv.width, CH = cv.height;

    // 레이아웃
    var clientL = 28, clientR = 352, serverL = 528, serverR = 852;
    var enemyY = 112, laneY = 262, shooterX = 70, recvX = 812;
    var mid = 0.5, amp = 0.33, PERIOD = 2600, w = 2 * Math.PI / PERIOD;
    var HITTOL = 0.06, SLOW = 6, AUTOCYCLE = 2300;

    var ping = 60, moving = false;
    var state = 'idle', t0 = 0, targetF = 0, judgeF = 0, result = '', lastFire = -99999, pendingFire = false, gapM = 0;
    var visible = true;

    function serverF(t) { return moving ? mid + amp * Math.sin(w * t) : mid; }
    function clientF(t) { return moving ? mid + amp * Math.sin(w * (t - ping)) : mid; }
    function fx(L, R, f) { return L + f * (R - L); }
    function lerp(a, b, p) { return a + (b - a) * p; }
    function travelDur() { return Math.max(140, ping * SLOW); }

    function fire(t) {
        if (state !== 'idle') return;
        state = 'toServer'; t0 = t; targetF = clientF(t); lastFire = t;
    }

    $('pn1-ping').addEventListener('input', function (e) {
        ping = parseInt(e.target.value, 10); $('pn1-ping-v').textContent = ping;
    });
    $('pn1-move').addEventListener('change', function (e) { moving = e.target.checked; });
    $('pn1-fire').addEventListener('click', function () { pendingFire = true; });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
    }

    function panel(L, R, title, accent) {
        ctx.fillStyle = '#101a30';
        ctx.fillRect(L, 50, R - L, CH - 78);
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
        ctx.strokeRect(L + 0.5, 50.5, R - L - 1, CH - 79);
        ctx.fillStyle = accent; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(title, L + 12, 40);
    }
    function dot(x, y, r, color) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    function vline(x, y1, y2, color, dash) {
        ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.setLineDash(dash || []);
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke(); ctx.setLineDash([]);
    }

    function render(t) {
        ctx.fillStyle = '#0a0f1e'; ctx.fillRect(0, 0, CW, CH);
        // 인터넷 구간 음영
        ctx.fillStyle = 'rgba(120,140,180,0.06)';
        ctx.fillRect(clientR, 50, serverL - clientR, CH - 78);
        ctx.fillStyle = '#54678f'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🌐 인터넷', (clientR + serverL) / 2, 46);
        ctx.fillText('(핑 ' + ping + 'ms)', (clientR + serverL) / 2, CH - 14);

        panel(clientL, clientR, '🖥 내 화면 (클라이언트)', '#26c6da');
        panel(serverL, serverR, '☁ 서버 (진짜 세계)', '#ef5350');

        var cf = clientF(t), sf = serverF(t);
        // 클라: 파란 상대 + 조준점
        var cx = fx(clientL, clientR, cf);
        dot(cx, enemyY, 15, '#42a5f5');
        ctx.strokeStyle = '#e3eaf5'; ctx.lineWidth = 1.4; ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(cx, enemyY, 22, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 28, enemyY); ctx.lineTo(cx + 28, enemyY);
        ctx.moveTo(cx, enemyY - 28); ctx.lineTo(cx, enemyY + 28); ctx.stroke();
        ctx.fillStyle = '#9fc2ff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('내가 보는 상대', cx, enemyY + 44);
        // 사수
        ctx.font = '22px sans-serif'; ctx.fillText('🔫', shooterX, laneY + 8);
        ctx.fillStyle = '#90a4c4'; ctx.font = '10px sans-serif'; ctx.fillText('나', shooterX, laneY + 26);

        // 서버: 빨간 진짜 상대
        var sx = fx(serverL, serverR, sf);
        dot(sx, enemyY, 15, '#ef5350');
        ctx.fillStyle = '#ffb0ad'; ctx.font = '11px sans-serif';
        ctx.fillText('진짜 상대', sx, enemyY + 44);
        // 서버 수신부
        ctx.font = '20px sans-serif'; ctx.fillText('🎯', recvX, laneY + 7);

        // 조준한 위치(서버 패널에 투영) — 쏜 뒤 표시
        if (state !== 'idle') {
            var tx = fx(serverL, serverR, targetF);
            vline(tx, 64, CH - 34, '#26c6da', [5, 5]);
            ctx.fillStyle = '#26c6da'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('내가 조준한 곳', tx, 78);
        }

        // 네트워크 레인
        ctx.strokeStyle = '#1c2740'; ctx.lineWidth = 2; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(shooterX, laneY); ctx.lineTo(recvX, laneY); ctx.stroke();

        // 패킷
        var dur = travelDur();
        if (state === 'toServer') {
            var p = Math.min(1, (t - t0) / dur);
            dot(lerp(shooterX, recvX, p), laneY, 7, '#42a5f5');
            label('쐈다! 신호 →', lerp(shooterX, recvX, p), '#9fc2ff');
        } else if (state === 'judge') {
            var pulse = 7 + 3 * Math.sin(t / 60);
            dot(recvX, laneY, pulse, '#ffd54f');
            label('서버 판정 중…', recvX, '#ffd54f');
        } else if (state === 'toClient') {
            var p2 = Math.min(1, (t - t0) / dur);
            var col = result === 'HIT' ? '#66bb6a' : '#ef5350';
            dot(lerp(recvX, shooterX, p2), laneY, 7, col);
            label(result === 'HIT' ? '← 명중!' : '← 빗나감', lerp(recvX, shooterX, p2), col);
        } else if (state === 'result') {
            ctx.fillStyle = result === 'HIT' ? '#66bb6a' : '#ef5350';
            ctx.font = '700 22px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(result === 'HIT' ? '✔ 명중 (HIT)' : '✘ 빗나감 (MISS)', CW / 2, laneY - 22);
        }
    }
    function label(txt, x, color) {
        ctx.fillStyle = color; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(txt, x, laneY - 14);
    }

    function status() {
        var s = '핑 편도 <b>' + ping + 'ms</b> · 왕복 <b>' + (ping * 2) + 'ms</b>. ';
        if (!moving) {
            s += "상대가 멈춰 있으면 내 화면과 서버가 같아 → 거의 항상 명중. '상대가 이동 중'을 켜봐.";
        } else {
            s += '상대 이동 ON — 방아쇠 당긴 순간과 신호가 서버에 닿는 순간(' + ping + 'ms 뒤) 사이에 상대가 움직인다.';
            if (state === 'result' || state === 'toClient') {
                s += ' 이번 발: 약 <b>' + gapM.toFixed(1) + 'm</b> 어긋남 → ' + (result === 'HIT' ? '아슬하게 명중' : '<b>빗나감(데스싱크)</b>');
            }
        }
        $('pn1-stat').innerHTML = s;
    }

    function loop(t) {
        if (visible) {
            if (pendingFire) { pendingFire = false; fire(t); }
            if (state === 'idle' && t - lastFire > AUTOCYCLE) fire(t);
            var dur = travelDur();
            if (state === 'toServer' && t - t0 >= dur) {
                state = 'judge'; t0 = t; judgeF = serverF(t);
                var gap = Math.abs(targetF - judgeF);
                gapM = gap * 100; // 예시 환산(가로 레인 = 100m 가정)
                result = gap < HITTOL ? 'HIT' : 'MISS';
            } else if (state === 'judge' && t - t0 >= 200) { state = 'toClient'; t0 = t; }
            else if (state === 'toClient' && t - t0 >= dur) { state = 'result'; t0 = t; }
            else if (state === 'result' && t - t0 >= 850) { state = 'idle'; }
            render(t);
            status();
        }
        requestAnimationFrame(loop);
    }
    $('pn1-ping-v').textContent = ping;
    requestAnimationFrame(loop);
    window.__pn1Ready = true; // 테스트 훅
})();
