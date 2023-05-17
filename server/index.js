require("dotenv").config();
const express = require("express");
const app = express();
const connection = require("./config/db");
const UserModel = require("./models/Users");
// get the route of user
const userRoute = require("./routes/userRoutes");

const cors = require("cors");

app.use(express.json());
app.use(cors());

connection();

// use the route of user
app.use("/user", userRoute);

// app.get("/getUsers", async (req, res) => {
//   try {
//     const users = await UserModel.find({});
//     res.json(users);
//   } catch (err) {
//     console.log(err);
//   }
// });

// app.post("/addUser", async (req, res) => {
//   try {
//     const user = req.body;
//     const newUser = new UserModel(user);
//     await newUser.save();
//     res.json(user);
//   } catch (err) {
//     console.log(err);
//   }
// });
const port = process.env.PORT || 5000;
app.listen(5000, () => {
  console.log("Server listening on port 5000");
});
