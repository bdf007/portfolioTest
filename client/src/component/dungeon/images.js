import heroImage from "../../assets/hero.png";
import hero2Image from "../../assets/hero2.png";
import hero3Image from "../../assets/hero3.png";
import hero4Image from "../../assets/hero4.png";
import shopImage from "../../assets/shop.png";
import coffreFermeImage from "../../assets/coffreFerme.png";
import coffreOuvertImage from "../../assets/coffreOuvert.png";
import gouffreImage from "../../assets/gouffre.png";
import herseImage from "../../assets/herse.png";
import keyImage from "../../assets/key.png";
import solImage from "../../assets/sol.png";
import ratImage from "../../assets/rat.png";
import bigRatImage from "../../assets/bigRat.png";
import blueBlobImage from "../../assets/blueBlob.png";
import redBlobImage from "../../assets/redBlob.png";
import greenBlobImage from "../../assets/greenBlob.png";
import bigBlueBlobImage from "../../assets/bigBlueBlob.png";
import bigRedBlobImage from "../../assets/bigRedBlob.png";
import bigGreenBlobImage from "../../assets/bigGreenBlob.png";
import bossDragonImage from "../../assets/bossDragon.png";
import chestMimicImage from "../../assets/chestMimic.png";
import backTileImage from "../../assets/backTile.png";
import openStartDoorImage from "../../assets/openStartDoor.png";
import closeExitDoorImage from "../../assets/closeExitDoor.png";
import openExitDoorImage from "../../assets/openExitDoor.png";
// Spritesheets de marche animée : 3 colonnes (frames) × 4 lignes
// (bas, gauche, droite, haut — ordre standard RPG Maker)
import hero1WalkSheet from "../../assets/hero1_walk.png";
import hero2WalkSheet from "../../assets/hero2_walk.png";
import hero3WalkSheet from "../../assets/hero3_walk.png";
import hero4WalkSheet from "../../assets/hero4_walk.png";

import bombImage from "../../assets/bomb.png";
import inventoryImage from "../../assets/inventory.png";
import sol2Image from "../../assets/sol2.png";
import sol3Image from "../../assets/sol3.png";
import sol4Image from "../../assets/sol4.png";
import sol5Image from "../../assets/sol5.png";
import potionSimpleIcon from "../../assets/potion_simple.png";
import potionTripleIcon from "../../assets/potion_triple.png";
import potionWeaponIcon from "../../assets/potion_weapon.png";

export {
  heroImage,
  shopImage,
  coffreFermeImage,
  coffreOuvertImage,
  gouffreImage,
  herseImage,
  keyImage,
  solImage,
  ratImage,
  bigRatImage,
  bossDragonImage,
  chestMimicImage,
  backTileImage,
  openStartDoorImage,
  closeExitDoorImage,
  openExitDoorImage,
};

const BLOB_IMAGES = {
  rouge: { small: redBlobImage, big: bigRedBlobImage },
  bleu: { small: blueBlobImage, big: bigBlueBlobImage },
  vert: { small: greenBlobImage, big: bigGreenBlobImage },
};

export function getBlobImage(tile) {
  const palette = BLOB_IMAGES[tile.color] || BLOB_IMAGES.rouge;
  return tile.type === "monstre-gelatineux" ? palette.big : palette.small;
}

export const HERO_SPRITES = {
  1: heroImage,
  2: hero2Image,
  3: hero3Image,
  4: hero4Image,
};

export function getHeroSprite(spriteId) {
  return HERO_SPRITES[spriteId] || heroImage;
}

export const HERO_WALK_SHEETS = {
  1: hero1WalkSheet,
  2: hero2WalkSheet,
  3: hero3WalkSheet,
  4: hero4WalkSheet,
};

export function getHeroWalkSheet(spriteId) {
  return HERO_WALK_SHEETS[spriteId] || hero1WalkSheet;
}

export { inventoryImage };

// 5 variantes de sol (sol.png + sol2 à sol5), une seule choisie par étage
// (côté serveur, pour rester stable si la page est rechargée) — pas un choix
// aléatoire par tuile, qui ferait un patchwork incohérent.
export const SOL_VARIANTS = [
  solImage,
  sol2Image,
  sol3Image,
  sol4Image,
  sol5Image,
];

export function getSolVariant(index) {
  return SOL_VARIANTS[index % SOL_VARIANTS.length] || solImage;
}

// Icônes d'objets pour l'inventaire — potionCoffre/potionSimple partagent la
// même icône (même effet), pareil pour armeCoffre/armeBonus, et les deux
// types de bombes partagent l'icône générique de bombe.
export const ITEM_ICONS = {
  potionCoffre: potionSimpleIcon,
  potionSimple: potionSimpleIcon,
  potionTriple: potionTripleIcon,
  armeCoffre: potionWeaponIcon,
  armeBonus: potionWeaponIcon,
  bombeCarre: bombImage,
  bombeLigne: bombImage,
};
