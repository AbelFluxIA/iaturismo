import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA: Prevent service worker from running in iframes or preview environments
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
} else if ("serviceWorker" in navigator) {
  // Register PWA service worker in production
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      // virtual module unavailable — safe to ignore
    });
}

createRoot(document.getElementById("root")!).render(<App />);
