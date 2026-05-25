/* seamless-world — 존(서버) 경계를 넘을 때 핸드오버. 경계 겹침으로 끊김 없이 */
(function () {
  "use strict";
  var canvas = document.getElementById("sw-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 300;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var L = 40, R = 680, ZONES = 3;
  var st = { mode: "seamless", running: true, t: 0, owner: 0, handovers: 0, pulse: 0, pulseFrom: 0, pulseTo: 0 };
  var C = { bg: "#0e1426", zone: ["#1e88e5", "#43a047", "#8e24aa"], server: ["#42a5f5", "#66bb6a", "#ab47bc"], player: "#ffca28", text: "#e3eaf5", sub: "#90a4c4", overlap: "rgba(255,202,40,0.12)" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function zoneW() { return (R - L) / ZONES; }
  function playerX() { return (L + R) / 2 + Math.sin(st.t * 0.5) * ((R - L) / 2 - 18); }
  function zoneOf(x) { return Math.max(0, Math.min(ZONES - 1, Math.floor((x - L) / zoneW()))); }

  function update(dt) {
    st.t += dt;
    var z = zoneOf(playerX());
    if (z !== st.owner) { st.handovers++; st.pulse = 0.5; st.pulseFrom = st.owner; st.pulseTo = z; st.owner = z; }
    if (st.pulse > 0) st.pulse -= dt;
    setText("sw-owner", "서버 " + (st.owner + 1)); setText("sw-ho", st.handovers);
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    var zw = zoneW();
    // 서버 박스
    for (var i = 0; i < ZONES; i++) {
      var sx0 = L + i * zw + 8;
      rr(sx0, 40, zw - 16, 50, 10); ctx.fillStyle = (i === st.owner) ? C.server[i] : "#243049"; ctx.fill();
      ctx.fillStyle = (i === st.owner) ? "#0c1220" : "#90a4c4"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 13px 'Segoe UI',sans-serif";
      ctx.fillText("서버 " + (i + 1), sx0 + (zw - 16) / 2, 60); ctx.font = "600 10px 'Segoe UI',sans-serif"; ctx.fillText("존 " + (i + 1), sx0 + (zw - 16) / 2, 76); ctx.textBaseline = "alphabetic";
    }
    // 핸드오버 펄스
    if (st.pulse > 0) {
      var a = L + st.pulseFrom * zw + zw / 2, b = L + st.pulseTo * zw + zw / 2;
      var f = 1 - st.pulse / 0.5; var px = a + (b - a) * f;
      ctx.beginPath(); ctx.arc(px, 110, 8, 0, 6.2832); ctx.fillStyle = C.player; ctx.fill();
      ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 11px 'Segoe UI',sans-serif"; ctx.fillText("상태 인계 →", px, 100);
    }
    // 월드 트랙 + 존 경계
    var TY = 180;
    for (var i = 0; i < ZONES; i++) { ctx.fillStyle = i % 2 ? "#141d30" : "#11192c"; rr(L + i * zw, TY, zw, 50, 0); ctx.fill(); }
    // 경계 겹침(seamless)
    if (st.mode === "seamless") { for (var i = 1; i < ZONES; i++) { ctx.fillStyle = C.overlap; rr(L + i * zw - 30, TY, 60, 50, 0); ctx.fill(); } }
    for (var i = 1; i < ZONES; i++) { ctx.strokeStyle = "#2a3650"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(L + i * zw, TY); ctx.lineTo(L + i * zw, TY + 50); ctx.stroke(); ctx.setLineDash([]); }
    // 플레이어
    var px = playerX();
    ctx.beginPath(); ctx.arc(px, TY + 25, 11, 0, 6.2832); ctx.fillStyle = C.player; ctx.fill();
    ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 9px 'Segoe UI',sans-serif"; ctx.fillText("나", px, TY + 26); ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "seamless" ? "경계 겹침 구역에서 미리 인계 → 끊김 없이 다음 서버로" : "경계에서 끊고 재접속 → 로딩 화면(존 전환)", LW / 2, LH - 14);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("sw-caption"); if (!c) return;
    c.textContent = st.mode === "seamless"
      ? "심리스 월드: 넓은 세계를 여러 서버(존)가 나눠 맡아. 플레이어가 경계 근처(노란 겹침 구역)에 오면, 미리 옆 서버에 내 상태를 인계해 둬. 경계를 넘는 순간 끊김·로딩 없이 다음 서버가 이어받아 — 한 세계처럼 보이지."
      : "존 분리(로딩): 옛날 방식은 경계에서 연결을 끊고 다음 존 서버에 재접속해. 그래서 '로딩 화면'이 떠. 구현은 단순하지만 몰입이 끊겨. 우리 채널·존 이동도 기본은 이쪽에 가까워.";
  }
  function sel(m) { st.mode = m; st.handovers = 0; var t = document.querySelectorAll(".swtab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".swtab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("sw-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { draw(); var n = document.getElementById("sw-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
