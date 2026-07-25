import heroImage from "../../assets/hero.png";
import openStartDoorImage from "../../assets/openStartDoor.png";
import closeExitDoorImage from "../../assets/closeExitDoor.png";
import openExitDoorImage from "../../assets/openExitDoor.png";
import shopImage from "../../assets/shop.png";
import coffreFermeImage from "../../assets/coffreFerme.png";
import coffreOuvertImage from "../../assets/coffreOuvert.png";
import gouffreImage from "../../assets/gouffre.png";
import herseImage from "../../assets/herse.png";
import keyImage from "../../assets/key.png";
import solImage from "../../assets/sol.png";
import backTileImage from "../../assets/backTile.png";
import ratImage from "../../assets/rat.png";
import bigRatImage from "../../assets/bigRat.png";
import blueBlobImage from "../../assets/blueBlob.png";
import redBlobImage from "../../assets/redBlob.png";
import greenBlobImage from "../../assets/greenBlob.png";
import bigBlueBlobImage from "../../assets/bigBlueBlob.png";
import bigRedBlobImage from "../../assets/bigRedBlob.png";
import bigGreenBlobImage from "../../assets/bigGreenBlob.png";
import chestMimicImage from "../../assets/chestMimic.png";
import bossDragonImage from "../../assets/bossDragon.png";

export {
  heroImage,
  shopImage,
  openStartDoorImage,
  closeExitDoorImage,
  openExitDoorImage,
  coffreFermeImage,
  coffreOuvertImage,
  gouffreImage,
  herseImage,
  keyImage,
  solImage,
  ratImage,
  bigRatImage,
  chestMimicImage,
  backTileImage,
  bossDragonImage,
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
