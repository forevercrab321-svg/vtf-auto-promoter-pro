import express from "express";
import axios from "axios";
import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";

/* =========================
   BOOT & ENV
========================= */
console.log("🚀 WORKER BOOT", new Date().toISOString());

function must(name, val) {
  if (!val) {
    console.error(`[ENV MISSING] ${name}`);
    process.exit(1);
  }
}

const env = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID,
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-pro",
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET, // ✅ matches your Railway variable name
};

Object.entries(env).forEach(([k, v]) => must(k, v));
console.log("🔎 GEMINI_MODEL =", env.GEMINI_MODEL);

/* =========================
   Helpers: language detect
========================= */
function detectLang(text) {
  const s = (text || "").trim();
  if (!s) return "en";

  const hasCJK = /[\u4e00-\u9fff]/.test(s);
  const hasLatin = /[A-Za-z]/.test(s);

  if (hasCJK && hasLatin) return "bi";
  if (hasCJK) return "zh";
  return "en";
}

function buildSystemPrompt(lang) {
  // Give Gemini very explicit instructions.
  if (lang === "zh") {
    return [
      "你是 VTF Auto Pilot。",
      "用中文回答，专业、直接、可执行。",
      "如果问题涉及风控/合规，给出清晰的风险提示与建议。",
      "不要废话，不要自我介绍。",
    ].join("\n");
  }
  if (lang === "en") {
    return [
      "You are VTF Auto Pilot.",
      "Reply in English. Be professional, direct, and actionable.",
      "If risk/compliance is involved, add clear cautions and recommendations.",
      "No fluff. No self-introduction.",
    ].join("\n");
  }
  // bilingual
  return [
    "You are VTF Auto Pilot.",
    "Return a bilingual answer: first Chinese, then English.",
    "Be professional, direct, and actionable. No fluff.",
    "If risk/compliance is involved, add clear cautions and recommendations.",
  ].join("\n");
}

/* =========================
   Gemini call (v1)
========================= */
async function callGemini({ apiKey, model, userText }) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 900,
    },
  };

  const res = await axios.post(url, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 60000,
  });

  return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/* =========================
   Telegram Webhook (NO polling -> NO 409)
========================= */
const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: false });

const BASE = env.PUBLIC_BASE_URL.replace(/\/$/, "");
const WEBHOOK_PATH = `/telegram/webhook/${env.WEBHOOK_SECRET}`;
const WEBHOOK_URL = `${BASE}${WEBHOOK_PATH}`;

/* =========================
   Express server
========================= */
const app = express();
app.use(express.json());

app.get("/", (_, res) => res.status(200).send("ok"));

app.post(WEBHOOK_PATH, async (req, res) => {
  // Telegram wants quick 200
  res.sendStatus(200);

  const msg = req.body?.message;
  if (!msg) return;

  const chatId = msg.chat?.id;
  const chatType = msg.chat?.type;
  const text = (msg.text || "").trim();

  console.log("📩 UPDATE =", { chatId, chatType, text });

  if (chatType !== "private" || !chatId) return;
  if (!text) return;

  // /start bilingual
  if (text === "/start") {
    await bot.sendMessage(
      chatId,
      [
        "✅ Bot alive (webhook)",
        "你可以直接问我：VTF / LP / 风控 / 操作步骤等。",
        "",
        "✅ Bot is online (webhook)",
        "Ask me about: VTF / LP / risk control / step-by-step operations.",
      ].join("\n"),
      { disable_web_page_preview: true }
    );
    return;
  }

  // detect language for response
  const lang = detectLang(text);
  const sys = buildSystemPrompt(lang);

  // Build prompt
  const prompt =
    `${sys}\n\n` +
    `User message:\n${text}\n\n` +
    `Requirements:\n` +
    `- Give clear steps if the user asks "how"\n` +
    `- Keep it concise but complete\n`;

  try {
    const answer = await callGemini({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      userText: prompt,
    });

    console.log("[AI] reply_head =", answer.slice(0, 80));

    const fallback =
      lang === "zh"
        ? "⚠️ AI 没返回内容，请换个问法。"
        : lang === "en"
        ? "⚠️ AI returned empty. Please rephrase and try again."
        : "⚠️ AI returned empty. 请换个问法再试一次 / Please rephrase and try again.";

    await bot.sendMessage(chatId, answer || fallback, {
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("[AI ERROR]", err?.response?.data || err.message);

    const msg2 =
      "⚠️ AI 暂时不可用（已记录错误）。请稍后再试。\n" +
      "⚠️ AI is temporarily unavailable (error logged). Please try again later.";

    await bot.sendMessage(chatId, msg2, { disable_web_page_preview: true });
  }
});

/* =========================
   Scheduled channel + Discord (bilingual)
========================= */
function buildChannelContentBilingual() {
  const now = new Date().toISOString();
  return [
    "🚀 VTF Update",
    `Time: ${now}`,
    "",
    "Topic: LP mechanism & risk management (ongoing)",
    "",
    "🚀 VTF 更新",
    `时间：${now}`,
    "",
    "主题：LP 机制与风险管理（持续更新）",
  ].join("\n");
}

async function sendTelegramChannel(text) {
  await axios.post(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      chat_id: env.TELEGRAM_CHANNEL_ID,
      text,
      disable_web_page_preview: true,
    },
    { timeout: 60000 }
  );
  console.log("[TELEGRAM CHANNEL OK]");
}

async function sendDiscord(text) {
  await axios.post(
    env.DISCORD_WEBHOOK_URL,
    { content: text },
    { headers: { "Content-Type": "application/json" }, timeout: 60000 }
  );
  console.log("[DISCORD OK]");
}

async function postBoth() {
  const text = buildChannelContentBilingual();
  await Promise.all([sendTelegramChannel(text), sendDiscord(text)]);
}

// start-up post once
postBoth().catch((e) => console.error("[POST ERROR]", e?.message));

// every 10 minutes
cron.schedule("*/10 * * * *", () => {
  console.log("[CRON] trigger");
  postBoth().catch((e) => console.error("[CRON ERROR]", e?.message));
});

/* =========================
   Listen & set webhook
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("[WEB] listening on", PORT);

  try {
    await bot.setWebHook(WEBHOOK_URL);
    console.log("[WEBHOOK] set to", WEBHOOK_URL);

    const info = await bot.getWebHookInfo();
    console.log("[WEBHOOK INFO]", info);
  } catch (e) {
    console.error("[WEBHOOK SET ERROR]", e?.response?.data || e.message);
  }
});

// heartbeat
setInterval(() => {
  console.log("[TICK]", new Date().toISOString(), "alive ✅");
}, 30_000);
