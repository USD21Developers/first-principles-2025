(function () {
  'use strict';

  var NOTES_KEY   = 'fp_notes_general';
  var JOURNAL_PFX = 'fp_journal_';

  /* Study color map — keeps tabs consistent with the TOC page */
  var STUDY_COLORS = {
    'seeking-god':         '#c0392b',
    'word':                '#e67e22',
    'discipleship':        '#c9a007',
    'kingdom':             '#1d8348',
    'sin-repentance':      '#717d7e',
    'light-darkness':      '#1a6fa8',
    'cross':               '#7d3c98',
    'church':              '#148f77',
    'holy-spirit-baptism': '#154360',
    'holy-spirit-gifts':   '#884ea0',
    'nt-conversion':       '#922b21',
    'after-baptism':       '#196f3d',
    'christ-is-your-life': '#935116',
    'best-friends':        '#0e6655',
    'the-mission':         '#4a235a',
  };

  /* ── Storage key helpers ──────────────────────────────────── */
  function getSlug() {
    var path = window.location.pathname.replace(/\/$/, '');
    var parts = path.split('/');
    for (var i = parts.length - 1; i >= 0; i--) {
      if (parts[i]) return parts[i];
    }
    return 'unknown';
  }

  function journalKey() { return JOURNAL_PFX + getSlug(); }

  function studyColor() { return STUDY_COLORS[getSlug()] || '#2c6e49'; }

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

  /* ── Multi-entry CRUD ─────────────────────────────────────── */
  function loadEntries(key) {
    if (!HAS_STORAGE) return [];
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        if (parsed && (parsed.text || '').trim()) {
          var migrated = [{
            id: genId(), text: parsed.text,
            createdAt: parsed.createdAt || new Date().toISOString(),
            updatedAt: parsed.updatedAt || new Date().toISOString()
          }];
          _writeEntries(key, migrated);
          return migrated;
        }
        return [];
      }
      return parsed;
    } catch (e) { return []; }
  }

  function _writeEntries(key, entries) {
    try { localStorage.setItem(key, JSON.stringify(entries)); } catch (e) {}
  }

  function upsertEntry(key, id, text, extra) {
    if (!HAS_STORAGE) return null;
    var entries = loadEntries(key);
    var now = new Date().toISOString();
    var idx = -1;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === id) { idx = i; break; }
    }
    var entry;
    if (idx === -1) {
      entry = { id: id, text: text, createdAt: now, updatedAt: now };
      if (extra) { for (var k in extra) entry[k] = extra[k]; }
      entries.unshift(entry);
    } else {
      entries[idx].text    = text;
      entries[idx].updatedAt = now;
      entry = entries.splice(idx, 1)[0];
      entries.unshift(entry);
    }
    _writeEntries(key, entries);
    return entry;
  }

  function deleteEntryById(key, id) {
    if (!HAS_STORAGE) return;
    _writeEntries(key, loadEntries(key).filter(function (e) { return e.id !== id; }));
  }

  /* ── Formatters ───────────────────────────────────────────── */
  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return iso; }
  }

  /* Date line: shows "Study Name · date" for Notes entries from a study page */
  function entryDateLine(entry) {
    var date = formatDate(entry.updatedAt || entry.createdAt);
    return entry.studyName ? entry.studyName + ' \u00b7 ' + date : date;
  }

  function wordCount(text) {
    var t = (text || '').trim();
    return t ? t.split(/\s+/).length : 0;
  }

  function countLabel(text) {
    var w = wordCount(text), c = (text || '').length;
    if (!c) return '';
    return w + (w === 1 ? ' word' : ' words') + ' \u00b7 ' + c + ' chars';
  }

  function previewText(text, max) {
    max = max || 90;
    var t = (text || '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) + '\u2026' : t;
  }

  /* ── Title detection ──────────────────────────────────────── */
  function getStudyTitle() {
    var h1 = document.querySelector('header h1');
    if (h1 && h1.innerText && h1.innerText.trim()) return h1.innerText.trim();
    if (document.title && document.title.trim()) return document.title.trim();
    return getSlug().replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  /* Extra fields stored when saving a Note from a study page */
  function notesExtra() {
    return { studySlug: getSlug(), studyName: getStudyTitle() };
  }

  /* ── State ────────────────────────────────────────────────── */
  var tabCol, journalBadge, notesBadge;
  var drawer, inlineBanner;
  var textarea, statusEl, metaEl, titleEl, countEl;
  var listPanel, editPanel, entriesListEl;
  var isOpen        = false;
  var currentMode   = 'list';
  var activeKey     = null;   /* which storage key the open drawer is using */
  var currentEntryId = null;
  var saveTimer      = null;
  var deleteConfirmTimer = null;

  /* ── Inline "Continue" banner ─────────────────────────────── */
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
    if (footer) footer.parentNode.insertBefore(inlineBanner, footer);
    else document.body.appendChild(inlineBanner);

    inlineBanner.querySelector('.jib-btn').addEventListener('click', function () {
      openJournal(journalKey());
    });
  }

  function refreshInlineBanner() {
    if (!inlineBanner) return;
    var entries = loadEntries(journalKey()).filter(function (e) { return (e.text || '').trim(); });
    if (!entries.length) { inlineBanner.style.display = 'none'; return; }

    var count  = entries.length;
    var newest = entries[0];
    inlineBanner.querySelector('.jib-heading').textContent =
      count === 1 ? 'Continue your study notes' : count + ' saved journal entries';
    inlineBanner.querySelector('.jib-preview').textContent = previewText(newest.text);
    inlineBanner.querySelector('.jib-meta').textContent =
      newest.updatedAt ? 'Last edited: ' + formatDate(newest.updatedAt) : '';
    inlineBanner.style.display = '';
  }

  function refreshTabBadges() {
    var jc = loadEntries(journalKey()).filter(function (e) { return (e.text || '').trim(); }).length;
    if (journalBadge) {
      journalBadge.textContent = jc;
      journalBadge.style.display = jc > 0 ? '' : 'none';
    }
    var nc = loadEntries(NOTES_KEY).filter(function (e) { return (e.text || '').trim(); }).length;
    if (notesBadge) {
      notesBadge.textContent = nc;
      notesBadge.style.display = nc > 0 ? '' : 'none';
    }
  }

  /* ── Build UI ─────────────────────────────────────────────── */
  function makeTab(label, color, badgeRef) {
    var btn = document.createElement('button');
    btn.className = 'journal-side-tab';
    btn.style.background = color;
    btn.setAttribute('aria-label', label);
    btn.title = label;

    var badge = document.createElement('span');
    badge.className = 'journal-side-tab-badge';
    badge.style.display = 'none';
    badgeRef.el = badge;

    var labelEl = document.createElement('span');
    labelEl.className = 'journal-side-tab-label';
    labelEl.setAttribute('aria-hidden', 'true');
    labelEl.textContent = label;

    btn.appendChild(badge);
    btn.appendChild(labelEl);
    return btn;
  }

  function buildUI() {
    buildInlineBanner();
    refreshInlineBanner();

    /* Side tab column */
    tabCol = document.createElement('div');
    tabCol.id = 'journal-tab-col';

    var jRef = {}, nRef = {};

    var jTab = makeTab('Journal', studyColor(), jRef);
    journalBadge = jRef.el;
    jTab.addEventListener('click', function () { openJournal(journalKey()); });

    var nTab = makeTab('Notes', '#1a5f4a', nRef);
    notesBadge = nRef.el;
    nTab.addEventListener('click', function () { openJournal(NOTES_KEY); });

    tabCol.appendChild(jTab);
    tabCol.appendChild(nTab);
    document.body.appendChild(tabCol);
    refreshTabBadges();

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
          '<button id="journal-back" type="button" aria-label="Back to entries" style="display:none">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">' +
              '<path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>' +
            '</svg>' +
          '</button>' +
          '<span id="journal-icon" aria-hidden="true">&#128211;</span>' +
          '<span id="journal-heading">Study Journal</span>' +
        '</div>' +
        '<button id="journal-close" aria-label="Close journal" type="button">&times;</button>' +
      '</div>' +

      '<div id="journal-list-panel">' +
        '<div id="journal-list-title"></div>' +
        '<ul id="journal-entries-list" role="list"></ul>' +
        '<div id="journal-list-footer">' +
          '<button id="journal-new-entry" type="button">+ New entry</button>' +
        '</div>' +
      '</div>' +

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

    listPanel      = document.getElementById('journal-list-panel');
    editPanel      = document.getElementById('journal-edit-panel');
    entriesListEl  = document.getElementById('journal-entries-list');
    titleEl        = document.getElementById('journal-study-title');
    metaEl         = document.getElementById('journal-dates');
    textarea       = document.getElementById('journal-textarea');
    statusEl       = document.getElementById('journal-status');
    countEl        = document.getElementById('journal-wordcount');

    /* Events */
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

  /* ── Open / close drawer ──────────────────────────────────── */
  function openJournal(key) {
    activeKey = key;
    isOpen    = true;
    drawer.classList.add('open');
    document.getElementById('journal-backdrop').classList.add('visible');

    var isNotes = (key === NOTES_KEY);
    document.getElementById('journal-heading').textContent =
      isNotes ? 'General Notes' : getStudyTitle();

    var entries = loadEntries(activeKey).filter(function (e) { return (e.text || '').trim(); });
    if (entries.length > 0) showListMode();
    else openEditMode(null);
  }

  function closeJournal() {
    isOpen = false;
    resetDeleteBtn();
    flushPendingSave();
    drawer.classList.remove('open');
    document.getElementById('journal-backdrop').classList.remove('visible');
    refreshInlineBanner();
    refreshTabBadges();
  }

  function flushPendingSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      if (currentMode === 'edit' && textarea && textarea.value.trim()) {
        var extra = (activeKey === NOTES_KEY) ? notesExtra() : null;
        upsertEntry(activeKey, currentEntryId || (currentEntryId = genId()), textarea.value, extra);
      }
    }
  }

  /* ── List mode ────────────────────────────────────────────── */
  function showListMode() {
    currentMode = 'list';
    flushPendingSave();

    document.getElementById('journal-back').style.display  = 'none';
    document.getElementById('journal-icon').style.display  = '';
    listPanel.style.display = 'flex';
    editPanel.style.display = 'none';

    renderEntriesList();
  }

  function renderEntriesList() {
    var entries = loadEntries(activeKey).filter(function (e) { return (e.text || '').trim(); });
    var titleDiv = document.getElementById('journal-list-title');
    titleDiv.textContent = (activeKey === NOTES_KEY) ? 'General Notes' : getStudyTitle();

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
      date.textContent = entryDateLine(entry);

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

  /* ── Edit mode ────────────────────────────────────────────── */
  function openEditMode(entryId) {
    currentMode    = 'edit';
    currentEntryId = entryId || genId();

    var hasEntries = loadEntries(activeKey).filter(function (e) { return (e.text || '').trim(); }).length > 0;
    document.getElementById('journal-back').style.display  = hasEntries ? '' : 'none';
    document.getElementById('journal-icon').style.display  = hasEntries ? 'none' : '';

    listPanel.style.display = 'none';
    editPanel.style.display = 'flex';

    titleEl.textContent = (activeKey === NOTES_KEY) ? 'General Notes' : getStudyTitle();
    statusEl.textContent = '';

    var entry = null;
    if (entryId) {
      var all = loadEntries(activeKey);
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

  /* ── Save ─────────────────────────────────────────────────── */
  function onSaveClick() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    var extra = (activeKey === NOTES_KEY) ? notesExtra() : null;
    upsertEntry(activeKey, currentEntryId, textarea.value, extra);
    statusEl.textContent = '';
    closeJournal();
  }

  /* ── Meta / counts ────────────────────────────────────────── */
  function renderMeta(entry) {
    var parts = [];
    if (entry && entry.studyName && activeKey === NOTES_KEY) {
      parts.push('Study: ' + entry.studyName);
    }
    if (entry && entry.updatedAt) {
      var s = 'Last edited: ' + formatDate(entry.updatedAt);
      if (entry.createdAt && entry.createdAt !== entry.updatedAt) {
        s += ' \u00b7 Created: ' + formatDate(entry.createdAt);
      }
      parts.push(s);
    }
    metaEl.textContent = parts.join(' \u00b7 ');
  }

  function updateCount() {
    if (!countEl) return;
    var label = countLabel(textarea ? textarea.value : '');
    countEl.textContent = label;
    countEl.style.display = label ? '' : 'none';
  }

  /* ── Auto-save ────────────────────────────────────────────── */
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
    var extra = (activeKey === NOTES_KEY) ? notesExtra() : null;
    var entry = upsertEntry(activeKey, currentEntryId, text, extra);
    if (entry) {
      renderMeta(entry);
      statusEl.textContent = '\u2713 Saved';
      refreshTabBadges();
      setTimeout(function () {
        if (statusEl.textContent === '\u2713 Saved') statusEl.textContent = '';
      }, 2000);
    } else if (!HAS_STORAGE) {
      statusEl.textContent = 'Storage unavailable';
    }
  }

  /* ── Copy ─────────────────────────────────────────────────── */
  function copyNotes() {
    var text = textarea.value.trim();
    if (!text) { flash('Nothing to copy.'); return; }
    var title = (titleEl.textContent || getStudyTitle()).trim();
    var full  = title ? (title + '\n\n' + text) : text;
    function ok()   { flash('\u2713 Copied!'); }
    function fail() { flash('Copy failed.');   }
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

  /* ── Delete ───────────────────────────────────────────────── */
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
    deleteEntryById(activeKey, currentEntryId);
    var remaining = loadEntries(activeKey).filter(function (e) { return (e.text || '').trim(); });
    if (remaining.length > 0) showListMode();
    else closeJournal();
    refreshInlineBanner();
    refreshTabBadges();
  }

  /* ── Touch swipe-right to close ───────────────────────────── */
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

  /* ── Boot ─────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
})();
