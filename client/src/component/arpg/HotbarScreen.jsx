import { useState } from "react";
import { resolveItemDef } from "./itemDefs";
import { resolveAbilityDef } from "./abilityDefs";
import { ItemIcon, hasIconFrame } from "./InventoryScreen";

/**
 * Ecran d'assignation de la barre de raccourcis (1-9) - meme overlay que
 * InventoryScreen.jsx/QuestsScreen.jsx. Principe : on clique un
 * emplacement (il se surligne), puis on clique une competence
 * debloquee ou une potion pour l'y assigner - pas de glisser-deposer,
 * plus simple a construire et a utiliser au clavier/tactile.
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

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
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
        <h3 style={{ margin: 0 }}>Barre de raccourcis</h3>
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

      <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>
        Clique un emplacement, puis une compétence ou une potion pour l'y
        assigner.
      </div>

      <div
        style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}
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
                width: 90,
                minHeight: 70,
                padding: 8,
                borderRadius: 8,
                cursor: "pointer",
                background: selectedSlot === index ? "#3a2f20" : "#1e2029",
                border:
                  selectedSlot === index
                    ? "2px solid #8a7050"
                    : "1px solid #444",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "#8a7050" }}>{index + 1}</div>
              {showIcon ? (
                <ItemIcon itemId={iconId} scale={1.5} />
              ) : (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {slotLabel(slot)}
                </div>
              )}
              {slot && (
                <button
                  onClick={(e) => handleClearSlot(index, e)}
                  style={{
                    marginTop: 6,
                    padding: "2px 8px",
                    fontSize: 10,
                    borderRadius: 5,
                    border: "1px solid #555",
                    background: "#2a2a35",
                    color: "#eee",
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

      <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>
        Compétences débloquées
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 24,
        }}
      >
        {unlockedAbilities.length === 0 && (
          <div style={{ color: "#666", fontSize: 13 }}>
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
                justifyContent: "space-between",
                alignItems: "center",
                padding: 10,
                background: "#1e2029",
                border: "1px solid #444",
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {hasIconFrame(abilityId) && (
                  <ItemIcon itemId={abilityId} scale={2} />
                )}
                <div>
                  <div style={{ fontSize: 13 }}>{def.name}</div>
                  <div style={{ fontSize: 11, color: "#8a7050", marginTop: 2 }}>
                    {def.description}
                  </div>
                </div>
              </div>
              <button
                disabled={selectedSlot === null}
                onClick={() => handleAssign({ type: "ability", id: abilityId })}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #8a7050",
                  background: selectedSlot === null ? "#2a2a35" : "#3a2f20",
                  color: selectedSlot === null ? "#777" : "#f0e6d0",
                  cursor: selectedSlot === null ? "not-allowed" : "pointer",
                }}
              >
                Assigner
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>
        Potions
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {consumableEntries.length === 0 && (
          <div style={{ color: "#666", fontSize: 13 }}>
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
                justifyContent: "space-between",
                alignItems: "center",
                padding: 10,
                background: "#1e2029",
                border: "1px solid #444",
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ItemIcon itemId={entry.itemId} scale={2} />
                <div>
                  <div style={{ fontSize: 13 }}>
                    {def.name} x{entry.quantity}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a7050", marginTop: 2 }}>
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
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #8a7050",
                  background: selectedSlot === null ? "#2a2a35" : "#3a2f20",
                  color: selectedSlot === null ? "#777" : "#f0e6d0",
                  cursor: selectedSlot === null ? "not-allowed" : "pointer",
                }}
              >
                Assigner
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
