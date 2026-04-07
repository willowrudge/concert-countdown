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

    if (diff <= 0) {
        return { days: 0, hours: 0, mins: 0, secs: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    return { days, hours, mins, secs };
}

function getPlaylistId(url) {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

async function loadEvent() {
    return await chrome.storage.sync.get(["name", "date", "location", "playlistUrl"]);
}

async function saveEvent(name, date, location, playlistUrl) {
    await chrome.storage.sync.set({ name, date, location, playlistUrl });
}

function showView(viewId) {
    document.getElementById("setup-view").classList.add("hidden");
    document.getElementById("countdown-view").classList.add("hidden");
    document.getElementById(viewId).classList.remove("hidden");
}

function startCountdown(event) {
    if (countdownInterval) clearInterval(countdownInterval);

    const name = event.name
        .split(" ")
        .map(word => word[0].toUpperCase() + word.slice(1))
        .join(" ");

    document.getElementById("event-name-display").textContent = `Until ${name}!`;

    const playlistId = getPlaylistId(event.playlistUrl);
    if (playlistId) {
        document.getElementById("spotify").src =
            `https://open.spotify.com/embed/playlist/${playlistId}`;
    } else {
        document.getElementById("spotify").style.display = "none";
    }

    countdownInterval = setInterval(() => {
        const timeLeft = getTimeRemaining(event.date);

        document.getElementById("days").textContent = timeLeft.days;
        document.getElementById("hours").textContent = timeLeft.hours;
        document.getElementById("minutes").textContent = timeLeft.mins;
        document.getElementById("seconds").textContent = timeLeft.secs;

        const percent = getProgressPercent(event.date);
        document.getElementById("progress-fill").style.width = percent + "%";
    }, 1000);
}

async function init() {
    const event = await loadEvent();

    if (event && event.date) {
        showView("countdown-view");
        startCountdown(event);
    } else {
        showView("setup-view");
    }
}

document.getElementById("save").addEventListener("click", async () => {
    const nameInput = document.getElementById("name");
    const dateInput = document.getElementById("date");
    const locationInput = document.getElementById("location");
    const playlistInput = document.getElementById("playlist");

    const name = nameInput.value.trim();
    const date = dateInput.value;
    const location = locationInput.value;
    const playlistUrl = playlistInput.value;

    if (!name || !date) return;

    await saveEvent(name, date, location, playlistUrl);


    nameInput.value = "";
    dateInput.value = "";
    locationInput.value = "";
    playlistInput.value = "";

    const event = await loadEvent();
    showView("countdown-view");
    startCountdown(event);
});

document.getElementById("reset").addEventListener("click", async () => {
    if (confirm("Change event?")) {
        await chrome.storage.sync.clear();
        showView("setup-view");
    }
});

init();