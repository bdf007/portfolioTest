import { useState } from "react";
import { resolveItemDef } from "./itemDefs";
import { resolveCraftingRecipe } from "./craftingRecipes";
import { ItemIcon, hasIconFrame } from "./InventoryScreen";

/**
 * Ecran de craft - overlay superpose au jeu (meme modele que
 * InventoryScreen/HotbarScreen/QuestsScreen).
 *
 * Trois sections :
 * - Recettes connues (apprises via parchemin OU decouvertes par
 *   combinaison libre) - fabrication en un clic, comme avant.
 * - Recettes decouvertes mais verrouillees (combinaison correcte
 *   trouvee, mais niveau insuffisant) - purement informatif, jamais
 *   fabricable ici.
 * - Combinaison libre - a la Minecraft : le joueur choisit librement des
 *   objets de son inventaire (jamais l'or) et tente sa chance, sans
 *   jamais rien perdre si la combinaison ne correspond a rien.
 */
export default function CraftingScreen({
  unlockedRecipes,
  discoveredLockedRecipes = [],
  inventory,
  onCraft,
  onFreeCraft,
  onClose,
}) {
  const [selection, setSelection] = useState({}); // { itemId: quantity }

  function getQuantity(itemId) {
    return inventory
      .filter((i) => i.itemId === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);
  }

  function canCraft(recipe) {
    return recipe.ingredients.every(
      (ing) => getQuantity(ing.itemId) >= ing.quantity,
    );
  }

  // objets combinables librement - jamais l'or, jamais les objets de
  // quete/uniques sans prix (ceux qui n'ont de toute facon leur place
  // dans aucune recette normale)
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
    const selectedItems = Object.entries(selection).map(([itemId, quantity]) => ({
      itemId,
      quantity,
    }));
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
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {unlockedRecipes.map((recipeId) => {
          const recipe = resolveCraftingRecipe(recipeId);
          if (!recipe) return null;
          const resultDef = resolveItemDef(recipe.resultItemId);
          const craftable = canCraft(recipe);

          return (
            <div
              key={recipeId}
              style={{ padding: 12, background: "#1e2029", border: "1px solid #444", borderRadius: 8 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                {hasIconFrame(recipe.resultItemId) && <ItemIcon itemId={recipe.resultItemId} scale={2} />}
                <div>
                  <div style={{ fontSize: 14 }}>{recipe.name}</div>
                  <div style={{ fontSize: 11, color: "#8a7050" }}>
                    Produit : {resultDef.name}{recipe.resultQuantity > 1 ? ` x${recipe.resultQuantity}` : ""}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {recipe.ingredients.map((ing) => {
                  const have = getQuantity(ing.itemId);
                  const enough = have >= ing.quantity;
                  const ingDef = resolveItemDef(ing.itemId);
                  return (
                    <div
                      key={ing.itemId}
                      style={{ fontSize: 12, color: enough ? "#7fae8f" : "#c96060", display: "flex", justifyContent: "space-between" }}
                    >
                      <span>{ingDef.name}</span>
                      <span>{have} / {ing.quantity}</span>
                    </div>
                  );
                })}
              </div>

              <button
                disabled={!craftable}
                onClick={() => onCraft(recipeId)}
                style={{
                  padding: "6px 14px", fontSize: 12, borderRadius: 6, border: "1px solid #8a7050",
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {discoveredLockedRecipes.map((recipeId) => {
              const recipe = resolveCraftingRecipe(recipeId);
              if (!recipe) return null;
              const resultDef = resolveItemDef(recipe.resultItemId);
              return (
                <div
                  key={recipeId}
                  style={{ padding: 12, background: "#241e1e", border: "1px solid #4a3838", borderRadius: 8, opacity: 0.8 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    {hasIconFrame(recipe.resultItemId) && <ItemIcon itemId={recipe.resultItemId} scale={2} />}
                    <div>
                      <div style={{ fontSize: 14 }}>{recipe.name}</div>
                      <div style={{ fontSize: 11, color: "#8a7050" }}>
                        Produit : {resultDef.name}{recipe.resultQuantity > 1 ? ` x${recipe.resultQuantity}` : ""}
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
                {hasIconFrame(itemId) && <ItemIcon itemId={itemId} scale={1.2} />}
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
          maxHeight: 220,
          overflowY: "auto",
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
                {hasIconFrame(entry.itemId) && <ItemIcon itemId={entry.itemId} scale={1.4} />}
                <div style={{ fontSize: 12 }}>
                  {def.name} ({picked}/{owned} choisi{picked > 1 ? "s" : ""})
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => removeFromSelection(entry.itemId)}
                  disabled={picked <= 0}
                  style={{
                    width: 24, height: 24, borderRadius: 5,
                    border: "1px solid #555", background: "#2a2a35",
                    color: "#eee", cursor: picked <= 0 ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  −
                </button>
                <button
                  onClick={() => addToSelection(entry.itemId)}
                  disabled={picked >= owned}
                  style={{
                    width: 24, height: 24, borderRadius: 5,
                    border: "1px solid #555", background: "#2a2a35",
                    color: "#eee", cursor: picked >= owned ? "not-allowed" : "pointer",
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
          border: selectionEntries.length > 0 ? "1px solid #ffd700" : "1px solid #555",
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
