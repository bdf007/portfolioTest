import { createRng } from "../rng";
import { pickPatrolRoute } from "../enemyBehavior";
import { createCooldown } from "../combat";
import { SPRITE_REGISTRY, resolveEnemyDisplayName } from "../spriteRegistry";
import { resolveItemDef } from "../itemDefs";

// Constantes dupliquees volontairement (identiques a celles de
// MainScene.js) - memes valeurs numeriques des deux cotes, meme logique
// que dans floorRenderer.js/floorEntities.js/abilities.js/summons.js.
const TILE_SIZE = 32;
const ENEMY_SPEED = 90;
const ENEMY_ATTACK_COOLDOWN = 900;
const ESCORT_NPC_HP = 40; // fragile - pas cense encaisser des coups longtemps, purement passif

const AMBIENT_NPC_GREETINGS = [
  "Bonjour, voyageur !",
  "Belle journée, n'est-ce pas ?",
  "Fais attention à toi là-dessous.",
  "J'ai entendu dire qu'il y avait un trésor par ici...",
  "Content de voir un nouveau visage en ville.",
  "Les affaires sont calmes en ce moment.",
  "On en a gros!",
];

export function createQuestNpcs(scene, npcDataArray) {
  const npcSpritePool = Object.keys(SPRITE_REGISTRY).filter((key) =>
    key.startsWith("NPC_town"),
  );
  const spriteRng = createRng(`${scene.currentSeed}-quest-npc-sprites`);
  const patrolRng = createRng(`${scene.currentSeed}-quest-npc-patrol`);
  scene.questNpcs = [];

  let nextReceiverIndex = 0;
  for (const questKey of Object.keys(scene.quests)) {
    const giverQs = scene.quests[questKey];
    if (
      (giverQs.questId !== "delivery" && giverQs.questId !== "escort") ||
      giverQs.role !== "giver"
    )
      continue;
    if (
      !giverQs.accepted ||
      giverQs.completed ||
      giverQs.failed ||
      giverQs.receiverKey
    )
      continue;
    if (giverQs.targetDepth !== scene.currentDepth) continue;

    // cherche le PROCHAIN pnj de cet etage qui n'a PAS deja de quete
    // assignee - ne jamais ecraser un pnj existant (cf. le bug ou un pnj
    // avec deja une quete tuer/looter se retrouvait transforme en
    // destinataire de colis)
    while (
      nextReceiverIndex < npcDataArray.length &&
      scene.quests[`${scene.currentDepth}-${nextReceiverIndex}`]
    ) {
      nextReceiverIndex++;
    }
    if (nextReceiverIndex >= npcDataArray.length) continue;

    const receiverNpcIndex = nextReceiverIndex++;
    const receiverKey = `${scene.currentDepth}-${receiverNpcIndex}`;
    scene.quests[receiverKey] =
      giverQs.questId === "escort"
        ? {
            questId: "escort",
            role: "receiver",
            linkedKey: questKey,
            xpReward: giverQs.xpReward,
            goldReward: giverQs.goldReward,
            accepted: true,
            completed: false,
          }
        : {
            questId: "delivery",
            role: "receiver",
            linkedKey: questKey,
            itemId: giverQs.itemId,
            xpReward: giverQs.xpReward,
            goldReward: giverQs.goldReward,
            accepted: true,
            completed: false,
          };
    giverQs.receiverKey = receiverKey;
  }

  const freshlyCreatedKeys = [];

  for (const npcData of npcDataArray) {
    const questKey = `${scene.currentDepth}-${npcData.npcIndex}`;

    // une quete d'escorte deja acceptee (role "giver") a deja transforme
    // son PNJ physique en invocation qui suit le heros (cf. acceptQuest) -
    // ne JAMAIS recreer un second PNJ a sa position d'origine au
    // rechargement de l'etage (F5/resumeFromSave/retryLevel re-fetchent
    // les memes donnees de niveau, seedees identiquement), sinon
    // duplication du PNJ ET reoffre indefiniment la meme quete deja en
    // cours (qs.completed reste false jusqu'au bout du voyage)
    const existingQuest = scene.quests[questKey];
    if (
      existingQuest &&
      existingQuest.questId === "escort" &&
      existingQuest.role === "giver"
    ) {
      continue;
    }

    const npcSpriteKey =
      npcSpritePool.length > 0
        ? npcSpritePool[Math.floor(spriteRng() * npcSpritePool.length)]
        : "hero1";
    const npcSprite = SPRITE_REGISTRY[npcSpriteKey];

    const sprite = scene.physics.add.sprite(
      npcData.x * TILE_SIZE + TILE_SIZE / 2,
      npcData.y * TILE_SIZE + TILE_SIZE / 2,
      npcSprite.key,
      npcSprite.animations.idleDown,
    );
    sprite.setScale(npcSprite.scale);
    sprite.anims.play(`${npcSpriteKey}-idle-down`);
    sprite.setDepth(9);
    scene.levelColliders.push(scene.physics.add.collider(sprite, scene.layer));
    scene.levelColliders.push(scene.physics.add.collider(scene.hero, sprite));
    scene.levelColliders.push(
      scene.physics.add.collider(scene.enemyGroup, sprite),
    );

    const route = pickPatrolRoute(
      scene.fogGrid,
      { x: npcData.x, y: npcData.y },
      patrolRng,
    );

    scene.questNpcs.push({
      sprite,
      npcIndex: npcData.npcIndex,
      questKey,
      spriteKey: npcSpriteKey,
      lastDir: "down",
      patrolPath: route ? route.path : null,
      patrolIndex: 0,
      patrolDirection: 1,
      talking: false,
    });

    if (!scene.quests[questKey]) {
      scene.quests[questKey] = {
        questId: npcData.questId,
        target: npcData.target,
        xpReward: npcData.xpReward,
        goldReward: npcData.goldReward,
        itemReward: npcData.itemReward || null,
        targetEnemyType: npcData.targetEnemyType,
        targetItemId: npcData.targetItemId,
        targetQuantity: npcData.targetQuantity,
        targetBossDepth: npcData.targetBossDepth,
        targetBossType: npcData.targetBossType,
        dialogText: npcData.dialogText || null,
        accepted: false,
        completed: false,
        killCount: 0,
        bossDefeated: false,
      };
      freshlyCreatedKeys.push(questKey);
    }
  }

  maybeInjectDeliveryQuest(scene, freshlyCreatedKeys);
}

export function maybeInjectDeliveryQuest(scene, eligibleKeys) {
  // jamais une quete liee a un boss (obtainItem garanti ou defeatBoss) -
  // l'ecraser silencieusement briserait la garantie d'objet de boss
  // (isBossItem, verifiee dans damageEnemy) avant meme que le joueur
  // ait pu la voir
  const safeKeys = eligibleKeys.filter((k) => {
    const q = scene.quests[k];
    if (!q) return false;
    if (q.questId === "defeatBoss") return false;
    if (q.questId === "obtainItem" && q.isBossItem) return false;
    return true;
  });
  if (safeKeys.length === 0) return;
  if (scene.currentBiomeId !== "town") return;

  const injectRng = createRng(`${scene.currentSeed}-delivery-inject`);
  if (injectRng() >= 0.2) return;

  const giverKey = safeKeys[Math.floor(injectRng() * safeKeys.length)];

  const firstFutureTown = Math.floor(scene.currentDepth / 10) * 10 + 10;
  const futureCandidates = [];
  for (let d = firstFutureTown; d <= 100; d += 10) {
    if (!scene.visitedFloors.find((f) => f.depth === d))
      futureCandidates.push(d);
  }
  const canSameTown = eligibleKeys.length >= 2;

  let style, targetDepth;
  if (futureCandidates.length > 0 && (!canSameTown || injectRng() < 0.7)) {
    style = "crossTown";
    targetDepth =
      futureCandidates[Math.floor(injectRng() * futureCandidates.length)];
  } else if (canSameTown) {
    style = "sameTown";
    targetDepth = scene.currentDepth;
  } else {
    return;
  }

  const goldReward = 20 + Math.floor(injectRng() * 21);

  const giverQs = scene.quests[giverKey];
  giverQs.questId = "delivery";
  giverQs.role = "giver";
  giverQs.style = style;
  giverQs.targetDepth = targetDepth;
  giverQs.receiverKey = null;
  giverQs.itemId = "sealedPackage";
  giverQs.xpReward = 35;
  giverQs.goldReward = goldReward;
  giverQs.accepted = false;
  giverQs.completed = false;

  if (style === "sameTown") {
    const otherKeys = safeKeys.filter((k) => k !== giverKey);
    const receiverKey = otherKeys[Math.floor(injectRng() * otherKeys.length)];
    scene.quests[receiverKey] = {
      questId: "delivery",
      role: "receiver",
      linkedKey: giverKey,
      itemId: "sealedPackage",
      xpReward: giverQs.xpReward,
      goldReward: giverQs.goldReward,
      accepted: true,
      completed: false,
    };
    giverQs.receiverKey = receiverKey;
  }
}

export function createAmbientNpcs(scene, npcDataArray) {
  const npcSpritePool = Object.keys(SPRITE_REGISTRY).filter((key) =>
    key.startsWith("NPC_town"),
  );
  const spriteRng = createRng(`${scene.currentSeed}-ambient-npc-sprites`);
  const greetingRng = createRng(`${scene.currentSeed}-ambient-npc-greetings`);
  const patrolRng = createRng(`${scene.currentSeed}-ambient-npc-patrol`);
  scene.ambientNpcs = [];

  for (const npcData of npcDataArray) {
    const npcSpriteKey =
      npcSpritePool.length > 0
        ? npcSpritePool[Math.floor(spriteRng() * npcSpritePool.length)]
        : "hero1";
    const npcSprite = SPRITE_REGISTRY[npcSpriteKey];

    const sprite = scene.physics.add.sprite(
      npcData.x * TILE_SIZE + TILE_SIZE / 2,
      npcData.y * TILE_SIZE + TILE_SIZE / 2,
      npcSprite.key,
      npcSprite.animations.idleDown,
    );
    sprite.setScale(npcSprite.scale);
    sprite.anims.play(`${npcSpriteKey}-idle-down`);
    sprite.setDepth(9);
    scene.levelColliders.push(scene.physics.add.collider(sprite, scene.layer));
    scene.levelColliders.push(scene.physics.add.collider(scene.hero, sprite));
    scene.levelColliders.push(
      scene.physics.add.collider(scene.enemyGroup, sprite),
    );

    const route = pickPatrolRoute(
      scene.fogGrid,
      { x: npcData.x, y: npcData.y },
      patrolRng,
    );
    const greeting =
      AMBIENT_NPC_GREETINGS[
        Math.floor(greetingRng() * AMBIENT_NPC_GREETINGS.length)
      ];

    scene.ambientNpcs.push({
      sprite,
      spriteKey: npcSpriteKey,
      lastDir: "down",
      patrolPath: route ? route.path : null,
      patrolIndex: 0,
      patrolDirection: 1,
      talking: false,
      greetingText: greeting,
    });
  }
}

export function openQuestDialog(scene, npc) {
  const questKey = npc.questKey;
  scene.dialogOpen = true;
  scene.pauseGame("dialog");
  scene.activeDialogQuestKey = questKey;
  scene.activeTalkingNpc = npc;
  npc.talking = true;
  const qs = scene.quests[questKey];
  if (!qs) return;
  const custom = qs.dialogText || {};
  let text;

  const secretHintSuffix = (() => {
    if (
      scene.secretRoomData &&
      !scene.discoveredSecretRoomDepths.includes(scene.currentDepth)
    ) {
      return " Au fait... on raconte qu'un passage secret se cache quelque part sur cet étage.";
    }
    const knownUndiscovered = scene.floorsWithSecretRoom.filter(
      (d) =>
        d !== scene.currentDepth &&
        !scene.discoveredSecretRoomDepths.includes(d),
    );
    if (knownUndiscovered.length > 0) {
      const hintRng = createRng(`${scene.currentSeed}-town-secret-hint`);
      const pickedDepth =
        knownUndiscovered[Math.floor(hintRng() * knownUndiscovered.length)];
      return ` Au fait... on raconte qu'un passage secret se cache quelque part à l'étage ${pickedDepth}.`;
    }
    return "";
  })();
  let canAccept = false;
  let canTurnIn = false;

  if (qs.questId === "obtainItem") {
    const itemName = resolveItemDef(qs.targetItemId).name;
    const requiredQty = qs.targetQuantity || 1;
    const haveQty = scene.inventory
      .filter((i) => i.itemId === qs.targetItemId)
      .reduce((sum, i) => sum + i.quantity, 0);
    const hasEnough = haveQty >= requiredQty;
    const qtyLabel = requiredQty > 1 ? `${requiredQty} ${itemName}` : itemName;

    if (qs.completed) {
      text = custom.complete || `Merci pour ${qtyLabel} !`;
    } else if (qs.accepted && hasEnough) {
      text =
        custom.progress ||
        `Tu en as assez ! Rends-moi ${qtyLabel} contre une récompense.`;
      canTurnIn = true;
    } else if (qs.accepted) {
      text =
        custom.progress ||
        `Toujours à la recherche de ${qtyLabel} (tu en as ${haveQty}/${requiredQty}) - reviens me voir une fois que tu en auras assez.`;
    } else {
      const bossHint =
        qs.bossDepth && qs.bossType
          ? ` Le ${resolveEnemyDisplayName(qs.bossType)} de l'étage ${qs.bossDepth} le détient.`
          : "";
      const enemyHint = qs.targetEnemyType
        ? ` On en trouve parfois sur les ${resolveEnemyDisplayName(qs.targetEnemyType)}.`
        : "";
      text =
        custom.offer ||
        `Peux-tu me rapporter ${qtyLabel} ?${bossHint}${enemyHint}`;
      canAccept = true;
    }
  } else if (qs.questId === "defeatBoss") {
    const bossName = resolveEnemyDisplayName(qs.targetBossType);
    if (qs.completed) {
      text = custom.complete || `Merci d'avoir vaincu ${bossName} !`;
    } else if (qs.accepted && qs.bossDefeated) {
      text =
        custom.progress || `Tu l'as vaincu ! Tu peux réclamer ta récompense.`;
      canTurnIn = true;
    } else if (qs.accepted) {
      text =
        custom.progress ||
        `${bossName} rôde toujours à l'étage ${qs.targetBossDepth} - reviens me voir une fois qu'il sera vaincu.`;
    } else {
      text =
        custom.offer ||
        `Peux-tu vaincre ${bossName} à l'étage ${qs.targetBossDepth} et revenir m'en informer ?`;
      canAccept = true;
    }
  } else if (qs.questId === "delivery") {
    if (qs.role === "receiver" && !scene.quests[qs.linkedKey]?.accepted) {
      text = "Bonjour, voyageur !";
      scene.events.emit("npc-dialog", {
        text,
        canAccept: false,
        canTurnIn: false,
      });
      return;
    }
    if (qs.role === "giver") {
      if (qs.completed) {
        text = custom.complete || `Merci d'avoir livré mon colis !`;
      } else if (qs.accepted) {
        text =
          custom.progress ||
          (qs.style === "sameTown"
            ? `Le colis est en route vers son destinataire, juste à côté.`
            : `Le colis est en route vers l'étage ${qs.targetDepth}.`);
      } else {
        text =
          custom.offer ||
          (qs.style === "sameTown"
            ? `Porte ce colis à quelqu'un juste à côté. Non, je ne peux pas y aller moi-même, ne pose pas de questions.`
            : `Porte ce colis à quelqu'un à l'étage ${qs.targetDepth}.`);
        canAccept = true;
      }
    } else {
      if (qs.completed) {
        text = custom.complete || `Merci pour le colis !`;
      } else {
        const hasItem = scene.inventory.some((i) => i.itemId === qs.itemId);
        if (hasItem) {
          text =
            custom.progress || `Tu as mon colis ! Merci de me l'avoir apporté.`;
          canTurnIn = true;
        } else {
          text = custom.progress || `J'attends toujours mon colis...`;
        }
      }
    }
  } else if (qs.questId === "escort") {
    // role "receiver" : uniquement assigne explicitement par
    // createQuestNpcs (jamais par defaut) - toute quete d'escorte SANS
    // ce role explicite est encore au stade "giver" (offre initiale, pas
    // encore acceptee), meme si qs.role vaut undefined a ce stade (mis a
    // "giver" seulement dans acceptQuest, apres coup). Verifier
    // qs.role === "receiver" explicitement (plutot qu'un else fourre-tout)
    // evite qu'une quete d'escorte fraiche ne tombe par erreur dans la
    // branche "receiver" et n'affiche que "Bonjour, voyageur !" sans
    // jamais proposer l'acceptation.
    if (qs.role === "receiver") {
      if (!scene.quests[qs.linkedKey]?.accepted) {
        text = "Bonjour, voyageur !";
        scene.events.emit("npc-dialog", {
          text,
          canAccept: false,
          canTurnIn: false,
        });
        return;
      }
      if (qs.completed) {
        text =
          custom.complete || `Merci de m'avoir aidé à retrouver mes proches !`;
      } else {
        const escortArrived = scene.summons.some(
          (s) => s.isEscort && s.escortQuestKey === qs.linkedKey,
        );
        if (escortArrived) {
          text =
            custom.progress ||
            `Te voilà enfin ! Merci de d'avoir escorté mon protégé jusqu'ici.`;
          canTurnIn = true;
        } else {
          text =
            custom.progress || `J'attends toujours l'arrivée de mon protégé...`;
        }
      }
    } else {
      // role "giver" (ou undefined, avant acceptation)
      if (qs.completed) {
        text = custom.complete || `Merci de m'avoir escorté !`;
      } else {
        text = custom.offer;
        canAccept = true;
      }
    }
  } else if (qs.completed) {
    const enemyName = resolveEnemyDisplayName(qs.targetEnemyType);
    text = custom.complete || `Merci d'avoir tué ces ${enemyName} pour moi !`;
  } else if (qs.accepted && qs.killCount >= qs.target) {
    text = custom.progress || `C'est fait ! Tu peux réclamer ta récompense.`;
    canTurnIn = true;
  } else if (qs.accepted) {
    const enemyName = resolveEnemyDisplayName(qs.targetEnemyType);
    text =
      custom.progress ||
      `Progression : ${qs.killCount} / ${qs.target} ${enemyName} tués. Reviens me voir une fois terminé !`;
  } else {
    const enemyName = resolveEnemyDisplayName(qs.targetEnemyType);
    text = custom.offer || `Peux-tu tuer ${qs.target} ${enemyName} pour toi ?`;
    canAccept = true;
  }
  scene.events.emit("npc-dialog", {
    text: text + secretHintSuffix,
    canAccept,
    canTurnIn,
  });
}

export function acceptQuest(scene) {
  const qs = scene.quests[scene.activeDialogQuestKey];
  if (!qs) return;
  qs.accepted = true;
  if (qs.questId === "delivery" && qs.role === "giver") {
    scene.addItemToInventory(qs.itemId, 1);
  }
  if (qs.questId === "escort") {
    // meme calcul de ville future que maybeInjectDeliveryQuest - seul
    // le client connait scene.visitedFloors, jamais decide cote serveur
    const firstFutureTown = Math.floor(scene.currentDepth / 10) * 10 + 10;
    const futureCandidates = [];
    for (let d = firstFutureTown; d <= 100; d += 10) {
      if (!scene.visitedFloors.find((f) => f.depth === d))
        futureCandidates.push(d);
    }

    if (futureCandidates.length === 0) {
      // aucune ville future disponible - annule silencieusement
      // l'acceptation plutot que de creer une quete impossible a rendre
      qs.accepted = false;
      scene.showLootToast("Aucune ville à escorter pour l'instant");
    } else {
      // toujours LA PLUS PROCHE ville future non visitee (futureCandidates
      // est deja trie par profondeur croissante, cf. la boucle
      // ci-dessus) - jamais un tirage aleatoire parmi toutes les villes
      // futures : contrairement a un colis (maybeInjectDeliveryQuest), le
      // PNJ escorte est vivant et vulnerable a chaque etage traverse, une
      // destination lointaine le condamnerait presque a coup sur avant
      // meme d'y arriver
      qs.targetDepth = futureCandidates[0];
      qs.role = "giver";
      qs.receiverKey = null;

      // le PNJ physique quitte questNpcs (patrouille) et devient une
      // invocation speciale (isEscort) qui suit le heros - reutilise
      // TOUT le systeme d'invocation (pathfinding, separation,
      // persistance cross-etage, ciblage par les ennemis) sans code
      // duplique, cf. discussion de conception
      const npc = scene.activeTalkingNpc;
      if (npc) {
        scene.questNpcs = scene.questNpcs.filter((n) => n !== npc);

        // garde-fou supplementaire (en plus de celui de createQuestNpcs) :
        // ne jamais creer une deuxieme invocation d'escorte pour la meme
        // quete, meme si un ancien bug de duplication a deja laisse
        // trainer un PNJ en trop dans une sauvegarde existante - on
        // detruit simplement ce PNJ surnumeraire sans le transformer
        const alreadyEscorting = scene.summons.some(
          (s) => s.isEscort && s.escortQuestKey === scene.activeDialogQuestKey,
        );

        if (alreadyEscorting) {
          npc.sprite.destroy();
        } else {
          scene.summonIdCounter = (scene.summonIdCounter || 0) + 1;
          scene.summons.push({
            id: scene.summonIdCounter,
            sprite: npc.sprite,
            spriteKey: npc.spriteKey,
            sourceAbilityId: null,
            isEscort: true,
            escortQuestKey: scene.activeDialogQuestKey,
            path: null,
            pathIndex: 0,
            nextPathRequestAt: 0,
            pathDestX: null,
            pathDestY: null,
            hp: ESCORT_NPC_HP,
            maxHp: ESCORT_NPC_HP,
            damage: 0,
            defense: 0,
            damageType: "physical",
            resistances: {},
            persistent: true, // jamais remplacable par une vraie invocation (cf. performSummonAbility)
            attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
            expiresAt: null,
            lastDir: npc.lastDir || "down",
            growthConfig: null,
            stuckCheckPos: { x: npc.sprite.x, y: npc.sprite.y },
            stuckCheckAt: scene.time.now,
            stuckJitterUntil: 0,
            stuckStreak: 0,
            attackType: "melee",
          });
          if (scene.summonGroup) scene.summonGroup.add(npc.sprite);
        }
      }
    }
  }
  scene.dialogOpen = false;
  scene.unpauseGame("dialog");
  scene.activeDialogQuestKey = null;
  releaseTalkingNpc(scene);
  scene.events.emit("npc-dialog", null);
  scene.events.emit("quests-updated", { ...scene.quests });
  scene.persistProgress();
}

export function turnInQuest(scene) {
  const qs = scene.quests[scene.activeDialogQuestKey];
  if (!qs || qs.completed) return;
  if (
    qs.questId !== "obtainItem" &&
    qs.questId !== "defeatBoss" &&
    qs.questId !== "killEnemies" &&
    !(qs.questId === "delivery" && qs.role === "receiver") &&
    !(qs.questId === "escort" && qs.role === "receiver")
  )
    return;

  if (qs.questId === "obtainItem") {
    const requiredQty = qs.targetQuantity || 1;
    const haveQty = scene.inventory
      .filter((i) => i.itemId === qs.targetItemId)
      .reduce((sum, i) => sum + i.quantity, 0);
    if (haveQty < requiredQty) return;

    let remaining = requiredQty;
    for (let i = scene.inventory.length - 1; i >= 0 && remaining > 0; i--) {
      const entry = scene.inventory[i];
      if (entry.itemId !== qs.targetItemId) continue;
      const take = Math.min(entry.quantity, remaining);
      entry.quantity -= take;
      remaining -= take;
      if (entry.quantity <= 0) scene.inventory.splice(i, 1);
    }
  } else if (qs.questId === "defeatBoss") {
    if (!qs.bossDefeated) return;
  } else if (qs.questId === "killEnemies") {
    if (qs.killCount < qs.target) return;
  } else if (qs.questId === "escort" && qs.role === "receiver") {
    // retire TOUS les summons lies a cette quete, pas seulement le
    // premier trouve - une sauvegarde touchee par l'ancien bug de
    // duplication (cf. createQuestNpcs/acceptQuest) a pu accumuler
    // plusieurs invocations pour la meme escorte ; sans ca, les doublons
    // continueraient a suivre le heros indefiniment meme apres la remise
    const matchingEscorts = scene.summons.filter(
      (s) => s.isEscort && s.escortQuestKey === qs.linkedKey,
    );
    if (matchingEscorts.length === 0) return; // pas encore arrive (ou deja mort)
    for (const escort of matchingEscorts) escort.sprite.destroy();
    scene.summons = scene.summons.filter(
      (s) => !(s.isEscort && s.escortQuestKey === qs.linkedKey),
    );

    const giverQs = scene.quests[qs.linkedKey];
    if (giverQs) giverQs.completed = true;
  } else {
    const itemIndex = scene.inventory.findIndex((i) => i.itemId === qs.itemId);
    if (itemIndex === -1) return;

    const item = scene.inventory[itemIndex];
    item.quantity -= 1;
    if (item.quantity <= 0) scene.inventory.splice(itemIndex, 1);

    const giverQs = scene.quests[qs.linkedKey];
    if (giverQs) giverQs.completed = true;
  }

  qs.completed = true;
  scene.xp += qs.xpReward;
  scene.events.emit("xp-changed", { xp: scene.xp });

  scene.dialogOpen = false;
  scene.unpauseGame("dialog");
  scene.activeDialogQuestKey = null;
  releaseTalkingNpc(scene);
  scene.events.emit("npc-dialog", null);
  scene.events.emit("quests-updated", { ...scene.quests });

  if (qs.questId === "killEnemies") {
    if (qs.itemReward) {
      scene.addItemToInventory(qs.itemReward.itemId, qs.itemReward.quantity);
      const itemDef = resolveItemDef(qs.itemReward.itemId);
      scene.showLootToast(`Reçu : ${itemDef.name} x${qs.itemReward.quantity}`);
    }
  } else {
    scene.addItemToInventory("gold", qs.goldReward);
  }
}

export function openAmbientDialog(scene, npc) {
  scene.dialogOpen = true;
  scene.pauseGame("dialog");
  scene.activeTalkingNpc = npc;
  npc.talking = true;
  scene.events.emit("npc-dialog", {
    text: npc.greetingText,
    canAccept: false,
    canTurnIn: false,
  });
}

export function releaseTalkingNpc(scene) {
  if (scene.activeTalkingNpc) {
    scene.activeTalkingNpc.talking = false;
    scene.activeTalkingNpc = null;
  }
}

export function closeDialog(scene) {
  scene.dialogOpen = false;
  scene.unpauseGame("dialog");
  scene.activeDialogQuestKey = null;
  releaseTalkingNpc(scene);
  scene.events.emit("npc-dialog", null);
}

export function updateNpcMovement(scene, npcList) {
  if (!npcList) return;
  const state = scene.fogState.state;

  for (const npc of npcList) {
    const npcTileX = Math.floor(npc.sprite.x / TILE_SIZE);
    const npcTileY = Math.floor(npc.sprite.y / TILE_SIZE);
    const npcVisible =
      npcTileY >= 0 &&
      npcTileX >= 0 &&
      npcTileY < state.length &&
      npcTileX < state[0].length &&
      state[npcTileY][npcTileX] === 2;
    npc.sprite.setVisible(npcVisible);

    if (npc.talking) {
      npc.sprite.setVelocity(0, 0);
      npc.sprite.anims.play(`${npc.spriteKey}-idle-${npc.lastDir}`, true);
      continue;
    }

    if (npc.patrolPath && npc.patrolPath.length > 1) {
      const waypoint = npc.patrolPath[npc.patrolIndex];
      scene.moveEnemyToward(npc, waypoint, ENEMY_SPEED * 0.5, () => {
        if (
          npc.patrolIndex + npc.patrolDirection < 0 ||
          npc.patrolIndex + npc.patrolDirection >= npc.patrolPath.length
        ) {
          npc.patrolDirection *= -1;
        }
        npc.patrolIndex += npc.patrolDirection;
      });
      continue;
    }

    npc.sprite.setVelocity(0, 0);
    npc.sprite.anims.play(`${npc.spriteKey}-idle-${npc.lastDir}`, true);
  }
}
