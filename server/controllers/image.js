const upload = require("../config/multerConfig");
const Image = require("../models/Images");
const fs = require("fs");

exports.getImage = async (req, res) => {
  try {
    const images = await Image.find({});
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
};

exports.postImage = async (req, res) => {
  try {
    const { filename, mimetype, buffer } = req.file;

    const image = new Image({
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
};

exports.getImageById = async (req, res) => {
  try {
    const id = req.params.id;
    const image = await Image.findById(id);
    res.json(image);
  } catch (error) {
    console.error("Error retrieving image:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.deleteImageById = async (req, res) => {
  try {
    const id = req.params.id;
    const deleteImage = await Image.findByIdAndDelete(id);
    // delete the file from the uploads folder
    fs.unlinkSync(`imageUpload/${deleteImage.filename}`);

    if (!deleteImage) {
      return res.status(404).json({ error: "No image found" });
    }
    res.json({ message: "Image deleted" });
  } catch (err) {
    console.log(err);
  }
};
