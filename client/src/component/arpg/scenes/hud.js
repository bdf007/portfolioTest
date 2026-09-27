// TILE_SIZE duplique volontairement (identique a celui de MainScene.js) -
// meme constante numerique des deux cotes, meme logique que dans
// floorRenderer.js/floorEntities.js/abilities.js/summons.js/quests.js/
// exploration.js/ai.js/inventory.js.
const TILE_SIZE = 32;

export function toggleDebugTileIndices(scene) {
  scene.debugTileIndicesVisible = !scene.debugTileIndicesVisible;
  if (scene.debugTileIndicesVisible) {
    renderDebugTileIndices(scene);
  } else {
    clearDebugTileIndices(scene);
  }
}

export function clearDebugTileIndices(scene) {
  for (const t of scene.debugTileIndexTexts) t.destroy();
  scene.debugTileIndexTexts = [];
}

export function renderDebugTileIndices(scene) {
  clearDebugTileIndices(scene);
  if (!scene.currentRenderGrid) return;

  const grid = scene.currentRenderGrid;
  const sourceIds = scene.currentSlotSourceTileIds;

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      const slotIndex = grid[y][x];
      if (slotIndex === undefined || slotIndex === null) continue;

      const sourceId = sourceIds ? sourceIds[slotIndex] : undefined;
      const label =
        sourceId === undefined || sourceId === null
          ? String(slotIndex)
          : Array.isArray(sourceId)
            ? sourceId.join("+")
            : String(sourceId);

      const worldX = x * TILE_SIZE + TILE_SIZE / 2;
      const worldY = y * TILE_SIZE + TILE_SIZE / 2;

      const txt = scene.add.text(worldX, worldY, label, {
        fontSize: "10px",
        color: "#ffff00",
        stroke: "#000000",
        strokeThickness: 2,
      });
      txt.setOrigin(0.5);
      txt.setDepth(9999);
      scene.debugTileIndexTexts.push(txt);
    }
  }
}

export function getQuestNpcMinimapData(scene) {
  if (!scene.questNpcs || !scene.fogState?.state) return [];

  const state = scene.fogState.state;
  const landmarks = scene.discoveredLandmarks?.[scene.currentDepth];

  if (!landmarks) return [];

  if (!landmarks.questNpcs) {
    landmarks.questNpcs = {};
  }

  for (const npc of scene.questNpcs) {
    if (npc.npcIndex === undefined || !npc.sprite) continue;

    if (landmarks.questNpcs[npc.npcIndex]?.discovered) {
      continue;
    }

    const x = Math.floor(npc.sprite.x / TILE_SIZE);
    const y = Math.floor(npc.sprite.y / TILE_SIZE);

    if (x < 0 || y < 0 || y >= state.length || x >= state[0].length) {
      continue;
    }

    if (state[y][x] >= 1) {
      landmarks.questNpcs[npc.npcIndex] = {
        x,
        y,
        discovered: true,
      };
    }
  }

  return Object.entries(landmarks.questNpcs)
    .filter(([, npc]) => npc?.discovered)
    .map(([npcIndex, npc]) => ({
      npcIndex: Number(npcIndex),
      x: npc.x,
      y: npc.y,
    }));
}

export function getSummonMinimapData(scene) {
  return scene.summons.map((s) => ({
    x: Math.floor(s.sprite.x / TILE_SIZE),
    y: Math.floor(s.sprite.y / TILE_SIZE),
  }));
}

export function drawHpBars(scene) {
  const g = scene.hpBarGraphics;
  g.clear();
  const barW = 28,
    barH = 4;

  for (const enemy of scene.enemies) {
    if (!enemy.visible) continue;
    const ratio = enemy.hp / enemy.maxHp;
    const bx = enemy.sprite.x - barW / 2;
    const by = enemy.sprite.y - 26;
    g.fillStyle(0x000000, 0.5);
    g.fillRect(bx, by, barW, barH);
    g.fillStyle(
      ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf39c12 : 0xe74c3c,
      1,
    );
    g.fillRect(bx, by, barW * ratio, barH);
  }

  if (scene.hero) {
    const ratio = Math.max(0, scene.playerHp / scene.playerMaxHp);
    const bx = scene.hero.x - barW / 2;
    const by = scene.hero.y - 30;
    g.fillStyle(0x000000, 0.5);
    g.fillRect(bx, by, barW, barH);
    g.fillStyle(0x3498db, 1);
    g.fillRect(bx, by, barW * ratio, barH);
  }

  for (const summon of scene.summons) {
    const ratio = summon.hp / summon.maxHp;
    const bx = summon.sprite.x - barW / 2;
    const by = summon.sprite.y - 26;
    g.fillStyle(0x000000, 0.5);
    g.fillRect(bx, by, barW, barH);
    g.fillStyle(
      ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf39c12 : 0xe74c3c,
      1,
    );
    g.fillRect(bx, by, barW * ratio, barH);
  }
}

