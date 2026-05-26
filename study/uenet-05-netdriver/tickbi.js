/* tickbi.js — NetDriver의 한 틱: TickDispatch(받기) + TickFlush(보내기) 양방향 */
(function () {
  "use strict";
  var canvas = document.getElementById("tb-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 360;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var NC = 4;
  var st = { mode: "both", running: true, t: 0, phase: "idle", phaseT: 0, dispatch: 0, flush: 0, parts: [], ticks: 0 };
  var ND = { x: 280, y: 30, w: 400, h: 300 };
  var clients = []; var conns = [];
  function init() {
    clients = []; conns = [];
    for (var i = 0; i < NC; i++) {
      var y = 50 + i * 70;
      clients.push({ x: 40, y: y, w: 110, h: 40, label: "클라 " + (i + 1) });
      conns.push({ x: ND.x + 14, y: y - 5, w: ND.w - 28, h: 50, label: "Conn " + (i + 1), inbox: 0, outbox: 0 });
    }
  }
  var C = { bg: "#0e1426", nd: "#1b3a5c", ndB: "#42a5f5", client: "#ab47bc", conn: "#26c6da", in: "#ffca28", out: "#66bb6a", text: "#e3eaf5", sub: "#90a4c4", line: "#2a3650" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function startTick() {
    st.ticks++; st.phaseT = 0;
    if (st.mode === "disp" || st.mode === "both") {
      st.phase = "disp";
      // 각 클라가 패킷을 NetDriver로 송신
      for (var i = 0; i < NC; i++) (function (i) {
        st.parts.push({ from: { x: clients[i].x + clients[i].w, y: clients[i].y + clients[i].h / 2 },
                        to: { x: conns[i].x, y: conns[i].y + conns[i].h / 2 },
                        t: 0, dir: "in", lane: i });
      })(i);
    } else { startFlush(); }
  }
  function startFlush() {
    st.phase = "flush"; st.phaseT = 0;
    for (var i = 0; i < NC; i++) (function (i) {
      st.parts.push({ from: { x: conns[i].x, y: conns[i].y + conns[i].h / 2 },
                      to: { x: clients[i].x + clients[i].w, y: clients[i].y + clients[i].h / 2 },
                      t: 0, dir: "out", lane: i });
    })(i);
  }

  function update(dt) {
    st.t += dt; st.phaseT += dt;
    if (st.phase === "idle" && st.t > 0.3) { startTick(); }
    // 파티클 이동
    for (var p = st.parts.length - 1; p >= 0; p--) {
      var pt = st.parts[p]; pt.t += dt * 1.4;
      if (pt.t >= 1) {
        if (pt.dir === "in") { conns[pt.lane].inbox++; st.dispatch++; }
        else { conns[pt.lane].outbox = 0; st.flush++; }
        st.parts.splice(p, 1);
      }
    }
    // phase 전환
    if (st.phase === "disp" && st.parts.length === 0 && st.phaseT > 0.7) {
      if (st.mode === "both") { startFlush(); }
      else { st.phase = "idle"; st.t = 0; }
    } else if (st.phase === "flush" && st.parts.length === 0 && st.phaseT > 0.7) {
      st.phase = "idle"; st.t = 0;
    }
    // outbox 누적 (시각 표현용)
    if (st.phase === "idle" || st.phase === "disp") {
      for (var i = 0; i < NC; i++) conns[i].outbox = Math.min(conns[i].outbox + dt * 0.6, 1);
    }
    setText("tb-tick", st.ticks);
    setText("tb-disp", st.dispatch);
    setText("tb-flush", st.flush);
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    // NetDriver 박스
    rr(ND.x, ND.y, ND.w, ND.h, 12); ctx.fillStyle = C.nd; ctx.fill();
    ctx.strokeStyle = C.ndB; ctx.lineWidth = 2; rr(ND.x, ND.y, ND.w, ND.h, 12); ctx.stroke();
    ctx.fillStyle = C.text; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.font = "700 14px 'Segoe UI',sans-serif";
    ctx.fillText("UNetDriver  (TickDispatch 받음 / TickFlush 보냄)", ND.x + ND.w / 2, ND.y - 8);
    // 클라
    for (var i = 0; i < NC; i++) {
      var b = clients[i];
      rr(b.x, b.y, b.w, b.h, 8); ctx.fillStyle = C.client; ctx.fill();
      ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 12px 'Segoe UI',sans-serif";
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
      // 선
      ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x + b.w, b.y + b.h / 2); ctx.lineTo(ND.x, b.y + b.h / 2); ctx.stroke();
      // Conn slot
      var c = conns[i];
      rr(c.x, c.y, c.w, c.h, 7); ctx.fillStyle = C.conn; ctx.fill();
      ctx.fillStyle = "#0c1220"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.font = "700 12px 'Segoe UI',sans-serif";
      ctx.fillText(c.label, c.x + 12, c.y + 16);
      // inbox 표시
      ctx.font = "600 10px 'Segoe UI',sans-serif"; ctx.fillStyle = "#0c1220";
      ctx.fillText("들어옴: " + c.inbox, c.x + 12, c.y + 36);
      // outbox 누적 바 (오른쪽)
      var bw = (c.w - 24) * 0.4;
      rr(c.x + c.w - 12 - bw, c.y + 30, bw, 8, 3); ctx.fillStyle = "rgba(102,187,106,0.3)"; ctx.fill();
      rr(c.x + c.w - 12 - bw, c.y + 30, bw * c.outbox, 8, 3); ctx.fillStyle = C.out; ctx.fill();
      ctx.textBaseline = "alphabetic";
    }
    // 파티클
    for (var p = 0; p < st.parts.length; p++) {
      var pt = st.parts[p]; var x = pt.from.x + (pt.to.x - pt.from.x) * pt.t; var y = pt.from.y + (pt.to.y - pt.from.y) * pt.t;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.2832); ctx.fillStyle = pt.dir === "in" ? C.in : C.out; ctx.fill();
    }
    // 단계 라벨
    var phaseTxt = st.phase === "disp" ? "▶ TickDispatch — 받기" : st.phase === "flush" ? "◀ TickFlush — 보내기" : "Tick #" + st.ticks + " 완료, 다음 틱 대기";
    ctx.fillStyle = st.phase === "disp" ? C.in : (st.phase === "flush" ? C.out : C.sub);
    ctx.textAlign = "center"; ctx.font = "700 13px 'Segoe UI',sans-serif";
    ctx.fillText(phaseTxt, LW / 2, LH - 14);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("tb-caption"); if (!c) return;
    c.textContent = st.mode === "disp"
      ? "TickDispatch(받기): 매 틱 NetDriver가 소켓에서 들어온 패킷을 꺼내, 어느 연결(NetConnection) 것인지 판별해 그 연결의 inbox에 넣어. 그 다음 그 연결이 처리(채널·Bunch 풀어내기 등). 노란 점이 들어오는 흐름이야."
      : st.mode === "flush"
        ? "TickFlush(보내기): 그 사이 게임 로직이 각 연결의 outbox에 보낼 데이터를 누적(연한 초록 바). 틱 끝에 NetDriver가 그걸 패킷으로 묶어 클라에 송신해. 자주 변하는 값도 매 틱 한 번 묶여 가니까 패킷 폭증을 막아."
        : "한 틱 전체: 받기(노랑) → 처리 → 보내기(초록) 두 단계가 한 틱 안에서 차례로 일어나. 즉 NetDriver는 매 틱 '집배원'이야 — 들어온 우편을 분류해 받는 사람에게 주고, 보낼 우편을 모아 한 번에 보냄.";
  }
  function sel(m) { st.mode = m; st.parts = []; st.phase = "idle"; st.t = 0; var t = document.querySelectorAll(".tbtab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".tbtab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("tb-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  init(); setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { draw(); var n = document.getElementById("tb-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
