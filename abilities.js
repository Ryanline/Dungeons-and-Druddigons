// abilities.js
(() => {
  const listEl = document.querySelector(".ab-list");
  const detailEl = document.querySelector(".ab-right .ab-detail");
  const searchInput = document.getElementById("ab-search-input");

  // Modal (mobile)
  const modalEl = document.getElementById("ab-modal");
  const modalDetailEl = document.getElementById("ab-modal-detail");
  const modalCloseBtn = modalEl?.querySelector(".ab-modal__close");

  const mobileMQ = window.matchMedia("(max-width: 980px)");
  const isNarrow = () => mobileMQ.matches;

  const openModal = () => {
    if (!modalEl) return;
    modalEl.classList.add("is-open");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("ab-modal-open");
  };

  const closeModal = () => {
    if (!modalEl) return;
    modalEl.classList.remove("is-open");
    modalEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ab-modal-open");
  };

  // Close on backdrop click
  modalEl?.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.matches && t.matches("[data-close='true']")) closeModal();
  });

  // Close on (fallback) X
  modalCloseBtn?.addEventListener("click", closeModal);

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Sound (play on click)
  const clickSound = new Audio("resources/audio/scroll-sound.wav");
  clickSound.volume = 0.6;

  const JSON_URL = "resources/data/data-abilities.json";

  let allAbilities = [];
  let selectedId = null;
  let query = "";

  const get = (obj, keys, fallback = "") => {
    for (const k of keys) {
      if (obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") return obj[k];
    }
    return fallback;
  };

  const makeId = (name, idx) => {
    const slug = String(name || "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
    return slug ? `${slug}-${idx}` : `ability-${idx}`;
  };

  const normalizeAbility = (raw, idx) => {
    const name = get(raw, ["Ability", "ability", "name"], "");
    const effect = get(raw, ["Effect", "effect", "description"], "");
    return { id: makeId(name, idx), name, effect, raw };
  };

  const matchesQuery = (a) => {
    if (!query) return true;
    const hay = `${a.name} ${a.effect}`.toLowerCase();
    return hay.includes(query);
  };

  const visibleAbilities = () => allAbilities.filter(matchesQuery);

  const emptyMarkup = `
    <div class="ab-detail__empty">
      <div class="poke-title">Select an ability</div>
      <p>Choose an ability from the list to view its details here.</p>
    </div>
  `;

  const renderDetailMarkup = (a) => {
    const desc = escapeHtml(a.effect || "—").replaceAll("\n", "<br>");

    // Close button INSIDE header on narrow screens
    const closeBtn = isNarrow()
      ? `<button class="ab-modal__close--inhead" type="button" aria-label="Close" title="Close">×</button>`
      : "";

    return `
      <div class="ab-detail-head">
        <h2 class="ab-detail-name">${escapeHtml(a.name || "—")}</h2>
        <div class="ab-detail-head__right">
          ${closeBtn}
        </div>
      </div>

      <div class="ab-desc">
        <div class="poke-title">Description</div>
        <div>${desc}</div>
      </div>
    `;
  };

  const renderDetail = (a) => {
    if (!a) {
      if (detailEl) detailEl.innerHTML = emptyMarkup;
      if (modalDetailEl) modalDetailEl.innerHTML = emptyMarkup;
      return;
    }

    const markup = renderDetailMarkup(a);

    // Narrow screens -> modal
    if (isNarrow()) {
      if (modalDetailEl) modalDetailEl.innerHTML = markup;
      openModal();

      // Wire up the injected close button
      const inHeadClose = modalDetailEl?.querySelector(".ab-modal__close--inhead");
      inHeadClose?.addEventListener("click", closeModal);

      return;
    }

    // Desktop -> right panel
    if (detailEl) detailEl.innerHTML = markup;
  };

  const renderList = () => {
    listEl.innerHTML = "";

    const items = visibleAbilities();

    if (!allAbilities.length) {
      const empty = document.createElement("div");
      empty.className = "ab-loading";
      empty.textContent = "No abilities found.";
      listEl.appendChild(empty);
      return;
    }

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "ab-loading";
      empty.textContent = "No results.";
      listEl.appendChild(empty);

      selectedId = null;
      renderDetail(null);
      closeModal();
      return;
    }

    // If current selection is filtered out, clear
    if (selectedId && !items.some(a => a.id === selectedId)) {
      selectedId = null;
      renderDetail(null);
      closeModal();
    }

    for (const a of items) {
      const row = document.createElement("div");
      row.className = "ab-row" + (a.id === selectedId ? " is-selected" : "");
      row.setAttribute("role", "listitem");
      row.dataset.id = a.id;

      const name = document.createElement("div");
      name.className = "ab-name";
      name.textContent = a.name || "—";
      row.appendChild(name);

      row.addEventListener("click", () => {
        try { clickSound.currentTime = 0; clickSound.play(); } catch {}
        selectedId = a.id;
        renderList();
        renderDetail(a);
      });

      listEl.appendChild(row);
    }
  };

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const initSearch = () => {
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
      query = String(searchInput.value || "").trim().toLowerCase();
      selectedId = null;     // optional: clear selection when searching
      renderList();
      renderDetail(null);
      closeModal();
    });

    // ESC clears search (and closes modal)
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchInput.value = "";
        query = "";
        selectedId = null;
        renderList();
        renderDetail(null);
        closeModal();
      }
    });
  };

  // If user resizes from mobile->desktop while modal is open, close it
  mobileMQ.addEventListener?.("change", () => {
    if (!isNarrow()) closeModal();
  });

  const init = async () => {
    try {
      const res = await fetch(JSON_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load JSON: ${res.status}`);
      const raw = await res.json();

      const arr = Array.isArray(raw) ? raw : (raw.abilities || raw.data || []);
      allAbilities = arr.map((r, i) => normalizeAbility(r, i));

      selectedId = null;
      query = "";
      initSearch();
      renderList();
      renderDetail(null);
      closeModal();
    } catch (err) {
      console.error(err);
      if (listEl) listEl.innerHTML = `<div class="ab-loading">Could not load abilities JSON. Check file path/name.</div>`;
    }
  };

  init();
})();