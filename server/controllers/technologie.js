const Technologie = require("../models/technologies");
require("dotenv").config();
const mongoose = require("mongoose");

exports.getTechnologie = async (req, res) => {
  try {
    const technologies = await Technologie.find({});
    const mappedTechnologies = technologies.map((technologie) => ({
      _id: technologie._id,
      title: technologie.title,
      link: technologie.link,
      description: technologie.description,
      imageData: technologie.imageData,
    }));
    res.json(mappedTechnologies);
  } catch (error) {
    console.error("Error retrieving technologies:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.postTechnologie = async (req, res) => {
  try {
    const { title, link, description, imageData } = req.body;

    const technologie = new Technologie({
      title,
      link,
      description,
      imageData,
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

    if (!deleteTechnologie) {
      return res.status(404).json({ error: "No technologie found" });
    }
    res.json({ message: "Technologie deleted" });
  } catch (err) {
    console.log(err);
  }
};
