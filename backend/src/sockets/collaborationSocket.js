const { Server } = require("socket.io")

const Document = require("../models/Document")
const { saveVersion } = require("../services/versionService")

module.exports = function(server) {

  const origin = process.env.SOCKET_URL || "http://localhost:3000"

  const io = new Server(server, {
    cors: {
      origin,
      methods: ["GET", "POST"],
    }
  })

  function broadcastPresence(documentId) {
    const allClients = Array.from(
      io.sockets.adapter.rooms.get(documentId) || []
    ).map((id) => io.sockets.sockets.get(id)?.data?.user).filter(Boolean)

    const uniqueClientsMap = new Map()
    allClients.forEach((c) => {
      if (c && c.id) uniqueClientsMap.set(c.id, c)
    })
    
    io.to(documentId).emit("users-present", Array.from(uniqueClientsMap.values()))
  }

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id)

    // Join document
    socket.on("join-document", ({ documentId, user }) => {

      socket.join(documentId)
      
      socket.data.user = user
      socket.data.documentId = documentId

      broadcastPresence(documentId)
    })

    // Real-time text changes
    socket.on("send-changes", ({ documentId, delta }) => {
      socket.to(documentId).emit("receive-changes", delta)
    })

    // Typing indicator
    socket.on("user-typing", ({ documentId, user }) => {
      if (!documentId || !user) return
      socket.to(documentId).emit("user-typing", user)
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
      
      const { documentId } = socket.data || {}
      
      if (documentId) {
        broadcastPresence(documentId)
      }
    })

  })
}