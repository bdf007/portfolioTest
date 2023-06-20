const User = require("../models/userlogin");

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
