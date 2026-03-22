const Version = require("../models/Version")
const Document = require("../models/Document")

async function saveVersion(documentId, content, userId) {
  const doc = await Document.findById(documentId)
  if (!doc) {
    return
  }

  const nextVersion = (doc.version || 0) + 1
  doc.version = nextVersion
  await doc.save()

  await Version.create({
    documentId,
    content,
    editedBy: userId,
    versionNumber: nextVersion,
  })
}

module.exports = { saveVersion }