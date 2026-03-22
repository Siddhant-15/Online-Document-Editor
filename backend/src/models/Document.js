const mongoose = require("mongoose")

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    default: "Untitled Document",
  },

  content: {
    type: Object,
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  collaborators: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      role: {
        type: String,
        enum: ["viewer", "editor", "commenter"],
      },
    },
  ],

  version: {
    type: Number,
    default: 1,
  },
}, { timestamps: true })

module.exports = mongoose.model("Document", DocumentSchema)