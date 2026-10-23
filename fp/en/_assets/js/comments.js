(function () {
  'use strict';

  var COMMENT_KEY   = 'fp_comments_';
  var JOURNAL_KEY   = 'fp_journal_';
  var LONG_PRESS_MS = 600;

  /* ── Slug / storage ──────────────────────────────────────── */
  function getSlug() {
    var path = window.location.pathname.replace(/\/$/, '');
    var parts = path.split('/');
    for (var i = parts.length - 1; i >= 0; i--) {
      if (parts[i]) return parts[i];
    }
    return 'unknown';
  }

  function storageAvailable() {
    try {
      localStorage.setItem('__fpct__', '1');
      localStorage.removeItem('__fpct__');
      return true;
    } catch (e) { return false; }
  }

  var HAS_STORAGE = storageAvailable();
  var slug = getSlug();

  /* ── Comment CRUD ────────────────────────────────────────── */
  /* Stored as { [cid]: { text, elementText, createdAt, updatedAt } } */
  function loadComments() {
    if (!HAS_STORAGE) return {};
    try {
      var raw = localStorage.getItem(COMMENT_KEY + slug);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function _writeComments(obj) {
    try { localStorage.setItem(COMMENT_KEY + slug, JSON.stringify(obj)); } catch (e) {}
  }

  function upsertComment(cid, text, elementText) {
    var all = loadComments();
    var now = new Date().toISOString();
    if (all[cid]) {
      all[cid].text = text;
      all[cid].updatedAt = now;
    } else {
      all[cid] = { text: text, elementText: elementText, createdAt: now, updatedAt: now };
    }
    _writeComments(all);
    return all[cid];
  }

  function deleteComment(cid) {
    var all = loadComments();
    delete all[cid];
    _writeComments(all);
  }

  /* ── Journal integration ─────────────────────────────────── */
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function insertIntoJournal(commentText, elementText) {
    if (!HAS_STORAGE) return false;
    try {
      var key = JOURNAL_KEY + slug;
      var raw = localStorage.getItem(key);
      var entries = [];
      if (raw) {
        var parsed = JSON.parse(raw);
        entries = Array.isArray(parsed) ? parsed : [];
      }
      var now = new Date().toISOString();
      var text = elementText
        ? 'From study:\n\u201c' + elementText + '\u201d\n\n' + commentText
        : commentText;
      entries.unshift({ id: genId(), text: text, createdAt: now, updatedAt: now });
      localStorage.setItem(key, JSON.stringify(entries));
      return true;
    } catch (e) { return false; }
  }

  /* ── Formatters ──────────────────────────────────────────── */
  function truncate(text, max) {
    var t = (text || '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) + '\u2026' : t;
  }

  function countLabel(text) {
    var t = (text || '').trim();
    if (!t) return '';
    var w = t.split(/\s+/).length;
    var c = text.length;
    return w + (w === 1 ? ' word' : ' words') + ' \u00b7 ' + c + ' chars';
  }

  /* ── Element identification ──────────────────────────────── */
  function isExcluded(el) {
    var node = el.parentElement;
    while (node && node !== document.body) {
      var tag = (node.tagName || '').toLowerCase();
      if (tag === 'header' || tag === 'footer' || tag === 'nav') return true;
      var id = node.id || '';
      if (id.indexOf('journal-') === 0 || id === 'journal-inline-banner') return true;
      if (id.indexOf('fp-comment') === 0) return true;
      var cls = node.className || '';
      if (cls.indexOf('fp-comment') !== -1) return true;
      node = node.parentElement;
    }
    return false;
  }

  function initCommentableElements() {
    var all = document.querySelectorAll('p, li');
    var idx = 0;
    for (var i = 0; i < all.length; i++) {
      if (!isExcluded(all[i])) {
        all[i].setAttribute('data-cid', 'c' + idx);
        idx++;
      }
    }
  }

  /* ── Highlights ──────────────────────────────────────────── */
  function applyHighlights() {
    var comments = loadComments();
    var all = document.querySelectorAll('[data-cid]');
    for (var i = 0; i < all.length; i++) {
      var cid = all[i].getAttribute('data-cid');
      if (comments[cid]) {
        all[i].classList.add('fp-has-comment');
      } else {
        all[i].classList.remove('fp-has-comment');
      }
    }
    refreshLegend(comments);
  }

  /* ── Legend pill ─────────────────────────────────────────── */
  var legendEl = null;

  function buildLegend() {
    legendEl = document.createElement('div');
    legendEl.id = 'fp-comment-legend';
    legendEl.innerHTML =
      '<span class="fp-legend-dot" aria-hidden="true"></span>' +
      'Highlighted items have comments';
    legendEl.style.display = 'none';
    document.body.appendChild(legendEl);
  }

  function refreshLegend(comments) {
    if (!legendEl) return;
    legendEl.style.display = Object.keys(comments).length ? '' : 'none';
  }

  /* ── Editor state ────────────────────────────────────────── */
  var editorEl      = null;
  var editorTA      = null;
  var editorStatus  = null;
  var currentCid    = null;
  var currentElText = null;
  var saveTimer     = null;
  var isOpen        = false;

  /* ── Build editor ────────────────────────────────────────── */
  function buildEditor() {
    var backdrop = document.createElement('div');
    backdrop.id = 'fp-comment-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', closeEditor);

    editorEl = document.createElement('div');
    editorEl.id = 'fp-comment-drawer';
    editorEl.setAttribute('role', 'dialog');
    editorEl.setAttribute('aria-modal', 'true');
    editorEl.setAttribute('aria-label', 'Study Comment');

    editorEl.innerHTML =
      '<div id="fp-comment-handle"><span></span></div>' +
      '<div id="fp-comment-header">' +
        '<div class="fp-comment-header-left">' +
          '<span class="fp-comment-hicon" aria-hidden="true">&#128172;</span>' +
          '<span id="fp-comment-heading">Study Comment</span>' +
        '</div>' +
        '<button id="fp-comment-close" type="button" aria-label="Close comment editor">&times;</button>' +
      '</div>' +
      '<div id="fp-comment-context"></div>' +
      '<div id="fp-comment-body">' +
        '<textarea id="fp-comment-ta" placeholder="Add your comment\u2026"' +
          (HAS_STORAGE ? '' : ' disabled') + '></textarea>' +
        '<div id="fp-comment-wc"></div>' +
      '</div>' +
      '<div id="fp-comment-footer">' +
        '<div id="fp-comment-fleft">' +
          '<span id="fp-comment-status"></span>' +
          '<button id="fp-comment-delete" class="fp-btn fp-btn-danger" type="button">Delete</button>' +
        '</div>' +
        '<div id="fp-comment-fright">' +
          '<button id="fp-comment-copy"   class="fp-btn" type="button">Copy</button>' +
          '<button id="fp-comment-insert" class="fp-btn" type="button">To Journal</button>' +
          '<button id="fp-comment-done"   class="fp-btn fp-btn-primary" type="button">Done</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(editorEl);

    editorTA     = document.getElementById('fp-comment-ta');
    editorStatus = document.getElementById('fp-comment-status');

    document.getElementById('fp-comment-close').addEventListener('click', closeEditor);
    document.getElementById('fp-comment-done').addEventListener('click', closeEditor);
    document.getElementById('fp-comment-delete').addEventListener('click', onDelete);
    document.getElementById('fp-comment-copy').addEventListener('click', onCopy);
    document.getElementById('fp-comment-insert').addEventListener('click', onInsert);
    editorTA.addEventListener('input', onEditorInput);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closeEditor();
    });

    setupDrag();
  }

  /* ── Open / close ────────────────────────────────────────── */
  function openEditor(el) {
    currentCid    = el.getAttribute('data-cid');
    currentElText = truncate((el.innerText || el.textContent || '').trim(), 200);
    isOpen        = true;

    var existing = loadComments()[currentCid];

    document.getElementById('fp-comment-context').textContent =
      truncate(currentElText, 120);

    editorTA.value = existing ? (existing.text || '') : '';
    editorStatus.textContent = '';
    updateWC();

    var delBtn = document.getElementById('fp-comment-delete');
    delBtn.style.display = existing ? '' : 'none';

    editorEl.classList.add('open');
    document.getElementById('fp-comment-backdrop').classList.add('visible');
    document.body.classList.add('fp-comment-open');

    setTimeout(function () { editorTA.focus(); }, 300);
  }

  function closeEditor() {
    isOpen = false;
    flushSave();
    editorEl.classList.remove('open');
    document.getElementById('fp-comment-backdrop').classList.remove('visible');
    document.body.classList.remove('fp-comment-open');
    applyHighlights();
  }

  function flushSave() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    var text = editorTA.value.trim();
    if (text && currentCid) {
      upsertComment(currentCid, text, currentElText);
    }
  }

  /* ── Editor input / auto-save ────────────────────────────── */
  function onEditorInput() {
    updateWC();
    if (saveTimer) clearTimeout(saveTimer);
    editorStatus.textContent = 'Saving\u2026';
    saveTimer = setTimeout(function () {
      var text = editorTA.value.trim();
      if (!text) { editorStatus.textContent = ''; return; }
      upsertComment(currentCid, text, currentElText);
      document.getElementById('fp-comment-delete').style.display = '';
      editorStatus.textContent = '\u2713 Saved';
      setTimeout(function () {
        if (editorStatus.textContent === '\u2713 Saved') editorStatus.textContent = '';
      }, 2000);
    }, 700);
  }

  function updateWC() {
    var wc = document.getElementById('fp-comment-wc');
    if (!wc) return;
    var label = countLabel(editorTA.value);
    wc.textContent = label;
    wc.style.display = label ? '' : 'none';
  }

  /* ── Actions ─────────────────────────────────────────────── */
  function onDelete() {
    if (!editorTA.value.trim()) { flash('No comment to delete.'); return; }
    if (!confirm('Delete this comment? This cannot be undone.')) return;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    deleteComment(currentCid);
    closeEditor();
  }

  function onCopy() {
    var text = editorTA.value.trim();
    if (!text) { flash('Nothing to copy.'); return; }
    var full = currentElText
      ? (truncate(currentElText, 80) + '\n\n' + text)
      : text;
    function ok()   { flash('\u2713 Copied!'); }
    function fail() { flash('Copy failed.'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(full).then(ok, function () { fallbackCopy(full, ok, fail); });
    } else {
      fallbackCopy(full, ok, fail);
    }
  }

  function fallbackCopy(text, ok, fail) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      var done = document.execCommand('copy');
      document.body.removeChild(ta);
      done ? ok() : fail();
    } catch (e) { fail(); }
  }

  function onInsert() {
    var text = editorTA.value.trim();
    if (!text) { flash('No comment to insert.'); return; }
    flushSave();
    if (insertIntoJournal(text, truncate(currentElText, 120))) {
      flash('\u2713 Added to Journal');
    } else {
      flash('Could not add to Journal.');
    }
  }

  function flash(msg) {
    editorStatus.textContent = msg;
    setTimeout(function () {
      if (editorStatus.textContent === msg) editorStatus.textContent = '';
    }, 2500);
  }

  /* ── Touch drag-to-close ─────────────────────────────────── */
  function setupDrag() {
    var handle = document.getElementById('fp-comment-handle');
    var startY = null;
    handle.addEventListener('touchstart', function (e) {
      startY = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (startY === null || !isOpen) return;
      var dy = e.touches[0].clientY - startY;
      if (dy > 0) editorEl.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (startY === null) return;
      var dy = e.changedTouches[0].clientY - startY;
      startY = null;
      editorEl.style.transform = '';
      if (dy > 80 && isOpen) closeEditor();
    });
  }

  /* ── Interaction (long-press + dblclick + tap-highlighted) ── */
  function attachInteraction(el) {
    var lpTimer  = null;
    var lpStartX = 0;
    var lpStartY = 0;
    var lpFired  = false;

    /* Mobile: long-press */
    el.addEventListener('touchstart', function (e) {
      if (e.target.closest ? e.target.closest('a') : false) return;
      lpFired  = false;
      lpStartX = e.touches[0].clientX;
      lpStartY = e.touches[0].clientY;
      lpTimer  = setTimeout(function () {
        lpTimer = null;
        lpFired = true;
        openEditor(el);
      }, LONG_PRESS_MS);
    }, { passive: true });

    el.addEventListener('touchmove', function (e) {
      if (!lpTimer) return;
      var dx = Math.abs(e.touches[0].clientX - lpStartX);
      var dy = Math.abs(e.touches[0].clientY - lpStartY);
      if (dx > 8 || dy > 8) { clearTimeout(lpTimer); lpTimer = null; }
    }, { passive: true });

    el.addEventListener('touchend', function () {
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
    });

    el.addEventListener('touchcancel', function () {
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
    });

    /* Mobile: tap a highlighted item (single touch, no long-press) */
    el.addEventListener('click', function (e) {
      if (lpFired) { lpFired = false; return; }
      if (!el.classList.contains('fp-has-comment')) return;
      if (e.target.closest ? e.target.closest('a') : e.target.tagName === 'A') return;
      e.preventDefault();
      openEditor(el);
    });

    /* Desktop: double-click anywhere on a commentable element */
    el.addEventListener('dblclick', function (e) {
      if (e.target.closest ? e.target.closest('a') : e.target.tagName === 'A') return;
      e.preventDefault();
      openEditor(el);
    });
  }

  function setupInteractions() {
    var all = document.querySelectorAll('[data-cid]');
    for (var i = 0; i < all.length; i++) {
      attachInteraction(all[i]);
    }
  }

  /* ── Boot ────────────────────────────────────────────────── */
  function init() {
    initCommentableElements();
    applyHighlights();
    buildLegend();
    refreshLegend(loadComments());
    buildEditor();
    setupInteractions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
