import { HERO_ROSTER, SPRITE_REGISTRY } from './spriteRegistry';

const PREVIEW_SCALE = 3; // zoom pour un portrait plus lisible qu'a taille native
const GRID_COLS = 3; // convention standard (bas/gauche/droite/haut), cf. STANDARD_ANIMATION_FRAMES
const GRID_ROWS = 4;

/**
 * Écran de sélection du héros au démarrage - un portrait par héros du
 * roster, recadré sur la pose idle-down (frame du milieu de la ligne
 * "bas") directement depuis le spritesheet de marche déjà utilisé en
 * jeu, via SPRITE_REGISTRY - pas besoin de fichiers de portrait séparés,
 * et ça reste correct si un futur héros a des dimensions différentes.
 *
 * "À terme" les héros auront des stats/compétences différentes (cf.
 * HERO_ROSTER dans spriteRegistry.js, champ statsOverride) - non
 * affiché ici pour l'instant, cet écran ne fait que choisir un skin.
 */
export default function CharacterSelectScreen({ onSelect }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: 40,
        color: '#eee',
        background: '#12131a',
        minHeight: 400,
      }}
    >
      <h2 style={{ margin: 0 }}>Choisis ton héros</h2>
      <div style={{ display: 'flex', gap: 20 }}>
        {HERO_ROSTER.map((hero) => {
          const entry = SPRITE_REGISTRY[hero.id];
          const idleFrameIndex = entry.animations.idleDown;
          const col = idleFrameIndex % GRID_COLS;
          const row = Math.floor(idleFrameIndex / GRID_COLS);
          const sheetW = entry.frameWidth * GRID_COLS;
          const sheetH = entry.frameHeight * GRID_ROWS;

          return (
            <button
              key={hero.id}
              onClick={() => onSelect(hero.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                padding: 16,
                background: '#1e2029',
                border: '1px solid #444',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#eee',
              }}
            >
              <div
                style={{
                  width: entry.frameWidth * PREVIEW_SCALE,
                  height: entry.frameHeight * PREVIEW_SCALE,
                  backgroundImage: `url(${entry.path})`,
                  backgroundPosition: `-${col * entry.frameWidth * PREVIEW_SCALE}px -${row * entry.frameHeight * PREVIEW_SCALE}px`,
                  backgroundSize: `${sheetW * PREVIEW_SCALE}px ${sheetH * PREVIEW_SCALE}px`,
                  imageRendering: 'pixelated',
                }}
              />
              <span>{hero.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
