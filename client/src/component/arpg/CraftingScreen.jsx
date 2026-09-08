import { useState } from "react";
import { resolveItemDef } from "./itemDefs";
import { resolveCraftingRecipe } from "./craftingRecipes";
import { ItemIcon, hasIconFrame } from "./InventoryScreen";

/**
 * Ecran de craft - overlay superpose au jeu (meme modele que
 * InventoryScreen/HotbarScreen/QuestsScreen).
 *
 * Trois sections :
 * - Recettes connues - fabrication en un clic pour les ingredients
 *   simples ; pour un ingredient FLEXIBLE (acceptedItemIds), le joueur
 *   choisit lui-meme la repartition (l'un, l'autre, ou un melange) avant
 *   de pouvoir fabriquer.
 * - Recettes decouvertes mais verrouillees (niveau insuffisant) -
 *   purement informatif.
 * - Combinaison libre - a la Minecraft.
 */
export default function CraftingScreen({
  unlockedRecipes,
  discoveredLockedRecipes = [],
  inventory,
  onCraft,
  onFreeCraft,
  onClose,
}) {
  const [selection, setSelection] = useState({}); // combinaison libre : { itemId: quantity }
  const [flexAllocations, setFlexAllocations] = useState({}); // recettes connues : { "recipeId:ingIndex": { itemId: quantity } }

  function getQuantity(itemId) {
    return inventory
      .filter((i) => i.itemId === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);
  }

  // ------------------------------------------------------------
  // Recettes connues - ingredients flexibles (repartition manuelle)
  // ------------------------------------------------------------

  function flexKey(recipeId, ingIndex) {
    return `${recipeId}:${ingIndex}`;
  }

  function getFlexAllocation(recipeId, ingIndex) {
    return flexAllocations[flexKey(recipeId, ingIndex)] || {};
  }

  function getFlexTotal(recipeId, ingIndex) {
    const alloc = getFlexAllocation(recipeId, ingIndex);
    return Object.values(alloc).reduce((s, q) => s + q, 0);
  }

  function adjustFlex(recipeId, ingIndex, itemId, delta, requiredQty) {
    setFlexAllocations((prev) => {
      const key = flexKey(recipeId, ingIndex);
      const current = prev[key] || {};
      const currentForItem = current[itemId] || 0;
      const currentTotal = Object.values(current).reduce((s, q) => s + q, 0);

      const owned = getQuantity(itemId);
      let next = currentForItem + delta;
      if (next < 0) next = 0;
      if (next > owned) next = owned;

      const nextTotal = currentTotal - currentForItem + next;
      if (delta > 0 && nextTotal > requiredQty) return prev; // ne depasse jamais le total requis

      return { ...prev, [key]: { ...current, [itemId]: next } };
    });
  }

  function autoFillFlex(recipeId, ingIndex, ing) {
    setFlexAllocations((prev) => {
      let remaining = ing.quantity;
      const next = {};
      for (const itemId of ing.acceptedItemIds) {
        if (remaining <= 0) break;
        const owned = getQuantity(itemId);
        const take = Math.min(owned, remaining);
        if (take > 0) next[itemId] = take;
        remaining -= take;
      }
      return { ...prev, [flexKey(recipeId, ingIndex)]: next };
    });
  }

  function canCraft(recipe) {
    return recipe.ingredients.every((ing, ingIndex) => {
      if (ing.acceptedItemIds) {
        return getFlexTotal(recipe.id, ingIndex) >= ing.quantity;
      }
      return getQuantity(ing.itemId) >= ing.quantity;
    });
  }

  function handleCraft(recipe) {
    const payload = {};
    recipe.ingredients.forEach((ing, ingIndex) => {
      if (ing.acceptedItemIds) {
        payload[ingIndex] = getFlexAllocation(recipe.id, ingIndex);
      }
    });
    onCraft(recipe.id, payload);
    // nettoie les repartitions de CETTE recette apres fabrication
    setFlexAllocations((prev) => {
      const next = { ...prev };
      recipe.ingredients.forEach(
        (_, ingIndex) => delete next[flexKey(recipe.id, ingIndex)],
      );
      return next;
    });
  }

  // ------------------------------------------------------------
  // Combinaison libre
  // ------------------------------------------------------------

  const combinableEntries = inventory.filter(
    (i) => i.itemId !== "gold" && getQuantity(i.itemId) > 0,
  );

  function addToSelection(itemId) {
    const owned = getQuantity(itemId);
    setSelection((prev) => {
      const current = prev[itemId] || 0;
      if (current >= owned) return prev;
      return { ...prev, [itemId]: current + 1 };
    });
  }

  function removeFromSelection(itemId) {
    setSelection((prev) => {
      const current = prev[itemId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: current - 1 };
    });
  }

  function handleCombine() {
    const selectedItems = Object.entries(selection).map(
      ([itemId, quantity]) => ({
        itemId,
        quantity,
      }),
    );
    if (selectedItems.length === 0) return;
    onFreeCraft(selectedItems);
    setSelection({});
  }

  const selectionEntries = Object.entries(selection);

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
        <h3 style={{ margin: 0 }}>Craft</h3>
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
        Recettes connues
      </div>
      {unlockedRecipes.length === 0 && (
        <div style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
          Aucune recette connue pour l'instant.
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 24,
        }}
      >
        {unlockedRecipes.map((recipeId) => {
          const recipe = resolveCraftingRecipe(recipeId);
          if (!recipe) return null;
          const resultDef = resolveItemDef(recipe.resultItemId);
          const craftable = canCraft(recipe);

          return (
            <div
              key={recipeId}
              style={{
                padding: 12,
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
                  marginBottom: 8,
                }}
              >
                {hasIconFrame(recipe.resultItemId) && (
                  <ItemIcon itemId={recipe.resultItemId} scale={2} />
                )}
                <div>
                  <div style={{ fontSize: 14 }}>{recipe.name}</div>
                  <div style={{ fontSize: 11, color: "#8a7050" }}>
                    Produit : {resultDef.name}
                    {recipe.resultQuantity > 1
                      ? ` x${recipe.resultQuantity}`
                      : ""}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                {recipe.ingredients.map((ing, ingIndex) => {
                  if (!ing.acceptedItemIds) {
                    const have = getQuantity(ing.itemId);
                    const enough = have >= ing.quantity;
                    const ingDef = resolveItemDef(ing.itemId);
                    return (
                      <div
                        key={ingIndex}
                        style={{
                          fontSize: 12,
                          color: enough ? "#7fae8f" : "#c96060",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>{ingDef.name}</span>
                        <span>
                          {have} / {ing.quantity}
                        </span>
                      </div>
                    );
                  }

                  // ingredient flexible - repartition manuelle
                  const total = getFlexTotal(recipeId, ingIndex);
                  const complete = total >= ing.quantity;
                  return (
                    <div
                      key={ingIndex}
                      style={{
                        padding: 8,
                        background: "#171921",
                        borderRadius: 6,
                        border: "1px solid #333",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: complete ? "#7fae8f" : "#c96060",
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <span>Au choix (ou en mélange)</span>
                        <span>
                          {total} / {ing.quantity}
                        </span>
                      </div>
                      {ing.acceptedItemIds.map((itemId) => {
                        const def = resolveItemDef(itemId);
                        const owned = getQuantity(itemId);
                        const allocated =
                          getFlexAllocation(recipeId, ingIndex)[itemId] || 0;
                        return (
                          <div
                            key={itemId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: 12,
                              marginBottom: 4,
                            }}
                          >
                            <span>
                              {def.name} ({owned} en stock)
                            </span>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <button
                                onClick={() =>
                                  adjustFlex(
                                    recipeId,
                                    ingIndex,
                                    itemId,
                                    -1,
                                    ing.quantity,
                                  )
                                }
                                disabled={allocated <= 0}
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 4,
                                  border: "1px solid #555",
                                  background: "#2a2a35",
                                  color: "#eee",
                                  cursor:
                                    allocated <= 0 ? "not-allowed" : "pointer",
                                  fontSize: 12,
                                }}
                              >
                                −
                              </button>
                              <span
                                style={{ minWidth: 16, textAlign: "center" }}
                              >
                                {allocated}
                              </span>
                              <button
                                onClick={() =>
                                  adjustFlex(
                                    recipeId,
                                    ingIndex,
                                    itemId,
                                    1,
                                    ing.quantity,
                                  )
                                }
                                disabled={
                                  allocated >= owned || total >= ing.quantity
                                }
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 4,
                                  border: "1px solid #555",
                                  background: "#2a2a35",
                                  color: "#eee",
                                  cursor:
                                    allocated >= owned || total >= ing.quantity
                                      ? "not-allowed"
                                      : "pointer",
                                  fontSize: 12,
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => autoFillFlex(recipeId, ingIndex, ing)}
                        style={{
                          marginTop: 2,
                          padding: "2px 8px",
                          fontSize: 10,
                          borderRadius: 5,
                          border: "1px solid #555",
                          background: "#2a2a35",
                          color: "#aaa",
                          cursor: "pointer",
                        }}
                      >
                        Remplir automatiquement
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                disabled={!craftable}
                onClick={() => handleCraft(recipe)}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #8a7050",
                  background: craftable ? "#3a2f20" : "#2a2a35",
                  color: craftable ? "#f0e6d0" : "#777",
                  cursor: craftable ? "pointer" : "not-allowed",
                  width: "100%",
                }}
              >
                Fabriquer
              </button>
            </div>
          );
        })}
      </div>

      {discoveredLockedRecipes.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>
            Recettes découvertes (niveau insuffisant)
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 24,
            }}
          >
            {discoveredLockedRecipes.map((recipeId) => {
              const recipe = resolveCraftingRecipe(recipeId);
              if (!recipe) return null;
              const resultDef = resolveItemDef(recipe.resultItemId);
              return (
                <div
                  key={recipeId}
                  style={{
                    padding: 12,
                    background: "#241e1e",
                    border: "1px solid #4a3838",
                    borderRadius: 8,
                    opacity: 0.8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 4,
                    }}
                  >
                    {hasIconFrame(recipe.resultItemId) && (
                      <ItemIcon itemId={recipe.resultItemId} scale={2} />
                    )}
                    <div>
                      <div style={{ fontSize: 14 }}>{recipe.name}</div>
                      <div style={{ fontSize: 11, color: "#8a7050" }}>
                        Produit : {resultDef.name}
                        {recipe.resultQuantity > 1
                          ? ` x${recipe.resultQuantity}`
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#c96060" }}>
                    Nécessite le niveau {recipe.unlockLevel}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>
        Combinaison libre
      </div>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
        Choisis des objets de ton inventaire et tente ta chance - rien n'est
        perdu si la combinaison ne donne rien.
      </div>

      {selectionEntries.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: 10,
            marginBottom: 12,
            background: "#1e2029",
            border: "1px solid #8a7050",
            borderRadius: 8,
          }}
        >
          {selectionEntries.map(([itemId, quantity]) => {
            const def = resolveItemDef(itemId);
            return (
              <div
                key={itemId}
                onClick={() => removeFromSelection(itemId)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  background: "#3a2f20",
                  border: "1px solid #8a7050",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                }}
                title="Cliquer pour retirer une unité"
              >
                {hasIconFrame(itemId) && (
                  <ItemIcon itemId={itemId} scale={1.2} />
                )}
                {def.name} x{quantity}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginBottom: 16,
        }}
      >
        {combinableEntries.length === 0 && (
          <div style={{ color: "#666", fontSize: 13 }}>
            Rien à combiner pour l'instant.
          </div>
        )}
        {combinableEntries.map((entry) => {
          const def = resolveItemDef(entry.itemId);
          const owned = getQuantity(entry.itemId);
          const picked = selection[entry.itemId] || 0;
          return (
            <div
              key={entry.itemId}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: 8,
                background: "#1e2029",
                border: "1px solid #444",
                borderRadius: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {hasIconFrame(entry.itemId) && (
                  <ItemIcon itemId={entry.itemId} scale={1.4} />
                )}
                <div style={{ fontSize: 12 }}>
                  {def.name} ({picked}/{owned} choisi{picked > 1 ? "s" : ""})
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => removeFromSelection(entry.itemId)}
                  disabled={picked <= 0}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 5,
                    border: "1px solid #555",
                    background: "#2a2a35",
                    color: "#eee",
                    cursor: picked <= 0 ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  −
                </button>
                <button
                  onClick={() => addToSelection(entry.itemId)}
                  disabled={picked >= owned}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 5,
                    border: "1px solid #555",
                    background: "#2a2a35",
                    color: "#eee",
                    cursor: picked >= owned ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        disabled={selectionEntries.length === 0}
        onClick={handleCombine}
        style={{
          padding: "10px 20px",
          fontSize: 14,
          borderRadius: 8,
          border:
            selectionEntries.length > 0
              ? "1px solid #ffd700"
              : "1px solid #555",
          background: selectionEntries.length > 0 ? "#3a3320" : "#2a2a35",
          color: selectionEntries.length > 0 ? "#f0e8c0" : "#777",
          cursor: selectionEntries.length > 0 ? "pointer" : "not-allowed",
          alignSelf: "center",
        }}
      >
        Combiner
      </button>
    </div>
  );
}
