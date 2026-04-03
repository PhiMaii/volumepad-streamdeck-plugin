# VolumePad Stream Deck Plugin

Elgato Stream Deck plugin for controlling VolumePad through the local desktop app backend.

This repository is a submodule of the main VolumePad umbrella repo and provides key actions such as volume display/control, connection status, and settings changes.

## Role In The Full Stack

In the full VolumePad architecture:
- firmware runs on the hardware
- the desktop app exposes local endpoints/state
- this plugin consumes those endpoints and renders Stream Deck actions

## Available Actions

- `Volume`: show master volume and toggle mute
- `Change Volume`: increase/decrease by configured step
- `Connection Status`: show backend/device connection state
- `Change Settings`: apply selected backend setting

## Build

```powershell
npm install
npm run build
```

For development:

```powershell
npm run watch
```

## Project Layout

- `src/`: plugin runtime, actions, settings, and PI logic
- `net.phimai.volumepad.streamdeck-remote.sdPlugin/`: Stream Deck manifest, UI, and packaged assets
- `rollup.config.mjs`: build configuration

## Documentation Policy

Global architecture/protocol/layout docs are maintained only in:
`D:\Daten\Programmieren\volumepad\docs`

Use this submodule docs area only for plugin-specific notes that do not redefine global contracts.
