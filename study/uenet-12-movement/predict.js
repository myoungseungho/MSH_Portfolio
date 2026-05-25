/* client-prediction/predict.js — 클라 예측 & 서버 보정
 * naive: 화면 = 서버상태(RTT 지연) → 답답
 * predict: 화면 = 입력 즉시 → 빠르지만 서버와 어긋남
 * reconcile: 화면 = 입력 즉시 + 보정(서버 확정 오면 스냅)
 */
(function () {
  "use strict";
  var canvas = document.getElementById("pred-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 320;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var L = 70, R = 686, V = 150; // px/s
  var st = { mode: "naive", running: true, ping: 120, t: 0, corrCount: 0, lastCorrKnown: 0, flash: 0 };
  var events = []; var evAcc = 0;

  function tri(t) {
    var span = R - L, period = 2 * span / V;
    var ph = ((t % period) + period) % period;
    return ph < period / 2 ? L + V * ph : R - V * (ph - period / 2);
  }
  function corr(t) { // 서버가 가하는 보정 오프셋(knockback 펄스 합)
    var s = 0;
    for (var i = 0; i < events.length; i++) {
      var d = t - events[i];
      if (d >= 0 && d < 1.0) s += 28 * (1 - d);
    }
    return s;
  }

  var C = { bg: "#0e1426", lane: "#1b2740", text: "#e3eaf5", sub: "#90a4c4",
    input: "#ffca28", screen: "#42a5f5", server: "#66bb6a", bad: "#ef5350", flash: "#ef5350" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function lane(y, label, color) {
    ctx.strokeStyle = C.lane; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke();
    ctx.fillStyle = C.sub; ctx.font = "600 12px 'Segoe UI',sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(label, L, y - 16);
  }
  function marker(x, y, color, r) { ctx.beginPath(); ctx.arc(x, y, r || 11, 0, 6.2832); ctx.fillStyle = color; ctx.fill(); }

  function update(dt) {
    st.t += dt;
    evAcc += dt;
    if (evAcc > 3.2) { evAcc = 0; events.push(st.t); if (events.length > 8) events.shift(); }
    var rtt = st.ping / 1000;
    var corrKnown = corr(st.t - rtt);
    if (st.mode === "reconcile" && Math.abs(corrKnown - st.lastCorrKnown) > 6) { st.corrCount++; st.flash = 0.35; }
    st.lastCorrKnown = corrKnown;
    if (st.flash > 0) st.flash -= dt;
    setText("pred-lag", st.mode === "naive" ? Math.round(st.ping) : 0);
    setText("pred-corr", st.corrCount);
    var g = document.getElementById("pred-guard");
    if (g) {
      if (st.mode === "naive") { g.textContent = "느림"; g.style.color = C.bad; }
      else if (st.mode === "predict") { g.textContent = "어긋남"; g.style.color = C.bad; }
      else { g.textContent = "정확"; g.style.color = C.server; }
    }
  }

  var scaleX = 1, scaleY = 1;
  function draw() {
    ctx.save(); ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    var rtt = st.ping / 1000;
    var inputX = tri(st.t);
    var serverX = tri(st.t - rtt / 2) - corr(st.t - rtt / 2);
    var screenX;
    if (st.mode === "naive") screenX = tri(st.t - rtt) - corr(st.t - rtt);      // 서버상태(RTT 지연)
    else if (st.mode === "predict") screenX = inputX;                            // 즉시(보정 없음)
    else screenX = tri(st.t) - corr(st.t - rtt);                                 // 즉시 + 보정(지연 반영)

    lane(70, "입력 (내 키보드 — 지금 누름)", C.input); marker(inputX, 70, C.input);
    lane(160, "화면 (내가 보는 내 캐릭터)", C.screen);
    marker(screenX, 160, st.flash > 0 ? C.flash : C.screen, st.flash > 0 ? 14 : 11);
    lane(250, "서버 (진짜 위치, 핑/2 지연)", C.server); marker(serverX, 250, C.server);

    // 입력 기준 수직 점선 + 화면 지연 표시
    ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(255,202,40,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(inputX, 58); ctx.lineTo(inputX, 262); ctx.stroke(); ctx.setLineDash([]);

    if (st.mode === "predict" && Math.abs(screenX - serverX) > 10) {
      ctx.fillStyle = C.bad; ctx.font = "700 13px 'Segoe UI',sans-serif"; ctx.textAlign = "center";
      ctx.fillText("⚠ 화면과 서버가 어긋남 (보정 안 함)", LW / 2, 300);
    } else if (st.mode === "naive") {
      ctx.fillStyle = C.sub; ctx.font = "700 13px 'Segoe UI',sans-serif"; ctx.textAlign = "center";
      ctx.fillText("화면이 입력보다 핑(" + Math.round(st.ping) + "ms)만큼 뒤처짐", LW / 2, 300);
    } else if (st.mode === "reconcile") {
      ctx.fillStyle = C.server; ctx.font = "700 13px 'Segoe UI',sans-serif"; ctx.textAlign = "center";
      ctx.fillText("즉시 반응 + 서버 확정 오면 스냅 보정", LW / 2, 300);
    }
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); scaleX = w * dpr / LW; scaleY = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("pred-caption"); if (!c) return;
    c.textContent = st.mode === "naive"
      ? "예측 없음: 키를 눌러도 서버에 갔다와야 화면이 움직여. 핑을 올려봐 — 화면이 입력보다 그만큼 뒤처져서 답답하지? FPS면 이건 못 씀."
      : st.mode === "predict"
        ? "예측만: 내 화면에서 일단 먼저 움직여(즉시 반응). 근데 서버가 '넌 거기 못 가'라고 해도 무시 → 화면과 서버가 어긋나. 핵·통과 버그의 원인."
        : "예측 + 보정: 즉시 움직이되, 서버 확정이 도착하면 그 위치로 스냅(롤백 후 재적용). 빠르면서도 결국 서버가 진실 — 가끔 튀는 게 그 보정이야.";
  }
  function sel(m) {
    st.mode = m; st.corrCount = 0;
    var tabs = document.querySelectorAll(".ptab");
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("active", tabs[i].getAttribute("data-pmode") === m);
    setCap(); if (reduce) draw();
  }
  var tabs = document.querySelectorAll(".ptab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-pmode")); }); })(tabs[i]);
  var ping = document.getElementById("pred-ping");
  if (ping) ping.addEventListener("input", function () { st.ping = parseInt(ping.value, 10) || 20; var v = document.getElementById("pred-ping-val"); if (v) v.textContent = st.ping; });
  var pl = document.getElementById("pred-play");
  if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { draw(); var n = document.getElementById("pred-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
