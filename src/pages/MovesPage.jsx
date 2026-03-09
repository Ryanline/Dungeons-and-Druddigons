import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { assetUrl } from "../utils/assetUrl";

const SHEET_ID = "1jxuYYlsJmwDGGaq533WraM2tkCr22WU4EuY92lpbzHk";
const MOVES_TAB = "moves";

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
  return slug ? `${slug}-${index}` : `move-${index}`;
};

const normalizeMove = (raw, index) => {
  const name = get(raw, ["NAM", "IAM", "NAME", "ATTACK", "MOVE NAME", "name"], "");
  const type = get(raw, ["TYP", "TYPE", "MOVE TYPE", "type"], "");
  const category = get(raw, ["CAT", "CATEGORY", "DESIGNATION", "designation"], "");
  const economy = get(raw, ["ECO", "ECONOMY", "CASTING TIME", "ACTION TYPE", "actionType"], "");
  const range = get(raw, ["RAN", "RANGE", "range"], "");
  const requirementRaw = get(raw, ["REQ", "REQUIREMENT", "LEVEL", "requirement"], "");

  return {
    id: makeId(name, index),
    name,
    type,
    category,
    economy,
    range,
    requirementRaw,
    duration: get(raw, ["DUR", "DURATION", "duration"], ""),
    components: get(raw, ["COM", "COMPONENTS", "CMP", "components"], ""),
    properties: get(raw, ["PRO", "PROPERTIES", "properties"], ""),
    summary: get(raw, ["SUM", "SUMMARY", "summary"], ""),
    mechanics: get(raw, ["MEC", "MECHANICS", "mechanics", "DESCRIPTION"], ""),
    dam: get(raw, ["DAM", "DICE DAMAGE", "diceDamage"], ""),
  };
};

const typeIconPath = (type) => assetUrl(`resources/images/types/${String(type || "").trim().toLowerCase()}.png`);
const categoryIconPath = (category) => {
  const normalized = String(category || "").trim().toLowerCase();
  if (normalized.includes("special")) return assetUrl("resources/images/categories/special.png");
  if (normalized.includes("status")) return assetUrl("resources/images/categories/status.png");
  if (normalized.includes("attack")) return assetUrl("resources/images/categories/attack.png");
  return "";
};

const parseRequirementNumber = (rawRequirement) => {
  const text = String(rawRequirement || "").trim();
  if (!text) return null;
  if (/^cantrip$/i.test(text)) return 0;
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const isAttackCategory = (category) => /^attack$/i.test(String(category || "").trim());
const isSpecialCategory = (category) => /^special attack$/i.test(String(category || "").trim());
const isStatusCategory = (category) => /^status$/i.test(String(category || "").trim());

const toOrdinal = (n) => {
  if (!Number.isFinite(n) || n <= 0) return "-";
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
};

const formatRequirement = (move) => {
  const reqNum = parseRequirementNumber(move.requirementRaw);
  if (reqNum === 0) return "Cantrip";
  if (!Number.isFinite(reqNum)) return String(move.requirementRaw || "-").trim() || "-";
  if (isAttackCategory(move.category)) return `Player level ${reqNum}`;
  if (isSpecialCategory(move.category)) return `${toOrdinal(reqNum)}-level special attack slot`;
  if (isStatusCategory(move.category)) return `${toOrdinal(reqNum)}-level status slot`;
  return `${toOrdinal(reqNum)}-level slot`;
};

const formatDetailSubtitle = (move) => {
  const reqNum = parseRequirementNumber(move.requirementRaw);
  if (isAttackCategory(move.category)) {
    if (reqNum === 0) return "Attack move (Cantrip)";
    if (Number.isFinite(reqNum)) return `Attack move (req. player level ${reqNum})`;
    return "Attack move";
  }

  if (isSpecialCategory(move.category)) {
    if (reqNum === 0) return "Cantrip special attack move";
    if (Number.isFinite(reqNum)) return `${toOrdinal(reqNum)}-level special attack move`;
    return "Special attack move";
  }

  if (isStatusCategory(move.category)) {
    if (reqNum === 0) return "Cantrip status move";
    if (Number.isFinite(reqNum)) return `${toOrdinal(reqNum)}-level status move`;
    return "Status move";
  }

  return "Move";
};

const buildDescription = (move) => {
  const merged = `${String(move.summary || "").trim()} ${String(move.mechanics || "").trim()}`.trim();
  return merged
    .replaceAll("DAM", String(move.dam || "-").trim() || "-")
    .replaceAll("TYP", String(move.type || "-").trim() || "-")
    .replaceAll("MOVE_DAMAGE", String(move.dam || "-").trim() || "-")
    .replaceAll("MOVE_TYPE", String(move.type || "-").trim() || "-");
};

async function fetchMovesFromSheet() {
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(MOVES_TAB)}`;
  const response = await fetch(sheetUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load moves sheet (${response.status})`);

  const csv = await response.text();
  const parsed = Papa.parse(csv, {
    header: false,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) throw new Error("Moves sheet CSV parsing failed.");
  if (!Array.isArray(parsed.data)) return [];

  const stripPrefix = (value, prefix) => {
    const text = String(value ?? "").trim();
    const re = new RegExp(`^${prefix}\\s+`, "i");
    return text.replace(re, "").trim();
  };

  return parsed.data.map((row) => {
    const cells = Array.isArray(row) ? row : [];
    return {
      NAM: stripPrefix(cells[0], "NAM"),
      TYP: stripPrefix(cells[1], "TYP"),
      REQ: stripPrefix(cells[2], "REQ"),
      CAT: stripPrefix(cells[3], "CAT"),
      RAN: stripPrefix(cells[4], "RAN"),
      ECO: stripPrefix(cells[5], "ECO"),
      DUR: stripPrefix(cells[6], "DUR"),
      AMT: stripPrefix(cells[7], "AMT"),
      DIC: stripPrefix(cells[8], "DIC"),
      DAM: stripPrefix(cells[9], "DAM"),
      PRO: stripPrefix(cells[10], "PRO"),
      SUM: stripPrefix(cells[11], "SUM"),
      MEC: stripPrefix(cells[12], "MEC"),
    };
  });
}

function DetailCard({ move }) {
  if (!move) {
    return (
      <div className="move-detail__empty">
        <div className="poke-title">Select a move</div>
        <p>Choose a move from the list to view its details here.</p>
      </div>
    );
  }

  const subtitle = formatDetailSubtitle(move);
  const description = buildDescription(move);
  const showCastingBlock = isSpecialCategory(move.category) || isStatusCategory(move.category);

  return (
    <>
      <div className="detail-head">
        <h2 className="detail-name">{String(move.name || "-").toUpperCase()}</h2>
        <div className="detail-icons">
          <img
            className="detail-type"
            src={typeIconPath(move.type)}
            alt={`${move.type || "Type"} type`}
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
          {categoryIconPath(move.category) && (
            <img
              className="detail-cat-icon"
              src={categoryIconPath(move.category)}
              alt={`${move.category || "Category"} category`}
              onError={(event) => {
                event.currentTarget.style.visibility = "hidden";
              }}
            />
          )}
        </div>
      </div>

      <div className="detail-subtitle">{subtitle}</div>

      {showCastingBlock && (
        <div className="detail-stack">
          <div className="detail-item"><strong>Casting Time:</strong> {move.economy || "-"}</div>
          <div className="detail-item"><strong>Range:</strong> {move.range || "-"}</div>
          <div className="detail-item"><strong>Components:</strong> {move.components || "-"}</div>
          <div className="detail-item"><strong>Duration:</strong> {move.duration || "-"}</div>
        </div>
      )}

      <div className="detail-desc" style={{ whiteSpace: "pre-line" }}>
        <span className="detail-desc-label">Description:</span> {description || "-"}
      </div>
    </>
  );
}

export function MovesPage() {
  const [allMoves, setAllMoves] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });

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
    let cancelled = false;

    const load = async () => {
      try {
        const source = await fetchMovesFromSheet();
        if (!cancelled) {
          const normalized = source.map((item, index) => normalizeMove(item, index)).filter((move) => move.name);
          setAllMoves(normalized);
          setError("");
        }
      } catch (sheetError) {
        if (!cancelled) setError(`Unable to load moves from Google Sheets. ${sheetError.message}`);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedMoves = useMemo(() => {
    const list = [...allMoves];
    const { key, direction } = sortConfig;

    list.sort((a, b) => {
      let aValue = "";
      let bValue = "";

      if (key === "requirement") {
        aValue = parseRequirementNumber(a.requirementRaw) ?? Number.MAX_SAFE_INTEGER;
        bValue = parseRequirementNumber(b.requirementRaw) ?? Number.MAX_SAFE_INTEGER;
      } else {
        aValue = String(a[key] ?? "").toLowerCase();
        bValue = String(b[key] ?? "").toLowerCase();
      }

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [allMoves, sortConfig]);

  const visibleMoves = useMemo(() => {
    const needle = String(searchQuery || "").trim().toLowerCase();
    if (!needle) return sortedMoves;
    return sortedMoves.filter((move) => {
      const haystack = `${move.name} ${move.type} ${move.category} ${move.economy} ${move.range} ${formatRequirement(move)}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [sortedMoves, searchQuery]);

  const selectedMove = useMemo(
    () => visibleMoves.find((move) => move.id === selectedId) || null,
    [visibleMoves, selectedId]
  );

  const requestSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortArrow = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
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
  };

  return (
    <main className="page moves-page" role="main">
      <div className="content">
        <h1>Moves</h1>

        <div className="moves-shell" aria-label="Moves Browser">
          <section className="moves-left" aria-label="Move List">
            <div className="moves-list-frame">
              <div className="moves-search">
                <input
                  className="moves-search__input"
                  type="search"
                  autoComplete="off"
                  placeholder="Search moves..."
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSelectedId(null);
                  }}
                />
              </div>
              <div className="moves-header" aria-label="Sortable moves columns">
                <button type="button" className="sort-head" onClick={() => requestSort("name")}>NAME{sortArrow("name")}</button>
                <button type="button" className="sort-head" onClick={() => requestSort("type")}>TYPE{sortArrow("type")}</button>
                <button type="button" className="sort-head" onClick={() => requestSort("category")}>CAT{sortArrow("category")}</button>
                <button type="button" className="sort-head" onClick={() => requestSort("economy")}>ECONOMY{sortArrow("economy")}</button>
                <button type="button" className="sort-head" onClick={() => requestSort("range")}>RANGE{sortArrow("range")}</button>
                <button type="button" className="sort-head" onClick={() => requestSort("requirement")}>REQUIREMENT{sortArrow("requirement")}</button>
              </div>

              <div className="moves-list" role="list" aria-label="Moves">
                {error && <div className="moves-loading">{error}</div>}
                {!error && !sortedMoves.length && <div className="moves-loading">Loading moves...</div>}
                {!error && sortedMoves.length > 0 && !visibleMoves.length && (
                  <div className="moves-loading">No moves match.</div>
                )}

                {!error &&
                  visibleMoves.map((move) => (
                    <div
                      key={move.id}
                      className={`move-row${move.id === selectedId ? " is-selected" : ""}`}
                      role="listitem"
                      onClick={() => handleMoveSelect(move)}
                    >
                      <div className="move-name">{move.name || "-"}</div>
                      <div className="move-type-wrap">
                        <img
                          className="type-icon"
                          alt={move.type ? `${move.type} type` : "Type"}
                          src={typeIconPath(move.type)}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.visibility = "hidden";
                          }}
                        />
                      </div>
                      <div className="move-cat-wrap">
                        {categoryIconPath(move.category) ? (
                          <img
                            className="cat-icon"
                            src={categoryIconPath(move.category)}
                            alt={`${move.category || "Category"} category`}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.visibility = "hidden";
                            }}
                          />
                        ) : (
                          <span className="meta">{move.category || "-"}</span>
                        )}
                      </div>
                      <div className="meta">{move.economy || "-"}</div>
                      <div className="meta">{move.range || "-"}</div>
                      <div className="meta">{formatRequirement(move)}</div>
                    </div>
                  ))}
              </div>
            </div>
          </section>

          <section className="moves-right" aria-label="Move Details">
            <div className="move-detail card-border">
              <DetailCard move={selectedMove} />
            </div>
          </section>
        </div>

        <section className="moves-doc" aria-label="Moves Guide">
          <p>
            Moves are the primary abilities used by Pokemon in combat and exploration. Every Pokemon has access to a
            movepool, which represents all of the moves it could potentially learn. Moves fall into the following
            categories:
          </p>

          <ul>
            <li>Attack Moves. These function as weapons.</li>
            <li>Special Moves. These function as spells.</li>
            <li>Special Attack Moves. These are damage-dealing Special Moves.</li>
            <li>Status Moves. These provide utility, buffs, debuffs, or other effects.</li>
          </ul>

          <h2>Movepools</h2>
          <p>
            All of the moves a Pokemon can learn are referred to as its Movepool. This consists of level-up moves,
            TM/HM moves, tutor moves, and egg moves. Use{" "}
            <a href="https://play.pokemonshowdown.com/" className="inline-link" target="_blank" rel="noreferrer">
              Pokemon Showdown
            </a>{" "}
            to check a Pokemon&apos;s movepool. A Pokemon may only naturally learn moves from its movepool.
          </p>

          <h2>Attack Moves</h2>
          <p>
            Attack Moves correspond to weapons. These are often (but not always) associated with physical attacks
            classic to Pokemon, such as Tackle, Bite, Iron Tail, and so on. These moves have Masteries (Topple,
            Nick, etc.) and Properties (Finesse, Reach, etc.) the same as weapons usually do.
          </p>

          <h2>Special Moves</h2>
          <p>
            Special Moves correspond to spells. These are often (but not always) associated with special attacks and
            status moves classic to Pokemon, such as Fire Blast, Thunderbolt, and Blizzard. These are either
            Cantrips, which may be cast without cost, or may require some level special slot (similar to a spell
            slot) to be cast.
          </p>

          <h2>Learning Moves</h2>
          <p>
            Regarding Attack Moves: full-casters may know two Attack Moves, partial-casters and Warlocks may know
            three, and non-casters may know four. Multi-classed characters are treated as whichever class they started
            as at level 1 for the purposes of Attack Move quantities, regardless of which class(es) are multiclassed
            to, similar to how saving throw proficiencies are handled. Attack Moves are available according to a
            character&apos;s total character level. At character creation, and at each level-up from there on, a
            character may learn (or replace) any number of Attack moves so long as the character (a) may learn it
            according to their movepool and (b) may use it according to their total character level.
          </p>

          <p>
            Regarding Special Moves, these are learned as spells typically would be. For example, a level 1 sorcerer
            would have two 1st-level spell slots, know two level 1 spells, and know four cantrips. The only
            difference from vanilla D&amp;D is that, rather than learning spells according to the sorcerer spell list,
            this character would learn them according to their movepool. Spell preparation and changing are both
            handled as usual according to a character&apos;s class. Special slots are recovered however a character&apos;s
            spell slots would typically be recovered.
          </p>

          <p>
            Attack Moves known do not count against Special Moves known and Special Moves do not count against Attack
            Moves known. These are each fully independent. In fact, some moves have both an Attack Move version and a
            Special Move version. A Pokemon is able to learn both of these so long as they meet the requirements of
            each individually.
          </p>
        </section>
      </div>
    </main>
  );
}
