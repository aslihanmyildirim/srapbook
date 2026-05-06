/* ============================
   SCRAPBOOK STUDIO - APP
   ============================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const layer = $("#itemsLayer");
const template = $("#itemTemplate");
const noteTemplate = $("#noteTemplate");
const notebook = $("#notebook");

const imageInput = $("#imageInput");
const videoInput = $("#videoInput");
const audioInput = $("#audioInput");
const stickerImageInput = $("#stickerImageInput");
const addNoteBtn = $("#addNoteBtn");
const saveLayoutBtn = $("#saveLayoutBtn");
const clearLayoutBtn = $("#clearLayoutBtn");
const stickerPalette = $("#stickerPalette");
const tapePalette = $("#tapePalette");
const prevPageBtn = $("#prevPageBtn");
const nextPageBtn = $("#nextPageBtn");
const addPageBtn = $("#addPageBtn");
const pageIndicator = $("#pageIndicator");

const STORAGE_KEY = "scrapbook-v2";
let zCounter = 20;
let currentSpread = 0;
let totalSpreads = 1;
let allPages = {}; // { spreadIndex: [items] }

/* ---- Init ---- */
init();

function init() {
  bindToolbarIcons();
  bindStickerTabs();
  bindPalette();
  bindTapePalette();
  bindInputs();
  bindPageNav();
  loadLayout();
}

/* ---- Toolbar Icon Toggle ---- */
function bindToolbarIcons() {
  const panels = $(".toolbar-panels");

  function closeAllPanels() {
    $$(".toolbar-icon").forEach((i) => i.classList.remove("active"));
    $$(".toolbar-panel").forEach((p) => p.classList.remove("active"));
    panels.classList.remove("open");
  }

  $$(".toolbar-icon").forEach((icon) => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      const panel = icon.dataset.panel;

      // Toggle: ayni ikona tekrar basarsa kapat
      if (icon.classList.contains("active")) {
        closeAllPanels();
        return;
      }

      $$(".toolbar-icon").forEach((i) => i.classList.remove("active"));
      icon.classList.add("active");

      $$(".toolbar-panel").forEach((p) => {
        p.classList.toggle("active", p.dataset.panel === panel);
      });
      panels.classList.add("open");
    });
  });

  // Workspace'e tiklaninca paneli kapat
  $("#workspace").addEventListener("pointerdown", () => {
    closeAllPanels();
  });
}

/* ---- Sticker Tabs ---- */
function bindStickerTabs() {
  $$(".sticker-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".sticker-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const group = tab.dataset.tab;
      $$(".sticker-group").forEach((g) => {
        g.style.display = g.dataset.group === group ? "flex" : "none";
      });
    });
  });
}

/* ---- Palette Clicks ---- */
function bindPalette() {
  stickerPalette.addEventListener("click", (e) => {
    const btn = e.target.closest(".sticker-btn");
    if (!btn) return;
    createEmojiItem(btn.dataset.emoji);
  });
}

function bindTapePalette() {
  tapePalette.addEventListener("click", (e) => {
    const btn = e.target.closest(".tape-swatch");
    if (!btn) return;
    createTapeItem({ tape: btn.dataset.tape });
  });
}

/* ---- Input Bindings ---- */
function bindInputs() {
  imageInput.addEventListener("change", () => {
    const files = [...imageInput.files];
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      createImageItem(url);
    });
    imageInput.value = "";
  });

  videoInput.addEventListener("change", () => {
    handleFileInput(videoInput, "video");
  });

  audioInput.addEventListener("change", () => {
    handleFileInput(audioInput, "audio");
  });

  stickerImageInput.addEventListener("change", () => {
    const file = stickerImageInput.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    createStickerImageItem(url);
    stickerImageInput.value = "";
  });

  addNoteBtn.addEventListener("click", () => createNoteItem());
  saveLayoutBtn.addEventListener("click", persistLayout);
  clearLayoutBtn.addEventListener("click", () => {
    if (!confirm("Bu sayfadaki tum ogeleri silmek istediginize emin misiniz?")) return;
    layer.innerHTML = "";
    delete allPages[currentSpread];
  });
}

function handleFileInput(input, type) {
  const file = input.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  createMediaItem(type, url);
  input.value = "";
}

/* ---- Page Navigation ---- */
function bindPageNav() {
  prevPageBtn.addEventListener("click", () => {
    if (currentSpread > 0) {
      saveCurrentPage();
      currentSpread--;
      loadCurrentPage();
      updatePageUI();
    }
  });

  nextPageBtn.addEventListener("click", () => {
    if (currentSpread < totalSpreads - 1) {
      saveCurrentPage();
      currentSpread++;
      loadCurrentPage();
      updatePageUI();
    }
  });

  addPageBtn.addEventListener("click", () => {
    saveCurrentPage();
    totalSpreads++;
    currentSpread = totalSpreads - 1;
    loadCurrentPage();
    updatePageUI();
  });

  updatePageUI();
}

function updatePageUI() {
  const left = currentSpread * 2 + 1;
  const right = left + 1;
  pageIndicator.textContent = `Sayfa ${left}-${right}`;
  prevPageBtn.disabled = currentSpread === 0;
  nextPageBtn.disabled = currentSpread >= totalSpreads - 1;
}

function saveCurrentPage() {
  allPages[currentSpread] = serializeLayer();
}

function loadCurrentPage() {
  layer.innerHTML = "";
  const items = allPages[currentSpread];
  if (items && items.length > 0) {
    items.forEach((item) => restoreItem(item));
  }
}

/* ==============================
   ITEM CREATION
   ============================== */

function createEmojiItem(emoji, data = {}) {
  const item = createBaseItem("emoji", data);
  const body = item.querySelector(".item-body");
  body.textContent = emoji;
  item.dataset.payload = emoji;
  layer.append(item);
  return item;
}

function createTapeItem(data = {}) {
  const tape = data.tape || "pastel-pink";
  const item = createBaseItem("tape", data);
  item.dataset.tape = tape;
  item.setAttribute("data-tape", tape);
  layer.append(item);
  return item;
}

function createImageItem(src, data = {}) {
  const item = createBaseItem("image", data);
  const body = item.querySelector(".item-body");

  const img = document.createElement("img");
  img.src = src;
  img.alt = "Scrapbook";
  img.draggable = false;
  body.append(img);

  // Caption area
  const caption = document.createElement("div");
  caption.className = "photo-caption";
  caption.contentEditable = "true";
  caption.spellcheck = false;
  caption.dataset.placeholder = "";
  body.append(caption);

  // Set initial size
  const w = data.width || 200;
  img.style.width = w + "px";
  item.dataset.width = w;

  item.dataset.payload = src;

  // Add resize
  addResizeHandle(item, img);

  layer.append(item);
  return item;
}

function createStickerImageItem(src, data = {}) {
  const item = createBaseItem("sticker-image", data);
  const body = item.querySelector(".item-body");

  const img = document.createElement("img");
  img.src = src;
  img.alt = "Sticker";
  img.draggable = false;
  const w = data.width || 100;
  img.style.maxWidth = w + "px";
  item.dataset.width = w;
  body.append(img);

  item.dataset.payload = src;
  addResizeHandle(item, img);

  layer.append(item);
  return item;
}

function createNoteItem(data = {}) {
  const node = noteTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.type = "note";
  node.dataset.rotation = String(data.rotation ?? randomInRange(-5, 5));

  const x = data.x ?? randomInRange(80, Math.max(100, layer.clientWidth - 200));
  const y = data.y ?? randomInRange(60, Math.max(100, layer.clientHeight - 150));

  setItemPosition(node, x, y);
  applyRotation(node, Number(node.dataset.rotation));
  bringToFront(node);
  attachItemEvents(node);

  const noteText = node.querySelector(".note-text");
  if (data.text) noteText.textContent = data.text;

  // Prevent drag when editing text
  noteText.addEventListener("pointerdown", (e) => e.stopPropagation());

  node.dataset.payload = "";
  layer.append(node);
  return node;
}

function createMediaItem(type, src, data = {}) {
  const item = createBaseItem(type, data);
  const body = item.querySelector(".item-body");

  if (type === "video") {
    const video = document.createElement("video");
    video.src = src;
    video.controls = true;
    video.playsInline = true;
    video.style.maxWidth = (data.width || 260) + "px";
    video.addEventListener("pointerdown", (e) => e.stopPropagation());
    body.append(video);
  } else if (type === "audio") {
    item.classList.add("audio");
    const audio = document.createElement("audio");
    audio.src = src;
    audio.controls = true;
    audio.addEventListener("pointerdown", (e) => e.stopPropagation());
    body.append(audio);
  }

  item.dataset.payload = src;
  layer.append(item);
  return item;
}

/* ---- Base Item Factory ---- */
function createBaseItem(type, data = {}) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.classList.add(type);
  node.dataset.type = type;
  node.dataset.rotation = String(data.rotation ?? randomInRange(-6, 6));

  const x = data.x ?? randomInRange(60, Math.max(80, layer.clientWidth - 260));
  const y = data.y ?? randomInRange(40, Math.max(80, layer.clientHeight - 200));

  setItemPosition(node, x, y);
  applyRotation(node, Number(node.dataset.rotation));
  bringToFront(node);
  attachItemEvents(node);
  return node;
}

/* ---- Resize Handle ---- */
function addResizeHandle(item, target) {
  const handle = document.createElement("div");
  handle.className = "resize-handle";
  item.appendChild(handle);

  handle.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startW = target.offsetWidth || parseInt(target.style.width) || parseInt(target.style.maxWidth) || 200;

    const onMove = (me) => {
      const diff = me.clientX - startX;
      const newW = Math.max(60, startW + diff);
      if (target.style.width !== undefined) target.style.width = newW + "px";
      if (target.style.maxWidth !== undefined) target.style.maxWidth = newW + "px";
      item.dataset.width = newW;
    };

    const onUp = (ue) => {
      handle.releasePointerCapture(ue.pointerId);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
  });
}

/* ==============================
   ITEM EVENTS (drag, rotate, delete)
   ============================== */

function attachItemEvents(item) {
  const rotateBtn = item.querySelector(".rotate-btn");
  const removeBtn = item.querySelector(".remove-btn");
  const resizeBtn = item.querySelector(".resize-btn");

  // Serbest döndürme — basılı tutup sürükle
  if (rotateBtn) {
    rotateBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      rotateBtn.setPointerCapture(e.pointerId);

      const rect = item.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const startRot = Number(item.dataset.rotation) || 0;

      const onMove = (me) => {
        const angle = Math.atan2(me.clientY - centerY, me.clientX - centerX);
        const diff = (angle - startAngle) * (180 / Math.PI);
        applyRotation(item, Math.round(startRot + diff));
      };

      const onUp = (ue) => {
        rotateBtn.releasePointerCapture(ue.pointerId);
        rotateBtn.removeEventListener("pointermove", onMove);
        rotateBtn.removeEventListener("pointerup", onUp);
      };

      rotateBtn.addEventListener("pointermove", onMove);
      rotateBtn.addEventListener("pointerup", onUp);
    });
  }

  removeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    item.remove();
  });

  resizeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const img = item.querySelector("img");
    if (!img) return;
    const current = img.offsetWidth;
    const sizes = [120, 180, 240, 320];
    const idx = sizes.findIndex((s) => s > current);
    const newSize = sizes[idx >= 0 ? idx : 0];
    img.style.width = newSize + "px";
    if (img.style.maxWidth) img.style.maxWidth = newSize + "px";
    item.dataset.width = newSize;
  });

  item.addEventListener("pointerdown", (e) => startDrag(e, item));
}

function startDrag(event, item) {
  if (event.target.closest(".item-controls") || event.target.closest(".resize-handle")) return;
  if (event.target.closest("[contenteditable]")) return;
  if (event.target.tagName === "VIDEO" || event.target.tagName === "AUDIO") return;

  event.preventDefault();
  item.setPointerCapture(event.pointerId);
  item.classList.add("dragging");
  bringToFront(item);

  const startX = event.clientX;
  const startY = event.clientY;
  const initialX = Number(item.dataset.x || 0);
  const initialY = Number(item.dataset.y || 0);

  const onMove = (me) => {
    const dx = me.clientX - startX;
    const dy = me.clientY - startY;
    setItemPosition(item, initialX + dx, initialY + dy);
  };

  const onUp = (ue) => {
    item.releasePointerCapture(ue.pointerId);
    item.classList.remove("dragging");
    item.removeEventListener("pointermove", onMove);
    item.removeEventListener("pointerup", onUp);
  };

  item.addEventListener("pointermove", onMove);
  item.addEventListener("pointerup", onUp);
}

/* ---- Positioning & Transform ---- */
function setItemPosition(item, x, y) {
  item.style.left = `${x}px`;
  item.style.top = `${y}px`;
  item.dataset.x = String(Math.round(x));
  item.dataset.y = String(Math.round(y));
}

function applyRotation(item, deg) {
  item.dataset.rotation = String(deg);
  item.style.transform = `rotate(${deg}deg)`;
}

function bringToFront(item) {
  zCounter++;
  item.style.zIndex = String(zCounter);
}

/* ==============================
   PERSISTENCE (localStorage)
   ============================== */

function serializeLayer() {
  return [...layer.querySelectorAll(".item")].map((item) => {
    const obj = {
      type: item.dataset.type,
      x: Number(item.dataset.x || 0),
      y: Number(item.dataset.y || 0),
      rotation: Number(item.dataset.rotation || 0),
      payload: item.dataset.payload || "",
    };

    if (item.dataset.tape) obj.tape = item.dataset.tape;
    if (item.dataset.width) obj.width = Number(item.dataset.width);

    // Save note text
    if (item.dataset.type === "note") {
      const noteText = item.querySelector(".note-text");
      obj.text = noteText?.textContent || "";
    }

    // Save caption
    if (item.dataset.type === "image") {
      const caption = item.querySelector(".photo-caption");
      obj.caption = caption?.textContent || "";
    }

    return obj;
  });
}

function persistLayout() {
  saveCurrentPage();

  const state = {
    currentSpread,
    totalSpreads,
    pages: allPages,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveLayoutBtn.textContent = "Kaydedildi!";
  setTimeout(() => {
    saveLayoutBtn.textContent = "Kaydet";
  }, 1200);
}

function loadLayout() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const state = JSON.parse(raw);
    currentSpread = state.currentSpread || 0;
    totalSpreads = state.totalSpreads || 1;
    allPages = state.pages || {};

    // Convert string keys back (JSON stringify converts numbers to strings)
    const fixed = {};
    for (const key of Object.keys(allPages)) {
      fixed[Number(key)] = allPages[key];
    }
    allPages = fixed;

    loadCurrentPage();
    updatePageUI();
  } catch (err) {
    console.warn("Layout yuklenemedi:", err);
  }
}

function restoreItem(data) {
  switch (data.type) {
    case "emoji":
      createEmojiItem(data.payload, data);
      break;
    case "tape":
      createTapeItem(data);
      break;
    case "image":
      if (data.payload) {
        const item = createImageItem(data.payload, data);
        if (data.caption) {
          const cap = item.querySelector(".photo-caption");
          if (cap) cap.textContent = data.caption;
        }
      }
      break;
    case "sticker-image":
      if (data.payload) createStickerImageItem(data.payload, data);
      break;
    case "video":
    case "audio":
      if (data.payload) createMediaItem(data.type, data.payload, data);
      break;
    case "note":
      createNoteItem(data);
      break;
  }
}

/* ---- Utils ---- */
function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
