/* uenet-03-serialize-iocp — IOCP: 소수 워커가 '완료된 I/O'만 큐에서 꺼내 수많은 연결을 감당 */
(function () {
  "use strict";
  var canvas = document.getElementById("ue3-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 340;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var NCONN = 18;
  var st = { workers: 2, running: true, conns: [], queue: 0, parts: [], acc: 0, cores: [], done: 0 };
  function initConns() { st.conns = []; for (var i = 0; i < NCONN; i++) st.conns.push({ x: 70, y: 36 + i * ((LH - 70) / (NCONN - 1)), t: Math.random() * 2 }); }
  function initWorkers() { st.cores = []; for (var i = 0; i < 4; i++) st.cores.push({ busy: false, t: 0 }); }
  var C = { bg: "#0e1426", conn: "#37474f", connOn: "#ffca28", q: "#5c6bc0", worker: "#26c6da", workerIdle: "#263238", text: "#e3eaf5", sub: "#90a4c4", line: "#2a3650" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  var QX = 340, QY = 60, QW = 90, QH = 220;
  var WX = 520;

  function update(dt) {
    // 연결에서 I/O 완료 이벤트 발생
    for (var i = 0; i < st.conns.length; i++) {
      var cn = st.conns[i]; cn.t -= dt;
      if (cn.t <= 0) { cn.t = 0.6 + Math.random() * 1.8; cn.flash = 0.25; st.parts.push({ x: cn.x, y: cn.y, tx: QX + QW / 2, ty: QY + QH - 16, t: 0 }); }
      if (cn.flash > 0) cn.flash -= dt;
    }
    for (var p = st.parts.length - 1; p >= 0; p--) {
      var pt = st.parts[p]; pt.t += dt * 1.7;
      if (pt.t >= 1) { st.queue++; st.parts.splice(p, 1); }
    }
    for (var w = 0; w < st.cores.length; w++) {
      var co = st.cores[w];
      if (w >= st.workers) { co.busy = false; continue; }
      if (co.busy) { co.t -= dt; if (co.t <= 0) { co.busy = false; st.done++; } }
      if (!co.busy && st.queue > 0) { st.queue--; co.busy = true; co.t = 0.4; }
    }
    setText("ue3-q", st.queue); setText("ue3-w", st.workers);
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("연결 " + NCONN + "개+ (실제론 수천)", 24, 22);
    ctx.fillText("완료 큐", QX, QY - 8); ctx.fillText("워커 스레드", WX, 22);
    // 연결
    for (var i = 0; i < st.conns.length; i++) { var cn = st.conns[i]; ctx.beginPath(); ctx.arc(cn.x, cn.y, 7, 0, 6.2832); ctx.fillStyle = cn.flash > 0 ? C.connOn : C.conn; ctx.fill(); }
    // 완료 큐
    rr(QX, QY, QW, QH, 10); ctx.fillStyle = "#11192c"; ctx.fill();
    var cells = Math.min(st.queue, 10);
    for (var q = 0; q < cells; q++) { rr(QX + 10, QY + QH - 26 - q * 19, QW - 20, 15, 4); ctx.fillStyle = st.queue > 8 ? "#ef5350" : C.q; ctx.fill(); }
    if (st.queue > 10) { ctx.fillStyle = "#ef5350"; ctx.font = "700 12px 'Segoe UI',sans-serif"; ctx.textAlign = "center"; ctx.fillText("+" + (st.queue - 10), QX + QW / 2, QY + 16); }
    // 파티클
    for (var p = 0; p < st.parts.length; p++) { var pt = st.parts[p], x = pt.x + (pt.tx - pt.x) * pt.t, y = pt.y + (pt.ty - pt.y) * pt.t; ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.2832); ctx.fillStyle = C.connOn; ctx.fill(); }
    // 워커
    for (var w = 0; w < 4; w++) {
      var active = w < st.workers, co = st.cores[w];
      var wy = 50 + w * 66;
      rr(WX, wy, 150, 52, 10); ctx.fillStyle = !active ? "#1a2336" : (co.busy ? C.worker : C.workerIdle); ctx.fill();
      ctx.fillStyle = active ? (co.busy ? "#0c1220" : "#90a4c4") : "#3d4759"; ctx.textAlign = "left"; ctx.font = "700 13px 'Segoe UI',sans-serif";
      ctx.fillText("워커 " + (w + 1), WX + 14, wy + 24); ctx.font = "600 11px 'Segoe UI',sans-serif";
      ctx.fillText(!active ? "꺼짐" : (co.busy ? "처리 중…" : "큐 대기"), WX + 14, wy + 40);
    }
    // 큐→워커 선
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(QX + QW, QY + QH / 2); ctx.lineTo(WX, 50 + 26); ctx.stroke();
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue3-caption"); if (!c) return;
    c.textContent = st.workers === 1
      ? "워커 1개: 연결은 수십~수천인데 처리 스레드는 1개. 완료된 I/O만 큐에 올라오고 워커가 하나씩 꺼내 처리해. 부하가 크면 큐가 쌓이지(빨강)."
      : "워커 " + st.workers + "개: OS가 '완료된 I/O만' 큐에 올려주니, 소수 워커로 수천 연결을 감당해. 'thread-per-connection'이면 1000 연결 = 1000 스레드(낭비) — IOCP는 그걸 피해. 우리 서버도 IOCP로 받아서 단일 게임로직 스레드로 넘겨.";
  }
  function sel(v) { st.workers = parseInt(v, 10); st.queue = 0; var t = document.querySelectorAll(".ue3tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-w") === v); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".ue3tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-w")); }); })(tabs[i]);
  var pl = document.getElementById("ue3-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  initConns(); initWorkers(); setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { st.queue = 4; draw(); var n = document.getElementById("ue3-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
