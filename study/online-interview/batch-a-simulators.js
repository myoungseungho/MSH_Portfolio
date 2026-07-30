(function(){
  'use strict';
  let active=null;

  const head=(kicker,title,description)=>`<div class="concept-head"><div><span>${kicker}</span><h3>${title}</h3><p>${description}</p></div><button type="button" data-a-action="close">닫기</button></div>`;
  const status=(label,message)=>`<div class="concept-status" aria-live="polite"><b data-a-label>${label}</b><span data-a-message>${message}</span></div>`;
  const root=()=>active?document.querySelector(`[data-flow-host="${active.id}"]`):null;
  const q=selector=>root()?.querySelector(selector)||null;
  const qa=selector=>root()?[...root().querySelectorAll(selector)]:[];
  const reduced=()=>Boolean(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function text(selector,value){const node=q(selector);if(node)node.textContent=value;}
  function tell(label,message){text('[data-a-label]',label);text('[data-a-message]',message);}
  function after(fn,ms){
    if(!active)return;
    const run=active.run;
    const id=window.setTimeout(()=>{if(active)active.timers.delete(id);if(active&&active.run===run)fn();},reduced()?1:ms);
    active.timers.add(id);
  }
  function sleep(ms){return new Promise(resolve=>{if(!active){resolve(false);return;}const run=active.run;after(()=>resolve(Boolean(active&&active.run===run)),ms);});}
  function stop(){
    if(!active)return;
    active.run+=1;
    active.timers.forEach(id=>window.clearTimeout(id));
    active.timers.clear();
    if(active.interval!==null)window.clearInterval(active.interval);
    active.interval=null;
  }

  function q6Markup(){
    return `<section class="concept-demo" aria-label="다중 기기 세션 lease 실험">
      ${head('Q6 · 소유권 결투','PC와 콘솔 중 누가 이 계정의 세션을 소유할까?','접속 정책을 선택하고 두 기기에서 차례로 로그인해 lease 세대와 revoke를 확인하세요.')}
      <div class="lease-arena">
        <div class="lease-device" data-q6-device="PC"><b>PC</b><small data-q6-pc>offline</small></div>
        <div class="lease-center"><div class="lease-crown" data-q6-crown>LEASE<br>비어 있음</div><span class="lease-generation" data-q6-generation>generation 0</span></div>
        <div class="lease-device" data-q6-device="CONSOLE"><b>CONSOLE</b><small data-q6-console>offline</small></div>
      </div>
      <div class="concept-controls">
        <label class="lease-policy">정책 <select data-q6-policy><option value="new">새 접속이 이전 세션 종료</option><option value="old">기존 세션 유지</option></select></label>
        <button class="primary" type="button" data-a-action="q6-login" data-device="PC">PC 로그인</button>
        <button class="primary" type="button" data-a-action="q6-login" data-device="CONSOLE">콘솔 로그인</button>
        <button type="button" data-a-action="reset">초기화</button>
      </div>
      ${status('lease 비어 있음','online 플래그가 아니라 만료와 세대를 가진 소유권을 획득해야 합니다.')}
    </section>`;
  }

  function loginDevice(device){
    const policy=q('[data-q6-policy]').value;
    const previous=active.holder;
    if(previous===device){tell('같은 소유자 재요청',`${device}는 이미 generation ${active.generation} lease를 보유합니다.`);return;}
    if(previous&&policy==='old'){
      setDevice(device,'거부 · 기존 lease 존재','is-revoked');
      tell('접속 거부',`${previous}의 lease가 만료되지 않았으므로 ${device}는 소유권을 얻지 못했습니다.`);
      return;
    }
    active.generation+=1;
    active.holder=device;
    if(previous)setDevice(previous,`revoked by gen ${active.generation}`,'is-revoked');
    setDevice(device,`owner · gen ${active.generation}`,'is-owner');
    q('[data-q6-crown]').innerHTML=`LEASE<br>${device}`;
    q('[data-q6-crown]').classList.add('is-held');
    text('[data-q6-generation]',`generation ${active.generation}`);
    tell(previous?'소유권 이전 + revoke':'lease 원자적 획득',previous?`${device}가 새 세대를 획득했고 ${previous}의 민감 요청은 오래된 세대로 거부됩니다.`:`${device}만 계정 세션의 현재 소유자가 되었습니다.`);
  }

  function setDevice(device,label,className){
    const node=q(`[data-q6-device="${device}"]`);
    node.classList.remove('is-owner','is-revoked');
    node.classList.add(className);
    text(device==='PC'?'[data-q6-pc]':'[data-q6-console]',label);
  }

  function q7Markup(){
    return `<section class="concept-demo" aria-label="인증 토큰 갱신과 플레이 세션 분리 실험">
      ${head('Q7 · 두 개의 시계','토큰이 만료되면 게임 연결도 함께 끊어야 할까?','액세스 토큰 시계를 빠르게 돌려 인증 갱신과 플레이 세션의 생명주기를 비교하세요.')}
      <div class="token-lab">
        <div class="token-clock" data-q7-clock><div><b data-q7-time>12s</b><small>ACCESS TOKEN</small></div></div>
        <div class="token-system">
          <div class="token-node auth">인증 채널<br><small>refresh token 보관</small></div>
          <div class="token-pipe" data-q7-pipe></div>
          <div class="token-node game">게임 서버<br><small data-q7-claim>claim gen 1</small></div>
          <div class="token-session-link" data-q7-session></div>
        </div>
      </div>
      <div class="concept-controls">
        <label class="token-auto"><input type="checkbox" data-q7-auto checked> 만료 전 자동 갱신</label>
        <button class="primary" type="button" data-a-action="q7-start">시간 빠르게 흐르게</button>
        <button type="button" data-a-action="q7-refresh">수동 갱신</button>
        <button type="button" data-a-action="reset">초기화</button>
      </div>
      ${status('두 생명주기 정상','액세스 토큰은 12초 남았지만 게임 세션은 별도 lease로 연결되어 있습니다.')}
    </section>`;
  }

  function drawToken(){
    const life=Math.max(0,active.seconds/12*100);
    q('[data-q7-clock]')?.style.setProperty('--life',`${life}%`);
    text('[data-q7-time]',`${active.seconds}s`);
  }

  function refreshToken(manual){
    if(!active||active.refreshing)return;
    active.refreshing=true;
    q('[data-q7-pipe]')?.classList.add('is-refreshing');
    tell(manual?'수동 refresh 요청':'만료 전 refresh','플레이 소켓을 닫지 않고 인증 채널에서 새 claim을 발급합니다.');
    after(()=>{
      if(!active)return;
      active.seconds=12;
      active.claim+=1;
      active.refreshed=true;
      active.refreshing=false;
      drawToken();
      text('[data-q7-claim]',`claim gen ${active.claim}`);
      q('[data-q7-pipe]')?.classList.remove('is-refreshing');
      q('[data-q7-session]')?.classList.remove('is-limited');
      tell('갱신 완료 · 플레이 지속',`게임 서버에는 새 claim 세대 ${active.claim}만 전달됐고 캐릭터 연결은 한 번도 끊기지 않았습니다.`);
      if(active.interval!==null){window.clearInterval(active.interval);active.interval=null;}
    },700);
  }

  function startTokenClock(){
    if(active.interval!==null)return;
    q('[data-a-action="q7-start"]').disabled=true;
    active.interval=window.setInterval(()=>{
      if(!active||active.id!==7)return;
      active.seconds=Math.max(0,active.seconds-1);
      drawToken();
      if(active.seconds===3&&q('[data-q7-auto]').checked&&!active.refreshed)refreshToken(false);
      if(active.seconds===0){
        window.clearInterval(active.interval);active.interval=null;
        q('[data-q7-session]')?.classList.add('is-limited');
        tell('인증 claim 만료','민감 기능은 제한하지만 플레이 연결 실패와 동일시하지 않습니다. 수동 갱신으로 복구해 보세요.');
      }
    },reduced()?5:430);
  }

  function q8Markup(){
    return `<section class="concept-demo" aria-label="로비에서 월드로 소유권 이전 실험">
      ${head('Q8 · 소유권 에어록','월드 이동 실패 때 캐릭터는 어디에 남아야 할까?','실패 단계를 고르면 commit 전에는 로비가 소유권을 되가져가고, 성공 때만 월드가 획득합니다.')}
      <div class="airlock">
        <div class="air-zone lobby"><b>LOBBY</b><small>현재 owner</small></div>
        <div class="air-chamber"><b>TRANSFER</b><small>reserve → prepare → commit</small><i class="air-door left" data-q8-left></i><i class="air-door right" data-q8-right></i></div>
        <div class="air-zone world"><b>WORLD</b><small data-q8-world>capacity OK</small></div>
        <div class="air-owner" data-q8-owner>캐릭터<br>OWNER</div>
      </div>
      <div class="concept-controls">
        <label class="air-fail-select">장애 <select data-q8-fail><option value="reserve">reserve 실패</option><option value="prepare" selected>prepare 후 연결 단절</option><option value="none">정상 이동</option></select></label>
        <button class="primary" type="button" data-a-action="q8-transfer">월드 이동</button>
        <button type="button" data-a-action="q8-retry" disabled>대체 월드 재시도</button>
        <button type="button" data-a-action="reset">초기화</button>
      </div>
      ${status('로비가 소유권 보유','월드가 commit하기 전까지 캐릭터는 로비에서 사라지지 않습니다.')}
    </section>`;
  }

  async function transferWorld(retry){
    if(active.busy)return;
    active.busy=true;
    const failure=retry?'none':q('[data-q8-fail]').value;
    q('[data-a-action="q8-transfer"]').disabled=true;
    q('[data-a-action="q8-retry"]').disabled=true;
    q('[data-q8-left]')?.classList.add('is-open');
    tell('reserve lease 요청','로비가 owner인 상태에서 월드 슬롯을 짧게 예약합니다.');
    if(!await sleep(700))return;
    if(failure==='reserve'){returnWorld('예약 실패 · 로비 유지');return;}
    q('[data-q8-owner]')?.classList.add('in-chamber');
    q('[data-q8-left]')?.classList.remove('is-open');
    tell('prepare 완료 · 아직 미인계','캐릭터 준비 데이터는 갔지만 commit 전이므로 권위는 로비에 남아 있습니다.');
    if(!await sleep(760))return;
    if(failure==='prepare'){returnWorld('연결 단절 · lease 자동 만료');return;}
    q('[data-q8-right]')?.classList.add('is-open');
    tell('commit(H-8)','월드가 핸드오프 토큰을 소비하고 entity bind를 원자적으로 완료합니다.');
    if(!await sleep(720))return;
    q('[data-q8-owner]')?.classList.add('in-world');
    q('[data-q8-owner]')?.classList.remove('in-chamber');
    q('[data-q8-right]')?.classList.remove('is-open');
    active.busy=false;
    tell('월드로 소유권 이전 완료','이 시점부터 로비는 캐릭터 명령을 받지 않고 월드 서버만 권위를 가집니다.');
  }

  function returnWorld(reason){
    const owner=q('[data-q8-owner]');
    owner?.classList.add('is-returning');
    owner?.classList.remove('in-chamber');
    q('[data-q8-left]')?.classList.add('is-open');
    after(()=>{
      if(!active)return;
      owner?.classList.remove('is-returning');
      q('[data-q8-left]')?.classList.remove('is-open');
      q('[data-a-action="q8-retry"]').disabled=false;
      q('[data-a-action="q8-transfer"]').disabled=false;
      active.busy=false;
      tell(reason,'commit되지 않았으므로 로비 캐릭터를 복구하고 다른 건강한 월드로 재시도할 수 있습니다.');
    },650);
  }

  function q9Markup(){
    return `<section class="concept-demo" aria-label="유령 세션 lease 만료 실험">
      ${head('Q9 · 유령이 사라지는 시간','프로세스가 죽었는데 online 플래그는 누가 지울까?','heartbeat를 멈추고 Active부터 Expired까지 lease가 소유권을 회수하는 과정을 보세요.')}
      <div class="ghost-lab">
        <div class="ghost-avatar" data-q9-avatar>CHARACTER<br>S-77</div>
        <div class="lease-life">
          <div class="lease-countdown" data-q9-time>8s</div>
          <div class="heartbeat-line" data-q9-heart>♥ heartbeat 수신 중</div>
          <div class="lease-stages"><span class="lease-stage is-on">ACTIVE</span><span class="lease-stage">SUSPECT</span><span class="lease-stage">DISCONNECTED</span><span class="lease-stage">EXPIRED</span></div>
        </div>
      </div>
      <div class="concept-controls">
        <button class="danger" type="button" data-a-action="q9-stop">프로세스 비정상 종료</button>
        <button class="primary" type="button" data-a-action="q9-heartbeat">재접속 heartbeat</button>
        <button type="button" data-a-action="reset">초기화</button>
      </div>
      ${status('Active lease','정상 패킷과 heartbeat가 들어올 때마다 만료 시각이 앞으로 밀립니다.')}
    </section>`;
  }

  function startGhostDecay(){
    if(active.interval!==null)return;
    q('[data-q9-heart]')?.classList.add('is-stopped');
    text('[data-q9-heart]','heartbeat 중단');
    q('[data-a-action="q9-stop"]').disabled=true;
    tell('프로세스 종료 · 즉시 삭제하지 않음','서버는 close 이벤트 없이 죽을 수 있으므로 lease 시계로 생존 여부를 판단합니다.');
    active.interval=window.setInterval(()=>{
      if(!active||active.id!==9)return;
      active.seconds-=1;
      drawGhost();
      if(active.seconds<=0){window.clearInterval(active.interval);active.interval=null;}
    },reduced()?5:520);
  }

  function drawGhost(){
    const s=active.seconds;
    text('[data-q9-time]',`${Math.max(0,s)}s`);
    const avatar=q('[data-q9-avatar]');
    const stages=qa('.lease-stage');
    let index=0,label='Active lease',message='아직 소유권을 유지합니다.';
    avatar.classList.remove('is-suspect','is-disconnected','is-expired');
    if(s<=5){index=1;avatar.classList.add('is-suspect');label='Suspect';message='짧은 네트워크 흔들림일 수 있어 즉시 캐릭터를 제거하지 않습니다.';}
    if(s<=2){index=2;avatar.classList.add('is-disconnected');label='Disconnected';message='게임 입력은 막지만 재접속 유예 동안 엔티티를 보존합니다.';}
    if(s<=0){index=3;avatar.classList.add('is-expired');label='Expired · 소유권 회수';message='lease가 끝나 세션 디렉터리가 owner를 비우고 새 접속을 허용합니다.';}
    stages.forEach((node,i)=>{node.classList.toggle('is-on',i===index);node.classList.toggle('is-danger',i===index&&index>=2);});
    tell(label,message);
  }

  function heartbeat(){
    if(active.interval!==null){window.clearInterval(active.interval);active.interval=null;}
    const expired=active.seconds<=0;
    active.seconds=8;
    drawGhost();
    q('[data-q9-heart]')?.classList.remove('is-stopped');
    text('[data-q9-heart]','♥ heartbeat 수신 중');
    q('[data-a-action="q9-stop"]').disabled=false;
    tell(expired?'새 lease 획득':'기존 세션 재결합',expired?'이전 owner가 만료됐으므로 새 세대의 세션 lease를 얻습니다.':'만료 전에 돌아와 같은 S-77 엔티티에 다시 바인딩합니다.');
  }

  const regionSets={
    solo:[
      {name:'서울',rtt:24,loss:.2,jitter:3,queue:600},{name:'도쿄',rtt:48,loss:.1,jitter:4,queue:80},{name:'싱가포르',rtt:91,loss:.5,jitter:8,queue:30}
    ],
    busy:[
      {name:'서울',rtt:22,loss:.2,jitter:3,queue:2900},{name:'도쿄',rtt:51,loss:.1,jitter:4,queue:120},{name:'싱가포르',rtt:88,loss:.4,jitter:7,queue:20}
    ],
    party:[
      {name:'서울',rtt:118,loss:.4,jitter:9,queue:300},{name:'도쿄',rtt:72,loss:.2,jitter:5,queue:240},{name:'싱가포르',rtt:104,loss:.3,jitter:6,queue:80}
    ]
  };
  function q10Markup(){
    return `<section class="concept-demo" aria-label="리전 품질 기대값 비교">
      ${head('Q10 · 리전 선택 저울','가장 낮은 ping이 항상 가장 좋은 리전일까?','유저 상황을 바꾸며 RTT·손실·jitter·대기열을 합친 선택이 어떻게 달라지는지 확인하세요.')}
      <div class="region-lab">
        <div class="region-scenarios"><button class="is-selected" type="button" data-a-action="q10-scenario" data-scenario="solo">서울 솔로</button><button type="button" data-a-action="q10-scenario" data-scenario="busy">서울 과부하</button><button type="button" data-a-action="q10-scenario" data-scenario="party">한·일 파티</button></div>
        <div class="region-grid" data-q10-grid></div>
      </div>
      ${status('서울 선택','낮은 RTT와 감당 가능한 대기열을 합친 세션 품질 기대값이 가장 좋습니다.')}
    </section>`;
  }

  function renderRegions(scenario){
    const rows=regionSets[scenario].map(item=>{
      const score=item.rtt*.48+item.loss*28+item.jitter*1.7+item.queue*.028;
      return {...item,score};
    });
    const best=rows.reduce((a,b)=>a.score<b.score?a:b);
    qa('[data-scenario]').forEach(button=>button.classList.toggle('is-selected',button.dataset.scenario===scenario));
    const grid=q('[data-q10-grid]');
    if(grid)grid.innerHTML=rows.map(item=>`<section class="region-card ${item.name===best.name?'is-best':''}"><h4>${item.name}</h4>${metric('RTT',item.rtt,140,'ms')}${metric('loss',item.loss,2,'%')}${metric('jitter',item.jitter,20,'ms')}${metric('queue',item.queue,3000,'명')}<div class="region-score">비용 ${item.score.toFixed(1)}</div></section>`).join('');
    const reason=scenario==='busy'?'가까운 서울의 대기열 비용이 커져 도쿄가 더 빨리 게임을 시작할 기대값을 가집니다.':scenario==='party'?'한 명의 최저 ping이 아니라 파티 최악 지연을 줄이는 도쿄가 선택됩니다.':'거리뿐 아니라 실제 프로토콜 품질과 수용량이 함께 양호합니다.';
    tell(`${best.name} 선택`,reason);
  }
  function metric(label,value,max,unit){return `<div class="region-metric"><span>${label}</span><div class="region-bar"><i style="--value:${Math.min(100,value/max*100)}%"></i></div><b>${value}${unit}</b></div>`;}

  const markup={6:q6Markup,7:q7Markup,8:q8Markup,9:q9Markup,10:q10Markup};
  function freshState(id){
    return {id,run:0,timers:new Set(),interval:null,busy:false,holder:null,generation:0,seconds:id===9?8:12,claim:1,refreshed:false,refreshing:false};
  }
  function open(id){
    close(false);
    document.dispatchEvent(new CustomEvent('interview-demo-open',{detail:{id}}));
    active=freshState(id);
    const host=document.querySelector(`[data-flow-host="${id}"]`);
    const opener=document.querySelector(`[data-flow-open="${id}"]`);
    if(opener){opener.hidden=true;opener.setAttribute('aria-expanded','true');}
    if(host)host.innerHTML=markup[id]();
    if(id===10)renderRegions('solo');
  }
  function reset(){
    const id=active.id;
    stop();
    active=freshState(id);
    const host=document.querySelector(`[data-flow-host="${id}"]`);
    if(host)host.innerHTML=markup[id]();
    if(id===10)renderRegions('solo');
  }
  function close(focus=true){
    if(!active)return;
    const id=active.id;
    stop();
    const host=document.querySelector(`[data-flow-host="${id}"]`);
    const opener=document.querySelector(`[data-flow-open="${id}"]`);
    if(host)host.innerHTML='';
    if(opener){opener.hidden=false;opener.setAttribute('aria-expanded','false');if(focus)opener.focus({preventScroll:true});}
    active=null;
  }

  function init(){
    document.addEventListener('click',event=>{
      const opener=event.target.closest('[data-flow-open]');
      if(opener){const id=Number(opener.dataset.flowOpen);if(id>=6&&id<=10){open(id);return;}}
      const button=event.target.closest('[data-a-action]');
      if(!button||!active)return;
      const action=button.dataset.aAction;
      if(action==='close')close();
      if(action==='reset')reset();
      if(action==='q6-login')loginDevice(button.dataset.device);
      if(action==='q7-start')startTokenClock();
      if(action==='q7-refresh')refreshToken(true);
      if(action==='q8-transfer')transferWorld(false);
      if(action==='q8-retry')transferWorld(true);
      if(action==='q9-stop')startGhostDecay();
      if(action==='q9-heartbeat')heartbeat();
      if(action==='q10-scenario')renderRegions(button.dataset.scenario);
    });
    document.addEventListener('interview-demo-open',event=>{if(active&&active.id!==event.detail.id)close(false);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop();});
  }
  window.BatchASimulators={init};
})();
