const express = require("express");
const router = express.Router();

// import controllers
const {
  getEducation,
  postEducation,
  getEducationById,
  updateEducationById,
  deleteEducationById,
} = require("../controllers/education");

// import middlewares

// api routes
// get education page
router.get("/education", getEducation);

// post education page
const { adminAuthMiddleware } = require("../middlewares/auth");
router.post("/education", adminAuthMiddleware, postEducation);

// get specific education by id
router.get("/education/:id", adminAuthMiddleware, getEducationById);

// update specific education by id
router.put("/education/update/:id", adminAuthMiddleware, updateEducationById);

//  delete specific education by id
router.delete("/education/:id", adminAuthMiddleware, deleteEducationById);

module.exports = router;
