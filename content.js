const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

function createOverlay() {
  const host = document.createElement("div");
  host.id = "concert-countdown-overlay-host";
  host.style.position = "fixed";
  host.style.left = "20px";
  host.style.top = "20px";
  host.style.zIndex = "2147483647";
  host.style.touchAction = "none";
  host.style.width = "260px";
  host.style.height = "150px";
  document.body.appendChild(host);

  const sr = host.attachShadow({ mode: "open" });
  sr.innerHTML = `
    <style>
      :host{all:initial}
      #concert-countdown-overlay{
        position:relative;
        width:100%;
        height:100%;
        background:#fff;
        border-radius:calc(16px * var(--scale, 1));
        padding:calc(12px * var(--scale, 1));
        box-shadow:0 12px 24px rgba(0,0,0,0.12);
        font-family:'DM Sans',sans-serif;
        cursor:grab;
        user-select:none;
        color:#111;
        display:flex;
        flex-direction:column;
        justify-content:space-between;
        gap:calc(10px * var(--scale, 1)); /* added */
        border:calc(1.5px * var(--scale, 1)) solid #fce7f3;
        box-sizing:border-box; /* added */
      }
      #overlay-event-name{
        text-align:center;
        color:#db2777;
        font-weight:710;
        font-size:calc(22px * var(--scale, 1));
        letter-spacing:calc(0.4px * var(--scale, 1));
        line-height:1.1;
        flex:1;
        display:flex;
        align-items:center;
        justify-content:center;
        text-transform:uppercase;
      }
      #overlay-countdown{
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:calc(6px * var(--scale, 1));
        flex:1;
        align-content:center;
      }
      .overlay-block{background:linear-gradient(135deg, #fdf2f8 0%, #fff5f8 100%);border-radius:calc(10px * var(--scale, 1));padding:calc(6px * var(--scale, 1)) calc(3px * var(--scale, 1));text-align:center;border:calc(1px * var(--scale, 1)) solid #fbcfe8;box-shadow:0 2px 8px rgba(236, 72, 153, 0.1)}
      .overlay-block span{font-weight:800;font-size:calc(22px * var(--scale, 1));display:block;color:#ec4899;line-height:1;text-shadow:0 1px 2px rgba(0,0,0,0.05)}
      .overlay-block p{font-size:calc(7px * var(--scale, 1));color:#db2777;margin:calc(2px * var(--scale, 1)) 0 0;text-transform:uppercase;letter-spacing:calc(0.5px * var(--scale, 1));font-weight:700}
      #overlay-controls{
        display:flex;
        justify-content:center;
        align-items:center;
        gap:calc(10px * var(--scale, 1));
        flex:0 0 auto; /* changed */
      }
      #overlay-controls button{border:calc(1.5px * var(--scale, 1)) solid #fce7f3;background:#fff;border-radius:50%;width:calc(32px * var(--scale, 1));height:calc(32px * var(--scale, 1));cursor:pointer;color:#ec4899;font-size:calc(12px * var(--scale, 1));transition:all 0.2s;padding:0;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      #overlay-controls button:hover{background:#fdf2f8;border-color:#ec4899;transform:scale(1.05)}
      #overlay-play{width:calc(38px * var(--scale, 1)) !important;height:calc(38px * var(--scale, 1)) !important;background:#ec4899 !important;color:#fff !important;border-color:#ec4899 !important;font-size:calc(14px * var(--scale, 1)) !important}
      #overlay-play:hover{background:#db2777 !important;border-color:#db2777 !important;transform:scale(1.08) !important}
      #resize-handle{position:absolute;bottom:0;right:0;width:calc(16px * var(--scale, 1));height:calc(16px * var(--scale, 1));cursor:nwse-resize;background:linear-gradient(135deg,transparent 50%,#ec4899 50%);border-radius:0 0 16px 0;opacity:0.4;transition:opacity 0.2s}
      #resize-handle:hover{opacity:1}
    </style>
    <div id="concert-countdown-overlay">
      <div id="overlay-event-name">Loading...</div>
      <div id="overlay-countdown">
        <div class="overlay-block"><span id="overlay-days">0</span><p>days</p></div>
        <div class="overlay-block"><span id="overlay-hours">0</span><p>hours</p></div>
        <div class="overlay-block"><span id="overlay-mins">0</span><p>mins</p></div>
        <div class="overlay-block"><span id="overlay-secs">0</span><p>secs</p></div>
      </div>
      <div id="overlay-controls">
        <button id="overlay-prev">⏮</button>
        <button id="overlay-play">⏯</button>
        <button id="overlay-next">⏭</button>
      </div>
      <div id="resize-handle"></div>
    </div>
  `;
  host.querySelector = (sel) => sr.querySelector(sel);
  host.querySelectorAll = (sel) => sr.querySelectorAll(sel);
  host.shadowRoot = sr;
  return host;
}

function updateScale(host) {
  const width = host.offsetWidth;
  const height = host.offsetHeight;
  const scaleW = width / 260;
  const scaleH = height / 150;
  const scale = Math.min(scaleW, scaleH);
  const overlay = host.shadowRoot && host.shadowRoot.querySelector('#concert-countdown-overlay');
  if (overlay) {
    overlay.style.setProperty('--scale', scale);
  }
}

function makeDraggable(host) {
  let dragging = false, resizing = false, startX = 0, startY = 0, startW = 0, startH = 0;
  
  function onMove(e) {
    if (dragging) {
      host.style.left = (e.clientX - startX) + "px";
      host.style.top = (e.clientY - startY) + "px";
    } else if (resizing) {
      const newW = Math.max(150, startW + (e.clientX - startX));
      const newH = Math.max(89, startH + (e.clientY - startY));
      host.style.width = newW + "px";
      host.style.height = newH + "px";
      updateScale(host);
    }
  }
  
  function onUp(e) {
    dragging = false;
    resizing = false;
    try { host.releasePointerCapture(e.pointerId); } catch {}
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    const el = host.shadowRoot && host.shadowRoot.querySelector('#concert-countdown-overlay');
    if (el) el.style.cursor = "grab";
    chrome.storage.sync.set({
    overlayLeft: host.style.left,
    overlayTop: host.style.top,
    overlayWidth: host.style.width,
    overlayHeight: host.style.height
    });
  }
  
  host.addEventListener("pointerdown", (e) => {
    const path = e.composedPath ? e.composedPath() : [];
    for (const el of path) {
      if (el && el.id === "resize-handle") {
        resizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startW = host.offsetWidth;
        startH = host.offsetHeight;
        try { host.setPointerCapture(e.pointerId); } catch {}
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        return;
      }
      if (el && el.tagName === "BUTTON") return;
    }
    dragging = true;
    startX = e.clientX - host.offsetLeft;
    startY = e.clientY - host.offsetTop;
    try { host.setPointerCapture(e.pointerId); } catch {}
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    const el = host.shadowRoot && host.shadowRoot.querySelector('#concert-countdown-overlay');
    if (el) el.style.cursor = "grabbing";
  }, { passive: true });
}

function getTimeRemaining(dateString) {
  const now = new Date();
  const target = new Date(dateString);
  const diff = target - now;
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
  return {
    days: Math.floor(diff / (1000*60*60*24)),
    hours: Math.floor((diff / (1000*60*60)) % 24),
    mins: Math.floor((diff / (1000*60)) % 60),
    secs: Math.floor((diff / 1000) % 60)
  };
}

function updateOverlay(host, event) {
  if (host._interval) {
    clearInterval(host._interval);
    host._interval = null;
  }

  const name = (event && event.name) 
    ? event.name.split(" ").map(w => w ? w[0].toUpperCase() + w.slice(1) : "").join(" ")
    : "";

  const q = (sel) => {
    try {
      if (!host || !host.shadowRoot) return null;
      return host.shadowRoot.querySelector(sel);
    } catch (e) {
      return null;
    }
  };

  const nameEl = q("#overlay-event-name");
  if (nameEl) nameEl.textContent = name ? `${name}` : "Event";

  const tick = () => {
    try {
      const daysEl = q("#overlay-days");
      const hoursEl = q("#overlay-hours");
      const minsEl = q("#overlay-mins");
      const secsEl = q("#overlay-secs");

      const timeLeft = (event && event.date) 
        ? getTimeRemaining(event.date)
        : { days: 0, hours: 0, mins: 0, secs: 0 };

      if (daysEl) daysEl.textContent = timeLeft.days;
      if (hoursEl) hoursEl.textContent = timeLeft.hours;
      if (minsEl) minsEl.textContent = timeLeft.mins;
      if (secsEl) secsEl.textContent = timeLeft.secs;

      if (!document.body.contains(host)) {
        if (host._interval) {
          clearInterval(host._interval);
          host._interval = null;
        }
      }
    } catch (err) {
      console.error("[content] tick error:", err);
    }
  };

  tick();
  host._interval = setInterval(tick, 1000);
}

function setupControls(host) {
  const playBtn = host.querySelector("#overlay-play");
  if (playBtn) {
    playBtn.addEventListener("click", async () => {
      try {
        const items = await chrome.storage.sync.get(["playlistUrl"]);
        const playlistUrl = items.playlistUrl || "";
        console.log("[content] play clicked, playlistUrl:", playlistUrl);
        chrome.runtime.sendMessage({ type: "SPOTIFY_TOGGLE", playlistUrl }, (resp) => {
          console.log("[content] response:", resp);
        });
      } catch (err) {
        console.error("[content] play error:", err);
      }
    });
  }

  const prevBtn = host.querySelector("#overlay-prev");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "SPOTIFY_PREV" });
    });
  }

  const nextBtn = host.querySelector("#overlay-next");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "SPOTIFY_NEXT" });
    });
  }
}

async function init() {
  const items = await chrome.storage.sync.get(["name", "date", "location", "playlistUrl"]);
  if (!items || !items.date) return;
  console.log("[content] overlay data:", items);
  const host = createOverlay();
  const state = await chrome.storage.sync.get(["overlayLeft", "overlayTop", "overlayWidth", "overlayHeight"]);
  if (state.overlayLeft) host.style.left = state.overlayLeft;
  if (state.overlayTop) host.style.top = state.overlayTop;
  if (state.overlayWidth) host.style.width = state.overlayWidth;
  if (state.overlayHeight) host.style.height = state.overlayHeight;
  makeDraggable(host);
  updateOverlay(host, items);
  setupControls(host);
  updateScale(host);
}

init();
