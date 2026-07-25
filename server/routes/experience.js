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
const { adminAuthMiddleware } = require("../middlewares/auth");
router.post("/experience", adminAuthMiddleware, postExperience);

// get specific experience by id
router.get("/experience/:id", adminAuthMiddleware, getExperienceById);

// update specific experience by id
router.put("/experience/update/:id", adminAuthMiddleware, updateExperienceById);

//  delete specific experience by id
router.delete("/experience/:id", adminAuthMiddleware, deleteExperienceById);

module.exports = router;
