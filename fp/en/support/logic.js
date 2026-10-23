function populateFamilyOfChurchesLink() {
  const el = document.querySelector("#familyOfChurchesLink");
  if (!el) return;
  const url = getPhrase("familyOfChurchesLinkUrl");
  el.setAttribute("href", url);
}

async function init() {
  await translate();
  shareLink();
  populateFamilyOfChurchesLink();
  hideSpinner();
}

init();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("../sw.js").catch((error) => {
    console.error("Error in registering service worker:", error);
  });
}