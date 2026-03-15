async function rewriteText(text) {
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistral",
        prompt: `Rewrite the following text professionally:\n${text}`,
        stream: false
      })
    })

    const data = await res.json()
    return data.response
  } catch (error) {
    console.error("Ollama rewrite error:", error?.message)
    throw error
  }
}

async function summarizeText(text) {
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3",
        prompt: `Summarize this text in bullet points:\n${text}`,
        stream: false
      })
    })

    const data = await res.json()
    return data.response
  } catch (error) {
    console.error("Ollama summarize error:", error?.message)
    throw error
  }
}

async function grammarFix(text) {
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3",
        prompt: `Fix grammar but keep meaning same for the following text:\n${text}`,
        stream: false
      })
    })

    const data = await res.json()
    return data.response
  } catch (error) {
    console.error("Ollama grammar error:", error?.message)
    throw error
  }
}

module.exports = {
  rewriteText,
  summarizeText,
  grammarFix
}