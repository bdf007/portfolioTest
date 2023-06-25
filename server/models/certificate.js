const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
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

const CertificateModel = mongoose.model("Certificate", certificateSchema);
module.exports = CertificateModel;
