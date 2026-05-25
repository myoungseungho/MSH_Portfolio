/* uenet-06-channel-bunch — 채널들이 만든 bunch가 한 패킷(MTU)에 모여 실리고, 차면 송신 */
(function () {
  "use strict";
  var canvas = document.getElementById("ue6-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 350;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var chans = [
    { name: "Control 채널", c: "#42a5f5", y: 60, acc: 0, rate: 2.2 },
    { name: "Actor 채널 A", c: "#66bb6a", y: 130, acc: 0, rate: 1.1 },
    { name: "Actor 채널 B", c: "#ab47bc", y: 200, acc: 0, rate: 1.4 }
  ];
  var st = { mtu: 6, running: true, pktBunches: [], sent: 0, totalBunches: 0, flying: [], flyPkts: [], tickAcc: 0 };
  var PKT = { x: 300, y: 90, w: 120, h: 150 };
  var C = { bg: "#0e1426", text: "#e3eaf5", sub: "#90a4c4", line: "#2a3650", pkt: "#11192c", pktB: "#5c6bc0" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function sendPacket() {
    if (st.pktBunches.length === 0) return;
    st.flyPkts.push({ bunches: st.pktBunches.slice(), x: PKT.x + PKT.w, t: 0 });
    st.sent++; st.pktBunches = [];
  }

  function update(dt) {
    for (var i = 0; i < chans.length; i++) {
      var ch = chans[i]; ch.acc += dt * ch.rate;
      while (ch.acc >= 1) { ch.acc -= 1; st.flying.push({ x: 70, y: ch.y, c: ch.c, t: 0, from: ch.y }); }
    }
    for (var f = st.flying.length - 1; f >= 0; f--) {
      var fl = st.flying[f]; fl.t += dt * 1.6;
      if (fl.t >= 1) { st.flying.splice(f, 1); st.pktBunches.push(fl.c); st.totalBunches++; if (st.pktBunches.length >= st.mtu) sendPacket(); }
    }
    st.tickAcc += dt; if (st.tickAcc > 1.2) { st.tickAcc = 0; sendPacket(); }
    for (var p = st.flyPkts.length - 1; p >= 0; p--) { st.flyPkts[p].t += dt * 1.4; if (st.flyPkts[p].t >= 1) st.flyPkts.splice(p, 1); }
    setText("ue6-sent", st.sent);
    setText("ue6-avg", st.sent ? (st.totalBunches / st.sent).toFixed(1) : "0");
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    // 채널들
    for (var i = 0; i < chans.length; i++) {
      var ch = chans[i];
      rr(20, ch.y - 18, 110, 36, 8); ctx.fillStyle = ch.c; ctx.fill();
      ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 11px 'Segoe UI',sans-serif";
      ctx.fillText(ch.name, 75, ch.y); ctx.textBaseline = "alphabetic";
    }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("현재 패킷 (MTU=" + st.mtu + " bunch)", PKT.x + PKT.w / 2, PKT.y - 10);
    // 패킷 박스
    rr(PKT.x, PKT.y, PKT.w, PKT.h, 10); ctx.fillStyle = C.pkt; ctx.fill();
    var bh = (PKT.h - 12) / st.mtu;
    for (var b = 0; b < st.pktBunches.length; b++) { rr(PKT.x + 8, PKT.y + PKT.h - 6 - (b + 1) * bh + 3, PKT.w - 16, bh - 4, 4); ctx.fillStyle = st.pktBunches[b]; ctx.fill(); }
    // 날아가는 bunch
    for (var f = 0; f < st.flying.length; f++) { var fl = st.flying[f], tx = PKT.x + PKT.w / 2, ty = PKT.y + PKT.h - 12; var x = fl.x + (tx - fl.x) * fl.t, y = fl.from + (ty - fl.from) * fl.t; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.2832); ctx.fillStyle = fl.c; ctx.fill(); }
    // 송신된 패킷
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.fillText("수신", 660, PKT.y - 10);
    for (var p = 0; p < st.flyPkts.length; p++) {
      var fp = st.flyPkts[p]; var x = PKT.x + PKT.w + (640 - (PKT.x + PKT.w)) * fp.t;
      rr(x, PKT.y + 40, 40, 70, 6); ctx.fillStyle = "#243049"; ctx.fill();
      for (var b2 = 0; b2 < fp.bunches.length; b2++) { rr(x + 4, PKT.y + 44 + b2 * 9, 32, 7, 2); ctx.fillStyle = fp.bunches[b2]; ctx.fill(); }
    }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText("여러 채널의 bunch가 한 패킷에 섞여 실린다 → 차거나 틱이면 송신", LW / 2, LH - 12);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue6-caption"); if (!c) return;
    c.textContent = "채널(Channel)은 데이터 흐름의 갈래야 — Control(연결 관리), Actor(액터별) 등. 각 채널이 보낼 조각을 'Bunch'로 만들어. NetConnection은 여러 채널의 Bunch를 한 패킷(MTU 한도)에 모아 담고, 차거나 틱이 되면 송신해. MTU를 줄이면(작은 패킷) 더 자주 쪼개 보내고, 키우면 한 번에 많이 실어. 우리로 치면 SIOCPPacket + 송신 큐 자리야.";
  }
  function sel(v) { st.mtu = parseInt(v, 10); st.pktBunches = []; var t = document.querySelectorAll(".ue6tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-mtu") === v); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".ue6tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-mtu")); }); })(tabs[i]);
  var pl = document.getElementById("ue6-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { st.pktBunches = ["#42a5f5", "#66bb6a", "#ab47bc"]; draw(); var n = document.getElementById("ue6-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
