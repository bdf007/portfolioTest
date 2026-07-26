const jwt = require("jsonwebtoken");
const User = require("../models/userlogin"); // à garder tel quel si c'est bien ton modèle

exports.authMiddleware = async (req, res, next) => {
  const accessToken = req.cookies.jwt;
  if (!accessToken) {
    return res.status(403).json({ error: "Authentification requise" });
  }
  try {
    const payload = jwt.verify(accessToken, process.env.JWT_SECRET);
    const user = await User.findById(payload._id).exec();
    if (!user) {
      return res.status(403).json({ error: "Utilisateur introuvable" });
    }
    req._id = payload._id;
    req.user = user; // <- disponible dans tous les contrôleurs en aval
    next();
  } catch (e) {
    return res.status(403).json({ error: "Authentification échouée" });
  }
};

exports.adminAuthMiddleware = (req, res, next) => {
  // Réutilise authMiddleware, évite de dupliquer la vérification du JWT
  exports.authMiddleware(req, res, () => {
    if (
      !req.user ||
      (req.user.role !== "admin" && req.user.role !== "superadmin")
    ) {
      return res
        .status(403)
        .json({ error: "Accès refusé : Pas un administrateur" });
    }
    next();
  });
};
