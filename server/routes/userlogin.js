const express = require("express");
const router = express.Router();

// import controllers
const {
  register,
  login,
  logout,
  getLoggedInUser,
  getAllUsers,
  deleteUserById,
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
// get all users
router.get("/users", getAllUsers);
// delete user by id
router.delete("/user/:id", deleteUserById);

module.exports = router;
