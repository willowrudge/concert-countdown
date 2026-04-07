async function loadEvent() {
    try {
        return await chrome.storage.sync.get(["name", "date", "location", "playlistUrl"])
    } catch (error) {
        console.log("Something went wrong", error)
    }
    
}

function getTimeRemaining(dateString) {
    const now = new Date();
    const target = new Date(dateString);
    const diff = target - now;
    const days = Math.floor((diff / (1000 * 60 * 60 * 24)));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / (1000)) % 60); 
    return { days, hours, mins, secs }
}

async function startCountdown() {
    const event = await loadEvent();
    const date = event.date;
    setInterval(() => {
    const timeLeft = getTimeRemaining(date);

    document.getElementById("days").textContent = timeLeft.days;
    document.getElementById("hours").textContent = timeLeft.hours;
    document.getElementById("minutes").textContent = timeLeft.mins;
    document.getElementById("seconds").textContent = timeLeft.secs;
}, 1000);   
}

function getPlaylistId(url) {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

async function init() {
    const event = await loadEvent();
    const playlistId = getPlaylistId(event.playlistUrl);
    document.getElementById("spotify").src = 
        `https://open.spotify.com/embed/playlist/${playlistId}`;
    startCountdown();
}

init();