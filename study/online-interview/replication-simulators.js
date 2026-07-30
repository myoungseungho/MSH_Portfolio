(function(){
  'use strict';
  let active=null;
  const head=(k,t,d)=>`<div class="concept-head"><div><span>${k}</span><h3>${t}</h3><p>${d}</p></div><button type="button" data-rep-action="close">닫기</button></div>`;
  const status=(l,m)=>`<div class="concept-status" aria-live="polite"><b data-rep-label>${l}</b><span data-rep-message>${m}</span></div>`;
  const root=()=>active?document.querySelector(`[data-flow-host="${active.id}"]`):null;
  const q=s=>root()?.querySelector(s)||null;
  const qa=s=>root()?[...root().querySelectorAll(s)]:[];
  const reduced=()=>Boolean(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function text(s,v){const n=q(s);if(n)n.textContent=v;}
  function tell(l,m){text('[data-rep-label]',l);text('[data-rep-message]',m);}
  function after(fn,ms){if(!active)return;const run=active.run,id=window.setTimeout(()=>{if(active)active.timers.delete(id);if(active&&active.run===run)fn();},reduced()?1:ms);active.timers.add(id);}
  function stop(){if(!active)return;active.run+=1;active.timers.forEach(id=>window.clearTimeout(id));active.timers.clear();}

  function q16Markup(){
    return `<section class="concept-demo" aria-label="패킷 순서 역전 처리 실험">
      ${head('Q16 · 두 종류의 정렬기','오래된 위치와 늦은 이벤트를 같은 방식으로 처리해도 될까?','섞여 도착한 absolute state와 순서가 중요한 event를 각각 다른 규칙으로 분류하세요.')}
      <div class="sort-lab"><section class="packet-arrivals"><h4>도착 순서</h4><div class="packet-stack" data-sort-arrivals></div></section><section class="sort-bin"><h4>Absolute state · 최신값 우선</h4><div class="packet-stack" data-sort-latest></div><div class="sort-rule">server tick이 마지막 적용 tick보다 작으면 즉시 폐기</div></section><section class="sort-bin"><h4>Event · sequence 재정렬</h4><div class="packet-stack" data-sort-ordered></div><div class="sort-rule">gap을 버리지 않고 짧게 기다려 순서대로 소비</div></section></div>
      <div class="concept-controls"><button class="primary" type="button" data-rep-action="sort-state">위치 snapshot 섞어 도착</button><button class="primary" type="button" data-rep-action="sort-event">이벤트 섞어 도착</button><button type="button" data-rep-action="reset">초기화</button></div>
      ${status('정렬기 대기','데이터 의미에 따라 “오래된 값 폐기”와 “빠진 순서 기다리기”를 다르게 선택합니다.')}
    </section>`;
  }
  function sortPackets(type){
    const state=type==='state';
    const values=state?[105,103,106,104]:[22,24,23,25];
    q('[data-sort-arrivals]').innerHTML=values.map(v=>`<span class="sort-packet">${state?'position tick':'skill event #'}${v}</span>`).join('');
    q('[data-sort-latest]').innerHTML='';
    q('[data-sort-ordered]').innerHTML='';
    tell(state?'Absolute snapshot 도착':'Ordered event 도착',state?'최종 상태만 필요하므로 tick을 비교합니다.':'24가 23보다 먼저 왔지만 스킬 순서는 바꿀 수 없습니다.');
    after(()=>{
      if(state){
        q('[data-sort-latest]').innerHTML=values.map(v=>`<span class="sort-packet ${v===106?'is-latest':'is-old'}">tick ${v} ${v===106?'적용':'폐기'}</span>`).join('');
        tell('tick 106만 적용','103·104·105가 늦게 도착해도 이미 적용한 106보다 오래되어 캐릭터를 뒤로 돌리지 않습니다.');
      }else{
        q('[data-sort-ordered]').innerHTML='<span class="sort-packet is-ordered">#22 소비</span><span class="sort-packet is-buffered">#24 buffer · #23 대기</span>';
        after(()=>{
          q('[data-sort-ordered]').innerHTML=[22,23,24,25].map(v=>`<span class="sort-packet is-ordered">#${v} 순서대로 소비</span>`).join('');
          tell('gap 복구 후 22→23→24→25','이벤트는 최신 하나만 남기면 존재 자체가 사라지므로 sequence gap을 채운 뒤 순서대로 실행합니다.');
        },620);
      }
    },520);
  }

  function q17Markup(){
    return `<section class="concept-demo" aria-label="같은 revision 상태 조각 원자 커밋 실험">
      ${head('Q17 · 프레임 경계 조립 퍼즐','체력·버프·장비가 따로 오면 언제 화면에 적용해야 할까?','적용 모드를 바꾸고 revision 42의 세 조각을 하나씩 도착시켜 중간 모순을 비교하세요.')}
      <div class="revision-lab"><div class="revision-avatar"><div class="revision-body"><h4>LIVE AVATAR</h4><div class="revision-live"><span class="revision-slot" data-live="hp">HP 100</span><span class="revision-slot" data-live="buff">버프 없음</span><span class="revision-slot" data-live="gear">기본 장비</span></div></div></div><section class="revision-stage"><h4>STAGING · revision 42</h4><div class="revision-tray"><div class="revision-piece" data-piece="hp">HP 160</div><div class="revision-piece" data-piece="buff">최대 HP +60</div><div class="revision-piece" data-piece="gear">세트 장비</div></div><div class="revision-commit"><i data-revision-ready></i></div></section></div>
      <div class="concept-controls"><label class="revision-mode">적용 방식 <select data-revision-mode><option value="atomic">같은 revision을 모아 원자 commit</option><option value="naive">도착 즉시 각각 적용</option></select></label><button class="primary" type="button" data-rep-action="piece">다음 조각 도착</button><button type="button" data-rep-action="reset">초기화</button></div>
      ${status('revision 42 대기','네트워크 패킷 경계가 아니라 사용자가 인식하는 하나의 장비 변경 사건으로 묶습니다.')}
    </section>`;
  }
  const pieces=['hp','buff','gear'];
  const liveValues={hp:'HP 160',buff:'최대 HP +60',gear:'세트 장비'};
  function arrivePiece(){
    if(active.piece>=3)return;
    const key=pieces[active.piece++];
    q(`[data-piece="${key}"]`)?.classList.add('is-arrived');
    q('[data-revision-ready]')?.style.setProperty('--ready',`${active.piece/3*100}%`);
    const atomic=q('[data-revision-mode]').value==='atomic';
    if(!atomic){
      const slot=q(`[data-live="${key}"]`);
      slot.textContent=liveValues[key];
      slot.classList.add(active.piece<3?'is-contradiction':'is-new');
      tell(active.piece<3?'중간 프레임 모순 노출':'마지막 조각 도착',active.piece<3?'새 HP만 보이지만 그 원인인 버프와 장비는 아직 옛 상태입니다.':'세 조각이 우연히 모두 도착한 뒤에야 모순이 끝났습니다.');
    }else if(active.piece<3){
      tell(`${key} 조각 staging`,`revision 42의 ${active.piece}/3 조각만 있어 LIVE 상태는 revision 41로 유지합니다.`);
    }
    if(active.piece===3&&atomic){
      pieces.forEach(k=>{const slot=q(`[data-live="${k}"]`);slot.textContent=liveValues[k];slot.classList.add('is-new');});
      tell('프레임 경계에서 revision 42 commit','세 조각을 한 번에 교체해 사용자는 모순된 중간 상태를 한 프레임도 보지 않습니다.');
    }
  }

  const updates=[
    {id:'pos1',label:'Pos x=10',group:'pos'},{id:'pos2',label:'Pos x=11',group:'pos'},{id:'pos3',label:'Pos x=13',group:'pos'},
    {id:'aim1',label:'Aim 20°',group:'aim'},{id:'aim2',label:'Aim 28°',group:'aim'},{id:'cast',label:'Skill Cast',critical:true},
    {id:'emote',label:'Emote',group:'cosmetic'},{id:'hp',label:'HP -35',critical:true}
  ];
  function q18Markup(){
    return `<section class="concept-demo" aria-label="복제 예산 패킹 실험">
      ${head('Q18 · 네트워크 틱 여행 가방','한 틱의 모든 변경을 그대로 보내야 할까?','패킷 슬롯 예산을 바꿔 대체 가능한 값은 합치고 중요한 사건은 끝까지 보존하세요.')}
      <div class="budget-lab"><div class="budget-stream">${updates.map(u=>`<span class="budget-update ${u.critical?'is-critical':''}" data-update="${u.id}">${u.label}</span>`).join('')}</div><div class="budget-packet" data-budget-packet>${Array.from({length:6},(_,i)=>`<div class="budget-slot" data-budget-slot="${i}">빈 슬롯</div>`).join('')}</div></div>
      <div class="concept-controls"><label class="budget-controls">패킷 슬롯 예산 <input type="range" min="2" max="6" value="4" step="1" data-budget-range><output data-budget-value>4개</output></label><button class="primary" type="button" data-rep-action="pack">이번 tick 패킹</button><button type="button" data-rep-action="reset">초기화</button></div>
      ${status('8개 변경 · 4개 슬롯','마지막 위치·마지막 조준과 보존해야 할 이벤트를 우선해 최소 정보로 줄입니다.')}
    </section>`;
  }
  function setBudget(value){active.budget=Number(value);text('[data-budget-value]',`${value}개`);tell(`${updates.length}개 변경 · ${value}개 슬롯`,value<4?'중요 이벤트를 먼저 넣으면 장식 상태는 다음 틱으로 밀릴 수 있습니다.':'대체 가능한 연속 값은 예산이 남아도 최신 하나만 보냅니다.');}
  function packBudget(){
    qa('[data-update]').forEach(n=>n.classList.remove('is-coalesced','is-packed'));
    qa('[data-budget-slot]').forEach(n=>{n.className='budget-slot';n.textContent='빈 슬롯';});
    const candidates=['cast','hp','pos3','aim2','emote'];
    const packed=candidates.slice(0,active.budget);
    ['pos1','pos2','aim1'].forEach(id=>q(`[data-update="${id}"]`)?.classList.add('is-coalesced'));
    candidates.forEach(id=>q(`[data-update="${id}"]`)?.classList.toggle('is-packed',packed.includes(id)));
    packed.forEach((id,i)=>{const slot=q(`[data-budget-slot="${i}"]`),u=updates.find(x=>x.id===id);slot.classList.add('is-used');slot.textContent=u.label;});
    tell(`${packed.length}개 delta 패킹 완료`,`Pos와 Aim은 최신값으로 coalesce했고 Skill Cast·HP처럼 사라지면 안 되는 사건을 우선 보존했습니다.`);
  }

  function q19Markup(){
    return `<section class="concept-demo" aria-label="엔티티 생성 전 delta와 세대 처리 실험">
      ${head('Q19 · orphan 보육함','아직 태어나지 않은 엔티티의 갱신은 어디에 둘까?','delta를 spawn보다 먼저 보내고 generation·baseline이 맞을 때만 엔티티에 적용하세요.')}
      <div class="orphan-lab"><div class="orphan-entity"><div class="entity-shell" data-entity-shell>network ID 51<br>아직 없음</div></div><section class="orphan-buffer"><h4>ORPHAN BUFFER</h4><div class="orphan-items" data-orphan-items></div><div class="tombstone" data-tombstone>tombstone 없음</div></section></div>
      <div class="concept-controls"><button class="primary" type="button" data-rep-action="orphan-delta">gen 7 delta 먼저 도착</button><button type="button" data-rep-action="orphan-spawn">gen 7 spawn 도착</button><button type="button" data-rep-action="orphan-wrong">gen 6 늦은 delta</button><button class="danger" type="button" data-rep-action="orphan-despawn">despawn</button><button type="button" data-rep-action="reset">초기화</button></div>
      ${status('ID 51 미생성','ID만 보고 delta를 적용하지 않고 generation 7의 spawn baseline을 기다립니다.')}
    </section>`;
  }
  function addOrphan(kind){
    const items=q('[data-orphan-items]');
    if(kind==='delta'){
      if(active.spawned){items.innerHTML+='<span class="orphan-item is-applied">gen 7 · delta r13 즉시 적용</span>';tell('delta 적용','spawn baseline r12 이후 revision 13으로 적용했습니다.');}
      else{active.buffered=true;items.innerHTML+='<span class="orphan-item">gen 7 · delta r13 대기</span>';tell('orphan buffer 보관','같은 generation의 spawn이 짧은 시간 안에 도착할 때만 적용합니다.');}
    }
    if(kind==='spawn'){
      active.spawned=true;const shell=q('[data-entity-shell]');shell.classList.add('is-spawned');shell.innerHTML='ID 51 · gen 7<br>baseline r12';
      if(active.buffered){qa('.orphan-item').forEach(n=>n.classList.add('is-applied'));shell.innerHTML='ID 51 · gen 7<br>현재 revision r13';}
      tell('spawn과 orphan 결합','generation 7과 baseline r12가 맞아 대기하던 delta r13을 이어 적용했습니다.');
    }
    if(kind==='wrong'){
      items.innerHTML+='<span class="orphan-item is-dropped">gen 6 · delta r99 폐기</span>';tell('오래된 세대 폐기','같은 ID 51이어도 generation 6은 이전 생명주기이므로 현재 엔티티에 적용하지 않습니다.');
    }
    if(kind==='despawn'){
      active.spawned=false;q('[data-entity-shell]')?.classList.add('is-dead');text('[data-tombstone]','tombstone · ID 51 gen 7 · 10s 유지');tell('despawn + tombstone','늦게 도착하는 gen 7 패킷이 새 생명주기로 오인되지 않게 삭제 기록을 잠시 유지합니다.');
    }
  }

  function q20Markup(){
    return `<section class="concept-demo" aria-label="서버 롤백 epoch 전환 실험">
      ${head('Q20 · 새로운 세계선','낮아진 tick과 서버 롤백을 어떻게 구분할까?','epoch를 바꾸고 과거 세계선의 예측을 버린 뒤 재제출 가능한 입력만 새 세계선에 올리세요.')}
      <div class="epoch-lab"><span class="epoch-label old">EPOCH 1</span><div class="epoch-line old"></div><div class="epoch-old-future" data-epoch-old></div>${[100,110,120].map((t,i)=>`<i class="epoch-node" style="--row:0;--x:${22+i*28}%">t${t}</i>`).join('')}<span class="epoch-label new">EPOCH 2</span><div class="epoch-line new" data-epoch-new></div>${[80,90,100].map((t,i)=>`<i class="epoch-node new" style="--row:1;--x:${22+i*28}%">t${t}</i>`).join('')}<div class="epoch-head" data-epoch-head>CLIENT<br>E1 t120</div><div class="epoch-command" data-epoch-input>Move seq 51</div><div class="epoch-command" data-epoch-buy>Purchase tx 88</div></div>
      <div class="concept-controls"><button class="danger" type="button" data-rep-action="rollback">서버를 E2 t80으로 롤백</button><button type="button" data-rep-action="epoch-input" disabled>이동 입력 재제출</button><button type="button" data-rep-action="epoch-buy" disabled>구매 명령 재제출</button><button type="button" data-rep-action="reset">초기화</button></div>
      ${status('E1 · tick 120','클라이언트 예측 history와 미확정 명령이 epoch 1을 기준으로 쌓여 있습니다.')}
    </section>`;
  }
  function rollback(){
    active.rolled=true;q('[data-epoch-head]')?.classList.add('is-rollback');q('[data-epoch-old]')?.classList.add('is-archived');q('[data-epoch-new]')?.classList.add('is-active');q('[data-epoch-head]').innerHTML='CLIENT<br>E2 t80';q('[data-rep-action="epoch-input"]').disabled=false;q('[data-rep-action="epoch-buy"]').disabled=false;tell('epoch 2 baseline 설치','낮은 tick을 과거 패킷으로 버리지 않고 새 세계선으로 인식해 E1 예측 history를 전부 비웁니다.');
  }
  function epochCommand(type){
    if(!active.rolled)return;
    if(type==='input'){q('[data-epoch-input]')?.classList.add('is-replayed');tell('재생 가능한 입력만 새 ID로 제출','Move는 외부 영속 부작용이 없어 E2 규칙으로 다시 실행할 수 있습니다.');}
    else{q('[data-epoch-buy]')?.classList.add('is-rejected');tell('구매 명령 자동 재제출 금지','경제 transaction은 simulation rollback과 다른 원장을 가지므로 tx 88 결과를 조회해 별도로 복구합니다.');}
  }

  const markup={16:q16Markup,17:q17Markup,18:q18Markup,19:q19Markup,20:q20Markup};
  function state(id){return{id,run:0,timers:new Set(),piece:0,budget:4,buffered:false,spawned:false,rolled:false};}
  function open(id){close(false);document.dispatchEvent(new CustomEvent('interview-demo-open',{detail:{id}}));active=state(id);const host=document.querySelector(`[data-flow-host="${id}"]`),opener=document.querySelector(`[data-flow-open="${id}"]`);if(opener){opener.hidden=true;opener.setAttribute('aria-expanded','true');}if(host)host.innerHTML=markup[id]();if(id===18)setBudget(4);}
  function reset(){const id=active.id;stop();active=state(id);const host=document.querySelector(`[data-flow-host="${id}"]`);if(host)host.innerHTML=markup[id]();if(id===18)setBudget(4);}
  function close(focus=true){if(!active)return;const id=active.id;stop();const host=document.querySelector(`[data-flow-host="${id}"]`),opener=document.querySelector(`[data-flow-open="${id}"]`);if(host)host.innerHTML='';if(opener){opener.hidden=false;opener.setAttribute('aria-expanded','false');if(focus)opener.focus({preventScroll:true});}active=null;}
  function init(){
    document.addEventListener('click',event=>{
      const opener=event.target.closest('[data-flow-open]');if(opener){const id=Number(opener.dataset.flowOpen);if(id>=16&&id<=20){open(id);return;}}
      const button=event.target.closest('[data-rep-action]');if(!button||!active)return;const a=button.dataset.repAction;
      if(a==='close')close();if(a==='reset')reset();if(a==='sort-state')sortPackets('state');if(a==='sort-event')sortPackets('event');if(a==='piece')arrivePiece();if(a==='pack')packBudget();if(a==='orphan-delta')addOrphan('delta');if(a==='orphan-spawn')addOrphan('spawn');if(a==='orphan-wrong')addOrphan('wrong');if(a==='orphan-despawn')addOrphan('despawn');if(a==='rollback')rollback();if(a==='epoch-input')epochCommand('input');if(a==='epoch-buy')epochCommand('buy');
    });
    document.addEventListener('input',event=>{if(event.target.matches('[data-budget-range]'))setBudget(event.target.value);});
    document.addEventListener('interview-demo-open',event=>{if(active&&active.id!==event.detail.id)close(false);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop();});
  }
  window.ReplicationSimulators={init};
})();
