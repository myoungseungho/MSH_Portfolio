// 요청 레이턴시 분해 시뮬레이터 — "병목은 어디인가"
// 수치는 구조를 보여주기 위한 예시값 (단위: ms)
(function () {
    'use strict';

    var DATA = {
        login: {
            net: 0.50, ser: 0.05, logicCpp: 0.10, logicCs: 0.15, db: 8.00, gcNaive: 0.55,
            spike: '⚠ 간헐 GC 스파이크 +수십 ms → p99 지연으로 직격',
            cap: {
                base: '합계 <b>8.65ms vs 8.70ms — 차이 0.6%</b>. 병목은 DB 왕복 8ms다. 여기서 언어를 바꾸는 건 고속도로 정체 중에 차를 페라리로 바꾸는 것과 같다.',
                naive: '할당을 방치한 ③도 합계로는 9.25ms — DB가 지배해서 평균은 티가 안 난다. 진짜 문제는 간헐 GC 스파이크가 <b>p99 지연</b>으로 나타나는 것.',
                pooled: '풀링 적용 시 ③ = ②. <b>DB-bound 서버에서 언어 선택은 사실상 성능 문제가 아니다.</b> 생산성·안전성으로 결정할 일.'
            }
        },
        combat: {
            net: 0.30, ser: 0.40, logicCpp: 4.00, logicCs: 6.50, db: 0, gcNaive: 5.00,
            spike: '⚠ 간헐 GC 스파이크가 곧바로 틱 밀림(랙)으로 직결',
            cap: {
                base: '합계 <b>4.7ms vs 7.2ms — 53% 차이</b>. 매 틱 수백 명의 시야판정·충돌이 도는 CPU-bound에선 언어 차이가 실존한다. <b>C++을 고집할 이유가 있는 유일한 구간.</b>',
                naive: '할당까지 방치하면 12ms+. 30fps 틱 예산(33ms)은 아직 버티지만, GC 스파이크 한 방이면 틱이 밀린다. CPU-bound + 할당 방치 = 최악의 조합.',
                pooled: '풀링을 적용해도 C++보다 53% 느리다 — <b>이 서버만큼은 C++이 정당하다.</b> 단, AOI 알고리즘 개선(O(n²)→그리드)은 10배를 바꾼다는 것도 같이 기억할 것.'
            }
        },
        chat: {
            net: 4.50, ser: 0.20, logicCpp: 0.05, logicCs: 0.08, db: 0, gcNaive: 0.90,
            spike: '⚠ 브로드캐스트마다 새 메시지 객체 생성 → GC 압박 누적',
            cap: {
                base: '합계 <b>4.75ms vs 4.78ms — 사실상 동일</b>. 1,000명에게 복사·전송하는 시간은 커널과 네트워크 카드가 쓰는 것이지, 언어가 쓰는 게 아니다.',
                naive: '메시지 객체를 매번 새로 만들면(③) GC가 끼어들기 시작한다. 그래도 병목은 여전히 네트워크 쪽이다.',
                pooled: '버퍼 풀 적용 시 ③ = ②. I/O-bound 서버에선 오히려 C#의 async/await가 콜백 지옥을 없애는 생산성 무기가 된다.'
            }
        }
    };

    var curScenario = 'login';

    function fmt(v) { return (Math.round(v * 100) / 100).toFixed(2); }

    function buildRows(d, pooled) {
        var naiveGc = pooled ? 0.05 : d.gcNaive;
        var naiveLogic = pooled ? d.logicCs : d.logicCs * 1.1;
        return [
            { label: '① C++', net: d.net, ser: d.ser, logic: d.logicCpp, db: d.db, gc: 0 },
            { label: '② C# · 할당 관리', net: d.net, ser: d.ser, logic: d.logicCs, db: d.db, gc: 0 },
            { label: pooled ? '③ C# · 풀링 적용됨 ✅' : '③ C# · 할당 방치', net: d.net, ser: d.ser, logic: naiveLogic, db: d.db, gc: naiveGc, spiky: !pooled }
        ];
    }

    function render() {
        var d = DATA[curScenario];
        var pooled = document.getElementById('ls-pool').checked;
        var rows = buildRows(d, pooled);

        var maxTotal = 0;
        rows.forEach(function (r) {
            r.total = r.net + r.ser + r.logic + r.db + r.gc;
            if (r.total > maxTotal) maxTotal = r.total;
        });
        var cppTotal = rows[0].total;

        var html = '';
        rows.forEach(function (r, i) {
            var segs = [
                ['net', r.net], ['ser', r.ser], ['logic', r.logic], ['db', r.db], ['gc', r.gc]
            ];
            var segHtml = '';
            segs.forEach(function (s) {
                if (s[1] <= 0) return;
                var w = (s[1] / maxTotal) * 100;
                segHtml += '<div class="ls-seg ' + s[0] + '" style="width:' + w.toFixed(2) + '%" title="' + s[0] + ' ' + fmt(s[1]) + 'ms"></div>';
            });
            var diff = i === 0 ? '기준' : '+' + Math.round((r.total / cppTotal - 1) * 100) + '% vs C++';
            html += '<div class="ls-row">'
                + '<div class="ls-lbl">' + r.label + '</div>'
                + '<div class="ls-bar">' + segHtml + '</div>'
                + '<div class="ls-total">' + fmt(r.total) + 'ms<small class="' + (i > 0 ? 'worse' : '') + '">' + diff + '</small></div>'
                + '</div>';
            if (r.spiky) html += '<div class="ls-spike">' + d.spike + '</div>';
        });
        document.getElementById('ls-bars').innerHTML = html;
        document.getElementById('ls-caption').innerHTML = d.cap.base + '<br>' + (pooled ? d.cap.pooled : d.cap.naive);
    }

    function init() {
        var root = document.getElementById('latsim');
        if (!root) return;
        var tabs = root.querySelectorAll('.ls-tab');
        tabs.forEach(function (t) {
            t.addEventListener('click', function () {
                tabs.forEach(function (x) { x.classList.remove('active'); });
                t.classList.add('active');
                curScenario = t.getAttribute('data-sc');
                render();
            });
        });
        document.getElementById('ls-pool').addEventListener('change', render);
        render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
