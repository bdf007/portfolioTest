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
    // Legacy : Base64, uniquement pour les entrées pas encore migrées vers pCloud
    type: String,
  },
  pcloudFileId: {
    // Nouveau : identifiant du fichier stocké sur pCloud
    type: Number,
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
