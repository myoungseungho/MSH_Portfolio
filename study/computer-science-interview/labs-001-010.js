(function(){
  'use strict';
  const head=(id,title,description)=>`<div class="lab-head"><div><h3>Q${id} · ${title}</h3><p>${description}</p></div><button type="button" class="lab-close" data-lab-close>닫기</button></div>`;
  const status=(label,message)=>`<div class="lab-status" aria-live="polite"><b data-status-label>${label}</b><span data-status-message>${message}</span></div>`;
  const set=(host,selector,value)=>{const node=host.querySelector(selector);if(node)node.textContent=value};

  CSLabs.register(1,{
    html:()=>`<section class="cs-lab float-origin-lab">${head(1,'0과 1 사이의 숫자를 저장하는 방법','전문 용어 없이 출발합니다. 정수만으로 움직여 보고, 막힐 때마다 다음 저장 방법을 직접 만들어 보세요.')}
      <ol class="float-path" data-float-path><li class="active"><button type="button" data-float-jump="0" aria-current="step">1. 정수</button></li><li><button type="button" data-float-jump="1">2. 단위</button></li><li><button type="button" data-float-jump="2">3. 칸의 한계</button></li><li><button type="button" data-float-jump="3">4. 위치 저장</button></li><li><button type="button" data-float-jump="4">5. 한 가지 꼴</button></li><li><button type="button" data-float-jump="5">6. 실제 32비트</button></li><li><button type="button" data-float-jump="6">7. 가수의 일</button></li><li><button type="button" data-float-jump="7">8. 지수의 일</button></li><li><button type="button" data-float-jump="8">9. 생긴 대가</button></li><li><button type="button" data-float-jump="9">10. 타입 선택</button></li></ol>
      <div class="float-scene" data-float-scene></div>
      <div class="lab-controls"><button type="button" data-float-prev disabled>이전 질문</button><button type="button" class="primary" data-float-next>다음 질문</button><button type="button" data-float-reset>처음부터</button></div>
      ${status('1 / 10 · 정수만 써 보기','0.1m 이동을 정수로 저장하면 실제 캐릭터가 어떻게 되는지 눌러 보세요.')}</section>`,
    bind:host=>{
      let step=0,position=0,unit='meter',scale=-3,significandBits=23,exponentBits=8,choice={};
      const scene=host.querySelector('[data-float-scene]');
      const setStatus=(label,message)=>{set(host,'[data-status-label]',label);set(host,'[data-status-message]',message)};
      const render=()=>{
        host.querySelectorAll('[data-float-path] li').forEach((node,i)=>{const active=i===step;node.classList.toggle('active',active);const button=node.querySelector('button');if(active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current')});
        if(step===0){
          scene.innerHTML=`<div class="first-number-world"><div class="potion-count"><span>포션</span><b>🧪 🧪 🧪</b><small>3개 → 정수 3</small></div><div class="integer-track"><i data-runner style="left:${position*8}%">캐릭터</i><span>0m</span><span>1m</span></div></div><p class="float-question">캐릭터를 0.1m 움직이라는 명령을 정수 칸 하나에 넣으면?</p><div class="float-role-choice"><button type="button" data-integer-move="round">가까운 정수로 저장</button><button type="button" data-integer-move="keep">0.1을 그대로 적기</button></div>`;
          scene.querySelector('[data-integer-move="round"]').onclick=()=>{setStatus('1 / 10 · 0.1이 0으로 사라짐','정수 칸에는 0과 1만 있고 그 사이는 없습니다. 매 프레임 0.1을 0으로 만들면 캐릭터는 영원히 움직이지 않습니다.')};
          scene.querySelector('[data-integer-move="keep"]').onclick=()=>{setStatus('1 / 10 · 새로운 저장 규칙이 필요','“0.1을 적자”가 바로 문제입니다. 컴퓨터는 제한된 칸에 어떤 규칙으로 0.1을 기록할지 정해야 합니다.')};
          setStatus('1 / 10 · 세는 수와 재는 수','포션처럼 개수를 세는 값에는 정수가 완벽합니다. 하지만 이동 거리는 두 정수 사이의 값도 필요합니다.');
        }else if(step===1){
          const cm=unit==='centimeter';
          scene.innerHTML=`<div class="unit-conversion"><div><span>이동 명령</span><b>0.1 m</b></div><i>=</i><div><span>저장할 정수</span><b>${cm?'10 cm':'0 m'}</b></div></div><p class="float-question">소수 대신 더 작은 단위의 개수를 세면 어떨까요?</p><div class="float-role-choice"><button type="button" data-unit-choice="meter" class="${cm?'':'selected'}">1칸 = 1m</button><button type="button" data-unit-choice="centimeter" class="${cm?'selected':''}">1칸 = 1cm</button></div>`;
          scene.querySelectorAll('[data-unit-choice]').forEach(button=>button.onclick=()=>{unit=button.dataset.unitChoice;render()});
          setStatus('2 / 10 · 단위를 바꾸면 정수로 가능',cm?'0.1m는 10cm입니다. 소수 없이 정수 10으로 정확히 저장했습니다. 이것이 고정소수점의 가장 쉬운 생각입니다.':'1m 단위에서는 0.1m가 정수 0이 됩니다. 더 작은 단위를 골라 보세요.');
        }else if(step===2){
          scene.innerHTML=`<div class="digit-box"><b>숫자를 적을 칸은 6개뿐</b><div>□ □ □ □ □ □</div></div><div class="fixed-choice"><button type="button" data-box-unit="small">1칸 = 0.001m<br><small>작은 이동 0.001m ✓<br>최대 거리 999.999m</small></button><button type="button" data-box-unit="large">1칸 = 1m<br><small>최대 거리 999,999m ✓<br>0.001m 이동 → 0</small></button></div>`;
          scene.querySelector('[data-box-unit="small"]').onclick=()=>setStatus('3 / 10 · 작은 값을 살리면 큰 값이 안 들어감','칸 수가 정해져 있으므로 단위를 1,000배 작게 만들면 최대 범위도 1,000배 짧아집니다.');
          scene.querySelector('[data-box-unit="large"]').onclick=()=>setStatus('3 / 10 · 큰 값을 살리면 작은 값이 사라짐','단위를 크게 잡으면 멀리 갈 수 있지만 그 단위보다 작은 움직임은 정수 0이 됩니다. 한 가지 고정 단위에는 양쪽을 모두 얻을 수 없습니다.');
          setStatus('3 / 10 · “가장 작은 단위”도 공짜가 아님','숫자를 적을 칸이 무한하지 않다면 정밀한 단위와 넓은 범위가 서로 자리를 빼앗습니다. 두 선택을 눌러 보세요.');
        }else if(step===3){
          const value=1234*Math.pow(10,scale),shown=scale>=0?value.toLocaleString():value.toFixed(Math.abs(scale));
          scene.innerHTML=`<div class="floating-invention"><div><span>기억할 네 숫자</span><b>1 2 3 4</b></div><div><span>소수점 이동 정보</span><b>10<sup>${scale}</sup></b></div><strong>= ${shown}</strong></div><label class="decimal-shift">소수점 위치를 움직여 보세요 <input type="range" min="-6" max="3" value="${scale}" data-scale></label><div class="name-reveal" data-name-reveal></div>`;
          scene.querySelector('[data-scale]').oninput=e=>{scale=Number(e.target.value);render()};
          scene.querySelector('[data-name-reveal]').innerHTML='<b>개발자의 발상:</b> 숫자 네 자리는 그대로 두고 소수점 위치만 함께 저장하면, 같은 칸으로 아주 작은 값과 큰 값을 오갈 수 있습니다.';
          setStatus('4 / 10 · 소수점 위치도 숫자의 일부로 저장','소수점이 한곳에 고정되지 않고 값에 따라 떠다닙니다. 그래서 이 방식의 이름이 floating point, 부동소수점입니다. 아직 이름은 외우지 말고 두 정보를 한 묶음으로 저장한다는 생각만 잡으세요.');
        }else if(step===4){
          scene.innerHTML=`<p class="float-question">1,234를 적는 방법이 셋이면 컴퓨터는 어느 꼴을 약속해야 할까요?</p><div class="normalize-choice"><button type="button" data-normal="a">0.1234 × 10⁴</button><button type="button" data-normal="b">1.234 × 10³</button><button type="button" data-normal="c">12.34 × 10²</button></div><div class="normalize-result" data-normal-result>셋은 모두 같은 1,234입니다.</div>`;
          scene.querySelectorAll('[data-normal]').forEach(button=>button.onclick=()=>{const canonical=button.dataset.normal==='b';scene.querySelector('[data-normal-result]').innerHTML=canonical?'<b>이 꼴을 선택합니다.</b> 맨 앞의 0이 아닌 숫자 하나만 소수점 왼쪽에 두면 같은 값을 항상 한 가지 모습으로 저장할 수 있습니다.':'값은 맞지만 같은 수의 저장 모습이 여러 개가 됩니다. 컴퓨터끼리 비교하고 계산하기 쉽게 한 가지 규칙으로 정리해 봅시다.';setStatus('5 / 10 · 같은 수를 한 가지 모습으로',canonical?'이 과정을 정규화라고 합니다. 이진수에서는 항상 1.xxxx₂ × 2ⁿ 꼴로 맞춥니다.':'세 식은 모두 맞지만 한 값을 여러 비트 모양으로 저장하면 비교와 회로가 복잡해집니다.')});
          setStatus('5 / 10 · 저장 모습도 약속이 필요','세 버튼은 모두 1,234입니다. 어느 하나를 표준 모습으로 정하면 좋을지 골라 보세요.');
        }else if(step===5){
          scene.innerHTML=`<div class="float32-layout"><button type="button" class="sign" data-float-field="sign"><b>1 bit</b><span>부호</span></button><button type="button" class="exponent" data-float-field="exponent"><b>8 bits</b><span>위치 정보</span></button><button type="button" class="fraction" data-float-field="fraction"><b>23 bits</b><span>유효 숫자</span></button></div><div class="field-explanation" data-field-explanation>세 영역을 눌러 각자 맡은 일을 확인하세요.</div>`;
          const messages={sign:'양수인지 음수인지 한 칸으로 기억합니다.',exponent:'2를 몇 번 곱하거나 나눌지 저장합니다. 소수점의 위치와 숫자의 큰 범위를 맡으며, 정식 이름은 지수입니다.',fraction:'정규화된 1.xxxx₂에서 xxxx 부분을 저장합니다. 값 주변을 얼마나 촘촘히 나눌지 맡으며, 흔히 가수부라고 부릅니다. 앞의 1은 항상 있으므로 실제로는 생략해 한 비트를 더 씁니다.'};
          scene.querySelectorAll('[data-float-field]').forEach(button=>button.onclick=()=>{set(scene,'[data-field-explanation]',messages[button.dataset.floatField]);setStatus('6 / 10 · 실제 float32 한 묶음','32비트 하나 안에 부호 1비트, 지수 8비트, 가수부 23비트가 함께 들어갑니다. 각 영역은 따로 변수가 아니라 한 값의 부품입니다.')});
          setStatus('6 / 10 · 이제 실제 저장 칸을 본다','앞에서 직접 만든 “유효 숫자 + 소수점 위치”를 컴퓨터는 이진수 32칸에 나누어 넣습니다.');
        }else if(step===6){
          const gap=Math.pow(2,3-significandBits),base=8,format=value=>value.toLocaleString(undefined,{maximumFractionDigits:9});
          scene.innerHTML=`<label class="decimal-shift">저장할 가수부 비트 <b>${significandBits} bits${significandBits===23?' · 실제 float32':''}</b><input type="range" min="2" max="23" value="${significandBits}" data-significand-bits></label><div class="fraction-bits"><b>1.</b>${Array.from({length:23},(_,i)=>`<i class="${i<significandBits?'kept':''}">${i%3===0?'1':'0'}</i>`).join('')}<span>₂ × 2³</span></div><div class="precision-neighbors"><span>${format(base)}</span><i>다음 표현 값까지 ${format(gap)}</i><span>${format(base+gap)}</span></div><p>앞의 1은 정규화 규칙으로 생략하고, 뒤의 ${significandBits}비트를 저장합니다. float32의 기본 상태는 23비트이며 슬라이더는 비교를 위해 일부 비트를 일부러 버려 보는 실험입니다.</p>`;
          scene.querySelector('[data-significand-bits]').oninput=e=>{significandBits=Number(e.target.value);render()};
          setStatus('7 / 10 · 가수부는 같은 크기 안의 촘촘함을 맡는다',`2³, 즉 8 근처에서 가수부 ${significandBits}비트를 쓰면 이웃 float 간격은 ${format(gap)}입니다. 23비트를 모두 쓰는 상태가 실제 float32입니다.`);
        }else if(step===7){
          const bias=Math.pow(2,exponentBits-1)-1,min=1-bias,max=Math.pow(2,exponentBits)-2-bias;
          scene.innerHTML=`<label class="decimal-shift">저장할 지수 비트 <b>${exponentBits} bits${exponentBits===8?' · 실제 float32':''}</b><input type="range" min="3" max="8" value="${exponentBits}" data-exponent-bits></label><div class="exponent-range"><span>가장 작은 보통 지수 <b>2<sup>${min}</sup></b></span><i>…</i><span>가장 큰 보통 지수 <b>2<sup>${max}</sup></b></span></div><p>가수부는 그대로 두고 지수부만 일부러 줄여 보는 비교입니다. 8비트를 모두 쓰는 상태가 실제 float32입니다.</p>`;
          scene.querySelector('[data-exponent-bits]').oninput=e=>{exponentBits=Number(e.target.value);render()};
          setStatus('8 / 10 · 지수는 범위를 맡는다',`${exponentBits}비트면 보통 값의 크기를 대략 2^${min}부터 2^${max}까지 옮길 수 있습니다. 지수 칸은 멀리 가게 하지만 그 구간의 눈금을 촘촘하게 만들지는 않습니다.`);
        }else if(step===8){
          const gap=Math.pow(10,scale),start=1234*gap;
          scene.innerHTML=`<label class="decimal-shift">소수점 위치 <input type="range" min="-3" max="3" value="${scale}" data-gap-scale></label><div class="float-ruler">${Array.from({length:6},(_,i)=>`<i><b>${(start+i*gap).toLocaleString()}</b></i>`).join('')}</div><p>기억하는 숫자는 네 자리로 고정되어 있습니다. 현재 이웃 숫자 사이의 간격은 <b>${gap.toLocaleString()}</b>입니다.</p>`;
          scene.querySelector('[data-gap-scale]').oninput=e=>{scale=Number(e.target.value);render()};
          setStatus('9 / 10 · 넓은 범위의 대가',`지수가 소수점을 오른쪽으로 옮겨도 가수가 기억하는 숫자 칸은 네 개 그대로입니다. 그래서 더 큰 수를 담는 대신 이웃 값의 간격도 ${gap.toLocaleString()}만큼 벌어집니다.`);
        }else{
          scene.innerHTML=`<p class="float-question">마지막 질문: 값마다 필요한 약속은 무엇일까요?</p><div class="type-choice"><button type="button" data-value-type="gold">골드 10,001<br><small>1골드도 사라지면 안 됨</small></button><button type="button" data-value-type="motion">캐릭터 위치 12.347m<br><small>아주 작은 오차 허용</small></button><button type="button" data-value-type="light">빛의 세기<br><small>작은 값부터 큰 값까지 필요</small></button></div>`;
          scene.querySelectorAll('[data-value-type]').forEach(button=>button.onclick=()=>{const type=button.dataset.valueType;choice[type]=true;const answer=type==='gold'?'정수: 개수의 정확성이 계약입니다.':type==='motion'?'float: 연속적인 측정값을 충분한 정밀도로 빠르게 다룹니다.':'float: 넓은 크기 범위를 제한된 칸에 담는 장점이 큽니다.';setStatus('10 / 10 · 숫자 타입은 값의 약속',answer);if(Object.keys(choice).length===3)document.dispatchEvent(new CustomEvent('cs-discovery-complete',{detail:{id:1}}))});
          setStatus('10 / 10 · 이제 타입을 고를 수 있음','float가 더 좋은 숫자도, 나쁜 숫자도 아닙니다. 각 값을 눌러 정확한 개수와 근사 가능한 측정값을 구분해 보세요.');
        }
        host.querySelector('[data-float-prev]').disabled=step===0;
        host.querySelector('[data-float-next]').textContent=step===9?'처음부터 다시':'다음 질문';
      };
      host.querySelectorAll('[data-float-jump]').forEach(button=>button.onclick=()=>{step=Number(button.dataset.floatJump);render()});host.querySelector('[data-float-prev]').onclick=()=>{if(step>0){step--;render()}};host.querySelector('[data-float-next]').onclick=()=>{step=(step+1)%10;render()};host.querySelector('[data-float-reset]').onclick=()=>{step=0;position=0;unit='meter';scale=-3;significandBits=23;exponentBits=8;choice={};render()};render();
    }
  });

  CSLabs.register(2,{
    html:()=>`<section class="cs-lab determinism-lab">${head(2,'반올림 한 번이 세계를 가르는 과정','한 줄의 계산에서 먼저 다른 결과를 만든 뒤, 같은 차이가 충돌 분기로 증폭되는 순서를 진행하세요.')}
      <div class="det-math" data-det-math><b>1.01 × 1.01 − 1.02</b><span>정확한 답은 0.0001입니다.</span></div>
      <div class="det-track">
        <div class="det-wall"></div><div class="det-car pc" data-pc-car><span>PC</span></div><div class="det-car console" data-console-car><span>CONSOLE</span></div>
        <div class="det-marker" data-det-marker>충돌 분기 72.0m</div>
      </div>
      <div class="det-readout"><span>tick <b data-tick>0</b></span><span>PC <b data-pc>0.000000</b></span><span>Console <b data-console>0.000000</b></span><span>오차 <b data-error>0</b></span></div>
      <div class="lab-controls"><button type="button" data-round>중간에서 반올림</button><button type="button" data-fuse>한 번에 반올림</button><button type="button" data-step>1 tick</button><button type="button" class="primary" data-run>30 tick 진행</button><button type="button" data-reset>초기화</button></div>
      ${status('1 / 2 · 같은 식, 다른 반올림 지점','먼저 두 계산 경로가 왜 같은 수학식인데 다른 값이 되는지 확인하세요.')}</section>`,
    bind:host=>{
      let tick=0,pc=0,consoleX=0,run=0,timers=new Set();
      const draw=()=>{const scale=x=>Math.min(92,x/80*92);host.querySelector('[data-pc-car]').style.left=`${scale(pc)}%`;host.querySelector('[data-console-car]').style.left=`${scale(consoleX)}%`;set(host,'[data-tick]',tick);set(host,'[data-pc]',pc.toFixed(6));set(host,'[data-console]',consoleX.toFixed(6));set(host,'[data-error]',Math.abs(pc-consoleX).toExponential(2));if((pc>=72)!==(consoleX>=72)){set(host,'[data-status-label]','코드 경로 발산');set(host,'[data-status-message]','한 플랫폼만 충돌 임계값을 넘었습니다. 이후 상태는 작은 오차가 아니라 다른 사건입니다.')}};
      const step=()=>{tick++;const a=Math.fround(Math.fround(tick*.0137)*.91);pc=Math.fround(pc+Math.fround(1.001+a));consoleX=Math.fround(consoleX+1.001)+Math.fround(a);if(pc>=72)pc=Math.fround(pc*.82);if(consoleX>=72)consoleX=Math.fround(consoleX*.82);draw()};
      const calc=mode=>{const round=x=>{if(x===0)return 0;const p=Math.pow(10,2-Math.floor(Math.log10(Math.abs(x))));return Math.round(x*p)/p};const value=mode==='split'?round(round(1.01*1.01)-1.02):round(1.01*1.01-1.02);host.querySelector('[data-det-math]').innerHTML=mode==='split'?`<b>round₃(round₃(1.01 × 1.01) − 1.02)</b><span>1.0201 → 1.02 → <strong>${value}</strong> : 곱셈 뒤 이미 정보가 사라졌습니다.</span>`:`<b>round₃(1.01 × 1.01 − 1.02)</b><span>1.0201 − 1.02 → <strong>${value}</strong> : 마지막에 한 번만 반올림했습니다.</span>`;set(host,'[data-status-label]',mode==='split'?'1 / 2 · 중간 반올림으로 0이 됨':'1 / 2 · 계산 경로가 결과의 일부');set(host,'[data-status-message]',mode==='split'?'FMA 사용 여부처럼 중간 결과를 언제 반올림하는지가 다르면 같은 소스 수식도 다른 비트 결과가 됩니다.':'이제 아래에서 이 작은 차이가 충돌 임계값을 넘으며 어떻게 다른 사건이 되는지 진행해 보세요.')};
      host.querySelector('[data-round]').addEventListener('click',()=>calc('split'));host.querySelector('[data-fuse]').addEventListener('click',()=>calc('fuse'));
      host.querySelector('[data-step]').addEventListener('click',()=>{calc('fuse');step()});
      host.querySelector('[data-run]').addEventListener('click',()=>{const token=++run;let n=0;const next=()=>{if(token!==run||n++>=30)return;step();const id=setTimeout(()=>{timers.delete(id);next()},22);timers.add(id)};next()});
      host.querySelector('[data-reset]').addEventListener('click',()=>{run++;timers.forEach(clearTimeout);timers.clear();tick=0;pc=0;consoleX=0;host.querySelector('[data-det-math]').innerHTML='<b>1.01 × 1.01 − 1.02</b><span>정확한 답은 0.0001입니다.</span>';set(host,'[data-status-label]','1 / 2 · 같은 식, 다른 반올림 지점');set(host,'[data-status-message]','먼저 두 계산 경로가 왜 같은 수학식인데 다른 값이 되는지 확인하세요.');draw()});draw();
      return()=>{run++;timers.forEach(clearTimeout)};
    }
  });

  CSLabs.register(3,{
    html:()=>`<section class="cs-lab bytes-lab">${head(3,'메모리 배치와 저장 스키마','컴파일러 배치가 바뀔 때 raw struct와 명시적 필드가 어떻게 달라지는지 비교하세요.')}
      <div class="byte-columns">
        <div><h4>프로세스 메모리</h4><div class="byte-strip" data-raw-bytes></div><p data-raw-layout></p></div>
        <div><h4>외부 저장 스키마</h4><div class="schema-record" data-schema></div><p>field ID · type · length · value</p></div>
      </div>
      <div class="lab-controls"><button type="button" data-layout="a">ABI A</button><button type="button" data-layout="b">ABI B</button><button type="button" class="primary" data-add-field>shield 필드 추가</button></div>
      ${status('같은 의미, 다른 바이트','ABI를 바꾸고 raw offset이 이동하는지 확인하세요.')}</section>`,
    bind:host=>{
      let abi='a',shield=false;
      const draw=()=>{
        const fields=abi==='a'?[['job',1,'field'],['pad',3,'pad'],['level',4,'field'],['hp',4,'field']]:[['job',1,'field'],['level',4,'field'],['hp',4,'field'],['pad',3,'pad']];
        if(shield)fields.splice(abi==='a'?3:2,0,['shield',4,'new']);
        let offset=0;host.querySelector('[data-raw-bytes]').innerHTML=fields.map(([name,size,kind])=>{const start=offset;offset+=size;return `<span class="${kind}" style="--bytes:${size}"><b>${name}</b><small>${start}..${offset-1}</small></span>`}).join('');
        set(host,'[data-raw-layout]',`sizeof(Player) = ${offset} bytes · ${abi==='a'?'padding 포함':'필드 재배치 ABI'}`);
        const schema=[['1','job','u8'],['2','level','u32'],...(shield?[['4','shield','u32']]:[]),['3','hp','u32']];
        host.querySelector('[data-schema]').innerHTML=schema.map(x=>`<span><i>#${x[0]}</i><b>${x[1]}</b><small>${x[2]}</small></span>`).join('');
        set(host,'[data-status-label]',shield?'스키마는 기존 ID 유지':'외부 계약 분리');
        set(host,'[data-status-message]',shield?'새 필드가 추가돼도 level=#2, hp=#3의 의미는 이동하지 않습니다.':'메모리 offset이 달라도 저장 필드의 의미는 그대로입니다.');
      };
      host.querySelectorAll('[data-layout]').forEach(b=>b.addEventListener('click',()=>{abi=b.dataset.layout;draw()}));
      host.querySelector('[data-add-field]').addEventListener('click',()=>{shield=!shield;draw()});draw();
    }
  });

  CSLabs.register(4,{
    html:()=>`<section class="cs-lab text-lab">${head(4,'보이는 글자의 경계','같은 문자열을 바이트·코드 포인트·grapheme 단위로 잘라 결과를 비교하세요.')}
      <label class="text-input">닉네임 <input type="text" value="가족👨‍👩‍👧‍👦Café" data-text></label>
      <div class="text-ruler" data-text-ruler></div>
      <div class="text-result"><span>잘린 결과</span><strong data-cut-result></strong><small data-text-meta></small></div>
      <div class="lab-controls"><label>자를 단위 <select data-cut-mode><option value="bytes">UTF-8 바이트</option><option value="points">코드 포인트</option><option value="clusters">보이는 글자</option></select></label><label>길이 <input type="range" min="1" max="12" value="7" data-cut><output data-cut-out>7</output></label></div>
      ${status('단위가 다른 길이','색 칸 하나는 선택한 단위 하나입니다.')}</section>`,
    bind:host=>{
      const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:false}),segmenter=Intl.Segmenter?new Intl.Segmenter('ko',{granularity:'grapheme'}):null;
      const units=(text,mode)=>mode==='bytes'?[...enc.encode(text)].map(x=>x.toString(16).padStart(2,'0')):mode==='points'?[...text]:segmenter?[...segmenter.segment(text)].map(x=>x.segment):[...text];
      const draw=()=>{const text=host.querySelector('[data-text]').value,mode=host.querySelector('[data-cut-mode]').value,n=Number(host.querySelector('[data-cut]').value),list=units(text,mode);host.querySelector('[data-text-ruler]').innerHTML=list.map((x,i)=>`<span class="${i<n?'kept':''}">${x}</span>`).join('');let out;if(mode==='bytes')out=dec.decode(enc.encode(text).slice(0,n));else out=list.slice(0,n).join('');set(host,'[data-cut-result]',out+'…');set(host,'[data-cut-out]',n);set(host,'[data-text-meta]',`${enc.encode(text).length} bytes · ${[...text].length} code points · ${units(text,'clusters').length} graphemes`);const broken=mode==='bytes'&&out.includes('�');set(host,'[data-status-label]',broken?'인코딩 파손':'유효한 경계');set(host,'[data-status-message]',broken?'멀티바이트 문자의 중간을 잘라 replacement character가 생겼습니다.':'선택한 단위의 경계에서 문자열이 잘렸습니다.');};
      host.querySelectorAll('input,select').forEach(n=>{n.addEventListener('input',draw);n.addEventListener('change',draw)});draw();
    }
  });

  CSLabs.register(5,{
    html:()=>`<section class="cs-lab clock-lab">${head(5,'한 바퀴 도는 tick 시계','32비트 끝을 지나며 일반 대소 비교와 경과량 비교를 대조하세요.')}
      <div class="clock-face"><div class="clock-arc"></div><i data-clock-hand></i><span class="zero">0</span><span class="max">2³²−1</span><strong data-clock-now>4,294,967,290</strong></div>
      <div class="clock-events"><span class="deadline">deadline <b data-deadline>4</b></span><span class="naive-check" data-naive>naive: 기다림</span><span class="safe-check" data-safe>wrap-safe: 기다림</span></div>
      <div class="lab-controls"><button type="button" data-tick>+1 ms</button><button type="button" class="primary" data-tick-ten>+10 ms</button><button type="button" data-clock-reset>경계로 초기화</button></div>
      ${status('wrap 직전','deadline은 숫자로 작지만 실제로는 10ms 뒤입니다.')}</section>`,
    bind:host=>{
      let now=0xfffffffA>>>0,deadline=(now+10)>>>0;
      const draw=()=>{set(host,'[data-clock-now]',now.toLocaleString());set(host,'[data-deadline]',deadline.toLocaleString());host.querySelector('[data-clock-hand]').style.transform=`rotate(${(now%64)/64*300-150}deg)`;const naive=now>=deadline,safe=((now-deadline)|0)>=0;set(host,'[data-naive]',`naive: ${naive?'만료':'기다림'}`);set(host,'[data-safe]',`wrap-safe: ${safe?'만료':'기다림'}`);host.querySelector('[data-naive]').classList.toggle('wrong',naive!==safe);set(host,'[data-status-label]',naive===safe?'판정 일치':'일반 비교 실패');set(host,'[data-status-message]',naive===safe?'현재 지점에서는 두 비교가 같은 결과입니다.':'숫자 대소는 모듈러 시계의 앞뒤를 설명하지 못합니다.');};
      host.querySelector('[data-tick]').addEventListener('click',()=>{now=(now+1)>>>0;draw()});host.querySelector('[data-tick-ten]').addEventListener('click',()=>{now=(now+10)>>>0;draw()});host.querySelector('[data-clock-reset]').addEventListener('click',()=>{now=0xfffffffA>>>0;deadline=(now+10)>>>0;draw()});draw();
    }
  });

  CSLabs.register(6,{
    html:()=>`<section class="cs-lab quant-lab">${head(6,'안개 양자화 계단','비트 수와 지각 공간을 바꿔 어두운 영역의 단계가 어떻게 보이는지 비교하세요.')}
      <div class="fog-stage"><div class="fog-original"><span>원본</span></div><div class="fog-quantized" data-fog><span data-fog-label>4-bit linear · 16단계</span></div></div>
      <div class="quant-steps" data-steps></div>
      <div class="lab-controls"><label>정밀도 <input type="range" min="2" max="8" value="4" data-bits><output data-bits-out>4 bit</output></label><label><input type="checkbox" data-gamma> 지각 공간 배분</label><label><input type="checkbox" data-dither> dithering</label></div>
      ${status('어두운 구간 밴딩','낮은 bit의 선형 분배는 어두운 안개에서 넓은 띠를 만듭니다.')}</section>`,
    bind:host=>{
      const draw=()=>{const bits=Number(host.querySelector('[data-bits]').value),gamma=host.querySelector('[data-gamma]').checked,dither=host.querySelector('[data-dither]').checked,levels=2**bits;set(host,'[data-bits-out]',`${bits} bit`);set(host,'[data-fog-label]',`${bits}-bit ${gamma?'perceptual':'linear'} · ${levels}단계${dither?' + noise':''}`);const stops=[];for(let i=0;i<levels;i++){const a=i/(levels-1),v=gamma?Math.pow(a,2.2):a,from=i/levels*100,to=(i+1)/levels*100;stops.push(`rgb(${Math.round(v*235)},${Math.round(v*245)},${Math.round(v*250)}) ${from}% ${to}%`)}host.querySelector('[data-fog]').style.background=`linear-gradient(90deg,${stops.join(',')})`;host.querySelector('[data-fog]').classList.toggle('dither',dither);host.querySelector('[data-steps]').innerHTML=Array.from({length:Math.min(levels,32)},(_,i)=>`<i style="--v:${i/(Math.min(levels,32)-1)}"></i>`).join('');set(host,'[data-status-label]',bits>=7?'단계가 충분히 촘촘함':gamma?'중요 구간에 코드 재배분':'균등한 숫자, 불균등한 체감');set(host,'[data-status-message]',gamma?'어두운 구간에 더 많은 표현 단계를 사용합니다.':'선형 값의 동일 간격이 사람 눈에는 동일 간격으로 보이지 않습니다.');};
      host.querySelectorAll('input').forEach(n=>n.addEventListener('input',draw));draw();
    }
  });

  CSLabs.register(7,{
    html:()=>`<section class="cs-lab rng-lab">${head(7,'전역 RNG 소비 연쇄','VFX가 난수를 한 번 더 쓸 때 판정 결과까지 밀리는지 확인하세요.')}
      <div class="rng-streams"><div><h4>전역 stream</h4><div class="rng-row" data-global></div></div><div><h4>목적별 stream</h4><div class="rng-row" data-split></div></div></div>
      <div class="rng-events" data-rng-events></div>
      <div class="lab-controls"><button type="button" data-roll>다음 사건</button><label><input type="checkbox" data-vfx-extra> VFX가 1회 추가 소비</label><label><input type="checkbox" data-split-on> stream 분리</label><button type="button" data-rng-reset>seed 초기화</button></div>
      ${status('호출 순서가 상태','처음에는 두 방식 모두 같은 판정 값을 사용합니다.')}</section>`,
    bind:host=>{
      let step=0,g=12345,combat=12345,vfx=9876,history=[];
      const next=s=>((s*1664525+1013904223)>>>0),sample=s=>((s>>>8)%100);
      const draw=()=>{host.querySelector('[data-rng-events]').innerHTML=history.map(x=>`<span class="${x.kind}"><b>${x.kind}</b>${x.value}</span>`).join('');host.querySelector('[data-global]').innerHTML=history.filter(x=>x.mode==='global').map(x=>`<i>${x.value}</i>`).join('');host.querySelector('[data-split]').innerHTML=history.filter(x=>x.mode==='split').map(x=>`<i>${x.value}</i>`).join('')};
      host.querySelector('[data-roll]').addEventListener('click',()=>{const extra=host.querySelector('[data-vfx-extra]').checked,split=host.querySelector('[data-split-on]').checked;step++;if(split){if(extra){vfx=next(vfx);history.push({kind:'VFX',value:sample(vfx),mode:'split'})}combat=next(combat);history.push({kind:step%2?'CRIT':'LOOT',value:sample(combat),mode:'split'});set(host,'[data-status-label]','판정 stream 격리');set(host,'[data-status-message]','VFX 소비가 늘어도 combat stream의 다음 값은 이동하지 않습니다.')}else{if(extra){g=next(g);history.push({kind:'VFX',value:sample(g),mode:'global'})}g=next(g);history.push({kind:step%2?'CRIT':'LOOT',value:sample(g),mode:'global'});set(host,'[data-status-label]',extra?'판정 결과가 밀림':'전역 순서 유지');set(host,'[data-status-message]',extra?'무관한 VFX 호출이 뒤의 치명타·전리품 값을 바꿨습니다.':'모든 시스템이 하나의 호출 순서에 결합돼 있습니다.')}draw()});
      host.querySelector('[data-rng-reset]').addEventListener('click',()=>{step=0;g=12345;combat=12345;vfx=9876;history=[];draw()});draw();
    }
  });

  CSLabs.register(8,{
    html:()=>`<section class="cs-lab handle-lab">${head(8,'슬롯 재사용과 세대','오래된 투사체가 같은 주소의 새 몬스터를 맞히는 순간을 재현하세요.')}
      <div class="handle-world"><div class="projectile" data-projectile>투사체<br><small data-held>handle 4:7</small></div><div class="handle-arrow">→</div><div class="entity-slot alive" data-slot><span>SLOT #4</span><strong data-entity>Goblin A</strong><small data-generation>generation 7</small></div></div>
      <div class="handle-verdict"><span>pointer 검사 <b data-pointer-check>valid</b></span><span>handle 검사 <b data-handle-check>valid</b></span></div>
      <div class="lab-controls"><button type="button" data-destroy>대상 제거</button><button type="button" data-reuse>슬롯 재사용</button><button type="button" class="primary" data-hit>지연된 피격 적용</button><button type="button" data-handle-reset>초기화</button></div>
      ${status('동일 객체','주소와 세대가 모두 현재 대상과 일치합니다.')}</section>`,
    bind:host=>{
      let gen=7,alive=true,name='Goblin A',held=7,timer=0;
      const draw=()=>{set(host,'[data-entity]',alive?name:'EMPTY');set(host,'[data-generation]',`generation ${gen}`);host.querySelector('[data-slot]').classList.toggle('alive',alive);host.querySelector('[data-slot]').classList.toggle('reused',name==='Orc B');set(host,'[data-pointer-check]',alive?'valid address':'dangling');const valid=alive&&held===gen;set(host,'[data-handle-check]',valid?'valid':'STALE');host.querySelector('[data-handle-check]').classList.toggle('bad',!valid)};
      host.querySelector('[data-destroy]').addEventListener('click',()=>{alive=false;gen++;set(host,'[data-status-label]','논리 객체 종료');set(host,'[data-status-message]','슬롯은 비었고 generation이 증가했습니다.');draw()});
      host.querySelector('[data-reuse]').addEventListener('click',()=>{alive=true;name='Orc B';set(host,'[data-status-label]','같은 주소, 다른 객체');set(host,'[data-status-message]','pointer는 유효하지만 보관한 generation 7과 현재 세대가 다릅니다.');draw()});
      host.querySelector('[data-hit]').addEventListener('click',()=>{const valid=alive&&held===gen;host.querySelector('[data-projectile]').classList.add('fired');set(host,'[data-status-label]',valid?'피격 적용':'지연 결과 폐기');set(host,'[data-status-message]',valid?`${name}에게 피해를 적용했습니다.`:'handle 세대가 달라 새로 생성된 객체를 보호했습니다.');clearTimeout(timer);timer=setTimeout(()=>host.querySelector('[data-projectile]')?.classList.remove('fired'),250)});
      host.querySelector('[data-handle-reset]').addEventListener('click',()=>{gen=7;held=7;alive=true;name='Goblin A';set(host,'[data-status-label]','동일 객체');set(host,'[data-status-message]','주소와 세대가 모두 현재 대상과 일치합니다.');draw()});draw();
      return()=>clearTimeout(timer);
    }
  });

  CSLabs.register(9,{
    html:()=>`<section class="cs-lab origin-lab">${head(9,'큰 세계의 float 간격','원점에서 멀어질수록 표현 가능한 최소 이동이 어떻게 커지는지 살펴보세요.')}
      <div class="origin-map"><div class="origin-grid" data-origin-grid></div><span class="world-zero">WORLD 0</span><div class="origin-camera" data-camera>CAMERA</div><div class="origin-dot" data-dot></div></div>
      <div class="origin-metrics"><span>월드 거리 <b data-distance>1 km</b></span><span>float 간격 <b data-spacing>0.0001 m</b></span><span>1mm 이동 <b data-motion>표현됨</b></span></div>
      <div class="lab-controls"><label>원점 거리 <input type="range" min="0" max="8" value="1" data-origin-distance></label><button type="button" class="primary" data-shift>카메라를 새 원점으로</button></div>
      ${status('지역 정밀도 충분','거리를 늘려 1mm 이동이 같은 float로 반올림되는 지점을 찾으세요.')}</section>`,
    bind:host=>{
      let shifted=false;
      const floatSpacing=x=>{const f=new Float32Array([x]),u=new Uint32Array(f.buffer);u[0]++;return new Float32Array(u.buffer)[0]-f[0]};
      const draw=()=>{const exp=Number(host.querySelector('[data-origin-distance]').value),meters=10**exp,local=shifted?0:meters,spacing=floatSpacing(local||1);set(host,'[data-distance]',meters>=1000?`${(meters/1000).toLocaleString()} km`:`${meters} m`);set(host,'[data-spacing]',`${spacing.toFixed(spacing<.001?7:3)} m`);set(host,'[data-motion]',spacing<=.001?'표현됨':'반올림됨');host.querySelector('[data-camera]').style.left=`${12+exp*9}%`;host.querySelector('[data-origin-grid]').style.setProperty('--grid',`${Math.max(8,32-exp*3)}px`);host.querySelector('[data-dot]').classList.toggle('jitter',spacing>.001&&!shifted);set(host,'[data-status-label]',shifted?'지역 원점 복원':spacing>.001?'정밀도 손실':'지역 정밀도 충분');set(host,'[data-status-message]',shifted?'논리 월드 위치는 유지하고 렌더·물리 좌표만 카메라 근처로 옮겼습니다.':spacing>.001?'1mm 이동이 현재 크기의 float에서 구분되지 않습니다.':'현재 거리에서는 작은 이동을 아직 표현할 수 있습니다.');};
      host.querySelector('[data-origin-distance]').addEventListener('input',()=>{shifted=false;draw()});host.querySelector('[data-shift]').addEventListener('click',()=>{shifted=true;draw()});draw();
    }
  });

  CSLabs.register(10,{
    html:()=>`<section class="cs-lab packet-lab">${head(10,'진화하는 wire schema','shield 필드를 추가한 패킷을 위치 기반·tag 기반 decoder로 각각 읽어 보세요.')}
      <div class="packet-wire" data-packet></div>
      <div class="decoder-grid"><div><h4>구버전 위치 decoder</h4><ol data-old-decoder></ol></div><div><h4>tag·length decoder</h4><ol data-tag-decoder></ol></div></div>
      <div class="lab-controls"><button type="button" data-packet-old>기존 패킷</button><button type="button" class="primary" data-packet-new>shield 추가 패킷</button><label><input type="checkbox" data-tagged> tag·length 사용</label></div>
      ${status('기존 계약','job → level → speed 순서로 양쪽 decoder가 같은 의미를 읽습니다.')}</section>`,
    bind:host=>{
      let added=false;
      const draw=()=>{const tagged=host.querySelector('[data-tagged]').checked,fields=[['job',2,'#1'],['level',50,'#2'],...(added?[['shield',900,'#4']]:[]),['speed',7,'#3']];host.querySelector('[data-packet]').innerHTML=fields.map(x=>`<span class="${x[0]}"><small>${tagged?x[2]:''}</small><b>${x[0]}</b><i>${x[1]}</i></span>`).join('');const values=fields.map(x=>x[1]),old=[['job',values[0]],['level',values[1]],['speed',values[2]]];host.querySelector('[data-old-decoder]').innerHTML=old.map((x,i)=>`<li class="${added&&i===2?'wrong':''}">${x[0]} = <b>${x[1]}</b></li>`).join('');const known=tagged?fields.filter(x=>x[2]!=='#4'):fields;host.querySelector('[data-tag-decoder]').innerHTML=known.map(x=>`<li>${x[0]} = <b>${x[1]}</b>${tagged&&x[2]==='#4'?' skip':''}</li>`).join('');set(host,'[data-status-label]',added&&!tagged?'뒤 필드 오독':added&&tagged?'모르는 #4 건너뜀':'기존 계약');set(host,'[data-status-message]',added&&!tagged?'구버전은 shield=900을 speed로 해석했습니다. 길이 경계도 알 수 없습니다.':added&&tagged?'구버전은 field #4의 length만큼 건너뛰고 #3 speed를 정상적으로 찾습니다.':'양쪽 decoder가 같은 순서 계약을 사용합니다.');};
      host.querySelector('[data-packet-old]').addEventListener('click',()=>{added=false;draw()});host.querySelector('[data-packet-new]').addEventListener('click',()=>{added=true;draw()});host.querySelector('[data-tagged]').addEventListener('input',draw);draw();
    }
  });
})();
