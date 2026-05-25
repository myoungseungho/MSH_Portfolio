/* speed-hack — 클라가 빠른 이동을 주장. 서버가 최대 속도로 검증해 거부(서버 권위) */
(function () {
  "use strict";
  var canvas = document.getElementById("sh-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 280;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var L = 50, R = 670, SPEED = 90, MAXSPEED = 110;
  var st = { mode: "authority", running: true, hack: false, clientX: L, serverX: L, rejects: 0, flash: 0 };
  var C = { bg: "#0e1426", track: "#1b2740", server: "#66bb6a", client: "#ef5350", clientOk: "#42a5f5", text: "#e3eaf5", sub: "#90a4c4", bad: "#ef5350" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function update(dt) {
    var v = SPEED * (st.hack ? 3 : 1);
    st.clientX += v * dt;
    if (st.clientX > R) { st.clientX = L; st.serverX = L; }
    if (st.mode === "trust") {
      st.serverX = st.clientX; // 클라 말 그대로 믿음
    } else {
      // 서버 권위: 최대 속도까지만 허용
      var maxStep = MAXSPEED * dt;
      var want = st.clientX - st.serverX;
      if (want > maxStep + 0.5) { st.serverX += maxStep; st.clientX = st.serverX; st.rejects++; st.flash = 0.25; } // 거부 + 스냅백
      else st.serverX = st.clientX;
    }
    if (st.flash > 0) st.flash -= dt;
    setText("sh-rej", st.rejects);
    setText("sh-state", st.mode === "trust" && st.hack ? "뚫림" : (st.hack ? "차단됨" : "정상"));
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    ctx.strokeStyle = C.track; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(L, 130); ctx.lineTo(R, 130); ctx.stroke();
    // 서버 위치(권위)
    ctx.beginPath(); ctx.arc(st.serverX, 130, 13, 0, 6.2832); ctx.fillStyle = C.server; ctx.fill();
    ctx.fillStyle = C.server; ctx.textAlign = "center"; ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.textBaseline = "alphabetic"; ctx.fillText("서버 위치(진짜)", st.serverX, 110);
    // 클라 주장 위치 (다를 때만)
    if (Math.abs(st.clientX - st.serverX) > 3) {
      ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(st.clientX, 130, 11, 0, 6.2832); ctx.fillStyle = st.mode === "trust" ? C.client : C.client; ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = C.client; ctx.fillText("클라 주장(조작)", st.clientX, 165);
    }
    if (st.flash > 0) { ctx.fillStyle = C.bad; ctx.textAlign = "center"; ctx.font = "700 13px 'Segoe UI',sans-serif"; ctx.fillText("✗ 비정상 속도 거부 → 스냅백", LW / 2, 200); }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "trust" ? "클라 신뢰: 클라가 보낸 위치를 그대로 인정 → 스피드핵 통과" : "서버 권위: 최대 속도 초과 이동은 거부하고 합법 위치로 되돌림", LW / 2, LH - 16);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("sh-caption"); if (!c) return;
    c.textContent = st.mode === "trust"
      ? "클라 신뢰: 서버가 클라가 보낸 좌표를 그대로 받아 적어. '스피드핵 켜기'를 누르면 3배 속도가 그대로 인정돼 — 핵이 뚫려. 클라가 보낸 값을 믿는 순간 게임은 조작당해."
      : "서버 권위: 서버가 '직전 위치 + 최대 속도 × 경과시간'으로 가능한 범위를 계산해, 그걸 넘는 이동은 거부하고 합법 위치로 되돌려(스냅백). '스피드핵 켜기'를 눌러도 차단되지? 모든 판단의 최종 권위는 서버야.";
  }
  function sel(m) { st.mode = m; st.rejects = 0; var t = document.querySelectorAll(".shtab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".shtab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var hk = document.getElementById("sh-hack"); if (hk) hk.addEventListener("click", function () { st.hack = !st.hack; hk.textContent = st.hack ? "🛑 스피드핵 끄기" : "⚡ 스피드핵 켜기"; });
  var pl = document.getElementById("sh-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { st.hack = true; st.clientX = 300; st.serverX = 180; st.rejects = 12; draw(); var n = document.getElementById("sh-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
