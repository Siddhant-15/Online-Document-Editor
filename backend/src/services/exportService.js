const pandoc = require("node-pandoc")
const fs = require("fs")

function exportToPDF(inputFile, outputFile) {

  const args = [
    inputFile,
    "-o",
    outputFile
  ]

  pandoc(args)

}

module.exports = { exportToPDF }