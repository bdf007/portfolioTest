const express = require("express");
const router = express.Router();

// import controllers
const {
  getCertificate,
  postCertificate,
  getCertificateById,
  updateCertificateById,
  deleteCertificateById,
} = require("../controllers/certificate");
const { adminAuthMiddleware } = require("../middlewares/auth");

// GET route for getting all the certificates
router.get("/getCertificates", getCertificate);

// GET route for getting a single certificate
router.get("/getCertificate/:id", adminAuthMiddleware, getCertificateById);

// POST route for file upload
router.post("/upload", adminAuthMiddleware, postCertificate);

// update specific certificate by id
router.put(
  "/updateCertificate/:id",
  adminAuthMiddleware,
  updateCertificateById,
);

// DELETE route for deleting an certificate
router.delete(
  "/deleteCertificate/:id",
  adminAuthMiddleware,
  deleteCertificateById,
);

module.exports = router;
