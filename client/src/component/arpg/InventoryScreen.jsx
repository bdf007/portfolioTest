import { resolveItemDef } from "./itemDefs";

const SLOT_LABELS = {
  weapon: "Arme",
  armor: "Armure",
  accessory: "Accessoire",
};

/**
 * Écran d'inventaire - overlay superposé au jeu (comme les dialogues),
 * ouvert/fermé par un bouton dans le HUD (cf. arpg.jsx). Toutes les
 * actions (équiper/déséquiper/utiliser) appellent directement les
 * méthodes déjà testées de MainScene - ce composant n'a aucune logique
 * propre, juste de l'affichage et des clics.
 */
export default function InventoryScreen({
  inventory,
  equipped,
  stats,
  onEquip,
  onUnequip,
  onUse,
  onClose,
}) {
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
        <div style={{ display: "flex", gap: 10 }}>
          {Object.entries(SLOT_LABELS).map(([slot, label]) => {
            const itemId = equipped[slot];
            const def = itemId ? resolveItemDef(itemId) : null;
            return (
              <div
                key={slot}
                style={{
                  flex: 1,
                  padding: 10,
                  background: "#1e2029",
                  border: "1px solid #444",
                  borderRadius: 8,
                  minHeight: 60,
                }}
              >
                <div style={{ fontSize: 11, color: "#999" }}>{label}</div>
                {def ? (
                  <>
                    <div style={{ fontSize: 13, marginTop: 4 }}>{def.name}</div>
                    <div
                      style={{ fontSize: 11, color: "#8a7050", marginTop: 2 }}
                    >
                      {def.description}
                    </div>
                    <button
                      onClick={() => onUnequip(slot)}
                      style={{
                        marginTop: 6,
                        padding: "4px 10px",
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid #555",
                        background: "#2a2a35",
                        color: "#eee",
                        cursor: "pointer",
                      }}
                    >
                      Retirer
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                    Vide
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>
          Objets
        </div>
        {inventory.length === 0 && (
          <div style={{ color: "#666", fontSize: 13 }}>Inventaire vide.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {inventory.map((entry, index) => {
            const def = resolveItemDef(entry.itemId);
            return (
              <div
                key={`${entry.itemId}-${index}`}
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
                <div>
                  <div style={{ fontSize: 13 }}>
                    {def.name}
                    {entry.quantity > 1 ? ` x${entry.quantity}` : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a7050", marginTop: 2 }}>
                    {def.description}
                  </div>
                </div>
                {def.category === "equipment" && (
                  <button
                    onClick={() => onEquip(index)}
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
                {def.category === "consumable" && (
                  <button
                    onClick={() => onUse(index)}
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
