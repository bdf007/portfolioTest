import { useRef, useEffect } from "react";

const CELL_SIZE = 2; // px par case sur la minicarte

/**
 * Minicarte pilotée par le brouillard de guerre déjà calculé côté scène
 * (fogOfWar.js).
 *
 * @param {number[][]} grid
 *   Grille du niveau courant (0 = sol, 1 = mur)
 *
 * @param {number[][]} fogState
 *   0 = jamais vu
 *   1 = déjà vu
 *   2 = actuellement visible
 *
 * @param {{x:number,y:number}} playerTile
 *   Position actuelle du joueur
 *
 * @param {{x:number,y:number}|null} exitTile
 *   Position de la sortie.
 *   Elle est fournie uniquement une fois découverte.
 *
 * @param {{x:number,y:number}|null} upstairsTile
 *   Position de la remontée.
 *   Elle est fournie uniquement une fois découverte.
 *
 * @param {{x:number,y:number}[]} questNpcs
 *   PNJ de quête déjà découverts.
 *   Contrairement aux entrées/sorties, leur position est mémorisée
 *   au moment de leur découverte.
 *
 * @param {boolean} isMobile
 */
export default function Minimap({
  grid,
  fogState,
  playerTile,
  exitTile,
  upstairsTile,
  questNpcs = [],
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

    // ------------------------------------------------------------
    // Fond de la minimap
    // ------------------------------------------------------------

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ------------------------------------------------------------
    // Terrain + brouillard de guerre
    // ------------------------------------------------------------

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const state = fogState[y]?.[x];

        // Jamais découvert :
        // on laisse le fond sombre/translucide.
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

    // ------------------------------------------------------------
    // Fonction commune pour les marqueurs
    // ------------------------------------------------------------

    /**
     * Dessine un marqueur sur la minimap.
     *
     * checkFog = true :
     *   le marqueur n'est dessiné que si la case a été découverte.
     *
     * checkFog = false :
     *   le marqueur est considéré comme déjà découvert.
     *
     * Les PNJ utilisent false car MainScene leur fournit uniquement
     * les PNJ déjà mémorisés comme découverts.
     */
    function drawLandmark(tile, color, checkFog = true) {
      if (!tile) return;

      if (checkFog) {
        const state = fogState[tile.y]?.[tile.x];

        if (state === 0 || state === undefined) {
          return;
        }
      }

      ctx.fillStyle = color;

      ctx.fillRect(
        tile.x * CELL_SIZE - 1,
        tile.y * CELL_SIZE - 1,
        CELL_SIZE + 2,
        CELL_SIZE + 2,
      );
    }

    // ------------------------------------------------------------
    // Sortie
    // ------------------------------------------------------------
    //
    // La sortie est affichée uniquement si sa case a été découverte.
    // MainScene mémorise ensuite cette découverte pour les retours
    // ultérieurs sur l'étage.
    //

    drawLandmark(exitTile, "#ffd700");

    // ------------------------------------------------------------
    // Remontée
    // ------------------------------------------------------------
    //
    // Même fonctionnement que la sortie.
    //

    drawLandmark(upstairsTile, "#dc3030");

    // ------------------------------------------------------------
    // PNJ de quête
    // ------------------------------------------------------------
    //
    // questNpcs contient uniquement les PNJ déjà découverts.
    // Leur position correspond à leur position mémorisée au moment
    // de la découverte.
    //
    // Ils restent donc affichés même lorsque le joueur quitte la
    // zone ou quitte l'étage puis y revient.
    //

    for (const npc of questNpcs) {
      if (!npc) continue;

      drawLandmark(
        {
          x: npc.x,
          y: npc.y,
        },
        "#07f83f",
        false,
      );
    }

    // ------------------------------------------------------------
    // Joueur
    // ------------------------------------------------------------
    //
    // Le joueur est dessiné en dernier afin qu'il reste toujours
    // au-dessus des autres marqueurs.
    //

    if (playerTile) {
      ctx.fillStyle = "#3498db";

      ctx.fillRect(
        playerTile.x * CELL_SIZE - 1,
        playerTile.y * CELL_SIZE - 1,
        CELL_SIZE + 2,
        CELL_SIZE + 2,
      );
    }
  }, [grid, fogState, playerTile, exitTile, upstairsTile, questNpcs]);

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
