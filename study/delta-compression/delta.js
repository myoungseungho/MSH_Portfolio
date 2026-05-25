/* delta-compression — 전체 스냅샷 vs 델타(바뀐 필드만 + 비트마스크) 대역폭 */
(function () {
  "use strict";
  var canvas = document.getElementById("dc-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 320;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var FIELDS = ["pos.x", "pos.y", "hp", "ammo", "state", "name"];
  var FB = 2; // 필드당 2바이트
  var st = { mode: "delta", running: true, acc: 0, changed: [], cum: 0, cumFull: 0, last: [] };
  var C = { bg: "#0e1426", field: "#243049", chg: "#ffca28", base: "#37474f", full: "#ef5350", delta: "#66bb6a", text: "#e3eaf5", sub: "#90a4c4" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function tick() {
    st.changed = [];
    var n = (Math.random() * 4) | 0; // 0..3 필드 변경
    var pool = [0, 1, 2, 3, 4, 5];
    for (var i = 0; i < n; i++) { var k = (Math.random() * pool.length) | 0; st.changed.push(pool[k]); pool.splice(k, 1); }
    var full = FIELDS.length * FB; // 12
    var delta = st.changed.length === 0 ? 1 : 1 + st.changed.length * FB; // 비트마스크 1B + 변경필드
    st.cum += (st.mode === "full" ? full : delta);
    st.cumFull += full;
    st.last.push(st.mode === "full" ? full : delta); if (st.last.length > 30) st.last.shift();
    setText("dc-cum", st.cum + "B");
    setText("dc-save", st.cumFull ? Math.round((1 - st.cum / st.cumFull) * 100) + "%" : "0%");
  }
  function update(dt) { st.acc += dt; if (st.acc > 0.6) { st.acc = 0; tick(); } }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("상태 객체 (필드 6개 × 2B)", 24, 24);
    // 필드 박스
    var fw = 100, gap = 10, x0 = 24, y0 = 40;
    for (var i = 0; i < FIELDS.length; i++) {
      var x = x0 + (i % 6) * (fw + gap);
      var chg = st.changed.indexOf(i) >= 0 || st.mode === "full";
      rr(x, y0, fw, 40, 8); ctx.fillStyle = (st.changed.indexOf(i) >= 0) ? C.chg : (st.mode === "full" ? "#3a4a5a" : C.field); ctx.fill();
      ctx.fillStyle = (st.changed.indexOf(i) >= 0) ? "#0c1220" : C.sub; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 12px 'Segoe UI',sans-serif";
      ctx.fillText(FIELDS[i], x + fw / 2, y0 + 20); ctx.textBaseline = "alphabetic";
    }
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.font = "600 11px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "full" ? "전체 스냅샷: 안 바뀐 것도 전부 전송" : "델타: 노란(바뀐) 필드 + 비트마스크 1B만 전송", 24, y0 + 60);
    // 막대 그래프
    var GY = 140, GH = 130, MAXB = 13;
    var y12 = GY + GH - (12 / MAXB) * GH;
    ctx.strokeStyle = "rgba(239,83,80,0.4)"; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(24, y12); ctx.lineTo(LW - 24, y12); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(239,83,80,0.7)"; ctx.font = "600 10px 'Segoe UI',sans-serif"; ctx.fillText("전체 12B", LW - 70, y12 - 4);
    var bw = (LW - 48) / 30;
    for (var i = 0; i < st.last.length; i++) { var b = st.last[i], h = b / MAXB * GH; rr(24 + i * bw + 1, GY + GH - h, bw - 2, h, 2); ctx.fillStyle = st.mode === "full" ? C.full : C.delta; ctx.fill(); }
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("dc-caption"); if (!c) return;
    c.textContent = st.mode === "full"
      ? "전체 스냅샷: 매 틱 6개 필드 전부(12B)를 보내. 안 바뀐 hp·name까지 매번 — 단순하지만 낭비가 커."
      : "델타: '뭐가 바뀌었나'를 비트마스크 1바이트로 표시하고, 바뀐 필드만 붙여 보내. 가만히 있으면 1B, 한두 개 바뀌면 3~5B. 안 바뀐 건 0B. 우리 더티플래그·DB 변경분 저장과 같은 원리야.";
  }
  function sel(m) { st.mode = m; st.cum = 0; st.cumFull = 0; st.last = []; var t = document.querySelectorAll(".dctab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".dctab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("dc-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { for (var i = 0; i < 20; i++) tick(); draw(); var n = document.getElementById("dc-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
