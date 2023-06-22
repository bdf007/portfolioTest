exports.getAbout = async (req, res) => {
  await res.send("hello from get About page by controller");
};

exports.postAbout = async (req, res) => {
  await res.send("hello from post About page by controller");
};

exports.getAboutById = async (req, res) => {
  await res.send("hello from get About page by id by controller");
};

exports.updateAboutById = async (req, res) => {
  await res.send("hello from update About page by id by controller");
};

exports.deleteAboutById = async (req, res) => {
  await res.send("hello from delete About page by id by controller");
};
