const User = require("../models/userlogin");
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.register = async (req, res) => {
  // check if user already exists
  const usernameExists = await User.findOne({ username: req.body.username });
  const emailExists = await User.findOne({ email: req.body.email });

  if (usernameExists) {
    return res.status(403).json({
      error: "Username is already taken",
    });
  }
  if (emailExists) {
    return res.status(403).json({
      error: "Email is already taken",
    });
  }

  // if new user, create a new user
  const user = new User(req.body);
  await user.save();

  res.status(200).json({
    message: "Signup success! Please login.",
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    if (!user.authenticate(password)) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.cookie("jwt", token, { expire: new Date() + 9999, httpOnly: true });

    const { username } = user;
    return res.json({
      message: "Login success",
      username,
    });
  } catch (error) {
    // Handle any potential errors
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.logout = (req, res) => {
  // clear the cookie
  res.clearCookie("jwt");
  return res.json({
    message: "Logout success",
  });
};

exports.getLoggedInUser = (req, res) => {
  const { username } = req.user;
  return res.status(200).json({
    username,
    message: "User is still logged in",
  });
};
