const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
  title: String,
  link: String,
  imageData: {
    type: String, // Store the image data as a string
    required: true,
  },
  description: String,
});

const CertificateModel = mongoose.model("Certificate", certificateSchema);
module.exports = CertificateModel;
