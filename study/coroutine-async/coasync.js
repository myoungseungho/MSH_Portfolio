/* coroutine-async — 한 스레드: 블로킹(I/O 동안 유휴) vs async(I/O 동안 다른 일) */
(function () {
  "use strict";
  var canvas = document.getElementById("ca-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 300;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var CPU = 0.3, IO = 0.9;
  var st = { mode: "async", running: true, worker: { state: "idle", t: 0 }, inflight: [], done: 0, busy: 0, idle: 0, timeline: [] };
  var C = { bg: "#0e1426", cpu: "#66bb6a", idle: "#37474f", io: "#42a5f5", text: "#e3eaf5", sub: "#90a4c4", box: "#11192c" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function update(dt) {
    var w = st.worker, working = false;
    if (st.mode === "block") {
      if (w.state === "idle") { w.state = "cpu"; w.t = CPU; }
      if (w.state === "cpu") { w.t -= dt; working = true; if (w.t <= 0) { w.state = "iowait"; w.t = IO; } }
      else if (w.state === "iowait") { w.t -= dt; /* 워커가 묶여 대기(유휴) */ if (w.t <= 0) { st.done++; w.state = "idle"; } }
    } else {
      if (w.state === "idle") { w.state = "cpu"; w.t = CPU; }
      if (w.state === "cpu") { w.t -= dt; working = true; if (w.t <= 0) { st.inflight.push({ t: IO }); w.state = "idle"; } }
      for (var i = st.inflight.length - 1; i >= 0; i--) { st.inflight[i].t -= dt; if (st.inflight[i].t <= 0) { st.done++; st.inflight.splice(i, 1); } }
    }
    if (working) st.busy += dt; else st.idle += dt;
    st.timeline.push(working ? 1 : 0); if (st.timeline.length > 90) st.timeline.shift();
    var util = (st.busy + st.idle) > 0 ? Math.round(st.busy / (st.busy + st.idle) * 100) : 0;
    setText("ca-done", st.done); setText("ca-util", util + "%");
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    var w = st.worker;
    // 워커 박스
    var busyNow = w.state === "cpu";
    rr(40, 50, 200, 70, 12); ctx.fillStyle = busyNow ? C.cpu : (st.mode === "block" && w.state === "iowait" ? C.idle : C.idle); ctx.fill();
    ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 14px 'Segoe UI',sans-serif";
    ctx.fillText("워커 스레드 ×1", 140, 76);
    ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.fillStyle = busyNow ? "#0c1220" : "#90a4c4";
    ctx.fillText(busyNow ? "CPU 처리 중" : (st.mode === "block" && w.state === "iowait" ? "🔒 I/O 대기(묶임·유휴)" : "다음 작업 진행"), 140, 96); ctx.textBaseline = "alphabetic";
    // in-flight I/O (async)
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.font = "600 12px 'Segoe UI',sans-serif"; ctx.fillText("진행 중 I/O (백그라운드)", 300, 40);
    if (st.mode === "block") {
      if (w.state === "iowait") { ctx.beginPath(); ctx.arc(320, 76, 12, 0, 6.2832); ctx.fillStyle = C.io; ctx.fill(); }
      ctx.fillStyle = C.sub; ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.fillText("(워커가 이 I/O에 묶여 다른 일 못 함)", 300, 100);
    } else {
      for (var i = 0; i < Math.min(st.inflight.length, 8); i++) { ctx.beginPath(); ctx.arc(320 + i * 30, 76, 11, 0, 6.2832); ctx.fillStyle = C.io; ctx.fill(); }
      ctx.fillStyle = C.sub; ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.fillText("(I/O는 백그라운드, 워커는 다음 CPU 작업으로)", 300, 100);
    }
    // 타임라인
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.font = "600 12px 'Segoe UI',sans-serif"; ctx.fillText("워커 활용 타임라인 (초록=CPU, 회색=유휴)", 40, 160);
    var bw = (LW - 80) / 90;
    for (var i = 0; i < st.timeline.length; i++) { rr(40 + i * bw, 172, bw - 1, 40, 0); ctx.fillStyle = st.timeline[i] ? C.cpu : C.idle; ctx.fill(); }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "block" ? "블로킹: I/O 동안 워커가 묶여 회색(유휴)이 많아 — 처리량 낮음" : "async/코루틴: I/O 중엔 yield하고 다른 작업 — 회색이 거의 없음", LW / 2, LH - 14);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ca-caption"); if (!c) return;
    c.textContent = st.mode === "block"
      ? "블로킹: 워커가 한 작업의 CPU를 처리한 뒤, I/O(DB·네트워크) 응답을 '기다리며 묶여' 있어. 그 동안 아무 일도 못 해(회색 유휴). 작업이 줄줄이 밀려. 우리 서버가 동기 DB를 부를 때 채널이 멈추는 것과 같아."
      : "async/코루틴: 워커가 I/O를 쏜 뒤 'yield'하고 다음 작업의 CPU로 넘어가. I/O는 백그라운드에서 진행되다 끝나면 마저 처리. 한 스레드로도 유휴 없이 꽉 채워 — 단, '순서'를 지키려면 await/stash 같은 장치가 필요해(액터 모델 글 참고).";
  }
  function sel(m) { st.mode = m; st.worker = { state: "idle", t: 0 }; st.inflight = []; st.done = 0; st.busy = 0; st.idle = 0; st.timeline = []; var t = document.querySelectorAll(".catab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".catab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("ca-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { for (var i = 0; i < 60; i++) st.timeline.push(i % 4 === 0 ? 1 : 0); draw(); var n = document.getElementById("ca-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
