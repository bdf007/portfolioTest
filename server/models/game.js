const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  genre: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  minPlayer: {
    type: Number,
  },
  maxPlayer: {
    type: Number,
  },
  minAge: {
    type: Number,
  },
  duration: {
    type: Number,
  },
  imageData: {
    type: String,
    trim: true,
  },
  addBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  status: {
    type: String,
    enum: ["in pending", "accepted", "rejected"],
    default: "in pending",
  },
  salt: String,
});

module.exports = mongoose.model("Game", gameSchema);
