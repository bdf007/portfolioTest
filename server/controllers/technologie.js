const Technologie = require("../models/technologies");
require("dotenv").config();
const mongoose = require("mongoose");
const {
  uploadBase64Image,
  getImageStream,
  deleteFile,
} = require("../services/pcloud");

const PCLOUD_SUBFOLDER = "technologies";

exports.getTechnologie = async (req, res) => {
  try {
    const technologies = await Technologie.find({});
    const mappedTechnologies = technologies.map((technologie) => ({
      _id: technologie._id,
      title: technologie.title,
      link: technologie.link,
      description: technologie.description,
      orderList: technologie.orderList,
    }));
    res.json(mappedTechnologies);
  } catch (error) {
    console.error("Error retrieving technologies:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.postTechnologie = async (req, res) => {
  try {
    const { title, link, description, orderList, imageData } = req.body;

    let pcloudFileId;
    if (imageData) {
      pcloudFileId = await uploadBase64Image(
        imageData,
        `technologie-${Date.now()}.webp`,
        PCLOUD_SUBFOLDER,
      );
    }

    const technologie = new Technologie({
      title,
      link,
      description,
      orderList,
      pcloudFileId,
      uploadDate: new Date(),
    });

    await technologie.save();

    res.json({ technologie });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.getTechnologieById = async (req, res) => {
  try {
    const id = req.params.id;
    const technologie = await Technologie.findById(id).select("-imageData");
    res.json(technologie);
  } catch (error) {
    console.error("Error retrieving technologie:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.updateTechnologieById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    const technologie = await Technologie.findById(id);
    if (!technologie) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }

    const updateData = { ...req.body };

    // Une nouvelle image a été envoyée : on l'upload et on remplace l'ancienne
    if (updateData.imageData) {
      const fileid = await uploadBase64Image(
        updateData.imageData,
        `technologie-${Date.now()}.webp`,
        PCLOUD_SUBFOLDER,
      );
      if (technologie.pcloudFileId) {
        await deleteFile(technologie.pcloudFileId);
      }
      updateData.pcloudFileId = fileid;
    }
    delete updateData.imageData;

    const updatedTechnologie = await Technologie.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).select("-imageData");
    res.json(updatedTechnologie);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.deleteTechnologieById = async (req, res) => {
  try {
    const id = req.params.id;
    const technologieToDelete = await Technologie.findById(id);

    if (!technologieToDelete) {
      return res.status(404).json({ error: "No technologie found" });
    }

    if (technologieToDelete.pcloudFileId) {
      await deleteFile(technologieToDelete.pcloudFileId);
    }

    await Technologie.findByIdAndDelete(id);
    res.json({ message: "Technologie deleted" });
  } catch (err) {
    console.log(err);
  }
};

/**
 * Route-relais pour l'image d'une technologie. URL stable pour le frontend,
 * redemande un lien pCloud frais à chaque appel (les liens pCloud expirent,
 * celui-ci non). Fallback sur l'ancien Base64 pour les entrées pas migrées.
 */
exports.getTechnologieImage = async (req, res) => {
  try {
    const technologie = await Technologie.findById(req.params.id).select(
      "pcloudFileId imageData",
    );
    if (!technologie) return res.status(404).end();

    if (technologie.pcloudFileId) {
      const { contentType, stream } = await getImageStream(
        technologie.pcloudFileId,
      );
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "no-store");
      return stream.pipe(res);
    }

    if (technologie.imageData) {
      const matches = technologie.imageData.match(/^data:(.+);base64,(.+)$/);
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
