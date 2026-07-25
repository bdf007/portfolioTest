const express = require("express");
const router = express.Router();

// import controllers
const {
  getContact,
  postContact,
  getContactById,
  updateContactById,
  deleteContactById,
} = require("../controllers/contact");

// import middlewares
// import middlewares
const { authMiddleware, adminAuthMiddleware } = require("../middlewares/auth");
// api routes
// get contact page
router.get("/contact", getContact);

// post contact page
router.post("/contact", authMiddleware, postContact);

// get specific user by id
router.get("/contact/:id", authMiddleware, getContactById);

// update specific contact by id
router.put("/contact/update/:id", authMiddleware, updateContactById);

//  delete specific contact by id
router.delete("/contact/:id", adminAuthMiddleware, deleteContactById);

module.exports = router;
