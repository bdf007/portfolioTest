const mongoose = require("mongoose");

const projectWithimageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      filename: String,
      description: String,
      url: String,
      contentType: String,
      metadata: Object,
      uploadDate: Date,
      chunkSize: Number,
    },
    link: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProjectWithimage", projectWithimageSchema);
