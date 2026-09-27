import { createRng } from "../rng";
import {
  CHEST_SPRITESHEET,
  CHEST_VARIANTS,
  CITY_TILES_AUTOTILE_SPRITESHEET,
  WORLD_B_AUTOTILE_SPRITESHEET,
  DARKWOODS_AUTOTILE_SPRITESHEET,
} from "../spriteRegistry";

// TILE_SIZE duplique volontairement, comme dans floorRenderer.js (meme
// justification : simple constante numerique, identique des deux cotes).
const TILE_SIZE = 32;

const SHARED_HAZARD_SPRITESHEET_KEY = DARKWOODS_AUTOTILE_SPRITESHEET.key;
const TRAP_HIDDEN_FRAMES = [229];
const TRAP_SPIKE_ANIM_FRAMES = [166, 182, 198, 214];
const MINING_ROCK_FRAME = 86;

const MINING_RESOURCE_TINTS = {
  copperOre: 0xb87333, // brun-rouge cuivre
  coalOre: 0x333333, // noir charbon
  ironOre: 0x8899aa, // gris-bleu acier
  silverOre: 0xcfd8dc, // gris clair argente
  goldOre: 0xffd54f, // jaune dore
  platiniumOre: 0xe5e4e2, // gris clair platine
  cobaltOre: 0x0047ab, // bleu cobalt
  adamantineOre: 0x99ccff, // bleu clair adamantine
  crimsonOre: 0xdc143c, // rouge cramoisi
  angelicOre: 0xfff8e7, // blanc angélique
  fatefulOre: 0xff0000, // rouge fateful
  novaOre: 0xffa500, // orange nova
};

function resolveMiningRockTint(resourceItemId) {
  return MINING_RESOURCE_TINTS[resourceItemId] || 0x66ccff; // repli bleu generique si type inconnu
}

/**
 * Fait apparaitre les coffres (et coffres "ephemeres" issus d'un loot
 * d'ennemi/chest deja ouverts avant sauvegarde) d'un etage. Deplacee telle
 * quelle depuis MainScene.loadLevel().
 *
 * @param {Phaser.Scene} scene
 * @param {object} params
 * @param {Array} params.chests - coffres du niveau (fetchLevel)
 * @param {Array} params.savedEphemeralChests - coffres ephemeres restaures
 *   depuis une sauvegarde (loot d'ennemi tue avant de quitter l'etage)
 */
export function spawnChests(scene, { chests, savedEphemeralChests }) {
    const chestVariantRng = createRng(`${scene.currentSeed}-chest-variants`);
    (chests || []).forEach((chestData, index) => {
      const alreadyOpened = scene.currentFloorOpenedChests.includes(index);
      const variant =
        CHEST_VARIANTS[Math.floor(chestVariantRng() * CHEST_VARIANTS.length)];
      const CRATE_FRAMES = { barrel: 76, crate: 77 };
      let sprite = null;
      if (chestData.propType === "crate") {
        if (!alreadyOpened) {
          const crateVariant = chestVariantRng() < 0.5 ? "barrel" : "crate";
          sprite = scene.add.sprite(
            chestData.x * TILE_SIZE + TILE_SIZE / 2,
            chestData.y * TILE_SIZE + TILE_SIZE / 2,
            CITY_TILES_AUTOTILE_SPRITESHEET.key,
            CRATE_FRAMES[crateVariant],
          );
          sprite.setScale(TILE_SIZE / 16);
        }
      } else {
        sprite = scene.add.sprite(
          chestData.x * TILE_SIZE + TILE_SIZE / 2,
          chestData.y * TILE_SIZE + TILE_SIZE / 2,
          CHEST_SPRITESHEET.key,
          alreadyOpened ? variant.openFrame : variant.closedFrame,
        );
      }
      if (sprite) sprite.setDepth(7);
      // collision avec le héros (désactivée pour l'instant)      // collision avec le héros (désactivée pour l'instant)
      // scene.physics.add.existing(sprite, true);
      // scene.levelColliders.push(scene.physics.add.collider(scene.hero, sprite));
      // if (alreadyOpened) sprite.body.checkCollision.none = true;

      // uniformise TOUJOURS en lootItems (tableau), meme pour un coffre a
      // objet unique - un seul format a gerer partout ensuite (cf.
      // performInteraction/openChestScreen). Si deja ouvert, restaure ce
      // qui restait EXACTEMENT a prendre (registre separe) - absent du
      // registre = deja entierement loote la derniere fois
      let lootItems;
      if (alreadyOpened) {
        lootItems = scene.currentFloorChestRemainingLoot[index]
          ? scene.currentFloorChestRemainingLoot[index].map((i) => ({ ...i }))
          : [];
      } else {
        lootItems = chestData.loot ? [{ ...chestData.loot }] : [];
      }

      scene.chests.push({
        sprite,
        index,
        opened: alreadyOpened,
        lootItems,
        x: chestData.x,
        y: chestData.y,
        variant,
        propType: chestData.propType || "chest",
      });
    });
    for (const eph of savedEphemeralChests) {
      const variant = CHEST_VARIANTS[eph.variantIndex] || CHEST_VARIANTS[0];
      const sprite = scene.add.sprite(
        eph.x * TILE_SIZE + TILE_SIZE / 2,
        eph.y * TILE_SIZE + TILE_SIZE / 2,
        CHEST_SPRITESHEET.key,
        eph.opened ? variant.openFrame : variant.closedFrame,
      );
      sprite.setDepth(7);

      const lootItems = scene.currentFloorChestRemainingLoot[eph.index]
        ? scene.currentFloorChestRemainingLoot[eph.index].map((i) => ({ ...i }))
        : [];

      scene.chests.push({
        sprite,
        index: eph.index,
        opened: eph.opened,
        lootItems,
        x: eph.x,
        y: eph.y,
        variant,
        ephemeral: true,
        propType: "chest",
      });

      if (-eph.index > scene.nextLootChestId) {
        scene.nextLootChestId = -eph.index;
      }
    }
}

/**
 * Fait apparaitre les pieges (visuel uniquement - sprite cache/revele/
 * declenche ; la logique de declenchement reste dans MainScene.
 * checkFloorTraps/triggerFloorTrap). Deplacee telle quelle depuis
 * MainScene.loadLevel().
 *
 * @param {Phaser.Scene} scene
 * @param {object} params
 * @param {Array} params.traps
 */
export function spawnTraps(scene, { traps }) {
    const trapVariantRng = createRng(`${scene.currentSeed}-traps-visual`);

    (traps || []).forEach((trapData, index) => {
      const alreadyTriggered = scene.currentFloorTriggeredTraps.includes(index);
      const alreadyRevealed =
        alreadyTriggered || scene.currentFloorRevealedTraps.includes(index);
      const hiddenFrame =
        TRAP_HIDDEN_FRAMES[
          Math.floor(trapVariantRng() * TRAP_HIDDEN_FRAMES.length)
        ];

      const sprite = scene.add.sprite(
        trapData.x * TILE_SIZE + TILE_SIZE / 2,
        trapData.y * TILE_SIZE + TILE_SIZE / 2,
        SHARED_HAZARD_SPRITESHEET_KEY,
        alreadyRevealed
          ? TRAP_SPIKE_ANIM_FRAMES[TRAP_SPIKE_ANIM_FRAMES.length - 1]
          : hiddenFrame,
      );
      sprite.setScale(TILE_SIZE / 16);
      sprite.setDepth(3);
      sprite.setVisible(alreadyRevealed);

      const spikeSprite = scene.add.sprite(
        trapData.x * TILE_SIZE + TILE_SIZE / 2,
        trapData.y * TILE_SIZE + TILE_SIZE / 2,
        SHARED_HAZARD_SPRITESHEET_KEY,
        TRAP_SPIKE_ANIM_FRAMES[TRAP_SPIKE_ANIM_FRAMES.length - 1],
      );
      spikeSprite.setScale(TILE_SIZE / 16);
      spikeSprite.setDepth(4);
      spikeSprite.setVisible(alreadyTriggered);

      scene.floorTraps.push({
        sprite,
        spikeSprite,
        index,
        x: trapData.x,
        y: trapData.y,
        hiddenFrame,
        baseFrame: TRAP_HIDDEN_FRAMES[0],
        spikeAnimFrames: TRAP_SPIKE_ANIM_FRAMES,
        damageType: trapData.damageType,
        damageAmount: trapData.damageAmount,
        inflictsEffect: trapData.inflictsEffect,
        revealed: alreadyRevealed,
        triggered: alreadyTriggered,
      });
    });
}

/**
 * Fait apparaitre les gisements de minerai (visuel + etat hits/depleted
 * initial ; la logique de minage reste dans MainScene.mineRock).
 * Deplacee telle quelle depuis MainScene.loadLevel().
 *
 * @param {Phaser.Scene} scene
 * @param {object} params
 * @param {object} params.data - reponse de fetchLevel (utilise data.miningRocks)
 * @param {Array} params.savedMiningRocksState - etat restaure depuis une sauvegarde
 */
export function spawnMiningRocks(scene, { data, savedMiningRocksState }) {
    const rocksData = data.miningRocks || [];
    rocksData.forEach((rockData, index) => {
      const savedState = savedMiningRocksState.find((s) => s.index === index);
      if (savedState && savedState.depleted) return; // ce gisement precis deja epuise - ne pas le recreer

      const hits = savedState ? savedState.hits : rockData.totalHits;

      const sprite = scene.add.sprite(
        rockData.x * TILE_SIZE + TILE_SIZE / 2,
        rockData.y * TILE_SIZE + TILE_SIZE / 2,
        SHARED_HAZARD_SPRITESHEET_KEY,
        MINING_ROCK_FRAME,
      );
      sprite.setScale(TILE_SIZE / 16);
      sprite.setDepth(4);
      sprite.setTint(resolveMiningRockTint(rockData.resourceItemId));

      scene.miningRocks.push({
        index,
        data: rockData,
        sprite,
        hits,
        depleted: false,
      });
    });
}

/**
 * Fait apparaitre les ressources recoltables (bois...) (visuel + etat
 * hits/depleted initial ; la logique de recolte reste dans
 * MainScene.forageNode). Deplacee telle quelle depuis MainScene.loadLevel().
 *
 * @param {Phaser.Scene} scene
 * @param {object} params
 * @param {object} params.data - reponse de fetchLevel (utilise data.forageNodes)
 * @param {Array} params.savedForageNodesState - etat restaure depuis une sauvegarde
 */
export function spawnForageNodes(scene, { data, savedForageNodesState }) {
    const WOOD_TREE_FRAMES = {
      oakWood: [136],
      ashWood: [137],
      yewWood: [138],
      ebonyWood: [155],
      petrifiedWood: [159],
      mistwood: [141],
      runewood: [157],
      skywood: [143],
      scarletwood: [140],
      sacredWood: [142],
      eternalWood: [158],
      starwood: [156],
    };

    const forageVariantRng = createRng(`${scene.currentSeed}-forage-variants`);
    const forageData = data.forageNodes || [];
    forageData.forEach((nodeData, index) => {
      const savedState = savedForageNodesState.find((s) => s.index === index);
      if (savedState && savedState.depleted) return;

      const hits = savedState ? savedState.hits : nodeData.totalHits;

      // le type de ressource est DEJA determine cote serveur
      // (nodeData.resourceItemId, tire a la generation) - on l'utilise
      // directement, jamais un second tirage independant qui
      // desynchroniserait le sprite affiche et la ressource reellement recoltee
      const framePool =
        WOOD_TREE_FRAMES[nodeData.resourceItemId] || WOOD_TREE_FRAMES.oakWood;
      const frame =
        framePool[Math.floor(forageVariantRng() * framePool.length)];

      const sprite = scene.add.sprite(
        nodeData.x * TILE_SIZE + TILE_SIZE / 2,
        nodeData.y * TILE_SIZE + TILE_SIZE / 2,
        WORLD_B_AUTOTILE_SPRITESHEET.key,
        frame,
      );
      sprite.setScale(TILE_SIZE / 16, (TILE_SIZE / 16) * 1.5);
      sprite.setDepth(4);

      scene.forageNodes.push({
        index,
        data: nodeData,
        sprite,
        hits,
        depleted: false,
      });
    });
}
