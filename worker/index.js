console.log("🚀🚀🚀 RAILWAY NOW RUNNING worker/index.js " + new Date().toISOString());

import express from "express";

const app = express();
app.use(express.json());

/* =========================
   ENV
========================= */
const VTF_CONTRACT_ADDRESS = (process.env.VTF_CONTRACT_ADDRESS || "").trim();
const VTF_REF_ADDRESS = (process.env.VTF_REF_ADDRESS || "").trim();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET?.trim() || "vtf_webhook_2025_private";
const PORT = process.env.PORT || 8080;

// ✅ 这段是“硬知识库”（你可以继续扩写）
const VTF_KNOWLEDGE = `
VTF 是 VoltGo 生态的核心分红代币，强调链上透明、可审计分配与去中心化治理。
代币信息：VTF；BNB Chain；总量 60B 永不增发；BEP-20 / ERC-20 兼容；通过 Liquidity Minting Pool（流动性铸造池）分阶段释放，用户注入 BNB 参与铸造并获得 LP 份额与链上激励。
机制：双底池（BNB/VTF 与 VTGO/VTF）；按 LP 权重获得 BNB 分红。
通缩/分配：每日固定通缩 3.6%（直到流通量降至 6000 万枚）；通缩中的 1.8% 按 LP 权重分配；每笔交易收 3% 手续费并按 LP 权重以 BNB 形式奖励 LP。
价格稳定：砸盘税最高 30%，税费实时按 LP 权重分配为 BNB 分红。
推荐激励：最多 8 代分红；绑定方式为“被推荐人向上级地址发送 0 枚 VTF 完成链上绑定”，上下级双方各需向底池注入 ≥ 0.1 BNB。
`.trim();

console.log("✅ ENV CHECK:", {
  hasTelegramToken: !!TELEGRAM_BOT_TOKEN,
  hasGeminiKey: !!GEMINI_API_KEY,
  hasContract: !!VTF_CONTRACT_ADDRESS,
  hasRef: !!VTF_REF_ADDRESS,
  webhookSecret: WEBHOOK_SECRET ? "set" : "missing",
  port: PORT
});

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/* =========================
   UTIL
========================= */
function clampTelegramText(text, max = 3800) {
  // Telegram 单条 4096，留点余量避免失败
  const s = String(text || "");
  if (s.length <= max) return s;
  return s.slice(0, max) + "\n\n…(truncated)";
}

function buildFooter() {
  const lines = [];
  if (VTF_CONTRACT_ADDRESS) lines.push(`VTF Contract: ${VTF_CONTRACT_ADDRESS}`);
  if (VTF_REF_ADDRESS) lines.push(`Ref/Inviter Address: ${VTF_REF_ADDRESS}`);

  // 绑定说明（不承诺收益，只讲操作）
  lines.push(
    `Referral binding (on-chain): the invited wallet sends 0 VTF to the inviter address to bind. (Follow project’s official steps & double-check network/contract.)`
  );

  // 合规提示
  lines.push(
    `Note: This bot provides educational info only, not financial advice or guarantees. Always verify on-chain + official sources.`
  );

  return "\n\n---\n" + lines.join("\n");
}

function localKnowledgeAnswer(userText) {
  // 当 Gemini 挂掉时的“兜底智能”：先给可用信息 + 引导问法
  const q = (userText || "").trim().toLowerCase();

  // 简单意图识别（够用就行）
  if (q.includes("contract") || q.includes("合约") || q.includes("地址")) {
    const msg =
      `EN: Here’s the VTF contract address (as configured). If you need chain explorer verification, tell me which network you’re using.\n` +
      `中文：下面是已配置的 VTF 合约地址。若要验证区块浏览器，请告诉我你在用哪个链。\n\n` +
      `Contract: ${VTF_CONTRACT_ADDRESS || "(missing in ENV)"}\n` +
      `Inviter/Ref: ${VTF_REF_ADDRESS || "(missing in ENV)"}`;
    return msg + buildFooter();
  }

  if (q.includes("ref") || q.includes("推荐") || q.includes("绑定")) {
    const msg =
      `EN: Referral binding is done on-chain: the invited wallet sends 0 VTF to the inviter address to bind. Both sides typically need ≥0.1 BNB liquidity participation per the project rules.\n` +
      `中文：推荐绑定是链上完成：被推荐人向上级地址发送 0 枚 VTF 完成绑定；通常上下级双方需按项目规则满足 ≥0.1 BNB 的参与条件。\n\n` +
      `Inviter/Ref Address: ${VTF_REF_ADDRESS || "(missing in ENV)"}`;
    return msg + buildFooter();
  }

  // 默认：给知识库摘要 + 问一个澄清问题
  const msg =
    `EN: I can help explain VTF mechanics (LP dividends, fees, deflation, referral binding). What do you want to know—(1) How LP dividends work, (2) How to bind referral, (3) Tokenomics/fees, or (4) Step-by-step onboarding?\n` +
    `中文：我可以解释 VTF 的机制（LP 分红、手续费、通缩、推荐绑定）。你想先了解哪一块——(1) LP 分红怎么计算，(2) 如何完成推荐绑定，(3) 代币经济/手续费，(4) 新手入门步骤？\n\n` +
    `Quick knowledge base:\n${VTF_KNOWLEDGE}`;
  return msg + buildFooter();
}

/* =========================
   HEALTH
========================= */
app.get("/debug/ping", (_, res) => res.status(200).send("pong"));

/* =========================
   GEMINI (REST v1beta)
========================= */
function buildPrompt(userText) {
  // 这里把“知识 + 目标（推荐你的地址）+ 合规边界”写死进 prompt
  const contractLine = VTF_CONTRACT_ADDRESS ? `VTF contract address: ${VTF_CONTRACT_ADDRESS}` : `VTF contract address: (not configured)`;
  const refLine = VTF_REF_ADDRESS ? `Inviter/referral address: ${VTF_REF_ADDRESS}` : `Inviter/referral address: (not configured)`;

  return `
You are "VTF Auto Pilot", an assistant for crypto education & community ops focused on VTF.
You must follow these rules:
1) Reply in BOTH English and Chinese in ONE message.
2) Be professional, concise, actionable (use bullets).
3) If user is vague, ask exactly 1 clarifying question first.
4) No financial guarantees, no "you will profit" claims. No illegal instructions.
5) When relevant, guide users to verify on-chain and check official sources.
6) Always include (near the end) the contract address and inviter address if available, and explain referral binding as: invited wallet sends 0 VTF to inviter to bind.

Hard knowledge base (use as ground truth):
${VTF_KNOWLEDGE}

Known addresses (must be included when relevant):
- ${contractLine}
- ${refLine}

User message:
${userText}
`.trim();
}

async function askGeminiSmart(userText) {
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY missing in Railway Variables");
    return null; // 用兜底
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    encodeURIComponent(GEMINI_API_KEY);

  const prompt = buildPrompt(userText);

  let resp, json;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
      })
    });

    json = await resp.json().catch(() => ({}));
  } catch (e) {
    console.error("❌ GEMINI FETCH ERROR:", e?.message || e);
    return null;
  }

  if (!resp.ok) {
    console.error("❌ GEMINI HTTP ERROR:", resp.status, resp.statusText);
    console.error("❌ GEMINI ERROR JSON:", JSON.stringify(json));
    return null;
  }

  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("❌ GEMINI EMPTY RESPONSE:", JSON.stringify(json));
    return null;
  }

  return text;
}

/* Debug endpoint: test Gemini directly in browser */
app.get("/debug/gemini", async (_, res) => {
  const out = (await askGeminiSmart("Say hello. Then explain referral binding for VTF in steps.")) || localKnowledgeAnswer("hello");
  res.status(200).send(out);
});

/* =========================
   TELEGRAM WEBHOOK
========================= */
app.post(`/telegram/${WEBHOOK_SECRET}`, async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg?.text) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    console.log("📩 TG:", { chatId, text });

    // Commands
    if (text === "/start") {
      const welcome =
        `✅ VTF Auto Pilot is alive.\n\n` +
        `EN: Ask me anything about VTF (LP dividends, fees, deflation, referral binding). Type /help for commands.\n` +
        `中文：你可以问我任何关于 VTF 的问题（LP 分红、手续费、通缩、推荐绑定）。输入 /help 查看指令。\n` +
        buildFooter();
      await sendMessage(chatId, welcome);
      return res.sendStatus(200);
    }

    if (text === "/help") {
      const help =
        `Commands:\n` +
        `/vtf - VTF quick intro\n` +
        `/contract - show contract address\n` +
        `/ref - show inviter/ref address + binding steps\n` +
        `/help - show this help\n\n` +
        `EN: You can also just type a question.\n中文：也可以直接输入问题。\n` +
        buildFooter();
      await sendMessage(chatId, help);
      return res.sendStatus(200);
    }

    if (text === "/vtf") {
      const out =
        `EN (quick intro):\n${VTF_KNOWLEDGE}\n\n` +
        `中文（简介）：\n${VTF_KNOWLEDGE}\n` +
        buildFooter();
      await sendMessage(chatId, clampTelegramText(out));
      return res.sendStatus(200);
    }

    if (text === "/contract") {
      const out =
        `EN: VTF Contract: ${VTF_CONTRACT_ADDRESS || "(missing in ENV)"}\n` +
        `中文：VTF 合约地址：${VTF_CONTRACT_ADDRESS || "（环境变量未配置）"}\n` +
        buildFooter();
      await sendMessage(chatId, out);
      return res.sendStatus(200);
    }

    if (text === "/ref") {
      const out =
        `EN: Inviter/Ref Address: ${VTF_REF_ADDRESS || "(missing in ENV)"}\n` +
        `Steps: invited wallet sends 0 VTF to inviter address to bind (verify official rules + network).\n\n` +
        `中文：推荐/上级地址：${VTF_REF_ADDRESS || "（环境变量未配置）"}\n` +
        `步骤：被推荐人向上级地址发送 0 枚 VTF 完成绑定（请核对官方规则与链/合约）。\n` +
        buildFooter();
      await sendMessage(chatId, out);
      return res.sendStatus(200);
    }

    if (text.toLowerCase() === "ping") {
      await sendMessage(chatId, "pong ✅");
      return res.sendStatus(200);
    }

    // Smart reply with fallback
    let reply = await askGeminiSmart(text);
    if (!reply) reply = localKnowledgeAnswer(text);

    // 强制附尾（防止 Gemini 忘了贴地址）
    if (!reply.includes("VTF Contract") && !reply.includes("合约")) {
      reply = reply + buildFooter();
    }

    await sendMessage(chatId, clampTelegramText(reply));
    return res.sendStatus(200);
  } catch (e) {
    console.error("❌ TG HANDLER ERROR:", e?.message || e);
    return res.sendStatus(200);
  }
});

/* =========================
   SEND MESSAGE
========================= */
async function sendMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN missing in Railway Variables");
    return;
  }
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    });
  } catch (e) {
    console.error("❌ TG sendMessage error:", e?.message || e);
  }
}

/* =========================
   BOOT
========================= */
app.listen(PORT, () => {
  console.log("✅ WORKER BOOTED ON", PORT);
});
