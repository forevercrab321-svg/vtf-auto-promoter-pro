import TelegramBot from "node-telegram-bot-api";
import { GoogleGenAI } from "@google/genai";

/* =========================
   1) 你只需要填这两个
========================= */
const telegramToken = "8503585403:AAES2hdU4BD42OCST4gRQOy7cEc3EYxuj-8";
const geminiApiKey = "AIzaSyBP6Jrt4KXGLNokf3HRVVowyso51b2VZzs"; // 不想用也可以留空：""

// ✅ 唯一官方合约地址（只认这个）
const VTF_OFFICIAL_ADDRESS = "0xf1094ca0c4b2EF11b9fCd36550ac322A39E666F1";
// ✅ 推荐人地址（绑定上级用，不是收款）
const VTF_REFERRAL_ADDRESS = "0xC8F76B6719615A9F829A9f7035791798cc182927";

const NETWORK_RULE = "仅限 BNB Chain（BSC）。购买/铺地池/操作均通过 BNB 完成（含 Gas）。";

/* =========================
   2) 机器人固定教学内容
========================= */
function msgStart() {
  return (
    `👋 欢迎使用 VTF 指南\n\n` +
    `✅ 唯一官方合约地址（只认这一个）：\n${VTF_OFFICIAL_ADDRESS}\n\n` +
    `✅ 推荐人地址（仅用于绑定上级，不是收款地址）：\n${VTF_REFERRAL_ADDRESS}\n\n` +
    `🔗 规则：${NETWORK_RULE}\n\n` +
    `📌 输入指令：\n` +
    `/guide  查看完整教学（绑定+铺地池）\n` +
    `/bind   只看“绑定上级”教学\n` +
    `/lp     只看“铺地池”教学\n\n` +
    `⚠️ 安全提醒：只在官方页面/合约交互；不要私下向任何个人地址转账。`
  );
}

function msgBindGuide() {
  return (
    `👤【绑定上级（推荐人）教学】\n\n` +
    `✅ 推荐人地址（粘贴到 Referral/推荐人/上级 栏）：\n${VTF_REFERRAL_ADDRESS}\n\n` +
    `步骤（请按顺序）：\n` +
    `1) 打开钱包：MetaMask / Trust Wallet\n` +
    `2) 切换网络：BNB Chain（BSC）\n` +
    `3) 用钱包内置浏览器打开 VTF 官方交互页面\n` +
    `4) 连接钱包（Connect Wallet）\n` +
    `5) 找到 Referral / 推荐人 / 上级 输入框\n` +
    `6) 粘贴上面推荐人地址 → 点 Bind/绑定\n` +
    `7) 钱包弹窗确认交易（Gas 用 BNB）\n\n` +
    `✅ 成功标志：交易成功 + 页面显示已绑定\n\n` +
    `⚠️ 重要：推荐人地址只是绑定关系，不是收款地址；不要把 BNB 转给任何个人。`
  );
}

function msgLpGuide() {
  return (
    `🟡【铺地池（LP）教学｜完全用 BNB】\n\n` +
    `✅ 唯一官方合约地址（添加代币时必须核对）：\n${VTF_OFFICIAL_ADDRESS}\n\n` +
    `准备：\n` +
    `- 钱包已切到 BNB Chain（BSC）\n` +
    `- 钱包里有 BNB（留一点做 Gas，不要全用完）\n\n` +
    `方式：PancakeSwap 添加流动性（Add Liquidity）\n\n` +
    `步骤（请按顺序）：\n` +
    `1) 打开 PancakeSwap（用钱包内置浏览器更顺）\n` +
    `2) 连接钱包（Connect）并确认网络是 BNB Chain\n` +
    `3) 进入 Liquidity（流动性） → Add Liquidity（添加流动性）\n` +
    `4) Token A 选 BNB\n` +
    `5) Token B 粘贴 VTF 合约地址：\n   ${VTF_OFFICIAL_ADDRESS}\n` +
    `6) 首次会提示 Import（导入代币）→ 确认合约地址无误再导入\n` +
    `7) 输入你要铺的 BNB 数量（务必留 Gas）\n` +
    `8) 首次会出现 Approve VTF（授权）→ 点 Approve → 钱包确认 → 等成功\n` +
    `9) 授权成功后点 Supply（提供）→ 钱包确认交易\n` +
    `10) 等区块确认成功\n\n` +
    `✅ 成功标志：Liquidity 里能看到 LP 份额 + 钱包交易成功\n\n` +
    `⚠️ 安全提醒：只在官方页面/合约交互；核对链/地址/金额后再确认。`
  );
}

function msgFullGuide() {
  return (
    `📘【VTF 完整教学｜绑定上级 + 铺地池】\n\n` +
    `✅ 唯一官方合约地址：\n${VTF_OFFICIAL_ADDRESS}\n\n` +
    `✅ 推荐人地址（绑定用，不是收款）：\n${VTF_REFERRAL_ADDRESS}\n\n` +
    `🔗 规则：${NETWORK_RULE}\n\n` +
    `━━━━━━━━━━━━━━\n` +
    `0) 准备\n` +
    `- 钱包：MetaMask / Trust\n` +
    `- 网络：BNB Chain（BSC）\n` +
    `- 资产：BNB（留 Gas）\n\n` +
    `━━━━━━━━━━━━━━\n` +
    `1) 先绑定上级（只需一次）\n` +
    msgBindGuide() +
    `\n\n━━━━━━━━━━━━━━\n` +
    `2) 再铺地池（LP，完全用 BNB）\n` +
    msgLpGuide() +
    `\n\n━━━━━━━━━━━━━━\n` +
    `🎁 奖励说明（以官方规则/链上为准）\n` +
    `- 可能包含 VTF 激励\n` +
    `- 可能存在每日 BNB 分配/发放\n` +
    `- 不承诺收益，规则可能变动\n`
  );
}

/* =========================
   3) Gemini（可选）用于闲聊/补充解释
========================= */
const hasGemini = Boolean(geminiApiKey && geminiApiKey.trim().length > 0);
const ai = hasGemini ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-2.0-flash-001", "gemini-2.5-pro"];

const salesLogic = `
你是 VTF 项目的官方客服与推广助手。你必须严格遵守：
- 唯一官方合约地址只认：${VTF_OFFICIAL_ADDRESS}
- 推荐人地址仅用于绑定：${VTF_REFERRAL_ADDRESS}（不是收款地址）
- 仅限 BNB Chain（BSC），购买/铺地池/操作通过 BNB 完成（含 Gas）
- 不承诺收益；关于奖励只说“以官方规则与链上为准”
- 用户要具体操作步骤时，优先输出教程（绑定/铺地池）
`;

const memory = new Map();
const MAX_TURNS = 8;
function getContents(chatId) {
  if (!memory.has(chatId)) memory.set(chatId, []);
  return memory.get(chatId);
}
function trimHistory(contents) {
  const limit = MAX_TURNS * 2;
  if (contents.length > limit) contents.splice(0, contents.length - limit);
}

async function callGemini(chatId, userText) {
  if (!hasGemini) return null;

  const contents = getContents(chatId);
  contents.push({ role: "user", parts: [{ text: userText }] });
  trimHistory(contents);

  for (const model of MODEL_CANDIDATES) {
    try {
      const resp = await ai.models.generateContent({
        model,
        config: { systemInstruction: salesLogic },
        contents,
      });
      const text = (resp?.text || "").trim();
      if (!text) continue;

      contents.push({ role: "model", parts: [{ text }] });
      trimHistory(contents);
      return text;
    } catch {
      // try next model
    }
  }
  return null;
}

/* =========================
   4) Telegram Bot 初始化 + 路由
========================= */
const bot = new TelegramBot(telegramToken, { polling: true });

bot.on("polling_error", (e) => {
  console.error("⚠️ polling_error:", e?.message || e);
});

function isGuideKeyword(text) {
  const t = (text || "").toLowerCase();
  const keys = ["铺地池", "打底池", "lp", "pool", "绑定", "推荐", "referral", "怎么买", "怎么参与", "地址", "合约", "bnb", "bsc", "wallet", "pancake"];
  return keys.some((k) => t.includes(k));
}

bot.onText(/^\/start/i, async (msg) => {
  await bot.sendMessage(msg.chat.id, msgStart());
});

bot.onText(/^\/guide/i, async (msg) => {
  await bot.sendMessage(msg.chat.id, msgFullGuide());
});

bot.onText(/^\/bind/i, async (msg) => {
  await bot.sendMessage(msg.chat.id, msgBindGuide());
});

bot.onText(/^\/lp/i, async (msg) => {
  await bot.sendMessage(msg.chat.id, msgLpGuide());
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text) return;

  // 避免重复处理命令
  if (text.startsWith("/")) return;

  await bot.sendChatAction(chatId, "typing");

  // 只要问到关键字，强制发教程（你要的“像视频那样细节”）
  if (isGuideKeyword(text)) {
    // 如果用户问“绑定”，发 bind；问“铺地池”，发 lp；否则发 full
    if (/(绑定|推荐|referral)/i.test(text)) {
      await bot.sendMessage(chatId, msgBindGuide());
      return;
    }
    if (/(铺地池|打底池|lp|pool|pancake)/i.test(text)) {
      await bot.sendMessage(chatId, msgLpGuide());
      return;
    }
    await bot.sendMessage(chatId, msgFullGuide());
    return;
  }

  // 否则走 Gemini（可选），不行就回 start
  const geminiReply = await callGemini(chatId, text);
  if (geminiReply) {
    await bot.sendMessage(chatId, geminiReply);
  } else {
    await bot.sendMessage(chatId, msgStart());
  }
});

console.log("🚀 VTF Bot running...");
console.log("🔐 Official:", VTF_OFFICIAL_ADDRESS);
console.log("👤 Referral:", VTF_REFERRAL_ADDRESS);
console.log("🤖 Gemini:", hasGemini ? "ON" : "OFF");
setInterval(() => {}, 10000);// =========================
// 5) Channel 公告发布（手动触发，避免重复）
// =========================
const CHANNEL_USERNAME = "@VTFofficialtoken"; // 例如：@vtf_official_channel
const BOT_USERNAME = "@@vtf_autopilot_bot";               // 例如：@VTF_Auto_Pilot_bot

function buildChannelNotice() {
  return (
    `📌 Official Notice\n\n` +
    `• All LP participation happens via smart contracts\n` +
    `• No private transfers\n` +
    `• No admin DMs\n` +
    `• BNB Chain only\n\n` +
    `✅ Official contract (only trust this):\n${VTF_OFFICIAL_ADDRESS}\n\n` +
    `👉 For learning & FAQs, chat with ${BOT_USERNAME}`
  );
}

// 只有你发 /post_channel 才会在频道发一条公告
bot.onText(/^\/post_channel$/i, async (msg) => {
  try {
    await bot.sendMessage(CHANNEL_USERNAME, buildChannelNotice());
    await bot.sendMessage(msg.chat.id, "✅ 已发送到频道（请去频道查看）。");
  } catch (e) {
    await bot.sendMessage(
      msg.chat.id,
      "❌ 发送失败。最常见原因：\n1) 频道用户名写错（必须带@）\n2) 频道是私密的（没有@username）\n3) Bot 没有被设为频道管理员\n4) Bot 没有发消息权限\n\n请把报错截图发我。"
    );
    console.error("post_channel error:", e);
  }
});

