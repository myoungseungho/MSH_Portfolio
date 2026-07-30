(function(){
'use strict';
let active=null;
const head=(k,t,d)=>`<div class="concept-head"><div><span>${k}</span><h3>${t}</h3><p>${d}</p></div><button data-social-action="close">닫기</button></div>`;
const status=(l,m)=>`<div class="concept-status" aria-live="polite"><b data-social-label>${l}</b><span data-social-message>${m}</span></div>`;
const host=()=>active?document.querySelector(`[data-flow-host="${active.id}"]`):null;
const one=s=>host()?.querySelector(s)||null;
const all=s=>host()?[...host().querySelectorAll(s)]:[];
const text=(s,v)=>{const n=one(s);if(n)n.textContent=v};
const say=(l,m)=>{text('[data-social-label]',l);text('[data-social-message]',m)};

function q56(){
 return `<section class="concept-demo">${head('Q56 · 만료형 초대 offer','초대받은 사이 다른 파티에 들어갔다면 수락은 성공할까?','초대를 권한이 아니라 만료되는 제안으로 보고, 수락 순간 현재 상태를 다시 검사하세요.')}
 <div class="mm-arena"><div class="invite-stage"><div class="invite-party">PARTY A<br>초대 발행</div><div class="invite-arrow">→</div><div class="invite-user" data-invite-user>PLAYER<br>solo</div><div class="invite-offer" data-invite-offer><i style="--life:100%" data-invite-life></i><b data-invite-time>offer I-72 · 30초</b></div></div></div>
 <div class="concept-controls"><label>경과 시간 <input type="range" min="0" max="35" value="0" data-invite-seconds><output data-invite-seconds-v>0초</output></label><button data-social-action="other">다른 파티 참가</button><button class="primary" data-social-action="accept">I-72 수락</button><button data-social-action="reset">초기화</button></div>
 ${status('초대는 아직 제안','발행 시점 상태가 아니라 수락 transaction 안에서 만료·소속·정원을 다시 확인합니다.')}</section>`;
}
function inviteTime(v){const n=+v,left=Math.max(0,30-n);text('[data-invite-seconds-v]',`${n}초`);text('[data-invite-time]',`offer I-72 · ${left}초`);one('[data-invite-life]').style.setProperty('--life',`${left/30*100}%`);one('[data-invite-offer]').classList.toggle('is-expired',left===0);active.expired=left===0}
function otherParty(){active.busy=true;one('[data-invite-user]').classList.add('is-busy');one('[data-invite-user]').innerHTML='PLAYER<br>PARTY B';say('현재 상태 변경','I-72가 남아 있어도 플레이어는 이미 PARTY B 소속입니다.')}
function acceptInvite(){if(active.expired){say('410 · offer expired','만료된 초대 ID는 재사용하지 않고 새 초대를 요청합니다.');return}if(active.busy){say('409 · membership changed','수락 순간 party membership을 원자적으로 재검사해 이중 가입을 막았습니다.');return}one('[data-invite-user]').innerHTML='PLAYER<br>PARTY A';say('수락 commit','offer 소비와 PARTY A 가입을 하나의 transaction으로 확정했습니다.')}

function q57(){
 const groups=['Raid','PvP','Social'];
 return `<section class="concept-demo">${head('Q57 · presence 구독 계층','길드원 수천 명의 상태를 모두 실시간 상세 전송할까?','요약→그룹→개인의 순서로 필요한 범위만 구독해 fan-out 비용이 어떻게 바뀌는지 보세요.')}
 <div class="mm-arena"><div class="presence-tree"><div class="presence-root">GUILD 3,000명 · online <span data-online>842</span></div><div class="presence-branches">${groups.map((g,i)=>`<div class="presence-branch" data-presence-group="${i}"><h4>${g} · ${[280,190,372][i]} online</h4>${Array.from({length:5},(_,j)=>`<span class="presence-node" data-presence-node="${i}-${j}">${g[0]}${j+1}</span>`).join('')}</div>`).join('')}</div></div><div class="presence-meter"><i data-presence-load style="--load:8%"></i></div><div class="presence-readout" data-presence-readout>요약 1건/s · 상세 0건/s</div></div>
 <div class="concept-controls"><button data-social-action="summary">길드 요약만</button><button data-social-action="group" data-group="0">Raid 구독</button><button data-social-action="group" data-group="1">PvP 구독</button><button data-social-action="detail">선택 5명 상세</button></div>
 ${status('계층 1 · 요약','전체 명단 대신 집계만 받아 대규모 길드 화면의 기본 비용을 고정합니다.')}</section>`;
}
function presence(mode,group=0){all('.presence-node').forEach(n=>n.classList.remove('is-live'));let load=8,label='요약 1건/s · 상세 0건/s';if(mode==='group'){all(`[data-presence-group="${group}"] .presence-node`).forEach(n=>n.classList.add('is-live'));load=42;label=`그룹 ${group+1} · 요약 1건/s · 상태 190건/s`;say('계층 2 · 그룹 구독','펼쳐 본 하위 그룹에만 presence 변경 스트림을 붙입니다.')}else if(mode==='detail'){all('.presence-node').slice(0,5).forEach(n=>n.classList.add('is-live'));load=18;label='요약 1건/s · 선택 상세 5건/s';say('계층 3 · 선택 상세','프로필을 연 소수 대상만 위치·활동 같은 상세 상태를 받습니다.')}else say('계층 1 · 요약','전체 길드에는 online 수와 그룹 집계만 전송합니다.');one('[data-presence-load]').style.setProperty('--load',`${load}%`);text('[data-presence-readout]',label)}

function q58(){
 return `<section class="concept-demo">${head('Q58 · 명령 순서와 불변식','추방과 권한 변경이 동시에 오면 어떤 결과가 안전할까?','같은 guild revision을 겨눈 두 명령의 순서를 바꾸고, 멤버가 아닌 사람에게 역할이 남지 않는지 확인하세요.')}
 <div class="mm-arena"><div class="race-lab"><div class="race-command" data-race="kick"><b>KICK U7</b><span>expected revision 40</span></div><div class="race-command" data-race="role"><b>ROLE U7 → officer</b><span>expected revision 40</span></div><div class="race-invariant" data-race-invariant>불변식 · role 보유자 ⊂ guild member</div></div></div>
 <div class="concept-controls"><button data-social-action="race" data-order="kick">KICK 먼저 도착</button><button data-social-action="race" data-order="role">ROLE 먼저 도착</button><label><input type="checkbox" checked data-race-guard> revision guard</label><button data-social-action="reset">초기화</button></div>
 ${status('revision 40 대기','명령은 같은 aggregate에서 직렬화하고 expected revision으로 stale write를 거부합니다.')}</section>`;
}
function race(order){const guard=one('[data-race-guard]').checked,k=one('[data-race="kick"]'),r=one('[data-race="role"]'),inv=one('[data-race-invariant]');k.className='race-command';r.className='race-command';(order==='kick'?k:r).classList.add('is-first','is-applied');if(guard){(order==='kick'?r:k).classList.add(order==='kick'?'is-rejected':'is-applied');if(order==='role')k.classList.add('is-applied');inv.className='race-invariant is-safe';say('불변식 유지',order==='kick'?'KICK이 revision 41을 만든 뒤 stale ROLE은 거부됩니다.':'ROLE revision 41 뒤 KICK revision 42가 멤버와 역할을 함께 제거합니다.')}else{r.classList.add('is-applied');k.classList.add('is-applied');inv.className='race-invariant is-broken';say('불변식 파괴','서로 다른 저장소가 순서 없이 쓰면 추방된 U7의 officer 권한이 남을 수 있습니다.')}}

function q59(){
 return `<section class="concept-demo">${head('Q59 · replay 가능한 결과 원장','승패 저장 직전 서버가 죽어도 보상은 한 번만 지급될까?','결과를 원장에 먼저 append한 뒤 장애와 replay를 거쳐 rating·reward가 수렴하는지 확인하세요.')}
 <div class="mm-arena"><div class="result-pipeline"><div class="result-node" data-result="match">MATCH<br>ended</div><div class="result-node" data-result="ledger">LEDGER<br>empty</div><div class="result-node" data-result="rating">RATING<br>pending</div><div class="result-node" data-result="reward">REWARD<br>pending</div></div><div class="result-ledger" data-result-log>M-881 · no record</div></div>
 <div class="concept-controls"><button class="primary" data-social-action="append">결과 append</button><button data-social-action="crash">소비자 장애</button><button data-social-action="replay">원장 replay</button><button data-social-action="reset">초기화</button></div>
 ${status('결과 미기록','match result ID M-881을 durable ledger에 먼저 남겨야 복구 기준이 생깁니다.')}</section>`;
}
function append(){one('[data-result="ledger"]').classList.add('is-written');one('[data-result="ledger"]').innerHTML='LEDGER<br>M-881';text('[data-result-log]','M-881 · committed · rating offset - · reward offset -');active.appended=true;say('원장 commit','게임 서버 응답과 무관하게 M-881은 재처리 가능한 사실이 됐습니다.')}
function crash(){one('[data-result="rating"]').classList.add('is-crashed');one('[data-result="reward"]').classList.add('is-crashed');say('소비자 중단','결과 원장은 남아 있으므로 장애는 보상 유실이 아니라 처리 지연입니다.')}
function replay(){if(!active.appended){say('replay 기준 없음','먼저 결과를 원장에 commit해야 합니다.');return}['rating','reward'].forEach(x=>{one(`[data-result="${x}"]`).className='result-node is-replayed';one(`[data-result="${x}"]`).innerHTML=`${x.toUpperCase()}<br>M-881 done`});text('[data-result-log]','M-881 · committed · rating offset 912 · reward offset 912');say('정확히 한 번의 효과','소비자는 M-881을 멱등 키로 사용해 replay가 반복돼도 rating과 reward 효과를 한 번만 만듭니다.')}

function q60(){
 return `<section class="concept-demo">${head('Q60 · 관계·시간 기반 악용 탐지','한 경기의 낮은 점수만으로 고의 패배를 단정할 수 있을까?','반복 파티·상대 관계·시간 패턴을 합쳐 신뢰도를 높이고 가역적 조치부터 적용하세요.')}
 <div class="mm-arena"><div class="abuse-map"><i class="abuse-edge" style="--x:24%;--y:30%;--w:48%;--r:20deg" data-abuse-edge></i><i class="abuse-edge" style="--x:26%;--y:72%;--w:45%;--r:-20deg" data-abuse-edge></i><i class="abuse-edge" style="--x:50%;--y:22%;--w:2px;--r:90deg" data-abuse-edge></i>${[['A',22,28],['B',76,28],['C',25,74],['D',75,74],['S',50,50]].map(x=>`<div class="abuse-node" style="--x:${x[1]}%;--y:${x[2]}%" data-abuse-node="${x[0]}">${x[0]}</div>`).join('')}</div><div class="abuse-action"><div data-sanction="0">관찰 강화</div><div data-sanction="1">매칭 분리</div><div data-sanction="2">계정 제재</div></div></div>
 <div class="concept-controls"><label><input type="checkbox" data-signal> 반복 상대 12회</label><label><input type="checkbox" data-signal> 새벽 동시간대</label><label><input type="checkbox" data-signal> 일방적 자원 이전</label></div>
 ${status('단일 경기 · 증거 부족','낮은 점수만으로 자동 영구 제재하지 않고 여러 관계 신호를 시간축으로 결합합니다.')}</section>`;
}
function abuse(){const n=all('[data-signal]:checked').length;all('[data-abuse-edge]').forEach((x,i)=>x.classList.toggle('is-suspicious',i<n));all('[data-abuse-node]').forEach((x,i)=>x.classList.toggle('is-flagged',n===3&&i===4));all('[data-sanction]').forEach((x,i)=>x.classList.toggle('is-on',i===Math.max(0,n-1)));say(n===0?'증거 부족':n===1?'관찰 강화':n===2?'고위험 군집 · 매칭 분리':'검토 큐 전송',n<3?'가역적 조치와 추가 증거 수집을 우선합니다.':'세 신호가 함께 반복될 때 사람 검토와 소명 가능한 제재 단계로 올립니다.')}

const makers={56:q56,57:q57,58:q58,59:q59,60:q60};
function open(id){close(false);document.dispatchEvent(new CustomEvent('interview-demo-open',{detail:{id}}));active={id,busy:false,expired:false,appended:false};const h=document.querySelector(`[data-flow-host="${id}"]`),b=document.querySelector(`[data-flow-open="${id}"]`);if(b){b.hidden=true;b.setAttribute('aria-expanded','true')}h.innerHTML=makers[id]()}
function reset(){const id=active.id;active={id,busy:false,expired:false,appended:false};host().innerHTML=makers[id]()}
function close(focus=true){if(!active)return;const id=active.id,h=document.querySelector(`[data-flow-host="${id}"]`),b=document.querySelector(`[data-flow-open="${id}"]`);if(h)h.innerHTML='';if(b){b.hidden=false;b.setAttribute('aria-expanded','false');if(focus)b.focus({preventScroll:true})}active=null}
function init(){
 document.addEventListener('click',e=>{const o=e.target.closest('[data-flow-open]');if(o){const id=+o.dataset.flowOpen;if(id>=56&&id<=60){open(id);return}}const b=e.target.closest('[data-social-action]');if(!b||!active)return;const x=b.dataset.socialAction;if(x==='close')close();if(x==='reset')reset();if(x==='other')otherParty();if(x==='accept')acceptInvite();if(x==='summary')presence('summary');if(x==='group')presence('group',+b.dataset.group);if(x==='detail')presence('detail');if(x==='race')race(b.dataset.order);if(x==='append')append();if(x==='crash')crash();if(x==='replay')replay()});
 document.addEventListener('input',e=>{if(!active)return;if(e.target.matches('[data-invite-seconds]'))inviteTime(e.target.value);if(e.target.matches('[data-race-guard]'))say(e.target.checked?'revision guard ON':'revision guard OFF',e.target.checked?'stale command를 거부합니다.':'순서가 갈린 저장에서 불변식이 깨질 수 있습니다.');if(e.target.matches('[data-signal]'))abuse()});
 document.addEventListener('interview-demo-open',e=>{if(active&&active.id!==e.detail.id)close(false)});
}
window.SocialSimulators={init};
})();
