const { Server } = require("socket.io")

const Document = require("../models/Document")
const { saveVersion } = require("../services/versionService")

const {
  userJoin,
  userLeave,
  getUsers
} = require("../services/presenceService")

module.exports = function(server) {

  const origin = process.env.SOCKET_URL || "http://localhost:3000"

  const io = new Server(server, {
    cors: {
      origin,
      methods: ["GET", "POST"],
    }
  })

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id)

    let currentDocument = null
    let currentUser = null

    // Join document
    socket.on("join-document", ({ documentId, user }) => {

      currentDocument = documentId
      currentUser = user

      socket.join(documentId)

      userJoin(documentId, user)

      io.to(documentId).emit("users-present", getUsers(documentId))
    })


    // Real-time typing
    socket.on("send-changes", ({ documentId, delta }) => {

      socket.to(documentId).emit("receive-changes", delta)

    })


    // Cursor tracking
    socket.on("cursor-move", ({ documentId, cursor }) => {

      socket.to(documentId).emit("cursor-update", cursor)

    })


    // Save document
    socket.on("save-document", async ({ documentId, data, userId }) => {

      try {

        await Document.findByIdAndUpdate(documentId, {
          content: data
        })

        await saveVersion(documentId, data, userId)

      } catch (err) {
        console.error("Save error:", err)
      }

    })


    // Disconnect
    socket.on("disconnect", () => {

      console.log("User disconnected:", socket.id)

      if (currentDocument && currentUser) {

        userLeave(currentDocument, currentUser.id)

        io.to(currentDocument).emit(
          "users-present",
          getUsers(currentDocument)
        )

      }

    })

  })
}