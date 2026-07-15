# Multi-Droid Control (Free Clone)

A free, unlimited, open-source alternative to "Total Control" / "Panda" for controlling
and syncing multiple Android devices from one PC over USB (ADB).

## Features (v1)
- Auto-detect connected Android devices (via `adb devices`)
- Mirror the "main" device's screen (screenshot-refresh based, ~2 updates/sec)
- Click/tap and swipe on the mirrored screen — replicated live to any devices you mark as "synced"
- Send text input to main + synced devices at once
- Back / Home / Enter quick buttons, also broadcast to synced devices
- 100% free, no device limit, no license key

## Requirements
- Windows 10/11
- Nothing else to add manually — `adb.exe`, `AdbWinApi.dll`, and `AdbWinUsbApi.dll` are already
  bundled inside this folder, ready to go.
- Node.js installed locally ONLY if you want to run `npm start` yourself.
  (If you just want a ready `.exe`, use the GitHub Actions build — see below, matches your existing workflow.
  You don't need Node.js installed for that — GitHub's server does the work.)

## Run locally (development)
```
npm install
npm start
```

## Build a Windows .exe (recommended — matches your GitHub Actions workflow)
1. Push this folder to a new GitHub repo (same one-click `.bat` push method you already use).
2. GitHub Actions (`.github/workflows/build.yml`) will automatically build a Windows installer.
3. Download the `.exe` from the "Actions" tab → latest run → Artifacts.

## How to use
1. Connect your Android phone(s) via USB, with **USB debugging** enabled (same steps as scrcpy/Panda).
2. Open the app, click **"Refresh Devices"** — your phones will appear in the left sidebar.
3. Click the **radio button** next to the phone you want as your **main (controlled)** device — its screen appears in the main view.
4. Check the **checkbox** next to any other phone(s) you want to **sync** actions to.
5. Click/tap/drag on the main screen — the same relative action fires on all synced devices.
6. Use the text box or Back/Home/Enter buttons to send input to all of them at once.

## Known limitations (v1 — honest notes)
- Screen mirroring is **screenshot-based** (refreshes ~2x/sec), not real-time smooth video like scrcpy.
  This is intentional for v1 — it's simple and rock-solid. A smoother video-streaming mode (using scrcpy's
  video pipe) can be added later as a v2 upgrade if you want it.
- Like Panda/Total Control, sync works by **coordinate percentage** — if devices have very different
  screen layouts (e.g. different phone brands with different home-screen icon arrangements), taps
  may land on different elements on each device. This is a limitation of every tool of this kind,
  not just this one.
- Physically touching the phone in your hand (instead of clicking on the PC screen) **cannot** be
  captured or synced — this is an Android OS security restriction on non-rooted devices (explained
  in our earlier conversation), and no free or paid tool can bypass it without root.
