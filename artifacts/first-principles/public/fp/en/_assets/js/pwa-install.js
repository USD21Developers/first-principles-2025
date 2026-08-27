let deferredPrompt = null;

const fpServiceWorker = (() => {
  if (!("serviceWorker" in navigator)) return null;

  const container = navigator.serviceWorker;
  const nativeRegister = container.register.bind(container);
  const workerUrl = new URL("/fp/sw.js", window.location.origin).href;
  const workerScope = new URL("/fp/", window.location.origin).href;
  let registrationPromise = null;

  const showReloadControl = () => {
    if (document.querySelector("#fp-pwa-update")) return;
    const button = document.createElement("button");
    button.id = "fp-pwa-update";
    button.type = "button";
    button.textContent = "New version available — reload";
    button.setAttribute("aria-label", "Reload First Principles to use the new version");
    Object.assign(button.style, {
      position: "fixed", left: "50%", bottom: "1rem", zIndex: "2147483647",
      transform: "translateX(-50%)", padding: ".6rem .9rem", border: "1px solid #fff",
      borderRadius: ".25rem", background: "#212529", color: "#fff", font: "inherit",
      boxShadow: "0 2px 8px rgba(0,0,0,.35)", cursor: "pointer",
    });
    button.addEventListener("click", () => window.location.reload());
    document.body.appendChild(button);
  };

  const watchRegistration = (registration) => {
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "activated" && navigator.serviceWorker.controller) {
          showReloadControl();
        }
      });
    });
  };

  const unregisterLegacyWorkers = async () => {
    const registrations = await container.getRegistrations();
    await Promise.all(registrations.map((registration) => {
      const scope = new URL(registration.scope);
      return scope.href.startsWith(workerScope) && scope.href !== workerScope
        ? registration.unregister()
        : Promise.resolve(false);
    }));
  };

  const register = () => {
    if (!registrationPromise) {
      registrationPromise = nativeRegister(workerUrl, {
        scope: "/fp/",
        updateViaCache: "none",
      }).then(async (registration) => {
        watchRegistration(registration);
        await unregisterLegacyWorkers();
        await registration.update();
        return registration;
      }).catch((error) => {
        registrationPromise = null;
        console.error("Error in registering service worker:", error);
        throw error;
      });
    }
    return registrationPromise;
  };

  const originalRegister = container.register.bind(container);
  container.register = (scriptUrl, options) => {
    const requested = new URL(scriptUrl, window.location.href);
    return requested.pathname.endsWith("/sw.js")
      && requested.pathname.startsWith("/fp/")
      ? register()
      : originalRegister(scriptUrl, options);
  };

  window.addEventListener("load", () => register().catch(() => {}), { once: true });
  return { register };
})();

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
