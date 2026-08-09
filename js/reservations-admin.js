(function () {
  const STORAGE_KEY = "admin_key"; // même clé que gestion-x7k2.html : pas besoin de se reconnecter

  const els = {
    gate: document.getElementById("gate"),
    gateKey: document.getElementById("gate-key"),
    gateSubmit: document.getElementById("gate-submit"),
    shell: document.getElementById("shell"),
    logoutBtn: document.getElementById("logout-btn"),
    itemsBody: document.getElementById("items-body"),
    statusFilter: document.getElementById("status-filter"),
    toast: document.getElementById("toast"),
  };

  let allItems = [];
  let currentFilter = "all";

  /* ---------------------------------------------------------- utilitaires */

  function showToast(msg, isError) {
    els.toast.textContent = msg;
    els.toast.classList.toggle("error", !!isError);
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  function getKey() {
    return sessionStorage.getItem(STORAGE_KEY);
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function statusLabel(s) {
    return { pending: "En attente", confirmed: "Confirmée", cancelled: "Annulée" }[s] || s;
  }

  function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  }

  async function adminFetch(path, options) {
    const opts = options || {};
    opts.headers = Object.assign({}, opts.headers, { "x-admin-key": getKey() });
    const res = await fetch(`${window.API_BASE}${path}`, opts);
    if (res.status === 401) {
      sessionStorage.removeItem(STORAGE_KEY);
      showGate("Session expirée ou clé invalide, merci de vous reconnecter.");
      throw new Error("unauthorized");
    }
    return res;
  }

  /* ---------------------------------------------------------- portail */

  function showGate(errorMsg) {
    els.shell.classList.remove("visible");
    els.gate.style.display = "block";
    els.gate.classList.toggle("error", !!errorMsg);
    if (errorMsg) els.gate.querySelector(".gate-error").textContent = errorMsg;
  }

  function showShell() {
    els.gate.style.display = "none";
    els.shell.classList.add("visible");
    loadItems();
  }

  async function tryKey(key) {
    sessionStorage.setItem(STORAGE_KEY, key);
    try {
      const res = await fetch(`${window.API_BASE}/reservations`, {
        headers: { "x-admin-key": key },
      });
      if (!res.ok) throw new Error("bad key");
      showShell();
    } catch (e) {
      sessionStorage.removeItem(STORAGE_KEY);
      showGate("Clé incorrecte ou serveur injoignable.");
    }
  }

  els.gateSubmit.addEventListener("click", () => {
    const key = els.gateKey.value.trim();
    if (!key) return;
    tryKey(key);
  });
  els.gateKey.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.gateSubmit.click();
  });

  els.logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem(STORAGE_KEY);
    els.gateKey.value = "";
    showGate();
  });

  /* ---------------------------------------------------------- liste */

  async function loadItems() {
    els.itemsBody.innerHTML = '<tr><td colspan="10">Chargement…</td></tr>';
    try {
      const res = await adminFetch("/reservations");
      allItems = await res.json();
      renderItems();
    } catch (e) {
      if (e.message !== "unauthorized") {
        els.itemsBody.innerHTML = '<tr><td colspan="10">Impossible de charger les réservations.</td></tr>';
      }
    }
  }

  function renderItems() {
    const items = allItems.filter((it) => currentFilter === "all" || it.status === currentFilter);

    if (!items.length) {
      els.itemsBody.innerHTML = '<tr><td colspan="10">Aucune réservation.</td></tr>';
      return;
    }

    els.itemsBody.innerHTML = items.map((it) => `
      <tr class="status-${it.status}" data-id="${it._id}">
        <td>${fmtDate(it.date)}</td>
        <td>${it.time}</td>
        <td>${it.partySize}</td>
        <td>${escapeHtml(it.name)}</td>
        <td><a href="tel:${escapeHtml(it.phone)}">${escapeHtml(it.phone)}</a></td>
        <td><a href="mailto:${escapeHtml(it.email)}">${escapeHtml(it.email)}</a></td>
        <td>${it.parking === "0" ? "—" : escapeHtml(it.parking)}</td>
        <td>${escapeHtml(it.notes) || "—"}</td>
        <td>${statusLabel(it.status)}</td>
        <td>
          <div class="admin-row-actions">
            ${it.status !== "confirmed" ? '<button type="button" class="icon-btn confirm-btn">Confirmer</button>' : ""}
            ${it.status !== "cancelled" ? '<button type="button" class="icon-btn danger cancel-btn">Annuler</button>' : ""}
            <button type="button" class="icon-btn danger delete-btn">Supprimer</button>
          </div>
        </td>
      </tr>
    `).join("");

    els.itemsBody.querySelectorAll("tr").forEach((row) => {
      const id = row.dataset.id;
      const item = allItems.find((it) => it._id === id);
      row.querySelector(".confirm-btn")?.addEventListener("click", () => setStatus(item, "confirmed"));
      row.querySelector(".cancel-btn")?.addEventListener("click", () => setStatus(item, "cancelled"));
      row.querySelector(".delete-btn")?.addEventListener("click", () => deleteItem(item));
    });
  }

  els.statusFilter.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      els.statusFilter.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderItems();
    });
  });

  /* ---------------------------------------------------------- actions */

  async function setStatus(item, status) {
    const label = status === "confirmed" ? "confirmer" : "annuler";
    if (!confirm(`Voulez-vous ${label} la réservation de ${item.name} (${fmtDate(item.date)} à ${item.time}) ? Le client recevra un e-mail automatique.`)) return;
    try {
      const res = await adminFetch(`/reservations/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour.");
      showToast(status === "confirmed" ? "Réservation confirmée, e-mail envoyé au client." : "Réservation annulée, e-mail envoyé au client.");
      loadItems();
    } catch (err) {
      if (err.message !== "unauthorized") showToast(err.message, true);
    }
  }

  async function deleteItem(item) {
    if (!confirm(`Supprimer définitivement la réservation de ${item.name} ? Cette action est irréversible.`)) return;
    try {
      const res = await adminFetch(`/reservations/${item._id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Erreur lors de la suppression.");
      showToast("Réservation supprimée.");
      loadItems();
    } catch (err) {
      if (err.message !== "unauthorized") showToast(err.message, true);
    }
  }

  /* ---------------------------------------------------------- init */

  const savedKey = getKey();
  if (savedKey) {
    tryKey(savedKey);
  } else {
    showGate();
  }
})();
