/* ============================================================
 * actor-model/order.js
 * "순서(ordering)" 시뮬레이터 — DB 라운드트립이 끼었을 때
 *   sync  : 동기 블로킹 (우리 서버) — DB 대기 중 월드 전체 정지, 순서 100%
 *   naive : 순진한 비동기 (안티패턴) — 코어는 일하나 완료 순서가 깨짐
 *   stash : 비동기 + 보류함 (정석) — 결과 올 때까지 stash, 순서 유지 + 코어 안 놀림
 * 완료 순서 스트립으로 "순서 꼬임"을 빨갛게 보여준다.
 * ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("order-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 430;

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  var PROC = 0.28;      // CPU 처리 시간(초)
  var DBLAT = 1.15;     // DB 왕복 지연(초)
  var SPAWN = 0.7;      // 메시지 유입 간격(초)
  var SIDE_RATE = 8;    // 비동기 모드에서 '다른 액터' 처리 속도(건/초)

  var st = {
    mode: "sync",
    running: true,
    queue: [],          // {num, db}
    nextNum: 1,
    spawnAcc: 0,
    actor: { state: "idle", cur: null, t: 0 }, // idle|proc|dbwait|stashing
    inflight: [],       // {num, t}  (naive/stash)
    completion: [],     // {num, bad}
    violations: 0,
    done: 0,
    side: 0,            // DB 대기 중 다른 액터가 처리한 양
    frozen: false       // sync: 월드 정지 여부
  };

  var COL = {
    bg: "#0e1426", panel: "#172033",
    msg: "#ffca28", hold: "#ff8f00", db: "#26c6da",
    actor: "#ab47bc", ok: "#66bb6a", bad: "#ef5350",
    text: "#e3eaf5", sub: "#90a4c4", line: "#2a3650", frozen: "#ef5350"
  };

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function token(x, y, num, fill, r) {
    r = r || 13;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    ctx.fillStyle = "#0c1220";
    ctx.font = "700 12px 'Segoe UI', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(num, x, y + 1);
  }
  function box(x, y, w, h, fill, label, sub) {
    rr(x, y, w, h, 10); ctx.fillStyle = fill; ctx.fill();
    ctx.fillStyle = "#0c1220"; ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "700 14px 'Segoe UI', sans-serif";
    ctx.fillText(label, x + w / 2, y + h / 2 - 1);
    if (sub) {
      ctx.fillStyle = "rgba(12,18,32,0.75)";
      ctx.font = "600 11px 'Segoe UI', sans-serif";
      ctx.fillText(sub, x + w / 2, y + h / 2 + 15);
    }
  }

  function reset() {
    st.queue = []; st.nextNum = 1; st.spawnAcc = 0;
    st.actor = { state: "idle", cur: null, t: 0 };
    st.inflight = []; st.completion = [];
    st.violations = 0; st.done = 0; st.side = 0; st.frozen = false;
  }

  function complete(msg) {
    var bad = st.completion.length > 0 &&
      msg.num < st.completion[st.completion.length - 1].num;
    if (bad) st.violations++;
    st.completion.push({ num: msg.num, bad: bad });
    if (st.completion.length > 18) st.completion.shift();
    st.done++;
  }

  function update(dt) {
    // 유입 (큐 폭주 방지 캡)
    st.spawnAcc += dt;
    while (st.spawnAcc >= SPAWN) {
      st.spawnAcc -= SPAWN;
      if (st.queue.length < 30) {
        st.queue.push({ num: st.nextNum, db: (st.nextNum % 2 === 1) });
        st.nextNum++;
      }
    }

    var a = st.actor;
    st.frozen = false;

    if (st.mode === "sync") {
      // 단일 스레드 동기 블로킹
      if (a.state === "idle" && st.queue.length) {
        a.cur = st.queue.shift(); a.state = "proc"; a.t = PROC;
      }
      if (a.state === "proc") {
        a.t -= dt;
        if (a.t <= 0) {
          if (a.cur.db) { a.state = "dbwait"; a.t = DBLAT; }
          else { complete(a.cur); a.cur = null; a.state = "idle"; }
        }
      }
      if (a.state === "dbwait") {
        st.frozen = true;            // 월드 전체 정지
        a.t -= dt;
        if (a.t <= 0) { complete(a.cur); a.cur = null; a.state = "idle"; }
      }
    } else if (st.mode === "naive") {
      // 비동기로 쏘고 바로 다음 처리 (안티패턴)
      st.side += dt * SIDE_RATE;     // 다른 액터는 계속 일함
      if (a.state === "idle" && st.queue.length) {
        a.cur = st.queue.shift(); a.state = "proc"; a.t = PROC;
      }
      if (a.state === "proc") {
        a.t -= dt;
        if (a.t <= 0) {
          if (a.cur.db) { st.inflight.push({ num: a.cur.num, t: DBLAT }); }
          else { complete(a.cur); }
          a.cur = null; a.state = "idle";
        }
      }
      for (var i = st.inflight.length - 1; i >= 0; i--) {
        st.inflight[i].t -= dt;
        if (st.inflight[i].t <= 0) { complete({ num: st.inflight[i].num }); st.inflight.splice(i, 1); }
      }
    } else { // stash
      st.side += dt * SIDE_RATE;
      if (st.inflight.length === 0) {
        if (a.state === "idle" && st.queue.length) {
          a.cur = st.queue.shift(); a.state = "proc"; a.t = PROC;
        }
        if (a.state === "proc") {
          a.t -= dt;
          if (a.t <= 0) {
            if (a.cur.db) { st.inflight.push({ num: a.cur.num, t: DBLAT }); a.state = "stashing"; }
            else { complete(a.cur); a.cur = null; a.state = "idle"; }
          }
        }
      } else {
        // DB 대기 — 들어오는 건 queue(=보류함)에 쌓이고, 결과 오면 순서대로 재개
        a.state = "stashing";
        st.inflight[0].t -= dt;
        if (st.inflight[0].t <= 0) {
          complete({ num: st.inflight[0].num }); st.inflight.shift();
          a.cur = null; a.state = "idle";
        }
      }
    }

    setText("order-stat-viol", st.violations);
    setText("order-stat-done", st.done);
    var vEl = document.getElementById("order-stat-viol");
    if (vEl) vEl.style.color = st.violations > 0 ? COL.bad : COL.ok;
    var g = document.getElementById("order-stat-guard");
    if (g) {
      g.textContent = st.mode === "naive" ? "❌ 깨짐" : "✅ 유지";
      g.style.color = st.mode === "naive" ? COL.bad : COL.ok;
    }
  }

  // ---- 그리기 ----
  var ACT = { x: 50, y: 122, w: 220, h: 74 };
  var DBB = { x: 545, y: 118, w: 120, h: 82 };

  function draw() {
    ctx.save();
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.fillStyle = COL.bg; rr(0, 0, LW, LH, 14); ctx.fill();

    ctx.fillStyle = COL.sub; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = "600 12px 'Segoe UI', sans-serif";
    var stashing = (st.mode === "stash" && st.inflight.length > 0);
    ctx.fillText(stashing ? "들어오는 메시지 (보류함에 대기 중)" : "들어오는 메시지 (홀수=DB 왕복 필요)", 30, 30);

    // 입력 큐 토큰
    var maxShow = 16;
    for (var i = 0; i < Math.min(st.queue.length, maxShow); i++) {
      token(46 + i * 30, 54, st.queue[i].num,
        stashing ? COL.hold : (st.queue[i].db ? COL.msg : "#cfd8dc"));
    }
    if (st.queue.length > maxShow) {
      ctx.fillStyle = COL.sub; ctx.font = "700 12px 'Segoe UI', sans-serif";
      ctx.fillText("+" + (st.queue.length - maxShow), 46 + maxShow * 30, 58);
    }

    // 액터/스레드 박스
    var a = st.actor;
    var stateLabel = a.state === "dbwait" ? "🔒 DB 대기 (월드 정지)"
      : a.state === "stashing" ? "⏳ DB 대기 (보류 중)"
      : a.state === "proc" ? "처리 중… #" + (a.cur ? a.cur.num : "")
      : "대기";
    var aColor = (a.state === "dbwait") ? "#b0bec5"
      : (a.state === "proc" || a.state === "stashing") ? COL.actor : "#3a4a5a";
    box(ACT.x, ACT.y, ACT.w, ACT.h, aColor,
      st.mode === "sync" ? "게임로직 스레드 ×1" : "액터 (스레드풀)", stateLabel);

    // DB 실린더
    ctx.fillStyle = COL.db;
    rr(DBB.x, DBB.y + 10, DBB.w, DBB.h - 10, 6); ctx.fill();
    ctx.beginPath(); ctx.ellipse(DBB.x + DBB.w / 2, DBB.y + 10, DBB.w / 2, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#4dd0e1"; ctx.fill();
    ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.font = "700 14px 'Segoe UI', sans-serif";
    ctx.fillText("DB", DBB.x + DBB.w / 2, DBB.y + DBB.h / 2 + 8);

    // 연결선
    ctx.strokeStyle = COL.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ACT.x + ACT.w, ACT.y + ACT.h / 2);
    ctx.lineTo(DBB.x, DBB.y + DBB.h / 2); ctx.stroke();

    // in-flight (DB 처리 중 토큰 + 진행 링)
    var bx = DBB.x - 60, by = DBB.y + DBB.h / 2;
    for (var k = 0; k < Math.min(st.inflight.length, 3); k++) {
      var jf = st.inflight[k];
      var px = bx - k * 30;
      token(px, by, jf.num, COL.db);
      var pr = 1 - jf.t / DBLAT;
      ctx.strokeStyle = COL.ok; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, by, 17, -Math.PI / 2, -Math.PI / 2 + pr * Math.PI * 2); ctx.stroke();
    }

    // sync 진행 바
    if (a.state === "proc") {
      var pr2 = 1 - a.t / PROC;
      rr(ACT.x, ACT.y + ACT.h - 5, ACT.w * pr2, 5, 2); ctx.fillStyle = "#4a148c"; ctx.fill();
    }

    // 배너: 월드 정지 vs 다른 액터 일함
    ctx.textAlign = "left"; ctx.font = "700 13px 'Segoe UI', sans-serif";
    if (st.mode === "sync") {
      ctx.fillStyle = st.frozen ? COL.frozen : COL.sub;
      ctx.fillText(st.frozen
        ? "🔒 DB 다녀오는 동안 채널 전체가 멈춰 있음 (다른 메시지 0건 처리)"
        : "스레드 1개가 순서대로 — 2번은 1번이 완전히 끝나야 시작",
        30, 252);
    } else {
      ctx.fillStyle = COL.ok;
      ctx.fillText("✅ DB 대기 중에도 다른 액터 처리: " + Math.floor(st.side) + "건",
        30, 252);
    }

    // 완료 순서 스트립
    ctx.fillStyle = COL.sub; ctx.font = "600 12px 'Segoe UI', sans-serif";
    ctx.fillText("완료 순서 →  (빨강 = 순서 꼬임)", 30, 300);
    rr(30, 314, LW - 60, 60, 10); ctx.fillStyle = COL.panel; ctx.fill();
    for (var c = 0; c < st.completion.length; c++) {
      var e = st.completion[c];
      token(58 + c * 36, 344, e.num, e.bad ? COL.bad : COL.ok);
    }

    ctx.restore();
  }

  // ---- 루프/스케일 ----
  var last = 0;
  function frame(ts) {
    if (!last) last = ts;
    var dt = Math.min((ts - last) / 1000, 0.05); last = ts;
    if (st.running && !reduceMotion) update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  var scaleX = 1, scaleY = 1;
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || LW;
    var cssH = cssW * (LH / LW);
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scaleX = (cssW * dpr) / LW; scaleY = (cssH * dpr) / LH;
    if (reduceMotion) draw();
  }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function setCaption() {
    var cap = document.getElementById("order-caption"); if (!cap) return;
    cap.textContent = st.mode === "sync"
      ? "메시지를 처리하다 DB에 갔다오는 동안 스레드가 통째로 멈춰. 그래서 2번은 1번이 완전히 끝나야 시작 — 순서 100% 보장. 대신 DB 다녀오는 그 시간 동안 온 채널이 얼어붙어. 이게 우리 서버가 치르는 값이야."
      : st.mode === "naive"
        ? "DB는 비동기로 쏘고 바로 다음 메시지를 처리하면? 코어는 안 놀지만, 1번이 DB 갔다오는 사이 2·3번이 먼저 끝나버려 — 완료 순서가 깨져(빨강). 상태를 건드리는 로직이라면 stale 값을 읽는 버그가 돼. 이건 액터 모델의 결함이 아니라 '쓰면 안 되는 안티패턴'이야."
        : "DB를 쏜 뒤엔 결과가 올 때까지 들어오는 메시지를 보류함(stash)에 쌓아둬. 결과가 오면 보류분을 순서대로 처리 — 순서도 지키고, 그 사이 스레드는 다른 액터를 돌려 코어도 안 놀려. 대신 이 stash 로직을 직접 짜야 해. (Akka stash/become, Orleans grain await)";
  }
  function selectMode(m) {
    st.mode = m; reset();
    var tabs = document.querySelectorAll(".otab");
    for (var i = 0; i < tabs.length; i++)
      tabs[i].classList.toggle("active", tabs[i].getAttribute("data-omode") === m);
    var coresLabel = document.getElementById("order-stat-guard");
    setCaption();
    if (reduceMotion) draw();
  }

  var tabs = document.querySelectorAll(".otab");
  for (var i = 0; i < tabs.length; i++) (function (t) {
    t.addEventListener("click", function () { selectMode(t.getAttribute("data-omode")); });
  })(tabs[i]);
  var playBtn = document.getElementById("order-play");
  if (playBtn) playBtn.addEventListener("click", function () {
    st.running = !st.running;
    playBtn.textContent = st.running ? "⏸ 일시정지" : "▶ 재생";
  });
  var resetBtn = document.getElementById("order-reset");
  if (resetBtn) resetBtn.addEventListener("click", function () { reset(); });

  setCaption();
  resize();
  window.addEventListener("resize", resize);
  if (reduceMotion) {
    st.queue = [{ num: 5, db: true }, { num: 6, db: false }, { num: 7, db: true }];
    st.completion = [{ num: 1, bad: false }, { num: 2, bad: false }, { num: 3, bad: false }];
    draw();
    var note = document.getElementById("order-caption");
    if (note) note.textContent += "  (모션 줄이기 설정이 켜져 있어 정지 화면으로 표시 중)";
  } else {
    requestAnimationFrame(frame);
  }
})();
