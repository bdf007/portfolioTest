/**
 * Systeme de sockets et de gemmes pour les armes/armures. Les objets
 * equipables (non stackables) sont deja pousses "un exemplaire par
 * entree" dans this.inventory (cf. MainScene.addItemToInventory) - ce
 * module ajoute a CES entrees un instanceId unique et un tableau
 * sockets[] propre a chaque exemplaire, pour que deux epees identiques
 * puissent avoir des gemmes differentes.
 *
 * Regles retenues :
 * - le nombre de sockets (gemSlots) est tire aleatoirement a la
 *   creation de l'objet (loot/craft/quete/achat, tous funnellees via
 *   addItemToInventory), selon le palier de materiau de l'objet ;
 * - une gemme socketee est consommee definitivement (pas de retrait) ;
 * - une gemme apporte un bonus de stats permanent (permanentModifiers)
 *   et, si elle en a un, un effet elementaire (inflictsEffect) qui se
 *   CUMULE avec celui de l'arme elle-meme (rollStatusEffect est appele
 *   une fois par source, cf. playerCombat.js) ;
 * - bonus de combo : si TOUS les sockets d'un objet sont remplis avec
 *   des gemmes de la meme famille (gemFamily, cf. itemDefs.js), les
 *   bonus de stats apportes par ces gemmes sur CET objet sont majores
 *   de COMBO_BONUS_MULTIPLIER.
 */
import { resolveItemDef } from "./itemDefs";

// ===== Paliers de materiaux =====
// Les 3 branches d'evolution d'equipement du jeu (metal / bois / cuir -
// materiaux de monstres) suivent chacune un ordre de progression verifie
// via le prix croissant des objets correspondants dans itemDefs.js.
const METAL_MATERIALS = [
  "wooden",
  "copper",
  "iron",
  "steel",
  "silver",
  "gold",
  "platinium",
  "cobalt",
  "adamantine",
  "crimson",
  "angelic",
  "fateful",
  "nova",
];
const WOOD_MATERIALS = [
  "wooden",
  "oak",
  "ash",
  "yew",
  "ebony",
  "petrified",
  "mistwood",
  "runewood",
  "skywood",
  "scarletwood",
  "sacred",
  "eternal",
  "starwood",
];
const LEATHER_MATERIALS = [
  "slimeBlob",
  "bearPelt",
  "spiderLeg",
  "greyMonsterScale",
  "crabClaw",
  "blackBearPelt",
  "turtleShell",
  "greenMonsterScale",
  "batWings",
  "dragonScale",
  "ghostEctoplasm",
  "monsterCore",
];

// bas = les 4 premiers paliers de chaque branche (max 1 socket),
// intermediaire = les 4 suivants (max 2), top = le reste (max 3) - meme
// repartition proportionnelle pour les 3 branches malgre un nombre de
// paliers legerement different (13/13/12).
const LOW_BAND_SIZE = 4;
const MID_BAND_SIZE = 4;

function bandForIndex(index) {
  if (index < LOW_BAND_SIZE) return "low";
  if (index < LOW_BAND_SIZE + MID_BAND_SIZE) return "mid";
  return "top";
}

function buildMaterialBands(materials) {
  return materials.map((material, index) => ({
    material,
    band: bandForIndex(index),
  }));
}

// liste a plat {material, band}, triee du nom le plus long au plus
// court - evite qu'un materiau soit reconnu a tort comme prefixe d'un
// autre plus specifique (ex: "blackBearPelt" ne doit jamais matcher
// "bearPelt" en premier, "greyMonsterScale" ne doit jamais matcher un
// prefixe plus court).
const MATERIAL_BANDS = [
  ...buildMaterialBands(METAL_MATERIALS),
  ...buildMaterialBands(WOOD_MATERIALS),
  ...buildMaterialBands(LEATHER_MATERIALS),
].sort((a, b) => b.material.length - a.material.length);

const GEAR_MODIFIER_PREFIXES = ["reinforced", "sharp"];

function stripModifierPrefix(itemId) {
  for (const prefix of GEAR_MODIFIER_PREFIXES) {
    if (itemId.startsWith(prefix)) {
      const rest = itemId.slice(prefix.length);
      return rest.charAt(0).toLowerCase() + rest.slice(1);
    }
  }
  return itemId;
}

/**
 * Determine la bande de palier (low/mid/top) d'un objet a partir de son
 * itemId. Repli sur "low" pour les objets de depart dont l'id ne
 * contient aucun materiau connu (ex: "pants", "boots", "mageHat",
 * "leatherHelmet", "woodenHelmet") - coherent avec le fait que ce sont
 * les equipements les plus faibles du jeu.
 */
export function resolveSocketBand(itemId) {
  const stripped = stripModifierPrefix(itemId);
  const match = MATERIAL_BANDS.find((entry) =>
    stripped.startsWith(entry.material),
  );
  return match ? match.band : "low";
}

// ===== Tirage du nombre de sockets =====
const SOCKET_COUNT_WEIGHTS = {
  low: [0.92, 0.08], // 0 ou 1 socket
  mid: [0.7, 0.22, 0.08], // 0, 1 ou 2 sockets
  top: [0.5, 0.3, 0.14, 0.06], // 0, 1, 2 ou 3 sockets
};

function weightedPick(weights) {
  const roll = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return i;
  }
  return weights.length - 1;
}

/**
 * Tire le nombre de sockets d'un objet a sa creation (appele une seule
 * fois, depuis MainScene.addItemToInventory). Ne s'applique qu'aux
 * objets category "equipment" - a l'appelant de filtrer.
 */
export function rollGemSlotCount(itemId) {
  const band = resolveSocketBand(itemId);
  return weightedPick(SOCKET_COUNT_WEIGHTS[band]);
}

/**
 * Plafond de sockets d'un objet - identique au plafond utilise au tirage
 * initial (longueur du tableau de poids de sa bande, moins 1). Reutilise
 * par le parchemin de perforation (cf. attemptSocketPerforation plus
 * bas) comme garde-fou : la perforation permet seulement d'ATTEINDRE ce
 * plafond si le tirage initial ne l'avait pas atteint, jamais de le
 * depasser.
 */
export function getMaxSocketsForItem(itemId) {
  const band = resolveSocketBand(itemId);
  return SOCKET_COUNT_WEIGHTS[band].length - 1;
}

// ===== Identifiant d'instance =====
let instanceIdCounter = 0;

/**
 * Identifiant unique pour un exemplaire d'objet - Date.now() seul ne
 * suffit pas (plusieurs objets peuvent etre crees dans la meme
 * milliseconde, ex: butin multiple d'un coffre), d'ou le compteur en
 * complement.
 */
export function generateInstanceId() {
  instanceIdCounter += 1;
  return `${Date.now()}-${instanceIdCounter}`;
}

// ===== Recherche d'instance =====
export function findEquipmentInstance(scene, instanceId) {
  return scene.inventory.find((entry) => entry.instanceId === instanceId);
}

// ===== Bonus des gemmes socketees (stats + combo) =====
const COMBO_BONUS_MULTIPLIER = 0.5; // +50% sur les bonus de stats des gemmes de cet objet si le combo est actif

/**
 * Renvoie la famille de gemme en combo sur cet objet (meme gemFamily
 * sur TOUS ses sockets, ET tous les sockets remplis), ou null sinon. Un
 * objet a un seul socket ne peut jamais faire de combo (il faut au
 * moins 2 gemmes de la meme famille).
 */
export function resolveInstanceComboFamily(instance) {
  if (!instance || !instance.gemSlots || instance.gemSlots < 2) return null;
  const sockets = instance.sockets || [];
  const filled = sockets.filter(Boolean);
  if (filled.length < 2 || filled.length !== instance.gemSlots) return null;
  const families = filled.map((gemId) => resolveItemDef(gemId).gemFamily);
  const allSameFamily = families.every((f) => f && f === families[0]);
  return allSameFamily ? families[0] : null;
}

/**
 * Somme les bonus de stats de toutes les gemmes socketees sur cet
 * exemplaire d'objet, majoree de COMBO_BONUS_MULTIPLIER si le combo de
 * famille est actif. Utilise par equipment.js en plus du statBonus de
 * base de l'objet.
 *
 * Les gemmes de combat expriment desormais leur bonus en POURCENTAGE
 * (percentModifiers) du statBonus PROPRE de l'objet sur lequel elles sont
 * socketees, plutot qu'en valeur fixe (permanentModifiers, conserve pour
 * d'eventuelles gemmes futures qui voudraient un vrai bonus plat) : une
 * gemme n'etant jamais retirable autrement que par le parchemin
 * d'extraction (risque de destruction, cf. attemptGemExtraction plus bas),
 * un bonus fixe socketee tot devenait derisoire une fois l'objet monte de
 * plusieurs paliers de craft (le statBonus de base grandit, pas la gemme).
 * Le pourcentage scale automatiquement avec chaque montee de palier. Une
 * gemme dont le pourcentage porte sur une stat absente du statBonus de cet
 * objet (ex: gemme de defense socketee sur une arme sans defense propre)
 * n'apporte logiquement rien sur cette stat.
 */
export function computeInstanceGemBonuses(instance) {
  const bonuses = {};
  if (!instance || !instance.sockets) return bonuses;

  const baseStatBonus = resolveItemDef(instance.itemId).statBonus || {};

  for (const gemId of instance.sockets) {
    if (!gemId) continue;
    const gemDef = resolveItemDef(gemId);
    if (gemDef.permanentModifiers) {
      for (const [key, value] of Object.entries(gemDef.permanentModifiers)) {
        bonuses[key] = (bonuses[key] || 0) + value;
      }
    }
    if (gemDef.percentModifiers) {
      for (const [key, percent] of Object.entries(gemDef.percentModifiers)) {
        const base = baseStatBonus[key] || 0;
        bonuses[key] = (bonuses[key] || 0) + base * percent;
      }
    }
  }

  if (resolveInstanceComboFamily(instance)) {
    for (const key of Object.keys(bonuses)) {
      bonuses[key] += bonuses[key] * COMBO_BONUS_MULTIPLIER;
    }
  }

  return bonuses;
}

/**
 * Renvoie les defs des gemmes socketees sur cet exemplaire qui portent
 * un effet elementaire (inflictsEffect) - utilise par playerCombat.js
 * pour cumuler l'effet de chaque gemme avec celui de l'arme elle-meme
 * (rollStatusEffect est appele une fois par source).
 */
export function resolveInstanceGemEffectSources(instance) {
  if (!instance || !instance.sockets) return [];
  return instance.sockets
    .filter(Boolean)
    .map((gemId) => resolveItemDef(gemId))
    .filter((def) => def.inflictsEffect);
}

/**
 * Meme principe que resolveInstanceGemEffectSources ci-dessus, mais
 * cumule les gemmes a inflictsEffect de TOUT l'equipement actuellement
 * porte (arme(s), armure, bottes, anneaux...), pas uniquement l'arme.
 * Necessaire car certaines gemmes de combat (slowGem, stunGem) portent un
 * bonus de stat plutot destine a une armure/botte (maxHp, moveSpeed - cf.
 * percentModifiers) EN PLUS de leur inflictsEffect : si seule l'arme etait
 * consultee, une telle gemme socketee sur une armure (la ou son bonus de
 * stat a du sens) ne declencherait jamais son effet au corps a corps/a
 * distance. Le carquois (munitions, jamais instancie) est ignore comme
 * partout ailleurs. Utilise par playerCombat.js a la place d'un appel
 * limite a l'arme equipee.
 */
export function resolveAllEquippedGemEffectSources(scene) {
  const sources = [];
  for (const [slot, ref] of Object.entries(scene.equipped)) {
    if (slot === "quiver" || !ref) continue;
    const instance = findEquipmentInstance(scene, ref);
    if (instance) sources.push(...resolveInstanceGemEffectSources(instance));
  }
  return sources;
}

/**
 * Meme principe que resolveAllEquippedGemEffectSources ci-dessus, mais
 * pour les gemmes REACTIVES (reactiveEffect, ex: hasteGem/repelGem), qui
 * se declenchent quand le JOUEUR encaisse un coup plutot que quand il en
 * porte un - typiquement pensees pour une armure. Utilise par ai.js
 * (enemy attaque le joueur, corps a corps ET a distance).
 */
export function resolveAllEquippedReactiveEffectSources(scene) {
  const sources = [];
  for (const [slot, ref] of Object.entries(scene.equipped)) {
    if (slot === "quiver" || !ref) continue;
    const instance = findEquipmentInstance(scene, ref);
    if (!instance || !instance.sockets) continue;
    for (const gemId of instance.sockets) {
      if (!gemId) continue;
      const gemDef = resolveItemDef(gemId);
      if (gemDef.reactiveEffect) sources.push(gemDef);
    }
  }
  return sources;
}

/**
 * Equivalent de resolveInstanceGemEffectSources ci-dessus, mais pour les
 * gemmes d'outil (toolEffect au lieu d'inflictsEffect) - utilise par
 * exploration.js (forageNode/mineRock) pour appliquer les bonus de
 * minage/bucheronnage des gemmes socketees sur la pioche/hache equipee.
 */
export function resolveInstanceToolEffectSources(instance) {
  if (!instance || !instance.sockets) return [];
  return instance.sockets
    .filter(Boolean)
    .map((gemId) => resolveItemDef(gemId))
    .filter((def) => def.toolEffect);
}

// ===== Socketage =====

/**
 * Insere une gemme dans un socket libre d'un exemplaire d'objet.
 * Insertion definitive (pas de retrait) : la gemme est retiree de
 * l'inventaire (consommee) des qu'elle est socketee. Renvoie true en
 * cas de succes, false sinon (socket invalide/deja occupe, gemme
 * absente de l'inventaire).
 */
export function socketGem(scene, instanceId, gemItemId, socketIndex) {
  const instance = findEquipmentInstance(scene, instanceId);
  if (!instance) return false;
  if (!instance.sockets) instance.sockets = [];
  if (socketIndex < 0 || socketIndex >= (instance.gemSlots || 0)) return false;
  if (instance.sockets[socketIndex]) return false; // deja occupe

  const gemDef = resolveItemDef(gemItemId);
  if (gemDef.category !== "gem") return false;

  // Restriction par categorie d'objet : les pioches/haches (slot "tool")
  // n'ont rien a faire d'un bonus de degats/effet de statut (gemUsage
  // "combat", cf. itemDefs.js) et inversement, une arme/armure ne peut pas
  // recevoir une gemme de minage/bucheronnage (gemUsage "tool"). Un objet
  // qui recoit des sockets par le tirage habituel (bandes de materiaux
  // metal/bois partagees avec les armes) mais n'est ni un outil ni une
  // arme/armure classique reste traite comme "combat" par defaut.
  const targetDef = resolveItemDef(instance.itemId);
  const isTargetTool = targetDef.slot === "tool";
  const isGemForTool = gemDef.gemUsage === "tool";
  if (isTargetTool !== isGemForTool) {
    scene.showLootToast(
      isTargetTool
        ? "Cette gemme ne convient qu'aux armes/armures, pas aux outils"
        : "Cette gemme ne convient qu'aux outils (pioches/haches)",
    );
    return false;
  }

  const gemIndex = scene.inventory.findIndex(
    (entry) => entry.itemId === gemItemId && entry.quantity > 0,
  );
  if (gemIndex === -1) return false;

  instance.sockets[socketIndex] = gemItemId;

  const gemEntry = scene.inventory[gemIndex];
  gemEntry.quantity -= 1;
  if (gemEntry.quantity <= 0) scene.inventory.splice(gemIndex, 1);

  scene.events.emit("inventory-updated", [...scene.inventory]);

  if (Object.values(scene.equipped).includes(instanceId)) {
    scene.recalculatePlayerStats();
    scene.events.emit("equipment-updated", { ...scene.equipped });
  }

  scene.persistProgress();

  return true;
}

// ===== Materiau requis pour une tentative de perforation =====
// Le parchemin de perforation consomme, en plus de lui-meme, un
// materiau brut correspondant au palier/branche EXACT de l'objet cible -
// les memes materiaux que ceux deja utilises par les recettes
// d'evolution de craftingRecipes.js (lingots pour la branche metal,
// essences pour la branche bois, depouilles pour la branche cuir), pour
// rester coherent avec l'economie de craft existante plutot que
// d'inventer une nouvelle ressource dediee. Pas de collision de cle
// entre branches (le seul nom partage, "wooden", pointe vers le meme
// materiau "wood" des deux cotes), un objet fusionne suffit donc.
const PERFORATION_MATERIAL_BY_NAME = {
  // branche metal
  wooden: "wood",
  copper: "copperIngot",
  iron: "ironIngot",
  steel: "steelIngot",
  silver: "silverIngot",
  gold: "goldIngot",
  platinium: "platiniumIngot",
  cobalt: "cobaltIngot",
  adamantine: "adamantineIngot",
  crimson: "crimsonIngot",
  angelic: "angelicIngot",
  fateful: "fatefulIngot",
  nova: "novaIngot",
  // branche bois (Bow/Staff)
  oak: "oakWood",
  ash: "ashWood",
  yew: "yewWood",
  ebony: "ebonyWood",
  petrified: "petrifiedWood",
  mistwood: "mistwood",
  runewood: "runewood",
  skywood: "skywood",
  scarletwood: "scarletwood",
  sacred: "sacredWood",
  eternal: "eternalWood",
  starwood: "starwood",
  // branche cuir/materiaux de monstres
  slimeBlob: "slimeBlob",
  bearPelt: "bearPelt",
  spiderLeg: "spiderLeg",
  greyMonsterScale: "greyMonsterScale",
  crabClaw: "crabClaw",
  blackBearPelt: "blackBearPelt",
  turtleShell: "turtleShell",
  greenMonsterScale: "greenMonsterScale",
  batWings: "batWings",
  dragonScale: "dragonScale",
  ghostEctoplasm: "ghostEctoplasm",
  monsterCore: "monsterCore",
};

/**
 * Determine le materiau brut (itemId, category "craftingMaterial" dans
 * itemDefs.js) correspondant EXACTEMENT au palier de l'objet cible -
 * contrairement a resolveSocketBand qui ne renvoie que la bande
 * (low/mid/top), necessaire ici pour savoir PRECISEMENT quel materiau
 * consommer. Reutilise MATERIAL_BANDS (deja trie du nom le plus long au
 * plus court, cf. plus haut) pour eviter toute incoherence avec
 * resolveSocketBand. Repli sur "wood" (materiau de base le plus faible)
 * pour un objet de depart sans materiau reconnu dans son id - meme repli
 * que resolveSocketBand sur la bande "low".
 */
export function resolvePerforationMaterialId(itemId) {
  const stripped = stripModifierPrefix(itemId);
  const match = MATERIAL_BANDS.find((entry) =>
    stripped.startsWith(entry.material),
  );
  return (match && PERFORATION_MATERIAL_BY_NAME[match.material]) || "wood";
}

// ===== Parchemin de perforation =====
const PERFORATION_OUTCOME_WEIGHTS = [0.65, 0.3, 0.05]; // reussite / echec simple / destruction

/**
 * Tente d'ajouter un socket supplementaire a un exemplaire d'equipement
 * via un parchemin de perforation. Consomme TOUJOURS le parchemin
 * (scrollIndex dans scene.inventory) + un exemplaire du materiau brut
 * correspondant au palier exact de l'objet cible (cf.
 * resolvePerforationMaterialId), des que la tentative est engagee - les
 * garde-fous de disponibilite sont tous verifies AVANT toute
 * consommation. Trois issues possibles une fois la tentative engagee :
 * - 65% reussite : gemSlots +1 (jamais au-dela du plafond de la bande,
 *   cf. getMaxSocketsForItem - garde-fou verifie en amont) ;
 * - 30% echec simple : rien ne change sur l'objet, seuls le parchemin et
 *   le materiau sont perdus ;
 * - 5% destruction : l'exemplaire cible est retire definitivement de
 *   l'inventaire (et desequipe au besoin).
 * Renvoie {success:false, reason} si la tentative est refusee avant
 * toute consommation (objet deja au plafond, materiau manquant...), ou
 * {success:true, outcome: "success"|"fail"|"destroyed"} une fois jouee.
 */
export function attemptSocketPerforation(scene, scrollIndex, targetInstanceId) {
  const scrollEntry = scene.inventory[scrollIndex];
  if (
    !scrollEntry ||
    resolveItemDef(scrollEntry.itemId).category !== "socketPerforation"
  ) {
    return { success: false, reason: "invalid-scroll" };
  }

  const target = findEquipmentInstance(scene, targetInstanceId);
  if (!target) return { success: false, reason: "invalid-target" };

  const maxSockets = getMaxSocketsForItem(target.itemId);
  if ((target.gemSlots || 0) >= maxSockets) {
    scene.showLootToast("Cet objet a déjà atteint son maximum de sockets");
    return { success: false, reason: "already-max" };
  }

  const materialId = resolvePerforationMaterialId(target.itemId);
  const hasMaterial = scene.inventory.some(
    (entry) => entry.itemId === materialId && entry.quantity > 0,
  );
  if (!hasMaterial) {
    scene.showLootToast(
      `Il manque le matériau requis : ${resolveItemDef(materialId).name}`,
    );
    return { success: false, reason: "missing-material" };
  }

  // consommation - a partir d'ici la tentative est engagee, quoi qu'il arrive
  scrollEntry.quantity -= 1;
  if (scrollEntry.quantity <= 0) scene.inventory.splice(scrollIndex, 1);

  // retrouve le materiau par recherche plutot que par index precalcule -
  // le splice ci-dessus peut avoir decale les index suivants.
  const materialEntry = scene.inventory.find(
    (entry) => entry.itemId === materialId && entry.quantity > 0,
  );
  materialEntry.quantity -= 1;
  if (materialEntry.quantity <= 0) {
    scene.inventory.splice(scene.inventory.indexOf(materialEntry), 1);
  }

  const outcomeRoll = weightedPick(PERFORATION_OUTCOME_WEIGHTS);
  let outcome;

  if (outcomeRoll === 0) {
    outcome = "success";
    target.gemSlots = (target.gemSlots || 0) + 1;
    scene.showLootToast("Perforation réussie : un socket a été ajouté !");
  } else if (outcomeRoll === 1) {
    outcome = "fail";
    scene.showLootToast(
      "Échec de la perforation - les matériaux sont perdus, l'objet est intact",
    );
  } else {
    outcome = "destroyed";
    const destroyedName = resolveItemDef(target.itemId).name;
    const instanceIndex = scene.inventory.indexOf(target);
    if (instanceIndex !== -1) scene.inventory.splice(instanceIndex, 1);
    for (const [slot, ref] of Object.entries(scene.equipped)) {
      if (ref === targetInstanceId) scene.equipped[slot] = null;
    }
    scene.showLootToast(`Échec critique : ${destroyedName} a été détruit !`);
  }

  scene.events.emit("inventory-updated", [...scene.inventory]);
  if (
    outcome === "destroyed" ||
    Object.values(scene.equipped).includes(targetInstanceId)
  ) {
    scene.recalculatePlayerStats();
    scene.events.emit("equipment-updated", { ...scene.equipped });
  }
  scene.persistProgress();

  return { success: true, outcome };
}

// ===== Parchemin d'extraction =====
// A la difference du parchemin de perforation, le risque ne porte pas sur
// "la gemme est perdue ou pas" : extraire une gemme la detruit TOUJOURS
// (c'est le cout de l'extraction, qui libere le socket pour une autre
// gemme) - c'est l'OBJET porteur qui risque la destruction totale, avec le
// meme taux que la destruction de la perforation (5%).
const EXTRACTION_DESTROY_CHANCE = 0.05;

/**
 * Tente de retirer la gemme d'un socket precis d'un exemplaire
 * d'equipement via un parchemin d'extraction. Consomme TOUJOURS le
 * parchemin + un exemplaire du materiau brut correspondant au palier
 * exact de l'objet cible (meme materiau que la perforation, cf.
 * resolvePerforationMaterialId) + LA GEMME ELLE-MEME (toujours detruite,
 * jamais recuperee), des que la tentative est engagee - les garde-fous de
 * disponibilite sont tous verifies AVANT toute consommation. Deux issues
 * possibles une fois la tentative engagee :
 * - 95% reussite : le socket est libere (gemme detruite), l'objet reste
 *   intact et peut recevoir une autre gemme ;
 * - 5% destruction : l'exemplaire cible est retire definitivement de
 *   l'inventaire (et desequipe au besoin), gemme deja perdue de toute facon.
 * Renvoie {success:false, reason} si la tentative est refusee avant toute
 * consommation (socket vide, materiau manquant...), ou {success:true,
 * outcome: "success"|"destroyed"} une fois jouee.
 */
export function attemptGemExtraction(
  scene,
  scrollIndex,
  targetInstanceId,
  socketIndex,
) {
  const scrollEntry = scene.inventory[scrollIndex];
  if (
    !scrollEntry ||
    resolveItemDef(scrollEntry.itemId).category !== "gemExtraction"
  ) {
    return { success: false, reason: "invalid-scroll" };
  }

  const target = findEquipmentInstance(scene, targetInstanceId);
  if (!target) return { success: false, reason: "invalid-target" };

  const gemId = target.sockets?.[socketIndex];
  if (!gemId) {
    scene.showLootToast("Ce socket est vide");
    return { success: false, reason: "empty-socket" };
  }

  const materialId = resolvePerforationMaterialId(target.itemId);
  const hasMaterial = scene.inventory.some(
    (entry) => entry.itemId === materialId && entry.quantity > 0,
  );
  if (!hasMaterial) {
    scene.showLootToast(
      `Il manque le matériau requis : ${resolveItemDef(materialId).name}`,
    );
    return { success: false, reason: "missing-material" };
  }

  // consommation - a partir d'ici la tentative est engagee, quoi qu'il arrive
  scrollEntry.quantity -= 1;
  if (scrollEntry.quantity <= 0) scene.inventory.splice(scrollIndex, 1);

  const materialEntry = scene.inventory.find(
    (entry) => entry.itemId === materialId && entry.quantity > 0,
  );
  materialEntry.quantity -= 1;
  if (materialEntry.quantity <= 0) {
    scene.inventory.splice(scene.inventory.indexOf(materialEntry), 1);
  }

  // la gemme est detruite dans tous les cas, quelle que soit l'issue -
  // c'est le cout de l'extraction, seul l'objet porteur est en jeu ci-dessous.
  const gemName = resolveItemDef(gemId).name;
  let outcome;

  if (Math.random() >= EXTRACTION_DESTROY_CHANCE) {
    outcome = "success";
    target.sockets[socketIndex] = null;
    scene.showLootToast(
      `Extraction réussie : ${gemName} détruite, le socket est libre.`,
    );
  } else {
    outcome = "destroyed";
    const destroyedName = resolveItemDef(target.itemId).name;
    const instanceIndex = scene.inventory.indexOf(target);
    if (instanceIndex !== -1) scene.inventory.splice(instanceIndex, 1);
    for (const [slot, ref] of Object.entries(scene.equipped)) {
      if (ref === targetInstanceId) scene.equipped[slot] = null;
    }
    scene.showLootToast(`Échec critique : ${destroyedName} a été détruit !`);
  }

  scene.events.emit("inventory-updated", [...scene.inventory]);
  if (
    outcome === "destroyed" ||
    Object.values(scene.equipped).includes(targetInstanceId)
  ) {
    scene.recalculatePlayerStats();
    scene.events.emit("equipment-updated", { ...scene.equipped });
  }
  scene.persistProgress();

  return { success: true, outcome };
}
