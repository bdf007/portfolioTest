exports.commentValidator = (req, res, next) => {
  // name is not null
  req.check("name", "Name is required").notEmpty();
  // email is not null, valid and normalized
  req.check("email", "Email must be between 3 to 32 characters").notEmpty();
  req.check("email", "Invalid email").isEmail();

  // check for errors
  const errors = req.validationErrors();
  // if error show the first one as they happen
  if (errors) {
    const firstError = errors.map((error) => error.msg)[0];
    return res.status(400).json({ error: firstError });
  }

  // proceed to next middleware
  next();
};
