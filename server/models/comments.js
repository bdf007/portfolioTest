const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    Date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
