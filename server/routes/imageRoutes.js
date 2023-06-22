const express = require("express");
const upload = require("../config/multerConfig");

const router = express.Router();

// import controllers
const {
  getImage,
  postImage,
  getImageById,
  updateImageById,
  deleteImageById,
} = require("../controllers/image");

// GET route for getting all the images
router.get("/getImages", getImage);

// GET route for getting a single image
router.get("/getImage/:id", getImageById);

// POST route for file upload
router.post("/upload", upload.single("file"), postImage);

// update specific image by id
router.put("/updateImage/:id", updateImageById);

// DELETE route for deleting an image
router.delete("/deleteImage/:id", deleteImageById);

module.exports = router;
