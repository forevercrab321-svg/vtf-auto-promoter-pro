console.log("🚀🚀🚀 RAILWAY NOW RUNNING worker/index.js " + new Date().toISOString());

import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET?.trim() || "vtf_webhook_2025_private";
const PORT = process.env.PORT || 8080;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

app.get("/debug/ping", (_, res) => res.send("pong"));

async function askGemini(text) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text }] }]
      })
    }
  );

  const json = await resp.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text || "AI busy";
}

app.post(`/telegram/${WEBHOOK_SECRET}`, async (req, res) => {
  const msg = req.body.message;
  if (!msg?.text) return res.sendStatus(200);

  const reply = await askGemini(msg.text);
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: msg.chat.id, text: reply })
  });

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log("✅ WORKER BOOTED ON", PORT);
});
