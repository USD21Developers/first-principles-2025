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

  /* ── ID generator ─────────────────────────────────────────── */
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── Multi-entry CRUD ────────────────────────────────────── */
  function loadEntries() {
    if (!HAS_STORAGE) return [];
    try {
      var raw = localStorage.getItem(storageKey());
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        if (parsed && (parsed.text || '').trim()) {
          var migrated = [{
            id: genId(),
            text: parsed.text,
            createdAt: parsed.createdAt || new Date().toISOString(),
            updatedAt: parsed.updatedAt || new Date().toISOString()
          }];
          _writeEntries(migrated);
          return migrated;
        }
        return [];
      }
      return parsed;
    } catch (e) { return []; }
  }

  function _writeEntries(entries) {
    try { localStorage.setItem(storageKey(), JSON.stringify(entries)); } catch (e) {}
  }

  function upsertEntry(id, text) {
    if (!HAS_STORAGE) return null;
    var entries = loadEntries();
    var now = new Date().toISOString();
    var idx = -1;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === id) { idx = i; break; }
    }
    var entry;
    if (idx === -1) {
      entry = { id: id, text: text, createdAt: now, updatedAt: now };
      entries.unshift(entry);
    } else {
      entries[idx].text = text;
      entries[idx].updatedAt = now;
      entry = entries.splice(idx, 1)[0];
      entries.unshift(entry);
    }
    _writeEntries(entries);
    return entry;
  }

  function deleteEntryById(id) {
    if (!HAS_STORAGE) return;
    var entries = loadEntries().filter(function (e) { return e.id !== id; });
    _writeEntries(entries);
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
    return t ? t.split(/\s+/).length : 0;
  }

  function charCount(text) { return (text || '').length; }

  function countLabel(text) {
    var w = wordCount(text), c = charCount(text);
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

  /* ── State ───────────────────────────────────────────────── */
  var drawer, tabBtn, badge, inlineBanner;
  var textarea, statusEl, metaEl, titleEl, countEl;
  var listPanel, editPanel, entriesListEl;
  var isOpen = false;
  var currentMode = 'list';
  var currentEntryId = null;
  var saveTimer = null;
  var deleteConfirmTimer = null;

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
          '<div class="jib-heading"></div>' +
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
    var entries = loadEntries().filter(function (e) { return (e.text || '').trim(); });
    if (!entries.length) { inlineBanner.style.display = 'none'; return; }

    var count = entries.length;
    var newest = entries[0];
    inlineBanner.querySelector('.jib-heading').textContent =
      count === 1 ? 'Continue your study notes' : count + ' saved journal entries';
    inlineBanner.querySelector('.jib-preview').textContent = previewText(newest.text);
    inlineBanner.querySelector('.jib-meta').textContent =
      newest.updatedAt ? 'Last edited: ' + formatDate(newest.updatedAt) : '';
    inlineBanner.style.display = '';
  }

  function refreshBadge() {
    if (!badge) return;
    var count = loadEntries().filter(function (e) { return (e.text || '').trim(); }).length;
    if (count > 0) {
      badge.textContent = count;
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  }

  /* ── Build UI ────────────────────────────────────────────── */
  function buildUI() {
    buildInlineBanner();
    refreshInlineBanner();

    /* Tab button — injected into <header> */
    tabBtn = document.createElement('button');
    tabBtn.id = 'journal-tab-btn';
    tabBtn.setAttribute('aria-label', 'Open Study Journal');
    tabBtn.title = 'Study Journal';
    tabBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">' +
        '<path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"/>' +
        '<path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2"/>' +
        '<path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z"/>' +
      '</svg>' +
      '<span>Journal</span>' +
      '<span id="journal-tab-badge"></span>';

    var header = document.querySelector('header');
    if (header) {
      header.appendChild(tabBtn);
    } else {
      document.body.appendChild(tabBtn);
    }
    badge = document.getElementById('journal-tab-badge');
    refreshBadge();

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
      /* Swipe-right grip on left edge */
      '<div id="journal-drag-handle"><span></span></div>' +

      '<div id="journal-header">' +
        '<div class="journal-header-left">' +
          '<button id="journal-back" type="button" aria-label="Back to entries" style="display:none">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/></svg>' +
          '</button>' +
          '<span id="journal-icon" aria-hidden="true">&#128211;</span>' +
          '<span id="journal-heading">Study Journal</span>' +
        '</div>' +
        '<button id="journal-close" aria-label="Close journal" type="button">&times;</button>' +
      '</div>' +

      /* List panel */
      '<div id="journal-list-panel">' +
        '<div id="journal-list-title"></div>' +
        '<ul id="journal-entries-list" role="list"></ul>' +
        '<div id="journal-list-footer">' +
          '<button id="journal-new-entry" type="button">+ New entry</button>' +
        '</div>' +
      '</div>' +

      /* Edit panel */
      '<div id="journal-edit-panel" style="display:none;flex-direction:column;flex:1;min-height:0;overflow:hidden;">' +
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
          '<div id="journal-footer-left">' +
            '<span id="journal-status"></span>' +
            '<button id="journal-delete" class="journal-btn journal-btn-danger" type="button">Delete</button>' +
          '</div>' +
          '<div id="journal-actions">' +
            '<button id="journal-copy"         class="journal-btn" type="button">Copy</button>' +
            '<button id="journal-save"         class="journal-btn journal-btn-primary" type="button">Save</button>' +
            '<button id="journal-close-entry"  class="journal-btn" type="button">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(drawer);

    listPanel     = document.getElementById('journal-list-panel');
    editPanel     = document.getElementById('journal-edit-panel');
    entriesListEl = document.getElementById('journal-entries-list');
    titleEl       = document.getElementById('journal-study-title');
    metaEl        = document.getElementById('journal-dates');
    textarea      = document.getElementById('journal-textarea');
    statusEl      = document.getElementById('journal-status');
    countEl       = document.getElementById('journal-wordcount');

    /* Events */
    tabBtn.addEventListener('click', openJournal);
    backdrop.addEventListener('click', closeJournal);
    document.getElementById('journal-close').addEventListener('click', closeJournal);
    document.getElementById('journal-back').addEventListener('click', showListMode);
    document.getElementById('journal-new-entry').addEventListener('click', function () { openEditMode(null); });
    textarea.addEventListener('input', onInput);
    document.getElementById('journal-copy').addEventListener('click', copyNotes);
    document.getElementById('journal-save').addEventListener('click', onSaveClick);
    document.getElementById('journal-close-entry').addEventListener('click', closeJournal);
    document.getElementById('journal-delete').addEventListener('click', deleteNotes);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closeJournal();
    });

    setupDrag();
  }

  /* ── Open / close drawer ────────────────────────────────── */
  function openJournal() {
    isOpen = true;
    drawer.classList.add('open');
    document.getElementById('journal-backdrop').classList.add('visible');

    var entries = loadEntries().filter(function (e) { return (e.text || '').trim(); });
    if (entries.length > 0) {
      showListMode();
    } else {
      openEditMode(null);
    }
  }

  function closeJournal() {
    isOpen = false;
    resetDeleteBtn();
    flushPendingSave();
    drawer.classList.remove('open');
    document.getElementById('journal-backdrop').classList.remove('visible');
    refreshInlineBanner();
    refreshBadge();
  }

  function flushPendingSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      if (currentMode === 'edit' && textarea && textarea.value.trim()) {
        upsertEntry(currentEntryId || (currentEntryId = genId()), textarea.value);
      }
    }
  }

  /* ── List mode ───────────────────────────────────────────── */
  function showListMode() {
    currentMode = 'list';
    flushPendingSave();

    document.getElementById('journal-back').style.display = 'none';
    document.getElementById('journal-icon').style.display = '';
    listPanel.style.display = 'flex';
    editPanel.style.display = 'none';

    renderEntriesList();
  }

  function renderEntriesList() {
    var entries = loadEntries().filter(function (e) { return (e.text || '').trim(); });
    var titleDiv = document.getElementById('journal-list-title');
    titleDiv.textContent = getStudyTitle();

    entriesListEl.innerHTML = '';

    if (!entries.length) {
      var empty = document.createElement('li');
      empty.className = 'journal-entry-empty';
      empty.textContent = 'No entries yet. Tap \u201c+ New entry\u201d to start.';
      entriesListEl.appendChild(empty);
      return;
    }

    entries.forEach(function (entry) {
      var li = document.createElement('li');
      li.className = 'journal-entry-item';
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');

      var date = document.createElement('div');
      date.className = 'journal-entry-date';
      date.textContent = formatDate(entry.updatedAt || entry.createdAt);

      var preview = document.createElement('div');
      preview.className = 'journal-entry-preview';
      preview.textContent = previewText(entry.text, 100);

      li.appendChild(date);
      li.appendChild(preview);

      function openThis() { openEditMode(entry.id); }
      li.addEventListener('click', openThis);
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openThis(); }
      });

      entriesListEl.appendChild(li);
    });
  }

  /* ── Edit mode ───────────────────────────────────────────── */
  function openEditMode(entryId) {
    currentMode = 'edit';
    currentEntryId = entryId || genId();

    var hasMultiple = loadEntries().filter(function (e) { return (e.text || '').trim(); }).length > 0;
    document.getElementById('journal-back').style.display = hasMultiple ? '' : 'none';
    document.getElementById('journal-icon').style.display = hasMultiple ? 'none' : '';

    listPanel.style.display = 'none';
    editPanel.style.display = 'flex';

    titleEl.textContent = getStudyTitle();
    statusEl.textContent = '';

    var entry = null;
    if (entryId) {
      var all = loadEntries();
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === entryId) { entry = all[i]; break; }
      }
    }

    if (entry) {
      textarea.value = entry.text || '';
      renderMeta(entry);
    } else {
      textarea.value = '';
      metaEl.textContent = '';
    }

    updateCount();
    var helper = document.getElementById('journal-helper');
    if (helper) helper.style.display = textarea.value.trim() ? 'none' : '';

    setTimeout(function () { textarea.focus(); }, 300);
  }

  /* ── Save button ─────────────────────────────────────────── */
  function onSaveClick() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    upsertEntry(currentEntryId, textarea.value);
    statusEl.textContent = '';
    closeJournal();
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

  /* ── Auto-save on input ──────────────────────────────────── */
  function onInput() {
    updateCount();
    var helper = document.getElementById('journal-helper');
    if (helper) helper.style.display = textarea.value.trim() ? 'none' : '';
    if (saveTimer) clearTimeout(saveTimer);
    statusEl.textContent = 'Saving\u2026';
    saveTimer = setTimeout(function () { doAutoSave(textarea.value); }, 700);
  }

  function doAutoSave(text) {
    saveTimer = null;
    var entry = upsertEntry(currentEntryId, text);
    if (entry) {
      renderMeta(entry);
      statusEl.textContent = '\u2713 Saved';
      refreshBadge();
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
    if (!text) { flash('Nothing to copy.'); return; }
    var title = (titleEl.textContent || getStudyTitle()).trim();
    var full = title ? (title + '\n\n' + text) : text;
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
  function resetDeleteBtn() {
    if (deleteConfirmTimer) { clearTimeout(deleteConfirmTimer); deleteConfirmTimer = null; }
    var btn = document.getElementById('journal-delete');
    if (btn) { btn.textContent = 'Delete'; btn.classList.remove('journal-btn-armed'); }
  }

  function deleteNotes() {
    if (!textarea.value.trim()) { flash('No notes to delete.'); return; }
    var btn = document.getElementById('journal-delete');
    if (!deleteConfirmTimer) {
      btn.textContent = 'Tap again to delete';
      btn.classList.add('journal-btn-armed');
      deleteConfirmTimer = setTimeout(function () {
        deleteConfirmTimer = null;
        btn.textContent = 'Delete';
        btn.classList.remove('journal-btn-armed');
      }, 3000);
      return;
    }
    resetDeleteBtn();
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    deleteEntryById(currentEntryId);
    var remaining = loadEntries().filter(function (e) { return (e.text || '').trim(); });
    if (remaining.length > 0) {
      showListMode();
    } else {
      closeJournal();
    }
    refreshInlineBanner();
    refreshBadge();
  }

  /* ── Touch swipe-right to close ──────────────────────────── */
  function setupDrag() {
    var handle = document.getElementById('journal-drag-handle');
    var startX = null;

    handle.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (startX === null || !isOpen) return;
      var dx = e.touches[0].clientX - startX;
      if (dx > 0) drawer.style.transform = 'translateX(' + dx + 'px)';
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      startX = null;
      drawer.style.transform = '';
      if (dx > 80 && isOpen) closeJournal();
    });
  }

  /* ── Boot ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
})();
