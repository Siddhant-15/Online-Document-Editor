const activeUsers = {}

function userJoin(documentId, user, socketId) {

  if (!activeUsers[documentId]) {
    activeUsers[documentId] = []
  }

  activeUsers[documentId].push({ socketId, user })

}

function userLeave(documentId, socketId) {

  if (!activeUsers[documentId]) return

  activeUsers[documentId] =
    activeUsers[documentId].filter(entry => entry.socketId !== socketId)

}

function getUsers(documentId) {

  const entries = activeUsers[documentId] || []
  
  const uniqueUsers = []
  const seenIds = new Set()
  
  for (const entry of entries) {
    if (!seenIds.has(entry.user.id)) {
      seenIds.add(entry.user.id)
      uniqueUsers.push(entry.user)
    }
  }

  return uniqueUsers

}

module.exports = {
  userJoin,
  userLeave,
  getUsers
}