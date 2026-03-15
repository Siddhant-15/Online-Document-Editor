const express = require("express")
const jwt = require("jsonwebtoken")

const Document = require("../models/Document")
const User = require("../models/User")

const router = express.Router()

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

// Add collaborator
router.post("/:id/share", auth, async (req, res) => {
  try {
    const { email, role } = req.body
    const ownerId = req.user.userId

    const doc = await Document.findById(req.params.id)
    if (!doc) {
      return res.status(404).json({ message: "Document not found" })
    }

    if (!doc.owner || doc.owner.toString() !== ownerId) {
      return res.status(403).json({ message: "Only owner can share" })
    }

    const user = await User.findOne({ email: email?.toLowerCase() })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const already = (doc.collaborators || []).find(
      (c) => c.userId && c.userId.toString() === user._id.toString()
    )
    if (already) {
      return res.status(400).json({ message: "Already collaborator" })
    }

    doc.collaborators.push({
      userId: user._id,
      role: role === "viewer" ? "viewer" : "editor",
    })

    await doc.save()

    res.json({ message: "Collaborator added" })
  } catch (err) {
    console.error("Error sharing document:", err)
    res.status(500).json({ message: "Failed to share document" })
  }
})

// Remove collaborator
router.delete("/:id/share/:userId", auth, async (req, res) => {
  try {
    const ownerId = req.user.userId

    const doc = await Document.findById(req.params.id)
    if (!doc) {
      return res.status(404).json({ message: "Document not found" })
    }

    if (!doc.owner || doc.owner.toString() !== ownerId) {
      return res.status(403).json({ message: "Only owner can modify sharing" })
    }

    doc.collaborators = (doc.collaborators || []).filter(
      (c) => !c.userId || c.userId.toString() !== req.params.userId
    )

    await doc.save()

    res.json({ message: "Collaborator removed" })
  } catch (err) {
    console.error("Error removing collaborator:", err)
    res.status(500).json({ message: "Failed to remove collaborator" })
  }
})

module.exports = router

