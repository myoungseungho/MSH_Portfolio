/* ============================================================
 * actor-model/anim.js
 * 두 동시성 모델 비교 시뮬레이터
 *  - game  : IOCP 스레드 N개 → 큐 1개 → 게임로직 스레드 1개 (single consumer)
 *  - actor : 액터 N개(각자 메일박스) + 코어 4개 동시 처리 (parallel)
 * 캔버스 1개 위에서 탭으로 모드 전환. 부하 슬라이더 + 공성전 버스트.
 * ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("sim-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  // 논리 좌표계 (이 안에서만 그림, 화면 크기에 맞춰 스케일)
  var LW = 720, LH = 380;

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  // ---- 상태 ----
  var state = {
    mode: "game",
    running: true,
    load: 3,            // 슬라이더 1~10 (초당 유입 ≈ load)
    burst: 0,           // 남은 버스트 시간(초)
    spawnAcc: 0,
    flying: [],         // 이동 중 패킷 파티클
    queueCount: 0,      // game: 큐 적체 수
    consumer: { busy: false, t: 0, p: null }, // game: 게임로직 스레드 1개
    actors: [],         // actor 모드
    cores: [],          // actor 모드: 코어 4개
    done: 0,
    maxQueueSeen: 0
  };

  var PROCESS_TIME = 0.42; // 메시지 1건 처리 시간(초) — 양쪽 동일(공정 비교)
  var CORE_COUNT = 4;

  // ---- 색 ----
  var COL = {
    bg: "#0e1426",
    panel: "#172033",
    io: "#42a5f5",
    net: "#42a5f5",
    packet: "#ffca28",
    queue: "#5c6bc0",
    queueHot: "#ef5350",
    logic: "#66bb6a",
    actor: "#ab47bc",
    core: "#26c6da",
    coreIdle: "#37474f",
    text: "#e3eaf5",
    sub: "#90a4c4",
    line: "#2a3650"
  };

  // ---- 도형 헬퍼 ----
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function box(x, y, w, h, fill, label, sub) {
    rr(x, y, w, h, 10);
    ctx.fillStyle = fill;
    ctx.fill();
    if (label) {
      ctx.fillStyle = "#0c1220";
      ctx.font = "700 14px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = sub ? "alphabetic" : "middle";
      ctx.fillText(label, x + w / 2, sub ? y + h / 2 - 2 : y + h / 2);
      if (sub) {
        ctx.fillStyle = "rgba(12,18,32,0.7)";
        ctx.font = "600 11px 'Segoe UI', sans-serif";
        ctx.fillText(sub, x + w / 2, y + h / 2 + 14);
      }
    }
  }
  function dot(x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ---- 레이아웃 좌표 ----
  // game 모드
  var IO = [
    { x: 70, y: 30, w: 150, h: 46 },
    { x: 285, y: 30, w: 150, h: 46 },
    { x: 500, y: 30, w: 150, h: 46 }
  ];
  var QUEUE = { x: 130, y: 170, w: 460, h: 44 };
  var LOGIC = { x: 250, y: 296, w: 220, h: 52 };

  // actor 모드
  var NET = { x: 285, y: 20, w: 150, h: 40 };

  function initActors() {
    state.actors = [];
    var labels = ["유저 A", "유저 B", "방 1", "NPC", "유저 C"];
    var n = labels.length;
    var gap = 18, w = (LW - 60 - gap * (n - 1)) / n;
    for (var i = 0; i < n; i++) {
      state.actors.push({
        label: labels[i],
        x: 30 + i * (w + gap),
        y: 110, w: w, h: 50,
        mail: 0,
        lockedBy: -1
      });
    }
    state.cores = [];
    var cw = 130, cgap = 24;
    var totalW = CORE_COUNT * cw + (CORE_COUNT - 1) * cgap;
    var startX = (LW - totalW) / 2;
    for (var c = 0; c < CORE_COUNT; c++) {
      state.cores.push({
        x: startX + c * (cw + cgap), y: 300, w: cw, h: 48,
        busy: false, t: 0, actor: -1
      });
    }
  }

  function reset() {
    state.flying = [];
    state.queueCount = 0;
    state.consumer = { busy: false, t: 0, p: null };
    state.done = 0;
    state.maxQueueSeen = 0;
    state.spawnAcc = 0;
    state.burst = 0;
    if (state.mode === "actor") initActors();
  }

  // ---- 스폰 ----
  function spawnRate() {
    var base = state.load * 1.0;        // 초당 유입
    if (state.burst > 0) base += 12;    // 공성전 폭주
    return base;
  }

  function spawn() {
    if (state.mode === "game") {
      var src = IO[(Math.random() * IO.length) | 0];
      state.flying.push({
        x: src.x + src.w / 2, y: src.y + src.h,
        tx: QUEUE.x + 24 + Math.random() * (QUEUE.w - 48),
        ty: QUEUE.y + QUEUE.h / 2,
        target: "queue", a: src.x + src.w / 2, ay: src.y + src.h
      });
    } else {
      var ai = (Math.random() * state.actors.length) | 0;
      var act = state.actors[ai];
      state.flying.push({
        x: NET.x + NET.w / 2, y: NET.y + NET.h,
        tx: act.x + act.w / 2, ty: act.y - 8,
        target: "actor", actor: ai
      });
    }
  }

  // ---- 업데이트 ----
  function update(dt) {
    if (state.burst > 0) state.burst = Math.max(0, state.burst - dt);

    // 스폰
    state.spawnAcc += dt * spawnRate();
    while (state.spawnAcc >= 1) {
      state.spawnAcc -= 1;
      if (state.flying.length < 120) spawn();
    }

    // 이동 패킷
    var speed = 520; // px/s
    for (var i = state.flying.length - 1; i >= 0; i--) {
      var p = state.flying[i];
      var dx = p.tx - p.x, dy = p.ty - p.y;
      var d = Math.hypot(dx, dy);
      var step = speed * dt;
      if (d <= step) {
        // 도착
        if (p.target === "queue") state.queueCount++;
        else if (p.target === "actor") {
          var a = state.actors[p.actor];
          if (a) a.mail++;
        }
        state.flying.splice(i, 1);
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }

    if (state.mode === "game") {
      // 단일 소비자
      var con = state.consumer;
      if (con.busy) {
        con.t -= dt;
        if (con.t <= 0) { con.busy = false; state.done++; }
      }
      if (!con.busy && state.queueCount > 0) {
        state.queueCount--;
        con.busy = true; con.t = PROCESS_TIME;
      }
      if (state.queueCount > state.maxQueueSeen) state.maxQueueSeen = state.queueCount;
    } else {
      // 코어 4개 병렬
      for (var c = 0; c < state.cores.length; c++) {
        var core = state.cores[c];
        if (core.busy) {
          core.t -= dt;
          if (core.t <= 0) {
            core.busy = false; state.done++;
            if (core.actor >= 0 && state.actors[core.actor])
              state.actors[core.actor].lockedBy = -1;
            core.actor = -1;
          }
        }
        if (!core.busy) {
          // 메일 있고 다른 코어가 안 잡은 액터 찾기
          for (var k = 0; k < state.actors.length; k++) {
            var act = state.actors[k];
            if (act.mail > 0 && act.lockedBy === -1) {
              act.mail--; act.lockedBy = c;
              core.busy = true; core.t = PROCESS_TIME; core.actor = k;
              break;
            }
          }
        }
      }
      var totalMail = 0;
      for (var m = 0; m < state.actors.length; m++) totalMail += state.actors[m].mail;
      if (totalMail > state.maxQueueSeen) state.maxQueueSeen = totalMail;
    }

    // 통계 DOM
    setText("stat-queue", state.mode === "game" ? state.queueCount : currentMail());
    setText("stat-done", state.done);
    setText("stat-cores", state.mode === "game" ? 1 : CORE_COUNT);
    var qEl = document.getElementById("stat-queue");
    if (qEl) {
      var qv = state.mode === "game" ? state.queueCount : currentMail();
      qEl.style.color = qv > 12 ? COL.queueHot : "";
    }
  }

  function currentMail() {
    var t = 0;
    for (var i = 0; i < state.actors.length; i++) t += state.actors[i].mail;
    return t;
  }

  // ---- 그리기 ----
  function drawBackdrop() {
    ctx.fillStyle = COL.bg;
    rr(0, 0, LW, LH, 14); ctx.fill();
  }

  function drawGame() {
    // 라벨
    ctx.fillStyle = COL.sub;
    ctx.font = "600 12px 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("IOCP 스레드 (네트워크 I/O 전담 · 우편배달부)", 30, 20);

    // IOCP 스레드
    for (var i = 0; i < IO.length; i++) {
      var b = IO[i];
      box(b.x, b.y, b.w, b.h, COL.io, "IOCP #" + (i + 1));
    }

    // 큐
    var hot = state.queueCount > 12;
    ctx.fillStyle = COL.sub;
    ctx.textAlign = "left";
    ctx.fillText("공유 큐 1개 (메일박스 1개)", 30, QUEUE.y - 12);
    rr(QUEUE.x, QUEUE.y, QUEUE.w, QUEUE.h, 8);
    ctx.fillStyle = COL.panel; ctx.fill();
    // 적체 셀
    var cellW = 26, maxCells = Math.floor((QUEUE.w - 16) / cellW);
    var shown = Math.min(state.queueCount, maxCells);
    for (var q = 0; q < shown; q++) {
      var cx = QUEUE.x + 8 + q * cellW;
      rr(cx, QUEUE.y + 8, cellW - 6, QUEUE.h - 16, 4);
      ctx.fillStyle = hot ? COL.queueHot : COL.queue;
      ctx.fill();
    }
    if (state.queueCount > maxCells) {
      ctx.fillStyle = COL.queueHot;
      ctx.font = "700 14px 'Segoe UI', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("+" + (state.queueCount - maxCells), QUEUE.x + QUEUE.w - 8, QUEUE.y + QUEUE.h / 2 + 5);
    }

    // 화살표 큐→로직
    ctx.strokeStyle = COL.line; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(LW / 2, QUEUE.y + QUEUE.h);
    ctx.lineTo(LW / 2, LOGIC.y);
    ctx.stroke();

    // 게임로직 스레드 1개
    var con = state.consumer;
    box(LOGIC.x, LOGIC.y, LOGIC.w, LOGIC.h,
        con.busy ? COL.logic : "#3a4a5a",
        "게임로직 스레드 ×1", con.busy ? "처리 중…" : "대기");
    // 처리 진행 바
    if (con.busy) {
      var pr = 1 - con.t / PROCESS_TIME;
      rr(LOGIC.x, LOGIC.y + LOGIC.h - 5, LOGIC.w * pr, 5, 2);
      ctx.fillStyle = "#1b5e20"; ctx.fill();
    }

    // 이동 패킷
    for (var f = 0; f < state.flying.length; f++) dot(state.flying[f].x, state.flying[f].y, 6, COL.packet);
  }

  function drawActor() {
    // 네트워크 입구
    box(NET.x, NET.y, NET.w, NET.h, COL.net, "네트워크 수신");

    // 액터들 + 메일박스
    for (var i = 0; i < state.actors.length; i++) {
      var a = state.actors[i];
      box(a.x, a.y, a.w, a.h, COL.actor, a.label, "메일박스");
      // 메일박스 점
      var shown = Math.min(a.mail, 6);
      for (var m = 0; m < shown; m++) {
        dot(a.x + 10 + m * 12, a.y - 14, 5, a.mail > 8 ? COL.queueHot : COL.packet);
      }
      if (a.mail > 6) {
        ctx.fillStyle = COL.sub; ctx.font = "700 11px 'Segoe UI', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("+" + (a.mail - 6), a.x + 10 + 6 * 12, a.y - 10);
      }
      // 처리중이면 코어로 선
      if (a.lockedBy >= 0 && state.cores[a.lockedBy]) {
        var core = state.cores[a.lockedBy];
        ctx.strokeStyle = "rgba(38,198,218,0.5)"; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a.x + a.w / 2, a.y + a.h);
        ctx.lineTo(core.x + core.w / 2, core.y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = COL.sub;
    ctx.font = "600 12px 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("스레드풀 — 코어 " + CORE_COUNT + "개가 서로 다른 액터를 동시에 처리", 30, 286);

    // 코어
    for (var c = 0; c < state.cores.length; c++) {
      var co = state.cores[c];
      box(co.x, co.y, co.w, co.h, co.busy ? COL.core : COL.coreIdle,
          "코어 " + (c + 1), co.busy ? "처리 중…" : "대기");
      if (co.busy) {
        var pr = 1 - co.t / PROCESS_TIME;
        rr(co.x, co.y + co.h - 5, co.w * pr, 5, 2);
        ctx.fillStyle = "#006064"; ctx.fill();
      }
    }

    // 이동 패킷
    for (var f = 0; f < state.flying.length; f++) dot(state.flying[f].x, state.flying[f].y, 6, COL.packet);
  }

  function draw() {
    ctx.save();
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    drawBackdrop();
    if (state.mode === "game") drawGame(); else drawActor();
    ctx.restore();
  }

  // ---- 루프 ----
  var last = 0;
  function frame(ts) {
    if (!last) last = ts;
    var dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;
    if (state.running && !reduceMotion) update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // ---- 화면 스케일 ----
  var scaleX = 1, scaleY = 1;
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || LW;
    var cssH = cssW * (LH / LW);
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scaleX = (cssW * dpr) / LW;
    scaleY = (cssH * dpr) / LH;
    if (reduceMotion) draw(); // 정지 프레임 갱신
  }

  // ---- DOM ----
  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v;
  }
  function setCaption() {
    var cap = document.getElementById("sim-caption");
    if (!cap) return;
    cap.textContent = state.mode === "game"
      ? "IOCP 스레드 여러 개가 패킷을 받아 큐 1개에 쌓아. 그런데 게임로직 스레드는 딱 1개 — 아무리 쌓여도 한 번에 하나씩만 꺼내 처리해. 이게 '액터 1마리'. 부하를 올리거나 공성전 버튼을 눌러봐. 큐가 빨갛게 쌓이지?"
      : "액터마다 자기 메일박스가 따로 있고, 코어 4개가 동시에 서로 다른 액터를 처리해. 같은 양이 들어와도 큐가 거의 안 쌓이지? 대신 두 액터가 상호작용하려면 반드시 메시지를 주고받아야 해.";
  }

  function selectMode(mode) {
    state.mode = mode;
    reset();
    var tabs = document.querySelectorAll(".sim-tab");
    for (var i = 0; i < tabs.length; i++)
      tabs[i].classList.toggle("active", tabs[i].getAttribute("data-mode") === mode);
    setCaption();
    if (reduceMotion) draw();
  }

  // 이벤트
  var tabs = document.querySelectorAll(".sim-tab");
  for (var i = 0; i < tabs.length; i++) {
    (function (t) {
      t.addEventListener("click", function () { selectMode(t.getAttribute("data-mode")); });
    })(tabs[i]);
  }
  var playBtn = document.getElementById("sim-play");
  if (playBtn) playBtn.addEventListener("click", function () {
    state.running = !state.running;
    playBtn.textContent = state.running ? "⏸ 일시정지" : "▶ 재생";
  });
  var loadEl = document.getElementById("sim-load");
  if (loadEl) loadEl.addEventListener("input", function () {
    state.load = parseInt(loadEl.value, 10) || 1;
    var lv = document.getElementById("sim-load-val");
    if (lv) lv.textContent = state.load;
  });
  var burstBtn = document.getElementById("sim-burst");
  if (burstBtn) burstBtn.addEventListener("click", function () { state.burst = 3.0; });

  // ---- 시작 ----
  initActors();
  setCaption();
  resize();
  window.addEventListener("resize", resize);
  if (reduceMotion) {
    // 모션 최소화: 대표 상태 한 프레임만
    state.queueCount = 18;
    for (var z = 0; z < state.actors.length; z++) state.actors[z].mail = 2;
    draw();
    var note = document.getElementById("sim-caption");
    if (note) note.textContent += "  (모션 줄이기 설정이 켜져 있어 정지 화면으로 표시 중)";
  } else {
    requestAnimationFrame(frame);
  }
})();
