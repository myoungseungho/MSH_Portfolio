(function () {
  'use strict';
  const H = (id, title, text) => `<div class="lab-head"><div><h3>Q${id} · ${title}</h3><p>${text}</p></div><button type="button" class="lab-close" data-lab-close>닫기</button></div>`;
  const S = (label, text) => `<div class="lab-status" aria-live="polite"><b data-status-label>${label}</b><span data-status-message>${text}</span></div>`;
  const T = (host, selector, value) => { const node = host.querySelector(selector); if (node) node.textContent = value; };

  CSLabs.register(51, {
    html: () => `<section class="cs-lab file-pack-lab">${H(51, '바이트까지 가는 길의 비용', '파일 수와 pack 여부를 바꿔 payload 밖의 고정 비용을 확인하세요.')}
      <div class="file-shelf" data-file-shelf></div><div class="io-road" data-io-road></div>
      <div class="io-numbers"><span>metadata lookup <b data-lookups></b></span><span>I/O 요청 <b data-requests></b></span><span>예상 시간 <b data-load-time></b></span></div>
      <div class="lab-controls"><label>asset 수 <input type="range" min="8" max="128" step="8" value="64" data-file-count><output data-file-out>64</output></label><label><input type="checkbox" data-pack-mode> TOC가 있는 pack으로 묶기</label></div>
      ${S('64개의 작은 파일', 'payload보다 open·경로 탐색·작은 요청 비용이 반복됩니다.')}</section>`,
    bind: host => {
      const draw = () => {
        const count = +host.querySelector('[data-file-count]').value, pack = host.querySelector('[data-pack-mode]').checked;
        host.querySelector('[data-file-shelf]').innerHTML = Array.from({length: Math.min(count, 64)}, (_, i) => `<i class="${pack ? 'packed' : ''}">${pack && i ? '' : pack ? 'PACK' : `F${i + 1}`}</i>`).join('');
        host.querySelector('[data-io-road]').innerHTML = Array.from({length: pack ? Math.ceil(count / 32) : Math.min(count, 24)}, () => `<span>${pack ? 'sequential read' : 'open → seek → read'}</span>`).join('');
        T(host, '[data-lookups]', pack ? 1 : count); T(host, '[data-requests]', pack ? Math.ceil(count / 32) : count); T(host, '[data-load-time]', `${Math.round((pack ? 3 + count * .08 : count * .9))} ms`); T(host, '[data-file-out]', count);
        T(host, '[data-status-label]', pack ? 'TOC 1회 + 연속 offset' : `${count}번 경로 탐색`);
        T(host, '[data-status-message]', pack ? '같은 payload를 큰 연속 요청으로 합쳐 read-ahead와 queue 효율을 얻습니다.' : '총 바이트가 작아도 요청마다 고정 비용을 다시 지불합니다.');
      };
      host.querySelectorAll('input').forEach(n => { n.oninput = draw; }); draw();
    }
  });

  CSLabs.register(52, {
    html: () => `<section class="cs-lab durability-lab">${H(52, '저장 완료의 층을 내려가기', '세이브가 어느 계층에 있는지 한 단계씩 내려 보내고 전원 손실 결과를 보세요.')}
      <div class="durability-stack"><div data-durable="app">APP BUFFER</div><div data-durable="page">OS PAGE CACHE</div><div data-durable="device">DEVICE CACHE</div><div data-durable="platter">NON-VOLATILE MEDIA</div></div>
      <div class="lab-controls"><button type="button" data-save-step>다음 계층으로 flush</button><button type="button" data-power-loss>전원 차단</button><button type="button" class="primary" data-save-reset>새 저장</button></div>
      ${S('write가 APP buffer에 수락됨', '아직 전원 손실 뒤 남는다고 약속할 수 없습니다.')}</section>`,
    bind: host => {
      let level = 0, lost = false; const layers = ['app', 'page', 'device', 'platter'];
      const draw = () => {
        host.querySelectorAll('[data-durable]').forEach((n, i) => { n.classList.toggle('has-data', !lost && i <= level); n.classList.toggle('durable', !lost && level === 3 && i === 3); });
        T(host, '[data-status-label]', lost ? level === 3 ? '재시작 후 복구 성공' : '저장 데이터 소실' : level === 3 ? 'durable 지점 도달' : `${layers[level].toUpperCase()}에만 존재`);
        T(host, '[data-status-message]', lost ? level === 3 ? '비휘발 매체까지 내려간 완성본을 다시 읽습니다.' : '성공 UI는 떴지만 volatile 계층의 dirty data가 사라졌습니다.' : level === 3 ? '이제 전원 손실 뒤에도 남는다는 계약을 충족합니다.' : 'flush를 진행하거나 지금 전원을 차단해 보세요.');
      };
      host.querySelector('[data-save-step]').onclick = () => { level = Math.min(3, level + 1); draw(); };
      host.querySelector('[data-power-loss]').onclick = () => { lost = true; draw(); };
      host.querySelector('[data-save-reset]').onclick = () => { level = 0; lost = false; draw(); }; draw();
    }
  });

  CSLabs.register(53, {
    html: () => `<section class="cs-lab torn-save-lab">${H(53, '중간에 끊겨도 완성본 고르기', 'block을 기록하다 crash시켜 제자리 덮어쓰기와 A/B commit을 비교하세요.')}
      <div class="save-slots"><div><b>SLOT A</b><span data-slot-a></span></div><div><b>SLOT B</b><span data-slot-b></span></div></div><div class="commit-marker" data-commit-marker>ACTIVE: A · GEN 7</div>
      <div class="lab-controls"><label>전략 <select data-save-strategy><option value="inplace">A 제자리 덮기</option><option value="ab">B에 새 버전 기록</option></select></label><button type="button" data-write-block>block 1개 기록</button><button type="button" data-save-crash>CRASH</button><button type="button" class="primary" data-recover-save>재시작 복구</button></div>
      ${S('A에 gen 7 완성본', 'gen 8의 네 block을 기록할 준비가 됐습니다.')}</section>`,
    bind: host => {
      let written = 0, crashed = false, active = 'A';
      const blocks = (slot) => Array.from({length: 4}, (_, i) => {
        const newer = (host.querySelector('[data-save-strategy]').value === 'inplace' ? slot === 'A' : slot === 'B') && i < written;
        return `<i class="${newer ? 'new' : ''}">${newer ? '8' : slot === 'A' ? '7' : '-'}</i>`;
      }).join('');
      const draw = () => {
        host.querySelector('[data-slot-a]').innerHTML = blocks('A'); host.querySelector('[data-slot-b]').innerHTML = blocks('B');
        T(host, '[data-commit-marker]', `ACTIVE: ${active} · GEN ${active === 'A' ? 7 : 8}`);
      };
      host.querySelector('[data-write-block]').onclick = () => { if (!crashed) written = Math.min(4, written + 1); draw(); };
      host.querySelector('[data-save-crash]').onclick = () => { crashed = true; T(host, '[data-status-label]', written > 0 && written < 4 ? 'torn record' : 'crash'); T(host, '[data-status-message]', `${written}/4 block만 gen 8입니다. 재시작 복구를 실행하세요.`); draw(); };
      host.querySelector('[data-recover-save]').onclick = () => {
        const ab = host.querySelector('[data-save-strategy]').value === 'ab', complete = written === 4;
        if (ab && complete) active = 'B';
        T(host, '[data-status-label]', ab ? complete ? '새 완성본 B 선택' : '이전 완성본 A 유지' : written > 0 && written < 4 ? 'A 자체가 혼합됨' : 'A 사용');
        T(host, '[data-status-message]', ab ? 'commit marker와 checksum이 완성된 generation만 선택합니다.' : '제자리 기록은 이전 good copy까지 훼손해 선택지가 없습니다.'); draw();
      };
      host.querySelector('[data-save-strategy]').oninput = () => { written = 0; crashed = false; active = 'A'; draw(); }; draw();
    }
  });

  CSLabs.register(54, {
    html: () => `<section class="cs-lab patch-lab">${H(54, '여러 파일을 한 버전으로 공개하기', '새 version directory를 채운 뒤 current pointer를 마지막에 바꾸세요.')}
      <div class="patch-versions"><div><b>V12 · ACTIVE</b><span>exe ✓</span><span>pack ✓</span><span>schema ✓</span></div><div data-new-version><b>V13 · STAGING</b><span data-patch-file="exe">exe</span><span data-patch-file="pack">pack</span><span data-patch-file="schema">schema</span></div></div>
      <div class="manifest-pointer" data-manifest-pointer>CURRENT → V12</div>
      <div class="lab-controls"><button type="button" data-stage-file="exe">exe 배치</button><button type="button" data-stage-file="pack">pack 배치</button><button type="button" data-stage-file="schema">schema 배치</button><button type="button" data-patch-crash>중간 crash</button><button type="button" class="primary" data-switch-manifest>current 전환</button></div>
      ${S('V12 집합이 공개 중', 'V13은 사용자에게 보이지 않는 staging 영역입니다.')}</section>`,
    bind: host => {
      const files = new Set(); let current = 12, crashed = false;
      const draw = () => { host.querySelectorAll('[data-patch-file]').forEach(n => n.classList.toggle('ready', files.has(n.dataset.patchFile))); T(host, '[data-manifest-pointer]', `CURRENT → V${current}`); };
      host.querySelectorAll('[data-stage-file]').forEach(b => b.onclick = () => { if (!crashed) files.add(b.dataset.stageFile); draw(); });
      host.querySelector('[data-patch-crash]').onclick = () => { crashed = true; T(host, '[data-status-label]', '프로세스 재시작'); T(host, '[data-status-message]', `V13은 ${files.size}/3만 완성됐지만 CURRENT가 V12라 혼합 버전을 공개하지 않습니다.`); };
      host.querySelector('[data-switch-manifest]').onclick = () => {
        if (files.size === 3) { current = 13; T(host, '[data-status-label]', 'V13 원자적 공개'); T(host, '[data-status-message]', '완성된 immutable 집합을 가리키는 작은 pointer 한 개만 바뀌었습니다.'); }
        else { T(host, '[data-status-label]', '전환 거부'); T(host, '[data-status-message]', 'hash 검증을 통과한 세 파일이 모두 있어야 manifest를 바꿀 수 있습니다.'); } draw();
      }; draw();
    }
  });

  CSLabs.register(55, {
    html: () => `<section class="cs-lab qd-lab">${H(55, '장치 앞에 독립 작업 공급하기', 'queue depth에 따라 NVMe lane이 얼마나 동시에 일하는지 보세요.')}
      <div class="nvme-lanes" data-nvme-lanes></div><div class="qd-wave" data-qd-wave></div>
      <div class="io-numbers"><span>utilization <b data-qd-util></b></span><span>64 read 완료 <b data-qd-time></b></span><span>p99 <b data-qd-p99></b></span></div>
      <div class="lab-controls"><label>queue depth <input type="range" min="1" max="32" value="1" data-qd><output data-qd-out>1</output></label><button type="button" class="primary" data-submit-io>64개 read 제출</button></div>
      ${S('QD 1 · 직렬 대기', '한 요청을 기다린 뒤 다음 요청을 제출해 장치 lane이 놉니다.')}</section>`,
    bind: host => {
      const draw = () => {
        const qd = +host.querySelector('[data-qd]').value, active = Math.min(8, qd), util = Math.round(active / 8 * 100), time = Math.round(64 * 0.35 / active + qd * .03), p99 = (0.35 + Math.max(0, qd - 16) * .04).toFixed(2);
        host.querySelector('[data-nvme-lanes]').innerHTML = Array.from({length: 8}, (_, i) => `<span class="${i < active ? 'busy' : ''}">CH${i}<i></i></span>`).join('');
        host.querySelector('[data-qd-wave]').innerHTML = Array.from({length: Math.min(qd, 32)}, () => '<i></i>').join('');
        T(host, '[data-qd-util]', `${util}%`); T(host, '[data-qd-time]', `${time} ms`); T(host, '[data-qd-p99]', `${p99} ms`); T(host, '[data-qd-out]', qd);
        T(host, '[data-status-label]', qd < 8 ? `lane ${active}/8 사용` : qd > 20 ? '과도한 대기열' : '내부 병렬성 활용');
        T(host, '[data-status-message]', qd < 8 ? '독립 요청을 조금 더 앞서 제출하면 latency를 겹칠 수 있습니다.' : qd > 20 ? '처리량은 더 늘지 않는데 새 긴급 요청의 tail wait가 길어집니다.' : '장치 채널을 채우되 queue를 불필요하게 깊게 만들지 않습니다.');
      };
      host.querySelector('[data-qd]').oninput = draw; host.querySelector('[data-submit-io]').onclick = draw; draw();
    }
  });

  CSLabs.register(56, {
    html: () => `<section class="cs-lab chunk-lab">${H(56, '압축 stream의 재시작 경계', '목표 asset 하나를 위해 읽어야 하는 chunk와 index 크기를 비교하세요.')}
      <div class="compressed-pack" data-compressed-pack></div><div class="asset-window" data-asset-window>TARGET ASSET · 192 KB</div>
      <div class="io-numbers"><span>읽은 bytes <b data-chunk-read></b></span><span>read amplification <b data-chunk-amp></b></span><span>index entries <b data-index-count></b></span></div>
      <div class="lab-controls"><label>독립 압축 chunk <select data-chunk-size><option value="16384">16 MB · 단일 stream</option><option value="1024">1 MB</option><option value="256">256 KB</option><option value="64">64 KB</option></select></label><label>asset 위치 <input type="range" min="5" max="95" value="78" data-asset-position><output data-asset-out>78%</output></label></div>
      ${S('큰 압축 stream', '후반 asset 하나에도 decoder state를 앞에서부터 복원해야 합니다.')}</section>`,
    bind: host => {
      const draw = () => {
        const size = +host.querySelector('[data-chunk-size]').value, pos = +host.querySelector('[data-asset-position]').value, chunks = Math.max(1, 16384 / size), target = Math.min(chunks - 1, Math.floor(pos / 100 * chunks)), read = size === 16384 ? Math.ceil(16384 * pos / 100) : Math.ceil(192 / size) * size;
        host.querySelector('[data-compressed-pack]').innerHTML = Array.from({length: Math.min(chunks, 64)}, (_, i) => `<i class="${i === Math.min(target, 63) ? 'target' : ''}"></i>`).join('');
        T(host, '[data-chunk-read]', `${read.toLocaleString()} KB`); T(host, '[data-chunk-amp]', `${(read / 192).toFixed(1)}×`); T(host, '[data-index-count]', chunks); T(host, '[data-asset-out]', `${pos}%`);
        T(host, '[data-status-label]', size <= 256 ? '목표와 겹친 chunk만 해제' : size === 16384 ? '앞 stream까지 순차 해제' : '중간 크기 chunk');
        T(host, '[data-status-message]', size <= 256 ? 'random access는 좋아졌지만 chunk header와 index, 압축률 비용이 늘어납니다.' : '압축률은 좋지만 작은 asset의 읽기 증폭이 큽니다.');
      }; host.querySelectorAll('select,input').forEach(n => { n.oninput = draw; }); draw();
    }
  });

  CSLabs.register(57, {
    html: () => `<section class="cs-lab cancel-pipeline-lab">${H(57, '취소가 막아야 할 다음 부작용', '씬 epoch를 바꾼 뒤 완료 pipeline을 진행해 어느 경계에서 버려지는지 보세요.')}
      <div class="cancel-pipeline" data-cancel-pipeline></div><div class="scene-epoch">CURRENT SCENE EPOCH <b data-scene-epoch>20</b></div>
      <div class="lab-controls"><button type="button" data-start-stream>epoch 20 요청</button><button type="button" data-unload-scene>씬 전환</button><label><input type="checkbox" data-check-epoch> 각 단계에서 epoch 검사</label><button type="button" class="primary" data-next-stage>다음 단계</button></div>
      ${S('요청 전', 'read → decompress → upload → commit의 네 경계를 진행하세요.')}</section>`,
    bind: host => {
      const stages = ['READ', 'DECOMPRESS', 'GPU UPLOAD', 'COMMIT']; let current = -1, ticket = null, epoch = 20, dropped = false;
      const draw = () => {
        host.querySelector('[data-cancel-pipeline]').innerHTML = stages.map((x, i) => `<i class="${dropped && i === current ? 'drop' : i < current ? 'done' : i === current ? 'now' : ''}">${x}</i>`).join('');
        T(host, '[data-scene-epoch]', epoch);
      };
      host.querySelector('[data-start-stream]').onclick = () => { ticket = epoch; current = 0; dropped = false; T(host, '[data-status-label]', `epoch ${ticket} 요청 출발`); draw(); };
      host.querySelector('[data-unload-scene]').onclick = () => { epoch += 1; T(host, '[data-status-label]', `씬 epoch ${epoch}로 전환`); T(host, '[data-status-message]', '이미 제출된 read는 끝날 수 있지만 결과의 가치는 사라졌습니다.'); draw(); };
      host.querySelector('[data-next-stage]').onclick = () => {
        if (ticket === null || dropped || current >= 3) return;
        if (host.querySelector('[data-check-epoch]').checked && ticket !== epoch) { dropped = true; T(host, '[data-status-label]', `${stages[current]} 뒤 폐기`); T(host, '[data-status-message]', '오래된 작업이 다음 CPU·GPU·world 부작용 경계를 넘지 못합니다.'); }
        else { current += 1; const stale = ticket !== epoch; T(host, '[data-status-label]', stale && current === 3 ? '새 씬에 stale commit' : `${stages[current]} 진행`); T(host, '[data-status-message]', stale ? 'cancel을 호출했어도 검증하지 않으면 downstream 작업과 commit이 계속됩니다.' : '현재 scene owner와 요청 epoch가 일치합니다.'); } draw();
      }; draw();
    }
  });

  CSLabs.register(58, {
    html: () => `<section class="cs-lab io-priority-lab">${H(58, '긴급 요청이 들어올 자리 남기기', 'speculative streaming으로 queue를 채운 뒤 critical 지형 요청을 넣어 보세요.')}
      <div class="device-queue" data-device-queue></div><div class="priority-entry" data-priority-entry>CRITICAL TERRAIN</div>
      <div class="lab-controls"><label>speculative 제출 <input type="range" min="0" max="16" value="16" data-spec-count><output data-spec-out>16</output></label><label>reserved QD <input type="range" min="0" max="4" value="0" data-reserved-qd><output data-reserved-out>0</output></label><button type="button" class="primary" data-submit-critical>critical 요청</button></div>
      ${S('QD 16이 speculative로 가득 참', '높은 priority 숫자만으로는 이미 찬 장치 queue를 비울 수 없습니다.')}</section>`,
    bind: host => {
      const draw = () => {
        const spec = +host.querySelector('[data-spec-count]').value, reserve = +host.querySelector('[data-reserved-qd]').value, admitted = Math.min(spec, 16 - reserve);
        host.querySelector('[data-device-queue]').innerHTML = Array.from({length: 16}, (_, i) => `<i class="${i < admitted ? 'spec' : i >= 16 - reserve ? 'reserved' : ''}">${i < admitted ? 'S' : i >= 16 - reserve ? 'R' : '·'}</i>`).join('');
        T(host, '[data-spec-out]', spec); T(host, '[data-reserved-out]', reserve);
      };
      host.querySelectorAll('input').forEach(n => { n.oninput = draw; });
      host.querySelector('[data-submit-critical]').onclick = () => {
        const spec = +host.querySelector('[data-spec-count]').value, reserve = +host.querySelector('[data-reserved-qd]').value, blocked = spec >= 16 && reserve === 0;
        host.querySelector('[data-priority-entry]').classList.toggle('blocked', blocked);
        T(host, '[data-status-label]', blocked ? 'critical이 장치 밖에서 대기' : '예약 slot으로 즉시 제출');
        T(host, '[data-status-message]', blocked ? '낮은 우선순위 admission을 제한하지 않아 priority inversion이 이미 일어났습니다.' : 'critical이 없을 때 빌려주되 도착하면 회수할 수 있는 제출 자리를 남겼습니다.');
      }; draw();
    }
  });

  CSLabs.register(59, {
    html: () => `<section class="cs-lab asset-pipeline-lab">${H(59, 'queue가 자라는 stage 찾기', 'I/O·decompress·GPU의 처리 시간을 조절해 지속 병목 앞의 backlog를 보세요.')}
      <div class="asset-pipeline"><div><b>I/O</b><span data-pipe-io></span></div><div><b>DECOMPRESS</b><span data-pipe-cpu></span></div><div><b>GPU</b><span data-pipe-gpu></span></div></div>
      <div class="pipeline-queues"><span data-queue-io></span><span data-queue-cpu></span></div>
      <div class="lab-controls"><label>I/O ms <input type="range" min="1" max="10" value="3" data-io-ms><output data-io-out>3</output></label><label>decompress ms <input type="range" min="1" max="10" value="7" data-cpu-ms><output data-cpu-out>7</output></label><label>GPU ms <input type="range" min="1" max="10" value="2" data-gpu-ms><output data-gpu-out>2</output></label></div>
      ${S('decompress가 가장 느림', 'I/O를 더 빠르게 해도 compressed buffer queue만 자랍니다.')}</section>`,
    bind: host => {
      const draw = () => {
        const vals = [['io', +host.querySelector('[data-io-ms]').value], ['cpu', +host.querySelector('[data-cpu-ms]').value], ['gpu', +host.querySelector('[data-gpu-ms]').value]], max = Math.max(...vals.map(x => x[1])), bottleneck = vals.find(x => x[1] === max)[0];
        vals.forEach(([key, value]) => { host.querySelector(`[data-pipe-${key}]`).style.height = `${20 + value * 9}px`; T(host, `[data-${key}-out]`, value); });
        host.querySelector('[data-queue-io]').innerHTML = Array.from({length: bottleneck === 'cpu' ? max - vals[0][1] : 0}, () => '<i></i>').join('');
        host.querySelector('[data-queue-cpu]').innerHTML = Array.from({length: bottleneck === 'gpu' ? max - vals[1][1] : 0}, () => '<i></i>').join('');
        const label = bottleneck === 'io' ? 'I/O' : bottleneck === 'cpu' ? 'DECOMPRESS' : 'GPU';
        T(host, '[data-status-label]', `${label} stage 병목`);
        T(host, '[data-status-message]', `service time ${max}ms인 stage 앞에서 wait time과 in-flight bytes가 증가합니다.`);
      }; host.querySelectorAll('input').forEach(n => { n.oninput = draw; }); draw();
    }
  });

  CSLabs.register(60, {
    html: () => `<section class="cs-lab backpressure-lab">${H(60, '생산률이 소비률을 넘는 순간의 선택', 'bounded queue가 찼을 때 데이터 종류별 overload 정책을 비교하세요.')}
      <div class="write-tank"><div class="tank-fill" data-tank-fill></div><b data-tank-label>0 / 32</b></div><div class="drop-stream" data-drop-stream></div>
      <div class="io-numbers"><span>game thread block <b data-block-time></b></span><span>drop <b data-drop-count></b></span><span>queue age <b data-queue-age></b></span></div>
      <div class="lab-controls"><label>생산/초 <input type="range" min="1" max="60" value="45" data-produce-rate><output data-produce-out>45</output></label><label>저장/초 <input type="range" min="1" max="40" value="15" data-consume-rate><output data-consume-out>15</output></label><label>포화 정책 <select data-overload-policy><option value="block">producer block</option><option value="old">drop oldest</option><option value="sample">sampling·품질 축소</option></select></label><button type="button" class="primary" data-run-overload>1초 실행</button></div>
      ${S('아직 실행 전', '비동기 queue도 소비율 이상의 일을 없애 주지는 않습니다.')}</section>`,
    bind: host => {
      const draw = () => { T(host, '[data-produce-out]', host.querySelector('[data-produce-rate]').value); T(host, '[data-consume-out]', host.querySelector('[data-consume-rate]').value); };
      host.querySelectorAll('input,select').forEach(n => { n.oninput = draw; });
      host.querySelector('[data-run-overload]').onclick = () => {
        const p = +host.querySelector('[data-produce-rate]').value, c = +host.querySelector('[data-consume-rate]').value, overflow = Math.max(0, p - c - 32), queued = Math.min(32, Math.max(0, p - c)), policy = host.querySelector('[data-overload-policy]').value;
        host.querySelector('[data-tank-fill]').style.height = `${queued / 32 * 100}%`; T(host, '[data-tank-label]', `${queued} / 32`);
        const block = policy === 'block' ? overflow * 4 : 0, drop = policy === 'block' ? 0 : overflow, age = c ? (queued / c).toFixed(1) : '∞';
        T(host, '[data-block-time]', `${block} ms`); T(host, '[data-drop-count]', drop); T(host, '[data-queue-age]', `${age} s`);
        host.querySelector('[data-drop-stream]').innerHTML = Array.from({length: Math.min(drop, 20)}, () => `<i>${policy === 'sample' ? '↓Q' : 'DROP'}</i>`).join('');
        T(host, '[data-status-label]', overflow ? policy === 'block' ? 'game thread hitch로 비용 지불' : policy === 'old' ? '오래된 replay frame 폐기' : 'sampling으로 bytes 축소' : 'consumer가 따라잡음');
        T(host, '[data-status-message]', overflow ? 'bounded queue의 상한 뒤에는 기다림 또는 명시적 손실 정책이 반드시 드러납니다.' : '이번 1초 구간에는 overload가 없습니다.');
      }; draw();
    }
  });
})();
