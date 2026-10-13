import { useState, useMemo } from "react";
import { getBestiaryEntries } from "./spriteRegistry";

/**
 * Portrait d'un monstre dans sa pose idleDown, decoupe dans sa
 * spritesheet via entry.sheetCols/sheetRows (desormais renseignes sur
 * toutes les entrees de SPRITE_REGISTRY) - meme logique que le portrait
 * du heros dans InventoryScreen.js (idleFrameIndex % sheetCols).
 */
function MonsterPortrait({ entry, size = 72 }) {
  const sheetCols = entry.sheetCols || 4;
  const sheetRows = entry.sheetRows || 16;
  const idleFrameIndex = entry.animations?.idleDown ?? 0;
  const col = idleFrameIndex % sheetCols;
  const row = Math.floor(idleFrameIndex / sheetCols);
  const sheetW = entry.frameWidth * sheetCols;
  const sheetH = entry.frameHeight * sheetRows;
  const zoom = size / Math.max(entry.frameWidth, entry.frameHeight);

  return (
    <div
      style={{
        width: entry.frameWidth * zoom,
        height: entry.frameHeight * zoom,
        backgroundImage: `url(${entry.path})`,
        backgroundPosition: `-${col * entry.frameWidth * zoom}px -${row * entry.frameHeight * zoom}px`,
        backgroundSize: `${sheetW * zoom}px ${sheetH * zoom}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Bestiaire : galerie de tous les ennemis (SPRITE_REGISTRY, tout ce qui a
 * un lootTable) avec leur pose idleDown + leur displayName. Accessible
 * depuis le start screen (phase "bestiary" dans Arpg.js), purement
 * consultatif - pas de notion de decouverte/progression pour l'instant.
 */
export default function BestiaryScreen({ onClose }) {
  const allEntries = useMemo(() => getBestiaryEntries(), []);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter(({ entry, key }) =>
      (entry.displayName || key).toLowerCase().includes(q),
    );
  }, [allEntries, search]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0b0c10",
        color: "#f0e6d0",
        display: "flex",
        flexDirection: "column",
        padding: 20,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>
          Bestiaire{" "}
          <span style={{ fontSize: 14, color: "#8a7050" }}>
            ({filtered.length}/{allEntries.length})
          </span>
        </h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{
              padding: "6px 10px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid #8a7050",
              background: "rgba(58,47,32,0.85)",
              color: "#f0e6d0",
            }}
          />
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid #8a7050",
              background: "rgba(58,47,32,0.85)",
              color: "#f0e6d0",
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
      </div>

      <div
        style={{
          overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
          gap: 12,
          paddingRight: 4,
        }}
      >
        {filtered.map(({ key, entry }) => (
          <div
            key={key}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid rgba(138,112,80,0.4)",
              background: "rgba(58,47,32,0.35)",
            }}
          >
            <div
              style={{
                width: 220,
                height: 220,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MonsterPortrait entry={entry} size={220} />
            </div>
            <span
              style={{
                fontSize: 12,
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {entry.displayName || key}
            </span>
            <br />
            <span
              style={{
                fontSize: 11,
                textAlign: "center",
                lineHeight: 1.2,
                color: "#ccc",
              }}
            >
              {entry.key || "Aucune clé disponible."}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
