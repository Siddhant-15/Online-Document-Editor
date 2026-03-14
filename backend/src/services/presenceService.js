const activeUsers = {}

function userJoin(documentId, user) {

  if (!activeUsers[documentId]) {
    activeUsers[documentId] = []
  }

  activeUsers[documentId].push(user)

}

function userLeave(documentId, userId) {

  if (!activeUsers[documentId]) return

  activeUsers[documentId] =
    activeUsers[documentId].filter(u => u.id !== userId)

}

function getUsers(documentId) {

  return activeUsers[documentId] || []

}

module.exports = {
  userJoin,
  userLeave,
  getUsers
}