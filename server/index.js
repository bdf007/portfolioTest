const express = require("express");
const compression = require("compression");
const { json, urlencoded } = express;
const app = express();
const connection = require("./config/db");
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");

// compress all responses
app.use(compression());

function normalizeOrigin(url) {
  return url ? url.replace(/\/$/, "") : url; // retire un eventuel slash final avant comparaison
}

const frontendUrls = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((url) => normalizeOrigin(url.trim()));

const ALLOWED_ORIGINS = [...frontendUrls, "http://192.168.1.108:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      const normalized = normalizeOrigin(origin);
      if (!origin || ALLOWED_ORIGINS.includes(normalized)) {
        callback(null, true);
      } else {
        console.warn("[CORS] Origine rejetée :", origin);
        callback(new Error("Origine non autorisée par CORS"));
      }
    },
    credentials: true,
  }),
);
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

// get the game routes
const gameRoutes = require("./routes/game");

// get the dungeon routes
const dungeonRoutes = require("./routes/dungeonRoute");

// get the arpg routes
const arpgRoutes = require("./routes/arpg");

// middleware
app.use(json({ limit: "10mb" }));

app.use(urlencoded({ limit: "10mb", extended: false }));
app.use(cookieParser());

//db connection
connection();

app.use(express.static(path.join(__dirname, "..", "client", "build")));

// routes
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

// use the game routes
app.use("/api/", gameRoutes);

// use the dungeon routes
app.use("/api/dungeon", dungeonRoutes);

// use the arpg routes
app.use("/api/arpg", arpgRoutes);

// Serve the React app
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

// Port
const port = process.env.PORT || 8000;

// listen to port
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
