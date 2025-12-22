import express from "express";
import axios from "axios";
import cron from "node-cron";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * =========================
 * ENV
 * =========================
 */
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

  // For Webhook
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL, // e.g. https://xxx.up.railway.app
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,   // e.g. vtf_webhook_2025_private

  // Railway sets PORT (your log shows 8080)
  PORT: process.env.PORT || "8080",
};

must("TELEGRAM_BOT_TOKEN", env.TELEGRAM_BOT_TOKEN);
must("TELEGRAM_CHANNEL_ID", env.TELEGRAM_CHANNEL_ID);
must("DISCORD_WEBHOOK_URL", env.DISCORD_WEBHOOK_URL);
must("GEMINI_API_KEY", env.GEMINI_API_KEY);
must("PUBLIC_BASE_URL", env.PUBLIC_BASE_URL);
must("WEBHOOK_SECRET", env.WEBHOOK_SECRET);

// normalize base url (no trailing slash)
env.PUBLIC_BASE_URL = env.PUBLIC_BASE_URL.replace(/\/+$/, "");

/**
 * =========================
 * Telegram helpers
 * =========================
 */
async function tgSendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await axios.post(
    url,
    { chat_id: chatId, text, disable_web_page_preview: true },
    { timeout: 30000 }
  );
  return res.data;
}

async function tgSetWebhook() {
  const webhookUrl = `${env.PUBLIC_BASE_URL}/telegram/${env.WEBHOOK_SECRET}`;
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`;
  const res = await axios.post(
    url,
    {
      url: webhookUrl,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    },
    { timeout: 30000 }
  );
  console.log("[WEBHOOK]", "setWebhook =>", res.data);
  return res.data;
}

async function tgGetWebhookInfo() {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`;
  const r = await axios.get(url, { timeout: 30000 });
  console.log("[WEBHOOK]", "getWebhookInfo =>", r.data);
  return r.data;
}

/**
 * =========================
 * Discord helper
 * =========================
 */
async function sendDiscord(text) {
  const url = `${env.DISCORD_WEBHOOK_URL}?wait=true`;
  const res = await axios.post(
    url,
    { content: text },
    { headers: { "Content-Type": "application/json" }, timeout: 30000 }
  );
  console.log("[DISCORD OK] id =", res.data?.id);
}

/**
 * =========================
 * Channel content (bilingual)
 * =========================
 */
function buildChannelContent() {
  const now = new Date().toISOString();
  return `🚀 VTF Update
Time: ${now}
Topic: LP mechanism & risk management (ongoing)

🚀 VTF 更新
时间: ${now}
主题: LP 机制与风险管理（持续更新）`;
}

async function sendTelegramChannel(text) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await axios.post(
    url,
    {
      chat_id: env.TELEGRAM_CHANNEL_ID,
      text,
      disable_web_page_preview: true,
    },
    { timeout: 30000 }
  );
  console.log("[TELEGRAM CHANNEL OK] message_id =", res.data?.result?.message_id);
}

/**
 * =========================
 * Gemini (official SDK)
 * =========================
 */
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

function isLikelyChinese(s) {
  return /[\u4e00-\u9fff]/.test(s || "");
}

async function askGeminiBilingual(userText) {
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

  // 强制让它输出中英双语（先英文后中文）
  const prompt = `You are "VTF Auto Pilot".
Answer in BOTH English and Chinese in the same message.
- Keep it professional, actionable, and concise.
- Do not mention policy or safety boilerplate.
- Structure:
English:
<answer>

中文：
<回答>

User: ${userText}`;

  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.() || "";
  return text.trim();
}

/**
 * =========================
 * Express webhook server
 * =========================
 */
const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// Telegram webhook endpoint
app.post(`/telegram/${env.WEBHOOK_SECRET}`, async (req, res) => {
  // Always respond 200 quickly to Telegram
  res.sendStatus(200);

  try {
    const update = req.body || {};
    const msg = update.message;
    if (!msg) return;

    const chatId = msg.chat?.id;
    const chatType = msg.chat?.type; // private/group/supergroup/channel
    const text = (msg.text || "").trim();

    console.log("📩 UPDATE RECEIVED =", { chatId, chatType, text });

    // only private chat
    if (chatType !== "private" || !chatId) return;

    // /start bilingual
    if (text === "/start") {
      await tgSendMessage(
        chatId,
        `✅ Bot is alive (private)
You can ask: VTF / LP / risk / steps / how-to

✅ 机器人已在线（私聊）
你可以直接问：VTF / LP / 风控 / 操作步骤 / 教程`
      );
      return;
    }

    if (!text) return;

    // Gemini bilingual reply
    const answer = await askGeminiBilingual(text);
    if (!answer) {
      await tgSendMessage(
        chatId,
        `⚠️ AI returned empty response. Please try again.
⚠️ AI 没有返回内容，请换个问法再试。`
      );
      return;
    }

    await tgSendMessage(chatId, answer);
  } catch (err) {
    console.error("[WEBHOOK HANDLER ERROR]", err?.response?.data || err.message);
  }
});

/**
 * =========================
 * Boot
 * =========================
 */
async function boot() {
  console.log("🚀 WORKER BOOT", new Date().toISOString());
  console.log("🔎 GEMINI_MODEL =", env.GEMINI_MODEL);
  console.log("🌐 PUBLIC_BASE_URL =", env.PUBLIC_BASE_URL);
  console.log("🔐 WEBHOOK_SECRET =", env.WEBHOOK_SECRET);
  console.log("🧩 PORT =", env.PORT);

  // Set webhook with retry (domain刚生效时，第一次可能失败)
  for (let i = 1; i <= 6; i++) {
    try {
      await tgSetWebhook();
      await tgGetWebhookInfo();
      break;
    } catch (e) {
      console.error(`[WEBHOOK SET RETRY ${i}]`, e?.response?.data || e.message);
      await new Promise((r) => setTimeout(r, 3000 * i));
    }
  }

  // Post to channel + discord immediately
  const postBoth = async () => {
    const text = buildChannelContent();
    await Promise.all([sendTelegramChannel(text), sendDiscord(text)]);
  };

  postBoth().catch((e) =>
    console.error("[POST ERROR]", e?.response?.data || e.message)
  );

  // every 10 minutes
  cron.schedule("*/10 * * * *", () => {
    console.log("[CRON] trigger");
    postBoth().catch((e) =>
      console.error("[CRON ERROR]", e?.response?.data || e.message)
    );
  });

  // heartbeat
  setInterval(() => {
    console.log("[TICK]", new Date().toISOString(), "alive ✅");
  }, 30_000);
}

app.listen(Number(env.PORT), () => {
  console.log(`[WEB] listening on ${env.PORT}`);
  boot().catch((e) => console.error("[BOOT ERROR]", e?.response?.data || e.message));
});
