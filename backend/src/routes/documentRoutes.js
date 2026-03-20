const express = require("express")
const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")
const router = express.Router()

const Document = require("../models/Document")

function auth(req, res, next) {
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null

  if (!token) {
    return res.status(401).json({ message: "No token provided" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" })
  }
}

// Get all documents where the user is owner or collaborator
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.userId

    const documents = await Document.find({
      $or: [{ owner: userId }, { "collaborators.userId": userId }],
    }).sort({ updatedAt: -1 })

    res.json(documents)
  } catch (error) {
    console.error("Error fetching documents:", error)
    res.status(500).json({ message: "Failed to fetch documents" })
  }
})

// Create document
router.post("/", auth, async (req, res) => {
  try {
    const { title, content, collaborators, version } = req.body

    const document = await Document.create({
      title,
      content,
      owner: req.user.userId,
      collaborators,
      version,
    })

    res.status(201).json(document)
  } catch (error) {
    console.error("Error creating document:", error)
    res.status(500).json({ message: "Failed to create document" })
  }
})

// Get single document
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid document id" })
    }

    const document = await Document.findOne({
      _id: id,
      $or: [{ owner: userId }, { "collaborators.userId": userId }],
    })

    if (!document) {
      return res.status(404).json({ message: "Document not found" })
    }

    res.json(document)
  } catch (error) {
    console.error("Error fetching document:", error)
    res.status(500).json({ message: "Failed to fetch document" })
  }
})

// Update document (PUT/PATCH)
router.put("/:id", auth, async (req, res) => {
  try {
    const updates = req.body

    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      updates,
      { returnDocument: "after" }
    )

    if (!document) {
      return res
        .status(404)
        .json({ message: "Document not found or not authorized" })
    }

    res.json(document)
  } catch (error) {
    console.error("Error updating document:", error)
    res.status(500).json({ message: "Failed to update document" })
  }
})

router.patch("/:id", auth, async (req, res) => {
  try {
    const updates = req.body

    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      updates,
      { returnDocument: "after" }
    )

    if (!document) {
      return res
        .status(404)
        .json({ message: "Document not found or not authorized" })
    }

    res.json(document)
  } catch (error) {
    console.error("Error updating document:", error)
    res.status(500).json({ message: "Failed to update document" })
  }
})

// Delete document
router.delete("/:id", auth, async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.userId,
    })

    if (!document) {
      return res
        .status(404)
        .json({ message: "Document not found or not authorized" })
    }

    res.status(204).send()
  } catch (error) {
    console.error("Error deleting document:", error)
    res.status(500).json({ message: "Failed to delete document" })
  }
})

module.exports = router