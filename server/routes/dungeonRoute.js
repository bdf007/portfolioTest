const express = require("express");
const router = express.Router();
const GameController = require("../controllers/GameController");
const { authMiddleware } = require("../middlewares/auth");

// Toutes les routes de ce router nécessitent d'être authentifié
router.use(authMiddleware);

router.post("/create-game", GameController.createGame);
router.post("/my-games", GameController.getMyGames);
router.post("/leaderboard", GameController.getLeaderboard);
router.get("/admin/games", GameController.getAllGamesAdmin);
router.delete("/admin/games/:gameId", GameController.deleteGameAdmin);
router.post("/abandon-game", GameController.abandonGame);

router.post("/roll-three-dices", GameController.rollThreeDices);
router.post("/roll-weapon-die", GameController.rollWeaponDie);
router.post("/confirm-hero", GameController.confirmHero);
router.post("/choose-hero-sprite", GameController.chooseHeroSprite);

router.post("/roll-dice", GameController.rollDice);
router.post("/move-one-step", GameController.moveOneStep);
router.post("/stop-movement", GameController.stopMovement);
router.post("/resolve-trap-choice", GameController.resolveTrapChoice);
router.post("/resolve-enemy-choice", GameController.resolveEnemyChoice);

router.post("/reveal-tile", GameController.revealTile);
router.post("/roll-gouffre-fall", GameController.rollGouffreFall);
router.post("/confirm-gouffre-death", GameController.confirmGouffreDeath);
router.post("/dismiss-floor-recap", GameController.dismissFloorRecap);
router.post("/pickup-key", GameController.pickUpKey);
router.post("/open-chest", GameController.openChest);
router.post("/recreate-hero", GameController.recreateHero);

router.post("/buy-item", GameController.buyItem);
router.post("/use-item", GameController.useItem);

router.post("/start-combat", GameController.startCombat);
router.post("/decline-combat", GameController.declineCombat);
router.post("/attempt-hide-forced", GameController.attemptHideForced);
router.post("/attack-round", GameController.attackRound);
router.post("/stop-combat", GameController.stopCombat);

module.exports = router;
