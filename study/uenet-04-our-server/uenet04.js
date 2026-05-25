/* uenet-04-our-server — 조선협객전 서버 아키텍처에서 패킷의 여정
 * cm: 클라 패킷 Client→Gate→Game→GameDB→...→Client
 * bc: 브로드캐스트 Game→Gate→여러 클라
 * dsm: 서버간 Game11→Game12
 */
(function () {
  "use strict";
  var canvas = document.getElementById("ue4-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 360;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var N = {
    client: { x: 70, y: 290, w: 110, h: 44, label: "클라이언트", c: "#ab47bc" },
    c1: { x: 40, y: 70, w: 90, h: 36, label: "클라 A", c: "#ab47bc" },
    c2: { x: 40, y: 130, w: 90, h: 36, label: "클라 B", c: "#ab47bc" },
    c3: { x: 40, y: 190, w: 90, h: 36, label: "클라 C", c: "#ab47bc" },
    gate: { x: 250, y: 250, w: 110, h: 46, label: "Gate", c: "#42a5f5" },
    game: { x: 430, y: 180, w: 120, h: 48, label: "Game", c: "#66bb6a" },
    gamedb: { x: 600, y: 250, w: 100, h: 46, label: "GameDB", c: "#26c6da" },
    login: { x: 430, y: 60, w: 120, h: 40, label: "Login", c: "#ffa726" },
    game2: { x: 600, y: 90, w: 100, h: 46, label: "Game(서버12)", c: "#66bb6a" }
  };
  var paths = {
    cm: ["client", "gate", "game", "gamedb", "game", "gate", "client"],
    bc: ["game", "gate"],
    dsm: ["game", "game2", "game"]
  };

  var st = { mode: "cm", running: true, tokens: [], t: 0, acc: 0, hops: 0 };
  var C = { bg: "#0e1426", line: "#2a3650", token: "#ffca28", text: "#0c1220", sub: "#90a4c4" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function ctr(n) { return { x: n.x + n.w / 2, y: n.y + n.h / 2 }; }

  function spawn() {
    if (st.mode === "bc") {
      // game→gate 후 gate→c1,c2,c3
      st.tokens.push({ seq: ["game", "gate", "c1"], i: 0, t: 0, c: "#ffca28" });
      st.tokens.push({ seq: ["game", "gate", "c2"], i: 0, t: 0.0, c: "#ffca28" });
      st.tokens.push({ seq: ["game", "gate", "c3"], i: 0, t: 0.0, c: "#ffca28" });
    } else {
      st.tokens.push({ seq: paths[st.mode].slice(), i: 0, t: 0, c: "#ffca28" });
    }
  }

  function update(dt) {
    st.acc += dt;
    if (st.acc > 1.6 && st.tokens.length === 0) { st.acc = 0; spawn(); }
    for (var k = st.tokens.length - 1; k >= 0; k--) {
      var tk = st.tokens[k]; tk.t += dt * 1.3;
      if (tk.t >= 1) { tk.t = 0; tk.i++; st.hops++; if (tk.i >= tk.seq.length - 1) { st.tokens.splice(k, 1); } }
    }
    setText("ue4-hops", st.hops);
  }

  var sx = 1, sy = 1;
  function node(n, dim) { rr(n.x, n.y, n.w, n.h, 10); ctx.fillStyle = dim ? "#243049" : n.c; ctx.fill(); ctx.fillStyle = dim ? "#5d6b85" : C.text; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 13px 'Segoe UI',sans-serif"; ctx.fillText(n.label, n.x + n.w / 2, n.y + n.h / 2); ctx.textBaseline = "alphabetic"; }
  function edge(a, b) { var ca = ctr(N[a]), cb = ctr(N[b]); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ca.x, ca.y); ctx.lineTo(cb.x, cb.y); ctx.stroke(); }

  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    // 엣지
    edge("client", "gate"); edge("gate", "game"); edge("game", "gamedb"); edge("game", "login"); edge("game", "game2");
    if (st.mode === "bc") { edge("gate", "c1"); edge("gate", "c2"); edge("gate", "c3"); }
    // 노드
    var active = {};
    for (var k = 0; k < st.tokens.length; k++) { active[st.tokens[k].seq[st.tokens[k].i]] = 1; active[st.tokens[k].seq[st.tokens[k].i + 1]] = 1; }
    var keys = (st.mode === "bc") ? ["c1", "c2", "c3", "gate", "game"] : Object.keys(N).filter(function (x) { return x !== "c1" && x !== "c2" && x !== "c3"; });
    for (var i = 0; i < keys.length; i++) node(N[keys[i]], false);
    // 토큰
    for (var t = 0; t < st.tokens.length; t++) {
      var tk = st.tokens[t]; var a = ctr(N[tk.seq[tk.i]]), b = ctr(N[tk.seq[tk.i + 1]]);
      var x = a.x + (b.x - a.x) * tk.t, y = a.y + (b.y - a.y) * tk.t;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.2832); ctx.fillStyle = tk.c; ctx.fill();
    }
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ue4-caption"); if (!c) return;
    c.textContent = st.mode === "cm"
      ? "클라 패킷(CM_): 클라가 보낸 패킷은 Gate(관문)를 거쳐 Game으로 forward돼. Game이 처리하고 필요하면 GameDB에 저장(동기). 결과(SM_)는 다시 Gate를 통해 클라로. Gate에 case 등록 안 하면 여기서 drop돼."
      : st.mode === "bc"
        ? "브로드캐스트(SM_): 한 명의 행동(예: 이동)을 주변 모두에게 알려야 할 때, Game이 만들어 Gate가 여러 클라에 뿌려. 누구한테까지 보낼지가 곧 AOI(Ch11) 문제야."
        : "서버간(DSM_): 다른 서버(채널/지역)의 데이터가 필요하면 직접 건드리지 않고 서버끼리 메시지를 주고받아. 이게 '서버=액터' 관점 — 액터모델 글과 연결돼.";
  }
  function sel(m) { st.mode = m; st.tokens = []; st.acc = 1.6; st.hops = 0; var t = document.querySelectorAll(".ue4tab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".ue4tab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("ue4-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { draw(); var n = document.getElementById("ue4-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
