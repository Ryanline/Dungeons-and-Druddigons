// moves.js
(() => {
  const listEl = document.querySelector(".moves-list");
  const filtersEl = document.querySelector(".moves-filters");
  const detailEl = document.querySelector(".moves-right .move-detail");

  const tabWeaponBtn = document.getElementById("tab-weapon");
  const tabSpellBtn = document.getElementById("tab-spell");

  // Search
  const searchInput = document.getElementById("moves-search");
  let searchQuery = "";

  // Modal (mobile)
  const modalEl = document.getElementById("moves-modal");
  const modalDetailEl = document.getElementById("moves-modal-detail");
  const modalCloseBtn = modalEl?.querySelector(".moves-modal__close");

  const mobileMQ = window.matchMedia("(max-width: 980px)");
  const isNarrow = () => mobileMQ.matches;

  const openModal = () => {
    if (!modalEl) return;
    modalEl.classList.add("is-open");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("moves-modal-open");
  };

  const closeModal = () => {
    if (!modalEl) return;
    modalEl.classList.remove("is-open");
    modalEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("moves-modal-open");
  };

  // Close on backdrop click
  modalEl?.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.matches && t.matches("[data-close='true']")) closeModal();
  });

  // Close on X
  modalCloseBtn?.addEventListener("click", closeModal);

  modalEl?.addEventListener("click", (e) => {
  const t = e.target;
  if (t && t.classList && t.classList.contains("moves-modal__close--inhead")) closeModal();
});

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Sound (play on click)
  const clickSound = new Audio("resources/audio/scroll-sound.wav");
  clickSound.volume = 0.6;

  // Favorites
  const FAV_KEY = "dd_move_favorites_v1";
  const loadFavs = () => {
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); }
    catch { return new Set(); }
  };
  const saveFavs = (set) => localStorage.setItem(FAV_KEY, JSON.stringify([...set]));
  let favs = loadFavs();

  // State
  let allMoves = [];
  let currentTab = "weapon";   // weapon | spell
  let currentFilter = "all";   // all | fav | cantrip | 1..9 | L1..L12
  let selectedId = null;

  // JSON path
  const JSON_URL = "resources/data/data-moves.json";

  const get = (obj, keys, fallback = "") => {
    for (const k of keys) {
      if (obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") return obj[k];
    }
    return fallback;
  };

  const normType = (t) => String(t || "").trim().toLowerCase();
  const typeIconPath = (type) => `resources/images/types/${normType(type)}.png`;

  const parsePlayerLevel = (req) => {
    const s = String(req || "");
    const m = s.match(/(\d+)/);
    return m ? Number(m[1]) : null;
  };

  const parseSpellLevel = (req) => {
    const s = String(req || "").toLowerCase();
    if (s.includes("cantrip")) return 0;
    const m = s.match(/(\d+)/);
    return m ? Number(m[1]) : null;
  };

  // Spell vs weapon classification
  const isSpellMove = (m) => {
    const req = String(m.requirement || "").toLowerCase();
    const des = String(m.designation || "").toLowerCase();

    if (req.includes("cantrip")) return true;
    if (req.includes("spell")) return true;
    if (des.includes("spell")) return true;

    return false;
  };

  const makeId = (move, idx) => {
    const name = String(move.name || "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
    return name ? `${name}-${idx}` : `move-${idx}`;
  };

  const normalizeMove = (raw, idx) => {
    const name = get(raw, ["Move Name", "moveName", "name", "Move"], "");
    const type = get(raw, ["Move Type", "type", "Type"], "");
    const designation = get(raw, ["Designation", "designation"], "");
    const requirement = get(raw, ["Requirement", "requirement"], "");
    const actionType = get(raw, ["Action Type", "actionType"], "");
    const range = get(raw, ["Range", "range"], "");
    const duration = get(raw, ["Duration", "duration"], "");
    const properties = get(raw, ["Properties", "properties"], "");
    const summary = get(raw, ["Summary", "summary"], "");
    const mechanics = get(raw, ["Mechanics", "mechanics"], "");
    const diceDamage = get(raw, ["Dice Damage", "diceDamage"], "");
    const moveTypeWord = get(raw, ["Move Type", "type", "Type"], "");

    return {
      id: makeId({ name }, idx),
      name,
      type,
      designation,
      requirement,
      actionType,
      range,
      duration,
      properties,
      summary,
      mechanics,
      diceDamage,
      moveTypeWord,
      raw
    };
  };

  const buildDescription = (m) => {
    const dice = String(m.diceDamage || "").trim();
    const typeWord = String(m.moveTypeWord || "").trim();
    const mech = String(m.mechanics || "");

    const mechFilled = mech
      .replaceAll("DICE_DAMAGE", dice || "—")
      .replaceAll("MOVE_TYPE", typeWord || "—");

    const parts = [];
    if (String(m.summary || "").trim()) parts.push(String(m.summary).trim());
    if (String(mechFilled || "").trim()) parts.push(String(mechFilled).trim());

    // tight: no big blank gap
    return parts.join(" ");
  };

  const renderFilters = () => {
    filtersEl.innerHTML = "";

    const makePill = (key, label, star = false) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill" + (currentFilter === key ? " is-active" : "");
      btn.dataset.filter = key;
      btn.innerHTML = star ? `<span class="star">★</span>${label}` : label;

      btn.addEventListener("click", () => {
        currentFilter = key;
        selectedId = null;
        renderFilters();
        renderList();
        renderDetail(null);
        closeModal();
      });

      return btn;
    };

    filtersEl.appendChild(makePill("fav", "Fav", true));
    filtersEl.appendChild(makePill("all", "All"));

    if (currentTab === "weapon") {
      for (let lvl = 1; lvl <= 12; lvl++) {
        filtersEl.appendChild(makePill(`L${lvl}`, String(lvl)));
      }
    } else {
      filtersEl.appendChild(makePill("cantrip", "C"));
      for (let lvl = 1; lvl <= 9; lvl++) {
        filtersEl.appendChild(makePill(String(lvl), String(lvl)));
      }
    }
  };

  const passesFilter = (m) => {
    // Tab split
    if (currentTab === "weapon" && isSpellMove(m)) return false;
    if (currentTab === "spell" && !isSpellMove(m)) return false;

    // Search (name contains)
    if (searchQuery) {
      const n = String(m.name || "").toLowerCase();
      if (!n.includes(searchQuery)) return false;
    }

    // Fav filter
    if (currentFilter === "fav") return favs.has(m.name);

    // All
    if (currentFilter === "all") return true;

    // Weapon levels
    if (currentTab === "weapon" && currentFilter.startsWith("L")) {
      const lvl = Number(currentFilter.slice(1));
      const reqLvl = parsePlayerLevel(m.requirement);
      return reqLvl === lvl;
    }

    // Spell levels
    if (currentTab === "spell") {
      if (currentFilter === "cantrip") return parseSpellLevel(m.requirement) === 0;
      const lvl = Number(currentFilter);
      return parseSpellLevel(m.requirement) === lvl;
    }

    return true;
  };

  const renderList = () => {
    listEl.innerHTML = "";

    const moves = allMoves.filter(passesFilter);

    // If selected move gets filtered out, clear the detail
    if (selectedId && !moves.some(m => m.id === selectedId)) {
      selectedId = null;
      renderDetail(null);
      closeModal();
    }

    if (moves.length === 0) {
      const empty = document.createElement("div");
      empty.className = "moves-loading";
      empty.textContent = "No moves match this filter yet.";
      listEl.appendChild(empty);
      return;
    }

    for (const m of moves) {
      const row = document.createElement("div");
      row.className = "move-row" + (m.id === selectedId ? " is-selected" : "");
      row.setAttribute("role", "listitem");
      row.dataset.id = m.id;

      // star
      const starBtn = document.createElement("button");
      starBtn.type = "button";
      starBtn.className = "move-star" + (favs.has(m.name) ? " is-fav" : "");
      starBtn.title = favs.has(m.name) ? "Unfavorite" : "Favorite";
      starBtn.textContent = favs.has(m.name) ? "★" : "☆";

      starBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (favs.has(m.name)) favs.delete(m.name);
        else favs.add(m.name);
        saveFavs(favs);
        renderList();
        renderFilters();
      });

      // name
      const name = document.createElement("div");
      name.className = "move-name";
      name.textContent = m.name || "—";

      // type icon
      const icon = document.createElement("img");
      icon.className = "type-icon";
      icon.alt = m.type ? `${m.type} type` : "Type";
      icon.src = typeIconPath(m.type);
      icon.loading = "lazy";
      icon.onerror = () => { icon.style.visibility = "hidden"; };

      // action type
      const action = document.createElement("div");
      action.className = "meta";
      action.textContent = m.actionType || "—";

      // designation (list column) — just "Melee" / "Ranged" / etc.
      const desig = document.createElement("div");
      desig.className = "meta";
      desig.textContent = (m.designation || "—")
        .replace("Weapon Attack", "")
        .replace("Spell Attack", "Spell")
        .trim() || "—";

      // requirement
      const req = document.createElement("div");
      req.className = "meta";
      req.textContent = m.requirement || "—";

      row.appendChild(starBtn);
      row.appendChild(name);
      row.appendChild(icon);
      row.appendChild(action);
      row.appendChild(desig);
      row.appendChild(req);

      row.addEventListener("click", () => {
        try { clickSound.currentTime = 0; clickSound.play(); } catch {}
        selectedId = m.id;
        renderList();
        renderDetail(m);
      });

      listEl.appendChild(row);
    }
  };

  const renderDetailMarkup = (m) => {
  const desc = buildDescription(m).replaceAll("\n", "<br>");
  const levelLabel = isSpellMove(m) ? "Spell Level" : "Player Level";

  // If we're on narrow screens, include a close button inside the header
  const closeBtn = isNarrow()
    ? `<button class="moves-modal__close moves-modal__close--inhead" type="button" aria-label="Close" title="Close">×</button>`
    : "";

  return `
    <div class="detail-head">
      <h2 class="detail-name">${escapeHtml(m.name || "—").toUpperCase()}</h2>

      <div class="detail-head__right">
        <img class="detail-type"
             src="${escapeAttr(typeIconPath(m.type))}"
             alt="${escapeAttr(m.type || "Type")} type"
             onerror="this.style.visibility='hidden'">
        ${closeBtn}
      </div>
    </div>

    <div class="detail-stack">
      <div class="detail-item"><strong>${levelLabel}:</strong> ${escapeHtml(m.requirement || "—")}</div>
      <div class="detail-item"><strong>Action Type:</strong> ${escapeHtml(m.actionType || "—")}</div>
      <div class="detail-item"><strong>Designation:</strong> ${escapeHtml(m.designation || "—")}</div>
      <div class="detail-item"><strong>Range:</strong> ${escapeHtml(m.range || "—")}</div>
      <div class="detail-item"><strong>Duration:</strong> ${escapeHtml(m.duration || "—")}</div>
      <div class="detail-item"><strong>Properties:</strong> ${escapeHtml(m.properties || "—")}</div>
    </div>

    <div class="detail-desc">
      <div class="poke-title">Description</div>
      <div>${desc || "—"}</div>
    </div>
  `;
};



  const renderDetail = (m) => {
    // No selection -> reset
    if (!m) {
      const emptyMarkup = `
        <div class="move-detail__empty">
          <div class="poke-title">Select a move</div>
          <p>Choose a move from the list to view its details here.</p>
        </div>
      `;

      if (detailEl) detailEl.innerHTML = emptyMarkup;
      if (modalDetailEl) modalDetailEl.innerHTML = emptyMarkup;
      return;
    }

    const markup = renderDetailMarkup(m);

    // Narrow screens -> modal
    if (isNarrow()) {
      if (modalDetailEl) modalDetailEl.innerHTML = markup;
      openModal();
      return;
    }

    // Desktop -> right panel
    if (detailEl) detailEl.innerHTML = markup;
  };

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(s) { return escapeHtml(s); }

  const setTab = (tab) => {
    currentTab = tab;
    currentFilter = "all";
    selectedId = null;

    tabWeaponBtn?.classList.toggle("is-active", tab === "weapon");
    tabWeaponBtn?.setAttribute("aria-selected", String(tab === "weapon"));

    tabSpellBtn?.classList.toggle("is-active", tab === "spell");
    tabSpellBtn?.setAttribute("aria-selected", String(tab === "spell"));

    renderFilters();
    renderList();
    renderDetail(null);
    closeModal();
  };

  tabWeaponBtn?.addEventListener("click", () => setTab("weapon"));
  tabSpellBtn?.addEventListener("click", () => setTab("spell"));

  // Search events
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      selectedId = null;
      renderList();
      renderDetail(null);
      closeModal();
    });

    // ESC clears search (and closes modal)
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchInput.value = "";
        searchQuery = "";
        selectedId = null;
        renderList();
        renderDetail(null);
        closeModal();
      }
    });
  }

  // If user resizes from mobile->desktop while modal is open, close it
  mobileMQ.addEventListener?.("change", () => {
    if (!isNarrow()) closeModal();
  });

  // Load data
  const init = async () => {
    try {
      const res = await fetch(JSON_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load JSON: ${res.status}`);
      const raw = await res.json();

      const arr = Array.isArray(raw) ? raw : (raw.moves || raw.data || []);
      allMoves = arr.map((r, i) => normalizeMove(r, i));

      setTab("weapon");
      renderDetail(null);
    } catch (err) {
      console.error(err);
      if (listEl) listEl.innerHTML = `<div class="moves-loading">Could not load moves JSON. Check file path/name.</div>`;
    }
  };

  init();
})();