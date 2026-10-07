# MUrun Setup Guide

## Prerequisites
- Mac with Xcode 15+ installed
- iPhone with Spotify app installed (Premium account)
- Node.js 18+
- [Spotify Developer account](https://developer.spotify.com)

---

## Step 1 — Spotify Developer App

1. Go to https://developer.spotify.com/dashboard → Create App
2. App name: **MUrun**
3. Redirect URI: `murun://callback`
4. Enable **iOS** platform, enter your bundle ID: `com.yourname.murun`
5. Copy your **Client ID**

---

## Step 2 — Configure Client ID

Open `src/services/SpotifyRemoteService.ts` and replace:
```ts
clientID: 'YOUR_CLIENT_ID',
```
with your actual Client ID from Step 1.

---

## Step 3 — Run setup script

This generates the native `ios/` folder, installs npm packages, patches
`Info.plist`, and runs `pod install` — all in one step:

```bash
bash setup.sh
```

If the Info.plist auto-patch fails, manually add the contents of
`ios-patches/Info.plist.additions.xml` inside the root `<dict>`.

---

## Step 4 — Build & Run

```bash
open ios/MUrun.xcworkspace
# Select your iPhone in Xcode → press Run
```

Or from terminal:
```bash
npx react-native run-ios --device "Your iPhone Name"
```

---

## How background playback works

Once you tap "Start Run", MUrun sends a play command + queue to the Spotify
app via the Remote SDK. After that, **Spotify owns the audio** — it continues
playing even if MUrun is backgrounded or your screen turns off.

The `UIBackgroundModes: audio` entry keeps the Remote SDK connection alive
in the background so MUrun can update the queue when you change cadence.

---

## Two cadence modes

| Mode | How it works |
|---|---|
| **TAP** | Tap the screen rhythmically to set BPM. Use 8+ taps for accuracy. During a run, tap "Update Cadence" to re-tap. |
| **AUTO** | Accelerometer detects footstrikes via peak detection on the acceleration magnitude. Cadence updates every few steps. |
