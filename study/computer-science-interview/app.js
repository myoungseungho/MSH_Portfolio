(function(){
  'use strict';
  const data=window.CSInterviewData;
  if(!data)throw new Error('CSInterviewData is missing');
  const byCategory=new Map(data.categories.map(category=>[category.id,[]]));
  data.questions.forEach(question=>{
    if(!byCategory.has(question.category))throw new Error(`Unknown category ${question.category}`);
    byCategory.get(question.category).push(question);
  });
  document.getElementById('category-nav').innerHTML=data.categories.map(category=>
    `<a href="#category-${category.id}">${category.id}. ${category.short}</a>`).join('');
  let html='';
  data.categories.forEach(category=>{
    const questions=byCategory.get(category.id);
    if(!questions.length)return;
    html+=`<header class="category-header" id="category-${category.id}"><span>${category.range}</span><h2>${category.id}. ${category.name}</h2></header>`;
    questions.forEach(q=>{
      const discovery=[
        ['이 장면에서 무엇을 보존하지 못하면 실패일까?',q.boundary],
        ['시간이 없다면 가장 먼저 어떤 단순한 구현을 택하게 될까?',q.naive],
        ['그 구현은 실제 게임의 어떤 조건을 만나 깨질까?',q.failure],
        ['컴퓨터 내부에서는 무슨 일이 일어났고, 여기에 붙은 이름은 무엇일까?',q.reasoning]
      ];
      html+=`<article class="qa" id="q${q.id}">
        <header class="qhead"><span class="qnum">Q${q.id}</span><h2>${q.question}</h2>
          <div class="scenario">${q.scenario}</div>
          ${q.foundation ? `<aside class="concept-foundation">${q.foundation}</aside>` : ''}
        </header>
        ${q.customJourney?'':`<section class="discovery" data-discovery="${q.id}" aria-label="Q${q.id} 추론 단계">
          <div class="discovery-intro"><b>답을 열기 전에 한 단계씩 추론해 보세요.</b><span>각 질문에 잠시 답해 본 뒤 열면, 마지막에 정식 개념명이 연결됩니다.</span></div>
          ${discovery.map((item,index)=>`<div class="discovery-step" data-discovery-step="${index}">
            <button type="button" data-discovery-jump="${index}" aria-expanded="false"><small>${index+1}</small>${item[0]}</button>
            <div class="discovery-answer" hidden><p>${item[1]}</p>${index===3?`<div class="concepts">${q.concepts.map(concept=>`<span>${concept}</span>`).join('')}</div>`:''}</div>
          </div>`).join('')}<div class="discovery-controls"><button type="button" data-discovery-prev disabled>이전</button><button type="button" data-discovery-next>1단계 열기</button><button type="button" data-discovery-reset>초기화</button></div>
        </section>`}
        <div class="lab-entry"><button type="button" class="lab-open" data-lab-open="${q.id}" aria-expanded="false" aria-controls="lab-host-${q.id}">▶ ${q.labLabel}</button><div id="lab-host-${q.id}" data-lab-host="${q.id}"></div></div>
        <div class="answer-body" data-answer-body="${q.id}" hidden>
        <section class="answer-step"><h3>0. 먼저 문제의 경계를 정한다</h3><p>${q.boundary}</p></section>
        <section class="answer-step naive"><h3>1. 가장 단순하게 시작하면</h3><p>${q.naive}</p></section>
        <section class="answer-step failure"><h3>2. 실제 게임에서는 어디서 깨지는가</h3><p>${q.failure}</p></section>
        <section class="answer-step"><h3>3. 컴퓨터 내부에서 원인을 추론한다</h3><p>${q.reasoning}</p></section>
        <section class="answer-step build"><h3>4. 구현 구조를 다시 세운다</h3><p>${q.build}</p></section>
        <section class="answer-step"><h3>5. 무엇을 측정해 증명할 것인가</h3><p>${q.verify}</p></section>
        <section class="answer-step"><h3>6. 어떤 비용을 감수할 것인가</h3><p>${q.trade}</p></section>
        <div class="principle"><small>이 문항의 핵심</small><strong>${q.core}</strong></div>
        </div>
        <a class="to-top" href="#top">목차로 ↑</a>
      </article>`;
    });
  });
  document.getElementById('questions').innerHTML=html;
  document.querySelectorAll('[data-discovery]').forEach(discovery=>{
    const steps=[...discovery.querySelectorAll('[data-discovery-step]')];
    const prev=discovery.querySelector('[data-discovery-prev]'),next=discovery.querySelector('[data-discovery-next]');let current=-1;
    const show=index=>{current=Math.max(0,Math.min(steps.length-1,index));steps.forEach((step,i)=>{const active=i===current,button=step.querySelector('[data-discovery-jump]'),answer=step.querySelector('.discovery-answer');answer.hidden=!active;button.setAttribute('aria-expanded',String(active));if(active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');step.classList.toggle('opened',active)});prev.disabled=current===0;next.textContent=current===steps.length-1?'마지막 단계':'다음';if(current===steps.length-1){const body=document.querySelector(`[data-answer-body="${discovery.dataset.discovery}"]`);if(body)body.hidden=false;}};
    steps.forEach((step,index)=>step.querySelector('[data-discovery-jump]').addEventListener('click',()=>show(index)));
    prev.addEventListener('click',()=>show(current<=0?0:current-1));next.addEventListener('click',()=>show(current<0?0:Math.min(steps.length-1,current+1)));
    discovery.querySelector('[data-discovery-reset]').addEventListener('click',()=>{current=-1;steps.forEach(step=>{step.classList.remove('opened');step.querySelector('.discovery-answer').hidden=true;step.querySelector('[data-discovery-jump]').setAttribute('aria-expanded','false');step.querySelector('[data-discovery-jump]').removeAttribute('aria-current')});const body=document.querySelector(`[data-answer-body="${discovery.dataset.discovery}"]`);if(body)body.hidden=true;prev.disabled=true;next.textContent='1단계 열기'});
  });
  document.addEventListener('cs-discovery-complete',event=>{
    const body=document.querySelector(`[data-answer-body="${event.detail?.id}"]`);if(body)body.hidden=false;
  });
})();
