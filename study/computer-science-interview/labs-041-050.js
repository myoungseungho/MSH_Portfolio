(function () {
  'use strict';

  const head = (id, title, description) => `
    <div class="lab-head">
      <div><h3>Q${id} · ${title}</h3><p>${description}</p></div>
      <button type="button" class="lab-close" data-lab-close>닫기</button>
    </div>`;
  const status = (label, message) => `
    <div class="lab-status" aria-live="polite">
      <b data-status-label>${label}</b><span data-status-message>${message}</span>
    </div>`;
  const set = (host, selector, value) => {
    const node = host.querySelector(selector);
    if (node) node.textContent = value;
  };

  CSLabs.register(41, {
    html: () => `<section class="cs-lab snapshot-lab">
      ${head(41, '한 프레임을 통째로 건네기', '게임 스레드의 갱신 위치를 움직여 직접 참조와 스냅숏의 차이를 확인하세요.')}
      <div class="snapshot-stage">
        <div class="snapshot-object">
          <b>LIVE OBJECT</b>
          <span class="snap-body" data-live-body></span>
          <span class="snap-weapon" data-live-weapon></span>
          <small data-live-tick></small>
        </div>
        <div class="snapshot-cursors">
          <i data-game-cursor>GAME</i><i data-render-cursor>RENDER</i>
        </div>
        <div class="snapshot-frame">
          <b>RENDER SNAPSHOT</b>
          <span data-frame-pose></span><small data-frame-tick></small>
        </div>
      </div>
      <div class="lab-controls">
        <label>게임 갱신 단계 <input type="range" min="0" max="3" value="0" data-game-step><output data-game-out>0</output></label>
        <label>렌더 읽기 단계 <input type="range" min="0" max="3" value="0" data-render-step><output data-render-out>0</output></label>
        <label><input type="checkbox" data-use-snapshot> 완성된 스냅숏만 공개</label>
        <button type="button" class="primary" data-snap-publish>현재 tick 공개</button>
      </div>
      ${status('tick 10의 완성 상태', '아직 두 스레드 모두 같은 pose를 보고 있습니다.')}
    </section>`,
    bind: host => {
      let publishedTick = 10;
      let publishedPose = '몸 10 · 무기 10';
      const draw = () => {
        const game = +host.querySelector('[data-game-step]').value;
        const render = +host.querySelector('[data-render-step]').value;
        const safe = host.querySelector('[data-use-snapshot]').checked;
        const bodyTick = game >= 1 ? 11 : 10;
        const weaponTick = game >= 3 ? 11 : 10;
        const directPose = `몸 ${bodyTick} · 무기 ${weaponTick}`;
        const torn = !safe && render >= 1 && bodyTick !== weaponTick;
        set(host, '[data-live-body]', `BODY ${bodyTick}`);
        set(host, '[data-live-weapon]', `WEAPON ${weaponTick}`);
        set(host, '[data-live-tick]', game === 3 ? 'tick 11 complete' : 'writing tick 11');
        set(host, '[data-frame-pose]', safe ? publishedPose : directPose);
        set(host, '[data-frame-tick]', safe ? `published tick ${publishedTick}` : 'direct shared read');
        set(host, '[data-game-out]', game);
        set(host, '[data-render-out]', render);
        host.querySelector('[data-game-cursor]').style.left = `${game * 28}%`;
        host.querySelector('[data-render-cursor]').style.left = `${render * 28}%`;
        set(host, '[data-status-label]', torn ? '서로 다른 tick이 섞임' : safe ? '프레임 소유권 고정' : '현재는 우연히 일치');
        set(host, '[data-status-message]', torn
          ? '몸은 tick 11, 무기는 tick 10입니다. 개별 load가 안전해도 pose 전체는 찢어집니다.'
          : safe ? `렌더는 공개된 tick ${publishedTick}만 읽어 갱신 중인 객체와 분리됩니다.` : 'cursor를 어긋나게 움직여 중간 상태를 만들어 보세요.');
      };
      host.querySelectorAll('input').forEach(node => { node.oninput = draw; });
      host.querySelector('[data-snap-publish]').onclick = () => {
        const game = +host.querySelector('[data-game-step]').value;
        if (game < 3) {
          set(host, '[data-status-label]', '공개 거부');
          set(host, '[data-status-message]', '몸과 무기 갱신이 모두 끝난 뒤에만 front buffer를 바꿀 수 있습니다.');
          return;
        }
        publishedTick = 11;
        publishedPose = '몸 11 · 무기 11';
        draw();
      };
      draw();
    }
  });

  CSLabs.register(42, {
    html: () => `<section class="cs-lab commit-lab">
      ${head(42, '병렬 계산과 결정 순서 분리', 'worker 완료 순서를 섞고 즉시 반영과 정렬 commit의 결과를 비교하세요.')}
      <div class="commit-workers" data-commit-workers></div>
      <div class="commit-arrow">완료 결과 ↓</div>
      <div class="commit-lane" data-commit-lane></div>
      <div class="lab-controls">
        <button type="button" data-shuffle-workers>worker 완료 순서 섞기</button>
        <label><input type="checkbox" data-ordered-commit> Entity ID 순서로 commit</label>
        <button type="button" class="primary" data-run-commit>결과 반영</button>
      </div>
      ${status('완료 순서 A-B-C-D', '공유 aggro 표에 도착한 순서대로 반영합니다.')}
    </section>`,
    bind: host => {
      let order = [1, 2, 3, 4];
      const names = {1: 'A→용', 2: 'B→골렘', 3: 'C→용', 4: 'D→골렘'};
      const draw = () => {
        host.querySelector('[data-commit-workers]').innerHTML = order.map((id, index) =>
          `<span><b>W${index}</b><i>${names[id]}</i><small>#${index + 1} 완료</small></span>`).join('');
        const ordered = host.querySelector('[data-ordered-commit]').checked;
        const lane = ordered ? [...order].sort((a, b) => a - b) : order;
        host.querySelector('[data-commit-lane]').innerHTML = lane.map(id => `<i>E${id}</i>`).join('');
        set(host, '[data-status-label]', ordered ? '계산은 병렬 · 결정은 정렬' : 'scheduler가 규칙을 결정');
        set(host, '[data-status-message]', ordered
          ? 'worker가 어떤 순서로 끝나도 Entity ID commit lane은 A-B-C-D로 고정됩니다.'
          : `이번 규칙 순서는 ${lane.map(id => `E${id}`).join('→')}입니다.`);
      };
      host.querySelector('[data-shuffle-workers]').onclick = () => {
        order = [...order].sort(() => Math.random() - .5);
        if (order.every((id, index) => id === index + 1)) order = [3, 1, 4, 2];
        draw();
      };
      host.querySelector('[data-ordered-commit]').oninput = draw;
      host.querySelector('[data-run-commit]').onclick = draw;
      draw();
    }
  });

  CSLabs.register(43, {
    html: () => `<section class="cs-lab claim-lab">
      ${head(43, '아이템 소유권이 바뀌는 한 점', '두 pickup 명령을 한 단계씩 교차해 double grant가 생기는 경계를 찾으세요.')}
      <div class="claim-token" data-claim-token>AVAILABLE</div>
      <div class="claim-racers">
        <div><b>PLAYER A</b><span data-claim-a></span><button type="button" data-claim-step="a">A 한 단계</button></div>
        <div><b>PLAYER B</b><span data-claim-b></span><button type="button" data-claim-step="b">B 한 단계</button></div>
      </div>
      <div class="claim-ledger" data-claim-ledger>지급 내역: 없음</div>
      <div class="lab-controls">
        <label><input type="checkbox" data-atomic-claim> compare-exchange로 claim</label>
        <button type="button" class="primary" data-claim-reset>다시 시작</button>
      </div>
      ${status('아이템 사용 가능', '각 플레이어의 read → claim → grant를 교차해 보세요.')}
    </section>`,
    bind: host => {
      const state = {a: 0, b: 0, seen: {a: false, b: false}, owner: '', grants: []};
      const draw = () => {
        const labels = ['대기', 'AVAILABLE을 읽음', 'claim 시도', '인벤토리 지급'];
        set(host, '[data-claim-a]', labels[state.a]);
        set(host, '[data-claim-b]', labels[state.b]);
        set(host, '[data-claim-token]', state.owner ? `CLAIMED BY ${state.owner.toUpperCase()}` : 'AVAILABLE');
        set(host, '[data-claim-ledger]', `지급 내역: ${state.grants.length ? state.grants.map(x => x.toUpperCase()).join(', ') : '없음'}`);
        const doubled = new Set(state.grants).size > 1;
        set(host, '[data-status-label]', doubled ? 'double grant 발생' : state.owner ? '소유권이 한 번만 이동' : '아직 linearization 전');
        set(host, '[data-status-message]', doubled
          ? '두 명 모두 예전 read를 근거로 지급했습니다. read-check-write가 하나의 전이가 아니었습니다.'
          : state.owner ? `${state.owner.toUpperCase()}의 claim 순간이 유일한 성공 지점입니다.` : '두 명 모두 먼저 읽은 뒤 claim하게 만들어 보세요.');
      };
      host.querySelectorAll('[data-claim-step]').forEach(button => {
        button.onclick = () => {
          const who = button.dataset.claimStep;
          if (state[who] >= 3) return;
          state[who] += 1;
          if (state[who] === 1) state.seen[who] = !state.owner;
          if (state[who] === 2) {
            if (host.querySelector('[data-atomic-claim]').checked) {
              if (!state.owner) state.owner = who;
            } else if (state.seen[who]) state.owner = who;
          }
          if (state[who] === 3) {
            const mayGrant = host.querySelector('[data-atomic-claim]').checked ? state.owner === who : state.seen[who];
            if (mayGrant && !state.grants.includes(who)) state.grants.push(who);
          }
          draw();
        };
      });
      host.querySelector('[data-atomic-claim]').oninput = draw;
      host.querySelector('[data-claim-reset]').onclick = () => {
        Object.assign(state, {a: 0, b: 0, seen: {a: false, b: false}, owner: '', grants: []});
        draw();
      };
      draw();
    }
  });

  CSLabs.register(44, {
    html: () => `<section class="cs-lab stale-job-lab">
      ${head(44, '비동기 결과의 시간표 붙이기', 'path job이 들고 간 handle과 현재 slot의 세대를 비교해 stale commit을 걸러내세요.')}
      <div class="stale-world">
        <div class="stale-slot"><b>SLOT 7</b><span data-slot-owner>ORC</span><small data-slot-version>gen 4 · goal 12</small></div>
        <div class="stale-flight" data-stale-flight><b>PATH JOB</b><span data-job-ticket>아직 요청 안 함</span></div>
        <div class="stale-result" data-stale-result>COMMIT GATE</div>
      </div>
      <div class="lab-controls">
        <button type="button" data-request-path>경로 요청</button>
        <button type="button" data-reuse-slot>파괴 후 slot 재사용</button>
        <button type="button" data-change-goal>목표 변경</button>
        <label><input type="checkbox" data-validate-ticket> gen·goal 검증</label>
        <button type="button" class="primary" data-complete-path>job 완료</button>
      </div>
      ${status('ORC gen 4', '현재 goal 12에 대한 요청을 만들 수 있습니다.')}
    </section>`,
    bind: host => {
      let generation = 4;
      let goal = 12;
      let owner = 'ORC';
      let ticket = null;
      const draw = () => {
        set(host, '[data-slot-owner]', owner);
        set(host, '[data-slot-version]', `gen ${generation} · goal ${goal}`);
        set(host, '[data-job-ticket]', ticket ? `slot 7 · gen ${ticket.gen} · goal ${ticket.goal}` : '아직 요청 안 함');
      };
      host.querySelector('[data-request-path]').onclick = () => {
        ticket = {gen: generation, goal};
        set(host, '[data-status-label]', '입력 snapshot 출발');
        set(host, '[data-status-message]', `job은 slot 7 · gen ${generation} · goal ${goal}을 들고 떠났습니다.`);
        draw();
      };
      host.querySelector('[data-reuse-slot]').onclick = () => {
        generation += 1;
        owner = owner === 'ORC' ? 'SLIME' : 'ORC';
        draw();
      };
      host.querySelector('[data-change-goal]').onclick = () => {
        goal += 1;
        draw();
      };
      host.querySelector('[data-validate-ticket]').oninput = draw;
      host.querySelector('[data-complete-path]').onclick = () => {
        if (!ticket) return;
        const valid = ticket.gen === generation && ticket.goal === goal;
        const guarded = host.querySelector('[data-validate-ticket]').checked;
        host.querySelector('[data-stale-result]').classList.toggle('rejected', guarded && !valid);
        set(host, '[data-stale-result]', guarded && !valid ? 'STALE · DROP' : `PATH APPLIED TO ${owner}`);
        set(host, '[data-status-label]', guarded && !valid ? '오래된 결과 폐기' : valid ? '현재 요청에 적용' : '엉뚱한 대상에 적용');
        set(host, '[data-status-message]', valid
          ? '요청의 생명주기와 현재 객체가 일치합니다.'
          : guarded ? '메모리 주소가 같아도 generation 또는 goal version이 달라 commit하지 않습니다.' : 'job이 raw slot만 기억해 새 객체에 예전 결과를 덮었습니다.');
      };
      draw();
    }
  });

  CSLabs.register(45, {
    html: () => `<section class="cs-lab deadlock-lab">
      ${head(45, '대기 그래프에 생긴 고리', '두 스레드가 Character와 Zone을 반대 순서로 잡게 해 cycle을 완성해 보세요.')}
      <div class="wait-graph">
        <div class="wait-thread" data-thread-a>THREAD A<small>이동</small></div>
        <div class="wait-lock" data-lock-character>CHARACTER</div>
        <div class="wait-lock" data-lock-zone>ZONE</div>
        <div class="wait-thread" data-thread-b>THREAD B<small>퇴장</small></div>
        <svg viewBox="0 0 600 130" role="img" aria-label="thread와 lock의 소유 및 대기 관계">
          <path data-edge-a d="M90 45 L220 45"/><path data-edge-b d="M380 85 L510 85"/>
          <path data-wait-a d="M265 45 C300 10 335 10 380 45"/><path data-wait-b d="M335 85 C300 120 265 120 220 85"/>
        </svg>
      </div>
      <div class="lab-controls">
        <button type="button" data-lock-a>A가 Character 획득</button>
        <button type="button" data-lock-b>B가 Zone 획득</button>
        <button type="button" data-wait-zone>A가 Zone 요청</button>
        <button type="button" data-wait-character>B가 Character 요청</button>
        <label><input type="checkbox" data-lock-order> lock rank 강제</label>
        <button type="button" class="primary" data-deadlock-reset>초기화</button>
      </div>
      ${status('대기 간선 없음', '소유 간선 두 개와 대기 간선 두 개가 닫힌 고리를 만드는지 확인하세요.')}
    </section>`,
    bind: host => {
      const s = {ca: false, zb: false, az: false, bc: false};
      const draw = () => {
        ['a', 'b'].forEach(key => host.querySelector(`[data-edge-${key}]`).classList.toggle('on', key === 'a' ? s.ca : s.zb));
        host.querySelector('[data-wait-a]').classList.toggle('wait', s.az);
        host.querySelector('[data-wait-b]').classList.toggle('wait', s.bc);
        const cycle = s.ca && s.zb && s.az && s.bc;
        host.querySelector('.wait-graph').classList.toggle('cycle', cycle);
        set(host, '[data-status-label]', cycle ? 'circular wait 완성' : '그래프가 아직 열려 있음');
        set(host, '[data-status-message]', cycle
          ? 'A→Zone→B→Character→A가 닫혔습니다. 어느 스레드도 스스로 간선을 끊을 수 없습니다.'
          : '버튼으로 소유와 대기 관계를 추가하세요.');
      };
      host.querySelector('[data-lock-a]').onclick = () => { s.ca = true; draw(); };
      host.querySelector('[data-lock-b]').onclick = () => { s.zb = true; draw(); };
      host.querySelector('[data-wait-zone]').onclick = () => {
        if (host.querySelector('[data-lock-order]').checked) {
          set(host, '[data-status-label]', 'rank 검사로 거부');
          set(host, '[data-status-message]', 'Character를 든 채 더 낮은 rank의 Zone을 요청할 수 없습니다.');
        } else s.az = true;
        draw();
      };
      host.querySelector('[data-wait-character]').onclick = () => { s.bc = true; draw(); };
      host.querySelector('[data-lock-order]').oninput = draw;
      host.querySelector('[data-deadlock-reset]').onclick = () => {
        Object.keys(s).forEach(key => { s[key] = false; });
        draw();
      };
      draw();
    }
  });

  CSLabs.register(46, {
    html: () => `<section class="cs-lab starvation-lab">
      ${head(46, '일할 자리가 모두 기다림으로 변할 때', 'worker를 blocking parent로 채운 뒤 child queue가 왜 진행하지 못하는지 보세요.')}
      <div class="worker-seats" data-worker-seats></div>
      <div class="child-queue" data-child-queue></div>
      <div class="lab-controls">
        <label>worker 수 <input type="range" min="2" max="8" value="4" data-pool-workers><output data-pool-out>4</output></label>
        <label>nested parent 수 <input type="range" min="1" max="8" value="4" data-parent-count><output data-parent-out>4</output></label>
        <label><input type="checkbox" data-continuations> parent를 continuation으로 suspend</label>
        <button type="button" class="primary" data-run-pool>schedule</button>
      </div>
      ${status('4개 parent가 4개 worker 점유', '각 parent가 자기 child future를 기다리려 합니다.')}
    </section>`,
    bind: host => {
      const draw = () => {
        const workers = +host.querySelector('[data-pool-workers]').value;
        const parents = +host.querySelector('[data-parent-count]').value;
        const continuation = host.querySelector('[data-continuations]').checked;
        const blocked = continuation ? 0 : Math.min(workers, parents);
        const childRuns = continuation ? Math.min(workers, parents) : Math.max(0, workers - blocked);
        host.querySelector('[data-worker-seats]').innerHTML = Array.from({length: workers}, (_, i) =>
          `<span class="${i < childRuns ? 'child-run' : i < childRuns + blocked ? 'parent-wait' : 'idle'}">${i < childRuns ? 'CHILD' : i < childRuns + blocked ? 'PARENT\nWAIT' : 'IDLE'}</span>`).join('');
        host.querySelector('[data-child-queue]').innerHTML = Array.from({length: Math.max(0, parents - childRuns)}, () => '<i>child</i>').join('') || '<b>queue drained</b>';
        set(host, '[data-pool-out]', workers);
        set(host, '[data-parent-out]', parents);
        const starved = !continuation && blocked === workers && parents > 0;
        set(host, '[data-status-label]', starved ? 'thread-pool starvation' : continuation ? 'worker가 dependency를 실행' : '남은 worker가 child 실행');
        set(host, '[data-status-message]', starved
          ? 'lock은 없지만 모든 실행 자리가 아직 실행되지 않은 child를 기다립니다.'
          : continuation ? 'parent stack을 worker에서 내려놓고 child 완료 counter에 continuation을 등록했습니다.' : `${workers - blocked}개 자리가 child queue를 처리합니다.`);
      };
      host.querySelectorAll('input').forEach(node => { node.oninput = draw; });
      host.querySelector('[data-run-pool]').onclick = draw;
      draw();
    }
  });

  CSLabs.register(47, {
    html: () => `<section class="cs-lab publication-lab">
      ${head(47, '준비 flag가 payload를 데려오는가', 'writer와 reader의 메모리 사건을 재배치해 publication 경계를 확인하세요.')}
      <div class="memory-timeline">
        <div><b>LOADER</b><span data-loader-events></span></div>
        <div class="memory-bridge" data-memory-bridge>?</div>
        <div><b>RENDER</b><span data-render-events></span></div>
      </div>
      <div class="published-asset">
        <span>ready <b data-ready-value>false</b></span>
        <span>handle <b data-handle-value>0</b></span>
        <span>size <b data-size-value>0×0</b></span>
      </div>
      <div class="lab-controls">
        <label>flag ordering <select data-publish-order><option value="relaxed">relaxed</option><option value="release">release / acquire</option></select></label>
        <button type="button" data-publish-reorder>약한 CPU 재배치</button>
        <button type="button" class="primary" data-publish-read>render가 ready 읽기</button>
      </div>
      ${status('아직 공개 전', 'payload write 뒤 flag를 관찰하는 순서를 실험하세요.')}
    </section>`,
    bind: host => {
      let reordered = false;
      const draw = () => {
        const strong = host.querySelector('[data-publish-order]').value === 'release';
        host.querySelector('[data-loader-events]').innerHTML = strong || !reordered
          ? '<i>handle=91</i><i>size=2048²</i><i>ready=true</i>'
          : '<i class="early">ready=true</i><i>handle=91</i><i>size=2048²</i>';
        host.querySelector('[data-render-events]').innerHTML = '<i>load ready</i><i>read payload</i>';
        set(host, '[data-memory-bridge]', strong ? 'release → acquire' : 'no happens-before');
        set(host, '[data-ready-value]', 'true');
        set(host, '[data-handle-value]', strong || !reordered ? '91' : '0');
        set(host, '[data-size-value]', strong || !reordered ? '2048×2048' : '0×0');
        set(host, '[data-status-label]', strong ? 'payload까지 공개됨' : reordered ? 'ready만 먼저 관찰' : '순서가 우연히 맞음');
        set(host, '[data-status-message]', strong
          ? 'release 이전 write가 acquire 이후 reader에게 happens-before로 연결됩니다.'
          : reordered ? 'atomic bool은 찢어지지 않았지만 다른 field의 가시성은 보장하지 않았습니다.' : '재배치 버튼으로 약한 메모리 모델의 허용 결과를 보세요.');
      };
      host.querySelector('[data-publish-order]').oninput = draw;
      host.querySelector('[data-publish-reorder]').onclick = () => { reordered = true; draw(); };
      host.querySelector('[data-publish-read]').onclick = draw;
      draw();
    }
  });

  CSLabs.register(48, {
    html: () => `<section class="cs-lab wakeup-lab">
      ${head(48, 'notify가 저장되지 않는 틈', 'worker와 producer를 한 사건씩 진행해 check와 sleep 사이의 알림 손실을 재현하세요.')}
      <div class="wakeup-track">
        <div><b>WORKER</b><span data-worker-track></span></div>
        <div><b>PRODUCER</b><span data-producer-track></span></div>
      </div>
      <div class="queue-bell"><span data-queue-state>QUEUE: EMPTY</span><i data-bell>NOTIFY</i></div>
      <div class="lab-controls">
        <button type="button" data-worker-next>worker 다음 사건</button>
        <button type="button" data-producer-next>producer enqueue+notify</button>
        <label><input type="checkbox" data-predicate-wait> mutex 안에서 predicate 재검사</label>
        <button type="button" class="primary" data-wakeup-reset>초기화</button>
      </div>
      ${status('worker가 queue 확인 전', 'check 뒤 sleep 전에 producer를 실행해 보세요.')}
    </section>`,
    bind: host => {
      let worker = 0;
      let queued = false;
      let notified = false;
      const draw = () => {
        const workerNames = ['RUN', 'CHECK: EMPTY', 'ABOUT TO SLEEP', 'SLEEPING', 'CONSUME'];
        host.querySelector('[data-worker-track]').innerHTML = workerNames.map((name, i) => `<i class="${i === worker ? 'now' : i < worker ? 'done' : ''}">${name}</i>`).join('');
        host.querySelector('[data-producer-track]').innerHTML = `<i class="${queued ? 'done' : ''}">ENQUEUE</i><i class="${notified ? 'done' : ''}">NOTIFY</i>`;
        set(host, '[data-queue-state]', queued ? 'QUEUE: JOB 1' : 'QUEUE: EMPTY');
        host.querySelector('[data-bell]').classList.toggle('rang', notified);
        const lost = worker === 3 && queued;
        set(host, '[data-status-label]', lost ? 'job이 있는데 worker는 잠듦' : worker === 4 ? 'predicate가 진행을 허용' : '사건 진행 중');
        set(host, '[data-status-message]', lost
          ? 'notify는 과거 사건을 저장하지 않습니다. check와 sleep 사이 상태 변경을 놓쳤습니다.'
          : worker === 4 ? '깨어남 자체가 아니라 queue가 비어 있지 않다는 조건으로 consume합니다.' : 'worker를 ABOUT TO SLEEP까지 진행한 뒤 producer를 실행하세요.');
      };
      host.querySelector('[data-worker-next]').onclick = () => {
        if (worker >= 4) return;
        if (worker === 2 && host.querySelector('[data-predicate-wait]').checked && queued) worker = 4;
        else worker += 1;
        if (worker === 4) queued = false;
        draw();
      };
      host.querySelector('[data-producer-next]').onclick = () => {
        queued = true;
        notified = true;
        if (worker === 3) worker = 4;
        draw();
      };
      host.querySelector('[data-predicate-wait]').oninput = draw;
      host.querySelector('[data-wakeup-reset]').onclick = () => { worker = 0; queued = false; notified = false; draw(); };
      draw();
    }
  });

  CSLabs.register(49, {
    html: () => `<section class="cs-lab reduction-lab">
      ${head(49, '같은 숫자, 다른 reduction tree', '큰 값과 작은 값을 묶는 순서를 바꿔 float 합이 달라지는 과정을 보세요.')}
      <div class="reduction-leaves"><i>100000000</i><i>1</i><i>-100000000</i><i>1</i></div>
      <div class="reduction-tree" data-reduction-tree></div>
      <div class="reduction-result">보상 총합 <b data-reduction-result></b></div>
      <div class="lab-controls">
        <label>결합 순서 <select data-tree-order><option value="left">완료 순서대로 왼쪽 결합</option><option value="pair">고정 pair tree</option><option value="small">작은 값 먼저 결합</option></select></label>
        <label><input type="checkbox" data-fixed-point> 정수 point로 합산</label>
        <button type="button" class="primary" data-reduce>reduce</button>
      </div>
      ${status('입력은 항상 동일', '결합 graph만 바꿔 결과의 bit 안정성을 확인하세요.')}
    </section>`,
    bind: host => {
      const f32 = value => new Float32Array([value])[0];
      const draw = () => {
        const mode = host.querySelector('[data-tree-order]').value;
        const fixed = host.querySelector('[data-fixed-point]').checked;
        let steps;
        let result;
        if (fixed) {
          steps = ['정수 100000000 + 1', '정수 -100000000 + 1', '100000001 + -99999999'];
          result = 2;
        } else if (mode === 'left') {
          steps = ['f32(100000000 + 1) = 100000000', '+ -100000000 = 0', '+ 1 = 1'];
          result = 1;
        } else if (mode === 'pair') {
          steps = ['f32(100000000 + 1) = 100000000', 'f32(-100000000 + 1) = -100000000', '두 partial = 0'];
          result = 0;
        } else {
          steps = ['1 + 1 = 2', '100000000 + -100000000 = 0', '0 + 2 = 2'];
          result = f32(2);
        }
        host.querySelector('[data-reduction-tree]').innerHTML = steps.map((step, i) => `<span><small>${i + 1}</small>${step}</span>`).join('');
        set(host, '[data-reduction-result]', result);
        set(host, '[data-status-label]', fixed ? '정수 단위로 정확히 2' : `float 결과 ${result}`);
        set(host, '[data-status-message]', fixed
          ? '보상 단위를 정수로 정의하면 thread 완료 순서와 부동소수점 반올림에 기대지 않습니다.'
          : 'data race가 없어도 reduction tree가 달라지면 반올림 지점도 달라집니다.');
      };
      host.querySelectorAll('select,input').forEach(node => { node.oninput = draw; });
      host.querySelector('[data-reduce]').onclick = draw;
      draw();
    }
  });

  CSLabs.register(50, {
    html: () => `<section class="cs-lab queue-topology-lab">
      ${head(50, 'queue 이름보다 소유 관계', 'producer·consumer 수에 따라 중앙 CAS 경합과 shard 전달 비용이 어떻게 바뀌는지 보세요.')}
      <div class="queue-topologies">
        <div class="central-queue"><b>MPMC RING</b><span data-central-producers></span><i data-central-ring>HEAD / TAIL</i><span data-central-consumers></span></div>
        <div class="sharded-queues" data-sharded-queues></div>
      </div>
      <div class="queue-metrics">
        <span>CAS retry <b data-cas-retry></b></span>
        <span>cache-line 이동 <b data-cache-bounce></b></span>
        <span>예상 처리량 <b data-queue-throughput></b></span>
      </div>
      <div class="lab-controls">
        <label>producer <input type="range" min="1" max="8" value="4" data-producers><output data-producer-out>4</output></label>
        <label>consumer <input type="range" min="1" max="8" value="4" data-consumers><output data-consumer-out>4</output></label>
        <label>topology <select data-queue-topology><option value="mpmc">중앙 MPMC</option><option value="spsc">consumer별 SPSC shard</option><option value="mpsc">consumer 1 + producer batch</option></select></label>
      </div>
      ${status('중앙 head/tail 경쟁', '여러 코어가 같은 cache line의 CAS를 반복합니다.')}
    </section>`,
    bind: host => {
      const draw = () => {
        const producers = +host.querySelector('[data-producers]').value;
        const consumers = +host.querySelector('[data-consumers]').value;
        const topology = host.querySelector('[data-queue-topology]').value;
        const contention = topology === 'mpmc' ? (producers + consumers - 2) * 14 : topology === 'mpsc' ? Math.max(0, producers - 1) * 7 : 0;
        const bounce = topology === 'mpmc' ? contention * 2 : topology === 'mpsc' ? contention : Math.max(0, producers - consumers) * 3;
        const throughput = Math.max(25, Math.round(100 - contention * .45 - bounce * .15));
        host.querySelector('[data-central-producers]').innerHTML = Array.from({length: producers}, (_, i) => `<i>P${i}</i>`).join('');
        host.querySelector('[data-central-consumers]').innerHTML = Array.from({length: consumers}, (_, i) => `<i>C${i}</i>`).join('');
        host.querySelector('[data-sharded-queues]').innerHTML = Array.from({length: topology === 'spsc' ? consumers : 1}, (_, i) => `<span><i>IN ${i}</i><b>${topology.toUpperCase()}</b><i>OUT ${i}</i></span>`).join('');
        host.querySelector('.central-queue').classList.toggle('inactive', topology !== 'mpmc');
        set(host, '[data-cas-retry]', `${contention}/k op`);
        set(host, '[data-cache-bounce]', `${bounce}/k op`);
        set(host, '[data-queue-throughput]', `${throughput}%`);
        set(host, '[data-producer-out]', producers);
        set(host, '[data-consumer-out]', consumers);
        set(host, '[data-status-label]', topology === 'mpmc' ? 'lock-free지만 한 cache line에 집중' : topology === 'spsc' ? '소유권을 shard로 분산' : '한 consumer에 batch 전달');
        set(host, '[data-status-message]', topology === 'mpmc'
          ? '누군가는 계속 전진하지만 각 operation이 빠르다는 뜻은 아닙니다.'
          : topology === 'spsc' ? 'merge 순서와 load imbalance 비용을 받는 대신 CAS hotspot을 없앴습니다.' : 'producer-local batch가 tail 갱신 횟수를 줄입니다.');
      };
      host.querySelectorAll('input,select').forEach(node => { node.oninput = draw; });
      draw();
    }
  });
})();
