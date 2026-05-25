/* reliable-udp — 한 UDP 채널에 unreliable(이동) + reliable(중요)를 섞어 쓴다 */
(function () {
  "use strict";
  var canvas = document.getElementById("ru-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 300;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var L = 60, R = 672, Y = 120, ZONE = 366;
  var st = { loss: 0.2, running: true, parts: [], acc: 0, moveLost: 0, relResent: 0, relOk: 0 };
  var C = { bg: "#0e1426", track: "#1b2740", zone: "rgba(239,83,80,0.12)", move: "#42a5f5", rel: "#ffca28", resent: "#ffa726", bad: "#ef5350", text: "#e3eaf5", sub: "#90a4c4" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function update(dt) {
    st.acc += dt;
    if (st.acc > 0.4) { st.acc = 0; var rel = Math.random() < 0.35; st.parts.push({ x: L, rel: rel, resent: false, passed: false, puff: 0, lane: rel ? -16 : 16 }); }
    for (var i = st.parts.length - 1; i >= 0; i--) {
      var p = st.parts[i];
      if (p.puff > 0) { p.puff -= dt; if (p.puff <= 0) st.parts.splice(i, 1); continue; }
      p.x += 240 * dt;
      if (!p.passed && p.x >= ZONE) {
        p.passed = true;
        if (Math.random() < st.loss) {
          if (p.rel) { p.puff = 0.25; st.relResent++; st.parts.push({ x: L, rel: true, resent: true, passed: false, puff: 0, lane: -16 }); }
          else { p.puff = 0.25; st.moveLost++; }
        }
      }
      if (p.x >= R && p.puff === 0) { if (p.rel) st.relOk++; st.parts.splice(i, 1); }
    }
    setText("ru-lost", st.moveLost); setText("ru-resent", st.relResent);
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    ctx.fillStyle = C.zone; rr(ZONE - 22, 30, 44, LH - 70, 8); ctx.fill();
    ctx.fillStyle = C.bad; ctx.textAlign = "center"; ctx.font = "700 11px 'Segoe UI',sans-serif"; ctx.textBaseline = "alphabetic"; ctx.fillText("유실 지대", ZONE, 24);
    ctx.strokeStyle = C.track; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(L, Y); ctx.lineTo(R, Y); ctx.stroke();
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.font = "600 12px 'Segoe UI',sans-serif"; ctx.fillText("하나의 UDP 채널", L, Y + 50);
    for (var i = 0; i < st.parts.length; i++) {
      var p = st.parts[i];
      ctx.beginPath(); ctx.arc(p.x, Y + p.lane, 8, 0, 6.2832);
      ctx.fillStyle = p.puff > 0 ? C.bad : (p.rel ? (p.resent ? C.resent : C.rel) : C.move); ctx.fill();
    }
    // 범례
    ctx.textAlign = "left"; ctx.font = "600 11px 'Segoe UI',sans-serif";
    ctx.fillStyle = C.move; ctx.fillText("● 이동(unreliable) — 잃으면 무시", L, Y - 56);
    ctx.fillStyle = C.rel; ctx.fillText("● 중요/채팅(reliable) — ACK+재전송", L + 230, Y - 56);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ru-caption"); if (!c) return;
    c.textContent = "한 UDP 채널에 두 종류가 흘러: 파랑=이동(unreliable, 잃으면 그냥 무시 — 최신이 곧 올 거라), 노랑=중요/채팅(reliable, ACK 안 오면 재전송 — 절대 유실 X). UDP는 기본이 '안 믿음'이라, 필요한 메시지에만 골라서 신뢰성을 얹는 거야. 이게 TCP를 안 쓰고도 '꼭 도착'을 보장하는 법(유실률을 올려봐).";
  }
  function sel(v) { st.loss = parseInt(v, 10) / 100; var t = document.querySelectorAll(".rutab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-loss") === v); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".rutab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-loss")); }); })(tabs[i]);
  var pl = document.getElementById("ru-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { draw(); var n = document.getElementById("ru-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
