const Certificate = require("../models/certificate");
require("dotenv").config();

exports.getCertificate = async (req, res) => {
  try {
    const certificates = await Certificate.find({});
    const mappedCertificates = certificates.map((certificate) => ({
      _id: certificate._id,
      title: certificate.title,
      link: certificate.link,
      description: certificate.description,
      imageData: certificate.imageData,
    }));
    res.json(mappedCertificates);
  } catch (error) {
    console.error("Error retrieving certificates:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.postCertificate = async (req, res) => {
  try {
    const { title, link, description, imageData } = req.body;

    const certificate = new Certificate({
      title,
      link,
      description,
      imageData,
    });

    await certificate.save();

    res.json({ certificate });
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

    if (!deleteCertificate) {
      return res.status(404).json({ error: "No certificate found" });
    }
    res.json({ message: "Certificate deleted" });
  } catch (err) {
    console.log(err);
  }
};
