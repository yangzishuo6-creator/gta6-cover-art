const byId = id => document.getElementById(id);
const canvas = byId('cover');
const caption = byId('caption');
const status = byId('status');
const format = byId('format');
const formats = { square: [1080, 1080], portrait: [1080, 1350], wide: [1920, 1080] };
const framing = { zoom: 100, x: 0, y: 0 };
const controls = Object.keys(framing);
const samples = ['Palm Boulevard', 'Midnight Skyline', 'Coastal Run', 'Pier Lights'];
const panels = samples.map(name => ({ name, image: null, revision: 0, ...framing }));
let layout = 'mosaic';
let grade = 'sunset';
let selected = 0;

function redraw() {
  const [width, height] = formats[format.value];
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  byId('dimensions').textContent = `${width} × ${height}`;
  canvas.style.setProperty('--ratio', width / height);
  drawCover(canvas, layout, panels, grade, caption.value);
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
    label.textContent = `${index + 1}. ${panel.name}`;
    button.append(thumb, label);
    button.addEventListener('click', () => selectPanel(index));
    return button;
  }));
  syncFraming();
}

function selectPanel(index) {
  selected = index;
  byId('panels').querySelectorAll('button').forEach((button, position) => {
    button.setAttribute('aria-pressed', position === selected);
  });
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
  layout = value;
  selected = Math.min(selected, layouts[layout].length - 1);
  syncPanels();
});
bindChoices('grade', value => { grade = value; });
caption.addEventListener('input', redraw);
format.addEventListener('change', redraw);
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
canvas.addEventListener('click', event => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * canvas.width / rect.width;
  const y = (event.clientY - rect.top) * canvas.height / rect.height;
  const ctx = canvas.getContext('2d');
  const index = layouts[layout].findIndex(points => ctx.isPointInPath(panelPath(points, canvas.width, canvas.height), x, y));
  if (index !== -1) selectPanel(index);
});

async function loadPhoto(panel, src, name, isLocal = false) {
  const revision = ++panel.revision;
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    if (revision !== panel.revision) return;
    if (panel.localUrl) URL.revokeObjectURL(panel.localUrl);
    Object.assign(panel, framing, { image, name, localUrl: isLocal ? src : null });
    syncPanels();
    redraw();
    if (isLocal) status.textContent = 'Local photo loaded.';
  } catch {
    if (revision === panel.revision) status.textContent = `Could not open ${name}.`;
  } finally {
    if (isLocal && panel.localUrl !== src) URL.revokeObjectURL(src);
  }
}

byId('photo').addEventListener('change', event => {
  const file = event.target.files[0];
  if (file) loadPhoto(panels[selected], URL.createObjectURL(file), file.name, true);
  event.target.value = '';
});
byId('export').addEventListener('click', () => {
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

syncPanels();
redraw();
panels.forEach((panel, index) => loadPhoto(panel, `./samples/scene-${index + 1}.jpg`, panel.name));
