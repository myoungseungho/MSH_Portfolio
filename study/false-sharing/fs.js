/* false-sharing — 두 변수가 같은 캐시라인이면 코어 간 라인이 핑퐁(느림) vs 패딩(빠름) */
(function () {
  "use strict";
  var canvas = document.getElementById("fs-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 320;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var st = { mode: "false", running: true, ops: 0, bounce: 0, owner: 0, acc: 0, flashL: 0, flashR: 0, lineFlash: 0 };
  var C = { bg: "#0e1426", core: "#42a5f5", coreHot: "#66bb6a", line: "#5c6bc0", lineHot: "#ef5350", text: "#e3eaf5", sub: "#90a4c4", bad: "#ef5350", good: "#66bb6a" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function opInterval() { return st.mode === "false" ? 0.32 : 0.09; } // false sharing = 코어 간 무효화로 느림

  function update(dt) {
    st.acc += dt;
    while (st.acc >= opInterval()) {
      st.acc -= opInterval();
      st.ops++;
      if (st.mode === "false") {
        var writer = st.ops % 2; // 두 코어 번갈아
        if (writer !== st.owner) { st.bounce++; st.owner = writer; st.lineFlash = 0.3; }
        if (writer === 0) st.flashL = 0.2; else st.flashR = 0.2;
      } else { st.flashL = 0.15; st.flashR = 0.15; }
    }
    [["flashL"], ["flashR"], ["lineFlash"]].forEach(function (k) { if (st[k[0]] > 0) st[k[0]] -= dt; });
    setText("fs-ops", st.ops); setText("fs-bounce", st.mode === "false" ? st.bounce : 0);
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    // 코어
    rr(40, 110, 150, 80, 12); ctx.fillStyle = st.flashL > 0 ? C.coreHot : C.core; ctx.fill();
    rr(530, 110, 150, 80, 12); ctx.fillStyle = st.flashR > 0 ? C.coreHot : C.core; ctx.fill();
    ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 14px 'Segoe UI',sans-serif";
    ctx.fillText("코어 1", 115, 142); ctx.fillText("코어 2", 605, 142);
    ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.fillText("변수 A++", 115, 162); ctx.fillText("변수 B++", 605, 162); ctx.textBaseline = "alphabetic";
    if (st.mode === "false") {
      // 같은 캐시라인 하나, 가운데서 코어로 핑퐁
      var lx = st.owner === 0 ? 260 : 460;
      rr(lx, 120, 150, 60, 10); ctx.fillStyle = st.lineFlash > 0 ? C.lineHot : C.line; ctx.fill();
      ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 12px 'Segoe UI',sans-serif"; ctx.fillText("캐시라인 [A|B]", lx + 75, 150); ctx.textBaseline = "alphabetic";
      // 핑퐁 화살표
      ctx.strokeStyle = C.bad; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(190, 150); ctx.lineTo(530, 150); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.bad; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
      ctx.fillText("A와 B가 같은 캐시라인 → 한쪽이 쓰면 상대 코어 캐시 무효화 → 라인 핑퐁(느림)", LW / 2, 230);
    } else {
      rr(230, 90, 110, 50, 10); ctx.fillStyle = st.flashL > 0 ? C.lineHot : C.line; ctx.fill();
      rr(380, 160, 110, 50, 10); ctx.fillStyle = st.flashR > 0 ? C.lineHot : C.line; ctx.fill();
      ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 11px 'Segoe UI',sans-serif"; ctx.fillText("캐시라인 [A|pad]", 285, 115); ctx.fillText("캐시라인 [B|pad]", 435, 185); ctx.textBaseline = "alphabetic";
      ctx.fillStyle = C.good; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
      ctx.fillText("패딩으로 A·B를 다른 캐시라인에 → 서로 간섭 없음 → 각자 빠르게", LW / 2, 240);
    }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "false" ? "같은 처리인데 처리량이 확 낮아 — 코드는 멀쩡한데 느린 '보이지 않는' 버그" : "변수 하나에 패딩(64B 정렬)만 줬을 뿐인데 몇 배 빨라짐", LW / 2, LH - 14);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("fs-caption"); if (!c) return;
    c.textContent = st.mode === "false"
      ? "false sharing(거짓 공유): 두 코어가 '서로 다른 변수' A, B를 건드리는데, 둘이 우연히 같은 캐시라인(64바이트)에 들어 있으면 — 한 코어가 A를 쓸 때마다 그 라인 전체가 무효화돼 상대 코어가 B를 다시 읽어와야 해. 라인이 코어 사이를 핑퐁하며 엄청 느려져. 논리적으론 공유가 없는데 하드웨어가 공유로 취급하는 거야."
      : "해결 — 패딩/정렬: 각 변수를 별도 캐시라인에 놓이게 패딩을 넣거나 64바이트 정렬을 해. 그러면 A와 B가 다른 라인이라 서로 무효화하지 않아 — 코드 로직은 그대로인데 처리량이 몇 배로 뛰어.";
  }
  function sel(m) { st.mode = m; st.ops = 0; st.bounce = 0; st.acc = 0; var t = document.querySelectorAll(".fstab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".fstab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("fs-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { st.ops = 40; st.bounce = 38; draw(); var n = document.getElementById("fs-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
