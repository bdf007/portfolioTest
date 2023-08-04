// ImageModel.js
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  textProject: {
    type: String,
    trim: true,
  },
  linkToProject: {
    type: String,
    trim: true,
  },
  imageData: {
    type: String, // Store the image data as a string
    required: true,
  },
  description: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  orderList: {
    type: Number,
    default: 0,
  },
});

const ProjectModel = mongoose.model("Project", projectSchema);
module.exports = ProjectModel;
