const CLIENT_ID = "your_client_id"; //replace with your client ID
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state"
].join(" ");

function base64urlEncode(arrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return hash;
}

function randomString(len = 64) {
  const array = new Uint8Array(len);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => ("0" + b.toString(16)).slice(-2)).join("");
}

async function exchangeCodeForToken(code, code_verifier, redirect_uri) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri,
    client_id: CLIENT_ID,
    code_verifier
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return await res.json();
}

async function refreshToken(refresh_token) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id: CLIENT_ID
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  return await res.json();
}

async function getValidAccessToken() {
  const items = await chrome.storage.sync.get(["accessToken", "accessTokenExpiry", "refreshToken"]);
  let token = items.accessToken;
  const expiry = items.accessTokenExpiry || 0;
  const refresh = items.refreshToken;
  const now = Date.now();
  if (token && now < expiry - 15000) return token;
  if (!refresh) throw new Error("no_refresh_token");
  const refreshed = await refreshToken(refresh).catch(err => { throw err; });
  token = refreshed.access_token;
  const newExpiry = Date.now() + (refreshed.expires_in || 3600) * 1000;
  const newRefresh = refreshed.refresh_token || refresh;
  await chrome.storage.sync.set({ accessToken: token, accessTokenExpiry: newExpiry, refreshToken: newRefresh });
  return token;
}

async function apiFetch(path, opts = {}) {
  const token = await getValidAccessToken();
  const headers = Object.assign({ Authorization: `Bearer ${token}` }, opts.headers || {});
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  return res;
}

function parsePlaylistToContext(playlistUrl) {
  if (!playlistUrl) return null;
  if (/^spotify:(playlist|album|artist|track):/.test(playlistUrl)) return playlistUrl;
  try {
    const u = new URL(playlistUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const type = parts[0];
      let id = parts[1];
      if (id) {
        id = id.split("?")[0];
        if (id) {
          console.log("[background] parsed context: spotify:" + type + ":" + id);
          return `spotify:${type}:${id}`;
        }
      }
    }
  } catch (e) {
    console.warn("[background] URL parse error:", e);
  }
  console.warn("[background] could not parse playlistUrl:", playlistUrl);
  return null;
}

async function getPlayback() {
  const r = await apiFetch("/me/player");
  if (!r) return null;
  if (r.status === 204 || r.status === 404) return null;
  if (!r.ok) return null;
  return await r.json().catch(() => null);
}

async function getDevices() {
  const r = await apiFetch("/me/player/devices");
  if (!r || !r.ok) return null;
  return await r.json().catch(() => null);
}

async function transferToDeviceId(deviceId, play = false) {
  return await apiFetch("/me/player", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: { device_ids: [deviceId], play }
  });
}

async function transferToFirstDeviceAndPlay(playBody = null) {
  const devJson = await getDevices();
  const devices = devJson && devJson.devices ? devJson.devices : [];
  if (!devices || devices.length === 0) return { ok: false, error: "no_devices", devices };
  const deviceId = devices[0].id;
  console.log("[background] transferring to device:", deviceId);
  const transferRes = await transferToDeviceId(deviceId, !!playBody);
  if (!(transferRes && (transferRes.ok || transferRes.status === 204))) {
    const body = await transferRes.json().catch(() => null);
    return { ok: false, error: "transfer_failed", status: transferRes.status, body };
  }
  if (playBody) {
    const playRes = await apiFetch("/me/player/play", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: playBody
    });
    if (playRes && (playRes.ok || playRes.status === 204)) return { ok: true, transferred: true };
    const pb = await playRes.json().catch(() => null);
    return { ok: false, status: playRes.status, body: pb };
  }
  return { ok: true, transferred: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (!msg || !msg.type) { 
        sendResponse({ ok: false, error: "no_type" }); 
        return; 
      }

      if (msg.type === "START_SPOTIFY_AUTH") {
        const redirect_uri = chrome.identity.getRedirectURL();
        const code_verifier = base64urlEncode(new TextEncoder().encode(randomString(96))).slice(0,128);
        const hash = await sha256(code_verifier);
        const code_challenge = base64urlEncode(hash);

        const authUrl = `${AUTH_ENDPOINT}?client_id=${encodeURIComponent(CLIENT_ID)}&response_type=code&redirect_uri=${encodeURIComponent(redirect_uri)}&code_challenge_method=S256&code_challenge=${encodeURIComponent(code_challenge)}&scope=${encodeURIComponent(SCOPES)}&show_dialog=true`;
        console.log("[background] launch authUrl:", authUrl);
        try {
          await chrome.storage.local.set({ code_verifier });
          const responseUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
          console.log("[background] auth responseUrl:", responseUrl);
          const urlObj = new URL(responseUrl);
          const code = urlObj.searchParams.get("code");
          if (!code) {
            sendResponse({ ok: false, error: "no_code_in_response", responseUrl });
            return;
          }
          const tokenJson = await exchangeCodeForToken(code, code_verifier, redirect_uri);
          const accessToken = tokenJson.access_token;
          const refreshToken = tokenJson.refresh_token;
          const expiry = Date.now() + (tokenJson.expires_in || 3600) * 1000;
          await chrome.storage.sync.set({ accessToken, refreshToken, accessTokenExpiry: expiry });
          console.log("[background] saved tokens");
          sendResponse({ ok: true });
          return;
        } catch (err) {
          console.error("[background] auth flow failed:", err);
          sendResponse({ ok: false, error: err && err.message });
          return;
        }
      }

      if (["SPOTIFY_TOGGLE", "SPOTIFY_PLAY", "SPOTIFY_PAUSE", "SPOTIFY_NEXT", "SPOTIFY_PREV"].includes(msg.type)) {
        try { 
          await getValidAccessToken(); 
        } catch (err) {
          sendResponse({ ok: false, error: "no_valid_token", detail: err && err.message });
          return;
        }

        if (msg.type === "SPOTIFY_TOGGLE" || msg.type === "SPOTIFY_PLAY" || msg.type === "SPOTIFY_PAUSE") {
          const playlistUrl = msg.playlistUrl || "";
          const context = parsePlaylistToContext(playlistUrl);
          console.log("[background] action: type=", msg.type, "playlistUrl=", playlistUrl, "context=", context);
          
          const playback = await getPlayback();
          const isCurrentlyPlaying = playback && playback.is_playing === true;
          const currentContext = playback && playback.context ? playback.context.uri : null;
          console.log("[background] current state: is_playing=", isCurrentlyPlaying, "context=", currentContext);

          if (msg.type === "SPOTIFY_PAUSE" || (msg.type === "SPOTIFY_TOGGLE" && isCurrentlyPlaying)) {
            console.log("[background] pausing...");
            const r = await apiFetch("/me/player/pause", { method: "PUT" });
            if (r && (r.ok || r.status === 204)) { 
              sendResponse({ ok: true, action: "paused" }); 
              return; 
            }
            if (r && r.status === 404) {
              console.log("[background] no device, transferring and pausing...");
              await transferToFirstDeviceAndPlay(null);
              const retry = await apiFetch("/me/player/pause", { method: "PUT" });
              if (retry && (retry.ok || retry.status === 204)) { 
                sendResponse({ ok: true, action: "paused_after_transfer" }); 
                return; 
              }
            }
            const body = r ? await r.json().catch(() => null) : null;
            sendResponse({ ok: false, status: r ? r.status : 0, body }); 
            return;
          }

          console.log("[background] playing...");
          let playBody = null;

          if (context) {
            if (currentContext === context && !isCurrentlyPlaying) {
              playBody = null;
              console.log("[background] resuming same playlist");
            } else {
              playBody = { context_uri: context };
              console.log("[background] starting fresh playlist");
            }
          }
          
          const playRes = await apiFetch("/me/player/play", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: playBody
          });
          
          if (playRes && (playRes.ok || playRes.status === 204)) {
            sendResponse({ ok: true, action: "played" });
            return;
          }
          
          const status = playRes ? playRes.status : 0;
          const body = playRes ? await playRes.json().catch(() => null) : null;
          console.log("[background] play error: status=", status, "body=", body);
          
          if (status === 404 || (body && body.error && /No active device/i.test(body.error.message || ""))) {
            console.log("[background] no device, transferring and playing...");
            const tr = await transferToFirstDeviceAndPlay(playBody);
            sendResponse(tr); 
            return;
          }
          
          if (status === 401) { 
            await chrome.storage.sync.remove("accessToken"); 
          }
          sendResponse({ ok: false, status, body }); 
          return;
        }

        let res = null;
        if (msg.type === "SPOTIFY_PREV") res = await apiFetch("/me/player/previous", { method: "POST" });
        if (msg.type === "SPOTIFY_NEXT") res = await apiFetch("/me/player/next", { method: "POST" });
        
        if (res && (res.ok || res.status === 204)) { 
          sendResponse({ ok: true }); 
          return; 
        }
        
        const rs = res ? res.status : 0;
        const rb = res ? await res.json().catch(() => null) : null;
        
        if (rs === 404) { 
          const t = await transferToFirstDeviceAndPlay(null); 
          sendResponse(t); 
          return; 
        }
        
        if (rs === 401) await chrome.storage.sync.remove("accessToken");
        sendResponse({ ok: false, status: rs, body: rb }); 
        return;
      }

      sendResponse({ ok: false, error: "unhandled_type" });
    } catch (err) {
      console.error("[background] handler error:", err);
      sendResponse({ ok: false, error: err && err.message });
    }
  })();
  return true;
});