(function () {
  'use strict';

  var BASE_KEY = 'fp_journal_';

  /* ── Storage key ─────────────────────────────────────────── */
  function getSlug() {
    var path = window.location.pathname.replace(/\/$/, '');
    var parts = path.split('/');
    for (var i = parts.length - 1; i >= 0; i--) {
      if (parts[i]) return parts[i];
    }
    return 'unknown';
  }

  function storageKey() { return BASE_KEY + getSlug(); }

  function storageAvailable() {
    try {
      var k = '__fp_journal_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  var HAS_STORAGE = storageAvailable();

  /* ── CRUD ────────────────────────────────────────────────── */
  function loadEntry() {
    if (!HAS_STORAGE) return null;
    try {
      var raw = localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveEntry(text) {
    if (!HAS_STORAGE) return null;
    try {
      var existing = loadEntry();
      var now = new Date().toISOString();
      var entry = {
        text: text,
        createdAt: (existing && existing.createdAt) ? existing.createdAt : now,
        updatedAt: now
      };
      localStorage.setItem(storageKey(), JSON.stringify(entry));
      return entry;
    } catch (e) { return null; }
  }

  function deleteEntry() {
    if (!HAS_STORAGE) return;
    try { localStorage.removeItem(storageKey()); } catch (e) {}
  }

  /* ── Formatters ──────────────────────────────────────────── */
  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return iso; }
  }

  function wordCount(text) {
    var t = (text || '').trim();
    if (!t) return 0;
    return t.split(/\s+/).length;
  }

  function charCount(text) {
    return (text || '').length;
  }

  function countLabel(text) {
    var w = wordCount(text);
    var c = charCount(text);
    if (!c) return '';
    return w + (w === 1 ? ' word' : ' words') + ' \u00b7 ' + c + ' chars';
  }

  function previewText(text, max) {
    max = max || 90;
    var t = (text || '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) + '\u2026' : t;
  }

  /* ── Title detection ─────────────────────────────────────── */
  function getStudyTitle() {
    var h1 = document.querySelector('header h1');
    if (h1 && h1.innerText && h1.innerText.trim()) return h1.innerText.trim();
    if (document.title && document.title.trim()) return document.title.trim();
    return getSlug().replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  /* ── DOM refs ────────────────────────────────────────────── */
  var drawer, textarea, statusEl, metaEl, titleEl, countEl, fab, inlineBanner;
  var saveTimer = null;
  var isOpen = false;

  /* ── Inline "Continue" banner ───────────────────────────── */
  function buildInlineBanner() {
    inlineBanner = document.createElement('section');
    inlineBanner.id = 'journal-inline-banner';
    inlineBanner.setAttribute('aria-label', 'Study Journal notes');
    inlineBanner.style.display = 'none';
    inlineBanner.innerHTML =
      '<div class="jib-inner">' +
        '<div class="jib-icon" aria-hidden="true">&#128211;</div>' +
        '<div class="jib-content">' +
          '<div class="jib-heading">Continue your study notes</div>' +
          '<div class="jib-preview"></div>' +
          '<div class="jib-meta"></div>' +
        '</div>' +
        '<button class="jib-btn" type="button" aria-label="Open study journal">Open</button>' +
      '</div>';

    var footer = document.querySelector('.master-container > footer');
    if (footer) {
      footer.parentNode.insertBefore(inlineBanner, footer);
    } else {
      document.body.appendChild(inlineBanner);
    }

    inlineBanner.querySelector('.jib-btn').addEventListener('click', openJournal);
  }

  function refreshInlineBanner() {
    if (!inlineBanner) return;
    var entry = loadEntry();
    if (!entry || !(entry.text || '').trim()) {
      inlineBanner.style.display = 'none';
      return;
    }
    inlineBanner.querySelector('.jib-preview').textContent = previewText(entry.text);
    inlineBanner.querySelector('.jib-meta').textContent =
      entry.updatedAt ? 'Last edited: ' + formatDate(entry.updatedAt) : '';
    inlineBanner.style.display = '';
  }

  /* ── Drawer ──────────────────────────────────────────────── */
  function buildUI() {
    buildInlineBanner();
    refreshInlineBanner();

    /* FAB */
    fab = document.createElement('button');
    fab.id = 'journal-fab';
    fab.setAttribute('aria-label', 'Open Study Journal');
    fab.title = 'Study Journal';
    fab.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">' +
        '<path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"/>' +
        '<path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2"/>' +
        '<path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z"/>' +
      '</svg>' +
      '<span class="journal-fab-label">Journal</span>';
    document.body.appendChild(fab);

    /* Backdrop */
    var backdrop = document.createElement('div');
    backdrop.id = 'journal-backdrop';
    document.body.appendChild(backdrop);

    /* Drawer */
    drawer = document.createElement('div');
    drawer.id = 'journal-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Study Journal');

    var noStorageHTML = HAS_STORAGE ? '' :
      '<div id="journal-no-storage">&#9888; Notes cannot be saved &mdash; storage is unavailable in this browser.</div>';

    drawer.innerHTML =
      '<div id="journal-drag-handle"><span></span></div>' +
      '<div id="journal-header">' +
        '<div class="journal-header-left">' +
          '<span id="journal-icon" aria-hidden="true">&#128211;</span>' +
          '<span id="journal-heading">Study Journal</span>' +
        '</div>' +
        '<button id="journal-close" aria-label="Close journal" type="button">&times;</button>' +
      '</div>' +

      '<div id="journal-meta">' +
        '<div id="journal-study-title"></div>' +
        '<div id="journal-dates"></div>' +
      '</div>' +

      noStorageHTML +

      '<div id="journal-body">' +
        '<p id="journal-helper">Use this journal to record personal reflections and study notes for this lesson.</p>' +
        '<textarea id="journal-textarea" placeholder="Write your notes here\u2026"' +
          (HAS_STORAGE ? '' : ' disabled') + '></textarea>' +
        '<div id="journal-wordcount"></div>' +
      '</div>' +

      '<div id="journal-footer">' +
        '<span id="journal-status"></span>' +
        '<div id="journal-actions">' +
          '<button id="journal-copy" class="journal-btn" type="button">Copy</button>' +
          '<button id="journal-delete" class="journal-btn journal-btn-danger" type="button">Delete</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(drawer);

    titleEl  = document.getElementById('journal-study-title');
    metaEl   = document.getElementById('journal-dates');
    textarea = document.getElementById('journal-textarea');
    statusEl = document.getElementById('journal-status');
    countEl  = document.getElementById('journal-wordcount');

    /* Events */
    fab.addEventListener('click', openJournal);
    backdrop.addEventListener('click', closeJournal);
    document.getElementById('journal-close').addEventListener('click', closeJournal);
    textarea.addEventListener('input', onInput);
    document.getElementById('journal-copy').addEventListener('click', copyNotes);
    document.getElementById('journal-delete').addEventListener('click', deleteNotes);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closeJournal();
    });

    setupDrag();
  }

  /* ── Open / close ────────────────────────────────────────── */
  function openJournal() {
    isOpen = true;
    var entry = loadEntry();

    titleEl.textContent = getStudyTitle();

    if (entry) {
      textarea.value = entry.text || '';
      renderMeta(entry);
    } else {
      textarea.value = '';
      metaEl.textContent = '';
    }

    updateCount();
    statusEl.textContent = '';

    /* hide helper text if there is already content */
    var helper = document.getElementById('journal-helper');
    if (helper) helper.style.display = textarea.value.trim() ? 'none' : '';

    drawer.classList.add('open');
    document.getElementById('journal-backdrop').classList.add('visible');
    document.body.classList.add('journal-open');

    setTimeout(function () { textarea.focus(); }, 300);
  }

  function closeJournal() {
    isOpen = false;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      doSave(textarea.value);
    }
    drawer.classList.remove('open');
    document.getElementById('journal-backdrop').classList.remove('visible');
    document.body.classList.remove('journal-open');
    refreshInlineBanner();
  }

  /* ── Meta / counts ───────────────────────────────────────── */
  function renderMeta(entry) {
    if (entry && entry.updatedAt) {
      var label = 'Last edited: ' + formatDate(entry.updatedAt);
      if (entry.createdAt && entry.createdAt !== entry.updatedAt) {
        label += ' \u00b7 Created: ' + formatDate(entry.createdAt);
      }
      metaEl.textContent = label;
    } else {
      metaEl.textContent = '';
    }
  }

  function updateCount() {
    if (!countEl) return;
    var text = textarea ? textarea.value : '';
    var label = countLabel(text);
    countEl.textContent = label;
    countEl.style.display = label ? '' : 'none';
  }

  /* ── Input / save ────────────────────────────────────────── */
  function onInput() {
    updateCount();

    /* hide helper once user starts typing */
    var helper = document.getElementById('journal-helper');
    if (helper) helper.style.display = textarea.value.trim() ? 'none' : '';

    if (saveTimer) clearTimeout(saveTimer);
    statusEl.textContent = 'Saving\u2026';
    saveTimer = setTimeout(function () { doSave(textarea.value); }, 700);
  }

  function doSave(text) {
    saveTimer = null;
    var entry = saveEntry(text);
    if (entry) {
      renderMeta(entry);
      statusEl.textContent = '\u2713 Saved';
      setTimeout(function () {
        if (statusEl.textContent === '\u2713 Saved') statusEl.textContent = '';
      }, 2000);
    } else if (!HAS_STORAGE) {
      statusEl.textContent = 'Storage unavailable';
    }
  }

  /* ── Copy ────────────────────────────────────────────────── */
  function copyNotes() {
    var text = textarea.value.trim();
    if (!text) {
      flash('Nothing to copy.');
      return;
    }
    var title = (titleEl.textContent || getStudyTitle()).trim();
    var full = title ? (title + '\n\n' + text) : text;

    function ok() { flash('\u2713 Copied!'); }
    function fail() { flash('Copy failed.'); }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(full).then(ok, function () { fallbackCopy(full, ok, fail); });
    } else {
      fallbackCopy(full, ok, fail);
    }
  }

  function fallbackCopy(text, ok, fail) {
    try {
      var el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0;pointer-events:none;top:0;left:0';
      document.body.appendChild(el);
      el.select();
      var done = document.execCommand('copy');
      document.body.removeChild(el);
      done ? ok() : fail();
    } catch (e) { fail(); }
  }

  function flash(msg) {
    statusEl.textContent = msg;
    setTimeout(function () { if (statusEl.textContent === msg) statusEl.textContent = ''; }, 2500);
  }

  /* ── Delete ──────────────────────────────────────────────── */
  function deleteNotes() {
    if (!textarea.value.trim()) {
      flash('No notes to delete.');
      return;
    }
    if (!confirm('Delete all notes for this study? This cannot be undone.')) return;
    deleteEntry();
    textarea.value = '';
    metaEl.textContent = '';
    updateCount();
    var helper = document.getElementById('journal-helper');
    if (helper) helper.style.display = '';
    flash('\u2713 Deleted');
    refreshInlineBanner();
  }

  /* ── Touch drag-to-close ─────────────────────────────────── */
  function setupDrag() {
    var handle = document.getElementById('journal-drag-handle');
    var startY = null;

    handle.addEventListener('touchstart', function (e) {
      startY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (startY === null || !isOpen) return;
      var dy = e.touches[0].clientY - startY;
      if (dy > 0) drawer.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      if (startY === null) return;
      var dy = e.changedTouches[0].clientY - startY;
      startY = null;
      drawer.style.transform = '';
      if (dy > 80 && isOpen) closeJournal();
    });
  }

  /* ── Boot ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
})();
