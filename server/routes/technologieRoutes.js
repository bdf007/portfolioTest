const express = require("express");
const upload = require("../config/multerConfig");

const router = express.Router();

// import controllers
const {
  getTechnologie,
  postTechnologie,
  getTechnologieById,
  updateTechnologieById,
  deleteTechnologieById,
} = require("../controllers/technologie");

// GET route for getting all the technologies
router.get("/getTechnologies", getTechnologie);

// GET route for getting a single technologie
router.get("/getTechnologie/:id", getTechnologieById);

// POST route for file upload
router.post("/upload", upload.single("file"), postTechnologie);

// update specific technologie by id
router.put("/updateTechnologie/:id", updateTechnologieById);

// DELETE route for deleting an technologie
router.delete("/deleteTechnologie/:id", deleteTechnologieById);

module.exports = router;
