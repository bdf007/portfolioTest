const express = require("express");
const router = express.Router();

// Import controllers
const {
  getProjectWithImage,
  postProjectWithImage,
  getProjectWithImageById,
  updateProjectWithImageById,
  deleteProjectWithImageById,
} = require("../controllers/projectWithImage");

// API routes
// Get projectWithImage page
router.get("/projectWithImage", getProjectWithImage);

// Post projectWithImage page
const { adminAuthMiddleware } = require("../middlewares/auth");
router.post("/upload", adminAuthMiddleware, postProjectWithImage);

// Get specific projectWithImage by id
router.get("/projectWithImage/:id", getProjectWithImageById);

// Update specific projectWithImage by id
router.put(
  "/projectWithImage/update/:id",
  adminAuthMiddleware,
  updateProjectWithImageById,
);

// Delete specific projectWithImage by id
router.delete(
  "/deleteProject/:id",
  adminAuthMiddleware,
  deleteProjectWithImageById,
);

module.exports = router;
