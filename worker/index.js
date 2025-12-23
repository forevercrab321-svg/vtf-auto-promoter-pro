import express from "express";
import axios from "axios";
import cron from "node-cron";
import { GoogleGenerativeAI } from "@google/generative-ai";

function must(name, val) {
  if (!val) {
    console.error(`[ENV MISSING] ${name}`);
    process.exit(1);
  }
}

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const TELEGRAM_CHANNEL_ID = (process.env.TELEGRAM_CHANNEL_ID || "").trim();
const DISCORD_WEBHOOK_URL = (process.env.DISCORD_WEBHOOK_URL || "").trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();

// 🔴 关键修复：给模型名字也加上 .trim()，防止 'gemini-pro ' 这种隐形错误
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();

const PUBLIC_BASE_URL_RAW = process.env.PUBLIC_BASE_URL; 
const WEBHOOK_SECRET = (process.env.WEBHOOK_SECRET || "").trim();
const PORT = Number(process.env.PORT || "8080");

must("TELEGRAM_BOT_TOKEN", TELEGRAM_BOT_TOKEN);
must("TELEGRAM_CHANNEL_ID", TELEGRAM_CHANNEL_ID);
must("DISCORD_WEBHOOK_URL", DISCORD_WEBHOOK_URL);
must("GEMINI_API_KEY", GEMINI_API_KEY);
must("PUBLIC_BASE_URL", PUBLIC_BASE_URL_RAW);
must("WEBHOOK_SECRET", WEBHOOK_SECRET);

const PUBLIC_BASE_URL = String(PUBLIC_BASE_URL_RAW).trim().replace(/\/+$/, "");

async function tgSendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(
      url,
      { chat_id: chatId, text, disable_web_page_preview: true },
      { timeout: 30000 }
    );
  } catch (e) {
    console.error("[TG SEND ERROR]", e.message);
  }
}

async function tgGetWebhookInfo() {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`;
  const r = await axios.get(url, { timeout: 30000 });
  return r.data;
}

async function tgSetWebhook() {
  const webhookUrl = `${PUBLIC_BASE_URL}/telegram/${WEBHOOK_SECRET}`;
  console.log(`[SETUP] Setting webhook to: ${webhookUrl}`);
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true&allowed_updates=${encodeURIComponent(JSON.stringify(["message"]))}`;
  const r = await axios.get(url, { timeout: 30000 });
  console.log("[WEBHOOK] setWebhook result =>", r.data);
  return r.data;
}

async function sendDiscord(text) {
  const url = `${DISCORD_WEBHOOK_URL}?wait=true`;
  try {
    const res = await axios.post(url, { content: text }, { headers: { "Content-Type": "application/json" }, timeout: 30000 });
    console.log("[DISCORD OK] id =", res.data?.id);
  } catch (e) { console.error("[DISCORD ERROR]", e.message); }
}

function buildChannelContent() {
  const now = new Date().toISOString();
  return `🚀 VTF Update\nTime: ${now}\nTopic: LP mechanism & risk management (ongoing)\n\n🚀 VTF 更新\n时间: ${now}\n主题: LP 机制与风险管理（持续更新）`;
}

async function sendTelegramChannel(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const res = await axios.post(url, { chat_id: TELEGRAM_CHANNEL_ID, text, disable_web_page_preview: true }, { timeout: 30000 });
    console.log("[TELEGRAM CHANNEL OK] message_id =", res.data?.result?.message_id);
  } catch (e) { console.error("[TG CHANNEL ERROR]", e.message); }
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
async function askGeminiBilingual(userText) {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    console.log(`[GEMINI] Using model: '${GEMINI_MODEL}'`); // 打印最终使用的模型名，方便排查
    const prompt = `You are "VTF Auto Pilot". Answer in BOTH English and Chinese.\nUser: ${userText}`;
    const result = await model.generateContent(prompt);
    return (result?.response?.text?.() || "").trim();
  } catch (e) {
    console.error("[GEMINI ERROR]", e.message);
    return "⚠️ AI service busy. Please try again later.";
  }
}

const app = express();
app.use(express.json({ limit: "1mb" }));
app.get("/", (req, res) => res.status(200).send("OK - VTF Bot is Running"));

const webhookRoute = `/telegram/${WEBHOOK_SECRET}`;
console.log(`[ROUTE REGISTERED] POST ${webhookRoute}`); 

app.post(webhookRoute, async (req, res) => {
  res.sendStatus(200);
  try {
    const update = req.body || {};
    const msg = update.message;
    if (!msg) return;
    const chatId = msg.chat?.id;
    if (msg.chat?.type !== "private" || !chatId) return;
    const text = (msg.text || "").trim();
    console.log("📩 UPDATE RECEIVED =", { chatId, text });

    if (text === "/start" || text.toLowerCase() === "start") {
      await tgSendMessage(chatId, "✅ Bot is alive (private)");
      return;
    }
    if (text.toLowerCase() === "ping") {
      await tgSendMessage(chatId, "pong ✅");
      return;
    }
    const answer = await askGeminiBilingual(text);
    await tgSendMessage(chatId, answer);
  } catch (err) { console.error("[WEBHOOK HANDLER ERROR]", err?.message); }
});

async function boot() {
  console.log("🚀 WORKER BOOT", new Date().toISOString());
  console.log("🧠 GEMINI_MODEL (Fixed) =", `"${GEMINI_MODEL}"`); // 打印出来让你放心
  for (let i = 1; i <= 6; i++) {
    try {
      await tgSetWebhook();
      break;
    } catch (e) { await new Promise((r) => setTimeout(r, 3000 * i)); }
  }
  cron.schedule("0 * * * *", () => {
    console.log("[CRON] Hourly trigger");
    const text = buildChannelContent();
    Promise.all([sendTelegramChannel(text), sendDiscord(text)]).catch((e) => console.error(e));
  });
}

app.listen(PORT, () => {
  console.log(`[WEB] listening on ${PORT}`);
  boot().catch((e) => console.error(e));
});
