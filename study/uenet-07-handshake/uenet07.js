/* uenet-07-handshake — 연결 수립 시퀀스(정상/버전불일치/쿠키위조) */
(function () {
  "use strict";
  var canvas = document.getElementById("ue7-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 360;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var SC = {
    normal: [
      { f: "c", t: "Hello (버전 5.4)" },
      { f: "s", t: "Challenge (쿠키 발급)" },
      { f: "c", t: "쿠키 echo" },
      { f: "s", t: "검증 OK · Control 채널 개설" },
      { f: "s", t: "Welcome (맵·게임 정보)" },
      { f: "c", t: "준비 완료 (NetSpeed)" },
      { f: "s", t: "PlayerController 스폰 · 복제 시작", done: true }
    ],
    version: [
      { f: "c", t: "Hello (버전 5.2)" },
      { f: "s", t: "버전 불일치 → 연결 거부", fail: true }
    ],
    cookie: [
      { f: "c", t: "Hello" },
      { f: "s", t: "Challenge (쿠키 발급)" },
      { f: "c", t: "위조 쿠키", bad: true },
      { f: "s", t: "쿠키 불일치 → 무시 (DoS 방어)", fail: true }
    ]
  };
  var st = { mode: "normal", running: true, reveal: 0, acc: 0 };
  var CX = 150, SX = 560, TOP = 70, ROW = 38;
  var C = { bg: "#0e1426", client: "#ab47bc", server: "#66bb6a", line: "#2a3650", msg: "#42a5f5", ok: "#66bb6a", bad: "#ef5350", text: "#e3eaf5", sub: "#90a4c4" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function steps() { return SC[st.mode]; }
  function update(dt) {
    st.acc += dt;
    if (st.acc > 1.0) {
      st.acc = 0;
      if (st.reveal < steps().length) st.reveal++;
      else { /* hold then restart */ st.holdT = (st.holdT || 0) + 1; if (st.holdT > 2) { st.reveal = 0; st.holdT = 0; } }
    }
    var done = st.reveal >= steps().length;
    var last = steps()[steps().length - 1];
    setText("ue7-step", st.reveal + "/" + steps().length);
    var r = document.getElementById("ue7-result");
    if (r) {
      if (!done) { r.textContent = "진행 중"; r.style.color = ""; }
      else if (last.fail) { r.textContent = "거부됨"; r.style.color = C.bad; }
      else { r.textContent = "수립 완료"; r.style.color = C.ok; }
    }
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    // 헤더
    rr(CX - 60, 24, 120, 32, 8); ctx.fillStyle = C.client; ctx.fill();
    rr(SX - 60, 24, 120, 32, 8); ctx.fillStyle = C.server; ctx.fill();
    ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 13px 'Segoe UI',sans-serif";
    ctx.fillText("클라이언트", CX, 40); ctx.fillText("서버", SX, 40); ctx.textBaseline = "alphabetic";
    // 수직선
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(CX, 56); ctx.lineTo(CX, LH - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(SX, 56); ctx.lineTo(SX, LH - 16); ctx.stroke();
    // 메시지 화살표
    var ss = steps();
    for (var i = 0; i < Math.min(st.reveal, ss.length); i++) {
      var s = ss[i], y = TOP + i * ROW;
      var fromX = s.f === "c" ? CX : SX, toX = s.f === "c" ? SX : CX;
      var col = s.fail ? C.bad : (s.bad ? C.bad : (s.done ? C.ok : C.msg));
      ctx.strokeStyle = col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(fromX, y); ctx.lineTo(toX, y); ctx.stroke();
      // 화살촉
      var dir = toX > fromX ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(toX, y); ctx.lineTo(toX - dir * 9, y - 5); ctx.lineTo(toX - dir * 9, y + 5); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
      // 라벨
      ctx.fillStyle = s.fail || s.bad ? C.bad : C.text; ctx.textAlign = "center"; ctx.font = (s.fail || s.done) ? "700 12px 'Segoe UI',sans-serif" : "600 12px 'Segoe UI',sans-serif";
      ctx.fillText((s.fail ? "✗ " : (s.done ? "✓ " : "")) + s.t, (CX + SX) / 2, y - 7);
    }
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue7-caption"); if (!c) return;
    c.textContent = st.mode === "normal"
      ? "정상 연결: Hello로 인사 → 서버가 Challenge(쿠키)를 줘 → 클라가 그대로 돌려보내 → 서버 검증 OK → Welcome(맵 정보) → 준비 완료 → PlayerController 스폰하고 복제 시작. 우리로 치면 Login 인증 + Gate 입장 흐름이야."
      : st.mode === "version"
        ? "버전 불일치: 클라 버전이 서버와 다르면 첫 단계에서 바로 거부. 패킷 구조가 안 맞으면 가비지가 되니까(우리 MAX 상수 동시배포 이슈와 같은 맥락)."
        : "쿠키 위조: 서버가 준 쿠키를 못 맞추면 무시해. 이 'Challenge-Response(쿠키)'가 가짜 연결 폭주(DoS)를 막는 장치야 — 상태를 만들기 전에 먼저 검증.";
  }
  function sel(m) { st.mode = m; st.reveal = 0; st.acc = 0; st.holdT = 0; var t = document.querySelectorAll(".ue7tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".ue7tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("ue7-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { st.reveal = SC.normal.length; draw(); var n = document.getElementById("ue7-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
