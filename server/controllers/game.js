const Game = require("../models/game");
const mongoose = require("mongoose");
const {
  uploadBase64Image,
  getFreshImageLink,
  deleteFile,
} = require("../services/pcloud");

const PCLOUD_SUBFOLDER = "ludotheque";

exports.createGame = async (req, res) => {
  try {
    const gameData = { ...req.body };

    if (gameData.imageData) {
      const fileid = await uploadBase64Image(
        gameData.imageData,
        `game-${Date.now()}.webp`,
        PCLOUD_SUBFOLDER,
      );
      gameData.pcloudFileId = fileid;
    }
    delete gameData.imageData;

    const newGame = new Game(gameData);
    await newGame.save();

    res.status(200).json({
      message: "Game created successfully",
      game: newGame,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// get all games with the status accepted but dont send back the imageData
exports.getGamesWithoutImageData = async (req, res) => {
  try {
    const games = await Game.find({ status: "accepted" }).select("-imageData");
    res.status(200).json(games);
  } catch (error) {
    console.log(error);
  }
};

exports.getGames = async (req, res) => {
  try {
    // imageData n'est plus renvoyé : les images passent désormais par
    // /api/games/image/:id, plus besoin d'alourdir la réponse avec le Base64
    const games = await Game.find({}).select("-imageData");
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

    if (gameToDelete.pcloudFileId) {
      await deleteFile(gameToDelete.pcloudFileId);
    }

    await Game.findByIdAndRemove(id);
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

    const updateData = { ...req.body };

    // Une nouvelle image a été envoyée : on l'upload et on remplace l'ancienne
    if (updateData.imageData) {
      const fileid = await uploadBase64Image(
        updateData.imageData,
        `game-${Date.now()}.webp`,
        PCLOUD_SUBFOLDER,
      );
      if (gameToUpdate.pcloudFileId) {
        await deleteFile(gameToUpdate.pcloudFileId);
      }
      updateData.pcloudFileId = fileid;
    }
    delete updateData.imageData;

    const updatedGame = await Game.findByIdAndUpdate(id, updateData, {
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
    const _id = new mongoose.Types.ObjectId(id);
    const gameInfo = await Game.findById(_id).select("-imageData");
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

exports.getAGameRamdomly = async (req, res) => {
  try {
    const games = await Game.find({}).select("-imageData");
    const randomGame = games[Math.floor(Math.random() * games.length)];
    res.status(200).json(randomGame);
  } catch (error) {
    console.log(error);
  }
};

/**
 * Route-relais pour l'image d'un jeu. URL stable pour le frontend
 * (/api/games/image/:id), qui redemande un lien pCloud frais à chaque appel
 * et redirige dessus (les liens pCloud expirent, celui-ci non).
 * Fallback sur l'ancien Base64 pour les jeux pas encore migrés.
 */
exports.getGameImage = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id).select(
      "pcloudFileId imageData",
    );
    if (!game) return res.status(404).end();

    if (game.pcloudFileId) {
      const url = await getFreshImageLink(game.pcloudFileId);
      return res.redirect(url);
    }

    if (game.imageData) {
      const matches = game.imageData.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        res.set("Content-Type", matches[1]);
        return res.send(Buffer.from(matches[2], "base64"));
      }
    }

    return res.status(404).end();
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
};
