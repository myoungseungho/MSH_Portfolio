(function(){
  'use strict';

  let active=null;

  const initialState=()=>({
    phase:'idle',
    attemptId:null,
    duplicateClicks:0,
    sessionCreated:false,
    faultArmed:false,
    run:0,
    timers:new Set()
  });

  function markup(){
    return `<section class="login-sim" aria-label="중복 로그인과 응답 유실 시뮬레이션">
      <div class="login-sim-head">
        <div>
          <span>Q1 · 직접 움직여 보기</span>
          <h3>버튼을 연타해도 세션은 왜 하나여야 할까?</h3>
          <p>로그인 버튼을 빠르게 여러 번 눌러 패킷과 서버 상태가 어떻게 달라지는지 확인하세요.</p>
        </div>
        <button type="button" data-sim-action="close">닫기</button>
      </div>
      <div class="login-sim-toolbar">
        <label><input type="checkbox" data-sim-fault> 첫 번째 성공 응답을 중간에서 유실</label>
        <button type="button" data-sim-action="reset">초기화</button>
      </div>
      <div class="login-sim-stage">
        <div class="sim-connection" aria-hidden="true"></div>
        <section class="sim-client">
          <small>CLIENT</small>
          <strong>로그인 화면</strong>
          <div class="sim-ui-state" data-sim-ui-state>Idle</div>
          <button class="sim-login-button" type="button" data-sim-action="login">로그인</button>
          <span class="sim-click-count" data-sim-click-count>아직 요청 없음</span>
        </section>
        <div class="sim-network" aria-hidden="true">
          <span>NETWORK</span>
          <div class="sim-loss-zone" data-sim-loss-zone>응답 유실 지점</div>
        </div>
        <section class="sim-server">
          <small>SERVER</small>
          <strong>인증 + 세션</strong>
          <div class="sim-server-state" data-sim-server-state>요청 대기</div>
          <div class="sim-session-slot" data-sim-session>
            <span>SESSION SLOT</span>
            <b data-sim-session-value>비어 있음</b>
          </div>
        </section>
        <div class="sim-packet-layer" data-sim-packets aria-hidden="true"></div>
      </div>
      <div class="login-sim-status" aria-live="polite">
        <span data-sim-phase>준비</span>
        <p data-sim-message>로그인 버튼을 한 번 누른 뒤, 패킷이 도착하기 전에 연타해 보세요.</p>
      </div>
    </section>`;
  }

  function host(){
    return active&&document.querySelector(`[data-flow-host="${active.id}"]`);
  }

  function find(selector){
    const root=host();
    return root?root.querySelector(selector):null;
  }

  function setText(selector,text){
    const element=find(selector);
    if(element) element.textContent=text;
  }

  function setPhase(label,message){
    setText('[data-sim-phase]',label);
    setText('[data-sim-message]',message);
  }

  function delay(ms,run){
    return new Promise(resolve=>{
      if(!active||active.state.run!==run){resolve(false);return;}
      const id=window.setTimeout(()=>{
        if(active) active.state.timers.delete(id);
        resolve(Boolean(active&&active.state.run===run));
      },ms);
      active.state.timers.add(id);
    });
  }

  function clearWork(){
    if(!active) return;
    active.state.run+=1;
    active.state.timers.forEach(id=>window.clearTimeout(id));
    active.state.timers.clear();
    const root=host();
    if(root) root.querySelectorAll('.sim-packet').forEach(packet=>packet.remove());
  }

  function motionDuration(ms){
    return window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:ms;
  }

  function movePacket(label,from,to,kind,run){
    return new Promise(resolve=>{
      if(!active||active.state.run!==run){resolve(false);return;}
      const layer=find('[data-sim-packets]');
      if(!layer){resolve(false);return;}
      const packet=document.createElement('div');
      packet.className=`sim-packet ${kind}`;
      packet.textContent=label;
      packet.style.left=`${from}%`;
      layer.appendChild(packet);
      const duration=motionDuration(900);
      const finish=()=>{
        packet.remove();
        resolve(Boolean(active&&active.state.run===run));
      };
      if(packet.animate){
        const animation=packet.animate(
          [{left:`${from}%`,transform:'translate(-50%,-50%) scale(.92)'},{left:`${to}%`,transform:'translate(-50%,-50%) scale(1)'}],
          {duration,easing:'cubic-bezier(.22,.75,.25,1)',fill:'forwards'}
        );
        animation.onfinish=finish;
        animation.oncancel=()=>resolve(false);
      }else{
        const id=window.setTimeout(finish,duration);
        active.state.timers.add(id);
      }
    });
  }

  function pulse(selector,className){
    const element=find(selector);
    if(!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function refreshControls(){
    if(!active) return;
    const state=active.state;
    const button=find('[data-sim-action="login"]');
    const fault=find('[data-sim-fault]');
    if(fault){
      fault.checked=state.faultArmed;
      fault.disabled=state.phase!=='idle';
    }
    if(!button) return;
    button.disabled=state.phase==='success';
    if(state.phase==='idle') button.textContent='로그인';
    if(state.phase==='requesting') button.textContent='요청 중 · 다시 눌러보기';
    if(state.phase==='unknown') button.textContent='같은 ID로 결과 재시도';
    if(state.phase==='success') button.textContent='로그인 완료';
  }

  function absorbDuplicate(){
    const state=active.state;
    state.duplicateClicks+=1;
    pulse('.sim-client','is-clicked');
    setText('[data-sim-click-count]',`중복 클릭 ${state.duplicateClicks}회 · 새 패킷 0개`);
    setPhase('클라이언트 방어선',`UI가 ${state.attemptId} 처리 중임을 알고 있어 새 로그인 명령을 만들지 않았습니다.`);
  }

  async function returnResponse(run,cached){
    if(!active||active.state.run!==run) return;
    const state=active.state;
    setText('[data-sim-server-state]',cached?'같은 키 발견 · 기존 결과 반환':'처리 완료 · 응답 전송');
    setPhase(cached?'멱등 결과 재생':'응답 전송',cached?'서버가 새 세션을 만들지 않고 A-104의 기존 결과 S-77을 꺼냈습니다.':'서버에서 클라이언트로 LoginResult(S-77)가 이동합니다.');

    if(state.faultArmed){
      const reached=await movePacket('LoginResult S-77',78,50,'response is-doomed',run);
      if(!reached||!active) return;
      state.faultArmed=false;
      const zone=find('[data-sim-loss-zone]');
      if(zone) zone.classList.add('is-hit');
      setText('[data-sim-ui-state]','결과 모름');
      setText('[data-sim-server-state]','세션 S-77 유지');
      setPhase('응답 유실',`클라이언트는 실패를 받은 것이 아닙니다. 서버의 성공 여부를 모르는 상태입니다.`);
      if(!await delay(motionDuration(650),run)||!active) return;
      state.phase='unknown';
      if(zone) zone.classList.remove('is-hit');
      setText('[data-sim-click-count]','A-104로 결과를 다시 물어야 함');
      refreshControls();
      return;
    }

    const arrived=await movePacket(cached?'Replay S-77':'LoginResult S-77',78,22,'response',run);
    if(!arrived||!active) return;
    state.phase='success';
    setText('[data-sim-ui-state]','Succeeded');
    setText('[data-sim-server-state]','세션 S-77 활성');
    setText('[data-sim-click-count]',`세션 1개 · 중복 생성 0개`);
    pulse('.sim-client','is-success');
    setPhase('상태 수렴 완료',`클라이언트와 서버가 모두 S-77을 가리킵니다. 클릭은 여러 번이어도 서버 결과는 하나입니다.`);
    refreshControls();
  }

  async function sendLogin(){
    if(!active) return;
    const state=active.state;
    if(state.phase==='requesting'){absorbDuplicate();return;}
    if(state.phase==='success') return;

    const cached=state.phase==='unknown';
    if(!state.attemptId) state.attemptId='A-104';
    state.phase='requesting';
    const run=state.run;
    setText('[data-sim-ui-state]',cached?'Retrying A-104':'Requesting A-104');
    setText('[data-sim-click-count]',cached?'같은 시도 ID 재사용':'첫 명령 생성 · A-104');
    setText('[data-sim-server-state]','요청 대기');
    setPhase(cached?'결과 재조회 시작':'로그인 명령 생성',cached?'새 시도 ID가 아니라 A-104를 그대로 다시 보냅니다.':'클라이언트에서 Login(A-104) 패킷 하나가 출발합니다.');
    refreshControls();

    const arrived=await movePacket(cached?'Retry A-104':'Login A-104',22,78,'request',run);
    if(!arrived||!active) return;
    pulse('.sim-server','is-processing');

    if(!state.sessionCreated){
      setText('[data-sim-server-state]','A-104 확인 · 세션 생성');
      setPhase('서버 원자적 결정',`세션 저장소가 A-104의 결과를 처음 한 번만 생성합니다.`);
      if(!await delay(motionDuration(520),run)||!active) return;
      state.sessionCreated=true;
      setText('[data-sim-session-value]','S-77 · owner A-104');
      pulse('[data-sim-session]','is-filled');
    }else{
      setText('[data-sim-server-state]','A-104 → S-77 조회');
      setPhase('기존 결과 발견',`저장소에 A-104 → S-77이 있으므로 세션 생성 코드는 다시 실행되지 않습니다.`);
      pulse('[data-sim-session]','is-cached');
      if(!await delay(motionDuration(420),run)||!active) return;
    }
    await returnResponse(run,cached);
  }

  function open(id){
    close(false);
    document.dispatchEvent(new CustomEvent('interview-demo-open',{detail:{id}}));
    active={id,state:initialState()};
    const root=host();
    const button=document.querySelector(`[data-flow-open="${id}"]`);
    if(button){button.hidden=true;button.setAttribute('aria-expanded','true');}
    if(root) root.innerHTML=markup();
    refreshControls();
  }

  function reset(){
    if(!active) return;
    const id=active.id;
    clearWork();
    active={id,state:initialState()};
    const root=host();
    if(root) root.innerHTML=markup();
    refreshControls();
  }

  function close(restoreFocus=true){
    if(!active) return;
    const id=active.id;
    clearWork();
    const root=host();
    const button=document.querySelector(`[data-flow-open="${id}"]`);
    if(root) root.innerHTML='';
    if(button){
      button.hidden=false;
      button.setAttribute('aria-expanded','false');
      if(restoreFocus) button.focus({preventScroll:true});
    }
    active=null;
  }

  function init(){
    document.addEventListener('click',event=>{
      const opener=event.target.closest('[data-flow-open]');
      if(opener&&Number(opener.dataset.flowOpen)===1){open(1);return;}
      const action=event.target.closest('[data-sim-action]');
      if(!action) return;
      if(action.dataset.simAction==='login') sendLogin();
      if(action.dataset.simAction==='reset') reset();
      if(action.dataset.simAction==='close') close();
    });
    document.addEventListener('change',event=>{
      if(!active||!event.target.matches('[data-sim-fault]')) return;
      active.state.faultArmed=event.target.checked;
      const zone=find('[data-sim-loss-zone]');
      if(zone) zone.classList.toggle('is-armed',active.state.faultArmed);
      setPhase(active.state.faultArmed?'장애 준비':'준비',active.state.faultArmed?'첫 번째 서버 응답이 네트워크 중간에서 사라집니다. 이제 로그인해 보세요.':'로그인 버튼을 한 번 누른 뒤, 패킷이 도착하기 전에 연타해 보세요.');
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&active) reset();});
    document.addEventListener('interview-demo-open',event=>{
      if(active&&event.detail.id!==1) close(false);
    });
  }

  window.LoginFlowSimulator={init};
})();
