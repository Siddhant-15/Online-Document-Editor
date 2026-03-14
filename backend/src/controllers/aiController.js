const { rewrite } = require("../services/aiService")

async function rewriteText(req, res) {

  const { text } = req.body

  const result = await rewrite(text)

  res.json({ result })

}

module.exports = { rewriteText }