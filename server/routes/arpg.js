const express = require("express");
const router = express.Router();
const ArpgController = require("../controllers/ArpgController");
const { authMiddleware } = require("../middlewares/auth");

// meme pattern que dungeonRoutes.js : protege toutes les routes du
// module d'un coup plutot que route par route
router.use(authMiddleware);

router.get("/ping", ArpgController.ping);
router.get("/level", ArpgController.getLevel);
router.get("/my-games", ArpgController.getMyGames);
router.post("/save", ArpgController.saveProgress);
router.post("/abandon", ArpgController.abandonGame);

module.exports = router;

/**
 * Dans server/index.js, à côté du montage existant des routes du donjon,
 * ajouter simplement :
 *
 *   const arpgRoutes = require('./routes/arpg');
 *   app.use('/api/arpg', arpgRoutes);
 */
