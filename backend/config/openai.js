const OpenAI = require("openai");

const rawApiKey = String(process.env.OPENAI_API_KEY || "").trim();
const looksPlaceholder =
  !rawApiKey ||
  rawApiKey.includes("your_openai_api_key") ||
  rawApiKey.startsWith("your_");

const openai = looksPlaceholder
  ? null
  : new OpenAI({ apiKey: rawApiKey });

module.exports = openai;
