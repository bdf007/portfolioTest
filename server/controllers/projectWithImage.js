const ProjectWithImage = require("../models/projectWithimage");

exports.getProjectWithImage = async (req, res) => {
  try {
    const projectWithImages = await ProjectWithImage.find({});
    res.json(projectWithImages);
  } catch (error) {
    console.error("Error retrieving projectWithImages:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.postProjectWithImage = async (req, res) => {
  try {
    const projectWithImage = new ProjectWithImage({
      title: req.body.title,
      description: req.body.description,
      imageID: req.body.imageID,
      link: req.body.link,
    });

    await projectWithImage.save();

    res.json({ file: projectWithImage });
    console.log({ file: projectWithImage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.getProjectWithImageById = async (req, res) => {
  await res.send("projectWithImage get by id by controller");
};

exports.updateProjectWithImageById = async (req, res) => {
  await res.send("projectWithImage update by id by controller");
};

exports.deleteProjectWithImageById = async (req, res) => {
  await res.send("projectWithImage delete by id by controller");
};
