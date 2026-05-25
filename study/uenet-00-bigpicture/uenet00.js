/* uenet-00-bigpicture — 언리얼 네트워크 한 장의 그림
 * rep : 서버 액터가 움직이면 상태가 클라들로 복제(서버→클라 스냅샷)
 * rpc : 클라가 이벤트 → Server RPC → 서버 → Multicast → 모든 클라
 */
(function () {
  "use strict";
  var canvas = document.getElementById("ue0-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 380;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var st = { mode: "rep", running: true, t: 0, repCount: 0, rpcCount: 0,
    serverW: 0.5, clients: [{ w: 0.5, flash: 0 }, { w: 0.5, flash: 0 }],
    parts: [], snapAcc: 0, rpcAcc: 0, serverFlash: 0 };

  var SV = { x: 250, y: 26, w: 220, h: 74 };
  var CL = [{ x: 40, y: 268, w: 290, h: 80 }, { x: 390, y: 268, w: 290, h: 80 }];

  var C = { bg: "#0e1426", server: "#66bb6a", client: "#42a5f5", actor: "#ffca28",
    text: "#0c1220", sub: "#90a4c4", line: "#2a3650", rep: "#26c6da", rpc: "#ef5350", white: "#e3eaf5" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function box(b, fill, label, sub, flash) {
    rr(b.x, b.y, b.w, b.h, 12); ctx.fillStyle = flash > 0 ? "#fff59d" : fill; ctx.fill();
    ctx.fillStyle = C.text; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = "700 14px 'Segoe UI',sans-serif"; ctx.fillText(label, b.x + 14, b.y + 22);
    if (sub) { ctx.fillStyle = "rgba(12,18,32,0.7)"; ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.fillText(sub, b.x + 14, b.y + 38); }
  }
  function actorDot(b, w, flash) {
    var m = 22, x = b.x + m + w * (b.w - 2 * m), y = b.y + b.h - 20;
    ctx.beginPath(); ctx.arc(x, y, flash > 0 ? 12 : 9, 0, 6.2832); ctx.fillStyle = flash > 0 ? C.rpc : C.actor; ctx.fill();
    return { x: x, y: y };
  }

  function emit(from, to, color) { st.parts.push({ x: from.x, y: from.y, tx: to.x, ty: to.y, t: 0, c: color }); }

  function update(dt) {
    st.t += dt;
    st.serverW = 0.5 + 0.42 * Math.sin(st.t * 1.1);
    if (st.serverFlash > 0) st.serverFlash -= dt;
    for (var i = 0; i < 2; i++) {
      var cl = st.clients[i];
      cl.w += (cl.tw != null ? (cl.tw - cl.w) : 0) * Math.min(1, dt * 6);
      if (cl.flash > 0) cl.flash -= dt;
    }
    // 파티클
    for (var p = st.parts.length - 1; p >= 0; p--) {
      var pt = st.parts[p]; pt.t += dt * 1.6;
      if (pt.t >= 1) { if (pt.onDone) pt.onDone(); st.parts.splice(p, 1); }
    }
    if (st.mode === "rep") {
      st.snapAcc += dt;
      if (st.snapAcc > 0.55) {
        st.snapAcc = 0;
        var sd = { x: SV.x + SV.w / 2, y: SV.y + SV.h };
        var sw = st.serverW;
        for (var c = 0; c < 2; c++) (function (c) {
          var cd = { x: CL[c].x + CL[c].w / 2, y: CL[c].y };
          var pt = { x: sd.x, y: sd.y, tx: cd.x, ty: cd.y, t: 0, c: C.rep, onDone: function () { st.clients[c].tw = sw; } };
          st.parts.push(pt); st.repCount++;
        })(c);
      }
    } else {
      st.rpcAcc += dt;
      if (st.rpcAcc > 2.0) {
        st.rpcAcc = 0;
        var src = (Math.random() < 0.5) ? 0 : 1;
        var cd = { x: CL[src].x + CL[src].w / 2, y: CL[src].y };
        var sd2 = { x: SV.x + SV.w / 2, y: SV.y + SV.h };
        st.parts.push({ x: cd.x, y: cd.y, tx: sd2.x, ty: sd2.y, t: 0, c: C.rpc, onDone: function () {
          st.serverFlash = 0.3; st.rpcCount++;
          for (var c = 0; c < 2; c++) (function (c) {
            var ccd = { x: CL[c].x + CL[c].w / 2, y: CL[c].y };
            st.parts.push({ x: sd2.x, y: sd2.y, tx: ccd.x, ty: ccd.y, t: 0, c: C.rpc, onDone: function () { st.clients[c].flash = 0.35; } });
          })(c);
        } });
      }
    }
    setText("ue0-rep", st.repCount); setText("ue0-rpc", st.rpcCount);
  }

  var scaleX = 1, scaleY = 1;
  function draw() {
    ctx.save(); ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    // 연결선
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    for (var c = 0; c < 2; c++) { ctx.beginPath(); ctx.moveTo(SV.x + SV.w / 2, SV.y + SV.h); ctx.lineTo(CL[c].x + CL[c].w / 2, CL[c].y); ctx.stroke(); }
    box(SV, C.server, "서버 (권위 · 진실)", "월드 액터 원본", st.serverFlash);
    actorDot(SV, st.serverW, st.serverFlash);
    box(CL[0], C.client, "클라이언트 1", "복제본", st.clients[0].flash);
    actorDot(CL[0], st.clients[0].w, st.clients[0].flash);
    box(CL[1], C.client, "클라이언트 2", "복제본", st.clients[1].flash);
    actorDot(CL[1], st.clients[1].w, st.clients[1].flash);
    // 파티클
    for (var p = 0; p < st.parts.length; p++) {
      var pt = st.parts[p]; var x = pt.x + (pt.tx - pt.x) * pt.t, y = pt.y + (pt.ty - pt.y) * pt.t;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.2832); ctx.fillStyle = pt.c; ctx.fill();
    }
    // 라벨
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 13px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "rep" ? "● 상태 복제: 서버 → 클라 (서버가 진실)" : "● RPC: 클라 → 서버 → Multicast(모든 클라)",
      LW / 2, 150);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); scaleX = w * dpr / LW; scaleY = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue0-caption"); if (!c) return;
    c.textContent = st.mode === "rep"
      ? "상태 복제(replication): 서버의 액터가 움직이면 그 상태가 클라들로 흘러가. 클라는 '복제본'을 볼 뿐, 진실은 항상 서버야. 클라가 살짝 늦게 따라오는 게 보이지?"
      : "RPC: 클라가 '점프할래' 같은 이벤트를 서버에 요청(Server RPC) → 서버가 판정 → Multicast로 모든 클라에 뿌려 다 같이 보게 해. 요청은 위로, 결과는 아래로.";
  }
  function sel(m) { st.mode = m; var t = document.querySelectorAll(".ue0tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".ue0tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("ue0-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { st.clients[0].w = 0.5; st.clients[1].w = 0.5; draw(); var n = document.getElementById("ue0-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
