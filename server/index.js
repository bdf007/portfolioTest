const express = require("express");
const { json, urlencoded } = express;
const app = express();
const connection = require("./config/db");
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const expressValidator = require("express-validator");

// get the technologie route
const technologieRoute = require("./routes/technologieRoutes");

// get the user routes for connection
const userRoutes = require("./routes/userlogin");

// get the about routes
const aboutRoutes = require("./routes/about");

// get the education routes
const educationRoutes = require("./routes/education");

// get the experience routes
const experienceRoutes = require("./routes/experience");

// get the projectWithImage routes
const projectWithImageRoutes = require("./routes/projectWithImage");

// get the certificate routes
const certificateRoutes = require("./routes/certificateRoutes");

// get comment routes
const commentRoutes = require("./routes/comment");

// get the contact routes
const contactRoutes = require("./routes/contact");

// middleware
app.use(json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL.split(",") ?? "http://localhost:3000",
    credentials: true,
  })
);
app.use(urlencoded({ extended: false }));
app.use(cookieParser());
app.use(expressValidator());

//db connection
connection();

app.use(express.static(path.join(__dirname, "..", "client", "build")));

// routes
// Serve static files from the "imageUpload" directory
app.use("/imageUpload", express.static(path.join(__dirname, "imageUpload")));

// get imageUpload folder
app.get("/api/imageUpload", (req, res) => {
  res.send("Hello World!");
});

// use the route of technologie
app.use("/api/technologie", technologieRoute);

// use the user routes for connection
app.use("/api/", userRoutes);

// use the about routes
app.use("/api/", aboutRoutes);

// use the education routes
app.use("/api/", educationRoutes);

// use the experience routes
app.use("/api/", experienceRoutes);

// use the projectWithImage routes
app.use("/api/project", projectWithImageRoutes);

// use the certificate routes
app.use("/api/certificate", certificateRoutes);

// use the comment routes
app.use("/api/", commentRoutes);

// use the contact routes
app.use("/api/", contactRoutes);

// Redirect all requests to the REACT app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

// Port
const port = process.env.PORT || 8000;

// listen to port
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
