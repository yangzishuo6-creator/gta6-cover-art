const byId = id => document.getElementById(id);
const canvas = byId('poster');
const status = byId('status');
const formatButtons = [...byId('formats').querySelectorAll('button')];
const gradeButtons = [...byId('grades').querySelectorAll('button')];
const demo = [
  ['driver', 'The driver', .52, .09],
  ['getaway', 'The getaway', .50, .64],
  ['hotel', 'The hotel', .51, .37],
  ['speedboat', 'The speedboat', .52, .74],
];
const state = {
  photos: [], crops: [], selected: 0, grade: 'sunset',
  width: 1920, height: 1080,
  caption: byId('caption').defaultValue, tagline: byId('tagline').defaultValue,
};
let demoPhotos;
let pendingPaint;
let batch = 0;
let drag;

function loadPhoto(url, name, local = false) {
  const image = new Image();
  image.src = url;
  return image.decode().then(() => ({ image, name, local }), error => {
    if (local) URL.revokeObjectURL(url);
    throw error;
  });
}

function requestPreview() {
  if (pendingPaint) return;
  pendingPaint = requestAnimationFrame(() => {
    pendingPaint = 0;
    if (!state.crops.length) return;
    const scale = 1000 / Math.max(state.width, state.height);
    renderCover(canvas, Math.round(state.width * scale), Math.round(state.height * scale), state, true);
  });
}

function updateCropControls() {
  const crop = state.crops[state.selected];
  byId('zoom').value = crop.zoom;
  byId('zoom-value').value = `${Math.round(crop.zoom * 100)}%`;
  byId('pan-x').value = crop.x;
  byId('pan-y').value = crop.y;
}

function updatePanels(rebuild = false) {
  const container = byId('panels');
  if (rebuild) {
    container.replaceChildren(...state.crops.map((crop, index) => {
      const button = document.createElement('button');
      const thumbnail = document.createElement('img');
      const label = document.createElement('span');
      button.setAttribute('aria-label', `Panel ${index + 1}`);
      button.addEventListener('click', () => selectPanel(index));
      thumbnail.alt = '';
      label.textContent = index + 1;
      button.append(thumbnail, label);
      return button;
    }));
  }
  Array.from(container.children).forEach((button, index) => {
    const url = state.photos[state.crops[index].photo]?.image.src;
    if (url) button.firstElementChild.src = url;
    button.setAttribute('aria-pressed', index === state.selected);
  });
}

function selectPanel(index) {
  state.selected = index;
  byId('panel-name').textContent = `Panel ${index + 1}`;
  byId('photo').value = state.crops[index].photo;
  updatePanels();
  updateCropControls();
  requestPreview();
}

function updatePhotoOptions() {
  byId('photo').replaceChildren(...state.photos.map(({name}, index) => new Option(name, index)));
}

function setFormat(button) {
  formatButtons.forEach(item => item.setAttribute('aria-pressed', item === button));
  state.width = Number(button.dataset.width);
  state.height = Number(button.dataset.height);
  byId('dimensions').textContent = `${state.width} × ${state.height} px`;
  requestPreview();
}

function setGrade(button) {
  gradeButtons.forEach(item => item.setAttribute('aria-pressed', item === button));
  state.grade = button.dataset.grade;
  requestPreview();
}

function resetDemo() {
  if (!demoPhotos) return;
  batch++;
  state.photos.filter(photo => photo.local).forEach(photo => URL.revokeObjectURL(photo.image.src));
  state.photos = [...demoPhotos];
  state.crops = demo.map(([, , x, y], photo) => ({ photo, zoom: 1, x, y }));
  byId('caption').value = state.caption = byId('caption').defaultValue;
  byId('tagline').value = state.tagline = byId('tagline').defaultValue;
  setFormat(formatButtons[2]);
  setGrade(gradeButtons[0]);
  updatePhotoOptions();
  updatePanels(true);
  selectPanel(0);
  status.textContent = 'Photos stay on this device.';
}

async function importPhotos(files) {
  if (!demoPhotos || !files.length) return;
  const resetAt = batch;
  const selected = state.selected;
  const results = await Promise.allSettled(Array.from(files, file => loadPhoto(URL.createObjectURL(file), file.name, true)));
  const photos = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  if (resetAt !== batch) {
    photos.forEach(photo => URL.revokeObjectURL(photo.image.src));
    return;
  }
  if (!photos.length) {
    status.textContent = 'Could not open these images. Try JPEG, PNG or WebP.';
    return;
  }
  const first = state.photos.length;
  state.photos.push(...photos);
  photos.slice(0, state.crops.length).forEach((photo, offset) => {
    state.crops[(selected + offset) % state.crops.length] = { photo: first + offset, zoom: 1, x: .5, y: .5 };
  });
  updatePhotoOptions();
  selectPanel(selected);
  const skipped = results.length - photos.length;
  status.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} added.${skipped ? ` ${skipped} could not open.` : ' Stored on this device for this session.'}`;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height,
  };
}

function beginPan(event) {
  if (!state.crops.length || event.button !== 0 || drag) return;
  const point = canvasPoint(event);
  const geometry = panelGeometry(canvas.width, canvas.height);
  const ctx = canvas.getContext('2d');
  const index = geometry.findIndex(box => ctx.isPointInPath(box.path, point.x, point.y));
  if (index < 0) return;
  selectPanel(index);
  const crop = state.crops[index];
  const image = state.photos[crop.photo]?.image;
  if (!image) return;
  canvas.setPointerCapture(event.pointerId);
  drag = { id: event.pointerId, index, start: point, x: crop.x, y: crop.y, photo: photoPlacement(geometry[index], image, crop) };
}

function movePan(event) {
  if (drag?.id !== event.pointerId) return;
  const crop = state.crops[drag.index];
  const point = canvasPoint(event);
  const clamp = value => Math.max(0, Math.min(1, value));
  if (drag.photo.overflowX > .01) crop.x = clamp(drag.x - (point.x - drag.start.x) / drag.photo.overflowX);
  if (drag.photo.overflowY > .01) crop.y = clamp(drag.y - (point.y - drag.start.y) / drag.photo.overflowY);
  updateCropControls();
  requestPreview();
}

async function exportPng() {
  const button = byId('export');
  button.disabled = true;
  const { width, height, caption } = state;
  status.textContent = 'Rendering PNG…';
  try {
    const output = document.createElement('canvas');
    renderCover(output, width, height, state);
    const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG encoding failed');
    const slug = caption.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'heatwave';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug}-${width}x${height}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status.textContent = `Exported ${width} × ${height} PNG.`;
  } catch {
    status.textContent = 'Could not export PNG. Try again.';
  } finally {
    button.disabled = false;
  }
}

function bindEditor() {
  formatButtons.forEach(button => button.addEventListener('click', () => setFormat(button)));
  gradeButtons.forEach(button => button.addEventListener('click', () => setGrade(button)));
  ['caption', 'tagline'].forEach(key => byId(key).addEventListener('input', event => {
    state[key] = event.target.value;
    requestPreview();
  }));
  byId('add').addEventListener('click', () => byId('files').click());
  byId('files').addEventListener('change', event => {
    importPhotos(event.target.files);
    event.target.value = '';
  });
  byId('photo').addEventListener('change', event => {
    state.crops[state.selected] = { photo: Number(event.target.value), zoom: 1, x: .5, y: .5 };
    selectPanel(state.selected);
  });
  byId('fill').addEventListener('click', () => {
    const source = state.crops[state.selected];
    state.crops.forEach((crop, index) => {
      if (index !== state.selected) crop.photo = source.photo;
    });
    updatePanels();
    requestPreview();
  });
  Object.entries({ 'pan-x': 'x', 'pan-y': 'y', zoom: 'zoom' }).forEach(([id, key]) => {
    byId(id).addEventListener('input', event => {
      state.crops[state.selected][key] = Number(event.target.value);
      updateCropControls();
      requestPreview();
    });
  });
  byId('recenter').addEventListener('click', () => {
    Object.assign(state.crops[state.selected], { zoom: 1, x: .5, y: .5 });
    updateCropControls();
    requestPreview();
  });
  byId('reset').addEventListener('click', resetDemo);
  byId('export').addEventListener('click', exportPng);
  canvas.addEventListener('pointerdown', beginPan);
  canvas.addEventListener('pointermove', movePan);
  canvas.addEventListener('lostpointercapture', () => { drag = null; });

  const stage = byId('stage');
  stage.addEventListener('dragover', event => {
    event.preventDefault();
    stage.classList.add('drop');
  });
  stage.addEventListener('dragleave', event => {
    if (!stage.contains(event.relatedTarget)) stage.classList.remove('drop');
  });
  stage.addEventListener('drop', event => {
    event.preventDefault();
    stage.classList.remove('drop');
    importPhotos(event.dataTransfer.files);
  });
}

async function startEditor() {
  try {
    const [photos] = await Promise.all([
      Promise.all(demo.map(([file, name]) => loadPhoto(`./samples/${file}.jpg`, name))),
      document.fonts.load('100px Headline'),
      document.fonts.load('80px Marker'),
      document.fonts.load('14px Interface'),
    ]);
    demoPhotos = photos;
    resetDemo();
    bindEditor();
    byId('export').disabled = false;
  } catch {
    status.textContent = 'The editor could not load its local assets. Reload to try again.';
  }
}

startEditor();
