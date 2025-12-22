import express from "express";
import axios from "axios";
import cron from "node-cron";

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
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  PORT: process.env.PORT || "8080",
};

must("TELEGRAM_BOT_TOKEN", env.TELEGRAM_BOT_TOKEN);
must("TELEGRAM_CHANNEL_ID", env.TELEGRAM_CHANNEL_ID);
must("DISCORD_WEBHOOK_URL", env.DISCORD_WEBHOOK_URL);
must("PUBLIC_BASE_URL", env.PUBLIC_BASE_URL);
must("WEBHOOK_SECRET", env.WEBHOOK_SECRET);

env.PUBLIC_BASE_URL = env.PUBLIC_BASE_URL.replace(/\/+$/, "");

async function tgSendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const r = await axios.post(
    url,
    { chat_id: chatId, text, disable_web_page_preview: true },
    { timeout: 30000 }
  );
  return r.data;
}

async function sendTelegramChannel(text) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await axios.post(
    url,
    { chat_id: env.TELEGRAM_CHANNEL_ID, text, disable_web_page_preview: true },
    { timeout: 30000 }
  );
  console.log("[TELEGRAM CHANNEL OK] message_id =", res.data?.result?.message_id);
}

async function sendDiscord(text) {
  const url = `${env.DISCORD_WEBHOOK_URL}?wait=true`;
  const res = await axios.post(
    url,
    { content: text },
    { headers: { "Content-Type": "application/json" }, timeout: 30000 }
  );
  console.log("[DISCORD OK] id =", res.data?.id);
}

function buildChannelContent() {
  const now = new Date().toISOString();
  return `🚀 VTF Update
Time: ${now}
Topic: webhook private chat debug

🚀 VTF 更新
时间: ${now}
主题: 私聊 webhook 调试`;
}

const app = express();
app.use(express.json({ limit: "2mb" }));

// ✅ 全局打印：任何 HTTP 打进来都能看到
app.use((req, res, next) => {
  console.log("➡️ HTTP IN", {
    method: req.method,
    path: req.path,
    ct: req.headers["content-type"],
  });
  next();
});

app.get("/", (_, res) => res.status(200).send("OK"));
app.get("/debug/ping", (_, res) => res.status(200).json({ ok: true, t: Date.now() }));

// ✅ 关键：给 webhook 路由加 GET，让你能用浏览器验证“路由是否真实存在”
app.get(`/telegram/${env.WEBHOOK_SECRET}`, (_, res) => {
  res.status(200).send("WEBHOOK ROUTE OK (GET)");
});

// ✅ Telegram webhook POST
app.post(`/telegram/${env.WEBHOOK_SECRET}`, async (req, res) => {
  res.sendStatus(200);

  try {
    const update = req.body || {};
    const msg =
      update.message ||
      update.edited_message ||
      update.channel_post ||
      update.edited_channel_post ||
      null;

    console.log("📩 RAW UPDATE =", JSON.stringify(update).slice(0, 2000));

    if (!msg) {
      console.log("⚠️ No message field in update");
      return;
    }

    const chatId = msg.chat?.id;
    const chatType = msg.chat?.type;
    const text = (msg.text || "").trim();

    console.log("✅ UPDATE PARSED =", { chatId, chatType, text });

    if (chatType !== "private" || !chatId) return;

    if (text === "/start") {
      await tgSendMessage(
        chatId,
        `✅ Webhook private chat connected.
Send any text and I will reply.

✅ 私聊 webhook 已连通。
你随便发一句，我会回复。`
      );
      return;
    }

    if (!text) return;

    await tgSendMessage(chatId, `✅ got: ${text}`);
  } catch (err) {
    console.error("[WEBHOOK ERROR]", err?.response?.data || err.message);
  }
});

async function boot() {
  console.log("🚀 WORKER BOOT");
  console.log("🌐 PUBLIC_BASE_URL =", env.PUBLIC_BASE_URL);
  console.log("🔐 WEBHOOK_SECRET =", env.WEBHOOK_SECRET);
  console.log("🧩 PORT =", env.PORT);

  const postBoth = async () => {
    const text = buildChannelContent();
    await Promise.all([sendTelegramChannel(text), sendDiscord(text)]);
  };

  postBoth().catch((e) => console.error("[POST ERROR]", e?.response?.data || e.message));

  cron.schedule("*/10 * * * *", () => {
    console.log("[CRON] trigger");
    postBoth().catch((e) => console.error("[CRON ERROR]", e?.response?.data || e.message));
  });

  setInterval(() => console.log("[TICK]", new Date().toISOString(), "alive ✅"), 30000);
}

app.listen(Number(env.PORT), () => {
  console.log(`[WEB] listening on ${env.PORT}`);
  boot().catch((e) => console.error("[BOOT ERROR]", e?.response?.data || e.message));
});
