const express = require("express");
const router = express.Router();

// import controllers
const {
  getComment,
  postComment,
  getCommentById,
  updateCommentById,
  deleteCommentById,
} = require("../controllers/comment");

// import middlewares

// api routes
// get comment page
router.get("/comment", getComment);

// post comment page
router.post("/comment", postComment);

// get specific comment by id
router.get("/comment/:id", getCommentById);

// update specific comment by id
router.put("/comment/update/:id", updateCommentById);

//  delete specific comment by id
const { adminAuthMiddleware } = require("../middlewares/auth");
router.delete("/comment/:id", adminAuthMiddleware, deleteCommentById);

module.exports = router;
