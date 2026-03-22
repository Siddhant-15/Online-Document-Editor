const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    name: String,
    avatar: String,
  },
  { timestamps: true }
)

module.exports = mongoose.model("User", UserSchema)

