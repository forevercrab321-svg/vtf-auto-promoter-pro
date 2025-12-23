console.log("🚀🚀🚀 RAILWAY NOW RUNNING worker/index.js " + new Date().toISOString());

import express from "express";

const app = express();
app.use(express.json());

/* =========================
   ENV
========================= */
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET?.trim() || "vtf_webhook_2025_private";
const PORT = process.env.PORT || 8080;

console.log("✅ ENV CHECK:", {
  hasTelegramToken: !!TELEGRAM_BOT_TOKEN,
  hasGeminiKey: !!GEMINI_API_KEY,
  webhookSecret: WEBHOOK_SECRET ? "set" : "missing",
  port: PORT
});

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/* =========================
   HEALTH
========================= */
app.get("/debug/ping", (_, res) => res.status(200).send("pong"));

/* =========================
   GEMINI (REST v1)
========================= */
async function askGeminiSmart(userText) {
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY missing in Railway Variables");
    return "⚠️ Server missing GEMINI_API_KEY (check Railway Variables).";
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    encodeURIComponent(GEMINI_API_KEY);

  const prompt = `You are "VTF Auto Pilot", an assistant for crypto education & community ops.
Rules:
- Reply in BOTH English and Chinese in ONE message.
- Keep it professional, concise, actionable.
- If user asks a vague question, ask 1 clarifying question first.
- If user asks for illegal/financial guarantees, refuse and offer safe alternatives.

User message:
${userText}`;

  let resp, json;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512
        }
      })
    });

    json = await resp.json().catch(() => ({}));
  } catch (e) {
    console.error("❌ GEMINI FETCH ERROR:", e?.message || e);
    return "⚠️ AI service busy (network error). Please try again.";
  }

  if (!resp.ok) {
    console.error("❌ GEMINI HTTP ERROR:", resp.status, resp.statusText);
    console.error("❌ GEMINI ERROR JSON:", JSON.stringify(json));
    return `⚠️ AI service error (Gemini ${resp.status}). Check Deploy Logs.`;
  }

  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("❌ GEMINI EMPTY RESPONSE:", JSON.stringify(json));
    return "⚠️ AI service returned empty response. Check Deploy Logs.";
  }

  return text;
}

/* Debug endpoint: test Gemini directly in browser */
app.get("/debug/gemini", async (_, res) => {
  const out = await askGeminiSmart("Say hello and explain what IP means in simple terms.");
  res.status(200).send(out);
});

/* =========================
   TELEGRAM WEBHOOK
========================= */
app.post(`/telegram/${WEBHOOK_SECRET}`, async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg?.text) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    console.log("📩 TG:", { chatId, text });

    // Simple commands
    if (text === "/start") {
      await sendMessage(chatId, "✅ Bot is alive. Send me a question and I will reply in EN+中文.");
      return res.sendStatus(200);
    }
    if (text.toLowerCase() === "ping") {
      await sendMessage(chatId, "pong ✅");
      return res.sendStatus(200);
    }

    // Smart reply
    const reply = await askGeminiSmart(text);
    await sendMessage(chatId, reply);

    return res.sendStatus(200);
  } catch (e) {
    console.error("❌ TG HANDLER ERROR:", e?.message || e);
    return res.sendStatus(200);
  }
});

/* =========================
   SEND MESSAGE
========================= */
async function sendMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN missing in Railway Variables");
    return;
  }
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch (e) {
    console.error("❌ TG sendMessage error:", e?.message || e);
  }
}

/* =========================
   BOOT
========================= */
app.listen(PORT, () => {
  console.log("✅ WORKER BOOTED ON", PORT);
});
