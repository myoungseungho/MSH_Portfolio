/* matchmaking — MMR 대기열: 대기할수록 허용 범위를 넓혀 매칭. 품질 vs 속도 */
(function () {
  "use strict";
  var canvas = document.getElementById("mm-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 340;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var st = { mode: "quality", running: true, queue: [], spawnAcc: 0, matchAcc: 0, matched: 0, sumWait: 0, sumGap: 0, flashPair: null, flashT: 0 };
  var C = { bg: "#0e1426", q: "#172033", text: "#e3eaf5", sub: "#90a4c4", good: "#66bb6a", warn: "#ffa726", bad: "#ef5350", bar: "#42a5f5" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function baseWin() { return st.mode === "quality" ? 40 : 250; }
  function growth() { return st.mode === "quality" ? 60 : 200; } // 초당 범위 증가

  function tryMatch() {
    // 가장 가까운 MMR 쌍 중 둘 다 허용 범위 안인 것
    st.queue.sort(function (a, b) { return a.mmr - b.mmr; });
    for (var i = 0; i < st.queue.length - 1; i++) {
      var a = st.queue[i], b = st.queue[i + 1], gap = b.mmr - a.mmr;
      var win = Math.min(baseWin() + growth() * Math.max(a.wait, b.wait), 900);
      if (gap <= win) {
        st.matched++; st.sumWait += (a.wait + b.wait) / 2; st.sumGap += gap;
        st.flashPair = { aw: Math.round(a.mmr), bw: Math.round(b.mmr), gap: gap }; st.flashT = 0.6;
        st.queue.splice(i, 2); return true;
      }
    }
    return false;
  }

  function update(dt) {
    st.spawnAcc += dt; if (st.spawnAcc > 0.45 && st.queue.length < 14) { st.spawnAcc = 0; st.queue.push({ mmr: 1000 + Math.random() * 1000, wait: 0 }); }
    for (var i = 0; i < st.queue.length; i++) st.queue[i].wait += dt;
    st.matchAcc += dt; if (st.matchAcc > 0.3) { st.matchAcc = 0; tryMatch(); }
    if (st.flashT > 0) st.flashT -= dt;
    setText("mm-wait", st.matched ? (st.sumWait / st.matched).toFixed(1) + "s" : "-");
    setText("mm-gap", st.matched ? Math.round(st.sumGap / st.matched) : "-");
    setText("mm-q", st.queue.length);
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("대기열 (MMR 순 정렬)", 24, 24);
    // MMR 스케일 바: 각 플레이어를 MMR 위치에 점으로
    var X0 = 30, X1 = 690, Y = 70;
    ctx.strokeStyle = "#2a3650"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0, Y); ctx.lineTo(X1, Y); ctx.stroke();
    ctx.fillStyle = C.sub; ctx.font = "600 10px 'Segoe UI',sans-serif"; ctx.fillText("MMR 1000", X0, Y + 22); ctx.textAlign = "right"; ctx.fillText("2000", X1, Y + 22); ctx.textAlign = "left";
    for (var i = 0; i < st.queue.length; i++) {
      var p = st.queue[i], px = X0 + (p.mmr - 1000) / 1000 * (X1 - X0);
      var win = Math.min(baseWin() + growth() * p.wait, 900);
      // 허용 범위 표시(옅게)
      var wpx = win / 1000 * (X1 - X0);
      ctx.fillStyle = "rgba(66,165,245,0.07)"; rr(px - wpx, Y - 8, wpx * 2, 16, 3); ctx.fill();
      ctx.beginPath(); ctx.arc(px, Y, 6, 0, 6.2832); ctx.fillStyle = p.wait > 2 ? C.warn : C.bar; ctx.fill();
    }
    // 매치 결과
    if (st.flashT > 0 && st.flashPair) {
      ctx.fillStyle = st.flashPair.gap < 100 ? C.good : (st.flashPair.gap < 250 ? C.warn : C.bad);
      ctx.textAlign = "center"; ctx.font = "700 15px 'Segoe UI',sans-serif";
      ctx.fillText("매치! " + st.flashPair.aw + " vs " + st.flashPair.bw + "  (차이 " + st.flashPair.gap + ")", LW / 2, 150);
    }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "quality" ? "품질 우선: 허용 범위 좁게 시작 → MMR 비슷하게(공정), 대기 길어짐" : "속도 우선: 허용 범위 넓게 → 빨리 매칭되지만 실력 차 큼", LW / 2, LH - 16);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("mm-caption"); if (!c) return;
    c.textContent = st.mode === "quality"
      ? "품질 우선: 처음엔 MMR 차가 작은 상대만 허용해(공정한 매치). 오래 기다린 사람은 범위를 점점 넓혀줘 — 영영 못 잡는 일은 없게. 대신 평균 대기가 길어져. 점이 노랗게 변하는 게 '오래 기다림'이야."
      : "속도 우선: 허용 범위를 처음부터 넓게 둬서 빨리 붙여줘. 대기 시간은 짧지만, MMR 차가 큰(한쪽이 압도하는) 매치가 늘어. 대기 vs 공정성의 트레이드오프야.";
  }
  function sel(m) { st.mode = m; st.matched = 0; st.sumWait = 0; st.sumGap = 0; var t = document.querySelectorAll(".mmtab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".mmtab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("mm-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { for (var i = 0; i < 8; i++) st.queue.push({ mmr: 1000 + Math.random() * 1000, wait: Math.random() * 3 }); draw(); var n = document.getElementById("mm-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
