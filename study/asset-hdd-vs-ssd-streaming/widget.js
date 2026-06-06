// 에셋 스트리밍 시뮬레이터 — 디스크 → I/O 큐 → 오디오/텍스처 버퍼
// 단순화 모델: HDD = 직렬 + 시크 지연, SSD = 병렬 + 마이크로초 지연
(function () {
    'use strict';

    var DISK = {
        hdd: { name: '💿 HDD (7200rpm)', icon: '💿', parallel: 1, seekMin: 5, seekMax: 13, seqMBps: 180 },
        ssd: { name: '⚡ NVMe SSD', icon: '🟩', parallel: 8, seekMin: 0.04, seekMax: 0.10, seqMBps: 5000 }
    };
    // 초당 텍스처·메시 요청 수 (이동 속도별)
    var SPEED = { idle: 3, walk: 25, horse: 70 };
    var AUDIO_RATE = 6;          // 초당 오디오 청크 요청
    var AUDIO_CHUNK_SEC = 0.33;  // 청크 1개가 채우는 재생 시간
    var AUDIO_SIZE = 0.15;       // MB
    var BUF_CAP = 2.0;           // 링 버퍼 용량 (초)
    var QUEUE_CAP = 250;         // 이걸 넘으면 엔진이 요청을 포기
    var STALE_MS = 4000;         // 너무 오래 밀린 텍스처 요청은 포기

    var disk = 'hdd', speed = 'idle', prio = false;
    var queue = [], inFlight = [];
    var audioBuf = BUF_CAP, texQuality = 100;
    var underruns = 0, dropped = 0, wasDry = false;
    var waitSamples = [], busyMs = 0, windowMs = 0;
    var texAcc = 0, audAcc = 0, lastTs = 0;

    var $ = function (id) { return document.getElementById(id); };

    function texSize() { return 1 + Math.random() * 5; } // 1~6MB

    function serviceMs(d, sizeMB) {
        var spec = DISK[d];
        var seek = spec.seekMin + Math.random() * (spec.seekMax - spec.seekMin);
        return seek + (sizeMB / spec.seqMBps) * 1000;
    }

    function pickNext() {
        if (!queue.length) return null;
        if (prio) {
            for (var i = 0; i < queue.length; i++)
                if (queue[i].type === 'aud') return queue.splice(i, 1)[0];
        }
        return queue.shift();
    }

    function step(dtMs) {
        var now = performance.now();
        var dtSec = dtMs / 1000;

        // ── 1. 요청 생성 (플레이어 이동 → 스트리밍 수요)
        texAcc += SPEED[speed] * dtSec;
        while (texAcc >= 1) {
            texAcc -= 1;
            queue.push({ type: 'tex', size: texSize(), at: now });
        }
        var pendingAud = queue.filter(function (r) { return r.type === 'aud'; }).length
            + inFlight.filter(function (f) { return f.req.type === 'aud'; }).length;
        audAcc += AUDIO_RATE * dtSec;
        while (audAcc >= 1) {
            audAcc -= 1;
            if (audioBuf + pendingAud * AUDIO_CHUNK_SEC < BUF_CAP + 0.3) {
                queue.push({ type: 'aud', size: AUDIO_SIZE, at: now });
                pendingAud++;
            }
        }

        // ── 2. 큐 한계 — 엔진의 '포기' (팝인·로딩 멈춤의 정체)
        while (queue.length > QUEUE_CAP) {
            for (var i = 0; i < queue.length; i++)
                if (queue[i].type === 'tex') { queue.splice(i, 1); dropped++; break; }
            if (queue.length > QUEUE_CAP && queue[0].type === 'aud') { queue.shift(); dropped++; }
        }
        for (var j = queue.length - 1; j >= 0; j--)
            if (queue[j].type === 'tex' && now - queue[j].at > STALE_MS) { queue.splice(j, 1); dropped++; }

        // ── 3. 디스크 서비스 — 채널(parallel)마다 실시간 병렬 진행, 틱 잔여시간 이월
        var spec = DISK[disk];
        function startNext(timeLeft) {
            var req = pickNext();
            if (!req) return;
            waitSamples.push(now - req.at);
            if (waitSamples.length > 60) waitSamples.shift();
            inFlight.push({ req: req, remain: serviceMs(disk, req.size), left: timeLeft });
        }
        while (inFlight.length < spec.parallel && queue.length) startNext(dtMs);
        windowMs += dtMs;
        for (var k = inFlight.length - 1; k >= 0; k--) {
            var g = inFlight[k];
            var t = (g.left !== undefined) ? g.left : dtMs;
            g.left = undefined;
            while (t > 0) {
                var use = Math.min(g.remain, t);
                g.remain -= use; t -= use;
                busyMs += use / spec.parallel; // 채널 정규화 실사용 시간
                if (g.remain <= 0) {
                    if (g.req.type === 'aud') audioBuf = Math.min(BUF_CAP, audioBuf + AUDIO_CHUNK_SEC);
                    inFlight.splice(k, 1);
                    var nx = pickNext();
                    if (!nx) { t = 0; break; }
                    waitSamples.push(now - nx.at);
                    if (waitSamples.length > 60) waitSamples.shift();
                    g = { req: nx, remain: serviceMs(disk, nx.size) };
                    inFlight.splice(k, 0, g);
                }
            }
        }

        // ── 4. 오디오 소비 (사운드카드 — 협상 불가)
        audioBuf -= dtSec;
        if (audioBuf <= 0) {
            audioBuf = 0;
            if (!wasDry) { underruns++; wasDry = true; }
        } else wasDry = false;

        // ── 5. 텍스처 품질 (백로그가 클수록 팝인·흐릿)
        var backlogMB = 0;
        for (var m = 0; m < queue.length; m++) if (queue[m].type === 'tex') backlogMB += queue[m].size;
        var target = Math.max(5, 100 * (1 - backlogMB / 150));
        texQuality += (target - texQuality) * Math.min(1, dtSec * 3);
    }

    function caption() {
        var key = disk + '-' + speed;
        var c = {
            'hdd-idle': '🧍 서 있을 땐 HDD도 버틴다 — 사용률을 봐. 네가 지금까지 HDD로 게임해도 멀쩡했던 이유이자, 마을에 가만히 있을 땐 괜찮았던 이유.',
            'hdd-walk': '🚶 걷기 시작하면 사용률이 치솟는다. 아직 처리량 흑자지만 여유가 없어서, 시크 몇 번의 변동이 그대로 버퍼를 갉아먹는다. 운 나쁘면 가끔 지직.',
            'hdd-horse': prio
                ? '🐎+우선순위: 오디오는 구했다 — 대신 텍스처 백로그가 폭증하고 포기된 요청이 쌓인다(팝인·로딩 멈춤). 총 처리량이 적자일 때 우선순위는 <b>누가 굶을지</b>를 정할 뿐, 굶주림을 없애지 못한다.'
                : '🐎 수요가 처리량을 넘었다(적자). 큐가 폭증하고 오디오 청크가 수 MB 텍스처들 뒤에 갇힌다 → <b>지직</b>. 그리고 엔진이 밀린 요청을 포기하기 시작한다 → <b>로딩 멈춤</b>. 네가 겪은 두 증상이 동시에 나오는 지점.',
            'ssd-idle': '⚡ SSD: 큐가 생길 새가 없다. 요청이 도착하는 즉시 마이크로초 단위로 끝난다.',
            'ssd-walk': '⚡ 같은 수요인데 사용률 몇 % — HDD와의 차이는 순차 속도 25배가 아니라 <b>요청당 지연 100배+, 병렬성</b>에서 온다.',
            'ssd-horse': '🐎⚡ 말을 전속력으로 몰아도 디스크는 한가하다. 지직과 팝인이 <b>동시에</b> 사라진 이유 — 병목 자체가 존재하지 않게 됐기 때문. 이게 붉은사막이 SSD를 최소사양으로 박은 근거다.'
        };
        return c[key] || '';
    }

    function render() {
        var spec = DISK[disk];
        $('st-disk-name').textContent = spec.name;
        $('st-disk-vis').textContent = spec.icon;
        if (inFlight.length) {
            var f = inFlight[0];
            $('st-disk-cur').textContent = (f.req.type === 'aud' ? '🔊 오디오 ' : '🖼 텍스처 ')
                + f.req.size.toFixed(1) + 'MB 읽는 중' + (inFlight.length > 1 ? ' (+' + (inFlight.length - 1) + ' 병렬)' : '');
            $('st-prog').style.width = '60%';
        } else { $('st-disk-cur').textContent = '대기 중 (큐 비었음)'; $('st-prog').style.width = '0%'; }

        var qEl = $('st-queue'), html = '';
        var shown = Math.min(queue.length, 140);
        for (var i = 0; i < shown; i++)
            html += '<div class="st-chip ' + (queue[i].type === 'aud' ? 'aud' : 'tex') + '"></div>';
        qEl.innerHTML = html;
        $('st-qstat').textContent = '대기 ' + queue.length + '건'
            + (queue.length > shown ? ' (표시 ' + shown + ')' : '')
            + ' · 한계 ' + QUEUE_CAP + '건 넘으면 포기 시작';

        $('st-audv').textContent = audioBuf.toFixed(2) + 's';
        $('st-audbar').style.width = (audioBuf / BUF_CAP * 100) + '%';
        $('st-crackle').textContent = audioBuf <= 0.001 ? '⚡지직⚡ 언더런!' : (audioBuf < 0.5 ? '⚠ 위험 수위' : '');
        $('st-texv').textContent = Math.round(texQuality) + '%';
        $('st-texbar').style.width = texQuality + '%';

        var u = $('st-underruns'); u.textContent = underruns; u.className = underruns ? 'bad' : '';
        var d = $('st-dropped'); d.textContent = dropped; d.className = dropped ? 'bad' : '';
        $('st-util').textContent = windowMs ? Math.min(100, Math.round(busyMs / windowMs * 100)) + '%' : '0%';
        var avg = waitSamples.length ? waitSamples.reduce(function (a, b) { return a + b; }, 0) / waitSamples.length : 0;
        $('st-wait').textContent = avg < 1 ? avg.toFixed(2) + 'ms' : Math.round(avg) + 'ms';
        $('st-caption').innerHTML = caption();
        if (windowMs > 3000) { busyMs *= 0.5; windowMs *= 0.5; } // 이동 평균
    }

    function reset() {
        queue = []; inFlight = []; audioBuf = BUF_CAP; texQuality = 100;
        underruns = 0; dropped = 0; wasDry = false; waitSamples = []; busyMs = 0; windowMs = 0;
    }

    function loop(ts) {
        if (!lastTs) lastTs = ts;
        var dt = Math.min(50, ts - lastTs);
        lastTs = ts;
        step(dt);
        render();
        requestAnimationFrame(loop);
    }

    function init() {
        var root = $('stsim');
        if (!root) return;
        $('st-hdd').addEventListener('click', function () {
            disk = 'hdd'; reset();
            $('st-hdd').classList.add('active'); $('st-ssd').classList.remove('active');
        });
        $('st-ssd').addEventListener('click', function () {
            disk = 'ssd'; reset();
            $('st-ssd').classList.add('active'); $('st-hdd').classList.remove('active');
        });
        root.querySelectorAll('[data-spd]').forEach(function (b) {
            b.addEventListener('click', function () {
                speed = b.getAttribute('data-spd');
                root.querySelectorAll('[data-spd]').forEach(function (x) { x.classList.remove('active'); });
                b.classList.add('active');
            });
        });
        $('st-prio').addEventListener('change', function (e) { prio = e.target.checked; });
        requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
