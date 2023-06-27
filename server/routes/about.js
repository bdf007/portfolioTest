const express = require("express");
const router = express.Router();

// import controllers
const {
  getAbout,
  postAbout,
  getAboutById,
  updateAboutById,
  deleteAboutById,
} = require("../controllers/about");

// import middlewares

// api routes
// get about page
router.get("/about", getAbout);

// post about page
router.post("/about", postAbout);

// get specific user by id
router.get("/about/:id", getAboutById);

// update specific about by id
router.put("/about/update/:id", updateAboutById);

//  delete specific about by id
router.delete("/about/:id", deleteAboutById);

module.exports = router;
