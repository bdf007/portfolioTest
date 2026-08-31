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
 * Écran d'inventaire - overlay superposé au jeu (comme les dialogues),
 * ouvert/fermé par un bouton dans le HUD (cf. arpg.jsx). Toutes les
 * actions (équiper/déséquiper/utiliser) appellent directement les
 * méthodes déjà testées de MainScene - ce composant n'a aucune logique
 * propre (hormis le regroupement d'affichage ci-dessus), juste de
 * l'affichage et des clics.
 */
export default function InventoryScreen({
  inventory,
  equipped,
  stats,
  heroId,
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

  function renderSlot(slot) {
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
          padding: 8,
          background: "#1e2029",
          border: "1px solid #444",
          borderRadius: 8,
          minHeight: 56,
          width: 110,
        }}
      >
        <div style={{ fontSize: 10, color: "#999" }}>{SLOT_LABELS[slot]}</div>
        {def ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 3,
              }}
            >
              <ItemIcon itemId={itemId} scale={1.5} />

              <div style={{ fontSize: 12 }}>
                {def.name}
                {quiverQuantity !== null ? ` x${quiverQuantity}` : ""}
              </div>
            </div>
            <button
              onClick={() => onUnequip(slot)}
              style={{
                marginTop: 4,
                padding: "3px 8px",
                fontSize: 11,
                borderRadius: 5,
                border: "1px solid #555",
                background: "#2a2a35",
                color: "#eee",
                cursor: "pointer",
              }}
            >
              Retirer
            </button>
          </>
        ) : lockedByTwoHanded ? (
          <div style={{ fontSize: 10, color: "#8a7050", marginTop: 3 }}>
            Occupée (arme à 2 mains)
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>Vide</div>
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
        overflowY: "auto",
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
        <h3 style={{ margin: 0 }}>Inventaire</h3>
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

      {stats && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>
            Statistiques
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              ["Niveau", stats.level],
              ["PV max", stats.maxHp],
              ["Dégâts (mêlée)", stats.meleeDamage],
              ["Dégâts (distance)", stats.rangedDamage],
              ["Défense", stats.defense],
              ["Mana max", stats.mana],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: "8px 12px",
                  background: "#1e2029",
                  border: "1px solid #444",
                  borderRadius: 8,
                  minWidth: 90,
                }}
              >
                <div style={{ fontSize: 11, color: "#999" }}>{label}</div>
                <div style={{ fontSize: 15, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>
          Équipement
        </div>
        {/* mannequin en grille CSS - collier a cote du casque en haut,
            mains de part et d'autre du heros, puis une pile par cote
            associee a chaque main (bague, puis armure/ceinture, puis
            pantalon/bottes) - cote gauche = main principale, cote droit
            = main secondaire. "Casque"/"Ceinture"/"Bagues" restent VIDES
            pour l'instant : aucun objet du jeu ne cible encore ces
            emplacements (cf. itemDefs.js) - la mannequin est prete a les
            recevoir des qu'ils existeront. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "110px auto 110px",
            gridTemplateRows: "auto auto auto auto auto",
            gap: 10,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ justifySelf: "end" }}>{renderSlot("necklace")}</div>
          <div style={{ justifySelf: "center" }}>{renderSlot("helmet")}</div>
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
          <div style={{ justifySelf: "start" }}>{renderSlot("offHand")}</div>

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
      </div>

      <div>
        <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>
          Objets
        </div>
        {groupedItems.length === 0 && (
          <div style={{ color: "#666", fontSize: 13 }}>Inventaire vide.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {groupedItems.map((group) => {
            const def = resolveItemDef(group.itemId);
            return (
              <div
                key={group.itemId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 10,
                  background: "#1e2029",
                  border: "1px solid #444",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <ItemIcon itemId={group.itemId} scale={2} />

                  <div>
                    <div style={{ fontSize: 13 }}>
                      {def.name}
                      {group.totalQuantity > 1
                        ? ` x${group.totalQuantity}`
                        : ""}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: "#8a7050",
                        marginTop: 2,
                      }}
                    >
                      {def.description}
                    </div>
                  </div>
                </div>
                {(def.category === "equipment" || def.category === "ammo") && (
                  <button
                    onClick={() => onEquip(group.firstIndex)}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid #8a7050",
                      background: "#3a2f20",
                      color: "#f0e6d0",
                      cursor: "pointer",
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
                      padding: "6px 12px",
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid #8a7050",
                      background: "#3a2f20",
                      color: "#f0e6d0",
                      cursor: "pointer",
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
    </div>
  );
}
