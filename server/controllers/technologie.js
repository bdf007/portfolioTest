const Technologie = require("../models/technologies");
const fs = require("fs");
require("dotenv").config();

exports.getTechnologie = async (req, res) => {
  try {
    const technologies = await Technologie.find({});
    const mappedTechnologies = technologies.map((technologie) => ({
      _id: technologie._id,
      title: technologie.title,
      link: technologie.link,
      description: technologie.metadata ? technologie.metadata.description : "",
      filename: technologie.filename,
      url: `${process.env.BACKEND_IMAGE_URL}/${technologie.filename}`,
    }));
    res.json(mappedTechnologies);
  } catch (error) {
    console.error("Error retrieving technologies:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.postTechnologie = async (req, res) => {
  try {
    const { filename, mimetype, buffer } = req.file;

    const technologie = new Technologie({
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

    await technologie.save();

    res.json({ file: technologie });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.getTechnologieById = async (req, res) => {
  try {
    const id = req.params.id;
    const technologie = await Technologie.findById(id);
    res.json(technologie);
  } catch (error) {
    console.error("Error retrieving technologie:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.updateTechnologieById = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the provided id is a valid ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    // Check if the technologie Id exists
    const technologie = await Technologie.findById(id);
    if (!technologie) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    // if the technologie exists, update it
    const updatedTechnologie = await Technologie.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );
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
    const deleteTechnologie = await Technologie.findByIdAndDelete(id);
    // delete the file from the uploads folder
    fs.unlinkSync(`imageUpload/${deleteTechnologie.filename}`);

    if (!deleteTechnologie) {
      return res.status(404).json({ error: "No technologie found" });
    }
    res.json({ message: "Technologie deleted" });
  } catch (err) {
    console.log(err);
  }
};
