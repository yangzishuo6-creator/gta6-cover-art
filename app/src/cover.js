const layouts = {
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
  duo: [
    [[0, 0], [.61, 0], [.42, 1], [0, 1]],
    [[.61, 0], [1, 0], [1, 1], [.42, 1]],
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

function drawCover(canvas, layout, panels, grade, caption) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const unit = Math.min(width, height);
  layouts[layout].forEach((points, index) => {
    const path = panelPath(points, width, height);
    const xs = points.map(([x]) => x * width);
    const ys = points.map(([, y]) => y * height);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const w = Math.max(...xs) - left;
    const h = Math.max(...ys) - top;
    const { image, zoom, x, y } = panels[index];
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = ['#6d395d', '#2b4368', '#392747', '#775141'][index];
    ctx.fillRect(left, top, w, h);
    if (image) {
      const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * zoom / 100;
      const dw = image.naturalWidth * scale;
      const dh = image.naturalHeight * scale;
      ctx.drawImage(image, left - (dw - w) * (100 - x) / 200, top - (dh - h) * (100 - y) / 200, dw, dh);
    }
    if (grade !== 'none') {
      const tint = ctx.createLinearGradient(left, top, left + w, top + h);
      tint.addColorStop(0, grade === 'sunset' ? '#ffae6240' : '#43e5ff55');
      tint.addColorStop(1, grade === 'sunset' ? '#bd276938' : '#df249a69');
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = tint;
      ctx.fillRect(left, top, w, h);
    }
    ctx.restore();
  });
  ctx.strokeStyle = '#140f20';
  ctx.lineWidth = unit * .014;
  layouts[layout].forEach(points => ctx.stroke(panelPath(points, width, height)));
  ctx.lineWidth *= 2;
  ctx.strokeRect(0, 0, width, height);

  const text = caption.trim().toUpperCase();
  if (!text) return;
  const center = height * .535;
  const shade = ctx.createLinearGradient(0, center - unit * .19, 0, center + unit * .19);
  shade.addColorStop(0, '#140b2000');
  shade.addColorStop(.5, '#140b20a8');
  shade.addColorStop(1, '#140b2000');
  ctx.fillStyle = shade;
  ctx.fillRect(0, center - unit * .19, width, unit * .38);
  let size = unit * .156;
  ctx.font = `italic 900 ${size}px system-ui, sans-serif`;
  size *= Math.min(1, width * .85 / ctx.measureText(text).width);
  ctx.font = `italic 900 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * .10;
  ctx.strokeStyle = '#211329';
  ctx.fillStyle = '#fff2dc';
  ctx.strokeText(text, width / 2, center);
  ctx.fillText(text, width / 2, center);
}
