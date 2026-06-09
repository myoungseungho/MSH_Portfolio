// 고루틴 vs OS 스레드 — 동시성 메모리 비용 시뮬레이터
// 스레드 1MB/개, 고루틴 2KB/개. 8GB(=1머신) 기준. 수치는 구조를 보여주는 예시값.
(function () {
    'use strict';

    var THREAD_KB = 1024;   // OS 스레드 스택 ~1MB
    var GORO_KB = 2;        // 고루틴 시작 스택 ~2KB
    var LIMIT_MB = 8192;    // 8GB = 1 머신 기준
    var MARK_PCT = 70;      // 8GB 마커를 트랙의 70% 위치에 둠
    var cur = 10000;

    function fmtMem(mb) {
        if (mb >= 1024) {
            var gb = mb / 1024;
            return (gb >= 100 ? Math.round(gb) : gb.toFixed(1)) + ' GB';
        }
        return Math.round(mb) + ' MB';
    }

    function fmtCount(n) { return n.toLocaleString('en-US'); }

    function widthPct(mb) {
        // 8GB == MARK_PCT(%) 로 스케일. 초과분은 100%에 클램프.
        return Math.min(100, mb / LIMIT_MB * MARK_PCT);
    }

    var CAPS = {
        1000: '연결 1,000개. 스레드 모델도 <b>약 1GB</b>로 아직은 버틴다. 이 규모에선 둘 다 괜찮아서 차이가 안 보여.',
        10000: '연결 1만개. 스레드는 <b>약 10GB</b>로 벌써 한 머신(8GB)을 넘겼다. 고루틴은 <b>20MB</b> — 천 배 가까이 가볍다.',
        100000: '연결 10만개. 스레드 모델은 <b>약 98GB</b>가 필요해 사실상 불가능. 고루틴은 <b>약 195MB</b>로 노트북에서도 돈다.',
        1000000: '연결 100만개(C10M의 꿈). 스레드면 <b>약 977GB</b> — 농담이다. 고루틴은 <b>약 1.9GB</b>로 한 머신이 진지하게 노려볼 만하다. <b>이게 Go가 \"동접 괴물\" 서버에 쓰이는 이유.</b>'
    };

    function render() {
        var tMB = cur * THREAD_KB / 1024;
        var gMB = cur * GORO_KB / 1024;

        document.getElementById('go-tnum').textContent = fmtCount(cur) + '개 → ' + fmtMem(tMB);
        document.getElementById('go-gnum').textContent = fmtCount(cur) + '개 → ' + fmtMem(gMB);
        document.getElementById('go-tfill').style.width = widthPct(tMB).toFixed(1) + '%';
        document.getElementById('go-gfill').style.width = Math.max(1.5, widthPct(gMB)).toFixed(1) + '%';

        var tv = document.getElementById('go-tverdict');
        if (tMB > LIMIT_MB) {
            tv.className = 'go-num bad';
            tv.innerHTML = '❌ 8GB 한계 초과 (' + (tMB / LIMIT_MB).toFixed(1) + '배) — 머신이 못 버팀';
        } else {
            tv.className = 'go-num good';
            tv.innerHTML = '✅ 8GB 안 — 아직은 버팀';
        }
        var gv = document.getElementById('go-gverdict');
        gv.className = 'go-num good';
        gv.innerHTML = (gMB > LIMIT_MB ? '⚠ ' + fmtMem(gMB) + ' — 큰 머신 필요'
            : '✅ ' + fmtMem(gMB) + ' — 여유롭게 한 머신');

        document.getElementById('go-cap').innerHTML = CAPS[cur] || '';
    }

    function init() {
        var root = document.getElementById('gosim');
        if (!root) return;
        var btns = root.querySelectorAll('.go-pz');
        btns.forEach(function (b) {
            b.addEventListener('click', function () {
                btns.forEach(function (x) { x.classList.remove('active'); });
                b.classList.add('active');
                cur = parseInt(b.getAttribute('data-n'), 10);
                render();
            });
        });
        render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
