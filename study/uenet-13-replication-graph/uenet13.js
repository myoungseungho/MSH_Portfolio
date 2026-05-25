/* uenet-13-replication-graph — 전수 관련성 검사 vs 공간 그리드(이웃 셀만) */
(function () {
  "use strict";
  var canvas = document.getElementById("ue13-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 360;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var COLS = 8, ROWS = 5, GX = 30, GY = 30, GW = 660, GH = 280;
  var CW = GW / COLS, CH = GH / ROWS;
  var st = { mode: "graph", running: true, t: 0, actors: [], player: { c: 3, r: 2 }, acc: 0 };
  function init() { st.actors = []; for (var i = 0; i < 80; i++) st.actors.push({ c: (Math.random() * COLS) | 0, r: (Math.random() * ROWS) | 0 }); }
  var C = { bg: "#0e1426", grid: "#1c2740", cellHi: "rgba(102,187,106,0.16)", actor: "#37474f", actorChk: "#ffca28", player: "#42a5f5", text: "#e3eaf5", sub: "#90a4c4" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function cellX(c) { return GX + c * CW; }
  function cellY(r) { return GY + r * CH; }
  function inNeighbor(a) { return Math.abs(a.c - st.player.c) <= 1 && Math.abs(a.r - st.player.r) <= 1; }

  function update(dt) {
    st.acc += dt;
    if (st.acc > 1.4) { st.acc = 0; st.player.c = (st.player.c + 1 + ((Math.random() * 2) | 0)) % COLS; st.player.r = (Math.random() * ROWS) | 0; }
    var checks = st.mode === "naive" ? st.actors.length : st.actors.filter(inNeighbor).length;
    setText("ue13-checks", checks);
    setText("ue13-total", st.actors.length);
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    // 그리드
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (var c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(cellX(c), GY); ctx.lineTo(cellX(c), GY + GH); ctx.stroke(); }
    for (var r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(GX, cellY(r)); ctx.lineTo(GX + GW, cellY(r)); ctx.stroke(); }
    // 검사 대상 셀 강조
    if (st.mode === "graph") {
      for (var dc = -1; dc <= 1; dc++) for (var dr = -1; dr <= 1; dr++) {
        var cc = st.player.c + dc, rr2 = st.player.r + dr;
        if (cc < 0 || cc >= COLS || rr2 < 0 || rr2 >= ROWS) continue;
        ctx.fillStyle = C.cellHi; rr(cellX(cc), cellY(rr2), CW, CH, 0); ctx.fill();
      }
    } else {
      ctx.fillStyle = "rgba(255,202,40,0.06)"; rr(GX, GY, GW, GH, 0); ctx.fill();
    }
    // 액터
    for (var i = 0; i < st.actors.length; i++) {
      var a = st.actors[i];
      var x = cellX(a.c) + CW / 2 + (a.c * 13 % (CW - 16)) - CW / 2 + 8 + (i % 3) * 7;
      var px = cellX(a.c) + 8 + (i * 7 % (CW - 14));
      var py = cellY(a.r) + 8 + (i * 5 % (CH - 14));
      var chk = st.mode === "naive" || inNeighbor(a);
      ctx.beginPath(); ctx.arc(px, py, chk ? 5 : 4, 0, 6.2832); ctx.fillStyle = chk ? C.actorChk : C.actor; ctx.fill();
    }
    // 플레이어
    var pxp = cellX(st.player.c) + CW / 2, pyp = cellY(st.player.r) + CH / 2;
    ctx.beginPath(); ctx.arc(pxp, pyp, 9, 0, 6.2832); ctx.fillStyle = C.player; ctx.fill();
    ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 9px 'Segoe UI',sans-serif"; ctx.fillText("나", pxp, pyp + 1); ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "naive" ? "전수 검사: 모든 액터를 일일이 거리 계산(노랑 전부)" : "ReplicationGraph: 내 셀 + 이웃 8칸만 검사(노랑만)", LW / 2, LH - 12);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue13-caption"); if (!c) return;
    c.textContent = st.mode === "naive"
      ? "전수 검사(기본): 매 틱, 클라마다 '모든 액터'와 거리 계산해 관련성을 판단해. 액터 N × 클라 M = N×M 비교. 수천 명·수만 액터면 이것만으로 서버가 휘청여."
      : "ReplicationGraph: 액터를 미리 공간 격자(노드)에 넣어두면, 클라는 '자기 셀 + 이웃'만 보면 돼. 멀리 있는 셀은 아예 안 봐 — 비교가 N×M에서 확 줄어. 우리 채널·존 격자(AOI 그리드)와 같은 발상이야.";
  }
  function sel(m) { st.mode = m; var t = document.querySelectorAll(".ue13tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) { update(0); draw(); } }
  var tabs = document.querySelectorAll(".ue13tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("ue13-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  init(); setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { update(0); draw(); var n = document.getElementById("ue13-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
