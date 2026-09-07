import { useState, useEffect } from "react";
import { resolveItemDef } from "./itemDefs";

const SELL_PRICE_RATIO = 0.5; // doit rester synchronise avec MainScene.js

export default function ShopScreen({
  stock,
  inventory,
  onBuy,
  onSell,
  onClose,
}) {
  const [buyQuantities, setBuyQuantities] = useState({});
  const [sellQuantities, setSellQuantities] = useState({});

  // reinitialise les selecteurs a chaque changement reel de stock/inventaire
  // (apres un achat/une vente) - evite tout desalignement d'index si une
  // ligne disparait (objet rachete integralement, stack vide...)
  useEffect(() => {
    setBuyQuantities({});
    setSellQuantities({});
  }, [stock, inventory]);

  const goldEntry = inventory.find((i) => i.itemId === "gold");
  const currentGold = goldEntry ? goldEntry.quantity : 0;

  function getQty(store, index, max) {
    const q = store[index] || 1;
    return max != null ? Math.min(Math.max(1, q), max) : Math.max(1, q);
  }

  function adjustQty(setStore, index, delta, max) {
    setStore((prev) => {
      const current = prev[index] || 1;
      let next = current + delta;
      next = Math.max(1, next);
      if (max != null) next = Math.min(next, max);
      return { ...prev, [index]: next };
    });
  }

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

      <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>
        Acheter
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {stock.map((shopItem, index) => {
          const def = resolveItemDef(shopItem.itemId);
          const maxQty = shopItem.soldByPlayer ? shopItem.quantity : null;
          const qty = getQty(buyQuantities, index, maxQty);
          const totalPrice = shopItem.price * qty;
          const canAfford = currentGold >= totalPrice;
          const atMax = maxQty != null && qty >= maxQty;

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
                <div style={{ fontSize: 13 }}>
                  {def.name}
                  {shopItem.soldByPlayer ? ` (${shopItem.quantity} dispo)` : ""}
                </div>
                <div style={{ fontSize: 11, color: "#8a7050", marginTop: 2 }}>
                  {def.description}
                </div>
                <div style={{ fontSize: 12, color: "#d4af37", marginTop: 4 }}>
                  {totalPrice} or {qty > 1 ? `(${shopItem.price}/u.)` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => adjustQty(setBuyQuantities, index, -1, maxQty)}
                  disabled={qty <= 1}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 5,
                    border: "1px solid #555",
                    background: "#2a2a35",
                    color: "#eee",
                    cursor: qty <= 1 ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  −
                </button>
                <span
                  style={{ fontSize: 13, minWidth: 18, textAlign: "center" }}
                >
                  {qty}
                </span>
                <button
                  onClick={() => adjustQty(setBuyQuantities, index, 1, maxQty)}
                  disabled={atMax}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 5,
                    border: "1px solid #555",
                    background: "#2a2a35",
                    color: "#eee",
                    cursor: atMax ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  +
                </button>
                <button
                  onClick={() => onBuy(index, qty)}
                  disabled={!canAfford}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid " + (canAfford ? "#8a7050" : "#444"),
                    background: canAfford ? "#3a2f20" : "#2a2a30",
                    color: canAfford ? "#f0e6d0" : "#666",
                    cursor: canAfford ? "pointer" : "not-allowed",
                    marginLeft: 4,
                  }}
                >
                  Acheter
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>Vendre</div>
      {inventory.every((item) => !resolveItemDef(item.itemId).price) && (
        <div style={{ color: "#666", fontSize: 13 }}>
          Rien à vendre pour l'instant.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {inventory.map((item, index) => {
          const def = resolveItemDef(item.itemId);
          if (!def.price) return null;
          const maxQty = item.quantity;
          const qty = getQty(sellQuantities, index, maxQty);
          const unitPrice = Math.floor(def.price * SELL_PRICE_RATIO);
          const totalPrice = unitPrice * qty;
          const atMax = qty >= maxQty;

          return (
            <div
              key={`${item.itemId}-${index}`}
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
                  {item.quantity > 1 ? ` x${item.quantity}` : ""}
                </div>
                <div style={{ fontSize: 12, color: "#d4af37", marginTop: 4 }}>
                  {totalPrice} or {qty > 1 ? `(${unitPrice}/u.)` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() =>
                    adjustQty(setSellQuantities, index, -1, maxQty)
                  }
                  disabled={qty <= 1}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 5,
                    border: "1px solid #555",
                    background: "#2a2a35",
                    color: "#eee",
                    cursor: qty <= 1 ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  −
                </button>
                <span
                  style={{ fontSize: 13, minWidth: 18, textAlign: "center" }}
                >
                  {qty}
                </span>
                <button
                  onClick={() => adjustQty(setSellQuantities, index, 1, maxQty)}
                  disabled={atMax}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 5,
                    border: "1px solid #555",
                    background: "#2a2a35",
                    color: "#eee",
                    cursor: atMax ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  +
                </button>
                <button
                  onClick={() => onSell(index, qty)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid #8a7050",
                    background: "#3a2f20",
                    color: "#f0e6d0",
                    cursor: "pointer",
                    marginLeft: 4,
                  }}
                >
                  Vendre
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
