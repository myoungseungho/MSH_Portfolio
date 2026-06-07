// 드로우콜 제출 시뮬레이터 — DX11(1코어 + 드라이버 오버헤드) vs DX12(멀티스레드 + 얇은 경로)
// 콜당 비용은 예시값: DX11 5µs(드라이버 포함) / DX12 1µs(4코어 분산)
(function () {
    'use strict';

    var GPU_MS = 8.0;            // 장면의 GPU 비용 (고정 — "같은 그림")
    var COST_DX11 = 0.005;       // ms per draw call (드라이버 검증·추적 포함)
    var COST_DX12 = 0.001;       // ms per draw call (얇은 제출 경로)
    var CORES = 4;               // DX12 커맨드 리스트 기록 워커 수
    var HITCH_MS = 35;           // DX11 런타임 셰이더 재컴파일 히치
    var HIST_N = 90;

    var api = 'dx11', calls = 3000, hitchOn = false;
    var history = [];
    var lastHitch = 0;

    var $ = function (id) { return document.getElementById(id); };
    function fmt(n) { return n.toLocaleString('ko-KR'); }

    function laneTimes() {
        // 각 코어의 제출 시간 (ms)
        if (api === 'dx11') {
            return [calls * COST_DX11 + 0.3, 0.2, 0.2, 0.2]; // Main 독박, 워커는 게임 로직 잔여
        }
        var per = (calls * COST_DX12) / CORES + 0.3;
        return [per, per, per, per];
    }

    function frameTime(withHitch) {
        var lanes = laneTimes();
        var cpu = Math.max.apply(null, lanes);
        var ft = Math.max(GPU_MS, cpu);
        if (withHitch) ft += HITCH_MS;
        return ft;
    }

    function caption() {
        var ft = frameTime(false);
        var cpuSubmit = api === 'dx11' ? calls * COST_DX11 : calls * COST_DX12;
        var gpuBound = ft <= GPU_MS + 0.05;
        var c = '';
        if (api === 'dx11') {
            if (gpuBound) {
                c = '지금은 <b>GPU-bound</b> (제출 ' + cpuSubmit.toFixed(1) + 'ms &lt; GPU 8ms). 이 구간에선 DX12로 바꿔도 FPS가 <b>똑같다</b> — DX12가 만능이 아닌 이유. 슬라이더를 밀어서 물체를 늘려봐.';
            } else {
                c = '<b>CPU-bound 진입.</b> Main 코어 혼자 ' + cpuSubmit.toFixed(1) + 'ms를 제출에 쓰고, 나머지 코어는 놀고 있다. GPU는 8ms면 끝나는데 <b>일감이 안 와서 굶는 중</b> — DX11 시대 "드로우콜 예산"의 정체.';
            }
            if (hitchOn) c += '<br>⚡ 2초마다 끼어드는 빨간 스파이크 = 새 셰이더 조합을 드라이버가 <b>그 자리에서</b> 재컴파일(예시 35ms). 내 코드가 아니라서 프로파일러에도 안 잡힌다.';
        } else {
            if (gpuBound) {
                c = '제출이 4코어로 흩어져 코어당 ' + (cpuSubmit / CORES + 0.3).toFixed(1) + 'ms — 병목은 GPU 8ms로 돌아왔다. <b>이게 정상 상태야:</b> CPU가 GPU를 굶기지 않는 것이 DX12의 목표 전부다.';
            } else {
                c = '드로우콜 ' + fmt(calls) + '개에서도 코어당 ' + (cpuSubmit / CORES + 0.3).toFixed(1) + 'ms — 같은 장면이 DX11에선 ' + (calls * COST_DX11).toFixed(0) + 'ms 걸렸다.';
            }
            if (hitchOn) c += '<br>✅ 같은 이펙트가 등장해도 스파이크가 없다 — PSO를 <b>로딩 때 미리 컴파일</b>했기 때문. 단, 그 비용은 공짜가 아니라 로딩 화면("셰이더 최적화 중...")에서 이미 지불했다.';
        }
        return c;
    }

    function render(ft, isHitchFrame) {
        var lanes = laneTimes();
        var names = api === 'dx11' ? ['Main (제출)', 'Worker 1', 'Worker 2', 'Worker 3'] : ['Main (CL 기록)', 'Worker 1 (CL)', 'Worker 2 (CL)', 'Worker 3 (CL)'];
        var scaleMax = 60; // ms
        var html = '';
        for (var i = 0; i < 4; i++) {
            var w = Math.min(100, lanes[i] / scaleMax * 100);
            var hot = lanes[i] > 16.6;
            var idle = api === 'dx11' && i > 0;
            html += '<div class="dx-lane">'
                + '<div class="dx-lane-lbl">' + names[i] + '</div>'
                + '<div class="dx-lane-bar"><div class="dx-lane-fill' + (hot ? ' hot' : '') + '" style="width:' + w + '%"></div>'
                + '<div class="dx-budget" style="left:' + (16.6 / scaleMax * 100) + '%"></div></div>'
                + '<div class="dx-lane-ms">' + lanes[i].toFixed(1) + 'ms' + (idle ? ' 💤' : '') + '</div>'
                + '</div>';
        }
        $('dx-lane-rows').innerHTML = html;

        // 프레임타임 히스토리
        history.push({ ft: ft, hitch: isHitchFrame });
        if (history.length > HIST_N) history.shift();
        var hh = '';
        for (var j = 0; j < history.length; j++) {
            var h = history[j];
            var hPct = Math.min(100, h.ft / 60 * 100);
            var cls = h.hitch ? ' spike' : (h.ft > 16.7 ? ' warn' : '');
            hh += '<div class="dx-hbar' + cls + '" style="height:' + hPct + '%"></div>';
        }
        $('dx-history').innerHTML = hh;

        var fps = 1000 / ft;
        var ftEl = $('dx-ft'); ftEl.textContent = ft.toFixed(1) + 'ms';
        ftEl.className = ft > 33.4 ? 'bad' : (ft > 16.7 ? '' : 'good');
        var fpsEl = $('dx-fps'); fpsEl.textContent = Math.round(fps);
        fpsEl.className = fps < 30 ? 'bad' : (fps >= 60 ? 'good' : '');
        var submit = api === 'dx11' ? calls * COST_DX11 : calls * COST_DX12;
        $('dx-cpu').textContent = submit.toFixed(1) + 'ms';
        $('dx-cores').textContent = api === 'dx11' ? '1 / 4' : '4 / 4';
        $('dx-caption').innerHTML = caption();
    }

    function tick(ts) {
        var isHitch = false;
        if (hitchOn && api === 'dx11' && ts - lastHitch > 2000) {
            lastHitch = ts;
            isHitch = true;
        }
        render(frameTime(isHitch), isHitch);
    }

    function init() {
        var root = $('dxsim');
        if (!root) return;
        $('dx-11').addEventListener('click', function () {
            api = 'dx11'; history = [];
            $('dx-11').classList.add('active'); $('dx-12').classList.remove('active');
        });
        $('dx-12').addEventListener('click', function () {
            api = 'dx12'; history = [];
            $('dx-12').classList.add('active'); $('dx-11').classList.remove('active');
        });
        $('dx-calls').addEventListener('input', function (e) {
            calls = parseInt(e.target.value, 10);
            $('dx-calls-v').textContent = fmt(calls);
        });
        $('dx-hitch').addEventListener('change', function (e) { hitchOn = e.target.checked; });

        // 시뮬레이션 주기: 표시용 10fps 면 충분 (히스토리가 흐르는 게 보이도록)
        var last = 0;
        function loop(ts) {
            if (ts - last > 100) { last = ts; tick(ts); }
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
