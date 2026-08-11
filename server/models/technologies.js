const mongoose = require("mongoose");

const technologieSchema = new mongoose.Schema({
  title: String,
  link: String,
  imageData: {
    // Legacy : Base64, uniquement pour les entrées pas encore migrées vers pCloud
    type: String,
  },
  pcloudFileId: {
    // Nouveau : identifiant du fichier stocké sur pCloud
    type: Number,
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
