async function init() {
  await translate();
  markReferenceOnlyScriptures();
  linkifyScriptures();
  shareLink();
  hideSpinner();
}

function markReferenceOnlyScriptures() {
  document.querySelectorAll("[data-scripture]").forEach((item) => {
    if (item.getAttribute("data-scripture") !== "1Timothy,4,16") {
      item.setAttribute("data-scripture-offline", "false");
    }
  });
}

init();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("../sw.js").catch((error) => {
    console.error("Error in registering service worker:", error);
  });
}