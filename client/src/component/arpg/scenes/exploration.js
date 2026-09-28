import { createRng } from "../rng";
import { computeDamage, applyElementalResistance } from "../combat";
import { resolveItemDef, ITEM_DEFS } from "../itemDefs";
import { resolveCraftingRecipe } from "../craftingRecipes";
import { CHEST_SPRITESHEET, CHEST_VARIANTS } from "../spriteRegistry";
import {
  rollStatusEffect,
  applyStatusEffect,
  getEffectivePlayerDefense,
} from "./statusEffects";
import {
  findEquipmentInstance,
  resolveInstanceToolEffectSources,
} from "../gemSockets";

import { TILE_SIZE } from "./gameConstants";

function pickWeightedGem(entries) {
  const totalWeight = entries.reduce((s, e) => s + (e.weight || 1), 0);
  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight || 1;
    if (roll <= 0) return entry.itemId;
  }
  return entries[entries.length - 1].itemId;
}

export function checkSecretWallInteraction(scene) {
  if (!scene.secretRoomData || scene.secretDoorOpened) return false;
  if (scene.secretRoomData.triggerType !== "wall") return false;

  const door = scene.secretRoomData.doorTile;
  const doorPx = door.x * TILE_SIZE + TILE_SIZE / 2;
  const doorPy = door.y * TILE_SIZE + TILE_SIZE / 2;
  const dist = Math.hypot(
    doorPx - scene.hero.body.center.x,
    doorPy - scene.hero.body.center.y,
  );
  if (dist > scene.playerMeleeRange) return false;

  openSecretDoor(scene);
  return true;
}

export function activateLever(scene, lever) {
  if (lever.activated) return;
  lever.activated = true;
  lever.sprite.setAlpha(1);

  const frames = [0, 1, 2];
  let frameIndex = 0;
  scene.time.addEvent({
    delay: 100,
    repeat: frames.length - 2,
    callback: () => {
      frameIndex++;
      lever.sprite.setFrame(frames[frameIndex]);
    },
  });

  const activatedCount = scene.secretLevers.filter((l) => l.activated).length;
  const totalCount = scene.secretLevers.length;
  const allActivated = activatedCount === totalCount;

  console.log(
    `[secretLever] active=${activatedCount}/${totalCount} allActivated=${allActivated} secretDoorOpened=${scene.secretDoorOpened} discoveredThisFloor=${scene.discoveredSecretRoomDepths.includes(scene.currentDepth)}`,
  );

  if (allActivated) {
    console.log("[secretLever] appel de openSecretDoor()");
    openSecretDoor(scene);
  } else {
    scene.showLootToast(`Levier actionné (${activatedCount}/${totalCount})`);
  }
}

export function openSecretDoor(scene) {
  console.log(
    `[secretLever] openSecretDoor appelee, secretDoorOpened avant = ${scene.secretDoorOpened}`,
  );
  if (scene.secretDoorOpened) {
    console.log("[secretLever] BLOQUE - secretDoorOpened etait deja true");
    return;
  }
  scene.secretDoorOpened = true;

  const door = scene.secretRoomData.doorTile;
  scene.layer.putTileAt(scene.currentFloorTileIndex ?? 0, door.x, door.y);
  scene.fogGrid[door.y][door.x] = 0;
  scene.buildPathfindingGrid();

  if (scene.secretWallMarker) {
    scene.secretWallMarker.destroy();
    scene.secretWallMarker = null;
  }

  scene.showLootToast("Un passage secret s'ouvre...");
  grantSecretRoomReward(scene);
  markSecretRoomDiscovered(scene);
}

export function grantSecretRoomReward(scene) {
  const rewardType = scene.secretRoomData.rewardType;
  const center = scene.secretRoomData.roomCenter;
  const px = center.x * TILE_SIZE + TILE_SIZE / 2;
  const py = center.y * TILE_SIZE + TILE_SIZE / 2;

  let lootItems = [];
  if (rewardType === "unique") {
    const uniqueCandidates = Object.values(ITEM_DEFS).filter(
      (d) =>
        d.unique &&
        d.category !== "craftingMaterial" &&
        !scene.obtainedUniqueItems.includes(d.id),
    );
    if (uniqueCandidates.length > 0) {
      const picked =
        uniqueCandidates[Math.floor(Math.random() * uniqueCandidates.length)];
      lootItems.push({ itemId: picked.id, quantity: 1 });
    }
  } else if (rewardType === "recipe") {
    const recipeScrolls = Object.values(ITEM_DEFS).filter(
      (d) =>
        d.category === "recipeScroll" &&
        !resolveCraftingRecipe(d.grantsRecipe)?.discoveryOnly,
    );
    if (recipeScrolls.length > 0) {
      const picked =
        recipeScrolls[Math.floor(Math.random() * recipeScrolls.length)];
      lootItems.push({ itemId: picked.id, quantity: 1 });
    }
  }
  if (lootItems.length === 0) {
    lootItems.push({
      itemId: "gold",
      quantity: 80 + Math.floor(Math.random() * 60),
    });
  }

  spawnLootChest(scene, px, py, lootItems);
}

export function markSecretRoomDiscovered(scene) {
  if (!scene.discoveredSecretRoomDepths.includes(scene.currentDepth)) {
    scene.discoveredSecretRoomDepths.push(scene.currentDepth);
  }
  scene.persistProgress();
}

/**
 * Resout les 3 effets possibles des gemmes d'outil (miningSpeedGem/
 * miningYieldGem/miningLuckGem, cf. itemDefs.js) socketees sur la pioche/
 * hache equipee - utilise par forageNode/mineRock ci-dessous. Chaque
 * source (une gemme peut etre cumulee avec d'autres, meme famille ou non)
 * est resolue independamment :
 * - fastHarvest : tire au moment du coup, cumulable (une seule gemme peut
 *   suffire a declencher la recolte rapide) ;
 * - bonusYield : idem, une ressource supplementaire par gemme qui procke ;
 * - rareLuck : bonus additif au taux de trouvaille rare (bonusChance/
 *   gemChance du noeud/gisement), cumule entre gemmes.
 */
function resolveToolGemEffects(scene, toolInstance) {
  const sources = resolveInstanceToolEffectSources(toolInstance);
  let luckBonus = 0;
  let fastHarvestCount = 0;
  let bonusYieldCount = 0;
  for (const gemDef of sources) {
    const effect = gemDef.toolEffect;
    if (effect.type === "rareLuck") {
      luckBonus += effect.bonusChance || 0;
    } else if (effect.type === "fastHarvest") {
      if (Math.random() < (effect.chance || 0)) fastHarvestCount += 1;
    } else if (effect.type === "bonusYield") {
      if (Math.random() < (effect.chance || 0)) bonusYieldCount += 1;
    }
  }
  return { luckBonus, fastHarvestCount, bonusYieldCount };
}

export function forageNode(scene) {
  const heroX = scene.hero.body.center.x;
  const heroY = scene.hero.body.center.y;

  const node = scene.forageNodes.find((n) => {
    if (n.depleted) return false;
    const nodePx = n.data.x * TILE_SIZE + TILE_SIZE / 2;
    const nodePy = n.data.y * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(nodePx - heroX, nodePy - heroY) <= scene.playerMeleeRange;
  });
  if (!node) return false;

  // scene.equipped.tool est desormais un instanceId (objets d'equipement
  // instancies, cf. gemSockets.js) - il faut retrouver l'exemplaire pour
  // en resoudre l'itemId, plutot que d'appeler resolveItemDef directement
  // dessus (qui echouerait silencieusement sur un instanceId).
  const toolInstance = scene.equipped.tool
    ? findEquipmentInstance(scene, scene.equipped.tool)
    : null;
  const toolDef = toolInstance ? resolveItemDef(toolInstance.itemId) : null;
  const toolTier = toolDef?.toolTier || 0;
  const toolType = toolDef?.toolType || null;

  if (toolType !== "axe") {
    scene.showLootToast("Il te faut une hache pour récolter ça");
    return true;
  }
  if (toolTier < node.data.requiredTier) {
    scene.showLootToast("Ta hache n'est pas assez puissante pour ce gisement");
    return true;
  }

  if (!scene.harvestCooldown.isReady(scene.time.now)) return true;

  const toolGemEffects = resolveToolGemEffects(scene, toolInstance);
  // gemme de celerite : une recolte rapide ne declenche pas le temps de
  // recuperation, le prochain coup est immediatement possible.
  if (toolGemEffects.fastHarvestCount === 0) {
    scene.harvestCooldown.trigger(scene.time.now);
  }

  scene.playSlashEffect();

  node.hits -= 1;

  const bonusChance = (node.data.bonusChance || 0) + toolGemEffects.luckBonus;
  const bonusPool = node.data.bonusPool || [];
  const gotBonus = bonusPool.length > 0 && Math.random() < bonusChance;
  const grantedItemId = gotBonus
    ? pickWeightedGem(bonusPool)
    : node.data.resourceItemId;

  scene.addItemToInventory(grantedItemId, 1);
  scene.showLootToast(
    gotBonus
      ? `Trouvaille : ${resolveItemDef(grantedItemId).name} !`
      : `${resolveItemDef(grantedItemId).name} obtenu !`,
  );

  // gemme d'abondance : une ressource de base supplementaire par gemme
  // qui procke (independant du tirage de trouvaille rare ci-dessus).
  if (toolGemEffects.bonusYieldCount > 0) {
    scene.addItemToInventory(
      node.data.resourceItemId,
      toolGemEffects.bonusYieldCount,
    );
    scene.showLootToast(
      `Récolte abondante : +${toolGemEffects.bonusYieldCount} ${resolveItemDef(node.data.resourceItemId).name} !`,
    );
  }

  if (node.hits <= 0) {
    node.sprite.destroy();
    node.sprite = null;
    node.depleted = true;
    scene.showLootToast("La ressource est épuisée");
  }

  scene.persistProgress();
  return true;
}

export function mineRock(scene) {
  const heroX = scene.hero.body.center.x;
  const heroY = scene.hero.body.center.y;

  const rock = scene.miningRocks.find((r) => {
    if (r.depleted) return false;
    const rockPx = r.data.x * TILE_SIZE + TILE_SIZE / 2;
    const rockPy = r.data.y * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(rockPx - heroX, rockPy - heroY) <= scene.playerMeleeRange;
  });
  if (!rock) return false;

  // scene.equipped.tool est desormais un instanceId (objets d'equipement
  // instancies, cf. gemSockets.js) - il faut retrouver l'exemplaire pour
  // en resoudre l'itemId, plutot que d'appeler resolveItemDef directement
  // dessus (qui echouerait silencieusement sur un instanceId).
  const toolInstance = scene.equipped.tool
    ? findEquipmentInstance(scene, scene.equipped.tool)
    : null;
  const toolDef = toolInstance ? resolveItemDef(toolInstance.itemId) : null;
  const toolTier = toolDef?.toolTier || 0;

  const toolType = toolDef?.toolType || null;
  if (toolType !== "pickaxe") {
    scene.showLootToast("Il te faut une pioche pour miner ça");
    return true;
  }
  if (toolTier < rock.data.requiredTier) {
    scene.showLootToast("Ta pioche n'est pas assez puissante pour ce gisement");
    return true;
  }

  if (!scene.harvestCooldown.isReady(scene.time.now)) return true;

  const toolGemEffects = resolveToolGemEffects(scene, toolInstance);
  // gemme de celerite : une recolte rapide ne declenche pas le temps de
  // recuperation, le prochain coup est immediatement possible.
  if (toolGemEffects.fastHarvestCount === 0) {
    scene.harvestCooldown.trigger(scene.time.now);
  }

  scene.playSlashEffect();

  rock.hits -= 1;

  const gemChance = (rock.data.gemChance || 0) + toolGemEffects.luckBonus;
  const gemPool = rock.data.gemPool || [];
  const gotGem = gemPool.length > 0 && Math.random() < gemChance;
  const grantedItemId = gotGem
    ? pickWeightedGem(gemPool)
    : rock.data.resourceItemId;

  scene.addItemToInventory(grantedItemId, 1);
  scene.showLootToast(
    gotGem
      ? `Trouvaille rare : ${resolveItemDef(grantedItemId).name} !`
      : `${resolveItemDef(grantedItemId).name} obtenu !`,
  );

  // gemme d'abondance : une ressource de base supplementaire par gemme
  // qui procke (independant du tirage de trouvaille rare ci-dessus).
  if (toolGemEffects.bonusYieldCount > 0) {
    scene.addItemToInventory(
      rock.data.resourceItemId,
      toolGemEffects.bonusYieldCount,
    );
    scene.showLootToast(
      `Récolte abondante : +${toolGemEffects.bonusYieldCount} ${resolveItemDef(rock.data.resourceItemId).name} !`,
    );
  }

  if (rock.hits <= 0) {
    rock.sprite.destroy();
    rock.sprite = null;
    rock.depleted = true;
    scene.showLootToast("Le gisement est épuisé");
  }

  scene.persistProgress();
  return true;
}

export function checkFloorTraps(scene) {
  const heroTileX = Math.floor(scene.hero.x / TILE_SIZE);
  const heroTileY = Math.floor(scene.hero.y / TILE_SIZE);

  for (const trap of scene.floorTraps) {
    if (trap.triggered) continue;

    if (trap.x === heroTileX && trap.y === heroTileY) {
      triggerFloorTrap(scene, trap, { isHero: true });
      continue;
    }

    for (const summon of scene.summons) {
      const sx = Math.floor(summon.sprite.x / TILE_SIZE);
      const sy = Math.floor(summon.sprite.y / TILE_SIZE);
      if (trap.x === sx && trap.y === sy) {
        triggerFloorTrap(scene, trap, { isHero: false, summon });
        break;
      }
    }
  }
}

export function triggerFloorTrap(scene, trap, target) {
  trap.triggered = true;
  trap.sprite.setFrame(trap.baseFrame);
  trap.sprite.setVisible(true);
  trap.spikeSprite.setVisible(true);
  scene.currentFloorTriggeredTraps.push(trap.index);

  const frames = trap.spikeAnimFrames;
  let frameIndex = 0;
  trap.spikeSprite.setFrame(frames[0]);
  scene.time.addEvent({
    delay: 150,
    repeat: frames.length - 2,
    callback: () => {
      frameIndex++;
      trap.spikeSprite.setFrame(frames[frameIndex]);
    },
  });

  if (target.isHero) {
    const rawDamage = applyElementalResistance(
      trap.damageAmount,
      trap.damageType,
      scene.playerResistances,
    );
    const dmg = computeDamage(rawDamage, getEffectivePlayerDefense(scene));
    scene.playerHp = Math.max(0, scene.playerHp - dmg);
    scene.showDamageNumber(scene.hero, dmg, "#ff4444");
    scene.events.emit("player-hp-changed", {
      hp: scene.playerHp,
      maxHp: scene.playerMaxHp,
    });
    applyStatusEffect(
      scene,
      scene.playerStatusEffects,
      rollStatusEffect({ inflictsEffect: trap.inflictsEffect }),
    );
  } else {
    const rawDamage = applyElementalResistance(
      trap.damageAmount,
      trap.damageType,
      target.summon.resistances,
    );
    const dmg = computeDamage(rawDamage, target.summon.defense);
    target.summon.hp = Math.max(0, target.summon.hp - dmg);
    scene.showDamageNumber(target.summon.sprite, dmg, "#ff44c7");
  }

  scene.persistProgress();
}

export function openChestScreen(scene, chest) {
  scene.activeChest = chest;
  scene.pauseGame("chest");

  if (!chest.opened) {
    chest.opened = true;
    // le sprite d'une caisse ne disparait plus a l'ouverture de l'ecran
    // sauf si elle est vide DES le depart (cas frequent et voulu) - sinon
    // on attend qu'elle soit VRAIMENT videe (cf. takeChestItem /
    // takeAllChestItems) avant de la faire disparaitre, pour ne pas
    // perdre le repere visuel si le joueur ferme sans avoir tout pris
    if (chest.propType === "crate") {
      if (chest.lootItems.length === 0 && chest.sprite) {
        chest.sprite.destroy();
        chest.sprite = null;
      }
    } else {
      chest.sprite.setFrame(chest.variant.openFrame);
    }
    if (!chest.ephemeral) scene.currentFloorOpenedChests.push(chest.index);
  }

  scene.events.emit("chest-screen", {
    items: chest.lootItems.map((item, itemIndex) => ({
      itemIndex,
      itemId: item.itemId,
      quantity: item.quantity,
    })),
  });
}

export function takeChestItem(scene, itemIndex) {
  const chest = scene.activeChest;
  if (!chest) return;
  const item = chest.lootItems[itemIndex];
  if (!item) return;

  const def = resolveItemDef(item.itemId);
  if (def.unique && scene.obtainedUniqueItems.includes(item.itemId)) {
    scene.showLootToast(
      `Tu possèdes déjà ${def.name} - impossible d'en avoir un second`,
    );
    return; // reste dans le coffre, rien n'est perdu
  }

  scene.addItemToInventory(item.itemId, item.quantity);
  chest.lootItems.splice(itemIndex, 1);
  if (!chest.ephemeral) saveChestRemainingLoot(scene, chest);
  if (chest.lootItems.length === 0) {
    if (chest.propType === "crate" && chest.sprite) {
      chest.sprite.destroy();
      chest.sprite = null;
    }
    closeChestScreen(scene);
    return;
  }

  scene.events.emit("chest-screen", {
    items: chest.lootItems.map((it, idx) => ({
      itemIndex: idx,
      itemId: it.itemId,
      quantity: it.quantity,
    })),
  });
}

export function takeAllChestItems(scene) {
  const chest = scene.activeChest;
  if (!chest) return;
  for (const item of chest.lootItems) {
    scene.addItemToInventory(item.itemId, item.quantity);
  }
  chest.lootItems = [];
  if (!chest.ephemeral) saveChestRemainingLoot(scene, chest);
  if (chest.propType === "crate" && chest.sprite) {
    chest.sprite.destroy();
    chest.sprite = null;
  }
  closeChestScreen(scene);
}

export function closeChestScreen(scene) {
  scene.unpauseGame("chest");
  scene.activeChest = null;
  scene.events.emit("chest-screen", null);
}

export function saveChestRemainingLoot(scene, chest) {
  if (chest.lootItems.length > 0) {
    scene.currentFloorChestRemainingLoot[chest.index] = chest.lootItems.map(
      (i) => ({ ...i }),
    );
  } else {
    delete scene.currentFloorChestRemainingLoot[chest.index];
  }
}

export function spawnLootChest(scene, pixelX, pixelY, lootItems) {
  if (!lootItems || lootItems.length === 0) return;

  const variantRng = createRng(
    `${scene.currentSeed}-enemy-chest-${scene.nextLootChestId}`,
  );
  const variant =
    CHEST_VARIANTS[Math.floor(variantRng() * CHEST_VARIANTS.length)];
  const sprite = scene.add.sprite(
    pixelX,
    pixelY,
    CHEST_SPRITESHEET.key,
    variant.closedFrame,
  );
  sprite.setDepth(7);

  scene.chests.push({
    sprite,
    index: -1 - scene.nextLootChestId,
    opened: false,
    lootItems,
    x: Math.round(pixelX / TILE_SIZE - 0.5),
    y: Math.round(pixelY / TILE_SIZE - 0.5),
    variant,
    ephemeral: true,
    propType: "chest",
  });
  scene.nextLootChestId++;
}
