/* raft-leader-election — 노드 5개가 투표로 리더를 뽑고, 리더 장애 시 재선출 */
(function () {
  "use strict";
  var canvas = document.getElementById("rf-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 320;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var N = 5;
  var st = { running: true, t: 0, phase: "election", pt: 0, leader: -1, cand: -1, term: 0, votes: 0, parts: [], dead: -1 };
  var nodes = [];
  function layout() { nodes = []; var cx = 360, cy = 150, rad = 110; for (var i = 0; i < N; i++) { var a = -Math.PI / 2 + i * (2 * Math.PI / N); nodes.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad }); } }
  var C = { bg: "#0e1426", follower: "#37474f", cand: "#ffa726", leader: "#66bb6a", dead: "#5a2a2a", vote: "#ffca28", hb: "#42a5f5", text: "#e3eaf5", sub: "#90a4c4" };

  function startElection() { st.phase = "election"; st.pt = 0; st.term++; do { st.cand = (Math.random() * N) | 0; } while (st.cand === st.dead); st.votes = 1; st.parts = []; for (var i = 0; i < N; i++) if (i !== st.cand && i !== st.dead) st.parts.push({ from: st.cand, to: i, t: 0, kind: "req" }); }

  function update(dt) {
    st.t += dt; st.pt += dt;
    for (var p = st.parts.length - 1; p >= 0; p--) {
      var pt = st.parts[p]; pt.t += dt * 1.4;
      if (pt.t >= 1) {
        if (pt.kind === "req") { st.parts.push({ from: pt.to, to: st.cand, t: 0, kind: "vote" }); }
        else if (pt.kind === "vote") { st.votes++; if (st.votes > N / 2 && st.phase === "election") { st.leader = st.cand; st.phase = "lead"; st.pt = 0; } }
        st.parts.splice(p, 1);
      }
    }
    if (st.phase === "lead") {
      if (st.pt > 1.0) { st.pt = 0; for (var i = 0; i < N; i++) if (i !== st.leader && i !== st.dead) st.parts.push({ from: st.leader, to: i, t: 0, kind: "hb" }); }
      // 자동 장애(가끔)
      if (st.t > 6 && Math.random() < dt * 0.06) failLeader();
    }
    if (st.phase === "election" && st.pt > 3) startElection(); // 분열표 → 재시도
    setText("rf-leader", st.leader >= 0 && st.phase === "lead" ? "노드 " + (st.leader + 1) : "선출 중…");
    setText("rf-term", st.term);
  }
  function failLeader() { if (st.leader < 0) return; st.dead = st.leader; st.leader = -1; setTimeout(function () { st.dead = -1; }, 1500); startElection(); }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = C.bg; rr(0, 0, LW, LH, 14); ctx.fill();
    // 파티클
    for (var p = 0; p < st.parts.length; p++) { var pt = st.parts[p], a = nodes[pt.from], b = nodes[pt.to]; var x = a.x + (b.x - a.x) * pt.t, y = a.y + (b.y - a.y) * pt.t; ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.2832); ctx.fillStyle = pt.kind === "hb" ? C.hb : C.vote; ctx.fill(); }
    // 노드
    for (var i = 0; i < N; i++) {
      var n = nodes[i]; var fill = (i === st.dead) ? C.dead : (i === st.leader && st.phase === "lead") ? C.leader : (i === st.cand && st.phase === "election") ? C.cand : C.follower;
      ctx.beginPath(); ctx.arc(n.x, n.y, 26, 0, 6.2832); ctx.fillStyle = fill; ctx.fill();
      ctx.fillStyle = (i === st.dead) ? "#e3a0a0" : "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 12px 'Segoe UI',sans-serif";
      ctx.fillText("노드" + (i + 1), n.x, n.y - 3);
      ctx.font = "600 9px 'Segoe UI',sans-serif";
      var role = (i === st.dead) ? "장애" : (i === st.leader && st.phase === "lead") ? "리더" : (i === st.cand && st.phase === "election") ? "후보" : "팔로워";
      ctx.fillText(role, n.x, n.y + 10); ctx.textBaseline = "alphabetic";
    }
    ctx.fillStyle = C.sub; ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.phase === "election" ? "선거: 후보가 투표 요청(노랑) → 과반수 받으면 리더" : "리더가 하트비트(파랑)를 보내 '나 살아있음'을 알림", LW / 2, LH - 14);
    ctx.restore();
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  var last = 0;
  function frame(ts) { if (!last) last = ts; var dt = Math.min((ts - last) / 1000, 0.05); last = ts; if (st.running && !reduce) update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; if (reduce) draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("rf-caption"); if (!c) return;
    c.textContent = "Raft 리더 선출: 평소엔 팔로워들이 리더의 하트비트(파랑)를 받아. 리더가 일정 시간 소식이 없으면(장애), 한 노드가 후보가 되어 임기(term)를 올리고 투표를 요청해(노랑). 과반수 표를 받으면 새 리더. '리더 장애' 버튼으로 직접 죽여봐 — 곧 새 리더가 뽑히지. 과반수가 핵심이라 홀수 노드를 써.";
  }
  var kill = document.getElementById("rf-kill"); if (kill) kill.addEventListener("click", failLeader);
  var pl = document.getElementById("rf-play"); if (pl) pl.addEventListener("click", function () { st.running = !st.running; pl.textContent = st.running ? "⏸ 일시정지" : "▶ 재생"; });

  layout(); setCap(); resize(); addEventListener("resize", resize); startElection();
  if (reduce) { st.phase = "lead"; st.leader = 0; st.term = 1; draw(); var n = document.getElementById("rf-caption"); if (n) n.textContent += "  (모션 줄이기: 정지 화면)"; }
  else requestAnimationFrame(frame);
})();
