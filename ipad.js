/*
 * Shared tablet / touch helpers (iPad, iPhone, Android tablets).
 *  - keeps a correct full-height CSS variable on rotation / Safari toolbar changes
 *  - scales fixed-size game frames down so they fit on a tablet screen
 *  - on-screen keyboard controls for game pages on touch devices
 *  - warns when the proxy (bare) server cannot be reached
 */
(function () {
  "use strict";

  var isTouch =
    (navigator.maxTouchPoints || 0) > 0 ||
    "ontouchstart" in window ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

  /* ---------------- full-height variable ---------------- */
  function setAppHeight() {
    document.documentElement.style.setProperty("--app-height", window.innerHeight + "px");
  }
  setAppHeight();
  window.addEventListener("resize", setAppHeight);
  window.addEventListener("orientationchange", function () {
    setTimeout(setAppHeight, 250);
  });

  /* ---------------- fit fixed-size frames ---------------- */
  function fitFixed() {
    var els = document.querySelectorAll("[data-fit-width]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var w = parseFloat(el.getAttribute("data-fit-width"));
      var h = parseFloat(el.getAttribute("data-fit-height")) || 0;
      var s = window.innerWidth / w;
      if (h) s = Math.min(s, window.innerHeight / h);
      s = Math.min(s, 1);
      el.style.transformOrigin = "top center";
      el.style.transform = "translate(-50%, 0) scale(" + s + ")";
    }
  }

  /* ---------------- on-screen game controls ---------------- */
  var KEYS = {
    ArrowUp: { code: "ArrowUp", keyCode: 38 },
    ArrowDown: { code: "ArrowDown", keyCode: 40 },
    ArrowLeft: { code: "ArrowLeft", keyCode: 37 },
    ArrowRight: { code: "ArrowRight", keyCode: 39 },
    w: { code: "KeyW", keyCode: 87 },
    a: { code: "KeyA", keyCode: 65 },
    s: { code: "KeyS", keyCode: 83 },
    d: { code: "KeyD", keyCode: 68 },
    " ": { code: "Space", keyCode: 32 },
    Enter: { code: "Enter", keyCode: 13 },
    Shift: { code: "ShiftLeft", keyCode: 16 },
  };

  // All same-origin windows inside this page (proxied games are same-origin).
  function collectWindows(win, out) {
    out.push(win);
    var frames = [];
    try {
      frames = win.document.querySelectorAll("iframe, frame");
    } catch (e) {
      return out;
    }
    for (var i = 0; i < frames.length; i++) {
      try {
        var cw = frames[i].contentWindow;
        if (cw && cw.document) collectWindows(cw, out);
      } catch (e) {
        /* cross-origin frame, skip */
      }
    }
    return out;
  }

  function sendKey(type, key) {
    var info = KEYS[key];
    if (!info) return;
    var wins = collectWindows(window, []);
    // Skip the top page itself unless it's the only window (avoid double handling).
    if (wins.length > 1) wins.shift();
    for (var i = 0; i < wins.length; i++) {
      var w = wins[i];
      try {
        var doc = w.document;
        var target = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : doc.querySelector("canvas") || doc.body || doc;
        var Ctor = w.KeyboardEvent || KeyboardEvent;
        var ev = new Ctor(type, {
          key: key,
          code: info.code,
          bubbles: true,
          cancelable: true,
          composed: true,
        });
        try {
          Object.defineProperty(ev, "keyCode", { get: function () { return info.keyCode; } });
          Object.defineProperty(ev, "which", { get: function () { return info.keyCode; } });
          Object.defineProperty(ev, "charCode", { get: function () { return type === "keypress" ? info.keyCode : 0; } });
        } catch (e) {}
        target.dispatchEvent(ev); // bubbles up to document and window
      } catch (e) {}
    }
  }

  function buildControls() {
    if (document.getElementById("dm-touch-toggle")) return;

    var wasd = false;
    try { wasd = localStorage.getItem("dmTouchWasd") === "1"; } catch (e) {}

    var toggle = document.createElement("div");
    toggle.id = "dm-touch-toggle";
    toggle.textContent = "🎮";
    toggle.title = "Touch controls";

    var pad = document.createElement("div");
    pad.id = "dm-touch-pad";

    var left = document.createElement("div");
    left.className = "dm-cluster left";
    var right = document.createElement("div");
    right.className = "dm-cluster right";
    pad.appendChild(left);
    pad.appendChild(right);

    var dirs = [
      { cls: "up", arrow: "ArrowUp", letter: "w", label: "▲" },
      { cls: "left", arrow: "ArrowLeft", letter: "a", label: "◀" },
      { cls: "right", arrow: "ArrowRight", letter: "d", label: "▶" },
      { cls: "bottom", arrow: "ArrowDown", letter: "s", label: "▼" },
    ];

    function bindKey(el, getKey) {
      var active = null;
      function down(e) {
        e.preventDefault();
        if (active) return;
        active = getKey();
        el.classList.add("down");
        sendKey("keydown", active);
        if (active === " " || active === "Enter") sendKey("keypress", active);
        if (el.setPointerCapture && e.pointerId !== undefined) {
          try { el.setPointerCapture(e.pointerId); } catch (err) {}
        }
      }
      function up(e) {
        if (e) e.preventDefault();
        if (!active) return;
        sendKey("keyup", active);
        active = null;
        el.classList.remove("down");
      }
      if (window.PointerEvent) {
        el.addEventListener("pointerdown", down);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
        el.addEventListener("lostpointercapture", function () { up(); });
      } else {
        el.addEventListener("touchstart", down, { passive: false });
        el.addEventListener("touchend", up, { passive: false });
        el.addEventListener("touchcancel", up, { passive: false });
      }
      el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    }

    dirs.forEach(function (d) {
      var k = document.createElement("div");
      k.className = "dm-key " + d.cls;
      k.textContent = d.label;
      bindKey(k, function () { return wasd ? d.letter : d.arrow; });
      left.appendChild(k);
    });

    var mode = document.createElement("div");
    mode.className = "dm-key mode";
    function renderMode() { mode.textContent = wasd ? "WASD" : "←→"; }
    renderMode();
    mode.addEventListener("click", function () {
      wasd = !wasd;
      try { localStorage.setItem("dmTouchWasd", wasd ? "1" : "0"); } catch (e) {}
      renderMode();
    });
    left.appendChild(mode);

    [
      { key: " ", label: "Space" },
      { key: "Enter", label: "Enter" },
      { key: "Shift", label: "Shift" },
    ].forEach(function (b) {
      var k = document.createElement("div");
      k.className = "dm-key";
      k.textContent = b.label;
      bindKey(k, function () { return b.key; });
      right.appendChild(k);
    });

    var on = false;
    try { on = sessionStorage.getItem("dmTouchOn") === "1"; } catch (e) {}
    function render() {
      pad.className = on ? "on" : "";
      toggle.style.background = on ? "rgba(255,255,255,0.4)" : "";
    }
    render();
    toggle.addEventListener("click", function () {
      on = !on;
      try { sessionStorage.setItem("dmTouchOn", on ? "1" : "0"); } catch (e) {}
      render();
    });

    document.body.appendChild(pad);
    document.body.appendChild(toggle);
  }

  /* ---------------- proxy server check ---------------- */
  function checkProxy() {
    var cfg = window.__uv$config;
    if (!cfg || !cfg.bare || !window.fetch) return;
    var url = typeof cfg.bare === "string" ? cfg.bare : cfg.bare[0];
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    fetch(url, { mode: "no-cors", cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
      .then(function () { clearTimeout(timer); })
      .catch(function () {
        clearTimeout(timer);
        if (document.getElementById("dm-proxy-banner")) return;
        var b = document.createElement("div");
        b.id = "dm-proxy-banner";
        b.innerHTML =
          "The proxy server can't be reached, so websites and most games won't load. " +
          '<a id="dm-proxy-settings">Set a working proxy server in Settings</a>' +
          '<button type="button" id="dm-proxy-close">OK</button>';
        document.body.appendChild(b);
        document.getElementById("dm-proxy-close").onclick = function () { b.remove(); };
        document.getElementById("dm-proxy-settings").onclick = function () {
          window.location.href = "/settings";
        };
      });
  }

  window.DMiPad = { isTouch: isTouch, sendKey: sendKey, checkProxy: checkProxy, fitFixed: fitFixed };

  function init() {
    fitFixed();
    window.addEventListener("resize", fitFixed);
    if (isTouch && /^\/games\/gfiles\//.test(location.pathname)) buildControls();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
