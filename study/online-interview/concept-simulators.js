(function(){
  'use strict';

  let active=null;

  const head=(kicker,title,description)=>`<div class="concept-head"><div><span>${kicker}</span><h3>${title}</h3><p>${description}</p></div><button type="button" data-concept-action="close">닫기</button></div>`;
  const status=(label,message)=>`<div class="concept-status" aria-live="polite"><b data-concept-label>${label}</b><span data-concept-message>${message}</span></div>`;

  function q(selector){
    return active?document.querySelector(`[data-flow-host="${active.id}"]`)?.querySelector(selector):null;
  }

  function setStatus(label,message){
    const labelNode=q('[data-concept-label]');
    const messageNode=q('[data-concept-message]');
    if(labelNode) labelNode.textContent=label;
    if(messageNode) messageNode.textContent=message;
  }

  function later(callback,ms){
    if(!active) return null;
    const run=active.run;
    const id=window.setTimeout(()=>{
      if(active) active.timers.delete(id);
      if(active&&active.run===run) callback();
    },reduceMotion()?1:ms);
    active.timers.add(id);
    return id;
  }

  function wait(ms){
    return new Promise(resolve=>{
      if(!active){resolve(false);return;}
      const run=active.run;
      later(()=>resolve(Boolean(active&&active.run===run)),ms);
    });
  }

  function reduceMotion(){
    return Boolean(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function stop(){
    if(!active) return;
    active.run+=1;
    active.timers.forEach(id=>window.clearTimeout(id));
    active.timers.clear();
    if(active.interval!==null) window.clearInterval(active.interval);
    active.interval=null;
  }

  function q2Markup(){
    const stations=[
      ['인증','계정 확인'],['정책','약관·제재'],['예약','월드 lease'],['인계','handoff'],['게임','entity bind']
    ];
    return `<section class="concept-demo q2-demo" aria-label="단계별 접속 복구 실험">
      ${head('Q2 · 체크포인트 여정','연결이 끊기면 어디서부터 다시 시작해야 할까?','끊김 지점을 선택한 뒤 접속을 출발시키고, 마지막 안전 체크포인트에서 복구해 보세요.')}
      <div class="journey">
        <div class="journey-line"><div class="journey-progress" data-q2-progress></div></div>
        <div class="journey-token" data-q2-token>접속</div>
        <div class="journey-stations">${stations.map((s,i)=>`<div class="journey-stop" data-q2-stop="${i}"><i></i><strong>${s[0]}</strong><small>${s[1]}</small></div>`).join('')}</div>
      </div>
      <div class="concept-controls">
        <label class="journey-cut-select">연결을 끊을 지점
          <select data-q2-cut>
            <option value="0">인증 직후</option>
            <option value="2">월드 예약 직후</option>
            <option value="3" selected>핸드오프 도중</option>
          </select>
        </label>
        <button class="primary" type="button" data-concept-action="q2-start">접속 시작</button>
        <button type="button" data-concept-action="q2-resume" disabled>재접속</button>
        <button type="button" data-concept-action="q2-reset">초기화</button>
      </div>
      ${status('준비','핸드오프는 여러 서버가 차례로 소유권을 넘기는 분산 상태 머신입니다.')}
    </section>`;
  }

  function setQ2Position(index,done){
    const positions=[10,30,50,70,90];
    const token=q('[data-q2-token]');
    const progress=q('[data-q2-progress]');
    if(token) token.style.setProperty('--token',`${positions[index]}%`);
    if(progress) progress.style.setProperty('--progress',`${Math.max(0,(positions[index]-10)/.8)}%`);
    document.querySelectorAll(`[data-flow-host="${active.id}"] [data-q2-stop]`).forEach((node,i)=>{
      node.classList.toggle('is-current',i===index&&!done);
      node.classList.toggle('is-done',i<index||(done&&i===index));
      node.classList.toggle('is-owner',i===index);
    });
  }

  async function runQ2(resuming){
    if(!active||active.busy) return;
    active.busy=true;
    const cutSelect=q('[data-q2-cut]');
    const startButton=q('[data-concept-action="q2-start"]');
    const resumeButton=q('[data-concept-action="q2-resume"]');
    const cut=resuming?-1:Number(cutSelect.value);
    const start=resuming?active.lastCheckpoint+1:0;
    if(startButton) startButton.disabled=true;
    if(resumeButton) resumeButton.disabled=true;
    if(cutSelect) cutSelect.disabled=true;
    const token=q('[data-q2-token]');
    if(token) token.classList.remove('is-cut');
    if(!resuming){
      active.lastCheckpoint=-1;
      document.querySelectorAll(`[data-flow-host="${active.id}"] [data-q2-stop]`).forEach(node=>node.className='journey-stop');
      setQ2Position(0,false);
    }
    setStatus(resuming?'체크포인트 복구':`접속 시도 C-21`,`클라이언트가 ${resuming?'마지막 완료 단계 다음':'인증 단계'}부터 진행합니다.`);

    const names=['인증 서버','정책 서버','월드 예약 서비스','접속 조정자','게임 서버'];
    for(let i=start;i<5;i++){
      setQ2Position(i,false);
      setStatus(`${names[i]}가 소유권 보유`,i===3?'H-8 토큰을 만들었지만 아직 게임 엔티티 소유권은 넘어가지 않았습니다.':`${i+1}번째 단계를 실행하고 완료 기록을 서버에 남깁니다.`);
      if(!await wait(760)) return;
      if(i<=2||i===4) active.lastCheckpoint=i;
      setQ2Position(i,true);
      if(i===cut){
        if(token) token.classList.add('is-cut');
        active.busy=false;
        if(resumeButton) resumeButton.disabled=false;
        if(cutSelect) cutSelect.disabled=false;
        setStatus('연결 단절',`클라이언트가 아는 마지막 안전 체크포인트는 ${active.lastCheckpoint<0?'없음':names[active.lastCheckpoint]}입니다. 재접속을 눌러 보세요.`);
        return;
      }
    }
    active.busy=false;
    if(cutSelect) cutSelect.disabled=false;
    if(startButton) startButton.disabled=false;
    setStatus('게임 서버 인계 완료','H-8을 소비하고 entity bind가 끝난 시점에만 소유권이 게임 서버로 넘어갑니다.');
  }

  function resetQ2(){
    stop();
    active.run+=1;
    active.busy=false;
    active.lastCheckpoint=-1;
    const root=document.querySelector(`[data-flow-host="${active.id}"]`);
    if(root) root.innerHTML=q2Markup();
  }

  function q3Markup(){
    return `<section class="concept-demo q3-demo" aria-label="네트워크 경로와 플레이 세션 분리 실험">
      ${head('Q3 · 경로 전환 실험','Wi-Fi가 끊겨도 캐릭터는 왜 사라지지 않을까?','소켓 경로를 끊어 보고, 살아 있는 서버 세션에 LTE 경로를 다시 결합하세요.')}
      <div class="route-world">
        <div class="route-client"><b>클라이언트</b><small data-q3-client>Wi-Fi 연결</small></div>
        <div class="route-path wifi" data-q3-wifi></div><span class="route-label wifi">Wi-Fi socket</span>
        <div class="route-path lte" data-q3-lte></div><span class="route-label lte">LTE socket</span>
        <div class="route-server"><b>게임 서버</b><div class="route-session" data-q3-session>S-77<br>Active</div></div>
        <div class="route-resume-token" data-q3-token>resume token</div>
        <div class="route-legend">경로와 무관하게 서버의 <b>플레이 세션은 제자리에 유지</b></div>
      </div>
      <div class="concept-controls">
        <button class="primary" type="button" data-concept-action="q3-switch">Wi-Fi를 끊고 LTE로 전환</button>
        <button class="danger" type="button" data-concept-action="q3-replay" disabled>이전 토큰 재사용 시도</button>
        <button type="button" data-concept-action="q3-reset">초기화</button>
      </div>
      ${status('Wi-Fi 연결 중','현재 소켓과 세션은 연결되어 있지만 같은 생명주기를 가진 객체는 아닙니다.')}
    </section>`;
  }

  function animateRouteToken(kind){
    const token=q('[data-q3-token]');
    if(!token) return;
    token.className=`route-resume-token ${kind}`;
    void token.offsetWidth;
    token.className=`route-resume-token ${kind}`;
  }

  async function switchRoute(){
    if(!active||active.busy) return;
    active.busy=true;
    q('[data-concept-action="q3-switch"]').disabled=true;
    q('[data-q3-wifi]')?.classList.add('is-broken');
    q('[data-q3-session]')?.classList.add('is-safe');
    q('[data-q3-client]').textContent='경로 없음';
    q('[data-q3-session]').innerHTML='S-77<br>Grace 15s';
    setStatus('소켓만 단절','게임 서버는 S-77과 캐릭터 엔티티를 지우지 않고 유예 상태로 유지합니다.');
    if(!await wait(760)) return;
    q('[data-q3-lte]')?.classList.add('is-active');
    q('[data-q3-client]').textContent='LTE 재접속';
    animateRouteToken('is-moving');
    setStatus('Resume(S-77, token)','새 경로가 세션을 새로 만들지 않고 기존 S-77에 다시 묶어 달라고 증명합니다.');
    if(!await wait(1050)) return;
    q('[data-q3-session]').innerHTML='S-77<br>Active · epoch 2';
    q('[data-q3-client]').textContent='LTE 연결 완료';
    q('[data-concept-action="q3-replay"]').disabled=false;
    active.switched=true;
    active.busy=false;
    setStatus('재결합 완료','경로는 Wi-Fi에서 LTE로 바뀌었지만 플레이 세션과 캐릭터의 정체성은 이어졌습니다.');
  }

  async function replayToken(){
    if(!active||active.busy) return;
    active.busy=true;
    animateRouteToken('is-rejected');
    setStatus('old token 재사용','이미 소비한 epoch 1 토큰이 서버로 접근합니다.');
    if(!await wait(820)) return;
    q('[data-q3-session]')?.classList.add('is-safe');
    setStatus('Fencing으로 거부','서버는 현재 epoch 2보다 오래된 연결의 입력을 버립니다. S-77의 권위 주체는 하나로 유지됩니다.');
    active.busy=false;
  }

  function resetCurrent(markup){
    stop();
    const id=active.id;
    active={id,run:0,timers:new Set(),interval:null,busy:false,model:id===5?{tick:0,queue:0,arrival:0,rate:700,capacity:1000,admitted:0,throughput:0}:null};
    const root=document.querySelector(`[data-flow-host="${id}"]`);
    if(root) root.innerHTML=markup;
    if(id===5){
      q('[data-q5-crowd]').innerHTML=crowdMarkup(0);
      renderQueue();
    }
  }

  const capData={
    '3.7':{major:3,caps:['movement-v3','voice','market-v2','photo'],match:['movement-v3','voice','market-v2','photo']},
    '3.2':{major:3,caps:['movement-v3','voice','market-v1','legacy-chat'],match:['movement-v3','voice']},
    '2.9':{major:2,caps:['movement-v2','voice','market-v1'],match:[]}
  };
  const serverCaps=['movement-v3','voice','market-v2','photo','replay'];

  function q4Markup(){
    return `<section class="concept-demo q4-demo" aria-label="클라이언트 서버 기능 계약 협상 실험">
      ${head('Q4 · 기능 계약 조립','버전 숫자가 다르면 무조건 접속을 막아야 할까?','클라이언트 버전을 바꿔 공통 capability가 어떻게 계약으로 조립되는지 확인하세요.')}
      <div class="contract-lab">
        <div class="contract-versions">${['3.7','3.2','2.9'].map(v=>`<button type="button" data-concept-action="q4-version" data-version="${v}" class="${v==='3.7'?'is-selected':''}">Client v${v}</button>`).join('')}</div>
        <div class="contract-bench">
          <section class="contract-side"><h4>클라이언트가 제안한 기능</h4><div class="cap-list" data-q4-client></div></section>
          <section class="contract-result"><div class="contract-gate" data-q4-gate>협상 중</div><strong data-q4-result></strong><p data-q4-detail></p><button type="button" data-concept-action="q4-patch" hidden>안전한 v3.7 패치 적용</button></section>
          <section class="contract-side"><h4>서버가 지원하는 기능</h4><div class="cap-list">${serverCaps.map(cap=>`<span class="cap-chip">${cap}</span>`).join('')}</div></section>
        </div>
      </div>
      ${status('Client v3.7','같은 major 안에서 공통 capability를 골라 실제 통신 계약을 만듭니다.')}
    </section>`;
  }

  function renderContract(version){
    const data=capData[version];
    document.querySelectorAll(`[data-flow-host="${active.id}"] [data-version]`).forEach(button=>button.classList.toggle('is-selected',button.dataset.version===version));
    const client=q('[data-q4-client]');
    if(client) client.innerHTML=data.caps.map(cap=>`<span class="cap-chip ${data.match.includes(cap)?'is-match':'is-drop'}">${cap}</span>`).join('');
    const gate=q('[data-q4-gate]');
    const result=q('[data-q4-result]');
    const detail=q('[data-q4-detail]');
    const patch=q('[data-concept-action="q4-patch"]');
    gate.className='contract-gate';
    if(data.major===3){
      gate.classList.add('is-open');
      gate.textContent='계약 성립';
      result.textContent=`${data.match.length}개 기능 활성`;
      detail.textContent=data.match.join(' · ');
      patch.hidden=true;
      setStatus(`Client v${version} 허용`,version==='3.2'?'모르는 선택 기능은 끄고 양쪽이 함께 이해하는 기능만 사용합니다.':'숫자가 같아서가 아니라 해석 가능한 기능 계약이 성립해 접속합니다.');
    }else{
      gate.classList.add('is-blocked');
      gate.textContent='Major 차단';
      result.textContent='패킷 해석 계약 없음';
      detail.textContent='movement-v2 ≠ movement-v3';
      patch.hidden=false;
      setStatus('Client v2.9 거부','같은 필드를 다르게 해석하는 파괴적 변경이므로 capability 선택만으로 안전하게 연결할 수 없습니다.');
    }
  }

  function q5Markup(){
    return `<section class="concept-demo q5-demo" aria-label="로그인 대기열과 하류 압력 시뮬레이션">
      ${head('Q5 · 유입 밸브 실험','줄을 빨리 줄이면 왜 서버가 더 빨리 죽을까?','점검 직후 유입 폭주를 시작하고 초당 입장량을 조절해 대기열과 DB 압력을 함께 지켜보세요.')}
      <div class="queue-lab">
        <div class="queue-range"><label for="admission-rate">초당 입장 허용량</label><input id="admission-rate" type="range" min="100" max="1800" step="100" value="700" data-q5-rate><output data-q5-rate-value>700명/s</output></div>
        <div class="queue-scene">
          <div class="queue-crowd" data-q5-crowd aria-label="대기 중인 사용자"></div>
          <div class="queue-gate"><div class="queue-gate-door" data-q5-gate></div><span>ADMISSION</span></div>
          <div class="queue-downstream"><div class="queue-pressure" data-q5-pressure><div><b data-q5-pressure-value>0%</b><small>DB 압력</small></div></div></div>
        </div>
        <div class="queue-metrics"><span>대기열 <b data-q5-queue>0명</b></span><span>유입 <b data-q5-arrival>0명/s</b></span><span>실제 처리 <b data-q5-throughput>0명/s</b></span></div>
      </div>
      <div class="concept-controls">
        <button class="primary" type="button" data-concept-action="q5-run">유입 폭주 시작</button>
        <button type="button" data-concept-action="q5-reset">초기화</button>
      </div>
      ${status('준비','대기열은 사람을 기다리게 하는 기능이 아니라 하류가 감당할 처리율을 지키는 밸브입니다.')}
    </section>`;
  }

  function crowdMarkup(count){
    const visible=Math.max(0,Math.min(32,Math.ceil(count/800)));
    return Array.from({length:32},(_,i)=>`<i class="queue-person" style="--opacity:${i<visible?1:.1};--scale:${i<visible?1:.7}"></i>`).join('');
  }

  function renderQueue(){
    const s=active.model;
    const pressure=Math.min(160,Math.round((s.admitted/Math.max(1,s.capacity))*100));
    const gauge=q('[data-q5-pressure]');
    gauge?.style.setProperty('--pressure',`${Math.min(100,pressure)}%`);
    gauge?.classList.toggle('is-hot',pressure>100);
    q('[data-q5-gate]')?.style.setProperty('--gate-angle',`${Math.min(72,s.rate/25)}deg`);
    setText('[data-q5-pressure-value]',`${pressure}%`);
    setText('[data-q5-queue]',`${Math.round(s.queue).toLocaleString()}명`);
    setText('[data-q5-arrival]',`${Math.round(s.arrival).toLocaleString()}명/s`);
    setText('[data-q5-throughput]',`${Math.round(s.throughput).toLocaleString()}명/s`);
    const crowd=q('[data-q5-crowd]');
    if(crowd) crowd.innerHTML=crowdMarkup(s.queue);
    if(pressure>100) setStatus('하류 포화',`입장량이 처리 능력을 넘어 DB가 느려지고 실제 처리율이 ${Math.round(s.throughput)}명/s까지 떨어졌습니다.`);
    else if(s.queue>0) setStatus('안정된 유입 제어',`사용자는 기다리지만 DB는 복구 가능한 압력에서 계속 처리합니다. 병목 앞에 줄이 보이게 존재합니다.`);
  }

  function setText(selector,value){
    const node=q(selector);
    if(node) node.textContent=value;
  }

  function tickQueue(){
    if(!active||active.id!==5) return;
    const s=active.model;
    s.tick+=1;
    s.arrival=s.tick<32?2200:550;
    const overload=Math.max(0,s.rate-1000);
    s.capacity=Math.max(280,1000-overload*.72);
    s.admitted=Math.min(s.rate,s.queue*4+s.arrival);
    s.throughput=Math.min(s.admitted,s.capacity);
    s.queue=Math.max(0,s.queue+(s.arrival-s.admitted)/4);
    renderQueue();
  }

  function startQueue(){
    if(!active||active.interval!==null) return;
    q('[data-concept-action="q5-run"]').textContent='시뮬레이션 일시정지';
    active.interval=window.setInterval(tickQueue,250);
    setStatus('점검 종료 · 2,200명/s 유입','슬라이더를 움직여 대기열 감소 속도와 DB 압력 사이의 균형을 찾아보세요.');
  }

  function toggleQueue(){
    if(active.interval!==null){
      window.clearInterval(active.interval);
      active.interval=null;
      q('[data-concept-action="q5-run"]').textContent='계속 실행';
      setStatus('일시정지','현재 수치를 비교한 뒤 입장 허용량을 바꿔 다시 실행할 수 있습니다.');
    }else startQueue();
  }

  function changeRate(value){
    if(!active||active.id!==5) return;
    active.model.rate=Number(value);
    setText('[data-q5-rate-value]',`${Number(value).toLocaleString()}명/s`);
    renderQueue();
  }

  const markupById={2:q2Markup,3:q3Markup,4:q4Markup,5:q5Markup};

  function open(id){
    close(false);
    document.dispatchEvent(new CustomEvent('interview-demo-open',{detail:{id}}));
    active={id,run:0,timers:new Set(),interval:null,busy:false,lastCheckpoint:-1,model:id===5?{tick:0,queue:0,arrival:0,rate:700,capacity:1000,admitted:0,throughput:0}:null};
    const root=document.querySelector(`[data-flow-host="${id}"]`);
    const opener=document.querySelector(`[data-flow-open="${id}"]`);
    if(opener){opener.hidden=true;opener.setAttribute('aria-expanded','true');}
    if(root) root.innerHTML=markupById[id]();
    if(id===4) renderContract('3.7');
    if(id===5){q('[data-q5-crowd]').innerHTML=crowdMarkup(0);renderQueue();}
  }

  function close(restoreFocus=true){
    if(!active) return;
    const id=active.id;
    stop();
    const root=document.querySelector(`[data-flow-host="${id}"]`);
    const opener=document.querySelector(`[data-flow-open="${id}"]`);
    if(root) root.innerHTML='';
    if(opener){
      opener.hidden=false;
      opener.setAttribute('aria-expanded','false');
      if(restoreFocus) opener.focus({preventScroll:true});
    }
    active=null;
  }

  function init(){
    document.addEventListener('click',event=>{
      const opener=event.target.closest('[data-flow-open]');
      if(opener){
        const id=Number(opener.dataset.flowOpen);
        if(id>=2&&id<=5){open(id);return;}
      }
      const button=event.target.closest('[data-concept-action]');
      if(!button||!active) return;
      const action=button.dataset.conceptAction;
      if(action==='close') close();
      if(action==='q2-start') runQ2(false);
      if(action==='q2-resume') runQ2(true);
      if(action==='q2-reset') resetQ2();
      if(action==='q3-switch') switchRoute();
      if(action==='q3-replay') replayToken();
      if(action==='q3-reset') resetCurrent(q3Markup());
      if(action==='q4-version') renderContract(button.dataset.version);
      if(action==='q4-patch') renderContract('3.7');
      if(action==='q5-run') toggleQueue();
      if(action==='q5-reset') resetCurrent(q5Markup());
    });
    document.addEventListener('input',event=>{
      if(event.target.matches('[data-q5-rate]')) changeRate(event.target.value);
    });
    document.addEventListener('interview-demo-open',event=>{
      if(active&&active.id!==event.detail.id) close(false);
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&active) stop();});
  }

  window.ConceptSimulators={init};
})();
