(function () {
  'use strict';

  let active = null;
  const host = () => active ? document.querySelector(`[data-flow-host="${active.id}"]`) : null;
  const one = selector => host()?.querySelector(selector) || null;
  const all = selector => host() ? [...host().querySelectorAll(selector)] : [];
  const setText = (selector, value) => {
    const node = one(selector);
    if (node) node.textContent = value;
  };

  function header(kicker, title, description) {
    return `<div class="concept-head">
      <div><span>${kicker}</span><h3>${title}</h3><p>${description}</p></div>
      <button type="button" data-rf-action="close">닫기</button>
    </div>`;
  }

  function status(label, message) {
    return `<div class="concept-status" aria-live="polite">
      <b data-rf-label>${label}</b><span data-rf-message>${message}</span>
    </div>`;
  }

  function announce(label, message) {
    setText('[data-rf-label]', label);
    setText('[data-rf-message]', message);
  }

  function experimentArm(name, values, biased) {
    const rows = [['신규 유저', values[0]], ['평균 MMR', values[1]], ['고핑', values[2]]];
    return `<div class="experiment-arm ${biased ? 'is-biased' : ''}" data-arm="${name}">
      <h4>${name}군</h4>
      <div class="experiment-bars">${rows.map(([label, value]) => `
        <div class="experiment-bar">
          <b><span>${label}</span><span>${value}%</span></b>
          <i style="--w:${value}%"></i>
        </div>`).join('')}</div>
    </div>`;
  }

  function mount116() {
    return `<section class="concept-demo">
      ${header('Q116 · 실험군 균형', '승률 차이가 기능 효과인지 구성 편향인지 가려내기', '편향 배정과 층화 무작위 배정을 번갈아 적용해 사전 특성의 균형을 비교해 보세요.')}
      <div class="mm-arena">
        <div class="experiment-balance" data-experiment>
          ${experimentArm('A', [28, 62, 18], true)}
          ${experimentArm('B', [51, 44, 33], true)}
        </div>
        <div class="experiment-result" data-experiment-result>A 승률 54% · B 승률 48% · 구성 편향 의심</div>
      </div>
      <div class="concept-controls">
        <button type="button" data-rf-action="naive116">편향 배정 보기</button>
        <button type="button" class="primary" data-rf-action="balance116">MMR·지역 층화 배정</button>
      </div>
      ${status('결과를 바로 믿을 수 없음', '승률만 비교하기 전에 배정 방식과 사전 특성의 균형을 확인해야 합니다.')}
    </section>`;
  }

  function balance116(balanced) {
    one('[data-experiment]').innerHTML = balanced
      ? experimentArm('A', [40, 53, 24], false) + experimentArm('B', [41, 52, 25], false)
      : experimentArm('A', [28, 62, 18], true) + experimentArm('B', [51, 44, 33], true);
    setText('[data-experiment-result]', balanced
      ? 'A 승률 51.2% · B 승률 49.8% · 보정된 상승폭 +1.4%p'
      : 'A 승률 54% · B 승률 48% · 구성 편향 의심');
    announce(
      balanced ? '비교 가능한 실험군' : '교란된 차이',
      balanced
        ? '사전 특성이 균형인 상태에서 신뢰구간과 가드레일 지표를 함께 봅니다.'
        : '관측된 승률 차이만으로 기능 효과라고 결론낼 수 없습니다.'
    );
  }

  function mount117() {
    return `<section class="concept-demo">
      ${header('Q117 · 오프라인 텔레메트리', '끊긴 동안 중요한 이벤트부터 보존하기', '버퍼 한도를 바꾼 뒤 이벤트를 쌓고 재연결해 우선순위 제거와 ACK 이후 삭제를 확인해 보세요.')}
      <div class="concept-controls">
        <label>로컬 버퍼 한도
          <input type="range" min="4" max="12" value="8" data-buffer-limit>
          <output data-buffer-limit-v>8개</output>
        </label>
      </div>
      <div class="mm-arena">
        <div class="telemetry-queue">
          <div class="telemetry-buffer" data-telemetry></div>
          <div class="telemetry-meter"><i data-telemetry-meter style="--fill:0%"></i></div>
          <div class="telemetry-stats">
            <span data-telemetry-count>0 queued</span><span data-telemetry-drop>0 dropped</span>
          </div>
        </div>
      </div>
      <div class="concept-controls">
        <button type="button" data-rf-action="offline117">오프라인 이벤트 12개 생성</button>
        <button type="button" class="primary" data-rf-action="reconnect117">재연결·배치 ACK</button>
        <button type="button" data-rf-action="reset">초기화</button>
      </div>
      ${status('내구성 있는 로컬 큐', '이벤트 ID·우선순위·TTL을 기록하고 서버 ACK를 받은 항목만 삭제합니다.')}
    </section>`;
  }

  function offline117() {
    const limit = Number(one('[data-buffer-limit]').value);
    const priority = { critical: 3, product: 2, debug: 1 };
    const events = Array.from({ length: 12 }, (_, index) => ({
      kind: index % 5 === 0 ? 'critical' : index % 3 === 0 ? 'product' : 'debug',
      index
    })).sort((a, b) => priority[b.kind] - priority[a.kind]);
    const kept = events.slice(0, limit);
    const dropped = 12 - limit;
    one('[data-telemetry]').innerHTML =
      kept.map(event => `<i class="telemetry-event ${event.kind}" style="--h:${30 + (event.index * 17) % 70}%"></i>`).join('') +
      Array.from({ length: dropped }, () => '<i class="telemetry-event debug is-dropped" style="--h:20%"></i>').join('');
    one('[data-telemetry-meter]').style.setProperty('--fill', `${limit / 12 * 100}%`);
    setText('[data-buffer-limit-v]', `${limit}개`);
    setText('[data-telemetry-count]', `${limit} queued`);
    setText('[data-telemetry-drop]', `${dropped} debug dropped`);
    active.queued = limit;
    announce('우선순위 기반 축출', '공간이 부족하면 critical·product를 남기고 오래된 debug부터 제거합니다.');
  }

  function reconnect117() {
    if (!active.queued) {
      announce('전송할 이벤트 없음', '먼저 오프라인 이벤트를 생성하세요.');
      return;
    }
    all('.telemetry-event:not(.is-dropped)').forEach(node => node.classList.add('is-dropped'));
    one('[data-telemetry-meter]').style.setProperty('--fill', '0%');
    setText('[data-telemetry-count]', '0 queued · batch B117 ACK');
    active.queued = 0;
    announce('멱등 배치 전송 완료', '이벤트 ID로 중복을 막고 서버 ACK 이후 로컬 레코드를 삭제했습니다.');
  }

  function mount118() {
    const steps = [
      ['CAPTURE', '최소 덤프'], ['SCRUB', 'PII·비밀 제거'], ['ENCRYPT', '건별 키'],
      ['UPLOAD', '동의·쿼터'], ['ACCESS', 'RBAC·TTL']
    ];
    return `<section class="concept-demo">
      ${header('Q118 · 개인정보 보호 크래시 덤프', '민감한 메모리를 그대로 업로드하지 않는 수집 파이프라인', '단계를 진행하며 최소 수집·로컬 삭제·암호화·동의·접근 통제가 적용되는 순서를 확인해 보세요.')}
      <div class="mm-arena">
        <div class="dump-pipeline">${steps.map(([name, detail], index) => `
          <div class="dump-step" data-dump="${index}"><b>${name}</b>${detail}</div>`).join('')}</div>
        <div class="dump-secret" data-dump-secret>memory: token=sk_live_ABC · email=user@example · stack=0x91AF</div>
      </div>
      <div class="concept-controls">
        <button type="button" class="primary" data-rf-action="dump118">다음 보호 단계</button>
        <button type="button" data-rf-action="reset">초기화</button>
      </div>
      ${status('민감 원본은 로컬에 있음', '가능하면 클라이언트에서 비밀 패턴과 불필요한 메모리 페이지부터 제거합니다.')}
    </section>`;
  }

  function dump118() {
    active.phase = Math.min(5, active.phase + 1);
    all('[data-dump]').forEach((node, index) => node.classList.toggle('is-on', index < active.phase));
    if (active.phase >= 2) {
      one('[data-dump="1"]').classList.add('is-redacted');
      one('[data-dump-secret]').classList.add('is-safe');
      setText('[data-dump-secret]', 'memory: token=[REDACTED] · email=[HASHED] · stack=module+0x1AF');
    }
    if (active.phase === 5) all('[data-dump]').forEach(node => node.classList.add('is-redacted'));
    const messages = [
      ['최소 덤프 생성', '전체 메모리가 아니라 스택·모듈·필요 페이지만 캡처합니다.'],
      ['로컬 스크럽', '토큰·이메일·경로 패턴을 업로드 전에 제거했습니다.'],
      ['건별 키 암호화', '전송과 저장 모두 사고 건별 키로 보호합니다.'],
      ['동의·쿼터 업로드', '사용자 고지와 네트워크·보관 예산을 적용합니다.'],
      ['제한된 접근', '사고 담당자만 접근하며 감사를 남기고 TTL 후 삭제합니다.']
    ];
    announce(...messages[active.phase - 1]);
  }

  function mount119() {
    const stages = [['QUEUE', '입장'], ['LOGIN', '세션'], ['WORLD', '이관'], ['PAYMENT', '사가'], ['RECOVERY', '불변식']];
    return `<section class="concept-demo">
      ${header('Q119 · 실전형 부하·장애 훈련', '정상 부하를 통과한 전체 경로에 장애를 주입하기', '합성 사용자 흐름을 먼저 실행하고 특정 단계에 장애를 넣어 복구와 불변식을 확인해 보세요.')}
      <div class="concept-controls">
        <label>장애 위치
          <select data-chaos-fault>
            <option value="2">WORLD timeout</option>
            <option value="3">PAYMENT response loss</option>
            <option value="0">QUEUE restart</option>
          </select>
        </label>
      </div>
      <div class="mm-arena">
        <div class="chaos-board">${stages.map(([name, detail], index) => `
          <div class="chaos-stage" data-chaos="${index}"><b>${name}</b>${detail}</div>`).join('')}</div>
        <div class="chaos-invariants">
          <span>세션 1개</span><span>결제 효과 1회</span><span>유실 예약 0</span>
        </div>
      </div>
      <div class="concept-controls">
        <button type="button" data-rf-action="load119">1만 합성 흐름</button>
        <button type="button" class="primary" data-rf-action="fault119">장애 주입·복구</button>
        <button type="button" data-rf-action="reset">초기화</button>
      </div>
      ${status('실제 경로와 격리된 환경', '운영과 같은 스키마·비율·타임아웃을 쓰되 실제 결제와 사용자 자산은 분리합니다.')}
    </section>`;
  }

  function load119() {
    all('[data-chaos]').forEach(node => node.classList.add('is-on'));
    active.loaded = true;
    announce('1만 흐름 안정', '지연만 보지 않고 세션·결제·예약 불변식을 계속 검사합니다.');
  }

  function fault119() {
    if (!active.loaded) {
      announce('부하 흐름이 없음', '먼저 종단 간 합성 흐름을 실행하세요.');
      return;
    }
    const index = Number(one('[data-chaos-fault]').value);
    const stage = one(`[data-chaos="${index}"]`);
    stage.classList.add('is-fault');
    setTimeout(() => {
      if (!active || active.id !== 119) return;
      stage.classList.remove('is-fault');
      stage.classList.add('is-safe');
      announce('복구 후 불변식 유지', '타임아웃·재시작에도 멱등성, lease, outbox가 중복과 유실을 막았습니다.');
    }, 120);
    announce('장애 주입', '실패 시점과 영향 범위를 기록하며 자동 복구를 기다립니다.');
  }

  function mount120() {
    return `<section class="concept-demo">
      ${header('Q120 · 리전 재해복구', '쓰기 권한을 격리한 뒤 대기 리전을 승격하기', '주 리전 장애, 이전 리전 fencing, 대기 리전 승격 순서를 직접 실행해 split brain 방지를 확인해 보세요.')}
      <div class="mm-arena">
        <div class="dr-map">
          <div class="region-box is-primary" data-region-a>
            <h4>REGION A · PRIMARY</h4>
            <div class="region-state">epoch 81</div><div class="region-state">write owner</div>
            <div class="region-state" data-a-state>healthy</div>
          </div>
          <div class="dr-link" data-dr-link>async replica<i></i><span data-dr-lag>lag 2s</span></div>
          <div class="region-box" data-region-b>
            <h4>REGION B · STANDBY</h4>
            <div class="region-state">epoch 80</div><div class="region-state">read replica</div>
            <div class="region-state" data-b-state>ready</div>
          </div>
          <div class="dr-fence" data-dr-fence>global lease owner A · epoch 81</div>
        </div>
      </div>
      <div class="concept-controls">
        <label>복제 지연
          <input type="range" min="0" max="30" value="2" data-dr-lag-input>
          <output data-dr-lag-v>2s</output>
        </label>
        <button type="button" data-rf-action="fail120">REGION A 장애</button>
        <button type="button" data-rf-action="fence120">A 쓰기 차단</button>
        <button type="button" class="primary" data-rf-action="promote120">B 승격·트래픽 전환</button>
      </div>
      ${status('RPO를 먼저 확인', '복제 지연과 외부 의존성, split-brain 차단 상태를 함께 판단합니다.')}
    </section>`;
  }

  function lag120(value) {
    setText('[data-dr-lag-v]', `${value}s`);
    setText('[data-dr-lag]', `lag ${value}s`);
    announce(Number(value) > 10 ? 'RPO 초과 위험' : 'RPO 범위', '복제 지연만큼 최근 쓰기가 유실될 수 있어 제품 정책과 비교합니다.');
  }

  function fail120() {
    one('[data-region-a]').classList.add('is-failed');
    setText('[data-a-state]', 'UNREACHABLE');
    one('[data-dr-link]').classList.add('is-cut');
    active.failed = true;
    announce('주 리전 장애 감지', '즉시 반대편 쓰기를 열지 않고 global lease를 확인합니다.');
  }

  function fence120() {
    if (!active.failed) {
      announce('장애 확인 필요', '정상 주 리전을 임의로 차단하지 않습니다.');
      return;
    }
    active.fenced = true;
    one('[data-region-a]').classList.remove('is-primary');
    setText('[data-dr-fence]', 'A lease revoked · next epoch 82 reserved for B');
    announce('이전 주 리전 쓰기 차단', 'A가 늦게 살아나도 epoch 81 쓰기는 저장 경계에서 거부됩니다.');
  }

  function promote120() {
    if (!active.fenced) {
      announce('승격 차단', '이전 주 리전 차단을 증명하지 못해 split brain 위험이 있습니다.');
      return;
    }
    one('[data-region-b]').classList.add('is-promoted', 'is-primary');
    setText('[data-b-state]', 'PRIMARY epoch 82 · traffic ON');
    setText('[data-dr-fence]', 'global lease owner B · epoch 82 · resume tokens rotated');
    announce('REGION B 승격 완료', 'edge route와 세션 토큰을 새 epoch로 전환하고 유실 범위를 안내합니다.');
  }

  const mounts = { 116: mount116, 117: mount117, 118: mount118, 119: mount119, 120: mount120 };

  function close(restoreFocus = true) {
    if (!active) return;
    const id = active.id;
    const target = document.querySelector(`[data-flow-host="${id}"]`);
    const opener = document.querySelector(`[data-flow-open="${id}"]`);
    if (target) target.innerHTML = '';
    if (opener) {
      opener.hidden = false;
      opener.setAttribute('aria-expanded', 'false');
      if (restoreFocus) opener.focus({ preventScroll: true });
    }
    active = null;
  }

  function open(id) {
    close(false);
    document.dispatchEvent(new CustomEvent('interview-demo-open', { detail: { id } }));
    active = { id, phase: 0, queued: 0, loaded: false, failed: false, fenced: false };
    const target = document.querySelector(`[data-flow-host="${id}"]`);
    const opener = document.querySelector(`[data-flow-open="${id}"]`);
    if (opener) {
      opener.hidden = true;
      opener.setAttribute('aria-expanded', 'true');
    }
    target.innerHTML = mounts[id]();
  }

  function reset() {
    const id = active.id;
    active = { id, phase: 0, queued: 0, loaded: false, failed: false, fenced: false };
    host().innerHTML = mounts[id]();
  }

  function init() {
    document.addEventListener('click', event => {
      const opener = event.target.closest('[data-flow-open]');
      if (opener) {
        const id = Number(opener.dataset.flowOpen);
        if (id >= 116 && id <= 120) {
          open(id);
          return;
        }
      }
      const button = event.target.closest('[data-rf-action]');
      if (!button || !active) return;
      const action = button.dataset.rfAction;
      if (action === 'close') close();
      if (action === 'reset') reset();
      if (action === 'naive116') balance116(false);
      if (action === 'balance116') balance116(true);
      if (action === 'offline117') offline117();
      if (action === 'reconnect117') reconnect117();
      if (action === 'dump118') dump118();
      if (action === 'load119') load119();
      if (action === 'fault119') fault119();
      if (action === 'fail120') fail120();
      if (action === 'fence120') fence120();
      if (action === 'promote120') promote120();
    });
    document.addEventListener('input', event => {
      if (event.target.matches('[data-buffer-limit]')) setText('[data-buffer-limit-v]', `${event.target.value}개`);
      if (event.target.matches('[data-dr-lag-input]')) lag120(event.target.value);
    });
    document.addEventListener('interview-demo-open', event => {
      if (active && active.id !== event.detail.id) close(false);
    });
  }

  window.ReliabilityFinal = { init };
})();
