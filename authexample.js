const CLIENT_ID = "your client ID here"; // replace with your Spotify client ID
const REDIRECT_URI = chrome.identity.getRedirectURL();
const SCOPES = [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state"
].join(" ");

function getAuthUrl(){
    return `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=${SCOPES}`;
}

async function authenticate(){
    const authUrl = getAuthUrl();
    const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true
});
return responseUrl
}

async function getAccessToken(){
    const responseUrl = await authenticate();
    const url = new URL(responseUrl);
    const code = url.searchParams.get("code");
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID
        })
    });
    const data = await response.json();
    return data.access_token;
}

async function saveToken(token) {
    return await chrome.storage.sync.set({ accessToken: token });
}