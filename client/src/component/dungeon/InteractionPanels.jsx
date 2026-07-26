import React from "react";

export const KeyPanel = ({ onPickUpKey }) => (
  <div className="key-choice-panel">
    <h4>🗝️ Une clé est posée ici</h4>
    <button onClick={onPickUpKey}>Ramasser la clé</button>
  </div>
);

export const ChestPanel = ({ onOpenChest }) => (
  <div className="chest-choice-panel">
    <h4>🎁 Un coffre fermé</h4>
    <p>L'ouvrir comporte un risque...</p>
    <button onClick={onOpenChest}>Ouvrir le coffre</button>
  </div>
);

export const ShopPanel = ({ shopStock, onBuyItem }) => (
  <div className="shop-panel">
    <h4>Magasin</h4>
    <button onClick={() => onBuyItem("potionSimple")}>
      Potion (+1) — {shopStock.potionSimple.price} PO ({shopStock.potionSimple.stock} restantes)
    </button>
    <button onClick={() => onBuyItem("potionTriple")}>
      Potion (+1)(+1)(+1) — {shopStock.potionTriple.price} PO ({shopStock.potionTriple.stock}{" "}
      restantes)
    </button>
    <button onClick={() => onBuyItem("armeBonus")}>
      Arme (+1) — {shopStock.armeBonus.price} PO ({shopStock.armeBonus.stock} restantes)
    </button>
  </div>
);
