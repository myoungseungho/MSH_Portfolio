/* ring-buffer — 원형 버퍼: 쓰기(생산)/읽기(소비) 포인터가 돌며 가득참/빔 */
(function () {
  "use strict";
  var canvas = document.getElementById("rb-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 340;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var N = 12, CX = 220, CY = 165, RAD = 110;
  var st = { mode: "balanced", running: true, slots: [], w: 0, r: 0, count: 0, prodAcc: 0, consAcc: 0, wrote: 0, read: 0, full: 0, empty: 0 };
  function init() { st.slots = []; for (var i = 0; i < N; i++) st.slots.push(0); st.w = 0; st.r = 0; st.count = 0; }
  var C = { bg: "#0e1426", empty: "#243049", filled: "#42a5f5", wptr: "#66bb6a", rptr: "#ffa726", text: "#e3eaf5", sub: "#90a4c4", bad: "#ef5350" };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function slotPos(i, r) { var a = i / N * Math.PI * 2 - Math.PI / 2; return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r }; }
  function rates() { return st.mode === "prod" ? [3.5, 1.5] : st.mode === "cons" ? [1.5, 3.5] : [2.5, 2.5]; }

  function update(dt) {
    var rt = rates();
    st.prodAcc += dt * rt[0]; while (st.prodAcc >= 1) { st.prodAcc -= 1; if (st.count < N) { st.slots[st.w] = 1; st.w = (st.w + 1) % N; st.count++; st.wrote++; } else st.full++; }
    st.consAcc += dt * rt[1]; while (st.consAcc >= 1) { st.consAcc -= 1; if (st.count > 0) { st.slots[st.r] = 0; st.r = (st.r + 1) % N; st.count--; st.read++; } else st.empty++; }
    setText("rb-used", st.count + "/" + N);
    setText("rb-state", st.count === N ? "가득참(생산 막힘)" : st.count === 0 ? "빔(소비 막힘)" : "정상");
  }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    for (var i = 0; i < N; i++) {
      var p = slotPos(i, RAD);
      ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, 6.2832); ctx.fillStyle = st.slots[i] ? C.filled : C.empty; ctx.fill();
      ctx.strokeStyle = "#0c1220"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = st.slots[i] ? "#0c1220" : "#5d6b85"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 10px 'Segoe UI',sans-serif"; ctx.fillText(i, p.x, p.y + 1); ctx.textBaseline = "alphabetic";
    }
    // 포인터
    var wp = slotPos(st.w, RAD + 34), rp = slotPos(st.r, RAD + 34);
    ctx.fillStyle = C.wptr; ctx.beginPath(); ctx.arc(wp.x, wp.y, 9, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "#0c1220"; ctx.font = "700 9px 'Segoe UI',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("W", wp.x, wp.y + 1);
    ctx.fillStyle = C.rptr; ctx.beginPath(); ctx.arc(rp.x, rp.y, 9, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "#0c1220"; ctx.fillText("R", rp.x, rp.y + 1); ctx.textBaseline = "alphabetic";
    // 범례
    ctx.textAlign = "left"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillStyle = C.wptr; ctx.fillText("● W = 쓰기(생산) 포인터", 410, 80);
    ctx.fillStyle = C.rptr; ctx.fillText("● R = 읽기(소비) 포인터", 410, 106);
    ctx.fillStyle = C.filled; ctx.fillText("■ 채워진 슬롯(데이터)", 410, 132);
    ctx.fillStyle = st.count === N ? C.bad : (st.count === 0 ? C.rptr : C.sub); ctx.font = "700 13px 'Segoe UI',sans-serif";
    ctx.fillText(st.count === N ? "가득참: W가 R 따라잡음 → 생산 막힘" : st.count === 0 ? "빔: R이 W 따라잡음 → 소비 대기" : "정상: W와 R 사이가 데이터", 410, 168);
    ctx.restore();
  }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("rb-caption"); if (!c) return;
    c.textContent = st.mode === "balanced"
      ? "링버퍼: 고정 크기 배열을 '원'처럼 돌려 써. 쓰기(W)는 생산자가, 읽기(R)는 소비자가 각자 전진하고, 끝에 닿으면 처음으로 돌아와(wrap). W와 R 사이가 '쌓인 데이터'야. 할당/해제 없이 재활용해서 빠르고, IOCP 수신 버퍼·로그·오디오에 단골이야."
      : st.mode === "prod"
        ? "생산 빠름: W가 R을 따라잡으면 '가득참' — 더 못 써서 생산이 막혀(덮어쓰면 안 읽은 데이터 손실). 백프레셔가 필요한 지점이야."
        : "소비 빠름: R이 W를 따라잡으면 '빔' — 읽을 게 없어 소비가 대기. 둘 다 같은 칸을 가리키는 게 '빈 상태'야.";
  }
  function sel(m) { st.mode = m; var t = document.querySelectorAll(".rbtab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); if (reduce) draw(); }
  var tabs = document.querySelectorAll(".rbtab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var pl = document.getElementById("rb-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  init(); setCap(); resize(); addEventListener("resize", resize);
  if (reduce) { for (var i = 0; i < 5; i++) { st.slots[i] = 1; } st.w = 5; st.count = 5; draw(); var n = document.getElementById("rb-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
