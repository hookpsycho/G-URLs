// ==UserScript==
// @name         G-URLs
// @version      2.0.2
// @description  Extract Clean URLs From Google Search Results
// @author       hook
// @match        *://www.google.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.11/clipboard.min.js
// @run-at       document-end
// @icon         https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png
// @updateURL    https://github.com/hookpsycho/G-URLs/raw/main/G-URLs.js
// @downloadURL  https://github.com/hookpsycho/G-URLs/raw/main/G-URLs.js
// ==/UserScript==

(() => {
  // Prefix
  const Prefix = atob("aHR0cHM6Ly9naXRodWIuY29tL2hvb2twc3ljaG8=") + "\t";

  // Config
  const Interval = 665;
  const Delay = 301;
  const Storage = ["sb_wiz.zpc.gws-wiz-serp.", "_grecaptcha"];

  // Log
  const Log = (msg, type = "info") => {
    const fullMsg = `${Prefix}${msg}`;
    if (type === "error") return console.error(fullMsg);
    if (type === "warn") return console.warn(fullMsg);
    console.log(fullMsg);
  };

  // Decode
  const Decode = (uri) => {
    try {
      return decodeURIComponent(uri) !== uri ? decodeURIComponent(uri) : uri;
    } catch {
      return uri;
    }
  };

  // Clean
  const CleanUrl = (url) => {
    if (!url) return null;
    let out = url
      .replace(/^\/url\?(?:.+)?url=/i, "")
      .replace(/(&ved=[\w-]+)?(&cshid=\d+)?$/gi, "")
      .trim();
    return Decode(out);
  };

  // Clear
  const Clear = () => {
    if (!localStorage) return;
    const interval = setInterval(() => {
      if (!Storage.length) return clearInterval(interval);
      for (const key of Storage) {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          Log(`Cleared ${key}`);
        }
      }
    }, Interval);
  };

  // Strip
  const Strip = () => {
    setTimeout(() => {
      const el = document.querySelector("div#search>div");
      if (!el) return Log("NoTarget", "warn");
      el.dataset.hveid = "";
      el.dataset.ved = "";
      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      Log("EventsStripped");
    }, Delay);
  };

  // Remove
  const Remove = () => {
    const box = document.querySelector("#rso div>div>div[data-initq]");
    if (box) box.remove();
  };

  // Panel
  const Panel = (text) => {
    const css = `
      .UrlBox {
        position: fixed;
        top: 80px;
        right: 20px;
        width: 450px;
        max-height: 400px;
        padding: 15px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        z-index: 9999;
      }
      .UrlBox textarea {
        width: 100%;
        height: 300px;
        resize: none;
        border: 1px solid #333;
        border-radius: 6px;
        background: #2d2d2d;
        color: #e0e0e0;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        box-sizing: border-box;
      }
      .UrlBox button {
        border: 1px solid #333;
        background: #2d2d2d;
        color: #fff;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 13px;
        cursor: pointer;
        font-family: Verdana, sans-serif;
      }
      .UrlBox button:hover {
        background: #3d3d3d;
      }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const container = document.createElement("div");
    container.className = "UrlBox";

    const textarea = document.createElement("textarea");
    textarea.textContent = text;
    textarea.id = "UrlOut";

    const button = document.createElement("button");
    button.textContent = "Copy To Clipboard";
    button.dataset.clipboardAction = "copy";
    button.dataset.clipboardTarget = "#UrlOut";

    try {
      const clipboard = new ClipboardJS(button);
      clipboard.on("success", () => Log("Copied"));
      clipboard.on("error", (e) => Log(`CopyFail: ${e.message}`, "warn"));
    } catch (e) {
      Log(`ClipboardError: ${e.message}`, "error");
    }

    container.append(textarea, button);
    document.body.appendChild(container);
  };

  // Extract
  const Extract = async () => {
    try {
      Remove();

      const links = document.querySelectorAll("#search div>div>div>a[href]");
      if (!links.length) return Log("NoUrls", "warn");

      let out = "";

      for (const a of links) {
        const raw = a.getAttribute("ping") || a.getAttribute("href") || "";
        const url = CleanUrl(raw);
        if (!url) continue;

        a.href = url;
        a.ping = "";
        a.target = "_blank";

        const parent =
          a.parentElement?.parentElement?.parentElement?.parentNode;
        if (parent) {
          parent.dataset.ved = "";
          parent.dataset.hveid = "";
          parent.dataset.jscontroller = "";
          parent.dataset.jsaction = "";
        }

        out += url + "\n";
      }

      if (out) {
        Panel(out);
        await Strip();
      }

      const rso = document.getElementById("rso");
      if (rso?.getAttribute("eid")) {
        rso.removeAttribute("eid");
        Log("EidRemoved");
      }
    } catch (e) {
      Log(`ExtractError: ${e.message}`, "error");
    }
  };

  // Start
  console.clear();
  Clear();
  Extract();
})();
