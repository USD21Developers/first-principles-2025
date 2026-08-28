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

  function isSupportedLanguage(code) {
    return LANGUAGE_CODES.indexOf(code) !== -1;
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
      return { language: null, route: "" };
    }
    return {
      language: match[1],
      route: match[2] || "",
    };
  }

  function getLanguageRoot(code) {
    return "/fp/" + code + "/";
  }

  function getCandidateUrl(code, route) {
    var root = getLanguageRoot(code);
    return root + (route ? route.replace(/^\/+/, "") + "/" : "");
  }

  function addStylesheet() {
    if (document.querySelector('link[data-fp-language-style="true"]')) return;
    var stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/fp/_assets/css/language.css";
    stylesheet.setAttribute("data-fp-language-style", "true");
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

  function closeMenu(switcher) {
    var button = switcher.querySelector(".fp-language-button");
    var menu = switcher.querySelector(".fp-language-menu");
    if (!button || !menu) return;
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }

  function openMenu(switcher) {
    var button = switcher.querySelector(".fp-language-button");
    var menu = switcher.querySelector(".fp-language-menu");
    if (!button || !menu) return;
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
  }

  function makeGlobeIcon() {
    return '<svg aria-hidden="true" viewBox="0 0 16 16" focusable="false">' +
      '<path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM2.06 7h2.02c.08-1.38.45-2.64 1.04-3.57A5.03 5.03 0 0 0 2.06 7Zm0 2a5.03 5.03 0 0 0 3.06 3.57C4.53 11.64 4.16 10.38 4.08 9H2.06Zm4.02 0c.1 1.54.8 3.25 1.92 3.83C9.12 12.25 9.82 10.54 9.92 9H6.08Zm0-2h3.84C9.82 4.46 9.12 2.75 8 2.17 6.88 2.75 6.18 4.46 6.08 7Zm5.86 0a5.03 5.03 0 0 0-3.06-3.57c.59.93.96 2.19 1.04 3.57h2.02Zm0 2H9.92c-.08 1.38-.45 2.64-1.04 3.57A5.03 5.03 0 0 0 13.94 9Z"></path>' +
      "</svg>";
  }

  function createSwitcher(pathInfo) {
    var switcher = document.createElement("div");
    switcher.className = "fp-language-switcher";
    switcher.innerHTML =
      '<button type="button" class="fp-language-button" aria-label="Change language" aria-haspopup="true" aria-expanded="false">' +
      makeGlobeIcon() +
      '<span class="visually-hidden">Change language</span>' +
      "</button>" +
      '<div class="fp-language-menu" role="menu" hidden></div>';

    var menu = switcher.querySelector(".fp-language-menu");
    LANGUAGES.forEach(function (language) {
      var link = document.createElement("a");
      link.href = getCandidateUrl(language.code, pathInfo.route);
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
        resolveDestination(language.code, pathInfo.route).then(function (destination) {
          window.location.assign(destination);
        });
      });
      menu.appendChild(link);
    });

    var button = switcher.querySelector(".fp-language-button");
    button.addEventListener("click", function () {
      if (menu.hidden) {
        openMenu(switcher);
      } else {
        closeMenu(switcher);
      }
    });
    button.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu(switcher);
    });
    document.addEventListener("click", function (event) {
      if (!switcher.contains(event.target)) closeMenu(switcher);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu(switcher);
    });
    return switcher;
  }

  function requestExists(url) {
    return fetch(url, {
      method: "HEAD",
      cache: "no-store",
      credentials: "same-origin",
    }).then(function (response) {
      return response.ok;
    }).catch(function () {
      return false;
    });
  }

  function resolveDestination(language, route) {
    var candidate = getCandidateUrl(language, route);
    if (!route) return Promise.resolve(candidate);
    return requestExists(candidate).then(function (exists) {
      if (exists) return candidate;
      var toc = getCandidateUrl(language, "toc");
      return requestExists(toc).then(function (tocExists) {
        return tocExists ? toc : getLanguageRoot(language);
      });
    });
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
    addStylesheet();
    var pathInfo = getPathInfo();
    if (document.body.id === "pg_selectlang") {
      markRootSelection();
      return;
    }
    addContentSwitcher(pathInfo);
  }

  addStylesheet();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();