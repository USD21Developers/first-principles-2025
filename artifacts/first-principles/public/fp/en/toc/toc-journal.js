(function () {
  'use strict';

  var GENERAL_KEY = 'fp_notes_general';
  var JOURNAL_PREFIX = 'fp_journal_';

  var STUDIES = [
    { slug: 'seeking-god',         name: 'Seeking God',                 color: '#c0392b' },
    { slug: 'word',                name: 'The Word',                    color: '#e67e22' },
    { slug: 'discipleship',        name: 'Discipleship',                color: '#c9a007' },
    { slug: 'kingdom',             name: 'Kingdom',                     color: '#1d8348' },
    { slug: 'sin-repentance',      name: 'Sin & Repentance',            color: '#717d7e' },
    { slug: 'light-darkness',      name: 'Light & Darkness',            color: '#1a6fa8' },
    { slug: 'cross',               name: 'The Cross',                   color: '#7d3c98' },
    { slug: 'church',              name: 'The Church',                  color: '#148f77' },
    { slug: 'holy-spirit-baptism', name: 'HS Baptism',                  color: '#154360' },
    { slug: 'holy-spirit-gifts',   name: 'HS Gifts',                    color: '#884ea0' },
    { slug: 'nt-conversion',       name: 'NT Conversion',               color: '#922b21' },
    { slug: 'after-baptism',       name: 'After Baptism',               color: '#196f3d' },
    { slug: 'christ-is-your-life', name: 'Christ Is Your Life',         color: '#935116' },
    { slug: 'best-friends',        name: 'Best Friends',                color: '#0e6655' },
    { slug: 'the-mission',         name: 'The Mission',                 color: '#4a235a' },
  ];

  /* ── Storage helpers ─────────────────────────────────────── */
  function storageOk() {
    try { localStorage.setItem('__t__', '1'); localStorage.removeItem('__t__'); return true; }
    catch (e) { return false; }
  }
  var HAS_STORAGE = storageOk();

  function loadEntries(key) {
    if (!HAS_STORAGE) return [];
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return [];
      var p = JSON.parse(raw);
      if (!Array.isArray(p)) {
        if (p && (p.text || '').trim()) {
          var m = [{ id: genId(), text: p.text,
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || new Date().toISOString() }];
          writeEntries(key, m); return m;
        }
        return [];
      }
      return p;
    } catch (e) { return []; }
  }

  function writeEntries(key, entries) {
    try { localStorage.setItem(key, JSON.stringify(entries)); } catch (e) {}
  }

  function upsertEntry(key, id, text) {
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
      entries.unshift(entry);
    } else {
      entries[idx].text = text; entries[idx].updatedAt = now;
      entry = entries.splice(idx, 1)[0]; entries.unshift(entry);
    }
    writeEntries(key, entries);
    return entry;
  }

  function deleteEntry(key, id) {
    if (!HAS_STORAGE) return;
    writeEntries(key, loadEntries(key).filter(function (e) { return e.id !== id; }));
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── Formatters ──────────────────────────────────────────── */
  function fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return iso; }
  }

  function preview(text, max) {
    max = max || 90;
    var t = (text || '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) + '\u2026' : t;
  }

  function countLabel(text) {
    var t = (text || '').trim();
    if (!t) return '';
    var w = t.split(/\s+/).length, c = text.length;
    return w + (w === 1 ? ' word' : ' words') + ' \u00b7 ' + c + ' chars';
  }

  /* ── Panel state ─────────────────────────────────────────── */
  var panel, backdrop, tabCol;
  var panelTitle, panelDot, panelBack, listView, editView;
  var entryList, editTextarea, editStatus, editWordcount, editDates, editStudyName;
  var goStudyBtn;
  var isOpen = false;
  var currentKey = null;
  var currentStudy = null; /* STUDIES entry or null for general notes */
  var currentEntryId = null;
  var mode = 'list'; /* 'list' | 'edit' */
  var saveTimer = null;

  /* ── Build panel ─────────────────────────────────────────── */
  function buildPanel() {
    /* Backdrop */
    backdrop = document.createElement('div');
    backdrop.id = 'toc-journal-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', closePanel);

    /* Panel */
    panel = document.createElement('div');
    panel.id = 'toc-journal-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Journal Panel');

    panel.innerHTML =
      '<div id="toc-panel-grip"><span></span></div>' +

      '<div id="toc-panel-header">' +
        '<div class="toc-panel-header-left">' +
          '<button id="toc-panel-back" type="button" aria-label="Back to entries" style="display:none">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">' +
              '<path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>' +
            '</svg>' +
          '</button>' +
          '<span id="toc-panel-color-dot"></span>' +
          '<span id="toc-panel-title"></span>' +
        '</div>' +
        '<button id="toc-panel-close" aria-label="Close panel" type="button">&times;</button>' +
      '</div>' +

      /* List view */
      '<div id="toc-panel-list">' +
        '<ul id="toc-entry-list" role="list"></ul>' +
        '<div id="toc-list-footer">' +
          '<button id="toc-new-entry" type="button">+ New entry</button>' +
          '<a id="toc-go-study" href="#" style="display:none">Go to study \u2192</a>' +
        '</div>' +
      '</div>' +

      /* Edit view */
      '<div id="toc-panel-edit">' +
        '<div id="toc-edit-meta">' +
          '<div id="toc-edit-study-name"></div>' +
          '<div id="toc-edit-dates"></div>' +
        '</div>' +
        '<div id="toc-edit-body">' +
          '<textarea id="toc-edit-textarea" placeholder="Write your notes here\u2026"></textarea>' +
          '<div id="toc-edit-wordcount"></div>' +
        '</div>' +
        '<div id="toc-edit-footer">' +
          '<div class="toc-edit-left">' +
            '<span id="toc-edit-status"></span>' +
            '<button id="toc-del-btn" class="toc-btn toc-btn-danger" type="button">Delete</button>' +
          '</div>' +
          '<div class="toc-edit-actions">' +
            '<button id="toc-copy-btn"  class="toc-btn" type="button">Copy</button>' +
            '<button id="toc-save-btn"  class="toc-btn toc-btn-primary" type="button">Save</button>' +
            '<button id="toc-close-btn" class="toc-btn" type="button">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(panel);

    /* Cache refs */
    panelTitle    = document.getElementById('toc-panel-title');
    panelDot      = document.getElementById('toc-panel-color-dot');
    panelBack     = document.getElementById('toc-panel-back');
    listView      = document.getElementById('toc-panel-list');
    editView      = document.getElementById('toc-panel-edit');
    entryList     = document.getElementById('toc-entry-list');
    editTextarea  = document.getElementById('toc-edit-textarea');
    editStatus    = document.getElementById('toc-edit-status');
    editWordcount = document.getElementById('toc-edit-wordcount');
    editDates     = document.getElementById('toc-edit-dates');
    editStudyName = document.getElementById('toc-edit-study-name');
    goStudyBtn    = document.getElementById('toc-go-study');

    /* Events */
    document.getElementById('toc-panel-close').addEventListener('click', closePanel);
    document.getElementById('toc-panel-back').addEventListener('click', showListView);
    document.getElementById('toc-new-entry').addEventListener('click', function () { openEditView(null); });
    editTextarea.addEventListener('input', onInput);
    document.getElementById('toc-save-btn').addEventListener('click', onSave);
    document.getElementById('toc-close-btn').addEventListener('click', closePanel);
    document.getElementById('toc-del-btn').addEventListener('click', onDelete);
    document.getElementById('toc-copy-btn').addEventListener('click', onCopy);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closePanel();
    });

    setupDrag();
  }

  /* ── Open / close panel ──────────────────────────────────── */
  function openPanel(study) {
    currentStudy = study; /* null = general notes */
    currentKey   = study ? (JOURNAL_PREFIX + study.slug) : GENERAL_KEY;

    /* Header */
    var color = study ? study.color : '#1a5f4a';
    panelTitle.textContent = study ? study.name : 'General Notes';
    panelDot.style.background = color;
    panelDot.style.display = 'inline-block';

    /* Go-to-study link */
    if (study) {
      goStudyBtn.href  = '../' + study.slug + '/';
      goStudyBtn.style.display = '';
    } else {
      goStudyBtn.style.display = 'none';
    }

    isOpen = true;
    panel.classList.add('open');
    backdrop.classList.add('visible');

    var entries = loadEntries(currentKey).filter(function (e) { return (e.text || '').trim(); });
    if (entries.length > 0) {
      showListView();
    } else {
      openEditView(null);
    }
  }

  function closePanel() {
    isOpen = false;
    flushSave();
    panel.classList.remove('open');
    backdrop.classList.remove('visible');
    refreshTabs();
  }

  function flushSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      if (mode === 'edit' && editTextarea.value.trim()) {
        upsertEntry(currentKey, currentEntryId || (currentEntryId = genId()), editTextarea.value);
      }
    }
  }

  /* ── List view ───────────────────────────────────────────── */
  function showListView() {
    mode = 'list';
    flushSave();
    panelBack.style.display = 'none';
    listView.style.display  = 'flex';
    editView.style.display  = 'none';
    renderList();
  }

  function renderList() {
    var entries = loadEntries(currentKey).filter(function (e) { return (e.text || '').trim(); });
    entryList.innerHTML = '';

    if (!entries.length) {
      var empty = document.createElement('li');
      empty.className = 'toc-entry-empty';
      empty.textContent = 'No entries yet. Tap \u201c+ New entry\u201d to start.';
      entryList.appendChild(empty);
      return;
    }

    entries.forEach(function (entry) {
      var li = document.createElement('li');
      li.className = 'toc-entry-item';
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');

      var dateEl = document.createElement('div');
      dateEl.className = 'toc-entry-date';
      dateEl.textContent = fmtDate(entry.updatedAt || entry.createdAt);

      var prevEl = document.createElement('div');
      prevEl.className = 'toc-entry-preview';
      prevEl.textContent = preview(entry.text, 100);

      li.appendChild(dateEl);
      li.appendChild(prevEl);

      (function (id) {
        function open() { openEditView(id); }
        li.addEventListener('click', open);
        li.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
      })(entry.id);

      entryList.appendChild(li);
    });
  }

  /* ── Edit view ───────────────────────────────────────────── */
  function openEditView(entryId) {
    mode = 'edit';
    currentEntryId = entryId || genId();

    var hasEntries = loadEntries(currentKey).filter(function (e) { return (e.text || '').trim(); }).length > 0;
    panelBack.style.display = hasEntries ? '' : 'none';
    listView.style.display  = 'none';
    editView.style.display  = 'flex';

    var title = currentStudy ? currentStudy.name : 'General Notes';
    editStudyName.textContent = title;
    editStatus.textContent    = '';

    var entry = null;
    if (entryId) {
      var all = loadEntries(currentKey);
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === entryId) { entry = all[i]; break; }
      }
    }

    if (entry) {
      editTextarea.value = entry.text || '';
      renderMeta(entry);
    } else {
      editTextarea.value = '';
      editDates.textContent = '';
    }

    updateCount();
    setTimeout(function () { editTextarea.focus(); }, 300);
  }

  /* ── Autosave ────────────────────────────────────────────── */
  function onInput() {
    updateCount();
    if (saveTimer) clearTimeout(saveTimer);
    editStatus.textContent = 'Saving\u2026';
    saveTimer = setTimeout(function () {
      saveTimer = null;
      var entry = upsertEntry(currentKey, currentEntryId, editTextarea.value);
      if (entry) {
        renderMeta(entry);
        editStatus.textContent = '\u2713 Saved';
        setTimeout(function () {
          if (editStatus.textContent === '\u2713 Saved') editStatus.textContent = '';
        }, 2000);
      }
    }, 700);
  }

  function onSave() {
    if (!confirm('Save and close this entry?')) return;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    upsertEntry(currentKey, currentEntryId, editTextarea.value);
    closePanel();
  }

  function onDelete() {
    if (!editTextarea.value.trim()) { flash('No notes to delete.'); return; }
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    deleteEntry(currentKey, currentEntryId);
    var remaining = loadEntries(currentKey).filter(function (e) { return (e.text || '').trim(); });
    if (remaining.length > 0) { showListView(); } else { closePanel(); }
    refreshTabs();
  }

  function onCopy() {
    var text = editTextarea.value.trim();
    if (!text) { flash('Nothing to copy.'); return; }
    var full = (currentStudy ? currentStudy.name : 'General Notes') + '\n\n' + text;
    function ok()   { flash('\u2713 Copied!'); }
    function fail() { flash('Copy failed.'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(full).then(ok, function () { fallback(full, ok, fail); });
    } else { fallback(full, ok, fail); }
  }

  function fallback(text, ok, fail) {
    try {
      var el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0;top:0;left:0;pointer-events:none';
      document.body.appendChild(el);
      el.select();
      var done = document.execCommand('copy');
      document.body.removeChild(el);
      done ? ok() : fail();
    } catch (e) { fail(); }
  }

  function flash(msg) {
    editStatus.textContent = msg;
    setTimeout(function () { if (editStatus.textContent === msg) editStatus.textContent = ''; }, 2500);
  }

  /* ── Meta / count helpers ────────────────────────────────── */
  function renderMeta(entry) {
    if (entry && entry.updatedAt) {
      var s = 'Last edited: ' + fmtDate(entry.updatedAt);
      if (entry.createdAt && entry.createdAt !== entry.updatedAt) {
        s += ' \u00b7 Created: ' + fmtDate(entry.createdAt);
      }
      editDates.textContent = s;
    } else {
      editDates.textContent = '';
    }
  }

  function updateCount() {
    var label = countLabel(editTextarea.value);
    editWordcount.textContent = label;
    editWordcount.style.display = label ? '' : 'none';
  }

  /* ── Touch swipe-right to close ──────────────────────────── */
  function setupDrag() {
    var grip = document.getElementById('toc-panel-grip');
    var startX = null;
    grip.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (startX === null || !isOpen) return;
      var dx = e.touches[0].clientX - startX;
      if (dx > 0) panel.style.transform = 'translateX(' + dx + 'px)';
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      startX = null;
      panel.style.transform = '';
      if (dx > 80 && isOpen) closePanel();
    });
  }

  /* ── Tab column ──────────────────────────────────────────── */
  function buildTabCol() {
    tabCol = document.createElement('div');
    tabCol.id = 'toc-tab-col';
    document.body.appendChild(tabCol);
    refreshTabs();
  }

  function refreshTabs() {
    tabCol.innerHTML = '';

    /* Notes tab (always visible) */
    var noteCount = loadEntries(GENERAL_KEY).filter(function (e) { return (e.text || '').trim(); }).length;
    var notesTab = makeTab(null, '#1a5f4a', noteCount, '\u270F');
    tabCol.appendChild(notesTab);

    /* Spacer */
    var spacer = document.createElement('div');
    spacer.className = 'toc-tab-spacer';
    tabCol.appendChild(spacer);

    /* Study tabs (only if entries exist) */
    STUDIES.forEach(function (study) {
      var count = loadEntries(JOURNAL_PREFIX + study.slug)
        .filter(function (e) { return (e.text || '').trim(); }).length;
      if (count > 0) {
        tabCol.appendChild(makeTab(study, study.color, count, null));
      }
    });
  }

  function makeTab(study, color, count, icon) {
    var btn = document.createElement('button');
    btn.className = 'toc-tab';
    btn.style.background = color;
    var label = study ? study.name : 'General Notes';
    var countText = count > 0 ? count + ' entr' + (count === 1 ? 'y' : 'ies') : '';
    btn.setAttribute('aria-label', label + (countText ? ' — ' + countText : ''));
    btn.setAttribute('title', label + (countText ? ' (' + countText + ')' : ''));

    if (icon) {
      /* Notes tab: icon + optional count */
      var iconEl = document.createElement('span');
      iconEl.className = 'toc-tab-icon';
      iconEl.setAttribute('aria-hidden', 'true');
      iconEl.textContent = icon;
      btn.appendChild(iconEl);

      if (count > 0) {
        var cEl = document.createElement('span');
        cEl.className = 'toc-tab-count';
        cEl.textContent = count;
        btn.appendChild(cEl);
      }
    } else {
      /* Study tab: count number + dot */
      var cEl2 = document.createElement('span');
      cEl2.className = 'toc-tab-count';
      cEl2.textContent = count;
      btn.appendChild(cEl2);

      var dot = document.createElement('span');
      dot.className = 'toc-tab-dot';
      btn.appendChild(dot);
    }

    btn.addEventListener('click', function () { openPanel(study); });
    return btn;
  }

  /* ── Boot ────────────────────────────────────────────────── */
  function init() {
    buildPanel();
    buildTabCol();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
