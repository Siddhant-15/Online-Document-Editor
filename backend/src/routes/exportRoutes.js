const express = require("express")
const router = express.Router()

const { exportToPDF } = require("../services/exportService")

router.post("/pdf", async (req, res) => {

  const { inputFile } = req.body

  const outputFile = "output.pdf"

  exportToPDF(inputFile, outputFile)

  res.download(outputFile)

})

module.exports = router