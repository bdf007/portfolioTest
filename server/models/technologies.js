const mongoose = require("mongoose");

const technologieSchema = new mongoose.Schema({
  title: String,
  link: String,
  imageData: {
    type: String, // Store the image data as a string
    required: true,
  },
  description: String,
  orderList: {
    type: Number,
    default: 0,
  },
  uploadDate: Date,
});

const TechnologieModel = mongoose.model("Technologie", technologieSchema);
module.exports = TechnologieModel;
