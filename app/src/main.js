"use strict";

const byId = id => document.getElementById(id);
const canvas = byId("poster");
const panelPicker = byId("panels");
const status = byId("status");
const cropInputs = ["zoom", "x", "y"];
const sampleNames = ["skyline", "palms", "motel", "highway"];
const state = {
  size: "square",
  layout: "mosaic",
  grade: "sunset",
  selected: 0,
  caption: byId("caption").value,
  subtitle: byId("subtitle").value,
  photos: sampleNames.map(() => ({ image: null, zoom: 1, x: 0, y: 0 })),
};
let drag = null;
let highlight = false;
let frameRequest = 0;

function render() {
  if (frameRequest) return;
  frameRequest = requestAnimationFrame(() => {
    frameRequest = 0;
    drawPoster(canvas, state, highlight);
  });
}

function setPressed(container, key, value) {
  for (const button of container.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", button.dataset[key] === String(value));
  }
}

function syncCrop() {
  const photo = state.photos[state.selected];
  for (const key of cropInputs) byId(key).value = photo[key];
  byId("reset").disabled = !photo.image;
}

function selectPanel(index, showSelection) {
  state.selected = index;
  highlight = showSelection;
  setPressed(panelPicker, "panel", index);
  syncCrop();
  render();
}

function syncPanels() {
  for (const [index, button] of [...panelPicker.children].entries()) {
    const photo = state.photos[index];
    button.hidden = index >= layouts[state.layout].length;
    button.style.backgroundImage = photo.image ? `url("${photo.image.src}")` : "";
  }
  selectPanel(state.selected, highlight);
}

function syncSize() {
  const [width, height] = sizes[state.size];
  canvas.style.setProperty("--ratio", width / height);
  byId("dimensions").textContent = `${width} × ${height} px`;
  setPressed(byId("formats"), "size", state.size);
  render();
}

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

sampleNames.forEach((name, index) => {
  const photo = state.photos[index];
  const button = document.createElement("button");
  button.dataset.panel = index;
  button.setAttribute("aria-label", `Panel ${index + 1}`);
  const number = document.createElement("span");
  number.textContent = index + 1;
  button.append(number);
  button.addEventListener("click", () => selectPanel(index, true));
  panelPicker.append(button);
  loadImage(sampleScene(name)).then(image => {
    if (state.photos[index] !== photo) return;
    photo.image = image;
    syncPanels();
  }).catch(() => {
    status.textContent = "A sample could not load. You can replace it with a local photo.";
  });
});

for (const [id, key, update] of [
  ["formats", "size", syncSize],
  ["grades", "grade", () => {
    setPressed(byId("grades"), "grade", state.grade);
    render();
  }],
]) {
  byId(id).addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    state[key] = button.dataset[key];
    update();
  });
}

byId("layout").addEventListener("change", event => {
  state.layout = event.target.value;
  state.selected = Math.min(state.selected, layouts[state.layout].length - 1);
  syncPanels();
});

for (const key of ["caption", "subtitle", ...cropInputs]) {
  byId(key).addEventListener("input", event => {
    if (cropInputs.includes(key)) {
      state.photos[state.selected][key] = Number(event.target.value);
      highlight = true;
    } else {
      state[key] = event.target.value;
      highlight = false;
    }
    render();
  });
}

const fileInput = byId("file");
let uploadPanel = 0;
const pendingUploads = new Map();
byId("upload").addEventListener("click", () => {
  uploadPanel = state.selected;
  fileInput.click();
});
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  fileInput.value = "";
  if (!file) return;
  const index = uploadPanel;
  const url = URL.createObjectURL(file);
  pendingUploads.set(index, url);
  const previous = state.photos[index];
  let keepUrl = false;
  try {
    const image = await loadImage(url);
    if (pendingUploads.get(index) !== url) return;
    state.photos[index] = { image, objectUrl: url, zoom: 1, x: 0, y: 0 };
    keepUrl = true;
    if (previous.objectUrl) URL.revokeObjectURL(previous.objectUrl);
    status.textContent = `Photo loaded into panel ${index + 1}.`;
    syncPanels();
  } catch {
    if (pendingUploads.get(index) === url) status.textContent = "This image could not be opened. Try a JPEG, PNG, or WebP.";
  } finally {
    if (pendingUploads.get(index) === url) pendingUploads.delete(index);
    if (!keepUrl) URL.revokeObjectURL(url);
  }
});

byId("reset").addEventListener("click", () => {
  Object.assign(state.photos[state.selected], { zoom: 1, x: 0, y: 0 });
  syncCrop();
  render();
});

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return [(event.clientX - rect.left) * canvas.width / rect.width,
    (event.clientY - rect.top) * canvas.height / rect.height];
}

canvas.addEventListener("pointerdown", event => {
  if (drag || event.button !== 0) return;
  const [x, y] = canvasPoint(event);
  const polygons = layouts[state.layout];
  const ctx = canvas.getContext("2d");
  const index = polygons.findIndex(points => ctx.isPointInPath(panelPath(points, canvas.width, canvas.height), x, y));
  if (index < 0) return;
  selectPanel(index, true);
  const photo = state.photos[index];
  if (!photo.image) return;
  const frame = photoFrame(polygons[index], photo, canvas.width, canvas.height);
  drag = { pointer: event.pointerId, x, y, photo, frame, startX: photo.x, startY: photo.y };
  canvas.setPointerCapture(event.pointerId);
});

const clamp = value => Math.max(-1, Math.min(1, value));
canvas.addEventListener("pointermove", event => {
  if (drag?.pointer !== event.pointerId) return;
  const [x, y] = canvasPoint(event);
  const { photo, frame } = drag;
  if (frame.overflowX) photo.x = clamp(drag.startX + (x - drag.x) / frame.overflowX);
  if (frame.overflowY) photo.y = clamp(drag.startY + (y - drag.y) / frame.overflowY);
  syncCrop();
  render();
});
canvas.addEventListener("lostpointercapture", () => { drag = null; });
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  highlight = false;
  render();
});

byId("export").addEventListener("click", () => {
  const result = document.createElement("canvas");
  drawPoster(result, state);
  const name = state.caption.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "afterlight";
  result.toBlob(blob => {
    if (!blob) {
      status.textContent = "The PNG could not be created. Try again.";
      return;
    }
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${name}-${result.width}x${result.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    status.textContent = `PNG ready · ${result.width} × ${result.height}`;
  }, "image/png");
});

syncSize();
syncPanels();
setPressed(byId("grades"), "grade", state.grade);
