const About = require("../models/about");
const mongoose = require("mongoose");

exports.getAbout = async (req, res) => {
  try {
    const about = await About.find({});
    res.json(about);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.postAbout = async (req, res) => {
  try {
    // // check if title about already exists
    // const titleExists = await About.findOne({ title: req.body.title });
    // if (titleExists) {
    //   return res.status(403).json({
    //     error: "Title is already taken",
    //   });
    // }
    const about = new About(req.body);
    await about.save();
    await res.json(about);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.getAboutById = async (req, res) => {
  try {
    const id = req.params.id;

    // Check if the provided id is a valid ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    // Check if the aboutId exists
    const about = await About.findById(id);
    if (!about) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    res.json(about);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.updateAboutById = async (req, res) => {
  try {
    const id = req.params.id;

    // Check if the provided id is a valid ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    // Check if the aboutId exists
    const about = await About.findById(id);
    if (!about) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    // if aboutId exists, update the about
    const updatedAbout = await About.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );
    res.json(updatedAbout);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.deleteAboutById = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the aboutId exists
    const about = await About.findById(id);
    if (!about) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    // if aboutId exists, delete the about
    const deletedAbout = await About.findByIdAndRemove(id);
    res.json({ message: "About deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};
