import React, { useState } from "react";
import { ITEM_ICONS } from "./images";

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
  inCombat,
  alreadyUsedThisTurn,
  onUsePotion,
  onUsePotionTriple,
  onUseWeapon,
  onUseBombeCarre,
  onUseBombeLigne,
}) => {
  const [ligneItemKey, setLigneItemKey] = useState(null);

  if (!inventory || inventory.length === 0) {
    return (
      <div className="inventory-panel">
        <h4>Inventaire</h4>
        <p className="inventory-empty">
          Ton inventaire est vide pour le moment.
        </p>
      </div>
    );
  }

  const counts = {};
  inventory.forEach((key) => {
    counts[key] = (counts[key] || 0) + 1;
  });

  // Hors combat, un seul objet par tour. En combat, les bombes n'ont aucun effet.
  const itemDisabled = isBusy || (!inCombat && alreadyUsedThisTurn);
  const bombDisabled = itemDisabled || inCombat;
  const itemDisabledReason =
    !inCombat && alreadyUsedThisTurn
      ? "Déjà utilisé un objet ce tour-ci"
      : undefined;
  const bombDisabledReason = inCombat
    ? "Sans effet en plein combat"
    : itemDisabledReason;

  return (
    <div className="inventory-panel">
      <h4>Inventaire</h4>
      <ul>
        {Object.entries(counts).map(([itemKey, count]) => (
          <li key={itemKey}>
            {ITEM_ICONS[itemKey] && (
              <img
                src={ITEM_ICONS[itemKey]}
                alt=""
                className="inventory-item-icon"
              />
            )}
            {ITEM_LABELS[itemKey] || itemKey} × {count}
            {(itemKey === "potionCoffre" || itemKey === "potionSimple") && (
              <span className="item-actions">
                <button
                  disabled={itemDisabled}
                  title={itemDisabledReason}
                  onClick={() => onUsePotion(itemKey, "tete")}
                >
                  Tête
                </button>
                <button
                  disabled={itemDisabled}
                  title={itemDisabledReason}
                  onClick={() => onUsePotion(itemKey, "torse")}
                >
                  Torse
                </button>
                <button
                  disabled={itemDisabled}
                  title={itemDisabledReason}
                  onClick={() => onUsePotion(itemKey, "jambes")}
                >
                  Jambes
                </button>
              </span>
            )}
            {itemKey === "potionTriple" && (
              <button
                disabled={itemDisabled}
                title={itemDisabledReason}
                onClick={() => onUsePotionTriple(itemKey)}
              >
                Utiliser
              </button>
            )}
            {(itemKey === "armeCoffre" || itemKey === "armeBonus") && (
              <button
                disabled={itemDisabled}
                title={itemDisabledReason}
                onClick={() => onUseWeapon(itemKey)}
              >
                Utiliser
              </button>
            )}
            {itemKey === "bombeCarre" && (
              <button
                disabled={bombDisabled}
                title={bombDisabledReason}
                onClick={() => onUseBombeCarre(itemKey)}
              >
                Utiliser
              </button>
            )}
            {itemKey === "bombeLigne" && (
              <>
                <button
                  disabled={bombDisabled}
                  title={bombDisabledReason}
                  onClick={() => setLigneItemKey(itemKey)}
                >
                  Utiliser
                </button>
                {ligneItemKey === itemKey && (
                  <span className="direction-picker">
                    <button
                      disabled={bombDisabled}
                      onClick={() => {
                        onUseBombeLigne(itemKey, "haut");
                        setLigneItemKey(null);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      disabled={bombDisabled}
                      onClick={() => {
                        onUseBombeLigne(itemKey, "bas");
                        setLigneItemKey(null);
                      }}
                    >
                      ↓
                    </button>
                    <button
                      disabled={bombDisabled}
                      onClick={() => {
                        onUseBombeLigne(itemKey, "gauche");
                        setLigneItemKey(null);
                      }}
                    >
                      ←
                    </button>
                    <button
                      disabled={bombDisabled}
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
