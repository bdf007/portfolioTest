import Phaser from "phaser";
import { createRng } from "../rng";
import { hasClearLineOfSight } from "../fogOfWar";
import { createEnemyBehavior, decideNextState } from "../enemyBehavior";
import {
  computeDamage,
  applyElementalResistance,
  createCooldown,
  applyDiceVariance,
} from "../combat";
import { resolveEnemySprite } from "../spriteRegistry";
import { WALL } from "./floorRenderer";
import {
  rollStatusEffect,
  applyStatusEffect,
  getEffectiveEnemySpeed,
  getEffectiveEnemyDamage,
  getEffectivePlayerDefense,
} from "./statusEffects";
import { resolveAllEquippedReactiveEffectSources } from "../gemSockets";
import { triggerAbilityEffect } from "./abilities";

import {
  TILE_SIZE,
  ENEMY_ATTACK_COOLDOWN,
  ATTACK_ANIM_DURATION_MS,
  PROJECTILE_RADIUS,
  ENEMY_RANGED_STOP_DISTANCE,
  ENEMY_RANGED_ATTACK_RANGE,
  ENEMY_PROJECTILE_SPEED,
  ENEMY_PROJECTILE_MAX_DISTANCE,
} from "./gameConstants";

const DETECTION_BEHIND_DOT_THRESHOLD = -0.5;
const ENEMY_DIR_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const ENEMY_STOP_DISTANCE = 28;
const ENEMY_RANGED_RETREAT_DISTANCE = 100;
const ENEMY_ATTACK_RANGE = 34;

const ENEMY_STUCK_TELEPORT_MIN_DIST = 140;
const ENEMY_STUCK_TELEPORT_MAX_DIST = 220;
const ENEMY_STUCK_TELEPORT_MIN_TILES = Math.round(
  ENEMY_STUCK_TELEPORT_MIN_DIST / TILE_SIZE,
);
const ENEMY_STUCK_TELEPORT_MAX_TILES = Math.round(
  ENEMY_STUCK_TELEPORT_MAX_DIST / TILE_SIZE,
);

/**
 * Declenche les gemmes REACTIVES de tout l'equipement porte (hasteGem/
 * repelGem, et les gemmes "d'ability" comme parryGem/riposteGem, cf.
 * itemDefs.js et resolveAllEquippedReactiveEffectSources dans
 * gemSockets.js) quand le JOUEUR encaisse un coup d'un ennemi - appelee
 * juste apres avoir applique les degats au joueur, jamais pour un coup
 * subi par une invocation (resolveTarget.isSummon). `attackerEnemy` est
 * l'ennemi a repousser pour une gemme "repel" - null pour une attaque a
 * distance (le projectile ne garde pas de reference vers l'ennemi qui l'a
 * tire, cf. updateEnemyProjectiles), auquel cas seuls les effets qui ne
 * ciblent pas l'ennemi (haste, ability) peuvent se declencher.
 */
function applyReactiveGemEffects(scene, attackerEnemy) {
  const sources = resolveAllEquippedReactiveEffectSources(scene);
  for (const gemDef of sources) {
    const effect = gemDef.reactiveEffect;
    if (Math.random() >= (effect.chance || 0)) continue;

    if (effect.kind === "modifier") {
      applyStatusEffect(scene, scene.playerStatusEffects, {
        type: effect.type,
        kind: "modifier",
        statModifiers: effect.statModifiers,
        durationMs: effect.durationMs,
      });
    } else if (effect.kind === "knockback" && attackerEnemy) {
      const dx = attackerEnemy.sprite.x - scene.hero.x;
      const dy = attackerEnemy.sprite.y - scene.hero.y;
      const dist = Math.hypot(dx, dy) || 1;
      scene.knockbackEnemyIfClear(
        attackerEnemy,
        (dx / dist) * effect.distance,
        (dy / dist) * effect.distance,
      );
    } else if (effect.kind === "ability" && effect.abilityId) {
      // Gemmes "reactives d'ability" (ex: gemme de parade -> ability
      // parry) : regulees par leur propre cooldown de gemme
      // (reactiveEffect.cooldownMs, independant du cooldown normal de
      // l'ability), et declenchees via triggerAbilityEffect qui
      // contourne le deblocage/cout/cooldown habituels de l'ability -
      // cf. abilities.js.
      const readyAt = scene.reactiveGemCooldowns[gemDef.id] || 0;
      if (scene.time.now < readyAt) continue;
      const handled = triggerAbilityEffect(scene, effect.abilityId);
      if (handled && effect.cooldownMs) {
        scene.reactiveGemCooldowns[gemDef.id] =
          scene.time.now + effect.cooldownMs;
      }
    }
  }
}

/**
 * Cherche une case praticable "a portee mais pas au contact" de
 * (targetX, targetY), via un parcours en largeur (BFS) borne sur la
 * grille plutot qu'une ligne droite - indispensable pour un niveau
 * labyrinthe : une ligne de vue degagee y est presque toujours bloquee
 * par une cloison meme a quelques cases, alors que le BFS suit les
 * VRAIS couloirs (comme le ferait le pathfinding) et garantit donc que
 * la case retenue est reellement accessible a pied depuis la cible,
 * jamais de l'autre cote d'une poche separee (ex: salle de boss/salle
 * secrete, les seules vraies poches isolees du jeu).
 *
 * Utilisee par le filet de securite anti-softlock d'updateEnemyMovement
 * (ennemi bloque depuis trop longtemps) a la place de l'ancien
 * comportement "+-40px autour du heros", qui l'envoyait quasi au contact
 * immediat - source de l'encerclement brutal signale par plusieurs
 * ennemis bloques en meme temps (frequent, ils se bloquent souvent ENTRE
 * EUX) tous teleportes a la suite pres du heros.
 *
 * Renvoie null si aucune case dans la fourchette de distance n'est
 * atteignable (coin tres encombre / cul-de-sac), auquel cas l'appelant
 * retente au cycle suivant plutot que de teleporter au hasard dans une
 * poche potentiellement separee.
 */
function findEnemyTeleportSpot(scene, targetX, targetY) {
  const grid = scene.fogGrid;
  const width = grid[0].length;
  const height = grid.length;
  const targetTileX = Math.floor(targetX / TILE_SIZE);
  const targetTileY = Math.floor(targetY / TILE_SIZE);
  if (
    targetTileY < 0 ||
    targetTileY >= height ||
    targetTileX < 0 ||
    targetTileX >= width ||
    grid[targetTileY][targetTileX] === WALL
  ) {
    return null;
  }

  const visited = new Set([`${targetTileX},${targetTileY}`]);
  const queue = [{ x: targetTileX, y: targetTileY, dist: 0 }];
  const candidates = [];
  const MAX_VISITED = 600; // garde-fou perf sur une tres grande zone ouverte

  while (queue.length > 0 && visited.size < MAX_VISITED) {
    const { x, y, dist } = queue.shift();
    if (
      dist >= ENEMY_STUCK_TELEPORT_MIN_TILES &&
      dist <= ENEMY_STUCK_TELEPORT_MAX_TILES
    ) {
      candidates.push({ x, y });
    }
    if (dist >= ENEMY_STUCK_TELEPORT_MAX_TILES) continue;

    const neighbours = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of neighbours) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key) || grid[ny][nx] === WALL) continue;
      visited.add(key);
      queue.push({ x: nx, y: ny, dist: dist + 1 });
    }
  }

  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    x: pick.x * TILE_SIZE + TILE_SIZE / 2,
    y: pick.y * TILE_SIZE + TILE_SIZE / 2,
  };
}

/**
 * Choisit une case de sol au hasard a portee de `home` pour l'etat
 * "wander" (errance libre, cf. enemyBehavior.js) - contrairement a
 * pickPatrolRoute (qui calcule UNE SEULE fois un aller-retour fixe a la
 * creation de l'ennemi), celle-ci est appelee a repetition (toutes les
 * ENEMY_WANDER_MIN/MAX_INTERVAL) pour tirer une nouvelle destination a
 * chaque fois, donnant un trajet imprevisible plutot qu'une navette
 * reguliere. Pas de verification d'accessibilite reelle (contrairement a
 * findEnemyTeleportSpot) : une case isolee tiree par malchance fera
 * simplement echouer le pathfinding (scene.requestPath renverra null),
 * l'ennemi restera immobile jusqu'au prochain tirage - degradation sans
 * consequence, l'erreur se corrige seule au cycle suivant.
 */
function pickRandomWanderSpot(scene, home, radius) {
  const grid = scene.fogGrid;
  const width = grid[0].length;
  const height = grid.length;

  for (let attempt = 0; attempt < 10; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 2 + Math.random() * Math.max(0, radius - 2);
    const x = Math.round(home.x + Math.cos(angle) * dist);
    const y = Math.round(home.y + Math.sin(angle) * dist);
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    if (grid[y][x] === WALL) continue;
    return {
      x: x * TILE_SIZE + TILE_SIZE / 2,
      y: y * TILE_SIZE + TILE_SIZE / 2,
    };
  }
  return null;
}

export function isPlayerBehindEnemy(
  scene,
  enemy,
  ex,
  ey,
  playerTileX,
  playerTileY,
) {
  const facing = ENEMY_DIR_VECTORS[enemy.lastDir] || ENEMY_DIR_VECTORS.down;
  const dx = playerTileX - ex;
  const dy = playerTileY - ey;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return false;
  const dot = (dx / dist) * facing.x + (dy / dist) * facing.y;
  return dot < DETECTION_BEHIND_DOT_THRESHOLD;
}

/**
 * Logique de decision pour UN SEUL ennemi (detection d'aggro, perte de
 * vue, retour au point de depart) - extraite de l'ancienne boucle de
 * updateEnemyDecisions pour pouvoir etre appelee de deux facons :
 *  - en masse sur tous les ennemis des que le JOUEUR change de case (cf.
 *    updateEnemyDecisions plus bas, appelee par MainScene.update) - la
 *    reaction la plus immediate possible a un deplacement du joueur ;
 *  - individuellement, en rythme de croisiere, depuis updateEnemyMovement
 *    (cf. ENEMY_DECISION_REFRESH_INTERVAL) - INDEPENDAMMENT des
 *    deplacements du joueur, pour qu'un ennemi en chasse/retour recoive
 *    regulierement une vraie decision/un vrai chemin EasyStar meme si le
 *    joueur reste totalement immobile. Avant cet ajout, un joueur statique
 *    privait tous les ennemis actifs de toute vraie mise a jour de
 *    pathfinding, laissant uniquement le filet de secours "bloque depuis
 *    1,5s" (cf. updateEnemyMovement) faire tout le travail - lequel finit
 *    par reconverger sur les memes points de blocage/teleportation en
 *    boucle au lieu de vraiment recalculer un chemin a jour.
 */
function updateSingleEnemyDecision(scene, enemy, playerTileX, playerTileY) {
  const grid = scene.fogGrid;
  const width = grid[0].length,
    height = grid.length;
  const isStealthed = scene.time.now < scene.stealthUntil;

  if (isStealthed && enemy.state !== "chase") return;

  const ex = Math.floor(enemy.sprite.x / TILE_SIZE);
  const ey = Math.floor(enemy.sprite.y / TILE_SIZE);

  if (ey < 0 || ey >= height || ex < 0 || ex >= width) {
    console.error(
      `[updateSingleEnemyDecision] ennemi hors limites ! isBoss=${enemy.isBoss} archetype=${enemy.archetype} ex=${ex} ey=${ey} (grille: ${width}x${height}) sprite.x=${enemy.sprite.x} sprite.y=${enemy.sprite.y}`,
    );
    return; // evite le plantage en attendant le vrai correctif
  }

  let targetTileX = playerTileX;
  let targetTileY = playerTileY;
  let targetType = "player";
  let targetRef = null;
  let bestDist = Math.hypot(ex - playerTileX, ey - playerTileY);

  for (const summon of scene.summons) {
    const sx = Math.floor(summon.sprite.x / TILE_SIZE);
    const sy = Math.floor(summon.sprite.y / TILE_SIZE);
    const d = Math.hypot(ex - sx, ey - sy);
    if (d < bestDist) {
      bestDist = d;
      targetTileX = sx;
      targetTileY = sy;
      targetType = "summon";
      targetRef = summon;
    }
  }

  enemy.chaseTargetType = targetType;
  enemy.chaseTargetRef = targetRef;

  const distanceToPlayer = bestDist;
  const losClear = hasClearLineOfSight(
    grid,
    width,
    height,
    ex,
    ey,
    targetTileX,
    targetTileY,
  );
  const arrivedAtHome = Math.hypot(ex - enemy.home.x, ey - enemy.home.y) < 1;
  const isPlayerBehind =
    targetType === "player"
      ? isPlayerBehindEnemy(scene, enemy, ex, ey, playerTileX, playerTileY)
      : false;

  const nextState = decideNextState(enemy.state, {
    distanceToPlayer,
    losClear,
    aggroRadius: enemy.aggroRadius,
    arrivedAtHome,
    isPlayerBehind,
  });

  if (nextState === "home") {
    enemy.state = enemy.type;
    enemy.patrolIndex = 0;
    enemy.patrolDirection = 1;
    enemy.path = null;
    enemy.nextDecisionRefreshAt = null;
    return;
  }

  enemy.state = nextState;

  if (nextState === "chase") {
    scene.requestPath(
      enemy.sprite.x,
      enemy.sprite.y,
      targetTileX * TILE_SIZE + TILE_SIZE / 2,
      targetTileY * TILE_SIZE + TILE_SIZE / 2,
      (path) => {
        enemy.path = path;
        enemy.pathIndex = 0;
      },
    );
  } else if (nextState === "returning") {
    scene.requestPath(
      enemy.sprite.x,
      enemy.sprite.y,
      enemy.home.x * TILE_SIZE + TILE_SIZE / 2,
      enemy.home.y * TILE_SIZE + TILE_SIZE / 2,
      (path) => {
        enemy.path = path;
        enemy.pathIndex = 0;
      },
    );
  }
}

export function updateEnemyDecisions(scene, playerTileX, playerTileY) {
  for (const enemy of scene.enemies) {
    updateSingleEnemyDecision(scene, enemy, playerTileX, playerTileY);
  }
}

export function updateEnemyMovement(scene) {
  const ENEMY_STUCK_CHECK_INTERVAL = 500;
  const ENEMY_STUCK_MOVE_THRESHOLD = 10;
  const ENEMY_STUCK_JITTER_STREAK = 3; // ~1.5s de blocage continu
  const ENEMY_STUCK_JITTER_SPEED = 90;
  const ENEMY_STUCK_TELEPORT_JITTER_ATTEMPTS = 3; // ~4-5s de blocage malgre plusieurs jitter+repath
  const ENEMY_STUCK_TELEPORT_GLOBAL_COOLDOWN = 1200; // espace les teleportations d'urgence entre tous les ennemis
  const ENEMY_DECISION_REFRESH_INTERVAL = 800; // rafraichissement de decision/chemin independant des deplacements du joueur, cf. commentaire plus bas
  const ENEMY_WANDER_MIN_INTERVAL = 3000; // frequence de tirage d'une nouvelle destination pour l'etat "wander"
  const ENEMY_WANDER_MAX_INTERVAL = 5000;
  const ENEMY_WANDER_RADIUS = 10; // portee autour de home pour le tirage

  for (const enemy of scene.enemies) {
    enemy.visible = scene.isEnemyVisible(enemy);
    enemy.sprite.setVisible(enemy.visible);
    if (enemy.visualEmitter) {
      enemy.visualEmitter.setPosition(enemy.sprite.x, enemy.sprite.y - 30);
      enemy.visualEmitter.setVisible(enemy.visible);
    }
    if (scene.time.now < (enemy.attackAnimUntil || 0)) {
      continue;
    }

    if (scene.isEnemyStunned(enemy) || scene.isEnemyRooted(enemy)) {
      enemy.sprite.setVelocity(0, 0);
      enemy.sprite.anims.play(enemy.spriteKey + "-idle-" + enemy.lastDir, true);
      continue;
    }

    // Detection d'aggro periodique pour les ennemis PAS encore en
    // chase/returning (patrouille, garde, sommeil...), independante des
    // deplacements du joueur - meme principe que le rafraichissement de
    // chemin des ennemis actifs plus bas, mais ici c'est la decision
    // COMPLETE (decideNextState, y compris la detection d'aggro) qui doit
    // tourner, puisque c'est elle qui decide qu'un ennemi en patrouille
    // vient de te reperer. Sans ca, un ennemi pouvait te croiser (ou te
    // marcher dessus) indefiniment sans jamais t'aggro tant que TOI tu ne
    // changeais pas de case. Contrairement au rafraichissement des
    // ennemis en chase (volontairement limite au chemin, cf. plus bas),
    // rappeler la decision complete ici ne risque aucun "de-aggro
    // premature" : il n'y a encore rien a annuler, on ne fait QUE
    // detecter un nouvel aggro.
    if (enemy.state !== "chase" && enemy.state !== "returning") {
      const patrolDecisionNow = scene.time.now;
      if (
        !enemy.nextDecisionRefreshAt ||
        patrolDecisionNow >= enemy.nextDecisionRefreshAt
      ) {
        enemy.nextDecisionRefreshAt =
          patrolDecisionNow + ENEMY_DECISION_REFRESH_INTERVAL;
        const playerTileX = Math.floor(scene.hero.x / TILE_SIZE);
        const playerTileY = Math.floor(scene.hero.y / TILE_SIZE);
        updateSingleEnemyDecision(scene, enemy, playerTileX, playerTileY);
      }
    }

    if (enemy.state === "returning") {
      const homeX = enemy.home.x * TILE_SIZE + TILE_SIZE / 2;
      const homeY = enemy.home.y * TILE_SIZE + TILE_SIZE / 2;
      const distToHome = Math.hypot(
        homeX - enemy.sprite.x,
        homeY - enemy.sprite.y,
      );
      if (distToHome < ENEMY_STOP_DISTANCE) {
        // Arrive chez lui : reprend sa patrouille tout de suite, sans
        // attendre qu'updateEnemyDecisions s'en charge - cette fonction
        // ne tourne que quand le JOUEUR change de case (cf. plus bas),
        // donc si le joueur reste cache/immobile, cette transition
        // n'arrivait jamais. L'ennemi restait alors immobile (objectif
        // atteint, rien a faire) a cote de son point de depart, et la
        // detection de blocage juste en dessous prenait cette immobilite
        // NORMALE pour un vrai blocage geometrique : au bout de quelques
        // cycles elle le teleportait, il revenait a pied, se re-arretait
        // chez lui en attendant la meme transition qui ne venait
        // toujours pas, et ainsi de suite - boucle teleport/retour sans
        // fin. En gerant la transition ici, independamment du joueur,
        // l'ennemi reprend sa patrouille immediatement et ne reste
        // jamais assez longtemps immobile pour etre pris pour "bloque".
        enemy.state = enemy.type;
        enemy.patrolIndex = 0;
        enemy.patrolDirection = 1;
        enemy.path = null;
        enemy.pathIndex = 0;
        enemy.stuckStreak = 0;
        enemy.stuckJitterAttempts = 0;
        enemy.stuckCheckPos = null;
        enemy.nextDecisionRefreshAt = null;
        enemy.sprite.setVelocity(0, 0);
        enemy.sprite.anims.play(
          enemy.spriteKey + "-idle-" + enemy.lastDir,
          true,
        );
        continue;
      }
    }

    if (enemy.state === "chase" || enemy.state === "returning") {
      let targetType = enemy.chaseTargetType;
      let targetRef = enemy.chaseTargetRef;
      if (
        targetType === "summon" &&
        (!targetRef || !scene.summons.includes(targetRef))
      ) {
        targetType = "player";
        targetRef = null;
      }
      const targetX =
        targetType === "summon" ? targetRef.sprite.x : scene.hero.x;
      const targetY =
        targetType === "summon" ? targetRef.sprite.y : scene.hero.y;

      // Rafraichissement de CHEMIN periodique, INDEPENDANT des
      // deplacements du joueur. Sans ca, un joueur totalement immobile
      // pouvait priver un ennemi actif de toute vraie mise a jour de
      // pathfinding pendant un temps illimite, laissant le filet de
      // secours "bloque depuis 1,5s" faire tout le travail et reconverger
      // en boucle sur les memes points de blocage/teleportation.
      // Volontairement limite a un simple requestPath vers la cible
      // courante (le heros/summon en chase, enemy.home en returning) -
      // SANS jamais rappeler decideNextState ici. Une premiere version
      // rappelait toute la decision (aggro/de-aggro inclus), mais ca
      // faisait abandonner la chasse en cours de route : un ennemi aggro
      // par un tir a distance part forcement de plus loin que
      // aggroRadius (c'est le principe meme d'attaquer a distance), donc
      // la reevaluation finissait tot ou tard par le desaggroer avant
      // meme qu'il ait eu le temps de te rejoindre. La decision
      // d'aggro/de-aggro reste donc uniquement geree par
      // updateEnemyDecisions (declenchee par tes deplacements) et par la
      // sortie "returning -> patrol" geree juste au-dessus quand il est
      // reellement arrive chez lui - ici on ne fait QUE garder le chemin
      // a jour, jamais changer l'etat.
      const decisionNow = scene.time.now;
      if (!enemy.nextDecisionRefreshAt) {
        enemy.nextDecisionRefreshAt =
          decisionNow + ENEMY_DECISION_REFRESH_INTERVAL;
      } else if (decisionNow >= enemy.nextDecisionRefreshAt) {
        enemy.nextDecisionRefreshAt =
          decisionNow + ENEMY_DECISION_REFRESH_INTERVAL;
        const repathDestX =
          enemy.state === "returning"
            ? enemy.home.x * TILE_SIZE + TILE_SIZE / 2
            : targetX;
        const repathDestY =
          enemy.state === "returning"
            ? enemy.home.y * TILE_SIZE + TILE_SIZE / 2
            : targetY;
        scene.requestPath(
          enemy.sprite.x,
          enemy.sprite.y,
          repathDestX,
          repathDestY,
          (path) => {
            enemy.path = path;
            enemy.pathIndex = 0;
          },
        );
      }

      const distToTarget = Math.hypot(
        targetX - enemy.sprite.x,
        targetY - enemy.sprite.y,
      );
      const isRanged = enemy.attackType === "ranged";
      const stopDistance = isRanged
        ? ENEMY_RANGED_STOP_DISTANCE
        : ENEMY_STOP_DISTANCE;
      const stopForMelee =
        enemy.state === "chase" && distToTarget < stopDistance;

      // targetX/targetY pointent TOUJOURS sur le heros/summon (voir plus
      // haut), y compris en etat "returning" - ce qui est volontaire pour
      // le calcul de distToTarget (detection de re-aggro) mais PAS pour un
      // rechemin de secours : un ennemi bloque en train de RENTRER chez
      // lui doit etre redirige vers enemy.home, jamais vers le heros
      // (sinon il repart droit sur le joueur au lieu de rentrer, et comme
      // "returning" n'a ni stopForMelee ni logique d'attaque, il reste
      // juste colle contre le heros a pousser indefiniment - boucle de
      // blocage/teleportation sans fin). repathTargetX/Y ci-dessous sont
      // la VRAIE destination courante de l'ennemi, utilises uniquement
      // par le filet de securite anti-blocage plus bas (rechemin +
      // teleportation), jamais par la detection de re-aggro.
      const repathTargetX =
        enemy.state === "returning"
          ? enemy.home.x * TILE_SIZE + TILE_SIZE / 2
          : targetX;
      const repathTargetY =
        enemy.state === "returning"
          ? enemy.home.y * TILE_SIZE + TILE_SIZE / 2
          : targetY;

      if (
        enemy.state === "chase" &&
        isRanged &&
        distToTarget < ENEMY_RANGED_RETREAT_DISTANCE
      ) {
        const dx = enemy.sprite.x - targetX;
        const dy = enemy.sprite.y - targetY;
        const mag = Math.hypot(dx, dy) || 1;
        const speed = getEffectiveEnemySpeed(enemy);
        const vx = (dx / mag) * speed;
        const vy = (dy / mag) * speed;

        // Le recul est un setVelocity brut, sans jamais consulter la
        // grille de pathfinding contrairement au chase normal
        // (followPathStep) - un ranged acculé dans un coin reculait donc
        // droit dans le mur a chaque frame. Sur un couloir etroit / un
        // angle de mur, ca suffit a le faire clipper a travers la
        // geometrie (tunneling Arcade si un pic de delta fait depasser
        // la case en une frame, ou glissement le long de deux colliders
        // qui se resolvent l'un contre l'autre a un coin). On verifie
        // donc la case visee avant de reculer dedans ; si c'est un mur,
        // on ne recule pas cette frame-la (on tombera dans le
        // stopForMelee / path-follow normal juste en dessous).
        const lookaheadX = enemy.sprite.x + (vx / speed) * TILE_SIZE;
        const lookaheadY = enemy.sprite.y + (vy / speed) * TILE_SIZE;
        const retreatTileX = Math.floor(lookaheadX / TILE_SIZE);
        const retreatTileY = Math.floor(lookaheadY / TILE_SIZE);
        const grid = scene.fogGrid;
        const retreatOutOfBounds =
          retreatTileX < 0 ||
          retreatTileY < 0 ||
          retreatTileY >= grid.length ||
          retreatTileX >= grid[0].length;
        const retreatBlocked =
          retreatOutOfBounds || grid[retreatTileY][retreatTileX] === WALL;

        if (!retreatBlocked) {
          enemy.sprite.setVelocity(vx, vy);
          const edir =
            Math.abs(vx) > Math.abs(vy)
              ? vx > 0
                ? "right"
                : "left"
              : vy > 0
                ? "down"
                : "up";
          enemy.sprite.anims.play(enemy.spriteKey + "-walk-" + edir, true);
          enemy.lastDir = edir;
          continue;
        }
        // sinon : on ne "continue" pas, on retombe sur stopForMelee /
        // le path-follow ci-dessous, qui eux passent par la grille
      }

      if (stopForMelee) {
        enemy.sprite.setVelocity(0, 0);
        enemy.sprite.anims.play(
          enemy.spriteKey + "-idle-" + enemy.lastDir,
          true,
        );
        continue;
      }

      // Detection de blocage - meme principe que pour les invocations
      // (cf. updateSummons) : deux ennemis qui chassent la meme cible
      // peuvent se bloquer mutuellement via leurs colliders mutuels dans
      // un couloir/angle etroit, sans que EasyStar ne le detecte tout
      // seul. Comme updateEnemyDecisions ne relance un chemin QUE quand
      // le joueur change de case (raison de perf), un ennemi bloque
      // restait fige indefiniment si le joueur arretait de bouger -
      // transforme en cible fixe ("sitting duck"). Ici on relance le
      // chemin nous-memes des qu'un blocage est detecte, sans attendre.
      const now = scene.time.now;
      if (!enemy.stuckCheckPos) {
        enemy.stuckCheckPos = { x: enemy.sprite.x, y: enemy.sprite.y };
        enemy.stuckCheckAt = now;
        enemy.stuckStreak = 0;
        enemy.stuckJitterUntil = 0;
      }
      if (now >= enemy.stuckCheckAt + ENEMY_STUCK_CHECK_INTERVAL) {
        const movedDist = Math.hypot(
          enemy.sprite.x - enemy.stuckCheckPos.x,
          enemy.sprite.y - enemy.stuckCheckPos.y,
        );
        if (movedDist < ENEMY_STUCK_MOVE_THRESHOLD) {
          enemy.stuckStreak = (enemy.stuckStreak || 0) + 1;
          if (enemy.stuckStreak >= ENEMY_STUCK_JITTER_STREAK) {
            // updateEnemyDecisions (seule source normale de nouveaux
            // chemins pour le mode chase) ne tourne que quand le JOUEUR
            // change de case (perf, cf. MainScene.update) - si le
            // joueur reste immobile, un ennemi dont le chemin est
            // perime ou vide (ex: juste apres une teleportation
            // d'urgence, qui met enemy.path a null) n'en recevait donc
            // jamais de nouveau, et retombait bloque -> re-teleporte en
            // boucle toutes les ~4-5s indefiniment tant que le joueur
            // ne bougeait pas. On redemande ici nous-memes un chemin
            // frais a chaque cycle de blocage, independamment des
            // deplacements du joueur - stuckJitterUntil declenche en
            // prime le jitter visuel (vecteur aleatoire) le temps que
            // le nouveau chemin arrive.
            scene.requestPath(
              enemy.sprite.x,
              enemy.sprite.y,
              repathTargetX,
              repathTargetY,
              (path) => {
                enemy.path = path;
                enemy.pathIndex = 0;
              },
            );
            enemy.stuckJitterUntil = now + 300;
            enemy.stuckStreak = 0;

            // Filet de securite anti-softlock : le repath + jitter
            // suffit dans la grande majorite des cas, mais pas
            // toujours (ennemi vraiment coince dans la geometrie, clip
            // de collision...). On compte les cycles de blocage
            // consecutifs qui n'ont pas resolu le probleme malgre le
            // chemin frais ; au bout de ENEMY_STUCK_TELEPORT_JITTER_ATTEMPTS,
            // on teleporte l'ennemi pres de sa cible plutot que de le
            // laisser rebondir indefiniment contre la geometrie.
            // Critique devant une salle de boss : la porte reste
            // verrouillee tant que tous les ennemis ne sont pas
            // elimines, donc un ennemi injoignable = softlock garanti.
            enemy.stuckJitterAttempts = (enemy.stuckJitterAttempts || 0) + 1;
            if (
              enemy.stuckJitterAttempts >=
                ENEMY_STUCK_TELEPORT_JITTER_ATTEMPTS &&
              now >= (scene.nextEnemyTeleportAllowedAt || 0)
            ) {
              // Desormais inconditionnel (plus de condition de distance -
              // etre deja proche de la cible ne veut pas dire que ce n'est
              // QUE de la congestion, ca peut aussi etre un vrai blocage
              // contre un mur tout pres du heros). Ce n'est de toute facon
              // plus le filet de rattrapage principal : le redemande de
              // chemin juste au-dessus, a CHAQUE cycle de blocage,
              // resout deja la grande majorite des cas (congestion
              // temporaire comprise) avant meme d'arriver ici - on
              // n'atteint ce point qu'apres plusieurs cycles de rechemin
              // qui n'ont rien change, signe d'un vrai blocage persistant.
              const landing = findEnemyTeleportSpot(
                scene,
                repathTargetX,
                repathTargetY,
              );
              if (landing) {
                enemy.sprite.setPosition(landing.x, landing.y);
                enemy.sprite.setVelocity(0, 0);
                enemy.path = null;
                enemy.pathIndex = 0;
                enemy.stuckStreak = 0;
                enemy.stuckJitterAttempts = 0;
                enemy.stuckJitterUntil = 0;
                enemy.stuckCheckPos = { x: landing.x, y: landing.y };
                enemy.stuckCheckAt = now;
                // espace les teleportations d'urgence entre elles - sans
                // ca, plusieurs ennemis bloques en meme temps (frequent,
                // ils se bloquent souvent ENTRE EUX) pouvaient tous
                // debarquer a la suite autour du heros, qui se
                // retrouvait encercle d'un coup
                scene.nextEnemyTeleportAllowedAt =
                  now + ENEMY_STUCK_TELEPORT_GLOBAL_COOLDOWN;
                continue;
              }
              // aucune case atteignable trouvee dans la fourchette de
              // distance (coin tres encombre / cul-de-sac) - on retente
              // au prochain cycle de blocage
            }
          }
        } else {
          enemy.stuckStreak = 0;
          enemy.stuckJitterAttempts = 0;
        }
        enemy.stuckCheckPos = { x: enemy.sprite.x, y: enemy.sprite.y };
        enemy.stuckCheckAt = now;
      }
      let jitterX = 0;
      let jitterY = 0;
      if (now < enemy.stuckJitterUntil) {
        const jitterAngle = Math.random() * Math.PI * 2;
        jitterX = Math.cos(jitterAngle) * ENEMY_STUCK_JITTER_SPEED;
        jitterY = Math.sin(jitterAngle) * ENEMY_STUCK_JITTER_SPEED;
      }

      const step = scene.followPathStep(enemy, getEffectiveEnemySpeed(enemy));
      if (step) {
        enemy.sprite.setVelocity(step.vx + jitterX, step.vy + jitterY);
        enemy.lastDir =
          Math.abs(step.nx) > Math.abs(step.ny)
            ? step.nx > 0
              ? "right"
              : "left"
            : step.ny > 0
              ? "down"
              : "up";
        enemy.sprite.anims.play(
          enemy.spriteKey + "-walk-" + enemy.lastDir,
          true,
        );
      } else {
        enemy.sprite.setVelocity(jitterX, jitterY);
        enemy.sprite.anims.play(
          enemy.spriteKey + "-idle-" + enemy.lastDir,
          true,
        );
      }
      continue;
    }
    if (
      enemy.state === "patrol" &&
      enemy.patrolPath &&
      enemy.patrolPath.length > 1
    ) {
      const waypoint = enemy.patrolPath[enemy.patrolIndex];
      scene.moveEnemyToward(
        enemy,
        waypoint,
        getEffectiveEnemySpeed(enemy) * 0.6,
        () => {
          if (
            enemy.patrolIndex + enemy.patrolDirection < 0 ||
            enemy.patrolIndex + enemy.patrolDirection >= enemy.patrolPath.length
          ) {
            enemy.patrolDirection *= -1;
          }
          enemy.patrolIndex += enemy.patrolDirection;
        },
      );
      continue;
    }

    if (enemy.state === "wander") {
      // Errance libre : contrairement a "patrol" (aller-retour fixe
      // calcule une fois), on tire une NOUVELLE destination aleatoire a
      // portee toutes les ENEMY_WANDER_MIN/MAX_INTERVAL et on s'y rend
      // via le vrai pathfinding (comme la chasse, cf. followPathStep) -
      // jamais la marche en ligne droite de moveEnemyToward, pour garder
      // la meme robustesse anti-blocage que le reste du systeme.
      const wanderNow = scene.time.now;
      if (!enemy.wanderNextPickAt || wanderNow >= enemy.wanderNextPickAt) {
        enemy.wanderNextPickAt =
          wanderNow +
          ENEMY_WANDER_MIN_INTERVAL +
          Math.random() *
            (ENEMY_WANDER_MAX_INTERVAL - ENEMY_WANDER_MIN_INTERVAL);
        const spot = pickRandomWanderSpot(
          scene,
          enemy.home,
          ENEMY_WANDER_RADIUS,
        );
        if (spot) {
          scene.requestPath(
            enemy.sprite.x,
            enemy.sprite.y,
            spot.x,
            spot.y,
            (path) => {
              enemy.path = path;
              enemy.pathIndex = 0;
            },
          );
        }
      }

      const wanderStep = scene.followPathStep(
        enemy,
        getEffectiveEnemySpeed(enemy) * 0.6,
      );
      if (wanderStep) {
        enemy.sprite.setVelocity(wanderStep.vx, wanderStep.vy);
        enemy.lastDir =
          Math.abs(wanderStep.nx) > Math.abs(wanderStep.ny)
            ? wanderStep.nx > 0
              ? "right"
              : "left"
            : wanderStep.ny > 0
              ? "down"
              : "up";
        enemy.sprite.anims.play(
          enemy.spriteKey + "-walk-" + enemy.lastDir,
          true,
        );
      } else {
        enemy.sprite.setVelocity(0, 0);
        enemy.sprite.anims.play(
          enemy.spriteKey + "-idle-" + enemy.lastDir,
          true,
        );
      }
      continue;
    }

    enemy.sprite.setVelocity(0, 0);
    enemy.sprite.anims.play(enemy.spriteKey + "-idle-" + enemy.lastDir, true);
  }
}

export function updateBossSummons(scene) {
  const now = scene.time.now;
  for (const enemy of scene.enemies) {
    if (!enemy.isBoss || !enemy.summonAbility) continue;
    if (enemy.state !== "chase") continue;
    if (now < enemy.summonCooldownReadyAt) continue;

    const aliveCount = enemy.summonedMinions.filter((m) =>
      scene.enemies.includes(m),
    ).length;
    if (aliveCount >= enemy.summonAbility.maxActive) continue;

    bossSummonMinion(scene, enemy);
    enemy.summonCooldownReadyAt = now + enemy.summonAbility.cooldownMs;
  }
}

export function bossSummonMinion(scene, boss) {
  const ability = boss.summonAbility;
  const summonTypes = ability.summonTypes;
  if (!summonTypes || summonTypes.length === 0) return;

  const typeKey = summonTypes[Math.floor(Math.random() * summonTypes.length)];
  const { entry: enemySprite, spriteKey } = resolveEnemySprite(typeKey);

  const angle = Math.random() * Math.PI * 2;
  const spawnDist = 50;
  const spawnX = boss.sprite.x + Math.cos(angle) * spawnDist;
  const spawnY = boss.sprite.y + Math.sin(angle) * spawnDist;

  const sprite = scene.enemyGroup.create(
    spawnX,
    spawnY,
    enemySprite.key,
    enemySprite.animations.idleDown,
  );
  sprite.setScale(enemySprite.scale);
  const ehb = enemySprite.hitbox;
  sprite.body
    .setSize(ehb.width, ehb.height)
    .setOffset(ehb.offsetX, ehb.offsetY);
  sprite.setDepth(8);
  sprite.anims.play(spriteKey + "-idle-down");

  const spawnTileX = Math.floor(spawnX / TILE_SIZE);
  const spawnTileY = Math.floor(spawnY / TILE_SIZE);
  const behaviorRng = createRng(
    `${scene.currentSeed}-boss-minion-${scene.time.now}`,
  );
  const behavior = createEnemyBehavior(
    scene.fogGrid,
    { x: spawnTileX, y: spawnTileY },
    behaviorRng,
    { guard: 1 },
  );

  const minion = {
    sprite,
    spriteKey,
    spawnIndex: -1,
    archetype: typeKey,
    type: behavior.type,
    state: "chase", // deja hostile des l'apparition, pas de phase "endormi"
    home: behavior.home,
    aggroRadius: behavior.aggroRadius,
    patrolPath: null,
    patrolIndex: 0,
    patrolDirection: 1,
    path: null,
    pathIndex: 0,
    lastDir: "down",
    hp: Math.round(boss.maxHp * ability.hpScale),
    maxHp: Math.round(boss.maxHp * ability.hpScale),
    damage: Math.round(boss.damage * ability.damageScale),
    defense: Math.round(boss.defense * (ability.defenseScale || 0)),
    xpReward: Math.round((boss.xpReward || 0) * 0.1),
    attackType: "melee",
    questLoot: null,
    inflictsEffect: null,
    resistances: {},
    damageType: "physical",
    statusEffects: [],
    drops: [],
    attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
  };

  scene.enemies.push(minion);
  boss.summonedMinions.push(minion);
}

export function updateEnemyAttacks(scene, now) {
  for (const enemy of scene.enemies) {
    if (enemy.state !== "chase") continue;
    if (scene.isEnemyStunned(enemy)) continue;
    if (!enemy.attackCooldown.isReady(now)) continue;

    if (enemy.attackType === "ranged") {
      const distToHero = Math.hypot(
        enemy.sprite.x - scene.hero.x,
        enemy.sprite.y - scene.hero.y,
      );

      // meme logique de selection de cible que le corps a corps
      // plus bas : un summon plus proche ET a portee passe devant le
      // heros - avant ce correctif, un ennemi a distance ignorait
      // toujours les invocations et ne visait jamais que le joueur
      let rangedTarget = { isSummon: false };
      let rangedDist = distToHero;
      for (const summon of scene.summons) {
        const summonDist = Math.hypot(
          enemy.sprite.x - summon.sprite.x,
          enemy.sprite.y - summon.sprite.y,
        );
        if (
          summonDist <= ENEMY_RANGED_ATTACK_RANGE &&
          summonDist < rangedDist
        ) {
          rangedTarget = { isSummon: true, summon };
          rangedDist = summonDist;
        }
      }

      if (rangedDist > ENEMY_RANGED_ATTACK_RANGE) continue;
      enemy.attackCooldown.trigger(now);
      enemy.sprite.setVelocity(0, 0);

      const hasRangedAttackAnim = scene.anims.exists(
        enemy.spriteKey + "-attack-" + enemy.lastDir,
      );
      if (hasRangedAttackAnim) {
        enemy.sprite.anims.play(
          enemy.spriteKey + "-attack-" + enemy.lastDir,
          true,
        );
        enemy.attackAnimUntil = now + ATTACK_ANIM_DURATION_MS;
      }

      // l'ennemi est fige pendant l'anim (cf. updateEnemyMovement) -
      // le tir effectif (spawn du projectile) est repousse a la fin,
      // pour que le lancer coincide visuellement avec le geste
      scene.time.delayedCall(ATTACK_ANIM_DURATION_MS, () => {
        if (!scene.hero) return;
        if (!scene.enemies.includes(enemy)) return; // mort entre-temps

        // recalcule la cible au moment du tir (peut avoir bouge ou
        // disparu pendant l'anim) - si l'invocation visee est morte
        // entre-temps, on retombe sur le heros
        const targetSummon =
          rangedTarget.isSummon && scene.summons.includes(rangedTarget.summon)
            ? rangedTarget.summon
            : null;
        const targetSprite = targetSummon ? targetSummon.sprite : scene.hero;

        const dx = targetSprite.x - enemy.sprite.x;
        const dy = targetSprite.y - enemy.sprite.y;
        const mag = Math.hypot(dx, dy) || 1;
        const vx = dx / mag;
        const vy = dy / mag;

        const sprite = scene.add.circle(
          enemy.sprite.x,
          enemy.sprite.y,
          PROJECTILE_RADIUS,
          0xff6644,
        );
        scene.physics.add.existing(sprite);
        sprite.setDepth(12);
        sprite.body.setVelocity(
          vx * ENEMY_PROJECTILE_SPEED,
          vy * ENEMY_PROJECTILE_SPEED,
        );

        let rangedRawDamage = getEffectiveEnemyDamage(enemy);
        if (enemy.varianceDice) {
          rangedRawDamage = applyDiceVariance(
            rangedRawDamage,
            enemy.varianceDice,
          );
        }
        scene.enemyProjectiles.push({
          sprite,
          startX: enemy.sprite.x,
          startY: enemy.sprite.y,
          damage: rangedRawDamage,
          damageType: enemy.damageType,
          inflictsEffect: enemy.inflictsEffect,
          targetSummon,
        });
      });
      continue;
    }

    const dist = Math.hypot(
      enemy.sprite.x - scene.hero.x,
      enemy.sprite.y - scene.hero.y,
    );

    let target = {
      isSummon: false,
      defense: scene.playerDefense,
    };
    for (const summon of scene.summons) {
      const summonDist = Math.hypot(
        enemy.sprite.x - summon.sprite.x,
        enemy.sprite.y - summon.sprite.y,
      );
      if (summonDist <= ENEMY_ATTACK_RANGE && summonDist < dist) {
        target = { isSummon: true, summon, defense: summon.defense };
      }
    }

    if (!target.isSummon && dist > ENEMY_ATTACK_RANGE) continue;

    enemy.attackCooldown.trigger(now);
    enemy.sprite.setVelocity(0, 0);

    const hasAttackAnim = scene.anims.exists(
      enemy.spriteKey + "-attack-" + enemy.lastDir,
    );
    if (hasAttackAnim) {
      enemy.sprite.anims.play(
        enemy.spriteKey + "-attack-" + enemy.lastDir,
        true,
      );
      enemy.attackAnimUntil = now + ATTACK_ANIM_DURATION_MS;
    }

    // L'ennemi est fige pendant l'anim (updateEnemyMovement le skip
    // tant que attackAnimUntil n'est pas passe), donc sa position ne
    // bouge plus - mais la cible (heros/summon), elle, peut se
    // deplacer : on resout les degats a la FIN de l'anim pour lui
    // laisser une chance d'esquiver en sortant de portee.
    scene.time.delayedCall(ATTACK_ANIM_DURATION_MS, () => {
      if (!scene.hero) return;
      if (!scene.enemies.includes(enemy)) return; // mort entre-temps

      const resolveDist = Math.hypot(
        enemy.sprite.x - scene.hero.x,
        enemy.sprite.y - scene.hero.y,
      );

      let resolveTarget = {
        isSummon: false,
        defense: getEffectivePlayerDefense(scene),
      };
      for (const summon of scene.summons) {
        const summonDist = Math.hypot(
          enemy.sprite.x - summon.sprite.x,
          enemy.sprite.y - summon.sprite.y,
        );
        if (summonDist <= ENEMY_ATTACK_RANGE && summonDist < resolveDist) {
          resolveTarget = { isSummon: true, summon, defense: summon.defense };
        }
      }
      if (!resolveTarget.isSummon && resolveDist > ENEMY_ATTACK_RANGE) return; // esquive : plus personne a portee

      if (resolveTarget.isSummon) {
        const dmg = computeDamage(
          applyElementalResistance(
            getEffectiveEnemyDamage(enemy),
            enemy.damageType,
            resolveTarget.summon.resistances,
          ),
          resolveTarget.defense,
        );
        resolveTarget.summon.hp = Math.max(0, resolveTarget.summon.hp - dmg);

        scene.showDamageNumber(resolveTarget.summon.sprite, dmg, "#ff44c7");
      } else {
        let rawEnemyDamage = getEffectiveEnemyDamage(enemy);
        if (enemy.varianceDice) {
          rawEnemyDamage = applyDiceVariance(
            rawEnemyDamage,
            enemy.varianceDice,
          );
        }
        let dmg = computeDamage(
          applyElementalResistance(
            rawEnemyDamage,
            enemy.damageType,
            scene.playerResistances,
          ),
          resolveTarget.defense,
        );
        if (scene.time.now < scene.parryUntil) {
          dmg = Math.round(dmg * (1 - scene.parryDamageReduction));
        }
        scene.playerHp = Math.max(0, scene.playerHp - dmg);
        scene.showDamageNumber(scene.hero, dmg, "#ff4444");
        scene.events.emit("player-hp-changed", {
          hp: scene.playerHp,
          maxHp: scene.playerMaxHp,
        });

        if (scene.time.now < scene.riposteUntil) {
          scene.damageEnemy(enemy, dmg * scene.riposteReflectPercent);
        }

        applyStatusEffect(
          scene,
          scene.playerStatusEffects,
          rollStatusEffect(enemy),
        );
        applyReactiveGemEffects(scene, enemy);

        scene.hero.setTint(0xff8888).setTintMode(Phaser.TintModes.FILL);
        scene.time.delayedCall(100, () => {
          if (scene.hero) {
            scene.hero.clearTint();
            scene.hero.setTintMode(Phaser.TintModes.MULTIPLY);
          }
        });
      }
    });
  }
}

export function updateEnemyProjectiles(scene) {
  const grid = scene.fogGrid;
  const remaining = [];

  for (const proj of scene.enemyProjectiles) {
    const traveled = Math.hypot(
      proj.sprite.x - proj.startX,
      proj.sprite.y - proj.startY,
    );
    const tileX = Math.floor(proj.sprite.x / TILE_SIZE);
    const tileY = Math.floor(proj.sprite.y / TILE_SIZE);
    const outOfBounds =
      tileX < 0 || tileY < 0 || tileY >= grid.length || tileX >= grid[0].length;
    const hitWall = !outOfBounds && grid[tileY][tileX] === WALL;

    const fogState = scene.fogState.state;
    const projVisible = !outOfBounds && fogState[tileY][tileX] === 2;
    proj.sprite.setVisible(projVisible);

    if (traveled >= ENEMY_PROJECTILE_MAX_DISTANCE || outOfBounds || hitWall) {
      proj.sprite.destroy();
      continue;
    }

    // projectile tire sur un summon (cf. updateEnemyAttacks) - resolution
    // de collision dediee, jamais contre le heros : si l'invocation visee
    // est deja morte/disparue entre-temps, le projectile continue tout
    // droit et finira par expirer normalement (distance max/mur), sans
    // jamais se rabattre sur le joueur en vol
    if (proj.targetSummon) {
      if (!scene.summons.includes(proj.targetSummon)) {
        remaining.push(proj);
        continue;
      }
      const summon = proj.targetSummon;
      const distToSummon = Math.hypot(
        summon.sprite.x - proj.sprite.x,
        summon.sprite.y - proj.sprite.y,
      );
      if (distToSummon <= PROJECTILE_RADIUS + 14) {
        const dmg = computeDamage(
          applyElementalResistance(
            proj.damage,
            proj.damageType,
            summon.resistances,
          ),
          summon.defense,
        );
        summon.hp = Math.max(0, summon.hp - dmg);
        scene.showDamageNumber(summon.sprite, dmg, "#ff44c7");
        proj.sprite.destroy();
        continue;
      }
      remaining.push(proj);
      continue;
    }

    const distToHero = Math.hypot(
      scene.hero.x - proj.sprite.x,
      scene.hero.y - proj.sprite.y,
    );
    if (distToHero <= PROJECTILE_RADIUS + 14) {
      let dmg = computeDamage(
        applyElementalResistance(
          proj.damage,
          proj.damageType,
          scene.playerResistances,
        ),
        getEffectivePlayerDefense(scene),
      );
      if (scene.time.now < scene.parryUntil) {
        dmg = Math.round(dmg * (1 - scene.parryDamageReduction));
      }
      scene.playerHp = Math.max(0, scene.playerHp - dmg);
      scene.showDamageNumber(scene.hero, dmg, "#ff4444");
      scene.events.emit("player-hp-changed", {
        hp: scene.playerHp,
        maxHp: scene.playerMaxHp,
      });

      applyStatusEffect(
        scene,
        scene.playerStatusEffects,
        rollStatusEffect({ inflictsEffect: proj.inflictsEffect }),
      );
      // pas de reference vers l'ennemi tireur sur un projectile (cf.
      // enemyProjectiles.push plus haut) : seule une gemme "haste"
      // (kind "modifier", ne cible pas l'ennemi) peut se declencher ici,
      // une gemme "repel" (kind "knockback") n'a personne a repousser.
      applyReactiveGemEffects(scene, null);

      scene.hero.setTint(0xff8888).setTintMode(Phaser.TintModes.FILL);
      scene.time.delayedCall(100, () => {
        if (scene.hero) {
          scene.hero.clearTint();
          scene.hero.setTintMode(Phaser.TintModes.MULTIPLY);
        }
      });

      proj.sprite.destroy();
      continue;
    }

    remaining.push(proj);
  }

  scene.enemyProjectiles = remaining;
}
