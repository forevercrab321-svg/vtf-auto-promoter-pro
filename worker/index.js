import axios from "axios";
import cron from "node-cron";

const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHANNEL_ID,
  DISCORD_WEBHOOK_URL,
} = process.env;

function must(name, val) {
  if (!val) {
    console.error(`[ENV MISSING] ${name}`);
    process.exit(1);
  }
}

must("TELEGRAM_BOT_TOKEN", TELEGRAM_BOT_TOKEN);
must("TELEGRAM_CHANNEL_ID", TELEGRAM_CHANNEL_ID);
must("DISCORD_WEBHOOK_URL", DISCORD_WEBHOOK_URL);

// ========= 内容 =========
function buildContent() {
  const now = new Date().toISOString();
  return `🚀 VTF 更新\n\n时间: ${now}\n\nLP 机制与风险管理（持续更新）`;
}

// ========= Telegram =========
async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await axios.post(url, {
    chat_id: TELEGRAM_CHANNEL_ID,
    text,
    disable_web_page_preview: true,
  });
  console.log("[TELEGRAM OK] message_id =", res.data.result.message_id);
}

// ========= Discord =========
async function sendDiscord(text) {
  const url = `${DISCORD_WEBHOOK_URL}?wait=true`;
  const res = await axios.post(
    url,
    { content: text },
    { headers: { "Content-Type": "application/json" } }
  );
  console.log("[DISCORD OK] id =", res.data.id);
}

// ========= 双平台 =========
async function postBoth() {
  const text = buildContent();
  await Promise.all([
    sendTelegram(text),
    sendDiscord(text),
  ]);
}

// ========= 启动 =========
console.log("[BOOT] worker started. TZ=America/New_York");

// 启动即发一次
postBoth().catch(err =>
  console.error("[POST ERROR]", err?.response?.data || err.message)
);

// 每 10 分钟一次
cron.schedule("*/10 * * * *", () => {
  console.log("[CRON] trigger");
  postBoth().catch(err =>
    console.error("[CRON ERROR]", err?.response?.data || err.message)
  );
});

// 心跳
setInterval(() => {
  console.log("[TICK]", new Date().toISOString(), "worker is alive ✅");
}, 30_000);

