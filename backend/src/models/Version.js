const mongoose = require("mongoose")

const VersionSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
    required: true
  },

  content: {
    type: Object,
    required: true
  },

  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  versionNumber: {
    type: Number,
    required: true
  }

}, { timestamps: true })

module.exports = mongoose.model("Version", VersionSchema)