const express = require("express")
const { OAuth2Client } = require("google-auth-library")
const jwt = require("jsonwebtoken")

const User = require("../models/User")

const router = express.Router()

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body

    if (!idToken) {
      return res.status(400).json({ message: "idToken is required" })
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    const { sub: googleId, email, name, picture } = payload

    let user = await User.findOne({ googleId })

    if (!user) {
      user = await User.create({
        googleId,
        email,
        name,
        avatar: picture,
      })
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({ token, user })
  } catch (error) {
    console.error("Google auth error:", error)
    res.status(401).json({ message: "Invalid Google token" })
  }
})

module.exports = router

