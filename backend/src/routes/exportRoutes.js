const express = require("express")
const fs = require("fs")
const path = require("path")
const DocModel = require("../models/Document")
const html_to_pdf = require("html-pdf-node")
const { Document: DocxDocument, Packer, Paragraph, TextRun } = require("docx")

const router = express.Router()

// Utility to create plain text from Quill ops
function createPlainText(doc) {
  if (!doc || !doc.content || !Array.isArray(doc.content.ops)) return ""
  return doc.content.ops
    .filter(op => typeof op.insert === "string")
    .map((op) => op.insert)
    .join("")
}

router.get("/:id/pdf", async (req, res) => {
  try {
    const doc = await DocModel.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: "Document not found" })

    const text = createPlainText(doc)
    
    // We wrap text in PRE tags to preserve linebreaks visually in HTML -> PDF
    const htmlContent = `<html><body style="font-family: sans-serif; padding: 20px;"><pre style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit;">${text}</pre></body></html>`
    
    const file = { content: htmlContent }
    const options = { format: 'A4' }

    html_to_pdf.generatePdf(file, options).then(pdfBuffer => {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title || "document"}.pdf"`)
      res.send(pdfBuffer)
    }).catch((err) => {
      console.error(err)
      res.status(500).json({ error: "Failed to generate PDF" })
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/:id/docx", async (req, res) => {
  try {
    const doc = await DocModel.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: "Document not found" })

    const text = createPlainText(doc)
    const lines = text.split('\n')
    
    const paragraphs = lines.map(line => new Paragraph({
      children: [new TextRun(line)]
    }))

    const docxDoc = new DocxDocument({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    })

    const buffer = await Packer.toBuffer(docxDoc)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title || "document"}.docx"`)
    res.send(buffer)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/:id/markdown", async (req, res) => {
  try {
    const doc = await DocModel.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: "Document not found" })

    const text = createPlainText(doc)
    
    res.setHeader('Content-Type', 'text/markdown')
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title || "document"}.md"`)
    res.send(text)
    
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router