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
const { adminAuthMiddleware } = require("../middlewares/auth");

// import middlewares

// api routes
// get about page
router.get("/about", getAbout);

// post about page
router.post("/about", adminAuthMiddleware, postAbout);

// get specific user by id
router.get("/about/:id", adminAuthMiddleware, getAboutById);

// update specific about by id
router.put("/about/update/:id", adminAuthMiddleware, updateAboutById);

//  delete specific about by id
router.delete("/about/:id", adminAuthMiddleware, deleteAboutById);

module.exports = router;
