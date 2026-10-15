import { createRng } from "../rng";

/**
 * Chaines de quetes ecrites a la main. Chaque etape est une quete normale
 * (killEnemies / obtainItem / defeatBoss) posee sur un PNJ precis ; la chaine
 * avance toute seule a chaque remise. Une chaine d'UNE seule etape est une
 * simple quete personnalisee.
 *
 * Champs d'une etape :
 * - at: { depth, npcIndex }        PNJ du serveur (doit exister a cet etage)
 *   ou { depth, spawn: true, slot } PNJ cree par la chaine elle-meme, place
 *   pres du point d'arrivee de l'etage (aucune dependance au serveur).
 *   `slot` (0, 1, 2...) distingue plusieurs PNJ de chaine sur un meme etage ;
 *   deux etapes du MEME pnj utilisent le meme slot.
 * - lead: texte de la piste du journal (si l'etape est chez un AUTRE pnj)
 * - questId: "killEnemies" | "obtainItem" | "defeatBoss"
 * - killEnemies : target, targetEnemyType (type ou id de famille)
 * - obtainItem  : targetItemId, targetQuantity (objet pris dans l'inventaire)
 * - defeatBoss  : targetBossDepth, targetBossType
 * - xpReward, goldReward, itemReward: { itemId, quantity } (tous optionnels)
 * - recipeReward: id d'une recette a debloquer, recipeName: nom affiche
 * - dialogText: { offer, progress, complete, after } (optionnels)
 *   complete = dit lors de la remise ; after = dit aux visites suivantes.
 */

/**
 * PNJ recurrents des chaines : meme nom et meme sprite a tous les etages.
 * `sprite` = une cle de SPRITE_REGISTRY commencant par "NPC_town".
 * Une etape s'y refere avec `npc: "marchand"`.
 */
export const CHAIN_NPCS = {
  marchand: { name: "Aldric le marchand", sprite: "NPC_town1_M1" }, // remplace par une vraie cle de ton registre
  forgeron: { name: "Brenn le forgeron", sprite: "NPC_town1_M2" },
  soeurMarchand: { name: "Elise la sœur du marchand", sprite: "NPC_town1_F1" },
};

export const QUEST_CHAINS = {
  // EXEMPLE a adapter (etage 10, deux pnj de la ville)
  oldTrader: {
    id: "oldTrader",
    name: "Le marchand ruiné",
    steps: [
      {
        at: { depth: 3, spawn: true, slot: 0 },
        npc: "marchand",
        questId: "killEnemies",
        target: 5,
        targetEnemyType: "greenSlime",
        xpReward: 40,
        goldReward: 30,
        dialogText: {
          offer:
            "Des blobs verts ont saccagé ma réserve... Peux-tu m'en débarrasser ? 5 suffiront.",
          complete: "Merci ! Va voir ma sœur, elle a besoin d'aide aussi.",
        },
      },
      {
        at: { depth: 4, spawn: true, slot: 0 },
        npc: "soeurMarchand",
        lead: "Va voir la sœur du marchand, elle a besoin d'aide.",
        questId: "obtainItem",
        targetItemId: "healthPotion",
        targetQuantity: 1,
        xpReward: 50,
        goldReward: 40,
        dialogText: {
          offer:
            "Mon frère t'a envoyé ? Il me faudrait 1 potion de soin pour le remettre sur pied.",
          complete: "Retourne le voir, il t'attend.",
          after:
            "Merci encore pour les potions. Mon frère a de la chance de t'avoir rencontré.",
        },
      },
      {
        at: { depth: 3, spawn: true, slot: 0 },
        npc: "marchand",
        lead: "Retourne voir le marchand, il t'attend.",
        questId: "obtainItem",
        targetItemId: "alricMerchandise",
        targetQuantity: 6,
        lootFrom: { enemyType: "greenSlime", chance: 0.75 },
        xpReward: 80,
        goldReward: 60,
        itemReward: { itemId: "healthPotion", quantity: 3 },
        dialogText: {
          offer:
            "Ma sœur m'a tout dit. Les blobs verts ont emporté ce que leur voracité n'avait pas saccagé. Rapporte-moi 6 caisses de marchandise, c'est tout ce qu'il me reste.",
          progress:
            "Les blobs ont dû en emporter un peu partout... Il me faut encore de la marchandise.",
          ready:
            "Tu as tout retrouvé ! Donne-moi ça, que je voie si ma marchandise est en bon état.",
          complete: "Je suis sauvé grâce à toi ! Voilà ma dernière récompense.",
          after: "Merci encore pour ton aide !",
        },
      },
    ],
  },
  copperSmith: {
    id: "copperSmith",
    name: "Le forgeron en manque",
    steps: [
      {
        at: { depth: 1, spawn: true, slot: 0 },
        npc: "forgeron",
        questId: "obtainItem",
        targetItemId: "steelPickaxeBrenn",
        targetQuantity: 1,
        lootFrom: { enemyType: "greenSlime", chance: 0.5 },
        xpReward: 20,
        goldReward: 0,
        itemReward: { itemId: "woodenPickaxe", quantity: 1 },
        dialogText: {
          offer:
            "Un blob vert rôde dans les parages. Il m'a volé ma pioche. Peux-tu t'en occuper ?",
          progress: "As-tu retrouvé ma pioche ?",
          ready: "Ma pioche ! Tu l'as retrouvée !",
          complete:
            "Merci de m'avoir rapporté ma pioche. \nJe vais pouvoir commencer à miner de nouveau filon.  \nTiens prends ma pioche d'apprenti en récompense, \nelle te permettra de récupérer du minerai de cuivre et du charbon. \nReviens me voir si tu as besoin d'aide.",
        },
      },
      {
        at: { depth: 1, spawn: true, slot: 0 }, // ou { depth: 1, spawn: true, slot: 0 } pour un pnj cree par la chaine
        npc: "forgeron",
        lead: "retourne voir le forgeron, il as une nouvelle tâche pour toi.",
        questId: "obtainItem",
        targetItemId: "copperOre",
        targetQuantity: 6,
        xpReward: 30,
        goldReward: 0,
        recipeReward: "copperIngotRecipe",
        recipeName: "Recette de lingot de cuivre",
        dialogText: {
          offer:
            "Il me faudrait 6 minerais de cuivre. Equipe toi de ta pioche et rapporte-les-moi et je te montrerai comment les fondre.",
          after:
            "Avec un peu de pratique et en appuyant sur 'G', tu fondras tes propres lingots.",
        },
      },
    ],
  },
};

const CHAIN_NPC_INDEX_BASE = 200; // indices reserves aux pnj crees par une chaine

/** npcIndex reel d'une etape : celui du serveur, ou un index reserve (spawn). */
export function resolveStepNpcIndex(step) {
  return step.at.spawn
    ? CHAIN_NPC_INDEX_BASE + (step.at.slot || 0)
    : step.at.npcIndex;
}

// case de sol (3 a 8 cases du point d'arrivee du heros) pour un pnj de chaine
function pickChainNpcSpot(scene, npcIndex) {
  const grid = scene.fogGrid;
  const from = scene.lastPlayerTile;
  if (!grid || !from) return null;
  const rng = createRng(`${scene.currentSeed}-chain-npc-${npcIndex}`);
  const candidates = [];
  const minY = Math.max(0, from.y - 8);
  const maxY = Math.min(grid.length - 1, from.y + 8);
  const minX = Math.max(0, from.x - 8);
  const maxX = Math.min(grid[0].length - 1, from.x + 8);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = Math.hypot(x - from.x, y - from.y);
      if (grid[y][x] === 0 && d >= 3 && d <= 8) candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

function buildChainQuest(chain, stepIndex) {
  const step = chain.steps[stepIndex];
  const castNpc = step.npc ? CHAIN_NPCS[step.npc] : null;
  return {
    npcSpriteKey: castNpc ? castNpc.sprite : null,
    npcName: castNpc ? castNpc.name : null,
    questId: step.questId,
    target: step.target,
    targetEnemyType: step.targetEnemyType,
    targetItemId: step.targetItemId,
    targetQuantity: step.targetQuantity,
    targetBossDepth: step.targetBossDepth,
    targetBossType: step.targetBossType,
    xpReward: step.xpReward || 0,
    goldReward: step.goldReward || 0,
    itemReward: step.itemReward || null,
    recipeReward: step.recipeReward || null,
    recipeName: step.recipeName || null,
    lootFrom: step.lootFrom || null,
    dialogText: step.dialogText || null,
    isBossItem: false, // evite le rattrapage de save.js (isBossItem === undefined)
    accepted: false,
    completed: false,
    killCount: 0,
    bossDefeated: false,
    chainId: chain.id,
    chainName: chain.name,
    chainStep: stepIndex,
    chainStepCount: chain.steps.length,
  };
}

export function getChainTargetKeys(scene) {
  const keys = new Set();
  const chains = scene.questChains || {};
  for (const [chainId, chain] of Object.entries(QUEST_CHAINS)) {
    const state = chains[chainId] || { step: 0, done: false };
    if (state.done) continue;
    const step = chain.steps[state.step];
    if (!step || step.at.depth !== scene.currentDepth) continue;
    keys.add(`${step.at.depth}-${resolveStepNpcIndex(step)}`);
  }
  return keys;
}

/**
 * Vrai si l'etape en cours d'une chaine doit faire apparaitre un pnj "spawn"
 * sur l'etage courant (cf. levelLoader : createQuestNpcs doit alors etre
 * appele meme si le serveur n'a genere aucun pnj a quetes ici).
 */
export function chainNeedsSpawnNpc(scene) {
  const chains = scene.questChains || {};
  for (const [chainId, chain] of Object.entries(QUEST_CHAINS)) {
    const state = chains[chainId] || { step: 0, done: false };
    if (state.done) continue;
    const step = chain.steps[state.step];
    if (step && step.at.spawn && step.at.depth === scene.currentDepth)
      return true;
  }
  return false;
}

/**
 * Pose, sur les PNJ de l'etage courant, l'etape en cours de chaque chaine.
 * npcIndices = indices (npcIndex) des PNJ presents sur cet etage.
 */
export function installChainQuests(scene, npcIndices) {
  if (!scene.questChains) scene.questChains = {};
  for (const chain of Object.values(QUEST_CHAINS)) {
    const state =
      scene.questChains[chain.id] ||
      (scene.questChains[chain.id] = { step: 0, done: false });
    if (state.done) continue;
    const step = chain.steps[state.step];

    if (!step || step.at.depth !== scene.currentDepth) continue;
    const stepNpcIndex = resolveStepNpcIndex(step);
    // un pnj "spawn" est cree par la chaine elle-meme : il n'a pas besoin
    // d'exister cote serveur
    if (!step.at.spawn && !npcIndices.includes(stepNpcIndex)) continue;

    const key = `${step.at.depth}-${stepNpcIndex}`;
    const existing = scene.quests[key];
    const keptPos = existing && existing.extraPos ? existing.extraPos : null;
    if (existing && existing.role && existing.chainId) {
      // quete d'escorte/sauvetage contaminee par des champs de chaine : on les retire
      delete existing.chainId;
      delete existing.chainName;
      delete existing.chainStep;
      delete existing.chainStepCount;
    }
    if (existing) {
      if (existing.chainId === chain.id && existing.chainStep === state.step)
        continue; // deja posee
      const done = existing.completed || existing.failed;
      // un pnj encore engage dans une livraison/escorte/sauvetage EN COURS
      // n'est jamais ecrase ; une quete deja TERMINEE (meme livraison/escorte)
      // est archivee et le pnj est libre
      const isPendingRescueOffer =
        existing.role === "giver" && !existing.accepted && !done;
      const freeOffer =
        !existing.accepted &&
        !done &&
        !existing.chainId &&
        (!existing.role || isPendingRescueOffer);
      if (!done && !freeOffer) continue;
      if (done) {
        // archive la quete terminee pour qu'elle reste dans le journal
        // (sans extraPos : l'archive ne doit jamais refaire apparaitre un pnj)
        let n = 0;
        while (scene.quests[`${key}~${n}`]) n++;
        const { extraPos, ...archived } = existing;
        scene.quests[`${key}~${n}`] = archived;
      }
    }
    const built = buildChainQuest(chain, state.step);
    if (step.at.spawn) {
      // position du pnj : conservee d'une etape a l'autre, sinon tiree ici
      built.extraPos = keptPos || pickChainNpcSpot(scene, stepNpcIndex);
      if (!built.extraPos) continue; // pas de case valable pour l'instant
    }
    scene.quests[key] = built;
  }
  syncChainLeads(scene);
}

/**
 * Entrees "piste" du journal : quand l'etape suivante d'une chaine est chez
 * un AUTRE pnj, une quete "chainLead" (rangee a l'etage de ce pnj) indique
 * ou aller. Retiree des que l'etape est acceptee, ou si la chaine avance /
 * se termine. Auto-reparatrice : recree la piste si elle manque.
 */
function syncChainLeads(scene) {
  let changed = false;
  for (const chain of Object.values(QUEST_CHAINS)) {
    const state = scene.questChains[chain.id];
    if (!state) continue;

    // pistes obsoletes de cette chaine
    for (const k of Object.keys(scene.quests)) {
      const q = scene.quests[k];
      if (
        q.questId === "chainLead" &&
        q.chainId === chain.id &&
        (state.done || q.chainStep !== state.step)
      ) {
        delete scene.quests[k];
        changed = true;
      }
    }
    if (state.done || state.step === 0) continue;

    const next = chain.steps[state.step];
    const prev = chain.steps[state.step - 1];
    if (!next || !prev) continue;
    const sameNpc =
      next.at.depth === prev.at.depth &&
      resolveStepNpcIndex(next) === resolveStepNpcIndex(prev);
    // le meme pnj enchaine directement : pas de piste, SAUF si l'etape
    // definit explicitement un `lead` (texte voulu dans le journal)
    if (sameNpc && !next.lead) continue;

    const key = `${next.at.depth}-${resolveStepNpcIndex(next)}`;
    const leadKey = `${key}~lead`;
    const stepQuest = scene.quests[key];
    const accepted =
      stepQuest &&
      stepQuest.chainId === chain.id &&
      stepQuest.chainStep === state.step &&
      stepQuest.accepted;

    if (accepted) {
      if (scene.quests[leadKey]) {
        delete scene.quests[leadKey];
        changed = true;
      }
      continue;
    }
    if (!scene.quests[leadKey]) {
      scene.quests[leadKey] = {
        questId: "chainLead",
        accepted: true,
        completed: false,
        failed: false,
        chainId: chain.id,
        chainName: chain.name,
        chainStep: state.step,
        chainStepCount: chain.steps.length,
        leadText:
          next.lead || `Parler à un habitant de l'étage ${next.at.depth}`,
      };
      changed = true;
    }
  }
  if (changed) scene.events.emit("quests-updated", { ...scene.quests });
}

/** A appeler apres la remise d'une etape de chaine (cf. quests.turnInQuest). */
export function advanceQuestChain(scene, qs) {
  const chain = QUEST_CHAINS[qs.chainId];
  const state = scene.questChains && scene.questChains[qs.chainId];
  if (!chain || !state || state.step !== qs.chainStep) return;

  state.step += 1;
  if (state.step >= chain.steps.length) {
    state.done = true;
    scene.showLootToast(`Chaîne de quêtes terminée : ${chain.name}`);
  }
  // pose l'etape suivante (si ce pnj est sur l'etage) et met a jour les pistes
  installChainQuests(
    scene,
    (scene.questNpcs || []).map((n) => n.npcIndex),
  );
  scene.events.emit("quests-updated", { ...scene.quests });
  scene.persistProgress();
}

/**
 * Etape de chaine qui attend CE pnj sur l'etage courant (sinon null) -
 * sert a afficher le "!" au-dessus d'un pnj dont la prochaine etape n'est
 * pas encore posee (elle ne l'est qu'a l'ouverture du dialogue, cf.
 * installChainQuests), et son nom (CHAIN_NPCS).
 */
export function getPendingChainStepFor(scene, npcIndex) {
  for (const chain of Object.values(QUEST_CHAINS)) {
    const state = (scene.questChains && scene.questChains[chain.id]) || {
      step: 0,
      done: false,
    };
    if (state.done) continue;
    const step = chain.steps[state.step];
    if (!step || step.at.depth !== scene.currentDepth) continue;
    if (resolveStepNpcIndex(step) !== npcIndex) continue;
    const npcDef = step.npc ? CHAIN_NPCS[step.npc] : null;
    return { name: npcDef ? npcDef.name : null };
  }
  return null;
}
