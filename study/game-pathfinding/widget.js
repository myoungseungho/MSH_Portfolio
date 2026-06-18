// 길찾기 문서 — 격자 A* "로컬 윈도우" 부하 비교 위젯
// 포맷 ① 2D 다이어그램(Canvas2D + 클릭) — 같은 길찾기를 탐색범위만 다르게 돌려
// "탐색 칸 수"가 어떻게 폭발하고, 로컬 윈도우가 그걸 어떻게 쳐내는지 체감시킨다.
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };

    var GW = 51, GH = 29, CELL = 9;
    var MAXTRY = 1500;       // 데모는 폭발을 보여주려 상한을 키움 (서버 실제값은 800)
    var MOBS = 200;          // 부하 환산용 가정 몹 수 (구조를 보여주는 예시값)

    var start = { x: 4, y: 14 };
    var goal = { x: 46, y: 14 };
    var moveStart = false;
    var grid = makeGrid();

    function makeGrid() {
        var g = [];
        for (var y = 0; y < GH; y++) { g.push(new Array(GW).fill(0)); }
        // 우회 벽 — '제한 없음' A* 가 통로를 못 찾아 넓게 까보도록 유도
        // 벽 1: x=24 세로벽, 맨 아래(y=26,27,28)에만 통로
        for (var y2 = 0; y2 < GH; y2++) { g[y2][24] = 1; }
        g[26][24] = 0; g[27][24] = 0; g[28][24] = 0;
        // 벽 2: x=36 세로벽, 맨 위(y=0,1,2)에만 통로
        for (var y3 = 0; y3 < GH; y3++) { g[y3][36] = 1; }
        g[0][36] = 0; g[1][36] = 0; g[2][36] = 0;
        return g;
    }

    // ── A* (우리 서버와 동일한 규칙: 8방향, 직선10/대각14, H=맨해튼×10, 코너컷 방지) ──
    function astar(windowHalf) {
        var key = function (x, y) { return y * GW + x; };
        var h = function (x, y) { return (Math.abs(x - goal.x) + Math.abs(y - goal.y)) * 10; };
        var inWin = function (x, y) {
            if (windowHalf <= 0) return true;
            return Math.abs(x - start.x) <= windowHalf && Math.abs(y - start.y) <= windowHalf;
        };
        var gScore = {}, fScore = {}, parent = {}, closed = {}, inOpen = {};
        var open = [];
        var sk = key(start.x, start.y);
        gScore[sk] = 0; fScore[sk] = h(start.x, start.y);
        open.push({ x: start.x, y: start.y }); inOpen[sk] = 1;
        var best = { x: start.x, y: start.y }, bestH = h(start.x, start.y);
        var dirs = [[1, 0, 10], [-1, 0, 10], [0, 1, 10], [0, -1, 10],
                    [1, 1, 14], [1, -1, 14], [-1, 1, 14], [-1, -1, 14]];
        var tries = 0, reached = false, endNode = null;

        while (open.length && tries < MAXTRY) {
            var mi = 0;
            for (var i = 1; i < open.length; i++) {
                if (fScore[key(open[i].x, open[i].y)] < fScore[key(open[mi].x, open[mi].y)]) mi = i;
            }
            var cur = open.splice(mi, 1)[0];
            var ck = key(cur.x, cur.y);
            delete inOpen[ck]; closed[ck] = 1;
            var ch = h(cur.x, cur.y);
            if (ch < bestH) { bestH = ch; best = cur; }
            if (cur.x === goal.x && cur.y === goal.y) { reached = true; endNode = cur; break; }
            tries++;
            for (var d = 0; d < 8; d++) {
                var dx = dirs[d][0], dy = dirs[d][1], c = dirs[d][2];
                var nx = cur.x + dx, ny = cur.y + dy;
                if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
                if (grid[ny][nx] === 1) continue;
                if (!inWin(nx, ny)) continue;
                if (dx !== 0 && dy !== 0 && grid[cur.y][nx] === 1 && grid[ny][cur.x] === 1) continue; // 코너컷 방지
                var nk = key(nx, ny);
                if (closed[nk]) continue;
                var ng = gScore[ck] + c;
                if (!(nk in gScore) || ng < gScore[nk]) {
                    gScore[nk] = ng; fScore[nk] = ng + h(nx, ny); parent[nk] = ck;
                    if (!inOpen[nk]) { open.push({ x: nx, y: ny }); inOpen[nk] = 1; }
                }
            }
        }
        if (!endNode) endNode = best;
        // 경로 복원
        var path = [], k = key(endNode.x, endNode.y), guard = 0;
        while (k !== undefined && guard++ < 4000) {
            var px = k % GW, py = (k - px) / GW;
            path.push({ x: px, y: py });
            if (px === start.x && py === start.y) break;
            k = parent[k];
        }
        path.reverse();
        var n = 0; for (var kk in closed) n++;
        return { closed: closed, path: path, explored: n, reached: reached, windowHalf: windowHalf };
    }

    function draw(canvas, res) {
        var ctx = canvas.getContext('2d');
        var key = function (x, y) { return y * GW + x; };
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 윈도우 박스(점선)
        if (res.windowHalf > 0) {
            var x0 = (start.x - res.windowHalf) * CELL, y0 = (start.y - res.windowHalf) * CELL;
            var w = (res.windowHalf * 2 + 1) * CELL;
            ctx.fillStyle = 'rgba(255,213,79,0.06)';
            ctx.fillRect(x0, y0, w, w);
        }
        for (var y = 0; y < GH; y++) {
            for (var x = 0; x < GW; x++) {
                var px = x * CELL, py = y * CELL, k = key(x, y);
                if (grid[y][x] === 1) ctx.fillStyle = '#2a3650';
                else if (res.closed[k]) ctx.fillStyle = '#1e3a5f';
                else ctx.fillStyle = '#0e1426';
                ctx.fillRect(px, py, CELL - 1, CELL - 1);
            }
        }
        // 경로
        var dashed = !res.reached;
        ctx.fillStyle = dashed ? '#ffa726' : '#42a5f5';
        for (var p = 0; p < res.path.length; p++) {
            var pp = res.path[p];
            if ((pp.x === start.x && pp.y === start.y) || (pp.x === goal.x && pp.y === goal.y)) continue;
            ctx.globalAlpha = dashed ? 0.65 : 1;
            ctx.fillRect(pp.x * CELL + 2, pp.y * CELL + 2, CELL - 5, CELL - 5);
        }
        ctx.globalAlpha = 1;
        // 윈도우 박스 외곽선
        if (res.windowHalf > 0) {
            var bx = (start.x - res.windowHalf) * CELL, by = (start.y - res.windowHalf) * CELL;
            var bw = (res.windowHalf * 2 + 1) * CELL;
            ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
            ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bw - 1); ctx.setLineDash([]);
        }
        // 시작/목표
        ctx.fillStyle = '#66bb6a'; ctx.fillRect(start.x * CELL, start.y * CELL, CELL - 1, CELL - 1);
        ctx.fillStyle = '#ef5350'; ctx.fillRect(goal.x * CELL, goal.y * CELL, CELL - 1, CELL - 1);
    }

    function render() {
        var wh = parseInt($('pf-w').value, 10);
        $('pf-wlabel').textContent = wh;
        var a = astar(0);     // 제한 없음
        var b = astar(wh);    // 로컬 윈도우
        draw($('pf-a'), a);
        draw($('pf-b'), b);
        $('pf-as').innerHTML = '탐색한 칸: <b style="color:#ff8a80">' + a.explored + '칸</b> · ' +
            (a.reached ? '<span style="color:#9ccc65">목표 도달 ✓</span>' : '<span style="color:#ffa726">실패</span>');
        $('pf-bs').innerHTML = '탐색한 칸: <b style="color:#9ccc65">' + b.explored + '칸</b> · ' +
            (b.reached ? '<span style="color:#9ccc65">목표 도달 ✓</span>'
                       : '<span style="color:#ffa726">윈도우 밖 → 최근접까지만 (점선)</span>');
        var ratio = b.explored > 0 ? (a.explored / b.explored) : 1;
        var verb = ratio >= 1 ? ('약 <b>' + ratio.toFixed(1) + '배</b> 적게 까봄')
                              : ('이 경우엔 윈도우가 <b>' + (1 / ratio).toFixed(1) + '배</b> 더 까봄 — 목표를 못 찾아 박스를 다 뒤진 것');
        $('pf-load').innerHTML = '몹 ' + MOBS + '마리가 동시에 길찾기 →  ' +
            '제한 없음 <b style="color:#ff8a80">' + (a.explored * MOBS).toLocaleString() + '칸</b> vs ' +
            '윈도우 <b style="color:#9ccc65">' + (b.explored * MOBS).toLocaleString() + '칸</b>  (윈도우가 ' + verb + ')';
    }

    function pickCell(canvas, ev) {
        var r = canvas.getBoundingClientRect();
        var sx = canvas.width / r.width, sy = canvas.height / r.height;
        var x = Math.floor((ev.clientX - r.left) * sx / CELL);
        var y = Math.floor((ev.clientY - r.top) * sy / CELL);
        if (x < 0 || y < 0 || x >= GW || y >= GH) return null;
        if (grid[y][x] === 1) return null;
        return { x: x, y: y };
    }

    function onClick(canvas) {
        return function (ev) {
            var c = pickCell(canvas, ev);
            if (!c) return;
            if (moveStart) start = c; else goal = c;
            render();
        };
    }

    function init() {
        if (!$('pf-a')) return;
        ['pf-a', 'pf-b'].forEach(function (id) {
            var cv = $(id); cv.width = GW * CELL; cv.height = GH * CELL;
            cv.addEventListener('click', onClick(cv));
        });
        $('pf-w').addEventListener('input', render);
        $('pf-mode').addEventListener('click', function () {
            moveStart = !moveStart;
            this.textContent = moveStart ? '시작점 이동 (클릭)' : '목표점 이동 (클릭)';
            this.classList.toggle('active', moveStart);
        });
        $('pf-reset').addEventListener('click', function () {
            start = { x: 4, y: 14 }; goal = { x: 46, y: 14 }; grid = makeGrid();
            $('pf-w').value = 8; render();
        });
        render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
