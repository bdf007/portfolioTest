import { useState, useEffect, useMemo, useRef } from "react";
import Phaser from "phaser";
import { buildFloorTilemap } from "./scenes/floorRenderer";
import { getTileImagesToLoad } from "./spriteRegistry";
import { BIOME_REGISTRY } from "./biomeRegistry";
import { TILE_SIZE } from "./scenes/gameConstants";
import { generateDrunkardWalk } from "./drunkardwalk";

// dimensions de l'apercu (0 = sol, 1 = mur) - le contenu est desormais
// genere par le vrai generateur serveur (drunkardwalk) plutot qu'une
// grille figee, pour une forme organique representative d'un vrai
// niveau plutot qu'un motif artificiel de coins
const PREVIEW_COLS = 14;
const PREVIEW_ROWS = 10;

// chargees une seule fois (memes 6 images pour tous les biomes de
// secours cave/tree - cf. biomeRegistry.js) plutot que recalculees a
// chaque montage de BiomePreview
const TILE_IMAGES_TO_LOAD = getTileImagesToLoad();

class BiomePreviewScene extends Phaser.Scene {
  constructor(biome) {
    super(`biome-preview-${biome.tilesetKey}`);
    this.biome = biome;
  }

  preload() {
    if (this.biome.spritesheet) {
      this.load.spritesheet(
        this.biome.spritesheet.key,
        this.biome.spritesheet.path,
        {
          frameWidth: this.biome.spritesheet.frameWidth,
          frameHeight: this.biome.spritesheet.frameHeight,
        },
      );
    }
    TILE_IMAGES_TO_LOAD.forEach(({ key, path }) => {
      if (!this.textures.exists(key)) this.load.image(key, path);
    });
  }

  create() {
    // currentSeed pioche par composeCornerAutotileTexture (variantes de
    // sol/coin ponderees) ET par generateDrunkardWalk (forme du niveau) -
    // fixe et propre au tileset pour un rendu stable (pas de re-tirage
    // aleatoire a chaque remontage)
    this.currentSeed = `biome-preview-desert`;
    const grid = generateDrunkardWalk({
      width: PREVIEW_COLS,
      height: PREVIEW_ROWS,
      seed: this.currentSeed,
    });
    buildFloorTilemap(this, {
      grid,
      tileset: this.biome.tilesetKey,
      data: {}, // pas de townBuildings/secretRoom pour cet apercu
      depth: 1,
    });
    // apercu statique - inutile de laisser tourner la boucle de rendu
    // Phaser en continu (97+ instances simultanees potentielles), MAIS
    // il faut attendre qu'au moins un rendu ait reellement eu lieu avant
    // de dormir - sleep() appele directement ici coupait la boucle AVANT
    // le tout premier rendu de la frame en cours (create() s'execute
    // avant l'etape de rendu Phaser), d'ou les apercus entierement noirs
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      this.game.loop.sleep();
    });
  }
}

/**
 * Un mini-rendu Phaser autonome pour un biome - ne se monte (creation
 * reelle de la Phaser.Game, chargement des assets) que lorsqu'il entre
 * dans le viewport (IntersectionObserver), et se detruit au demontage -
 * indispensable avec 100+ entrees, sinon 100+ instances Phaser actives
 * d'un coup au premier affichage de l'ecran.
 */
function BiomePreview({ biome }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || gameRef.current) return;
    gameRef.current = new Phaser.Game({
      type: Phaser.CANVAS,
      // resolution interne fixe (448x320), mais le canvas est ensuite
      // redimensionne en CSS pour tenir dans le conteneur grace au Scale
      // Manager en mode FIT - sans ca, le <canvas> garde une largeur CSS
      // fixe de 448px meme quand sa carte de grille est plus etroite
      // (grid minmax(230px,1fr)), et deborde par-dessus la carte
      // suivante : la partie qui depasse est alors recouverte/cachee par
      // la carte voisine (rendue apres dans le DOM), d'ou l'impression
      // que "la partie droite manque" - sauf en derniere colonne ou rien
      // ne vient recouvrir le debordement.
      scale: {
        mode: Phaser.Scale.FIT,
        parent: containerRef.current,
        width: PREVIEW_COLS * TILE_SIZE,
        height: PREVIEW_ROWS * TILE_SIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      backgroundColor: "#000000",
      audio: { noAudio: true },
      scene: new BiomePreviewScene(biome),
    });
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [visible, biome]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: PREVIEW_COLS * TILE_SIZE,
        aspectRatio: `${PREVIEW_COLS} / ${PREVIEW_ROWS}`,
        overflow: "hidden",
        imageRendering: "pixelated",
        background: "#000",
      }}
    />
  );
}

/**
 * Galerie de biomes : mini-carte generee (vraie grille de test passee au
 * VRAI buildFloorTilemap, donc fidele pixel pour pixel au rendu en jeu)
 * pour chaque tileset connu, avec son nom technique. Purement outil de
 * debug pour l'instant (choisir/reperer un souci d'autotile par biome),
 * accessible depuis le start screen comme le bestiaire.
 */
export default function BiomeGalleryScreen({ onClose }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return BIOME_REGISTRY;
    return BIOME_REGISTRY.filter(
      (b) =>
        b.tilesetKey.toLowerCase().includes(q) ||
        b.displayName.toLowerCase().includes(q),
    );
  }, [search]);

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
          Biomes{" "}
          <span style={{ fontSize: 14, color: "#8a7050" }}>
            ({filtered.length}/{BIOME_REGISTRY.length})
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
          gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))",
          gap: 14,
          paddingRight: 4,
        }}
      >
        {filtered.map((biome) => (
          <div
            key={biome.tilesetKey}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: 8,
              borderRadius: 8,
              border: "1px solid rgba(138,112,80,0.4)",
              background: "rgba(58,47,32,0.35)",
            }}
          >
            <BiomePreview biome={biome} />
            <span
              style={{ fontSize: 12, textAlign: "center", lineHeight: 1.2 }}
            >
              {biome.displayName}
              <br />
              <span style={{ color: "#8a7050", fontSize: 10 }}>
                {biome.tilesetKey}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
