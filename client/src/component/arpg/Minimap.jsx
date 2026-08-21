import { useRef, useEffect } from 'react';

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
 * @param {number[][]} grid grille du niveau courant (0=sol, 1=mur)
 * @param {number[][]} fogState 0=jamais vu, 1=deja vu, 2=visible (meme
 *   grille que this.fogState.state dans MainScene.js)
 * @param {{x:number,y:number}} playerTile position actuelle du joueur (en cases)
 */
export default function Minimap({ grid, fogState, playerTile }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!grid || !fogState || !canvasRef.current) return;

    const height = grid.length;
    const width = grid[0].length;
    const canvas = canvasRef.current;
    canvas.width = width * CELL_SIZE;
    canvas.height = height * CELL_SIZE;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const state = fogState[y][x];
        if (state === 0) continue; // jamais vu : reste noir

        const isWall = grid[y][x] === 1;
        if (isWall) {
          ctx.fillStyle = state === 2 ? '#5a5560' : '#333038';
        } else {
          ctx.fillStyle = state === 2 ? '#e8dfc0' : '#7a7260';
        }
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    if (playerTile) {
      ctx.fillStyle = '#3498db';
      ctx.fillRect(
        playerTile.x * CELL_SIZE - 1,
        playerTile.y * CELL_SIZE - 1,
        CELL_SIZE + 2,
        CELL_SIZE + 2
      );
    }
  }, [grid, fogState, playerTile]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 5,
        background: 'rgba(11,12,16,0.85)',
        border: '1px solid #444',
        borderRadius: 4,
        imageRendering: 'pixelated',
      }}
    />
  );
}
