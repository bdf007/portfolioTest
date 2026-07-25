const express = require("express");
const router = express.Router();

// import controllers
const {
  getTechnologie,
  postTechnologie,
  getTechnologieById,
  updateTechnologieById,
  deleteTechnologieById,
} = require("../controllers/technologie");

const { adminAuthMiddleware } = require("../middlewares/auth");

// GET route for getting all the technologies
router.get("/getTechnologies", getTechnologie);

// GET route for getting a single technologie
router.get("/getTechnologie/:id", adminAuthMiddleware, getTechnologieById);

// POST route for file upload
router.post("/upload", adminAuthMiddleware, postTechnologie);

// update specific technologie by id
router.put(
  "/updateTechnologie/:id",
  adminAuthMiddleware,
  updateTechnologieById,
);

// DELETE route for deleting an technologie
router.delete(
  "/deleteTechnologie/:id",
  adminAuthMiddleware,
  deleteTechnologieById,
);

module.exports = router;
