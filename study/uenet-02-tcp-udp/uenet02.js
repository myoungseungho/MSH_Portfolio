/* uenet-02-tcp-udp — 같은 유실 채널에 TCP(재전송·순서보장) vs UDP(유실·빠름) 동시 비교 */
(function () {
  "use strict";
  var canvas = document.getElementById("ue2-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 340;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var L = 60, R = 672, ZONE = 366; // 유실 지대 x
  var TCPY = 96, UDPY = 246;
  var st = { loss: 0.15, running: true,
    tcp: { parts: [], seq: 1, acc: 0, arrived: 0, resent: 0 },
    udp: { parts: [], seq: 1, acc: 0, arrived: 0, lost: 0 } };
  var C = { bg: "#0e1426", lane: "#1b2740", zone: "rgba(239,83,80,0.12)", tcp: "#66bb6a", udp: "#42a5f5", pkt: "#ffca28", resent: "#ffa726", bad: "#ef5350", text: "#e3eaf5", sub: "#90a4c4" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function step(lane, y, dt, isTcp) {
    lane.acc += dt;
    if (lane.acc > 0.45) { lane.acc = 0; if (lane.parts.length < 40) lane.parts.push({ seq: lane.seq++, x: L, passed: false, resent: false, puff: 0 }); }
    for (var i = lane.parts.length - 1; i >= 0; i--) {
      var p = lane.parts[i];
      if (p.puff > 0) { p.puff -= dt; if (p.puff <= 0) lane.parts.splice(i, 1); continue; }
      p.x += 240 * dt;
      if (!p.passed && p.x >= ZONE) {
        p.passed = true;
        if (Math.random() < st.loss) {
          if (isTcp) { p.puff = 0.25; lane.resent++; lane.parts.push({ seq: p.seq, x: L, passed: false, resent: true, puff: 0 }); }
          else { p.puff = 0.25; lane.lost++; }
        }
      }
      if (p.x >= R && p.puff === 0) { lane.arrived++; lane.parts.splice(i, 1); }
    }
  }

  function update(dt) {
    step(st.tcp, TCPY, dt, true);
    step(st.udp, UDPY, dt, false);
    setText("ue2-tcp", st.tcp.arrived); setText("ue2-resent", st.tcp.resent);
    setText("ue2-udp", st.udp.arrived); setText("ue2-lost", st.udp.lost);
  }

  var sx = 1, sy = 1;
  function laneDraw(lane, y, color, name) {
    ctx.strokeStyle = C.lane; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke();
    ctx.fillStyle = color; ctx.textAlign = "left"; ctx.font = "700 13px 'Segoe UI',sans-serif"; ctx.textBaseline = "alphabetic";
    ctx.fillText(name, L, y - 18);
    // 출발/도착
    ctx.fillStyle = C.sub; ctx.font = "600 10px 'Segoe UI',sans-serif";
    ctx.fillText("보냄", L - 4, y + 22); ctx.textAlign = "right"; ctx.fillText("받음", R + 4, y + 22); ctx.textAlign = "left";
    for (var i = 0; i < lane.parts.length; i++) {
      var p = lane.parts[i];
      ctx.beginPath(); ctx.arc(p.x, y, 10, 0, 6.2832);
      ctx.fillStyle = p.puff > 0 ? C.bad : (p.resent ? C.resent : C.pkt); ctx.fill();
      ctx.fillStyle = "#0c1220"; ctx.font = "700 9px 'Segoe UI',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(p.seq, p.x, y + 1); ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    }
  }
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    ctx.fillStyle = C.zone; rr(ZONE - 22, 24, 44, LH - 48, 8); ctx.fill();
    ctx.fillStyle = C.bad; ctx.textAlign = "center"; ctx.font = "700 11px 'Segoe UI',sans-serif"; ctx.fillText("유실 지대", ZONE, 20);
    laneDraw(st.tcp, TCPY, C.tcp, "TCP — 재전송 + 순서 보장 (우리 서버)");
    laneDraw(st.udp, UDPY, C.udp, "UDP — 빠름, 유실 그대로 (UE)");
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue2-caption"); if (!c) return;
    var pct = Math.round(st.loss * 100);
    c.textContent = "유실 " + pct + "%. TCP는 잃은 패킷(빨강)을 다시 보내(주황) 결국 다 도착 + 순서 보장 — 대신 재전송 대기로 느려질 수 있어(HOL). UDP는 잃으면 그냥 사라져(빠르지만 구멍). 그래서 우리 서버는 TCP(돈·아이템은 절대 유실 X), UE는 UDP(이동은 0.1초 늦은 옛 위치보다 최신이 중요).";
  }
  function sel(v) { st.loss = parseInt(v, 10) / 100; var t = document.querySelectorAll(".ue2tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-loss") === v); var sl = document.getElementById("ue2-loss"); if (sl) sl.value = parseInt(v, 10); var lv = document.getElementById("ue2-loss-val"); if (lv) lv.textContent = parseInt(v, 10); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".ue2tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-loss")); }); })(tabs[i]);
  var sl = document.getElementById("ue2-loss");
  if (sl) sl.addEventListener("input", function () { st.loss = parseInt(sl.value, 10) / 100; var lv = document.getElementById("ue2-loss-val"); if (lv) lv.textContent = sl.value; var t = document.querySelectorAll(".ue2tab"); for (var i = 0; i < t.length; i++) t[i].classList.remove("active"); setCap(); });
  var pl = document.getElementById("ue2-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { draw(); var n = document.getElementById("ue2-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
