let phrases;
let phrasesGlobal;

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

// @ts-nocheck
function scripture(book, chapter, verseFrom, verseTo) {
  // @ts-ignore
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

  // @ts-ignore
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
        <i>${getGlobalPhrase("expand")}</i>
        <img src="../_assets/img/icons/chevron-right.svg" />
      </a>
    </div>
  `;

  modalBody = modalBody + expandButton;

  // @ts-ignore
  document.querySelector("#scriptureModal .modal-body").innerHTML = modalBody;

  // @ts-ignore
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
  // @ts-ignore
  return new Promise(async (resolve, reject) => {
    let root;
    let globalRoot;

    switch (window.location.host) {
      case "127.0.0.1:5500":
        root = window.location.href.replace("index.html", "");
        globalRoot = `${window.location.origin}/`;
        break;
      case "usd21developers.github.io":
        root = window.location.href;
        globalRoot = "https://usd21developers.github.io/first-principles-2025/";
        break;
      default:
        root = `https://${window.location.host}/${window.location.pathname}`;
        globalRoot = `https://${window.location.host}`;
    }

    // @ts-ignore
    const lang = document.querySelector("html").getAttribute("lang");

    try {
      phrases = await fetch(`${root}i18n/${lang}.json`).then((res) =>
        res.json()
      );
    } catch (err) {
      console.log(err);
      return resolve(err);
    }

    try {
      phrasesGlobal = await fetch(`${globalRoot}i18n-global/${lang}.json`).then(
        (res) => res.json()
      );
    } catch (err) {
      console.log(err);
      return resolve(err);
    }

    document.querySelectorAll("[data-i18n]").forEach((item) => {
      const key = item.getAttribute("data-i18n");
      // @ts-ignore
      const phrase = phrases[key];

      if (phrase) {
        item.innerHTML = phrase;
      }
    });

    document.querySelectorAll("[data-i18n-global]").forEach((item) => {
      const key = item.getAttribute("data-i18n-global");
      // @ts-ignore
      const phraseGlobal = phrasesGlobal[key];

      if (phraseGlobal) {
        item.innerHTML = phraseGlobal;
      }
    });

    // @ts-ignore
    return resolve();
  });
}
