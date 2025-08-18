function localizeNumbers() {
  const userLocale = navigator.language || "en-US";
  document
    .querySelector("tbody.numerals")
    .querySelectorAll("td")
    .forEach((el) => {
      if (isNaN(el.innerText)) {
        return;
      }

      const num = parseFloat(el.innerText);
      const formatted = new Intl.NumberFormat(userLocale).format(num);
      el.textContent = formatted;
    });
}

async function init() {
  await translate();
  await syncScriptures();
  shareLink();
  localizeNumbers();
  hideSpinner();
}

init();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("../sw.js").catch((error) => {
    console.error("Error in registering service worker:", error);
  });
}
