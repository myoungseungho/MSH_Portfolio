/* uenet-09-replication — 서버의 Replicated 변수가 바뀌면 클라로 복제 + OnRep 발화. 변경분만 전송. */
(function () {
  "use strict";
  var canvas = document.getElementById("ue9-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 360;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var props = [
    { name: "Health", sval: 100, c: [100, 100], flash: [0, 0], unit: "" },
    { name: "Ammo", sval: 30, c: [30, 30], flash: [0, 0], unit: "" },
    { name: "Name", sval: "Kim", c: ["Kim", "Kim"], flash: [0, 0], unit: "", txt: true }
  ];
  var st = { mode: "all", running: true, parts: [], acc: 0, sent: 0, saved: 0, skipFlash: 0 };
  var SV = { x: 270, y: 24, w: 180, h: 116 };
  var CL = [{ x: 30, y: 240 }, { x: 470, y: 240 }];
  var CW = 220, CH = 116;
  var C = { bg: "#0e1426", server: "#1b3a2c", serverB: "#66bb6a", client: "#16243a", clientB: "#42a5f5", val: "#e3eaf5", changed: "#ffca28", onrep: "#66bb6a", sub: "#90a4c4", line: "#2a3650" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function changeProp() {
    var idx;
    if (st.mode === "hp") idx = 0; else if (st.mode === "ammo") idx = 1; else idx = (Math.random() * props.length) | 0;
    var p = props[idx];
    if (p.txt) { p.sval = ["Kim", "Lee", "Park", "Choi"][(Math.random() * 4) | 0]; }
    else if (idx === 0) { p.sval = Math.max(0, Math.min(100, p.sval + (Math.random() < 0.5 ? -10 : 10))); }
    else { p.sval = Math.max(0, p.sval + (Math.random() < 0.5 ? -3 : 5)); }
    for (var c = 0; c < 2; c++) st.parts.push({ idx: idx, ci: c, val: p.sval, x: SV.x + SV.w / 2, y: SV.y + SV.h, tx: CL[c].x + CW / 2, ty: CL[c].y, t: 0 });
    st.sent++;
    st.saved += (props.length - 1) * 2; // 안 바뀐 나머지 속성은 전송 안 함
    st.skipFlash = 0.4;
  }

  function update(dt) {
    st.acc += dt; if (st.acc > 1.3) { st.acc = 0; changeProp(); }
    for (var k = st.parts.length - 1; k >= 0; k--) { var pt = st.parts[k]; pt.t += dt * 1.5; if (pt.t >= 1) { props[pt.idx].c[pt.ci] = pt.val; props[pt.idx].flash[pt.ci] = 0.6; st.parts.splice(k, 1); } }
    for (var i = 0; i < props.length; i++) for (var c = 0; c < 2; c++) if (props[i].flash[c] > 0) props[i].flash[c] -= dt;
    if (st.skipFlash > 0) st.skipFlash -= dt;
    setText("ue9-sent", st.sent); setText("ue9-saved", st.saved);
  }

  var sx = 1, sy = 1;
  function panel(x, y, w, h, base, border, title, vals, flashArr) {
    rr(x, y, w, h, 10); ctx.fillStyle = base; ctx.fill();
    ctx.strokeStyle = border; ctx.lineWidth = 2; rr(x, y, w, h, 10); ctx.stroke();
    ctx.fillStyle = "#e3eaf5"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = "700 13px 'Segoe UI',sans-serif";
    ctx.fillText(title, x + 14, y + 24);
    for (var i = 0; i < props.length; i++) {
      var ry = y + 44 + i * 24;
      ctx.fillStyle = C.sub; ctx.font = "600 12px 'Segoe UI',sans-serif"; ctx.textAlign = "left";
      ctx.fillText(props[i].name, x + 14, ry);
      var fl = flashArr ? flashArr[i] : 0;
      ctx.fillStyle = fl > 0 ? C.onrep : C.val; ctx.textAlign = "right"; ctx.font = "700 13px 'Segoe UI',sans-serif";
      ctx.fillText(String(vals[i]) + (fl > 0 ? "  ◀ OnRep!" : ""), x + w - 14, ry);
    }
  }
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    for (var c = 0; c < 2; c++) { ctx.beginPath(); ctx.moveTo(SV.x + SV.w / 2, SV.y + SV.h); ctx.lineTo(CL[c].x + CW / 2, CL[c].y); ctx.stroke(); }
    panel(SV.x, SV.y, SV.w, SV.h, C.server, C.serverB, "서버 (원본·권위)", props.map(function (p) { return p.sval; }), null);
    panel(CL[0].x, CL[0].y, CW, CH, C.client, C.clientB, "클라 1 (복제본)", props.map(function (p) { return p.c[0]; }), props.map(function (p) { return p.flash[0]; }));
    panel(CL[1].x, CL[1].y, CW, CH, C.client, C.clientB, "클라 2 (복제본)", props.map(function (p) { return p.c[1]; }), props.map(function (p) { return p.flash[1]; }));
    for (var p = 0; p < st.parts.length; p++) { var pt = st.parts[p], x = pt.x + (pt.tx - pt.x) * pt.t, y = pt.y + (pt.ty - pt.y) * pt.t; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.2832); ctx.fillStyle = C.changed; ctx.fill(); ctx.fillStyle = "#0c1220"; ctx.font = "700 8px 'Segoe UI',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(pt.val).slice(0, 3), x, y + 1); ctx.textBaseline = "alphabetic"; }
    ctx.fillStyle = st.skipFlash > 0 ? C.sub : "#46506a"; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText("바뀐 속성만 전송 — 안 바뀐 건 안 보냄", LW / 2, 178);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue9-caption"); if (!c) return;
    c.textContent = "리플리케이션: 서버의 변수에 'Replicated' 표시만 해두면, 값이 바뀔 때 엔진이 알아서 클라로 보내. 클라는 받으면 그 변수를 갱신하고 OnRep 콜백을 불러(예: 체력바 다시 그리기). 핵심 2가지 — ① 우리처럼 패킷을 손으로 안 짜도 됨(선언만) ② 바뀐 속성만 보냄(안 바뀐 건 생략). 탭으로 어떤 값이 바뀌게 할지 골라봐.";
  }
  function sel(m) { st.mode = m; var t = document.querySelectorAll(".ue9tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".ue9tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("ue9-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { draw(); var n = document.getElementById("ue9-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
