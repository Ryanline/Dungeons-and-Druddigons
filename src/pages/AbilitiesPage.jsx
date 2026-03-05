import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { assetUrl } from "../utils/assetUrl";

const SHEET_ID = "1jxuYYlsJmwDGGaq533WraM2tkCr22WU4EuY92lpbzHk";
const ABILITIES_TAB = "abilities";

const get = (obj, keys, fallback = "") => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && String(obj[key]).trim() !== "") {
      return obj[key];
    }
  }
  return fallback;
};

const makeId = (name, index) => {
  const slug = String(name || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return slug ? `${slug}-${index}` : `ability-${index}`;
};

const normalizeAbility = (raw, index) => ({
  id: makeId(get(raw, ["Ability", "ability", "name"], ""), index),
  name: get(raw, ["Ability", "ability", "name"], ""),
  effect: get(raw, ["Description", "Effect", "effect", "description"], ""),
});

async function fetchAbilitiesFromSheet() {
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(ABILITIES_TAB)}`;
  const response = await fetch(sheetUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load abilities sheet (${response.status})`);

  const csv = await response.text();
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

  if (parsed.errors?.length) {
    throw new Error("Abilities sheet CSV parsing failed.");
  }

  return Array.isArray(parsed.data) ? parsed.data : [];
}

function AbilityDetail({ ability, isNarrow, onClose }) {
  if (!ability) {
    return (
      <div className="ab-detail__empty">
        <div className="poke-title">Select an ability</div>
        <p>Choose an ability from the list to view its details here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="ab-detail-head">
        <h2 className="ab-detail-name">{ability.name || "-"}</h2>
        <div className="ab-detail-head__right">
          {isNarrow && (
            <button className="ab-modal__close--inhead" type="button" aria-label="Close" title="Close" onClick={onClose}>
              ×
            </button>
          )}
        </div>
      </div>

      <div className="ab-desc">
        <div className="poke-title">Description</div>
        <div style={{ whiteSpace: "pre-line" }}>{ability.effect || "-"}</div>
      </div>
    </>
  );
}

export function AbilitiesPage() {
  const [allAbilities, setAllAbilities] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia("(max-width: 980px)").matches);

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
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isNarrow) {
      setIsModalOpen(false);
      document.body.classList.remove("ab-modal-open");
    }
  }, [isNarrow]);

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
        document.body.classList.remove("ab-modal-open");
      }
    };

    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const source = await fetchAbilitiesFromSheet();
        if (!cancelled) {
          setAllAbilities(source.map((item, index) => normalizeAbility(item, index)));
          setError("");
        }
      } catch (sheetError) {
        if (!cancelled) setError(`Unable to load abilities from Google Sheets. ${sheetError.message}`);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleAbilities = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allAbilities;

    return allAbilities.filter((ability) => {
      const haystack = `${ability.name} ${ability.effect}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [allAbilities, query]);

  const selectedAbility = useMemo(
    () => visibleAbilities.find((ability) => ability.id === selectedId) || null,
    [visibleAbilities, selectedId]
  );

  useEffect(() => {
    if (selectedId && !visibleAbilities.some((ability) => ability.id === selectedId)) {
      setSelectedId(null);
      setIsModalOpen(false);
      document.body.classList.remove("ab-modal-open");
    }
  }, [selectedId, visibleAbilities]);

  const openModal = () => {
    if (!isNarrow) return;
    setIsModalOpen(true);
    document.body.classList.add("ab-modal-open");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.classList.remove("ab-modal-open");
  };

  const handleSelect = (ability) => {
    try {
      if (clickSoundRef.current) {
        clickSoundRef.current.currentTime = 0;
        clickSoundRef.current.play();
      }
    } catch {
      // Ignore autoplay rejections
    }

    setSelectedId(ability.id);
    if (isNarrow) openModal();
  };

  return (
    <main className="page abilities-page" role="main">
      <div className="content">
        <h1>Abilities</h1>
        <p className="lede">Click an ability to view its description.</p>

        <div className="ab-shell" aria-label="Abilities Browser">
          <section className="ab-left" aria-label="Ability List">
            <div className="ab-header" aria-hidden="true">
              <div>Ability</div>
            </div>

            <div className="ab-search" aria-label="Search abilities">
              <input
                id="ab-search-input"
                type="search"
                placeholder="Search..."
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedId(null);
                  closeModal();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setQuery("");
                    setSelectedId(null);
                    closeModal();
                  }
                }}
              />
            </div>

            <div className="ab-list" role="list" aria-label="Abilities">
              {error && <div className="ab-loading">{error}</div>}
              {!allAbilities.length && <div className="ab-loading">Loading abilities...</div>}
              {allAbilities.length > 0 && visibleAbilities.length === 0 && <div className="ab-loading">No results.</div>}

              {visibleAbilities.map((ability) => (
                <div
                  key={ability.id}
                  className={`ab-row${ability.id === selectedId ? " is-selected" : ""}`}
                  role="listitem"
                  onClick={() => handleSelect(ability)}
                >
                  <div className="ab-name">{ability.name || "-"}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="ab-right" aria-label="Ability Details">
            <div className="ab-detail">
              <AbilityDetail ability={selectedAbility} isNarrow={false} onClose={closeModal} />
            </div>
          </section>
        </div>
      </div>

      <div className={`ab-modal${isModalOpen ? " is-open" : ""}`} id="ab-modal" aria-hidden={!isModalOpen}>
        <div className="ab-modal__backdrop" data-close="true" onClick={closeModal}></div>

        <div className="ab-modal__panel" role="dialog" aria-modal="true" aria-label="Ability details">
          <button className="ab-modal__close" type="button" aria-label="Close" title="Close" onClick={closeModal}>
            ×
          </button>

          <div className="ab-modal__content">
            <div className="ab-detail ab-detail--modal" id="ab-modal-detail">
              <AbilityDetail ability={selectedAbility} isNarrow={true} onClose={closeModal} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
