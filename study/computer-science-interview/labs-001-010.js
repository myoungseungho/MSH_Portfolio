(function(){
  'use strict';
  const head=(id,title,description)=>`<div class="lab-head"><div><h3>Q${id} · ${title}</h3><p>${description}</p></div><button type="button" class="lab-close" data-lab-close>닫기</button></div>`;
  const status=(label,message)=>`<div class="lab-status" aria-live="polite"><b data-status-label>${label}</b><span data-status-message>${message}</span></div>`;
  const set=(host,selector,value)=>{const node=host.querySelector(selector);if(node)node.textContent=value};

  CSLabs.register(1,{
    html:()=>`<section class="cs-lab coin-lab">${head(1,'float 골드 원장','보유량을 키운 뒤 +1 거래가 실제 비트에 반영되는지 확인하세요.')}
      <div class="coin-ledger">
        <div class="coin-vault"><span>float32 잔액</span><strong data-float-balance>16,777,214</strong><div class="coin-stack" data-coin-stack></div></div>
        <div class="coin-gap"><span>다음 표현 가능 값 간격</span><b data-ulp>1 gold</b></div>
        <div class="coin-vault exact"><span>int64 잔액</span><strong data-int-balance>16,777,214</strong><div class="coin-stack" data-int-stack></div></div>
      </div>
      <div class="lab-controls"><label>시작 금액 <input type="range" min="1000000" max="100000000" step="1000000" value="16000000" data-amount><output data-amount-out>16,000,000</output></label><button type="button" class="primary" data-add-one>+1 거래</button><button type="button" data-add-hundred>+100 거래</button></div>
      ${status('정확한 구간','금액을 높여 float32의 인접 값 간격이 넓어지는 지점을 찾으세요.')}</section>`,
    bind:host=>{
      let f=Math.fround(16000000),i=16000000;
      const ulp=value=>{const a=new Float32Array([value]),u=new Uint32Array(a.buffer);u[0]+=1;return new Float32Array(u.buffer)[0]-value};
      const draw=()=>{
        set(host,'[data-float-balance]',f.toLocaleString());set(host,'[data-int-balance]',i.toLocaleString());
        const gap=ulp(f);set(host,'[data-ulp]',`${gap.toLocaleString()} gold`);
        host.querySelector('[data-coin-stack]').style.setProperty('--fill',`${Math.min(100,f/1000000)}%`);
        host.querySelector('[data-int-stack]').style.setProperty('--fill',`${Math.min(100,i/1000000)}%`);
        set(host,'[data-status-label]',f===i?'두 원장 일치':'1골드가 사라짐');
        set(host,'[data-status-message]',f===i?'현재 범위에서는 float가 정수를 표현했습니다.':`float32=${f.toLocaleString()}, int64=${i.toLocaleString()} — 화폐 불변식이 깨졌습니다.`);
      };
      host.querySelector('[data-amount]').addEventListener('input',e=>{i=Number(e.target.value);f=Math.fround(i);set(host,'[data-amount-out]',i.toLocaleString());draw()});
      host.querySelector('[data-add-one]').addEventListener('click',()=>{f=Math.fround(f+1);i+=1;draw()});
      host.querySelector('[data-add-hundred]').addEventListener('click',()=>{f=Math.fround(f+100);i+=100;draw()});draw();
    }
  });

  CSLabs.register(2,{
    html:()=>`<section class="cs-lab determinism-lab">${head(2,'두 플랫폼 물리 발산','같은 입력이 작은 수학 차이를 만나 언제 다른 충돌 경로로 갈라지는지 진행해 보세요.')}
      <div class="det-track">
        <div class="det-wall"></div><div class="det-car pc" data-pc-car><span>PC</span></div><div class="det-car console" data-console-car><span>CONSOLE</span></div>
        <div class="det-marker" data-det-marker>충돌 분기 72.0m</div>
      </div>
      <div class="det-readout"><span>tick <b data-tick>0</b></span><span>PC <b data-pc>0.000000</b></span><span>Console <b data-console>0.000000</b></span><span>오차 <b data-error>0</b></span></div>
      <div class="lab-controls"><button type="button" data-step>1 tick</button><button type="button" class="primary" data-run>30 tick 진행</button><button type="button" data-reset>초기화</button></div>
      ${status('같은 초기 상태','작은 반올림 차이는 접촉·분기 전까지 눈에 띄지 않습니다.')}</section>`,
    bind:host=>{
      let tick=0,pc=0,consoleX=0,run=0,timers=new Set();
      const draw=()=>{const scale=x=>Math.min(92,x/80*92);host.querySelector('[data-pc-car]').style.left=`${scale(pc)}%`;host.querySelector('[data-console-car]').style.left=`${scale(consoleX)}%`;set(host,'[data-tick]',tick);set(host,'[data-pc]',pc.toFixed(6));set(host,'[data-console]',consoleX.toFixed(6));set(host,'[data-error]',Math.abs(pc-consoleX).toExponential(2));if((pc>=72)!==(consoleX>=72)){set(host,'[data-status-label]','코드 경로 발산');set(host,'[data-status-message]','한 플랫폼만 충돌 임계값을 넘었습니다. 이후 상태는 작은 오차가 아니라 다른 사건입니다.')}};
      const step=()=>{tick++;const a=Math.fround(Math.fround(tick*.0137)*.91);pc=Math.fround(pc+Math.fround(1.001+a));consoleX=Math.fround(consoleX+1.001)+Math.fround(a);if(pc>=72)pc=Math.fround(pc*.82);if(consoleX>=72)consoleX=Math.fround(consoleX*.82);draw()};
      host.querySelector('[data-step]').addEventListener('click',step);
      host.querySelector('[data-run]').addEventListener('click',()=>{const token=++run;let n=0;const next=()=>{if(token!==run||n++>=30)return;step();const id=setTimeout(()=>{timers.delete(id);next()},22);timers.add(id)};next()});
      host.querySelector('[data-reset]').addEventListener('click',()=>{run++;timers.forEach(clearTimeout);timers.clear();tick=0;pc=0;consoleX=0;set(host,'[data-status-label]','같은 초기 상태');set(host,'[data-status-message]','연산 순서만 다른 두 플랫폼을 다시 시작했습니다.');draw()});draw();
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
