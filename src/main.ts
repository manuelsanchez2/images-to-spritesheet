import "./style.css";

type LoadedImage = {
  id: string;
  file: File;
  url: string;
  image: HTMLImageElement;
  width: number;
  height: number;
  offsetX: number;
};

const fileInput = document.querySelector<HTMLInputElement>("#fileInput");
const dropzone = document.querySelector<HTMLLabelElement>(".dropzone");
const imageList = document.querySelector<HTMLDivElement>("#imageList");
const previewCanvas = document.querySelector<HTMLCanvasElement>("#previewCanvas");
const overlayCanvas = document.querySelector<HTMLCanvasElement>("#overlayCanvas");
const canvasStage = document.querySelector<HTMLDivElement>("#canvasStage");
const imageCount = document.querySelector<HTMLDivElement>("#imageCount");
const canvasSize = document.querySelector<HTMLDivElement>("#canvasSize");
const previewLabel = document.querySelector<HTMLSpanElement>("#previewLabel");
const paddingInput = document.querySelector<HTMLInputElement>("#paddingInput");
const alignSelect = document.querySelector<HTMLSelectElement>("#alignSelect");
const bgInput = document.querySelector<HTMLInputElement>("#bgInput");
const transparentToggle = document.querySelector<HTMLInputElement>("#transparentToggle");
const gridToggle = document.querySelector<HTMLInputElement>("#gridToggle");
const nameInput = document.querySelector<HTMLInputElement>("#nameInput");
const frameSpeedInput = document.querySelector<HTMLInputElement>("#frameSpeedInput");
const toggleAnimBtn = document.querySelector<HTMLButtonElement>("#toggleAnimBtn");
const animCanvas = document.querySelector<HTMLCanvasElement>("#animCanvas");
const zoomOutBtn = document.querySelector<HTMLButtonElement>("#zoomOutBtn");
const zoomInBtn = document.querySelector<HTMLButtonElement>("#zoomInBtn");
const zoomRange = document.querySelector<HTMLInputElement>("#zoomRange");
const zoomValue = document.querySelector<HTMLSpanElement>("#zoomValue");
const downloadBtn = document.querySelector<HTMLButtonElement>("#downloadBtn");
const clearBtn = document.querySelector<HTMLButtonElement>("#clearBtn");
const emptyState = document.querySelector<HTMLDivElement>("#emptyState");

if (
  !fileInput ||
  !dropzone ||
  !imageList ||
  !previewCanvas ||
  !overlayCanvas ||
  !canvasStage ||
  !imageCount ||
  !canvasSize ||
  !previewLabel ||
  !paddingInput ||
  !alignSelect ||
  !bgInput ||
  !transparentToggle ||
  !gridToggle ||
  !nameInput ||
  !frameSpeedInput ||
  !toggleAnimBtn ||
  !animCanvas ||
  !zoomOutBtn ||
  !zoomInBtn ||
  !zoomRange ||
  !zoomValue ||
  !downloadBtn ||
  !clearBtn ||
  !emptyState
) {
  throw new Error("Missing required elements");
}

const ctx = previewCanvas.getContext("2d");
if (!ctx) throw new Error("2D context not supported");
const overlayCtx = overlayCanvas.getContext("2d");
if (!overlayCtx) throw new Error("2D context not supported");
const animCtx = animCanvas.getContext("2d");
if (!animCtx) throw new Error("2D context not supported");

const state: LoadedImage[] = [];
let zoom = 1;
let animTimer: number | null = null;
let animIndex = 0;
let animPlaying = true;

const updateStats = (width: number, height: number) => {
  imageCount.textContent = String(state.length);
  canvasSize.textContent = `${width} × ${height}`;
};

const setPreviewStatus = (text: string) => {
  previewLabel.textContent = text;
};

const clearCanvas = () => {
  ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
};

const clearOverlay = () => {
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
};

const clearAnim = () => {
  animCtx.clearRect(0, 0, animCanvas.width, animCanvas.height);
};

const drawAnimFrame = () => {
  if (state.length === 0) {
    clearAnim();
    return;
  }

  const frame = state[animIndex % state.length];
  const canvasWidth = animCanvas.width;
  const canvasHeight = animCanvas.height;

  clearAnim();
  if (!transparentToggle.checked) {
    animCtx.fillStyle = bgInput.value;
    animCtx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  const maxWidth = Math.max(...state.map((item) => item.width));
  const maxHeight = Math.max(...state.map((item) => item.height));
  const offsetX = (canvasWidth - maxWidth) / 2;
  const offsetY = (canvasHeight - maxHeight) / 2;
  const drawX = offsetX + (maxWidth - frame.width) / 2 + frame.offsetX;
  const drawY = offsetY + (maxHeight - frame.height) / 2;

  animCtx.drawImage(frame.image, drawX, drawY, frame.width, frame.height);
};

const startAnimation = () => {
  const speed = Math.max(20, Number(frameSpeedInput.value) || 150);
  if (animTimer) window.clearInterval(animTimer);
  animTimer = window.setInterval(() => {
    if (!animPlaying) return;
    animIndex = (animIndex + 1) % Math.max(1, state.length);
    drawAnimFrame();
  }, speed);
};

const updateZoom = (value: number) => {
  zoom = Math.min(2, Math.max(0.25, value));
  canvasStage.style.transform = `scale(${zoom})`;
  zoomRange.value = String(Math.round(zoom * 100));
  zoomValue.textContent = `${Math.round(zoom * 100)}%`;
};

const drawPreview = () => {
  if (state.length === 0) {
    previewCanvas.width = 0;
    previewCanvas.height = 0;
    overlayCanvas.width = 0;
    overlayCanvas.height = 0;
    clearCanvas();
    clearOverlay();
    updateStats(0, 0);
    setPreviewStatus("Waiting for images");
    emptyState.style.opacity = "1";
    return;
  }

  const padding = Math.max(0, Number(paddingInput.value) || 0);
  const maxHeight = Math.max(...state.map((item) => item.height));
  const maxWidth = Math.max(...state.map((item) => item.width));

  const cellWidth = maxWidth;
  const cellHeight = maxHeight;

  const totalWidth =
    cellWidth * state.length + padding * (state.length + 1);
  const totalHeight = cellHeight + padding * 2;

  previewCanvas.width = totalWidth;
  previewCanvas.height = totalHeight;
  overlayCanvas.width = totalWidth;
  overlayCanvas.height = totalHeight;

  if (!transparentToggle.checked) {
    ctx.fillStyle = bgInput.value;
    ctx.fillRect(0, 0, totalWidth, totalHeight);
  } else {
    ctx.clearRect(0, 0, totalWidth, totalHeight);
  }

  clearOverlay();

  let cursorX = padding;
  for (const item of state) {
    const availableHeight = cellHeight;
    let offsetY = padding;
    if (alignSelect.value === "center") {
      offsetY = padding + (availableHeight - item.height) / 2;
    }
    if (alignSelect.value === "bottom") {
      offsetY = padding + (availableHeight - item.height);
    }

    const drawX = cursorX + (cellWidth - item.width) / 2 + item.offsetX;

    ctx.drawImage(item.image, drawX, offsetY, item.width, item.height);
    cursorX += cellWidth + padding;
  }

  if (gridToggle.checked) {
    overlayCtx.save();
    overlayCtx.strokeStyle = "rgba(37, 99, 235, 0.6)";
    overlayCtx.lineWidth = 1;
    overlayCtx.setLineDash([6, 6]);

    const gridCellWidth = cellWidth + padding;
    for (let i = 0; i <= state.length; i += 1) {
      const lineX = i * gridCellWidth;
      overlayCtx.beginPath();
      overlayCtx.moveTo(lineX, 0);
      overlayCtx.lineTo(lineX, totalHeight);
      overlayCtx.stroke();
    }

    overlayCtx.beginPath();
    overlayCtx.rect(0, 0, totalWidth, totalHeight);
    overlayCtx.stroke();
    overlayCtx.restore();
  }

  updateStats(totalWidth, totalHeight);
  setPreviewStatus("Ready to download");
  emptyState.style.opacity = "0";
  drawAnimFrame();
};

const addImage = async (file: File) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  await image.decode();

  const loaded: LoadedImage = {
    id: crypto.randomUUID(),
    file,
    url,
    image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    offsetX: 0
  };

  state.push(loaded);
  renderList();
  drawPreview();
};

const removeImage = (id: string) => {
  const index = state.findIndex((item) => item.id === id);
  if (index === -1) return;
  const [removed] = state.splice(index, 1);
  URL.revokeObjectURL(removed.url);
  renderList();
  drawPreview();
};

const renderList = () => {
  imageList.innerHTML = "";

  if (state.length === 0) {
    imageList.innerHTML =
      "<div class=\"list__empty\">No images yet. Upload a few files to get started.</div>";
    return;
  }

  for (const item of state) {
    const row = document.createElement("div");
    row.className = "list__item";
    row.draggable = true;
    row.dataset.id = item.id;

    const thumb = document.createElement("img");
    thumb.src = item.url;
    thumb.alt = item.file.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <strong>${item.file.name}</strong>
      <span>${item.width} × ${item.height}px</span>
    `;

    const offsetWrap = document.createElement("label");
    offsetWrap.className = "offset";
    offsetWrap.innerHTML = `
      <span>Offset X</span>
      <input type="number" value="${item.offsetX}" step="1" />
    `;
    const offsetInput = offsetWrap.querySelector("input");
    offsetInput?.addEventListener("input", (event) => {
      const target = event.target as HTMLInputElement;
      const value = Number(target.value);
      item.offsetX = Number.isFinite(value) ? value : 0;
      drawPreview();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "ghost";
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeImage(item.id));

    row.append(thumb, meta, offsetWrap, removeBtn);
    imageList.append(row);
  }
};

const handleFiles = async (files: FileList | null) => {
  if (!files || files.length === 0) return;

  const list = Array.from(files);
  for (const file of list) {
    if (!file.type.startsWith("image/")) continue;
    await addImage(file);
  }

  fileInput.value = "";
  animIndex = 0;
  drawAnimFrame();
};

fileInput.addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement;
  handleFiles(target.files);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dropzone--active");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dropzone--active");
  });
});

dropzone.addEventListener("drop", (event) => {
  const dataTransfer = (event as DragEvent).dataTransfer;
  handleFiles(dataTransfer?.files ?? null);
});

[paddingInput, alignSelect, bgInput, transparentToggle].forEach((input) => {
  input.addEventListener("input", () => drawPreview());
});

[gridToggle].forEach((input) => {
  input.addEventListener("input", () => drawPreview());
});

frameSpeedInput.addEventListener("input", () => {
  startAnimation();
});

toggleAnimBtn.addEventListener("click", () => {
  animPlaying = !animPlaying;
  toggleAnimBtn.textContent = animPlaying ? "Pause" : "Play";
  if (animPlaying) drawAnimFrame();
});

zoomRange.addEventListener("input", (event) => {
  const target = event.target as HTMLInputElement;
  const value = Number(target.value) / 100;
  updateZoom(value);
});

zoomOutBtn.addEventListener("click", () => {
  updateZoom(zoom - 0.1);
});

zoomInBtn.addEventListener("click", () => {
  updateZoom(zoom + 0.1);
});

imageList.addEventListener("dragstart", (event) => {
  const target = event.target as HTMLElement;
  const row = target.closest<HTMLElement>(".list__item");
  if (!row) return;
  row.classList.add("dragging");
  event.dataTransfer?.setData("text/plain", row.dataset.id ?? "");
});

imageList.addEventListener("dragend", (event) => {
  const target = event.target as HTMLElement;
  const row = target.closest<HTMLElement>(".list__item");
  row?.classList.remove("dragging");
});

imageList.addEventListener("dragover", (event) => {
  event.preventDefault();
  const target = event.target as HTMLElement;
  const row = target.closest<HTMLElement>(".list__item");
  if (!row) return;
  row.classList.add("drag-over");
});

imageList.addEventListener("dragleave", (event) => {
  const target = event.target as HTMLElement;
  const row = target.closest<HTMLElement>(".list__item");
  row?.classList.remove("drag-over");
});

imageList.addEventListener("drop", (event) => {
  event.preventDefault();
  const target = event.target as HTMLElement;
  const row = target.closest<HTMLElement>(".list__item");
  if (!row) return;
  row.classList.remove("drag-over");
  const draggedId = event.dataTransfer?.getData("text/plain");
  const targetId = row.dataset.id;
  if (!draggedId || !targetId || draggedId === targetId) return;

  const fromIndex = state.findIndex((item) => item.id === draggedId);
  const toIndex = state.findIndex((item) => item.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return;

  const [moved] = state.splice(fromIndex, 1);
  state.splice(toIndex, 0, moved);
  renderList();
  drawPreview();
});

clearBtn.addEventListener("click", () => {
  while (state.length) {
    const item = state.pop();
    if (item) URL.revokeObjectURL(item.url);
  }
  renderList();
  drawPreview();
});

downloadBtn.addEventListener("click", () => {
  if (state.length === 0) return;
  drawPreview();
  previewCanvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    const filename = nameInput.value.trim() || "spritesheet";
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, "image/png");
});

renderList();
drawPreview();
updateZoom(1);
startAnimation();
