const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const userList = require("./models/userList");
const authenticateToken = require("./middleware/authenticate");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json({ limit: "50mb" }));
app.use(cors());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("App is running..");
});

app.post("/createAccount", async (req, res) => {
  try {
    const { username, password } = req.body;
    const DuplicateUsername = await userList.findOne(
      { username: username },
      { __v: 0 }
    );
    const saltType = 10;
    const hashedPassword = await bcrypt.hash(password, saltType);
    const date = new Date();
    const options = {
      dateStyle: "medium",
      timeStyle: "short",
      hour12: true,
      timeZone: "Asia/Kolkata",
    };

    const adduser = {
      username: username,
      password: hashedPassword,
      createdAt: new Intl.DateTimeFormat("en-GB", options).format(date),
    };

    if (DuplicateUsername) {
      res.status(201).json({ message: "User is already registered" });
    } else {
      const result = await userList.create(adduser);
      res.status(201).json(result);
    }
  } catch (err) {
    res.status(500).json({
      message: "An error occurred while creating the account",
      error: err,
    });
  }
});

app.post("/authLogin", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await userList.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid Password" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/protected", authenticateToken, (req, res) => {
  res.json({
    message: "You have access to this protected route",
    user: req.user,
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
