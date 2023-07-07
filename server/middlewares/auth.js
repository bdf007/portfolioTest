const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  let accessToken = req.cookies.jwt;
  // if there is no token stored in cookies, the request is unauthorized
  if (!accessToken) {
    return res.sendStatus(403);
  }
  let payload;
  try {
    // verify the token is valid
    // throws an error if the token is invalid or expired
    payload = jwt.verify(accessToken, process.env.JWT_SECRET);
    req._id = payload._id;

    next();
  } catch (e) {
    // return req unauthorized error
    return res.status(403).json({ error: "Unauthorized" });
  }
};
