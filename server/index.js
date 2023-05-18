const express = require("express");
const app = express();
const connection = require("./config/db");
const path = require("path");
require("dotenv").config();
// get the route of user
const userRoute = require("./routes/userRoutes");
// get the image route
const imageRoute = require("./routes/imageRoutes");

const cors = require("cors");

app.use(express.json());
app.use(cors());

connection();

// Serve static files from the "uploads" directory
app.use(express.static(path.join(__dirname, "imageUpload")));

// use the route of user
app.use("/user", userRoute);
// use the route of image
app.use("/image", imageRoute);

const port = process.env.PORT || 5000;
app.listen(5000, () => {
  console.log("Server listening on port 5000");
});
