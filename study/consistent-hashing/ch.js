/* consistent-hashing — 해시 링: 노드 추가/제거 시 일부 키만 재배치 vs modulo는 거의 전부 */
(function () {
  "use strict";
  var canvas = document.getElementById("ch-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var LW = 720, LH = 340;
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var COLORS = ["#42a5f5", "#66bb6a", "#ab47bc", "#ffa726", "#26c6da", "#ef5350", "#8d6e63"];
  var CX = 230, CY = 165, RAD = 120;
  var st = { mode: "ring", nodes: [], keys: [], lastRemap: 0, nextNodeId: 0 };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function pos(a, r) { var t = a * Math.PI * 2 - Math.PI / 2; return { x: CX + Math.cos(t) * r, y: CY + Math.sin(t) * r }; }
  function assign(keyAngle, nodes, mode, keyIdx) {
    if (nodes.length === 0) return -1;
    if (mode === "modulo") return nodes[keyIdx % nodes.length].id;
    // ring: 시계방향 다음 노드
    var best = null, bestD = 2;
    for (var i = 0; i < nodes.length; i++) { var d = (nodes[i].a - keyAngle + 1) % 1; if (d < bestD) { bestD = d; best = nodes[i]; } }
    return best ? best.id : -1;
  }
  function recompute() { for (var i = 0; i < st.keys.length; i++) st.keys[i].node = assign(st.keys[i].a, st.nodes, st.mode, i); }
  function snapshot() { return st.keys.map(function (k) { return k.node; }); }
  function countRemap(before) { var c = 0; for (var i = 0; i < st.keys.length; i++) if (st.keys[i].node !== before[i]) c++; return c; }

  function addNode() { var before = snapshot(); st.nodes.push({ id: st.nextNodeId, a: Math.random(), c: COLORS[st.nextNodeId % COLORS.length] }); st.nextNodeId++; recompute(); st.lastRemap = countRemap(before); update0(); }
  function removeNode() { if (st.nodes.length <= 1) return; var before = snapshot(); st.nodes.splice((Math.random() * st.nodes.length) | 0, 1); recompute(); st.lastRemap = countRemap(before); update0(); }
  function colorOf(id) { var n = st.nodes.filter(function (x) { return x.id === id; })[0]; return n ? n.c : "#37474f"; }

  function update0() { setText("ch-nodes", st.nodes.length); setText("ch-remap", st.lastRemap + " / " + st.keys.length); }

  var sx = 1, sy = 1;
  function draw() {
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.fillStyle = "#0e1426"; rr(0, 0, LW, LH, 14); ctx.fill();
    // 링
    ctx.beginPath(); ctx.arc(CX, CY, RAD, 0, 6.2832); ctx.strokeStyle = "#2a3650"; ctx.lineWidth = 2; ctx.stroke();
    // 키
    for (var i = 0; i < st.keys.length; i++) { var p = pos(st.keys[i].a, RAD); ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 6.2832); ctx.fillStyle = colorOf(st.keys[i].node); ctx.fill(); }
    // 노드
    for (var i = 0; i < st.nodes.length; i++) { var n = st.nodes[i], p = pos(n.a, RAD); ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 6.2832); ctx.fillStyle = n.c; ctx.fill(); ctx.strokeStyle = "#0c1220"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#0c1220"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 10px 'Segoe UI',sans-serif"; ctx.fillText("N" + (n.id + 1), p.x, p.y + 1); ctx.textBaseline = "alphabetic"; }
    // 범례
    ctx.fillStyle = "#90a4c4"; ctx.textAlign = "left"; ctx.font = "600 12px 'Segoe UI',sans-serif";
    ctx.fillText(st.mode === "ring" ? "해시 링: 키는 시계방향 다음 노드에 배정" : "단순 modulo: 키 i → 노드[i % N]", 400, 60);
    ctx.fillText("큰 점 = 노드(서버)", 400, 90); ctx.fillText("작은 점 = 키(데이터)", 400, 110);
    ctx.fillStyle = st.lastRemap > st.keys.length * 0.5 ? "#ef5350" : "#66bb6a"; ctx.font = "700 13px 'Segoe UI',sans-serif";
    ctx.fillText("마지막 변경 시 재배치: " + st.lastRemap + "개", 400, 150);
    ctx.fillStyle = "#90a4c4"; ctx.font = "600 11px 'Segoe UI',sans-serif";
    ctx.fillText("노드 추가/제거를 눌러", 400, 178); ctx.fillText("재배치 수를 비교해봐", 400, 196);
    ctx.restore();
  }

  function frame() { draw(); requestAnimationFrame(frame); }
  function resize() { var dpr = devicePixelRatio || 1; var w = canvas.clientWidth || LW; var h = w * (LH / LW); canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sx = w * dpr / LW; sy = h * dpr / LH; draw(); }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function setCap() {
    var c = document.getElementById("ch-caption"); if (!c) return;
    c.textContent = st.mode === "ring"
      ? "일관성 해싱: 노드와 키를 같은 원(해시 링)에 올리고, 키는 '시계방향 다음 노드'가 맡아. 노드를 추가/제거하면 그 근처 키만 옮겨가고 나머지는 그대로 — 재배치가 최소야. 캐시·샤딩에서 서버를 늘려도 대부분의 데이터가 안 움직이지."
      : "단순 modulo(노드[i % N]): 노드 수 N이 바뀌면 거의 모든 키의 나눗셈 나머지가 달라져 — 대부분 재배치돼. 캐시면 전체가 한꺼번에 미스 나서 DB가 폭격당해(thundering herd). 그래서 이 방식은 규모 변화에 취약해.";
  }
  function sel(m) { st.mode = m; st.lastRemap = 0; recompute(); var t = document.querySelectorAll(".chtab"); for (var i = 0; i < t.length; i++) t[i].classList.toggle("active", t[i].getAttribute("data-m") === m); setCap(); update0(); }
  var tabs = document.querySelectorAll(".chtab");
  for (var i = 0; i < tabs.length; i++) (function (t) { t.addEventListener("click", function () { sel(t.getAttribute("data-m")); }); })(tabs[i]);
  var add = document.getElementById("ch-add"); if (add) add.addEventListener("click", addNode);
  var rem = document.getElementById("ch-rem"); if (rem) rem.addEventListener("click", removeNode);

  // 초기화
  for (var i = 0; i < 4; i++) st.nodes.push({ id: st.nextNodeId++, a: i / 4 + 0.05, c: COLORS[i] });
  for (var i = 0; i < 40; i++) st.keys.push({ a: Math.random(), node: -1 });
  recompute(); setCap(); update0(); resize(); addEventListener("resize", resize);
  if (!reduce) requestAnimationFrame(frame); else draw();
})();
