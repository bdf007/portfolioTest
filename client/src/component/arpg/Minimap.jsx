import { useRef, useEffect } from "react";

const CELL_SIZE = 4; // px par case affichee
const WINDOW_SIZE = 40; // nombre de cases visibles dans chaque dimension, TOUJOURS centree sur le joueur - resout le probleme des grandes salles (120x120) qui debordaient de l'ancien affichage "grille entiere"

/**
 * Minicarte pilotée par le brouillard de guerre déjà calculé côté scène
 * (fogOfWar.js). N'affiche plus la grille entière (qui pouvait deborder
 * ou devenir illisible sur une grande salle) - une fenetre fixe de
 * WINDOW_SIZE cases, centree sur le joueur, clampee pour ne jamais
 * sortir des limites reelles de la grille pres des bords.
 */
export default function Minimap({
  grid,
  fogState,
  playerTile,
  exitTile,
  upstairsTile,
  questNpcs = [],
  summons = [],
  isMobile,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!grid || !fogState || !canvasRef.current || !playerTile) return;

    const height = grid.length;
    const width = grid[0].length;

    // la fenetre ne depasse jamais la taille REELLE de la grille - une
    // petite salle (ex: 20x20) donne un canevas de 20x20, pas 40x40 avec
    // des bords vides autour
    const windowW = Math.min(WINDOW_SIZE, width);
    const windowH = Math.min(WINDOW_SIZE, height);

    const canvas = canvasRef.current;
    canvas.width = windowW * CELL_SIZE;
    canvas.height = windowH * CELL_SIZE;

    const ctx = canvas.getContext("2d");

    let startX = playerTile.x - Math.floor(windowW / 2);
    let startY = playerTile.y - Math.floor(windowH / 2);
    startX = Math.max(0, Math.min(startX, Math.max(0, width - windowW)));
    startY = Math.max(0, Math.min(startY, Math.max(0, height - windowH)));
    const endX = Math.min(width, startX + windowW);
    const endY = Math.min(height, startY + windowH);

    // ... reste de la fonction identique (fond, terrain, marqueurs, joueur) ...

    // ------------------------------------------------------------
    // Fond de la minimap
    // ------------------------------------------------------------

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ------------------------------------------------------------
    // Terrain + brouillard de guerre - uniquement dans la fenetre
    // ------------------------------------------------------------

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
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

        ctx.fillRect(
          (x - startX) * CELL_SIZE,
          (y - startY) * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE,
        );
      }
    }

    // ------------------------------------------------------------
    // Fonction commune pour les marqueurs - coordonnees converties en
    // LOCAL a la fenetre (x - startX / y - startY), rien a dessiner si
    // le repere tombe hors de la fenetre actuelle
    // ------------------------------------------------------------

    function drawLandmark(tile, color, checkFog = true) {
      if (!tile) return;
      if (
        tile.x < startX ||
        tile.x >= endX ||
        tile.y < startY ||
        tile.y >= endY
      )
        return;

      if (checkFog) {
        const state = fogState[tile.y]?.[tile.x];

        if (state === 0 || state === undefined) {
          return;
        }
      }

      ctx.fillStyle = color;

      ctx.fillRect(
        (tile.x - startX) * CELL_SIZE - 1,
        (tile.y - startY) * CELL_SIZE - 1,
        CELL_SIZE + 2,
        CELL_SIZE + 2,
      );
    }

    // ------------------------------------------------------------
    // Sortie / Remontée
    // ------------------------------------------------------------

    drawLandmark(exitTile, "#ffd700");
    drawLandmark(upstairsTile, "#dc3030");

    // ------------------------------------------------------------
    // PNJ de quête
    // ------------------------------------------------------------

    for (const npc of questNpcs) {
      if (!npc) continue;
      drawLandmark({ x: npc.x, y: npc.y }, "#07f83f", false);
    }

    // ------------------------------------------------------------
    // Invocations (familier compris)
    // ------------------------------------------------------------

    for (const s of summons) {
      if (!s) continue;
      drawLandmark({ x: s.x, y: s.y }, "#ff9900", false);
    }

    // ------------------------------------------------------------
    // Joueur - toujours au centre (sauf pres des bords, ou la fenetre
    // se decale pour rester dans les limites) - dessine en dernier
    // ------------------------------------------------------------

    if (playerTile) {
      ctx.fillStyle = "#3498db";

      ctx.fillRect(
        (playerTile.x - startX) * CELL_SIZE - 1,
        (playerTile.y - startY) * CELL_SIZE - 1,
        CELL_SIZE + 2,
        CELL_SIZE + 2,
      );
    }
  }, [grid, fogState, playerTile, exitTile, upstairsTile, questNpcs, summons]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 8,
        left: isMobile ? 8 : undefined,
        right: isMobile ? undefined : 8,
        zIndex: 5,
        background: "rgba(11,12,16,0.45)",
        border: "1px solid #444",
        borderRadius: 4,
        imageRendering: "pixelated",
      }}
    />
  );
}
