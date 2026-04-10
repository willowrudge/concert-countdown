const CLIENT_ID = "c7ceb448242047ebb09d39cfa001abe6";
const REDIRECT_URI = chrome.identity.getRedirectURL();
const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state"
].join(" ");

function getAuthUrl() {
  return `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}` +
    `&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}`;
}

async function authenticate() {
  try {
    const authUrl = getAuthUrl();
    console.log("[auth] authUrl:", authUrl);
    console.log("[auth] chrome.identity.getRedirectURL():", chrome.identity.getRedirectURL());
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    });
    console.log("[auth] launchWebAuthFlow responseUrl:", responseUrl);
    return responseUrl;
  } catch (err) {
    console.error("[auth] authenticate error:", err);
    return null;
  }
}

async function getAccessToken() {
  try {
    const responseUrl = await authenticate();
    console.log("[auth] responseUrl:", responseUrl);
    if (!responseUrl) return null;
    const fragment = (responseUrl.split('#')[1] || "");
    console.log("[auth] fragment:", fragment);
    const params = new URLSearchParams(fragment);
    const token = params.get("access_token");
    console.log("[auth] token:", !!token);
    if (token) {
      await chrome.storage.sync.set({ accessToken: token });
      console.log("[auth] saved accessToken to storage");
      return token;
    }
    console.warn("[auth] no access_token in redirect");
    return null;
  } catch (err) {
    console.error("[auth] getAccessToken error:", err);
    return null;
  }
}
