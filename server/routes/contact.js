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

// api routes
// get contact page
router.get("/contact", getContact);

// post contact page
router.post("/contact", postContact);

// get specific user by id
router.get("/contact/:id", getContactById);

// update specific contact by id
router.put("/contact/update/:id", updateContactById);

//  delete specific contact by id
router.delete("/contact/:id", deleteContactById);

module.exports = router;
