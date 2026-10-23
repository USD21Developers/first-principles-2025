async function init() {
  await translate();
  linkifyScriptures();
  document.querySelectorAll("[data-scripture]").forEach((reference) => {
    reference.setAttribute("role", "button");
    reference.setAttribute("tabindex", "0");
    reference.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        reference.click();
      }
    });
  });
  shareLink();
  hideSpinner();
}

init();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("../sw.js").catch((error) => {
    console.error("Error in registering service worker:", error);
  });
}