/* back-pressure — 생산자>소비자: 무대응(큐 폭발/유실) vs 백프레셔(생산 억제) */
(function () {
  "use strict";
  var canvas = document.getElementById("bp-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 300;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var CAP = 24, THRESH = 19;
  var st = { mode: "bp", running: true, rate: 5, queue: 0, prodAcc: 0, consAcc: 0, dropped: 0, throttled: 0, consumed: 0, throttle: 0 };
  var C = { bg: "#0e1426", prod: "#ab47bc", cons: "#66bb6a", q: "#5c6bc0", qHot: "#ef5350", text: "#e3eaf5", sub: "#90a4c4", box: "#11192c" };
  var QB = { x: 230, y: 70, w: 260, h: 120 };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function update(dt) {
    var consRate = 2.2;
    st.consAcc += dt; while (st.consAcc >= 1 / consRate) { st.consAcc -= 1 / consRate; if (st.queue > 0) { st.queue--; st.consumed++; } }
    var effRate = st.rate;
    if (st.mode === "bp" && st.queue >= THRESH) { effRate = 0; st.throttle = 0.3; } // 억제
    if (st.throttle > 0) st.throttle -= dt;
    st.prodAcc += dt;
    while (st.prodAcc >= 1 / Math.max(0.001, st.rate)) {
      st.prodAcc -= 1 / Math.max(0.001, st.rate);
      if (st.mode === "bp" && st.queue >= THRESH) { st.throttled++; continue; } // 생산 보류
      if (st.queue >= CAP) { st.dropped++; continue; } // 무대응: 넘치면 유실
      st.queue++;
    }
    setText("bp-queue", st.queue + "/" + CAP);
    setText("bp-extra", st.mode === "bp" ? st.throttled : st.dropped);
    var lbl = document.getElementById("bp-extra-lbl"); if (lbl) lbl.textContent = st.mode === "bp" ? "생산 억제" : "유실(터짐)";
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    // 생산자
    var throttling = st.mode === "bp" && st.throttle > 0;
    rr(40, 100, 140, 60, 10); ctx.fillStyle = throttling ? "#5a4a6a" : C.prod; ctx.fill();
    ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 13px 'Segoe UI',sans-serif";
    ctx.fillText("생산자", 110, 122); ctx.font = "600 10px 'Segoe UI',sans-serif"; ctx.fillText(throttling ? "⏸ 억제됨" : st.rate + "/s", 110, 140); ctx.textBaseline = "alphabetic";
    // 큐
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "600 12px 'Segoe UI',sans-serif"; ctx.fillText("큐 (용량 " + CAP + ")", QB.x + QB.w / 2, QB.y - 10);
    rr(QB.x, QB.y, QB.w, QB.h, 10); ctx.fillStyle = C.box; ctx.fill();
    var hot = st.queue >= THRESH;
    var cols = 12, cw = (QB.w - 16) / cols, rows = Math.ceil(CAP / cols), ch = (QB.h - 16) / rows;
    for (var i = 0; i < Math.min(st.queue, CAP); i++) { var cx = QB.x + 8 + (i % cols) * cw, cy = QB.y + 8 + Math.floor(i / cols) * ch; rr(cx, cy, cw - 3, ch - 3, 3); ctx.fillStyle = hot ? C.qHot : C.q; ctx.fill(); }
    // 소비자
    rr(540, 100, 140, 60, 10); ctx.fillStyle = C.cons; ctx.fill();
    ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 13px 'Segoe UI',sans-serif"; ctx.fillText("소비자", 610, 122); ctx.font = "600 10px 'Segoe UI',sans-serif"; ctx.fillText("2.2/s (느림)", 610, 140); ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "bp" ? "백프레셔: 큐가 차면 생산자를 멈춰 큐를 한도 내로 유지" : "무대응: 생산>소비면 큐가 차고 넘쳐 유실(또는 메모리 폭발)", LW / 2, LH - 12);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("bp-caption"); if (!c) return;
    c.textContent = st.mode === "none"
      ? "무대응: 생산자가 소비자보다 빠르면 큐가 계속 쌓여. 한도를 넘으면 유실되거나(드롭), 한도가 없으면 메모리가 터져 서버가 죽어. 생산량을 올려봐 — 큐가 빨갛게 차오르지?"
      : "백프레셔(back-pressure): 큐가 한도에 다다르면 '그만 보내!' 신호를 줘서 생산자를 멈춰. 큐가 한도 안에서 유지되고 유실도 없어. 대신 생산자가 기다리니 전체 처리량은 소비 속도에 맞춰져. 우리 서버의 '공성전 큐 폭증'도 결국 이 문제야.";
  }
  function sel(m) { st.mode = m; st.queue = 0; st.dropped = 0; st.throttled = 0; var t = document.querySelectorAll(".bptab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".bptab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var sl = document.getElementById("bp-rate");
  if (sl) sl.addEventListener("input", function () { st.rate = parseInt(sl.value, 10); var v = document.getElementById("bp-rate-val"); if (v) v.textContent = st.rate; });
  var pl = document.getElementById("bp-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { st.queue = 20; draw(); var n = document.getElementById("bp-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
