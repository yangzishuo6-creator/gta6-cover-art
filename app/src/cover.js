// All geometry is shared by the live canvas, hit testing, and full-size PNG export.
const seam = x => [x, .61 - .14 * x];
const panels = [
  [[0,0],[.57,0],seam(.49),seam(0)],
  [[.57,0],[1,0],seam(1),seam(.49)],
  [seam(0),seam(.36),[.27,1],[0,1]],
  [seam(.36),seam(1),[1,1],[.27,1]],
];

const looks = {
  sunset: { filter: 'contrast(1.08) saturate(1.20)', light: '#ffad70', dark: '#6b2765', text: ['#fff6db','#ffad8f','#fb7ba9'], accent: '#ffc683' },
  neon: { filter: 'contrast(1.14) saturate(1.26)', light: '#6af9e5', dark: '#51267e', text: ['#edffed','#a5ffec','#68d6f4'], accent: '#f6a4ff' },
  original: { filter: 'none', text: ['#fff8e7','#fff8e7','#fff8e7'], accent: '#ffcf99' },
};

function panelGeometry(width, height) {
  const edge = Math.min(width, height) * .018;
  return panels.map(points => {
    const path = new Path2D();
    const xs = [];
    const ys = [];
    points.forEach(([x,y], index) => {
      xs.push(edge + x * (width - 2 * edge));
      ys.push(edge + y * (height - 2 * edge));
      if (index === 0) path.moveTo(xs[index], ys[index]);
      else path.lineTo(xs[index], ys[index]);
    });
    path.closePath();
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { path, x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  });
}

function photoPlacement(box, image, crop) {
  const scale = Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight) * crop.zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const overflowX = width - box.width;
  const overflowY = height - box.height;
  return { width, height, overflowX, overflowY, x: box.x - overflowX * crop.x, y: box.y - overflowY * crop.y };
}

function paintPanel(ctx, box, crop, image, look, index, unit) {
  ctx.save();
  ctx.clip(box.path);
  ctx.fillStyle = '#422548';
  ctx.fillRect(box.x, box.y, box.width, box.height);
  if (image) {
    const frame = photoPlacement(box, image, crop);
    ctx.filter = look.filter;
    ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height);
    ctx.filter = 'none';
    if (look.light) {
      const grade = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height);
      grade.addColorStop(0, index % 2 ? look.dark : look.light);
      grade.addColorStop(1, index % 2 ? look.light : look.dark);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = .48;
      ctx.fillStyle = grade;
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }
  ctx.strokeStyle = '#100d1a';
  ctx.lineWidth = unit * .017;
  ctx.stroke(box.path);
  ctx.restore();
}

function headlineLines(value) {
  const lines = value.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length !== 1 || lines[0].length < 20) return lines;
  const words = lines[0].split(/\s+/);
  if (words.length < 2) return lines;
  const middle = Math.ceil(words.length / 2);
  return [words.slice(0, middle).join(' '), words.slice(middle).join(' ')];
}

function paintLettering(ctx, width, height, unit, state, look) {
  const lines = headlineLines(state.caption).map(line => line.toUpperCase());
  const tall = height > width * 1.12;
  const wide = width > height * 1.4;
  const center = height * (tall ? .56 : .55);
  const maxWidth = Math.min(width * .87, height * 1.17);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.font = '100px Headline, Interface';
  const longest = Math.max(1, ...lines.map(line => ctx.measureText(line).width));
  const size = Math.min(unit * (wide ? .257 : .245), maxWidth / longest * 100, height * .53 / Math.max(1, lines.length));
  ctx.font = `${size}px Headline, Interface`;
  const lineHeight = size * .79;
  const first = center - (lines.length - 1) * lineHeight / 2 - (state.tagline ? unit * .035 : 0);
  const gradient = ctx.createLinearGradient(0, first - size * .33, 0, first + (lines.length - 1) * lineHeight + size * .32);
  look.text.forEach((color, index) => gradient.addColorStop(index / 2, color));
  lines.forEach((line, index) => {
    const y = first + index * lineHeight;
    ctx.strokeStyle = '#2c132e';
    ctx.lineWidth = size * .105;
    ctx.strokeText(line, width * .5 + size * .026, y + size * .055);
    ctx.fillStyle = '#2c132e';
    ctx.fillText(line, width * .5 + size * .026, y + size * .055);
    ctx.strokeStyle = '#160f22';
    ctx.lineWidth = size * .067;
    ctx.strokeText(line, width * .5, y);
    ctx.fillStyle = gradient;
    ctx.fillText(line, width * .5, y);
  });

  if (state.tagline.trim()) {
    const y = lines.length ? first + (lines.length - 1) * lineHeight + size * .53 : center;
    ctx.save();
    ctx.translate(width * .52, y);
    ctx.rotate(-.085);
    ctx.font = `${unit * .072}px Marker, Interface`;
    ctx.strokeStyle = '#24122c';
    ctx.lineWidth = unit * .011;
    ctx.strokeText(state.tagline.trim(), 0, 0, width * .79);
    ctx.fillStyle = look.accent;
    ctx.fillText(state.tagline.trim(), 0, 0, width * .79);
    ctx.restore();
  }
}

function renderCover(canvas, width, height, state, showSelection = false) {
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d');
  const unit = Math.min(width, height);
  const look = looks[state.grade];
  const geometry = panelGeometry(width, height);
  ctx.fillStyle = '#100d1a';
  ctx.fillRect(0, 0, width, height);
  geometry.forEach((box, index) => {
    const crop = state.crops[index];
    paintPanel(ctx, box, crop, state.photos[crop.photo]?.image, look, index, unit);
  });
  ctx.strokeStyle = '#fcb6a088';
  ctx.lineWidth = unit * .0018;
  ctx.strokeRect(unit * .011, unit * .011, width - unit * .022, height - unit * .022);
  paintLettering(ctx, width, height, unit, state, look);
  if (showSelection) {
    ctx.strokeStyle = '#ffdec4';
    ctx.lineWidth = unit * .003;
    ctx.stroke(geometry[state.selected].path);
  }
}
