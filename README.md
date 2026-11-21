# Afterlight Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/yangzishuo6-creator/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/yangzishuo6-creator/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Afterlight turns local photos into angular, multi-panel covers. It opens with five original generated scenes featuring fictional adults and a tropical coast, and runs entirely in the browser using system fonts.

## Run it

Start the local server with Node.js 22 or newer.

```sh
node serve.ts
```

Visit `http://localhost:8080` in Chrome. The editor needs no internet connection.

## Make a cover

Choose Hero + 5, Hero + 3, 2 × 2, or Strip. Add local photos, select a panel, and pick any photo from its menu. Reuse the same photo in several panels and frame each crop independently with zoom, drag, or the position sliders. Edit the caption and optional subtitle, choose Sunset, Neon, or Original, and download a square (1080 × 1080), portrait (1080 × 1350), or wide (1920 × 1080) PNG.

Photos and edits stay in the current tab. Download your cover before closing it.

## Package the entry

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

The command stages `app/` and `screenshots/` and writes `dossier.json` in `out/`.

<sub>Entered on [make.fun](https://make.fun/bounty/gta6-cover-art-01).</sub>
