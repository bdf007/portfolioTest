// ImageModel.js
const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  filename: String,
  description: String,
  url: String,
  contentType: String,
  metadata: Object,
  uploadDate: Date,
  chunkSize: Number,
});

const ImageModel = mongoose.model("Image", imageSchema, "uploads");
module.exports = ImageModel;
