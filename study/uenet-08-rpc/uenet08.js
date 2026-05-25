/* uenet-08-rpc — Server/Client/Multicast RPC: 호출은 한 쪽, '실행'은 다른 쪽 */
(function () {
  "use strict";
  var canvas = document.getElementById("ue8-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 340;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var SV = { x: 285, y: 24, w: 150, h: 56 };
  var CL = [{ x: 40, y: 250 }, { x: 285, y: 250 }, { x: 530, y: 250 }];
  var CW = 150, CH = 56;
  var st = { mode: "server", running: true, parts: [], acc: 0, calls: 0, svFlash: 0, clFlash: [0, 0, 0] };
  var C = { bg: "#0e1426", server: "#66bb6a", client: "#42a5f5", run: "#ffca28", text: "#0c1220", sub: "#90a4c4", line: "#2a3650", call: "#ab47bc" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function cc(i) { return { x: CL[i].x + CW / 2, y: CL[i].y + CH / 2 }; }
  function sc() { return { x: SV.x + SV.w / 2, y: SV.y + SV.h / 2 }; }

  function fire() {
    st.calls++;
    if (st.mode === "server") {
      var src = (Math.random() * 3) | 0;
      st.parts.push({ a: cc(src), b: sc(), t: 0, c: C.call, on: function () { st.svFlash = 0.6; } });
    } else if (st.mode === "client") {
      var tgt = (Math.random() * 3) | 0;
      st.parts.push({ a: sc(), b: cc(tgt), t: 0, c: C.client, on: (function (tg) { return function () { st.clFlash[tg] = 0.6; }; })(tgt) });
    } else {
      for (var i = 0; i < 3; i++) st.parts.push({ a: sc(), b: cc(i), t: 0, c: C.client, on: (function (ii) { return function () { st.clFlash[ii] = 0.6; }; })(i) });
    }
  }

  function update(dt) {
    st.acc += dt; if (st.acc > 1.8 && st.parts.length === 0) { st.acc = 0; fire(); }
    for (var p = st.parts.length - 1; p >= 0; p--) { var pt = st.parts[p]; pt.t += dt * 1.5; if (pt.t >= 1) { if (pt.on) pt.on(); st.parts.splice(p, 1); } }
    if (st.svFlash > 0) st.svFlash -= dt;
    for (var i = 0; i < 3; i++) if (st.clFlash[i] > 0) st.clFlash[i] -= dt;
    setText("ue8-calls", st.calls);
    var rE = document.getElementById("ue8-run");
    if (rE) rE.textContent = st.mode === "server" ? "서버" : (st.mode === "client" ? "대상 클라 1명" : "모든 클라");
  }

  var sx = 1, sy = 1;
  function box(x, y, w, h, base, label, sub, flash) {
    rr(x, y, w, h, 10); ctx.fillStyle = flash > 0 ? C.run : base; ctx.fill();
    ctx.fillStyle = C.text; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.font = "700 13px 'Segoe UI',sans-serif";
    ctx.fillText(label, x + w / 2, y + h / 2 - 2);
    ctx.fillStyle = flash > 0 ? "#0c1220" : "rgba(12,18,32,0.7)"; ctx.font = "600 10px 'Segoe UI',sans-serif";
    ctx.fillText(flash > 0 ? "▶ 여기서 실행" : sub, x + w / 2, y + h / 2 + 13);
  }
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sc().x, SV.y + SV.h); ctx.lineTo(cc(i).x, CL[i].y); ctx.stroke(); }
    box(SV.x, SV.y, SV.w, SV.h, C.server, "서버 (권위)", "RPC 검증", st.svFlash);
    for (var i = 0; i < 3; i++) box(CL[i].x, CL[i].y, CW, CH, C.client, "클라 " + (i + 1), "복제본", st.clFlash[i]);
    for (var p = 0; p < st.parts.length; p++) { var pt = st.parts[p], x = pt.a.x + (pt.b.x - pt.a.x) * pt.t, y = pt.a.y + (pt.b.y - pt.a.y) * pt.t; ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.2832); ctx.fillStyle = pt.c; ctx.fill(); }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "server" ? "Server RPC: 클라가 호출 → 서버에서 실행 (+ 검증)" : st.mode === "client" ? "Client RPC: 서버가 호출 → 대상 클라 1명에서 실행" : "Multicast RPC: 서버가 호출 → 모든 클라에서 실행", LW / 2, 168);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue8-caption"); if (!c) return;
    c.textContent = st.mode === "server"
      ? "Server RPC: 클라가 함수를 '호출'하지만 실제 '실행'은 서버에서 돼. 클라가 '나 공격할래' 요청 → 서버가 검증(WithValidation)하고 진짜 판정. 우리 CM_ 핸들러랑 똑같은 자리야."
      : st.mode === "client"
        ? "Client RPC: 서버가 호출하면 대상 클라 1명에서 실행돼. '너만 이 컷신 재생해' 같은 개인 알림. 우리로 치면 특정 클라에게만 보내는 SM_."
        : "Multicast RPC(NetMulticast): 서버가 호출하면 모든 (관련) 클라에서 실행돼. '폭발 이펙트 다 같이 재생' 같은 거. 우리 BroadCast(SM_)랑 같아. reliable/unreliable로 꼭 도착 여부를 정해.";
  }
  function sel(m) { st.mode = m; st.parts = []; st.acc = 1.8; st.calls = 0; var t = document.querySelectorAll(".ue8tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".ue8tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("ue8-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { draw(); var n = document.getElementById("ue8-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
