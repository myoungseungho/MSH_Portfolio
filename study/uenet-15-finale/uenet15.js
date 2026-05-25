/* uenet-15-finale — 동접 증가: UE 단일 월드(포화) vs 우리 채널·존 샤딩(확장) */
(function () {
  "use strict";
  var canvas = document.getElementById("ue15-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 330;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var CAP = 100;
  var st = { mode: "mmo", pop: 240, running: true, t: 0 };
  var C = { bg: "#0e1426", box: "#1b2740", fill: "#42a5f5", fillHot: "#ef5350", ok: "#66bb6a", text: "#e3eaf5", sub: "#90a4c4", border: "#2a3650" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function update(dt) {
    setText("ue15-pop", st.pop);
    setText("ue15-srv", st.mode === "ue" ? "1" : Math.max(1, Math.ceil(st.pop / CAP)));
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    if (st.mode === "ue") {
      var bw = 300, bh = 180, x = (LW - bw) / 2, y = 50;
      rr(x, y, bw, bh, 12); ctx.fillStyle = C.box; ctx.fill(); ctx.strokeStyle = C.border; ctx.lineWidth = 2; rr(x, y, bw, bh, 12); ctx.stroke();
      var ratio = Math.min(1, st.pop / CAP), over = st.pop > CAP;
      var fh = bh * ratio;
      rr(x, y + bh - fh, bw, fh, 12); ctx.fillStyle = over ? C.fillHot : C.fill; ctx.fill();
      ctx.fillStyle = C.text; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.font = "700 15px 'Segoe UI',sans-serif";
      ctx.fillText("UE 데디서버 = 1 월드 (1 프로세스)", LW / 2, y - 16);
      ctx.fillStyle = "#0c1220"; ctx.font = "700 13px 'Segoe UI',sans-serif";
      ctx.fillText("정원 ~" + CAP + "명", LW / 2, y + bh - 12);
      if (over) { ctx.fillStyle = C.fillHot; ctx.font = "700 14px 'Segoe UI',sans-serif"; ctx.fillText("⚠ 정원 초과 → 렉 / 입장 거부 (못 늘림)", LW / 2, y + bh + 30); }
      else { ctx.fillStyle = C.sub; ctx.font = "600 12px 'Segoe UI',sans-serif"; ctx.fillText("동접을 올려봐 — 한 월드라 정원에서 막혀", LW / 2, y + bh + 30); }
    } else {
      var nch = Math.max(1, Math.ceil(st.pop / CAP));
      var shown = Math.min(nch, 6);
      var bw = 96, gap = 14, totalW = shown * bw + (shown - 1) * gap, x0 = (LW - totalW) / 2, y = 60, bh = 150;
      ctx.fillStyle = C.text; ctx.textAlign = "center"; ctx.font = "700 15px 'Segoe UI',sans-serif"; ctx.textBaseline = "alphabetic";
      ctx.fillText("우리 MMO = 채널·존 다중 프로세스", LW / 2, 34);
      var remain = st.pop;
      for (var i = 0; i < shown; i++) {
        var x = x0 + i * (bw + gap);
        rr(x, y, bw, bh, 10); ctx.fillStyle = C.box; ctx.fill(); ctx.strokeStyle = C.border; ctx.lineWidth = 2; rr(x, y, bw, bh, 10); ctx.stroke();
        var inThis = Math.min(CAP, remain); remain -= inThis;
        var fh = bh * (inThis / CAP);
        rr(x, y + bh - fh, bw, fh, 10); ctx.fillStyle = C.ok; ctx.fill();
        ctx.fillStyle = C.sub; ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.textAlign = "center";
        ctx.fillText("채널 " + (i + 1), x + bw / 2, y + bh + 16);
        ctx.fillText(inThis + "명", x + bw / 2, y - 8);
      }
      if (nch > shown) { ctx.fillStyle = C.ok; ctx.font = "700 13px 'Segoe UI',sans-serif"; ctx.fillText("+" + (nch - shown) + " 채널 더…", LW / 2, y + bh + 38); }
      else { ctx.fillStyle = C.sub; ctx.font = "600 12px 'Segoe UI',sans-serif"; ctx.fillText("동접이 늘면 채널(프로세스)을 더 띄워 — 수평 확장", LW / 2, y + bh + 38); }
    }
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue15-caption"); if (!c) return;
    c.textContent = st.mode === "ue"
      ? "UE 데디서버는 '1 프로세스 = 1 월드'야. 복제 최적화(ReplicationGraph·Iris)로 정원을 늘려도 결국 한 월드라 천장이 있어. 동접을 정원 넘게 올리면 렉이 나거나 입장이 막혀 — 한 프로세스를 무한히 키울 순 없거든."
      : "우리 MMO는 채널·존 단위로 '프로세스를 여러 개' 띄워. 동접이 늘면 채널을 추가(수평 확장)하고, 채널 간 이동·거래는 서버간 메시지(DSM_)와 공용 DB로 잇지. 'UE가 못하는 것'이 정확히 '우리가 하는 것'이야.";
  }
  function sel(m) { st.mode = m; var t = document.querySelectorAll(".ue15tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) { update(0); draw(); } }
  var tabs = document.querySelectorAll(".ue15tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var sl = document.getElementById("ue15-slider");
  if (sl) sl.addEventListener("input", function () { st.pop = parseInt(sl.value, 10); var v = document.getElementById("ue15-pop-val"); if (v) v.textContent = st.pop; if (reduce) { update(0); draw(); } });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { update(0); draw(); var n = document.getElementById("ue15-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
