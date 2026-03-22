const { createClient } = require("redis")

const pubClient = createClient({
  url: process.env.REDIS_URL
})

const subClient = pubClient.duplicate()

Promise.all([
  pubClient.connect(),
  subClient.connect()
])

module.exports = { pubClient, subClient }