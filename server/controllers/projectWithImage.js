const Project = require("../models/projectWithimage");
const mongoose = require("mongoose");
const {
  uploadBase64Image,
  getImageStream,
  deleteFile,
} = require("../services/pcloud");

const PCLOUD_SUBFOLDER = "projets";

exports.getProjectWithImage = async (req, res) => {
  try {
    const projects = await Project.find({});
    const mappedProjects = projects.map((project) => ({
      _id: project._id,
      title: project.title,
      textProject: project.textProject,
      linkToProject: project.linkToProject,
      description: project.description,
      orderList: project.orderList,
    }));
    res.json(mappedProjects);
  } catch (error) {
    console.error("Error retrieving projects:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.postProjectWithImage = async (req, res) => {
  try {
    const {
      title,
      textProject,
      linkToProject,
      description,
      orderList,
      imageData,
    } = req.body;

    let pcloudFileId;
    if (imageData) {
      pcloudFileId = await uploadBase64Image(
        imageData,
        `project-${Date.now()}.webp`,
        PCLOUD_SUBFOLDER,
      );
    }

    const project = new Project({
      title,
      textProject,
      linkToProject,
      description,
      orderList,
      pcloudFileId,
    });

    await project.save();

    res.json({ project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.getProjectWithImageById = async (req, res) => {
  try {
    const id = req.params.id;
    const project = await Project.findById(id).select("-imageData");
    res.json(project);
  } catch (error) {
    console.error("Error retrieving project:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.updateProjectWithImageById = async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        error: "ID does not exist",
      });
    }

    const updateData = { ...req.body };

    // Une nouvelle image a été envoyée : on l'upload et on remplace l'ancienne
    if (updateData.imageData) {
      const fileid = await uploadBase64Image(
        updateData.imageData,
        `project-${Date.now()}.webp`,
        PCLOUD_SUBFOLDER,
      );
      if (project.pcloudFileId) {
        await deleteFile(project.pcloudFileId);
      }
      updateData.pcloudFileId = fileid;
    }
    delete updateData.imageData;

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).select("-imageData");

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
    const projectToDelete = await Project.findById(id);

    if (!projectToDelete) {
      return res.status(404).json({ error: "No project found" });
    }

    if (projectToDelete.pcloudFileId) {
      await deleteFile(projectToDelete.pcloudFileId);
    }

    await Project.findByIdAndDelete(id);

    res.json({ message: "Project deleted" });
  } catch (err) {
    console.log(err);
  }
};

/**
 * Route-relais pour l'image d'un projet. URL stable pour le frontend,
 * redemande un lien pCloud frais à chaque appel. Fallback sur l'ancien
 * Base64 pour les entrées pas encore migrées.
 */
exports.getProjectImage = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select(
      "pcloudFileId imageData",
    );
    if (!project) return res.status(404).end();

    if (project.pcloudFileId) {
      const { contentType, stream } = await getImageStream(
        project.pcloudFileId,
      );
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "no-store");
      return stream.pipe(res);
    }

    if (project.imageData) {
      const matches = project.imageData.match(/^data:(.+);base64,(.+)$/);
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
