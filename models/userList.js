const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("users", userSchema);
