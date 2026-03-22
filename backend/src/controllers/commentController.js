const Comment = require("../models/Comment")

async function addComment(req, res) {

  let comment = await Comment.create(req.body)

  comment = await comment.populate("userId", "name avatar")

  res.json(comment)

}

async function getComments(req, res) {

  const comments = await Comment.find({
    documentId: req.params.documentId
  }).populate("userId", "name avatar")

  res.json(comments)

}

module.exports = { addComment, getComments }