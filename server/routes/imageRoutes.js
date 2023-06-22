const express = require("express");
const ImageModel = require("../models/Images");
const upload = require("../config/multerConfig");

const router = express.Router();

// import controllers
const {
  getImage,
  postImage,
  getImageById,
  deleteImageById,
} = require("../controllers/image");

// GET route for getting all the images
router.get("/getImages", getImage);

// GET route for getting a single image
router.get("/getImage/:id", getImageById);

// POST route for file upload
router.post("/upload", upload.single("file"), postImage);

// DELETE route for deleting an image
router.delete("/deleteImage/:id", deleteImageById);

module.exports = router;
