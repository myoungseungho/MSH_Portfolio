/* ============================================================
   MSH study — 여백 메모 (margin notes)
   - 브라우저 localStorage에만 저장 (서버/깃 아님, 기기·브라우저별)
   - 오른쪽 여백을 클릭하면 그 스크롤 위치에 메모를 붙인다
   - 내보내기/가져오기(JSON)로 백업·이전 가능
   페이지 끝에 <script src="../notes.js"></script> 한 줄만 넣으면 동작.
   ============================================================ */
(function () {
  'use strict';
  if (window.__mshNotes) return; window.__mshNotes = true;
  if (window.top !== window.self) return;               // iframe 안에선 실행 안 함
  var container = document.querySelector('.container');
  if (!container) return;                                // 학습 문서 레이아웃이 아니면 skip

  var PAGE = 'mshnotes:' + decodeURIComponent(location.pathname);
  var HINT = 'mshnotes:hint-seen';
  var GAP = 18, CARDW = 270, MINSPACE = 200;

  function load() { try { return JSON.parse(localStorage.getItem(PAGE) || '[]'); } catch (e) { return []; } }
  function persist() {
    try { localStorage.setItem(PAGE, JSON.stringify(state)); }
    catch (e) { alert('메모 저장 실패 — localStorage가 꽉 찼거나 차단됐어요.'); }
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
    + '.mshn-card textarea{width:100%;box-sizing:border-box;min-height:66px;font-family:inherit;font-size:.85rem;line-height:1.55;border:1px solid #e6d98f;border-radius:6px;padding:6px 8px;resize:vertical;background:#fff;color:#3a3000;outline:none;}'
    + '.mshn-card textarea:focus{border-color:#f6c945;box-shadow:0 0 0 2px rgba(246,201,69,.25);}'
    + '.mshn-card .mshn-meta{font-size:.66rem;color:#b3a25a;margin-top:5px;}'
    + '.mshn-card .mshn-tools{display:flex;gap:6px;justify-content:flex-end;margin-top:7px;}'
    + '.mshn-card button{font-family:inherit;font-size:.72rem;border:1px solid #e0d38a;background:#fff;color:#7a5c00;border-radius:6px;padding:3px 9px;cursor:pointer;}'
    + '.mshn-card button:hover{background:#fff7d6;}'
    + '.mshn-card .mshn-del:hover{background:#ffe5e5;border-color:#f3b0b0;color:#b71c1c;}'
    + '.mshn-bar{position:fixed;right:16px;bottom:16px;z-index:90;display:flex;gap:4px;align-items:center;background:#fff;border:1px solid #e0e0e0;border-radius:999px;padding:5px 8px 5px 12px;box-shadow:0 3px 14px rgba(0,0,0,.13);font-family:inherit;font-size:.8rem;color:#555;}'
    + '.mshn-bar .mshn-count{font-weight:700;color:#6a1b9a;font-variant-numeric:tabular-nums;margin-right:2px;cursor:pointer;}'
    + '.mshn-bar button{border:0;background:transparent;cursor:pointer;font-size:1rem;line-height:1;padding:5px;border-radius:8px;}'
    + '.mshn-bar button:hover{background:#f0f0f0;}'
    + '.mshn-hint{position:fixed;right:16px;bottom:64px;z-index:91;max-width:280px;background:#fffbe6;border:1px solid #f3e2a0;border-radius:10px;padding:12px 14px;box-shadow:0 4px 16px rgba(0,0,0,.12);font-size:.8rem;line-height:1.6;color:#6b5300;}'
    + '.mshn-hint b{color:#4e3600;}'
    + '.mshn-hint button{margin-top:8px;border:1px solid #e0d38a;background:#fff;color:#7a5c00;border-radius:6px;padding:4px 10px;font-size:.75rem;cursor:pointer;}'
    + '.mshn-drawer{position:fixed;top:0;right:0;bottom:0;width:min(92vw,380px);z-index:95;background:#fff;box-shadow:-4px 0 22px rgba(0,0,0,.2);transform:translateX(102%);transition:transform .22s;display:flex;flex-direction:column;font-family:inherit;}'
    + '.mshn-drawer.open{transform:none;}'
    + '.mshn-drawer header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;font-weight:700;color:#333;}'
    + '.mshn-drawer header button{border:0;background:transparent;font-size:1.2rem;cursor:pointer;color:#888;}'
    + '.mshn-drawer .mshn-list{overflow:auto;padding:10px 14px;flex:1;}'
    + '.mshn-drawer .mshn-item{border:1px solid #eee;border-left:4px solid #f6c945;border-radius:8px;padding:10px;margin-bottom:10px;background:#fffdf2;}'
    + '.mshn-drawer .mshn-item .t{font-size:.85rem;white-space:pre-wrap;word-break:break-word;color:#4a3d00;}'
    + '.mshn-drawer .mshn-item .r{display:flex;gap:6px;justify-content:flex-end;margin-top:8px;}'
    + '.mshn-drawer .mshn-item button{font-size:.72rem;border:1px solid #e0d38a;background:#fff;color:#7a5c00;border-radius:6px;padding:3px 9px;cursor:pointer;}'
    + '@media print{.mshn-bar,.mshn-strip,.mshn-hint,.mshn-drawer{display:none!important;}}';
  var styleEl = document.createElement('style'); styleEl.textContent = css; document.head.appendChild(styleEl);

  /* ---------- anchor helpers (스크롤 위치 = 문서 블록에 앵커) ---------- */
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
  var countEl = document.createElement('span'); countEl.className = 'mshn-count';
  var addBtn = mkBtn('＋', '이 화면 위치에 메모 추가', function () { addNote(window.scrollY + window.innerHeight * 0.4); });
  var expBtn = mkBtn('⬇', '모든 메모 내보내기(JSON 백업)', exportAll);
  var impBtn = mkBtn('⬆', '메모 가져오기(JSON)', importAll);
  countEl.title = '메모 목록';
  countEl.addEventListener('click', function () { if (!wide()) openDrawer(); });
  bar.appendChild(countEl); bar.appendChild(addBtn); bar.appendChild(expBtn); bar.appendChild(impBtn);

  function mkBtn(label, title, fn) { var b = document.createElement('button'); b.textContent = label; b.title = title; b.addEventListener('click', fn); return b; }

  /* ---------- actions ---------- */
  function addNote(docY) {
    var n = { id: uid(), aIdx: nearestIdx(docY), y: docY, text: '', ts: Date.now(), editing: true };
    state.push(n); pendingFocus = n.id; persist(); render();
    if (!wide()) openDrawer();
  }
  function remove(id) { state = state.filter(function (n) { return n.id !== id; }); persist(); render(); if (drawerOpen) renderDrawer(); }

  /* ---------- render (wide: 여백 카드) ---------- */
  function render() {
    layer.innerHTML = '';
    var m = metrics(), isWide = wide();
    var docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    if (isWide) {
      strip.style.display = 'block';
      strip.style.left = m.left + 'px';
      strip.style.width = Math.max(0, m.avail - GAP) + 'px';
      strip.style.height = docH + 'px';
      var sorted = state.slice().sort(function (a, b) { return anchorTop(a.aIdx) - anchorTop(b.aIdx); });
      var lastBottom = -1e9;
      sorted.forEach(function (n) {
        var card = buildCard(n); layer.appendChild(card);
        card.style.left = m.left + 'px'; card.style.width = m.width + 'px';
        var top = anchorTop(n.aIdx);
        if (top < lastBottom + 10) top = lastBottom + 10;
        card.style.top = top + 'px';
        lastBottom = top + card.offsetHeight;
      });
    } else {
      strip.style.display = 'none';
    }
    countEl.textContent = '📝 ' + state.length;
    if (pendingFocus) { var ta = layer.querySelector('.mshn-card[data-id="' + pendingFocus + '"] textarea'); if (ta) { ta.focus(); } pendingFocus = null; }
  }

  function buildCard(n) {
    var card = document.createElement('div'); card.className = 'mshn-card'; card.setAttribute('data-id', n.id);
    if (n.editing) {
      var ta = document.createElement('textarea');
      ta.value = n.text; ta.placeholder = '여기에 메모… (예: 이 부분 왜 이렇게 되는지 헷갈림)';
      var tools = document.createElement('div'); tools.className = 'mshn-tools';
      var ok = document.createElement('button'); ok.textContent = n.text ? '저장' : '추가';
      var cancel = document.createElement('button'); cancel.textContent = '취소';
      ok.onclick = function () { var v = ta.value.trim(); if (!v) { remove(n.id); return; } n.text = v; n.editing = false; n.ts = Date.now(); persist(); render(); };
      cancel.onclick = function () { if (!n.text) remove(n.id); else { n.editing = false; render(); } };
      ta.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') ok.click(); if (e.key === 'Escape') cancel.click(); });
      tools.appendChild(cancel); tools.appendChild(ok);
      card.appendChild(ta); card.appendChild(tools);
    } else {
      var txt = document.createElement('div'); txt.className = 'mshn-txt'; txt.textContent = n.text; txt.title = '클릭하면 편집';
      txt.onclick = function () { n.editing = true; pendingFocus = n.id; render(); };
      var meta = document.createElement('div'); meta.className = 'mshn-meta'; meta.textContent = fmt(n.ts);
      var tools = document.createElement('div'); tools.className = 'mshn-tools';
      var ed = document.createElement('button'); ed.textContent = '✏️ 편집'; ed.onclick = txt.onclick;
      var del = document.createElement('button'); del.className = 'mshn-del'; del.textContent = '🗑 삭제'; del.onclick = function () { if (confirm('이 메모를 삭제할까요?')) remove(n.id); };
      tools.appendChild(ed); tools.appendChild(del);
      card.appendChild(txt); card.appendChild(meta); card.appendChild(tools);
    }
    return card;
  }

  /* ---------- narrow: 서랍(drawer) ---------- */
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

  /* ---------- export / import (백업) ---------- */
  function exportAll() {
    var all = {};
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf('mshnotes:') === 0 && k !== HINT) all[k] = localStorage.getItem(k); }
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
          Object.keys(obj).forEach(function (k) { if (k.indexOf('mshnotes:') === 0) { localStorage.setItem(k, obj[k]); cnt++; } });
          state = load(); render();
          alert(cnt + '개 페이지의 메모를 가져왔어요.');
        } catch (e) { alert('가져오기 실패 — 올바른 백업 파일이 아니에요.'); }
      };
      fr.readAsText(f);
    };
    inp.click();
  }

  /* ---------- first-run hint ---------- */
  if (!localStorage.getItem(HINT)) {
    var hint = document.createElement('div'); hint.className = 'mshn-hint';
    hint.innerHTML = '<b>📝 여백 메모</b><br>오른쪽 <b>빈 여백을 클릭</b>하면 그 위치에 메모를 남길 수 있어요. 좁은 화면에선 오른쪽 아래 <b>＋</b> 버튼을 쓰세요.<br><span style="color:#a08800;">이 브라우저에만 저장돼요(⬇로 백업).</span><br><button>알겠어요</button>';
    hint.querySelector('button').onclick = function () { localStorage.setItem(HINT, '1'); hint.remove(); };
    document.body.appendChild(hint);
  }

  /* ---------- lifecycle ---------- */
  var rt;
  function reflow() { clearTimeout(rt); rt = setTimeout(render, 120); }
  window.addEventListener('resize', reflow);
  window.addEventListener('load', render);
  render();
})();
