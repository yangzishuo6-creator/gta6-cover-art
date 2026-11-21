const layouts = {
  hero: [
    [[0, 0], [.62, 0], [.50, .73], [0, .64]],
    [[.62, 0], [1, 0], [1, .48], [.55, .43]],
    [[.55, .43], [1, .48], [1, 1], [.46, 1]],
    [[0, .64], [.50, .73], [.46, 1], [0, 1]],
  ],
  tiled: [
    [[0, 0], [.61, 0], [.53, .67], [0, .71]],
    [[.61, 0], [1, 0], [1, .37], [.565, .38]],
    [[.565, .38], [1, .37], [1, .72], [.53, .67]],
    [[0, .71], [.29, .688], [.34, 1], [0, 1]],
    [[.29, .688], [.53, .67], [.70, .688], [.66, 1], [.34, 1]],
    [[.70, .688], [1, .72], [1, 1], [.66, 1]],
  ],
  mosaic: [
    [[0, 0], [.57, 0], [.49, .53], [0, .57]],
    [[.57, 0], [1, 0], [1, .49], [.49, .53]],
    [[0, .57], [.49, .53], [.58, 1], [0, 1]],
    [[.49, .53], [1, .49], [1, 1], [.58, 1]],
  ],
  triptych: [
    [[0, 0], [.39, 0], [.29, 1], [0, 1]],
    [[.39, 0], [.71, 0], [.61, 1], [.29, 1]],
    [[.71, 0], [1, 0], [1, 1], [.61, 1]],
  ],
};

function panelPath(points, width, height) {
  const path = new Path2D();
  points.forEach(([x, y], index) => {
    if (index === 0) path.moveTo(x * width, y * height);
    else path.lineTo(x * width, y * height);
  });
  path.closePath();
  return path;
}

function panelBounds(points, width, height) {
  const xs = points.map(([x]) => x * width);
  const ys = points.map(([, y]) => y * height);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, w: Math.max(...xs) - left, h: Math.max(...ys) - top };
}

function cropSize(image, w, h, zoom) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * zoom / 100;
  return [image.naturalWidth * scale, image.naturalHeight * scale];
}

function makeGrain() {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 144;
  const ctx = tile.getContext('2d');
  const pixels = ctx.createImageData(tile.width, tile.height);
  let seed = 2107;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const shade = seed >>> 24;
    pixels.data.set([shade, shade, shade, 30], i);
  }
  ctx.putImageData(pixels, 0, 0);
  return tile;
}

const grain = makeGrain();

function drawCover(canvas, layout, panels, grade, caption, subtitle) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const unit = Math.min(width, height);
  ctx.fillStyle = '#100c19';
  ctx.fillRect(0, 0, width, height);
  layouts[layout].forEach((points, index) => {
    const path = panelPath(points, width, height);
    const { left, top, w, h } = panelBounds(points, width, height);
    const { image, zoom, x, y } = panels[index];
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = index % 2 ? '#253851' : '#61304e';
    ctx.fillRect(left, top, w, h);
    if (image) {
      const [dw, dh] = cropSize(image, w, h, zoom);
      if (grade !== 'none') ctx.filter = 'saturate(1.28) contrast(1.13)';
      ctx.drawImage(image, left - (dw - w) * (100 - x) / 200, top - (dh - h) * (100 - y) / 200, dw, dh);
      ctx.filter = 'none';
    }
    if (grade !== 'none') {
      const tint = ctx.createLinearGradient(left, top, left + w, top + h);
      tint.addColorStop(0, grade === 'sunset' ? '#ffac5b9c' : '#3de5ff94');
      tint.addColorStop(1, grade === 'sunset' ? '#d126789c' : '#eb27ab96');
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = tint;
      ctx.fillRect(left, top, w, h);
      const glow = ctx.createRadialGradient(left + w * .22, top, 0, left + w * .22, top, Math.max(w, h) * .72);
      glow.addColorStop(0, grade === 'sunset' ? '#ff8a374e' : '#14e9ff45');
      glow.addColorStop(1, '#ff689000');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = glow;
      ctx.fillRect(left, top, w, h);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = ctx.createPattern(grain, 'repeat');
      ctx.fillRect(left, top, w, h);
    }
    ctx.restore();
  });
  ctx.strokeStyle = '#100c19';
  ctx.lineWidth = unit * .017;
  ctx.lineJoin = 'round';
  layouts[layout].forEach(points => ctx.stroke(panelPath(points, width, height)));
  ctx.lineWidth = unit * .044;
  ctx.strokeRect(0, 0, width, height);
  ctx.strokeStyle = '#ed9c786e';
  ctx.lineWidth = unit * .0015;
  const inset = unit * .012;
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);

  drawLettering(ctx, width, height, unit, caption.trim().toUpperCase(), subtitle.trim().toUpperCase());
}

function drawLettering(ctx, width, height, unit, title, subtitle) {
  if (!title && !subtitle) return;
  const center = height * .747;
  const shade = ctx.createLinearGradient(0, center - unit * .15, 0, center + unit * .20);
  shade.addColorStop(0, '#140b2000');
  shade.addColorStop(.5, '#140b2074');
  shade.addColorStop(1, '#140b2030');
  ctx.fillStyle = shade;
  const edge = unit * .022;
  ctx.fillRect(edge, center - unit * .15, width - edge * 2, Math.min(unit * .35, height - edge - center + unit * .15));
  ctx.save();
  ctx.translate(width * .50, center);
  ctx.rotate(-.048);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (title) {
    let size = unit * .213;
    ctx.font = `italic 1000 ${size}px system-ui, sans-serif`;
    size *= Math.min(1, width * .83 / ctx.measureText(title).width);
    ctx.font = `italic 1000 ${size}px system-ui, sans-serif`;
    const fill = ctx.createLinearGradient(0, -size * .30, 0, size * .39);
    fill.addColorStop(0, '#fff9dc');
    fill.addColorStop(.48, '#ffd397');
    fill.addColorStop(1, '#ff827a');
    ctx.lineWidth = size * .15;
    ctx.strokeStyle = '#140c20';
    ctx.shadowColor = '#120714d9';
    ctx.shadowBlur = unit * .019;
    ctx.shadowOffsetY = unit * .012;
    ctx.strokeText(title, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#b94567';
    ctx.lineWidth = size * .047;
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = fill;
    ctx.fillText(title, 0, 0);
  }
  if (subtitle) {
    ctx.translate(0, title ? unit * .103 : 0);
    ctx.font = `800 ${unit * .023}px system-ui, sans-serif`;
    ctx.letterSpacing = `${unit * .004}px`;
    const maxWidth = width * .78;
    const tagWidth = Math.min(ctx.measureText(subtitle).width, maxWidth) + unit * .064;
    ctx.transform(1, 0, -.24, 1, 0, 0);
    ctx.fillStyle = '#170e25';
    ctx.fillRect(-tagWidth / 2, -unit * .024, tagWidth, unit * .048);
    ctx.strokeStyle = '#ffb888';
    ctx.lineWidth = unit * .002;
    ctx.strokeRect(-tagWidth / 2, -unit * .024, tagWidth, unit * .048);
    ctx.fillStyle = '#ffdbc0';
    ctx.fillText(subtitle, 0, 0, maxWidth);
  }
  ctx.restore();
}
