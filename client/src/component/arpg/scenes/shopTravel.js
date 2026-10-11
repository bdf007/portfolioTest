import { createRng } from "../rng";
import { resolveItemDef, ITEM_DEFS } from "../itemDefs";

const SELL_PRICE_RATIO = 0.5; // moitie du prix d'achat - cf. sellItem
const GEM_SELL_RATIO = 0.5; // part du prix des gemmes socketees reversee a la vente de l'objet
const SHOP_REFRESH_BASE_COST = 50; // cout du 1er rafraichissement du stock sur un etage donne - augmente ensuite a chaque utilisation (cf. getShopRefreshCost)
const SHOP_STOCK_SIZE_MIN = 3; // doit rester synchronise avec generateShopStock (shopGenerator.js, cote generation de niveau)
const SHOP_STOCK_SIZE_MAX = 5;

/**
 * Reimplementation cote client de generateShopStock (shopGenerator.js,
 * genere le stock DE BASE d'une boutique a la creation du niveau, seede
 * par ville). Necessaire car le rafraichissement doit produire un NOUVEAU
 * tirage a la demande du joueur, sans aller-retour serveur - reprend
 * exactement le meme algorithme (mélange Fisher-Yates seede) avec le
 * meme param `seed`, seule la CHAINE de seed passee change a chaque
 * rafraichissement (cf. getMergedShopStock).
 */
function getPurchasableItemIdsClient() {
  return Object.keys(ITEM_DEFS).filter((id) => ITEM_DEFS[id].price);
}

function generateShopStockClient(
  seed,
  stockSizeMin = SHOP_STOCK_SIZE_MIN,
  stockSizeMax = SHOP_STOCK_SIZE_MAX,
) {
  const rng = createRng(String(seed) + "-shop-stock");
  const candidates = getPurchasableItemIdsClient();

  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const stockSize = Math.min(
    shuffled.length,
    stockSizeMin + Math.floor(rng() * (stockSizeMax - stockSizeMin + 1)),
  );

  return shuffled.slice(0, stockSize).map((itemId) => ({
    itemId,
    price: ITEM_DEFS[itemId].price,
  }));
}

/**
 * Pas appelee depuis l'exterieur de MainScene.js (React ne fait que
 * declencher goToDepth via descendStairs/travelToDepth) - pas de wrapper
 * conserve dans MainScene.js pour celle-ci.
 */
export function descendStairs(scene) {
  goToDepth(scene, scene.currentDepth + 1);
}

export function goToDepth(scene, targetDepth) {
  const existing = scene.visitedFloors.find((f) => f.depth === targetDepth);
  scene.loadLevel(targetDepth, existing ? existing.seed : undefined);
}

export function openTravelHub(scene) {
  scene.pauseGame("travelHub");
  const destinations = scene.visitedFloors.filter(
    (f) => f.depth !== scene.currentDepth,
  );
  scene.events.emit("travel-hub", destinations);
}

export function travelToDepth(scene, targetDepth) {
  scene.unpauseGame("travelHub");
  scene.events.emit("travel-hub", null);
  goToDepth(scene, targetDepth);
}

export function closeTravelHub(scene) {
  scene.unpauseGame("travelHub");
  scene.events.emit("travel-hub", null);
}

function getMergedShopStock(scene) {
  const rerollCount = scene.shopRerollSeed[scene.currentDepth] || 0;
  const baseStock =
    rerollCount > 0
      ? generateShopStockClient(
          `${scene.currentSeed}-shop-refresh-${scene.currentDepth}-${rerollCount}`,
        )
      : scene.shopData?.stock || [];
  const soldHere = scene.shopSoldItems[scene.currentDepth] || [];
  const soldEntries = soldHere.map((s) => {
    const def = resolveItemDef(s.itemId);
    return {
      itemId: s.itemId,
      price: def.price || 0,
      quantity: s.quantity,
      soldByPlayer: true,
    };
  });
  return [...baseStock, ...soldEntries];
}

export function getShopRefreshCost(scene) {
  const rerollCount = scene.shopRerollSeed[scene.currentDepth] || 0;
  // cout croissant a chaque utilisation sur CETTE boutique (remis a zero
  // en revenant sur un autre etage/ville) - ajuste le multiplicateur ou
  // passe a une formule non-lineaire si 50/100/150/... est trop plat
  return SHOP_REFRESH_BASE_COST * (rerollCount + 1);
}

export function refreshShop(scene) {
  const cost = getShopRefreshCost(scene);
  const goldEntry = scene.inventory.find((i) => i.itemId === "gold");
  const currentGold = goldEntry ? goldEntry.quantity : 0;
  if (currentGold < cost) {
    scene.showLootToast("Pas assez d'or pour rafraîchir la boutique");
    return;
  }

  goldEntry.quantity -= cost;
  if (goldEntry.quantity <= 0)
    scene.inventory = scene.inventory.filter((i) => i !== goldEntry);

  scene.shopRerollSeed[scene.currentDepth] =
    (scene.shopRerollSeed[scene.currentDepth] || 0) + 1;

  scene.events.emit("inventory-updated", [...scene.inventory]);
  scene.events.emit("shop", getMergedShopStock(scene));
  scene.showLootToast("Stock de la boutique rafraîchi");
}

/**
 * Pas appelee depuis l'exterieur de MainScene.js (declenchee en interne a
 * la proximite d'une tuile de boutique, cf. le point d'appel dans
 * MainScene.js) - pas de wrapper conserve pour celle-ci.
 */
export function openShop(scene) {
  scene.pauseGame("shop");
  scene.events.emit("shop", getMergedShopStock(scene));
}

export function buyItem(scene, shopItemIndex, quantity = 1) {
  const merged = getMergedShopStock(scene);
  const shopItem = merged[shopItemIndex];
  if (!shopItem) return;

  const buyQty = Math.max(1, quantity);
  // objet rachete au joueur - jamais au-dela de ce qu'il en a vendu ici
  const effectiveQty = shopItem.soldByPlayer
    ? Math.min(buyQty, shopItem.quantity)
    : buyQty;
  if (effectiveQty <= 0) return;

  const totalCost = shopItem.price * effectiveQty;
  const goldEntry = scene.inventory.find((i) => i.itemId === "gold");
  const currentGold = goldEntry ? goldEntry.quantity : 0;
  if (currentGold < totalCost) return;

  goldEntry.quantity -= totalCost;
  if (goldEntry.quantity <= 0)
    scene.inventory = scene.inventory.filter((i) => i !== goldEntry);

  scene.addItemToInventory(shopItem.itemId, effectiveQty);

  if (shopItem.soldByPlayer) {
    const soldHere = scene.shopSoldItems[scene.currentDepth] || [];
    const entry = soldHere.find((s) => s.itemId === shopItem.itemId);
    if (entry) {
      entry.quantity -= effectiveQty;
      if (entry.quantity <= 0) {
        scene.shopSoldItems[scene.currentDepth] = soldHere.filter(
          (s) => s !== entry,
        );
      }
    }
    scene.events.emit("shop", getMergedShopStock(scene));
  }
}

export function sellItem(scene, itemId, quantity = 1, instanceId = null) {
  const def = resolveItemDef(itemId);
  if (!def.price) return;

  // un equipement PORTE reste dans scene.inventory (scene.equipped ne
  // garde que son instanceId) - il ne doit jamais etre vendable
  const equippedIds = new Set(Object.values(scene.equipped).filter(Boolean));
  const isSellable = (entry) =>
    !(entry.instanceId && equippedIds.has(entry.instanceId));

  const haveQty = scene.inventory
    .filter(
      (i) =>
        i.itemId === itemId &&
        isSellable(i) &&
        (!instanceId || i.instanceId === instanceId),
    )
    .reduce((s, i) => s + i.quantity, 0);
  if (haveQty <= 0) {
    scene.showLootToast("Équipement porté : retire-le d'abord pour le vendre");
    return;
  }
  const sellQty = Math.max(1, Math.min(quantity, haveQty));

  // consomme A TRAVERS toutes les entrees correspondantes - pas juste
  // un index precis, indispensable pour un equipement non-empilable ou
  // plusieurs exemplaires identiques vivent dans des entrees SEPAREES
  // (cf. le commentaire de groupInventory dans InventoryScreen.jsx)
  // valeur des gemmes socketees sur un exemplaire (prix catalogue des gemmes)
  const gemValueOf = (entry) =>
    (entry.sockets || [])
      .filter(Boolean)
      .reduce((sum, gemId) => sum + (resolveItemDef(gemId).price || 0), 0);

  // exemplaires vendables, SANS gemme d'abord (puis les plus gemmes en
  // dernier) pour ne jamais vendre par erreur un objet precieux
  const candidates = scene.inventory
    .map((entry, index) => ({ entry, index }))
    .filter(
      ({ entry }) =>
        entry.itemId === itemId &&
        isSellable(entry) &&
        (!instanceId || entry.instanceId === instanceId),
    )
    .sort(
      (a, b) => gemValueOf(a.entry) - gemValueOf(b.entry) || b.index - a.index,
    );

  let remaining = sellQty;
  let gemBonusGold = 0;
  const indexesToRemove = [];
  for (const { entry, index } of candidates) {
    if (remaining <= 0) break;
    const take = Math.min(entry.quantity, remaining);
    gemBonusGold += Math.floor(gemValueOf(entry) * GEM_SELL_RATIO);
    entry.quantity -= take;
    remaining -= take;
    if (entry.quantity <= 0) indexesToRemove.push(index);
  }
  indexesToRemove
    .sort((a, b) => b - a)
    .forEach((idx) => scene.inventory.splice(idx, 1));

  const sellPrice =
    Math.floor(def.price * SELL_PRICE_RATIO) * sellQty + gemBonusGold;
  scene.addItemToInventory("gold", sellPrice);

  if (!scene.shopSoldItems[scene.currentDepth])
    scene.shopSoldItems[scene.currentDepth] = [];
  const existingSold = scene.shopSoldItems[scene.currentDepth].find(
    (s) => s.itemId === itemId,
  );
  if (existingSold) existingSold.quantity += sellQty;
  else
    scene.shopSoldItems[scene.currentDepth].push({
      itemId,
      quantity: sellQty,
    });

  scene.events.emit("shop", getMergedShopStock(scene));
}

export function closeShop(scene) {
  scene.unpauseGame("shop");
  scene.events.emit("shop", null);
}
