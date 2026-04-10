let countdownInterval;

function getProgressPercent(dateString) {
    const now = new Date();
    const target = new Date(dateString);
    const start = new Date(target);
    start.setFullYear(start.getFullYear() - 1);
    const total = target - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

function getTimeRemaining(dateString) {
    const now = new Date();
    const target = new Date(dateString);
    const diff = target - now;
    if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        secs: Math.floor((diff / 1000) % 60)
    };
}

async function loadEvent() {
    const items = await chrome.storage.sync.get(["name", "date", "location", "playlistUrl"]);
    return {
        name: items.name || "",
        date: items.date || "",
        location: items.location || "",
        playlistUrl: items.playlistUrl || ""
    };
}

function showView(viewId) {
    const views = ["setup-view", "spotify-view", "countdown-view"];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });
    const show = document.getElementById(viewId);
    if (show) show.classList.remove("hidden");
}

function formatName(name) {
    if (!name) return "";
    return name
        .split(" ")
        .map(w => w ? w[0].toUpperCase() + w.slice(1) : "")
        .join(" ");
}

function renderEventInPopup(event) {
    if (!event) return;
    const nameEl = document.getElementById("popup-event-name");
    const dateEl = document.getElementById("popup-date");
    const locationEl = document.getElementById("popup-location");
    if (nameEl) nameEl.textContent = event.name ? formatName(event.name) : "";
    if (dateEl && event.date) {
        try {
            const [year, month, day] = event.date.split('-');
            const localDate = new Date(year, month - 1, day);
            dateEl.textContent = localDate.toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch (e) {
            dateEl.textContent = event.date;
        }
    } else if (dateEl) {
        dateEl.textContent = "";
    }
    if (locationEl) {
        locationEl.textContent = event.location ? "📍 " + event.location : "";
    }
}

function startCountdown(event) {
    if (!event || !event.date) return;
    renderEventInPopup(event);

    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        const timeLeft = getTimeRemaining(event.date);

        const daysEl = document.getElementById("days");
        if (daysEl) daysEl.textContent = timeLeft.days;
        const hoursEl = document.getElementById("hours");
        if (hoursEl) hoursEl.textContent = timeLeft.hours;
        const minutesEl = document.getElementById("minutes");
        if (minutesEl) minutesEl.textContent = timeLeft.mins;
        const secondsEl = document.getElementById("seconds");
        if (secondsEl) secondsEl.textContent = timeLeft.secs;

        const percent = getProgressPercent(event.date);
        const fill = document.getElementById("progress-fill");
        if (fill) fill.style.width = percent + "%";
        const pct = document.getElementById("progress-pct");
        if (pct) pct.textContent = Math.round(percent) + "%";
    }, 1000);
}

document.addEventListener("DOMContentLoaded", async () => {
  const nameInput = document.getElementById("name");
  const dateInput = document.getElementById("date");
  const locationInput = document.getElementById("location");
  const playlistInput = document.getElementById("playlist");
  const saveBtn = document.getElementById("save");
  const connectBtn = document.getElementById("connect-spotify");
  const skipBtn = document.getElementById("skip-spotify");
  const resetBtn = document.getElementById("reset");
  const reconnectBtn = document.getElementById("reconnect");
  const setupView = document.getElementById("setup-view");
  const spotifyView = document.getElementById("spotify-view");
  const countdownView = document.getElementById("countdown-view");

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const name = (nameInput && nameInput.value || "").trim();
      const date = (dateInput && dateInput.value) || "";
      const location = (locationInput && locationInput.value || "").trim();
      const playlistUrl = (playlistInput && playlistInput.value || "").trim();
      console.log("[popup] save: name=", name, "date=", date, "location=", location, "playlistUrl=", playlistUrl);
      if (!name || !date) {
        alert("Enter a name and date");
        return;
      }
      await chrome.storage.sync.set({ name, date, location, playlistUrl });
      console.log("[popup] saved to storage");
      showView("spotify-view");
    });
  }

  if (connectBtn) {
    connectBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "START_SPOTIFY_AUTH" }, (resp) => {
        console.log("[popup] START_SPOTIFY_AUTH resp:", resp);
        if (!resp || !resp.ok) {
          alert("Spotify connection failed. See console for details.");
          return;
        }
        showView("countdown-view");
      });
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      showView("countdown-view");
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      if (countdownInterval) clearInterval(countdownInterval);
      if (nameInput) nameInput.value = "";
      if (dateInput) dateInput.value = "";
      if (locationInput) locationInput.value = "";
      if (playlistInput) playlistInput.value = "";
      await chrome.storage.sync.remove(["name", "date", "location", "playlistUrl"]);
      showView("setup-view");
    });
  }

  if (reconnectBtn) {
    reconnectBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "START_SPOTIFY_AUTH" }, (resp) => {
        console.log("[popup] reconnect START_SPOTIFY_AUTH resp:", resp);
        if (!resp || !resp.ok) {
          alert("Spotify connection failed. See console for details.");
          return;
        }
      });
    });
  }

  const event = await loadEvent();
  if (event && event.name && event.date) {
    renderEventInPopup(event);
    startCountdown(event);
    showView("countdown-view");
  } else {
    showView("setup-view");
  }
});