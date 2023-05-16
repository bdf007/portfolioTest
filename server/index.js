const express = require("express");
const app = express();
const mongoose = require("mongoose");
const UserModel = require("./models/Users");

const cors = require("cors");

app.use(express.json());
app.use(cors());

mongoose.connect(
  "mongodb+srv://bdf007:Sheriff007Cm@portfolio.rjriqrm.mongodb.net/MyPortfolio?retryWrites=true&w=majority"
);

app.get("/getUsers", async (req, res) => {
  try {
    const users = await UserModel.find({});
    res.json(users);
  } catch (err) {
    console.log(err);
  }
});

app.post("/addUser", async (req, res) => {
  try {
    const user = req.body;
    const newUser = new UserModel(user);
    await newUser.save();
    res.json(user);
  } catch (err) {
    console.log(err);
  }
});

app.listen(5000, () => {
  console.log("Server listening on port 5000");
});
