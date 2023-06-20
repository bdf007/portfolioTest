const express = require("express");
const router = express.Router();

// import controllers
const {
  register,
  login,
  logout,
  getLoggedInUser,
} = require("../controllers/userlogin");
// import middlewares
const { userRegisterValidator, userById } = require("../middlewares/userlogin");
const { verifyToken } = require("../middlewares/auth");
// api routes
router.post("/register", userRegisterValidator, register);
router.post("/login", login);
router.get("/logout", logout);

// get logged in user
router.get("/user", verifyToken, userById, getLoggedInUser);

module.exports = router;
