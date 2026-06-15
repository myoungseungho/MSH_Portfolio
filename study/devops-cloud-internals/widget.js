// 클라우드 동작 원리 문서 — 인터랙티브 위젯 4종
// ① 호스트/VM 토폴로지  ② 오버커밋 시뮬레이터  ③ 풍선 드라이버 + 강제리셋  ④ 사건 타임라인 빌드업
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }

    /* ============================================================
     * ① 토폴로지 — 한 물리 서버 위 여러 VM
     * ============================================================ */
    (function topo() {
        var box = $('cl-topo'); if (!box) return;
        var btn = $('cl-topo-hv'), layer = $('cl-topo-hvlayer'), note = $('cl-topo-note');
        var shown = true;
        function render() {
            if (layer) layer.style.display = shown ? 'flex' : 'none';
            if (btn) btn.textContent = shown ? '하이퍼바이저 숨기기' : '하이퍼바이저 보기';
            if (note) note.innerHTML = shown
                ? '<b>하이퍼바이저</b> = 물리 서버 한 대를 여러 VM 으로 쪼개 나눠주는 관리 소프트웨어(Xen / KVM / Hyper-V). 네가 빌린 "서버"는 이 위에 얹힌 손님 한 명이야.'
                : '하이퍼바이저를 숨기니 VM 들이 각자 독립 컴퓨터처럼 보이지? 손님 입장에선 그렇게 느껴져. 하지만 실제론 한 물리 서버를 나눠 쓰는 중이야.';
        }
        on(btn, 'click', function () { shown = !shown; render(); });
        var chips = box.querySelectorAll('.cl-vm');
        for (var i = 0; i < chips.length; i++) {
            (function (c) {
                on(c, 'click', function () {
                    for (var j = 0; j < chips.length; j++) chips[j].classList.remove('sel');
                    c.classList.add('sel');
                    if (note) note.innerHTML = c.getAttribute('data-msg');
                });
            })(chips[i]);
        }
        render();
    })();

    /* ============================================================
     * ② 오버커밋 시뮬레이터 — 256GB 호스트에 320GB 판매
     * ============================================================ */
    (function overcommit() {
        var sl = $('cl-oc-slider'); if (!sl) return;
        var PHYS = 256, PER = 32, SOLD = 320;
        var fill = $('cl-oc-fill'), over = $('cl-oc-over'),
            stat = $('cl-oc-stat'), warn = $('cl-oc-warn'), cntv = $('cl-oc-cnt');
        function render() {
            var n = parseInt(sl.value, 10);
            var used = n * PER;
            if (cntv) cntv.textContent = n;
            var pctPhys = Math.min(used, PHYS) / PHYS * 100;
            var overAmt = Math.max(0, used - PHYS);
            var pctOver = Math.min(overAmt, PHYS) / PHYS * 100;
            if (fill) fill.style.width = pctPhys + '%';
            if (over) over.style.width = pctOver + '%';
            if (stat) stat.innerHTML = '약속 판매 <b>' + SOLD + 'GB</b> (32GB×10대) · 물리 실장 <b>' + PHYS + 'GB</b> · 지금 실제 사용 <b>' + used + 'GB</b>';
            if (warn) {
                if (used > PHYS) {
                    warn.style.display = 'block'; warn.style.color = '#ef5350';
                    warn.innerHTML = '⚠ 물리 RAM 초과 <b>' + overAmt + 'GB</b> 부족! 호스트가 메모리를 도로 회수하려 풍선(balloon)을 부풀리기 시작해.';
                } else if (used > PHYS * 0.85) {
                    warn.style.display = 'block'; warn.style.color = '#ffca28';
                    warn.innerHTML = '주의: 물리 한계에 근접. 한 대만 더 폭증해도 회수가 시작돼.';
                } else {
                    warn.style.display = 'none';
                }
            }
        }
        on(sl, 'input', render); render();
    })();

    /* ============================================================
     * ③ 풍선 드라이버 + uncooperative → 강제 리셋
     * ============================================================ */
    (function balloon() {
        var box = $('cl-bl-vm'); if (!box) return;
        var TOTAL = 32, game = 18;
        var balloonGB = 0, target = 0, reclaimed = 0, uncoop = false, dead = false, raf = null;
        var gEl = $('cl-bl-game'), bEl = $('cl-bl-balloon'), fEl = $('cl-bl-free');
        var stat = $('cl-bl-stat'), msg = $('cl-bl-msg');
        var btnReq = $('cl-bl-req'), btnRst = $('cl-bl-reset'), tog = $('cl-bl-uncoop');
        function pct(x) { return (x / TOTAL * 100) + '%'; }
        function draw() {
            var free = Math.max(0, TOTAL - game - balloonGB);
            if (gEl) gEl.style.width = pct(game);
            if (bEl) bEl.style.width = pct(balloonGB);
            if (fEl) fEl.style.width = pct(free);
            if (stat) stat.innerHTML = '게임 사용 <b>' + game + 'GB</b> · 풍선 <b>' + balloonGB.toFixed(0) +
                'GB</b> · 빈 메모리 <b>' + free.toFixed(0) + 'GB</b> · 호스트가 회수한 양 <b>' + reclaimed.toFixed(0) + 'GB</b>';
        }
        function animate() {
            if (balloonGB < target - 0.01) {
                balloonGB += Math.max(0.5, (target - balloonGB) * 0.18);
                if (balloonGB > target) balloonGB = target;
                reclaimed = balloonGB; draw();
                raf = requestAnimationFrame(animate);
            } else { balloonGB = target; reclaimed = balloonGB; draw(); }
        }
        function request() {
            if (dead) return;
            target = 10;
            if (uncoop) {
                if (msg) { msg.style.color = '#ef5350'; msg.innerHTML = '호스트: "10GB 돌려줘" → 풍선 드라이버 무응답…<br><b>uncooperative_balloon_driver = true</b>'; }
                setTimeout(killVM, 1100);
            } else {
                if (msg) { msg.style.color = '#81c784'; msg.innerHTML = '호스트: "10GB 돌려줘" → 풍선 드라이버가 풍선을 부풀려 메모리를 반납. 정상 협조 ✓'; }
                if (raf) cancelAnimationFrame(raf); animate();
            }
        }
        function killVM() {
            dead = true;
            box.classList.add('dead');
            if (msg) msg.innerHTML = '💥 호스트가 VM 을 <b>강제 리셋</b>! 게스트 OS 입장에선 갑자기 전원이 끊긴 것 → <b>Kernel-Power 41 (Bugcheck 없음)</b>. 약 1분 50초 후 자동 복구 부팅.';
        }
        function reset() {
            if (raf) cancelAnimationFrame(raf);
            balloonGB = 0; target = 0; reclaimed = 0; dead = false;
            box.classList.remove('dead');
            if (msg) { msg.style.color = '#90a4c4'; msg.textContent = '버튼을 눌러 호스트의 메모리 회수 요청을 보내봐. "협조 거부" 를 켜면 우리 한양3 사건이 그대로 재현돼.'; }
            draw();
        }
        on(btnReq, 'click', request);
        on(btnRst, 'click', reset);
        on(tog, 'change', function (e) { uncoop = e.target.checked; });
        reset();
    })();

    /* ============================================================
     * ④ 사건 타임라인 단계 빌드업
     * ============================================================ */
    (function timeline() {
        var wrap = $('cl-tl'); if (!wrap) return;
        var steps = wrap.querySelectorAll('.cl-tl-step');
        var next = $('cl-tl-next'), rst = $('cl-tl-reset'), prog = $('cl-tl-prog');
        var i = 0;
        function render() {
            for (var k = 0; k < steps.length; k++) steps[k].classList.toggle('on', k < i);
            if (prog) prog.textContent = i + ' / ' + steps.length + ' 단계';
            if (next) next.disabled = i >= steps.length;
        }
        on(next, 'click', function () { if (i < steps.length) { i++; render(); } });
        on(rst, 'click', function () { i = 0; render(); });
        render();
    })();
})();
