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

// Constantes dupliquees volontairement (identiques a celles de
// MainScene.js) - memes valeurs numeriques des deux cotes, meme logique
// que dans floorRenderer.js/floorEntities.js/abilities.js/summons.js/
// quests.js/exploration.js.
const TILE_SIZE = 32;
const DETECTION_BEHIND_DOT_THRESHOLD = -0.5;
const ENEMY_DIR_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const ENEMY_STOP_DISTANCE = 28;
const ENEMY_RANGED_STOP_DISTANCE = 180;
const ENEMY_RANGED_RETREAT_DISTANCE = 100;
const ENEMY_ATTACK_RANGE = 34;
const ENEMY_RANGED_ATTACK_RANGE = 260;
const ENEMY_ATTACK_COOLDOWN = 900;
const ENEMY_PROJECTILE_SPEED = 220;
const ENEMY_PROJECTILE_MAX_DISTANCE = 300;
const PROJECTILE_RADIUS = 5;
const ATTACK_ANIM_DURATION_MS = 400;

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

export function updateEnemyDecisions(scene, playerTileX, playerTileY) {
  const grid = scene.fogGrid;
  const width = grid[0].length,
    height = grid.length;
  const isStealthed = scene.time.now < scene.stealthUntil;

  for (const enemy of scene.enemies) {
    if (isStealthed && enemy.state !== "chase") continue;

    const ex = Math.floor(enemy.sprite.x / TILE_SIZE);
    const ey = Math.floor(enemy.sprite.y / TILE_SIZE);

    if (ey < 0 || ey >= height || ex < 0 || ex >= width) {
      console.error(
        `[updateEnemyDecisions] ennemi hors limites ! isBoss=${enemy.isBoss} archetype=${enemy.archetype} ex=${ex} ey=${ey} (grille: ${width}x${height}) sprite.x=${enemy.sprite.x} sprite.y=${enemy.sprite.y}`,
      );
      continue; // evite le plantage en attendant le vrai correctif
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
      continue;
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
}

export function updateEnemyMovement(scene) {
  const ENEMY_STUCK_CHECK_INTERVAL = 500;
  const ENEMY_STUCK_MOVE_THRESHOLD = 10;
  const ENEMY_STUCK_JITTER_STREAK = 3; // ~1.5s de blocage continu
  const ENEMY_STUCK_JITTER_SPEED = 90;
  const ENEMY_STUCK_TELEPORT_JITTER_ATTEMPTS = 3; // ~4-5s de blocage malgre plusieurs jitter+repath

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
            // Filet de securite anti-softlock : le repath + jitter
            // suffit dans la grande majorite des cas, mais pas
            // toujours (ennemi vraiment coince dans la geometrie, clip
            // de collision...). On compte les cycles de jitter
            // consecutifs qui n'ont pas resolu le blocage ; au bout de
            // ENEMY_STUCK_TELEPORT_JITTER_ATTEMPTS, on teleporte
            // l'ennemi pres du joueur plutot que de le laisser
            // rebondir indefiniment contre la geometrie. Critique
            // devant une salle de boss : la porte reste verrouillee
            // tant que tous les ennemis ne sont pas elimines, donc un
            // ennemi injoignable = softlock garanti pour le joueur.
            enemy.stuckJitterAttempts = (enemy.stuckJitterAttempts || 0) + 1;
            if (
              enemy.stuckJitterAttempts >= ENEMY_STUCK_TELEPORT_JITTER_ATTEMPTS
            ) {
              const tx = scene.hero.x + (Math.random() - 0.5) * 80;
              const ty = scene.hero.y + (Math.random() - 0.5) * 80;
              enemy.sprite.setPosition(tx, ty);
              enemy.sprite.setVelocity(0, 0);
              enemy.path = null;
              enemy.pathIndex = 0;
              enemy.stuckStreak = 0;
              enemy.stuckJitterAttempts = 0;
              enemy.stuckJitterUntil = 0;
              enemy.stuckCheckPos = { x: tx, y: ty };
              enemy.stuckCheckAt = now;
              continue;
            }
            enemy.stuckJitterUntil = now + 300;
            scene.requestPath(
              enemy.sprite.x,
              enemy.sprite.y,
              targetX,
              targetY,
              (path) => {
                enemy.path = path;
                enemy.pathIndex = 0;
              },
            );
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
