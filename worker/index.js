import axios from "axios";
import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";

console.log("🚨 WORKER FILE LOADED", new Date().toISOString());

function must(name, val) {
  if (!val) {
    console.error(`[ENV MISSING] ${name}`);
    process.exit(1);
  }
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

// ====== Gemini 调用（v1beta -> v1 自动兜底）======
async function callGemini({ apiKey, model, userText }) {
  const payload = {
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 500,
    },
  };

  const tryOnce = async (version) => {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
    return axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 60000,
    });
  };

  try {
    const r = await tryOnce("v1beta");
    return r.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (e) {
    const status = e?.response?.status;
    const data = e?.response?.data;
    console.error("[GEMINI v1beta ERROR]", status, JSON.stringify(data || e.message));

    // v1beta 404 -> 改用 v1 再试
    if (status === 404) {
      const r2 = await tryOnce("v1");
      return r2.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
    throw e;
  }
}

// ====== 主入口（runtime）======
function main() {
  const env = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID,
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  };

  must("TELEGRAM_BOT_TOKEN", env.TELEGRAM_BOT_TOKEN);
  must("TELEGRAM_CHANNEL_ID", env.TELEGRAM_CHANNEL_ID);
  must("DISCORD_WEBHOOK_URL", env.DISCORD_WEBHOOK_URL);
  must("GEMINI_API_KEY", env.GEMINI_API_KEY);

  console.log("[BOOT] worker started. TZ=America/New_York");
  console.log("🔎 GEMINI MODEL =", env.GEMINI_MODEL);

  // ====== 1) 定时发频道+Discord ======
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

  // ====== 2) 私聊：用 TelegramBot polling + Gemini 智能回复 ======
  const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true });

  bot.getMe()
    .then((me) => console.log("🤖 BOT getMe =", me))
    .catch((e) => console.error("[BOT getMe ERROR]", e?.message));

  bot.on("message", async (msg) => {
    try {
      const chatId = msg.chat?.id;
      const chatType = msg.chat?.type;
      const text = (msg.text || "").trim();

      console.log("📩 UPDATE RECEIVED =", { chatId, chatType, text });

      // 只处理私聊
      if (chatType !== "private" || !chatId) return;

      // /start 简单引导
      if (text === "/start") {
        await bot.sendMessage(chatId, "✅ Bot alive (private)\n你可以直接问我：VTF / LP / 风控 / 操作步骤等。");
        return;
      }

      // 空消息直接忽略
      if (!text) return;

      // Gemini 回复
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
