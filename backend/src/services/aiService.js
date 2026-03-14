const OpenAI = require("openai")

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
})

async function rewrite(text) {

  const response = await openai.chat.completions.create({

    model: "gpt-4o-mini",

    messages: [
      {
        role: "system",
        content: "Rewrite the text professionally"
      },
      {
        role: "user",
        content: text
      }
    ]
  })

  return response.choices[0].message.content
}

module.exports = { rewrite }