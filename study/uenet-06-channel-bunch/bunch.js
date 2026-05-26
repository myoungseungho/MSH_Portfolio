/* bunch.js — Bunch 해부도 + 다중 + TCP vs UE 비교 (Ch06 보조 위젯) */
(function () {
  "use strict";
  var canvas = document.getElementById("bunch-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 360;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var st = { mode: "anat", running: true, t: 0, parts: [], acc: 0,
    // compare mode state
    tcpSent: 0, tcpDelivered: 0, tcpHolding: 0,
    ueSent: 0, ueDelivered: 0, ueResent: 0,
    // multi/loss mode
    sent: 0, delivered: 0, resent: 0, lost: 0
  };
  var C = { bg: "#0e1426", panel: "#172033", header: "#42a5f5", reliable: "#ffa726", unrel: "#5c6bc0", lost: "#ef5350", ok: "#66bb6a", text: "#e3eaf5", sub: "#90a4c4", track: "#1b2740" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawAnatomy() {
    // 큰 Bunch 한 개 분해도 — 헤더 필드별로 색·라벨
    var x = 60, y = 100, w = 600, h = 90;
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("Bunch 한 개 — 내부 구조", x, y - 14);
    // 4개 영역
    var labels = [
      { name: "ChannelIndex", desc: "어느 채널", w: 110, col: "#42a5f5" },
      { name: "bReliable", desc: "꼭 도착?", w: 70, col: "#ffa726" },
      { name: "Seq #", desc: "순번", w: 70, col: "#26c6da" },
      { name: "Payload", desc: "실제 데이터(변경분 / RPC 호출)", w: 350, col: "#66bb6a" }
    ];
    var cx = x;
    for (var i = 0; i < labels.length; i++) {
      var L = labels[i];
      rr(cx, y, L.w, h, 8); ctx.fillStyle = L.col; ctx.fill();
      ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 12px 'Segoe UI',sans-serif";
      ctx.fillText(L.name, cx + L.w / 2, y + 30);
      ctx.font = "600 10px 'Segoe UI',sans-serif";
      ctx.fillText(L.desc, cx + L.w / 2, y + 50);
      ctx.font = "700 9px 'Segoe UI',sans-serif";
      var bytes = i === 0 ? "~2B" : i === 1 ? "1bit" : i === 2 ? "~2B" : "변수";
      ctx.fillText(bytes, cx + L.w / 2, y + 70);
      cx += L.w + 0;
    }
    ctx.textBaseline = "alphabetic";
    // 설명
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("Bunch = 한 채널의 한 메시지(논리 단위). 헤더로 채널·신뢰성·순번을 박고, 본체에 데이터.", 60, y + h + 24);
    ctx.fillText("여러 Bunch가 한 UDP 패킷에 합쳐져서 가. 각자 reliable/unreliable, 각자 ACK·재전송 독립.", 60, y + h + 44);
  }

  function spawnMulti() {
    var lane = (st.sent % 2 === 0);
    st.parts.push({ x: 50, y: 80, tx: 660, ty: 80, rel: lane, seq: ++st.sent, lost: false, t: 0, kind: "multi" });
  }

  function step(dt) {
    if (st.mode === "anat") return;
    st.acc += dt;

    if (st.mode === "multi") {
      if (st.acc > 0.5) { st.acc = 0; for (var k = 0; k < 3; k++) spawnMulti(); }
      for (var i = st.parts.length - 1; i >= 0; i--) {
        var p = st.parts[i]; p.t += dt * 0.9;
        if (!p.passed && p.t > 0.5) { p.passed = true; if (Math.random() < 0.18) p.lost = true; }
        if (p.t >= 1) {
          if (p.lost) { st.lost++; if (p.rel) { st.resent++; spawnReliableResend(p.seq); } }
          else st.delivered++;
          st.parts.splice(i, 1);
        }
      }
      setText("bn-stat-a", st.delivered);
      setText("bn-stat-b", st.resent);
      setText("bn-stat-c", st.lost);
    } else if (st.mode === "compare") {
      if (st.acc > 0.55) {
        st.acc = 0;
        // TCP byte
        var tb = ++st.tcpSent;
        st.parts.push({ x: 50, y: 80, tx: 660, ty: 80, kind: "tcp", seq: tb, lost: (tb % 6 === 0), t: 0 });
        // UE bunches
        for (var k = 0; k < 3; k++) {
          var ub = ++st.ueSent;
          st.parts.push({ x: 50, y: 230, tx: 660, ty: 230, kind: "ue", seq: ub, lost: (ub % 7 === 0), rel: true, t: 0 });
        }
      }
      for (var i = st.parts.length - 1; i >= 0; i--) {
        var p = st.parts[i]; p.t += dt * 0.9;
        if (!p.passed && p.t > 0.55) { p.passed = true; }
        if (p.t >= 1) {
          if (p.kind === "tcp") {
            if (p.lost) { st.tcpHolding++; setTimeout(function (s) { return function () { st.parts.push({ x: 50, y: 80, tx: 660, ty: 80, kind: "tcp", seq: s, lost: false, t: 0, resent: true }); }; }(p.seq), 1500); }
            else { if (st.tcpHolding === 0) st.tcpDelivered++; /* HOL: 막혀있으면 도착해도 처리 못함 */ }
            if (p.resent) { st.tcpHolding = Math.max(0, st.tcpHolding - 1); st.tcpDelivered++; }
          } else { // ue
            if (p.lost) { st.ueResent++; setTimeout(function (s) { return function () { st.parts.push({ x: 50, y: 230, tx: 660, ty: 230, kind: "ue", seq: s, lost: false, t: 0, resent: true }); }; }(p.seq), 1200); }
            else { st.ueDelivered++; }
          }
          st.parts.splice(i, 1);
        }
      }
      setText("bn-stat-a", st.tcpDelivered);
      setText("bn-stat-b", st.ueDelivered);
      setText("bn-stat-c", st.tcpHolding);
    }
  }
  function spawnReliableResend(seq) {
    st.parts.push({ x: 50, y: 80, tx: 660, ty: 80, rel: true, seq: seq, lost: false, t: 0, kind: "multi", resent: true });
  }

  function drawMulti() {
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("여러 Bunch가 패킷에 모여 출발 — 일부 유실되면 reliable만 재전송", 28, 28);
    // 트랙
    ctx.strokeStyle = C.track; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(50, 80); ctx.lineTo(660, 80); ctx.stroke();
    // 패킷
    for (var i = 0; i < st.parts.length; i++) {
      var p = st.parts[i], x = p.x + (p.tx - p.x) * p.t, y = p.y;
      var col = p.resent ? "#ffd54f" : (p.lost && p.passed ? C.lost : (p.rel ? C.reliable : C.unrel));
      rr(x - 14, y - 11, 28, 22, 4); ctx.fillStyle = col; ctx.fill();
      ctx.fillStyle = "#0c1220"; ctx.font = "700 9px 'Segoe UI',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText((p.rel ? "R" : "U") + p.seq, x, y);
      ctx.textBaseline = "alphabetic";
    }
    // 범례
    ctx.fillStyle = C.reliable; ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.textAlign = "left"; ctx.fillText("■ Reliable(꼭 도착)", 50, 200);
    ctx.fillStyle = C.unrel; ctx.fillText("■ Unreliable(잃어도 됨)", 200, 200);
    ctx.fillStyle = "#ffd54f"; ctx.fillText("■ 재전송본", 380, 200);
    ctx.fillStyle = C.lost; ctx.fillText("■ 유실", 470, 200);
  }

  function drawCompare() {
    ctx.fillStyle = C.sub; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText("같은 유실, 다른 결과 — TCP는 한 바이트 막히면 뒤도 대기(HOL), UE Bunch는 다른 Bunch 그대로 진행", 28, 28);
    // TCP lane
    ctx.fillStyle = "#ef5350"; ctx.font = "700 13px 'Segoe UI',sans-serif"; ctx.fillText("TCP — 바이트 스트림", 50, 60);
    ctx.strokeStyle = C.track; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(50, 80); ctx.lineTo(660, 80); ctx.stroke();
    // UE lane
    ctx.fillStyle = "#66bb6a"; ctx.fillText("UE Bunch — 독립 단위", 50, 210);
    ctx.strokeStyle = C.track; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(50, 230); ctx.lineTo(660, 230); ctx.stroke();
    // packets
    for (var i = 0; i < st.parts.length; i++) {
      var p = st.parts[i], x = p.x + (p.tx - p.x) * p.t, y = p.y;
      var col;
      if (p.kind === "tcp") col = p.resent ? "#ffd54f" : (p.lost && p.passed ? C.lost : "#ef5350");
      else col = p.resent ? "#ffd54f" : (p.lost && p.passed ? C.lost : "#66bb6a");
      var sz = p.kind === "tcp" ? 10 : 20;
      rr(x - sz / 2 - 2, y - 9, sz + 4, 18, 3); ctx.fillStyle = col; ctx.fill();
    }
    if (st.tcpHolding > 0) {
      ctx.fillStyle = C.lost; ctx.font = "700 11px 'Segoe UI',sans-serif"; ctx.textAlign = "center";
      ctx.fillText("🔒 HOL — " + st.tcpHolding + "개 바이트 도착해도 막혀 있음", 360, 110);
    }
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    if (st.mode === "anat") drawAnatomy();
    else if (st.mode === "multi") drawMulti();
    else drawCompare();
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) step(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function statLabels() {
    var a = document.getElementById("bn-lbl-a"), b = document.getElementById("bn-lbl-b"), c = document.getElementById("bn-lbl-c");
    if (st.mode === "multi") { if (a) a.textContent = "도착 bunch"; if (b) b.textContent = "재전송(reliable)"; if (c) c.textContent = "유실(unreliable)"; }
    else if (st.mode === "compare") { if (a) a.textContent = "TCP 처리"; if (b) b.textContent = "UE 처리"; if (c) c.textContent = "TCP 막힘"; }
    else { if (a) a.textContent = "—"; if (b) b.textContent = "—"; if (c) c.textContent = "—"; }
  }
  function setCap() {
    var c = document.getElementById("bn-caption"); if (!c) return;
    c.textContent = st.mode === "anat"
      ? "한 Bunch는 채널 ID·신뢰성 플래그·순번·페이로드를 담은 작은 단위야. 채널에 따라, 메시지 종류에 따라 reliable일 수도 unreliable일 수도 있어. 헤더 자체는 매우 작아서(보통 5바이트 미만) 작은 메시지에도 부담이 적어."
      : st.mode === "multi"
        ? "한 패킷에 여러 Bunch가 모여 떠. 유실이 발생하면 R(reliable)은 노란색으로 재전송돼 결국 도착하고, U(unreliable)는 그냥 사라져. 핵심은 — Bunch마다 신뢰성을 따로 설정한다는 거. 한 패킷이 여러 신뢰성 등급을 섞을 수 있어."
        : "TCP는 바이트 스트림이라 한 바이트가 유실되면 뒤 바이트들이 도착해도 순서대로 처리 못 해 — HOL 블로킹. UE Bunch는 독립 단위라 B2가 유실돼도 B1·B3는 즉시 처리 가능. 유실된 reliable Bunch만 따로 재전송해서 메우면 됨. 이게 UE가 UDP를 고른 진짜 이유야.";
  }
  function sel(m) { st.mode = m; var t = document.querySelectorAll(".bntab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); statLabels(); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".bntab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("bn-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  statLabels(); setCap(); resize(); addEventListener("resize", resize);
  if (!reduce) requestAnimationFrame(frame); else draw();
})();
