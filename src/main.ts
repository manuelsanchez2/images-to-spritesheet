import "./style.css";

type LoadedImage = {
  id: string;
  file: File;
  url: string;
  image: HTMLImageElement;
  width: number;
  height: number;
};

const fileInput = document.querySelector<HTMLInputElement>("#fileInput");
const dropzone = document.querySelector<HTMLLabelElement>(".dropzone");
const imageList = document.querySelector<HTMLDivElement>("#imageList");
const previewCanvas = document.querySelector<HTMLCanvasElement>("#previewCanvas");
const imageCount = document.querySelector<HTMLDivElement>("#imageCount");
const canvasSize = document.querySelector<HTMLDivElement>("#canvasSize");
const previewLabel = document.querySelector<HTMLSpanElement>("#previewLabel");
const paddingInput = document.querySelector<HTMLInputElement>("#paddingInput");
const alignSelect = document.querySelector<HTMLSelectElement>("#alignSelect");
const bgInput = document.querySelector<HTMLInputElement>("#bgInput");
const transparentToggle = document.querySelector<HTMLInputElement>("#transparentToggle");
const nameInput = document.querySelector<HTMLInputElement>("#nameInput");
const downloadBtn = document.querySelector<HTMLButtonElement>("#downloadBtn");
const clearBtn = document.querySelector<HTMLButtonElement>("#clearBtn");
const emptyState = document.querySelector<HTMLDivElement>("#emptyState");

if (
  !fileInput ||
  !dropzone ||
  !imageList ||
  !previewCanvas ||
  !imageCount ||
  !canvasSize ||
  !previewLabel ||
  !paddingInput ||
  !alignSelect ||
  !bgInput ||
  !transparentToggle ||
  !nameInput ||
  !downloadBtn ||
  !clearBtn ||
  !emptyState
) {
  throw new Error("Missing required elements");
}

const ctx = previewCanvas.getContext("2d");
if (!ctx) throw new Error("2D context not supported");

const state: LoadedImage[] = [];

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

const drawPreview = () => {
  if (state.length === 0) {
    previewCanvas.width = 0;
    previewCanvas.height = 0;
    clearCanvas();
    updateStats(0, 0);
    setPreviewStatus("Waiting for images");
    emptyState.style.opacity = "1";
    return;
  }

  const padding = Math.max(0, Number(paddingInput.value) || 0);
  const totalWidth =
    state.reduce((sum, item) => sum + item.width, 0) +
    padding * (state.length + 1);
  const maxHeight = Math.max(...state.map((item) => item.height));
  const totalHeight = maxHeight + padding * 2;

  previewCanvas.width = totalWidth;
  previewCanvas.height = totalHeight;

  if (!transparentToggle.checked) {
    ctx.fillStyle = bgInput.value;
    ctx.fillRect(0, 0, totalWidth, totalHeight);
  } else {
    ctx.clearRect(0, 0, totalWidth, totalHeight);
  }

  let cursorX = padding;
  for (const item of state) {
    let offsetY = padding;
    if (alignSelect.value === "center") {
      offsetY = padding + (maxHeight - item.height) / 2;
    }
    if (alignSelect.value === "bottom") {
      offsetY = padding + (maxHeight - item.height);
    }

    ctx.drawImage(item.image, cursorX, offsetY, item.width, item.height);
    cursorX += item.width + padding;
  }

  updateStats(totalWidth, totalHeight);
  setPreviewStatus("Ready to download");
  emptyState.style.opacity = "0";
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
    height: image.naturalHeight
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

    const thumb = document.createElement("img");
    thumb.src = item.url;
    thumb.alt = item.file.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <strong>${item.file.name}</strong>
      <span>${item.width} × ${item.height}px</span>
    `;

    const removeBtn = document.createElement("button");
    removeBtn.className = "ghost";
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeImage(item.id));

    row.append(thumb, meta, removeBtn);
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
