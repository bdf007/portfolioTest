const express = require("express");
const { json, urlencoded } = express;
const app = express();
const connection = require("./config/db");
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const expressValidator = require("express-validator");

// get the image route
const imageRoute = require("./routes/imageRoutes");

// get the user routes for connection
const userRoutes = require("./routes/userlogin");

// get the about routes
const aboutRoutes = require("./routes/about");

// get the education routes
const educationRoutes = require("./routes/education");

// get the experience routes
const experienceRoutes = require("./routes/experience");

// middleware
app.use(json());
app.use(cors({ origin: true, credentials: true }));
app.use(urlencoded({ extended: false }));
app.use(cookieParser());
app.use(expressValidator());

//db connection
connection();

// routes
// Serve static files from the "imageUpload" directory
app.use(
  "/imageUpload",
  express.static(path.join(__dirname, "imageUpload"), { maxAge: 0 })
);

// get imageUpload folder
app.get("/imageUpload", (req, res) => {
  res.send("Hello World!");
});

// use the route of image
app.use("/image", imageRoute);

// use the user routes for connection
app.use("/", userRoutes);

// use the about routes
app.use("/", aboutRoutes);

// use the education routes
app.use("/", educationRoutes);

// use the experience routes
app.use("/", experienceRoutes);

// Port
const port = process.env.PORT || 8000;

// listen to port
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
