let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // Prevent the auto banner
  deferredPrompt = e;

  // Save a flag in sessionStorage so the main page knows install is available
  sessionStorage.setItem("pwaInstallAvailable", "true");

  // Unhide the install button
  if (sessionStorage.getItem("pwaInstallAvailable") === "true") {
    document.querySelector("#installContainer")?.classList.remove("d-none");
  }
});

// Expose a helper for other scripts to trigger the prompt
window.triggerPwaInstall = async () => {
  if (!deferredPrompt) return false;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  sessionStorage.removeItem("pwaInstallAvailable");

  if (outcome === "accepted") {
    document.querySelector("#installContainer")?.classList.add("d-none");
  }

  return outcome; // "accepted" or "dismissed"
};
