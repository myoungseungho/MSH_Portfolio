/* uenet-05-netdriver — UNetDriver(엔진) 1개가 클라마다 UNetConnection을 두고, 틱마다 flush */
(function () {
  "use strict";
  var canvas = document.getElementById("ue5-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 360;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var st = { count: 4, running: true, t: 0, tickAcc: 0, ticks: 0, pulses: [] };
  var ND = { x: 250, y: 36, w: 210, h: 288 };
  var C = { bg: "#0e1426", nd: "#1b3a5c", ndBorder: "#42a5f5", conn: "#26c6da", client: "#ab47bc", pulse: "#ffca28", text: "#e3eaf5", sub: "#90a4c4", line: "#2a3650" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function layout() {
    var n = st.count, gap = 10, top = ND.y + 44;
    var ch = (ND.h - 54 - gap * (n - 1)) / n;
    st.conns = [];
    for (var i = 0; i < n; i++) {
      var cy = top + i * (ch + gap);
      st.conns.push({ x: ND.x + 14, y: cy, w: ND.w - 28, h: ch, clientX: 60, clientY: cy + ch / 2, flash: 0 });
    }
  }

  function update(dt) {
    st.tickAcc += dt;
    if (st.tickAcc > 1.0) { st.tickAcc = 0; st.ticks++; for (var i = 0; i < st.conns.length; i++) { var c = st.conns[i]; st.pulses.push({ x: ND.x, y: c.y + c.h / 2, tx: c.clientX + 36, ty: c.clientY, t: 0 }); c.flash = 0.3; } }
    for (var p = st.pulses.length - 1; p >= 0; p--) { st.pulses[p].t += dt * 1.8; if (st.pulses[p].t >= 1) st.pulses.splice(p, 1); }
    for (var k = 0; k < st.conns.length; k++) if (st.conns[k].flash > 0) st.conns[k].flash -= dt;
    setText("ue5-conn", st.count); setText("ue5-tick", st.ticks);
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    // NetDriver 박스
    rr(ND.x, ND.y, ND.w, ND.h, 12); ctx.fillStyle = C.nd; ctx.fill();
    ctx.strokeStyle = C.ndBorder; ctx.lineWidth = 2; rr(ND.x, ND.y, ND.w, ND.h, 12); ctx.stroke();
    ctx.fillStyle = C.text; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.font = "700 14px 'Segoe UI',sans-serif";
    ctx.fillText("UNetDriver (서버 1개)", ND.x + ND.w / 2, ND.y + 26);
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("클라이언트", 30, 24);
    // 연결 + 클라
    for (var i = 0; i < st.conns.length; i++) {
      var c = st.conns[i];
      // 클라 박스
      rr(c.clientX, c.clientY - 16, 90, 32, 8); ctx.fillStyle = C.client; ctx.fill();
      ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 11px 'Segoe UI',sans-serif";
      ctx.fillText("클라 " + (i + 1), c.clientX + 45, c.clientY); ctx.textBaseline = "alphabetic";
      // 선
      ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c.clientX + 90, c.clientY); ctx.lineTo(ND.x, c.y + c.h / 2); ctx.stroke();
      // UNetConnection 슬롯
      rr(c.x, c.y, c.w, c.h, 7); ctx.fillStyle = c.flash > 0 ? "#4dd0e1" : C.conn; ctx.fill();
      ctx.fillStyle = "#0c1220"; ctx.textAlign = "left"; ctx.font = "700 11px 'Segoe UI',sans-serif"; ctx.textBaseline = "middle";
      ctx.fillText("UNetConnection " + (i + 1), c.x + 8, c.y + c.h / 2); ctx.textBaseline = "alphabetic";
    }
    // 펄스
    for (var p = 0; p < st.pulses.length; p++) { var pu = st.pulses[p], x = pu.x + (pu.tx - pu.x) * pu.t, y = pu.y + (pu.ty - pu.y) * pu.t; ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.2832); ctx.fillStyle = C.pulse; ctx.fill(); }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText("TickFlush → 연결마다 모아둔 데이터를 한 번에 송신", LW / 2, LH - 12);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue5-caption"); if (!c) return;
    c.textContent = "UNetDriver는 서버에 1개, 네트워크 송수신을 총괄하는 엔진이야(우리 IOCP+Gate 자리). 클라가 붙을 때마다 UNetConnection이 1개씩 생겨 — 그 클라와의 상태·채널·신뢰성 큐를 다 들고 있어. 매 틱(TickFlush)마다 연결별로 모아둔 데이터를 한 번에 내보내. 클라 수를 바꿔봐 — 연결 수가 따라 늘지.";
  }
  function sel(v) { st.count = parseInt(v, 10); layout(); st.pulses = []; var t = document.querySelectorAll(".ue5tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-c") === v); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".ue5tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-c")); }); })(tabs[i]);
  var pl = document.getElementById("ue5-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  layout(); setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { draw(); var n = document.getElementById("ue5-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
