const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const userList = require("./models/userList");
const authenticateToken = require("./middleware/authenticate");
const sendVerificationEmail = require("./sendVerificationEmail");
const crypto = require("crypto");
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
  res.send("App is running...");
});

app.post("/createAccount", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await userList.findOne({ email: email }, { __v: 0 });
    const saltType = 10;
    const hashedPassword = await bcrypt.hash(password, saltType);

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = new userList({
      username,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
    });
    if (existingUser) {
      res.status(201).json({ message: "user Email is already registered" });
    } else {
      await userList.create(newUser);
      await sendVerificationEmail(newUser, verificationToken);
      res
        .status(201)
        .json({ message: "Account created. Please verify your email. " });
    }
  } catch (err) {
    res.status(500).json({
      message: "An error occurred while creating the account",
      error: err,
    });
  }
});

app.post("/authLogin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await userList.findOne({ email });
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in." });
    }
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

app.get("/verifyEmail/:id", async (req, res) => {
  try {
    const user = await userList.findOne({ verificationToken: req.params.id });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    if (user) {
      const verifiyEmail = await userList.findByIdAndUpdate(
        { _id: user._id },
        { isVerified: true, verificationToken: "" },
        { new: true }
      );
     
      res.status(201).json({
        message: "Email verified successfully. You can now log in.",
      });
    }
  } catch (err) {
    res.status(500).json({ message: "Error verifying email" });
  }
});

app.get("/protected", authenticateToken, (req, res) => {
  res.json({
    message: "You have access to this protected route",
    user: req.user,
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
