(function () {
  const STEPS = ["1", "2", "3", "4", "5"];
  const state = {
    stepIndex: 0,
    date: null,        // "2026-08-20"
    time: null,         // "19:30"
    party: null,        // number
    parking: null,       // "0" | "1" | "2" | "3+"
    weekStart: startOfWeek(new Date()),
  };

  const els = {
    dots: document.getElementById("wizard-dots"),
    count: document.getElementById("wizard-count"),
    steps: document.querySelectorAll(".wizard-step"),
    nav: document.getElementById("wizard-nav"),
    back: document.getElementById("btn-back"),
    next: document.getElementById("btn-next"),
    weekLabel: document.getElementById("week-label"),
    weekPrev: document.getElementById("week-prev"),
    weekNext: document.getElementById("week-next"),
    dateChips: document.getElementById("date-chips"),
    slotGrid: document.getElementById("slot-grid"),
    partyGrid: document.getElementById("party-grid"),
    partyCustom: document.getElementById("party-custom"),
    parkingGrid: document.getElementById("parking-grid"),
    summaryBox: document.getElementById("summary-box"),
    retryBtn: document.getElementById("retry-btn"),
  };

  const FALLBACK_SLOTS = ["12:00", "12:30", "13:00", "19:00", "19:30", "20:00", "20:30", "21:00"];
  const PARTY_PRESETS = [2, 4, 6, 8];

  function startOfWeek(d) {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    return nd;
  }

  function fmtISO(d) {
    return d.toISOString().slice(0, 10);
  }

  function fmtDayLabel(d) {
    return d.toLocaleDateString("fr-FR", { weekday: "long" });
  }
  function fmtDateLabel(d) {
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  }

  /* ---------------------------------------------------- navigation dots */

  function renderDots() {
    els.dots.innerHTML = STEPS.map((_, i) => {
      const cls = i < state.stepIndex ? "done" : i === state.stepIndex ? "active" : "";
      return `<span class="dot ${cls}"></span>`;
    }).join("");
    els.count.textContent = `Étape ${state.stepIndex + 1} sur ${STEPS.length}`;
  }

  function showStep(name) {
    els.steps.forEach((s) => s.classList.toggle("active", s.dataset.step === name));
  }

  function goTo(index) {
    state.stepIndex = index;
    renderDots();
    showStep(STEPS[index]);
    els.nav.style.display = "flex";
    els.back.style.display = index === 0 ? "none" : "inline-flex";
    els.next.textContent = index === STEPS.length - 1 ? "Envoyer ma demande ›" : "Continuer ›";
    if (index === 2) renderPartyState();
    if (index === STEPS.length - 1) renderSummary();
    validateNext();
  }

  function canProceed() {
    switch (STEPS[state.stepIndex]) {
      case "1": return !!state.date;
      case "2": return !!state.time;
      case "3": return !!state.party && state.party > 0;
      case "4": return !!state.parking;
      case "5": return true; // validated on submit
      default: return true;
    }
  }

  function validateNext() {
    els.next.disabled = !canProceed();
  }

  /* ---------------------------------------------------- étape 1 : date */

  function renderWeek() {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(state.weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    const today = startOfWeek(new Date());
    els.weekPrev.disabled = state.weekStart.getTime() <= today.getTime();

    const first = days[0], last = days[6];
    els.weekLabel.textContent = `${first.getDate()} – ${last.getDate()} ${last.toLocaleDateString("fr-FR", { month: "long" })}`;

    els.dateChips.innerHTML = days.map((d) => {
      const iso = fmtISO(d);
      const past = d.getTime() < startOfWeek(new Date()).getTime();
      const active = state.date === iso;
      return `<button type="button" class="chip-btn ${active ? "active" : ""}" data-date="${iso}" ${past ? "disabled" : ""}>
        ${capitalize(fmtDayLabel(d))}<small>${fmtDateLabel(d)}</small>
      </button>`;
    }).join("");

    els.dateChips.querySelectorAll("button:not(:disabled)").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.date = btn.dataset.date;
        state.time = null; // la sélection d'heure dépend de la date
        renderWeek();
        loadSlots();
        validateNext();
      });
    });
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  els.weekPrev.addEventListener("click", () => {
    state.weekStart.setDate(state.weekStart.getDate() - 7);
    renderWeek();
  });
  els.weekNext.addEventListener("click", () => {
    state.weekStart.setDate(state.weekStart.getDate() + 7);
    renderWeek();
  });

  /* ---------------------------------------------------- étape 2 : heure */

  async function loadSlots() {
    els.slotGrid.innerHTML = '<p class="menu-empty" style="grid-column:1/-1">Chargement des créneaux…</p>';
    let slots = FALLBACK_SLOTS;
    try {
      const res = await fetch(`${window.API_BASE}/reservations/availability?date=${state.date}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.slots) && data.slots.length) slots = data.slots;
      }
    } catch (e) { /* on garde les créneaux par défaut */ }
    renderSlots(slots);
  }

  function renderSlots(slots) {
    els.slotGrid.innerHTML = slots.map((s) => {
      const time = typeof s === "string" ? s : s.time;
      const full = typeof s === "object" && s.full;
      const active = state.time === time;
      return `<button type="button" class="chip-btn ${active ? "active" : ""}" data-time="${time}" ${full ? "disabled" : ""}>
        ${time}${full ? "<small>Complet</small>" : ""}
      </button>`;
    }).join("");
    els.slotGrid.querySelectorAll("button:not(:disabled)").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.time = btn.dataset.time;
        els.slotGrid.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        validateNext();
      });
    });
  }

  /* ---------------------------------------------------- étape 3 : convives */

  function renderPartyState() {
    els.partyGrid.innerHTML = PARTY_PRESETS.map((n) =>
      `<button type="button" class="chip-btn ${state.party === n ? "active" : ""}" data-party="${n}">${n}</button>`
    ).join("");
    els.partyGrid.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.party = Number(btn.dataset.party);
        els.partyCustom.value = "";
        renderPartyState();
        validateNext();
      });
    });
  }

  els.partyCustom.addEventListener("input", () => {
    const v = Number(els.partyCustom.value);
    state.party = v > 0 ? v : null;
    if (v > 0) {
      els.partyGrid.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    }
    validateNext();
  });

  /* ---------------------------------------------------- étape 4 : parking */

  els.parkingGrid.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.parking = btn.dataset.parking;
      els.parkingGrid.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      validateNext();
    });
  });

  /* ---------------------------------------------------- étape 5 : coordonnées */

  const fields = {
    name: document.getElementById("f-name"),
    phone: document.getElementById("f-phone"),
    email: document.getElementById("f-email"),
    notes: document.getElementById("f-notes"),
  };

  function renderSummary() {
    const d = new Date(state.date + "T00:00:00");
    els.summaryBox.innerHTML = `
      <div><span>Date</span><span>${capitalize(fmtDayLabel(d))} ${fmtDateLabel(d)}</span></div>
      <div><span>Heure</span><span>${state.time}</span></div>
      <div><span>Convives</span><span>${state.party}</span></div>
      <div><span>Parking</span><span>${state.parking === "0" ? "Aucun véhicule" : state.parking}</span></div>
    `;
  }

  function validateContactField(input, testFn, errMsgEl) {
    const ok = testFn(input.value.trim());
    input.closest(".field").classList.toggle("invalid", !ok);
    return ok;
  }

  function validateContact() {
    const okName = validateContactField(fields.name, (v) => v.length >= 2);
    const okPhone = validateContactField(fields.phone, (v) => /^[\d +().-]{6,20}$/.test(v));
    const okEmail = validateContactField(fields.email, (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
    return okName && okPhone && okEmail;
  }

  /* ---------------------------------------------------- envoi */

  async function submitReservation() {
    els.next.disabled = true;
    els.next.innerHTML = '<span class="spinner"></span> Envoi…';
    const payload = {
      date: state.date,
      time: state.time,
      partySize: state.party,
      parking: state.parking,
      name: fields.name.value.trim(),
      phone: fields.phone.value.trim(),
      email: fields.email.value.trim(),
      notes: fields.notes.value.trim(),
    };
    try {
      const res = await fetch(`${window.API_BASE}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erreur serveur");
      }
      els.nav.style.display = "none";
      showStep("ok");
    } catch (e) {
      document.getElementById("error-text").textContent =
        e.message === "Erreur serveur"
          ? "Impossible d'envoyer votre demande pour le moment. Merci de réessayer ou de nous appeler directement."
          : e.message;
      els.nav.style.display = "none";
      showStep("error");
    } finally {
      els.next.disabled = false;
      els.next.textContent = "Envoyer ma demande ›";
    }
  }

  els.retryBtn.addEventListener("click", () => {
    els.nav.style.display = "flex";
    showStep(STEPS[STEPS.length - 1]);
  });

  /* ---------------------------------------------------- boutons nav */

  els.back.addEventListener("click", () => {
    if (state.stepIndex > 0) goTo(state.stepIndex - 1);
  });

  els.next.addEventListener("click", () => {
    if (STEPS[state.stepIndex] === "5") {
      if (!validateContact()) return;
      submitReservation();
      return;
    }
    if (!canProceed()) return;
    if (state.stepIndex < STEPS.length - 1) goTo(state.stepIndex + 1);
  });

  /* ---------------------------------------------------- init */

  renderWeek();
  goTo(0);
})();
