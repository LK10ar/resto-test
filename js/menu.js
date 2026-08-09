(function () {
  const root = document.getElementById("menu-root");
  const chipsNav = document.getElementById("section-chips");
  const menuTabs = document.querySelectorAll(".menu-tabs button");

  let allItems = [];
  let currentMenu = "food"; // "food" | "drinks"

  function euros(n) {
    return Number(n).toFixed(2).replace(".00", "") + "€";
  }

  function groupBySection(items) {
    const map = new Map();
    items.forEach((it) => {
      if (!map.has(it.section)) map.set(it.section, []);
      map.get(it.section).push(it);
    });
    return map;
  }

  function slug(s) {
    return "sec-" + s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function render() {
    const items = allItems.filter((i) => i.menu === currentMenu);
    const bySection = groupBySection(items);

    if (items.length === 0) {
      root.innerHTML = '<p class="menu-empty">Aucun élément disponible pour le moment.</p>';
      chipsNav.innerHTML = "";
      return;
    }

    let chipsHtml = "";
    let bodyHtml = "";
    let first = true;

    bySection.forEach((sectionItems, sectionName) => {
      const id = slug(sectionName);
      chipsHtml += `<button type="button" data-target="${id}" class="${first ? "active" : ""}">${sectionName}</button>`;
      bodyHtml += `
        <section id="${id}" class="menu-section">
          <div class="menu-section-head"><h2>${sectionName}</h2><span class="rule"></span></div>
          <div class="menu-card">
            ${sectionItems.map(itemHtml).join("")}
          </div>
        </section>`;
      first = false;
    });

    chipsNav.innerHTML = chipsHtml;
    root.innerHTML = bodyHtml;

    chipsNav.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        chipsNav.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function itemHtml(it) {
    return `
      <div class="menu-item">
        <span class="menu-item-name">${it.name}</span>
        <span class="menu-item-leader"></span>
        <span class="menu-item-price">${euros(it.price)}</span>
        ${it.description ? `<span class="menu-item-desc">${it.description}</span>` : ""}
      </div>`;
  }

  menuTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      menuTabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMenu = btn.dataset.menu;
      render();
    });
  });

  async function load() {
    try {
      const res = await fetch(`${window.API_BASE}/menu`);
      if (!res.ok) throw new Error("API error");
      allItems = await res.json();
    } catch (e) {
      // Filet de sécurité si l'API est injoignable : on affiche un message clair.
      root.innerHTML = '<p class="menu-empty">La carte n\'a pas pu être chargée. Merci de réessayer dans un instant.</p>';
      return;
    }
    render();
  }

  load();
})();
