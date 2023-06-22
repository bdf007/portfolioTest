const Experience = require("../models/experience");
const mongoose = require("mongoose");

exports.getExperience = async (req, res) => {
  try {
    const experience = await Experience.find({});
    res.json(experience);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.postExperience = async (req, res) => {
  try {
    // check if title experience already exists
    const titleExists = await Experience.findOne({ title: req.body.title });
    if (titleExists) {
      return res.status(403).json({
        error: "Title is already taken",
      });
    }
    const experience = new Experience(req.body);
    await experience.save();
    await res.json(experience);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.getExperienceById = async (req, res) => {
  try {
    const id = req.params.id;

    // Check if the provided id is a valid ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    // Check if the experience Id exists
    const experience = await Experience.findById(id);
    if (!experience) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    res.json(experience);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.updateExperienceById = async (req, res) => {
  try {
    const id = req.params.id;

    // Check if the provided id is a valid ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    // Check if the experience Id exists
    const experience = await Experience.findById(id);
    if (!experience) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    // // if experience Id exists, update the experience
    const updatedExperience = await Experience.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );
    res.json(updatedExperience);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.deleteExperienceById = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the experience Id exists
    const experience = await Experience.findById(id);
    if (!experience) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    // if experience id exists, delete the experience
    const deletedExperience = await Experience.findByIdAndRemove(id);
    res.json({ message: "Experience deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};
