const express = require("express");
const upload = require("../multerConfig");

const router = express.Router();

// import controllers
const {
  getCertificate,
  postCertificate,
  getCertificateById,
  updateCertificateById,
  deleteCertificateById,
} = require("../controllers/certificate");

// GET route for getting all the certificates
router.get("/getCertificates", getCertificate);

// GET route for getting a single certificate
router.get("/getCertificate/:id", getCertificateById);

// POST route for file upload
router.post("/upload", upload.single("file"), postCertificate);

// update specific certificate by id
router.put("/updateCertificate/:id", updateCertificateById);

// DELETE route for deleting an certificate
router.delete("/deleteCertificate/:id", deleteCertificateById);

module.exports = router;
