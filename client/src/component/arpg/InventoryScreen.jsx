import { useState, useEffect, useRef } from "react";
import { resolveItemDef } from "./itemDefs";
import {
  SPRITE_REGISTRY,
  ICON_SPRITESHEET,
  ICON_SPRITESHEET_2,
  MONSTER_LOOTS_SPRITESHEET,
  ICON_SHEET_1_FRAMES,
  ICON_SHEET_2_FRAMES,
  MONSTER_LOOTS_FRAMES,
} from "./spriteRegistry";
import bookPages from "../../assets/background/book_pages.png";

const SLOT_LABELS = {
  helmet: "Casque",
  mainHand: "Main principale",
  offHand: "Main secondaire",
  armor: "Armure",
  belt: "Ceinture",
  pants: "Pantalon",
  boots: "Bottes",
  ring1: "Bague",
  ring2: "Bague",
  necklace: "Collier",
  quiver: "Carquois",
};

const PREVIEW_SCALE = 3; // meme echelle que CharacterSelectScreen, pour un portrait coherent
// const SHEET_COLS = 12;
// const SHEET_ROWS = 8;
// const ICON_SHEET_COLS = 10;
// const ICON_SHEET_ROWS = 22;

/**
 * Regroupe les entrees d'inventaire identiques (meme itemId) en une
 * seule ligne d'affichage - necessaire pour l'equipement (non
 * empilable, chaque exemplaire est une entree SEPAREE avec quantity:1
 * dans this.inventory) qui affichait sinon une ligne par exemplaire
 * (3 epees de fer identiques = 3 lignes "Épée de fer") plutot qu'une
 * seule ligne "Épée de fer x3". Les objets deja empilables (potions,
 * or) n'ont de toute facon jamais qu'une seule entree - regroupement
 * sans effet pour eux, meme resultat qu'avant.
 *
 * `firstIndex` = l'index dans le tableau ORIGINAL (non regroupe) du
 * premier exemplaire trouve - c'est celui-la qui est vise par
 * onEquip/onUse quand on clique sur une ligne groupee (peu importe
 * LEQUEL des exemplaires identiques est equipe/utilise en premier, ils
 * sont interchangeables par definition).
 */
function groupInventory(inventory) {
  const groups = new Map();
  inventory.forEach((entry, index) => {
    if (!groups.has(entry.itemId)) {
      groups.set(entry.itemId, {
        itemId: entry.itemId,
        totalQuantity: 0,
        firstIndex: index,
      });
    }
    groups.get(entry.itemId).totalQuantity += entry.quantity;
  });
  return [...groups.values()];
}

export function ItemIcon({ itemId, scale = 2 }) {
  let frameIndex;
  let spriteSheet;

  if (ICON_SHEET_1_FRAMES[itemId] !== undefined) {
    frameIndex = ICON_SHEET_1_FRAMES[itemId];
    spriteSheet = ICON_SPRITESHEET;
  } else if (ICON_SHEET_2_FRAMES[itemId] !== undefined) {
    frameIndex = ICON_SHEET_2_FRAMES[itemId];
    spriteSheet = ICON_SPRITESHEET_2;
  } else if (MONSTER_LOOTS_FRAMES[itemId] !== undefined) {
    frameIndex = MONSTER_LOOTS_FRAMES[itemId];
    spriteSheet = MONSTER_LOOTS_SPRITESHEET;
  } else {
    return null;
  }

  const col = frameIndex % spriteSheet.columns;
  const row = Math.floor(frameIndex / spriteSheet.columns);

  const sheetW = spriteSheet.frameWidth * spriteSheet.columns;

  const sheetH = spriteSheet.frameHeight * spriteSheet.rows;

  return (
    <div
      style={{
        width: spriteSheet.frameWidth * scale,
        height: spriteSheet.frameHeight * scale,

        backgroundImage: `url(${spriteSheet.path})`,

        backgroundPosition: `
          -${col * spriteSheet.frameWidth * scale}px
          -${row * spriteSheet.frameHeight * scale}px
        `,

        backgroundSize: `
          ${sheetW * scale}px
          ${sheetH * scale}px
        `,

        backgroundRepeat: "no-repeat",

        imageRendering: "pixelated",

        flexShrink: 0,
      }}
    />
  );
}

/**
 * Verifie si un id (objet OU competence, generique) a une icone
 * enregistree dans l'un des deux spritesheets d'icones - sans afficher
 * quoi que ce soit, juste un test. Sert a decider "icone ou texte" AVANT
 * de rendre, contrairement a ItemIcon qui rend directement (et retourne
 * null silencieusement si rien trouve).
 */
export function hasIconFrame(id) {
  return (
    ICON_SHEET_1_FRAMES[id] !== undefined ||
    ICON_SHEET_2_FRAMES[id] !== undefined
  );
}
/**
 * Écran d'inventaire - presente comme un livre ouvert (image de fond).
 * Page de gauche = objets ; page de droite = mannequin d'equipement +
 * statistiques. Toutes les actions (équiper/déséquiper/utiliser)
 * appellent directement les méthodes déjà testées de MainScene - ce
 * composant n'a aucune logique propre (hormis le regroupement
 * d'affichage ci-dessus), juste de l'affichage et des clics.
 */
export default function InventoryScreen({
  inventory,
  equipped,
  stats,
  heroId,
  isMobile,
  onEquip,
  onUnequip,
  onUse,
  onClose,
}) {
  const heroEntry = SPRITE_REGISTRY[heroId] || SPRITE_REGISTRY.hero1;
  const sheetCols = heroEntry.sheetCols || 12;
  const sheetRows = heroEntry.sheetRows || 8;

  const idleFrameIndex = heroEntry.animations.idleDown;
  const col = idleFrameIndex % sheetCols;
  const row = Math.floor(idleFrameIndex / sheetCols);
  const sheetW = heroEntry.frameWidth * sheetCols;
  const sheetH = heroEntry.frameHeight * sheetRows;

  function renderSlot(slot, fullWidth = false) {
    const itemId = equipped[slot];
    const def = itemId ? resolveItemDef(itemId) : null;

    // main secondaire "verrouillee" par une arme a 2 mains en main
    // principale (cf. MainScene.equipItem) - jamais un objet REELEMENT
    // present dans offHand dans ce cas (equipped.offHand reste `null`,
    // pas de reference dupliquee), donc rendu special plutot qu'un
    // simple "Vide" qui laisserait croire a un emplacement disponible
    const mainHandDef =
      slot === "offHand" && equipped.mainHand
        ? resolveItemDef(equipped.mainHand)
        : null;
    const lockedByTwoHanded = mainHandDef && mainHandDef.twoHanded;

    // carquois : contrairement a un objet d'equipement classique, les
    // flèches restent COMPTEES dans l'inventaire meme une fois
    // "equipees" (cf. MainScene.equipItem, categorie 'ammo' - jamais
    // retirees de l'inventaire) - on affiche donc leur quantite REELLE
    // ici, pas juste leur nom, sans quoi le joueur ne saurait jamais
    // combien il lui en reste sans ouvrir l'inventaire
    const quiverQuantity =
      slot === "quiver" && itemId
        ? inventory.find((i) => i.itemId === itemId)?.quantity || 0
        : null;

    return (
      <div
        style={{
          padding: 6,
          background: "rgba(120,100,70,0.12)",
          border: "1px solid rgba(90,74,53,0.3)",
          borderRadius: 6,
          minHeight: 46,
          width: fullWidth ? "100%" : "100%",
          maxWidth: fullWidth ? "none" : 88,
          minWidth: 0,
          color: "#241a10",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 9, color: "#4a3a28" }}>{SLOT_LABELS[slot]}</div>
        {def ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 2,
              }}
            >
              <ItemIcon itemId={itemId} scale={1.1} />

              <div style={{ fontSize: 10 }}>
                {def.name}
                {quiverQuantity !== null ? ` x${quiverQuantity}` : ""}
              </div>
            </div>
            <button
              onClick={() => onUnequip(slot)}
              style={{
                marginTop: 3,
                padding: "2px 6px",
                fontSize: 9,
                borderRadius: 4,
                border: "1px solid #8a7050",
                background: "#eee2cc",
                color: "#5a4a35",
                cursor: "pointer",
              }}
            >
              Retirer
            </button>
          </>
        ) : lockedByTwoHanded ? (
          <div style={{ fontSize: 9, color: "#8a7050", marginTop: 2 }}>
            Occupée (2 mains)
          </div>
        ) : (
          <div style={{ fontSize: 9, color: "#6a5940", marginTop: 2 }}>
            Vide
          </div>
        )}
      </div>
    );
  }

  // les flèches equipees (cf. equipped.quiver) ne quittent JAMAIS
  // reellement this.inventory (contrairement a un objet d'equipement
  // classique - cf. MainScene.equipItem, categorie 'ammo') - sans ce
  // filtre, elles apparaitraient a la fois dans la case Carquois ET
  // dans "Objets", alors que tout le reste de l'equipement disparait de
  // cette liste une fois equipe. Le filtre se base sur l'itemId (pas la
  // categorie generique) : si un jour un autre type de munition existe,
  // il faudra le meme traitement pour son propre emplacement.
  const groupedItems = groupInventory(inventory).filter(
    (group) => group.itemId !== equipped.quiver,
  );

  const containerRef = useRef(null);
  const [bookSize, setBookSize] = useState({ width: 800, height: 500 });

  useEffect(() => {
    function updateSize() {
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      const availW = parent.clientWidth * 0.9;
      const availH = parent.clientHeight * 0.85;
      const ratio = 800 / 500;
      let w = availW;
      let h = w / ratio;
      if (h > availH) {
        h = availH;
        w = h * ratio;
      }
      setBookSize({ width: w, height: h });
    }
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current?.parentElement) {
      observer.observe(containerRef.current.parentElement);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: bookSize.width,
          height: bookSize.height,
          backgroundImage: `url(${bookPages})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "2%",
            right: "6%",
            padding: "6px 14px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid #8a7050",
            background: "rgba(58,47,32,0.85)",
            color: "#f0e6d0",
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          Fermer
        </button>

        {/* Page gauche - Objets */}
        <div
          className="book-page-scroll"
          style={{
            position: "absolute",
            top: "9%",
            left: "9%",
            width: "38%",
            height: "80%",
            overflowY: "auto",
            overflowX: "hidden",
            color: "#241a10",
          }}
        >
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Objets</h3>
          {groupedItems.length === 0 && (
            <div style={{ color: "#5a4a35", fontSize: 12 }}>
              Inventaire vide.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {groupedItems.map((group) => {
              const def = resolveItemDef(group.itemId);
              return (
                <div
                  key={group.itemId}
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                    justifyContent: "space-between",
                    gap: 6,
                    padding: 8,
                    background: "rgba(120,100,70,0.1)",
                    border: "1px solid rgba(90,74,53,0.25)",
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                      flexShrink: 1,
                    }}
                  >
                    <ItemIcon itemId={group.itemId} scale={1.5} />

                    <div>
                      <div style={{ fontSize: 12 }}>
                        {def.name}
                        {group.totalQuantity > 1
                          ? ` x${group.totalQuantity}`
                          : ""}
                      </div>

                      <div
                        style={{
                          fontSize: 10,
                          color: "#4a3a28",
                          marginTop: 1,
                        }}
                      >
                        {def.description}
                      </div>
                    </div>
                  </div>
                  {(def.category === "equipment" ||
                    def.category === "ammo") && (
                    <button
                      onClick={() => onEquip(group.firstIndex)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        borderRadius: 5,
                        border: "1px solid #8a7050",
                        background: "#8a7050",
                        color: "#fff8ea",
                        cursor: "pointer",
                        alignSelf: isMobile ? "center" : undefined,
                      }}
                    >
                      Équiper
                    </button>
                  )}
                  {(def.category === "consumable" ||
                    def.category === "abilityScroll" ||
                    def.category === "recipeScroll") && (
                    <button
                      onClick={() => onUse(group.firstIndex)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        borderRadius: 5,
                        border: "1px solid #8a7050",
                        background: "#8a7050",
                        color: "#fff8ea",
                        cursor: "pointer",
                        alignSelf: isMobile ? "center" : undefined,
                      }}
                    >
                      Utiliser
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Page droite - Personnage (mannequin d'equipement + stats) */}
        <div
          className="book-page-scroll"
          style={{
            position: "absolute",
            top: "9%",
            left: "54%",
            width: "37%",
            height: "80%",
            overflowY: "auto",
            overflowX: "hidden",
            color: "#241a10",
          }}
        >
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Personnage</h3>

          {stats && (
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "2px 12px",
                  fontSize: 11,
                }}
              >
                {[
                  ["Niveau", stats.level],
                  ["PV max", stats.maxHp],
                  ["Mana max", stats.maxMana],
                  ["Stamina max", stats.maxStamina],
                  ["Dégâts (mêlée)", stats.meleeDamage],
                  ["Dégâts (distance)", stats.rangedDamage],
                  ["Défense", stats.defense],
                  ["Vitesse", stats.moveSpeed],
                  ["Distance de vue", stats.visionRadius],
                  ["Portée à distance", stats.rangedRange],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ color: "#4a3a28" }}>{label}</span>
                    <span style={{ fontWeight: "bold" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* mannequin en grille CSS - collier a cote du casque en haut,
              mains de part et d'autre du heros, puis une pile par cote
              associee a chaque main (bague, puis armure/ceinture, puis
              pantalon/bottes) - cote gauche = main principale, cote droit
              = main secondaire. "Casque"/"Ceinture"/"Bagues" restent VIDES
              pour l'instant : aucun objet du jeu ne cible encore ces
              emplacements (cf. itemDefs.js) - la mannequin est prete a les
              recevoir des qu'ils existeront. */}
          {isMobile ? (
            // liste verticale simple en mobile - aucun risque de debordement
            // horizontal (contrairement a la grille croisee, trop etroite sur un
            // petit ecran), au prix d'une presentation moins "mannequin"
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  width: heroEntry.frameWidth * PREVIEW_SCALE,
                  height: heroEntry.frameHeight * PREVIEW_SCALE,
                  backgroundImage: `url(${heroEntry.path})`,
                  backgroundPosition: `-${col * heroEntry.frameWidth * PREVIEW_SCALE}px -${row * heroEntry.frameHeight * PREVIEW_SCALE}px`,
                  backgroundSize: `${sheetW * PREVIEW_SCALE}px ${sheetH * PREVIEW_SCALE}px`,
                  imageRendering: "pixelated",
                  alignSelf: "center",
                  marginBottom: 6,
                }}
              />
              {[
                "necklace",
                "helmet",
                "quiver",
                "mainHand",
                "offHand",
                "ring1",
                "ring2",
                "armor",
                "belt",
                "pants",
                "boots",
              ].map((slot) => (
                <div key={slot}>{renderSlot(slot, true)}</div>
              ))}
            </div>
          ) : (
            // mannequin en grille CSS - collier a cote du casque en haut,
            // mains de part et d'autre du heros, puis une pile par cote
            // associee a chaque main (bague, puis armure/ceinture, puis
            // pantalon/bottes) - cote gauche = main principale, cote droit
            // = main secondaire. "Casque"/"Ceinture"/"Bagues" restent VIDES
            // pour l'instant : aucun objet du jeu ne cible encore ces
            // emplacements (cf. itemDefs.js) - la mannequin est prete a les
            // recevoir des qu'ils existeront.
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 88px) minmax(0, max-content) minmax(0, 88px)",
                gridTemplateRows: "auto auto auto auto auto",
                gap: 6,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div style={{ justifySelf: "end" }}>{renderSlot("necklace")}</div>
              <div style={{ justifySelf: "center" }}>
                {renderSlot("helmet")}
              </div>
              <div style={{ justifySelf: "start" }}>{renderSlot("quiver")}</div>

              <div style={{ justifySelf: "end" }}>{renderSlot("mainHand")}</div>
              <div
                style={{
                  width: heroEntry.frameWidth * PREVIEW_SCALE,
                  height: heroEntry.frameHeight * PREVIEW_SCALE,
                  backgroundImage: `url(${heroEntry.path})`,
                  backgroundPosition: `-${col * heroEntry.frameWidth * PREVIEW_SCALE}px -${row * heroEntry.frameHeight * PREVIEW_SCALE}px`,
                  backgroundSize: `${sheetW * PREVIEW_SCALE}px ${sheetH * PREVIEW_SCALE}px`,
                  imageRendering: "pixelated",
                  justifySelf: "center",
                }}
              />
              <div style={{ justifySelf: "start" }}>
                {renderSlot("offHand")}
              </div>

              <div style={{ justifySelf: "end" }}>{renderSlot("ring1")}</div>
              <div />
              <div style={{ justifySelf: "start" }}>{renderSlot("ring2")}</div>

              <div style={{ justifySelf: "end" }}>{renderSlot("armor")}</div>
              <div />
              <div style={{ justifySelf: "start" }}>{renderSlot("belt")}</div>

              <div style={{ justifySelf: "end" }}>{renderSlot("pants")}</div>
              <div />
              <div style={{ justifySelf: "start" }}>{renderSlot("boots")}</div>
            </div>
          )}
        </div>
      </div>
      <style>{`
  .book-page-scroll::-webkit-scrollbar {
    width: 7px;
  }
  .book-page-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .book-page-scroll::-webkit-scrollbar-thumb {
    background: rgba(90, 74, 53, 0.45);
    border-radius: 4px;
  }
  .book-page-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(90, 74, 53, 0.65);
  }
  .book-page-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(90, 74, 53, 0.45) transparent;
  }
`}</style>
    </div>
  );
}
