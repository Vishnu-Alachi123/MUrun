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

## Step 3 — Install dependencies

```bash
npm install
cd ios && pod install && cd ..
```

---

## Step 4 — Patch Info.plist

Open `ios/MUrun/Info.plist` in Xcode and add the contents of
`ios-patches/Info.plist.additions.xml` inside the root `<dict>`.

Key additions:
- `UIBackgroundModes: [audio]` — keeps connection alive when screen is off
- `CFBundleURLTypes: [murun]` — Spotify OAuth redirect
- `NSMotionUsageDescription` — accelerometer permission prompt text
- `LSApplicationQueriesSchemes: [spotify]` — allow opening Spotify

---

## Step 5 — Build & Run

```bash
npx react-native run-ios --device "Your iPhone Name"
```

Or open `ios/MUrun.xcworkspace` in Xcode and press Run.

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
