import axios from "axios";
import TelegramBot from "node-telegram-bot-api";

console.log("🚨 WORKER FILE LOADED", new Date().toISOString());

/**
 * ✅ 关键修复点：
 * - 不在文件顶层读取 process.env（build 阶段会触发 railpack secrets 检查）
 * - 在 runtime 启动后再读取 & 校验
 */

function must(name, val) {
  if (!val) {
    console.error(`[ENV MISSING] ${name}`);
    process.exit(1);
  }
}

// ========= 内容 =========
function buildContent() {
  const now = new Date().toISOString();
  return `🚀 VTF 更新\n\n时间: ${now}\n\nLP 机制与风险管理（持续更新）`;
}

// ========= Telegram =========
async function sendTelegram(text, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await axios.post(url, {
    chat_id: TELEGRAM_CHANNEL_ID,
    text,
    disable_web_page_preview: true,
  });
  console.log("[TELEGRAM OK] message_id =", res.data.result.message_id);
}

// ========= Discord =========
async function sendDiscord(text, DISCORD_WEBHOOK_URL) {
  const url = `${DISCORD_WEBHOOK_URL}?wait=true`;
  const res = await axios.post(
    url,
    { content: text },
    { headers: { "Content-Type": "application/json" } }
  );
  console.log("[DISCORD OK] id =", res.data.id);
}

// ========= 双平台 =========
async function postBoth(env) {
  const text = buildContent();
  await Promise.all([
    sendTelegram(text, env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHANNEL_ID),
    sendDiscord(text, env.DISCORD_WEBHOOK_URL),
  ]);
}

// ========= 启动入口（runtime） =========
function main() {
  // ✅ 只在运行时读取环境变量
  const env = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID,
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  };

  // ✅ 运行时校验（build 阶段不会触发）
  must("TELEGRAM_BOT_TOKEN", env.TELEGRAM_BOT_TOKEN);
  must("TELEGRAM_CHANNEL_ID", env.TELEGRAM_CHANNEL_ID);
  must("DISCORD_WEBHOOK_URL", env.DISCORD_WEBHOOK_URL);

  console.log("[BOOT] worker started. TZ=America/New_York");

  // 启动即发一次
  postBoth(env).catch((err) =>
    console.error("[POST ERROR]", err?.response?.data || err.message)
  );

  // 每 10 分钟一次
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
