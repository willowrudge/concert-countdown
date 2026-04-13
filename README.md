# Concert Countdown ♫

A Chrome extension that counts down to your next concert or festival with a draggable overlay that lives on every tab (with Spotify playback controls built in.)

## Features

- **Persistent overlay** — feature stays on screen as you browse, across every tab
- **Draggable & resizable** — position it anywhere, resize to your liking and needs
- **Spotify integration** — control playback directly from the overlay (Spotify Premium and desktop app required)
- **Clean setup** — enter your event and playlist once, and the countdown starts immediately and stays up to date

## How it works

1. Click the extension icon and enter your event details (name, date, location, Spotify playlist URL)
2. Connect your Spotify account
3. The overlay appears on every webpage automatically, keeping true to whatever size and position you choose

> **Note:** The Spotify app must be open and active for music controls to work. Spotify Premium is required.

## Tech stack

- Vanilla JavaScript
- Chrome Extensions Manifest V3
- Chrome Storage API
- Chrome Identity API
- Spotify Web API (OAuth 2.0 with PKCE)

## Setup (for developers)

1. Clone the repo
```bash
   git clone https://github.com/willowrudge/lolla-countdown.git
```

2. Add your Spotify Client ID
```bash
   cp auth.js
```
   Then open `auth.js` and replace the current client ID with your actual Spotify Client ID from [developer.spotify.com](https://developer.spotify.com)

3. Load the extension in Chrome
   - Go to `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the project folder

## File structure

```
concert-countdown/
├── manifest.json       # Extension config and permissions
├── popup.html          # Setup and status UI
├── popup.js            # Popup logic
├── popup.css           # Popup styling
├── content.js          # Overlay injected into every page
├── content.css         # Overlay styling
├── background.js       # Spotify API calls
├── auth.js             # Spotify OAuth 
```

## Privacy

This extension does not collect or transmit any user data. All event details are stored locally on your device using Chrome's built-in storage API. Spotify authentication tokens are stored locally and used only to communicate with the Spotify API on your behalf.

## License

MIT