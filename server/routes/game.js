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
} = require("../controllers/game");
// api routes
router.post("/game", createGame);
router.get("/games", getGames);
router.get("/games/noimage", getGamesWithoutImageData);
router.delete("/game/:id", deleteGameById);
router.put("/game/:id", updateGameById);
router.get("/game/:id", getGameById);

module.exports = router;
