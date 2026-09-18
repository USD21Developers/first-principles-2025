function showLicenseText() {
  return new Promise((resolve, reject) => {
    const endpoint = "gplv3.txt";
    const el = document.querySelector("pre");

    fetch(endpoint)
      .then((res) => res.text())
      .then((license) => {
        el.innerText = license;
        return resolve(license);
      });
  });
}

async function init() {
  await translate();
  linkifyScriptures();
  shareLink();
  await showLicenseText();
  hideSpinner();
}

init();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("../sw.js").catch((error) => {
    console.error("Error in registering service worker:", error);
  });
}
