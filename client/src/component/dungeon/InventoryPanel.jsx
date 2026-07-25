import React, { useState } from "react";

const ITEM_LABELS = {
  potionCoffre: "Potion (+1)",
  potionSimple: "Potion (+1)",
  potionTriple: "Potion (+1)(+1)(+1)",
  armeCoffre: "Arme (+1)",
  armeBonus: "Arme (+1)",
  bombeCarre: "Bombe carrée",
  bombeLigne: "Bombe ligne",
};

const InventoryPanel = ({
  inventory,
  isBusy,
  onUsePotion,
  onUsePotionTriple,
  onUseWeapon,
  onUseBombeCarre,
  onUseBombeLigne,
}) => {
  const [ligneItemKey, setLigneItemKey] = useState(null);

  if (!inventory || inventory.length === 0) return null;

  const counts = {};
  inventory.forEach((key) => {
    counts[key] = (counts[key] || 0) + 1;
  });

  return (
    <div className="inventory-panel">
      <h4>Inventaire</h4>
      <ul>
        {Object.entries(counts).map(([itemKey, count]) => (
          <li key={itemKey}>
            {ITEM_LABELS[itemKey] || itemKey} × {count}
            {(itemKey === "potionCoffre" || itemKey === "potionSimple") && (
              <span className="item-actions">
                <button disabled={isBusy} onClick={() => onUsePotion(itemKey, "tete")}>
                  Tête
                </button>
                <button disabled={isBusy} onClick={() => onUsePotion(itemKey, "torse")}>
                  Torse
                </button>
                <button disabled={isBusy} onClick={() => onUsePotion(itemKey, "jambes")}>
                  Jambes
                </button>
              </span>
            )}
            {itemKey === "potionTriple" && (
              <button disabled={isBusy} onClick={() => onUsePotionTriple(itemKey)}>
                Utiliser
              </button>
            )}
            {(itemKey === "armeCoffre" || itemKey === "armeBonus") && (
              <button disabled={isBusy} onClick={() => onUseWeapon(itemKey)}>
                Utiliser
              </button>
            )}
            {itemKey === "bombeCarre" && (
              <button disabled={isBusy} onClick={() => onUseBombeCarre(itemKey)}>
                Utiliser
              </button>
            )}
            {itemKey === "bombeLigne" && (
              <>
                <button disabled={isBusy} onClick={() => setLigneItemKey(itemKey)}>
                  Utiliser
                </button>
                {ligneItemKey === itemKey && (
                  <span className="direction-picker">
                    <button
                      disabled={isBusy}
                      onClick={() => {
                        onUseBombeLigne(itemKey, "haut");
                        setLigneItemKey(null);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => {
                        onUseBombeLigne(itemKey, "bas");
                        setLigneItemKey(null);
                      }}
                    >
                      ↓
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => {
                        onUseBombeLigne(itemKey, "gauche");
                        setLigneItemKey(null);
                      }}
                    >
                      ←
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => {
                        onUseBombeLigne(itemKey, "droite");
                        setLigneItemKey(null);
                      }}
                    >
                      →
                    </button>
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InventoryPanel;
