const Education = require("../models/education");
const mongoose = require("mongoose");

exports.getEducation = async (req, res) => {
  try {
    const education = await Education.find({});
    res.json(education);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.postEducation = async (req, res) => {
  try {
    // check if title education already exists
    const titleExists = await Education.findOne({ title: req.body.title });
    if (titleExists) {
      return res.status(403).json({
        error: "Title is already taken",
      });
    }
    const education = new Education(req.body);
    await education.save();
    await res.json(education);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.getEducationById = async (req, res) => {
  try {
    const id = req.params.id;

    // Check if the provided id is a valid ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    // Check if the education id exists
    const education = await Education.findById(id);
    if (!education) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    res.json(education);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.updateEducationById = async (req, res) => {
  try {
    const id = req.params.id;

    // Check if the provided id is a valid ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    // Check if the education id exists
    const education = await Education.findById(id);
    if (!education) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    // if education Id exists, update the education
    const updatedEducation = await Education.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );
    res.json(updatedEducation);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.deleteEducationById = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the education id exists
    const education = await Education.findById(id);
    if (!education) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    // if education id exists, delete the education
    const deletedEducation = await Education.findByIdAndRemove(id);
    res.json({ message: "Education deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};
