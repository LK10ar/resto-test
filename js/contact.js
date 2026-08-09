(function () {
  const form = document.getElementById("contact-form");
  const fields = {
    name: document.getElementById("c-name"),
    email: document.getElementById("c-email"),
    message: document.getElementById("c-message"),
  };
  const submitBtn = document.getElementById("c-submit");
  const status = document.getElementById("c-status");

  function validateField(input, testFn) {
    const ok = testFn(input.value.trim());
    input.closest(".field").classList.toggle("invalid", !ok);
    return ok;
  }

  function validate() {
    const okName = validateField(fields.name, (v) => v.length >= 2);
    const okEmail = validateField(fields.email, (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
    const okMessage = validateField(fields.message, (v) => v.length >= 5);
    return okName && okEmail && okMessage;
  }

  function showStatus(text, kind) {
    status.textContent = text;
    status.className = "form-status " + kind;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form-status";
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Envoi…';

    try {
      const res = await fetch(`${window.API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name.value.trim(),
          email: fields.email.value.trim(),
          message: fields.message.value.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur serveur");

      showStatus("Message envoyé ! Nous vous répondons au plus vite.", "success");
      form.reset();
    } catch (err) {
      showStatus(err.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Envoyer le message";
    }
  });
})();
