import { useState } from "react";
import { HERO_ROSTER, SPRITE_REGISTRY } from "./spriteRegistry";

const PREVIEW_SCALE = 3;

// Spritesheet complète : 12 colonnes × 8 lignes
// const SHEET_COLS = 12;
// const SHEET_ROWS = 8;

const CONTROLS = [
  ["Déplacement", "ZQSD ou WASD (basculable en jeu) / flèches"],
  ["Attaque au corps à corps", "Espace"],
  ["Attaque à distance", "Maj (Shift)"],
  ["Interagir (parler, ouvrir un coffre...)", "E"],
  ["Inventaire", "I"],
  ["Quêtes", "R"],
  ["Carte", "V"],
];

/**
 * Écran de sélection du héros au démarrage.
 *
 * La spritesheet contient les 8 héros sur une seule image
 * de 12 colonnes × 8 lignes.
 *
 * Chaque héros possède déjà dans SPRITE_REGISTRY les indices
 * globaux de ses animations.
 */
export default function CharacterSelectScreen({ onSelect, isMobile }) {
  const [controlsOpen, setControlsOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        padding: isMobile ? 20 : 40,
        color: "#eee",
        background: "#12131a",
        minHeight: 400,
        position: "relative",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* uniquement desktop */}
      {!isMobile && (
        <button
          onClick={() => setControlsOpen(true)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            padding: "6px 14px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid #555",
            background: "#2a2a35",
            color: "#eee",
            cursor: "pointer",
          }}
        >
          ⌨️ Contrôles
        </button>
      )}

      <h2
        style={{
          margin: 0,
          textAlign: "center",
        }}
      >
        Choisis ton héros
      </h2>

      {/* Grille des héros */}
      <div
        style={{
          display: "grid",

          // 4 héros par ligne sur desktop,
          // 2 héros par ligne sur mobile.
          gridTemplateColumns: isMobile
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(4, minmax(0, 1fr))",

          gap: isMobile ? 12 : 20,

          width: "100%",
          maxWidth: isMobile ? 360 : 1000,

          boxSizing: "border-box",
        }}
      >
        {HERO_ROSTER.map((hero) => {
          const entry = SPRITE_REGISTRY[hero.id] || SPRITE_REGISTRY.hero1;

          const sheetCols = entry.sheetCols || 12;
          const sheetRows = entry.sheetRows || 8;

          const idleFrameIndex = entry.animations.idleDown;
          const col = idleFrameIndex % sheetCols;
          const row = Math.floor(idleFrameIndex / sheetCols);
          const sheetW = entry.frameWidth * sheetCols;
          const sheetH = entry.frameHeight * sheetRows;

          return (
            <button
              key={hero.id}
              onClick={() => onSelect(hero.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",

                gap: 8,

                padding: isMobile ? 10 : 16,

                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",

                background: "#1e2029",
                border: "1px solid #444",
                borderRadius: 8,

                cursor: "pointer",
                color: "#eee",
              }}
            >
              <div
                style={{
                  width: entry.frameWidth * PREVIEW_SCALE,
                  height: entry.frameHeight * PREVIEW_SCALE,

                  backgroundImage: `url(${entry.path})`,

                  backgroundPosition: `
                    -${col * entry.frameWidth * PREVIEW_SCALE}px
                    -${row * entry.frameHeight * PREVIEW_SCALE}px
                  `,

                  backgroundSize: `
                    ${sheetW * PREVIEW_SCALE}px
                    ${sheetH * PREVIEW_SCALE}px
                  `,

                  backgroundRepeat: "no-repeat",

                  imageRendering: "pixelated",

                  flexShrink: 0,
                }}
              />

              <span
                style={{
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {hero.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fenêtre des contrôles */}
      {controlsOpen && (
        <div
          onClick={() => setControlsOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
            padding: 20,
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1e2029",
              border: "1px solid #444",
              borderRadius: 10,
              padding: 24,
              minWidth: 320,
              maxWidth: "100%",
              color: "#eee",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0 }}>Contrôles</h3>

              <button
                onClick={() => setControlsOpen(false)}
                style={{
                  padding: "4px 10px",
                  fontSize: 13,
                  borderRadius: 6,
                  border: "1px solid #555",
                  background: "#2a2a35",
                  color: "#eee",
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {CONTROLS.map(([label, key]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 20,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#ccc" }}>{label}</span>

                  <span
                    style={{
                      color: "#8a7050",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
