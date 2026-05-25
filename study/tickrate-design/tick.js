/* tickrate-design — 서버 저틱 스냅샷 vs 클라 60fps 렌더. 보간 on/off 부드러움 비교 */
(function () {
  "use strict";
  var canvas = document.getElementById("tk-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 280;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var L = 50, R = 670, Y = 120;
  var st = { interp: true, running: true, rate: 10, t: 0, snaps: [], snapAcc: 0 };
  var C = { bg: "#0e1426", track: "#1b2740", trueC: "rgba(120,144,180,0.5)", snap: "#5c6bc0", render: "#66bb6a", text: "#e3eaf5", sub: "#90a4c4" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function trueX(t) { return (L + R) / 2 + Math.sin(t * 1.5) * ((R - L) / 2 - 20); }

  function update(dt) {
    st.t += dt;
    st.snapAcc += dt;
    var interval = 1 / st.rate;
    while (st.snapAcc >= interval) { st.snapAcc -= interval; st.snaps.push({ t: st.t, x: trueX(st.t) }); if (st.snaps.length > 12) st.snaps.shift(); }
    setText("tk-rate", st.rate + " Hz"); setText("tk-int", Math.round(1000 / st.rate) + " ms");
  }

  var sx = 1, sy = 1;
  function renderX() {
    if (st.snaps.length === 0) return trueX(st.t);
    if (!st.interp) return st.snaps[st.snaps.length - 1].x; // 최신 스냅샷 (계단)
    // 보간: 한 틱 지연 버퍼, 마지막 두 스냅샷 사이 보간
    var delay = 1 / st.rate;
    var rt = st.t - delay;
    var a = null, b = null;
    for (var i = 0; i < st.snaps.length - 1; i++) { if (st.snaps[i].t <= rt && st.snaps[i + 1].t >= rt) { a = st.snaps[i]; b = st.snaps[i + 1]; break; } }
    if (!a) return st.snaps[st.snaps.length - 1].x;
    var f = (rt - a.t) / (b.t - a.t);
    return a.x + (b.x - a.x) * f;
  }
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    ctx.strokeStyle = C.track; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(L, Y); ctx.lineTo(R, Y); ctx.stroke();
    // 진짜 위치(연한)
    var tx = trueX(st.t);
    ctx.beginPath(); ctx.arc(tx, Y, 9, 0, 6.2832); ctx.fillStyle = C.trueC; ctx.fill();
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.textBaseline = "alphabetic"; ctx.fillText("실제 위치", tx, Y - 26);
    // 스냅샷(서버가 보낸 점들)
    for (var i = 0; i < st.snaps.length; i++) { ctx.beginPath(); ctx.arc(st.snaps[i].x, Y + 34, 4, 0, 6.2832); ctx.fillStyle = C.snap; ctx.fill(); }
    ctx.fillStyle = C.snap; ctx.fillText("서버 스냅샷(" + st.rate + "Hz)", L + 80, Y + 60);
    // 렌더 위치
    var rx = renderX();
    ctx.beginPath(); ctx.arc(rx, Y, 11, 0, 6.2832); ctx.fillStyle = C.render; ctx.fill();
    ctx.fillStyle = C.render; ctx.font = "700 12px 'Segoe UI',sans-serif"; ctx.fillText(st.interp ? "보간 렌더(부드러움)" : "보간 없음(계단)", rx, Y + 30);
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.interp ? "두 스냅샷 사이를 메워 부드럽게 (살짝 과거를 보는 대가)" : "최신 스냅샷으로 점프 → 저틱일수록 뚝뚝 끊김", LW / 2, LH - 12);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("tk-caption"); if (!c) return;
    c.textContent = st.interp
      ? "보간 켬: 서버는 초당 " + st.rate + "번만 위치를 보내(저틱). 클라는 60fps로 그리는데, 받은 두 스냅샷 사이를 '메워서(interpolation)' 부드럽게 그려. 대신 '살짝 과거'를 보는 거야(버퍼 지연). 틱레이트를 낮춰도 꽤 부드럽지?"
      : "보간 끔: 받은 '최신 스냅샷'으로 바로 점프해. 틱레이트가 낮으면(슬라이더 ↓) 뚝뚝 끊겨 보여. 부드럽게 하려면 틱을 엄청 올리거나(대역폭↑), 보간을 켜야 해.";
  }
  function sel(m) { st.interp = (m === "on"); var t = document.querySelectorAll(".tktab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".tktab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var sl = document.getElementById("tk-rate-sl");
  if (sl) sl.addEventListener("input", function () { st.rate = parseInt(sl.value, 10); st.snaps = []; var v = document.getElementById("tk-rate-val"); if (v) v.textContent = st.rate; });
  var pl = document.getElementById("tk-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { for (var i = 0; i < 12; i++) update(0.1); draw(); var n = document.getElementById("tk-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
