require("dotenv").config()
// const path = require("path");
// require("dotenv").config({ path: path.join(__dirname, "..", ".env") });


const express = require("express")
const http = require("http")
const cors = require("cors")

const connectDB = require("./config/db")
const collaborationSocket = require("./sockets/collaborationSocket")

const app = express()

app.use(cors())
app.use(express.json())

app.use("/auth", require("./routes/authRoutes"))
app.use("/documents", require("./routes/documentRoutes"))
app.use("/documents", require("./routes/shareRoutes"))

connectDB()

const server = http.createServer(app)

collaborationSocket(server)

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// const aiRoutes = require("./routes/aiRoutes")

// app.use("/ai", aiRoutes)