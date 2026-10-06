const SW_URL = "/sw.js";

export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;
  void navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch((error) => {
    console.warn("Kings Food offline cache could not be registered", error);
  });
}