// Adresse de l'API backend (Render).
// En local (backend lancé sur le port 4000) : http://localhost:4000/api
window.API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:4000/api"
  : "https://back-resto-9pn8.onrender.com/api";

// ---------------------------------------------------------------------
// Menu mobile (hamburger) — injecté sur toutes les pages qui chargent
// ce fichier, pour éviter de dupliquer le script partout.
// ---------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".topbar-nav");
  const inner = document.querySelector(".topbar-inner");
  if (!nav || !inner) return;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "nav-toggle";
  toggle.setAttribute("aria-label", "Ouvrir le menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>`;

  inner.appendChild(toggle);

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Ferme le menu automatiquement après un clic sur un lien
  nav.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  // Ferme le menu si on clique en dehors
  document.addEventListener("click", (e) => {
    if (!inner.contains(e.target)) {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
});
