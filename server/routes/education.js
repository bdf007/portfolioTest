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
router.post("/education", postEducation);

// get specific education by id
router.get("/education/:id", getEducationById);

// update specific education by id
router.put("/education/update/:id", updateEducationById);

//  delete specific education by id
router.delete("/education/:id", deleteEducationById);

module.exports = router;
