async function init() {
  await translate();
  shareLink();
  hideSpinner();
}

init();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('../sw.js').catch(function (err) {
    console.error('Error registering service worker:', err);
  });
}
