# Afterlight Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/yangzishuo6-creator/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/yangzishuo6-creator/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Afterlight turns local photos into angular, multi-panel covers. It opens with four original coastal city illustrations and runs entirely in the browser using system fonts.

## Run it

Open `app/index.html` directly in a modern browser, or start the local server with Node.js 22 or newer.

```sh
node serve.ts
```

Visit `http://localhost:8080` when using the server.

## Make a cover

Choose a two-, three-, or four-panel layout. Click a panel in the preview or the Panels list, replace its illustration with a local photo, and adjust zoom and position. Edit the caption and choose Sunset, Neon, or Original. Download the preview as a square (1080 × 1080), portrait (1080 × 1350), or wide (1920 × 1080) PNG.

Photos and edits stay in the current tab. Download your cover before closing it.

## Package the entry

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

The command stages `app/` and `screenshots/` and writes `dossier.json` in `out/`.

<sub>Entered on [make.fun](https://make.fun/bounty/gta6-cover-art-01).</sub>
