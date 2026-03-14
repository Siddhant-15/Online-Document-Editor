const express = require("express")
const router = express.Router()

const { rewriteText } = require("../controllers/aiController")

router.post("/rewrite", rewriteText)

module.exports = router