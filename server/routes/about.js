const express = require("express");
const router = express.Router();

// import controllers

// import middlewares

// api routes
// get about page
router.get("/about", (req, res) => {
  res.send("About page");
});

// post about page
router.post("/about", (req, res) => {
  res.send("About page post");
});

// get specific user by id
router.get("/about/:id", (req, res) => {
  res.send(`About page get specific user by id`);
});

// update specific user by id
router.put("/about/update/:id", (req, res) => {
  res.send("About page update specific user by id");
});

//  delete specific user by id
router.delete("/about/:id", (req, res) => {
  res.send("About page delete specific user by id");
});

module.exports = router;
