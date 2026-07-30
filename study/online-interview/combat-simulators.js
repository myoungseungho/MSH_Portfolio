(function(){
  'use strict';
  let active=null;
  const head=(k,t,d)=>`<div class="concept-head"><div><span>${k}</span><h3>${t}</h3><p>${d}</p></div><button type="button" data-combat-action="close">닫기</button></div>`;
  const status=(l,m)=>`<div class="concept-status" aria-live="polite"><b data-combat-label>${l}</b><span data-combat-message>${m}</span></div>`;
  const root=()=>active?document.querySelector(`[data-flow-host="${active.id}"]`):null;
  const q=s=>root()?.querySelector(s)||null;
  const qa=s=>root()?[...root().querySelectorAll(s)]:[];
  const reduced=()=>Boolean(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function text(s,v){const n=q(s);if(n)n.textContent=v;}
  function tell(l,m){text('[data-combat-label]',l);text('[data-combat-message]',m);}
  function after(fn,ms){if(!active)return;const run=active.run;const id=window.setTimeout(()=>{if(active)active.timers.delete(id);if(active&&active.run===run)fn();},reduced()?1:ms);active.timers.add(id);}
  function stop(){if(!active)return;active.run+=1;active.timers.forEach(id=>window.clearTimeout(id));active.timers.clear();if(active.interval!==null)window.clearInterval(active.interval);active.interval=null;}

  function q11Markup(){
    return `<section class="concept-demo" aria-label="클라이언트 타격 예측과 서버 확정 실험">
      ${head('Q11 · 두 번의 타격감','화면에서는 맞았는데 서버에서는 왜 빗나갈까?','지연을 바꾸고 발사하면 클라이언트 후보 이펙트와 늦게 도착하는 서버 판정을 따로 볼 수 있습니다.')}
      <div class="hit-field"><div class="hit-ghost"></div><div class="hit-target" data-hit-target></div><div class="hit-crosshair"></div><div class="hit-spark" data-hit-spark></div><div class="hit-verdict" data-hit-verdict>판정 대기</div></div>
      <div class="concept-controls"><label class="latency-control">왕복 지연 <input type="range" min="20" max="200" step="20" value="80" data-hit-latency><output data-hit-latency-value>80ms</output></label><button class="primary" type="button" data-combat-action="shoot">발사</button><button type="button" data-combat-action="reset">초기화</button></div>
      ${status('클라이언트 조준점','점선 실루엣은 클라이언트가 보고 있는 과거 위치이고, 진한 표적은 현재 서버 위치입니다.')}
    </section>`;
  }
  function setLatency(value){
    active.latency=Number(value);
    const offset=Math.min(27,Math.max(0,(active.latency-40)*.17));
    q('[data-hit-target]')?.style.setProperty('--target',`${50+offset}%`);
    text('[data-hit-latency-value]',`${active.latency}ms`);
    tell('서버 표적 이동',`지연 때문에 클라이언트 화면과 서버 현재 위치가 ${Math.round(offset)}%만큼 벌어졌습니다.`);
  }
  function shoot(){
    if(active.busy)return;
    active.busy=true;
    const spark=q('[data-hit-spark]');
    spark?.classList.remove('is-on');void spark?.offsetWidth;spark?.classList.add('is-on');
    q('[data-hit-verdict]').className='hit-verdict';
    text('[data-hit-verdict]','후보 HIT');
    tell('즉시 후보 이펙트','클라이언트는 shot ID와 함께 소리·불꽃을 먼저 보여주지만 피해 숫자는 아직 확정하지 않습니다.');
    after(()=>{
      if(!active)return;
      const confirm=active.latency<=60;
      const verdict=q('[data-hit-verdict]');
      verdict.className=`hit-verdict ${confirm?'confirm':'reject'}`;
      verdict.textContent=confirm?'SERVER CONFIRM':'SERVER REJECT';
      tell(confirm?'확정 타격 · 피해 적용':'빗나감 교정',confirm?'서버 권위 hitbox에도 명중해 피해와 경직을 확정합니다.':'후보 이펙트는 짧게 끝내고 피해·콤보 상태는 만들지 않습니다.');
      active.busy=false;
    },Math.max(280,active.latency*3));
  }

  function q12Markup(){
    return `<section class="concept-demo" aria-label="동시 아이템 획득 경쟁 실험">
      ${head('Q12 · 단 한 번 열리는 자물쇠','동시에 주웠다는 두 요청 중 누가 아이템을 받을까?','두 요청을 같은 순간 출발시켜 Available → Claimed 전이가 한 번만 성공하는지 확인하세요.')}
      <div class="claim-arena">
        <div class="claim-player"><div class="claim-avatar">PLAYER A</div><div class="claim-beam" data-claim-beam="A"></div><div class="claim-inventory" data-inventory="A">inventory 비어 있음</div></div>
        <div class="claim-center"><div class="claim-item" data-claim-item>ITEM<br>Available v1</div><div class="claim-cas" data-claim-cas>CAS 대기</div></div>
        <div class="claim-player"><div class="claim-avatar">PLAYER B</div><div class="claim-beam" data-claim-beam="B"></div><div class="claim-inventory" data-inventory="B">inventory 비어 있음</div></div>
      </div>
      <div class="concept-controls"><button class="primary" type="button" data-combat-action="race">동시에 줍기</button><button type="button" data-combat-action="reset">아이템 다시 생성</button></div>
      ${status('Available v1','삭제 순서가 아니라 한 번만 가능한 상태 전이가 승자를 정합니다.')}
    </section>`;
  }
  function raceItem(){
    if(active.busy)return;
    active.busy=true;
    qa('[data-claim-beam]').forEach(n=>n.className='claim-beam is-racing');
    text('[data-claim-cas]','A와 B가 owner=null, version=1 비교 중');
    tell('두 Claim 명령 동시 도착','서버의 단일 실행 구간에서 두 요청이 같은 v1을 읽어도 commit은 하나씩 진행됩니다.');
    after(()=>{
      const winner=active.round%2===0?'A':'B',loser=winner==='A'?'B':'A';
      active.round+=1;
      q(`[data-claim-beam="${winner}"]`).className='claim-beam is-winner';
      q(`[data-claim-beam="${loser}"]`).className='claim-beam is-loser';
      q('[data-claim-item]')?.classList.add('is-claimed');
      q('[data-claim-item]').innerHTML=`Claimed<br>owner ${winner} · v2`;
      text(`[data-inventory="${winner}"]`,'지급 tx-812 완료');
      text(`[data-inventory="${loser}"]`,'실패 · 이미 Claimed');
      text('[data-claim-cas]',`${winner}: CAS 성공 / ${loser}: version 불일치`);
      tell(`${winner}만 획득`,`아이템 상태 전이와 ${winner}의 인벤토리 지급에 하나의 transaction ID가 생겼습니다.`);
      active.busy=false;
    },720);
  }

  function q13Markup(){
    return `<section class="concept-demo" aria-label="클라이언트 예측 재조정 실험">
      ${head('Q13 · 되감고 다시 재생하기','서버 위치와 어긋난 예측을 어떻게 부드럽게 고칠까?','서버 snapshot을 받아 시뮬레이션은 정확히 되감고, 화면 표현만 천천히 따라오게 해보세요.')}
      <div class="reconcile-field">
        <div class="reconcile-label"><span>서버 권위 snapshot · ack 103</span><span>클라이언트 예측 · seq 105</span></div><div class="reconcile-track"></div>
        <div class="reconcile-visual" data-rec-visual>화면</div><div class="reconcile-server" data-rec-server>SERVER</div><div class="reconcile-client" data-rec-client>SIM</div>
        <div class="input-history">${[101,102,103,104,105].map(n=>`<span class="input-chip" data-input-seq="${n}">input ${n}</span>`).join('')}</div>
      </div>
      <div class="concept-controls"><button class="primary" type="button" data-combat-action="reconcile">서버 snapshot 적용</button><button type="button" data-combat-action="reset">초기화</button></div>
      ${status('예측이 서버보다 앞섬','클라이언트는 105까지 실행했지만 서버는 103까지만 확인한 상태입니다.')}
    </section>`;
  }
  function reconcile(){
    if(active.busy)return;
    active.busy=true;
    const client=q('[data-rec-client]'),visual=q('[data-rec-visual]');
    client?.style.setProperty('--client','58%');
    qa('[data-input-seq]').forEach(n=>n.classList.toggle('is-acked',Number(n.dataset.inputSeq)<=103));
    tell('1. simulation rewind','시뮬레이션 root를 서버 snapshot의 정확한 위치와 ack 103으로 즉시 되돌립니다.');
    after(()=>{
      client?.style.setProperty('--client','68%');
      tell('2. 미확정 입력 replay','아직 서버가 확인하지 않은 input 104와 105를 같은 규칙으로 다시 실행합니다.');
      after(()=>{
        visual?.style.setProperty('--visual','68%');
        tell('3. visual root 감쇠','판정용 위치는 이미 정확하지만 화면의 캐릭터만 새 위치로 부드럽게 따라갑니다.');
        active.busy=false;
      },520);
    },650);
  }

  function doorBox(kind,label,angle,extra=''){return `<section class="door-client ${extra}" data-door-client="${kind}"><h4>${label}</h4><div class="door-frame"><div class="door-panel" data-door-panel="${kind}" style="--door-angle:${angle}deg"></div></div><div class="door-version" data-door-version="${kind}">Closed · v1</div><div class="door-event-log" data-door-events="${kind}"></div></section>`;}
  function q14Markup(){
    return `<section class="concept-demo" aria-label="문 상태 이벤트와 스냅샷 복원 비교">
      ${head('Q14 · 늦게 들어온 관찰자','문 열림 이벤트를 놓친 사람은 현재 상태를 어떻게 알까?','기존 클라이언트에서 문을 열고, 늦게 접속한 클라이언트에 이벤트 또는 상태를 전달해 비교하세요.')}
      <div class="door-lab"><section class="door-server"><h4>SERVER STATE</h4><div class="door-frame"><div class="door-panel" data-door-panel="server"></div></div><div class="door-version" data-door-version="server">Closed · v1</div><div class="door-event-log"><span class="door-event">state owner</span></div></section>${doorBox('A','CLIENT A · 기존 접속',0)}${doorBox('B','CLIENT B · 늦은 접속',0)}</div>
      <div class="concept-controls"><button class="primary" type="button" data-combat-action="door-open">서버에서 문 열기</button><button type="button" data-combat-action="door-late-event">B에게 이벤트 로그만</button><button type="button" data-combat-action="door-late-state">B에게 최신 상태 snapshot</button><button type="button" data-combat-action="reset">초기화</button></div>
      ${status('Closed · version 1','서버는 상태와 전이 시작 시간을 소유합니다.')}
    </section>`;
  }
  function openDoor(){
    active.doorOpen=true;
    ['server','A'].forEach(k=>{q(`[data-door-panel="${k}"]`)?.style.setProperty('--door-angle','76deg');text(`[data-door-version="${k}"]`,'Open · v2 · serverTime 18.4');});
    q('[data-door-events="A"]').innerHTML='<span class="door-event">Opening(v2)</span><span class="door-event">Open(v2)</span>';
    tell('서버 상태 Open · v2','기존 접속자 A는 전이 이벤트를 보며 문 애니메이션을 재생합니다.');
  }
  function lateDoor(useState){
    if(!active.doorOpen){tell('먼저 문을 여세요','B가 늦게 들어오기 전에 서버 상태를 변경해 비교합니다.');return;}
    const box=q('[data-door-client="B"]');
    box.classList.remove('is-stale','is-synced');
    box.classList.add(useState?'is-synced':'is-stale');
    if(useState){
      q('[data-door-panel="B"]')?.style.setProperty('--door-angle','76deg');
      text('[data-door-version="B"]','Open · v2 · 현재 위치 계산');
      q('[data-door-events="B"]').innerHTML='<span class="door-event">snapshot Open(v2)</span>';
      tell('상태 snapshot으로 즉시 복원','B는 과거 이벤트를 몰라도 Open 상태와 전이 시간을 이용해 현재 문 위치를 계산합니다.');
    }else{
      q('[data-door-panel="B"]')?.style.setProperty('--door-angle','0deg');
      text('[data-door-version="B"]','Closed · v1 · 모순');
      q('[data-door-events="B"]').innerHTML='<span class="door-event is-missed">Opening 놓침</span><span class="door-event is-missed">Open 놓침</span>';
      tell('이벤트만으로 복원 실패','접속 전 이벤트를 받지 못한 B는 서버의 현재 상태와 모순된 닫힌 문을 봅니다.');
    }
  }

  const samples=[8,19,27,46,50,72,78,93];
  function q15Markup(){
    return `<section class="concept-demo" aria-label="20Hz snapshot과 120FPS 보간 실험">
      ${head('Q15 · 안정된 과거 재생','20Hz 위치를 120FPS처럼 부드럽게 보이려면?','보간 버퍼 지연을 바꾸고 같은 불규칙 snapshot을 재생해 움직임을 비교하세요.')}
      <div class="interp-lab"><div class="interp-stage"><div class="interp-render-time" data-interp-time>render time 준비</div><div class="interp-axis"></div>${samples.map((p,i)=>`<i class="interp-sample" style="left:${p}%" data-tick="${i*50}ms"></i>`).join('')}<div class="interp-actor" data-interp-actor>REMOTE</div><div class="interp-buffer" data-interp-buffer></div></div></div>
      <div class="concept-controls"><label class="interp-controls">과거 재생 지연 <input type="range" min="0" max="200" step="50" value="100" data-interp-delay><output data-interp-delay-value>100ms</output></label><button class="primary" type="button" data-combat-action="interp-play">snapshot 재생</button><button type="button" data-combat-action="reset">초기화</button></div>
      ${status('100ms 과거를 재생','두 snapshot 사이를 시간 기준으로 샘플링할 여유가 있어 jitter를 움직임으로 드러내지 않습니다.')}
    </section>`;
  }
  function setInterpDelay(value){
    active.delay=Number(value);
    text('[data-interp-delay-value]',`${active.delay}ms`);
    q('[data-interp-buffer]')?.style.setProperty('--buffer',`${Math.min(86,active.delay/200*86)}%`);
    tell(active.delay===0?'버퍼 없음 · 최신값 즉시 적용':`${active.delay}ms 과거 재생`,active.delay===0?'패킷 도착 간격이 그대로 화면의 멈춤과 점프로 보입니다.':'render time을 server time보다 뒤에 두어 snapshot 사이를 안정적으로 보간합니다.');
  }
  function playInterp(){
    if(active.interval!==null)return;
    active.sample=0;
    q('[data-combat-action="interp-play"]').disabled=true;
    active.interval=window.setInterval(()=>{
      if(!active||active.id!==15)return;
      const i=active.sample;
      if(i>=samples.length){window.clearInterval(active.interval);active.interval=null;q('[data-combat-action="interp-play"]').disabled=false;tell('재생 완료',active.delay?'불규칙한 수신 간격을 안정된 시간축으로 바꿨습니다.':'snapshot의 불규칙함이 그대로 원격 캐릭터의 점프가 됐습니다.');return;}
      const renderIndex=active.delay===0?i:Math.max(0,i-2);
      const actor=q('[data-interp-actor]');
      actor?.style.setProperty('--move-time',active.delay===0?'.04s':'.48s');
      actor?.style.setProperty('left',`${samples[renderIndex]}%`);
      text('[data-interp-time]',`수신 ${i*50}ms · 화면 ${Math.max(0,i*50-active.delay)}ms`);
      active.sample+=1;
    },reduced()?5:430);
  }

  const markup={11:q11Markup,12:q12Markup,13:q13Markup,14:q14Markup,15:q15Markup};
  function state(id){return{id,run:0,timers:new Set(),interval:null,busy:false,latency:80,round:0,doorOpen:false,delay:100,sample:0};}
  function open(id){close(false);document.dispatchEvent(new CustomEvent('interview-demo-open',{detail:{id}}));active=state(id);const host=document.querySelector(`[data-flow-host="${id}"]`),opener=document.querySelector(`[data-flow-open="${id}"]`);if(opener){opener.hidden=true;opener.setAttribute('aria-expanded','true');}if(host)host.innerHTML=markup[id]();if(id===11)setLatency(80);if(id===15)setInterpDelay(100);}
  function reset(){const id=active.id;stop();active=state(id);const host=document.querySelector(`[data-flow-host="${id}"]`);if(host)host.innerHTML=markup[id]();if(id===11)setLatency(80);if(id===15)setInterpDelay(100);}
  function close(focus=true){if(!active)return;const id=active.id;stop();const host=document.querySelector(`[data-flow-host="${id}"]`),opener=document.querySelector(`[data-flow-open="${id}"]`);if(host)host.innerHTML='';if(opener){opener.hidden=false;opener.setAttribute('aria-expanded','false');if(focus)opener.focus({preventScroll:true});}active=null;}
  function init(){
    document.addEventListener('click',event=>{
      const opener=event.target.closest('[data-flow-open]');if(opener){const id=Number(opener.dataset.flowOpen);if(id>=11&&id<=15){open(id);return;}}
      const button=event.target.closest('[data-combat-action]');if(!button||!active)return;const action=button.dataset.combatAction;
      if(action==='close')close();if(action==='reset')reset();if(action==='shoot')shoot();if(action==='race')raceItem();if(action==='reconcile')reconcile();if(action==='door-open')openDoor();if(action==='door-late-event')lateDoor(false);if(action==='door-late-state')lateDoor(true);if(action==='interp-play')playInterp();
    });
    document.addEventListener('input',event=>{if(event.target.matches('[data-hit-latency]'))setLatency(event.target.value);if(event.target.matches('[data-interp-delay]'))setInterpDelay(event.target.value);});
    document.addEventListener('interview-demo-open',event=>{if(active&&active.id!==event.detail.id)close(false);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop();});
  }
  window.CombatSimulators={init};
})();
