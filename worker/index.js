import axios from "axios";
import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";
import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("🚨 WORKER FILE LOADED", new Date().toISOString());

// ====== helpers ======
function must(name, val) {
  if (!val) {
    console.error(`[ENV MISSING] ${name}`);
    process.exit(1);
  }
}

function normalizeGeminiModel(model) {
  // 兼容你在 Railway 里填：
  // - models/gemini-2.5-pro
  // - gemini-2.5-pro
  // 两种都可以
  if (!model) return "models/gemini-2.5-pro";
  return model.startsWith("models/") ? model : `models/${model}`;
}

// ====== Channel 内容（定时发）======
function buildChannelContent() {
  const now = new Date().toISOString();
  return `🚀 VTF 更新\n\n时间: ${now}\n\nLP 机制与风险管理（持续更新）`;
}

// ====== Telegram Channel (HTTP API) ======
async function sendTelegramChannel(text, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await axios.post(url, {
    chat_id: TELEGRAM_CHANNEL_ID,
    text,
    disable_web_page_preview: true,
  });
  console.log("[TELEGRAM CHANNEL OK] message_id =", res.data?.result?.message_id);
}

// ====== Discord Webhook ======
async function sendDiscord(text, DISCORD_WEBHOOK_URL) {
  const url = `${DISCORD_WEBHOOK_URL}?wait=true`;
  const res = await axios.post(
    url,
    { content: text },
    { headers: { "Content-Type": "application/json" } }
  );
  console.log("[DISCORD OK] id =", res.data?.id);
}

// ====== Gemini (Official SDK) ======
async function callGemini({ apiKey, model, userText }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const normalized = normalizeGeminiModel(model);

  const gm = genAI.getGenerativeModel({
    model: normalized,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 500,
    },
  });

  const result = await gm.generateContent(userText);
  const text = result?.response?.text?.() || "";
  return text;
}

// ====== 主入口（runtime）======
function main() {
  // 防止某些环境下意外重复执行（极少见，但加了不吃亏）
  if (globalThis.__VTF_WORKER_STARTED__) {
    console.log("[BOOT] main() called twice, ignore.");
    return;
  }
  globalThis.__VTF_WORKER_STARTED__ = true;

  const env = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID,
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,

    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    // 你 Railway 里已经改了 2.5 pro，这里再给一个正确默认值兜底
    GEMINI_MODEL: process.env.GEMINI_MODEL || "models/gemini-2.5-pro",
  };

  must("TELEGRAM_BOT_TOKEN", env.TELEGRAM_BOT_TOKEN);
  must("TELEGRAM_CHANNEL_ID", env.TELEGRAM_CHANNEL_ID);
  must("DISCORD_WEBHOOK_URL", env.DISCORD_WEBHOOK_URL);
  must("GEMINI_API_KEY", env.GEMINI_API_KEY);

  console.log("[BOOT] worker started. TZ=America/New_York");
  console.log("[INSTANCE]", process.env.RAILWAY_REPLICA_ID || process.pid);
  console.log("🔎 GEMINI MODEL =", normalizeGeminiModel(env.GEMINI_MODEL));

  // ====== 1) 定时发频道 + Discord ======
  const postBoth = async () => {
    const text = buildChannelContent();
    await Promise.all([
      sendTelegramChannel(text, env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHANNEL_ID),
      sendDiscord(text, env.DISCORD_WEBHOOK_URL),
    ]);
  };

  // 启动即发一次
  postBoth().catch((err) =>
    console.error("[POST ERROR]", err?.response?.data || err.message)
  );

  // 每 10 分钟一次
  cron.schedule("*/10 * * * *", () => {
    console.log("[CRON] trigger");
    postBoth().catch((err) =>
      console.error("[CRON ERROR]", err?.response?.data || err.message)
    );
  });

  // ====== 2) 私聊：TelegramBot polling + Gemini 智能回复 ======
  const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, {
    polling: {
      autoStart: true,
      params: { timeout: 30 },
    },
  });

  // ✅ 关键：容器重启/部署时优雅停 polling，降低 409（新旧实例短暂重叠）
  const shutdown = async (signal) => {
    try {
      console.log(`[SHUTDOWN] ${signal} received, stopping polling...`);
      await bot.stopPolling();
      console.log("[SHUTDOWN] polling stopped.");
    } catch (e) {
      console.log("[SHUTDOWN] stopPolling error:", e?.message || e);
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  bot.getMe()
    .then((me) => console.log("🤖 BOT getMe =", me))
    .catch((e) => console.error("[BOT getMe ERROR]", e?.message));

  bot.on("polling_error", (err) => {
    // 这里会捕获到 409
    console.error("[polling_error]", err?.code, err?.message);
  });

  bot.on("message", async (msg) => {
    try {
      const chatId = msg.chat?.id;
      const chatType = msg.chat?.type;
      const text = (msg.text || "").trim();

      console.log("📩 UPDATE RECEIVED =", { chatId, chatType, text });

      // 只处理私聊
      if (chatType !== "private" || !chatId) return;

      // /start 引导
      if (text === "/start") {
        await bot.sendMessage(
          chatId,
          "✅ Bot alive (private)\n你可以直接问我：VTF / LP / 风控 / 操作步骤等。"
        );
        return;
      }

      if (!text) return;

      const prompt =
        `你是 VTF Auto Pilot。请用中文回答，专业、可执行、不要废话。\n\n用户问题：${text}`;

      const answer = await callGemini({
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL,
        userText: prompt,
      });

      if (!answer) {
        await bot.sendMessage(chatId, "⚠️ AI 没返回内容。你换个问法再试一次。");
        return;
      }

      console.log("[AI] reply_head =", answer.slice(0, 80));
      await bot.sendMessage(chatId, answer, { disable_web_page_preview: true });
    } catch (err) {
      console.error("[AI REPLY ERROR]", err?.response?.data || err.message);
      try {
        const chatId = msg.chat?.id;
        if (msg.chat?.type === "private" && chatId) {
          await bot.sendMessage(chatId, "⚠️ AI 暂时不可用（我已记录错误）。你过 1 分钟再试。");
        }
      } catch {}
    }
  });

  // 心跳
  setInterval(() => {
    console.log("[TICK]", new Date().toISOString(), "worker is alive ✅");
  }, 30_000);
}

main();
