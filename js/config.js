// Adresse de l'API backend (Render).
// En local (backend lancé sur le port 4000) : http://localhost:4000/api
window.API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:4000/api"
  : "https://back-resto-9pn8.onrender.com/api";
