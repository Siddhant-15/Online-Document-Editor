/**
 * Helper function to call Ollama or fallback to Gemini if Ollama is not running.
 */
async function generateText(prompt, ollamaModel = "llama3") {
  // 1. Try Ollama Local
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt,
        stream: false
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      return data.response;
    }
    // If response is not ok (e.g. model missing), we log and proceed to fallback
    console.warn(`Ollama returned status ${res.status}. Falling back to Gemini...`);
  } catch (error) {
    // Fetch failed means Ollama is probably not running
    console.warn(`Ollama fetch failed (is it running?). Falling back to Gemini...`);
  }

  // 2. Fallback to Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Ollama is not responding, and GEMINI_API_KEY is not set in .env");
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || "Gemini API failed");
    }
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini fallback error:", error?.message);
    throw error;
  }
}

async function rewriteText(text) {
  return generateText(`Rewrite the following text professionally. Provide exactly ONE rewritten version. Return ONLY the new text, without any conversational preamble, choices, or formatting:\n${text}`, "mistral");
}

async function summarizeText(text) {
  return generateText(`Summarize this text in bullet points:\n${text}`, "llama3");
}

async function grammarFix(text) {
  return generateText(`Fix the grammar of the following text while keeping the exact same meaning. Return ONLY the fixed text, without any conversational preamble, quotes, choices, or formatting:\n${text}`, "llama3");
}

module.exports = {
  rewriteText,
  summarizeText,
  grammarFix
};