const express = require("express");
const upload = require("../multerConfig");
const router = express.Router();

// import controllers
const {
  getProjectWithImage,
  postProjectWithImage,
  getProjectWithImageById,
  updateProjectWithImageById,
  deleteProjectWithImageById,
} = require("../controllers/projectWithImage");

// import middlewares

// api routes
// get projectWithImage page
router.get("/projectWithImage", getProjectWithImage);

// post projectWithImage page
router.post("/upload", upload.single("file"), postProjectWithImage);

// get specific projectWithImage by id
router.get("/projectWithImage/:id", getProjectWithImageById);

// update specific projectWithImage by id
router.put("/projectWithImage/update/:id", updateProjectWithImageById);

//  delete specific projectWithImage by id
router.delete("/deleteProject/:id", deleteProjectWithImageById);

module.exports = router;
