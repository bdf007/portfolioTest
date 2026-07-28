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
import openExitDoorImage from "../../assets/openExitDoor.png";
import closeExitDoorImage from "../../assets/closeExitDoor.png";
import openStartDoorImage from "../../assets/openStartDoor.png";
import backTileImage from "../../assets/backTile.png";
// Spritesheets de marche animée : 3 colonnes (frames) × 4 lignes
// (bas, gauche, droite, haut — ordre standard RPG Maker)
import hero1WalkSheet from "../../assets/hero1_walk.png";
import hero2WalkSheet from "../../assets/hero2_walk.png";
import hero3WalkSheet from "../../assets/hero3_walk.png";
import hero4WalkSheet from "../../assets/hero4_walk.png";

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
  openExitDoorImage,
  closeExitDoorImage,
  openStartDoorImage,
  backTileImage,
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
