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

        const textArray = data.scripture.map((item) => item.text);

        localStorage.setItem(slug.toLowerCase(), JSON.stringify(textArray));

        return resolve(textArray);
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

  const verseStored = localStorage.getItem(slug);

  if (!verseStored) return;

  const verseArray = JSON.parse(verseStored);

  document.querySelector("#scriptureModal .modal-title").innerHTML = title;

  let modalBody = "";

  verseArray.forEach((verse) => {
    modalBody = modalBody + `<div>${verse}</div>`;
  });

  document.querySelector("#scriptureModal .modal-body").innerHTML = modalBody;

  const scriptureModal = new bootstrap.Modal(
    document.getElementById("scriptureModal")
  );

  scriptureModal.show();
}

syncScriptures();
