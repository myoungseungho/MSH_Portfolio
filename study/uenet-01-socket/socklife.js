/* socklife.js — 소켓 연결의 생애주기를 단계별로 진행 (서버·클라 동시) */
(function () {
  "use strict";
  var canvas = document.getElementById("sl-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 360;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  // 시나리오별 step 정의 (서버 상태, 클라 상태, 액션 라벨, 방향 화살표)
  var SCEN = {
    normal: [
      { sv: "socket()", cl: "—", note: "서버: 소켓 자원 생성 (전화기 구매)" },
      { sv: "bind(15000)", cl: "—", note: "서버: 포트 15000에 자기 번호 등록" },
      { sv: "listen()", cl: "—", note: "서버: '대기 모드' — 누가 걸어주길" },
      { sv: "listen()", cl: "socket()", note: "클라: 자기 소켓 생성" },
      { sv: "listen()", cl: "connect()→", note: "클라: 서버 IP:포트로 연결 시도 (전화 걸기)", arrow: "right" },
      { sv: "accept()", cl: "connect()", note: "서버: 수락! 연결 객체 생성 (전화 받음)", arrow: "right" },
      { sv: "CONNECTED", cl: "CONNECTED", note: "양쪽 모두 연결 상태 — 대화 가능" },
      { sv: "recv()", cl: "→send()", note: "클라가 데이터 송신 → 서버 recv", arrow: "right" },
      { sv: "send()→", cl: "recv()", note: "서버가 응답 송신 → 클라 recv", arrow: "left" },
      { sv: "close()", cl: "close()", note: "양쪽 연결 종료 (전화 끊기)" }
    ],
    refused: [
      { sv: "—", cl: "—", note: "서버가 listen 안 하고 있음 (서버 안 켜짐)" },
      { sv: "—", cl: "socket()", note: "클라: 소켓 생성" },
      { sv: "—", cl: "connect()→", note: "클라: 연결 시도", arrow: "right" },
      { sv: "—", cl: "CONN REFUSED", note: "서버에서 응답 없음 → 거부 / 타임아웃", arrow: "leftBad" },
      { sv: "—", cl: "close()", note: "클라: 실패 후 소켓 닫음 + 사용자에게 알림" }
    ],
    timeout: [
      { sv: "CONNECTED", cl: "CONNECTED", note: "연결돼 정상 통신 중" },
      { sv: "recv()...", cl: "(인터넷 끊김)", note: "클라 인터넷 단절 — 서버는 모름" },
      { sv: "recv()...(대기)", cl: "—", note: "서버: 패킷 안 와도 일정 시간 기다림 (좀비 연결)" },
      { sv: "TIMEOUT", cl: "—", note: "타임아웃 초과 → 서버가 연결을 끊음" },
      { sv: "close()", cl: "—", note: "서버: NetConnection 정리" }
    ]
  };

  var st = { mode: "normal", running: true, step: 0, acc: 0, arrows: [] };
  var SV = { x: 60, y: 80, w: 240, h: 200, label: "서버" };
  var CL = { x: 420, y: 80, w: 240, h: 200, label: "클라이언트" };
  var C = { bg: "#0e1426", panel: "#172033", panelHi: "#1e2740", border: "#42a5f5", bcl: "#ab47bc", text: "#e3eaf5", sub: "#90a4c4", arrow: "#ffca28", bad: "#ef5350", ok: "#66bb6a", state: "#26c6da" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function update(dt) {
    st.acc += dt;
    if (st.acc > 1.6) { st.acc = 0; st.step = (st.step + 1) % SCEN[st.mode].length; st.arrows = []; var s = SCEN[st.mode][st.step]; if (s.arrow) st.arrows.push({ kind: s.arrow, t: 0 }); }
    for (var i = st.arrows.length - 1; i >= 0; i--) { st.arrows[i].t += dt * 0.9; if (st.arrows[i].t >= 1) st.arrows.splice(i, 1); }
    setText("sl-step", (st.step + 1) + " / " + SCEN[st.mode].length);
  }

  var sx = 1, sy = 1;
  function panel(b, color, label, state, history) {
    rr(b.x, b.y, b.w, b.h, 12); ctx.fillStyle = C.panel; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; rr(b.x, b.y, b.w, b.h, 12); ctx.stroke();
    ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.font = "700 14px 'Segoe UI',sans-serif";
    ctx.fillText(label, b.x + b.w / 2, b.y + 24);
    // 현재 상태 큰 박스
    rr(b.x + 18, b.y + 44, b.w - 36, 56, 8); ctx.fillStyle = C.panelHi; ctx.fill();
    ctx.fillStyle = C.state; ctx.font = "700 18px 'Segoe UI',sans-serif"; ctx.fillText(state || "—", b.x + b.w / 2, b.y + 80);
    // 히스토리
    ctx.fillStyle = C.sub; ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.textAlign = "left";
    ctx.fillText("이전 단계:", b.x + 20, b.y + 124);
    for (var i = 0; i < history.length; i++) {
      var y = b.y + 144 + i * 20;
      if (y > b.y + b.h - 12) break;
      ctx.fillStyle = "#5d6b85"; ctx.fillText("· " + history[i], b.x + 24, y);
    }
  }
  function history(arr, n) { var out = []; for (var i = Math.max(0, st.step - n); i < st.step; i++) out.push(arr[i][st.mode === "normal" ? 0 : 0]); return out; }

  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    var steps = SCEN[st.mode]; var cur = steps[st.step] || steps[0];
    // 히스토리 추출 (각 쪽 상태)
    var svHist = []; var clHist = [];
    for (var i = Math.max(0, st.step - 3); i < st.step; i++) { svHist.push(steps[i].sv); clHist.push(steps[i].cl); }
    panel(SV, C.border, "서버 소켓", cur.sv, svHist);
    panel(CL, C.bcl, "클라 소켓", cur.cl, clHist);
    // 화살표
    for (var a = 0; a < st.arrows.length; a++) {
      var ar = st.arrows[a]; var fromX, toX, col = C.arrow;
      if (ar.kind === "right") { fromX = SV.x + SV.w; toX = CL.x; col = C.arrow; }
      else if (ar.kind === "left") { fromX = CL.x; toX = SV.x + SV.w; col = C.ok; }
      else { fromX = SV.x + SV.w; toX = CL.x; col = C.bad; }
      var x = fromX + (toX - fromX) * ar.t;
      ctx.beginPath(); ctx.arc(x, 180, 8, 0, 6.2832); ctx.fillStyle = col; ctx.fill();
      if (ar.kind === "leftBad") { ctx.fillStyle = C.bad; ctx.font = "700 11px 'Segoe UI',sans-serif"; ctx.textAlign = "center"; ctx.fillText("✗ 거부", x, 165); }
    }
    // 단계 설명
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 13px 'Segoe UI',sans-serif"; ctx.textBaseline = "alphabetic";
    ctx.fillText("Step " + (st.step + 1) + "/" + steps.length + " — " + cur.note, LW / 2, LH - 18);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("sl-caption"); if (!c) return;
    c.textContent = st.mode === "normal"
      ? "정상 연결: 서버는 소켓 생성 → bind → listen으로 '대기'까지 가고, 클라는 소켓 생성 → connect로 걸어. 서버 accept가 받으면 양쪽이 CONNECTED 상태 — 그때부터 send/recv로 데이터를 주고받지. 끝나면 close. 단계별 상태 변화를 따라가봐."
      : st.mode === "refused"
        ? "연결 거부: 서버가 listen 안 한 상태에서 클라가 connect하면? 응답이 없거나 OS가 즉시 'Connection Refused'를 줘. 클라는 소켓을 닫고 사용자에게 실패를 알리는 게 일반적."
        : "타임아웃: 정상 연결 후 클라 인터넷이 끊겨도 서버는 즉시 모름. 패킷이 일정 시간 안 오면(예: TCP keepalive·앱 타임아웃) 그제야 끊김으로 판정 — 그 사이를 '좀비 연결'이라 불러.";
  }
  function sel(m) { st.mode = m; st.step = 0; st.acc = 0; st.arrows = []; var t = document.querySelectorAll(".sltab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".sltab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("sl-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { st.step = 6; draw(); var n = document.getElementById("sl-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
