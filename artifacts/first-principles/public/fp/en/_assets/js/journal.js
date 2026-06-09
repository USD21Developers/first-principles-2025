(function () {
  'use strict';

  var BASE_KEY = 'fp_journal_';

  function getSlug() {
    var path = window.location.pathname.replace(/\/$/, '');
    var parts = path.split('/');
    for (var i = parts.length - 1; i >= 0; i--) {
      if (parts[i]) return parts[i];
    }
    return 'unknown';
  }

  function storageKey() {
    return BASE_KEY + getSlug();
  }

  function storageAvailable() {
    try {
      var k = '__fp_journal_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  var HAS_STORAGE = storageAvailable();

  function loadEntry() {
    if (!HAS_STORAGE) return null;
    try {
      var raw = localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
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
    } catch (e) {
      return null;
    }
  }

  function deleteEntry() {
    if (!HAS_STORAGE) return;
    try { localStorage.removeItem(storageKey()); } catch (e) {}
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return iso;
    }
  }

  function getStudyTitle() {
    var h1 = document.querySelector('header h1');
    if (h1 && h1.innerText && h1.innerText.trim()) return h1.innerText.trim();
    if (document.title && document.title.trim()) return document.title.trim();
    return getSlug().replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  var drawer, textarea, statusEl, metaEl, titleEl, fab;
  var saveTimer = null;
  var isOpen = false;

  function buildUI() {
    fab = document.createElement('button');
    fab.id = 'journal-fab';
    fab.setAttribute('aria-label', 'Open Study Journal');
    fab.title = 'Study Journal';
    fab.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">' +
        '<path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"/>' +
        '<path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2"/>' +
        '<path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z"/>' +
      '</svg>';
    document.body.appendChild(fab);

    var backdrop = document.createElement('div');
    backdrop.id = 'journal-backdrop';
    document.body.appendChild(backdrop);

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
        '<textarea id="journal-textarea" placeholder="Write your notes here\u2026"' +
          (HAS_STORAGE ? '' : ' disabled') + '></textarea>' +
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

  function openJournal() {
    isOpen = true;
    var entry = loadEntry();

    titleEl.textContent = getStudyTitle();

    if (entry) {
      textarea.value = entry.text || '';
      renderMeta(entry);
    } else {
      textarea.value = '';
      metaEl.textContent = 'No notes yet.';
    }
    statusEl.textContent = '';

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
  }

  function renderMeta(entry) {
    var parts = [];
    if (entry.createdAt) parts.push('Created: ' + formatDate(entry.createdAt));
    if (entry.updatedAt && entry.updatedAt !== entry.createdAt) {
      parts.push('Updated: ' + formatDate(entry.updatedAt));
    }
    metaEl.textContent = parts.join(' \u00b7 ') || '';
  }

  function onInput() {
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

  function copyNotes() {
    var text = textarea.value.trim();
    if (!text) {
      statusEl.textContent = 'Nothing to copy.';
      setTimeout(function () { statusEl.textContent = ''; }, 2000);
      return;
    }
    var title = (titleEl.textContent || getStudyTitle()).trim();
    var full = title ? (title + '\n\n' + text) : text;

    function onSuccess() {
      statusEl.textContent = '\u2713 Copied!';
      setTimeout(function () { statusEl.textContent = ''; }, 2000);
    }
    function onFail() {
      statusEl.textContent = 'Copy failed.';
      setTimeout(function () { statusEl.textContent = ''; }, 2000);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(full).then(onSuccess, function () { fallbackCopy(full, onSuccess, onFail); });
    } else {
      fallbackCopy(full, onSuccess, onFail);
    }
  }

  function fallbackCopy(text, onSuccess, onFail) {
    try {
      var el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0;pointer-events:none;top:0;left:0';
      document.body.appendChild(el);
      el.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(el);
      ok ? onSuccess() : onFail();
    } catch (e) {
      onFail();
    }
  }

  function deleteNotes() {
    if (!textarea.value.trim()) {
      statusEl.textContent = 'No notes to delete.';
      setTimeout(function () { statusEl.textContent = ''; }, 2000);
      return;
    }
    if (!confirm('Delete all notes for this study? This cannot be undone.')) return;
    deleteEntry();
    textarea.value = '';
    metaEl.textContent = 'No notes yet.';
    statusEl.textContent = '\u2713 Deleted';
    setTimeout(function () { statusEl.textContent = ''; }, 2000);
  }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
})();
