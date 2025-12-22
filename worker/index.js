import axios from "axios";
import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";
import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("🚨 WORKER FILE LOADED", new Date().toISOString());

function must(name, val) {
  if (!val) {
    console.error(`[ENV MISSING] ${name}`);
    process.exit(1);
  }
}

// ========= 内容（频道/广告）=========
function buildContent() {
  const now = new Date().toISOString();
  return `🚀 VTF 更新\n\n时间: ${now}\n\nLP 机制与风险管理（持续更新）`;
}

// ========= Telegram Channel（HTTP API）=========
async function sendTelegramChannel(text, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await axios.post(url, {
    chat_id: TELEGRAM_CHANNEL_ID,
    text,
    disable_web_page_preview: true,
  });
  console.log("[TELEGRAM OK] message_id =", res.data?.result?.message_id);
}

// ========= Discord =========
async function sendDiscord(text, DISCORD_WEBHOOK_URL) {
  const url = `${DISCORD_WEBHOOK_URL}?wait=true`;
  const res = await axios.post(
    url,
    { content: text },
    { headers: { "Content-Type": "application/json" } }
  );
  console.log("[DISCORD OK] id =", res.data?.id);
}

// ========= 双平台 =========
async function postBoth(env) {
  const text = buildContent();
  await Promise.all([
    sendTelegramChannel(text, env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHANNEL_ID),
    sendDiscord(text, env.DISCORD_WEBHOOK_URL),
  ]);
}

// ========= Gemini AI Reply =========
async function geminiReply({ apiKey, modelName, userText }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName || "gemini-1.5-flash" });

  const system = `
你是 VTF Auto Pilot，一个面向普通用户的加密教育与项目助手。
目标：
- 用清晰、专业、可执行的方式解释：VTF / BNB Chain / LP / 风险管理 / 防诈骗
- 不承诺收益；不提供“买卖建议”；不要求用户转账
- 任何涉及私钥/助记词/转账/收益保证：必须提醒风险并拒绝协助
语言：用户中文就中文，英文就英文。
`.trim();

  const prompt = `${system}\n\n用户：${userText}\n\n请给出专业、可执行的回答：`;

  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.();
  return (text && text.trim()) || "我现在没生成出有效回复，请你换个说法再问一次。";
}

// ========= Telegram 私聊（Polling）=========
function startPrivateBotPolling({ TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, GEMINI_MODEL }) {
  console.log("🔍 TELEGRAM TOKEN PRESENT =", !!TELEGRAM_BOT_TOKEN);
  console.log("🔍 GEMINI KEY PRESENT =", !!GEMINI_API_KEY);
  console.log("🔍 GEMINI MODEL =", GEMINI_MODEL || "gemini-1.5-flash");

  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  console.log("📡 TELEGRAM POLLING STARTED ✅");

  bot
    .getMe()
    .then((me) => console.log("🤖 BOT getMe =", { id: me.id, username: me.username }))
    .catch((e) => console.log("⚠️ bot.getMe failed:", e?.message || e));

  bot.on("message", async (msg) => {
    const chatId = msg.chat?.id;
    const chatType = msg.chat?.type;
    const text = msg.text || "";

console.log("🔍 GEMINI KEY PRESENT =", !!process.env.GEMINI_API_KEY);
console.log("🔍 GEMINI MODEL =", process.env.GEMINI_MODEL || "gemini-pro-flash");

    // 只在私聊回复
    if (chatType === "private" && chatId) {
      try {
        await bot.sendChatAction(chatId, "typing");

        // 指令简单处理
        if (text.trim() === "/start") {
          await bot.sendMessage(
            chatId,
            "✅ VTF Auto Pilot 已启动。\n\n你可以直接问我：\n- LP 是什么？\n- 无常损失怎么理解？\n- 如何判断钓鱼链接/假合约？\n\n（我不会提供投资建议，也不会让你转账。）"
          );
          return;
        }

        const answer = await geminiReply({
          apiKey: GEMINI_API_KEY,
          modelName: GEMINI_MODEL,
          userText: text,
        });

        await bot.sendMessage(chatId, answer, { disable_web_page_preview: true });
        console.log("✅ AI REPLY SENT to", chatId);
      } catch (e) {
        console.log("❌ AI reply failed:", e?.message || e);
        await bot.sendMessage(chatId, "⚠️ AI 暂时不可用，我稍后恢复。");
      }
    }
  });

  bot.on("polling_error", (err) => {
    console.log("⚠️ polling_error:", err?.message || err);
  });

  return bot;
}

// ========= 启动入口（runtime） =========
function main() {
  const env = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID,
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
  };

  must("TELEGRAM_BOT_TOKEN", env.TELEGRAM_BOT_TOKEN);
  must("TELEGRAM_CHANNEL_ID", env.TELEGRAM_CHANNEL_ID);
  must("DISCORD_WEBHOOK_URL", env.DISCORD_WEBHOOK_URL);
  must("GEMINI_API_KEY", env.GEMINI_API_KEY);

  console.log("[BOOT] worker started. TZ=America/New_York");

  // ✅ 私聊 AI 启动
  startPrivateBotPolling(env);

  // 启动即发一次（频道+Discord）
  postBoth(env).catch((err) =>
    console.error("[POST ERROR]", err?.response?.data || err.message)
  );

  // 每 10 分钟一次（频道+Discord）
  cron.schedule("*/10 * * * *", () => {
    console.log("[CRON] trigger");
    postBoth(env).catch((err) =>
      console.error("[CRON ERROR]", err?.response?.data || err.message)
    );
  });

  // 心跳
  setInterval(() => {
    console.log("[TICK]", new Date().toISOString(), "worker is alive ✅");
  }, 30_000);
}

main();
