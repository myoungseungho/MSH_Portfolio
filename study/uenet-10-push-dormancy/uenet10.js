/* uenet-10-push-dormancy — Pull(전수검사) vs Push(더티만) vs Dormancy(잠재움) 틱당 검사량 */
(function () {
  "use strict";
  var canvas = document.getElementById("ue10-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 350;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var NA = 8, NP = 4, TOTAL = NA * NP;
  var st = { mode: "pull", running: true, acc: 0, checks: 0, saved: 0, cells: [], dormant: [], tickN: 0 };
  function init() { st.cells = []; for (var a = 0; a < NA; a++) { st.cells[a] = []; for (var p = 0; p < NP; p++) st.cells[a][p] = 0; } st.dormant = []; for (var a = 0; a < NA; a++) st.dormant[a] = (st.mode === "dormancy" && a >= 2); }
  var C = { bg: "#0e1426", cell: "#243049", check: "#ffca28", dirty: "#ef5350", dorm: "#1a2336", text: "#e3eaf5", sub: "#90a4c4", ok: "#66bb6a" };

  var GX = 180, GY = 40, CWp = 60, CHp = 30, GAP = 6, RGAP = 5;

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function tick() {
    st.tickN++; var checked = 0;
    for (var a = 0; a < NA; a++) for (var p = 0; p < NP; p++) st.cells[a][p] = 0;
    if (st.mode === "pull") {
      for (var a = 0; a < NA; a++) for (var p = 0; p < NP; p++) { st.cells[a][p] = 1; checked++; }
    } else if (st.mode === "push") {
      var dirtyCount = 2 + ((Math.random() * 3) | 0);
      for (var i = 0; i < dirtyCount; i++) { var a = (Math.random() * NA) | 0, p = (Math.random() * NP) | 0; st.cells[a][p] = 2; checked++; }
    } else {
      for (var a = 0; a < 2; a++) { var d = 1 + ((Math.random() * 2) | 0); for (var i = 0; i < d; i++) { var p = (Math.random() * NP) | 0; st.cells[a][p] = 2; checked++; } }
    }
    st.checks = checked; st.saved += (TOTAL - checked);
    setText("ue10-checks", st.checks + " / " + TOTAL); setText("ue10-saved", st.saved);
  }

  function update(dt) { st.acc += dt; if (st.acc > 0.85) { st.acc = 0; tick(); } }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("액터 " + NA + " × 속성 " + NP + " = " + TOTAL + "개. 매 틱 무엇을 '검사'하나?", 20, 24);
    for (var a = 0; a < NA; a++) {
      var ry = GY + a * (CHp + RGAP);
      ctx.fillStyle = st.dormant[a] ? "#46506a" : C.sub; ctx.textAlign = "left"; ctx.font = "600 11px 'Segoe UI',sans-serif";
      ctx.fillText((st.dormant[a] ? "💤 " : "") + "Actor " + (a + 1), 20, ry + CHp / 2 + 4);
      for (var p = 0; p < NP; p++) {
        var x = GX + p * (CWp + GAP);
        rr(x, ry, CWp, CHp, 6);
        var v = st.cells[a][p];
        ctx.fillStyle = st.dormant[a] ? C.dorm : (v === 1 ? C.check : (v === 2 ? C.dirty : C.cell)); ctx.fill();
      }
    }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    var msg = st.mode === "pull" ? "Pull: 매 틱 전부(노랑) 비교 — 안 바뀐 것도 다 검사(낭비)" : st.mode === "push" ? "Push: 바뀐 것(빨강)만 검사 — 나머지는 건너뜀" : "Dormancy: 안 변하는 액터(💤)는 통째로 잠재움 — 검사 0";
    ctx.fillText(msg, LW / 2, LH - 14);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue10-caption"); if (!c) return;
    c.textContent = st.mode === "pull"
      ? "Pull(기본): 엔진이 매 틱 '모든 복제 속성'을 이전 값과 비교해서 바뀐 걸 찾아. 안 바뀐 것도 다 검사하니, 액터·속성이 많아지면 비교만으로도 비싸."
      : st.mode === "push"
        ? "Push Model: '나 바뀌었어'라고 표시(MARK_PROPERTY_DIRTY)된 것만 검사해. 안 바뀐 건 아예 안 들여다봐 — 우리 더티플래그랑 똑같은 발상이야."
        : "Dormancy: 한동안 안 변할 액터(가구, 멈춘 NPC)는 아예 '휴면' 상태로 잠재워. 깨어날 일(FlushNetDormancy) 전엔 검사도 복제도 0. 가장 센 절약.";
  }
  function sel(m) { st.mode = m; init(); st.checks = 0; st.saved = 0; var t = document.querySelectorAll(".ue10tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".ue10tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("ue10-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  init(); setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { tick(); draw(); var n = document.getElementById("ue10-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
