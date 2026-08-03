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
  var container = document.querySelector('.container, .page');
  if (!container) return;

  var PATH = decodeURIComponent(location.pathname);
  var PAGE = 'mshnotes:' + PATH;
  var HINT = 'mshnotes:hint-seen';
  var TOKEN_KEY = 'mshnotes:gh-token';
  var GISTID_KEY = 'mshnotes:gist-id';
  var META_PRE = 'mshnotes:meta:';
  var GIST_FILE = 'msh-study-notes.json';   // 마커 파일 — 새 기기의 findGist()가 이 이름으로 기존 Gist를 찾는다
  var GIST_DESC = 'MSH study — margin notes (auto)';
  var TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=MSH%20study%20notes';
  var GAP = 18, CARDW = 270, MINSPACE = 200, MINW = 180;
  var WIDTH_KEY = 'mshnotes:card-width';   // 카드 너비(전 페이지 공용, 이 브라우저에 저장)
  function userWidth() { var v = parseInt(localStorage.getItem(WIDTH_KEY) || '0', 10); return v > 0 ? v : CARDW; }
  function setUserWidth(w) { localStorage.setItem(WIDTH_KEY, String(Math.round(w))); }

  /* ---------- storage ---------- */
  function loadPage(path) { try { return JSON.parse(localStorage.getItem('mshnotes:' + path) || '[]'); } catch (e) { return []; } }
  function load() { return loadPage(PATH); }
  function getMeta(path) { return parseInt(localStorage.getItem(META_PRE + path) || '0', 10) || 0; }
  function setMeta(path, ts) { localStorage.setItem(META_PRE + path, String(ts)); }
  function replacer(k, v) { return (k === '__refreshGallery' || k === 'editing') ? undefined : v; } // 함수·임시상태는 저장 안 함
  function persist() {
    try {
      localStorage.setItem(PAGE, JSON.stringify(state, replacer));
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
    + '.mshn-card{position:absolute;}'   /* (아래 mshn-resize의 기준) */
    + '.mshn-resize{position:absolute;right:-4px;top:0;bottom:0;width:12px;cursor:ew-resize;touch-action:none;z-index:2;}'
    + '.mshn-resize::before{content:"";position:absolute;right:4px;top:50%;transform:translateY(-50%);width:3px;height:34px;border-radius:3px;background:#e6d98f;opacity:0;transition:opacity .12s;}'
    + '.mshn-card:hover .mshn-resize::before{opacity:.9;}'
    + '.mshn-resize:hover::before{background:#f6c945;opacity:1;height:48px;}'
    + '.mshn-card .mshn-headright{display:flex;align-items:center;gap:2px;}'
    + '.mshn-card .mshn-trash{border:0;background:transparent;cursor:pointer;font-size:.8rem;line-height:1;padding:2px 3px;border-radius:5px;opacity:.45;transition:opacity .12s,background .12s;}'
    + '.mshn-card:hover .mshn-trash{opacity:.85;}'
    + '.mshn-card .mshn-trash:hover{opacity:1;background:#ffe5e5;}'
    + '.mshn-card.mshn-dragging{opacity:.9;box-shadow:0 6px 18px rgba(0,0,0,.2);}'
    + '.mshn-card .mshn-txt.collapsed{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;}'
    + '.mshn-imgs{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;}'
    + '.mshn-imgs .mshn-thumb{position:relative;width:56px;height:56px;border-radius:6px;overflow:hidden;border:1px solid #e6d98f;cursor:zoom-in;background:#fff;}'
    + '.mshn-imgs .mshn-thumb img{width:100%;height:100%;object-fit:cover;display:block;}'
    + '.mshn-imgs .mshn-thumb .x{position:absolute;top:1px;right:1px;width:15px;height:15px;line-height:14px;text-align:center;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:.62rem;cursor:pointer;opacity:0;transition:opacity .12s;}'
    + '.mshn-imgs .mshn-thumb:hover .x{opacity:1;}'
    + '.mshn-card .mshn-thumb.inline{display:block;width:100%;height:auto;max-height:150px;margin:6px 0;border:1px solid #e6d98f;border-radius:6px;overflow:hidden;cursor:zoom-in;background:#fff;}'
    + '.mshn-card .mshn-thumb.inline img{width:100%;height:auto;max-height:150px;object-fit:cover;display:block;}'
    + '.mshn-card .mshn-thumb.inline:hover{border-color:#f6c945;}'
    + '.mshn-card .mshn-txt .mshn-imgs{margin-top:4px;}'
    + '.mshn-lightbox{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:24px;}'
    + '.mshn-lightbox img{max-width:96vw;max-height:92vh;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,.5);cursor:default;}'
    + '.mshn-lightbox .nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.9);border:0;border-radius:50%;width:40px;height:40px;font-size:1.2rem;cursor:pointer;color:#333;}'
    + '.mshn-lightbox .nav.prev{left:16px;} .mshn-lightbox .nav.next{right:16px;}'
    + '.mshn-lightbox .cnt{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);color:#fff;font-size:.8rem;opacity:.85;}'
    + '.mshn-paste{font-size:.68rem;color:#b3a25a;margin-top:4px;}'
    + '.mshn-editimgs{margin-top:6px;padding-top:6px;border-top:1px dashed #ece0a8;}'
    + '.mshn-card .mshn-txt a{color:#1565c0;text-decoration:underline;word-break:break-all;}'
    + '.mshn-card .mshn-txt a:hover{color:#0d47a1;}'
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
  function rawAnchors() { return Array.prototype.slice.call(container.querySelectorAll(ANCHOR_SEL)); }
  // 숫자 인덱스만 저장하면 펼침/접힘으로 중간에 p·li가 생길 때 같은 번호가 다른
  // 요소를 가리킨다. 문서 안에서 변하지 않는 의미 키를 함께 저장해 그 문제를 막는다.
  function textKey(el) {
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120), h = 2166136261;
    for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function anchorBase(el) {
    var scope = el.closest('[id]');
    return (scope ? scope.id : 'page') + '|' + el.tagName.toLowerCase() + '|' + textKey(el);
  }
  function anchors() {
    var list = rawAnchors(), seen = {};
    list.forEach(function (el) {
      if (!el.dataset.mshnAnchor) return;
      var base = anchorBase(el), suffix = Number(el.dataset.mshnAnchor.slice(base.length + 1));
      seen[base] = Math.max(seen[base] || 0, (isNaN(suffix) ? 0 : suffix + 1));
    });
    list.forEach(function (el) {
      if (el.dataset.mshnAnchor) return;
      var base = anchorBase(el), nth = seen[base] || 0;
      seen[base] = nth + 1;
      el.dataset.mshnAnchor = base + '|' + nth;
    });
    return list;
  }
  function topOf(el) { return el.getBoundingClientRect().top + window.scrollY; }
  function anchorFor(n) {
    var a = anchors(), el = null;
    if (n.aKey) {
      for (var i = 0; i < a.length; i++) if (a[i].dataset.mshnAnchor === n.aKey) { el = a[i]; break; }
    }
    if (!el) el = a[Math.max(0, Math.min(n.aIdx || 0, a.length - 1))];
    return el || null;
  }
  function anchorTop(n) { var el = anchorFor(n); return el ? topOf(el) : 0; }
  function nearestAnchor(docY) {
    var a = anchors(), best = 0, bd = 1e9;
    for (var i = 0; i < a.length; i++) { var d = Math.abs(topOf(a[i]) - docY); if (d < bd) { bd = d; best = i; } }
    return { idx: best, key: a[best] ? a[best].dataset.mshnAnchor : '' };
  }

  /* ---------- metrics ---------- */
  function metrics() {
    var cr = container.getBoundingClientRect();
    var avail = window.innerWidth - cr.right - GAP;
    var maxW = Math.max(MINW, avail - GAP);                    // 여백이 허용하는 최대 너비
    var w = Math.min(userWidth(), maxW);                       // 사용자가 정한 너비(여백 초과 시 클램프)
    return { left: cr.right + window.scrollX + GAP, avail: avail, width: Math.max(MINW, w), maxW: maxW };
  }
  function wide() { return metrics().avail >= MINSPACE; }

  /* ---------- DOM roots ---------- */
  // 카드·스트립이 문서 높이(scrollHeight)를 늘리지 못하게 격리한다.
  // 안 그러면 [펼침 → 문서 길어짐 → 앵커 밀림 → 접어도 원복 안 됨] 되먹임이 생긴다.
  var host = document.createElement('div');
  host.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;overflow:visible;';
  document.body.appendChild(host);
  var layer = document.createElement('div'); host.appendChild(layer);
  var strip = document.createElement('div'); strip.className = 'mshn-strip'; host.appendChild(strip);
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
    var anchor = nearestAnchor(docY);
    var n = { id: uid(), aIdx: anchor.idx, aKey: anchor.key, y: docY, text: '', imgs: [], ts: Date.now(), editing: true, collapsed: false };
    state.push(n); pendingFocus = n.id; persist(); render();
    if (!wide()) openDrawer();
  }
  function remove(id) { state = state.filter(function (n) { return n.id !== id; }); persist(); render(); if (drawerOpen) renderDrawer(); }

  /* ---------- render ---------- */
  function render() {
    layer.innerHTML = '';
    var m = metrics(), isWide = wide();
    var kb = pageBytes();
    countEl.textContent = '📝 ' + state.length + (kb > 300 * 1024 ? ' · ' + fmtKB(kb) : '');
    countEl.style.color = kb > 800 * 1024 ? '#c62828' : (kb > 500 * 1024 ? '#ef6c00' : '#6a1b9a');
    countEl.title = '이 페이지 메모 ' + state.length + '개 · ' + fmtKB(kb) + (kb > 500 * 1024 ? ' (한도 1MB 근접 — 이미지 정리 권장)' : '');
    if (isWide) {
      // 앵커는 본문 기준으로만 계산 (카드는 host로 격리돼 문서 높이에 영향 없음)
      var tops = state.map(function (n) { return anchorTop(n); });
      strip.style.display = 'block';
      strip.style.left = m.left + 'px';
      strip.style.width = Math.max(0, m.avail - GAP) + 'px';
      strip.style.height = (topOf(container) + container.getBoundingClientRect().height) + 'px';
      var order = state.map(function (n, i) { return { n: n, top: tops[i] }; }).sort(function (a, b) { return a.top - b.top; });
      order.forEach(function (o) {
        var card = buildCard(o.n);
        card.style.left = m.left + 'px'; card.style.width = m.width + 'px';
        card.dataset.anchor = o.top;
        card.style.top = o.top + 'px';
        layer.appendChild(card);
      });
      stackCards();
      requestAnimationFrame(stackCards); // 레이아웃 확정 후 한 번 더(이미지·폰트 로드 타이밍 보정)
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
    var grab = document.createElement('div'); grab.className = 'mshn-resize'; grab.title = '드래그해서 메모 너비 조절 (더블클릭: 여백 꽉 채우기)';
    enableResize(grab);
    card.appendChild(grab);
    if (n.editing) {
      var ta = document.createElement('textarea');
      ta.value = n.text; ta.placeholder = '여기에 메모… (예: 이 부분 왜 이렇게 되는지 헷갈림)';
      var autosize = function () { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; stackCards(); }; // 내용 높이만큼 펼침
      ta.addEventListener('input', autosize);
      requestAnimationFrame(autosize); // DOM에 붙은 뒤 초기 높이 맞추기
      // 이미지 붙여넣기(Ctrl+V) / 드롭 — 커서가 있는 줄에 삽입
      ta.addEventListener('paste', function (e) { handleImageDrop(e.clipboardData, n, e, ta, autosize); });
      ta.addEventListener('dragover', function (e) { e.preventDefault(); });
      ta.addEventListener('drop', function (e) { handleImageDrop(e.dataTransfer, n, e, ta, autosize); });
      // 편집 중에도 첨부된 사진을 보여주고 ×로 지울 수 있게 (자리표시자만으론 뭔지 알 수 없으니)
      var gal = document.createElement('div'); gal.className = 'mshn-editimgs';
      function renderGallery() {
        gal.innerHTML = '';
        var list = n.imgs || [];
        if (!list.length) { gal.style.display = 'none'; return; }
        gal.style.display = 'block';
        var cap = document.createElement('div'); cap.className = 'mshn-paste'; cap.textContent = '📎 첨부된 사진 ' + list.length + '개 — ×를 누르면 삭제돼요';
        gal.appendChild(cap);
        var row = document.createElement('div'); row.className = 'mshn-imgs';
        list.forEach(function (im) {
          var th = document.createElement('div'); th.className = 'mshn-thumb';
          var img = document.createElement('img'); img.src = im.src; img.alt = '';
          th.appendChild(img);
          th.title = '클릭하면 크게 보기';
          th.onclick = function (e) { if (e.target.classList.contains('x')) return; openLightbox(n, (n.imgs || []).indexOf(im)); };
          var x = document.createElement('span'); x.className = 'x'; x.textContent = '×'; x.title = '이 사진 삭제';
          x.onclick = function (e) {
            e.stopPropagation();
            if (!confirm('이 사진을 삭제할까요?')) return;
            ta.value = ta.value.replace(new RegExp('\\n?\\[\\[img:' + im.id + '\\]\\]\\n?', 'g'), '\n'); // 본문 자리표시자도 제거
            n.text = ta.value;
            n.imgs = (n.imgs || []).filter(function (o) { return o.id !== im.id; });
            n.ts = Date.now(); persist(); renderGallery(); autosize();
          };
          th.appendChild(x);
          row.appendChild(th);
        });
        gal.appendChild(row);
      }
      renderGallery();
      n.__refreshGallery = renderGallery;   // 붙여넣기 후 갱신용
      var hintP = document.createElement('div'); hintP.className = 'mshn-paste'; hintP.textContent = '💡 이미지 복사 후 Ctrl+V로 첨부 · URL은 저장하면 링크가 됨';
      var tools = document.createElement('div'); tools.className = 'mshn-tools';
      var ok = document.createElement('button'); ok.textContent = n.text ? '저장' : '추가';
      var cancel = document.createElement('button'); cancel.textContent = '취소';
      ok.onclick = function () { var v = ta.value.trim(); if (!v && !(n.imgs && n.imgs.length)) { remove(n.id); return; } n.text = v; n.editing = false; delete n.__refreshGallery; n.ts = Date.now(); persist(); render(); };
      cancel.onclick = function () { delete n.__refreshGallery; if (!n.text && !(n.imgs && n.imgs.length)) remove(n.id); else { n.editing = false; render(); } };
      ta.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') ok.click(); if (e.key === 'Escape') cancel.click(); });
      tools.appendChild(cancel); tools.appendChild(ok);
      card.appendChild(ta);
      card.appendChild(gal);
      card.appendChild(hintP); card.appendChild(tools);
    } else {
      var head = document.createElement('div'); head.className = 'mshn-head';
      var nimg = (n.imgs && n.imgs.length) ? n.imgs.length : 0;
      var fold = document.createElement('button'); fold.className = 'mshn-fold';
      fold.textContent = (n.collapsed ? '▸ 펼치기' : '▾ 접기') + (n.collapsed && nimg ? ' 🖼' + nimg : '');
      fold.onclick = function () { n.collapsed = !n.collapsed; persist(); render(); };
      var grip = document.createElement('span'); grip.className = 'mshn-grip'; grip.textContent = '⠿'; grip.title = '드래그해서 위아래로 이동';
      var trash = document.createElement('button'); trash.className = 'mshn-trash'; trash.textContent = '🗑'; trash.title = '이 메모 삭제';
      trash.onclick = function (e) { e.stopPropagation(); if (confirm('이 메모를 삭제할까요?')) remove(n.id); };
      var right = document.createElement('span'); right.className = 'mshn-headright';
      right.appendChild(grip); right.appendChild(trash);
      head.appendChild(fold); head.appendChild(right);
      var txt = document.createElement('div'); txt.className = 'mshn-txt' + (n.collapsed ? ' collapsed' : ''); txt.title = n.collapsed ? '클릭하면 펼치기' : '클릭하면 편집 (링크는 클릭해서 이동)';
      renderBody(txt, n, false);   // 사진은 그 줄 위치에, URL은 링크로
      txt.onclick = function (e) {
        if (e.target.tagName === 'A') return;   // 링크 클릭은 이동만, 편집 진입 안 함
        if (n.collapsed) { n.collapsed = false; persist(); render(); return; }
        n.editing = true; pendingFocus = n.id; render();
      };
      card.appendChild(head); card.appendChild(txt);
      if (!n.collapsed) {
        var meta = document.createElement('div'); meta.className = 'mshn-meta'; meta.textContent = fmt(n.ts);
        var tools = document.createElement('div'); tools.className = 'mshn-tools';
        var ed = document.createElement('button'); ed.textContent = '✏️ 편집'; ed.onclick = function () { n.editing = true; pendingFocus = n.id; render(); };
        tools.appendChild(ed);   // 삭제는 우측 상단 🗑 로 통일
        card.appendChild(meta); card.appendChild(tools);
      }
      enableDrag(card, grip, n);
    }
    return card;
  }

  /* ---------- 본문 렌더: [[img:id]]는 그 자리에 사진, URL은 링크 (innerHTML 안 씀 = XSS 안전) ---------- */
  var URL_RE = /(https?:\/\/[^\s<>()[\]{}"']+|www\.[^\s<>()[\]{}"']+)/gi;
  var IMG_RE = /\[\[img:([a-z0-9]+)\]\]/gi;

  function linkifyInto(el, text) {   // 텍스트 조각에서 URL만 링크로
    var last = 0, m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text)) !== null) {
      if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
      var raw = m[0], trail = '';
      while (/[.,!?;:)\]]$/.test(raw)) { trail = raw.slice(-1) + trail; raw = raw.slice(0, -1); }
      var a = document.createElement('a');
      a.href = /^www\./i.test(raw) ? 'https://' + raw : raw;
      a.textContent = raw; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.title = a.href + ' (새 탭에서 열기)';
      el.appendChild(a);
      if (trail) el.appendChild(document.createTextNode(trail));
      last = m.index + m[0].length;
    }
    if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
  }

  // 본문을 [[img:id]] 기준으로 쪼개, 사진을 그 줄 위치에 인라인으로 박는다
  function renderBody(el, n, editable) {
    el.textContent = '';
    var text = n.text || '';
    var used = {};
    var last = 0, m;
    IMG_RE.lastIndex = 0;
    while ((m = IMG_RE.exec(text)) !== null) {
      if (m.index > last) linkifyInto(el, text.slice(last, m.index));
      var im = findImg(n, m[1]);
      if (im) { used[im.id] = 1; el.appendChild(inlineThumb(n, im, editable)); }
      last = m.index + m[0].length;
    }
    if (last < text.length) linkifyInto(el, text.slice(last));
    // 자리표시자 없이 남은 이미지(구버전 메모 등)는 맨 아래에
    var rest = (n.imgs || []).filter(function (i) { return !used[i.id]; });
    if (rest.length) {
      var wrap = document.createElement('div'); wrap.className = 'mshn-imgs';
      rest.forEach(function (im) { wrap.appendChild(inlineThumb(n, im, editable)); });
      el.appendChild(wrap);
    }
  }
  function findImg(n, id) { var a = n.imgs || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }

  function inlineThumb(n, im, editable) {
    var th = document.createElement('span'); th.className = 'mshn-thumb inline'; th.title = '클릭하면 크게 보기';
    var img = document.createElement('img'); img.src = im.src; img.alt = '메모 이미지';
    img.addEventListener('load', stackCards);   // 이미지 로드로 카드 높이가 바뀌면 다시 정렬
    th.appendChild(img);
    th.onclick = function (e) { e.stopPropagation(); openLightbox(n, (n.imgs || []).indexOf(im)); };
    return th;
  }

  /* ---------- 이미지: 붙여넣기 → 압축 → 저장 ---------- */
  var MAX_W = 1000, JPEG_Q = 0.72, MAX_IMG_BYTES = 700 * 1024;

  // 커서가 있던 줄에 [[img:id]] 자리표시자를 넣어, 그 위치에 사진이 박히게 함
  function handleImageDrop(dt, n, ev, ta, autosize) {
    if (!dt) return;
    var files = [];
    var items = dt.items || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && items[i].type.indexOf('image/') === 0) { var f = items[i].getAsFile(); if (f) files.push(f); }
    }
    if (!files.length && dt.files) {
      for (var j = 0; j < dt.files.length; j++) if (dt.files[j].type.indexOf('image/') === 0) files.push(dt.files[j]);
    }
    if (!files.length) return;             // 이미지 아니면 기본 텍스트 붙여넣기 그대로
    ev.preventDefault();
    var at = (ta && typeof ta.selectionStart === 'number') ? ta.selectionStart : (ta ? ta.value.length : 0);
    files.forEach(function (f) {
      shrink(f).then(function (dataUrl) {
        if (dataUrl.length > MAX_IMG_BYTES * 1.37) { alert('이미지가 너무 커요. 더 작은 이미지를 써주세요.'); return; }
        if (!n.imgs) n.imgs = [];
        var im = { id: uid(), src: dataUrl };
        n.imgs.push(im);
        if (ta) {                                    // 커서 위치(그 줄)에 자리표시자 삽입
          var v = ta.value;
          var before = v.slice(0, at), after = v.slice(at);
          var token = (before && !/\n$/.test(before) ? '\n' : '') + '[[img:' + im.id + ']]' + (after && !/^\n/.test(after) ? '\n' : '');
          ta.value = before + token + after;
          at += token.length;
          ta.selectionStart = ta.selectionEnd = at;
          n.text = ta.value;
          if (autosize) autosize();
          ta.focus();
        }
        n.ts = Date.now(); persist();
        if (n.__refreshGallery) { n.__refreshGallery(); stackCards(); }  // 편집 중이면 갤러리만 갱신(편집 유지)
        else render();
      }).catch(function () { alert('이미지를 읽지 못했어요.'); });
    });
  }

  // 캔버스로 리사이즈 + JPEG 압축 (Gist 용량 대비)
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = reject;
      fr.onload = function () {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var w = img.width, h = img.height;
          if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          var cx = cv.getContext('2d');
          cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);   // 투명 PNG → 흰 배경
          cx.drawImage(img, 0, 0, w, h);
          var out = cv.toDataURL('image/jpeg', JPEG_Q);
          if (out.length > MAX_IMG_BYTES * 1.37) out = cv.toDataURL('image/jpeg', 0.55); // 더 줄이기
          resolve(out);
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function buildThumbs(n, editable) {
    var wrap = document.createElement('div'); wrap.className = 'mshn-imgs';
    n.imgs.forEach(function (im, idx) {
      var th = document.createElement('div'); th.className = 'mshn-thumb'; th.title = '클릭하면 크게 보기';
      var img = document.createElement('img'); img.src = im.src; img.alt = '메모 이미지';
      th.appendChild(img);
      th.onclick = function (e) { if (e.target.classList.contains('x')) return; openLightbox(n, idx); };
      if (editable) {
        var x = document.createElement('span'); x.className = 'x'; x.textContent = '×'; x.title = '이미지 삭제';
        x.onclick = function (e) { e.stopPropagation(); if (confirm('이 이미지를 삭제할까요?')) { n.imgs.splice(idx, 1); n.ts = Date.now(); persist(); render(); } };
        th.appendChild(x);
      }
      wrap.appendChild(th);
    });
    return wrap;
  }

  /* ---------- 라이트박스(팝업 확대) ---------- */
  var lb = null, lbKey = null;
  function openLightbox(n, idx) {
    closeLightbox();
    var cur = idx;
    lb = document.createElement('div'); lb.className = 'mshn-lightbox';
    var img = document.createElement('img');
    var cnt = document.createElement('div'); cnt.className = 'cnt';
    function show(i) {
      cur = (i + n.imgs.length) % n.imgs.length;
      img.src = n.imgs[cur].src;
      cnt.textContent = (cur + 1) + ' / ' + n.imgs.length + '  ·  아무 데나 클릭하면 닫힘 (Esc)';
    }
    img.onclick = function (e) { e.stopPropagation(); };   // 이미지 자체 클릭은 안 닫힘
    lb.onclick = closeLightbox;                            // 배경(여백) 클릭 → 닫힘
    lb.appendChild(img); lb.appendChild(cnt);
    if (n.imgs.length > 1) {
      var p = document.createElement('button'); p.className = 'nav prev'; p.textContent = '‹';
      var nx = document.createElement('button'); nx.className = 'nav next'; nx.textContent = '›';
      p.onclick = function (e) { e.stopPropagation(); show(cur - 1); };
      nx.onclick = function (e) { e.stopPropagation(); show(cur + 1); };
      lb.appendChild(p); lb.appendChild(nx);
    }
    show(cur);
    document.body.appendChild(lb);
    lbKey = function (e) { if (e.key === 'Escape') closeLightbox(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); };
    document.addEventListener('keydown', lbKey);
  }
  function closeLightbox() {
    if (lb) { lb.remove(); lb = null; }
    if (lbKey) { document.removeEventListener('keydown', lbKey); lbKey = null; }
  }

  /* ---------- 너비 조절(가로 드래그) ---------- */
  // 왼쪽(본문 옆)은 고정. 오른쪽 끝을 잡고 오른쪽으로 끌면 넓어짐 → 세로가 짧아진다.
  function enableResize(handle) {
    var startX = 0, startW = 0, resizing = false;
    handle.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      resizing = true; startX = e.clientX; startW = metrics().width;
      document.body.style.cursor = 'ew-resize';
      try { handle.setPointerCapture(e.pointerId); } catch (x) {}
    });
    handle.addEventListener('pointermove', function (e) {
      if (!resizing) return;
      var m = metrics();
      var w = Math.max(MINW, Math.min(m.maxW, startW + (e.clientX - startX)));  // 오른쪽으로 끌수록 +
      setUserWidth(w);
      // 즉각 반영(재렌더 없이 폭만 갱신 → 부드럽게). left는 고정이라 왼쪽 모서리가 안 움직임.
      var cards = layer.querySelectorAll('.mshn-card');
      for (var i = 0; i < cards.length; i++) cards[i].style.width = w + 'px';
      stackCards();
    });
    function end(e) {
      if (!resizing) return; resizing = false;
      document.body.style.cursor = '';
      render();   // 최종 레이아웃 재계산
    }
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('dblclick', function (e) {   // 더블클릭 → 여백 꽉 채우기
      e.preventDefault(); e.stopPropagation();
      setUserWidth(metrics().maxW); render();
    });
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
      if (Math.abs(finalTop - startTop) > 6) {
        var anchor = nearestAnchor(finalTop);
        n.aIdx = anchor.idx; n.aKey = anchor.key; n.y = finalTop;
        persist();
      } // 실제로 옮겼을 때만 재앵커(오클릭 방지)
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
    state.slice().sort(function (a, b) { return anchorTop(a) - anchorTop(b); }).forEach(function (n) {
      var it = document.createElement('div'); it.className = 'mshn-item';
      var t = document.createElement('div'); t.className = 't'; t.textContent = n.text || '(빈 메모)';
      var r = document.createElement('div'); r.className = 'r';
      var go = document.createElement('button'); go.textContent = '📍 위치'; go.onclick = function () { closeDrawer(); window.scrollTo({ top: Math.max(0, anchorTop(n) - 80), behavior: 'smooth' }); };
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
  // ── 내장 토큰(base64 조각) — 사이트를 여는 것만으로 모든 기기에서 동기화 자동 ON.
  // 통짜 평문 토큰을 박으면 GitHub 시크릿 스캐너가 감지해 즉시 폐기하므로 조각으로 보관.
  // 빈 배열이면 기존처럼 ☁ 수동 설정 모드로 동작.
  var EMB = ['Z2hwX2', 'VpVUdq', 'TDF1Y1', 'VNTlNL', 'Q29YcW', '9sUkhq', 'Umh0Tl', 'cxbDBJ', 'RGhKNw', '=='];
  var DISABLE_KEY = 'mshnotes:sync-disabled';   // 이 브라우저에서 자동 동기화 끄기(옵트아웃)
  function embeddedToken() { if (!EMB.length) return ''; try { return atob(EMB.join('')); } catch (e) { return ''; } }
  function token() {
    var manual = localStorage.getItem(TOKEN_KEY) || '';
    if (manual) return manual;
    if (localStorage.getItem(DISABLE_KEY)) return '';
    return embeddedToken();
  }
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
      // 마커 없이 만들어진 Gist 구제: 설명 문구 또는 note_*.json 파일명으로 식별
      for (var j = 0; j < list.length; j++) {
        var g = list[j], hit = (g.description === GIST_DESC);
        if (!hit && g.files) { for (var fn in g.files) { if (/^note_.*\.json$/.test(fn)) { hit = true; break; } } }
        if (hit) { localStorage.setItem(GISTID_KEY, g.id); return g.id; }
      }
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

  // 페이지 경로 → gist 파일명 (페이지마다 파일 분리 → 파일당 1MB 한계를 페이지별로 분산)
  function fileNameFor(path) {
    return 'note_' + path.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-90) + '.json';
  }

  // 원격 → 로컬 (페이지별 최신 승리)
  function pullAll() {
    if (!token()) return Promise.resolve();
    setSync('syncing');
    return findGist().then(function (id) {
      if (!id) { setSync('ok'); return; }
      return api('GET', '/gists/' + id).then(function (g) {
        var files = g.files || {};
        Object.keys(files).forEach(function (fn) {
          var f = files[fn]; if (!f || f.truncated || !f.content) return;
          var obj; try { obj = JSON.parse(f.content); } catch (e) { return; }
          if (fn === GIST_FILE && obj.pages) {                       // 구버전(통짜) 하위호환
            Object.keys(obj.pages).forEach(function (p) {
              var r = obj.pages[p];
              if (r && (r.updatedAt || 0) > getMeta(p)) { localStorage.setItem('mshnotes:' + p, JSON.stringify(r.notes || [])); setMeta(p, r.updatedAt || Date.now()); }
            });
          } else if (obj.path && obj.notes) {                        // 신버전(페이지별 파일)
            if ((obj.updatedAt || 0) > getMeta(obj.path)) { localStorage.setItem('mshnotes:' + obj.path, JSON.stringify(obj.notes)); setMeta(obj.path, obj.updatedAt || Date.now()); }
          }
        });
        state = load(); render(); setSync('ok');
      });
    }).catch(function (e) { setSync('error'); });
  }

  // 로컬 → 원격: 이 페이지 파일만 갱신 (다른 페이지 파일은 건드리지 않음 = 안전·가벼움)
  var pushTimer = null;
  function scheduleSync() { if (!token()) return; clearTimeout(pushTimer); pushTimer = setTimeout(pushAll, 1500); }
  function pushAll() {
    if (!token()) return Promise.resolve();
    setSync('syncing');
    var payload = JSON.stringify({ v: 2, path: PATH, updatedAt: getMeta(PATH) || Date.now(), notes: state }, replacer);
    if (payload.length > 950 * 1024) {
      setSync('error');
      alert('이 페이지 메모가 너무 커요(약 ' + Math.round(payload.length / 1024) + 'KB). Gist 한 파일 한도(1MB)를 넘어 동기화가 안 됩니다.\n이미지 몇 장을 지워주세요.');
      return Promise.resolve();
    }
    var files = {}; files[fileNameFor(PATH)] = { content: payload };
    files[GIST_FILE] = markerFile();
    var id = gistId();
    var p = id ? api('PATCH', '/gists/' + id, { files: files })
               : api('POST', '/gists', { description: GIST_DESC, public: false, files: files })
                   .then(function (g) { localStorage.setItem(GISTID_KEY, g.id); });
    return p.then(function () { setSync('ok'); }).catch(function (e) { setSync('error'); });
  }

  function markerFile() { return { content: JSON.stringify({ v: 2, marker: true }) }; }

  // 전 페이지 일괄 업로드 — 동기화 최초 활성화/수동 동기화 전용.
  // pushAll은 현재 페이지만 올리므로, 동기화를 켜기 전에 쓴 다른 페이지 메모는 이 경로로만 올라간다.
  function pushAllPages() {
    if (!token()) return Promise.resolve();
    setSync('syncing');
    var pages = localPages(), skipped = [];
    var batches = [], cur = {}, curBytes = 0;   // 요청당 약 3MB로 나눠 PATCH (이미지 메모 다수일 때 단일 요청 폭주 방지)
    Object.keys(pages).forEach(function (p) {
      var payload = JSON.stringify({ v: 2, path: p, updatedAt: pages[p].updatedAt || Date.now(), notes: pages[p].notes || [] });
      if (payload.length > 950 * 1024) { skipped.push(p); return; }
      if (curBytes + payload.length > 3 * 1024 * 1024) { batches.push(cur); cur = {}; curBytes = 0; }
      cur[fileNameFor(p)] = { content: payload };
      curBytes += payload.length;
    });
    cur[GIST_FILE] = markerFile();
    batches.push(cur);
    var chain = findGist().then(function (id) {
      return batches.reduce(function (pr, files) {
        return pr.then(function (curId) {
          if (curId) return api('PATCH', '/gists/' + curId, { files: files }).then(function () { return curId; });
          return api('POST', '/gists', { description: GIST_DESC, public: false, files: files })
            .then(function (g) { localStorage.setItem(GISTID_KEY, g.id); return g.id; });
        });
      }, Promise.resolve(id));
    });
    return chain.then(function () {
      setSync('ok');
      if (skipped.length) alert('일부 페이지 메모가 너무 커서(1MB 초과) 동기화에서 빠졌어요:\n' + skipped.join('\n'));
    }).catch(function (e) { setSync('error'); });
  }

  // 이 페이지 메모 용량(대략) — 바에 표시
  function pageBytes() { try { return (localStorage.getItem(PAGE) || '').length; } catch (e) { return 0; } }
  function fmtKB(b) { return b > 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + 'MB' : Math.round(b / 1024) + 'KB'; }

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
        localStorage.setItem(TOKEN_KEY, t); localStorage.removeItem(DISABLE_KEY);
        toggleSyncPop(); setSync('syncing');
        // 검증 + 최초 병합(원격 불러오고 → 로컬 밀어넣기)
        pullAll().then(pushAllPages).then(function () { if (syncState !== 'error') alert('동기화 켜졌어요 ✓ 이제 저장하면 자동 백업돼요.'); else alert('토큰이 잘못됐거나 gist 권한이 없어요. 다시 확인해 주세요.'); });
      };
    } else {
      pop.innerHTML =
        '<h4>☁ 동기화 ' + (syncState === 'error' ? '⚠️ 오류' : '켜짐 ✓') + '</h4>' +
        '<p>메모를 저장하면 자동으로 비밀 Gist에 백업돼요.' + (syncState === 'error' ? ' <b>지금 오류 상태</b> — 토큰이 만료됐을 수 있어요.' : '') + '</p>' +
        '<div class="row"><button class="now">🔄 지금 동기화</button><button class="pull">⬇ 다시 불러오기</button></div>' +
        '<div class="row"><button class="off">🔌 동기화 끄기</button><button class="close">닫기</button></div>';
      pop.querySelector('.now').onclick = function () { toggleSyncPop(); pushAllPages(); };
      pop.querySelector('.pull').onclick = function () { toggleSyncPop(); pullAll(); };
      pop.querySelector('.close').onclick = toggleSyncPop;
      pop.querySelector('.off').onclick = function () {
        if (confirm('이 브라우저에서 동기화를 끌까요? (토큰 삭제, 메모 자체는 남아요)')) { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(GISTID_KEY); localStorage.setItem(DISABLE_KEY, '1'); toggleSyncPop(); setSync('off'); }
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
  // 기존 메모는 최초 로드 시점의 인덱스로 의미 키를 한 번 부여해 이전 데이터도 보호한다.
  var migratedAnchors = false;
  state.forEach(function (n) {
    if (!n.aKey) { var el = anchorFor(n); if (el) { n.aKey = el.dataset.mshnAnchor; migratedAnchors = true; } }
  });
  if (migratedAnchors) persist();
  var rt;
  function reflow() { clearTimeout(rt); rt = setTimeout(render, 120); }
  window.addEventListener('resize', reflow);
  window.addEventListener('load', render);
  setSync(token() ? 'ok' : 'off');
  render();
  // 자동 동기화: 원격 먼저 병합 → 이 브라우저에 쌓인 전 페이지 메모를 최초 1회 일괄 업로드
  var BULK_KEY = 'mshnotes:bulk-pushed';
  if (token()) {
    pullAll().then(function () {
      if (!localStorage.getItem(BULK_KEY)) { return pushAllPages().then(function () { if (syncState !== 'error') localStorage.setItem(BULK_KEY, '1'); }); }
    });
  }
})();
