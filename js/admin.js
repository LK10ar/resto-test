(function () {
  const STORAGE_KEY = "admin_key"; // stocké en sessionStorage : effacé à la fermeture de l'onglet

  const els = {
    gate: document.getElementById("gate"),
    gateKey: document.getElementById("gate-key"),
    gateSubmit: document.getElementById("gate-submit"),
    shell: document.getElementById("shell"),
    logoutBtn: document.getElementById("logout-btn"),
    form: document.getElementById("item-form"),
    formTitle: document.getElementById("form-title"),
    fId: document.getElementById("f-id"),
    fMenu: document.getElementById("f-menu"),
    fSection: document.getElementById("f-section"),
    fName: document.getElementById("f-name"),
    fPrice: document.getElementById("f-price"),
    fOrder: document.getElementById("f-order"),
    fAvailable: document.getElementById("f-available"),
    fDesc: document.getElementById("f-desc"),
    saveBtn: document.getElementById("save-btn"),
    cancelEditBtn: document.getElementById("cancel-edit-btn"),
    itemsBody: document.getElementById("items-body"),
    menuFilter: document.getElementById("menu-filter"),
    toast: document.getElementById("toast"),
  };

  let allItems = [];
  let currentFilter = "all";

  /* ---------------------------------------------------------- utilitaires */

  function euros(n) {
    return Number(n).toFixed(2).replace(".00", "") + "€";
  }

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
      const res = await fetch(`${window.API_BASE}/menu/all`, {
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
    els.itemsBody.innerHTML = '<tr><td colspan="7">Chargement…</td></tr>';
    try {
      const res = await adminFetch("/menu/all");
      allItems = await res.json();
      renderItems();
    } catch (e) {
      if (e.message !== "unauthorized") {
        els.itemsBody.innerHTML = '<tr><td colspan="7">Impossible de charger la carte.</td></tr>';
      }
    }
  }

  function renderItems() {
    const items = allItems
      .filter((it) => currentFilter === "all" || it.menu === currentFilter)
      .sort((a, b) => a.menu.localeCompare(b.menu) || a.section.localeCompare(b.section) || a.order - b.order);

    if (!items.length) {
      els.itemsBody.innerHTML = '<tr><td colspan="7">Aucun élément.</td></tr>';
      return;
    }

    els.itemsBody.innerHTML = items.map((it) => `
      <tr class="${it.available ? "" : "unavailable"}" data-id="${it._id}">
        <td>${it.menu === "food" ? "Plats" : "Boissons"}</td>
        <td>${escapeHtml(it.section)}</td>
        <td>${escapeHtml(it.name)}</td>
        <td>${euros(it.price)}</td>
        <td>${it.order}</td>
        <td>${it.available ? "Disponible" : "Masqué"}</td>
        <td>
          <div class="admin-row-actions">
            <button type="button" class="icon-btn toggle-btn ${it.available ? "" : "on"}">${it.available ? "Masquer" : "Réactiver"}</button>
            <button type="button" class="icon-btn edit-btn">Modifier</button>
            <button type="button" class="icon-btn danger delete-btn">Supprimer</button>
          </div>
        </td>
      </tr>
    `).join("");

    els.itemsBody.querySelectorAll("tr").forEach((row) => {
      const id = row.dataset.id;
      const item = allItems.find((it) => it._id === id);
      row.querySelector(".edit-btn").addEventListener("click", () => startEdit(item));
      row.querySelector(".delete-btn").addEventListener("click", () => deleteItem(item));
      row.querySelector(".toggle-btn").addEventListener("click", () => toggleAvailable(item));
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  els.menuFilter.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      els.menuFilter.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderItems();
    });
  });

  /* ---------------------------------------------------------- formulaire */

  function resetForm() {
    els.fId.value = "";
    els.form.reset();
    els.fOrder.value = 0;
    els.fAvailable.value = "true";
    els.formTitle.textContent = "Ajouter un élément";
    els.saveBtn.textContent = "Ajouter";
    els.cancelEditBtn.style.display = "none";
  }

  function startEdit(item) {
    els.fId.value = item._id;
    els.fMenu.value = item.menu;
    els.fSection.value = item.section;
    els.fName.value = item.name;
    els.fPrice.value = item.price;
    els.fOrder.value = item.order || 0;
    els.fAvailable.value = String(!!item.available);
    els.fDesc.value = item.description || "";
    els.formTitle.textContent = `Modifier « ${item.name} »`;
    els.saveBtn.textContent = "Enregistrer";
    els.cancelEditBtn.style.display = "inline-flex";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  els.cancelEditBtn.addEventListener("click", resetForm);

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      menu: els.fMenu.value,
      section: els.fSection.value.trim(),
      name: els.fName.value.trim(),
      description: els.fDesc.value.trim(),
      price: Number(els.fPrice.value),
      order: Number(els.fOrder.value) || 0,
      available: els.fAvailable.value === "true",
    };
    const id = els.fId.value;
    els.saveBtn.disabled = true;
    try {
      const res = await adminFetch(id ? `/menu/${id}` : "/menu", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erreur serveur");
      }
      showToast(id ? "Élément mis à jour." : "Élément ajouté.");
      resetForm();
      loadItems();
    } catch (err) {
      if (err.message !== "unauthorized") showToast(err.message, true);
    } finally {
      els.saveBtn.disabled = false;
    }
  });

  async function deleteItem(item) {
    if (!confirm(`Supprimer « ${item.name} » ? Cette action est irréversible.`)) return;
    try {
      const res = await adminFetch(`/menu/${item._id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Erreur lors de la suppression.");
      showToast("Élément supprimé.");
      loadItems();
    } catch (err) {
      if (err.message !== "unauthorized") showToast(err.message, true);
    }
  }

  async function toggleAvailable(item) {
    try {
      const res = await adminFetch(`/menu/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !item.available }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour.");
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
