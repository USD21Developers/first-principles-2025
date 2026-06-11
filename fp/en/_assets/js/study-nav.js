(function () {
  var STUDIES = [
    { slug: 'seeking-god',         title: 'Seeking God' },
    { slug: 'word',                title: 'The Word of God' },
    { slug: 'discipleship',        title: 'Discipleship' },
    { slug: 'kingdom',             title: 'The Coming of the Kingdom' },
    { slug: 'sin-repentance',      title: 'Sin \u0026 Repentance' },
    { slug: 'light-darkness',      title: 'Light \u0026 Darkness' },
    { slug: 'cross',               title: 'The Cross' },
    { slug: 'church',              title: 'The Church' },
    { slug: 'holy-spirit-baptism', title: 'Baptism with the Holy Spirit' },
    { slug: 'holy-spirit-gifts',   title: 'Miraculous Gifts of the Holy Spirit' },
    { slug: 'nt-conversion',       title: 'NT Conversion' },
    { slug: 'after-baptism',       title: 'After Baptism' },
    { slug: 'christ-is-your-life', title: 'Christ Is Your Life' },
    { slug: 'best-friends',        title: 'Best Friends' },
    { slug: 'the-mission',         title: 'The Mission' },
  ];

  var HOME_SVG = '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5z"/></svg>';

  var parts = location.pathname.replace(/\/+$/, '').split('/');
  var slug = parts[parts.length - 1];
  var idx = -1;
  for (var i = 0; i < STUDIES.length; i++) {
    if (STUDIES[i].slug === slug) { idx = i; break; }
  }
  if (idx === -1) return;

  var prev = idx > 0 ? STUDIES[idx - 1] : null;
  var next = idx < STUDIES.length - 1 ? STUDIES[idx + 1] : null;

  function btnHtml(study, dir) {
    if (!study) return '<div class="study-nav__btn--placeholder"></div>';
    var isNext = dir === 'next';
    return '<a href="../' + study.slug + '/" class="study-nav__btn study-nav__btn--' + dir + '">'
      + '<span class="study-nav__direction">'
      + (isNext ? 'Next &#8594;' : '&#8592; Previous')
      + '</span>'
      + '<span class="study-nav__title">' + study.title + '</span>'
      + '</a>';
  }

  var homeBtn = '<a href="../toc/" class="study-nav__btn study-nav__btn--home" aria-label="Home">' + HOME_SVG + '</a>';

  var nav = document.createElement('nav');
  nav.className = 'study-nav';
  nav.setAttribute('aria-label', 'Study navigation');
  nav.innerHTML = btnHtml(prev, 'prev') + homeBtn + btnHtml(next, 'next');

  var footer = document.querySelector('.master-container > footer, footer');
  if (footer) {
    footer.parentNode.insertBefore(nav, footer);
  }
})();
