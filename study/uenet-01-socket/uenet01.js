/* uenet-01-socket — IP=건물, 포트=호수. 패킷이 맞는 포트(프로그램)로 배달된다. */
(function () {
  "use strict";
  var canvas = document.getElementById("ue1-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 340;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var ports = [
    { p: 15000, name: "Gate", open: true },
    { p: 10111, name: "GameDB", open: true },
    { p: 10034, name: "Login", open: true },
    { p: 9999, name: "(닫힘)", open: false }
  ];
  var SV = { x: 470, y: 30, w: 215, h: 280 };
  var rooms = ports.map(function (pt, i) {
    var rh = (SV.h - 20) / ports.length;
    return { p: pt.p, name: pt.name, open: pt.open, x: SV.x + 10, y: SV.y + 10 + i * rh, w: SV.w - 20, h: rh - 8, flash: 0 };
  });

  var st = { target: "auto", running: true, parts: [], acc: 0, ok: 0, drop: 0 };
  var C = { bg: "#0e1426", sv: "#1b2740", open: "#42a5f5", closed: "#5a3a3a", pkt: "#ffca28", ok: "#66bb6a", bad: "#ef5350", text: "#e3eaf5", sub: "#90a4c4" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function spawn() {
    var room;
    if (st.target === "auto") room = rooms[(Math.random() * 3) | 0]; // 유효 3개 중
    else room = rooms.filter(function (r) { return String(r.p) === st.target; })[0] || rooms[0];
    st.parts.push({ x: 30, y: 60 + Math.random() * 220, tx: room.x - 6, ty: room.y + room.h / 2, room: room, t: 0 });
  }

  function update(dt) {
    st.acc += dt;
    if (st.acc > 0.7) { st.acc = 0; if (st.parts.length < 30) spawn(); }
    for (var i = st.parts.length - 1; i >= 0; i--) {
      var p = st.parts[i]; var dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), step = 360 * dt;
      if (d <= step) {
        if (p.room.open) { st.ok++; p.room.flash = 0.3; } else { st.drop++; p.room.flash = -0.3; }
        st.parts.splice(i, 1);
      } else { p.x += dx / d * step; p.y += dy / d * step; }
    }
    for (var r = 0; r < rooms.length; r++) if (rooms[r].flash !== 0) rooms[r].flash += (rooms[r].flash > 0 ? -dt : dt), Math.abs(rooms[r].flash) < 0.02 && (rooms[r].flash = 0);
    setText("ue1-ok", st.ok); setText("ue1-drop", st.drop);
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    // 서버 건물
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("서버 컴퓨터 (IP = 건물 하나)  49.50.138.124", SV.x, SV.y - 10);
    rr(SV.x, SV.y, SV.w, SV.h, 12); ctx.fillStyle = "#11192c"; ctx.fill();
    for (var i = 0; i < rooms.length; i++) {
      var rm = rooms[i];
      rr(rm.x, rm.y, rm.w, rm.h, 8);
      var base = rm.open ? C.open : C.closed;
      ctx.fillStyle = rm.flash > 0 ? "#a5d6a7" : (rm.flash < 0 ? "#ef9a9a" : base); ctx.fill();
      ctx.fillStyle = rm.open ? "#0c1220" : "#e3eaf5"; ctx.textAlign = "left"; ctx.font = "700 13px 'Segoe UI',sans-serif";
      ctx.fillText(":" + rm.p + "  " + rm.name, rm.x + 12, rm.y + rm.h / 2 + 4);
    }
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.font = "600 11px 'Segoe UI',sans-serif";
    ctx.fillText("포트 = 호수 (프로그램)", SV.x, SV.y + SV.h + 18);
    ctx.fillText("들어오는 패킷 (목적지 포트가 적혀 있음)", 24, 24);
    // 패킷
    for (var p = 0; p < st.parts.length; p++) {
      var pt = st.parts[p];
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 9, 0, 6.2832); ctx.fillStyle = pt.room.open ? C.pkt : C.bad; ctx.fill();
      ctx.fillStyle = "#0c1220"; ctx.font = "700 8px 'Segoe UI',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(":" + pt.room.p, pt.x, pt.y + 1); ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue1-caption"); if (!c) return;
    c.textContent = st.target === "auto"
      ? "패킷마다 '목적지 포트'가 적혀 있어. 같은 컴퓨터(IP) 안에서도 포트가 맞아야 그 프로그램한테 배달돼. 택배에 동(IP)만 있고 호수(포트)가 없으면 누구한테 줄지 모르는 거랑 같아."
      : st.target === "9999"
        ? "닫힌 포트(:9999)로만 보내봤어. 그 호수엔 아무 프로그램도 안 살아서 전부 드롭(빨강)돼. 서버가 그 포트를 Listen하고 있어야 받을 수 있어."
        : "포트 :" + st.target + " 로만 보내는 중. 그 방(프로그램)에만 배달돼. 우리 서버는 Gate(15000)로 클라가 접속하고, 내부 통신은 GameDB(10111) 등 다른 포트를 써.";
  }
  function sel(m) { st.target = m; st.ok = 0; st.drop = 0; var t = document.querySelectorAll(".ue1tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-t") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".ue1tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-t")); }); })(tabs[i]);
  var pl = document.getElementById("ue1-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { draw(); var n = document.getElementById("ue1-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
