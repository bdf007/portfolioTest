const Certificate = require("../models/certificate");
const fs = require("fs");
require("dotenv").config();

exports.getCertificate = async (req, res) => {
  try {
    const certificates = await Certificate.find({});
    const mappedCertificates = certificates.map((certificate) => ({
      _id: certificate._id,
      title: certificate.title,
      link: certificate.link,
      description: certificate.metadata ? certificate.metadata.description : "",
      filename: certificate.filename,
      url: `${process.env.BACKEND_IMAGE_URL}/${certificate.filename}`,
    }));
    res.json(mappedCertificates);
  } catch (error) {
    console.error("Error retrieving certificates:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.postCertificate = async (req, res) => {
  try {
    const { filename, mimetype, buffer } = req.file;

    const certificate = new Certificate({
      filename: filename,
      title: req.body.title,
      link: req.body.link,
      description: req.body.description,
      url: `/imageUpload/${filename}`,
      contentType: mimetype,
      metadata: req.body,
      uploadDate: new Date(),
      chunkSize: 1024,
    });

    await certificate.save();

    res.json({ file: certificate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.getCertificateById = async (req, res) => {
  try {
    const id = req.params.id;
    const certificate = await Certificate.findById(id);
    res.json(certificate);
  } catch (error) {
    console.error("Error retrieving certificate:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.updateCertificateById = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the provided id is a valid ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    // Check if the certificate Id exists
    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    // if the certificate exists, update it
    const updatedCertificate = await Certificate.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );
    res.json(updatedCertificate);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.deleteCertificateById = async (req, res) => {
  try {
    const id = req.params.id;
    const deleteCertificate = await Certificate.findByIdAndDelete(id);
    // delete the file from the uploads folder
    fs.unlinkSync(`imageUpload/${deleteCertificate.filename}`);

    if (!deleteCertificate) {
      return res.status(404).json({ error: "No certificate found" });
    }
    res.json({ message: "Certificate deleted" });
  } catch (err) {
    console.log(err);
  }
};
