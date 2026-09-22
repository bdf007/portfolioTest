import { useState, useEffect, useRef } from "react";
import { resolveItemDef } from "./itemDefs";
import { resolveAbilityDef } from "./abilityDefs";
import { CRAFTING_RECIPES } from "./craftingRecipes";
import {
  SPRITE_REGISTRY,
  ICON_SPRITESHEET,
  ICON_SPRITESHEET_2,
  MONSTER_LOOTS_SPRITESHEET,
  ITEMS_1_SPRITESHEET,
  WEAPONS_TIERS_SPRITESHEET,
  ARMOR_TIERS_SPRITESHEET,
  STAFF_ALL_TIERS_SPRITESHEET,
  ARMOR_TEXTILE_TIERS_SPRITESHEET,
  PANTS_TIERS_SPRITESHEET,
  BELT_ALL_TIERS_SPRITESHEET,
  RING_NECKLACE_ALL_TIERS_SPRITESHEET,
  DETAILS_SPRITESHEET,
  ICON_SCROLL_SPRITESHEET,
  ICON_SHEET_1_FRAMES,
  ICON_SHEET_2_FRAMES,
  MONSTER_LOOTS_FRAMES,
  ITEMS_1_FRAMES,
  WEAPON_TIERS_FRAMES,
  ARMOR_TIERS_FRAMES,
  STAFF_TIERS_FRAMES,
  ARMOR_TEXTILE_TIERS_FRAMES,
  PANTS_TIERS_FRAMES,
  BELT_ALL_TIERS_FRAMES,
  RING_NECKLACE_TIERS_FRAMES,
  DETAILS_FRAMES,
  ICON_SCROLL_FRAMES,
} from "./spriteRegistry";
import bookPages from "../../assets/background/book_pages.png";

const SLOT_LABELS = {
  helmet: "Casque",
  mainHand: "Main principale",
  offHand: "Main secondaire",
  armor: "Armure",
  belt: "Ceinture",
  pants: "Pantalon",
  boots: "Bottes",
  ring1: "Bague",
  ring2: "Bague",
  necklace: "Collier",
  quiver: "Carquois",
};

const PREVIEW_SCALE = 3; // meme echelle que CharacterSelectScreen, pour un portrait coherent
// const SHEET_COLS = 12;
// const SHEET_ROWS = 8;
// const ICON_SHEET_COLS = 10;
// const ICON_SHEET_ROWS = 22;

/**
 * Regroupe les entrees d'inventaire identiques (meme itemId) en une
 * seule ligne d'affichage - necessaire pour l'equipement (non
 * empilable, chaque exemplaire est une entree SEPAREE avec quantity:1
 * dans this.inventory) qui affichait sinon une ligne par exemplaire
 * (3 epees de fer identiques = 3 lignes "Épée de fer") plutot qu'une
 * seule ligne "Épée de fer x3". Les objets deja empilables (potions,
 * or) n'ont de toute facon jamais qu'une seule entree - regroupement
 * sans effet pour eux, meme resultat qu'avant.
 *
 * `firstIndex` = l'index dans le tableau ORIGINAL (non regroupe) du
 * premier exemplaire trouve - c'est celui-la qui est vise par
 * onEquip/onUse quand on clique sur une ligne groupee (peu importe
 * LEQUEL des exemplaires identiques est equipe/utilise en premier, ils
 * sont interchangeables par definition).
 */
export function groupInventory(inventory) {
  const groups = new Map();
  inventory.forEach((entry, index) => {
    if (!groups.has(entry.itemId)) {
      groups.set(entry.itemId, {
        itemId: entry.itemId,
        totalQuantity: 0,
        firstIndex: index,
      });
    }
    groups.get(entry.itemId).totalQuantity += entry.quantity;
  });
  return [...groups.values()];
}

function TintedItemIcon({
  itemId,
  scale,
  frameIndex,
  spriteSheet,
  tint,
  extraFilter,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const img = new Image();
    img.src = spriteSheet.path;
    img.onload = () => {
      const w = spriteSheet.frameWidth * scale;
      const h = spriteSheet.frameHeight * scale;
      canvas.width = w;
      canvas.height = h;

      const col = frameIndex % spriteSheet.columns;
      const row = Math.floor(frameIndex / spriteSheet.columns);
      const sx = col * spriteSheet.frameWidth;
      const sy = row * spriteSheet.frameHeight;

      ctx.clearRect(0, 0, w, h);
      // 1. dessine le sprite normalement
      ctx.drawImage(
        img,
        sx,
        sy,
        spriteSheet.frameWidth,
        spriteSheet.frameHeight,
        0,
        0,
        w,
        h,
      );
      // 2. applique la teinte en mode "multiply"
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, w, h);
      // 3. redecoupe selon la silhouette d'origine - restaure la transparence
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(
        img,
        sx,
        sy,
        spriteSheet.frameWidth,
        spriteSheet.frameHeight,
        0,
        0,
        w,
        h,
      );
      ctx.globalCompositeOperation = "source-over";
    };
  }, [itemId, scale, frameIndex, spriteSheet, tint]);
  return (
    <canvas
      ref={canvasRef}
      style={{
        width: spriteSheet.frameWidth * scale,
        height: spriteSheet.frameHeight * scale,
        imageRendering: "pixelated",
        flexShrink: 0,
        filter: extraFilter || "none",
      }}
    />
  );
}

const ICON_TINTS = {
  // teintes pour les différentes essences de bois
  oakWood: null,
  ashWood: "#c9b896",
  yewWood: "#8a6d3b",
  ebonyWood: "#120f0e",
  petrifiedWood: "#8d8d84",
  mistwood: "#d399f7",
  runewood: "#4af2ed",
  skywood: "#a8d8ff",
  scarletwood: "#f90c0c",
  sacredWood: "#bfc1c1",
  eternalWood: "#4a7c59",
  starwood: "#3851f3",

  // teintes pour les différents monterCore unique.
  monsterCore: null,
  angryBrownMushroomCore: "#8b4513",
  summonAngryBrownMushroomScroll: "#8b4513",
  gnomeCore: "#80ee6f",
  summonGnomeScroll: "#80ee6f",
  gnomeClaw: "#80ee6f",
  gnomeFurTuft: "#80ee6f",
  angryTrentCore: "#4a7c59",
  summonAngryTrentScroll: "#4a7c59",
  woodAngryTrent: "#4a7c59",
  knifedBatCore: "#140953",
  summonKnifedBatScroll: "#140953",
  batFur: "#140953",
  batEye: "#140953",
  deer1Core: "#8b4513",
  summonDeer1Scroll: "#8b4513",
  deerHoof: "#8b4513",
  deerMeat: "#8b4513",
  deerBone: "#8b4513",
  mudGolemCore: "#60410f",
  summonMudGolemScroll: "#60410f",
  redBeetleCore: "#cccccc",
  summonRedBeetleScroll: "#cccccc",
  pinkOgreCore: "#cccccc",
  summonPinkOgreScroll: "#cccccc",
  alien1Core: "#cccccc",
  summonAlien1Scroll: "#cccccc",
  alien2Core: "#cccccc",
  summonAlien2Scroll: "#cccccc",
  alien3Core: "#cccccc",
  summonAlien3Scroll: "#cccccc",
  alien4Core: "#cccccc",
  summonAlien4Scroll: "#cccccc",
  alien5Core: "#cccccc",
  summonAlien5Scroll: "#cccccc",
  alien6Core: "#cccccc",
  summonAlien6Scroll: "#cccccc",
  alien7Core: "#cccccc",
  summonAlien7Scroll: "#cccccc",
  alien8Core: "#cccccc",
  summonAlien8Scroll: "#cccccc",
  alien9Core: "#cccccc",
  summonAlien9Scroll: "#cccccc",
  alien10Core: "#cccccc",
  summonAlien10Scroll: "#cccccc",
  batCore: "#cccccc",
  summonBatScroll: "#cccccc",
  brownBearCore: "#cccccc",
  summonBearScroll: "#cccccc",
  beeCore: "#cccccc",
  summonBeeScroll: "#cccccc",
  bigtickCore: "#cccccc",
  summonBigtickScroll: "#cccccc",
  blackdragonCore: "#cccccc",
  summonBlackdragonScroll: "#cccccc",
  darkelfCore: "#cccccc",
  summonDarkelfScroll: "#cccccc",
  demonDragonCore: "#cccccc",
  summonDemonDragonScroll: "#cccccc",
  dwarfCore: "#cccccc",
  summonDwarfScroll: "#cccccc",
  fantasy1Core: "#cccccc",
  summonFantasy1Scroll: "#cccccc",
  fantasy2Core: "#cccccc",
  summonFantasy2Scroll: "#cccccc",
  fantasy3Core: "#cccccc",
  summonFantasy3Scroll: "#cccccc",
  fantasy4Core: "#cccccc",
  summonFantasy4Scroll: "#cccccc",
  orqueGreenCore: "#cccccc",
  summonOrqueGreenScroll: "#cccccc",
  redWarriorMushroomCore: "#cccccc",
  summonRedWarriorMushroomScroll: "#cccccc",
  fantasy7Core: "#cccccc",
  summonFantasy7Scroll: "#cccccc",
  massecailleBlueCore: "#cccccc",
  summonMassecailleBlueScroll: "#cccccc",
  fantasy9Core: "#cccccc",
  summonFantasy9Scroll: "#cccccc",
  knightJauneRougeCore: "#cccccc",
  summonKnightJauneRougeScroll: "#cccccc",
  gargoyleCore: "#cccccc",
  summonGargoyleScroll: "#cccccc",
  ghostCore: "#cccccc",
  summonGhostScroll: "#cccccc",
  gnomeFouCore: "#cccccc",
  summonGnomeFouScroll: "#cccccc",
  golemCore: "#cccccc",
  summonGolemScroll: "#cccccc",
  gorillaCore: "#cccccc",
  summonGorillaScroll: "#cccccc",
  greendragonCore: "#cccccc",
  summonGreendragonScroll: "#cccccc",
  ogreCore: "#cccccc",
  summonOgreScroll: "#cccccc",
  redbeetleCore: "#cccccc",
  summonRedbeetleScroll: "#cccccc",
  robot1Core: "#cccccc",
  summonRobot1Scroll: "#cccccc",
  robot2Core: "#cccccc",
  summonRobot2Scroll: "#cccccc",
  robot3Core: "#cccccc",
  summonRobot3Scroll: "#cccccc",
  robot4Core: "#cccccc",
  summonRobot4Scroll: "#cccccc",
  robot5Core: "#cccccc",
  summonRobot5Scroll: "#cccccc",
  robot6Core: "#cccccc",
  summonRobot6Scroll: "#cccccc",
  robot7Core: "#cccccc",
  summonRobot7Scroll: "#cccccc",
  robot8Core: "#cccccc",
  summonRobot8Scroll: "#cccccc",
  robot9Core: "#cccccc",
  summonRobot9Scroll: "#cccccc",
  robot10Core: "#cccccc",
  summonRobot10Scroll: "#cccccc",
  skeletonCore: "#cccccc",
  summonSkeletonScroll: "#cccccc",
  skeletonkingCore: "#cccccc",
  summonSkeletonkingScroll: "#cccccc",
  greenSlimeCore: "#077e0f",
  summonGreenSlimeScroll: "#077e0f",
  spiderCore: "#cccccc",
  summonSpiderScroll: "#cccccc",
  yellowSlimeCore: "#f2ee0d",
  summonYellowSlimeScroll: "#f2ee0d",
  blueSlimeCore: "#0d4df2",
  summonBlueSlimeScroll: "#0d4df2",
  purpleSlimeCore: "#89065b",
  summonPurpleSlimeScroll: "#89065b",
  yellowWarriorMushroomCore: "#f6f608",
  summonYellowWarriorMushroomScroll: "#f6f608",
  blueWarriorMushroomCore: "#0e25d4",
  summonBlueWarriorMushroomScroll: "#0e25d4",
  greenWarriorMushroomCore: "#0d6b07",
  summonGreenWarriorMushroomScroll: "#0d6b07",
  purpleWarriorMushroomCore: "#52044c",
  summonPurpleWarriorMushroomScroll: "#52044c",
  blackBearCore: "#0500008d",
  summonBlackBearScroll: "#0500008d",
  blackBearFurTuft: "#0500008d",
  whiteBearCore: "#fbf9f99b",
  summonWhiteBearScroll: "#fbf9f99b",
  knightBleuArgentCore: "#cccccc",
  summonKnightBleuArgentScroll: "#cccccc",
  knightNoirCramoisiCore: "#cccccc",
  summonKnightNoirCramoisiScroll: "#cccccc",
  knightVertOrCore: "#cccccc",
  summonKnightVertOrScroll: "#cccccc",
  knightVioletArgentCore: "#cccccc",
  summonKnightVioletArgentScroll: "#cccccc",
  massecaillePurpleCore: "#cccccc",
  summonMassecaillePurpleScroll: "#cccccc",
  massecailleGreenCore: "#cccccc",
  summonMassecailleGreenScroll: "#cccccc",
  massecailleRedCore: "#cccccc",
  summonMassecailleRedScroll: "#cccccc",
  massecailleYellowCore: "#cccccc",
  summonMassecailleYellowScroll: "#cccccc",
  orqueBlackCore: "#cccccc",
  summonOrqueBlackScroll: "#cccccc",
  orqueYellowCore: "#cccccc",
  summonOrqueYellowScroll: "#cccccc",
  orqueBlueCore: "#cccccc",
  summonOrqueBlueScroll: "#cccccc",
  orqueRedCore: "#cccccc",
  summonOrqueRedScroll: "#cccccc",
  orquePurpleCore: "#cccccc",
  summonOrquePurpleScroll: "#cccccc",
  orqueGreyCore: "#cccccc",
  summonOrqueGreyScroll: "#cccccc",
  orqueGreyFurTuft: "#cccccc",
  trollBlueCore: "#cccccc",
  summonTrollBlueScroll: "#cccccc",
  trollBlueFurTuft: "#cccccc",
  trollGrisCore: "#cccccc",
  summonTrollGrisScroll: "#cccccc",
  trollGrisFurTuft: "#cccccc",
  trollRoseCore: "#cccccc",
  summonTrollRoseScroll: "#cccccc",
  trollRoseFurTuft: "#cccccc",
  trollRougeCore: "#cccccc",
  summonTrollRougeScroll: "#cccccc",
  trollRougeFurTuft: "#cccccc",
  trollVertCore: "#cccccc",
  summonTrollVertScroll: "#cccccc",
  trollVertFurTuft: "#cccccc",
  trollVioletCore: "#cccccc",
  summonTrollVioletScroll: "#cccccc",
  trollVioletFurTuft: "#cccccc",
  warlockRedCore: "#cccccc",
  summonWarlockRedScroll: "#cccccc",
  warlockWhiteCore: "#cccccc",
  summonWarlockWhiteScroll: "#cccccc",
  warlockGreenCore: "#cccccc",
  summonWarlockGreenScroll: "#cccccc",
  warlockBlueCore: "#cccccc",
  summonWarlockBlueScroll: "#cccccc",
  warlockBlackCore: "#cccccc",
  summonWarlockBlackScroll: "#cccccc",
  warlockPurpleCore: "#cccccc",
  summonWarlockPurpleScroll: "#cccccc",

  golemEauCore: "#cccccc",
  summonGolemEauScroll: "#cccccc",
  golemFeuCore: "#cccccc",
  summonGolemFeuScroll: "#cccccc",
  golemFoudreCore: "#cccccc",
  summonGolemFoudreScroll: "#cccccc",
  golemGlaceCore: "#cccccc",
  summonGolemGlaceScroll: "#cccccc",
  golemOmbreCore: "#cccccc",
  summonGolemOmbreScroll: "#cccccc",
  zombiequeenBossCore: "#cccccc",
  summonZombiequeenBossScroll: "#cccccc",
  zombiequeenCore: "#cccccc",
  summonZombiequeenScroll: "#cccccc",
  beequeenBossCore: "#cccccc",
  summonBeequeenBossScroll: "#cccccc",
  beequeenCore: "#cccccc",
  summonBeequeenScroll: "#cccccc",
};

/**
 * Pour une capacite d'invocation (effectType: "summon"), resout l'entree
 * SPRITE_REGISTRY du monstre invoque - a condition qu'elle declare
 * sheetCols/sheetRows explicites. Pas de valeur par defaut : chaque
 * spritesheet de monstre a une disposition differente (certains avec
 * attaque, d'autres non, certains partages entre plusieurs monstres), donc
 * deviner une valeur reproduirait le bug des ceintures (rows errone).
 */
function resolveSummonIconEntry(id) {
  const abilityDef = resolveAbilityDef(id);
  if (abilityDef.effectType !== "summon" || !abilityDef.summonType) {
    return null;
  }
  const entry = SPRITE_REGISTRY[abilityDef.summonType];
  if (
    !entry ||
    entry.sheetCols === undefined ||
    entry.sheetRows === undefined
  ) {
    return null;
  }
  return entry;
}

export function ItemIcon({ itemId, scale = 2 }) {
  const summonEntry = resolveSummonIconEntry(itemId);
  if (summonEntry) {
    // Les spritesheets de monstres (48x48 ou plus) sont bien plus grandes
    // que la feuille d'icones standard (32x32) - sans normalisation, une
    // invocation s'afficherait beaucoup plus grande que les autres icones
    // au meme "scale" et deborderait des emplacements a taille fixe (ex :
    // la barre de raccourcis en jeu, 42x42 avec overflow: hidden)
    const ICON_BASE_SIZE = 32;
    // Sans le scale propre au monstre (SPRITE_REGISTRY), deux monstres a la
    // meme frameWidth/frameHeight natives (ex: 48x48) mais des tailles
    // visuelles tres differentes en jeu (champignon scale:0.5, arbre
    // scale:1.2) ressortaient a la MEME taille d'icone - le petit
    // champignon paraissait alors bien plus gros que sa vraie stature.
    const monsterScale = summonEntry.scale ?? 1;
    const normalizedScale =
      (ICON_BASE_SIZE /
        Math.max(summonEntry.frameWidth, summonEntry.frameHeight)) *
      monsterScale *
      scale;
    const idleFrameIndex = summonEntry.animations.idleDown;
    const col = idleFrameIndex % summonEntry.sheetCols;
    const row = Math.floor(idleFrameIndex / summonEntry.sheetCols);
    const sheetW = summonEntry.frameWidth * summonEntry.sheetCols;
    const sheetH = summonEntry.frameHeight * summonEntry.sheetRows;
    return (
      <div
        style={{
          width: summonEntry.frameWidth * normalizedScale,
          height: summonEntry.frameHeight * normalizedScale,
          backgroundImage: `url(${summonEntry.path})`,
          backgroundPosition: `
            -${col * summonEntry.frameWidth * normalizedScale}px
            -${row * summonEntry.frameHeight * normalizedScale}px
          `,
          backgroundSize: `
            ${sheetW * normalizedScale}px
            ${sheetH * normalizedScale}px
          `,
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
          flexShrink: 0,
        }}
      />
    );
  }

  let frameIndex;
  let spriteSheet;

  if (ICON_SHEET_1_FRAMES[itemId] !== undefined) {
    frameIndex = ICON_SHEET_1_FRAMES[itemId];
    spriteSheet = ICON_SPRITESHEET;
  } else if (ICON_SHEET_2_FRAMES[itemId] !== undefined) {
    frameIndex = ICON_SHEET_2_FRAMES[itemId];
    spriteSheet = ICON_SPRITESHEET_2;
  } else if (MONSTER_LOOTS_FRAMES[itemId] !== undefined) {
    frameIndex = MONSTER_LOOTS_FRAMES[itemId];
    spriteSheet = MONSTER_LOOTS_SPRITESHEET;
  } else if (ITEMS_1_FRAMES[itemId] !== undefined) {
    frameIndex = ITEMS_1_FRAMES[itemId];
    spriteSheet = ITEMS_1_SPRITESHEET;
  } else if (WEAPON_TIERS_FRAMES[itemId] !== undefined) {
    frameIndex = WEAPON_TIERS_FRAMES[itemId];
    spriteSheet = WEAPONS_TIERS_SPRITESHEET;
  } else if (ARMOR_TIERS_FRAMES[itemId] !== undefined) {
    frameIndex = ARMOR_TIERS_FRAMES[itemId];
    spriteSheet = ARMOR_TIERS_SPRITESHEET;
  } else if (STAFF_TIERS_FRAMES[itemId] !== undefined) {
    frameIndex = STAFF_TIERS_FRAMES[itemId];
    spriteSheet = STAFF_ALL_TIERS_SPRITESHEET;
  } else if (ARMOR_TEXTILE_TIERS_FRAMES[itemId] !== undefined) {
    frameIndex = ARMOR_TEXTILE_TIERS_FRAMES[itemId];
    spriteSheet = ARMOR_TEXTILE_TIERS_SPRITESHEET;
  } else if (PANTS_TIERS_FRAMES[itemId] !== undefined) {
    frameIndex = PANTS_TIERS_FRAMES[itemId];
    spriteSheet = PANTS_TIERS_SPRITESHEET;
  } else if (BELT_ALL_TIERS_FRAMES[itemId] !== undefined) {
    frameIndex = BELT_ALL_TIERS_FRAMES[itemId];
    spriteSheet = BELT_ALL_TIERS_SPRITESHEET;
  } else if (RING_NECKLACE_TIERS_FRAMES[itemId] !== undefined) {
    frameIndex = RING_NECKLACE_TIERS_FRAMES[itemId];
    spriteSheet = RING_NECKLACE_ALL_TIERS_SPRITESHEET;
  } else if (DETAILS_FRAMES[itemId] !== undefined) {
    frameIndex = DETAILS_FRAMES[itemId];
    spriteSheet = DETAILS_SPRITESHEET;
  } else if (ICON_SCROLL_FRAMES[itemId] !== undefined) {
    frameIndex = ICON_SCROLL_FRAMES[itemId];
    spriteSheet = ICON_SCROLL_SPRITESHEET;
  } else {
    return null;
  }

  const col = frameIndex % spriteSheet.columns;
  const row = Math.floor(frameIndex / spriteSheet.columns);

  const sheetW = spriteSheet.frameWidth * spriteSheet.columns;

  const sheetH = spriteSheet.frameHeight * spriteSheet.rows;

  const tint = ICON_TINTS[itemId];
  const def = resolveItemDef(itemId);
  const isUnique = def?.unique === true;
  const uniqueGlow = isUnique
    ? "drop-shadow(0 0 3px #ffd700) drop-shadow(0 0 5px #ffd700)"
    : "none";

  if (tint) {
    return (
      <TintedItemIcon
        itemId={itemId}
        scale={scale}
        frameIndex={frameIndex}
        spriteSheet={spriteSheet}
        tint={tint}
        extraFilter={uniqueGlow}
      />
    );
  }

  return (
    <div
      style={{
        width: spriteSheet.frameWidth * scale,
        height: spriteSheet.frameHeight * scale,
        backgroundImage: `url(${spriteSheet.path})`,
        backgroundPosition: `
          -${col * spriteSheet.frameWidth * scale}px
          -${row * spriteSheet.frameHeight * scale}px
        `,
        backgroundSize: `
          ${sheetW * scale}px
          ${sheetH * scale}px
        `,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        flexShrink: 0,
        filter: uniqueGlow,
      }}
    />
  );
}

/**
 * Verifie si un id (objet OU competence, generique) a une icone
 * enregistree dans l'un des deux spritesheets d'icones - sans afficher
 * quoi que ce soit, juste un test. Sert a decider "icone ou texte" AVANT
 * de rendre, contrairement a ItemIcon qui rend directement (et retourne
 * null silencieusement si rien trouve).
 */
export function hasIconFrame(id) {
  return (
    resolveSummonIconEntry(id) !== null ||
    ICON_SHEET_1_FRAMES[id] !== undefined ||
    ICON_SHEET_2_FRAMES[id] !== undefined ||
    MONSTER_LOOTS_FRAMES[id] !== undefined ||
    ITEMS_1_FRAMES[id] !== undefined ||
    WEAPON_TIERS_FRAMES[id] !== undefined ||
    ARMOR_TIERS_FRAMES[id] !== undefined ||
    STAFF_TIERS_FRAMES[id] !== undefined ||
    ARMOR_TEXTILE_TIERS_FRAMES[id] !== undefined ||
    PANTS_TIERS_FRAMES[id] !== undefined ||
    BELT_ALL_TIERS_FRAMES[id] !== undefined ||
    RING_NECKLACE_TIERS_FRAMES[id] !== undefined ||
    ICON_SCROLL_FRAMES[id] !== undefined ||
    DETAILS_FRAMES[id] !== undefined
  );
}
/**
 * Écran d'inventaire - presente comme un livre ouvert (image de fond).
 * Page de gauche = objets ; page de droite = mannequin d'equipement +
 * statistiques. Toutes les actions (équiper/déséquiper/utiliser)
 * appellent directement les méthodes déjà testées de MainScene - ce
 * composant n'a aucune logique propre (hormis le regroupement
 * d'affichage ci-dessus), juste de l'affichage et des clics.
 */
export default function InventoryScreen({
  inventory,
  equipped,
  stats,
  heroId,
  isMobile,
  unlockedRecipes,
  onEquip,
  onUnequip,
  onUse,
  onDecraft,
  onClose,
}) {
  console.log(stats);
  const heroEntry = SPRITE_REGISTRY[heroId] || SPRITE_REGISTRY.hero1;
  const sheetCols = heroEntry.sheetCols || 12;
  const sheetRows = heroEntry.sheetRows || 8;

  const idleFrameIndex = heroEntry.animations.idleDown;
  const col = idleFrameIndex % sheetCols;
  const row = Math.floor(idleFrameIndex / sheetCols);
  const sheetW = heroEntry.frameWidth * sheetCols;
  const sheetH = heroEntry.frameHeight * sheetRows;

  function renderSlot(slot, fullWidth = false) {
    const itemId = equipped[slot];
    const def = itemId ? resolveItemDef(itemId) : null;

    const mainHandDef =
      slot === "offHand" && equipped.mainHand
        ? resolveItemDef(equipped.mainHand)
        : null;
    const lockedByTwoHanded = mainHandDef && mainHandDef.twoHanded;

    const quiverQuantity =
      slot === "quiver" && itemId
        ? inventory.find((i) => i.itemId === itemId)?.quantity || 0
        : null;

    return (
      <div
        style={{
          padding: 4,
          background: "rgba(120,100,70,0.12)",
          border: "1px solid rgba(90,74,53,0.3)",
          borderRadius: 6,
          minHeight: def ? 0 : 46,
          width: fullWidth ? "100%" : "100%",
          maxWidth: fullWidth ? "none" : 88,
          minWidth: 0,
          color: "#241a10",
          boxSizing: "border-box",
        }}
      >
        {def ? (
          // occupé : juste icône + bouton retirer, nom du slot et de
          // l'objet masqués (visibles au survol via title) pour gagner
          // de la place autour du sprite
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              position: "relative",
            }}
            title={def.description}
          >
            <div style={{ position: "relative" }}>
              <ItemIcon itemId={itemId} scale={1.1} />
              {quiverQuantity !== null && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    fontSize: 8,
                    background: "#eee2cc",
                    border: "1px solid #8a7050",
                    borderRadius: 3,
                    padding: "0 2px",
                    color: "#5a4a35",
                  }}
                >
                  x{quiverQuantity}
                </div>
              )}
            </div>
            <button
              onClick={() => onUnequip(slot)}
              title="Retirer"
              style={{
                padding: "1px 4px",
                fontSize: 11,
                lineHeight: 1,
                borderRadius: 4,
                border: "1px solid #8a7050",
                background: "none",
                color: "#5a4a35",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 9, color: "#4a3a28" }}>
              {SLOT_LABELS[slot]}
            </div>
            <div
              style={{
                fontSize: 9,
                color: lockedByTwoHanded ? "#8a7050" : "#6a5940",
                marginTop: 2,
              }}
            >
              {lockedByTwoHanded ? "Occupée (2 mains)" : "Vide"}
            </div>
          </>
        )}
      </div>
    );
  }

  // les flèches equipees (cf. equipped.quiver) ne quittent JAMAIS
  // reellement this.inventory (contrairement a un objet d'equipement
  // classique - cf. MainScene.equipItem, categorie 'ammo') - sans ce
  // filtre, elles apparaitraient a la fois dans la case Carquois ET
  // dans "Objets", alors que tout le reste de l'equipement disparait de
  // cette liste une fois equipe. Le filtre se base sur l'itemId (pas la
  // categorie generique) : si un jour un autre type de munition existe,
  // il faudra le meme traitement pour son propre emplacement.
  const groupedItems = groupInventory(inventory).filter(
    (group) => group.itemId !== equipped.quiver,
  );

  const containerRef = useRef(null);
  const [bookSize, setBookSize] = useState({ width: 800, height: 500 });

  useEffect(() => {
    function updateSize() {
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      const availW = parent.clientWidth * 0.9;
      const availH = parent.clientHeight * 0.85;
      const ratio = 800 / 500;
      let w = availW;
      let h = w / ratio;
      if (h > availH) {
        h = availH;
        w = h * ratio;
      }
      setBookSize({ width: w, height: h });
    }
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current?.parentElement) {
      observer.observe(containerRef.current.parentElement);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: bookSize.width,
          height: bookSize.height,
          backgroundImage: `url(${bookPages})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "2%",
            right: "6%",
            padding: "6px 14px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid #8a7050",
            background: "rgba(58,47,32,0.85)",
            color: "#f0e6d0",
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          Fermer
        </button>

        {/* Page gauche - Objets */}
        <div
          className="book-page-scroll"
          style={{
            position: "absolute",
            top: "9%",
            left: "9%",
            width: "38%",
            height: "80%",
            overflowY: "auto",
            overflowX: "hidden",
            color: "#241a10",
          }}
        >
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Objets</h3>
          {groupedItems.length === 0 && (
            <div style={{ color: "#5a4a35", fontSize: 12 }}>
              Inventaire vide.
            </div>
          )}
          {(() => {
            function renderItemRow(group) {
              const def = resolveItemDef(group.itemId);
              return (
                <div
                  key={group.itemId}
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                    justifyContent: "space-between",
                    gap: 6,
                    padding: 8,
                    background: "rgba(120,100,70,0.1)",
                    border: "1px solid rgba(90,74,53,0.25)",
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                      flexShrink: 1,
                    }}
                  >
                    <ItemIcon itemId={group.itemId} scale={1.5} />

                    <div>
                      <div style={{ fontSize: 12 }}>
                        {def.name}
                        {group.totalQuantity > 1
                          ? ` x${group.totalQuantity}`
                          : ""}
                      </div>

                      <div
                        style={{ fontSize: 10, color: "#4a3a28", marginTop: 1 }}
                      >
                        {def.description}
                      </div>
                    </div>
                  </div>
                  {(def.category === "equipment" ||
                    def.category === "ammo") && (
                    <button
                      onClick={() => onEquip(group.firstIndex)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        borderRadius: 5,
                        border: "1px solid #8a7050",
                        background: "#8a7050",
                        color: "#fff8ea",
                        cursor: "pointer",
                        alignSelf: isMobile ? "center" : undefined,
                      }}
                    >
                      Équiper
                    </button>
                  )}
                  {(def.category === "consumable" ||
                    def.category === "abilityScroll" ||
                    def.category === "recipeScroll") && (
                    <button
                      onClick={() => onUse(group.firstIndex)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        borderRadius: 5,
                        border: "1px solid #8a7050",
                        background: "#8a7050",
                        color: "#fff8ea",
                        cursor: "pointer",
                        alignSelf: isMobile ? "center" : undefined,
                      }}
                    >
                      Utiliser
                    </button>
                  )}
                  {Object.values(CRAFTING_RECIPES).some(
                    (r) =>
                      r.resultItemId === group.itemId &&
                      unlockedRecipes.includes(r.id),
                  ) && (
                    <button
                      onClick={() => onDecraft(group.firstIndex)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        borderRadius: 5,
                        border: "1px solid #8a7050",
                        background: "rgba(120,100,70,0.15)",
                        color: "#5a4a35",
                        cursor: "pointer",
                      }}
                    >
                      Décrafter
                    </button>
                  )}
                </div>
              );
            }

            const CATEGORY_GROUPS = [
              {
                key: "tool",
                label: "Outils",
                test: (def) =>
                  def.category === "equipment" && def.slot === "tool",
              },
              {
                key: "equipment",
                label: "Équipements",
                test: (def) =>
                  (def.category === "equipment" && def.slot !== "tool") ||
                  def.category === "ammo",
              },
              {
                key: "scroll",
                label: "Parchemins & recettes",
                test: (def) =>
                  def.category === "abilityScroll" ||
                  def.category === "recipeScroll",
              },
              {
                key: "consumable",
                label: "Potions",
                test: (def) => def.category === "consumable",
              },
              {
                key: "material",
                label: "Craftable",
                test: (def) => def.category === "craftingMaterial",
              },
            ];

            const usedItemIds = new Set();
            const sections = CATEGORY_GROUPS.map((cat) => {
              const items = groupedItems.filter((g) => {
                if (usedItemIds.has(g.itemId)) return false;
                const matches = cat.test(resolveItemDef(g.itemId));
                if (matches) usedItemIds.add(g.itemId);
                return matches;
              });
              return { ...cat, items };
            });
            const otherItems = groupedItems.filter(
              (g) => !usedItemIds.has(g.itemId),
            );

            return (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {sections.map(
                  (section) =>
                    section.items.length > 0 && (
                      <div key={section.key}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: "bold",
                            color: "#5a4a35",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginBottom: 6,
                          }}
                        >
                          {section.label}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          {section.items.map(renderItemRow)}
                        </div>
                      </div>
                    ),
                )}
                {otherItems.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: "bold",
                        color: "#5a4a35",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 6,
                      }}
                    >
                      Autres
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {otherItems.map(renderItemRow)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Page droite - Personnage (mannequin d'equipement + stats) */}
        <div
          className="book-page-scroll"
          style={{
            position: "absolute",
            top: "9%",
            left: "54%",
            width: "37%",
            height: "80%",
            overflowY: "auto",
            overflowX: "hidden",
            color: "#241a10",
          }}
        >
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Personnage</h3>

          {stats && (
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "2px 12px",
                  fontSize: 11,
                }}
              >
                {[
                  ["Niveau", stats.level],
                  ["PV max", stats.maxHp],
                  ["Mana max", stats.maxMana],
                  ["Stamina max", stats.maxStamina],
                  ["Dégâts (mêlée)", stats.meleeDamage],
                  ["Dégâts (distance)", stats.rangedDamage],
                  ["Défense", stats.defense],
                  ["Vitesse", stats.moveSpeed],
                  ["Distance de vue", stats.visionRadius],
                  ["Portée à distance", stats.rangedRange],
                  ["Régén. PV", `${stats.hpRegen?.toFixed(1)}/s`],
                  ["Régén. mana", `${stats.manaRegen?.toFixed(1)}/s`],
                  ["Régén. stamina", `${stats.staminaRegen?.toFixed(1)}/s`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ color: "#4a3a28" }}>{label}</span>
                    <span style={{ fontWeight: "bold" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* mannequin en grille CSS - collier a cote du casque en haut,
              mains de part et d'autre du heros, puis une pile par cote
              associee a chaque main (bague, puis armure/ceinture, puis
              pantalon/bottes) - cote gauche = main principale, cote droit
              = main secondaire. "Casque"/"Ceinture"/"Bagues" restent VIDES
              pour l'instant : aucun objet du jeu ne cible encore ces
              emplacements (cf. itemDefs.js) - la mannequin est prete a les
              recevoir des qu'ils existeront. */}
          {isMobile ? (
            // liste verticale simple en mobile - aucun risque de debordement
            // horizontal (contrairement a la grille croisee, trop etroite sur un
            // petit ecran), au prix d'une presentation moins "mannequin"
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  width: heroEntry.frameWidth * PREVIEW_SCALE,
                  height: heroEntry.frameHeight * PREVIEW_SCALE,
                  backgroundImage: `url(${heroEntry.path})`,
                  backgroundPosition: `-${col * heroEntry.frameWidth * PREVIEW_SCALE}px -${row * heroEntry.frameHeight * PREVIEW_SCALE}px`,
                  backgroundSize: `${sheetW * PREVIEW_SCALE}px ${sheetH * PREVIEW_SCALE}px`,
                  imageRendering: "pixelated",
                  alignSelf: "center",
                  marginBottom: 6,
                }}
              />
              {[
                "necklace",
                "helmet",
                "quiver",
                "mainHand",
                "offHand",
                "ring1",
                "ring2",
                "tool",
                "armor",
                "belt",
                "pants",
                "boots",
              ].map((slot) => (
                <div key={slot}>{renderSlot(slot, true)}</div>
              ))}
            </div>
          ) : (
            // mannequin en grille CSS - collier a cote du casque en haut,
            // mains de part et d'autre du heros, puis une pile par cote
            // associee a chaque main (bague, puis armure/ceinture, puis
            // pantalon/bottes) - cote gauche = main principale, cote droit
            // = main secondaire. "Casque"/"Ceinture"/"Bagues" restent VIDES
            // pour l'instant : aucun objet du jeu ne cible encore ces
            // emplacements (cf. itemDefs.js) - la mannequin est prete a les
            // recevoir des qu'ils existeront.
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              {/* Colonne gauche */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  alignItems: "flex-end",
                }}
              >
                {renderSlot("necklace")}
                {renderSlot("mainHand")}
                {renderSlot("ring1")}
                {renderSlot("armor")}
                {renderSlot("boots")}
              </div>

              {/* Colonne centrale : casque + héros */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {renderSlot("helmet")}
                <div
                  style={{
                    width: heroEntry.frameWidth * PREVIEW_SCALE,
                    height: heroEntry.frameHeight * PREVIEW_SCALE,
                    backgroundImage: `url(${heroEntry.path})`,
                    backgroundPosition: `-${col * heroEntry.frameWidth * PREVIEW_SCALE}px -${row * heroEntry.frameHeight * PREVIEW_SCALE}px`,
                    backgroundSize: `${sheetW * PREVIEW_SCALE}px ${sheetH * PREVIEW_SCALE}px`,
                    imageRendering: "pixelated",
                  }}
                />
                {renderSlot("tool")}
              </div>

              {/* Colonne droite */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  alignItems: "flex-start",
                }}
              >
                {renderSlot("quiver")}
                {renderSlot("offHand")}
                {renderSlot("ring2")}
                {renderSlot("belt")}
                {renderSlot("pants")}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
  .book-page-scroll::-webkit-scrollbar {
    width: 7px;
  }
  .book-page-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .book-page-scroll::-webkit-scrollbar-thumb {
    background: rgba(90, 74, 53, 0.45);
    border-radius: 4px;
  }
  .book-page-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(90, 74, 53, 0.65);
  }
  .book-page-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(90, 74, 53, 0.45) transparent;
  }
`}</style>
    </div>
  );
}
