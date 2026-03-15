const mongoose = require("mongoose")

const CommentSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    text: String,

    position: {
      index: Number,
      length: Number,
    },

    replies: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        text: String,
        createdAt: {
          type: Date,
          default: Date.now
        },
      },
    ],
  },
  { timestamps: true }
)

module.exports = mongoose.model("Comment", CommentSchema)