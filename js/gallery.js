(function () {
  const filters = document.getElementById("gallery-filters");
  const items = document.querySelectorAll(".gallery-item");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCap = document.getElementById("lightbox-cap");
  const lightboxClose = document.getElementById("lightbox-close");

  filters.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      filters.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;
      items.forEach((item) => {
        const show = filter === "all" || item.dataset.cat === filter;
        item.style.display = show ? "" : "none";
      });
    });
  });

  items.forEach((item) => {
    item.addEventListener("click", () => {
      const img = item.querySelector("img");
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxCap.textContent = item.querySelector(".cap").textContent;
      lightbox.classList.add("open");
    });
  });

  function closeLightbox() {
    lightbox.classList.remove("open");
    lightboxImg.src = "";
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
})();
