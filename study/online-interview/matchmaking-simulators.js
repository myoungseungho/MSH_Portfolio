(function(){
'use strict';
let active=null;
const head=(k,t,d)=>`<div class="concept-head"><div><span>${k}</span><h3>${t}</h3><p>${d}</p></div><button data-mm-action="close">닫기</button></div>`;
const status=(l,m)=>`<div class="concept-status" aria-live="polite"><b data-mm-label>${l}</b><span data-mm-message>${m}</span></div>`;
const host=()=>active?document.querySelector(`[data-flow-host="${active.id}"]`):null;
const one=s=>host()?.querySelector(s)||null;
const all=s=>host()?[...host().querySelectorAll(s)]:[];
const text=(s,v)=>{const n=one(s);if(n)n.textContent=v};
const say=(l,m)=>{text('[data-mm-label]',l);text('[data-mm-message]',m)};

function q51(){
  const candidates=[
    ['A','MMR +25','48ms','예상 35초',25,48,35],
    ['B','MMR +4','122ms','예상 12초',4,122,12],
    ['C','MMR +62','31ms','예상 8초',62,31,8]
  ];
  return `<section class="concept-demo">${head('Q51 · 세 제약의 균형','스킬만 보면 왜 “좋은 매치”가 아닐까?','MMR, 지연, 대기 시간을 각각 얼마나 중요하게 볼지 바꾸고 실제 후보 선택이 달라지는지 확인하세요.')}
  <div class="concept-controls">
    <label>스킬 <input type="range" min="1" max="10" value="8" data-mm-weight="skill"><output data-mm-out="skill">8</output></label>
    <label>지연 <input type="range" min="1" max="10" value="7" data-mm-weight="ping"><output data-mm-out="ping">7</output></label>
    <label>대기 <input type="range" min="1" max="10" value="3" data-mm-weight="wait"><output data-mm-out="wait">3</output></label>
  </div>
  <div class="mm-arena"><div class="mm-grid">${candidates.map(c=>`<div class="mm-card" data-mm-candidate="${c[0]}" data-skill="${c[4]}" data-ping="${c[5]}" data-wait="${c[6]}"><b>후보 ${c[0]}</b><span>${c[1]}</span><span>${c[2]}</span><span>${c[3]}</span><div class="mm-score" data-mm-score>0</div></div>`).join('')}</div>
  <div class="mm-triangle"><span class="a">스킬 공정성</span><span class="b">네트워크 품질</span><span class="c">대기 UX</span><i data-mm-dot></i></div></div>
  ${status('후보를 계산 중','단일 MMR 정렬이 아니라 제품 정책으로 정한 여러 비용의 합을 비교합니다.')}</section>`;
}
function score51(){
  const w={};all('[data-mm-weight]').forEach(n=>{w[n.dataset.mmWeight]=+n.value;text(`[data-mm-out="${n.dataset.mmWeight}"]`,n.value)});
  let best=null;
  all('[data-mm-candidate]').forEach(n=>{
    const value=w.skill*(100-+n.dataset.skill)+w.ping*(150-+n.dataset.ping)+w.wait*(60-+n.dataset.wait);
    text(`[data-mm-candidate="${n.dataset.mmCandidate}"] [data-mm-score]`,Math.round(value));
    if(!best||value>best.value)best={id:n.dataset.mmCandidate,value};
  });
  all('[data-mm-candidate]').forEach(n=>n.classList.toggle('is-picked',n.dataset.mmCandidate===best.id));
  const total=w.skill+w.ping+w.wait,dot=one('[data-mm-dot]');
  if(dot){dot.style.left=`${20+60*w.wait/total}%`;dot.style.top=`${82-64*w.skill/total}%`}
  say(`후보 ${best.id} 선택`,`가중치를 바꾸면 같은 후보군에서도 공정성·핑·대기 비용의 타협점이 이동합니다.`);
}

function q52(){
  const pts=[['P1',50,12,10],['P2',77,28,25],['P3',24,72,50],['P4',82,76,75]];
  return `<section class="concept-demo">${head('Q52 · 탐색 반경 완화','기다릴수록 조건은 어떤 순서로 넓어져야 할까?','대기 시간을 움직이면 정해진 정책 순서에 따라 후보 반경이 확장됩니다.')}
  <div class="concept-controls"><label>대기 시간 <input type="range" min="0" max="90" step="5" value="0" data-mm-wait><output data-mm-wait-out>0초</output></label></div>
  <div class="mm-arena"><div class="relax-stage"><div class="relax-ring" style="--size:110px" data-ring="1"></div><div class="relax-ring" style="--size:190px" data-ring="2"></div><div class="relax-ring" style="--size:270px" data-ring="3"></div><div class="relax-player">YOU</div>${pts.map(p=>`<div class="relax-candidate" style="--x:${p[1]}%;--y:${p[2]}%" data-enter="${p[3]}">${p[0]}</div>`).join('')}</div><div class="relax-timeline">${Array.from({length:9},(_,i)=>`<i data-time="${(i+1)*10}"></i>`).join('')}</div></div>
  ${status('엄격한 조건','0~20초에는 같은 리전·좁은 MMR 조건만 사용합니다.')}</section>`;
}
function wait52(v){
  const sec=+v;text('[data-mm-wait-out]',`${sec}초`);
  all('[data-ring]').forEach(n=>n.style.setProperty('--show',sec>=+n.dataset.ring*20?1:.15));
  all('[data-enter]').forEach(n=>n.classList.toggle('is-in',sec>=+n.dataset.enter));
  all('[data-time]').forEach(n=>n.classList.toggle('is-on',sec>=+n.dataset.time));
  const phase=sec<20?['엄격한 조건','같은 리전과 좁은 MMR만 검색합니다.']:sec<50?['MMR 범위 완화','핑 상한은 유지한 채 실력 범위부터 넓힙니다.']:sec<75?['인접 리전 허용','플레이 가능한 지연 상한 안에서 인접 리전을 포함합니다.']:['마지막 완화','파티 크기 조건을 완화하되 절대 핑 상한은 넘지 않습니다.'];
  say(phase[0],phase[1]);
}

function team(name,premade){
  return `<div class="synergy-team" data-team="${name}"><h4>${name} · 평균 MMR 1500</h4><div class="synergy-person">A</div><div class="synergy-person">B</div><div class="synergy-person">C</div><i class="synergy-link" style="left:30%;top:91px;width:40%;transform:rotate(0deg)" data-link></i><i class="synergy-link" style="left:31%;top:99px;width:39%;transform:rotate(58deg)" data-link></i><i class="synergy-link" style="left:69%;top:99px;width:39%;transform:rotate(122deg)" data-link></i><div class="synergy-total" data-synergy>${premade?'예측 전력 1500':'예측 전력 1500'}</div></div>`;
}
function q53(){
  return `<section class="concept-demo">${head('Q53 · 파티 시너지','평균 MMR이 같으면 정말 같은 팀인가?','음성 합, 역할 조합, 반복 플레이 정보를 켜서 premade의 숨은 전력이 어떻게 드러나는지 확인하세요.')}
  <div class="concept-controls"><label><input type="checkbox" data-syn="voice"> 음성 합</label><label><input type="checkbox" data-syn="roles"> 역할 조합</label><label><input type="checkbox" data-syn="history"> 반복 승률</label></div>
  <div class="mm-arena"><div class="synergy-board">${team('솔로 조합',false)}${team('3인 파티',true)}</div></div>
  ${status('표면상 동률','평균 MMR만 보면 두 팀은 같지만 파티가 만드는 추가 전력은 아직 반영되지 않았습니다.')}</section>`;
}
function synergy53(){
  const count=all('[data-syn]:checked').length,bonus=count*35;
  all('[data-team="3인 파티"] [data-link]').forEach((n,i)=>n.classList.toggle('is-on',i<count));
  text('[data-team="3인 파티"] [data-synergy]',`예측 전력 ${1500+bonus}`);
  say(count?`파티 시너지 +${bonus}`:'표면상 동률',count?'평균 MMR과 별개인 팀 단위 특징을 상대 팀 보정이나 별도 큐 정책에 반영합니다.':'개인 실력만 합치면 premade의 협업 우위를 놓칩니다.');
}

function q54(){
  return `<section class="concept-demo">${head('Q54 · 수락 방','한 명의 거절이 아홉 명의 시간을 지우지 않게 하려면?','좌석 하나를 거절시킨 뒤 매치 해체와 정상 참가자 우선 재진입을 실행하세요.')}
  <div class="mm-arena"><div class="accept-room">${Array.from({length:10},(_,i)=>`<button class="accept-seat" data-seat="${i}" data-mm-action="seat">${i+1}<br>대기</button>`).join('')}</div><div class="accept-token" data-priority>우선권 토큰 없음</div></div>
  <div class="concept-controls"><button class="primary" data-mm-action="resolve">수락 결과 확정</button><button data-mm-action="reset">초기화</button></div>
  ${status('10명 응답 대기','좌석을 눌러 한 명의 상태를 거절로 바꿀 수 있습니다.')}</section>`;
}
function seat54(n){
  all('.accept-seat').forEach(x=>{if(x!==n&&!x.classList.contains('is-no')){x.classList.add('is-yes');x.innerHTML=`${+x.dataset.seat+1}<br>수락`}});
  n.classList.toggle('is-no');n.classList.remove('is-yes');n.innerHTML=`${+n.dataset.seat+1}<br>${n.classList.contains('is-no')?'거절':'대기'}`;
  say('한 명 거절','거절자는 패널티 정책으로 분리하고, 정상 수락자는 대기 가치를 보존해야 합니다.');
}
function resolve54(){
  const declined=all('.accept-seat.is-no').length;
  if(!declined){all('.accept-seat').forEach(n=>{n.classList.add('is-yes');n.innerHTML=`${+n.dataset.seat+1}<br>수락`});say('매치 성립','전원이 수락해 게임 서버 예약 단계로 진행합니다.');return}
  const accepted=10-declined;const token=one('[data-priority]');token.classList.add('is-issued');token.textContent=`${accepted}명 · 우선 재매칭 토큰 30초`;
  say('매치 해체 · 가치 보존',`${accepted}명은 기존 대기 시간을 계승하고, 거절 자리만 새 후보로 채웁니다.`);
}

function q55(){
  const members=['LEADER','TANK','HEALER','DPS'];
  return `<section class="concept-demo">${head('Q55 · 불변 roster snapshot','매치 클릭 직후 파티원이 나가면 누구를 기준으로 할까?','라이브 파티를 봉인해 매치 요청의 불변 명단을 만든 뒤 이탈을 발생시켜 보세요.')}
  <div class="mm-arena"><div class="roster-lab"><div class="roster-column"><h4>Live Party</h4>${members.map((m,i)=>`<div class="roster-member" data-live="${i}">${m}</div>`).join('')}</div><div class="roster-seal" data-seal>🔒</div><div class="roster-column" data-snapshot><h4>Match Snapshot</h4><p>아직 생성되지 않음</p></div></div></div>
  <div class="concept-controls"><button class="primary" data-mm-action="seal">매치 클릭 · 명단 봉인</button><button data-mm-action="leave">HEALER 이탈</button><button data-mm-action="reset">초기화</button></div>
  ${status('Live roster만 존재','매치 요청 시점에 party id와 roster revision을 복사해야 합니다.')}</section>`;
}
function seal55(){
  const snap=one('[data-snapshot]');snap.classList.add('is-locked');snap.innerHTML='<h4>Snapshot · rev 18</h4><div class="roster-member">LEADER</div><div class="roster-member">TANK</div><div class="roster-member">HEALER</div><div class="roster-member">DPS</div>';
  one('[data-seal]').classList.add('is-sealed');active.sealed=true;say('rev 18 봉인','이후 라이브 파티 변화가 생겨도 이미 제출한 매치 명단은 조용히 바뀌지 않습니다.');
}
function leave55(){
  one('[data-live="2"]').classList.add('is-left');
  if(active.sealed)say('라이브 파티와 snapshot 분기','HEALER 이탈을 감지해 rev 18 요청을 취소하거나 명시적 재확인을 받습니다. 몰래 3명으로 바꾸지 않습니다.');
  else say('HEALER 이탈','봉인 전 변화이므로 다음 매치 클릭은 새 roster revision으로 생성됩니다.');
}

const makers={51:q51,52:q52,53:q53,54:q54,55:q55};
function open(id){
  close(false);document.dispatchEvent(new CustomEvent('interview-demo-open',{detail:{id}}));active={id,sealed:false};
  const h=document.querySelector(`[data-flow-host="${id}"]`),b=document.querySelector(`[data-flow-open="${id}"]`);
  if(b){b.hidden=true;b.setAttribute('aria-expanded','true')}h.innerHTML=makers[id]();
  if(id===51)score51();
}
function reset(){const id=active.id;active={id,sealed:false};host().innerHTML=makers[id]();if(id===51)score51()}
function close(focus=true){
  if(!active)return;const id=active.id,h=document.querySelector(`[data-flow-host="${id}"]`),b=document.querySelector(`[data-flow-open="${id}"]`);
  if(h)h.innerHTML='';if(b){b.hidden=false;b.setAttribute('aria-expanded','false');if(focus)b.focus({preventScroll:true})}active=null;
}
function init(){
  document.addEventListener('click',e=>{
    const launch=e.target.closest('[data-flow-open]');if(launch){const id=+launch.dataset.flowOpen;if(id>=51&&id<=55){open(id);return}}
    const b=e.target.closest('[data-mm-action]');if(!b||!active)return;
    const x=b.dataset.mmAction;if(x==='close')close();if(x==='reset')reset();if(x==='seat')seat54(b);if(x==='resolve')resolve54();if(x==='seal')seal55();if(x==='leave')leave55();
  });
  document.addEventListener('input',e=>{
    if(!active)return;
    if(e.target.matches('[data-mm-weight]'))score51();
    if(e.target.matches('[data-mm-wait]'))wait52(e.target.value);
    if(e.target.matches('[data-syn]'))synergy53();
  });
  document.addEventListener('interview-demo-open',e=>{if(active&&active.id!==e.detail.id)close(false)});
}
window.MatchmakingSimulators={init};
})();
