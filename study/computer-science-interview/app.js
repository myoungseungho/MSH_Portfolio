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
      html+=`<article class="qa" id="q${q.id}">
        <header class="qhead"><span class="qnum">Q${q.id}</span><h2>${q.question}</h2>
          <div class="scenario">${q.scenario}</div>
          ${q.foundation ? `<aside class="concept-foundation">${q.foundation}</aside>` : ''}
          <div class="concepts">${q.concepts.map(concept=>`<span>${concept}</span>`).join('')}</div>
        </header>
        <div class="lab-entry"><button type="button" class="lab-open" data-lab-open="${q.id}" aria-expanded="false" aria-controls="lab-host-${q.id}">▶ ${q.labLabel}</button><div id="lab-host-${q.id}" data-lab-host="${q.id}"></div></div>
        <section class="answer-step"><h3>0. 먼저 문제의 경계를 정한다</h3><p>${q.boundary}</p></section>
        <section class="answer-step naive"><h3>1. 가장 단순하게 시작하면</h3><p>${q.naive}</p></section>
        <section class="answer-step failure"><h3>2. 실제 게임에서는 어디서 깨지는가</h3><p>${q.failure}</p></section>
        <section class="answer-step"><h3>3. 컴퓨터 내부에서 원인을 추론한다</h3><p>${q.reasoning}</p></section>
        <section class="answer-step build"><h3>4. 구현 구조를 다시 세운다</h3><p>${q.build}</p></section>
        <section class="answer-step"><h3>5. 무엇을 측정해 증명할 것인가</h3><p>${q.verify}</p></section>
        <section class="answer-step"><h3>6. 어떤 비용을 감수할 것인가</h3><p>${q.trade}</p></section>
        <div class="principle"><small>이 문항의 핵심</small><strong>${q.core}</strong></div>
        <a class="to-top" href="#top">목차로 ↑</a>
      </article>`;
    });
  });
  document.getElementById('questions').innerHTML=html;
})();
