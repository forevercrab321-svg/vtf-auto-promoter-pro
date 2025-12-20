import { GoogleGenAI } from "@google/genai";
import { BotSettings, Language } from "../types";

// Initialize Gemini
// Note: In a real production app, ensure this key is guarded.
// The prompt instructions guarantee process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = 'gemini-2.5-flash';

// Fallback content templates
const FALLBACK_TEMPLATES = {
  zh: [
    (s: BotSettings) => `🚀 VTF已上线！能源金融革命开始\n合约地址：${s.contractAddress}\n我的推荐：${s.referralAddress}\n#VTF #能源金融 #DeFi`,
    (s: BotSettings) => `🌍 VTF：MIT团队打造\n真实能源资产支持\n使用推荐地址参与：${s.referralAddress}\n#VoltFinance #区块链`,
    (s: BotSettings) => `⚡ VTF每日通缩3.6%\nLP分红多重收益\n合约地址：${s.contractAddress}\n推荐福利：${s.referralAddress}\n#RWA #加密投资`,
    (s: BotSettings) => `💰 VTF创富机会\n2024年10月28日上线\n双币联动VTGO生态\n推荐地址：${s.referralAddress}\n#Web3 #BNBChain`
  ],
  en: [
    (s: BotSettings) => `🚀 VTF is LIVE! The Energy Finance revolution starts here.\nContract: ${s.contractAddress}\nRef: ${s.referralAddress}\n#VTF #DeFi #RWA`,
    (s: BotSettings) => `🌍 VTF: Backed by real energy assets. MIT Team.\nJoin via: ${s.referralAddress}\n#VoltFinance #Blockchain`,
    (s: BotSettings) => `⚡ VTF Daily Deflation 3.6% + LP Dividends.\nContract: ${s.contractAddress}\nMy Ref: ${s.referralAddress}\n#Crypto #PassiveIncome`,
    (s: BotSettings) => `💰 Don't miss the VTF opportunity.\nDual-token ecosystem with VTGO.\nLink: ${s.referralAddress}\n#Web3 #BNBChain`
  ]
};

const getFallbackContent = (settings: BotSettings, language: Language) => {
  const templates = FALLBACK_TEMPLATES[language];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template(settings);
};

export const generatePromoContent = async (settings: BotSettings, language: Language): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("API Key missing, using fallback content.");
    return getFallbackContent(settings, language);
  }

  try {
    let prompt = "";
    
    if (language === 'zh') {
      prompt = `
        Write a short, high-energy, engaging crypto social media post (tweet style) in Chinese (Simplified) for a token called "VTF" (Volt Finance).
        
        Key details to include:
        - Contract Address: ${settings.contractAddress}
        - Referral Link: ${settings.referralAddress}
        - Topics: Energy Finance (能源金融), RWA (Real World Assets), Deflationary (通缩), Passive Income (分红).
        
        Constraints:
        - Use 2-3 emojis (like 🚀, ⚡, 💰).
        - Keep it under 280 characters.
        - Tone: Enthusiastic, Community-driven.
        - Include hashtags like #VTF #BNBChain #Web3.
        - Do not include explanations, just the post text.
      `;
    } else {
      prompt = `
        Write a short, high-energy, engaging crypto social media post (tweet style) in English for a token called "VTF" (Volt Finance).
        
        Key details to include:
        - Contract Address: ${settings.contractAddress}
        - Referral Link: ${settings.referralAddress}
        - Topics: Energy Finance, RWA (Real World Assets), Deflationary, Passive Income.
        
        Constraints:
        - Use 2-3 emojis (like 🚀, ⚡, 💰).
        - Keep it under 280 characters.
        - Tone: Enthusiastic, Community-driven.
        - Include hashtags like #VTF #BNBChain #Web3.
        - Do not include explanations, just the post text.
      `;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || getFallbackContent(settings, language);
  } catch (error) {
    console.error("Gemini generation failed:", error);
    return getFallbackContent(settings, language);
  }
};