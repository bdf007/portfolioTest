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
  filename: String,
  description: String,
  url: String,
  contentType: String,
  metadata: Object,
  uploadDate: Date,
  chunkSize: Number,
});

const ProjectModel = mongoose.model("Project", projectSchema, "uploads");
module.exports = ProjectModel;
