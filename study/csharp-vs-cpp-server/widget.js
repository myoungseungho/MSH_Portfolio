// GC 세팅 빌드업 시뮬레이터 — "어떤 세팅을 켜면 얼마나 빨라지나"
// 한 전투 틱의 최악 프레임 시간(worst-case). 수치는 구조를 보여주는 예시값 (단위: ms)
(function () {
    'use strict';

    var LOGIC = 6.0;       // 게임 로직 (고정, CPU 작업)
    var GC_BASE = 45.0;    // 기본 Workstation GC + 할당 방치 시 최악 gen2 정지
    var CPP = 6.0;         // C++ 수동 관리 (GC 없음) 비교 기준
    var BUDGET60 = 16.6;   // 60fps 프레임 예산
    var BUDGET30 = 33.3;   // 30fps 프레임 예산
    var SCALE = 56;        // 막대 100% = 56ms 로 스케일 (54ms 까지 보이게)

    function calc() {
        var server = document.getElementById('gc-server').checked;
        var bg = document.getElementById('gc-bg').checked;
        var zero = document.getElementById('gc-zero').checked;
        var aot = document.getElementById('gc-aot').checked;

        var gc;
        if (zero) {
            gc = 0.3;                       // 쓰레기를 안 만드니 GC 정지 거의 0
        } else {
            gc = GC_BASE;
            if (server) gc *= 0.31;         // 코어별 병렬 → 정지 갈래로 분산
            if (bg) gc *= 0.28;             // gen2 동시 청소 → 실제 STW 구간만 남김
        }
        var jit = aot ? 0.0 : 0.4;          // 워밍업/잔여 지터
        return { gc: gc, jit: jit, total: LOGIC + gc + jit, server: server, bg: bg, zero: zero, aot: aot };
    }

    function pct(ms) { return Math.min(100, (ms / SCALE) * 100); }

    function renderStage(r) {
        var stage = document.getElementById('gc-stage');
        var logicW = pct(LOGIC);
        var gcW = pct(r.gc + r.jit);
        var ok = (r.gc + r.jit) < 1.0;
        var html = '';
        html += '<div class="gc-seg logic" style="width:' + logicW.toFixed(2) + '%">로직 ' + LOGIC.toFixed(1) + '</div>';
        html += '<div class="gc-seg gc' + (ok ? ' ok' : '') + '" style="left:' + logicW.toFixed(2) + '%;width:' + gcW.toFixed(2) + '%">'
            + (gcW > 7 ? 'GC ' + (r.gc + r.jit).toFixed(1) : '') + '</div>';
        // 예산 마커
        html += '<div class="gc-marker" style="left:' + pct(BUDGET60).toFixed(2) + '%"></div>';
        html += '<div class="gc-mlabel" style="left:' + pct(BUDGET60).toFixed(2) + '%">60fps 16.6</div>';
        html += '<div class="gc-marker b30" style="left:' + pct(BUDGET30).toFixed(2) + '%"></div>';
        html += '<div class="gc-mlabel b30" style="left:' + pct(BUDGET30).toFixed(2) + '%">30fps 33</div>';
        stage.innerHTML = html;
    }

    function renderRef() {
        var ref = document.getElementById('gc-ref');
        ref.innerHTML = '<div class="gc-seg" style="width:' + pct(CPP).toFixed(2) + '%">C++ ' + CPP.toFixed(1) + 'ms (GC 없음)</div>';
    }

    function renderVerdict(r) {
        var v = document.getElementById('gc-verdict');
        var t = r.total;
        var cls, head;
        if (t > BUDGET30) { cls = 'bad'; head = '❌ 30fps도 못 지킴 — 눈에 띄는 랙'; }
        else if (t > BUDGET60) { cls = 'warn'; head = '⚠ 30fps는 버티지만 60fps 초과'; }
        else { cls = 'good'; head = '✅ 60fps 예산 안 — 안 끊김'; }

        var msg = '';
        if (!r.server && !r.bg && !r.zero && !r.aot) {
            msg = '<b>아무 세팅도 안 켠 기본 C#</b> (옛날 Workstation GC + 할당 방치). gen2 풀 수거가 한 방에 들어오면 한 프레임이 ' + t.toFixed(0) + 'ms — 6프레임이 증발한다. 네가 기억하는 \'느린 C#\'이 바로 이 상태다.';
        } else if (r.zero) {
            msg = '<b>zero-allocation을 켜는 순간</b> GC가 올 일이 없어져서 ① Server GC·② Background GC를 켜든 말든 결과가 거의 같다. C++(' + CPP.toFixed(1) + 'ms)에 <b>' + (t - CPP).toFixed(1) + 'ms 차</b>까지 따라붙는다. 대신 이 코드는 더 이상 \'편한 C#\'이 아니다 — Span 수명·풀 반납을 직접 챙겨야 한다.';
        } else {
            var parts = [];
            if (r.server) parts.push('Server GC(코어별 병렬)');
            if (r.bg) parts.push('Background GC(동시 청소)');
            if (r.aot) parts.push('NativeAOT(워밍업 제거)');
            msg = '<b>' + parts.join(' + ') + '</b> 적용. GC 정지가 ' + r.gc.toFixed(1) + 'ms로 줄었다. 세팅만으로 여기까지 오지만, <b>0에 닿진 않는다</b> — 마지막 한 걸음은 ③ zero-allocation이다.';
        }
        v.innerHTML = '<div class="gc-big ' + cls + '">' + t.toFixed(1) + 'ms <span style="font-size:.9rem;font-weight:700">/ 최악 프레임</span></div>'
            + '<div style="margin:6px 0 10px;color:#fff;font-weight:600">' + head + '</div>' + msg;
    }

    function render() {
        var r = calc();
        renderStage(r);
        renderVerdict(r);
    }

    function init() {
        var root = document.getElementById('gcsim');
        if (!root) return;
        ['gc-server', 'gc-bg', 'gc-zero', 'gc-aot'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('change', render);
        });
        renderRef();
        render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
