(function () {
  'use strict';
  const H = (id, title, text) => `<div class="lab-head"><div><h3>Q${id} · ${title}</h3><p>${text}</p></div><button type="button" class="lab-close" data-lab-close>닫기</button></div>`;
  const S = (label, text) => `<div class="lab-status" aria-live="polite"><b data-status-label>${label}</b><span data-status-message>${text}</span></div>`;
  const T = (host, selector, value) => { const node = host.querySelector(selector); if (node) node.textContent = value; };

  CSLabs.register(61, {
    html: () => `<section class="cs-lab optimizer-lab">${H(61, '정의된 실행만 남기는 최적화기', 'signed 덧셈의 언어 계약을 바꾸며 overflow 검사 분기가 어떻게 취급되는지 보세요.')}
      <div class="optimizer-source"><code>sum = hp + damage</code><i>→</i><code>if (sum &lt; hp) OVERFLOW</code></div>
      <div class="optimizer-ir" data-optimizer-ir></div><div class="optimizer-output" data-optimizer-output></div>
      <div class="lab-controls"><label>hp <input type="range" min="2000000000" max="2147483647" step="10000000" value="2140000000" data-ub-hp><output data-ub-hp-out></output></label><label>damage <input type="range" min="1" max="200000000" step="10000000" value="100000000" data-ub-damage><output data-ub-damage-out></output></label><label>연산 계약 <select data-int-contract><option value="signed">signed int · UB</option><option value="unsigned">unsigned · modulo</option><option value="checked">wider checked</option></select></label><button type="button" class="primary" data-optimize>최적화</button></div>
      ${S('소스 분기 존재', '언어 계약을 근거로 optimizer가 무엇을 증명하는지 확인하세요.')}</section>`,
    bind: host => {
      const draw = () => {
        const hp = +host.querySelector('[data-ub-hp]').value, damage = +host.querySelector('[data-ub-damage]').value, mode = host.querySelector('[data-int-contract]').value;
        const mathematical = hp + damage, overflow = mathematical > 2147483647, wrapped = mathematical | 0;
        T(host, '[data-ub-hp-out]', hp.toLocaleString()); T(host, '[data-ub-damage-out]', damage.toLocaleString());
        host.querySelector('[data-optimizer-ir]').innerHTML = mode === 'signed' ? '<span>ASSUME sum is representable</span><i>sum &lt; hp ⇒ false</i>' : mode === 'unsigned' ? '<span>ADD modulo 2³²</span><i>comparison retained</i>' : '<span>ADD in int64</span><i>range check before cast</i>';
        T(host, '[data-optimizer-output]', mode === 'signed' ? 'OVERFLOW BRANCH REMOVED' : overflow ? `OVERFLOW DETECTED · machine result ${wrapped}` : `SAFE · ${mathematical}`);
        T(host, '[data-status-label]', mode === 'signed' && overflow ? '입력은 UB 영역 · 분기 제거 가능' : mode === 'checked' ? '정의된 범위 검사' : '정의된 modulo 비교');
        T(host, '[data-status-message]', mode === 'signed' && overflow ? '정의된 signed 실행에서는 overflow가 없다는 가정 아래 비교는 항상 false입니다.' : '연산 결과와 검사 의미가 언어 계약 안에서 정의됩니다.');
      };
      host.querySelectorAll('input,select').forEach(n => { n.oninput = draw; }); host.querySelector('[data-optimize]').onclick = draw; draw();
    }
  });

  CSLabs.register(62, {
    html: () => `<section class="cs-lab inline-lab">${H(62, 'call 절약과 instruction footprint의 교차', 'inline 비율을 높이며 frontend working set이 cache 용량을 넘는 지점을 찾으세요.')}
      <div class="inline-plot" role="img" aria-label="inline 비율에 따른 call 비용과 instruction cache miss 비용"><div class="cache-ceiling">L1I 32 KB</div><span data-code-bar></span><i data-call-line></i><b data-inline-marker></b></div>
      <div class="inline-metrics"><span>text <b data-text-size></b></span><span>call cost <b data-call-cost></b></span><span>L1I miss cost <b data-icache-cost></b></span></div>
      <div class="lab-controls"><label>force-inline 비율 <input type="range" min="0" max="100" value="20" data-inline-rate><output data-inline-out>20%</output></label><label>AI 행동 종류 <input type="range" min="4" max="40" value="16" data-behaviors><output data-behavior-out>16</output></label></div>
      ${S('compiler heuristic 근처', 'call overhead는 줄고 code footprint는 아직 L1I에 가깝습니다.')}</section>`,
    bind: host => {
      const draw = () => {
        const rate = +host.querySelector('[data-inline-rate]').value, kinds = +host.querySelector('[data-behaviors]').value, size = 10 + rate * kinds * .025, call = Math.round((100 - rate) * .6), miss = Math.max(0, Math.round((size - 32) * 3));
        host.querySelector('[data-code-bar]').style.height = `${Math.min(100, size / 55 * 100)}%`; host.querySelector('[data-call-line]').style.width = `${100 - rate}%`; host.querySelector('[data-inline-marker]').style.left = `${rate}%`;
        T(host, '[data-text-size]', `${size.toFixed(1)} KB`); T(host, '[data-call-cost]', `${call} cycles/k`); T(host, '[data-icache-cost]', `${miss} cycles/k`); T(host, '[data-inline-out]', `${rate}%`); T(host, '[data-behavior-out]', kinds);
        T(host, '[data-status-label]', size > 32 ? 'instruction cache 초과' : rate < 15 ? 'call overhead 우세' : '두 비용의 균형 구간');
        T(host, '[data-status-message]', size > 32 ? '복제한 cold branch가 hot loop의 instruction line을 밀어냅니다.' : 'inline은 call을 없애는 대신 각 call site에 code를 복제합니다.');
      }; host.querySelectorAll('input').forEach(n => { n.oninput = draw; }); draw();
    }
  });

  CSLabs.register(63, {
    html: () => `<section class="cs-lab alias-lab">${H(63, 'SIMD 묶음을 막는 겹침 가능성', 'positions와 velocities의 주소 구간을 움직여 loop-carried dependency를 만들어 보세요.')}
      <div class="alias-memory"><div class="alias-row" data-position-row></div><div class="alias-row velocity" data-velocity-row></div></div>
      <div class="simd-packets" data-simd-packets></div>
      <div class="lab-controls"><label>velocity 시작 offset <input type="range" min="0" max="12" value="8" data-alias-offset><output data-alias-out>8</output></label><label><input type="checkbox" data-no-alias> non-alias 계약</label><button type="button" class="primary" data-vectorize>vectorization 분석</button></div>
      ${S('두 구간이 분리됨', '하지만 함수 경계에서 compiler가 그 사실을 아는지도 별개입니다.')}</section>`,
    bind: host => {
      const draw = () => {
        const offset = +host.querySelector('[data-alias-offset]').value, declared = host.querySelector('[data-no-alias]').checked, overlap = offset < 8;
        host.querySelector('[data-position-row]').innerHTML = Array.from({length: 16}, (_, i) => `<i class="${i < 8 ? 'pos' : ''}">${i}</i>`).join('');
        host.querySelector('[data-velocity-row]').innerHTML = Array.from({length: 16}, (_, i) => `<i class="${i >= offset && i < offset + 8 ? overlap && i < 8 ? 'overlap' : 'vel' : ''}">${i}</i>`).join('');
        host.querySelector('[data-simd-packets]').innerHTML = declared && !overlap ? '<span>LOAD x4</span><span>LOAD v4</span><span>ADD x4</span><span>STORE x4</span>' : '<span>LOAD</span><span>ADD</span><span>STORE</span><i>iteration dependency?</i>';
        T(host, '[data-alias-out]', offset);
        T(host, '[data-status-label]', declared && overlap ? '계약 위반 · 잘못된 code 가능' : declared ? 'SIMD x4 허용' : overlap ? '실제 overlap' : '증명되지 않은 non-alias');
        T(host, '[data-status-message]', declared && !overlap ? 'compiler는 네 iteration의 load/store가 서로 영향을 주지 않는다고 증명받았습니다.' : '겹칠 수 있다면 이전 store가 다음 load의 값을 바꿀 수 있어 순서를 보존합니다.');
      }; host.querySelectorAll('input').forEach(n => { n.oninput = draw; }); host.querySelector('[data-vectorize]').onclick = draw; draw();
    }
  });

  CSLabs.register(64, {
    html: () => `<section class="cs-lab template-lab">${H(64, '정적 조합이 만드는 인스턴스 격자', 'component 축과 policy 축을 늘려 compile-time 조합 수가 어떻게 곱해지는지 보세요.')}
      <div class="template-matrix" data-template-matrix></div>
      <div class="template-funnel"><span data-instantiations></span><i>LINKER ICF</i><b data-final-functions></b></div>
      <div class="lab-controls"><label>component 종류 <input type="range" min="2" max="12" value="4" data-component-types><output data-component-out>4</output></label><label>policy 종류 <input type="range" min="1" max="8" value="3" data-policy-types><output data-policy-out>3</output></label><label><input type="checkbox" data-erased-policy> policy를 type erasure로 접기</label></div>
      ${S('4 × 3 정적 조합', '각 번역 단위가 같은 조합을 다시 인스턴스화할 수도 있습니다.')}</section>`,
    bind: host => {
      const draw = () => {
        const c = +host.querySelector('[data-component-types]').value, p = +host.querySelector('[data-policy-types]').value, erased = host.querySelector('[data-erased-policy]').checked, total = erased ? c : c * p;
        host.querySelector('[data-template-matrix]').style.gridTemplateColumns = `repeat(${Math.min(p, 8)},1fr)`;
        host.querySelector('[data-template-matrix]').innerHTML = Array.from({length: c * p}, (_, i) => `<i class="${erased && i % p ? 'folded' : ''}">C${Math.floor(i / p) + 1}·P${i % p + 1}</i>`).join('');
        T(host, '[data-instantiations]', `${c * p} parse/instantiate`); T(host, '[data-final-functions]', `${total} runtime bodies`); T(host, '[data-component-out]', c); T(host, '[data-policy-out]', p);
        T(host, '[data-status-label]', erased ? `${p}개 policy 축을 runtime table로 접음` : `${c * p}개 template 조합`);
        T(host, '[data-status-message]', erased ? '간접 호출 하나와 교환해 compile fan-out과 code 복제를 제한합니다.' : 'linker가 일부를 합쳐도 compiler가 각 조합을 만든 비용과 debug info는 남습니다.');
      }; host.querySelectorAll('input').forEach(n => { n.oninput = draw; }); draw();
    }
  });

  CSLabs.register(65, {
    html: () => `<section class="cs-lab init-order-lab">${H(65, 'main 이전의 숨은 의존성', 'Registry와 Registrar의 번역 단위 초기화 순서를 직접 배치하세요.')}
      <div class="init-conveyor"><div data-init-slot="0"></div><i>→</i><div data-init-slot="1"></div><i>→</i><div>MAIN</div></div>
      <div class="registry-vessel" data-registry-vessel><b>COMPONENT REGISTRY</b><span data-registry-items></span></div>
      <div class="lab-controls"><button type="button" data-init-order="registry">TU A · Registry 먼저</button><button type="button" data-init-order="registrar">TU B · Registrar 먼저</button><label><input type="checkbox" data-local-static> construct-on-first-use</label><button type="button" class="primary" data-start-program>startup 실행</button></div>
      ${S('초기화 순서 미정', '서로 다른 TU의 동적 초기화는 source 파일 순서 계약이 아닙니다.')}</section>`,
    bind: host => {
      const order = [];
      const draw = () => {
        [0, 1].forEach(i => T(host, `[data-init-slot="${i}"]`, order[i] ? order[i].toUpperCase() : '?'));
      };
      host.querySelectorAll('[data-init-order]').forEach(b => b.onclick = () => { if (!order.includes(b.dataset.initOrder) && order.length < 2) order.push(b.dataset.initOrder); draw(); });
      host.querySelector('[data-start-program]').onclick = () => {
        const safe = host.querySelector('[data-local-static]').checked, registrarFirst = order[0] === 'registrar';
        const ok = !registrarFirst || safe;
        host.querySelector('[data-registry-items]').innerHTML = ok ? '<i>Transform</i><i>Physics</i>' : '<i class="missing">UNCONSTRUCTED</i>';
        T(host, '[data-status-label]', ok ? safe && registrarFirst ? '첫 접근에서 Registry 생성' : '등록 성공' : 'static initialization order fiasco');
        T(host, '[data-status-message]', ok ? '등록 시점에 유효한 registry 수명을 확보했습니다.' : 'Registrar 생성자가 아직 시작되지 않은 다른 TU의 객체를 사용했습니다.');
      }; host.querySelector('[data-local-static]').oninput = draw; draw();
    }
  });

  CSLabs.register(66, {
    html: () => `<section class="cs-lab odr-lab">${H(66, '같은 타입 이름, 다른 byte stride', 'Module A와 B의 Entity layout을 나란히 놓고 두 번째 원소의 주소 차이를 보세요.')}
      <div class="layout-rulers"><div><b>MODULE A</b><span data-layout-a></span><small data-stride-a></small></div><div><b>MODULE B</b><span data-layout-b></span><small data-stride-b></small></div></div>
      <div class="address-probe">Entity[1].hp 주소: A <b data-address-a></b> · B <b data-address-b></b></div>
      <div class="lab-controls"><label><input type="checkbox" data-debug-field> B에 DEBUG field</label><label>B packing <select data-pack-align><option value="8">align 8</option><option value="4">pack 4</option><option value="1">pack 1</option></select></label><button type="button" class="primary" data-layout-probe>layout manifest 비교</button></div>
      ${S('두 모듈 모두 24 bytes', '현재는 우연히 같은 header configuration입니다.')}</section>`,
    bind: host => {
      const draw = () => {
        const debug = host.querySelector('[data-debug-field]').checked, pack = +host.querySelector('[data-pack-align]').value;
        const fieldsA = [{n:'id',s:8},{n:'pos',s:12},{n:'hp',s:4}], fieldsB = [{n:'id',s:8},{n:'pos',s:12}].concat(debug ? [{n:'dbg',s:1}] : []).concat([{n:'hp',s:4}]);
        const sizeA = 24, rawB = fieldsB.reduce((sum,x)=>sum+x.s,0), sizeB = Math.ceil(rawB / pack) * pack;
        const render = fields => fields.map(x => `<i style="flex:${x.s}">${x.n} ${x.s}</i>`).join('');
        host.querySelector('[data-layout-a]').innerHTML = render(fieldsA); host.querySelector('[data-layout-b]').innerHTML = render(fieldsB);
        T(host, '[data-stride-a]', `stride ${sizeA}`); T(host, '[data-stride-b]', `stride ${sizeB}`); T(host, '[data-address-a]', `base+${sizeA + 20}`); T(host, '[data-address-b]', `base+${sizeB + (debug ? 21 : 20)}`);
        const mismatch = sizeA !== sizeB || debug;
        T(host, '[data-status-label]', mismatch ? 'ODR/ABI fingerprint 불일치' : 'layout 일치');
        T(host, '[data-status-message]', mismatch ? '같은 Entity[1] 이름이 모듈마다 다른 byte를 가리킵니다. linker가 반드시 탐지하는 오류가 아닙니다.' : 'sizeof·alignof·offset이 동일합니다.');
      }; host.querySelectorAll('input,select').forEach(n => { n.oninput = draw; }); host.querySelector('[data-layout-probe]').onclick = draw; draw();
    }
  });

  CSLabs.register(67, {
    html: () => `<section class="cs-lab abi-lab">${H(67, 'host와 plugin의 byte 해석 계약', 'plugin에 field를 추가하고 host가 아는 struct 크기와 offset을 비교하세요.')}
      <div class="abi-bytes" data-abi-bytes></div><div class="abi-readers"><span data-host-reader>HOST reads speed @ 8</span><span data-plugin-reader>PLUGIN writes speed @ 8</span></div>
      <div class="lab-controls"><label>plugin API <select data-api-version><option value="1">v1 · id, speed</option><option value="2">v2 · id, bool, speed</option></select></label><label>plugin align <select data-abi-align><option value="4">align 4</option><option value="8">align 8</option><option value="1">pack 1</option></select></label><label><input type="checkbox" data-size-handshake> version·size handshake</label></div>
      ${S('v1 layout 일치', 'host와 plugin이 speed를 같은 offset에서 읽고 씁니다.')}</section>`,
    bind: host => {
      const draw = () => {
        const v = +host.querySelector('[data-api-version]').value, align = +host.querySelector('[data-abi-align]').value, handshake = host.querySelector('[data-size-handshake]').checked;
        const speedOffset = v === 1 ? 8 : align === 1 ? 9 : 12, size = v === 1 ? 12 : speedOffset + 4;
        host.querySelector('[data-abi-bytes]').innerHTML = Array.from({length: Math.max(16, size)}, (_, i) => `<i class="${i<8?'id':v===2&&i===8?'flag':i>=speedOffset&&i<speedOffset+4?'speed':''}">${i}</i>`).join('');
        T(host, '[data-host-reader]', 'HOST reads speed @ 8'); T(host, '[data-plugin-reader]', `PLUGIN writes speed @ ${speedOffset}`);
        const mismatch = speedOffset !== 8;
        T(host, '[data-status-label]', mismatch ? handshake ? 'handshake에서 호환 거부' : 'speed offset 불일치' : 'v1 ABI 일치');
        T(host, '[data-status-message]', mismatch ? handshake ? `host size 12, plugin size ${size}를 비교해 잘못 읽기 전에 중단합니다.` : 'host는 bool·padding bytes를 float로 해석합니다.' : '양쪽 binary가 field byte 위치에 합의했습니다.');
      }; host.querySelectorAll('select,input').forEach(n => { n.oninput = draw; }); draw();
    }
  });

  CSLabs.register(68, {
    html: () => `<section class="cs-lab heap-boundary-lab">${H(68, '할당 block의 귀환 주소', 'Plugin heap에서 만든 block을 어느 heap으로 반환하는지 연결하세요.')}
      <div class="heap-world"><div class="heap host"><b>HOST HEAP</b><span data-host-heap></span></div><div class="heap-block" data-heap-block>STRING<br>owner: PLUGIN</div><div class="heap plugin"><b>PLUGIN HEAP</b><span data-plugin-heap></span></div></div>
      <div class="lab-controls"><button type="button" data-plugin-alloc>plugin AllocateString</button><label>해제 API <select data-free-api><option value="host">host delete</option><option value="plugin">plugin ReleaseString</option><option value="callback">shared allocator callback</option></select></label><button type="button" class="primary" data-free-block>block 해제</button></div>
      ${S('아직 allocation 없음', '할당 metadata를 소유한 heap으로 block을 돌려보내세요.')}</section>`,
    bind: host => {
      let allocated = false;
      host.querySelector('[data-plugin-alloc]').onclick = () => { allocated = true; host.querySelector('[data-heap-block]').classList.add('allocated'); T(host, '[data-plugin-heap]', 'metadata #P91'); T(host, '[data-status-label]', 'Plugin heap가 block 소유'); };
      host.querySelector('[data-free-block]').onclick = () => {
        if (!allocated) return; const api = host.querySelector('[data-free-api]').value, safe = api !== 'host';
        host.querySelector('[data-heap-block]').classList.toggle('corrupt', !safe); T(host, safe ? '[data-plugin-heap]' : '[data-host-heap]', safe ? 'released #P91' : 'UNKNOWN BLOCK #P91');
        T(host, '[data-status-label]', safe ? '소유 allocator로 반환' : 'heap metadata corruption');
        T(host, '[data-status-message]', safe ? '생성 모듈의 release 또는 합의한 allocator callback이 같은 metadata를 해석합니다.' : '주소는 유효하지만 Host heap의 free list에는 이 block 기록이 없습니다.');
      };
    }
  });

  CSLabs.register(69, {
    html: () => `<section class="cs-lab hot-reload-lab">${H(69, '살아 있는 vptr의 세대', 'DLL을 교체한 뒤 old NPC가 어느 code address로 dispatch하는지 추적하세요.')}
      <div class="module-address-space"><div class="module-generation old" data-old-module>DLL GEN 4 · 0x4000–4FFF</div><div class="module-generation new" data-new-module>DLL GEN 5 · 0x7000–7FFF</div><div class="npc-vptr" data-npc-vptr>NPC vptr → 0x4180</div></div>
      <div class="lab-controls"><button type="button" data-load-new>GEN 5 load</button><button type="button" data-unload-old>GEN 4 unload</button><label><input type="checkbox" data-host-table> host indirection table</label><button type="button" class="primary" data-call-update>NPC.Update 호출</button></div>
      ${S('NPC는 GEN 4 vtable 소유', '새 DLL을 load해도 객체 안 주소는 자동으로 바뀌지 않습니다.')}</section>`,
    bind: host => {
      let newLoaded = false, oldLoaded = true;
      host.querySelector('[data-load-new]').onclick = () => { newLoaded = true; host.querySelector('[data-new-module]').classList.add('loaded'); T(host, '[data-status-label]', 'GEN 5 code 추가됨'); };
      host.querySelector('[data-unload-old]').onclick = () => { oldLoaded = false; host.querySelector('[data-old-module]').classList.add('unloaded'); };
      host.querySelector('[data-host-table]').oninput = () => { T(host, '[data-npc-vptr]', host.querySelector('[data-host-table]').checked ? 'NPC handle → HOST TABLE → active gen' : 'NPC vptr → 0x4180'); };
      host.querySelector('[data-call-update]').onclick = () => {
        const table = host.querySelector('[data-host-table]').checked, safe = table ? newLoaded || oldLoaded : oldLoaded;
        T(host, '[data-status-label]', safe ? table && newLoaded ? 'GEN 5 Update 실행' : 'GEN 4 Update 실행' : 'unmapped code 0x4180');
        T(host, '[data-status-message]', safe ? table ? 'stable host table이 active generation 함수로 한 번 더 간접 참조합니다.' : 'old module이 아직 load되어 있어 vptr가 유효합니다.' : '기존 객체의 vptr는 unload된 DLL 주소를 계속 보유합니다.');
      };
    }
  });

  CSLabs.register(70, {
    html: () => `<section class="cs-lab symbol-lab">${H(70, '주소의 의미를 가진 build 찾기', '동일 RVA를 서로 다른 linker map에 대입해 symbol 이름이 바뀌는 것을 확인하세요.')}
      <div class="symbol-maps"><div><b>BUILD A · 8F21</b><span data-map-a></span></div><div><b>BUILD B · C904</b><span data-map-b></span></div></div>
      <div class="crash-ticket">crash build <select data-crash-build><option value="a">8F21</option><option value="b">C904</option></select> · RVA <input type="range" min="100" max="900" value="520" data-crash-rva><output data-rva-out>0x208</output></div>
      <div class="symbol-result" data-symbol-result></div>
      <div class="lab-controls"><label>symbol artifact <select data-symbol-build><option value="a">BUILD A symbols</option><option value="b">BUILD B symbols</option><option value="latest">latest alias</option></select></label><label><input type="checkbox" data-require-build-id> build ID 일치 강제</label><button type="button" class="primary" data-symbolize-build>symbolize</button></div>
      ${S('crash는 BUILD A에서 발생', 'exact build의 linker layout만 RVA에 의미를 부여합니다.')}</section>`,
    bind: host => {
      const maps = {a:[['Boot',0,300],['Player::Damage',301,650],['Render',651,1000]],b:[['Boot',0,180],['NetTick',181,500],['Player::Damage',501,820],['Render',821,1000]]};
      const render = key => maps[key].map(x => `<i style="flex:${x[2]-x[1]}">${x[0]}</i>`).join('');
      host.querySelector('[data-map-a]').innerHTML = render('a'); host.querySelector('[data-map-b]').innerHTML = render('b');
      const draw = () => { const r = +host.querySelector('[data-crash-rva]').value; T(host, '[data-rva-out]', `0x${r.toString(16).toUpperCase()}`); };
      host.querySelector('[data-crash-rva]').oninput = draw;
      host.querySelector('[data-symbolize-build]').onclick = () => {
        const crash = host.querySelector('[data-crash-build]').value, chosenRaw = host.querySelector('[data-symbol-build]').value, chosen = chosenRaw === 'latest' ? 'b' : chosenRaw, strict = host.querySelector('[data-require-build-id]').checked, r = +host.querySelector('[data-crash-rva]').value;
        if (strict && crash !== chosen) { T(host, '[data-symbol-result]', 'BUILD ID MISMATCH · 해석 거부'); T(host, '[data-status-label]', '잘못된 symbol 차단'); T(host, '[data-status-message]', '주소를 그럴듯한 다른 함수로 바꾸는 것보다 미해석 상태가 정확합니다.'); return; }
        const symbol = maps[chosen].find(x => r >= x[1] && r <= x[2])[0];
        T(host, '[data-symbol-result]', `${chosen === 'a' ? '8F21' : 'C904'}: ${symbol} + offset`);
        T(host, '[data-status-label]', crash === chosen ? 'exact build symbolization' : '그럴듯하지만 틀린 stack');
        T(host, '[data-status-message]', crash === chosen ? 'RVA와 inline 정보가 실제 실행 binary의 map에 대응합니다.' : '같은 RVA가 다른 link layout에서 전혀 다른 함수 이름으로 해석됐습니다.');
      }; draw();
    }
  });
})();
