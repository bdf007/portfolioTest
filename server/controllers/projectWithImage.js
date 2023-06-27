const Project = require("../models/projectWithimage");
const fs = require("fs");
require("dotenv").config();

exports.getProjectWithImage = async (req, res) => {
  try {
    const projects = await Project.find({});
    const mappedProjects = projects.map((project) => ({
      _id: project._id,
      title: project.title,
      textProject: project.textProject,
      linkToProject: project.linkToProject,
      filename: project.filename,
      description: project.metadata ? project.metadata.description : "",
      url: `${process.env.BACKEND_URL}/imageUpload/${project.filename}`,
    }));
    res.json(mappedProjects);
  } catch (error) {
    console.error("Error retrieving projects:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.postProjectWithImage = async (req, res) => {
  try {
    const { filename, mimetype, buffer } = req.file;

    const project = new Project({
      title: req.body.title,
      textProject: req.body.textProject,
      linkToProject: req.body.linkToProject,
      filename: filename,
      description: req.body.description,
      url: `/imageUpload/${filename}`,
      contentType: mimetype,
      metadata: req.body,
      uploadDate: new Date(),
      chunkSize: 1024,
    });

    await project.save();

    res.json({ file: project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.getProjectWithImageById = async (req, res) => {
  try {
    const id = req.params.id;
    const project = await Project.findById(id);
    res.json(project);
  } catch (error) {
    console.error("Error retrieving project:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.updateProjectWithImageById = async (req, res) => {
  try {
    const id = req.params.id;
    // Check if the provided id is a valid ObjectId format
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }
    // Check if the project Id exists
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }
    // if the project exists, update it
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );
    res.json(updatedProject);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.deleteProjectWithImageById = async (req, res) => {
  try {
    const id = req.params.id;
    const deleteProject = await Project.findByIdAndDelete(id);
    // delete the file from the uploads folder
    fs.unlinkSync(`imageUpload/${deleteProject.filename}`);

    if (!deleteProject) {
      return res.status(404).json({ error: "No project found" });
    }
    res.json({ message: "Project deleted" });
  } catch (err) {
    console.log(err);
  }
};
