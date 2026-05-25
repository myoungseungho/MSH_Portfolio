/* ============================================================
 * actor-model/granularity.js
 * "액터 단위를 어떻게 잡나" + "액터 ≠ 스레드" 오해 격파 시뮬레이터
 *   coarse  : 서버 전체 = 액터 1개 (우리 현재) → 코어 1개만 사용, 나머지 7개 논다
 *   balanced: 유저·존 단위 (~40 액터) → 코어 다 씀, 동시 실행 ≤ 8
 *   fine    : 객체마다 (~600 액터) → 코어 여전히 8, 동시 실행 여전히 ≤ 8 + 메시지 폭증
 * 핵심: 액터 수가 1이든 600이든 '지금 동시 실행'은 항상 스레드 수(8) 이하.
 * ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("gran-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 420;

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  var CORES = 8;
  var PROC = 0.45;

  var st = {
    mode: "balanced",
    running: true,
    actors: [],
    cores: [],
    spawnAcc: 0,
    interAcc: 0,
    msgFlying: [],
    runningNow: 0,
    peakRunning: 0
  };

  var COL = {
    bg: "#0e1426", panel: "#172033",
    idle: "#37474f", mail: "#5c6bc0", run: "#66bb6a",
    coreIdle: "#263238", coreBusy: "#26c6da",
    text: "#e3eaf5", sub: "#90a4c4", line: "rgba(38,198,218,0.45)", msg: "#ffca28"
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

  var MODES = {
    coarse: { count: 1, spawn: 6, inter: 0 },
    balanced: { count: 40, spawn: 22, inter: 0 },
    fine: { count: 600, spawn: 55, inter: 40 }
  };

  var AREA = { x: 28, y: 42, w: LW - 56, h: 176 };

  function layout() {
    st.actors = [];
    var m = MODES[st.mode];
    if (st.mode === "coarse") {
      st.actors.push({ mail: 0, locked: -1, x: LW / 2 - 170, y: 95, w: 340, h: 92, big: true });
      return;
    }
    var n = m.count;
    var drawn = Math.min(n, st.mode === "fine" ? 120 : n);
    var cols = st.mode === "fine" ? 20 : 10;
    var rows = Math.max(1, Math.ceil(drawn / cols));
    var sx = AREA.w / cols;
    var sy = Math.min(AREA.h / rows, 40);
    var r = st.mode === "fine" ? 5 : 11;
    for (var i = 0; i < n; i++) {
      var c = i % cols, rw = Math.floor(i / cols);
      st.actors.push({
        mail: 0, locked: -1,
        x: AREA.x + c * sx + sx / 2,
        y: AREA.y + Math.min(rw, rows - 1) * sy + sy / 2,
        r: r, hidden: i >= drawn
      });
    }
  }

  function initCores() {
    st.cores = [];
    var cw = 76, gap = 8;
    var total = CORES * cw + (CORES - 1) * gap;
    var startX = (LW - total) / 2;
    for (var c = 0; c < CORES; c++)
      st.cores.push({ x: startX + c * (cw + gap), y: 330, w: cw, h: 54, busy: false, t: 0, actor: -1 });
  }

  function reset() {
    layout(); initCores();
    st.spawnAcc = 0; st.interAcc = 0; st.msgFlying = [];
    st.runningNow = 0; st.peakRunning = 0;
  }

  function update(dt) {
    var m = MODES[st.mode];
    st.spawnAcc += dt * m.spawn;
    while (st.spawnAcc >= 1) {
      st.spawnAcc -= 1;
      var a = st.actors[(Math.random() * st.actors.length) | 0];
      if (a && a.mail < 20) a.mail++;
    }
    if (m.inter > 0) {
      st.interAcc += dt * m.inter;
      while (st.interAcc >= 1) {
        st.interAcc -= 1;
        var s = st.actors[(Math.random() * st.actors.length) | 0];
        var d = st.actors[(Math.random() * st.actors.length) | 0];
        if (s && d && !s.hidden && !d.hidden && st.msgFlying.length < 40)
          st.msgFlying.push({ x: s.x, y: s.y, tx: d.x, ty: d.y, t: 0 });
      }
    }
    for (var i = st.msgFlying.length - 1; i >= 0; i--) {
      st.msgFlying[i].t += dt * 2.2;
      if (st.msgFlying[i].t >= 1) st.msgFlying.splice(i, 1);
    }

    for (var c = 0; c < st.cores.length; c++) {
      var core = st.cores[c];
      if (core.busy) {
        core.t -= dt;
        if (core.t <= 0) {
          core.busy = false;
          if (core.actor >= 0 && st.actors[core.actor]) st.actors[core.actor].locked = -1;
          core.actor = -1;
        }
      }
      if (!core.busy) {
        for (var k = 0; k < st.actors.length; k++) {
          var act = st.actors[k];
          if (act.mail > 0 && act.locked === -1) {
            act.mail--; act.locked = c;
            core.busy = true; core.t = PROC; core.actor = k;
            break;
          }
        }
      }
    }
    st.runningNow = 0;
    for (var b = 0; b < st.cores.length; b++) if (st.cores[b].busy) st.runningNow++;
    if (st.runningNow > st.peakRunning) st.peakRunning = st.runningNow;

    setText("gran-actors", MODES[st.mode].count.toLocaleString());
    setText("gran-running", st.runningNow);
  }

  function actorColor(a) {
    if (a.locked >= 0) return COL.run;
    if (a.mail > 0) return COL.mail;
    return COL.idle;
  }

  function draw() {
    ctx.save();
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.fillStyle = COL.bg; rr(0, 0, LW, LH, 14); ctx.fill();

    ctx.fillStyle = COL.sub; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = "600 12px 'Segoe UI', sans-serif";
    var label = st.mode === "coarse" ? "액터 1개 (서버 전체)"
      : st.mode === "balanced" ? "액터 40개 (유저·존 단위)"
      : "액터 600개 (객체마다) — 표시는 일부";
    ctx.fillText(label, 28, 30);

    for (var i = 0; i < st.msgFlying.length; i++) {
      var mf = st.msgFlying[i];
      var px = mf.x + (mf.tx - mf.x) * mf.t, py = mf.y + (mf.ty - mf.y) * mf.t;
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = COL.msg; ctx.fill();
    }

    for (var k = 0; k < st.actors.length; k++) {
      var a = st.actors[k];
      if (a.hidden) continue;
      if (a.big) {
        rr(a.x, a.y, a.w, a.h, 12); ctx.fillStyle = actorColor(a); ctx.fill();
        ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.font = "700 14px 'Segoe UI', sans-serif";
        ctx.fillText("서버 전체 (1 액터)", a.x + a.w / 2, a.y + a.h / 2 + 5);
      } else {
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = actorColor(a); ctx.fill();
      }
      if (a.locked >= 0 && st.cores[a.locked]) {
        var core = st.cores[a.locked];
        ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(a.big ? a.x + a.w / 2 : a.x, a.big ? a.y + a.h : a.y);
        ctx.lineTo(core.x + core.w / 2, core.y); ctx.stroke();
      }
    }
    if (st.mode === "fine") {
      ctx.fillStyle = COL.sub; ctx.font = "700 12px 'Segoe UI', sans-serif"; ctx.textAlign = "right";
      ctx.fillText("+480 더…", LW - 28, AREA.y + AREA.h + 4);
    }

    ctx.fillStyle = COL.sub; ctx.textAlign = "left"; ctx.font = "600 12px 'Segoe UI', sans-serif";
    ctx.fillText("스레드풀 = 코어 " + CORES + "개 (이게 동시 실행의 상한)", 28, 318);
    for (var c = 0; c < st.cores.length; c++) {
      var co = st.cores[c];
      rr(co.x, co.y, co.w, co.h, 8);
      ctx.fillStyle = co.busy ? COL.coreBusy : COL.coreIdle; ctx.fill();
      ctx.fillStyle = co.busy ? "#0c1220" : "#607d8b";
      ctx.textAlign = "center"; ctx.font = "700 12px 'Segoe UI', sans-serif";
      ctx.fillText("C" + (c + 1), co.x + co.w / 2, co.y + co.h / 2 - 2);
      ctx.font = "600 10px 'Segoe UI', sans-serif";
      ctx.fillText(co.busy ? "실행" : "쉼", co.x + co.w / 2, co.y + co.h / 2 + 13);
    }

    ctx.restore();
  }

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
    var cap = document.getElementById("gran-caption"); if (!cap) return;
    cap.textContent = st.mode === "coarse"
      ? "서버 전체를 액터 1개로 두면(우리 현재) 메일박스가 1개라 코어도 1개만 일해 — 나머지 7개는 논다. 단순하고 순서는 완벽하지만 1코어 천장. '지금 동시 실행'을 봐, 계속 1이지?"
      : st.mode === "balanced"
        ? "유저·존처럼 '일관성 경계'로 묶으면 액터가 40개. 코어 8개가 골고루 일해 처리량이 확 올라. 핵심: 액터는 40개여도 '지금 동시 실행'은 코어 수(8) 이하야. 액터는 스레드가 아니거든."
        : "객체(몬스터) 하나하나를 액터로 쪼개면 600개. 그런데 '지금 동시 실행'은 여전히 8 이하 — 액터를 늘려도 코어 이상은 못 돌아. 오히려 액터끼리 메시지(노란 점)가 폭증해 스케줄링·통신 오버헤드만 늘어. 그래서 몬스터는 '존 액터' 안의 객체로 두지, 액터로 쪼개지 않아.";
  }
  function selectMode(m) {
    st.mode = m; reset();
    var tabs = document.querySelectorAll(".gtab");
    for (var i = 0; i < tabs.length; i++)
      tabs[i].classList.toggle("active", tabs[i].getAttribute("data-gmode") === m);
    setText("gran-actors", MODES[m].count.toLocaleString());
    setCaption();
    if (reduceMotion) draw();
  }

  var tabs = document.querySelectorAll(".gtab");
  for (var i = 0; i < tabs.length; i++) (function (t) {
    t.addEventListener("click", function () { selectMode(t.getAttribute("data-gmode")); });
  })(tabs[i]);
  var playBtn = document.getElementById("gran-play");
  if (playBtn) playBtn.addEventListener("click", function () {
    st.running = !st.running;
    playBtn.textContent = st.running ? "⏸ 일시정지" : "▶ 재생";
  });

  reset();
  setText("gran-threads", CORES);
  setText("gran-actors", MODES[st.mode].count.toLocaleString());
  setCaption();
  resize();
  window.addEventListener("resize", resize);
  if (reduceMotion) {
    for (var z = 0; z < Math.min(st.actors.length, 12); z++) st.actors[z].mail = 1;
    if (st.cores[0]) { st.cores[0].busy = true; }
    if (st.cores[3]) { st.cores[3].busy = true; }
    st.runningNow = 2;
    draw();
    var note = document.getElementById("gran-caption");
    if (note) note.textContent += "  (모션 줄이기 설정이 켜져 있어 정지 화면으로 표시 중)";
  } else {
    requestAnimationFrame(frame);
  }
})();
