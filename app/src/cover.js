"use strict";

const sizes = { square: [1080, 1080], portrait: [1080, 1350], wide: [1920, 1080] };
const layouts = {
  mosaic: [
    [[0, 0], [.68, 0], [.56, .45], [.46, .46], [0, .53]],
    [[.68, 0], [1, 0], [1, .39], [.56, .45]],
    [[0, .53], [.46, .46], [.32, 1], [0, 1]],
    [[.46, .46], [.56, .45], [1, .39], [1, 1], [.32, 1]],
  ],
  split: [
    [[0, 0], [.62, 0], [.4, 1], [0, 1]],
    [[.62, 0], [1, 0], [1, 1], [.4, 1]],
  ],
  strip: [
    [[0, 0], [1, 0], [1, .29], [0, .42]],
    [[0, .42], [1, .29], [1, .62], [0, .74]],
    [[0, .74], [1, .62], [1, 1], [0, 1]],
  ],
};
const palettes = {
  sunset: { filter: "saturate(1.17) contrast(1.04)", wash: "#e6566229", ink: "#ffc785", paper: "#fff0cf" },
  neon: { filter: "hue-rotate(315deg) saturate(1.28) contrast(1.08)", wash: "#714fff40", ink: "#85fff2", paper: "#fff0fe" },
  natural: { filter: "none", wash: "transparent", ink: "#ffddae", paper: "#fff7ea" },
};

function panelPath(points, width, height) {
  const path = new Path2D();
  for (const [x, y] of points) path.lineTo(x * width, y * height);
  path.closePath();
  return path;
}

function photoFrame(points, photo, width, height) {
  const xs = points.map(([x]) => x * width);
  const ys = points.map(([, y]) => y * height);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const frameWidth = Math.max(...xs) - left;
  const frameHeight = Math.max(...ys) - top;
  const imageWidth = photo.image.naturalWidth;
  const imageHeight = photo.image.naturalHeight;
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight) * photo.zoom;
  const w = imageWidth * scale;
  const h = imageHeight * scale;
  const overflowX = Math.max(0, (w - frameWidth) / 2);
  const overflowY = Math.max(0, (h - frameHeight) / 2);
  return {
    x: left + (photo.x - 1) * overflowX,
    y: top + (photo.y - 1) * overflowY,
    w, h, overflowX, overflowY,
  };
}

function drawCaption(ctx, width, height, state, colors) {
  const short = Math.min(width, height);
  const title = state.caption.trim().toLocaleUpperCase();
  const subtitle = state.subtitle.trim().toLocaleUpperCase();
  if (!title && !subtitle) return;

  const center = height * .53;
  const fade = ctx.createLinearGradient(0, center - short * .27, 0, center + short * .28);
  fade.addColorStop(0, "#110a1900");
  fade.addColorStop(.49, "#110a19dd");
  fade.addColorStop(.69, "#110a19d1");
  fade.addColorStop(1, "#110a1900");
  ctx.fillStyle = fade;
  ctx.fillRect(0, center - short * .27, width, short * .55);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#170e1d";
  ctx.fillStyle = colors.paper;
  const words = title.split(/\s+/u);
  const columns = title.length > 10 && words.length > 1 && width <= height;
  const breakAt = Math.ceil(words.length / 2);
  const lines = columns ? [words.slice(0, breakAt).join(" "), words.slice(breakAt).join(" ")] : [title];
  const font = size => `900 ${size}px Impact, "Arial Black", system-ui, sans-serif`;
  ctx.font = font(short * (columns ? .168 : .145));
  const widest = Math.max(...lines.map(line => ctx.measureText(line).width), 1);
  const size = short * (columns ? .168 : .145) * Math.min(1, width * .88 / widest);
  ctx.font = font(size);
  const step = size * .78;
  const titleY = center - (lines.length - 1) * step / 2 - (subtitle ? short * .02 : 0);
  ctx.lineWidth = short * .013;
  lines.forEach((line, index) => {
    ctx.strokeText(line, width / 2, titleY + step * index);
    ctx.fillText(line, width / 2, titleY + step * index);
  });

  if (subtitle) {
    ctx.fillStyle = colors.ink;
    ctx.font = `800 ${short * .026}px system-ui, sans-serif`;
    ctx.letterSpacing = `${short * .004}px`;
    ctx.fillText(subtitle, width / 2, title ? titleY + step * (lines.length - 1) + size * .61 : center, width * .84);
    ctx.letterSpacing = "0px";
  }
}

function drawPoster(canvas, state, showSelection = false) {
  const [width, height] = sizes[state.size];
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext("2d");
  const short = Math.min(width, height);
  const colors = palettes[state.grade];
  const points = layouts[state.layout];
  const paths = points.map(polygon => panelPath(polygon, width, height));
  ctx.fillStyle = "#16101c";
  ctx.fillRect(0, 0, width, height);
  paths.forEach((path, index) => {
    const photo = state.photos[index];
    ctx.save();
    ctx.clip(path);
    if (photo.image) {
      const frame = photoFrame(points[index], photo, width, height);
      ctx.filter = colors.filter;
      ctx.drawImage(photo.image, frame.x, frame.y, frame.w, frame.h);
      ctx.filter = "none";
      ctx.fillStyle = colors.wash;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
    ctx.strokeStyle = "#18101d";
    ctx.lineWidth = short * .014;
    ctx.stroke(path);
  });

  drawCaption(ctx, width, height, state, colors);
  ctx.strokeStyle = "#18101d";
  ctx.lineWidth = short * .031;
  ctx.strokeRect(0, 0, width, height);
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = short * .0017;
  const inset = short * .014;
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);

  if (showSelection) {
    ctx.save();
    ctx.clip(paths[state.selected]);
    ctx.strokeStyle = "#fff3cf";
    ctx.lineWidth = short * .007;
    ctx.setLineDash([short * .013, short * .008]);
    ctx.stroke(paths[state.selected]);
    ctx.restore();
  }
}
