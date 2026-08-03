/* network-gate-cpu — 밀집도 → 게임서버 판단 횟수 vs 게이트 커널 왕복 횟수 비교
   구조를 보여주기 위한 예시 계산값 (실측 아님) */
(function () {
    'use strict';

    var root = document.getElementById('w-fanout');
    if (!root) return;

    var elN = document.getElementById('gc-n');
    var elR = document.getElementById('gc-r');
    var elNv = document.getElementById('gc-n-v');
    var elRv = document.getElementById('gc-r-v');
    var barGame = document.getElementById('gc-bar-game');
    var barGate = document.getElementById('gc-bar-gate');
    var numGame = document.getElementById('gc-num-game');
    var numGate = document.getElementById('gc-num-gate');
    var elRatio = document.getElementById('gc-ratio');
    var elDown = document.getElementById('gc-down');
    var elBytes = document.getElementById('gc-bytes');
    var elCap = document.getElementById('gc-cap');
    var elFormula = document.getElementById('gc-formula');
    var fragBtns = root.querySelectorAll('[data-frag]');

    var frag = 1;

    function fmt(n) {
        return Math.round(n).toLocaleString('ko-KR');
    }

    function update() {
        var N = parseInt(elN.value, 10);
        var r = parseInt(elR.value, 10);

        // 업스트림: 각자 자기 패킷을 올린다
        var up = N * r;
        // 다운스트림: 한 명의 행동이 나머지 N-1 명에게 개별 배달된다 (N^2 fan-out)
        var down = N * r * (N - 1);

        // 게임서버: 올라온 것마다 판단 1번. 내려보낼 땐 게이트로 가는 소켓 1개라 묶여서 나간다.
        var gameOps = up;
        // 게이트: 수신은 조각마다 (완료통지 + 재요청) 2회, 클라로 내려보낼 땐 소켓이 전부 달라 개별 송신
        var gateOps = up * frag * 2 + down;

        var max = Math.max(gameOps, gateOps, 1);
        barGame.style.width = (gameOps / max * 100) + '%';
        barGate.style.width = (gateOps / max * 100) + '%';
        numGame.textContent = fmt(gameOps) + ' 회/초';
        numGate.textContent = fmt(gateOps) + ' 회/초';

        elNv.textContent = N + '명';
        elRv.textContent = r + '개';
        elRatio.textContent = (gateOps / Math.max(gameOps, 1)).toFixed(1) + ' 배';
        elDown.textContent = fmt(down) + ' 개/초';
        elBytes.textContent = fmt((up + down) * 60 / 1024) + ' KB/초';

        var msg;
        if (N <= 3) {
            msg = '한적하지? 이럴 땐 게이트도 거의 놀아. 소켓이 붙어만 있는 건 CPU를 안 먹거든.';
        } else if (N <= 15) {
            msg = '사람이 늘수록 게이트 막대만 빠르게 길어져. 게임서버 일은 인원에 비례(N)하는데, 게이트 일은 인원의 제곱(N²)에 비례하기 때문이야.';
        } else {
            msg = '공성전급 밀집이야. 게임서버는 여전히 "판단"만 하는데, 게이트는 그 결과를 소켓마다 1개씩 나눠 담느라 폭발해. 옮기는 바이트는 몇백 KB밖에 안 되는데도 CPU가 타는 이유가 이거야.';
        }
        if (frag > 1) {
            msg += ' 망이 불량해서 조각이 ' + frag + '개로 쪼개지면, 같은 바이트인데 받는 쪽 출동만 ' + frag + '배가 돼 (바이트 칸은 그대로인 걸 확인해봐).';
        }
        elCap.textContent = msg;

        if (elFormula) {
            elFormula.textContent =
                '이 위젯이 쓰는 식 (N=' + N + ', R=' + r + ', 조각=' + frag + ')\n' +
                '  올라감  = N × R                      = ' + fmt(up) + '\n' +
                '  내려감  = N × R × (N-1)   ← N² 항    = ' + fmt(down) + '\n' +
                '  게임서버 = 올라감                     = ' + fmt(gameOps) + '\n' +
                '  게이트   = 올라감 × 조각 × 2 + 내려감 = ' + fmt(gateOps) + '\n' +
                '           (×2 = 완료통지 1 + 재요청 1, 내려감은 소켓당 1개씩이라 묶이지 않음)\n' +
                '※ 실측이 아니라 구조 비교용. 실제로는 락 경합·소켓 내 배칭·커널 스케줄링이 더 얽힌다.';
        }
    }

    elN.addEventListener('input', update);
    elR.addEventListener('input', update);

    Array.prototype.forEach.call(fragBtns, function (btn) {
        btn.addEventListener('click', function () {
            Array.prototype.forEach.call(fragBtns, function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            frag = parseInt(btn.getAttribute('data-frag'), 10);
            update();
        });
    });

    update();
})();
