import { useRef, useEffect } from "react";

const CELL_SIZE = 2; // px par case sur la minicarte

/**
 * Minicarte pilotée par le brouillard de guerre déjà calculé côté scène
 * (fogOfWar.js) - reprend le principe de Minimap.jsx de Skip the Dungeon
 * (sombre/clair/surbrillance selon exploration), adapté case par case
 * plutôt que salle par salle : nos niveaux (grottes, BSP) n'ont pas de
 * découpage en salles fixes comme le mode Aventure, et le brouillard
 * qu'on calcule est déjà à la granularité de la case individuelle - plus
 * fin que ce que Skip the Dungeon avait besoin de suivre.
 *
 * Rendu en canvas plutôt qu'en grille de <div> (comme l'original) : nos
 * niveaux vont jusqu'à 56x40 cases, largement au-delà de ce qu'une
 * grille de divs CSS gère confortablement.
 *
 * Semi-transparente (fond ET remplissage) pour rester lisible sans
 * masquer complètement ce qu'il y a dessous - avant, il fallait la
 * désactiver pour voir en dessous, plus la peine.
 *
 * @param {number[][]} grid grille du niveau courant (0=sol, 1=mur)
 * @param {number[][]} fogState 0=jamais vu, 1=deja vu, 2=visible (meme
 *   grille que this.fogState.state dans MainScene.js)
 * @param {{x:number,y:number}} playerTile position actuelle du joueur (en cases)
 * @param {{x:number,y:number}|null} exitTile position de la sortie, si connue - affichee UNIQUEMENT une fois decouverte (fogState >= 1 a cette case), meme convention que le reste du brouillard
 * @param {{x:number,y:number}|null} upstairsTile position de la remontee, si connue (absente a l'etage 1) - meme regle de decouverte
 */
export default function Minimap({
  grid,
  fogState,
  playerTile,
  exitTile,
  upstairsTile,
  isMobile,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!grid || !fogState || !canvasRef.current) return;

    const height = grid.length;
    const width = grid[0].length;
    const canvas = canvasRef.current;
    canvas.width = width * CELL_SIZE;
    canvas.height = height * CELL_SIZE;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const state = fogState[y][x];
        if (state === 0) continue; // jamais vu : reste transparent

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

    // sortie/remontee : memes couleurs que leurs marqueurs en jeu
    // (respectivement exitMarker/upstairsMarker dans MainScene.js) -
    // affichees seulement une fois la case decouverte (fogState >= 1),
    // jamais en avance sur ce que le joueur a reellement vu
    function drawLandmark(tile, color) {
      if (
        !tile ||
        fogState[tile.y]?.[tile.x] === 0 ||
        fogState[tile.y]?.[tile.x] === undefined
      )
        return;
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

    if (playerTile) {
      ctx.fillStyle = "#3498db";
      ctx.fillRect(
        playerTile.x * CELL_SIZE - 1,
        playerTile.y * CELL_SIZE - 1,
        CELL_SIZE + 2,
        CELL_SIZE + 2,
      );
    }
  }, [grid, fogState, playerTile, exitTile, upstairsTile]);

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
