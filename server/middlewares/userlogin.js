const { body, validationResult } = require("express-validator");
const User = require("../models/userlogin");

exports.userRegisterValidator = [
  body("username", "Username is required").notEmpty(),

  body("email", "Email must be between 3 to 32 characters").notEmpty(),
  body("email", "Invalid email").isEmail(),

  body("password", "Password is required").notEmpty(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must contain at least 6 characters"),
  body(
    "password",
    "Password must contain at least one numeric digit, one uppercase, one lowercase and one special character",
  ).matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return res.status(400).json({ error: firstError });
    }
    next();
  },
];

exports.userById = async (req, res, next) => {
  try {
    const user = await User.findById(req._id).exec();

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};
