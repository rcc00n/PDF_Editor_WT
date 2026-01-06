const viewSections = Array.from(document.querySelectorAll("[data-view]"));
const navLinks = Array.from(document.querySelectorAll("[data-view-link]"));
const palette = document.getElementById("commandPalette");
const openPaletteBtn = document.getElementById("openPalette");
const closePaletteBtn = document.getElementById("closePalette");
const paletteInput = palette ? palette.querySelector(".palette-input") : null;

function setActiveView(view) {
  viewSections.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.view === view);
  });
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.viewLink === view);
    if (link.dataset.viewLink === view) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function viewFromHash() {
  const hash = window.location.hash.replace("#", "");
  const view = hash || "dashboard";
  setActiveView(view);
}

function openPalette() {
  if (!palette) {
    return;
  }
  palette.classList.add("open");
  palette.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  if (paletteInput) {
    paletteInput.focus();
  }
}

function closePalette() {
  if (!palette) {
    return;
  }
  palette.classList.remove("open");
  palette.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

window.addEventListener("hashchange", viewFromHash);
viewFromHash();

if (openPaletteBtn) {
  openPaletteBtn.addEventListener("click", openPalette);
}

if (closePaletteBtn) {
  closePaletteBtn.addEventListener("click", closePalette);
}

if (palette) {
  palette.addEventListener("click", (event) => {
    if (event.target === palette) {
      closePalette();
    }
  });
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && key === "k") {
    event.preventDefault();
    openPalette();
  }
  if (key === "escape") {
    closePalette();
  }
});
