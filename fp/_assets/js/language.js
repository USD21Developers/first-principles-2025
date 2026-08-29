(function () {
  "use strict";

  var LANGUAGES = [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "pt", name: "Português (Brasil)" },
    { code: "pt-eu", name: "Português (Portugal)" },
    { code: "zh", name: "汉语" },
  ];
  var LANGUAGE_CODES = LANGUAGES.map(function (language) {
    return language.code;
  });
  var LANGUAGE_STORAGE_KEY = "fpLanguage";
  var LANGUAGE_UI = {
    en: {
      selectLanguage: "Select Language",
      unavailableTitle: "Translation not yet available",
      unavailableMessage: 'We’re sorry, "{content}" is not yet available in {language}.',
      unavailableRequest:
        "Please check back soon, or send a translation request to support@usd21.org.",
      goHome: "Go to {language} Home",
      close: "Close",
    },
    es: {
      selectLanguage: "Seleccionar idioma",
      unavailableTitle: "Traducción aún no disponible",
      unavailableMessage:
        'Lo sentimos, "{content}" aún no está disponible en {language}.',
      unavailableRequest:
        "Vuelva a consultar pronto o envíe una solicitud de traducción a support@usd21.org.",
      goHome: "Ir al inicio en {language}",
      close: "Cerrar",
    },
    fr: {
      selectLanguage: "Choisir la langue",
      unavailableTitle: "Traduction pas encore disponible",
      unavailableMessage:
        'Désolé, « {content} » n’est pas encore disponible en {language}.',
      unavailableRequest:
        "Veuillez revenir bientôt ou envoyer une demande de traduction à support@usd21.org.",
      goHome: "Aller à l’accueil en {language}",
      close: "Fermer",
    },
    pt: {
      selectLanguage: "Selecionar idioma",
      unavailableTitle: "Tradução ainda não disponível",
      unavailableMessage:
        'Desculpe, “{content}” ainda não está disponível em {language}.',
      unavailableRequest:
        "Volte em breve ou envie uma solicitação de tradução para support@usd21.org.",
      goHome: "Ir para o início em {language}",
      close: "Fechar",
    },
    "pt-eu": {
      selectLanguage: "Selecionar idioma",
      unavailableTitle: "Tradução ainda não disponível",
      unavailableMessage:
        'Lamentamos, “{content}” ainda não está disponível em {language}.',
      unavailableRequest:
        "Volte em breve ou envie um pedido de tradução para support@usd21.org.",
      goHome: "Ir para o início em {language}",
      close: "Fechar",
    },
    zh: {
      selectLanguage: "选择语言",
      unavailableTitle: "翻译尚未提供",
      unavailableMessage:
        '很抱歉，“{content}”目前还没有{language}版本。',
      unavailableRequest:
        "请稍后再来，或发送翻译请求至 support@usd21.org。",
      goHome: "前往{language}主页",
      close: "关闭",
    },
  };
  var AVAILABLE_ROUTES = {
    en: [
      "about-fp", "about-us", "additional-studies", "after-baptism",
      "best-friends", "christ-is-your-life", "church", "cross",
      "discipleship", "find-a-church", "holy-spirit-baptism",
      "holy-spirit-gifts", "kingdom", "license", "light-darkness",
      "medical-account", "nt-conversion", "persecution", "privacy",
      "seeking-god", "sin-definitions", "sin-repentance", "support",
      "the-mission", "toc", "word",
    ],
    es: [
      "about-fp", "about-us", "church", "cross", "discipleship", "kingdom",
      "license", "light-darkness", "medical-account", "privacy",
      "seeking-god", "sin-definitions", "sin-repentance", "support", "toc",
      "word",
    ],
    fr: [
      "about-fp", "about-us", "church", "cross", "discipleship", "kingdom",
      "license", "light-darkness", "medical-account", "privacy",
      "seeking-god", "sin-definitions", "sin-repentance", "support", "toc",
      "word",
    ],
    pt: [
      "about-fp", "about-us", "church", "cross", "discipleship", "kingdom",
      "license", "light-darkness", "medical-account", "seeking-god",
      "sin-definitions", "sin-repentance", "toc", "word",
    ],
    "pt-eu": [
      "about-fp", "about-us", "church", "cross", "discipleship", "kingdom",
      "license", "light-darkness", "medical-account", "seeking-god",
      "sin-definitions", "sin-repentance", "toc", "word",
    ],
    zh: [
      "about-fp", "about-us", "church", "cross", "discipleship", "kingdom",
      "license", "light-darkness", "medical-account", "seeking-god",
      "sin-definitions", "sin-repentance", "toc", "word",
    ],
  };

  function isSupportedLanguage(code) {
    return LANGUAGE_CODES.indexOf(code) !== -1;
  }

  function getLanguageUi(code) {
    return LANGUAGE_UI[code] || LANGUAGE_UI.en;
  }

  function getLanguageName(code) {
    var language = LANGUAGES.find(function (item) {
      return item.code === code;
    });
    return language ? language.name : code;
  }

  function formatUiText(template, values) {
    return template.replace(/\{(\w+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(values, key)
        ? values[key]
        : match;
    });
  }

  function saveLanguage(code) {
    if (isSupportedLanguage(code)) {
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      } catch (error) {
        // Private browsing modes may deny storage; navigation still works.
      }
    }
  }

  function getSavedLanguage() {
    try {
      var saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return isSupportedLanguage(saved) ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function getBrowserLanguage() {
    var browserLanguages = [];
    if (Array.isArray(window.navigator.languages)) {
      browserLanguages = browserLanguages.concat(window.navigator.languages);
    }
    if (window.navigator.language) {
      browserLanguages.push(window.navigator.language);
    }

    for (var i = 0; i < browserLanguages.length; i += 1) {
      var language = String(browserLanguages[i] || "").toLowerCase();
      if (language.indexOf("pt-br") === 0) return "pt";
      if (language.indexOf("pt-pt") === 0) return "pt-eu";
      if (language.indexOf("pt") === 0) return "pt";
      if (language.indexOf("es") === 0) return "es";
      if (language.indexOf("fr") === 0) return "fr";
      if (language.indexOf("zh") === 0) return "zh";
      if (language.indexOf("en") === 0) return "en";
    }
    return "en";
  }

  function getPathInfo() {
    var path = window.location.pathname.replace(/\/+$/, "");
    var match = path.match(/^\/fp\/(en|es|fr|pt-eu|pt|zh)(?:\/(.*))?$/);
    if (!match) {
      return { language: null, route: "", search: "", hash: "" };
    }
    var route = (match[2] || "").replace(/^\/+|\/+$/g, "");
    if (route === "index.html") {
      route = "";
    } else {
      route = route.replace(/\/index\.html$/, "");
    }
    return {
      language: match[1],
      route: route,
      search: window.location.search,
      hash: window.location.hash,
    };
  }

  function getLanguageRoot(code) {
    return "/fp/" + code + "/";
  }

  function getCandidateUrl(code, route, search, hash) {
    var root = getLanguageRoot(code);
    var path = root + (route ? route.replace(/^\/+/, "") + "/" : "");
    return path + (search || "") + (hash || "");
  }

  function addStylesheet(onReady) {
    var existing = document.querySelector(
      'link[data-fp-language-style="true"]',
    );
    if (existing) {
      if (
        existing.sheet ||
        existing.getAttribute("data-fp-language-style-loaded") === "true"
      ) {
        if (onReady) onReady();
      } else if (onReady) {
        existing.addEventListener("load", onReady, { once: true });
      }
      return;
    }

    var stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/fp/_assets/css/language.css";
    stylesheet.setAttribute("data-fp-language-style", "true");
    stylesheet.addEventListener("load", function () {
      stylesheet.setAttribute("data-fp-language-style-loaded", "true");
      if (onReady) onReady();
    }, { once: true });
    document.head.appendChild(stylesheet);
  }

  function getLanguageFromHref(href) {
    var match = href.match(/^(?:\.\/)?(en|es|fr|pt-eu|pt|zh)\/?$/);
    return match ? match[1] : null;
  }

  function markRootSelection() {
    var selected = getSavedLanguage() || getBrowserLanguage();
    document.querySelectorAll("#pg_selectlang a[href]").forEach(function (link) {
      var code = getLanguageFromHref(link.getAttribute("href") || "");
      if (!code) return;
      if (code === selected) {
        link.classList.add("fp-language-selected");
        link.setAttribute("aria-current", "true");
      }
      link.addEventListener("click", function () {
        saveLanguage(code);
      });
    });
  }

  function closeMenu(switcher, restoreFocus) {
    var button = switcher.querySelector(".fp-language-button");
    var menu = switcher.querySelector(".fp-language-menu");
    if (!button || !menu) return;
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (restoreFocus) button.focus();
  }

  function getMenuOptions(switcher) {
    return Array.prototype.slice.call(
      switcher.querySelectorAll(".fp-language-option"),
    );
  }

  function openMenu(switcher, focusLast) {
    var button = switcher.querySelector(".fp-language-button");
    var menu = switcher.querySelector(".fp-language-menu");
    if (!button || !menu) return;
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
    var options = getMenuOptions(switcher);
    var current = menu.querySelector(".is-current");
    var target = focusLast ? options[options.length - 1] : current || options[0];
    if (target) target.focus();
  }

  function makeGlobeIcon() {
    return '<svg class="fp-language-globe" aria-hidden="true" viewBox="0 0 16 16" focusable="false" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="8" cy="8" r="6.5"></circle>' +
      '<path d="M1.5 8h13M2.75 4.5h10.5M2.75 11.5h10.5M8 1.5c2 1.8 3 4 3 6.5s-1 4.7-3 6.5c-2-1.8-3-4-3-6.5s1-4.7 3-6.5Z"></path>' +
      "</svg>";
  }

  function createSwitcher(pathInfo) {
    var currentUi = getLanguageUi(pathInfo.language);
    var switcher = document.createElement("div");
    switcher.className = "fp-language-switcher";
    switcher.innerHTML =
      '<button type="button" class="fp-language-button" aria-haspopup="menu" aria-expanded="false">' +
      makeGlobeIcon() +
      '<span class="visually-hidden"></span>' +
      "</button>" +
      '<div class="fp-language-menu" role="menu" hidden></div>';

    var menu = switcher.querySelector(".fp-language-menu");
    var button = switcher.querySelector(".fp-language-button");
    var hiddenLabel = button.querySelector(".visually-hidden");
    button.setAttribute("aria-label", currentUi.selectLanguage);
    button.setAttribute("title", currentUi.selectLanguage);
    hiddenLabel.textContent = currentUi.selectLanguage;
    LANGUAGES.forEach(function (language) {
      var link = document.createElement("a");
      link.href = getCandidateUrl(
        language.code,
        pathInfo.route,
        pathInfo.search,
        pathInfo.hash,
      );
      link.className = "fp-language-option";
      link.setAttribute("role", "menuitem");
      link.textContent = language.name;
      if (language.code === pathInfo.language) {
        link.classList.add("is-current");
        link.setAttribute("aria-current", "true");
      }
      link.addEventListener("click", function (event) {
        event.preventDefault();
        saveLanguage(language.code);
        var destination = resolveDestination(language.code, pathInfo);
        if (destination.exists) {
          window.location.assign(destination.url);
          return;
        }
        closeMenu(switcher, false);
        showMissingTranslationModal({
          requestedLanguage: language.code,
          pathInfo: pathInfo,
          trigger: button,
        });
      });
      menu.appendChild(link);
    });

    button.addEventListener("click", function () {
      if (menu.hidden) {
        openMenu(switcher);
      } else {
        closeMenu(switcher, true);
      }
    });
    button.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openMenu(switcher, event.key === "ArrowUp");
      } else if (event.key === "Escape") {
        closeMenu(switcher, true);
      }
    });
    menu.addEventListener("keydown", function (event) {
      var options = getMenuOptions(switcher);
      var index = options.indexOf(document.activeElement);
      var nextIndex = null;
      if (event.key === "ArrowDown") {
        nextIndex = index < options.length - 1 ? index + 1 : 0;
      } else if (event.key === "ArrowUp") {
        nextIndex = index > 0 ? index - 1 : options.length - 1;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = options.length - 1;
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(switcher, true);
        return;
      }
      if (nextIndex !== null && options[nextIndex]) {
        event.preventDefault();
        options[nextIndex].focus();
      }
    });
    document.addEventListener("click", function (event) {
      if (!switcher.contains(event.target)) closeMenu(switcher, false);
    });
    return switcher;
  }

  function resolveDestination(language, pathInfo) {
    var candidate = getCandidateUrl(
      language,
      pathInfo.route,
      pathInfo.search,
      pathInfo.hash,
    );
    return {
      exists: !pathInfo.route ||
        AVAILABLE_ROUTES[language].indexOf(pathInfo.route) !== -1,
      url: candidate,
    };
  }

  function getContentTitle(pathInfo) {
    var heading = document.querySelector("h1");
    var headingText = heading ? heading.textContent.trim() : "";
    if (headingText) return headingText;

    var pageTitle = document.title.trim();
    if (pageTitle) return pageTitle;

    return pathInfo.route
      .split("-")
      .map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  function appendSupportRequest(paragraph, requestText) {
    var supportAddress = "support@usd21.org";
    var parts = requestText.split(supportAddress);
    paragraph.appendChild(document.createTextNode(parts[0]));

    var supportLink = document.createElement("a");
    supportLink.href = "mailto:" + supportAddress;
    supportLink.textContent = supportAddress;
    paragraph.appendChild(supportLink);

    if (parts[1]) {
      paragraph.appendChild(document.createTextNode(parts[1]));
    }
  }

  function showMissingTranslationModal(options) {
    var requestedLanguage = options.requestedLanguage;
    var pathInfo = options.pathInfo;
    var trigger = options.trigger;
    var ui = getLanguageUi(requestedLanguage);
    var languageName = getLanguageName(requestedLanguage);
    var existing = document.querySelector(".fp-language-modal");
    if (existing) existing.remove();

    var modal = document.createElement("div");
    modal.className = "fp-language-modal";

    var dialog = document.createElement("div");
    dialog.className = "fp-language-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "fp-language-dialog-title");
    dialog.tabIndex = -1;

    var header = document.createElement("div");
    header.className = "fp-language-dialog-header";

    var title = document.createElement("h2");
    title.id = "fp-language-dialog-title";
    title.textContent = ui.unavailableTitle;
    header.appendChild(title);

    var closeIcon = document.createElement("button");
    closeIcon.type = "button";
    closeIcon.className = "fp-language-dialog-close";
    closeIcon.setAttribute("aria-label", ui.close);
    closeIcon.setAttribute("title", ui.close);
    closeIcon.textContent = "×";
    header.appendChild(closeIcon);
    dialog.appendChild(header);

    var message = document.createElement("p");
    message.textContent = formatUiText(ui.unavailableMessage, {
      content: getContentTitle(pathInfo),
      language: languageName,
    });
    dialog.appendChild(message);

    var request = document.createElement("p");
    appendSupportRequest(request, ui.unavailableRequest);
    dialog.appendChild(request);

    var actions = document.createElement("div");
    actions.className = "fp-language-dialog-actions";

    var homeLink = document.createElement("a");
    homeLink.className = "fp-language-dialog-primary";
    homeLink.href = getCandidateUrl(requestedLanguage, "toc", "", "");
    homeLink.textContent = formatUiText(ui.goHome, { language: languageName });
    actions.appendChild(homeLink);

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "fp-language-dialog-secondary";
    closeButton.textContent = ui.close;
    actions.appendChild(closeButton);
    dialog.appendChild(actions);
    modal.appendChild(dialog);

    var background = document.querySelector(".master-container");
    var backgroundWasInert = background
      ? background.hasAttribute("inert")
      : false;
    var previousOverflow = document.body.style.overflow;

    function closeDialog() {
      modal.remove();
      document.body.style.overflow = previousOverflow;
      if (background && !backgroundWasInert) {
        background.removeAttribute("inert");
      }
      if (trigger) trigger.focus();
    }

    closeIcon.addEventListener("click", closeDialog);
    closeButton.addEventListener("click", closeDialog);
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeDialog();
    });
    modal.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== "Tab") return;

      var focusable = Array.prototype.slice.call(
        dialog.querySelectorAll("a[href], button:not([disabled]), [tabindex]"),
      );
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    if (background) background.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    document.body.appendChild(modal);
    dialog.focus();
  }

  function addContentSwitcher(pathInfo) {
    if (!pathInfo.language || document.body.id === "pg_cover") return;
    if (document.querySelector(".fp-language-switcher")) return;

    var switcher = createSwitcher(pathInfo);
    var home = document.querySelector(".home_icon");
    if (home) {
      home.insertAdjacentElement("afterend", switcher);
    } else {
      switcher.classList.add("fp-language-switcher--floating");
      document.body.appendChild(switcher);
    }
  }

  function initialize() {
    var pathInfo = getPathInfo();
    if (document.body.id === "pg_selectlang") {
      markRootSelection();
      return;
    }
    addStylesheet(function () {
      addContentSwitcher(pathInfo);
    });
  }

  addStylesheet();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();