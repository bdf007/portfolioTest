const express = require("express");
const router = express.Router();

// import controllers
const {
  createGame,
  getGames,
  getGamesWithoutImageData,
  deleteGameById,
  updateGameById,
  getGameById,
  getAGameRamdomly,
  getGameImage,
} = require("../controllers/game");
const { adminAuthMiddleware } = require("../middlewares/auth");
// api routes
router.post("/game", adminAuthMiddleware, createGame);
router.get("/games", getGames);
router.get("/games/noimage", getGamesWithoutImageData);
router.delete("/game/:id", adminAuthMiddleware, deleteGameById);
router.put("/game/:id", adminAuthMiddleware, updateGameById);
router.get("/game/:id", getGameById);
router.get("/games/random", getAGameRamdomly);
router.get("/games/image/:id", getGameImage);

module.exports = router;
