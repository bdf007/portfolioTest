const Certificate = require("../models/certificate");
const mongoose = require("mongoose");
require("dotenv").config();
const {
  uploadBase64Image,
  getFreshImageLink,
  deleteFile,
} = require("../services/pcloud");

const PCLOUD_SUBFOLDER = "certificats";

exports.getCertificate = async (req, res) => {
  try {
    const certificates = await Certificate.find({});
    const mappedCertificates = certificates.map((certificate) => ({
      _id: certificate._id,
      title: certificate.title,
      link: certificate.link,
      description: certificate.description,
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

    let pcloudFileId;
    if (imageData) {
      pcloudFileId = await uploadBase64Image(
        imageData,
        `certificate-${Date.now()}.webp`,
        PCLOUD_SUBFOLDER,
      );
    }

    const certificate = new Certificate({
      title,
      link,
      description,
      pcloudFileId,
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
    const certificate = await Certificate.findById(id).select("-imageData");
    res.json(certificate);
  } catch (error) {
    console.error("Error retrieving certificate:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.updateCertificateById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }

    const updateData = { ...req.body };

    // Une nouvelle image a été envoyée : on l'upload et on remplace l'ancienne
    if (updateData.imageData) {
      const fileid = await uploadBase64Image(
        updateData.imageData,
        `certificate-${Date.now()}.webp`,
        PCLOUD_SUBFOLDER,
      );
      if (certificate.pcloudFileId) {
        await deleteFile(certificate.pcloudFileId);
      }
      updateData.pcloudFileId = fileid;
    }
    delete updateData.imageData;

    const updatedCertificate = await Certificate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).select("-imageData");
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
    const certificateToDelete = await Certificate.findById(id);

    if (!certificateToDelete) {
      return res.status(404).json({ error: "No certificate found" });
    }

    if (certificateToDelete.pcloudFileId) {
      await deleteFile(certificateToDelete.pcloudFileId);
    }

    await Certificate.findByIdAndDelete(id);
    res.json({ message: "Certificate deleted" });
  } catch (err) {
    console.log(err);
  }
};

/**
 * Route-relais pour l'image d'un certificat. URL stable pour le frontend,
 * redemande un lien pCloud frais à chaque appel. Fallback sur l'ancien
 * Base64 pour les entrées pas encore migrées.
 */
exports.getCertificateImage = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id).select(
      "pcloudFileId imageData",
    );
    if (!certificate) return res.status(404).end();

    if (certificate.pcloudFileId) {
      const url = await getFreshImageLink(certificate.pcloudFileId);
      return res.redirect(url);
    }

    if (certificate.imageData) {
      const matches = certificate.imageData.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        res.set("Content-Type", matches[1]);
        return res.send(Buffer.from(matches[2], "base64"));
      }
    }

    return res.status(404).end();
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
};
