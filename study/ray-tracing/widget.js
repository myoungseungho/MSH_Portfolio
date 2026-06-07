// 레이트레이싱 문서 — 5가지 인터랙티브 포맷 통합 위젯
// ① 2D 레이 다이어그램  ② Before/After 슬라이더  ③ WebGL2 패스트레이서
// ④ 단계 빌드업 토글    ⑤ 픽셀 돋보기
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };

    /* ============================================================
     * 공유 WebGL2 패스트레이서 (포맷 ②③④⑤의 엔진)
     * ============================================================ */
    var W = 320, H = 240;

    var VS = '#version 300 es\n' +
        'void main(){ vec2 p=vec2((gl_VertexID<<1&2),(gl_VertexID&2));' +
        'gl_Position=vec4(p*2.0-1.0,0.0,1.0); }';

    var TRACE_FS = [
        '#version 300 es',
        'precision highp float; precision highp int;',
        'uniform sampler2D uPrev;',
        'uniform int uFrame; uniform int uMode; uniform int uBounces;',
        'uniform float uLightSize; uniform int uAccumulate; uniform vec2 uRes;',
        'out vec4 o;',
        'uint hashu(uint x){ x^=x>>16u; x*=0x7feb352du; x^=x>>15u; x*=0x846ca68bu; x^=x>>16u; return x; }',
        'float rnd(inout uint s){ s=hashu(s); return float(s)/4294967295.0; }',
        'const int M_DIFF=0; const int M_MIRROR=1; const int M_LIGHT=2;',
        'struct Hit { float t; vec3 n; vec3 alb; int mat; };',
        'const vec3 LPOS = vec3(0.0, 3.99, -2.2);',
        'const vec3 LEMIT = vec3(13.0, 12.0, 10.0);',
        'void hitPlane(vec3 ro, vec3 rd, vec3 p0, vec3 n, vec3 alb, int mat, inout Hit h){',
        '    float d = dot(rd, n); if (abs(d) < 1e-6) return;',
        '    float t = dot(p0 - ro, n) / d;',
        '    if (t > 1e-3 && t < h.t){ vec3 p = ro + rd*t;',
        '        if (abs(p.x) > 3.001 || p.y < -0.001 || p.y > 4.001 || p.z > 3.6 || p.z < -4.501) return;',
        '        h.t = t; h.n = d < 0.0 ? n : -n; h.alb = alb; h.mat = mat; } }',
        'void hitSphere(vec3 ro, vec3 rd, vec3 c, float r, vec3 alb, int mat, inout Hit h){',
        '    vec3 oc = ro - c; float b = dot(oc, rd); float cc = dot(oc, oc) - r*r;',
        '    float disc = b*b - cc; if (disc < 0.0) return;',
        '    float t = -b - sqrt(disc); if (t < 1e-3) t = -b + sqrt(disc);',
        '    if (t > 1e-3 && t < h.t){ h.t = t; vec3 p = ro + rd*t;',
        '        h.n = normalize(p - c); h.alb = alb; h.mat = mat; } }',
        'Hit intersect(vec3 ro, vec3 rd, float ls){',
        '    Hit h; h.t = 1e9; h.mat = M_DIFF; h.n = vec3(0,1,0); h.alb = vec3(0);',
        '    hitPlane(ro, rd, vec3(0,0,0),  vec3(0,1,0),  vec3(0.75), M_DIFF, h);',
        '    hitPlane(ro, rd, vec3(0,4,0),  vec3(0,-1,0), vec3(0.75), M_DIFF, h);',
        '    hitPlane(ro, rd, vec3(0,0,-4.5), vec3(0,0,1), vec3(0.75), M_DIFF, h);',
        '    hitPlane(ro, rd, vec3(-3,0,0), vec3(1,0,0),  vec3(0.80,0.15,0.15), M_DIFF, h);',
        '    hitPlane(ro, rd, vec3(3,0,0),  vec3(-1,0,0), vec3(0.15,0.65,0.20), M_DIFF, h);',
        '    hitSphere(ro, rd, vec3(-1.15,1.0,-2.6), 1.0, vec3(0.95), M_MIRROR, h);',
        '    hitSphere(ro, rd, vec3(1.35,0.8,-1.7), 0.8, vec3(0.85), M_DIFF, h);',
        '    if (h.mat == M_DIFF && h.t < 1e8){ vec3 p = ro + rd*h.t;',
        '        if (abs(p.y - 4.0) < 0.005 && abs(p.x - LPOS.x) < ls && abs(p.z - LPOS.z) < ls*0.75) h.mat = M_LIGHT; }',
        '    if (h.t < 1e8){ vec3 p = ro + rd*h.t;',
        '        if (abs(p.y) < 0.005){ float ch = mod(floor(p.x*1.25) + floor(p.z*1.25), 2.0);',
        '            h.alb = ch < 1.0 ? vec3(0.78) : vec3(0.45); } }',
        '    return h; }',
        'bool shadowed(vec3 p, vec3 target){ vec3 d = target - p; float dist = length(d); d /= dist;',
        '    Hit h = intersect(p + d*1e-3, d, 0.0); return h.t < dist - 2e-2; }',
        'vec3 cosineDir(vec3 n, inout uint seed){',
        '    float r1 = rnd(seed)*6.2831853; float r2 = rnd(seed); float sr2 = sqrt(r2);',
        '    vec3 u = normalize(abs(n.x) > 0.5 ? cross(n, vec3(0,1,0)) : cross(n, vec3(1,0,0)));',
        '    vec3 v = cross(n, u);',
        '    return normalize(u*cos(r1)*sr2 + v*sin(r1)*sr2 + n*sqrt(1.0-r2)); }',
        'vec3 directShade(Hit h, vec3 p){',
        '    vec3 ld = normalize(LPOS - p); float ndl = max(dot(h.n, ld), 0.0); float amb = 0.13;',
        '    if (h.mat == M_LIGHT) return vec3(1.0);',
        '    float vis = 1.0;',
        '    if (uMode >= 2 && ndl > 0.0) vis = shadowed(p + h.n*1e-3, LPOS - vec3(0.0,0.02,0.0)) ? 0.0 : 1.0;',
        '    float dist = length(LPOS - p); float att = 9.0 / (dist*dist);',
        '    return h.alb * (amb + ndl * vis * att); }',
        'void main(){',
        '    uint seed = uint(gl_FragCoord.x) + uint(gl_FragCoord.y)*2048u + uint(uFrame)*7919u*2048u;',
        '    vec2 jitter = (uMode == 4) ? vec2(rnd(seed), rnd(seed)) - 0.5 : vec2(0.0);',
        '    vec2 uv = (gl_FragCoord.xy + jitter) / uRes * 2.0 - 1.0; uv.x *= uRes.x / uRes.y;',
        '    vec3 ro = vec3(0.0, 2.0, 3.4);',
        '    vec3 fwd = normalize(vec3(0.0, 1.6, -2.4) - ro);',
        '    vec3 rgt = normalize(cross(fwd, vec3(0,1,0))); vec3 up = cross(rgt, fwd);',
        '    vec3 rd = normalize(fwd*1.45 + rgt*uv.x + up*uv.y);',
        '    vec3 col = vec3(0.0);',
        '    if (uMode == 0){ Hit h = intersect(ro, rd, uLightSize);',
        '        col = (h.mat == M_LIGHT) ? vec3(1.0) : h.alb; }',
        '    else if (uMode <= 2){ Hit h = intersect(ro, rd, uLightSize);',
        '        col = (h.t < 1e8) ? directShade(h, ro + rd*h.t) : vec3(0.0); }',
        '    else if (uMode == 3){ Hit h = intersect(ro, rd, uLightSize);',
        '        if (h.t < 1e8){ vec3 p = ro + rd*h.t;',
        '            if (h.mat == M_MIRROR){ vec3 rd2 = reflect(rd, h.n);',
        '                Hit h2 = intersect(p + h.n*1e-3, rd2, uLightSize);',
        '                col = (h2.t < 1e8) ? directShade(h2, p + rd2*h2.t) * 0.95 : vec3(0.0); }',
        '            else col = directShade(h, p); } }',
        '    else {',
        '        vec3 thr = vec3(1.0); vec3 cro = ro, crd = rd;',
        '        for (int b = 0; b <= 8; b++){',
        '            if (b > uBounces) break;',
        '            Hit h = intersect(cro, crd, uLightSize);',
        '            if (h.t > 1e8) break;',
        '            vec3 p = cro + crd*h.t;',
        '            if (h.mat == M_LIGHT){ col += thr * LEMIT; break; }',
        '            if (h.mat == M_MIRROR){ thr *= 0.95; cro = p + h.n*1e-3; crd = reflect(crd, h.n); continue; }',
        '            thr *= h.alb; cro = p + h.n*1e-3; crd = cosineDir(h.n, seed); } }',
        '    vec4 prev = (uAccumulate == 1) ? texelFetch(uPrev, ivec2(gl_FragCoord.xy), 0) : vec4(0.0);',
        '    o = prev + vec4(col, 1.0);',
        '}'].join('\n');

    var DISPLAY_FS = '#version 300 es\nprecision highp float;\nuniform sampler2D uAccum;\nout vec4 o;\n' +
        'void main(){ vec4 a = texelFetch(uAccum, ivec2(gl_FragCoord.xy), 0);' +
        'vec3 c = a.rgb / max(a.a, 1.0); c = c / (1.0 + c); c = pow(c, vec3(1.0/2.2)); o = vec4(c, 1.0); }';

    var tracer = null; // {gl, step(), state...}

    function initTracer(canvas) {
        var gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
        if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
        function compile(type, src) {
            var s = gl.createShader(type);
            gl.shaderSource(s, src); gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
            return s;
        }
        function program(fs) {
            var p = gl.createProgram();
            gl.attachShader(p, compile(gl.VERTEX_SHADER, VS));
            gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
            gl.linkProgram(p);
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
            return p;
        }
        var traceP, dispP;
        try { traceP = program(TRACE_FS); dispP = program(DISPLAY_FS); }
        catch (e) { return null; }
        var texs = [0, 1].map(function () {
            var t = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, H, 0, gl.RGBA, gl.FLOAT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            return t;
        });
        var fbo = gl.createFramebuffer();
        var T = { gl: gl, canvas: canvas, frame: 0, ping: 0, mode: 4, bounces: 3, lightSize: 0.9 };
        T.reset = function () { T.frame = 0; };
        T.step = function () {
            T.frame++;
            gl.viewport(0, 0, W, H);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texs[1 - T.ping], 0);
            gl.useProgram(traceP);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texs[T.ping]);
            gl.uniform1i(gl.getUniformLocation(traceP, 'uPrev'), 0);
            gl.uniform1i(gl.getUniformLocation(traceP, 'uFrame'), T.frame);
            gl.uniform1i(gl.getUniformLocation(traceP, 'uMode'), T.mode);
            gl.uniform1i(gl.getUniformLocation(traceP, 'uBounces'), T.bounces);
            gl.uniform1f(gl.getUniformLocation(traceP, 'uLightSize'), T.lightSize);
            gl.uniform1i(gl.getUniformLocation(traceP, 'uAccumulate'), (T.mode === 4 && T.frame > 1) ? 1 : 0);
            gl.uniform2f(gl.getUniformLocation(traceP, 'uRes'), W, H);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            T.ping = 1 - T.ping;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.useProgram(dispP);
            gl.bindTexture(gl.TEXTURE_2D, texs[T.ping]);
            gl.uniform1i(gl.getUniformLocation(dispP, 'uAccum'), 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };
        return T;
    }

    function snapshotDataURL() {
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        c.getContext('2d').drawImage(tracer.canvas, 0, 0);
        return c.toDataURL();
    }

    /* ============================================================
     * 포맷 ① 2D 레이 다이어그램
     * ============================================================ */
    function initDiagram() {
        var cv = $('rd-canvas');
        if (!cv) return;
        var ctx = cv.getContext('2d');
        var CW = cv.width, CH = cv.height;
        var cam = { x: 55, y: CH / 2 };
        var planeX = 130;
        var mirror = { x: 430, y: 115, r: 56, kind: 'mirror' };
        var matte = { x: 565, y: 235, r: 48, kind: 'matte' };
        var light = { x: 690, y: 52, r: 15, kind: 'light' };
        var wallX = CW - 18;
        var bounces = 1;
        var drag = null;

        function intersectCircle(o, d, c) {
            var ox = o.x - c.x, oy = o.y - c.y;
            var b = ox * d.x + oy * d.y;
            var cc = ox * ox + oy * oy - c.r * c.r;
            var disc = b * b - cc;
            if (disc < 0) return Infinity;
            var t = -b - Math.sqrt(disc);
            return t > 1e-4 ? t : Infinity;
        }
        function trace(o, d) {
            var best = { t: Infinity, obj: null };
            [mirror, matte].forEach(function (s) {
                var t = intersectCircle(o, d, s);
                if (t < best.t) best = { t: t, obj: s };
            });
            if (d.x > 1e-6) {
                var tw = (wallX - o.x) / d.x;
                var y = o.y + d.y * tw;
                if (tw > 1e-4 && tw < best.t && y > 0 && y < CH) best = { t: tw, obj: { kind: 'wall' } };
            }
            return best;
        }
        function segBlocked(a, b) {
            var dx = b.x - a.x, dy = b.y - a.y;
            var len = Math.hypot(dx, dy);
            var d = { x: dx / len, y: dy / len };
            var blocked = false;
            [mirror, matte].forEach(function (s) {
                var t = intersectCircle({ x: a.x, y: a.y }, d, s);
                if (t < len - 1) blocked = true;
            });
            return blocked;
        }
        function line(a, b, color, width, dash) {
            ctx.strokeStyle = color; ctx.lineWidth = width;
            ctx.setLineDash(dash || []);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            ctx.setLineDash([]);
        }
        function render() {
            ctx.fillStyle = '#0e1426';
            ctx.fillRect(0, 0, CW, CH);
            // 벽
            ctx.fillStyle = '#2a3650'; ctx.fillRect(wallX, 0, 6, CH);
            // 이미지 평면(픽셀)
            ctx.strokeStyle = '#3d4f78'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(planeX, 30); ctx.lineTo(planeX, CH - 30); ctx.stroke();
            var hits = 0, shadows = 0, blocked = 0;
            for (var i = 0; i < 7; i++) {
                var py = 45 + i * (CH - 90) / 6;
                ctx.fillStyle = '#3d4f78';
                ctx.fillRect(planeX - 4, py - 4, 8, 8);
                // 1차 광선
                var o = { x: cam.x, y: cam.y };
                var d = { x: planeX - cam.x, y: py - cam.y };
                var L = Math.hypot(d.x, d.y); d.x /= L; d.y /= L;
                for (var b = 0; b <= bounces; b++) {
                    var hit = trace(o, d);
                    if (hit.t === Infinity) { line(o, { x: o.x + d.x * 2000, y: o.y + d.y * 2000 }, b ? '#ab47bc' : '#42a5f5', 1.4); break; }
                    var p = { x: o.x + d.x * hit.t, y: o.y + d.y * hit.t };
                    line(o, p, b ? '#ab47bc' : '#42a5f5', b ? 1.6 : 1.4);
                    if (hit.obj.kind === 'light') break;
                    hits++;
                    // 그림자 광선
                    if (segBlocked(p, light)) { line(p, light, '#ef5350', 1, [4, 4]); blocked++; }
                    else { line(p, light, '#66bb6a', 1, [4, 4]); shadows++; }
                    if (hit.obj.kind === 'mirror' && b < bounces) {
                        // 법선 기준 반사
                        var nx = (p.x - hit.obj.x) / hit.obj.r, ny = (p.y - hit.obj.y) / hit.obj.r;
                        var dot = d.x * nx + d.y * ny;
                        d = { x: d.x - 2 * dot * nx, y: d.y - 2 * dot * ny };
                        o = { x: p.x + d.x * 0.5, y: p.y + d.y * 0.5 };
                        continue;
                    }
                    break;
                }
            }
            // 물체
            ctx.fillStyle = '#9fb6dd';
            ctx.beginPath(); ctx.arc(mirror.x, mirror.y, mirror.r, 0, 7); ctx.fill();
            ctx.fillStyle = '#121a30';
            ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('거울', mirror.x, mirror.y + 4);
            ctx.fillStyle = '#8d7a5e';
            ctx.beginPath(); ctx.arc(matte.x, matte.y, matte.r, 0, 7); ctx.fill();
            ctx.fillStyle = '#121a30';
            ctx.fillText('무광', matte.x, matte.y + 4);
            ctx.fillStyle = '#ffd54f';
            ctx.beginPath(); ctx.arc(light.x, light.y, light.r, 0, 7); ctx.fill();
            ctx.fillStyle = '#5a4a00';
            ctx.fillText('☀', light.x, light.y + 4);
            // 카메라
            ctx.fillStyle = '#e3eaf5';
            ctx.font = '20px sans-serif';
            ctx.fillText('👁', cam.x, cam.y + 7);
            ctx.font = '11px sans-serif';
            ctx.fillStyle = '#90a4c4';
            ctx.fillText('카메라', cam.x, cam.y + 26);
            ctx.fillText('화면(픽셀 7개)', planeX, 20);
            $('rd-stat').textContent = '그림자 광선: 도달 ' + shadows + ' / 차단 ' + blocked + ' — ☀·구를 드래그해봐';
        }
        function pick(x, y) {
            var objs = [light, mirror, matte];
            for (var i = 0; i < objs.length; i++) {
                if (Math.hypot(x - objs[i].x, y - objs[i].y) < objs[i].r + 12) return objs[i];
            }
            return null;
        }
        function evPos(e) {
            var r = cv.getBoundingClientRect();
            var t = e.touches ? e.touches[0] : e;
            return { x: (t.clientX - r.left) * CW / r.width, y: (t.clientY - r.top) * CH / r.height };
        }
        function down(e) { var p = evPos(e); drag = pick(p.x, p.y); if (drag) e.preventDefault(); }
        function move(e) {
            if (!drag) return;
            var p = evPos(e);
            drag.x = Math.max(planeX + drag.r + 10, Math.min(wallX - drag.r - 6, p.x));
            drag.y = Math.max(drag.r + 4, Math.min(CH - drag.r - 4, p.y));
            render(); e.preventDefault();
        }
        function up() { drag = null; }
        cv.addEventListener('mousedown', down); cv.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        cv.addEventListener('touchstart', down, { passive: false });
        cv.addEventListener('touchmove', move, { passive: false });
        cv.addEventListener('touchend', up);
        $('rd-bounce').addEventListener('input', function (e) {
            bounces = parseInt(e.target.value, 10);
            $('rd-bounce-v').textContent = bounces;
            render();
        });
        render();
        window.__rdRendered = true; // 테스트 훅
    }

    /* ============================================================
     * 포맷 ③ 라이브 패스트레이서 + ⑤ 돋보기
     * ============================================================ */
    var live = { running: true, visible: true, denoise: false };

    function initLiveControls() {
        $('pt-bounce').addEventListener('input', function (e) {
            tracer.bounces = parseInt(e.target.value, 10);
            $('pt-bounce-v').textContent = tracer.bounces;
            tracer.reset();
        });
        $('pt-light').addEventListener('input', function (e) {
            tracer.lightSize = parseFloat(e.target.value);
            $('pt-light-v').textContent = tracer.lightSize.toFixed(1);
            tracer.reset();
        });
        $('pt-pause').addEventListener('click', function () {
            live.running = !live.running;
            $('pt-pause').textContent = live.running ? '⏸ 일시정지' : '▶ 재개';
        });
        $('pt-reset').addEventListener('click', function () { tracer.reset(); });
        $('pt-denoise').addEventListener('change', function (e) {
            live.denoise = e.target.checked;
            tracer.canvas.style.filter = live.denoise ? 'blur(1.6px)' : '';
        });
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (es) {
                live.visible = es[0].isIntersecting;
            }).observe(tracer.canvas);
        }
    }

    function initMagnifier() {
        var src = tracer.canvas;
        var lens = $('mag-canvas');
        var mctx = lens.getContext('2d');
        var N = 13, SZ = lens.width;
        mctx.imageSmoothingEnabled = false;
        function draw(e) {
            var r = src.getBoundingClientRect();
            var x = Math.round((e.clientX - r.left) * W / r.width);
            var y = Math.round((e.clientY - r.top) * H / r.height);
            x = Math.max(N >> 1, Math.min(W - (N >> 1) - 1, x));
            y = Math.max(N >> 1, Math.min(H - (N >> 1) - 1, y));
            mctx.imageSmoothingEnabled = false;
            mctx.drawImage(src, x - (N >> 1), y - (N >> 1), N, N, 0, 0, SZ, SZ);
            mctx.strokeStyle = 'rgba(255,255,255,0.18)';
            mctx.lineWidth = 1;
            var cell = SZ / N;
            for (var i = 1; i < N; i++) {
                mctx.beginPath(); mctx.moveTo(i * cell, 0); mctx.lineTo(i * cell, SZ); mctx.stroke();
                mctx.beginPath(); mctx.moveTo(0, i * cell); mctx.lineTo(SZ, i * cell); mctx.stroke();
            }
            mctx.strokeStyle = '#ffd54f';
            mctx.strokeRect((N >> 1) * cell, (N >> 1) * cell, cell, cell);
            $('mag-pos').textContent = '(' + x + ', ' + y + ') 픽셀 13×13';
        }
        src.addEventListener('mousemove', draw);
    }

    /* ============================================================
     * 포맷 ④ 단계 빌드업 + ② Before/After
     * ============================================================ */
    var STAGE_CAP = [
        '<b>0단계 — 물체 고유색(albedo)만.</b> 조명이 없으니 입체감도 없다. 모든 렌더링의 출발점.',
        '<b>1단계 — 직접광.</b> 면이 광원을 향한 정도(N·L)만큼 밝게. 그런데 잘 봐 — 그림자가 없다. 빛이 구를 "통과"해서 바닥까지 닿는 중.',
        '<b>2단계 — 그림자 광선.</b> 히트 지점에서 광원으로 광선 1개를 더 쏴서 막히면 어둡게. 여기까지가 사실상 래스터라이저(섀도맵)가 흉내 내는 수준.',
        '<b>3단계 — 거울 반사.</b> 왼쪽 구에 방 전체가 비치기 시작. 래스터의 화면공간(SSR) 반사는 "화면에 보이는 것"만 비추지만, 레이트레이싱은 장면 전체를 비춘다.',
        '<b>4단계 — 전역 조명(GI).</b> 벽의 빨강·초록이 바닥과 구에 스며들고(색 번짐), 그림자 가장자리가 부드러워진다. 빛의 간접 반사까지 전부 추적한 결과 — 이게 패스 트레이싱.'
    ];

    function initStages(snaps) {
        var img = $('st-img');
        var cap = $('st-cap');
        var btns = document.querySelectorAll('.rt-stage-btn');
        function show(i) {
            img.src = snaps[i];
            cap.innerHTML = STAGE_CAP[i];
            btns.forEach(function (b, j) { b.classList.toggle('active', j === i); });
        }
        btns.forEach(function (b, i) {
            b.addEventListener('click', function () { show(i); });
        });
        show(4);
    }

    function initCompare(beforeURL, afterURL) {
        var wrap = $('cmp-wrap');
        $('cmp-after').style.backgroundImage = 'url(' + afterURL + ')';
        $('cmp-before').style.backgroundImage = 'url(' + beforeURL + ')';  // full-size, clip-path 로 가림
        var before = $('cmp-before');
        var handle = $('cmp-handle');
        function setPos(frac) {
            frac = Math.max(0.02, Math.min(0.98, frac));
            // clip-path 는 레이아웃에 영향이 없어 배경 스케일이 유지된다
            before.style.clipPath = 'inset(0 ' + ((1 - frac) * 100) + '% 0 0)';
            handle.style.left = (frac * 100) + '%';
        }
        function onMove(e) {
            var r = wrap.getBoundingClientRect();
            var t = e.touches ? e.touches[0] : e;
            setPos((t.clientX - r.left) / r.width);
        }
        var dragging = false;
        wrap.addEventListener('mousedown', function (e) { dragging = true; onMove(e); e.preventDefault(); });
        wrap.addEventListener('mousemove', function (e) { if (e.buttons === 1) onMove(e); });
        window.addEventListener('mousemove', function (e) { if (dragging) onMove(e); });
        window.addEventListener('mouseup', function () { dragging = false; });
        wrap.addEventListener('touchstart', function (e) { dragging = true; onMove(e); }, { passive: true });
        wrap.addEventListener('touchmove', function (e) { if (dragging) onMove(e); }, { passive: true });
        wrap.addEventListener('touchend', function () { dragging = false; });
        setPos(0.5);
    }

    /* ============================================================
     * 부트스트랩: 스냅샷 → 위젯 연결 → 라이브 루프
     * ============================================================ */
    function boot() {
        initDiagram(); // ①은 독립

        var cv = $('pt-canvas');
        if (!cv) return;
        tracer = initTracer(cv);
        if (!tracer) {
            $('pt-fallback').style.display = 'block';
            $('pt-controls').style.display = 'none';
            return;
        }
        window.__rt = tracer; // 테스트 훅

        // 1) 단계 스냅샷 (모드 0~3은 결정론 1프레임)
        var snaps = [];
        for (var m = 0; m <= 3; m++) {
            tracer.mode = m; tracer.reset(); tracer.step();
            snaps.push(snapshotDataURL());
        }
        // 2) 모드4를 burst 누적 → 수렴 스냅샷 → 위젯 연결 → 라이브 시작
        tracer.mode = 4; tracer.reset();
        var burst = 0;
        function burstStep() {
            for (var i = 0; i < 20; i++) { tracer.step(); burst++; }
            $('pt-spp').textContent = '사전 렌더링 중... ' + burst + ' SPP';
            if (burst < 220) { requestAnimationFrame(burstStep); return; }
            snaps.push(snapshotDataURL());
            initStages(snaps);
            initCompare(snaps[2], snaps[4]);
            $('cmp-loading').style.display = 'none';
            $('st-loading').style.display = 'none';
            // 라이브 시작
            tracer.reset();
            initLiveControls();
            initMagnifier();
            window.__rtReady = true; // 테스트 훅
            (function loop() {
                if (live.running && live.visible) {
                    tracer.step();
                    $('pt-spp').textContent = tracer.frame + ' SPP';
                }
                requestAnimationFrame(loop);
            })();
        }
        requestAnimationFrame(burstStep);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
