/**
 * CycleDesk Embeddable Booking Widget
 * ====================================
 * Drop-in script that adds a floating "Book Now" button and slideout booking panel
 * to any website.
 *
 * Usage:
 *   <script src="https://yourapp.com/widget/cycledesk-widget.js"
 *           data-shop="my-shop-slug"
 *           data-color="#1a6b5a"
 *           data-position="bottom-right"
 *           data-label="Book Now"
 *           data-hide-fab="false"
 *           async></script>
 *
 * Required: data-shop
 */
(function () {
  "use strict";

  // ── Prevent double-init ────────────────────────────────────────────────────
  if (window.__cycledeskWidget) return;
  window.__cycledeskWidget = true;

  // ── Read config from script tag ────────────────────────────────────────────
  var scriptTag = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf("cycledesk-widget") !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  if (!scriptTag) {
    console.warn("[CycleDesk] Could not find widget script tag.");
    return;
  }

  var shopSlug = scriptTag.getAttribute("data-shop");
  if (!shopSlug) {
    console.warn("[CycleDesk] Missing required data-shop attribute.");
    return;
  }

  // Derive BASE_URL from script src
  var scriptSrc = scriptTag.src;
  var baseUrl = scriptSrc.replace(/\/widget\/cycledesk-widget\.js.*$/, "");

  var dataColor = scriptTag.getAttribute("data-color");
  var dataPosition = scriptTag.getAttribute("data-position");
  var dataLabel = scriptTag.getAttribute("data-label");
  var dataHideFab = scriptTag.getAttribute("data-hide-fab") === "true";

  // Defaults (overridden by API config if available)
  var config = {
    shopSlug: shopSlug,
    buttonColor: dataColor || "#1a6b5a",
    buttonPosition: dataPosition || "bottom-right",
    buttonLabel: dataLabel || "Book Now",
    hideFab: dataHideFab,
  };

  // ── Fetch remote config (best-effort) ──────────────────────────────────────
  function fetchConfig() {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", baseUrl + "/api/public/widget/" + shopSlug, true);
      xhr.timeout = 5000;
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            var remote = JSON.parse(xhr.responseText);
            // Only apply remote values if no data-* override was set
            if (!dataColor && remote.buttonColor) config.buttonColor = remote.buttonColor;
            if (!dataPosition && remote.buttonPosition) config.buttonPosition = remote.buttonPosition;
            if (!dataLabel && remote.buttonLabel) config.buttonLabel = remote.buttonLabel;
            if (!dataHideFab && remote.hideFab) config.hideFab = remote.hideFab;
            // Re-apply styles after config update
            applyConfigStyles();
          } catch (e) { /* ignore parse errors */ }
        }
      };
      xhr.send();
    } catch (e) { /* best-effort */ }
  }

  // ── Ping (fire-and-forget, first load only) ────────────────────────────────
  function pingInstall() {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", baseUrl + "/api/public/widget/" + shopSlug + "/ping", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send("{}");
    } catch (e) { /* fire-and-forget */ }
  }

  // ── Inject CSS ─────────────────────────────────────────────────────────────
  var CSS_ID = "cycledesk-widget-styles";

  function injectStyles() {
    if (document.getElementById(CSS_ID)) return;
    var style = document.createElement("style");
    style.id = CSS_ID;
    style.textContent = [
      /* Overlay */
      ".cycledesk-overlay {",
      "  position: fixed; inset: 0; z-index: 999998;",
      "  background: rgba(0,0,0,0.4);",
      "  opacity: 0; transition: opacity 0.25s ease;",
      "  pointer-events: none;",
      "}",
      ".cycledesk-overlay.cycledesk-open {",
      "  opacity: 1; pointer-events: auto;",
      "}",

      /* Panel */
      ".cycledesk-panel {",
      "  position: fixed; top: 0; bottom: 0; z-index: 999999;",
      "  width: 420px; max-width: 100vw;",
      "  background: #fff;",
      "  box-shadow: -4px 0 24px rgba(0,0,0,0.15);",
      "  transform: translateX(110%);",
      "  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);",
      "  display: flex; flex-direction: column;",
      "}",
      ".cycledesk-panel.cycledesk-left {",
      "  left: 0; right: auto;",
      "  transform: translateX(-110%);",
      "}",
      ".cycledesk-panel.cycledesk-right {",
      "  right: 0; left: auto;",
      "  transform: translateX(110%);",
      "}",
      ".cycledesk-panel.cycledesk-open {",
      "  transform: translateX(0);",
      "}",

      /* Panel header */
      ".cycledesk-panel-header {",
      "  display: flex; align-items: center; justify-content: space-between;",
      "  padding: 12px 16px; border-bottom: 1px solid #e5e5e5;",
      "  background: #fafafa; flex-shrink: 0;",
      "}",
      ".cycledesk-panel-title {",
      "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
      "  font-size: 14px; font-weight: 600; color: #222; margin: 0;",
      "}",
      ".cycledesk-close-btn {",
      "  background: none; border: none; cursor: pointer;",
      "  width: 32px; height: 32px; border-radius: 6px;",
      "  display: flex; align-items: center; justify-content: center;",
      "  color: #666; transition: background 0.15s;",
      "}",
      ".cycledesk-close-btn:hover { background: #eee; color: #333; }",

      /* Iframe */
      ".cycledesk-iframe {",
      "  flex: 1; border: none; width: 100%; height: 100%;",
      "}",

      /* FAB */
      ".cycledesk-fab {",
      "  position: fixed; z-index: 999997;",
      "  padding: 0 20px; height: 48px;",
      "  border: none; border-radius: 24px; cursor: pointer;",
      "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
      "  font-size: 15px; font-weight: 600; color: #fff;",
      "  box-shadow: 0 4px 16px rgba(0,0,0,0.18);",
      "  transition: transform 0.15s ease, box-shadow 0.15s ease;",
      "  display: flex; align-items: center; gap: 8px;",
      "}",
      ".cycledesk-fab:hover {",
      "  transform: translateY(-2px);",
      "  box-shadow: 0 6px 20px rgba(0,0,0,0.22);",
      "}",
      ".cycledesk-fab.cycledesk-bottom-right { right: 20px; bottom: 20px; }",
      ".cycledesk-fab.cycledesk-bottom-left { left: 20px; bottom: 20px; }",

      /* FAB icon (calendar) */
      ".cycledesk-fab-icon {",
      "  width: 18px; height: 18px; fill: currentColor;",
      "}",

      /* Mobile */
      "@media (max-width: 768px) {",
      "  .cycledesk-panel { width: 100vw; }",
      "  .cycledesk-fab { right: 12px; bottom: 12px; left: auto; }",
      "  .cycledesk-fab.cycledesk-bottom-left { left: 12px; right: auto; }",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  // ── DOM elements ───────────────────────────────────────────────────────────
  var overlay = null;
  var panel = null;
  var iframe = null;
  var fab = null;
  var isOpen = false;

  function createOverlay() {
    overlay = document.createElement("div");
    overlay.className = "cycledesk-overlay";
    overlay.addEventListener("click", closeWidget);
    document.body.appendChild(overlay);
  }

  function createPanel() {
    var side = config.buttonPosition === "bottom-left" ? "left" : "right";

    panel = document.createElement("div");
    panel.className = "cycledesk-panel cycledesk-" + side;

    // Header
    var header = document.createElement("div");
    header.className = "cycledesk-panel-header";

    var title = document.createElement("span");
    title.className = "cycledesk-panel-title";
    title.textContent = "Book a Service";

    var closeBtn = document.createElement("button");
    closeBtn.className = "cycledesk-close-btn";
    closeBtn.setAttribute("aria-label", "Close booking panel");
    closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    closeBtn.addEventListener("click", closeWidget);

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Iframe
    iframe = document.createElement("iframe");
    iframe.className = "cycledesk-iframe";
    iframe.setAttribute("allow", "geolocation");
    iframe.setAttribute("loading", "lazy");
    // Do not set src until open — saves initial load
    panel.appendChild(iframe);

    document.body.appendChild(panel);
  }

  function createFab() {
    if (config.hideFab) return;

    fab = document.createElement("button");
    fab.className = "cycledesk-fab cycledesk-" + config.buttonPosition.replace("-", "-");
    fab.setAttribute("aria-label", config.buttonLabel);
    fab.innerHTML =
      '<svg class="cycledesk-fab-icon" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>' +
      "<span>" + escapeHtml(config.buttonLabel) + "</span>";
    fab.style.backgroundColor = config.buttonColor;
    fab.addEventListener("click", openWidget);
    document.body.appendChild(fab);
  }

  function applyConfigStyles() {
    if (fab) {
      fab.style.backgroundColor = config.buttonColor;
      var labelSpan = fab.querySelector("span");
      if (labelSpan) labelSpan.textContent = config.buttonLabel;
      fab.className = "cycledesk-fab cycledesk-" + config.buttonPosition;
    }
  }

  // ── Open / Close ───────────────────────────────────────────────────────────
  function openWidget() {
    if (isOpen) return;
    isOpen = true;

    if (!overlay) createOverlay();
    if (!panel) createPanel();

    var iframeSrc = baseUrl + "/book/start?shopSlug=" + encodeURIComponent(shopSlug) + "&embedded=true";
    if (iframe && iframe.src !== iframeSrc) {
      iframe.src = iframeSrc;
    }

    // Force reflow before adding open class for CSS transition
    if (overlay) void overlay.offsetHeight;
    if (panel) void panel.offsetHeight;

    requestAnimationFrame(function () {
      if (overlay) overlay.classList.add("cycledesk-open");
      if (panel) panel.classList.add("cycledesk-open");
    });
  }

  function closeWidget() {
    if (!isOpen) return;
    isOpen = false;

    if (overlay) overlay.classList.remove("cycledesk-open");
    if (panel) panel.classList.remove("cycledesk-open");
  }

  // ── postMessage listener ───────────────────────────────────────────────────
  function onMessage(event) {
    // Validate origin
    if (event.origin !== baseUrl) return;

    var data = event.data;
    if (!data || typeof data !== "object" || typeof data.type !== "string") return;

    switch (data.type) {
      case "cycledesk:close":
        closeWidget();
        break;
      case "cycledesk:success":
        // Optionally keep panel open a moment for the user to see success,
        // then close after 2s
        setTimeout(closeWidget, 2000);
        break;
      case "cycledesk:ready":
        // iframe is ready
        break;
    }
  }

  // ── Escape key ─────────────────────────────────────────────────────────────
  function onKeyDown(event) {
    if (event.key === "Escape" && isOpen) {
      closeWidget();
    }
  }

  // ── Attach click handlers to trigger elements ──────────────────────────────
  function attachTriggers(root) {
    var triggers = root.querySelectorAll('[data-cycledesk="book"]');
    for (var i = 0; i < triggers.length; i++) {
      var el = triggers[i];
      if (!el.__cycledeskBound) {
        el.__cycledeskBound = true;
        el.addEventListener("click", function (e) {
          e.preventDefault();
          openWidget();
        });
      }
    }
  }

  // ── MutationObserver for dynamic triggers ──────────────────────────────────
  function observeDom() {
    if (typeof MutationObserver === "undefined") return;
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var addedNodes = mutations[i].addedNodes;
        for (var j = 0; j < addedNodes.length; j++) {
          var node = addedNodes[j];
          if (node.nodeType === 1) {
            if (node.getAttribute && node.getAttribute("data-cycledesk") === "book") {
              attachTriggers(node.parentNode || document.body);
            } else if (node.querySelectorAll) {
              attachTriggers(node);
            }
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Utility ────────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    createFab();
    attachTriggers(document);
    observeDom();
    window.addEventListener("message", onMessage);
    document.addEventListener("keydown", onKeyDown);

    // Fetch remote config and ping install
    fetchConfig();
    pingInstall();
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
