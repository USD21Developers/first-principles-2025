let phrases;
let phrasesGlobal;
let bibles = {
  en: "NIV",
  es: "NVI",
};

function hideSpinner() {
  const main = document.querySelector(".master-container");
  const spinner = document.querySelector("#spinner");

  spinner?.classList.add("d-none");
  main?.classList.remove("d-none");
}

function getPhrase(key) {
  return phrases[key];
}

function getGlobalPhrase(key) {
  return phrasesGlobal[key];
}

function linkifyScriptures() {
  const htmlEl = document.querySelector("html");

  if (!htmlEl.hasAttribute("lang")) return;

  let lang = htmlEl.getAttribute("lang");

  document.querySelectorAll("[data-scripture]").forEach((item) => {
    if (!bibles[lang]) lang = "en";

    const data = item.getAttribute("data-scripture")?.split(",") || [];
    const book = data[0];
    const chapter = data[1];
    const verseFrom = data[2];
    const verseTo = data[3] ? data[3] : null;
    const slug = verseTo
      ? `${book}-${chapter}-${verseFrom}-${verseTo}`
          .toLowerCase()
          .replaceAll(" ", "-")
      : `${book}-${chapter}-${verseFrom}`.toLowerCase().replaceAll(" ", "-");

    item.addEventListener("click", () => showLocalScripture(slug));
    item.classList.add("scriptureLink");
  });
}

function showLocalScripture(slug) {
  return new Promise((resolve, reject) => {
    const htmlEl = document.querySelector("html");
    const lang = htmlEl.getAttribute("lang");

    const endpoint = `../_assets/scriptures/${lang}/${slug}.json`;

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        document.querySelector(
          "#scriptureModal .modal-title"
        ).innerHTML = `${data.display} <span class="bibleVersion">(${data.version})</span>`;

        let modalBody = "";

        if (data.verses.length === 1) {
          const verseText = data.verses[0][1];
          modalBody = verseText;
        } else {
          data.verses.forEach((verse) => {
            const verseNum = verse[0];
            const verseText = verse[1];
            modalBody =
              modalBody +
              `
                <tr>
                  <td valign="top">
                    ${verseText}
                  </div>
                  <td valign="top">
                    <span class="verseNum" inert>${verseNum}</span>
                  </td>
                </tr>
              `;
          });
        }

        modalBody = `<table class="table verses">${modalBody}</table>`;

        const searchTerm = `${data.book} ${data.chapter}`;
        const href = `https://www.biblegateway.com/passage/?search=${searchTerm}&version=${data.version}`;

        const expandButton = `
            <div class="text-end">
              <hr>
              <a class="btn btn-light border border-dark my-3" href="${href}" target="_blank" rel="noopener noreferrer">
                <i>${getGlobalPhrase("expand")}</i>
                <img src="../_assets/img/icons/chevron-right.svg" />
              </a>
            </div>
          `;

        modalBody = modalBody + expandButton;

        document.querySelector("#scriptureModal .modal-body").innerHTML =
          modalBody;

        const scriptureModal = new bootstrap.Modal(
          document.getElementById("scriptureModal")
        );

        scriptureModal.show();
      });
  });
}

async function shareLink() {
  const shareLinkContainerEl = document.querySelector("#shareLinkContainer");
  const shareLinkEl = document.querySelector("#shareLink");

  if (!shareLinkContainerEl || !shareLinkEl) {
    console.warn("Share link elements not found");
    return;
  }

  // Start with current page URL
  const shareUrl = "https://usd21.app/fp/en/";

  if (
    !navigator.canShare ||
    !navigator.canShare({ url: shareUrl.toString() })
  ) {
    console.warn("Web Share API not supported or cannot share this URL");
    return;
  }

  // Show share link only if supported
  shareLinkContainerEl.classList.remove("d-none");

  shareLinkEl.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();

      const shareData = {
        title: getGlobalPhrase("shareTitle"),
        text: getGlobalPhrase("shareText"),
        url: shareUrl.toString(),
      };

      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Share failed:", err);
      }
    },
    { once: true } // Prevent duplicate listeners
  );
}

function translate() {
  return new Promise(async (resolve, reject) => {
    let root;
    let globalRoot;
    let endpoint;

    let lang = document.querySelector("html").getAttribute("lang");

    switch (window.location.host) {
      case "127.0.0.1:5500":
        root = window.location.href.replace("index.html", "");
        globalRoot = `${window.location.origin}/fp/${lang}`;
        endpoint = `${root}i18n/${lang}.json`;
        break;
      case "usd21developers.github.io":
        root = window.location.href;
        globalRoot =
          `https://usd21developers.github.io/first-principles-2025/fp/${lang}`;
        endpoint = `${root}i18n/${lang}.json`;
        break;
      default:
        root = `https://${window.location.host}${window.location.pathname}`;
        globalRoot = `https://${window.location.host}/fp/${lang}`;
        endpoint = `${root}i18n/${lang}.json`;
    }

    try {
      phrases = await fetch(endpoint).then((res) => res.json());
    } catch (err) {
      console.log(err);
      return resolve(err);
    }

    try {
      phrasesGlobal = await fetch(
        `${globalRoot}/i18n-global/${lang}.json`
      ).then((res) => res.json());
    } catch (err) {
      console.log(err);
      return resolve(err);
    }

    document.querySelectorAll("[data-i18n]").forEach((item) => {
      const key = item.getAttribute("data-i18n");
      const phrase = phrases[key];

      if (phrase) {
        item.innerHTML = phrase;
      }
    });

    document.querySelectorAll("[data-i18n-global]").forEach((item) => {
      const key = item.getAttribute("data-i18n-global");
      const phraseGlobal = phrasesGlobal[key];

      if (phraseGlobal) {
        item.innerHTML = phraseGlobal;
      }
    });

    const decorationsEndpoint = `./i18n/${lang}-decorations.json`;

    fetch(decorationsEndpoint)
      .then((res) => res.json())
      .then((decorations) => {
        for (let i = 0; i < decorations.length; i++) {
          const item = decorations[i];
          let decorated = item.text.translated;

          if (item.decorations.link) {
            decorated = `<a href="${item.decorations.link.href}" ${item.decorations.link.attributes}>${decorated}</a>`;
          }

          if (item.decorations.tags) {
            item.decorations.tags.forEach((tag) => {
              decorated = `<${tag.name} ${tag.attributes}>${decorated}</${tag.name}>`;
            });
          }

          if (item.decorations.bold) {
            decorated = `<strong>${decorated}</strong>`;
          }

          if (item.decorations.italic) {
            decorated = `<em>${decorated}</em>`;
          }

          if (item.decorations.underline) {
            decorated = `<u>${decorated}</u>`;
          }

          const el = document.querySelector(`[data-i18n="${item.key}"]`);

          if (!el) continue;

          let newContent = el.innerHTML;

          newContent = newContent.replace(item.text.translated, decorated);

          el.innerHTML = newContent;
        }

        document
          .querySelectorAll("[data-alt-i18n][data-img-path][data-img-ext]")
          .forEach((img) => {
            const alt = img.getAttribute("data-alt-i18n");
            const path = img.getAttribute("data-img-path");
            const ext = img.getAttribute("data-img-ext");
            const src = `${path}-${lang}.${ext}`;

            img.setAttribute("src", src);
            img.setAttribute("alt", getPhrase(alt));
          });

        const ogTitleEl = document.querySelector("meta[property='og:title']");
        const ogDescriptionEl = document.querySelector(
          "meta[property='og:description']"
        );
        const ogImageAltEl = document.querySelector(
          "meta[property='og:image:alt']"
        );

        ogTitleEl?.setAttribute("content", getGlobalPhrase("shareTitle"));
        ogDescriptionEl?.setAttribute("content", getGlobalPhrase("shareText"));
        ogImageAltEl?.setAttribute("content", getGlobalPhrase("ogImageAlt"));

        return resolve();
      })
      .catch((err) => {
        return resolve();
      });
  });
}

(function stopSpeechOnNav() {
  function stopSpeech() {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
    }
  }

  // Normal page unload
  window.addEventListener("beforeunload", stopSpeech);

  // Page restored from bfcache
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) stopSpeech();
  });

  // On every fresh page load
  document.addEventListener("DOMContentLoaded", stopSpeech);
})();
