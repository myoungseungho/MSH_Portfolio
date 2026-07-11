/* ============================================================
   MSH study — 여백 메모 (margin notes) + 비밀 Gist 동기화
   - 기본: 브라우저 localStorage에 즉시 저장 (오프라인에서도 동작)
   - 동기화 켜면: 메모를 GitHub 비밀 Gist에 자동 백업 → 다른 기기에서 불러옴
   - 토큰(gist 권한)은 이 브라우저 localStorage에만 저장, 절대 커밋 안 됨
   페이지 끝에 <script src="../notes.js"></script> 한 줄이면 동작.
   ============================================================ */
(function () {
  'use strict';
  if (window.__mshNotes) return; window.__mshNotes = true;
  if (window.top !== window.self) return;
  var container = document.querySelector('.container');
  if (!container) return;

  var PATH = decodeURIComponent(location.pathname);
  var PAGE = 'mshnotes:' + PATH;
  var HINT = 'mshnotes:hint-seen';
  var TOKEN_KEY = 'mshnotes:gh-token';
  var GISTID_KEY = 'mshnotes:gist-id';
  var META_PRE = 'mshnotes:meta:';
  var GIST_FILE = 'msh-study-notes.json';
  var TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=MSH%20study%20notes';
  var GAP = 18, CARDW = 270, MINSPACE = 200;

  /* ---------- storage ---------- */
  function loadPage(path) { try { return JSON.parse(localStorage.getItem('mshnotes:' + path) || '[]'); } catch (e) { return []; } }
  function load() { return loadPage(PATH); }
  function getMeta(path) { return parseInt(localStorage.getItem(META_PRE + path) || '0', 10) || 0; }
  function setMeta(path, ts) { localStorage.setItem(META_PRE + path, String(ts)); }
  function persist() {
    try {
      localStorage.setItem(PAGE, JSON.stringify(state));
      setMeta(PATH, Date.now());
    } catch (e) { alert('메모 저장 실패 — localStorage가 꽉 찼거나 차단됐어요.'); return; }
    scheduleSync();
  }
  var state = load();
  function uid() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function fmt(ts) { var d = new Date(ts); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  var pendingFocus = null;

  /* ---------- CSS ---------- */
  var css = ''
    + '.mshn-strip{position:absolute;top:0;z-index:40;cursor:copy;}'
    + '.mshn-strip:hover{background:linear-gradient(90deg,rgba(246,201,69,0),rgba(246,201,69,.08));}'
    + '.mshn-card{position:absolute;z-index:60;box-sizing:border-box;background:#fffdf2;border:1px solid #efe4a6;border-left:4px solid #f6c945;border-radius:10px;padding:10px 12px;box-shadow:0 2px 10px rgba(0,0,0,.09);font-family:inherit;}'
    + '.mshn-card .mshn-txt{font-size:.85rem;line-height:1.55;color:#4a3d00;white-space:pre-wrap;word-break:break-word;cursor:text;}'
    + '.mshn-card textarea{width:100%;box-sizing:border-box;min-height:48px;font-family:inherit;font-size:.85rem;line-height:1.55;border:1px solid #e6d98f;border-radius:6px;padding:6px 8px;resize:vertical;overflow:hidden;background:#fff;color:#3a3000;outline:none;}'
    + '.mshn-card textarea:focus{border-color:#f6c945;box-shadow:0 0 0 2px rgba(246,201,69,.25);}'
    + '.mshn-card .mshn-meta{font-size:.66rem;color:#b3a25a;margin-top:5px;}'
    + '.mshn-card .mshn-tools{display:flex;gap:6px;justify-content:flex-end;margin-top:7px;}'
    + '.mshn-card button{font-family:inherit;font-size:.72rem;border:1px solid #e0d38a;background:#fff;color:#7a5c00;border-radius:6px;padding:3px 9px;cursor:pointer;}'
    + '.mshn-card button:hover{background:#fff7d6;}'
    + '.mshn-card .mshn-del:hover{background:#ffe5e5;border-color:#f3b0b0;color:#b71c1c;}'
    + '.mshn-card .mshn-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}'
    + '.mshn-card .mshn-fold{border:0;background:transparent;cursor:pointer;font-size:.72rem;color:#a07d00;padding:0;line-height:1;}'
    + '.mshn-card .mshn-fold:hover{color:#6b5300;text-decoration:underline;}'
    + '.mshn-card .mshn-grip{cursor:grab;color:#cbb968;font-size:1rem;line-height:1;user-select:none;-webkit-user-select:none;touch-action:none;padding:0 2px;}'
    + '.mshn-card .mshn-grip:active{cursor:grabbing;}'
    + '.mshn-card.mshn-dragging{opacity:.9;box-shadow:0 6px 18px rgba(0,0,0,.2);}'
    + '.mshn-card .mshn-txt.collapsed{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;}'
    + '.mshn-bar{position:fixed;right:16px;bottom:16px;z-index:90;display:flex;gap:4px;align-items:center;background:#fff;border:1px solid #e0e0e0;border-radius:999px;padding:5px 8px 5px 12px;box-shadow:0 3px 14px rgba(0,0,0,.13);font-family:inherit;font-size:.8rem;color:#555;}'
    + '.mshn-bar .mshn-count{font-weight:700;color:#6a1b9a;font-variant-numeric:tabular-nums;margin-right:2px;cursor:pointer;}'
    + '.mshn-bar button{border:0;background:transparent;cursor:pointer;font-size:1rem;line-height:1;padding:5px;border-radius:8px;}'
    + '.mshn-bar button:hover{background:#f0f0f0;}'
    + '.mshn-bar .mshn-sync{position:relative;}'
    + '.mshn-hint{position:fixed;right:16px;bottom:64px;z-index:91;max-width:290px;background:#fffbe6;border:1px solid #f3e2a0;border-radius:10px;padding:12px 14px;box-shadow:0 4px 16px rgba(0,0,0,.12);font-size:.8rem;line-height:1.6;color:#6b5300;}'
    + '.mshn-hint b{color:#4e3600;}'
    + '.mshn-hint button{margin-top:8px;border:1px solid #e0d38a;background:#fff;color:#7a5c00;border-radius:6px;padding:4px 10px;font-size:.75rem;cursor:pointer;}'
    + '.mshn-pop{position:fixed;right:16px;bottom:64px;z-index:96;width:260px;background:#fff;border:1px solid #e0e0e0;border-radius:12px;box-shadow:0 6px 22px rgba(0,0,0,.16);padding:12px 14px;font-family:inherit;font-size:.82rem;color:#444;}'
    + '.mshn-pop h4{margin:0 0 6px;font-size:.9rem;color:#222;}'
    + '.mshn-pop p{margin:0 0 8px;line-height:1.55;color:#666;}'
    + '.mshn-pop .row{display:flex;gap:6px;flex-wrap:wrap;}'
    + '.mshn-pop button,.mshn-pop a.btn{flex:1;text-align:center;border:1px solid #d9c98a;background:#fffdf2;color:#7a5c00;border-radius:7px;padding:6px 8px;font-size:.78rem;cursor:pointer;text-decoration:none;}'
    + '.mshn-pop button:hover,.mshn-pop a.btn:hover{background:#fff4cf;}'
    + '.mshn-pop input{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:7px;padding:7px 8px;font-size:.8rem;margin:6px 0;}'
    + '.mshn-pop .warn{color:#a25b00;font-size:.72rem;line-height:1.5;}'
    + '.mshn-drawer{position:fixed;top:0;right:0;bottom:0;width:min(92vw,380px);z-index:95;background:#fff;box-shadow:-4px 0 22px rgba(0,0,0,.2);transform:translateX(102%);transition:transform .22s;display:flex;flex-direction:column;font-family:inherit;}'
    + '.mshn-drawer.open{transform:none;}'
    + '.mshn-drawer header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;font-weight:700;color:#333;}'
    + '.mshn-drawer header button{border:0;background:transparent;font-size:1.2rem;cursor:pointer;color:#888;}'
    + '.mshn-drawer .mshn-list{overflow:auto;padding:10px 14px;flex:1;}'
    + '.mshn-drawer .mshn-item{border:1px solid #eee;border-left:4px solid #f6c945;border-radius:8px;padding:10px;margin-bottom:10px;background:#fffdf2;}'
    + '.mshn-drawer .mshn-item .t{font-size:.85rem;white-space:pre-wrap;word-break:break-word;color:#4a3d00;}'
    + '.mshn-drawer .mshn-item .r{display:flex;gap:6px;justify-content:flex-end;margin-top:8px;}'
    + '.mshn-drawer .mshn-item button{font-size:.72rem;border:1px solid #e0d38a;background:#fff;color:#7a5c00;border-radius:6px;padding:3px 9px;cursor:pointer;}'
    + '@media print{.mshn-bar,.mshn-strip,.mshn-hint,.mshn-drawer,.mshn-pop{display:none!important;}}';
  var styleEl = document.createElement('style'); styleEl.textContent = css; document.head.appendChild(styleEl);

  /* ---------- anchors ---------- */
  var ANCHOR_SEL = 'h1,h2,h3,h4,p,li,.code-block,table,.note';
  function anchors() { return Array.prototype.slice.call(container.querySelectorAll(ANCHOR_SEL)); }
  function topOf(el) { return el.getBoundingClientRect().top + window.scrollY; }
  function anchorTop(i) { var a = anchors(); var el = a[Math.max(0, Math.min(i, a.length - 1))]; return el ? topOf(el) : 0; }
  function nearestIdx(docY) { var a = anchors(), best = 0, bd = 1e9; for (var i = 0; i < a.length; i++) { var d = Math.abs(topOf(a[i]) - docY); if (d < bd) { bd = d; best = i; } } return best; }

  /* ---------- metrics ---------- */
  function metrics() {
    var cr = container.getBoundingClientRect();
    var avail = window.innerWidth - cr.right - GAP;
    return { left: cr.right + window.scrollX + GAP, avail: avail, width: Math.min(CARDW, Math.max(120, avail - GAP)) };
  }
  function wide() { return metrics().avail >= MINSPACE; }

  /* ---------- DOM roots ---------- */
  var layer = document.createElement('div'); document.body.appendChild(layer);
  var strip = document.createElement('div'); strip.className = 'mshn-strip'; document.body.appendChild(strip);
  strip.addEventListener('click', function (e) { if (e.target === strip) addNote(e.pageY); });

  var bar = document.createElement('div'); bar.className = 'mshn-bar'; document.body.appendChild(bar);
  var countEl = document.createElement('span'); countEl.className = 'mshn-count'; countEl.title = '메모 목록';
  countEl.addEventListener('click', function () { if (!wide()) openDrawer(); });
  var addBtn = mkBtn('＋', '이 화면 위치에 메모 추가', function () { addNote(window.scrollY + window.innerHeight * 0.4); });
  var syncBtn = mkBtn('☁', '메모 동기화', toggleSyncPop); syncBtn.className = 'mshn-sync';
  var expBtn = mkBtn('⬇', '모든 메모 내보내기(JSON 파일 백업)', exportAll);
  var impBtn = mkBtn('⬆', '메모 가져오기(JSON)', importAll);
  bar.appendChild(countEl); bar.appendChild(addBtn); bar.appendChild(syncBtn); bar.appendChild(expBtn); bar.appendChild(impBtn);
  function mkBtn(label, title, fn) { var b = document.createElement('button'); b.textContent = label; b.title = title; b.addEventListener('click', fn); return b; }

  /* ---------- actions ---------- */
  function addNote(docY) {
    var n = { id: uid(), aIdx: nearestIdx(docY), y: docY, text: '', ts: Date.now(), editing: true, collapsed: false };
    state.push(n); pendingFocus = n.id; persist(); render();
    if (!wide()) openDrawer();
  }
  function remove(id) { state = state.filter(function (n) { return n.id !== id; }); persist(); render(); if (drawerOpen) renderDrawer(); }

  /* ---------- render ---------- */
  function render() {
    layer.innerHTML = '';
    var m = metrics(), isWide = wide();
    countEl.textContent = '📝 ' + state.length;
    if (isWide) {
      strip.style.display = 'block';
      strip.style.left = m.left + 'px';
      strip.style.width = Math.max(0, m.avail - GAP) + 'px';
      strip.style.height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) + 'px';
      // 각 카드를 자기 앵커 위치에 붙여 생성 (앵커는 dataset에 보관 → 재정렬은 항상 이 값 기준)
      state.slice().sort(function (a, b) { return anchorTop(a.aIdx) - anchorTop(b.aIdx); }).forEach(function (n) {
        var card = buildCard(n);
        card.style.left = m.left + 'px'; card.style.width = m.width + 'px';
        card.dataset.anchor = anchorTop(n.aIdx);
        card.style.top = card.dataset.anchor + 'px';
        layer.appendChild(card);
      });
      stackCards();
      requestAnimationFrame(stackCards); // 레이아웃 확정 후 한 번 더(높이 측정 타이밍 보정)
    } else { strip.style.display = 'none'; }
    if (pendingFocus) { var ta = layer.querySelector('.mshn-card[data-id="' + pendingFocus + '"] textarea'); if (ta) ta.focus(); pendingFocus = null; }
  }

  // 겹치지 않게 아래로 밀어 쌓기 — 항상 dataset.anchor(고정)에서 다시 계산하므로 접었다 펴도 누적되지 않음
  function stackCards() {
    var cards = Array.prototype.slice.call(layer.querySelectorAll('.mshn-card'));
    cards.sort(function (a, b) { return (parseFloat(a.dataset.anchor) || 0) - (parseFloat(b.dataset.anchor) || 0); });
    var lastBottom = -1e9;
    cards.forEach(function (c) {
      if (c.classList.contains('mshn-dragging')) { lastBottom = (parseFloat(c.style.top) || 0) + c.offsetHeight; return; }
      var top = parseFloat(c.dataset.anchor) || 0;
      if (top < lastBottom + 10) top = lastBottom + 10;
      c.style.top = top + 'px';
      lastBottom = top + c.offsetHeight;
    });
  }

  function buildCard(n) {
    var card = document.createElement('div'); card.className = 'mshn-card'; card.setAttribute('data-id', n.id);
    if (n.editing) {
      var ta = document.createElement('textarea');
      ta.value = n.text; ta.placeholder = '여기에 메모… (예: 이 부분 왜 이렇게 되는지 헷갈림)';
      var autosize = function () { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; stackCards(); }; // 내용 높이만큼 펼침
      ta.addEventListener('input', autosize);
      requestAnimationFrame(autosize); // DOM에 붙은 뒤 초기 높이 맞추기
      var tools = document.createElement('div'); tools.className = 'mshn-tools';
      var ok = document.createElement('button'); ok.textContent = n.text ? '저장' : '추가';
      var cancel = document.createElement('button'); cancel.textContent = '취소';
      ok.onclick = function () { var v = ta.value.trim(); if (!v) { remove(n.id); return; } n.text = v; n.editing = false; n.ts = Date.now(); persist(); render(); };
      cancel.onclick = function () { if (!n.text) remove(n.id); else { n.editing = false; render(); } };
      ta.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') ok.click(); if (e.key === 'Escape') cancel.click(); });
      tools.appendChild(cancel); tools.appendChild(ok);
      card.appendChild(ta); card.appendChild(tools);
    } else {
      var head = document.createElement('div'); head.className = 'mshn-head';
      var fold = document.createElement('button'); fold.className = 'mshn-fold'; fold.textContent = n.collapsed ? '▸ 펼치기' : '▾ 접기';
      fold.onclick = function () { n.collapsed = !n.collapsed; persist(); render(); };
      var grip = document.createElement('span'); grip.className = 'mshn-grip'; grip.textContent = '⠿'; grip.title = '드래그해서 위아래로 이동';
      head.appendChild(fold); head.appendChild(grip);
      var txt = document.createElement('div'); txt.className = 'mshn-txt' + (n.collapsed ? ' collapsed' : ''); txt.textContent = n.text; txt.title = n.collapsed ? '클릭하면 펼치기' : '클릭하면 편집';
      txt.onclick = function () { if (n.collapsed) { n.collapsed = false; persist(); render(); return; } n.editing = true; pendingFocus = n.id; render(); };
      card.appendChild(head); card.appendChild(txt);
      if (!n.collapsed) {
        var meta = document.createElement('div'); meta.className = 'mshn-meta'; meta.textContent = fmt(n.ts);
        var tools = document.createElement('div'); tools.className = 'mshn-tools';
        var ed = document.createElement('button'); ed.textContent = '✏️ 편집'; ed.onclick = function () { n.editing = true; pendingFocus = n.id; render(); };
        var del = document.createElement('button'); del.className = 'mshn-del'; del.textContent = '🗑 삭제'; del.onclick = function () { if (confirm('이 메모를 삭제할까요?')) remove(n.id); };
        tools.appendChild(ed); tools.appendChild(del);
        card.appendChild(meta); card.appendChild(tools);
      }
      enableDrag(card, grip, n);
    }
    return card;
  }

  /* ---------- 카드 드래그(위아래 이동) ---------- */
  function enableDrag(card, handle, n) {
    var startY = 0, startTop = 0, dragging = false;
    handle.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      dragging = true; startY = e.clientY; startTop = parseFloat(card.style.top) || 0;
      card.style.zIndex = 70; card.classList.add('mshn-dragging');
      try { handle.setPointerCapture(e.pointerId); } catch (x) {}
    });
    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      card.style.top = (startTop + (e.clientY - startY)) + 'px';
    });
    function end() {
      if (!dragging) return; dragging = false; card.classList.remove('mshn-dragging');
      var finalTop = parseFloat(card.style.top) || 0;
      if (Math.abs(finalTop - startTop) > 6) { n.aIdx = nearestIdx(finalTop); persist(); } // 실제로 옮겼을 때만 재앵커(오클릭 방지)
      render();
    }
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  /* ---------- drawer (narrow) ---------- */
  var drawer = null, drawerOpen = false;
  function openDrawer() { if (!drawer) buildDrawer(); drawer.classList.add('open'); drawerOpen = true; renderDrawer(); }
  function closeDrawer() { if (drawer) drawer.classList.remove('open'); drawerOpen = false; }
  function buildDrawer() {
    drawer = document.createElement('div'); drawer.className = 'mshn-drawer';
    var h = document.createElement('header'); h.innerHTML = '<span>📝 이 페이지 메모</span>';
    var x = document.createElement('button'); x.textContent = '×'; x.onclick = closeDrawer; h.appendChild(x);
    var list = document.createElement('div'); list.className = 'mshn-list';
    drawer.appendChild(h); drawer.appendChild(list); document.body.appendChild(drawer);
  }
  function renderDrawer() {
    var list = drawer.querySelector('.mshn-list'); list.innerHTML = '';
    if (!state.length) { list.innerHTML = '<p style="color:#999;font-size:.85rem;">아직 메모가 없어요. ＋ 로 추가하세요.</p>'; return; }
    state.slice().sort(function (a, b) { return anchorTop(a.aIdx) - anchorTop(b.aIdx); }).forEach(function (n) {
      var it = document.createElement('div'); it.className = 'mshn-item';
      var t = document.createElement('div'); t.className = 't'; t.textContent = n.text || '(빈 메모)';
      var r = document.createElement('div'); r.className = 'r';
      var go = document.createElement('button'); go.textContent = '📍 위치'; go.onclick = function () { closeDrawer(); window.scrollTo({ top: Math.max(0, anchorTop(n.aIdx) - 80), behavior: 'smooth' }); };
      var ed = document.createElement('button'); ed.textContent = '✏️'; ed.onclick = function () { var v = prompt('메모 편집', n.text); if (v !== null) { n.text = v.trim(); n.ts = Date.now(); persist(); renderDrawer(); render(); } };
      var del = document.createElement('button'); del.textContent = '🗑'; del.onclick = function () { if (confirm('삭제할까요?')) { remove(n.id); renderDrawer(); } };
      r.appendChild(go); r.appendChild(ed); r.appendChild(del);
      it.appendChild(t); it.appendChild(r); list.appendChild(it);
    });
  }

  /* ---------- export / import ---------- */
  function exportAll() {
    var all = {};
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (isPageKey(k)) all[k] = localStorage.getItem(k); }
    var blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'msh-notes-backup.json'; a.click(); URL.revokeObjectURL(a.href);
  }
  function importAll() {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return; var fr = new FileReader();
      fr.onload = function () {
        try {
          var obj = JSON.parse(fr.result); var cnt = 0;
          Object.keys(obj).forEach(function (k) { if (isPageKey(k)) { localStorage.setItem(k, obj[k]); setMeta(k.slice(9), Date.now()); cnt++; } });
          state = load(); render(); scheduleSync();
          alert(cnt + '개 페이지의 메모를 가져왔어요.');
        } catch (e) { alert('가져오기 실패 — 올바른 백업 파일이 아니에요.'); }
      };
      fr.readAsText(f);
    };
    inp.click();
  }

  /* ============================================================
     비밀 Gist 동기화
     ============================================================ */
  function token() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function gistId() { return localStorage.getItem(GISTID_KEY) || ''; }
  function isPageKey(k) { return k.indexOf('mshnotes:') === 0 && k.indexOf(META_PRE) !== 0 && k !== TOKEN_KEY && k !== GISTID_KEY && k !== HINT; }
  var syncState = 'off'; // off | syncing | ok | error

  function setSync(s) {
    syncState = s;
    syncBtn.textContent = s === 'syncing' ? '⏳' : (s === 'error' ? '⚠️' : '☁');
    syncBtn.style.opacity = (s === 'off') ? '.45' : '1';
    syncBtn.title = s === 'off' ? '동기화 꺼짐 — 클릭해서 켜기'
      : s === 'syncing' ? '동기화 중…'
      : s === 'error' ? '동기화 오류 — 클릭' : '동기화 켜짐 ✓ — 클릭';
  }

  function api(method, path, body) {
    return fetch('https://api.github.com' + path, {
      method: method,
      headers: { 'Authorization': 'token ' + token(), 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { if (!r.ok) throw new Error('GitHub ' + r.status); return r.status === 204 ? {} : r.json(); });
  }

  function findGist() {
    if (gistId()) return Promise.resolve(gistId());
    return api('GET', '/gists?per_page=100').then(function (list) {
      for (var i = 0; i < list.length; i++) { if (list[i].files && list[i].files[GIST_FILE]) { localStorage.setItem(GISTID_KEY, list[i].id); return list[i].id; } }
      return '';
    });
  }

  function readGist() {
    return findGist().then(function (id) {
      if (!id) return { pages: {} };
      return api('GET', '/gists/' + id).then(function (g) {
        try { return JSON.parse(g.files[GIST_FILE].content); } catch (e) { return { pages: {} }; }
      });
    });
  }

  function localPages() {
    var out = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i); if (!isPageKey(k)) continue;
      var p = k.slice(9);
      try { out[p] = { notes: JSON.parse(localStorage.getItem(k)), updatedAt: getMeta(p) }; } catch (e) {}
    }
    return out;
  }

  // 원격 → 로컬 (페이지별 최신 승리)
  function pullAll() {
    if (!token()) return Promise.resolve();
    setSync('syncing');
    return readGist().then(function (remote) {
      var pages = (remote && remote.pages) || {};
      Object.keys(pages).forEach(function (p) {
        var r = pages[p]; if (!r) return;
        if ((r.updatedAt || 0) > getMeta(p)) {
          localStorage.setItem('mshnotes:' + p, JSON.stringify(r.notes || []));
          setMeta(p, r.updatedAt || Date.now());
        }
      });
      state = load(); render();
      setSync('ok');
    }).catch(function (e) { setSync('error'); });
  }

  // 로컬 → 원격 (다른 페이지는 원격 유지하며 병합)
  var pushTimer = null;
  function scheduleSync() { if (!token()) return; clearTimeout(pushTimer); pushTimer = setTimeout(pushAll, 1500); }
  function pushAll() {
    if (!token()) return Promise.resolve();
    setSync('syncing');
    return readGist().then(function (remote) {
      var merged = (remote && remote.pages) ? Object.assign({}, remote.pages) : {};
      var lp = localPages();
      Object.keys(lp).forEach(function (p) {
        if (!merged[p] || (lp[p].updatedAt || 0) >= (merged[p].updatedAt || 0)) merged[p] = lp[p];
      });
      var content = JSON.stringify({ v: 1, updatedAt: Date.now(), pages: merged });
      var files = {}; files[GIST_FILE] = { content: content };
      var id = gistId();
      if (id) return api('PATCH', '/gists/' + id, { files: files });
      return api('POST', '/gists', { description: 'MSH study — margin notes (auto)', public: false, files: files })
        .then(function (g) { localStorage.setItem(GISTID_KEY, g.id); });
    }).then(function () { setSync('ok'); }).catch(function (e) { setSync('error'); });
  }

  /* ---------- sync popover ---------- */
  var pop = null;
  function toggleSyncPop() { if (pop) { pop.remove(); pop = null; return; } openSyncPop(); }
  function openSyncPop() {
    pop = document.createElement('div'); pop.className = 'mshn-pop';
    if (!token()) {
      pop.innerHTML =
        '<h4>☁ 메모 동기화 켜기</h4>' +
        '<p>토큰 한 번만 붙여넣으면, 이후엔 메모 저장 시 <b>자동으로</b> GitHub 비밀 Gist에 백업돼요. 다른 기기에서도 같은 토큰만 넣으면 그대로 보여요.</p>' +
        '<div class="row"><a class="btn" href="' + TOKEN_URL + '" target="_blank" rel="noopener">① 토큰 만들기(gist 권한)</a></div>' +
        '<input type="password" placeholder="② 토큰 붙여넣기 (ghp_...)" />' +
        '<div class="row"><button class="cancel">취소</button><button class="go">③ 켜기</button></div>' +
        '<p class="warn">⚠ 토큰은 이 브라우저에만 저장돼요. 공용 PC에선 쓰지 마세요. 유출돼도 gist 권한뿐이라 레포·계정은 안전.</p>';
      pop.querySelector('.cancel').onclick = toggleSyncPop;
      pop.querySelector('.go').onclick = function () {
        var t = pop.querySelector('input').value.trim();
        if (!t) { alert('토큰을 붙여넣어 주세요.'); return; }
        localStorage.setItem(TOKEN_KEY, t);
        toggleSyncPop(); setSync('syncing');
        // 검증 + 최초 병합(원격 불러오고 → 로컬 밀어넣기)
        pullAll().then(pushAll).then(function () { if (syncState !== 'error') alert('동기화 켜졌어요 ✓ 이제 저장하면 자동 백업돼요.'); else alert('토큰이 잘못됐거나 gist 권한이 없어요. 다시 확인해 주세요.'); });
      };
    } else {
      pop.innerHTML =
        '<h4>☁ 동기화 ' + (syncState === 'error' ? '⚠️ 오류' : '켜짐 ✓') + '</h4>' +
        '<p>메모를 저장하면 자동으로 비밀 Gist에 백업돼요.' + (syncState === 'error' ? ' <b>지금 오류 상태</b> — 토큰이 만료됐을 수 있어요.' : '') + '</p>' +
        '<div class="row"><button class="now">🔄 지금 동기화</button><button class="pull">⬇ 다시 불러오기</button></div>' +
        '<div class="row"><button class="off">🔌 동기화 끄기</button><button class="close">닫기</button></div>';
      pop.querySelector('.now').onclick = function () { toggleSyncPop(); pushAll(); };
      pop.querySelector('.pull').onclick = function () { toggleSyncPop(); pullAll(); };
      pop.querySelector('.close').onclick = toggleSyncPop;
      pop.querySelector('.off').onclick = function () {
        if (confirm('이 브라우저에서 동기화를 끌까요? (토큰 삭제, 메모 자체는 남아요)')) { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(GISTID_KEY); toggleSyncPop(); setSync('off'); }
      };
    }
    document.body.appendChild(pop);
  }

  /* ---------- first-run hint ---------- */
  if (!localStorage.getItem(HINT)) {
    var hint = document.createElement('div'); hint.className = 'mshn-hint';
    hint.innerHTML = '<b>📝 여백 메모</b><br>오른쪽 <b>빈 여백을 클릭</b>하면 그 위치에 메모를 남겨요. 좁은 화면은 아래 <b>＋</b> 버튼.<br>다른 기기와 <b>동기화</b>하려면 <b>☁</b> 를 눌러 켜세요.<br><button>알겠어요</button>';
    hint.querySelector('button').onclick = function () { localStorage.setItem(HINT, '1'); hint.remove(); };
    document.body.appendChild(hint);
  }

  /* ---------- lifecycle ---------- */
  var rt;
  function reflow() { clearTimeout(rt); rt = setTimeout(render, 120); }
  window.addEventListener('resize', reflow);
  window.addEventListener('load', render);
  setSync(token() ? 'ok' : 'off');
  render();
  if (token()) pullAll();
})();
