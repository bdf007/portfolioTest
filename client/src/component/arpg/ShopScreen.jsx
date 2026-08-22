import { resolveItemDef } from "./itemDefs";

/**
 * Écran de boutique - overlay superposé au jeu (même modèle que
 * InventoryScreen/TravelHubScreen). Le stock est fixe (généré côté
 * serveur, cf. shopGenerator.js) - ce composant n'a aucune logique
 * propre, juste de l'affichage et des clics. L'or disponible est lu
 * directement dans `inventory` (déjà suivi par ailleurs), pas besoin
 * d'une prop dédiée.
 */
export default function ShopScreen({ stock, inventory, onBuy, onClose }) {
  const goldEntry = inventory.find((i) => i.itemId === "gold");
  const currentGold = goldEntry ? goldEntry.quantity : 0;

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
        <h3 style={{ margin: 0 }}>Boutique</h3>
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

      <div style={{ fontSize: 13, color: "#d4af37", marginBottom: 16 }}>
        Or : {currentGold}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {stock.map((shopItem, index) => {
          const def = resolveItemDef(shopItem.itemId);
          const canAfford = currentGold >= shopItem.price;
          return (
            <div
              key={`${shopItem.itemId}-${index}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 10,
                background: "#1e2029",
                border: "1px solid #444",
                borderRadius: 8,
                opacity: canAfford ? 1 : 0.6,
              }}
            >
              <div>
                <div style={{ fontSize: 13 }}>{def.name}</div>
                <div style={{ fontSize: 11, color: "#8a7050", marginTop: 2 }}>
                  {def.description}
                </div>
                <div style={{ fontSize: 12, color: "#d4af37", marginTop: 4 }}>
                  {shopItem.price} or
                </div>
              </div>
              <button
                onClick={() => onBuy(index)}
                disabled={!canAfford}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid " + (canAfford ? "#8a7050" : "#444"),
                  background: canAfford ? "#3a2f20" : "#2a2a30",
                  color: canAfford ? "#f0e6d0" : "#666",
                  cursor: canAfford ? "pointer" : "not-allowed",
                }}
              >
                Acheter
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
