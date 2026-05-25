/* lock-free — 공유 카운터 동시 증가: race(유실) / lock(직렬·대기) / lockfree(CAS 재시도) */
(function () {
  "use strict";
  var canvas = document.getElementById("lf-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 320;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var TH = [{ y: 60 }, { y: 130 }, { y: 200 }];
  var st = { mode: "race", running: true, counter: 0, expected: 0, lost: 0, retry: 0, parts: [], busy: 0, accs: [0, 0, 0] };
  var BOX = { x: 470, y: 100, w: 180, h: 110 };
  var C = { bg: "#0e1426", th: "#ab47bc", tok: "#ffca28", bad: "#ef5350", lock: "#ef5350", lockfree: "#66bb6a", text: "#e3eaf5", sub: "#90a4c4", line: "#2a3650", counter: "#42a5f5" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function arrive(p) {
    // 임계영역 진입 시도
    if (st.mode === "race") {
      if (st.busy > 0) { st.lost++; st.expected++; } // 보호 없음 → 덮어써서 유실
      else { st.busy = 0.18; st.counter++; st.expected++; }
    } else if (st.mode === "lock") {
      if (st.busy > 0) { p.wait = true; p.x = BOX.x - 30 - (p.qi || 0); return false; } // 대기
      st.busy = 0.18; st.counter++; st.expected++;
    } else { // lockfree
      if (st.busy > 0) { st.retry++; p.retry = true; p.x = BOX.x - 40; p.t = 0; return false; } // 재시도
      st.busy = 0.18; st.counter++; st.expected++;
    }
    return true;
  }

  function update(dt) {
    if (st.busy > 0) st.busy -= dt;
    for (var i = 0; i < 3; i++) { st.accs[i] += dt; if (st.accs[i] > 0.5 + i * 0.07) { st.accs[i] = 0; st.parts.push({ x: 40, y: TH[i].y, tx: BOX.x, ty: BOX.y + BOX.h / 2, lane: i }); } }
    for (var k = st.parts.length - 1; k >= 0; k--) {
      var p = st.parts[k];
      var dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), step = 230 * dt;
      if (d <= step) { var done = arrive(p); if (done !== false) st.parts.splice(k, 1); }
      else { p.x += dx / d * step; p.y += dy / d * step; }
    }
    setText("lf-counter", st.counter); setText("lf-expected", st.expected);
    setText("lf-gap", st.mode === "race" ? st.lost : (st.mode === "lock" ? "0" : st.retry));
    var lbl = document.getElementById("lf-gap-lbl"); if (lbl) lbl.textContent = st.mode === "lockfree" ? "재시도(유실 0)" : "유실된 증가";
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    for (var i = 0; i < 3; i++) { rr(20, TH[i].y - 16, 90, 32, 8); ctx.fillStyle = C.th; ctx.fill(); ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 11px 'Segoe UI',sans-serif"; ctx.fillText("스레드 " + (i + 1), 65, TH[i].y); ctx.textBaseline = "alphabetic"; }
    // 카운터 박스
    var hot = st.busy > 0;
    rr(BOX.x, BOX.y, BOX.w, BOX.h, 12); ctx.fillStyle = "#11192c"; ctx.fill();
    ctx.strokeStyle = hot ? (st.mode === "lock" ? C.lock : C.lockfree) : C.line; ctx.lineWidth = 2; rr(BOX.x, BOX.y, BOX.w, BOX.h, 12); ctx.stroke();
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "600 12px 'Segoe UI',sans-serif"; ctx.fillText("공유 카운터", BOX.x + BOX.w / 2, BOX.y + 24);
    ctx.fillStyle = C.counter; ctx.font = "800 40px 'Segoe UI',sans-serif"; ctx.fillText(st.counter, BOX.x + BOX.w / 2, BOX.y + 70);
    if (hot) { ctx.fillStyle = st.mode === "lock" ? C.lock : C.lockfree; ctx.font = "600 11px 'Segoe UI',sans-serif"; ctx.fillText(st.mode === "lock" ? "🔒 잠금(임계영역)" : (st.mode === "lockfree" ? "CAS 처리중" : "쓰는 중"), BOX.x + BOX.w / 2, BOX.y + 92); }
    // 토큰
    for (var p2 = 0; p2 < st.parts.length; p2++) { var p = st.parts[p2]; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, 6.2832); ctx.fillStyle = p.retry ? C.lockfree : (p.wait ? C.lock : C.tok); ctx.fill(); }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "race" ? "보호 없음: 동시에 쓰면 한쪽 증가가 사라짐 → 카운터 < 기대값" : st.mode === "lock" ? "락: 한 번에 하나만(나머지 대기) → 정확하지만 경합 시 느림" : "락프리(CAS): 충돌하면 재시도 → 막힘 없이 정확", LW / 2, LH - 12);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("lf-caption"); if (!c) return;
    c.textContent = st.mode === "race"
      ? "보호 없음(race): 세 스레드가 동시에 '읽고 +1 하고 쓰기'를 하면, 둘이 같은 값을 읽어 한쪽 증가가 덮여 사라져. 카운터가 기대값보다 작아지지? 이게 레이스 컨디션."
      : st.mode === "lock"
        ? "락: 임계영역을 잠가 한 번에 하나만 통과(나머지는 빨갛게 대기). 정확하지만, 경합이 심하면 줄 서느라 느려지고 데드락 위험도 생겨."
        : "락프리(CAS): compare-and-swap으로 '내가 읽은 값이 그대로면 바꿔치기, 아니면 재시도'. 막지 않으니 대기가 없고, 충돌 시 재시도만 늘 뿐 유실은 0. 우리 게임 서버는 아예 싱글스레드라 이 고민 자체가 없어(액터 1마리).";
  }
  function sel(m) { st.mode = m; st.counter = 0; st.expected = 0; st.lost = 0; st.retry = 0; st.parts = []; st.busy = 0; var t = document.querySelectorAll(".lftab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".lftab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("lf-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { for (var i = 0; i < 10; i++) { st.counter++; st.expected++; } st.lost = 3; st.expected += 3; draw(); var n = document.getElementById("lf-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
