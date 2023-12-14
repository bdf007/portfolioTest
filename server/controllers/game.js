const Game = require("../models/game");
const mongoose = require("mongoose");

exports.createGame = async (req, res) => {
  const newGame = new Game(req.body);
  await newGame.save();

  res.status(200).json({
    message: "Game created successfully",
    //  send back the new game
    game: newGame,
  });
};

exports.getGames = async (req, res) => {
  try {
    const games = await Game.find({});
    res.status(200).json(games);
  } catch (error) {
    console.log(error);
  }
};

exports.deleteGameById = async (req, res) => {
  try {
    const id = req.params.id;
    const gameToDelete = await Game.findById(id);
    if (!gameToDelete) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    const deletedGame = await Game.findByIdAndRemove(id);
    res.json({ message: "Game deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};
exports.updateGameById = async (req, res) => {
  try {
    const id = req.params.id;
    const gameToUpdate = await Game.findById(id);
    if (!gameToUpdate) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    // if the game exists, update it
    const updatedGame = await Game.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.status(200).json({
      message: "Game updated successfully",
      updatedGame: updatedGame,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// get game info
exports.getGameById = async (req, res) => {
  try {
    const id = req.params.id;
    // convert the id to a mongoose object
    const _id = new mongoose.Types.ObjectId(id);
    const gameInfo = await Game.findById(_id);
    if (!gameInfo) {
      return res.status(404).json({
        error: "Game not found",
      });
    }
    res.status(200).json(gameInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};
