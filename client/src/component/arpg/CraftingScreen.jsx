import { resolveItemDef } from './itemDefs';
import { resolveCraftingRecipe } from './craftingRecipes';
import { ItemIcon, hasIconFrame } from './InventoryScreen';

/**
 * Ecran de craft - overlay superpose au jeu (meme modele que
 * InventoryScreen/HotbarScreen/QuestsScreen). Liste uniquement les
 * recettes DEBLOQUEES (this.unlockedRecipes cote scene) - une recette
 * jamais apprise n'apparait nulle part ici, meme si le joueur possede
 * deja tous les ingredients par hasard.
 */
export default function CraftingScreen({ unlockedRecipes, inventory, onCraft, onClose }) {
  function getQuantity(itemId) {
    return inventory
      .filter((i) => i.itemId === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);
  }

  function canCraft(recipe) {
    return recipe.ingredients.every((ing) => getQuantity(ing.itemId) >= ing.quantity);
  }

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 22, display: 'flex', flexDirection: 'column',
        background: 'rgba(10,10,15,0.95)', color: '#eee', padding: 20, overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Craft</h3>
        <button
          onClick={onClose}
          style={{ padding: '6px 14px', fontSize: 13, borderRadius: 6, border: '1px solid #555', background: '#2a2a35', color: '#eee', cursor: 'pointer' }}
        >
          Fermer
        </button>
      </div>

      {unlockedRecipes.length === 0 && (
        <div style={{ color: '#666', fontSize: 13 }}>Aucune recette connue pour l'instant.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {unlockedRecipes.map((recipeId) => {
          const recipe = resolveCraftingRecipe(recipeId);
          if (!recipe) return null;
          const resultDef = resolveItemDef(recipe.resultItemId);
          const craftable = canCraft(recipe);

          return (
            <div
              key={recipeId}
              style={{ padding: 12, background: '#1e2029', border: '1px solid #444', borderRadius: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {hasIconFrame(recipe.resultItemId) && <ItemIcon itemId={recipe.resultItemId} scale={2} />}
                <div>
                  <div style={{ fontSize: 14 }}>{recipe.name}</div>
                  <div style={{ fontSize: 11, color: '#8a7050' }}>
                    Produit : {resultDef.name}{recipe.resultQuantity > 1 ? ` x${recipe.resultQuantity}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                {recipe.ingredients.map((ing) => {
                  const have = getQuantity(ing.itemId);
                  const enough = have >= ing.quantity;
                  const ingDef = resolveItemDef(ing.itemId);
                  return (
                    <div
                      key={ing.itemId}
                      style={{ fontSize: 12, color: enough ? '#7fae8f' : '#c96060', display: 'flex', justifyContent: 'space-between' }}
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
                  padding: '6px 14px', fontSize: 12, borderRadius: 6, border: '1px solid #8a7050',
                  background: craftable ? '#3a2f20' : '#2a2a35',
                  color: craftable ? '#f0e6d0' : '#777',
                  cursor: craftable ? 'pointer' : 'not-allowed',
                  width: '100%',
                }}
              >
                Fabriquer
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
