import { resolveItemDef } from "./itemDefs";
import { ItemIcon, hasIconFrame } from "./InventoryScreen";

/**
 * Écran de coffre - overlay superposé au jeu (même modèle que
 * InventoryScreen/ShopScreen), ouvert/fermé depuis MainScene.openChestScreen.
 * Chaque objet peut être pris individuellement ou tout d'un coup - le
 * coffre reste interactif (réouvrable) tant qu'il lui reste des objets,
 * cf. MainScene.performInteraction qui filtre sur lootItems.length > 0.
 */
export default function ChestScreen({ items, onTakeItem, onTakeAll, onClose }) {
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
        <h3 style={{ margin: 0 }}>Coffre</h3>
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

      {items.length === 0 ? (
        <div style={{ color: "#666", fontSize: 13 }}>Le coffre est vide.</div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {items.map((item) => {
              const def = resolveItemDef(item.itemId);
              const showIcon = hasIconFrame(item.itemId);
              return (
                <div
                  key={item.itemIndex}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 10,
                    background: "#1e2029",
                    border: "1px solid #444",
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    {showIcon && <ItemIcon itemId={item.itemId} scale={1.5} />}
                    <div style={{ fontSize: 13 }}>
                      {def.name}
                      {item.quantity > 1 ? ` x${item.quantity}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => onTakeItem(item.itemIndex)}
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
                    Prendre
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={onTakeAll}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              borderRadius: 8,
              border: "1px solid #ffd700",
              background: "#3a3320",
              color: "#f0e8c0",
              cursor: "pointer",
              alignSelf: "center",
            }}
          >
            Tout prendre
          </button>
        </>
      )}
    </div>
  );
}
