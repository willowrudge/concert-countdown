async function loadPlayer(token) {
    const player = new Spotify.Player({
        name: "Concert Countdown",
        getOAuthToken: cb => cb(token),
        volume: 0.5
    });
    player.connect()
    return player;
}

async function play(player, playlistUri, token) {
    await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        context_uri: playlistUri
    })
});
}

async function togglePlayPause(player) {
    await player.togglePlay();
}