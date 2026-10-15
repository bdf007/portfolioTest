const express = require("express");
const router = express.Router();
const ArpgController = require("../controllers/ArpgController");
const HandmadeEditor = require("../controllers/handmadeEditorController");
const { authMiddleware } = require("../middlewares/auth");

// meme pattern que dungeonRoutes.js : protege toutes les routes du
// module d'un coup plutot que route par route
router.use(authMiddleware);

router.get("/ping", ArpgController.ping);
router.get("/level", ArpgController.getLevel);
router.get("/my-games", ArpgController.getMyGames);
router.post("/save", ArpgController.saveProgress);
router.post("/abandon", ArpgController.abandonGame);
router.post("/delete", ArpgController.deleteGame);

// editeur de niveaux faits main (reserve a ARPG_EDITOR_USERS)
router.get("/editor/status", HandmadeEditor.status);
router.get("/editor/levels", HandmadeEditor.listLevels);
router.get("/editor/levels/:depth", HandmadeEditor.getLevelFile);
router.put("/editor/levels/:depth", HandmadeEditor.putLevelFile);
router.delete("/editor/levels/:depth", HandmadeEditor.removeLevelFile);

module.exports = router;

/**
 * Dans server/index.js, à côté du montage existant des routes du donjon,
 * ajouter simplement :
 *
 *   const arpgRoutes = require('./routes/arpg');
 *   app.use('/api/arpg', arpgRoutes);
 */
