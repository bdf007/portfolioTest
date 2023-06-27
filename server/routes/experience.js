const express = require("express");
const router = express.Router();

// import controllers
const {
  getExperience,
  postExperience,
  getExperienceById,
  updateExperienceById,
  deleteExperienceById,
} = require("../controllers/experience");

// import middlewares

// api routes
// get experience page
router.get("/experience", getExperience);

// post experience page
router.post("/experience", postExperience);

// get specific experience by id
router.get("/experience/:id", getExperienceById);

// update specific experience by id
router.put("/experience/update/:id", updateExperienceById);

//  delete specific experience by id
router.delete("/experience/:id", deleteExperienceById);

module.exports = router;
