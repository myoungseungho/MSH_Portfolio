/* uenet-14-iris — 위치 업데이트 대역폭: raw vs Quantize vs Quantize+Delta */
(function () {
  "use strict";
  var canvas = document.getElementById("ue14-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 320;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var st = { mode: "raw", running: true, acc: 0, hist: [], cum: 0, cumRaw: 0 };
  var C = { bg: "#0e1426", raw: "#ef5350", quant: "#ffa726", delta: "#66bb6a", base: "#37474f", text: "#e3eaf5", sub: "#90a4c4", grid: "#1c2740" };
  var GX = 30, GY = 40, GW = 660, GH = 200, MAXB = 13;

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function tickBytes() {
    var raw = 12; // 3 floats
    if (st.mode === "raw") return { b: 12, raw: raw };
    if (st.mode === "quant") return { b: 6, raw: raw }; // 3 x 2byte
    // delta: 바뀐 성분만(0~3개) x 2byte + 1 header
    var changed = (Math.random() * 4) | 0; // 0..3
    return { b: changed === 0 ? 1 : 1 + changed * 2, raw: raw };
  }

  function update(dt) {
    st.acc += dt;
    if (st.acc > 0.28) {
      st.acc = 0; var t = tickBytes();
      st.hist.push(t.b); if (st.hist.length > 40) st.hist.shift();
      st.cum += t.b; st.cumRaw += t.raw;
      setText("ue14-cum", st.cum + "B");
      var save = st.cumRaw ? Math.round((1 - st.cum / st.cumRaw) * 100) : 0;
      setText("ue14-save", save + "%");
    }
  }

  var sx = 1, sy = 1;
  function modeColor() { return st.mode === "raw" ? C.raw : (st.mode === "quant" ? C.quant : C.delta); }
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("틱당 전송 바이트 (위치 1개 업데이트)", GX, 24);
    // 기준선(raw=12)
    var y12 = GY + GH - (12 / MAXB) * GH;
    ctx.strokeStyle = "rgba(239,83,80,0.4)"; ctx.setLineDash([5, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(GX, y12); ctx.lineTo(GX + GW, y12); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(239,83,80,0.7)"; ctx.font = "600 10px 'Segoe UI',sans-serif"; ctx.fillText("raw 12B", GX + GW - 50, y12 - 4);
    // 막대
    var bw = GW / 40;
    for (var i = 0; i < st.hist.length; i++) {
      var b = st.hist[i], h = (b / MAXB) * GH, x = GX + i * bw;
      rr(x + 1, GY + GH - h, bw - 2, h, 2); ctx.fillStyle = modeColor(); ctx.fill();
    }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "raw" ? "raw: 매 틱 float 3개(12B) 통째로" : st.mode === "quant" ? "Quantize: 정밀도 낮춰 2B씩(6B)" : "Quantize + Delta: 바뀐 성분만(평균 수 B)", LW / 2, LH - 12);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue14-caption"); if (!c) return;
    c.textContent = st.mode === "raw"
      ? "raw: 위치(x,y,z) float 3개를 매 틱 12바이트 통째로 보내. 수천 명 × 60틱이면 어마어마해."
      : st.mode === "quant"
        ? "Quantize: 좌표 정밀도를 게임에 필요한 만큼만 남겨 2바이트씩으로 줄여(6B). 눈엔 차이 없는데 절반."
        : "Quantize + Delta: 거기에 '바뀐 성분만' 보내. 가만히 서 있으면 거의 0, 한 축만 움직이면 그 축만. 이게 Iris가 데이터 지향(배치)으로 더 효율적으로 짜내는 방향이야.";
  }
  function sel(m) { st.mode = m; st.hist = []; st.cum = 0; st.cumRaw = 0; var t = document.querySelectorAll(".ue14tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) { update(1); draw(); } }
  var tabs = document.querySelectorAll(".ue14tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("ue14-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { for (var i = 0; i < 30; i++) update(1); draw(); var n = document.getElementById("ue14-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
