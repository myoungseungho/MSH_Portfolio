(() => {
  const root = document.getElementById('metricLab');
  if (!root) return;
  const cases = {
    cpu: {
      cards: [['CPU 사용률', '86%', '게임 로직·SQL CPU를 분리'], ['CPU 대기열', '14', '실행 가능한 일이 줄 섬'], ['컨텍스트 전환', '92K/s', '짧은 작업·스레드 경합 확인']],
      result: '<b>다음 질문:</b> 전체 CPU만 높나, 특정 게임 로직 스레드/SQL 프로세스만 높나? CPU를 더 사기 전에 단일 스레드·락·요청 폭증을 분리해.'
    },
    memory: {
      cards: [['남은 메모리', '620MB', '새 작업에 줄 RAM이 거의 없음'], ['페이지 입출력', '4,800/s', 'RAM↔디스크 실제 왕복'], ['디스크 읽기 지연', '38ms', '메모리 압박이 디스크로 번짐']],
      result: '<b>다음 질문:</b> 페이지 폴트만 많나, 페이지 입출력과 디스크 지연도 같이 올랐나? 후자면 진짜 RAM 압박이고 프로세스/커널 풀의 증가 원인을 찾는다.'
    },
    disk: {
      cards: [['디스크 쓰기 지연', '31ms', '저장장치가 쓰기를 늦게 끝냄'], ['디스크 대기열', '27', '아직 처리 못 한 I/O가 줄 섬'], ['SQL 로그 쓰기', '28ms', '커밋 경로까지 기다림']],
      result: '<b>다음 질문:</b> 쓰기 작업 수가 폭증했나, 평소인데 장치만 느려졌나? 로그 파일·백업·대량 저장·스토리지 중 어느 쪽인지 I/O 수와 파일별 통계로 좁힌다.'
    },
    network: {
      cards: [['TCP 재전송', '84/s', '확인이 안 와 TCP 세그먼트를 다시 보냄'], ['최근 NIC 폐기', '+19', '문 앞에서 새 패킷이 버려짐'], ['송신 대기열', '43', '회선으로 못 나간 패킷']],
      result: '<b>다음 질문:</b> ICMP Ping 하나가 아니라 재전송·NIC 변화량·RST가 같은 시각에 올랐나? 함께 오르면 NIC/회선/경로 가설이 강해진다.'
    },
    sql: {
      cards: [['차단 요청', '17', '다른 트랜잭션 잠금을 기다림'], ['최대 차단 대기', '8,420ms', '가장 오래 멈춘 요청'], ['로그 사용률', '91%', '재사용을 막는 오래 열린 TX 후보']],
      result: '<b>다음 질문:</b> blocker SPID는 누구고, 그 세션은 어떤 SQL·트랜잭션을 얼마나 오래 실행했나? 세션을 죽이는 것보다 잠금 순서·인덱스·트랜잭션 범위를 고친다.'
    }
  };
  const cards = [document.getElementById('ml1'), document.getElementById('ml2'), document.getElementById('ml3')];
  const result = document.getElementById('mlResult');
  const render = key => {
    const state = cases[key];
    state.cards.forEach((item, index) => {
      cards[index].className = 'ml-card ' + (index === 1 ? 'warn' : index === 2 ? 'ok' : '');
      cards[index].innerHTML = `<small>${item[0]}</small><b>${item[1]}</b><p>${item[2]}</p>`;
    });
    result.innerHTML = state.result;
    root.querySelectorAll('.ml-btn').forEach(button => button.classList.toggle('active', button.dataset.case === key));
  };
  root.querySelectorAll('.ml-btn').forEach(button => button.addEventListener('click', () => render(button.dataset.case)));
  render('cpu');
})();
