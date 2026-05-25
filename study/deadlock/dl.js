/* deadlock — 락 2개를 엇갈려 잡으면 교착. 락 순서 통일로 해결 */
(function () {
  "use strict";
  var canvas = document.getElementById("dl-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 320;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var TA = { x: 40, y: 60, w: 120, h: 50, label: "스레드 A" };
  var TB = { x: 40, y: 210, w: 120, h: 50, label: "스레드 B" };
  var L1 = { x: 540, y: 60, w: 120, h: 50, label: "Lock 1" };
  var L2 = { x: 540, y: 210, w: 120, h: 50, label: "Lock 2" };
  var st = { mode: "deadlock", running: true, t: 0, phase: 0, stuck: 0, done: 0 };
  var C = { bg: "#0e1426", th: "#ab47bc", lock: "#37474f", lockHeld: "#66bb6a", hold: "#66bb6a", want: "#ffa726", bad: "#ef5350", text: "#e3eaf5", sub: "#90a4c4" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function cR(b) { return { x: b.x + b.w, y: b.y + b.h / 2 }; }
  function cL(b) { return { x: b.x, y: b.y + b.h / 2 }; }

  function update(dt) {
    st.t += dt;
    if (st.mode === "deadlock") { st.stuck += dt; setText("dl-state", "💀 교착"); setText("dl-done", "0"); }
    else {
      st.phase += dt;
      if (st.phase > 2.4) { st.phase = 0; st.done++; }
      setText("dl-state", "정상"); setText("dl-done", st.done);
    }
  }

  var sx = 1, sy = 1;
  function box(b, fill, held) { rr(b.x, b.y, b.w, b.h, 10); ctx.fillStyle = fill; ctx.fill(); ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 13px 'Segoe UI',sans-serif"; ctx.fillText(b.label + (held ? " 🔒" : ""), b.x + b.w / 2, b.y + b.h / 2); ctx.textBaseline = "alphabetic"; }
  function arrow(a, b, col, dashed) { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.setLineDash(dashed ? [6, 5] : []); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - dx / d * 10 - dy / d * 5, b.y - dy / d * 10 + dx / d * 5); ctx.lineTo(b.x - dx / d * 10 + dy / d * 5, b.y - dy / d * 10 - dx / d * 5); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); }

  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    if (st.mode === "deadlock") {
      box(TA, C.th); box(TB, C.th); box(L1, C.lockHeld, true); box(L2, C.lockHeld, true);
      arrow(cR(TA), cL(L1), C.hold, false);   // A holds L1
      arrow(cR(TB), cL(L2), C.hold, false);   // B holds L2
      arrow(cR(TA), cL(L2), C.want, true);    // A wants L2
      arrow(cR(TB), cL(L1), C.want, true);    // B wants L1
      ctx.fillStyle = C.bad; ctx.textAlign = "center"; ctx.font = "700 14px 'Segoe UI',sans-serif";
      ctx.fillText("💀 교착(deadlock): 서로 상대가 쥔 락을 기다리며 영원히 멈춤 (" + st.stuck.toFixed(1) + "s)", LW / 2, LH - 14);
    } else {
      // ordered: 둘 다 L1 → L2 순서. phase로 A가 먼저 다 쓰고 B 진행
      var aHas1 = st.phase < 1.2, aHas2 = st.phase > 0.4 && st.phase < 1.2;
      var bWait = st.phase < 1.2;
      box(TA, C.th); box(TB, C.th);
      box(L1, st.phase < 1.2 ? C.lockHeld : (st.phase < 2.4 ? C.lockHeld : C.lock), st.phase < 2.4);
      box(L2, (st.phase > 0.4 && st.phase < 1.2) || (st.phase > 1.6) ? C.lockHeld : C.lock, (st.phase > 0.4 && st.phase < 1.2) || st.phase > 1.6);
      if (st.phase < 1.2) { arrow(cR(TA), cL(L1), C.hold, false); if (st.phase > 0.4) arrow(cR(TA), cL(L2), C.hold, false); arrow(cR(TB), cL(L1), C.want, true); }
      else { arrow(cR(TB), cL(L1), C.hold, false); if (st.phase > 1.6) arrow(cR(TB), cL(L2), C.hold, false); }
      ctx.fillStyle = C.lockHeld; ctx.textAlign = "center"; ctx.font = "700 13px 'Segoe UI',sans-serif";
      ctx.fillText("락 순서 통일(둘 다 Lock1 → Lock2): 한 명이 끝나면 다음 — 교착 없음. 완료 " + st.done, LW / 2, LH - 14);
    }
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.textBaseline = "alphabetic";
    ctx.fillText("─ 쥠(hold)", 24, 24); ctx.fillStyle = C.want; ctx.fillText("┄ 원함(want)", 110, 24);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("dl-caption"); if (!c) return;
    c.textContent = st.mode === "deadlock"
      ? "데드락: A는 'Lock1 잡고 Lock2'를, B는 'Lock2 잡고 Lock1'을 원해. 각자 첫 락을 쥔 채 상대 락을 기다리면 — 둘 다 영원히 멈춰(순환 대기). 게임 서버가 한순간 통째로 얼어붙는 무서운 버그야."
      : "해결 — 락 순서 통일: 모두가 '항상 Lock1 먼저, 그 다음 Lock2' 순서로만 잡으면 순환이 안 생겨. 한 명이 둘 다 잡고 끝내면 다음 사람이 진행. 가장 기본적이고 강력한 데드락 예방법이야.";
  }
  function sel(m) { st.mode = m; st.stuck = 0; st.phase = 0; st.done = 0; var t = document.querySelectorAll(".dltab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".dltab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("dl-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { draw(); var n = document.getElementById("dl-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
