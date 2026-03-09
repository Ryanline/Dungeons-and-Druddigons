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
  return `${toOrdinal(reqNum)}-level special slot`;
};

const formatDetailSubtitle = (move) => {
  const reqNum = parseRequirementNumber(move.requirementRaw);
  if (isAttackCategory(move.category)) {
    if (reqNum === 0) return "Attack move (Cantrip)";
    if (Number.isFinite(reqNum)) return `Attack move (req. player level ${reqNum})`;
    return "Attack move";
  }

  if (isSpecialCategory(move.category)) {
    if (reqNum === 0) return "Cantrip special move";
    if (Number.isFinite(reqNum)) return `${toOrdinal(reqNum)}-level special move`;
    return "Special move";
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
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) =>
      String(header || "")
        .replace(/\ufeff/g, "")
        .trim()
        .toUpperCase(),
  });
  if (parsed.errors?.length) throw new Error("Moves sheet CSV parsing failed.");
  return Array.isArray(parsed.data) ? parsed.data : [];
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
        <img
          className="detail-type"
          src={typeIconPath(move.type)}
          alt={`${move.type || "Type"} type`}
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
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

      <div className="detail-desc">
        <div className="poke-title">Description</div>
        <div style={{ whiteSpace: "pre-line" }}>{description || "-"}</div>
      </div>
    </>
  );
}

export function MovesPage() {
  const [allMoves, setAllMoves] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
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

  const selectedMove = useMemo(
    () => sortedMoves.find((move) => move.id === selectedId) || null,
    [sortedMoves, selectedId]
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
            <div className="moves-list-frame">
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

                {!error &&
                  sortedMoves.map((move) => (
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
                      <div className="meta">{move.category || "-"}</div>
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
      </div>
    </main>
  );
}
