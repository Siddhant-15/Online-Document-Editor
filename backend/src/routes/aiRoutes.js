const express = require("express")
const router = express.Router()

const {
  rewriteText,
  summarizeText,
  grammarFix
} = require("../services/aiService")

router.post("/rewrite", async (req, res) => {
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: "No text provided" })
    const result = await rewriteText(text)
    res.json({ result })
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to rewrite" })
  }
})

router.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: "No text provided" })
    const result = await summarizeText(text)
    res.json({ result })
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to summarize" })
  }
})

router.post("/grammar", async (req, res) => {
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: "No text provided" })
    const result = await grammarFix(text)
    res.json({ result })
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fix grammar" })
  }
})

module.exports = router