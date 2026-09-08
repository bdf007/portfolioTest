import { useState, useRef, useEffect } from "react";
import { resolveItemDef } from "./itemDefs";
import { resolveAbilityDef } from "./abilityDefs";
import { ItemIcon, hasIconFrame } from "./InventoryScreen";
import bookPages from "../../assets/background/book_pages.png";

/**
 * Ecran d'assignation de la barre de raccourcis (1-9) - presente comme
 * un livre ouvert (image de fond). Page de gauche = les 9 emplacements
 * (plusieurs lignes) ; page de droite = tout ce qui peut y etre assigne
 * (competences debloquees + potions). Principe : on clique un
 * emplacement (il se surligne), puis une competence debloquee ou une
 * potion pour l'y assigner - pas de glisser-deposer, plus simple a
 * construire et a utiliser au clavier/tactile.
 *
 * Seuls les objets de categorie 'consumable' (potions) sont proposes -
 * jamais l'equipement (deja gere par InventoryScreen) ni les objets de
 * quete, qui n'ont aucun sens dans une barre d'action rapide.
 */
export default function HotbarScreen({
  hotbarSlots,
  unlockedAbilities,
  inventory,
  playerLevel,
  onAssign,
  onClose,
}) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  function handleSlotClick(index) {
    setSelectedSlot(selectedSlot === index ? null : index);
  }

  function handleClearSlot(index, e) {
    e.stopPropagation();
    onAssign(index, null);
    if (selectedSlot === index) setSelectedSlot(null);
  }

  function handleAssign(payload) {
    if (selectedSlot === null) return;
    onAssign(selectedSlot, payload);
    setSelectedSlot(null);
  }

  function slotLabel(slot) {
    if (!slot) return "Vide";
    return slot.type === "ability"
      ? resolveAbilityDef(slot.id).name
      : resolveItemDef(slot.itemId).name;
  }

  // objets/parchemins EXCLUS de la liste si pas encore utilisables au
  // niveau actuel - inutile de les proposer a l'assignation s'ils ne
  // servent a rien tant que le niveau requis n'est pas atteint
  // (contrairement a un parchemin de mauvais archetype, qui lui garde
  // un usage alternatif - usage unique - donc reste assignable)
  const consumableEntries = inventory.filter((i) => {
    const def = resolveItemDef(i.itemId);
    const cat = def.category;
    if (cat !== "consumable" && cat !== "abilityScroll") return false;
    if (def.unlockLevel && playerLevel < def.unlockLevel) return false;
    return true;
  });

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
        zIndex: 10,
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

        {/* Page gauche - les 9 emplacements */}
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
          <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>
            Barre de raccourcis
          </h3>
          <div style={{ fontSize: 11, color: "#4a3a28", marginBottom: 10 }}>
            Clique un emplacement, puis une compétence ou une potion pour l'y
            assigner.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {hotbarSlots.map((slot, index) => {
              const iconId = slot
                ? slot.type === "item"
                  ? slot.itemId
                  : slot.id
                : null;
              const showIcon = iconId && hasIconFrame(iconId);
              return (
                <div
                  key={index}
                  onClick={() => handleSlotClick(index)}
                  style={{
                    minWidth: 0,
                    minHeight: 68,
                    padding: 6,
                    borderRadius: 6,
                    cursor: "pointer",
                    background:
                      selectedSlot === index
                        ? "rgba(138,112,80,0.35)"
                        : "rgba(120,100,70,0.1)",
                    border:
                      selectedSlot === index
                        ? "2px solid #8a7050"
                        : "1px solid rgba(90,74,53,0.3)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#8a7050" }}>
                    {index + 1}
                  </div>
                  {showIcon ? (
                    <ItemIcon itemId={iconId} scale={1.2} />
                  ) : (
                    <div style={{ fontSize: 10, marginTop: 3 }}>
                      {slotLabel(slot)}
                    </div>
                  )}
                  {slot && (
                    <button
                      onClick={(e) => handleClearSlot(index, e)}
                      style={{
                        marginTop: 4,
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
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Page droite - ce qui peut etre assigne (competences + potions) */}
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
            fontSize: 11,
          }}
        >
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>
            Compétences débloquées
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {unlockedAbilities.length === 0 && (
              <div style={{ color: "#5a4a35" }}>
                Aucune compétence débloquée pour l'instant.
              </div>
            )}
            {unlockedAbilities.map((abilityId) => {
              const def = resolveAbilityDef(abilityId);
              return (
                <div
                  key={abilityId}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: 8,
                    background: "rgba(120,100,70,0.1)",
                    border: "1px solid rgba(90,74,53,0.25)",
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {hasIconFrame(abilityId) && (
                      <ItemIcon itemId={abilityId} scale={1.4} />
                    )}
                    <div>
                      <div style={{ fontWeight: "bold" }}>{def.name}</div>
                      <div style={{ color: "#4a3a28", marginTop: 1 }}>
                        {def.description}
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={selectedSlot === null}
                    onClick={() =>
                      handleAssign({ type: "ability", id: abilityId })
                    }
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      borderRadius: 5,
                      border: "1px solid #8a7050",
                      background:
                        selectedSlot === null
                          ? "rgba(120,100,70,0.15)"
                          : "#8a7050",
                      color: selectedSlot === null ? "#8a7a68" : "#fff8ea",
                      cursor: selectedSlot === null ? "not-allowed" : "pointer",
                      alignSelf: "center", // <-- nouveau
                    }}
                  >
                    Assigner
                  </button>
                </div>
              );
            })}
          </div>

          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Potions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {consumableEntries.length === 0 && (
              <div style={{ color: "#5a4a35" }}>
                Aucune potion en inventaire.
              </div>
            )}
            {consumableEntries.map((entry) => {
              const def = resolveItemDef(entry.itemId);
              return (
                <div
                  key={entry.itemId}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: 8,
                    background: "rgba(120,100,70,0.1)",
                    border: "1px solid rgba(90,74,53,0.25)",
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <ItemIcon itemId={entry.itemId} scale={1.4} />
                    <div>
                      <div style={{ fontWeight: "bold" }}>
                        {def.name} x{entry.quantity}
                      </div>
                      <div style={{ color: "#4a3a28", marginTop: 1 }}>
                        {def.description}
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={selectedSlot === null}
                    onClick={() =>
                      handleAssign({ type: "item", itemId: entry.itemId })
                    }
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      borderRadius: 5,
                      border: "1px solid #8a7050",
                      background:
                        selectedSlot === null
                          ? "rgba(120,100,70,0.15)"
                          : "#8a7050",
                      color: selectedSlot === null ? "#8a7a68" : "#fff8ea",
                      cursor: selectedSlot === null ? "not-allowed" : "pointer",
                      alignSelf: "center", // <-- nouveau
                    }}
                  >
                    Assigner
                  </button>
                </div>
              );
            })}
          </div>
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
