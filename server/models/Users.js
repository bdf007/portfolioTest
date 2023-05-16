const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide your name"],
  },
  age: {
    type: Number,
    required: [true, "Please provide your age"],
  },
  username: {
    type: String,
    required: [true, "Please provide your username"],
  },
});

const UserModel = mongoose.model("users", UserSchema);

module.exports = UserModel;
