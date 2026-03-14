const Comment = require("../models/Comment")

async function addComment(req, res) {

  const comment = await Comment.create(req.body)

  res.json(comment)

}

async function getComments(req, res) {

  const comments = await Comment.find({
    documentId: req.params.documentId
  })

  res.json(comments)

}

module.exports = { addComment, getComments }