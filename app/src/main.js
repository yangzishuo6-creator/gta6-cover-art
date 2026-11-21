const byId = id => document.getElementById(id);
const canvas = byId('cover');
const caption = byId('caption');
const subtitle = byId('subtitle');
const photoPicker = byId('panel-photo');
const status = byId('status');
const format = byId('format');
const formats = { square: [1080, 1080], portrait: [1080, 1350], wide: [1920, 1080] };
const framing = { zoom: 100, x: 0, y: 0 };
const controls = Object.keys(framing);
const library = [
  { name: 'Balcony', src: './samples/balcony.jpg' },
  { name: 'Getaway Driver', src: './samples/driver.jpg' },
  { name: 'Neon Diner', src: './samples/diner.jpg' },
  { name: 'Coastal Run', src: './samples/speedboat.jpg' },
  { name: 'Palm Boulevard', src: './samples/boulevard.jpg' },
];
const panels = [0, 1, 2, 3, 4, 1].map((photo, index) => ({
  ...framing, photo, image: null,
  y: [73, 61, 69, 0, 0, -90][index],
  zoom: index === 5 ? 115 : 100,
}));
let layout = 'tiled';
let grade = 'sunset';
let selected = 0;
let drag;
let animationFrame;

function redraw() {
  const [width, height] = formats[format.value];
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  byId('dimensions').textContent = `${width} × ${height}`;
  canvas.style.setProperty('--ratio', width / height);
  drawCover(canvas, layout, panels, grade, caption.value, subtitle.value);
}

function syncFraming() {
  controls.forEach(key => {
    const value = panels[selected][key];
    byId(key).value = value;
    byId(`${key}-value`).textContent = `${value}%`;
  });
}

function syncPanels() {
  byId('panels').replaceChildren(...panels.slice(0, layouts[layout].length).map((panel, index) => {
    const button = document.createElement('button');
    button.dataset.panel = index;
    button.setAttribute('aria-pressed', selected === index);
    const thumb = document.createElement('img');
    thumb.alt = '';
    if (panel.image) thumb.src = panel.image.src;
    const label = document.createElement('span');
    label.textContent = `${index + 1}. ${library[panel.photo].name}`;
    button.append(thumb, label);
    button.addEventListener('click', () => selectPanel(index));
    return button;
  }));
  selectPanel(selected);
}

function selectPanel(index) {
  selected = index;
  byId('panels').querySelectorAll('button').forEach((button, position) => {
    button.setAttribute('aria-pressed', position === selected);
  });
  photoPicker.value = panels[selected].photo;
  syncFraming();
}

function bindChoices(key, change) {
  const buttons = document.querySelectorAll(`[data-${key}]`);
  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(item => item.setAttribute('aria-pressed', item === button));
    change(button.dataset[key]);
    redraw();
  }));
}

bindChoices('layout', value => {
  drag = null;
  layout = value;
  selected = Math.min(selected, layouts[layout].length - 1);
  syncPanels();
});
bindChoices('grade', value => { grade = value; });
caption.addEventListener('input', redraw);
subtitle.addEventListener('input', redraw);
format.addEventListener('change', () => {
  drag = null;
  redraw();
});
controls.forEach(key => byId(key).addEventListener('input', event => {
  panels[selected][key] = Number(event.target.value);
  syncFraming();
  redraw();
}));
byId('reset').addEventListener('click', () => {
  Object.assign(panels[selected], framing);
  syncFraming();
  redraw();
});
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || drag) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * canvas.width / rect.width;
  const y = (event.clientY - rect.top) * canvas.height / rect.height;
  const ctx = canvas.getContext('2d');
  const index = layouts[layout].findIndex(points => ctx.isPointInPath(panelPath(points, canvas.width, canvas.height), x, y));
  if (index === -1) return;
  selectPanel(index);
  const panel = panels[index];
  if (!panel.image) return;
  const { w, h } = panelBounds(layouts[layout][index], canvas.width, canvas.height);
  const [dw, dh] = cropSize(panel.image, w, h, panel.zoom);
  drag = {
    id: event.pointerId, panel, startX: event.clientX, startY: event.clientY,
    x: panel.x, y: panel.y,
    scaleX: dw - w > .5 ? 200 * canvas.width / rect.width / (dw - w) : 0,
    scaleY: dh - h > .5 ? 200 * canvas.height / rect.height / (dh - h) : 0,
  };
  canvas.setPointerCapture(event.pointerId);
});

function clampPosition(value) {
  return Math.max(-100, Math.min(100, Math.round(value)));
}

canvas.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId) return;
  drag.panel.x = clampPosition(drag.x + (event.clientX - drag.startX) * drag.scaleX);
  drag.panel.y = clampPosition(drag.y + (event.clientY - drag.startY) * drag.scaleY);
  if (animationFrame) return;
  animationFrame = requestAnimationFrame(() => {
    animationFrame = null;
    syncFraming();
    redraw();
  });
});
canvas.addEventListener('lostpointercapture', event => {
  if (drag?.id === event.pointerId) drag = null;
});

async function decodePhoto(src) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

function syncLibrary() {
  photoPicker.replaceChildren(...library.map(({ name }, index) => new Option(name, index)));
  photoPicker.value = panels[selected].photo;
}

function assignPhoto(panel, photo) {
  drag = null;
  Object.assign(panel, framing, { photo, image: library[photo].image ?? null });
  syncPanels();
  redraw();
}

photoPicker.addEventListener('change', () => assignPhoto(panels[selected], Number(photoPicker.value)));

let uploadRevision = 0;
byId('photo').addEventListener('change', async event => {
  const files = Array.from(event.target.files);
  event.target.value = '';
  if (!files.length) return;
  const revision = ++uploadRevision;
  const panel = panels[selected];
  const previousPhoto = panel.photo;
  const results = await Promise.allSettled(files.map(async file => {
    const src = URL.createObjectURL(file);
    try {
      return { name: file.name, image: await decodePhoto(src) };
    } catch (error) {
      URL.revokeObjectURL(src);
      throw error;
    }
  }));
  const photos = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
  const first = library.length;
  library.push(...photos);
  syncLibrary();
  if (revision !== uploadRevision) return;
  if (photos.length && panel.photo === previousPhoto) assignPhoto(panel, first);
  const skipped = files.length - photos.length;
  status.textContent = skipped ? `Added ${photos.length} · Could not open ${skipped}` : `Added ${photos.length} local photo${photos.length === 1 ? '' : 's'}.`;
});
byId('export').addEventListener('click', () => {
  redraw();
  const name = `afterlight-${canvas.width}x${canvas.height}.png`;
  canvas.toBlob(blob => {
    if (!blob) {
      status.textContent = 'PNG export failed. Try again.';
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    status.textContent = `Downloaded ${name}`;
  }, 'image/png');
});

syncLibrary();
syncPanels();
redraw();
Promise.allSettled(library.map(async photo => { photo.image = await decodePhoto(photo.src); })).then(results => {
  for (const panel of panels) panel.image = library[panel.photo].image ?? null;
  syncPanels();
  redraw();
  byId('export').disabled = false;
  if (results.some(result => result.status === 'rejected') && !status.textContent) {
    status.textContent = 'Some sample photos could not open.';
  }
});
