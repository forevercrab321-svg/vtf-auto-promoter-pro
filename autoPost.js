import TelegramBot from "node-telegram-bot-api";

// ⚠️ 暂时直接用你现在能跑的 token（先不管安全）
const telegramToken = "8503585403:AAES2hdU4BD42OCST4gRQOy7cEc3EYxuj-8";
const CHANNEL_USERNAME = "@VTFofficialtoken";

const bot = new TelegramBot(telegramToken, { polling: false });

function buildDailyPost() {
  const posts = [
    "📘 LP 是什么？\n\nLP = 流动性提供。\n在 BNB Chain 上，LP 是通过合约完成的，而不是转账给任何个人。",
    "⚠️ 防诈骗提醒\n\n官方不会私聊你要钱。\n所有操作都在合约页面完成。",
    "🟡 新手最容易犯的错误\n\n❌ Gas 用完\n❌ 网络选错\n❌ 没核对合约地址",
    "🔐 如何确认官方合约？\n\n永远只认官方公布的合约地址，不要信截图。",
  ];

  const index = Math.floor(Math.random() * posts.length);
  return posts[index];
}

async function postOnce() {
  const text = buildDailyPost();
  await bot.sendMessage(CHANNEL_USERNAME, text);
  console.log("✅ 已自动发送一条频道内容");
}

postOnce();
