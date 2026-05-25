/* lag-compensation — 히트 되감기: 쏜 시점으로 서버가 시간을 되감아 판정 */
(function () {
  "use strict";
  var canvas = document.getElementById("lag-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 300;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var L = 60, R = 660, Y = 120, HB = 26;
  var st = { mode: "comp", running: true, ping: 150, t: 0, fireAcc: 0, shots: 0, hits: 0, lastShot: null };
  var C = { bg: "#0e1426", real: "#ef5350", seen: "#42a5f5", shot: "#ffca28", hit: "#66bb6a", miss: "#ef5350", text: "#e3eaf5", sub: "#90a4c4", track: "#1b2740" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function realX(t) { var span = R - L, period = 3.2; var ph = ((t % period) + period) % period; var k = ph < period / 2 ? ph / (period / 2) : 1 - (ph - period / 2) / (period / 2); return L + k * span; }

  function update(dt) {
    st.t += dt;
    var rtt = st.ping / 1000;
    st.fireAcc += dt;
    if (st.fireAcc > 1.5) {
      st.fireAcc = 0;
      var aim = realX(st.t - rtt); // 내가 본 위치(과거)
      var serverPos = st.mode === "comp" ? realX(st.t - rtt) : realX(st.t); // 보상=되감기, 무보상=현재
      var hit = Math.abs(aim - serverPos) <= HB;
      st.shots++; if (hit) st.hits++;
      st.lastShot = { aim: aim, hit: hit, age: 0, serverPos: serverPos };
    }
    if (st.lastShot) { st.lastShot.age += dt; if (st.lastShot.age > 1.2) st.lastShot = null; }
    setText("lag-rate", st.shots ? Math.round(st.hits / st.shots * 100) + "%" : "-");
    setText("lag-shots", st.hits + "/" + st.shots);
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    ctx.strokeStyle = C.track; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(L, Y); ctx.lineTo(R, Y); ctx.stroke();
    var rtt = st.ping / 1000;
    var rx = realX(st.t), seenx = realX(st.t - rtt);
    // 내가 보는 적(과거, 파랑 고스트)
    ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(seenx, Y, HB, 0, 6.2832); ctx.fillStyle = C.seen; ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = C.seen; ctx.textAlign = "center"; ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.textBaseline = "alphabetic"; ctx.fillText("내가 보는 적 (과거)", seenx, Y - HB - 8);
    // 진짜 적(현재, 빨강)
    ctx.beginPath(); ctx.arc(rx, Y, HB, 0, 6.2832); ctx.fillStyle = C.real; ctx.fill();
    ctx.fillStyle = C.real; ctx.fillText("진짜 적 (현재)", rx, Y + HB + 18);
    // 발사 결과
    if (st.lastShot) {
      var s = st.lastShot;
      ctx.strokeStyle = s.hit ? C.hit : C.miss; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.aim, Y - 60); ctx.lineTo(s.aim, Y + 60); ctx.stroke();
      ctx.beginPath(); ctx.arc(s.aim, Y, 6, 0, 6.2832); ctx.fillStyle = C.shot; ctx.fill();
      ctx.fillStyle = s.hit ? C.hit : C.miss; ctx.textAlign = "center"; ctx.font = "700 16px 'Segoe UI',sans-serif";
      ctx.fillText(s.hit ? "✓ 명중" : "✗ 빗나감", s.aim, Y - 70);
    }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "comp" ? "지연 보상: 서버가 '내가 본 시점'으로 적을 되감아 판정 → 명중" : "보상 없음: 서버는 '현재' 적 위치로 판정 → 내가 본 곳엔 이미 없음", LW / 2, LH - 14);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("lag-caption"); if (!c) return;
    c.textContent = st.mode === "comp"
      ? "지연 보상(lag compensation): 내 화면 속 적은 핑만큼 '과거'야. 내가 그 과거 위치를 쐈을 때, 서버가 '그 시점으로 적을 되감아' 판정해. 그래서 내가 본 대로 맞아. 핑을 올려도 명중률이 유지되지?"
      : "보상 없음: 서버는 '지금' 적 위치로만 판정해. 근데 내가 본 건 핑 전의 과거 위치라, 쏠 때쯤 적은 이미 딴 데로 갔어 → '분명 맞췄는데 안 맞음'. 핑을 올리면 명중률이 뚝 떨어져.";
  }
  function sel(m) { st.mode = m; st.shots = 0; st.hits = 0; var t = document.querySelectorAll(".lagtab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".lagtab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var ping = document.getElementById("lag-ping");
  if (ping) ping.addEventListener("input", function () { st.ping = parseInt(ping.value, 10); var v = document.getElementById("lag-ping-val"); if (v) v.textContent = st.ping; st.shots = 0; st.hits = 0; });
  var pl = document.getElementById("lag-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { st.lastShot = { aim: realX(0), hit: true, age: 0 }; draw(); var n = document.getElementById("lag-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
