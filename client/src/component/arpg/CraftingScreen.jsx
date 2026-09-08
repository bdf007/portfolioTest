import { useState, useEffect, useRef } from "react";
import { resolveItemDef } from "./itemDefs";
import { resolveCraftingRecipe } from "./craftingRecipes";
import { ItemIcon, hasIconFrame } from "./InventoryScreen";
import bookPages from "../../assets/background/book_pages.png"; // ajuste le chemin selon ou tu l'as range

/**
 * Écran de craft - presente comme un livre ouvert (image de fond).
 * Page de gauche = recettes connues (+ recettes decouvertes mais
 * verrouillees, en dessous) ; page de droite = combinaison libre.
 * Toute la logique (ingredients flexibles, repartition manuelle,
 * decouverte) est identique a la version precedente - seule la mise en
 * page change.
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
      if (delta > 0 && nextTotal > requiredQty) return prev;

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

  const containerRef = useRef(null);
  const [bookSize, setBookSize] = useState({ width: 800, height: 500 });

  useEffect(() => {
    function updateSize() {
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      const availW = parent.clientWidth * 0.9;
      const availH = parent.clientHeight * 0.85;
      const ratio = 800 / 500;
      let w = availW;
      let h = w / ratio;
      if (h > availH) {
        h = availH;
        w = h * ratio;
      }
      setBookSize({ width: w, height: h });
    }
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current?.parentElement) {
      observer.observe(containerRef.current.parentElement);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: bookSize.width,
          height: bookSize.height,
          backgroundImage: `url(${bookPages})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "2%",
            right: "6%",
            padding: "6px 14px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid #8a7050",
            background: "rgba(58,47,32,0.85)",
            color: "#f0e6d0",
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          Fermer
        </button>

        {/* Page gauche - recettes connues + decouvertes verrouillees */}
        <div
          className="book-page-scroll"
          style={{
            position: "absolute",
            top: "9%",
            left: "9%",
            width: "38%",
            height: "80%",
            overflowY: "auto",
            overflowX: "hidden",
            color: "#241a10",
            fontSize: 11,
          }}
        >
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Recettes connues</h3>
          {unlockedRecipes.length === 0 && (
            <div style={{ color: "#5a4a35", fontSize: 11, marginBottom: 12 }}>
              Aucune recette connue pour l'instant.
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 16,
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
                    padding: 8,
                    background: "rgba(120,100,70,0.12)",
                    border: "1px solid rgba(90,74,53,0.3)",
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    {hasIconFrame(recipe.resultItemId) && (
                      <ItemIcon itemId={recipe.resultItemId} scale={1.3} />
                    )}
                    <div>
                      <div style={{ fontWeight: "bold" }}>{recipe.name}</div>
                      <div style={{ color: "#4a3a28" }}>
                        {resultDef.name}
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
                      gap: 4,
                      marginBottom: 6,
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
                              color: enough ? "#3f6b4f" : "#a34848",
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

                      const total = getFlexTotal(recipeId, ingIndex);
                      const complete = total >= ing.quantity;
                      return (
                        <div
                          key={ingIndex}
                          style={{
                            padding: 6,
                            background: "rgba(0,0,0,0.05)",
                            borderRadius: 4,
                          }}
                        >
                          <div
                            style={{
                              color: complete ? "#3f6b4f" : "#a34848",
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 4,
                            }}
                          >
                            <span>Au choix (ou mélange)</span>
                            <span>
                              {total} / {ing.quantity}
                            </span>
                          </div>
                          {ing.acceptedItemIds.map((itemId) => {
                            const def = resolveItemDef(itemId);
                            const owned = getQuantity(itemId);
                            const allocated =
                              getFlexAllocation(recipeId, ingIndex)[itemId] ||
                              0;
                            return (
                              <div
                                key={itemId}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  marginBottom: 3,
                                }}
                              >
                                <span>
                                  {def.name} ({owned})
                                </span>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 3,
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
                                      width: 18,
                                      height: 18,
                                      borderRadius: 3,
                                      border: "1px solid #8a7050",
                                      background: "#eee2cc",
                                      cursor:
                                        allocated <= 0
                                          ? "not-allowed"
                                          : "pointer",
                                      fontSize: 10,
                                    }}
                                  >
                                    −
                                  </button>
                                  <span
                                    style={{
                                      minWidth: 12,
                                      textAlign: "center",
                                    }}
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
                                      allocated >= owned ||
                                      total >= ing.quantity
                                    }
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: 3,
                                      border: "1px solid #8a7050",
                                      background: "#eee2cc",
                                      cursor:
                                        allocated >= owned ||
                                        total >= ing.quantity
                                          ? "not-allowed"
                                          : "pointer",
                                      fontSize: 10,
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          <button
                            onClick={() =>
                              autoFillFlex(recipeId, ingIndex, ing)
                            }
                            style={{
                              padding: "1px 6px",
                              fontSize: 9,
                              borderRadius: 4,
                              border: "1px solid #8a7050",
                              background: "#eee2cc",
                              color: "#5a4a35",
                              cursor: "pointer",
                            }}
                          >
                            Remplir auto
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    disabled={!craftable}
                    onClick={() => handleCraft(recipe)}
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      borderRadius: 5,
                      border: "1px solid #8a7050",
                      background: craftable
                        ? "#8a7050"
                        : "rgba(120,100,70,0.15)",
                      color: craftable ? "#fff8ea" : "#8a7a68",
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
              <h4 style={{ margin: "0 0 6px", fontSize: 12 }}>
                Découvertes (niveau insuffisant)
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {discoveredLockedRecipes.map((recipeId) => {
                  const recipe = resolveCraftingRecipe(recipeId);
                  if (!recipe) return null;
                  const resultDef = resolveItemDef(recipe.resultItemId);
                  return (
                    <div
                      key={recipeId}
                      style={{
                        padding: 6,
                        background: "rgba(150,60,60,0.08)",
                        border: "1px solid rgba(150,60,60,0.25)",
                        borderRadius: 5,
                        opacity: 0.85,
                      }}
                    >
                      <div style={{ fontWeight: "bold" }}>{recipe.name}</div>
                      <div style={{ color: "#4a3a28" }}>{resultDef.name}</div>
                      <div style={{ color: "#a34848" }}>
                        Nécessite le niveau {recipe.unlockLevel}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Page droite - combinaison libre */}
        <div
          className="book-page-scroll"
          style={{
            position: "absolute",
            top: "9%",
            left: "54%",
            width: "37%",
            height: "80%",
            overflowY: "auto",
            overflowX: "hidden",
            color: "#241a10",
            fontSize: 11,
          }}
        >
          <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>Combinaison libre</h3>
          <div style={{ color: "#4a3a28", marginBottom: 10 }}>
            Choisis des objets et tente ta chance - rien n'est perdu en cas
            d'échec.
          </div>

          {selectionEntries.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                padding: 8,
                marginBottom: 10,
                background: "rgba(120,100,70,0.12)",
                border: "1px solid #8a7050",
                borderRadius: 6,
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
                      gap: 4,
                      padding: "3px 6px",
                      background: "#eee2cc",
                      border: "1px solid #8a7050",
                      borderRadius: 5,
                      cursor: "pointer",
                      fontSize: 10,
                    }}
                    title="Cliquer pour retirer une unité"
                  >
                    {hasIconFrame(itemId) && (
                      <ItemIcon itemId={itemId} scale={1} />
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
              gap: 5,
              marginBottom: 12,
            }}
          >
            {combinableEntries.length === 0 && (
              <div style={{ color: "#5a4a35" }}>
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
                    gap: 6,
                    padding: 6,
                    background: "rgba(120,100,70,0.08)",
                    border: "1px solid rgba(90,74,53,0.25)",
                    borderRadius: 5,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {hasIconFrame(entry.itemId) && (
                      <ItemIcon itemId={entry.itemId} scale={1.1} />
                    )}
                    <span>
                      {def.name} ({picked}/{owned})
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 3 }}>
                    <button
                      onClick={() => removeFromSelection(entry.itemId)}
                      disabled={picked <= 0}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        border: "1px solid #8a7050",
                        background: "#eee2cc",
                        cursor: picked <= 0 ? "not-allowed" : "pointer",
                        fontSize: 11,
                      }}
                    >
                      −
                    </button>
                    <button
                      onClick={() => addToSelection(entry.itemId)}
                      disabled={picked >= owned}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        border: "1px solid #8a7050",
                        background: "#eee2cc",
                        cursor: picked >= owned ? "not-allowed" : "pointer",
                        fontSize: 11,
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
              padding: "8px 16px",
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid #8a7050",
              background:
                selectionEntries.length > 0
                  ? "#8a7050"
                  : "rgba(120,100,70,0.15)",
              color: selectionEntries.length > 0 ? "#fff8ea" : "#8a7a68",
              cursor: selectionEntries.length > 0 ? "pointer" : "not-allowed",
              display: "block",
              margin: "0 auto",
            }}
          >
            Combiner
          </button>
        </div>
      </div>
      <style>{`
  .book-page-scroll::-webkit-scrollbar {
    width: 7px;
  }
  .book-page-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .book-page-scroll::-webkit-scrollbar-thumb {
    background: rgba(90, 74, 53, 0.45);
    border-radius: 4px;
  }
  .book-page-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(90, 74, 53, 0.65);
  }
  .book-page-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(90, 74, 53, 0.45) transparent;
  }
`}</style>
    </div>
  );
}
