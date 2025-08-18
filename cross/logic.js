async function init() {
  await translate();
  await syncScriptures();
  shareLink();
}

init();
