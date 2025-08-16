// @ts-nocheck
function scripture(book, chapter, verseFrom, verseTo) {
  return new Promise((resolve, reject) => {
    const endpoint = "https://api.usd21.org/services/scripture";
    const slug = verseTo
      ? `scripture-${book}-${chapter}-${verseFrom}-${verseTo}`
          .toLowerCase()
          .replaceAll(" ", "-")
      : `scripture-${book}-${chapter}-${verseFrom}`
          .toLowerCase()
          .replaceAll(" ", "-");
    const stored = localStorage.getItem(slug);

    if (stored && stored.length) {
      return resolve(JSON.parse(stored));
    }

    if (!verseTo) verseTo = verseFrom;

    if (!navigator.onLine) return resolve([]);

    fetch(endpoint, {
      mode: "cors",
      method: "POST",
      body: JSON.stringify({
        book: book,
        chapter: chapter,
        verseFrom: verseFrom,
        verseTo: verseTo,
      }),
      headers: new Headers({
        "Content-Type": "application/json",
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.msgType !== "success") {
          console.error(data.msg);
          return resolve([]);
        }

        // const textArray = data.scripture.map((item) => item.text);

        localStorage.setItem(
          slug.toLowerCase(),
          JSON.stringify(data.scripture)
        );

        return resolve(data.scripture);
      });
  });
}

function syncScriptures() {
  const promises = [];

  document.querySelectorAll("[data-scripture]").forEach((item) => {
    const data = item.getAttribute("data-scripture")?.split(",") || [];
    const book = data[0];
    const chapter = data[1];
    const verseFrom = data[2];
    const verseTo = data[3] ? data[3] : null;
    const promise = verseTo
      ? scripture(book, chapter, verseFrom, verseTo)
      : scripture(book, chapter, verseFrom);
    promises.push(promise);
  });

  Promise.all(promises).then(() => {
    linkifyScriptures();
  });
}

function linkifyScriptures() {
  document.querySelectorAll("[data-scripture]").forEach((item) => {
    const data = item.getAttribute("data-scripture")?.split(",") || [];
    const book = data[0];
    const chapter = data[1];
    const verseFrom = data[2];
    const verseTo = data[3] ? data[3] : null;
    const slug = verseTo
      ? `${book}-${chapter}-${verseFrom}-${verseTo}`.toLowerCase()
      : `${book}-${chapter}-${verseFrom}`.toLowerCase();
    const scriptureReference = item.getAttribute("data-scripture-title") || "";

    item.addEventListener("click", () =>
      showScripture(slug, scriptureReference)
    );
    item.classList.add("scriptureLink");
  });
}

function showScripture(slug, title) {
  slug = slug.replaceAll(" ", "-");
  slug = `scripture-${slug}`;

  const bibleVersion = " (NIV)";
  const verseStored = localStorage.getItem(slug);

  if (!verseStored) return;

  const verseArray = JSON.parse(verseStored);

  document.querySelector(
    "#scriptureModal .modal-title"
  ).innerHTML = `${title} <span class="bibleVersion">${bibleVersion}</span>`;

  let modalBody = "";

  if (verseArray.length === 1) {
    modalBody = verseArray[0].text;
  } else {
    verseArray.forEach((item) => {
      modalBody =
        modalBody +
        `
      <tr>
        <td valign="top">
          ${item.text}
        </div>
        <td valign="top">
          <span class="verseNum" inert>${item.verse}</span>
        </td>
      </tr>
    `;
    });
    modalBody = `<table class="table verses">${modalBody}</table>`;
  }

  const book = verseArray[0].book;
  const chapter = verseArray[0].chapter;
  const searchTerm = `${book} ${chapter}`;
  const href = `https://www.biblegateway.com/passage/?search=${searchTerm}&version=NIV`;

  const expandButton = `
    <div class="text-end">
      <hr>
      <a class="btn btn-light border border-dark my-3" href="${href}" target="_blank" rel="noopener noreferrer">
        <i>Expand</i>
        <img src="../_assets/img/icons/chevron-right.svg" />
      </a>
    </div>
  `;

  modalBody = modalBody + expandButton;

  document.querySelector("#scriptureModal .modal-body").innerHTML = modalBody;

  const scriptureModal = new bootstrap.Modal(
    document.getElementById("scriptureModal")
  );

  scriptureModal.show();
}

async function shareLink() {
  const shareLinkContainerEl = document.querySelector("#shareLinkContainer");
  const shareLinkEl = document.querySelector("#shareLink");

  if (!shareLinkContainerEl || !shareLinkEl) {
    console.warn("Share link elements not found");
    return;
  }

  // Start with current page URL
  const shareUrl = new URL(location.href);

  // Go one directory up
  shareUrl.pathname = shareUrl.pathname.replace(/\/[^/]*\/?$/, "/");

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
        title: "First Principles",
        text: "Use the First Principles app to study the Bible with someone!",
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

    switch (window.location.host) {
      case "127.0.0.1:5500":
        root = `${window.location.origin}${window.location.pathname}`.replace(
          "index.html",
          ""
        );
        globalRoot = "http://127.0.0.1:5500/";
        break;
      case "usd21developers.github.io":
        root = window.location.href;
        globalRoot = "https://usd21developers.github.io/first-principles-2025/";
        break;
      default:
        root = `https://${window.location.host}${window.location.pathname}`;
        globalRoot = `https://${window.location.host}`;
    }

    const defaultLang = document.querySelector("html").getAttribute("lang");
    const lang = navigator.languages[0].substr(0, 2) || defaultLang;
    let phrases;
    let phrasesGlobal;

    try {
      phrases = await fetch(`${root}i18n/${lang}.json`).then((res) =>
        res.json()
      );
    } catch (err) {
      console.log(err);
      return;
    }

    try {
      phrasesGlobal = await fetch(`${globalRoot}i18n-global/${lang}.json`).then(
        (res) => res.json()
      );
    } catch (err) {
      console.log(err);
      return;
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

    return resolve();
  });
}

syncScriptures();
shareLink();
translate();
