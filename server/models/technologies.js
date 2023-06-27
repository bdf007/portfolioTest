const mongoose = require("mongoose");

const technologieSchema = new mongoose.Schema({
  title: String,
  link: String,
  filename: String,
  description: String,
  url: String,
  contentType: String,
  metadata: Object,
  uploadDate: Date,
  chunkSize: Number,
});

const TechnologieModel = mongoose.model("Technologie", technologieSchema);
module.exports = TechnologieModel;
