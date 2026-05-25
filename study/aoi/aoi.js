/* uenet-11-relevancy — 시야(Net Cull Distance) 안 액터만 복제, 밖은 컬링. = 우리 AOI */
(function () {
  "use strict";
  var canvas = document.getElementById("ue11-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 360;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var st = { radius: 130, running: true, t: 0, actors: [], inCount: 0 };
  function init() { st.actors = []; for (var i = 0; i < 34; i++) st.actors.push({ x: 40 + Math.random() * (LW - 80), y: 30 + Math.random() * (LH - 80) }); }
  var C = { bg: "#0e1426", actorOut: "#37474f", actorIn: "#66bb6a", player: "#ffca28", ring: "rgba(255,202,40,0.5)", ringFill: "rgba(102,187,106,0.07)", line: "rgba(102,187,106,0.35)", text: "#e3eaf5", sub: "#90a4c4" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function px() { return LW / 2 + Math.cos(st.t * 0.6) * 200; }
  function py() { return LH / 2 + Math.sin(st.t * 0.9) * 110; }

  function update(dt) {
    st.t += dt;
    var X = px(), Y = py(), n = 0;
    for (var i = 0; i < st.actors.length; i++) { var a = st.actors[i]; a.in = Math.hypot(a.x - X, a.y - Y) <= st.radius; if (a.in) n++; }
    st.inCount = n;
    setText("ue11-in", n); setText("ue11-out", st.actors.length - n);
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    var X = px(), Y = py();
    // 시야 원
    ctx.beginPath(); ctx.arc(X, Y, st.radius, 0, 6.2832); ctx.fillStyle = C.ringFill; ctx.fill(); ctx.strokeStyle = C.ring; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
    // 액터
    for (var i = 0; i < st.actors.length; i++) {
      var a = st.actors[i];
      if (a.in) { ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(a.x, a.y); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(a.x, a.y, a.in ? 7 : 5, 0, 6.2832); ctx.fillStyle = a.in ? C.actorIn : C.actorOut; ctx.fill();
    }
    // 플레이어
    ctx.beginPath(); ctx.arc(X, Y, 10, 0, 6.2832); ctx.fillStyle = C.player; ctx.fill();
    ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 9px 'Segoe UI',sans-serif"; ctx.fillText("나", X, Y + 1); ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("초록 = 복제 중(관련 있음) · 회색 = 컬링됨(안 보냄)", 18, LH - 14);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue11-caption"); if (!c) return;
    c.textContent = "Relevancy(관련성): 서버는 한 클라에게 '그 플레이어와 관련 있는' 액터만 복제해. 가장 흔한 기준이 거리 — Net Cull Distance 안에 든 것만 보내고, 밖은 컬링(안 보냄)해서 ActorChannel을 닫아. 플레이어가 움직이면 관련 집합이 계속 갱신되지. 이게 우리 BroadCast의 'AOI(관심 영역)'와 정확히 같은 거야. 시야를 바꿔봐.";
  }
  function sel(v) { st.radius = parseInt(v, 10); var t = document.querySelectorAll(".ue11tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-r") === v); setCap(); if (reduce) { update(0); draw(); } }
  var tabs = document.querySelectorAll(".ue11tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-r")); }); })(tabs[i]);
  var pl = document.getElementById("ue11-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  init(); setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { update(0); draw(); var n = document.getElementById("ue11-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
