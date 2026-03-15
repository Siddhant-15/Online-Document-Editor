const express = require("express")
const router = express.Router()
const Comment = require("../models/Comment")

router.post("/", async (req, res) => {
  try {
    const comment = await Comment.create(req.body)
    res.json(comment)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/:documentId", async (req, res) => {
  try {
    const comments = await Comment.find({
      documentId: req.params.documentId,
    }).populate("userId", "name avatar").populate("replies.userId", "name avatar")
    
    res.json(comments)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post("/:id/reply", async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
    if (!comment) return res.status(404).json({ error: "Comment not found" })

    comment.replies.push(req.body)
    await comment.save()

    res.json(comment)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router