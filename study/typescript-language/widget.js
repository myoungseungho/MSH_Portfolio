// TypeScript 켜기/끄기 — 같은 오타 버그가 '언제' 잡히나
(function () {
    'use strict';

    var CODE_JS =
        '<span class="cmt">// 그냥 JavaScript — 타입 검사 없음</span>\n' +
        'function getUser(id) {\n' +
        '  return { name: "철수", level: 5 };\n' +
        '}\n' +
        'const u = getUser(1);\n' +
        'console.log("환영합니다 " + u.<span class="err">nmae</span>);   <span class="cmt">// ← name 오타</span>';

    var CODE_TS =
        '<span class="cmt">// TypeScript — 타입 검사 켜짐</span>\n' +
        'function getUser(id: number) {\n' +
        '  return { name: "철수", level: 5 };\n' +
        '}\n' +
        'const u = getUser(1);\n' +
        'console.log("환영합니다 " + u.<span class="err">nmae</span>);   <span class="cmt">// ← name 오타</span>';

    function render() {
        var on = document.getElementById('ts-on').checked;
        document.getElementById('ts-code').innerHTML = on ? CODE_TS : CODE_JS;

        var t1 = document.getElementById('ts-tier1');
        var t2 = document.getElementById('ts-tier2');
        var i1 = document.getElementById('ts-i1');
        var i2 = document.getElementById('ts-i2');
        var d1 = document.getElementById('ts-d1');
        var d2 = document.getElementById('ts-d2');
        var cap = document.getElementById('ts-cap');

        if (on) {
            // TS: 1층(컴파일)에서 잡힘
            t1.className = 'ts-tier caught';
            i1.textContent = '❌';
            d1.innerHTML = '<b style="color:#ef9a9a">tsc: Property \'nmae\' does not exist on type \'{ name: string; level: number }\'. Did you mean \'name\'?</b> — 실행도 안 했는데 빌드에서 즉시 잡힘';
            t2.className = 'ts-tier passcheap';
            i2.textContent = '🛡';
            d2.innerHTML = '도달하지 않음 — 버그가 여기까지 못 옴 (E2E를 돌릴 필요도 없음)';
            cap.innerHTML = '✅ <span class="hl">1층(컴파일)에서 공짜로 잡았다.</span> AI라면 실행도 안 하고 <b>밀리초 만에</b> "여기 오타" 신호를 받아 바로 고친다. 검증 루프가 싸고 빠르다.';
        } else {
            // JS: 1층 통과(검사 없음), 2층(실행)에서 터짐
            t1.className = 'ts-tier';
            i1.textContent = '⬜';
            d1.innerHTML = '검사 단계가 <b>아예 없음</b> — JS는 컴파일 타입 검사를 안 함. 그대로 통과';
            t2.className = 'ts-tier boom';
            i2.textContent = '💥';
            d2.innerHTML = '<b style="color:#ef9a9a">런타임: "환영합니다 undefined"</b> — 버그가 사용자 화면까지 도달. 실행해서 이 줄을 밟아야만 발견';
            cap.innerHTML = '💥 <span class="hl">버그가 2층(실행)까지 살아남았다.</span> AI라면 무겁고 느린 <b>E2E를 한 바퀴(수십 초~분)</b> 돌려야 발견하고, 그 코드 경로를 안 밟으면 영영 놓칠 수도 있다.';
        }
    }

    function init() {
        var root = document.getElementById('tssim');
        if (!root) return;
        document.getElementById('ts-on').addEventListener('change', render);
        render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
