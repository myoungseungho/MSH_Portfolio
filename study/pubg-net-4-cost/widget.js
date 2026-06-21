// 4장 — 한 틱 시간 분해 DOM 막대: 생존 인원↑ → Net Flush(직렬화)가 프레임을 삼킨다
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var slider = $('pn4-actors');
    if (!slider) return;

    function model(a) {
        var dispatch = 5 + 0.30 * a;
        var sim = 8 + 0.24 * a;
        var flush = 3 + 0.004963 * a * a; // 90명에서 ≈43.2ms
        var total = dispatch + sim + flush;
        return { dispatch: dispatch, sim: sim, flush: flush, total: total, ser: flush * 0.85, pct: flush / total * 100 };
    }

    function setSeg(el, frac, label, ms) {
        el.style.width = (frac * 100) + '%';
        el.textContent = frac > 0.13 ? (label + ' ' + ms.toFixed(0) + 'ms') : (frac > 0.06 ? ms.toFixed(0) : '');
    }

    function update() {
        var a = parseInt(slider.value, 10);
        $('pn4-actors-v').textContent = a;
        var m = model(a);
        setSeg($('pn4-d'), m.dispatch / m.total, 'Dispatch', m.dispatch);
        setSeg($('pn4-s'), m.sim / m.total, 'Simulate', m.sim);
        setSeg($('pn4-f'), m.flush / m.total, 'Net Flush', m.flush);
        $('pn4-total').textContent = m.total.toFixed(1);
        $('pn4-pct').textContent = m.pct.toFixed(0);
        $('pn4-ser').textContent = m.ser.toFixed(1);
        var pct = $('pn4-pct');
        pct.style.color = m.pct >= 38 ? '#ef5350' : '#fff';
    }

    slider.addEventListener('input', update);
    update();
    window.__pn4Ready = true;
})();
