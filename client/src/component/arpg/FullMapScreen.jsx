import { useRef, useEffect } from "react";

const CELL_SIZE = 4;

/**
 * Ecran de carte complete - overlay superpose au jeu, meme modele que
 * InventoryScreen/QuestsScreen (ouvre/ferme depuis un bouton dedie qui
 * met le jeu en pause). Contrairement a Minimap.jsx (fenetre 40x40
 * centree sur le joueur, toujours visible en coin), celui-ci affiche
 * TOUJOURS la grille ENTIERE (avec le brouillard de guerre applique),
 * peu importe sa taille - defile si necessaire (overflow: auto) plutot
 * que de fenetrer.
 */
export default function FullMapScreen({
  grid,
  fogState,
  playerTile,
  exitTile,
  upstairsTile,
  questNpcs = [],
  summons = [],
  bossDoorTile,
  bossRoomOpen,
  onClose,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!grid || !fogState || !canvasRef.current) return;

    const height = grid.length;
    // n'affiche jamais la salle du boss scellee - meme si sa largeur existe
    // deja dans la grille (carveBossRoom l'ajoute des la generation), tant
    // qu'elle n'est pas ouverte elle ne doit meme pas laisser deviner sa
    // forme/son existence sur la carte
    const width =
      bossDoorTile && !bossRoomOpen
        ? Math.min(grid[0].length, bossDoorTile.x)
        : grid[0].length;

    const canvas = canvasRef.current;
    canvas.width = width * CELL_SIZE;
    canvas.height = height * CELL_SIZE;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const state = fogState[y]?.[x];
        if (state === 0 || state === undefined) continue;

        const isWall = grid[y][x] === 1;
        if (isWall) {
          ctx.fillStyle =
            state === 2 ? "rgba(90,85,96,0.75)" : "rgba(51,48,56,0.75)";
        } else {
          ctx.fillStyle =
            state === 2 ? "rgba(232,223,192,0.75)" : "rgba(122,114,96,0.75)";
        }
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    function drawLandmark(tile, color, checkFog = true) {
      if (!tile) return;
      if (checkFog) {
        const state = fogState[tile.y]?.[tile.x];
        if (state === 0 || state === undefined) return;
      }
      ctx.fillStyle = color;
      ctx.fillRect(
        tile.x * CELL_SIZE - 1,
        tile.y * CELL_SIZE - 1,
        CELL_SIZE + 2,
        CELL_SIZE + 2,
      );
    }

    drawLandmark(exitTile, "#ffd700");
    drawLandmark(upstairsTile, "#dc3030");

    for (const npc of questNpcs) {
      if (npc) drawLandmark({ x: npc.x, y: npc.y }, "#07f83f", false);
    }
    for (const s of summons) {
      if (s) drawLandmark({ x: s.x, y: s.y }, "#ff9900", false);
    }

    if (playerTile) {
      ctx.fillStyle = "#3498db";
      ctx.fillRect(
        playerTile.x * CELL_SIZE - 1,
        playerTile.y * CELL_SIZE - 1,
        CELL_SIZE + 2,
        CELL_SIZE + 2,
      );
    }
  }, [
    grid,
    fogState,
    playerTile,
    exitTile,
    upstairsTile,
    questNpcs,
    summons,
    bossDoorTile,
    bossRoomOpen,
  ]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 22,
        display: "flex",
        flexDirection: "column",
        background: "rgba(10,10,15,0.95)",
        color: "#eee",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <h3 style={{ margin: 0 }}>Carte</h3>
        <button
          onClick={onClose}
          style={{
            padding: "6px 14px",
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
          flex: 1,
          overflow: "auto",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ imageRendering: "pixelated", border: "1px solid #444" }}
        />
      </div>
    </div>
  );
}
