"use strict";
/**
 * Distributed with Ultraviolet and compatible with most configurations.
 */
const stockSW = "/uv-sw.js";

/**
 * List of hostnames that are allowed to run serviceworkers on http:
 */
const swAllowedHostnames = ["localhost", "127.0.0.1"];

/**
 * Global util
 * Used in 404.html and index.html
 */
async function registerSW() {
  if (
    location.protocol !== "https:" &&
    !swAllowedHostnames.includes(location.hostname)
  )
    throw new Error("Service workers cannot be registered without https.");

  if (!navigator.serviceWorker)
    throw new Error("Your browser doesn't support service workers.");

  // Ultraviolet has a stock `sw.js` script.
  // Pass a custom proxy server (set in Settings) to the service worker.
  let swUrl = stockSW;
  try {
    const bare = localStorage.getItem("bareServer");
    if (bare) swUrl += "?bare=" + encodeURIComponent(bare);
  } catch (e) {}

  await navigator.serviceWorker.register(swUrl, {
    scope: __uv$config.prefix,
  });
}
