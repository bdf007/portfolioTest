// route of user

const UserModel = require("../models/Users");
const express = require("express");
const router = express.Router();

router.get("/getUsers", async (req, res) => {
  try {
    const users = await UserModel.find({});
    res.json(users);
  } catch (err) {
    console.log(err);
  }
});

router.post("/adddUser", async (req, res) => {
  try {
    const user = req.body;
    const newUser = new UserModel(user);

    await newUser.save();
    res.json(user);
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
