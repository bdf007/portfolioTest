const express = require("express");
const ImageModel = require("../models/Images");
const upload = require("../config/multerConfig");
const fs = require("fs");

const router = express.Router();

// GET route for getting all the images
router.get("/getImages", async (req, res) => {
  try {
    const images = await ImageModel.find({});
    const mappedImages = images.map((image) => ({
      _id: image._id,
      description: image.metadata ? image.metadata.description : "",
      filename: image.filename,
      url: `${process.env.BACKEND_URL}/imageUpload/${image.filename}`,
    }));
    res.json(mappedImages);
  } catch (error) {
    console.error("Error retrieving images:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// GET route for getting a single image
router.get("/getImage/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const image = await ImageModel.findById(id);
    res.json(image);
  } catch (error) {
    console.error("Error retrieving image:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// POST route for file upload
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { filename, mimetype, buffer } = req.file;

    const image = new ImageModel({
      filename: filename,
      description: req.body.description,
      url: `/imageUpload/${filename}`,
      contentType: mimetype,
      metadata: req.body,
      uploadDate: new Date(),
      chunkSize: 1024,
    });

    await image.save();

    res.json({ file: image });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// DELETE route for deleting an image
router.delete("/deleteImage/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const deleteImage = await ImageModel.findByIdAndDelete(id);
    // delete the file from the uploads folder
    fs.unlinkSync(`imageUpload/${deleteImage.filename}`);

    if (!deleteImage) {
      return res.status(404).json({ error: "No image found" });
    }
    res.json({ message: "Image deleted" });
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
