const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
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
});

const CertificateModel = mongoose.model("Certificate", certificateSchema);
module.exports = CertificateModel;
