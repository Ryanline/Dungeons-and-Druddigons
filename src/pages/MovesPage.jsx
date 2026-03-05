import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { assetUrl } from "../utils/assetUrl";

const FAV_KEY = "dd_move_favorites_v1";
const SHEET_ID = "1Ip2J43ofUiTRxutGRyGiXfdm8_aclFBa1Dvdwm8FYhg";
const MOVES_TAB = "moves";

const get = (obj, keys, fallback = "") => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && String(obj[key]).trim() !== "") {
      return obj[key];
    }
  }
  return fallback;
};

const parsePlayerLevel = (requirement) => {
  const match = String(requirement || "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const parseSpellLevel = (requirement) => {
  const text = String(requirement || "").toLowerCase();
  if (text.includes("cantrip")) return 0;
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const isSpellMove = (move) => {
  const requirement = String(move.requirement || "").toLowerCase();
  const designation = String(move.designation || "").toLowerCase();

  return requirement.includes("cantrip") || requirement.includes("spell") || designation.includes("spell");
};

const makeId = (name, index) => {
  const slug = String(name || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return slug ? `${slug}-${index}` : `move-${index}`;
};

const normalizeMove = (raw, index) => {
  const name = get(raw, ["Attack", "Move Name", "moveName", "name", "Move"], "");

  return {
    id: makeId(name, index),
    name,
    type: get(raw, ["Move Type", "type", "Type"], ""),
    designation: get(raw, ["Category", "Designation", "designation"], ""),
    requirement: get(raw, ["Level", "Requirement", "requirement"], ""),
    actionType: get(raw, ["Casting Time", "Action Type", "actionType"], ""),
    range: get(raw, ["Range", "range"], ""),
    duration: get(raw, ["Duration", "duration"], ""),
    properties: get(raw, ["Properties", "properties"], ""),
    summary: get(raw, ["Mini description", "Summary", "summary"], ""),
    mechanics: get(raw, ["Description", "Mechanics", "mechanics"], ""),
    diceDamage: get(raw, ["Dice Damage", "diceDamage"], ""),
    moveTypeWord: get(raw, ["Move Type", "type", "Type"], ""),
  };
};

const typeIconPath = (type) => assetUrl(`resources/images/types/${String(type || "").trim().toLowerCase()}.png`);

const buildDescription = (move) => {
  const dice = String(move.diceDamage || "").trim();
  const typeWord = String(move.moveTypeWord || "").trim();
  const mechanics = String(move.mechanics || "")
    .replaceAll("DICE_DAMAGE", dice || "-")
    .replaceAll("MOVE_TYPE", typeWord || "-")
    .trim();

  return [String(move.summary || "").trim(), mechanics].filter(Boolean).join(" ");
};

const loadFavs = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const saveFavs = (favs) => {
  localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
};

async function fetchMovesFromSheet() {
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(MOVES_TAB)}`;
  const response = await fetch(sheetUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load moves sheet (${response.status})`);

  const csv = await response.text();
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

  if (parsed.errors?.length) {
    throw new Error("Moves sheet CSV parsing failed.");
  }

  return Array.isArray(parsed.data) ? parsed.data : [];
}

async function fetchMovesFallbackJson() {
  const fallback = await fetch(assetUrl("resources/data/data-moves.json"), { cache: "no-store" });
  if (!fallback.ok) throw new Error(`Fallback JSON failed (${fallback.status})`);
  const raw = await fallback.json();
  return Array.isArray(raw) ? raw : raw.moves || raw.data || [];
}

function DetailCard({ move, isNarrow, onClose }) {
  if (!move) {
    return (
      <div className="move-detail__empty">
        <div className="poke-title">Select a move</div>
        <p>Choose a move from the list to view its details here.</p>
      </div>
    );
  }

  const description = buildDescription(move);
  const levelLabel = isSpellMove(move) ? "Spell Level" : "Player Level";

  return (
    <>
      <div className="detail-head">
        <h2 className="detail-name">{String(move.name || "-").toUpperCase()}</h2>

        <div className="detail-head__right">
          <img
            className="detail-type"
            src={typeIconPath(move.type)}
            alt={`${move.type || "Type"} type`}
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />

          {isNarrow && (
            <button className="moves-modal__close moves-modal__close--inhead" type="button" aria-label="Close" title="Close" onClick={onClose}>
              ×
            </button>
          )}
        </div>
      </div>

      <div className="detail-stack">
        <div className="detail-item"><strong>{levelLabel}:</strong> {move.requirement || "-"}</div>
        <div className="detail-item"><strong>Action Type:</strong> {move.actionType || "-"}</div>
        <div className="detail-item"><strong>Designation:</strong> {move.designation || "-"}</div>
        <div className="detail-item"><strong>Range:</strong> {move.range || "-"}</div>
        <div className="detail-item"><strong>Duration:</strong> {move.duration || "-"}</div>
        <div className="detail-item"><strong>Properties:</strong> {move.properties || "-"}</div>
      </div>

      <div className="detail-desc">
        <div className="poke-title">Description</div>
        <div style={{ whiteSpace: "pre-line" }}>{description || "-"}</div>
      </div>
    </>
  );
}

export function MovesPage() {
  const [allMoves, setAllMoves] = useState([]);
  const [currentTab, setCurrentTab] = useState("weapon");
  const [currentFilter, setCurrentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia("(max-width: 980px)").matches);
  const [error, setError] = useState("");
  const [favs, setFavs] = useState(() => loadFavs());

  const clickSoundRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(assetUrl("resources/audio/scroll-sound.wav"));
    audio.volume = 0.6;
    clickSoundRef.current = audio;
    return () => {
      audio.pause();
      clickSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 980px)");
    const handleChange = (event) => setIsNarrow(event.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isNarrow) {
      setIsModalOpen(false);
      document.body.classList.remove("moves-modal-open");
    }
  }, [isNarrow]);

  useEffect(() => {
    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
        document.body.classList.remove("moves-modal-open");
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const source = await fetchMovesFromSheet();
        if (!cancelled) {
          setAllMoves(source.map((item, index) => normalizeMove(item, index)));
          setError("");
        }
      } catch (sheetError) {
        try {
          const source = await fetchMovesFallbackJson();
          if (!cancelled) {
            setAllMoves(source.map((item, index) => normalizeMove(item, index)));
            setError(`Live sheet unavailable. Using fallback JSON. ${sheetError.message}`);
          }
        } catch (fallbackError) {
          if (!cancelled) setError(`${sheetError.message} ${fallbackError.message}`);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveFavs(favs);
  }, [favs]);

  const filteredMoves = useMemo(() => {
    return allMoves.filter((move) => {
      if (currentTab === "weapon" && isSpellMove(move)) return false;
      if (currentTab === "spell" && !isSpellMove(move)) return false;

      if (searchQuery) {
        const name = String(move.name || "").toLowerCase();
        if (!name.includes(searchQuery)) return false;
      }

      if (currentFilter === "fav") return favs.has(move.name);
      if (currentFilter === "all") return true;

      if (currentTab === "weapon" && currentFilter.startsWith("L")) {
        return parsePlayerLevel(move.requirement) === Number(currentFilter.slice(1));
      }

      if (currentTab === "spell") {
        if (currentFilter === "cantrip") return parseSpellLevel(move.requirement) === 0;
        return parseSpellLevel(move.requirement) === Number(currentFilter);
      }

      return true;
    });
  }, [allMoves, currentTab, currentFilter, favs, searchQuery]);

  const selectedMove = useMemo(
    () => filteredMoves.find((move) => move.id === selectedId) || null,
    [filteredMoves, selectedId]
  );

  useEffect(() => {
    if (selectedId && !filteredMoves.some((move) => move.id === selectedId)) {
      setSelectedId(null);
      setIsModalOpen(false);
      document.body.classList.remove("moves-modal-open");
    }
  }, [filteredMoves, selectedId]);

  const changeTab = (tab) => {
    setCurrentTab(tab);
    setCurrentFilter("all");
    setSelectedId(null);
    setIsModalOpen(false);
    document.body.classList.remove("moves-modal-open");
  };

  const openModal = () => {
    if (!isNarrow) return;
    setIsModalOpen(true);
    document.body.classList.add("moves-modal-open");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.classList.remove("moves-modal-open");
  };

  const handleMoveSelect = (move) => {
    try {
      if (clickSoundRef.current) {
        clickSoundRef.current.currentTime = 0;
        clickSoundRef.current.play();
      }
    } catch {
      // Ignore autoplay rejections
    }

    setSelectedId(move.id);
    if (isNarrow) openModal();
  };

  const toggleFavorite = (moveName) => {
    setFavs((current) => {
      const next = new Set(current);
      if (next.has(moveName)) next.delete(moveName);
      else next.add(moveName);
      return next;
    });
  };

  return (
    <main className="page moves-page" role="main">
      <div className="content">
        <h1>Moves</h1>

        <p className="lede">
          Moves are categorized as <q>Weapon Attack Moves</q> and <q>Spell Moves.</q> The moves a
          Pokemon can learn are based on their usual movepool. Use{" "}
          <a href="https://play.pokemonshowdown.com/" className="inline-link" target="_blank" rel="noreferrer">
            Pokemon Showdown
          </a>{" "}
          or similar to check movepools.
        </p>

        <p className="lede">
          Full-caster characters may select up to two Weapon Attack Moves from their movepool.
          Partial-caster characters and Warlocks may select up to three Weapon Attack Moves.
          Non-caster classes may select up to four Weapon Attack Moves. Spell Moves are treated
          like D&amp;D spells and may only be learned by casters.
        </p>

        <div className="moves-shell" aria-label="Moves Browser">
          <section className="moves-left" aria-label="Move List">
            <div className="moves-tabs" role="tablist" aria-label="Move Type Tabs">
              <button
                className={`tab${currentTab === "weapon" ? " is-active" : ""}`}
                id="tab-weapon"
                role="tab"
                aria-selected={currentTab === "weapon"}
                type="button"
                onClick={() => changeTab("weapon")}
              >
                Weapon Attacks
              </button>
              <button
                className={`tab${currentTab === "spell" ? " is-active" : ""}`}
                id="tab-spell"
                role="tab"
                aria-selected={currentTab === "spell"}
                type="button"
                onClick={() => changeTab("spell")}
              >
                Spells
              </button>
            </div>

            <div className="moves-filters" aria-label="Filters">
              <button
                type="button"
                className={`pill${currentFilter === "fav" ? " is-active" : ""}`}
                onClick={() => {
                  setCurrentFilter("fav");
                  setSelectedId(null);
                  closeModal();
                }}
              >
                <span className="star">★</span>Fav
              </button>
              <button
                type="button"
                className={`pill${currentFilter === "all" ? " is-active" : ""}`}
                onClick={() => {
                  setCurrentFilter("all");
                  setSelectedId(null);
                  closeModal();
                }}
              >
                All
              </button>

              {currentTab === "weapon" &&
                Array.from({ length: 12 }).map((_, index) => {
                  const level = index + 1;
                  const key = `L${level}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`pill${currentFilter === key ? " is-active" : ""}`}
                      onClick={() => {
                        setCurrentFilter(key);
                        setSelectedId(null);
                        closeModal();
                      }}
                    >
                      {level}
                    </button>
                  );
                })}

              {currentTab === "spell" && (
                <>
                  <button
                    type="button"
                    className={`pill${currentFilter === "cantrip" ? " is-active" : ""}`}
                    onClick={() => {
                      setCurrentFilter("cantrip");
                      setSelectedId(null);
                      closeModal();
                    }}
                  >
                    C
                  </button>
                  {Array.from({ length: 9 }).map((_, index) => {
                    const level = index + 1;
                    const key = String(level);
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`pill${currentFilter === key ? " is-active" : ""}`}
                        onClick={() => {
                          setCurrentFilter(key);
                          setSelectedId(null);
                          closeModal();
                        }}
                      >
                        {level}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            <div className="moves-search" aria-label="Search moves">
              <input
                id="moves-search"
                className="moves-search__input"
                type="text"
                inputMode="search"
                autoComplete="off"
                placeholder="Search moves..."
                aria-label="Search moves by name"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value.trim().toLowerCase());
                  setSelectedId(null);
                  closeModal();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSearchQuery("");
                    setSelectedId(null);
                    closeModal();
                  }
                }}
              />
            </div>

            <div className="moves-header" aria-hidden="true">
              <div></div>
              <div>Move</div>
              <div></div>
              <div>Action</div>
              <div>Range</div>
              <div>Level</div>
            </div>

            <div className="moves-list" role="list" aria-label="Moves">
              {error && <div className="moves-loading">{error}</div>}
              {!allMoves.length && <div className="moves-loading">Loading moves...</div>}
              {allMoves.length > 0 && filteredMoves.length === 0 && (
                <div className="moves-loading">No moves match this filter yet.</div>
              )}

              {filteredMoves.map((move) => (
                <div
                  key={move.id}
                  className={`move-row${move.id === selectedId ? " is-selected" : ""}`}
                  role="listitem"
                  onClick={() => handleMoveSelect(move)}
                >
                  <button
                    type="button"
                    className={`move-star${favs.has(move.name) ? " is-fav" : ""}`}
                    title={favs.has(move.name) ? "Unfavorite" : "Favorite"}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(move.name);
                    }}
                  >
                    {favs.has(move.name) ? "★" : "☆"}
                  </button>
                  <div className="move-name">{move.name || "-"}</div>
                  <img
                    className="type-icon"
                    alt={move.type ? `${move.type} type` : "Type"}
                    src={typeIconPath(move.type)}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                  />
                  <div className="meta">{move.actionType || "-"}</div>
                  <div className="meta">
                    {(move.designation || "-").replace("Weapon Attack", "").replace("Spell Attack", "Spell").trim() || "-"}
                  </div>
                  <div className="meta">{move.requirement || "-"}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="moves-right" aria-label="Move Details">
            <div className="move-detail">
              <DetailCard move={selectedMove} isNarrow={false} onClose={closeModal} />
            </div>
          </section>
        </div>
      </div>

      <div className={`moves-modal${isModalOpen ? " is-open" : ""}`} aria-hidden={!isModalOpen}>
        <div className="moves-modal__backdrop" data-close="true" onClick={closeModal} />
        <div className="moves-modal__panel" role="dialog" aria-modal="true" aria-label="Move details">
          <button className="moves-modal__close" type="button" aria-label="Close" title="Close" onClick={closeModal}>
            ×
          </button>

          <div className="moves-modal__content">
            <div className="move-detail move-detail--modal" id="moves-modal-detail">
              <DetailCard move={selectedMove} isNarrow={true} onClose={closeModal} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
